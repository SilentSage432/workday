import type { SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  openCredentialPayload,
  sealCredentialPayload,
  utf8ToBytes,
  bytesToUtf8,
  type SealedCredentialEnvelope,
} from "@/server/credentials/crypto";
import { ExternalCredentialError } from "@/server/credentials/errors";
import {
  requireOwnedExternalConnection,
  type VerifiedConnectionAccess,
} from "@/server/credentials/ownership";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export const EXTERNAL_PROVIDER_CREDENTIAL_COLUMNS =
  "connection_id, user_id, ciphertext, nonce, encryption_version, scopes, access_token_expires_at, created_at, updated_at";

export type ExternalProviderCredentialRow = {
  connection_id: string;
  user_id: string;
  ciphertext: string;
  nonce: string;
  encryption_version: string;
  scopes: string;
  access_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OpenedExternalProviderCredential = {
  access: VerifiedConnectionAccess;
  plaintext: Uint8Array;
  scopes: string;
  accessTokenExpiresAt: string | null;
  encryptionVersion: string;
  updatedAt: string;
};

export type CredentialRepositoryDeps = {
  adminClient?: SupabaseClient;
  seal?: typeof sealCredentialPayload;
  open?: typeof openCredentialPayload;
};

/**
 * Seal and store opaque credential payload for one Connection.
 * Inserts or replaces the single credential envelope for that Connection.
 */
export async function storeExternalProviderCredentials(
  input: {
    authenticatedUserId: string;
    connectionId: string;
    plaintext: Uint8Array | string;
    scopes: string;
    accessTokenExpiresAt?: string | null;
  },
  deps: CredentialRepositoryDeps = {},
): Promise<VerifiedConnectionAccess> {
  assertServerOnly("storeExternalProviderCredentials");
  const admin = deps.adminClient ?? createSupabaseServiceRoleClient();
  const access = await requireOwnedExternalConnection(
    admin,
    input.authenticatedUserId,
    input.connectionId,
  );

  const plaintext =
    typeof input.plaintext === "string" ? utf8ToBytes(input.plaintext) : input.plaintext;
  const seal = deps.seal ?? sealCredentialPayload;
  const envelope = await seal({
    plaintext,
    context: access,
  });

  const now = new Date().toISOString();
  const row = {
    connection_id: access.connectionId,
    user_id: access.userId,
    ciphertext: envelope.ciphertextBase64,
    nonce: envelope.nonceBase64,
    encryption_version: envelope.encryptionVersion,
    scopes: requireScopes(input.scopes),
    access_token_expires_at: input.accessTokenExpiresAt ?? null,
    updated_at: now,
  };

  const { error } = await admin.from("external_provider_credentials").upsert(row, {
    onConflict: "connection_id",
  });

  if (error) {
    throw new ExternalCredentialError(
      "persistence_failure",
      "Credential envelope could not be stored.",
    );
  }

  return access;
}

/**
 * Load and open credential plaintext for a Connection owned by the authenticated user.
 * Distinguishes missing vs corrupt/unopenable envelopes.
 */
export async function openExternalProviderCredentials(
  input: {
    authenticatedUserId: string;
    connectionId: string;
  },
  deps: CredentialRepositoryDeps = {},
): Promise<OpenedExternalProviderCredential> {
  assertServerOnly("openExternalProviderCredentials");
  const admin = deps.adminClient ?? createSupabaseServiceRoleClient();
  const access = await requireOwnedExternalConnection(
    admin,
    input.authenticatedUserId,
    input.connectionId,
  );

  const { data, error } = await admin
    .from("external_provider_credentials")
    .select(EXTERNAL_PROVIDER_CREDENTIAL_COLUMNS)
    .eq("connection_id", access.connectionId)
    .eq("user_id", access.userId)
    .maybeSingle();

  if (error) {
    throw new ExternalCredentialError(
      "persistence_failure",
      "Credential envelope could not be loaded.",
    );
  }
  if (!data) {
    throw new ExternalCredentialError(
      "credential_missing",
      "No credential envelope exists for this connection.",
    );
  }

  const row = data as ExternalProviderCredentialRow;
  if (row.user_id !== access.userId || row.connection_id !== access.connectionId) {
    throw new ExternalCredentialError(
      "unauthorized_connection",
      "Connection access was denied.",
    );
  }

  const open = deps.open ?? openCredentialPayload;
  const plaintext = await open({
    envelope: {
      encryptionVersion: row.encryption_version,
      ciphertextBase64: row.ciphertext,
      nonceBase64: row.nonce,
    },
    context: access,
  });

  return {
    access,
    plaintext,
    scopes: row.scopes,
    accessTokenExpiresAt: row.access_token_expires_at,
    encryptionVersion: row.encryption_version,
    updatedAt: row.updated_at,
  };
}

/**
 * Delete credential custody for a Connection.
 * Does not delete the Connection, Sources, Facts, or Orient-owned truth.
 */
export async function deleteExternalProviderCredentials(
  input: {
    authenticatedUserId: string;
    connectionId: string;
  },
  deps: CredentialRepositoryDeps = {},
): Promise<VerifiedConnectionAccess> {
  assertServerOnly("deleteExternalProviderCredentials");
  const admin = deps.adminClient ?? createSupabaseServiceRoleClient();
  const access = await requireOwnedExternalConnection(
    admin,
    input.authenticatedUserId,
    input.connectionId,
  );

  const { error } = await admin
    .from("external_provider_credentials")
    .delete()
    .eq("connection_id", access.connectionId)
    .eq("user_id", access.userId);

  if (error) {
    throw new ExternalCredentialError(
      "persistence_failure",
      "Credential envelope could not be deleted.",
    );
  }

  return access;
}

/** Convenience for trusted server callers that store UTF-8 JSON/text payloads. */
export async function openExternalProviderCredentialText(
  input: {
    authenticatedUserId: string;
    connectionId: string;
  },
  deps: CredentialRepositoryDeps = {},
): Promise<OpenedExternalProviderCredential & { text: string }> {
  const opened = await openExternalProviderCredentials(input, deps);
  return { ...opened, text: bytesToUtf8(opened.plaintext) };
}

export type { SealedCredentialEnvelope };

function requireScopes(value: string): string {
  if (value.length > 2000) {
    throw new ExternalCredentialError(
      "persistence_failure",
      "Credential scope metadata exceeds the allowed length.",
    );
  }
  return value;
}
