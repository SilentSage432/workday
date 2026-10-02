import { Plus } from "lucide-react";
import type { FormEvent, Ref } from "react";
import { Icon } from "@/components/Icon";
import {
  captureDraftHasMeaning,
  collapseCapture,
  openCapture,
  type CaptureSession,
} from "@/domain/capture";
import type { Context } from "@/domain/context";

const fieldClass =
  "mt-1 w-full min-h-12 rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300";
const primaryButtonClass =
  "min-h-12 rounded-md bg-stone-100 px-4 text-center text-base text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";
const secondaryButtonClass =
  "min-h-12 rounded-md border border-stone-600 bg-stone-900 px-4 text-center text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

export function CapturePanel({
  session,
  contexts,
  saving,
  saveError,
  titleRef,
  onChange,
  onSubmit,
}: {
  session: CaptureSession;
  contexts: Context[];
  saving: boolean;
  saveError: string | null;
  titleRef?: Ref<HTMLInputElement>;
  onChange: (session: CaptureSession) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!session.open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => onChange(openCapture(session))}
          className={`inline-flex w-full items-center justify-center gap-2 ${secondaryButtonClass}`}
        >
          <Icon icon={Plus} />
          Capture
        </button>
        {captureDraftHasMeaning(session.draft) ? (
          <p className="mt-2 text-sm text-stone-400">An unsaved capture is still here.</p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <label className="block text-xl font-medium tracking-tight" htmlFor="task-title">
        What needs doing?
      </label>
      <input
        id="task-title"
        name="title"
        type="text"
        required
        autoComplete="off"
        ref={titleRef}
        value={session.draft.title}
        onChange={(event) =>
          onChange({ ...session, draft: { ...session.draft, title: event.target.value } })
        }
        className={fieldClass}
      />
      {session.detailsOpen ? (
        <fieldset className="mt-4 space-y-4">
          <legend className="text-sm text-stone-400">Optional</legend>
          <div>
            <label className="block text-sm font-medium" htmlFor="task-context">
              Context
            </label>
            <select
              id="task-context"
              name="context"
              value={session.draft.contextId}
              onChange={(event) =>
                onChange({
                  ...session,
                  draft: { ...session.draft, contextId: event.target.value },
                })
              }
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
          <div>
            <label className="block text-sm font-medium" htmlFor="task-planned">
              Planned
            </label>
            <p id="task-planned-hint" className="text-sm text-stone-400">
              When you intend to work on it.
            </p>
            <input
              id="task-planned"
              name="planned"
              type="date"
              aria-describedby="task-planned-hint"
              value={session.draft.plannedOn}
              onChange={(event) =>
                onChange({
                  ...session,
                  draft: { ...session.draft, plannedOn: event.target.value },
                })
              }
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="task-due">
              Due
            </label>
            <p id="task-due-hint" className="text-sm text-stone-400">
              When completion is required.
            </p>
            <input
              id="task-due"
              name="due"
              type="date"
              aria-describedby="task-due-hint"
              value={session.draft.dueOn}
              onChange={(event) =>
                onChange({ ...session, draft: { ...session.draft, dueOn: event.target.value } })
              }
              className={fieldClass}
            />
          </div>
          <label className="flex min-h-12 items-center gap-3 text-base" htmlFor="task-must-do">
            <input
              id="task-must-do"
              name="must-do"
              type="checkbox"
              checked={session.draft.mustDo}
              onChange={(event) =>
                onChange({
                  ...session,
                  draft: { ...session.draft, mustDo: event.target.checked },
                })
              }
              className="size-5"
            />
            Must do
          </label>
        </fieldset>
      ) : null}
      {saveError ? (
        <p role="alert" className="mt-4 text-sm text-stone-200">
          {saveError} The draft is still here.
        </p>
      ) : null}
      <button type="submit" disabled={saving} className={`mt-4 w-full ${primaryButtonClass}`}>
        {saving ? "Saving" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => onChange({ ...session, detailsOpen: !session.detailsOpen })}
        aria-expanded={session.detailsOpen}
        className={`mt-3 w-full ${secondaryButtonClass}`}
      >
        {session.detailsOpen ? "Fewer options" : "More options"}
      </button>
      <button
        type="button"
        onClick={() => onChange(collapseCapture(session))}
        className="mt-2 min-h-11 w-full text-sm text-stone-400"
      >
        Close
      </button>
    </form>
  );
}
