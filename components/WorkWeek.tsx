import { formatLocalTimeLabel } from "@/domain/time/localTime";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import {
  SHIFT_TYPE_LABELS,
  SHIFT_TYPES,
  shiftEndsNextCivilDate,
  type WorkScheduleEntry,
} from "@/domain/workSchedule";
import {
  scheduleRowFact,
  type ShiftDraft,
  type WeekEditSession,
} from "@/components/workScheduleSession";

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
  weekDates,
  entries,
  today,
  session,
  rowError,
  savingOn,
  onBeginEdit,
  onFinishEdit,
  onOpenShift,
  onMarkOff,
  onClear,
  onDraftChange,
  onSaveShift,
  onCancelShift,
  onShiftWeek,
}: {
  weekDates: string[];
  entries: WorkScheduleEntry[];
  today: string | null;
  session: WeekEditSession;
  rowError: { workOn: string; message: string } | null;
  savingOn: string | null;
  onBeginEdit: () => void;
  onFinishEdit: () => void;
  onOpenShift: (workOn: string) => void;
  onMarkOff: (workOn: string) => void;
  onClear: (workOn: string) => void;
  onDraftChange: (draft: ShiftDraft) => void;
  onSaveShift: () => void;
  onCancelShift: () => void;
  onShiftWeek: (delta: number) => void;
}) {
  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={() => onShiftWeek(-7)} className={secondaryButtonClass}>
          Previous
        </button>
        <button type="button" onClick={() => onShiftWeek(7)} className={secondaryButtonClass}>
          Next
        </button>
      </div>
      <h2 className="mt-4 text-sm text-stone-400">This week</h2>
      <p className="mt-1 text-sm text-stone-300">
        {formatCivilDateLabel(weekDates[0])} – {formatCivilDateLabel(weekDates[6])}
      </p>
      {session.notice ? (
        <p role="status" className="mt-3 text-sm text-stone-200">
          {session.notice}
        </p>
      ) : null}
      <ul className="mt-2">
        {weekDates.map((workOn) => {
          const entry = entries.find((item) => item.workOn === workOn) ?? null;
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
                  <DayFact entry={entry} />
                </div>
              </div>
              {rowError?.workOn === workOn ? (
                <p id={`day-error-${workOn}`} role="alert" className="mt-2 text-sm text-stone-200">
                  {rowError.message}
                </p>
              ) : null}
              {session.editing && session.draft?.workOn === workOn ? (
                <ShiftFields
                  draft={session.draft}
                  describedBy={rowError?.workOn === workOn ? `day-error-${workOn}` : undefined}
                  saving={savingOn === workOn}
                  onChange={onDraftChange}
                  onSave={onSaveShift}
                  onCancel={onCancelShift}
                />
              ) : null}
              {session.editing && session.draft?.workOn !== workOn ? (
                <DayControls
                  workOn={workOn}
                  label={label}
                  entry={entry}
                  saving={savingOn === workOn}
                  onOpenShift={onOpenShift}
                  onMarkOff={onMarkOff}
                  onClear={onClear}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      {session.editing ? (
        <button type="button" onClick={onFinishEdit} className={`mt-4 w-full ${secondaryButtonClass}`}>
          Done
        </button>
      ) : (
        <button type="button" onClick={onBeginEdit} className={`mt-4 w-full ${secondaryButtonClass}`}>
          Edit week
        </button>
      )}
    </>
  );
}

function DayFact({ entry }: { entry: WorkScheduleEntry | null }) {
  const fact = scheduleRowFact(entry);
  if (fact.kind === "unknown") {
    return (
      <p className="text-right text-sm text-stone-400">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not entered</span>
      </p>
    );
  }
  if (fact.kind === "off") {
    return <p className="text-right text-sm text-stone-300">Off</p>;
  }
  return (
    <div className="text-right text-sm break-words text-stone-300">
      <p>
        {formatLocalTimeLabel(fact.startLocal)}–{formatLocalTimeLabel(fact.endLocal)}
      </p>
      {fact.continuesAfterMidnight ? <p>continues after midnight</p> : null}
      <p>{SHIFT_TYPE_LABELS[fact.shiftType]}</p>
    </div>
  );
}

function DayControls({
  workOn,
  label,
  entry,
  saving,
  onOpenShift,
  onMarkOff,
  onClear,
}: {
  workOn: string;
  label: string;
  entry: WorkScheduleEntry | null;
  saving: boolean;
  onOpenShift: (workOn: string) => void;
  onMarkOff: (workOn: string) => void;
  onClear: (workOn: string) => void;
}) {
  const scheduled = entry?.state === "scheduled";
  const off = entry?.state === "off";
  return (
    <div className="mt-3 flex gap-2">
      <button
        id={`shift-control-${workOn}`}
        type="button"
        onClick={() => onOpenShift(workOn)}
        className={`flex-1 ${secondaryButtonClass}`}
        aria-label={scheduled ? `Edit shift for ${label}` : `Shift for ${label}`}
      >
        {scheduled ? "Edit" : "Shift"}
      </button>
      {off ? null : (
        <button
          type="button"
          onClick={() => onMarkOff(workOn)}
          disabled={saving}
          className={`flex-1 ${secondaryButtonClass}`}
          aria-label={`Off for ${label}`}
        >
          {saving ? "Saving" : "Off"}
        </button>
      )}
      {entry ? (
        <button
          type="button"
          onClick={() => onClear(workOn)}
          disabled={saving}
          className={`flex-1 ${secondaryButtonClass}`}
          aria-label={`Remove ${label}`}
        >
          {saving ? "Saving" : "Remove"}
        </button>
      ) : null}
    </div>
  );
}

function ShiftFields({
  draft,
  describedBy,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: ShiftDraft;
  describedBy?: string;
  saving: boolean;
  onChange: (draft: ShiftDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const continues =
    draft.startLocal.length > 0 &&
    draft.endLocal.length > 0 &&
    safeContinues(draft.startLocal, draft.endLocal);

  return (
    <div className="mt-3 space-y-3" aria-describedby={describedBy}>
      <div>
        <label className="block text-sm font-medium" htmlFor={`start-${draft.workOn}`}>
          Start
        </label>
        <input
          id={`start-${draft.workOn}`}
          type="time"
          value={draft.startLocal}
          onChange={(event) => onChange({ ...draft, startLocal: event.target.value })}
          className={fieldClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor={`end-${draft.workOn}`}>
          End
        </label>
        <input
          id={`end-${draft.workOn}`}
          type="time"
          value={draft.endLocal}
          onChange={(event) => onChange({ ...draft, endLocal: event.target.value })}
          className={fieldClass}
        />
      </div>
      {continues ? <p className="text-sm text-stone-400">This shift continues after midnight.</p> : null}
      <div>
        <label className="block text-sm font-medium" htmlFor={`type-${draft.workOn}`}>
          Shift type
        </label>
        <select
          id={`type-${draft.workOn}`}
          value={draft.shiftType}
          onChange={(event) => onChange({ ...draft, shiftType: event.target.value })}
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
