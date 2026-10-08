import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";

export type GoogleSourceStatus = {
  id: string;
  sourceLocalId: string;
  displayName: string;
  selected: boolean;
  sourceTimeZone: string | null;
  accessRole: string | null;
  lastAttemptedAt: string | null;
  lastAttemptResult: "success_complete" | "success_partial" | "failure" | null;
  lastSuccessfulObservedAt: string | null;
  lastSuccessfulWindowStartsOn: string | null;
  lastSuccessfulWindowEndsBefore: string | null;
};

export type GoogleConnectionStatusResponse = {
  status: "disconnected" | "pending_auth" | "connected" | "auth_failed";
  connectionId: string | null;
  displayLabel?: string | null;
  selectedCount: number;
  sources: GoogleSourceStatus[];
};

export type GoogleCalendarOption = {
  sourceLocalId: string;
  displayName: string;
  primary: boolean;
  accessRole: string | null;
  sourceTimeZone: string | null;
  selected: boolean;
};

export type GoogleCalendarsResponse = {
  connectionId: string;
  enumerationStatus: "complete" | "partial";
  message: string | null;
  calendars: GoogleCalendarOption[];
};

export type GoogleObservationSourceResult = {
  sourceId: string;
  sourceLocalId: string;
  displayName: string;
  result: "success_complete" | "success_partial" | "failure" | "skipped_throttle";
  observedEventCount: number | null;
  code: string | null;
  message: string | null;
  reconnectRequired: boolean;
};

export type GoogleObservationResponse = {
  connectionId: string;
  windowStartsOn: string;
  windowEndsBefore: string;
  selectedSourceCount: number;
  successfulSourceCount: number;
  failedSourceCount: number;
  partialSourceCount: number;
  skippedThrottleCount: number;
  reconnectRequired: boolean;
  sources: GoogleObservationSourceResult[];
};

async function bearerHeaders(): Promise<HeadersInit> {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sign in is required.");
  }
  return {
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Google Calendar request failed.");
  }
  return body;
}

export async function fetchGoogleConnectionStatus(): Promise<GoogleConnectionStatusResponse> {
  const response = await fetch("/api/external/google/status", {
    headers: await bearerHeaders(),
  });
  return readJson(response);
}

export async function beginGoogleConnect(): Promise<{ authorizeUrl: string }> {
  const response = await fetch("/api/external/google/connect", {
    method: "POST",
    headers: await bearerHeaders(),
  });
  return readJson(response);
}

export async function fetchGoogleCalendars(): Promise<GoogleCalendarsResponse> {
  const response = await fetch("/api/external/google/calendars", {
    headers: await bearerHeaders(),
  });
  return readJson(response);
}

export async function saveGoogleCalendarSelection(
  selectedSourceLocalIds: readonly string[],
): Promise<{ selectedCount: number }> {
  const response = await fetch("/api/external/google/sources", {
    method: "PUT",
    headers: await bearerHeaders(),
    body: JSON.stringify({ selectedSourceLocalIds }),
  });
  return readJson(response);
}

export async function observeGoogleCalendars(input?: {
  force?: boolean;
}): Promise<GoogleObservationResponse> {
  const response = await fetch("/api/external/google/observe", {
    method: "POST",
    headers: await bearerHeaders(),
    body: JSON.stringify({ force: input?.force === true }),
  });
  return readJson(response);
}

export async function disconnectGoogleCalendar(): Promise<{
  status: string;
  revokedRemotely: boolean;
  message: string | null;
}> {
  const response = await fetch("/api/external/google/disconnect", {
    method: "POST",
    headers: await bearerHeaders(),
  });
  return readJson(response);
}
