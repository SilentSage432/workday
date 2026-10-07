export type ExternalCredentialErrorCode =
  | "service_role_unavailable"
  | "encryption_key_unavailable"
  | "encryption_key_invalid"
  | "unauthorized_connection"
  | "credential_missing"
  | "unsupported_envelope_version"
  | "credential_unopenable"
  | "persistence_failure";

/**
 * Controlled credential custody failure.
 * Messages must never include plaintext secrets, keys, or ciphertext dumps.
 */
export class ExternalCredentialError extends Error {
  readonly code: ExternalCredentialErrorCode;

  constructor(code: ExternalCredentialErrorCode, message: string) {
    super(message);
    this.name = "ExternalCredentialError";
    this.code = code;
  }
}

export function isExternalCredentialError(error: unknown): error is ExternalCredentialError {
  return error instanceof ExternalCredentialError;
}
