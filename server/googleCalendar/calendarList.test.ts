import { describe, expect, it, vi } from "vitest";
import { enumerateGoogleCalendarList, mapCalendarListEntry } from "@/server/googleCalendar/calendarList";

describe("Google CalendarList adapter", () => {
  it("maps safe selection metadata and skips deleted entries", () => {
    expect(
      mapCalendarListEntry({
        id: "cal-1",
        summary: "Work",
        primary: true,
        accessRole: "owner",
        timeZone: "America/Boise",
      }),
    ).toEqual({
      sourceLocalId: "cal-1",
      displayName: "Work",
      primary: true,
      accessRole: "owner",
      sourceTimeZone: "America/Boise",
    });
    expect(mapCalendarListEntry({ id: "gone", deleted: true })).toBeNull();
  });

  it("follows pagination to completion", async () => {
    const http = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (!url.includes("pageToken=")) {
        return Response.json({
          items: [{ id: "a", summary: "A" }],
          nextPageToken: "page-2",
        });
      }
      return Response.json({
        items: [{ id: "b", summary: "B" }],
      });
    });
    const result = await enumerateGoogleCalendarList({
      accessToken: "token",
      http: http as unknown as typeof fetch,
    });
    expect(result.status).toBe("complete");
    if (result.status !== "complete") throw new Error("expected complete");
    expect(result.calendars.map((item) => item.sourceLocalId)).toEqual(["a", "b"]);
    expect(http).toHaveBeenCalledTimes(2);
  });

  it("does not claim complete enumeration when a later page fails", async () => {
    const http = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (!url.includes("pageToken=")) {
        return Response.json({
          items: [{ id: "a", summary: "A" }],
          nextPageToken: "page-2",
        });
      }
      return new Response("nope", { status: 500 });
    });
    const result = await enumerateGoogleCalendarList({
      accessToken: "token",
      http: http as unknown as typeof fetch,
    });
    expect(result.status).toBe("partial");
    if (result.status !== "partial") throw new Error("expected partial");
    expect(result.calendars).toHaveLength(1);
  });

  it("supports zero calendars as a successful empty complete result", async () => {
    const http = vi.fn(async () => Response.json({ items: [] }));
    const result = await enumerateGoogleCalendarList({
      accessToken: "token",
      http: http as unknown as typeof fetch,
    });
    expect(result).toEqual({ status: "complete", calendars: [] });
  });
});
