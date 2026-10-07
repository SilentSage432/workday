import { describe, expect, it, vi } from "vitest";
import { GOOGLE_CALENDAR_READONLY_SCOPE } from "@/server/googleCalendar/config";
import {
  accessTokenNeedsRefresh,
  buildGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  parseGoogleCredentialPayload,
  refreshGoogleAccessToken,
  serializeGoogleCredentialPayload,
} from "@/server/googleCalendar/oauth";
import { pkceS256Challenge } from "@/server/googleCalendar/pkce";

const config = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "https://orient-cyan.vercel.app/api/external/google/callback",
};

describe("Google OAuth authorization request", () => {
  it("requests offline read-only Calendar access with PKCE S256", () => {
    const challenge = pkceS256Challenge("verifier-value-with-enough-entropy-0123456789");
    const url = new URL(
      buildGoogleAuthorizationUrl({
        state: "state-value",
        codeChallenge: challenge,
        config,
      }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe(config.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("scope")).toBe(GOOGLE_CALENDAR_READONLY_SCOPE);
    expect(url.searchParams.get("scope")).not.toMatch(/calendar\.events$|calendar$/);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe(challenge);
    expect(url.searchParams.get("state")).toBe("state-value");
  });
});

describe("Google token exchange and refresh", () => {
  it("exchanges an authorization code with the PKCE verifier", async () => {
    const http = vi.fn(async () =>
      Response.json({
        access_token: "access-1",
        expires_in: 3600,
        token_type: "Bearer",
        refresh_token: "refresh-1",
        scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      }),
    );
    const payload = await exchangeGoogleAuthorizationCode({
      code: "auth-code",
      codeVerifier: "verifier",
      config,
      http: http as unknown as typeof fetch,
      now: new Date("2026-10-07T12:00:00.000Z"),
    });
    expect(payload.accessToken).toBe("access-1");
    expect(payload.refreshToken).toBe("refresh-1");
    const firstCall = http.mock.calls[0] as unknown as [string, RequestInit];
    const body = String(firstCall[1]?.body);
    expect(body).toContain("code_verifier=verifier");
    expect(body).toContain("grant_type=authorization_code");
  });

  it("preserves an omitted refresh token during refresh and replaces when returned", async () => {
    const omitRefresh = vi.fn(async () =>
      Response.json({
        access_token: "access-2",
        expires_in: 3600,
        token_type: "Bearer",
        scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      }),
    );
    const preserved = await refreshGoogleAccessToken({
      refreshToken: "refresh-kept",
      config,
      http: omitRefresh as unknown as typeof fetch,
      now: new Date("2026-10-07T12:00:00.000Z"),
    });
    expect(preserved.refreshToken).toBe("refresh-kept");
    expect(preserved.accessToken).toBe("access-2");

    const withRefresh = vi.fn(async () =>
      Response.json({
        access_token: "access-3",
        expires_in: 3600,
        token_type: "Bearer",
        refresh_token: "refresh-new",
        scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      }),
    );
    const replaced = await refreshGoogleAccessToken({
      refreshToken: "refresh-kept",
      config,
      http: withRefresh as unknown as typeof fetch,
      now: new Date("2026-10-07T12:00:00.000Z"),
    });
    expect(replaced.refreshToken).toBe("refresh-new");
  });

  it("detects near-expiry access tokens", () => {
    const now = new Date("2026-10-07T12:00:00.000Z");
    expect(
      accessTokenNeedsRefresh(
        {
          accessToken: "a",
          refreshToken: "r",
          tokenType: "Bearer",
          accessTokenExpiresAtMs: now.getTime() + 30_000,
          scope: GOOGLE_CALENDAR_READONLY_SCOPE,
        },
        now,
      ),
    ).toBe(true);
    expect(
      accessTokenNeedsRefresh(
        {
          accessToken: "a",
          refreshToken: "r",
          tokenType: "Bearer",
          accessTokenExpiresAtMs: now.getTime() + 120_000,
          scope: GOOGLE_CALENDAR_READONLY_SCOPE,
        },
        now,
      ),
    ).toBe(false);
  });

  it("round-trips opaque credential payload JSON without browser exposure fields", () => {
    const payload = {
      accessToken: "access",
      refreshToken: "refresh",
      tokenType: "Bearer",
      accessTokenExpiresAtMs: 1,
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
    };
    expect(parseGoogleCredentialPayload(serializeGoogleCredentialPayload(payload))).toEqual(payload);
  });
});
