import { describe, expect, it } from "vitest";
import { localTimeToTwelveHour, twelveHourToLocalTime } from "@/components/twelveHourTime";

describe("twelve hour time entry", () => {
  it("converts midnight, noon, morning, and evening", () => {
    expect(twelveHourToLocalTime({ hour: 12, minute: 0, meridiem: "AM" })).toBe("00:00");
    expect(twelveHourToLocalTime({ hour: 12, minute: 0, meridiem: "PM" })).toBe("12:00");
    expect(twelveHourToLocalTime({ hour: 6, minute: 0, meridiem: "AM" })).toBe("06:00");
    expect(twelveHourToLocalTime({ hour: 2, minute: 30, meridiem: "PM" })).toBe("14:30");
    expect(twelveHourToLocalTime({ hour: 11, minute: 45, meridiem: "PM" })).toBe("23:45");
  });

  it("keeps an arbitrary stored minute", () => {
    expect(localTimeToTwelveHour("07:07")).toEqual({ hour: 7, minute: 7, meridiem: "AM" });
    expect(twelveHourToLocalTime({ hour: 7, minute: 7, meridiem: "AM" })).toBe("07:07");
    expect(localTimeToTwelveHour("00:00")).toEqual({ hour: 12, minute: 0, meridiem: "AM" });
    expect(localTimeToTwelveHour("12:00")).toEqual({ hour: 12, minute: 0, meridiem: "PM" });
  });

  it("does not invent a time from a blank control", () => {
    expect(twelveHourToLocalTime({ hour: null, minute: 0, meridiem: "AM" })).toBeNull();
    expect(twelveHourToLocalTime({ hour: 6, minute: null, meridiem: "AM" })).toBeNull();
  });
});
