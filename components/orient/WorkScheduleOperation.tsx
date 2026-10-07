"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  planWeekSave,
  replaceDay,
  weekDraftFromEntries,
  weekDraftIsDirty,
  type DayDraft,
  type WeekDraft,
  type WeekWrite,
} from "@/components/weekDraft";
import { LocalClockField } from "@/components/orient/LocalClockField";
import { emptyTwelveHourClock, localTimeToTwelveHour, twelveHourToLocalTime } from "@/components/twelveHourTime";
import { SHIFT_TYPE_LABELS, SHIFT_TYPES, type WorkScheduleEntry } from "@/domain/workSchedule";
import { addCivilDays, formatCivilDate, formatCivilDateLabel, parseCivilDate, workFiscalWeekDates } from "@/domain/time/workFiscalWeek";

export type WorkScheduleDismiss = {
  requestLeave: (proceed: () => void) => void;
};

type Pending = { kind: "leave"; proceed: () => void } | { kind: "week"; delta: number };

export function WorkScheduleOperation({
  weekStart,
  timeZone,
  dismissRef,
  onWeekStart,
  onLoad,
  onSave,
  onDismiss,
}: {
  weekStart: string;
  timeZone: string;
  dismissRef: { current: WorkScheduleDismiss | null };
  onWeekStart: (weekStart: string) => void;
  onLoad: (from: string, to: string) => Promise<WorkScheduleEntry[]>;
  onSave: (weekStart: string, writes: WeekWrite[]) => Promise<void>;
  onDismiss: () => void;
}) {
  const dates = workFiscalWeekDates(parseCivilDate(weekStart)).map(formatCivilDate);
  const loadRef = useRef(onLoad);
  const [draft, setDraft] = useState<WeekDraft | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openWorkOn, setOpenWorkOn] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ workOn: string; message: string } | null>(null);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  useLayoutEffect(() => {
    loadRef.current = onLoad;
  });

  useLayoutEffect(() => {
    const weekDates = workFiscalWeekDates(parseCivilDate(weekStart)).map(formatCivilDate);
    let ignore = false;
    void loadRef.current(weekDates[0], weekDates[6])
      .then((rows) => {
        if (ignore) return;
        setDraft(weekDraftFromEntries(weekDates, rows));
        setPhase("ready");
      })
      .catch((error: unknown) => {
        if (ignore) return;
        setLoadError(error instanceof Error && error.message ? error.message : "This Work week could not be read.");
        setPhase("error");
      });
    return () => {
      ignore = true;
    };
  }, [weekStart]);

  useLayoutEffect(() => {
    dismissRef.current = {
      requestLeave(proceed) {
        if (pending) {
          setPending(null);
          return;
        }
        if (!draft || !weekDraftIsDirty(draft)) {
          proceed();
          return;
        }
        setPending({ kind: "leave", proceed });
      },
    };
  });

  useLayoutEffect(() => {
    return () => {
      dismissRef.current = null;
    };
  }, [dismissRef]);

  async function persist(): Promise<boolean> {
    if (!draft || saving) return false;
    const plan = planWeekSave(draft);
    if (!plan.ok) {
      setRowError({ workOn: plan.workOn, message: plan.message });
      setWeekError(null);
      return false;
    }
    setSaving(true);
    setWeekError(null);
    setRowError(null);
    try {
      await onSave(weekStart, plan.writes);
    } catch (error: unknown) {
      setWeekError(error instanceof Error && error.message ? error.message : "This week was not saved.");
      setSaving(false);
      return false;
    }
    try {
      const rows = await loadRef.current(dates[0], dates[6]);
      setDraft(weekDraftFromEntries(dates, rows));
      setOpenWorkOn(null);
      setSaving(false);
      return true;
    } catch (error: unknown) {
      setWeekError(error instanceof Error && error.message ? error.message : "This week was saved, and it could not be read back.");
      setDraft({ ...draft, baseline: structuredClone(draft.days) });
      setSaving(false);
      return false;
    }
  }

  function restoreBaseline() {
    setDraft((current) => (current ? { ...current, days: structuredClone(current.baseline) } : current));
    setOpenWorkOn(null);
    setRowError(null);
    setWeekError(null);
  }

  function requestWeek(delta: number) {
    if (draft && weekDraftIsDirty(draft)) {
      setPending({ kind: "week", delta });
      return;
    }
    moveWeek(delta);
  }

  function moveWeek(delta: number) {
    const next = formatCivilDate(addCivilDays(parseCivilDate(weekStart), delta));
    onWeekStart(next);
  }

  async function acceptPending() {
    const action = pending;
    const saved = await persist();
    if (!saved || !action) return;
    setPending(null);
    if (action.kind === "leave") action.proceed();
    if (action.kind === "week") moveWeek(action.delta);
  }

  function discardPending() {
    const action = pending;
    restoreBaseline();
    setPending(null);
    if (!action) return;
    if (action.kind === "leave") action.proceed();
    if (action.kind === "week") moveWeek(action.delta);
  }

  const through = dates[6];
  const dirty = draft ? weekDraftIsDirty(draft) : false;

  return (
    <div data-work-schedule="true" data-fiscal-week={weekStart} data-fiscal-through={through} className="orient-work-schedule">
      <h2>Work schedule</h2>
      <p>
        {formatCivilDateLabel(weekStart)} – {formatCivilDateLabel(through)}
      </p>
      {timeZone.trim().length === 0 ? <p role="alert">A confirmed time zone is required before a Work schedule can be saved.</p> : null}
      <div className="orient-actions">
        <button type="button" className="orient-action" onClick={() => requestWeek(-7)}>
          Previous fiscal week
        </button>
        <button type="button" className="orient-action" onClick={() => requestWeek(7)}>
          Next fiscal week
        </button>
      </div>
      {phase === "loading" ? <p>Reading this Work week.</p> : null}
      {phase === "error" ? <p role="alert">{loadError}</p> : null}
      {pending ? (
        <div role="group" aria-labelledby="unsaved-work-week">
          <p id="unsaved-work-week">This week has unsaved changes.</p>
          <div className="orient-actions">
            <button type="button" className="orient-action" data-emphasis="save" disabled={saving} onClick={() => void acceptPending()}>
              Save
            </button>
            <button type="button" className="orient-action" onClick={discardPending}>
              Discard
            </button>
            <button type="button" className="orient-action" onClick={() => setPending(null)}>
              Stay
            </button>
          </div>
        </div>
      ) : null}
      {weekError ? <p role="alert">{weekError}</p> : null}
      {draft && phase === "ready" && timeZone.trim().length > 0
        ? dates.map((workOn) => {
            const day = draft.days[workOn] ?? { state: "unknown" };
            const label = formatCivilDateLabel(workOn);
            return (
                <section
                  key={workOn}
                  className="orient-work-day"
                  data-work-day={workOn}
                  data-work-state={day.state}
                  data-work-open={openWorkOn === workOn ? "true" : "false"}
                >
                <div className="orient-work-day-row">
                  <p>{label}</p>
                  <DayFact day={day} />
                </div>
                {rowError?.workOn === workOn ? <p role="alert">{rowError.message}</p> : null}
                {openWorkOn === workOn ? (
                  <ShiftFields
                    label={label}
                    day={day.state === "scheduled" ? day : blankScheduled()}
                    onChange={(next) => setDraft((current) => (current ? replaceDay(current, workOn, next) : current))}
                  />
                ) : null}
                <div className="orient-actions">
                  <button
                    type="button"
                    className="orient-action"
                    aria-label={day.state === "scheduled" ? `Edit shift for ${label}` : `Shift for ${label}`}
                    onClick={() => setOpenWorkOn(workOn)}
                  >
                    {day.state === "scheduled" ? "Edit" : "Shift"}
                  </button>
                  {day.state === "off" ? null : (
                    <button
                      type="button"
                      className="orient-action"
                      aria-label={`Off for ${label}`}
                      onClick={() => {
                        setDraft((current) => (current ? replaceDay(current, workOn, { state: "off" }) : current));
                        setOpenWorkOn((current) => (current === workOn ? null : current));
                      }}
                    >
                      Off
                    </button>
                  )}
                  {day.state === "unknown" ? null : (
                    <button
                      type="button"
                      className="orient-action"
                      aria-label={`Not entered for ${label}`}
                      onClick={() => {
                        setDraft((current) => (current ? replaceDay(current, workOn, { state: "unknown" }) : current));
                        setOpenWorkOn((current) => (current === workOn ? null : current));
                      }}
                    >
                      Not entered
                    </button>
                  )}
                </div>
              </section>
            );
          })
        : null}
      <div className="orient-actions">
        <button type="button" className="orient-action" data-emphasis="save" disabled={saving || !dirty} onClick={() => void persist()}>
          {saving ? "Saving" : "Save"}
        </button>
        <button type="button" className="orient-action" onClick={() => dismissRef.current?.requestLeave(onDismiss)}>
          Close
        </button>
      </div>
    </div>
  );
}

