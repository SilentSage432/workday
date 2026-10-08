/**
 * Pure Google Event → provider-neutral external fact candidate.
 * No DB writes. No Orient Commitment/Block/PT/Task creation.
 * Google DTOs stay here; domain consumes only the mapped candidate.
 */

import { formatCivilDate, parseCivilDate } from "@/domain/time/workFiscalWeek";
import type { ExternalFactLifecycle } from "@/domain/externalTemporal";
import type { GoogleEvent, GoogleEventDate } from "@/server/googleCalendar/types";

const DISPLAY_LABEL_LIMIT = 240;
const FALLBACK_PRIVATE_LABEL = "Private event";
const FALLBACK_BUSY_LABEL = "Busy (external)";

export type ExternalFactCandidate = {
  sourceEventId: string;
  sourceInstanceId: string | null;
  sourceSeriesId: string | null;
  temporal:
    | { kind: "timed"; startAt: Date; endAt: Date; sourceTimeZone: string | null }
    | { kind: "all_day"; startsOn: string; endsBefore: string; sourceTimeZone: string | null };
  displayLabel: string;
  lifecycle: ExternalFactLifecycle;
  providerVersionToken: string | null;
  providerUpdatedAt: string | null;
  providerEventType: string | null;
  providerTransparency: string | null;
};

export type MapGoogleEventResult =
  | { status: "mapped"; candidate: ExternalFactCandidate }
  | { status: "rejected"; reason: string };

export function mapGoogleEventToExternalFactCandidate(event: GoogleEvent): MapGoogleEventResult {
  const sourceEventId = event.id?.trim() ?? "";
  if (sourceEventId.length === 0) {
    return { status: "rejected", reason: "missing_event_id" };
  }

  const seriesId = optionalToken(event.recurringEventId);
  const sourceInstanceId =
    seriesId !== null ? serializeOriginalStartTime(event.originalStartTime) : null;
  if (seriesId !== null && sourceInstanceId === null) {
    // Recurring occurrence without stable originalStartTime cannot be identified safely.
    return { status: "rejected", reason: "missing_original_start_time" };
  }

  const temporal = mapTemporalShape(event);
  if (temporal.status === "rejected") return temporal;

  const lifecycle = mapLifecycle(event);
  const displayLabel = resolveDisplayLabel(event);

  return {
    status: "mapped",
    candidate: {
      sourceEventId,
      sourceInstanceId,
      sourceSeriesId: seriesId,
      temporal: temporal.temporal,
      displayLabel,
      lifecycle,
      providerVersionToken: optionalOpaque(event.etag),
      providerUpdatedAt: optionalInstant(event.updated),
      providerEventType: optionalToken(event.eventType),
      providerTransparency: optionalToken(event.transparency),
    },
  };
}

function mapLifecycle(event: GoogleEvent): ExternalFactLifecycle {
  const status = event.status?.trim().toLowerCase() ?? "";
  if (status === "cancelled") {
    // Safer V1: do not strengthen cancelled into deleted.
    return "cancelled";
  }
  return "active";
}

function mapTemporalShape(
  event: GoogleEvent,
):
  | { status: "mapped"; temporal: ExternalFactCandidate["temporal"] }
  | { status: "rejected"; reason: string } {
  const start = event.start;
  const end = event.end;
  if (!start || !end) {
    return { status: "rejected", reason: "missing_start_or_end" };
  }

  const startDate = start.date?.trim();
  const endDate = end.date?.trim();
  const startDateTime = start.dateTime?.trim();
  const endDateTime = end.dateTime?.trim();

  if (startDate && endDate && !startDateTime && !endDateTime) {
    let startsOn: string;
    let endsBefore: string;
    try {
      startsOn = formatCivilDate(parseCivilDate(startDate));
      endsBefore = formatCivilDate(parseCivilDate(endDate));
    } catch {
      return { status: "rejected", reason: "malformed_all_day_dates" };
    }
    if (endsBefore <= startsOn) {
      return { status: "rejected", reason: "malformed_all_day_interval" };
    }
    return {
      status: "mapped",
      temporal: {
        kind: "all_day",
        startsOn,
        endsBefore,
        sourceTimeZone: optionalTimeZone(start.timeZone ?? end.timeZone),
      },
    };
  }

  if (startDateTime && endDateTime && !startDate && !endDate) {
    const startAt = parseInstant(startDateTime);
    const endAt = parseInstant(endDateTime);
    if (!startAt || !endAt) {
      return { status: "rejected", reason: "malformed_timed_instants" };
    }
    if (endAt.getTime() <= startAt.getTime()) {
      return { status: "rejected", reason: "malformed_timed_interval" };
    }
    return {
      status: "mapped",
      temporal: {
        kind: "timed",
        startAt,
        endAt,
        sourceTimeZone: optionalTimeZone(start.timeZone ?? end.timeZone),
      },
    };
  }

  return { status: "rejected", reason: "malformed_temporal_shape" };
}

function resolveDisplayLabel(event: GoogleEvent): string {
  const summary = sanitizeProviderText(event.summary);
  if (summary) return truncate(summary, DISPLAY_LABEL_LIMIT);
  const visibility = event.visibility?.trim().toLowerCase() ?? "";
  if (visibility === "private" || visibility === "confidential") {
    return FALLBACK_PRIVATE_LABEL;
  }
  return FALLBACK_BUSY_LABEL;
}

export function sanitizeProviderText(value: string | null | undefined): string | null {
  if (value == null) return null;
  // Strip C0 controls except tab/newline; collapse whitespace; trim.
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length === 0 ? null : cleaned;
}

function serializeOriginalStartTime(value: GoogleEventDate | undefined): string | null {
  if (!value) return null;
  if (value.dateTime?.trim()) return `datetime:${value.dateTime.trim()}`;
  if (value.date?.trim()) {
    try {
      return `date:${formatCivilDate(parseCivilDate(value.date.trim()))}`;
    } catch {
      return null;
    }
  }
  return null;
}

function parseInstant(value: string): Date | null {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  return instant;
}

function optionalToken(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function optionalOpaque(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value.length === 0 ? null : value;
}

function optionalInstant(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const instant = new Date(trimmed);
  if (Number.isNaN(instant.getTime())) return null;
  return instant.toISOString();
}

function optionalTimeZone(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return value.slice(0, limit);
}
