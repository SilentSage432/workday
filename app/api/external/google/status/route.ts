import { requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { loadLatestGoogleConnection } from "@/server/googleCalendar/connections";
import { jsonOk, mapRouteError } from "@/server/googleCalendar/httpJson";
import { listGoogleSourcesForConnection } from "@/server/googleCalendar/sources";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const admin = createSupabaseServiceRoleClient();
    const connection = await loadLatestGoogleConnection(userId, admin);
    if (!connection || connection.status === "disconnected") {
      return jsonOk({
        status: "disconnected",
        connectionId: null,
        selectedCount: 0,
        sources: [],
      });
    }

    const sources =
      connection.status === "connected"
        ? await listGoogleSourcesForConnection(
            { authenticatedUserId: userId, connectionId: connection.id },
            admin,
          )
        : [];

    return jsonOk({
      status: connection.status,
      connectionId: connection.id,
      displayLabel: connection.display_label,
      selectedCount: sources.filter((source) => source.selected).length,
      sources: sources.map((source) => ({
        id: source.id,
        sourceLocalId: source.source_local_id,
        displayName: source.display_name,
        selected: source.selected,
        sourceTimeZone: source.source_time_zone,
        accessRole: source.provider_access_role,
        lastAttemptedAt: source.last_attempted_at,
        lastAttemptResult: source.last_attempt_result,
        lastSuccessfulObservedAt: source.last_successful_observed_at,
        lastSuccessfulWindowStartsOn: source.last_successful_window_starts_on,
        lastSuccessfulWindowEndsBefore: source.last_successful_window_ends_before,
      })),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
