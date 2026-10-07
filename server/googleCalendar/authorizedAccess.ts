import type { SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  openExternalProviderCredentialText,
  storeExternalProviderCredentials,
  type CredentialRepositoryDeps,
} from "@/server/credentials/repository";
import { ExternalCredentialError } from "@/server/credentials/errors";
import {
  accessTokenNeedsRefresh,
  parseGoogleCredentialPayload,
  refreshGoogleAccessToken,
  serializeGoogleCredentialPayload,
  type GoogleHttp,
} from "@/server/googleCalendar/oauth";
import type { GoogleCredentialPayload } from "@/server/googleCalendar/types";
import { GOOGLE_CALENDAR_READONLY_SCOPE } from "@/server/googleCalendar/config";

export async function openAuthorizedGoogleCredential(input: {
  authenticatedUserId: string;
  connectionId: string;
  http?: GoogleHttp;
  now?: Date;
  deps?: CredentialRepositoryDeps;
}): Promise<GoogleCredentialPayload> {
  assertServerOnly("openAuthorizedGoogleCredential");
  const now = input.now ?? new Date();
  let opened;
  try {
    opened = await openExternalProviderCredentialText(
      {
        authenticatedUserId: input.authenticatedUserId,
        connectionId: input.connectionId,
      },
      input.deps,
    );
  } catch (error) {
    if (error instanceof ExternalCredentialError && error.code === "credential_missing") {
      throw error;
    }
    throw error;
  }

  let payload = parseGoogleCredentialPayload(opened.text);
  if (!accessTokenNeedsRefresh(payload, now)) {
    return payload;
  }
  if (!payload.refreshToken) {
    throw new ExternalCredentialError(
      "credential_missing",
      "Google offline access is unavailable. Connect again.",
    );
  }

  const refreshed = await refreshGoogleAccessToken({
    refreshToken: payload.refreshToken,
    http: input.http,
    now,
  });
  // Preserve prior refresh token when Google omits a new one.
  payload = {
    ...refreshed,
    refreshToken: refreshed.refreshToken ?? payload.refreshToken,
  };

  await storeExternalProviderCredentials(
    {
      authenticatedUserId: input.authenticatedUserId,
      connectionId: input.connectionId,
      plaintext: serializeGoogleCredentialPayload(payload),
      scopes: payload.scope || GOOGLE_CALENDAR_READONLY_SCOPE,
      accessTokenExpiresAt: new Date(payload.accessTokenExpiresAtMs).toISOString(),
    },
    input.deps,
  );

  return payload;
}

export type { SupabaseClient };
