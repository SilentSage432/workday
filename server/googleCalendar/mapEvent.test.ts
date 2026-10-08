import { describe, expect, it } from "vitest";
import { mapGoogleEventToExternalFactCandidate, sanitizeProviderText } from "@/server/googleCalendar/mapEvent";
import type { GoogleEvent } from "@/server/googleCalendar/types";

describe("mapGoogleEventToExternalFactCandidate", () => {
  it("maps a timed timezone-aware event", () => {
    const result = mapGoogleEventToExternalFactCandidate({
      id: "evt-1",
      status: "confirmed",
      summary: "Standup",
      etag: "etag-1",
      updated: "2026-10-07T14:00:00.000Z",
      eventType: "default",
      transparency: "opaque",
      start: { dateTime: "2026-10-07T15:00:00-06:00", timeZone: "America/Boise" },
      end: { dateTime: "2026-10-07T16:00:00-06:00", timeZone: "America/Boise" },
    });
    expect(result.status).toBe("mapped");
    if (result.status !== "mapped") throw new Error("expected mapped");
    expect(result.candidate.temporal.kind).toBe("timed");
    if (result.candidate.temporal.kind !== "timed") throw new Error("timed");
    expect(result.candidate.displayLabel).toBe("Standup");
    expect(result.candidate.lifecycle).toBe("active");
    expect(result.candidate.temporal.sourceTimeZone).toBe("America/Boise");
    expect(result.candidate.providerEventType).toBe("default");
    expect(result.candidate.providerTransparency).toBe("opaque");
    expect(result.candidate.providerVersionToken).toBe("etag-1");
  });

  it("maps an overnight timed event without manufacturing civil ownership fields", () => {
    const result = mapGoogleEventToExternalFactCandidate({
      id: "overnight",
      summary: "Night",
      start: { dateTime: "2026-10-07T22:00:00-06:00" },
      end: { dateTime: "2026-10-08T02:00:00-06:00" },
    });
    expect(result.status).toBe("mapped");
    if (result.status !== "mapped" || result.candidate.temporal.kind !== "timed") throw new Error("timed");
    expect(result.candidate.temporal.endAt.getTime()).toBeGreaterThan(result.candidate.temporal.startAt.getTime());
    expect(result.candidate).not.toHaveProperty("startsOn");
  });

  it("maps one-day and multi-day all-day events with exclusive ends_before", () => {
    const oneDay = mapGoogleEventToExternalFactCandidate({
      id: "all-1",
      summary: "Holiday",
      start: { date: "2026-10-07" },
      end: { date: "2026-10-08" },
    });
    expect(oneDay.status).toBe("mapped");
    if (oneDay.status !== "mapped" || oneDay.candidate.temporal.kind !== "all_day") throw new Error("all_day");
    expect(oneDay.candidate.temporal).toMatchObject({ startsOn: "2026-10-07", endsBefore: "2026-10-08" });

    const multi = mapGoogleEventToExternalFactCandidate({
      id: "all-2",
      summary: "Trip",
      start: { date: "2026-10-07" },
      end: { date: "2026-10-10" },
    });
    expect(multi.status).toBe("mapped");
    if (multi.status !== "mapped" || multi.candidate.temporal.kind !== "all_day") throw new Error("all_day");
    expect(multi.candidate.temporal).toMatchObject({ startsOn: "2026-10-07", endsBefore: "2026-10-10" });
  });

  it("uses truthful fallbacks when summary is missing or private", () => {
    const missing = mapGoogleEventToExternalFactCandidate({
      id: "p1",
      start: { dateTime: "2026-10-07T15:00:00Z" },
      end: { dateTime: "2026-10-07T16:00:00Z" },
    });
    expect(missing.status).toBe("mapped");
    if (missing.status !== "mapped") throw new Error("mapped");
    expect(missing.candidate.displayLabel).toBe("Busy (external)");

    const priv = mapGoogleEventToExternalFactCandidate({
      id: "p2",
      visibility: "private",
      start: { dateTime: "2026-10-07T15:00:00Z" },
      end: { dateTime: "2026-10-07T16:00:00Z" },
    });
    expect(priv.status).toBe("mapped");
    if (priv.status !== "mapped") throw new Error("mapped");
    expect(priv.candidate.displayLabel).toBe("Private event");
  });

  it("establishes recurring occurrence identity from originalStartTime", () => {
    const result = mapGoogleEventToExternalFactCandidate({
      id: "instance-1",
      recurringEventId: "series-9",
      originalStartTime: { dateTime: "2026-10-07T15:00:00-06:00" },
      summary: "Weekly",
      start: { dateTime: "2026-10-07T16:00:00-06:00" },
      end: { dateTime: "2026-10-07T17:00:00-06:00" },
    });
    expect(result.status).toBe("mapped");
    if (result.status !== "mapped") throw new Error("mapped");
    expect(result.candidate.sourceEventId).toBe("instance-1");
    expect(result.candidate.sourceSeriesId).toBe("series-9");
    expect(result.candidate.sourceInstanceId).toBe("datetime:2026-10-07T15:00:00-06:00");
  });

  it("maps cancelled occurrences without strengthening to deleted", () => {
    const result = mapGoogleEventToExternalFactCandidate({
      id: "cancelled-1",
      status: "cancelled",
      recurringEventId: "series-9",
      originalStartTime: { dateTime: "2026-10-07T15:00:00Z" },
      start: { dateTime: "2026-10-07T15:00:00Z" },
      end: { dateTime: "2026-10-07T16:00:00Z" },
    });
    expect(result.status).toBe("mapped");
    if (result.status !== "mapped") throw new Error("mapped");
    expect(result.candidate.lifecycle).toBe("cancelled");
  });

  it("rejects malformed temporal shapes", () => {
    const mixed: GoogleEvent = {
      id: "bad",
      start: { date: "2026-10-07", dateTime: "2026-10-07T15:00:00Z" },
      end: { date: "2026-10-08" },
    };
    expect(mapGoogleEventToExternalFactCandidate(mixed).status).toBe("rejected");
    expect(
      mapGoogleEventToExternalFactCandidate({
        id: "bad2",
        start: { dateTime: "2026-10-07T16:00:00Z" },
        end: { dateTime: "2026-10-07T15:00:00Z" },
      }).status,
    ).toBe("rejected");
  });

  it("sanitizes and truncates provider text", () => {
    expect(sanitizeProviderText("  Hello\u0000 world  ")).toBe("Hello world");
    const long = "x".repeat(300);
    const mapped = mapGoogleEventToExternalFactCandidate({
      id: "long",
      summary: long,
      start: { dateTime: "2026-10-07T15:00:00Z" },
      end: { dateTime: "2026-10-07T16:00:00Z" },
    });
    expect(mapped.status).toBe("mapped");
    if (mapped.status !== "mapped") throw new Error("mapped");
    expect(mapped.candidate.displayLabel.length).toBe(240);
  });

  it("does not leak Google DTO field names into candidate shape keys beyond mapped evidence", () => {
    const result = mapGoogleEventToExternalFactCandidate({
      id: "evt",
      summary: "A",
      iCalUID: "uid@google.com",
      start: { dateTime: "2026-10-07T15:00:00Z" },
      end: { dateTime: "2026-10-07T16:00:00Z" },
    });
    expect(result.status).toBe("mapped");
    if (result.status !== "mapped") throw new Error("mapped");
    expect(JSON.stringify(result.candidate)).not.toMatch(/iCalUID|dateTime|recurringEventId/);
  });
});
