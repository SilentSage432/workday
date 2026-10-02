"use client";

import { useEffect, useState } from "react";
import { formatLocalTimeLabel } from "@/domain/time/localTime";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  formatCivilDateLabel,
  parseCivilDate,
  workFiscalWeekDates,
  workFiscalWeekStart,
} from "@/domain/time/workFiscalWeek";
import {
  SHIFT_TYPE_LABELS,
  SHIFT_TYPES,
  offWorkDay,
  scheduledWorkDay,
  shiftEndsNextCivilDate,
  type TemporalSettings,
  type WorkScheduleEntry,
} from "@/domain/workSchedule";
import { projectWorkDay, type WorkDayFact } from "@/projections/workDay";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import {
  clearWorkScheduleEntry,
  loadTemporalSettings,
  loadWorkSchedule,
  saveTemporalSettings,
  saveWorkScheduleEntry,
} from "@/persistence/workSchedule";

const fieldClass =
  "mt-1 w-full min-h-12 rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300";
const primaryButtonClass =
  "min-h-12 rounded-md bg-stone-100 px-4 text-center text-base text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";
const secondaryButtonClass =
  "min-h-12 rounded-md border border-stone-600 bg-stone-900 px-4 text-center text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

type Phase = "loading" | "ready" | "error";

type ShiftEditor = {
  workOn: string;
  startLocal: string;
  endLocal: string;
  shiftType: string;
};

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}

function failureMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function readFact(
  entry: WorkScheduleEntry | null,
  timeZone: string,
  instant: Date,
): WorkDayFact | { state: "unreadable" } {
  try {
    return projectWorkDay({ entry, timeZone, instant });
  } catch {
    return { state: "unreadable" };
  }
}

function positionLabel(position: "before" | "during" | "after"): string {
  if (position === "before") return "Before this shift";
  if (position === "during") return "During this shift";
  return "After this shift";
}

