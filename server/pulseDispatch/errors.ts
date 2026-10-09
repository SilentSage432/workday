export type PulseDispatchErrorCode =
  | "dispatch_unauthorized"
  | "dispatch_secret_unavailable"
  | "dispatch_malformed_input"
  | "occurrence_not_found"
  | "service_role_unavailable"
  | "firebase_unavailable"
  | "firebase_config_invalid";

/**
 * Controlled Pulse dispatch failure.
 * Messages must never include secrets, FCM tokens, or service-account material.
 */
export class PulseDispatchError extends Error {
  readonly code: PulseDispatchErrorCode;

  constructor(code: PulseDispatchErrorCode, message: string) {
    super(message);
    this.name = "PulseDispatchError";
    this.code = code;
  }
}

export function isPulseDispatchError(error: unknown): error is PulseDispatchError {
  return error instanceof PulseDispatchError;
}
