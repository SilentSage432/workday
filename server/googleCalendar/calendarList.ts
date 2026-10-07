import { assertServerOnly } from "@/server/assertServerOnly";
import { GOOGLE_CALENDAR_LIST_URL } from "@/server/googleCalendar/config";
import type { GoogleHttp } from "@/server/googleCalendar/oauth";
import { GoogleOAuthError } from "@/server/googleCalendar/oauth";
import type {
  CalendarListEnumerationResult,
  GoogleCalendarListEntry,
  GoogleCalendarListResponse,
  SelectableGoogleCalendar,
} from "@/server/googleCalendar/types";

const MAX_PAGES = 50;

export async function enumerateGoogleCalendarList(input: {
  accessToken: string;
  http?: GoogleHttp;
}): Promise<CalendarListEnumerationResult> {
  assertServerOnly("enumerateGoogleCalendarList");
  const http = input.http ?? fetch;
  const calendars: SelectableGoogleCalendar[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    pages += 1;
    if (pages > MAX_PAGES) {
      return {
        status: "partial",
        calendars,
        message: "Calendar list was truncated before completion.",
      };
    }

    const url = new URL(GOOGLE_CALENDAR_LIST_URL);
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("showDeleted", "false");
    url.searchParams.set("showHidden", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    let response: Response;
    try {
      response = await http(url.toString(), {
        headers: { Authorization: `Bearer ${input.accessToken}` },
      });
    } catch {
      return {
        status: "partial",
        calendars,
        message: "Calendar list could not be completed.",
      };
    }

    if (response.status === 401 || response.status === 403) {
      throw new GoogleOAuthError("oauth_auth_failed", "Google Calendar access was denied.");
    }
    if (!response.ok) {
      return {
        status: "partial",
        calendars,
        message: "Calendar list could not be completed.",
      };
    }

    let json: GoogleCalendarListResponse;
    try {
      json = (await response.json()) as GoogleCalendarListResponse;
    } catch {
      return {
        status: "partial",
        calendars,
        message: "Calendar list could not be completed.",
      };
    }

    for (const item of json.items ?? []) {
      const mapped = mapCalendarListEntry(item);
      if (mapped) calendars.push(mapped);
    }
    pageToken = json.nextPageToken;
  } while (pageToken);

  return { status: "complete", calendars };
}

export function mapCalendarListEntry(entry: GoogleCalendarListEntry): SelectableGoogleCalendar | null {
  if (!entry.id || entry.id.trim().length === 0) return null;
  if (entry.deleted) return null;
  const displayName =
    entry.summaryOverride?.trim() ||
    entry.summary?.trim() ||
    entry.id;
  return {
    sourceLocalId: entry.id,
    displayName,
    primary: entry.primary === true,
    accessRole: entry.accessRole?.trim() || null,
    sourceTimeZone: entry.timeZone?.trim() || null,
  };
}
