import { requireAuthenticatedUserId } from "@/server/auth/requireAuthenticatedUser";
import { jsonOk, mapRouteError } from "@/server/googleCalendar/httpJson";
import { observeSelectedGoogleSources } from "@/server/googleCalendar/observe";

export const runtime = "nodejs";

/**
 * Canonical authenticated observation entry.
 * force=true bypasses the automatic throttle (manual refresh / post-selection).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const userId = await requireAuthenticatedUserId(request);
    let force = false;
    try {
      const body = (await request.json()) as { force?: unknown };
      force = body.force === true;
    } catch {
      force = false;
    }

    const result = await observeSelectedGoogleSources({
      authenticatedUserId: userId,
      force,
    });

    return jsonOk({
      connectionId: result.connectionId,
      windowStartsOn: result.windowStartsOn,
      windowEndsBefore: result.windowEndsBefore,
      selectedSourceCount: result.selectedSourceCount,
      successfulSourceCount: result.successfulSourceCount,
      failedSourceCount: result.failedSourceCount,
      partialSourceCount: result.partialSourceCount,
      skippedThrottleCount: result.skippedThrottleCount,
      reconnectRequired: result.reconnectRequired,
      sources: result.sources.map((source) => ({
        sourceId: source.sourceId,
        sourceLocalId: source.sourceLocalId,
        displayName: source.displayName,
        result: source.result,
        observedEventCount: source.observedEventCount,
        code: source.code,
        message: source.message,
        reconnectRequired: source.reconnectRequired,
      })),
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
