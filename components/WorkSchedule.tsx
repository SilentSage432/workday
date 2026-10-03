"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useBlockNavigation } from "@/components/navigationGuard";
import { BlocksSection } from "@/components/BlocksSection";
import { CommitmentsSection } from "@/components/CommitmentsSection";
import { ProtectedTimeSection } from "@/components/ProtectedTimeSection";
import { TodayScheduleFact, WorkWeek } from "@/components/WorkWeek";
import {
  planWeekSave,
  replaceDay,
  weekDraftFromEntries,
  weekDraftIsDirty,
  type DayDraft,
  type WeekDraft,
} from "@/components/weekDraft";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
  workFiscalWeekDates,
  workFiscalWeekStart,
} from "@/domain/time/workFiscalWeek";
import type { TemporalSettings, WorkScheduleEntry } from "@/domain/workSchedule";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import {
  loadTemporalSettings,
  loadWorkSchedule,
  saveTemporalSettings,
} from "@/persistence/workSchedule";
import { saveWorkWeek } from "@/persistence/saveWorkWeek";

const fieldClass =
  "mt-1 w-full min-h-12 rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300";
const primaryButtonClass =
  "min-h-12 rounded-md bg-stone-100 px-4 text-center text-base text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";
const secondaryButtonClass =
  "min-h-12 rounded-md border border-stone-600 bg-stone-900 px-4 text-center text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

