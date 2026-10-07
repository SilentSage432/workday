import { assertServerOnly } from "@/server/assertServerOnly";
import {
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_OAUTH_AUTHORIZE_URL,
  GOOGLE_OAUTH_REVOKE_URL,
  GOOGLE_OAUTH_TOKEN_URL,
  readGoogleOAuthConfig,
  type GoogleOAuthConfig,
} from "@/server/googleCalendar/config";
import type { GoogleCredentialPayload, GoogleTokenResponse } from "@/server/googleCalendar/types";

export class GoogleOAuthError extends Error {
  readonly code: "oauth_provider_error" | "oauth_token_invalid" | "oauth_auth_failed" | "oauth_transient";

  constructor(code: GoogleOAuthError["code"], message: string) {
    super(message);
    this.name = "GoogleOAuthError";
    this.code = code;
  }
}

export type GoogleHttp = typeof fetch;

/**
 * Build Google authorization URL.
 * Uses access_type=offline and prompt=consent so V1 reliably obtains a refresh token
 * for server-side CalendarList (and later observation). Consent is requested on each
 * Connect initiation; reconnect after disconnect therefore also receives offline access.
 */
export function buildGoogleAuthorizationUrl(input: {
  state: string;
  codeChallenge: string;
  config?: GoogleOAuthConfig;
}): string {
  assertServerOnly("buildGoogleAuthorizationUrl");
  const config = input.config ?? readGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_READONLY_SCOPE,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
  });
  return `${GOOGLE_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeGoogleAuthorizationCode(
  input: {
    code: string;
    codeVerifier: string;
    config?: GoogleOAuthConfig;
    http?: GoogleHttp;
    now?: Date;
  },
): Promise<GoogleCredentialPayload> {
  assertServerOnly("exchangeGoogleAuthorizationCode");
  const config = input.config ?? readGoogleOAuthConfig();
  const http = input.http ?? fetch;
  const body = new URLSearchParams({
    code: input.code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
    code_verifier: input.codeVerifier,
  });

  const response = await http(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  return parseTokenResponse(response, input.now ?? new Date(), { requireRefresh: true });
}

export async function refreshGoogleAccessToken(
  input: {
    refreshToken: string;
    config?: GoogleOAuthConfig;
    http?: GoogleHttp;
    now?: Date;
  },
): Promise<GoogleCredentialPayload> {
  assertServerOnly("refreshGoogleAccessToken");
  const config = input.config ?? readGoogleOAuthConfig();
  const http = input.http ?? fetch;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: input.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await http(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = await parseTokenResponse(response, input.now ?? new Date(), {
    requireRefresh: false,
  });
  return {
    ...payload,
    refreshToken: payload.refreshToken ?? input.refreshToken,
  };
}

/**
 * Best-effort Google token revoke. Returns whether the remote call succeeded.
 * Does not throw for provider failures — local disconnect may still proceed.
 */
export async function revokeGoogleToken(
  input: {
    token: string;
    http?: GoogleHttp;
  },
): Promise<{ revokedRemotely: boolean }> {
  assertServerOnly("revokeGoogleToken");
  const http = input.http ?? fetch;
  try {
    const response = await http(`${GOOGLE_OAUTH_REVOKE_URL}?token=${encodeURIComponent(input.token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return { revokedRemotely: response.ok };
  } catch {
    return { revokedRemotely: false };
  }
}

export function serializeGoogleCredentialPayload(payload: GoogleCredentialPayload): string {
  return JSON.stringify(payload);
}

export function parseGoogleCredentialPayload(text: string): GoogleCredentialPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GoogleOAuthError("oauth_token_invalid", "Stored Google credentials are unreadable.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new GoogleOAuthError("oauth_token_invalid", "Stored Google credentials are unreadable.");
  }
  const row = parsed as Record<string, unknown>;
  if (typeof row.accessToken !== "string" || row.accessToken.length === 0) {
    throw new GoogleOAuthError("oauth_token_invalid", "Stored Google credentials are unreadable.");
  }
  if (typeof row.accessTokenExpiresAtMs !== "number") {
    throw new GoogleOAuthError("oauth_token_invalid", "Stored Google credentials are unreadable.");
  }
  return {
    accessToken: row.accessToken,
    refreshToken: typeof row.refreshToken === "string" ? row.refreshToken : null,
    tokenType: typeof row.tokenType === "string" ? row.tokenType : "Bearer",
    accessTokenExpiresAtMs: row.accessTokenExpiresAtMs,
    scope: typeof row.scope === "string" ? row.scope : GOOGLE_CALENDAR_READONLY_SCOPE,
  };
}

/** Refresh when fewer than 60 seconds remain. */
export function accessTokenNeedsRefresh(payload: GoogleCredentialPayload, now: Date = new Date()): boolean {
  return payload.accessTokenExpiresAtMs <= now.getTime() + 60_000;
}

async function parseTokenResponse(
  response: Response,
  now: Date,
  options: { requireRefresh: boolean },
): Promise<GoogleCredentialPayload> {
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      throw new GoogleOAuthError("oauth_auth_failed", "Google authorization failed.");
    }
    throw new GoogleOAuthError("oauth_transient", "Google authorization is temporarily unavailable.");
  }

  let json: GoogleTokenResponse;
  try {
    json = (await response.json()) as GoogleTokenResponse;
  } catch {
    throw new GoogleOAuthError("oauth_token_invalid", "Google returned an unreadable token response.");
  }

  if (!json.access_token || typeof json.expires_in !== "number" || !json.token_type) {
    throw new GoogleOAuthError("oauth_token_invalid", "Google returned an incomplete token response.");
  }
  if (options.requireRefresh && !json.refresh_token) {
    throw new GoogleOAuthError(
      "oauth_token_invalid",
      "Google did not provide offline access. Connect again.",
    );
  }

  const scope = json.scope?.trim() || GOOGLE_CALENDAR_READONLY_SCOPE;
  if (!scope.split(/\s+/).includes(GOOGLE_CALENDAR_READONLY_SCOPE)) {
    throw new GoogleOAuthError("oauth_token_invalid", "Google did not grant Calendar read access.");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    tokenType: json.token_type,
    accessTokenExpiresAtMs: now.getTime() + json.expires_in * 1000,
    scope,
  };
}
