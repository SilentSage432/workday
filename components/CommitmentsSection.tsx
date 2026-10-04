import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { LocalTimeField } from "@/components/LocalTimeField";
import {
  commitmentDraftContinuesAfterMidnight,
  commitmentInputFromDraft,
  draftFromCommitment,
  newCommitmentDraft,
  type CommitmentDraft,
} from "@/components/commitmentDraft";
import { timedCommitmentEndsNextCivilDate, type Commitment } from "@/domain/commitment";
import { formatLocalTimeLabel } from "@/domain/time/localTime";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  formatCivilDateLabel,
  parseCivilDate,
} from "@/domain/time/workFiscalWeek";
import { classifyCommitment, projectCommitments } from "@/projections/commitment";
import {
  createCommitment,
  deleteCommitment,
  loadCommitments,
  updateCommitment,
} from "@/persistence/commitment";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";

const fieldClass =
  "mt-1 w-full min-h-12 rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300";
const primaryButtonClass =
  "min-h-12 rounded-md bg-stone-100 px-4 text-center text-base text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";
const secondaryButtonClass =
  "min-h-12 rounded-md border border-stone-600 bg-stone-900 px-4 text-center text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

function failureMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function CommitmentsSection({
  timeZone,
  onStored,
}: {
  timeZone: string | null;
  onStored?: () => void;
}) {
  const [instant, setInstant] = useState(() => new Date());
  const [entries, setEntries] = useState<Commitment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entriesReady, setEntriesReady] = useState(false);
  const [editor, setEditor] = useState<CommitmentDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!timeZone) return;
    const today = formatCivilDate(civilDateInTimeZone(new Date(), timeZone));
    const from = formatCivilDate(addCivilDays(parseCivilDate(today), -1));
    const client = getSupabaseBrowserClient();
    let ignore = false;

    async function load() {
      try {
        const loaded = await loadCommitments(client, { from });
        if (ignore) return;
        setEntries(loaded);
        setInstant(new Date());
        setLoadError(null);
        setEntriesReady(true);
      } catch (error: unknown) {
        if (ignore) return;
        setLoadError(failureMessage(error, "Could not load commitments."));
        setEntriesReady(true);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [timeZone]);

  async function onSave() {
    if (!editor || !timeZone) return;
    setSaving(true);
    setFormError(null);
    try {
      const input = commitmentInputFromDraft(editor);
      const client = getSupabaseBrowserClient();
      const saved = editor.id
        ? await updateCommitment(client, editor.id, input)
        : await createCommitment(client, input);
      setEntries((current) =>
        editor.id
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [...current, saved],
      );
      setEditor(null);
      onStored?.();
    } catch (error: unknown) {
      setFormError(
        `${failureMessage(error, "Could not save this commitment.")} It was not saved.`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(id: string) {
    setRemoving(true);
    setRemoveError(null);
    try {
      await deleteCommitment(getSupabaseBrowserClient(), id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
      setConfirmingId(null);
      if (editor?.id === id) setEditor(null);
      onStored?.();
    } catch (error: unknown) {
      setRemoveError(
        `${failureMessage(error, "Could not remove this commitment.")} It is still here.`,
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <CommitmentsPanel
      timeZone={timeZone}
      instant={instant}
      entries={entries}
      loadError={loadError}
      entriesReady={entriesReady}
      editor={editor}
      saving={saving}
      formError={formError}
      confirmingId={confirmingId}
      removeError={removeError}
      removing={removing}
      onBeginAdd={() => {
        if (!timeZone) return;
        setEditor(newCommitmentDraft(formatCivilDate(civilDateInTimeZone(new Date(), timeZone))));
        setFormError(null);
        setConfirmingId(null);
      }}
      onBeginEdit={(id) => {
        const entry = entries.find((item) => item.id === id);
        if (!entry) return;
        setEditor(draftFromCommitment(entry));
        setFormError(null);
        setConfirmingId(null);
      }}
      onCancel={() => {
        setEditor(null);
        setFormError(null);
      }}
      onChange={setEditor}
      onSave={() => void onSave()}
      onAskRemove={(id) => {
        setConfirmingId(id);
        setRemoveError(null);
      }}
      onCancelRemove={() => setConfirmingId(null)}
      onConfirmRemove={(id) => void onRemove(id)}
    />
  );
}

export function CommitmentsPanel({
  timeZone,
  instant,
  entries,
  loadError,
  entriesReady,
  editor,
  saving,
  formError,
  confirmingId,
  removeError,
  removing,
  onBeginAdd,
  onBeginEdit,
  onCancel,
  onChange,
  onSave,
  onAskRemove,
  onCancelRemove,
  onConfirmRemove,
}: {
  timeZone: string | null;
  instant: Date;
  entries: readonly Commitment[];
  loadError: string | null;
  entriesReady: boolean;
  editor: CommitmentDraft | null;
  saving: boolean;
  formError: string | null;
  confirmingId: string | null;
  removeError: string | null;
  removing: boolean;
  onBeginAdd: () => void;
  onBeginEdit: (id: string) => void;
  onCancel: () => void;
  onChange: (draft: CommitmentDraft) => void;
  onSave: () => void;
  onAskRemove: (id: string) => void;
  onCancelRemove: () => void;
  onConfirmRemove: (id: string) => void;
}) {
  const shown = timeZone === null ? [] : projectCommitments({ entries, instant, timeZone });

  return (
    <section className="mt-12" aria-labelledby="commitments-heading">
      <h2 id="commitments-heading" className="text-lg font-medium">
        Commitments
      </h2>
      <p className="mt-1 text-sm text-stone-400">An established constraint.</p>

      {timeZone === null ? (
        <p className="mt-3 text-sm text-stone-300">A commitment needs a confirmed time zone.</p>
      ) : null}

      {loadError ? (
        <p role="alert" className="mt-3 text-sm text-stone-200">
          {loadError}
        </p>
      ) : null}

      {timeZone !== null && !entriesReady ? (
        <p className="mt-4 text-sm text-stone-300">Loading commitments.</p>
      ) : null}
      {timeZone !== null && entriesReady && loadError === null && shown.length === 0 ? (
        <p className="mt-4 text-sm text-stone-300">No current or upcoming commitments.</p>
      ) : null}

      {timeZone !== null ? (
        <ul className="mt-2">
          {shown.map((entry) => {
            const placement = classifyCommitment(entry, instant, timeZone);
            const confirming = confirmingId === entry.id;
            return (
              <li key={entry.id} className="border-t border-stone-800 py-4">
                <p>{formatCivilDateLabel(entry.startsOn)}</p>
                <p className="mt-1 text-sm text-stone-300">{intervalLabel(entry)}</p>
                {entry.kind === "timed" &&
                timedCommitmentEndsNextCivilDate(entry.startLocal, entry.endLocal) ? (
                  <p className="mt-1 text-sm text-stone-400">Continues after midnight.</p>
                ) : null}
                <p className="mt-1 text-sm text-stone-300">{entry.title}</p>
                {placement === "current" ? (
                  <p className="mt-1 text-sm text-stone-400">Includes the current time.</p>
                ) : null}
                {confirming ? (
                  <div className="mt-3" role="group" aria-label={`Remove ${entry.title}`}>
                    <p className="text-sm text-stone-300">Remove this commitment?</p>
                    {removeError ? (
                      <p role="alert" className="mt-2 text-sm">
                        {removeError}
                      </p>
                    ) : null}
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => onConfirmRemove(entry.id)}
                        disabled={removing}
                        className={`flex-1 ${primaryButtonClass}`}
                      >
                        {removing ? "Saving" : "Remove"}
                      </button>
                      <button
                        type="button"
                        onClick={onCancelRemove}
                        disabled={removing}
                        className={`flex-1 ${secondaryButtonClass}`}
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => onBeginEdit(entry.id)}
                      className={`inline-flex flex-1 items-center justify-center gap-2 ${secondaryButtonClass}`}
                    >
                      <Icon icon={Pencil} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onAskRemove(entry.id)}
                      className={`inline-flex flex-1 items-center justify-center gap-2 ${secondaryButtonClass}`}
                    >
                      <Icon icon={Trash2} />
                      Remove
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {timeZone !== null && editor === null ? (
        <button
          type="button"
          onClick={onBeginAdd}
          className={`mt-4 inline-flex w-full items-center justify-center gap-2 ${secondaryButtonClass}`}
        >
          <Icon icon={Plus} />
          Add commitment
        </button>
      ) : null}

      {editor ? (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <h3 className="text-base font-medium">
            {editor.id ? "Edit commitment" : "Add commitment"}
          </h3>
          <label className="mt-4 block text-sm font-medium" htmlFor="commitment-date">
            Date
          </label>
          <input
            id="commitment-date"
            type="date"
            required
            value={editor.startsOn}
            onChange={(event) => onChange({ ...editor, startsOn: event.target.value })}
            className={fieldClass}
          />
          <fieldset className="mt-4">
            <legend className="sr-only">All day or a timed interval</legend>
            <div className="mt-2 flex gap-3">
              <label
                className={`inline-flex flex-1 items-center justify-center gap-2 ${secondaryButtonClass}`}
              >
                <input
                  type="radio"
                  name="commitment-kind"
                  value="all_day"
                  checked={editor.kind === "all_day"}
                  onChange={() => onChange({ ...editor, kind: "all_day" })}
                />
                All day
              </label>
              <label
                className={`inline-flex flex-1 items-center justify-center gap-2 ${secondaryButtonClass}`}
              >
                <input
                  type="radio"
                  name="commitment-kind"
                  value="timed"
                  checked={editor.kind === "timed"}
                  onChange={() => onChange({ ...editor, kind: "timed" })}
                />
                Timed
              </label>
            </div>
          </fieldset>
          {editor.kind === "timed" ? (
            <div className="mt-4 space-y-4">
              <LocalTimeField
                label="Start"
                value={editor.start}
                onChange={(start) => onChange({ ...editor, start })}
              />
              <LocalTimeField
                label="End"
                value={editor.end}
                onChange={(end) => onChange({ ...editor, end })}
              />
              {commitmentDraftContinuesAfterMidnight(editor) ? (
                <p className="text-sm text-stone-400">Continues after midnight.</p>
              ) : null}
            </div>
          ) : null}
          <label className="mt-4 block text-sm font-medium" htmlFor="commitment-title">
            Title
          </label>
          <input
            id="commitment-title"
            type="text"
            required
            maxLength={80}
            value={editor.title}
            onChange={(event) => onChange({ ...editor, title: event.target.value })}
            className={fieldClass}
          />
          {formError ? (
            <p role="alert" className="mt-3 text-sm text-stone-200">
              {formError}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-3">
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? "Saving" : "Save"}
            </button>
            <button type="button" onClick={onCancel} disabled={saving} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function intervalLabel(entry: Commitment): string {
  if (entry.kind === "all_day") return "All day";
  return `${formatLocalTimeLabel(entry.startLocal)}–${formatLocalTimeLabel(entry.endLocal)}`;
}