function blankScheduled(): Extract<DayDraft, { state: "scheduled" }> {
  return {
    state: "scheduled",
    start: emptyTwelveHourClock(),
    end: emptyTwelveHourClock(),
    shiftType: "",
  };
}

function DayFact({ day }: { day: DayDraft }) {
  if (day.state === "unknown") return <p>Not entered</p>;
  if (day.state === "off") return <p>Off</p>;
  const start = twelveHourToLocalTime(day.start);
  const end = twelveHourToLocalTime(day.end);
  const type = SHIFT_TYPES.find((item) => item === day.shiftType);
  if (!start || !end || !type) return <p>Shift</p>;
  return (
    <p>
      {start}–{end} {SHIFT_TYPE_LABELS[type]}
    </p>
  );
}

function ShiftFields({
  label,
  day,
  onChange,
}: {
  label: string;
  day: Extract<DayDraft, { state: "scheduled" }>;
  onChange: (day: Extract<DayDraft, { state: "scheduled" }>) => void;
}) {
  const start = twelveHourToLocalTime(day.start) ?? "";
  const end = twelveHourToLocalTime(day.end) ?? "";
  return (
    <div>
      <label className="orient-note">
        Start
        <LocalClockField
          name={`Start for ${label}`}
          value={start}
          onCommit={(next) => onChange({ ...day, start: localTimeToTwelveHour(next) })}
        />
      </label>
      <label className="orient-note">
        End
        <LocalClockField
          name={`End for ${label}`}
          value={end}
          onCommit={(next) => onChange({ ...day, end: localTimeToTwelveHour(next) })}
        />
      </label>
      <label className="orient-note">
        Shift type
        <select
          aria-label={`Shift type for ${label}`}
          value={day.shiftType}
          onChange={(event) => onChange({ ...day, shiftType: event.target.value })}
        >
          <option value="">Choose</option>
          {SHIFT_TYPES.map((shiftType) => (
            <option key={shiftType} value={shiftType}>
              {SHIFT_TYPE_LABELS[shiftType]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

