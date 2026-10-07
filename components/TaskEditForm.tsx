import type { FormEvent } from "react";
import type { TaskEditDraft } from "@/domain/taskEdit";

export type TaskEditContextOption = {
  id: string;
  name: string;
};

const fieldClass =
  "mt-1 w-full min-h-12 rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300";
const primaryButtonClass =
  "min-h-12 rounded-md bg-stone-100 px-4 text-center text-base text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";
const secondaryButtonClass =
  "min-h-12 rounded-md border border-stone-600 bg-stone-900 px-4 text-center text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

export function TaskEditForm({
  draft,
  contexts,
  saving,
  saveError,
  onChange,
  onSave,
  onCancel,
}: {
  draft: TaskEditDraft;
  contexts: readonly TaskEditContextOption[];
  saving: boolean;
  saveError: string | null;
  onChange: (draft: TaskEditDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave();
  }

  return (
    <form onSubmit={onSubmit} aria-label="Edit task" noValidate>
      <p className="text-sm font-medium text-stone-400">Edit task</p>
      <label className="mt-3 block text-sm font-medium" htmlFor="edit-task-title">
        Title
      </label>
      <input
        id="edit-task-title"
        name="title"
        type="text"
        required
        autoComplete="off"
        disabled={saving}
        value={draft.title}
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
        className={fieldClass}
      />
      <div className="mt-4">
        <label className="block text-sm font-medium" htmlFor="edit-task-context">
          Context
        </label>
        <select
          id="edit-task-context"
          name="context"
          disabled={saving}
          value={draft.contextId}
          onChange={(event) => onChange({ ...draft, contextId: event.target.value })}
          className={fieldClass}
        >
          <option value="">None</option>
          {contexts.map((context) => (
            <option key={context.id} value={context.id}>
              {context.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium" htmlFor="edit-task-planned">
          Planned
        </label>
        <p id="edit-task-planned-hint" className="text-sm text-stone-400">
          When you intend to work on it.
        </p>
        <input
          id="edit-task-planned"
          name="planned"
          type="date"
          disabled={saving}
          aria-describedby="edit-task-planned-hint"
          value={draft.plannedOn}
          onChange={(event) => {
            const plannedOn = event.target.value;
            onChange({
              ...draft,
              plannedOn,
              plannedLocal: plannedOn.length === 0 ? "" : draft.plannedLocal,
            });
          }}
          className={fieldClass}
        />
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium" htmlFor="edit-task-planned-clock">
          Planned clock
        </label>
        <p id="edit-task-planned-clock-hint" className="text-sm text-stone-400">
          Optional local time on the planned day. Not a reserved interval.
        </p>
        <input
          id="edit-task-planned-clock"
          name="planned-clock"
          type="time"
          disabled={saving || draft.plannedOn.length === 0}
          aria-describedby="edit-task-planned-clock-hint"
          aria-label="Planned clock"
          value={draft.plannedLocal}
          onChange={(event) => onChange({ ...draft, plannedLocal: event.target.value })}
          className={fieldClass}
        />
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium" htmlFor="edit-task-due">
          Due
        </label>
        <p id="edit-task-due-hint" className="text-sm text-stone-400">
          When completion is required.
        </p>
        <input
          id="edit-task-due"
          name="due"
          type="date"
          disabled={saving}
          aria-describedby="edit-task-due-hint"
          value={draft.dueOn}
          onChange={(event) => onChange({ ...draft, dueOn: event.target.value })}
          className={fieldClass}
        />
      </div>
      <label className="mt-4 flex min-h-12 items-center gap-3 text-base" htmlFor="edit-task-must-do">
        <input
          id="edit-task-must-do"
          name="must-do"
          type="checkbox"
          disabled={saving}
          checked={draft.mustDo}
          onChange={(event) => onChange({ ...draft, mustDo: event.target.checked })}
          className="size-5"
        />
        Must do
      </label>
      {saveError ? (
        <p role="alert" className="mt-4 text-sm text-stone-200">
          {saveError}
        </p>
      ) : null}
      <button type="submit" disabled={saving} className={`mt-4 w-full ${primaryButtonClass}`}>
        {saving ? "Saving" : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className={`mt-3 w-full ${secondaryButtonClass}`}
      >
        Cancel
      </button>
    </form>
  );
}
