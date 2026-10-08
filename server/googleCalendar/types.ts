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

/** Google Event DTO. Remains inside the Google integration boundary. */
export type GoogleEventDate = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

export type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  etag?: string;
  updated?: string;
  eventType?: string;
  transparency?: string;
  visibility?: string;
  recurringEventId?: string;
  originalStartTime?: GoogleEventDate;
  start?: GoogleEventDate;
  end?: GoogleEventDate;
  iCalUID?: string;
};

export type GoogleEventsListResponse = {
  items?: GoogleEvent[];
  nextPageToken?: string;
};

export type GoogleEventsListFailureCode =
  | "authorization_invalid"
  | "permission_denied"
  | "rate_limited"
  | "transient_provider_failure"
  | "malformed_provider_response"
  | "partial_paginated_observation";

export type GoogleEventsListResult =
  | {
      status: "complete";
      events: GoogleEvent[];
    }
  | {
      status: "partial";
      events: GoogleEvent[];
      code: GoogleEventsListFailureCode;
      message: string;
    }
  | {
      status: "failure";
      events: [];
      code: GoogleEventsListFailureCode;
      message: string;
    };
