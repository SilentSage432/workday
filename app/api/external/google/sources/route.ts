import { requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { openAuthorizedGoogleCredential } from "@/server/googleCalendar/authorizedAccess";
import { enumerateGoogleCalendarList } from "@/server/googleCalendar/calendarList";
import { loadLatestGoogleConnection } from "@/server/googleCalendar/connections";
import { jsonError, jsonOk, mapRouteError } from "@/server/googleCalendar/httpJson";
import { saveGoogleSourceSelection } from "@/server/googleCalendar/sources";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export const runtime = "nodejs";

export async function PUT(request: Request): Promise<Response> {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const body = (await request.json()) as { selectedSourceLocalIds?: unknown };
    if (!Array.isArray(body.selectedSourceLocalIds)) {
      return jsonError(400, "selectedSourceLocalIds is required.");
    }
    const selectedSourceLocalIds = body.selectedSourceLocalIds.filter(
      (value): value is string => typeof value === "string",
    );

    const admin = createSupabaseServiceRoleClient();
    const connection = await loadLatestGoogleConnection(userId, admin);
    if (!connection || connection.status !== "connected") {
      return jsonError(409, "Connect Google Calendar before saving calendars.", "not_connected");
    }

    const credential = await openAuthorizedGoogleCredential({
      authenticatedUserId: userId,
      connectionId: connection.id,
    });
    const enumeration = await enumerateGoogleCalendarList({
      accessToken: credential.accessToken,
    });
    if (enumeration.status !== "complete") {
      return jsonError(
        502,
        enumeration.message,
        "enumeration_incomplete",
      );
    }

    const result = await saveGoogleSourceSelection(
      {
        authenticatedUserId: userId,
        connectionId: connection.id,
        selectedSourceLocalIds,
        enumerated: enumeration.calendars,
      },
      admin,
    );

    return jsonOk({
      connectionId: connection.id,
      selectedCount: result.selectedCount,
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
