import { assertServerOnly } from "@/server/assertServerOnly";
import { ExternalCredentialError } from "@/server/credentials/errors";

export const EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV = "EXTERNAL_CREDENTIALS_ENCRYPTION_KEY";

/** Exact AES-256 key length in bytes. */
export const EXTERNAL_CREDENTIAL_KEY_BYTES = 32;

/** AES-GCM nonce/IV length in bytes. */
export const EXTERNAL_CREDENTIAL_NONCE_BYTES = 12;

/** Sole V1 envelope version. Unknown versions fail closed. */
export const EXTERNAL_CREDENTIAL_ENCRYPTION_VERSION_V1 = "v1" as const;

export type ExternalCredentialEncryptionVersion = typeof EXTERNAL_CREDENTIAL_ENCRYPTION_VERSION_V1;

export type SealedCredentialEnvelope = {
  encryptionVersion: ExternalCredentialEncryptionVersion;
  ciphertextBase64: string;
  nonceBase64: string;
};

export type CredentialSealContext = {
  userId: string;
  connectionId: string;
};

const TEXT_ENCODER = new TextEncoder();

/**
 * Decode and validate the configured AES-256-GCM key.
 * Expected format: standard base64 encoding of exactly 32 cryptographically random bytes.
 * Does not derive keys from passwords or arbitrary strings.
 */
export function decodeExternalCredentialsEncryptionKey(configured: string): Uint8Array {
  assertServerOnly("decodeExternalCredentialsEncryptionKey");
  const trimmed = configured.trim();
  if (trimmed.length === 0) {
    throw new ExternalCredentialError(
      "encryption_key_unavailable",
      "External credentials encryption key is not configured.",
    );
  }

  if (!isStrictBase64(trimmed)) {
    throw new ExternalCredentialError(
      "encryption_key_invalid",
      "External credentials encryption key must be valid base64.",
    );
  }

  const decoded = base64ToBytes(trimmed);
  if (decoded.byteLength !== EXTERNAL_CREDENTIAL_KEY_BYTES) {
    throw new ExternalCredentialError(
      "encryption_key_invalid",
      `External credentials encryption key must decode to exactly ${EXTERNAL_CREDENTIAL_KEY_BYTES} bytes.`,
    );
  }

  return decoded;
}

export function readConfiguredExternalCredentialsEncryptionKey(): Uint8Array {
  assertServerOnly("readConfiguredExternalCredentialsEncryptionKey");
  const configured = process.env[EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV];
  if (configured == null) {
    throw new ExternalCredentialError(
      "encryption_key_unavailable",
      "External credentials encryption key is not configured.",
    );
  }
  return decodeExternalCredentialsEncryptionKey(configured);
}

/**
 * Additional authenticated data binds ciphertext to non-secret custody context.
 * Prevents swapping sealed envelopes across users/connections/versions.
 * Encoding: UTF-8 `${version}\\0${userId}\\0${connectionId}`
 */
export function encodeCredentialAad(
  encryptionVersion: string,
  context: CredentialSealContext,
): Uint8Array {
  if (context.userId.trim().length === 0 || context.connectionId.trim().length === 0) {
    throw new ExternalCredentialError(
      "unauthorized_connection",
      "Credential sealing requires user and connection identity.",
    );
  }
  return TEXT_ENCODER.encode(
    `${encryptionVersion}\0${context.userId}\0${context.connectionId}`,
  );
}

/**
 * Seal opaque credential payload bytes with AES-256-GCM.
 * Uses a fresh cryptographically secure nonce every call.
 */
