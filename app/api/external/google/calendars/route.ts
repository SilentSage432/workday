import { requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { openAuthorizedGoogleCredential } from "@/server/googleCalendar/authorizedAccess";
import { enumerateGoogleCalendarList } from "@/server/googleCalendar/calendarList";
import { loadLatestGoogleConnection } from "@/server/googleCalendar/connections";
import { jsonError, jsonOk, mapRouteError } from "@/server/googleCalendar/httpJson";
import { listGoogleSourcesForConnection } from "@/server/googleCalendar/sources";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const admin = createSupabaseServiceRoleClient();
    const connection = await loadLatestGoogleConnection(userId, admin);
    if (!connection || connection.status !== "connected") {
      return jsonError(409, "Connect Google Calendar before loading calendars.", "not_connected");
    }

    const credential = await openAuthorizedGoogleCredential({
      authenticatedUserId: userId,
      connectionId: connection.id,
    });
    const enumeration = await enumerateGoogleCalendarList({
      accessToken: credential.accessToken,
    });
    const retained = await listGoogleSourcesForConnection(
      { authenticatedUserId: userId, connectionId: connection.id },
      admin,
    );
    const selected = new Set(
      retained.filter((source) => source.selected).map((source) => source.source_local_id),
    );

    return jsonOk({
      connectionId: connection.id,
      enumerationStatus: enumeration.status,
      message: enumeration.status === "partial" ? enumeration.message : null,
      calendars: enumeration.calendars.map((calendar) => ({
        sourceLocalId: calendar.sourceLocalId,
        displayName: calendar.displayName,
        primary: calendar.primary,
        accessRole: calendar.accessRole,
        sourceTimeZone: calendar.sourceTimeZone,
        selected: selected.has(calendar.sourceLocalId),
      })),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
