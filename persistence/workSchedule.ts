import type { SupabaseClient } from "@supabase/supabase-js";
import { requireIanaTimeZone } from "@/domain/time/localTime";
import { parseCivilDate, formatCivilDate } from "@/domain/time/workFiscalWeek";
import { readCompleteDateRows, requireCivilWindow } from "@/persistence/completeRead";
import {
  isShiftType,
  offWorkDay,
  scheduledWorkDay,
  type TemporalSettings,
  type WorkScheduleEntry,
} from "@/domain/workSchedule";

export const TEMPORAL_SETTINGS_COLUMNS = "time_zone, confirmed_at";
export const WORK_SCHEDULE_COLUMNS = "work_on, day_state, start_local, end_local, shift_type";

export type TemporalSettingsRow = {
  time_zone: string;
  confirmed_at: string;
};

export type WorkScheduleRow = {
  work_on: string;
  day_state: string;
  start_local: string | null;
  end_local: string | null;
  shift_type: string | null;
};

export type TemporalSettingsWriteRow = {
  user_id: string;
  time_zone: string;
  confirmed_at: string;
};

export type WorkScheduleWriteRow = {
  user_id: string;
  work_on: string;
  day_state: "off" | "scheduled";
  start_local: string | null;
  end_local: string | null;
  shift_type: "opening" | "mid" | "closing" | null;
};

function localForDatabase(value: string): string {
  return `${value}:00`;
}

export function rowToTemporalSettings(row: TemporalSettingsRow): TemporalSettings {
  return {
    timeZone: requireIanaTimeZone(row.time_zone),
    confirmedAt: row.confirmed_at,
  };
}

export function toTemporalSettingsWrite(
  userId: string,
  timeZone: string,
  confirmedAt: Date,
): TemporalSettingsWriteRow {
  if (Number.isNaN(confirmedAt.getTime())) {
    throw new Error("Confirming a time zone requires a real instant.");
  }

  return {
    user_id: userId,
    time_zone: requireIanaTimeZone(timeZone),
    confirmed_at: confirmedAt.toISOString(),
  };
}

export function rowToWorkScheduleEntry(row: WorkScheduleRow): WorkScheduleEntry {
  const workOn = formatCivilDate(parseCivilDate(row.work_on));
  if (row.day_state === "off") {
    return offWorkDay(workOn);
  }
  if (row.day_state !== "scheduled" || !row.start_local || !row.end_local || !row.shift_type) {
    throw new Error("This Work schedule row is not Off or a scheduled shift.");
  }
  if (!isShiftType(row.shift_type)) {
    throw new Error("This Work schedule row has an unknown shift type.");
  }

  return scheduledWorkDay({
    workOn,
    startLocal: row.start_local,
    endLocal: row.end_local,
    shiftType: row.shift_type,
  });
}

export function toWorkScheduleWrite(userId: string, entry: WorkScheduleEntry): WorkScheduleWriteRow {
  const workOn = formatCivilDate(parseCivilDate(entry.workOn));
  if (entry.state === "off") {
    return {
      user_id: userId,
      work_on: workOn,
      day_state: "off",
      start_local: null,
      end_local: null,
      shift_type: null,
    };
  }

  const scheduled = scheduledWorkDay(entry);
  return {
    user_id: userId,
    work_on: workOn,
    day_state: "scheduled",
    start_local: localForDatabase(scheduled.startLocal),
    end_local: localForDatabase(scheduled.endLocal),
    shift_type: scheduled.shiftType,
  };
}

async function requireUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  if (!data.user) {
    throw new Error("A signed-in user is required.");
  }
  return data.user.id;
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) {
    throw new Error(error.message);
  }
  if (data == null) {
    throw new Error("The database returned no row.");
  }
  return data;
}

export async function loadTemporalSettings(
  client: SupabaseClient,
): Promise<TemporalSettings | null> {
  const { data, error } = await client
    .from("temporal_settings")
    .select(TEMPORAL_SETTINGS_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (data == null) {
    return null;
  }
  return rowToTemporalSettings(data as TemporalSettingsRow);
}

export async function saveTemporalSettings(
  client: SupabaseClient,
  timeZone: string,
  confirmedAt: Date,
): Promise<TemporalSettings> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("temporal_settings")
    .upsert(toTemporalSettingsWrite(userId, timeZone, confirmedAt), { onConflict: "user_id" })
    .select(TEMPORAL_SETTINGS_COLUMNS)
    .single();

  return rowToTemporalSettings(unwrap(data, error) as TemporalSettingsRow);
}

export async function loadWorkSchedule(
  client: SupabaseClient,
  from: string,
  to: string,
): Promise<WorkScheduleEntry[]> {
  const range = requireCivilWindow({ from, to });
  if (range.from === undefined || range.to === undefined) {
    throw new Error("A temporal read needs a real date range.");
  }
  const rows = await readCompleteDateRows({
    client,
    table: "work_schedule_days",
    columns: WORK_SCHEDULE_COLUMNS,
    dateColumn: "work_on",
    tieBreakColumns: [],
    from: range.from,
    to: range.to,
  });
  return (rows as WorkScheduleRow[]).map(rowToWorkScheduleEntry);
}

export async function saveWorkScheduleEntry(
  client: SupabaseClient,
  entry: WorkScheduleEntry,
): Promise<WorkScheduleEntry> {
  const userId = await requireUserId(client);
  const { data, error } = await client
    .from("work_schedule_days")
    .upsert(toWorkScheduleWrite(userId, entry), { onConflict: "user_id,work_on" })
    .select(WORK_SCHEDULE_COLUMNS)
    .single();

  return rowToWorkScheduleEntry(unwrap(data, error) as WorkScheduleRow);
}

export async function clearWorkScheduleEntry(client: SupabaseClient, workOn: string): Promise<void> {
  const userId = await requireUserId(client);
  const civil = formatCivilDate(parseCivilDate(workOn));
  const { error } = await client
    .from("work_schedule_days")
    .delete()
    .eq("user_id", userId)
    .eq("work_on", civil);
  if (error) {
    throw new Error(error.message);
  }
}