export function WorkSchedule() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<TemporalSettings | null>(null);
  const [zoneDraft, setZoneDraft] = useState("");
  const [editingZone, setEditingZone] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [savingZone, setSavingZone] = useState(false);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [instant, setInstant] = useState(() => new Date());
  const [entries, setEntries] = useState<WorkScheduleEntry[]>([]);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [editor, setEditor] = useState<ShiftEditor | null>(null);
  const [rowError, setRowError] = useState<{ workOn: string; message: string } | null>(null);
  const [savingOn, setSavingOn] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    let ignore = false;

    async function load() {
      setPhase("loading");
      setLoadError(null);
      try {
        const loaded = await loadTemporalSettings(client);
        if (ignore) return;
        setSettings(loaded);
        if (loaded) {
          const now = new Date();
          setInstant(now);
          setWeekStart(
            (current) => current ?? formatCivilDate(workFiscalWeekStart(now, loaded.timeZone)),
          );
        } else {
          setZoneDraft(browserTimeZone());
          setEditingZone(true);
        }
        setPhase("ready");
      } catch (error: unknown) {
        if (ignore) return;
        setLoadError(failureMessage(error, "Could not load the Work schedule."));
        setPhase("error");
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!settings || !weekStart) return;
    const dates = workFiscalWeekDates(parseCivilDate(weekStart));
    const from = formatCivilDate(addCivilDays(dates[0], -1));
    const to = formatCivilDate(dates[6]);
    const client = getSupabaseBrowserClient();
    let ignore = false;

    async function loadEntries() {
      setEntriesError(null);
      try {
        const loaded = await loadWorkSchedule(client, from, to);
        if (!ignore) setEntries(loaded);
      } catch (error: unknown) {
        if (!ignore) {
          setEntriesError(failureMessage(error, "Could not load this Work week."));
        }
      }
    }

    void loadEntries();
    return () => {
      ignore = true;
    };
  }, [settings, weekStart]);

  async function onSaveZone() {
    setSavingZone(true);
    setZoneError(null);
    try {
      const now = new Date();
      const saved = await saveTemporalSettings(getSupabaseBrowserClient(), zoneDraft, now);
      setSettings(saved);
      setInstant(now);
      setWeekStart(formatCivilDate(workFiscalWeekStart(now, saved.timeZone)));
      setEditingZone(false);
    } catch (error: unknown) {
      setZoneError(failureMessage(error, "Could not save this time zone."));
    } finally {
      setSavingZone(false);
    }
  }

  function shiftWeek(delta: number) {
    if (!weekStart) return;
    setInstant(new Date());
    setEditor(null);
    setWeekStart(formatCivilDate(addCivilDays(parseCivilDate(weekStart), delta)));
  }

  function replaceEntry(entry: WorkScheduleEntry) {
    setEntries((current) => {
      const without = current.filter((item) => item.workOn !== entry.workOn);
      return [...without, entry].sort((left, right) => left.workOn.localeCompare(right.workOn));
    });
  }

  async function onMarkOff(workOn: string) {
    setSavingOn(workOn);
    setRowError(null);
    try {
      const saved = await saveWorkScheduleEntry(getSupabaseBrowserClient(), offWorkDay(workOn));
      replaceEntry(saved);
      setEditor(null);
    } catch (error: unknown) {
      setRowError({
        workOn,
        message: failureMessage(error, "Could not mark this day Off."),
      });
    } finally {
      setSavingOn(null);
    }
  }

  async function onSaveShift() {
    if (!editor) return;
    if (!editor.startLocal || !editor.endLocal || !editor.shiftType) {
      setRowError({
        workOn: editor.workOn,
        message: "A shift needs a start, an end, and Opening, Mid, or Closing.",
      });
      return;
    }
    setSavingOn(editor.workOn);
    setRowError(null);
    try {
      const saved = await saveWorkScheduleEntry(
        getSupabaseBrowserClient(),
        scheduledWorkDay(editor),
      );
      replaceEntry(saved);
      setEditor(null);
    } catch (error: unknown) {
      setRowError({
        workOn: editor.workOn,
        message: failureMessage(error, "Could not save this shift."),
      });
    } finally {
      setSavingOn(null);
    }
  }

  async function onClear(workOn: string) {
    setSavingOn(workOn);
    setRowError(null);
    try {
      await clearWorkScheduleEntry(getSupabaseBrowserClient(), workOn);
      setEntries((current) => current.filter((item) => item.workOn !== workOn));
      setEditor(null);
    } catch (error: unknown) {
      setRowError({
        workOn,
        message: `${failureMessage(error, "Could not remove this day.")} It is still saved.`,
      });
    } finally {
      setSavingOn(null);
    }
  }

  if (phase === "loading") {
    return <p className="mt-6">Loading the Work schedule.</p>;
  }

  if (phase === "error") {
    return (
      <div className="mt-6">
        <p role="alert">{loadError}</p>
        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          className={`mt-4 ${secondaryButtonClass}`}
        >
          Try again
        </button>
      </div>
    );
  }

  const weekDates = weekStart ? workFiscalWeekDates(parseCivilDate(weekStart)).map(formatCivilDate) : [];
  const today = settings
    ? formatCivilDate(civilDateInTimeZone(instant, settings.timeZone))
    : null;

  return (
    <div className="mt-6">
      <h1 className="text-xl font-medium tracking-tight">Work schedule</h1>
      <p className="mt-2 text-sm leading-6 text-stone-400">
        Your scheduled Work days. This is not a store schedule.
      </p>

      {settings && !editingZone ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-300">
            <span className="text-stone-400">Time zone </span>
            {settings.timeZone}
          </p>
          <button
            type="button"
            onClick={() => {
              setZoneDraft(settings.timeZone);
              setZoneError(null);
              setEditingZone(true);
            }}
            className="min-h-11 shrink-0 px-2 text-sm text-stone-300"
          >
            Change
          </button>
        </div>
      ) : (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSaveZone();
          }}
        >
          <label className="block text-sm font-medium" htmlFor="time-zone">
            Time zone
          </label>
          <p id="time-zone-hint" className="mt-1 text-sm text-stone-400">
            {settings
              ? "This zone interprets Work start and end times."
              : "The phone can suggest one. It is saved only when you confirm it."}
          </p>
          <input
            id="time-zone"
            name="time-zone"
            type="text"
            required
            aria-describedby="time-zone-hint"
            value={zoneDraft}
            onChange={(event) => setZoneDraft(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={fieldClass}
          />
          {zoneError ? (
            <p role="alert" className="mt-3 text-sm text-stone-200">
              {zoneError} The saved time zone is unchanged.
            </p>
          ) : null}
          <button type="submit" disabled={savingZone} className={`mt-4 w-full ${primaryButtonClass}`}>
            {savingZone ? "Saving" : "Save time zone"}
          </button>
        </form>
      )}

      {settings && weekStart && weekDates.length === 7 ? (
        <>
          {today && weekDates.includes(today) ? (
            <TodayFact today={today} entries={entries} settings={settings} instant={instant} />
          ) : null}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" onClick={() => shiftWeek(-7)} className={secondaryButtonClass}>
              Previous
            </button>
            <button type="button" onClick={() => shiftWeek(7)} className={secondaryButtonClass}>
              Next
            </button>
          </div>
          <p className="mt-4 text-sm text-stone-300">
            {formatCivilDateLabel(weekDates[0])} – {formatCivilDateLabel(weekDates[6])}
          </p>
          {entriesError ? (
            <p role="alert" className="mt-3 text-sm text-stone-200">
              {entriesError}
            </p>
          ) : null}
          <ul className="mt-2">
            {weekDates.map((workOn) => {
              const entry = entries.find((item) => item.workOn === workOn) ?? null;
              const fact = readFact(entry, settings.timeZone, instant);
              const isToday = workOn === today;
              return (
                <li key={workOn} className="border-t border-stone-800 py-4">
                  <p className="text-base font-medium">
                    {formatCivilDateLabel(workOn)}
                    {isToday ? <span className="ml-2 text-sm font-normal text-stone-400">Today</span> : null}
                  </p>
                  <DaySummary entry={entry} fact={fact} />
                  {rowError?.workOn === workOn ? (
                    <p role="alert" className="mt-2 text-sm text-stone-200">
                      {rowError.message}
                    </p>
                  ) : null}
                  {editor?.workOn === workOn ? (
                    <ShiftFields
                      editor={editor}
                      onChange={setEditor}
                      onSave={() => void onSaveShift()}
                      onCancel={() => setEditor(null)}
                      saving={savingOn === workOn}
                    />
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setRowError(null);
                          setEditor({
                            workOn,
                            startLocal: entry?.state === "scheduled" ? entry.startLocal : "",
                            endLocal: entry?.state === "scheduled" ? entry.endLocal : "",
                            shiftType: entry?.state === "scheduled" ? entry.shiftType : "",
                          });
                        }}
                        className={`flex-1 ${secondaryButtonClass}`}
                      >
                        {entry?.state === "scheduled" ? "Edit" : "Shift"}
                      </button>
                      {entry?.state === "off" ? (
                        <button
                          type="button"
                          onClick={() => void onClear(workOn)}
                          disabled={savingOn === workOn}
                          className={`flex-1 ${secondaryButtonClass}`}
                        >
                          {savingOn === workOn ? "Saving" : "Remove"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onMarkOff(workOn)}
                          disabled={savingOn === workOn}
                          className={`flex-1 ${secondaryButtonClass}`}
                        >
                          {savingOn === workOn ? "Saving" : "Off"}
                        </button>
                      )}
                      {entry?.state === "scheduled" ? (
                        <button
                          type="button"
                          onClick={() => void onClear(workOn)}
                          disabled={savingOn === workOn}
                          className={`flex-1 ${secondaryButtonClass}`}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function TodayFact({
  today,
  entries,
  settings,
  instant,
}: {
  today: string;
  entries: WorkScheduleEntry[];
  settings: TemporalSettings;
  instant: Date;
}) {
  const todayEntry = entries.find((item) => item.workOn === today) ?? null;
  const todayFact = readFact(todayEntry, settings.timeZone, instant);
  const yesterday = formatCivilDate(addCivilDays(parseCivilDate(today), -1));
  const yesterdayEntry = entries.find((item) => item.workOn === yesterday) ?? null;
  const yesterdayFact = readFact(yesterdayEntry, settings.timeZone, instant);
  const overnightStillOn =
    yesterdayFact.state === "scheduled" &&
    yesterdayFact.position === "during" &&
    todayFact.state !== "scheduled";

  return (
    <section className="mt-6 rounded-md border border-stone-700 bg-stone-900 p-4" aria-labelledby="today-schedule">
      <h2 id="today-schedule" className="text-sm font-medium text-stone-400">
        Today
      </h2>
      <p className="mt-2 text-base">
        {todayFact.state === "unknown" ? "No schedule entered" : null}
        {todayFact.state === "off" ? "Off" : null}
        {todayFact.state === "unreadable" ? "This saved time does not occur in this time zone." : null}
        {todayFact.state === "scheduled"
          ? `${formatLocalTimeLabel(todayFact.startLocal)}–${formatLocalTimeLabel(todayFact.endLocal)} · ${SHIFT_TYPE_LABELS[todayFact.shiftType]}`
          : null}
      </p>
      {todayFact.state === "scheduled" ? (
        <p className="mt-1 text-sm text-stone-300">{positionLabel(todayFact.position)}</p>
      ) : null}
      {overnightStillOn ? (
        <p className="mt-2 text-sm text-stone-300">
          {formatCivilDateLabel(yesterday)}&apos;s shift is still underway.
        </p>
      ) : null}
    </section>
  );
}

function DaySummary({
  entry,
  fact,
}: {
  entry: WorkScheduleEntry | null;
  fact: WorkDayFact | { state: "unreadable" };
}) {
  if (!entry || fact.state === "unknown") {
    return <p className="mt-1 text-sm text-stone-300">No schedule entered</p>;
  }
  if (entry.state === "off" || fact.state === "off") {
    return <p className="mt-1 text-sm text-stone-300">Off</p>;
  }
  if (fact.state === "unreadable") {
    return <p className="mt-1 text-sm text-stone-300">This saved time does not occur in this time zone.</p>;
  }
  return (
    <div className="mt-1 text-sm text-stone-300">
      <p>
        {formatLocalTimeLabel(entry.startLocal)}–{formatLocalTimeLabel(entry.endLocal)}
        {fact.state === "scheduled" && fact.endsNextCivilDate ? " · continues after midnight" : null}
      </p>
      <p>{SHIFT_TYPE_LABELS[entry.shiftType]}</p>
    </div>
  );
}

function ShiftFields({
  editor,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  editor: ShiftEditor;
  onChange: (editor: ShiftEditor) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const continues =
    editor.startLocal.length > 0 &&
    editor.endLocal.length > 0 &&
    safeContinues(editor.startLocal, editor.endLocal);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <label className="block text-sm font-medium" htmlFor={`start-${editor.workOn}`}>
          Start
        </label>
        <input
          id={`start-${editor.workOn}`}
          type="time"
          value={editor.startLocal}
          onChange={(event) => onChange({ ...editor, startLocal: event.target.value })}
          className={fieldClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor={`end-${editor.workOn}`}>
          End
        </label>
        <input
          id={`end-${editor.workOn}`}
          type="time"
          value={editor.endLocal}
          onChange={(event) => onChange({ ...editor, endLocal: event.target.value })}
          className={fieldClass}
        />
      </div>
      {continues ? <p className="text-sm text-stone-400">This shift continues after midnight.</p> : null}
      <div>
        <label className="block text-sm font-medium" htmlFor={`type-${editor.workOn}`}>
          Shift type
        </label>
        <select
          id={`type-${editor.workOn}`}
          value={editor.shiftType}
          onChange={(event) => onChange({ ...editor, shiftType: event.target.value })}
          className={fieldClass}
        >
          <option value="">Choose</option>
          {SHIFT_TYPES.map((shiftType) => (
            <option key={shiftType} value={shiftType}>
              {SHIFT_TYPE_LABELS[shiftType]}
            </option>
          ))}
        </select>
      </div>
      <button type="button" onClick={onSave} disabled={saving} className={`w-full ${primaryButtonClass}`}>
        {saving ? "Saving" : "Save shift"}
      </button>
      <button type="button" onClick={onCancel} className="min-h-11 w-full text-sm text-stone-400">
        Cancel
      </button>
    </div>
  );
}

function safeContinues(startLocal: string, endLocal: string): boolean {
  try {
    return shiftEndsNextCivilDate(startLocal, endLocal);
  } catch {
    return false;
  }
}
