import { ChevronLeft, ChevronRight } from "lucide-react";
import { Icon } from "@/components/Icon";
import { LocalTimeField } from "@/components/LocalTimeField";
import { emptyTwelveHourClock, twelveHourToLocalTime } from "@/components/twelveHourTime";
import { formatLocalTimeLabel } from "@/domain/time/localTime";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import {
  SHIFT_TYPE_LABELS,
  SHIFT_TYPES,
  shiftEndsNextCivilDate,
  type WorkScheduleEntry,
} from "@/domain/workSchedule";
import { type DayDraft, type WeekDraft } from "@/components/weekDraft";

const fieldClass =
  "mt-1 w-full min-h-12 rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300";
const primaryButtonClass =
  "min-h-12 rounded-md bg-stone-100 px-4 text-center text-base text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";
const secondaryButtonClass =
  "min-h-12 rounded-md border border-stone-600 bg-stone-900 px-4 text-center text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

export function TodayScheduleFact({ entry }: { entry: WorkScheduleEntry | null }) {
  return (
    <section className="mt-6" aria-labelledby="today-schedule">
      <h2 id="today-schedule" className="text-sm text-stone-400">
        Today
      </h2>
      {entry === null ? <p className="mt-1 text-base">No schedule entered</p> : null}
      {entry?.state === "off" ? <p className="mt-1 text-base">Off</p> : null}
      {entry?.state === "scheduled" ? (
        <div className="mt-1 text-base">
          <p>{SHIFT_TYPE_LABELS[entry.shiftType]}</p>
          <p>
            {formatLocalTimeLabel(entry.startLocal)}–{formatLocalTimeLabel(entry.endLocal)}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export function WorkWeek({
  draft,
  today,
  editing,
  openWorkOn,
  rowError,
  saving,
  prompt,
  onBeginEdit,
  onCancelEdit,
  onSaveWeek,
  onOpenDay,
  onSetDay,
  onShiftWeek,
  onDiscardPrompt,
  onStay,
}: {
  draft: WeekDraft;
  today: string | null;
  editing: boolean;
  openWorkOn: string | null;
  rowError: { workOn: string; message: string } | null;
  saving: boolean;
  prompt: string | null;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onSaveWeek: () => void;
  onOpenDay: (workOn: string) => void;
  onSetDay: (workOn: string, day: DayDraft) => void;
  onShiftWeek: (delta: number) => void;
  onDiscardPrompt: () => void;
  onStay: () => void;
}) {
  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={() => onShiftWeek(-7)} className={secondaryButtonClass}>
          <span className="inline-flex items-center justify-center gap-2">
            <Icon icon={ChevronLeft} />
            Previous
          </span>
        </button>
        <button type="button" onClick={() => onShiftWeek(7)} className={secondaryButtonClass}>
          <span className="inline-flex items-center justify-center gap-2">
            Next
            <Icon icon={ChevronRight} />
          </span>
        </button>
      </div>
      <h2 className="mt-4 text-sm text-stone-400">This week</h2>
      <p className="mt-1 text-sm text-stone-300">
        {formatCivilDateLabel(draft.order[0])} – {formatCivilDateLabel(draft.order[6])}
      </p>
      {prompt ? (
        <div className="mt-4" role="group" aria-labelledby="unsaved-week">
          <p id="unsaved-week" className="text-sm text-stone-200">
            {prompt}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" onClick={onSaveWeek} disabled={saving} className={primaryButtonClass}>
              {saving ? "Saving" : "Save week"}
            </button>
            <button type="button" onClick={onDiscardPrompt} className={secondaryButtonClass}>
              Discard changes
            </button>
            <button type="button" onClick={onStay} className="min-h-11 text-sm text-stone-400">
              Stay
            </button>
          </div>
        </div>
      ) : null}
      <ul className="mt-2">
        {draft.order.map((workOn) => {
          const day = draft.days[workOn] ?? { state: "unknown" };
          const label = formatCivilDateLabel(workOn);
          return (
            <li key={workOn} className="border-t border-stone-800 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="shrink-0 text-sm">
                  {label}
                  {workOn === today ? (
                    <span className="ml-2 font-normal text-stone-400">Today</span>
                  ) : null}
                </p>
                <div className="min-w-0">
                  <DayFact day={editing ? day : (draft.baseline[workOn] ?? day)} />
                </div>
              </div>
              {rowError?.workOn === workOn ? (
                <p id={`day-error-${workOn}`} role="alert" className="mt-2 text-sm text-stone-200">
                  {rowError.message}
                </p>
              ) : null}
              {editing && openWorkOn === workOn && day.state === "scheduled" ? (
                <ShiftFields
                  day={day}
                  describedBy={rowError?.workOn === workOn ? `day-error-${workOn}` : undefined}
                  onChange={(next) => onSetDay(workOn, next)}
                  onClose={() => onOpenDay("")}
                />
              ) : null}
              {editing && openWorkOn !== workOn ? (
                <DayControls
                  workOn={workOn}
                  label={label}
                  day={day}
                  onOpen={() => {
                    if (day.state !== "scheduled") {
                      onSetDay(workOn, {
                        state: "scheduled",
                        start: emptyTwelveHourClock(),
                        end: emptyTwelveHourClock(),
                        shiftType: "",
                      });
                    }
                    onOpenDay(workOn);
                  }}
                  onOff={() => onSetDay(workOn, { state: "off" })}
                  onClear={() => onSetDay(workOn, { state: "unknown" })}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      {editing ? (
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" onClick={onSaveWeek} disabled={saving} className={primaryButtonClass}>
            {saving ? "Saving" : "Save week"}
          </button>
          <button type="button" onClick={onCancelEdit} disabled={saving} className={secondaryButtonClass}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={onBeginEdit} className={`mt-4 w-full ${secondaryButtonClass}`}>
          Edit week
        </button>
      )}
    </>
  );
}

function isShift(value: string): value is "opening" | "mid" | "closing" {
  return value === "opening" || value === "mid" || value === "closing";
}

function DayFact({ day }: { day: DayDraft }) {
  if (day.state === "unknown") {
    return (
      <p className="text-right text-sm text-stone-400">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not entered</span>
      </p>
    );
  }
  if (day.state === "off") {
    return <p className="text-right text-sm text-stone-300">Off</p>;
  }
  const startLocal = twelveHourToLocalTime(day.start);
  const endLocal = twelveHourToLocalTime(day.end);
  if (!startLocal || !endLocal || !isShift(day.shiftType)) {
    return <p className="text-right text-sm text-stone-300">Shift</p>;
  }
  const continues = safeContinues(startLocal, endLocal);
  return (
    <div className="text-right text-sm break-words text-stone-300">
      <p>
        {formatLocalTimeLabel(startLocal)}–{formatLocalTimeLabel(endLocal)}
      </p>
      {continues ? <p>continues after midnight</p> : null}
      <p>{SHIFT_TYPE_LABELS[day.shiftType]}</p>
    </div>
  );
}

function DayControls({
  workOn,
  label,
  day,
  onOpen,
  onOff,
  onClear,
}: {
  workOn: string;
  label: string;
  day: DayDraft;
  onOpen: () => void;
  onOff: () => void;
  onClear: () => void;
}) {
  const scheduled =
    day.state === "scheduled" &&
    twelveHourToLocalTime(day.start) !== null &&
    twelveHourToLocalTime(day.end) !== null &&
    isShift(day.shiftType);
  const off = day.state === "off";
  return (
    <div className="mt-3 flex gap-2">
      <button
        id={`shift-control-${workOn}`}
        type="button"
        onClick={onOpen}
        className={`flex-1 ${secondaryButtonClass}`}
        aria-label={scheduled ? `Edit shift for ${label}` : `Shift for ${label}`}
      >
        {scheduled ? "Edit" : "Shift"}
      </button>
      {off ? null : (
        <button
          type="button"
          onClick={onOff}
          className={`flex-1 ${secondaryButtonClass}`}
          aria-label={`Off for ${label}`}
        >
          Off
        </button>
      )}
      {day.state === "unknown" ? null : (
        <button
          type="button"
          onClick={onClear}
          className={`flex-1 ${secondaryButtonClass}`}
          aria-label={`Remove ${label}`}
        >
          Remove
        </button>
      )}
    </div>
  );
}

function ShiftFields({
  day,
  describedBy,
  onChange,
  onClose,
}: {
  day: Extract<DayDraft, { state: "scheduled" }>;
  describedBy?: string;
  onChange: (day: Extract<DayDraft, { state: "scheduled" }>) => void;
  onClose: () => void;
}) {
  const startLocal = twelveHourToLocalTime(day.start);
  const endLocal = twelveHourToLocalTime(day.end);
  const continues = startLocal && endLocal ? safeContinues(startLocal, endLocal) : false;
  return (
    <div className="mt-3 space-y-3" aria-describedby={describedBy}>
      <LocalTimeField label="Start" value={day.start} onChange={(start) => onChange({ ...day, start })} />
      <LocalTimeField label="End" value={day.end} onChange={(end) => onChange({ ...day, end })} />
      {continues ? <p className="text-sm text-stone-400">This shift continues after midnight.</p> : null}
      <div>
        <label className="block text-sm font-medium" htmlFor="shift-type-open">
          Shift type
        </label>
        <select
          id="shift-type-open"
          value={day.shiftType}
          onChange={(event) => onChange({ ...day, shiftType: event.target.value })}
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
      <button type="button" onClick={onClose} className="min-h-11 w-full text-sm text-stone-400">
        Close
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
