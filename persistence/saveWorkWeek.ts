import type { SupabaseClient } from "@supabase/supabase-js";
import type { WeekWrite } from "@/components/weekDraft";

export type WorkWeekChangeRow = {
  work_on: string;
  day_state: "unknown" | "off" | "scheduled";
  start_local?: string;
  end_local?: string;
  shift_type?: string;
};

export function toSaveWorkWeekArgs(weekStart: string, writes: WeekWrite[]): {
  week_start: string;
  changes: WorkWeekChangeRow[];
} {
  return {
    week_start: weekStart,
    changes: writes.map((write) => {
      if (write.action === "clear") {
        return { work_on: write.workOn, day_state: "unknown" };
      }
      if (write.entry.state === "off") {
        return { work_on: write.workOn, day_state: "off" };
      }
      return {
        work_on: write.workOn,
        day_state: "scheduled",
        start_local: write.entry.startLocal,
        end_local: write.entry.endLocal,
        shift_type: write.entry.shiftType,
      };
    }),
  };
}

export async function saveWorkWeek(
  client: SupabaseClient,
  weekStart: string,
  writes: WeekWrite[],
): Promise<void> {
  if (writes.length === 0) {
    return;
  }
  const { error } = await client.rpc("save_work_week", toSaveWorkWeekArgs(weekStart, writes));
  if (error) {
    throw new Error("This week was not saved.");
  }
}
