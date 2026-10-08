import { assertServerOnly } from "@/server/assertServerOnly";

export const GOOGLE_OAUTH_CLIENT_ID_ENV = "GOOGLE_OAUTH_CLIENT_ID";
export const GOOGLE_OAUTH_CLIENT_SECRET_ENV = "GOOGLE_OAUTH_CLIENT_SECRET";
export const GOOGLE_OAUTH_REDIRECT_URI_ENV = "GOOGLE_OAUTH_REDIRECT_URI";

/** Accepted V1 read-only Calendar scope. */
export const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_OAUTH_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList";

/** Base Calendar API events collection URL (encode calendarId into the path). */
export const GOOGLE_CALENDAR_EVENTS_BASE_URL =
  "https://www.googleapis.com/calendar/v3/calendars";

export function googleCalendarEventsListUrl(calendarId: string): string {
  return `${GOOGLE_CALENDAR_EVENTS_BASE_URL}/${encodeURIComponent(calendarId)}/events`;
}

export class GoogleConfigError extends Error {
  readonly code = "google_config_unavailable" as const;

  constructor(message = "Google Calendar connection is not configured.") {
    super(message);
    this.name = "GoogleConfigError";
  }
}

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function readGoogleOAuthConfig(): GoogleOAuthConfig {
  assertServerOnly("readGoogleOAuthConfig");
  const clientId = process.env[GOOGLE_OAUTH_CLIENT_ID_ENV]?.trim() ?? "";
  const clientSecret = process.env[GOOGLE_OAUTH_CLIENT_SECRET_ENV]?.trim() ?? "";
  const redirectUri = process.env[GOOGLE_OAUTH_REDIRECT_URI_ENV]?.trim() ?? "";
  if (!clientId || !clientSecret || !redirectUri) {
    throw new GoogleConfigError();
  }
  return { clientId, clientSecret, redirectUri };
}

/** Safe post-callback landing inside Orient. Exact allowlist only. */
export const GOOGLE_OAUTH_SUCCESS_PATH = "/?manage=external-calendars";
export const GOOGLE_OAUTH_ERROR_PATH = "/?manage=external-calendars&googleError=";
