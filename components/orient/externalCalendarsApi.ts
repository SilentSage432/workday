import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";

export type GoogleConnectionStatusResponse = {
  status: "disconnected" | "pending_auth" | "connected" | "auth_failed";
  connectionId: string | null;
  displayLabel?: string | null;
  selectedCount: number;
  sources: Array<{
    id: string;
    sourceLocalId: string;
    displayName: string;
    selected: boolean;
    sourceTimeZone: string | null;
    accessRole: string | null;
  }>;
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
