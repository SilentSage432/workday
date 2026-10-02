"use client";

import { useEffect, useRef, useState } from "react";
import { TodayScheduleFact, WorkWeek } from "@/components/WorkWeek";
import {
  afterDaySaved,
  beginWeekEdit,
  cancelShiftDraft,
  closedWeekEdit,
  finishWeekEdit,
  openShiftDraft,
  requestWeekChange,
  updateShiftDraft,
  type WeekEditSession,
} from "@/components/workScheduleSession";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
  workFiscalWeekDates,
  workFiscalWeekStart,
} from "@/domain/time/workFiscalWeek";
import {
  offWorkDay,
  scheduledWorkDay,
  type TemporalSettings,
  type WorkScheduleEntry,
} from "@/domain/workSchedule";
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
  const [session, setSession] = useState<WeekEditSession>(closedWeekEdit);
  const [rowError, setRowError] = useState<{ workOn: string; message: string } | null>(null);
  const [savingOn, setSavingOn] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const previousDraftOn = useRef<string | null>(null);

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

  useEffect(() => {
    const open = session.draft?.workOn ?? null;
    if (open) {
      document.getElementById(`start-${open}`)?.focus();
    } else if (previousDraftOn.current) {
      document.getElementById(`shift-control-${previousDraftOn.current}`)?.focus();
    }
    previousDraftOn.current = open;
  }, [session.draft?.workOn]);

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

  function entryOn(workOn: string): WorkScheduleEntry | null {
    return entries.find((item) => item.workOn === workOn) ?? null;
  }

  function shiftWeek(delta: number) {
    if (!weekStart) return;
    const openEntry = session.draft ? entryOn(session.draft.workOn) : null;
    const next = requestWeekChange(session, weekStart, delta, openEntry);
    setSession(next.session);
    if (next.weekStart !== weekStart) {
      setInstant(new Date());
      setRowError(null);
      setWeekStart(next.weekStart);
    }
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
      setSession((current) => afterDaySaved(current));
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
    if (!session.draft) return;
    const draft = session.draft;
    if (!draft.startLocal || !draft.endLocal || !draft.shiftType) {
      setRowError({
        workOn: draft.workOn,
        message: "A shift needs a start, an end, and Opening, Mid, or Closing.",
      });
      return;
    }
    setSavingOn(draft.workOn);
    setRowError(null);
    try {
      const saved = await saveWorkScheduleEntry(
        getSupabaseBrowserClient(),
        scheduledWorkDay(draft),
      );
      replaceEntry(saved);
      setSession((current) => afterDaySaved(current));
    } catch (error: unknown) {
      setRowError({
        workOn: draft.workOn,
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
      setSession((current) => afterDaySaved(current));
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
  const today = settings ? formatCivilDate(civilDateInTimeZone(instant, settings.timeZone)) : null;
  const todayVisible = today !== null && weekDates.includes(today);

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

      {settings && todayVisible ? (
        <TodayScheduleFact entry={entries.find((item) => item.workOn === today) ?? null} />
      ) : null}

      {settings && weekStart && weekDates.length === 7 ? (
        <>
          {entriesError ? (
            <p role="alert" className="mt-3 text-sm text-stone-200">
              {entriesError}
            </p>
          ) : null}
          <WorkWeek
            weekDates={weekDates}
            entries={entries}
            today={today}
            session={session}
            rowError={rowError}
            savingOn={savingOn}
            onBeginEdit={() => setSession(beginWeekEdit())}
            onFinishEdit={() =>
              setSession((current) =>
                finishWeekEdit(current, current.draft ? entryOn(current.draft.workOn) : null),
              )
            }
            onOpenShift={(workOn) =>
              setSession((current) =>
                openShiftDraft(
                  current,
                  workOn,
                  current.draft ? entryOn(current.draft.workOn) : null,
                  entryOn(workOn),
                ),
              )
            }
            onMarkOff={(workOn) => void onMarkOff(workOn)}
            onClear={(workOn) => void onClear(workOn)}
            onDraftChange={(draft) => setSession((current) => updateShiftDraft(current, draft))}
            onSaveShift={() => void onSaveShift()}
            onCancelShift={() => setSession((current) => cancelShiftDraft(current))}
            onShiftWeek={shiftWeek}
          />
        </>
      ) : null}
    </div>
  );
}