export async function sealCredentialPayload(input: {
  plaintext: Uint8Array;
  context: CredentialSealContext;
  keyBytes?: Uint8Array;
  encryptionVersion?: ExternalCredentialEncryptionVersion;
}): Promise<SealedCredentialEnvelope> {
  assertServerOnly("sealCredentialPayload");
  const encryptionVersion = input.encryptionVersion ?? EXTERNAL_CREDENTIAL_ENCRYPTION_VERSION_V1;
  if (encryptionVersion !== EXTERNAL_CREDENTIAL_ENCRYPTION_VERSION_V1) {
    throw new ExternalCredentialError(
      "unsupported_envelope_version",
      "Unsupported credential encryption version.",
    );
  }

  const keyBytes = input.keyBytes ?? readConfiguredExternalCredentialsEncryptionKey();
  const nonce = new Uint8Array(EXTERNAL_CREDENTIAL_NONCE_BYTES);
  crypto.getRandomValues(nonce);
  const cryptoKey = await importAesGcmKey(keyBytes);
  const aad = toArrayBufferBytes(encodeCredentialAad(encryptionVersion, input.context));
  const plaintext = toArrayBufferBytes(input.plaintext);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: nonce,
        additionalData: aad,
        tagLength: 128,
      },
      cryptoKey,
      plaintext,
    ),
  );

  return {
    encryptionVersion,
    ciphertextBase64: bytesToBase64(ciphertext),
    nonceBase64: bytesToBase64(nonce),
  };
}

/**
 * Open a sealed envelope. Fail closed on version/AAD/tag/ciphertext problems.
 */
export async function openCredentialPayload(input: {
  envelope: {
    encryptionVersion: string;
    ciphertextBase64: string;
    nonceBase64: string;
  };
  context: CredentialSealContext;
  keyBytes?: Uint8Array;
}): Promise<Uint8Array> {
  assertServerOnly("openCredentialPayload");
  if (input.envelope.encryptionVersion !== EXTERNAL_CREDENTIAL_ENCRYPTION_VERSION_V1) {
    throw new ExternalCredentialError(
      "unsupported_envelope_version",
      "Unsupported credential encryption version.",
    );
  }

  let ciphertext: Uint8Array;
  let nonce: Uint8Array;
  try {
    ciphertext = base64ToBytes(input.envelope.ciphertextBase64);
    nonce = base64ToBytes(input.envelope.nonceBase64);
  } catch {
    throw new ExternalCredentialError(
      "credential_unopenable",
      "Credential envelope encoding is invalid.",
    );
  }

  if (nonce.byteLength !== EXTERNAL_CREDENTIAL_NONCE_BYTES) {
    throw new ExternalCredentialError(
      "credential_unopenable",
      "Credential envelope nonce is invalid.",
    );
  }
  if (ciphertext.byteLength === 0) {
    throw new ExternalCredentialError(
      "credential_unopenable",
      "Credential envelope ciphertext is invalid.",
    );
  }

  const keyBytes = input.keyBytes ?? readConfiguredExternalCredentialsEncryptionKey();
  const cryptoKey = await importAesGcmKey(keyBytes);
  const aad = toArrayBufferBytes(encodeCredentialAad(input.envelope.encryptionVersion, input.context));

  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: toArrayBufferBytes(nonce),
          additionalData: aad,
          tagLength: 128,
        },
        cryptoKey,
        toArrayBufferBytes(ciphertext),
      ),
    );
  } catch {
    throw new ExternalCredentialError(
      "credential_unopenable",
      "Credential envelope could not be authenticated.",
    );
  }
}

export function utf8ToBytes(value: string): Uint8Array {
  return TEXT_ENCODER.encode(value);
}

export function bytesToUtf8(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isStrictBase64(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  try {
    const decoded = base64ToBytes(value);
    return bytesToBase64(decoded) === value;
  } catch {
    return false;
  }
}

function toArrayBufferBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

async function importAesGcmKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  if (keyBytes.byteLength !== EXTERNAL_CREDENTIAL_KEY_BYTES) {
    throw new ExternalCredentialError(
      "encryption_key_invalid",
      `External credentials encryption key must decode to exactly ${EXTERNAL_CREDENTIAL_KEY_BYTES} bytes.`,
    );
  }
  return crypto.subtle.importKey(
    "raw",
    toArrayBufferBytes(keyBytes),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
