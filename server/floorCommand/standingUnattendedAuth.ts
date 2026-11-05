/**
 * Trusted scheduler authentication for unattended standing evaluation.
 * RELEASE-048: Vercel Cron contract — Authorization: Bearer $CRON_SECRET.
 * Reuses Pulse dispatch constant-time secret compare. No operator JWT fallback.
 * Custom-header credentials cannot substitute.
 */
import { assertServerOnly } from "@/server/assertServerOnly";
import { secretsMatch } from "@/server/pulseDispatch/auth";
import { readStandingCronSecret } from "@/server/floorCommand/standingUnattendedConfig";

type EnvMap = Record<string, string | undefined>;

export type StandingSchedulerAuthResult =
  | { ok: true }
  | { ok: false; status: "unauthorized" | "unconfigured" };

/**
 * Authenticates a scheduler wake via exact Authorization header:
 * `Authorization: Bearer <CRON_SECRET>`
 *
 * Missing/wrong/malformed Bearer → unauthorized.
 * Unconfigured secret → unconfigured (fail closed; never treats absence as open).
 * Custom standing cron headers and operator session tokens cannot substitute.
 */
export function verifyStandingSchedulerCredential(
  request: Request,
  env: EnvMap = process.env,
): StandingSchedulerAuthResult {
  assertServerOnly("verifyStandingSchedulerCredential");

  const configured = readStandingCronSecret(env);
  if (configured.status === "unconfigured") {
    return { ok: false, status: "unconfigured" };
  }

  const provided = extractBearerToken(request.headers.get("authorization"));
  if (!provided || !secretsMatch(provided, configured.secret)) {
    return { ok: false, status: "unauthorized" };
  }

  return { ok: true };
}

/**
 * Parses `Authorization: Bearer <token>`.
 * Rejects missing header, wrong scheme, empty token, and extra material after the token.
 * Never logs the token.
 */
export function extractBearerToken(authorization: string | null): string | null {
  assertServerOnly("extractBearerToken");
  if (!authorization) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization);
  if (!match) return null;
  const token = match[1];
  if (!token || token.length === 0) return null;
  return token;
}
