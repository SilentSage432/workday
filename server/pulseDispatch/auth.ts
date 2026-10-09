import { createHash, timingSafeEqual } from "node:crypto";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  PULSE_DISPATCH_SECRET_HEADER,
  readPulseDispatchSecret,
} from "@/server/pulseDispatch/config";
import { PulseDispatchError } from "@/server/pulseDispatch/errors";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Constant-time compare of caller secret against configured dispatch secret.
 * Digests first so unequal lengths still compare safely.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  assertServerOnly("secretsMatch");
  return timingSafeEqual(digest(provided), digest(expected));
}

/**
 * Authenticate a dispatch request via exact header:
 * `X-Orient-Pulse-Dispatch-Secret: <ORIENT_PULSE_DISPATCH_SECRET>`
 *
 * Missing/wrong secret → unauthorized. Never reveals whether the secret exists
 * versus mismatched (except server misconfiguration → unavailable).
 */
export function requirePulseDispatchSecret(request: Request): void {
  assertServerOnly("requirePulseDispatchSecret");

  let expected: string;
  try {
    expected = readPulseDispatchSecret();
  } catch (error) {
    if (error instanceof PulseDispatchError) throw error;
    throw new PulseDispatchError(
      "dispatch_secret_unavailable",
      "Pulse dispatch secret is not configured.",
    );
  }

  const provided = request.headers.get(PULSE_DISPATCH_SECRET_HEADER);
  if (!provided || !secretsMatch(provided, expected)) {
    throw new PulseDispatchError(
      "dispatch_unauthorized",
      "Pulse dispatch is unauthorized.",
    );
  }
}
