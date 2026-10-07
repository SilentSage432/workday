import {
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_OAUTH_ERROR_PATH,
  GOOGLE_OAUTH_SUCCESS_PATH,
  readGoogleOAuthConfig,
} from "@/server/googleCalendar/config";
import {
  markGoogleConnectionAuthFailed,
  markGoogleConnectionConnected,
} from "@/server/googleCalendar/connections";
import {
  exchangeGoogleAuthorizationCode,
  serializeGoogleCredentialPayload,
} from "@/server/googleCalendar/oauth";
import { consumeOAuthInitiation, OAuthStateError } from "@/server/googleCalendar/oauthState";
import { storeExternalProviderCredentials } from "@/server/credentials/repository";

export const runtime = "nodejs";

function redirectError(code: string): Response {
  return Response.redirect(
    new URL(GOOGLE_OAUTH_ERROR_PATH + encodeURIComponent(code), absoluteOrigin()),
    303,
  );
}

function absoluteOrigin(): string {
  // Prefer configured redirect URI origin so callback redirects stay allowlisted.
  try {
    return new URL(readGoogleOAuthConfig().redirectUri).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  if (providerError) {
    return redirectError("authorization_denied");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) {
    return redirectError("authorization_incomplete");
  }

  let initiation: { userId: string; connectionId: string; codeVerifier: string };
  try {
    initiation = await consumeOAuthInitiation(state);
  } catch (error) {
    if (error instanceof OAuthStateError) {
      return redirectError(error.code);
    }
    return redirectError("authorization_incomplete");
  }

  try {
    readGoogleOAuthConfig();
    const payload = await exchangeGoogleAuthorizationCode({
      code,
      codeVerifier: initiation.codeVerifier,
    });
    await storeExternalProviderCredentials({
      authenticatedUserId: initiation.userId,
      connectionId: initiation.connectionId,
      plaintext: serializeGoogleCredentialPayload(payload),
      scopes: payload.scope || GOOGLE_CALENDAR_READONLY_SCOPE,
      accessTokenExpiresAt: new Date(payload.accessTokenExpiresAtMs).toISOString(),
    });
    await markGoogleConnectionConnected({
      userId: initiation.userId,
      connectionId: initiation.connectionId,
    });
    return Response.redirect(new URL(GOOGLE_OAUTH_SUCCESS_PATH, absoluteOrigin()), 303);
  } catch {
    await markGoogleConnectionAuthFailed({
      userId: initiation.userId,
      connectionId: initiation.connectionId,
    });
    return redirectError("authorization_failed");
  }
}
