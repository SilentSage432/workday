import { assertServerOnly } from "@/server/assertServerOnly";
import { PulseDispatchError } from "@/server/pulseDispatch/errors";

export const ORIENT_PULSE_DISPATCH_SECRET_ENV = "ORIENT_PULSE_DISPATCH_SECRET";
export const FIREBASE_SERVICE_ACCOUNT_JSON_ENV = "FIREBASE_SERVICE_ACCOUNT_JSON";

/** Exact shared-secret header for the trusted Pulse dispatcher. */
export const PULSE_DISPATCH_SECRET_HEADER = "x-orient-pulse-dispatch-secret";

export type FirebaseServiceAccountConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

type EnvMap = Record<string, string | undefined>;

export function readPulseDispatchSecret(env: EnvMap = process.env): string {
  assertServerOnly("readPulseDispatchSecret");
  const value = env[ORIENT_PULSE_DISPATCH_SECRET_ENV];
  if (!value || value.trim().length === 0) {
    throw new PulseDispatchError(
      "dispatch_secret_unavailable",
      "Pulse dispatch secret is not configured.",
    );
  }
  return value;
}

/**
 * Parse FIREBASE_SERVICE_ACCOUNT_JSON without logging contents.
 * Accepts the standard Firebase service-account JSON object as a string.
 */
export function readFirebaseServiceAccountConfig(
  env: EnvMap = process.env,
): FirebaseServiceAccountConfig {
  assertServerOnly("readFirebaseServiceAccountConfig");
  const raw = env[FIREBASE_SERVICE_ACCOUNT_JSON_ENV];
  if (!raw || raw.trim().length === 0) {
    throw new PulseDispatchError(
      "firebase_unavailable",
      "Firebase service account is not configured.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new PulseDispatchError(
      "firebase_config_invalid",
      "Firebase service account configuration is invalid.",
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new PulseDispatchError(
      "firebase_config_invalid",
      "Firebase service account configuration is invalid.",
    );
  }

  const record = parsed as Record<string, unknown>;
  const projectId =
    typeof record.project_id === "string" ? record.project_id.trim() : "";
  const clientEmail =
    typeof record.client_email === "string" ? record.client_email.trim() : "";
  const privateKeyRaw =
    typeof record.private_key === "string" ? record.private_key : "";
  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  if (!projectId || !clientEmail || !privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new PulseDispatchError(
      "firebase_config_invalid",
      "Firebase service account configuration is invalid.",
    );
  }

  return { projectId, clientEmail, privateKey };
}
