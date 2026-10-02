import { describe, expect, it } from "vitest";
import {
  TEMPORAL_SETTINGS_COLUMNS,
  WORK_SCHEDULE_COLUMNS,
  rowToTemporalSettings,
  rowToWorkScheduleEntry,
  toTemporalSettingsWrite,
  toWorkScheduleWrite,
} from "@/persistence/workSchedule";

describe("work schedule mapping", () => {
  it("keeps ownership out of the domain objects", () => {
    const settings = rowToTemporalSettings({
      time_zone: "America/Denver",
      confirmed_at: "2026-10-02T22:00:00.000Z",
    });
    const off = rowToWorkScheduleEntry({
      work_on: "2026-10-06",
      day_state: "off",
      start_local: null,
      end_local: null,
      shift_type: null,
    });
    const scheduled = rowToWorkScheduleEntry({
      work_on: "2026-10-05",
      day_state: "scheduled",
      start_local: "06:00:00",
      end_local: "15:00:00",
      shift_type: "opening",
    });

    expect(settings).toEqual({
      timeZone: "America/Denver",
      confirmedAt: "2026-10-02T22:00:00.000Z",
    });
    expect(off).toEqual({ workOn: "2026-10-06", state: "off" });
    expect(scheduled).toEqual({
      workOn: "2026-10-05",
      state: "scheduled",
      startLocal: "06:00",
      endLocal: "15:00",
      shiftType: "opening",
    });
    expect(settings).not.toHaveProperty("userId");
    expect(off).not.toHaveProperty("user_id");
    expect(TEMPORAL_SETTINGS_COLUMNS).not.toContain("user_id");
    expect(WORK_SCHEDULE_COLUMNS).not.toContain("user_id");
  });

  it("writes one Off or scheduled state for a civil date", () => {
    expect(
      toWorkScheduleWrite("user-1", { workOn: "2026-10-06", state: "off" }),
    ).toEqual({
      user_id: "user-1",
      work_on: "2026-10-06",
      day_state: "off",
      start_local: null,
      end_local: null,
      shift_type: null,
    });

    const first = toWorkScheduleWrite("user-1", {
      workOn: "2026-10-05",
      state: "scheduled",
      startLocal: "06:00",
      endLocal: "15:00",
      shiftType: "opening",
    });
    const edited = toWorkScheduleWrite("user-1", {
      workOn: "2026-10-05",
      state: "scheduled",
      startLocal: "11:00",
      endLocal: "20:00",
      shiftType: "closing",
    });

    expect(first.work_on).toBe(edited.work_on);
    expect(edited).toMatchObject({
      start_local: "11:00:00",
      end_local: "20:00:00",
      shift_type: "closing",
    });
    expect(first).not.toHaveProperty("completed_at");
  });

  it("stores an overnight shift without swapping the local times", () => {
    expect(
      toWorkScheduleWrite("user-1", {
        workOn: "2026-10-08",
        state: "scheduled",
        startLocal: "22:00",
        endLocal: "06:00",
        shiftType: "closing",
      }),
    ).toMatchObject({
      start_local: "22:00:00",
      end_local: "06:00:00",
      shift_type: "closing",
    });
  });

  it("requires an explicit shift type and a confirmed time zone", () => {
    expect(() =>
      toWorkScheduleWrite("user-1", {
        workOn: "2026-10-05",
        state: "scheduled",
        startLocal: "06:00",
        endLocal: "15:00",
        shiftType: "opening",
      }),
    ).not.toThrow();
    expect(() =>
      toWorkScheduleWrite("user-1", {
        workOn: "2026-10-05",
        state: "scheduled",
        startLocal: "06:00",
        endLocal: "15:00",
        shiftType: "custom" as "opening",
      }),
    ).toThrow(/Opening/);

    expect(toTemporalSettingsWrite("user-1", "America/Denver", new Date("2026-10-02T22:00:00.000Z"))).toEqual({
      user_id: "user-1",
      time_zone: "America/Denver",
      confirmed_at: "2026-10-02T22:00:00.000Z",
    });
  });
});
