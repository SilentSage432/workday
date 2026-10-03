import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMMITMENT_ORIGIN_USER_CREATED,
  defineCommitment,
  requireCommitmentOrigin,
  timedCommitmentEndsNextCivilDate,
} from "@/domain/commitment";

describe("commitment", () => {
  it("requires a title and keeps an all-day civil date", () => {
    expect(
      defineCommitment({
        kind: "all_day",
        startsOn: "2026-10-03",
        title: " School event ",
      }),
    ).toEqual({
      kind: "all_day",
      startsOn: "2026-10-03",
      title: "School event",
      origin: COMMITMENT_ORIGIN_USER_CREATED,
    });
    expect(() => defineCommitment({ kind: "all_day", startsOn: "2026-10-03", title: "  " })).toThrow(
      /title/,
    );
  });

  it("keeps a timed local interval and does not infer origin from the title", () => {
    expect(
      defineCommitment({
        kind: "timed",
        startsOn: "2026-10-08",
        startLocal: "15:07:00",
        endLocal: "16:00",
        title: "Dentist",
      }),
    ).toEqual({
      kind: "timed",
      startsOn: "2026-10-08",
      startLocal: "15:07",
      endLocal: "16:00",
      title: "Dentist",
      origin: COMMITMENT_ORIGIN_USER_CREATED,
    });
  });

  it("treats an end at or before the start as the next civil date", () => {
    expect(timedCommitmentEndsNextCivilDate("22:00", "01:00")).toBe(true);
    expect(timedCommitmentEndsNextCivilDate("22:00", "22:00")).toBe(true);
    expect(timedCommitmentEndsNextCivilDate("15:00", "16:00")).toBe(false);
  });

  it("accepts only the user-created origin this application can currently establish", () => {
    expect(requireCommitmentOrigin("user_created")).toBe("user_created");
    expect(() => requireCommitmentOrigin("google_calendar")).toThrow(/origin/);
  });

  it("does not borrow Protected Time, Blocks, Tasks, Context, or a clock", () => {
    const source = readFileSync(new URL("./commitment.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(
      /protected_time|protectedTime|context_id|task_id|planned_on|recurrence|google_|Date\.now|new Date/,
    );
  });
});
