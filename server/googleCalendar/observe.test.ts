import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  loadLatestGoogleConnection: vi.fn(),
  openAuthorizedGoogleCredential: vi.fn(),
  listGoogleCalendarEvents: vi.fn(),
  persistSourceObservation: vi.fn(),
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/server/googleCalendar/connections", () => ({
  loadLatestGoogleConnection: deps.loadLatestGoogleConnection,
}));
vi.mock("@/server/googleCalendar/authorizedAccess", () => ({
  openAuthorizedGoogleCredential: deps.openAuthorizedGoogleCredential,
}));
vi.mock("@/server/googleCalendar/events", () => ({
  listGoogleCalendarEvents: deps.listGoogleCalendarEvents,
}));
vi.mock("@/server/googleCalendar/observationPersistence", () => ({
  ObservationPersistenceError: class ObservationPersistenceError extends Error {
    code = "observation_persistence_failure";
  },
  persistSourceObservation: deps.persistSourceObservation,
}));
vi.mock("@/server/supabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: deps.createSupabaseServiceRoleClient,
}));

import { observeSelectedGoogleSources } from "@/server/googleCalendar/observe";

function adminMock(sources: Array<Record<string, unknown>>) {
  return {
    from(table: string) {
      if (table === "temporal_settings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { time_zone: "America/Boise" }, error: null }),
            }),
          }),
        };
      }
      if (table === "external_temporal_sources") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: async () => ({ data: sources, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("observeSelectedGoogleSources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.loadLatestGoogleConnection.mockResolvedValue({
      id: "conn-1",
      status: "connected",
    });
    deps.openAuthorizedGoogleCredential.mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      tokenType: "Bearer",
      accessTokenExpiresAtMs: Date.now() + 60_000,
      scope: "https://www.googleapis.com/auth/calendar.readonly",
    });
    deps.persistSourceObservation.mockResolvedValue(undefined);
  });

  it("is a truthful no-op when no Sources are selected", async () => {
    deps.createSupabaseServiceRoleClient.mockReturnValue(adminMock([]));
    const result = await observeSelectedGoogleSources({
      authenticatedUserId: "user-1",
      force: true,
      now: new Date("2026-10-07T18:00:00.000Z"),
    });
    expect(result.selectedSourceCount).toBe(0);
    expect(result.successfulSourceCount).toBe(0);
    expect(deps.listGoogleCalendarEvents).not.toHaveBeenCalled();
    expect(deps.persistSourceObservation).not.toHaveBeenCalled();
  });

  it("observes only selected Sources and records complete zero-event success", async () => {
    deps.createSupabaseServiceRoleClient.mockReturnValue(
      adminMock([
        {
          id: "source-1",
          source_local_id: "cal-1",
          display_name: "Work",
          selected: true,
          last_successful_observed_at: null,
          last_attempted_at: null,
        },
      ]),
    );
    deps.listGoogleCalendarEvents.mockResolvedValue({ status: "complete", events: [] });

    const result = await observeSelectedGoogleSources({
      authenticatedUserId: "user-1",
      force: true,
      now: new Date("2026-10-07T18:00:00.000Z"),
    });

    expect(deps.listGoogleCalendarEvents).toHaveBeenCalledTimes(1);
    expect(deps.listGoogleCalendarEvents.mock.calls[0][0].calendarId).toBe("cal-1");
    expect(result.successfulSourceCount).toBe(1);
    expect(result.sources[0]?.observedEventCount).toBe(0);
    expect(deps.persistSourceObservation).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptResult: "success_complete",
        applyAbsence: true,
        facts: [],
      }),
      expect.anything(),
    );
  });

  it("preserves per-Source truth when one Source fails", async () => {
    deps.createSupabaseServiceRoleClient.mockReturnValue(
      adminMock([
        {
          id: "source-1",
          source_local_id: "cal-1",
          display_name: "A",
          selected: true,
          last_attempted_at: null,
          last_successful_observed_at: null,
        },
        {
          id: "source-2",
          source_local_id: "cal-2",
          display_name: "B",
          selected: true,
          last_attempted_at: null,
          last_successful_observed_at: null,
        },
      ]),
    );
    deps.listGoogleCalendarEvents
      .mockResolvedValueOnce({
        status: "complete",
        events: [
          {
            id: "evt-1",
            summary: "Meet",
            start: { dateTime: "2026-10-07T15:00:00Z" },
            end: { dateTime: "2026-10-07T16:00:00Z" },
          },
        ],
      })
      .mockResolvedValueOnce({
        status: "failure",
        events: [],
        code: "transient_provider_failure",
        message: "down",
      });

    const result = await observeSelectedGoogleSources({
      authenticatedUserId: "user-1",
      force: true,
      now: new Date("2026-10-07T18:00:00.000Z"),
    });

    expect(result.successfulSourceCount).toBe(1);
    expect(result.failedSourceCount).toBe(1);
    expect(deps.persistSourceObservation).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: "source-2", attemptResult: "failure", applyAbsence: false }),
      expect.anything(),
    );
  });

  it("does not claim success when persistence fails after a complete provider fetch", async () => {
    deps.createSupabaseServiceRoleClient.mockReturnValue(
      adminMock([
        {
          id: "source-1",
          source_local_id: "cal-1",
          display_name: "Work",
          selected: true,
          last_attempted_at: null,
          last_successful_observed_at: null,
        },
      ]),
    );
    deps.listGoogleCalendarEvents.mockResolvedValue({ status: "complete", events: [] });
    deps.persistSourceObservation.mockRejectedValue(new Error("db down"));

    const result = await observeSelectedGoogleSources({
      authenticatedUserId: "user-1",
      force: true,
      now: new Date("2026-10-07T18:00:00.000Z"),
    });
    expect(result.successfulSourceCount).toBe(0);
    expect(result.failedSourceCount).toBe(1);
    expect(result.sources[0]?.result).toBe("failure");
  });

  it("throttles automatic observation unless force is set", async () => {
    const recent = new Date("2026-10-07T17:50:00.000Z").toISOString();
    deps.createSupabaseServiceRoleClient.mockReturnValue(
      adminMock([
        {
          id: "source-1",
          source_local_id: "cal-1",
          display_name: "Work",
          selected: true,
          last_attempted_at: recent,
          last_successful_observed_at: recent,
        },
      ]),
    );
    const result = await observeSelectedGoogleSources({
      authenticatedUserId: "user-1",
      force: false,
      now: new Date("2026-10-07T18:00:00.000Z"),
    });
    expect(result.skippedThrottleCount).toBe(1);
    expect(deps.listGoogleCalendarEvents).not.toHaveBeenCalled();
  });

  it("marks reconnect required on authorization invalid without treating it as zero events", async () => {
    deps.createSupabaseServiceRoleClient.mockReturnValue(
      adminMock([
        {
          id: "source-1",
          source_local_id: "cal-1",
          display_name: "Work",
          selected: true,
          last_attempted_at: null,
          last_successful_observed_at: "2026-10-01T00:00:00.000Z",
        },
      ]),
    );
    deps.listGoogleCalendarEvents.mockResolvedValue({
      status: "failure",
      events: [],
      code: "authorization_invalid",
      message: "auth",
    });
    const result = await observeSelectedGoogleSources({
      authenticatedUserId: "user-1",
      force: true,
      now: new Date("2026-10-07T18:00:00.000Z"),
    });
    expect(result.reconnectRequired).toBe(true);
    expect(result.sources[0]?.observedEventCount).toBeNull();
    expect(deps.persistSourceObservation).toHaveBeenCalledWith(
      expect.objectContaining({ attemptResult: "failure", applyAbsence: false }),
      expect.anything(),
    );
  });
});
