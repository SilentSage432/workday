import { describe, expect, it } from "vitest";
import {
  EXTERNAL_CONNECTION_COLUMNS,
  EXTERNAL_FACT_COLUMNS,
  EXTERNAL_SOURCE_COLUMNS,
  EXTERNAL_TEMPORAL_READ_HAS_NO_CREDENTIAL_FIELDS,
  rowToExternalConnection,
  rowToExternalTemporalFact,
  rowToObservedTemporalSource,
  type ExternalConnectionRow,
  type ExternalTemporalFactRow,
  type ObservedTemporalSourceRow,
} from "@/persistence/externalTemporal";

const baseFact: ExternalTemporalFactRow = {
  id: "fact-1",
  user_id: "user-1",
  source_id: "source-1",
  source_event_id: "evt-1",
  source_instance_id: null,
  source_series_id: null,
  temporal_kind: "timed",
  start_at: "2026-10-07T15:00:00.000Z",
  end_at: "2026-10-07T16:00:00.000Z",
  starts_on: null,
  ends_before: null,
  source_time_zone: "America/Boise",
  display_label: "Standup",
  lifecycle: "active",
  provider_version_token: "etag-1",
  provider_updated_at: "2026-10-07T14:00:00.000Z",
  provider_event_type: "default",
  provider_transparency: "opaque",
  last_observed_at: "2026-10-07T16:30:00.000Z",
  created_at: "2026-10-07T12:00:00.000Z",
  updated_at: "2026-10-07T16:30:00.000Z",
};

describe("external temporal persistence mapping", () => {
  it("maps connection rows without credential fields", () => {
    const row: ExternalConnectionRow = {
      id: "conn-1",
      user_id: "user-1",
      provider_type: "google_calendar",
      status: "connected",
      display_label: null,
      created_at: "2026-10-07T12:00:00.000Z",
      updated_at: "2026-10-07T12:00:00.000Z",
    };
    const connection = rowToExternalConnection(row);
    expect(connection.providerType).toBe("google_calendar");
    expect(EXTERNAL_TEMPORAL_READ_HAS_NO_CREDENTIAL_FIELDS).toBe(true);
    expect(EXTERNAL_CONNECTION_COLUMNS).not.toMatch(/token|ciphertext|secret/i);
  });

  it("maps observed source provenance and health", () => {
    const row: ObservedTemporalSourceRow = {
      id: "source-1",
      user_id: "user-1",
      connection_id: "conn-1",
      source_local_id: "cal-1",
      display_name: "Team",
      selected: true,
      provider_access_role: "owner",
      source_time_zone: "America/Boise",
      last_attempted_at: "2026-10-07T16:30:00.000Z",
      last_attempt_result: "success_complete",
      last_successful_observed_at: "2026-10-07T16:30:00.000Z",
      last_successful_window_starts_on: "2026-09-30",
      last_successful_window_ends_before: "2026-11-18",
      created_at: "2026-10-07T12:00:00.000Z",
      updated_at: "2026-10-07T16:30:00.000Z",
    };
    const source = rowToObservedTemporalSource(row);
    expect(source.displayName).toBe("Team");
    expect(source.lastAttemptResult).toBe("success_complete");
    expect(EXTERNAL_SOURCE_COLUMNS).not.toMatch(/token|ciphertext|secret/i);
  });

  it("maps timed and all-day rows to domain facts", () => {
    const timed = rowToExternalTemporalFact(baseFact);
    expect(timed.kind).toBe("timed");
    if (timed.kind !== "timed") throw new Error("expected timed");
    expect(timed.displayLabel).toBe("Standup");
    expect(timed.providerVersionToken).toBe("etag-1");
    expect(timed.startAt.toISOString()).toBe("2026-10-07T15:00:00.000Z");

    const allDay = rowToExternalTemporalFact({
      ...baseFact,
      id: "fact-2",
      temporal_kind: "all_day",
      start_at: null,
      end_at: null,
      starts_on: "2026-10-07",
      ends_before: "2026-10-10",
      display_label: "Trip",
    });
    expect(allDay.kind).toBe("all_day");
    if (allDay.kind !== "all_day") throw new Error("expected all_day");
    expect(allDay.endsBefore).toBe("2026-10-10");
  });

  it("rejects malformed mixed shapes", () => {
    expect(() =>
      rowToExternalTemporalFact({
        ...baseFact,
        temporal_kind: "timed",
        starts_on: "2026-10-07",
        ends_before: "2026-10-08",
      }),
    ).toThrow(/all-day civil bounds/i);

    expect(() =>
      rowToExternalTemporalFact({
        ...baseFact,
        temporal_kind: "all_day",
        start_at: "2026-10-07T15:00:00.000Z",
        end_at: "2026-10-07T16:00:00.000Z",
        starts_on: "2026-10-07",
        ends_before: "2026-10-08",
      }),
    ).toThrow(/timed instants/i);

    expect(() =>
      rowToExternalTemporalFact({
        ...baseFact,
        temporal_kind: "mystery",
      }),
    ).toThrow(/unknown temporal kind/i);
  });

  it("does not expose credential column names on facts", () => {
    expect(EXTERNAL_FACT_COLUMNS).not.toMatch(/ciphertext|access_token|refresh_token|client_secret/);
  });
});
