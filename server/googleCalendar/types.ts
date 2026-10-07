/** Google OAuth / CalendarList DTOs. Stay inside the Google integration boundary. */

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  refresh_token?: string;
};

export type GoogleCredentialPayload = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  /** Unix epoch milliseconds when the access token expires. */
  accessTokenExpiresAtMs: number;
  scope: string;
};

export type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
  summaryOverride?: string;
  primary?: boolean;
  accessRole?: string;
  timeZone?: string;
  deleted?: boolean;
};

export type GoogleCalendarListResponse = {
  items?: GoogleCalendarListEntry[];
  nextPageToken?: string;
};

export type SelectableGoogleCalendar = {
  sourceLocalId: string;
  displayName: string;
  primary: boolean;
  accessRole: string | null;
  sourceTimeZone: string | null;
};

export type CalendarListEnumerationResult =
  | {
      status: "complete";
      calendars: SelectableGoogleCalendar[];
    }
  | {
      status: "partial";
      calendars: SelectableGoogleCalendar[];
      message: string;
    };
