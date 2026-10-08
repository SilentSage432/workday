import { assertServerOnly } from "@/server/assertServerOnly";
import { googleCalendarEventsListUrl } from "@/server/googleCalendar/config";
import type { GoogleHttp } from "@/server/googleCalendar/oauth";
import type {
  GoogleEvent,
  GoogleEventsListFailureCode,
  GoogleEventsListResponse,
  GoogleEventsListResult,
} from "@/server/googleCalendar/types";

const MAX_PAGES = 100;
const PAGE_SIZE = 250;

/**
 * Bounded Google Calendar events.list for one calendar.
 * Completeness requires every page to succeed. Partial/failure never claim an empty success.
 */
export async function listGoogleCalendarEvents(input: {
  accessToken: string;
  calendarId: string;
  timeMin: string;
  timeMax: string;
  http?: GoogleHttp;
}): Promise<GoogleEventsListResult> {
  assertServerOnly("listGoogleCalendarEvents");
  const http = input.http ?? fetch;
  const calendarId = input.calendarId.trim();
  if (calendarId.length === 0) {
    return {
      status: "failure",
      events: [],
      code: "malformed_provider_response",
      message: "Calendar identity is missing.",
    };
  }

  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    pages += 1;
    if (pages > MAX_PAGES) {
      return {
        status: "partial",
        events,
        code: "partial_paginated_observation",
        message: "Event list was truncated before completion.",
      };
    }

    const url = new URL(googleCalendarEventsListUrl(calendarId));
    url.searchParams.set("timeMin", input.timeMin);
    url.searchParams.set("timeMax", input.timeMax);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("showDeleted", "true");
    url.searchParams.set("maxResults", String(PAGE_SIZE));
    url.searchParams.set("orderBy", "startTime");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    let response: Response;
    try {
      response = await http(url.toString(), {
        headers: { Authorization: `Bearer ${input.accessToken}` },
      });
    } catch {
      return failureOrPartial(events, "transient_provider_failure", "Google Calendar could not be reached.");
    }

    const classified = classifyHttpFailure(response.status);
    if (classified) {
      return failureOrPartial(events, classified.code, classified.message);
    }

    let json: GoogleEventsListResponse;
    try {
      json = (await response.json()) as GoogleEventsListResponse;
    } catch {
      return failureOrPartial(events, "malformed_provider_response", "Google Calendar returned an unreadable response.");
    }

    if (!Array.isArray(json.items) && json.items !== undefined) {
      return failureOrPartial(events, "malformed_provider_response", "Google Calendar returned an unreadable response.");
    }

    for (const item of json.items ?? []) {
      events.push(item);
    }
    pageToken = typeof json.nextPageToken === "string" && json.nextPageToken.length > 0
      ? json.nextPageToken
      : undefined;
  } while (pageToken);

  return { status: "complete", events };
}

function classifyHttpFailure(
  status: number,
): { code: GoogleEventsListFailureCode; message: string } | null {
  if (status === 401) {
    return { code: "authorization_invalid", message: "Google Calendar authorization is no longer valid." };
  }
  if (status === 403) {
    return { code: "permission_denied", message: "Google Calendar access was denied for this calendar." };
  }
  if (status === 429) {
    return { code: "rate_limited", message: "Google Calendar rate limit was reached." };
  }
  if (status >= 500) {
    return { code: "transient_provider_failure", message: "Google Calendar was temporarily unavailable." };
  }
  if (!status || status < 200 || status >= 300) {
    return { code: "transient_provider_failure", message: "Google Calendar could not complete the request." };
  }
  return null;
}

function failureOrPartial(
  events: GoogleEvent[],
  code: GoogleEventsListFailureCode,
  message: string,
): GoogleEventsListResult {
  if (events.length === 0) {
    return { status: "failure", events: [], code, message };
  }
  return {
    status: "partial",
    events,
    code: code === "authorization_invalid" || code === "permission_denied" || code === "rate_limited"
      ? code
      : "partial_paginated_observation",
    message,
  };
}
