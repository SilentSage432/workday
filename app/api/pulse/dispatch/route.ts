import { requirePulseDispatchSecret } from "@/server/pulseDispatch/auth";
import { dispatchPulseOccurrence } from "@/server/pulseDispatch/dispatch";
import {
  jsonOk,
  mapPulseDispatchRouteError,
} from "@/server/pulseDispatch/http";
import { parsePulseOccurrenceId } from "@/server/pulseDispatch/parse";

export const runtime = "nodejs";

/**
 * Trusted Pulse dispatcher.
 *
 * Authenticated by `X-Orient-Pulse-Dispatch-Secret`.
 * Re-reads pulse_occurrences under service_role; transports occurrence id via FCM.
 * Does not establish, mutate, or acknowledge Pulse authority.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    requirePulseDispatchSecret(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const pulseOccurrenceId = parsePulseOccurrenceId(body);
    const result = await dispatchPulseOccurrence({ pulseOccurrenceId });
    return jsonOk(result);
  } catch (error) {
    return mapPulseDispatchRouteError(error);
  }
}
