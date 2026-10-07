import type { SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  deleteExternalProviderCredentials,
  openExternalProviderCredentialText,
  type CredentialRepositoryDeps,
} from "@/server/credentials/repository";
import { ExternalCredentialError } from "@/server/credentials/errors";
import {
  loadLatestGoogleConnection,
  markGoogleConnectionDisconnected,
} from "@/server/googleCalendar/connections";
import {
  parseGoogleCredentialPayload,
  revokeGoogleToken,
  type GoogleHttp,
} from "@/server/googleCalendar/oauth";
import { clearGoogleSourceSelection } from "@/server/googleCalendar/sources";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export type GoogleDisconnectResult = {
  status: "disconnected";
  revokedRemotely: boolean;
  message: string | null;
};

/**
 * End the Google observation relationship for the authenticated user.
 * Remote revoke is best-effort; local custody and selection end regardless.
 */
export async function disconnectGoogleCalendarForUser(
  input: {
    authenticatedUserId: string;
    http?: GoogleHttp;
    deps?: CredentialRepositoryDeps;
    admin?: SupabaseClient;
  },
): Promise<GoogleDisconnectResult> {
  assertServerOnly("disconnectGoogleCalendarForUser");
  const admin = input.admin ?? createSupabaseServiceRoleClient();
  const connection = await loadLatestGoogleConnection(input.authenticatedUserId, admin);
  if (!connection || connection.status === "disconnected") {
    return {
      status: "disconnected",
      revokedRemotely: false,
      message: null,
    };
  }

  let revokedRemotely = false;
  try {
    const opened = await openExternalProviderCredentialText(
      {
        authenticatedUserId: input.authenticatedUserId,
        connectionId: connection.id,
      },
      input.deps,
    );
    const payload = parseGoogleCredentialPayload(opened.text);
    const token = payload.refreshToken ?? payload.accessToken;
    const revoke = await revokeGoogleToken({ token, http: input.http });
    revokedRemotely = revoke.revokedRemotely;
  } catch (error) {
    if (!(error instanceof ExternalCredentialError && error.code === "credential_missing")) {
      revokedRemotely = false;
    }
  }

  try {
    await deleteExternalProviderCredentials(
      {
        authenticatedUserId: input.authenticatedUserId,
        connectionId: connection.id,
      },
      input.deps,
    );
  } catch (error) {
    if (!(error instanceof ExternalCredentialError && error.code === "credential_missing")) {
      throw error;
    }
  }

  await clearGoogleSourceSelection(
    {
      authenticatedUserId: input.authenticatedUserId,
      connectionId: connection.id,
    },
    admin,
  );
  await markGoogleConnectionDisconnected(
    {
      userId: input.authenticatedUserId,
      connectionId: connection.id,
    },
    admin,
  );

  return {
    status: "disconnected",
    revokedRemotely,
    message: revokedRemotely
      ? null
      : "Disconnected in Orient. Google may still show the app until you remove access there.",
  };
}
