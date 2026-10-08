import { describe, expect, it, vi } from "vitest";
import { listGoogleCalendarEvents } from "@/server/googleCalendar/events";

describe("listGoogleCalendarEvents", () => {
  it("completes a one-page and zero-event observation", async () => {
    const http = vi.fn(async () =>
      Response.json({
        items: [{ id: "a", start: { dateTime: "2026-10-07T15:00:00Z" }, end: { dateTime: "2026-10-07T16:00:00Z" } }],
      }),
    );
    const one = await listGoogleCalendarEvents({
      accessToken: "token",
      calendarId: "cal-1",
      timeMin: "2026-09-30T06:00:00.000Z",
      timeMax: "2026-11-19T07:00:00.000Z",
      http: http as unknown as typeof fetch,
    });
    expect(one).toEqual({
      status: "complete",
      events: [expect.objectContaining({ id: "a" })],
    });

    const emptyHttp = vi.fn(async () => Response.json({ items: [] }));
    const empty = await listGoogleCalendarEvents({
      accessToken: "token",
      calendarId: "cal-1",
      timeMin: "2026-09-30T06:00:00.000Z",
      timeMax: "2026-11-19T07:00:00.000Z",
      http: emptyHttp as unknown as typeof fetch,
    });
    expect(empty).toEqual({ status: "complete", events: [] });
  });

  it("follows pagination completely and uses required query flags", async () => {
    const http = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      expect(url).toContain("singleEvents=true");
      expect(url).toContain("showDeleted=true");
      expect(url).toContain(encodeURIComponent("cal/with spaces"));
      if (!url.includes("pageToken=")) {
        return Response.json({ items: [{ id: "a" }], nextPageToken: "p2" });
      }
      return Response.json({ items: [{ id: "b" }] });
    });
    const result = await listGoogleCalendarEvents({
      accessToken: "token",
      calendarId: "cal/with spaces",
      timeMin: "2026-09-30T06:00:00.000Z",
      timeMax: "2026-11-19T07:00:00.000Z",
      http: http as unknown as typeof fetch,
    });
    expect(result.status).toBe("complete");
    if (result.status !== "complete") throw new Error("complete");
    expect(result.events.map((event) => event.id)).toEqual(["a", "b"]);
    expect(http).toHaveBeenCalledTimes(2);
  });

  it("does not claim complete observation after a later page fails", async () => {
    const http = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (!url.includes("pageToken=")) {
        return Response.json({ items: [{ id: "a" }], nextPageToken: "p2" });
      }
      return new Response("nope", { status: 500 });
    });
    const result = await listGoogleCalendarEvents({
      accessToken: "token",
      calendarId: "cal-1",
      timeMin: "2026-09-30T06:00:00.000Z",
      timeMax: "2026-11-19T07:00:00.000Z",
      http: http as unknown as typeof fetch,
    });
    expect(result.status).toBe("partial");
    if (result.status !== "partial") throw new Error("partial");
    expect(result.events).toHaveLength(1);
    expect(result.code).toBe("partial_paginated_observation");
  });

  it("maps auth, permission, rate-limit, and malformed failures without inventing empty success", async () => {
    for (const [status, code] of [
      [401, "authorization_invalid"],
      [403, "permission_denied"],
      [429, "rate_limited"],
    ] as const) {
      const http = vi.fn(async () => new Response("x", { status }));
      const result = await listGoogleCalendarEvents({
        accessToken: "token",
        calendarId: "cal-1",
        timeMin: "2026-09-30T06:00:00.000Z",
        timeMax: "2026-11-19T07:00:00.000Z",
        http: http as unknown as typeof fetch,
      });
      expect(result.status).toBe("failure");
      if (result.status !== "failure") throw new Error("failure");
      expect(result.code).toBe(code);
      expect(result.events).toEqual([]);
    }

    const malformed = await listGoogleCalendarEvents({
      accessToken: "token",
      calendarId: "cal-1",
      timeMin: "2026-09-30T06:00:00.000Z",
      timeMax: "2026-11-19T07:00:00.000Z",
      http: vi.fn(async () => new Response("not-json", { status: 200 })) as unknown as typeof fetch,
    });
    expect(malformed.status).toBe("failure");
    if (malformed.status !== "failure") throw new Error("failure");
    expect(malformed.code).toBe("malformed_provider_response");
  });
});
