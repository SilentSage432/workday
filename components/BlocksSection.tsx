import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { LocalTimeField } from "@/components/LocalTimeField";
import {
  blockDraftContinuesAfterMidnight,
  blockInputFromDraft,
  draftFromBlock,
  newBlockDraft,
  type BlockDraft,
} from "@/components/blockDraft";
import { timedBlockEndsNextCivilDate, type Block } from "@/domain/block";
import { CANONICAL_CONTEXT_NAMES, type Context } from "@/domain/context";
import { formatLocalTimeLabel } from "@/domain/time/localTime";
import { civilDateInTimeZone, formatCivilDate, formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import { classifyBlock, projectBlocks } from "@/projections/block";
import { createBlock, deleteBlock, loadBlocks, updateBlock } from "@/persistence/block";
import { loadContexts } from "@/persistence/contextsAndTasks";
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

function orderedContexts(contexts: readonly Context[]): Context[] {
  return [...contexts].sort((left, right) => {
    const leftOrder = CANONICAL_CONTEXT_NAMES.indexOf(
      left.name as (typeof CANONICAL_CONTEXT_NAMES)[number],
    );
    const rightOrder = CANONICAL_CONTEXT_NAMES.indexOf(
      right.name as (typeof CANONICAL_CONTEXT_NAMES)[number],
    );
    const leftRank = leftOrder === -1 ? CANONICAL_CONTEXT_NAMES.length : leftOrder;
    const rightRank = rightOrder === -1 ? CANONICAL_CONTEXT_NAMES.length : rightOrder;
    return leftRank - rightRank || left.name.localeCompare(right.name);
  });
}

export function BlocksSection({
  timeZone,
  onStored,
}: {
  timeZone: string | null;
  onStored?: () => void;
}) {
  const [instant, setInstant] = useState(() => new Date());
  const [entries, setEntries] = useState<Block[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [contextsReady, setContextsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entriesReady, setEntriesReady] = useState(false);
  const [editor, setEditor] = useState<BlockDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!timeZone) return;
    const client = getSupabaseBrowserClient();
    let ignore = false;

    async function load() {
      try {
        const [loadedBlocks, loadedContexts] = await Promise.all([
          loadBlocks(client),
          loadContexts(client),
        ]);
        if (ignore) return;
        setEntries(loadedBlocks);
        setContexts(loadedContexts);
        setContextsReady(true);
        setInstant(new Date());
        setLoadError(null);
        setEntriesReady(true);
      } catch (error: unknown) {
        if (ignore) return;
        setLoadError(failureMessage(error, "Could not load blocks."));
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
      const input = blockInputFromDraft(editor);
      const client = getSupabaseBrowserClient();
      const saved = editor.id
        ? await updateBlock(client, editor.id, input)
        : await createBlock(client, input);
      setEntries((current) =>
        editor.id
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [...current, saved],
      );
      setEditor(null);
      onStored?.();
    } catch (error: unknown) {
      setFormError(`${failureMessage(error, "Could not save this block.")} It was not saved.`);
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(id: string) {
    setRemoving(true);
    setRemoveError(null);
    try {
      await deleteBlock(getSupabaseBrowserClient(), id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
      setConfirmingId(null);
      if (editor?.id === id) setEditor(null);
      onStored?.();
    } catch (error: unknown) {
      setRemoveError(`${failureMessage(error, "Could not remove this block.")} It is still here.`);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <BlocksPanel
      timeZone={timeZone}
      instant={instant}
      entries={entries}
      contexts={orderedContexts(contexts)}
      contextsReady={contextsReady}
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
        setEditor(newBlockDraft(formatCivilDate(civilDateInTimeZone(new Date(), timeZone))));
        setFormError(null);
        setConfirmingId(null);
      }}
      onBeginEdit={(id) => {
        const entry = entries.find((item) => item.id === id);
        if (!entry) return;
        setEditor(draftFromBlock(entry));
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

export function BlocksPanel({
  timeZone,
  instant,
  entries,
  contexts,
  contextsReady,
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
  entries: readonly Block[];
  contexts: readonly Context[];
  contextsReady: boolean;
  loadError: string | null;
  entriesReady: boolean;
  editor: BlockDraft | null;
  saving: boolean;
  formError: string | null;
  confirmingId: string | null;
  removeError: string | null;
  removing: boolean;
  onBeginAdd: () => void;
  onBeginEdit: (id: string) => void;
  onCancel: () => void;
  onChange: (draft: BlockDraft) => void;
  onSave: () => void;
  onAskRemove: (id: string) => void;
  onCancelRemove: () => void;
  onConfirmRemove: (id: string) => void;
}) {
  const shown = timeZone === null ? [] : projectBlocks({ entries, instant, timeZone });
  const contextName = new Map(contexts.map((context) => [context.id, context.name]));

  return (
    <section className="mt-12" aria-labelledby="blocks-heading">
      <h2 id="blocks-heading" className="text-lg font-medium">
        Blocks
      </h2>
      <p className="mt-1 text-sm text-stone-400">What this time is for.</p>

      {timeZone === null ? (
        <p className="mt-3 text-sm text-stone-300">A block needs a confirmed time zone.</p>
      ) : null}

      {loadError ? (
        <p role="alert" className="mt-3 text-sm text-stone-200">
          {loadError}
        </p>
      ) : null}

      {timeZone !== null && !entriesReady ? (
        <p className="mt-4 text-sm text-stone-300">Loading blocks.</p>
      ) : null}
      {timeZone !== null && entriesReady && shown.length === 0 ? (
        <p className="mt-4 text-sm text-stone-300">No current or upcoming blocks.</p>
      ) : null}

      {timeZone !== null ? (
        <ul className="mt-2">
          {shown.map((entry) => {
            const placement = classifyBlock(entry, instant, timeZone);
            const confirming = confirmingId === entry.id;
            const name = entry.contextId ? (contextName.get(entry.contextId) ?? null) : null;
            return (
              <li key={entry.id} className="border-t border-stone-800 py-4">
                <p>{formatCivilDateLabel(entry.startsOn)}</p>
                <p className="mt-1 text-sm text-stone-300">{intervalLabel(entry)}</p>
                {entry.kind === "timed" &&
                timedBlockEndsNextCivilDate(entry.startLocal, entry.endLocal) ? (
                  <p className="mt-1 text-sm text-stone-400">Continues after midnight.</p>
                ) : null}
                {name ? (
                  <p className="mt-1 text-sm text-stone-300">
                    <span className="text-stone-400">Context </span>
                    {name}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-stone-300">{entry.purpose}</p>
                {placement === "current" ? (
                  <p className="mt-1 text-sm text-stone-400">Includes the current time.</p>
                ) : null}
                {confirming ? (
                  <div className="mt-3" role="group" aria-label={`Remove ${entry.purpose}`}>
                    <p className="text-sm text-stone-300">Remove this block?</p>
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
          Add block
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
          <h3 className="text-base font-medium">{editor.id ? "Edit block" : "Add block"}</h3>
          <label className="mt-4 block text-sm font-medium" htmlFor="block-date">
            Date
          </label>
          <input
            id="block-date"
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
                  name="block-kind"
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
                  name="block-kind"
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
              {blockDraftContinuesAfterMidnight(editor) ? (
                <p className="text-sm text-stone-400">Continues after midnight.</p>
              ) : null}
            </div>
          ) : null}
          {contextsReady ? (
            <>
              <label className="mt-4 block text-sm font-medium" htmlFor="block-context">
                Context
              </label>
              <select
                id="block-context"
                value={editor.contextId}
                onChange={(event) => onChange({ ...editor, contextId: event.target.value })}
                className={fieldClass}
              >
                <option value="">None</option>
                {contexts.map((context) => (
                  <option key={context.id} value={context.id}>
                    {context.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-stone-400">Optional. It does not replace the purpose.</p>
            </>
          ) : (
            <p className="mt-4 text-sm text-stone-400">
              Contexts could not be loaded. A saved context on this block stays as it is.
            </p>
          )}
          <label className="mt-4 block text-sm font-medium" htmlFor="block-purpose">
            Purpose
          </label>
          <input
            id="block-purpose"
            type="text"
            required
            maxLength={80}
            value={editor.purpose}
            onChange={(event) => onChange({ ...editor, purpose: event.target.value })}
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

function intervalLabel(entry: Block): string {
  if (entry.kind === "all_day") return "All day";
  return `${formatLocalTimeLabel(entry.startLocal)}–${formatLocalTimeLabel(entry.endLocal)}`;
}