type Phase = "loading" | "ready" | "error";
type PendingLeave = null | { type: "week"; delta: number } | { type: "tasks" } | { type: "zone" };

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
  const router = useRouter();
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WeekDraft | null>(null);
  const [openWorkOn, setOpenWorkOn] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ workOn: string; message: string } | null>(null);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [savingWeek, setSavingWeek] = useState(false);
  const [pending, setPending] = useState<PendingLeave>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const dirty = editing && draft !== null && weekDraftIsDirty(draft);
  useBlockNavigation(dirty, () => setPending({ type: "tasks" }));

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
          setWeekStart((current) => current ?? formatCivilDate(workFiscalWeekStart(now, loaded.timeZone)));
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
        if (ignore) return;
        setEntries(loaded);
        if (!editing) {
          setDraft(weekDraftFromEntries(dates.map(formatCivilDate), loaded));
        }
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
  }, [settings, weekStart, editing]);

  useEffect(() => {
    if (!openWorkOn) return;
    document.querySelector<HTMLElement>('[aria-label="Start hour"]')?.focus();
  }, [openWorkOn]);

  function weekDates(): string[] {
    return weekStart ? workFiscalWeekDates(parseCivilDate(weekStart)).map(formatCivilDate) : [];
  }

  function visibleDraft(): WeekDraft | null {
    const dates = weekDates();
    if (dates.length !== 7) return null;
    if (editing && draft) return draft;
    return weekDraftFromEntries(dates, entries);
  }

  async function persistWeek(): Promise<boolean> {
    if (!draft || !weekStart) return false;
    const plan = planWeekSave(draft);
    if (!plan.ok) {
      setRowError({ workOn: plan.workOn, message: plan.message });
      setWeekError(null);
      return false;
    }
    setSavingWeek(true);
    setWeekError(null);
    setRowError(null);
    try {
      await saveWorkWeek(getSupabaseBrowserClient(), weekStart, plan.writes);
      const dates = workFiscalWeekDates(parseCivilDate(weekStart));
      const from = formatCivilDate(addCivilDays(dates[0], -1));
      const to = formatCivilDate(dates[6]);
      const loaded = await loadWorkSchedule(getSupabaseBrowserClient(), from, to);
      setEntries(loaded);
      setDraft(weekDraftFromEntries(dates.map(formatCivilDate), loaded));
      setEditing(false);
      setOpenWorkOn(null);
      setPending(null);
      return true;
    } catch (error: unknown) {
      setWeekError(failureMessage(error, "This week was not saved."));
      return false;
    } finally {
      setSavingWeek(false);
    }
  }

  function discardDraft() {
    const dates = weekDates();
    setDraft(weekDraftFromEntries(dates, entries));
    setEditing(false);
    setOpenWorkOn(null);
    setRowError(null);
    setWeekError(null);
    setPending(null);
  }

  function continueAfterDiscard() {
    const action = pending;
    discardDraft();
    if (action?.type === "week" && weekStart) {
      setInstant(new Date());
      setWeekStart(formatCivilDate(addCivilDays(parseCivilDate(weekStart), action.delta)));
    }
    if (action?.type === "tasks") {
      router.push("/");
    }
    if (action?.type === "zone" && settings) {
      setZoneDraft(settings.timeZone);
      setZoneError(null);
      setEditingZone(true);
    }
  }

  async function continueAfterSave() {
    const action = pending;
    const saved = await persistWeek();
    if (!saved) return;
    if (action?.type === "week" && weekStart) {
      setInstant(new Date());
      setWeekStart(formatCivilDate(addCivilDays(parseCivilDate(weekStart), action.delta)));
    }
    if (action?.type === "tasks") {
      router.push("/");
    }
    if (action?.type === "zone" && settings) {
      setZoneDraft(settings.timeZone);
      setZoneError(null);
      setEditingZone(true);
    }
  }

  function requestWeek(delta: number) {
    if (!weekStart) return;
    if (dirty) {
      setPending({ type: "week", delta });
      return;
    }
    setEditing(false);
    setOpenWorkOn(null);
    setInstant(new Date());
    setWeekStart(formatCivilDate(addCivilDays(parseCivilDate(weekStart), delta)));
  }

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
      setEditing(false);
      setDraft(null);
    } catch (error: unknown) {
      setZoneError(failureMessage(error, "Could not save this time zone."));
    } finally {
      setSavingZone(false);
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

  const dates = weekDates();
  const shown = visibleDraft();
  const today = settings ? formatCivilDate(civilDateInTimeZone(instant, settings.timeZone)) : null;
  const todayVisible = today !== null && dates.includes(today);

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
              if (dirty) {
                setPending({ type: "zone" });
                return;
              }
              setZoneDraft(settings.timeZone);
              setZoneError(null);
              setEditingZone(true);
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 px-2 text-sm text-stone-300"
          >
            <Icon icon={Pencil} />
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
              ? "This zone interprets Work times, protected time, blocks, and commitments."
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

      {weekError ? (
        <p role="alert" className="mt-4 text-sm text-stone-200">
          {weekError}
        </p>
      ) : null}

      {settings && shown ? (
        <>
          {entriesError ? (
            <p role="alert" className="mt-3 text-sm text-stone-200">
              {entriesError}
            </p>
          ) : null}
          <WorkWeek
            draft={editing && draft ? draft : shown}
            today={today}
            editing={editing}
            openWorkOn={openWorkOn}
            rowError={rowError}
            saving={savingWeek}
            prompt={
              pending
                ? "This week has unsaved changes."
                : null
            }
            onBeginEdit={() => {
              setDraft(weekDraftFromEntries(dates, entries));
              setEditing(true);
              setOpenWorkOn(null);
              setPending(null);
              setWeekError(null);
            }}
            onCancelEdit={discardDraft}
            onSaveWeek={() => {
              if (pending) {
                void continueAfterSave();
                return;
              }
              void persistWeek();
            }}
            onOpenDay={(workOn) => setOpenWorkOn(workOn.length > 0 ? workOn : null)}
            onSetDay={(workOn, day: DayDraft) => {
              setDraft((current) => (current ? replaceDay(current, workOn, day) : current));
              setRowError(null);
            }}
            onShiftWeek={requestWeek}
            onDiscardPrompt={continueAfterDiscard}
            onStay={() => setPending(null)}
          />
        </>
      ) : null}

      <ProtectedTimeSection
        key={`protected-${settings?.timeZone ?? "none"}`}
        timeZone={settings?.timeZone ?? null}
      />
      <BlocksSection
        key={`block-${settings?.timeZone ?? "none"}`}
        timeZone={settings?.timeZone ?? null}
      />
      <CommitmentsSection
        key={`commitment-${settings?.timeZone ?? "none"}`}
        timeZone={settings?.timeZone ?? null}
      />
    </div>
  );
}
