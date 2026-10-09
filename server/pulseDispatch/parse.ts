import { assertServerOnly } from "@/server/assertServerOnly";
import { PulseDispatchError } from "@/server/pulseDispatch/errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPulseOccurrenceId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Extract pulse_occurrence_id only.
 *
 * Accepted shapes:
 * - `{ "pulse_occurrence_id": "<uuid>" }`
 * - Supabase Database Webhook INSERT payload: `{ "type": "INSERT", "record": { "id": "<uuid>", ... } }`
 *   (and variants that still expose `record.id`)
 *
 * All other fields — including webhook `user_id`, timing, grant, content — are ignored.
 */
export function parsePulseOccurrenceId(body: unknown): string {
  assertServerOnly("parsePulseOccurrenceId");

  if (!body || typeof body !== "object") {
    throw new PulseDispatchError(
      "dispatch_malformed_input",
      "Pulse dispatch request body is malformed.",
    );
  }

  const record = body as Record<string, unknown>;

  if (isPulseOccurrenceId(record.pulse_occurrence_id)) {
    return record.pulse_occurrence_id;
  }

  const nested = record.record;
  if (nested && typeof nested === "object") {
    const nestedId = (nested as Record<string, unknown>).id;
    if (isPulseOccurrenceId(nestedId)) {
      return nestedId;
    }
  }

  throw new PulseDispatchError(
    "dispatch_malformed_input",
    "Pulse dispatch request body is malformed.",
  );
}
