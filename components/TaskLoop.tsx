"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CANONICAL_CONTEXT_NAMES, type Context } from "@/domain/context";
import {
  draftAfterFailedSave,
  emptyCaptureDraft,
  newTaskFromCapture,
  openTasksAfterCompletion,
  type CaptureDraft,
} from "@/domain/capture";
import type { Task } from "@/domain/task";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import {
  completeTask,
  createTask,
  loadContexts,
  loadOpenTasks,
} from "@/persistence/contextsAndTasks";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";

type SessionPhase = "loading" | "signed-out" | "signed-in";
type DataPhase = "loading" | "ready" | "error";

const CONTEXT_ORDER: readonly string[] = CANONICAL_CONTEXT_NAMES;

function orderedContexts(contexts: Context[]): Context[] {
  return [...contexts].sort((left, right) => {
    const leftOrder = CONTEXT_ORDER.indexOf(left.name);
    const rightOrder = CONTEXT_ORDER.indexOf(right.name);
    const leftRank = leftOrder === -1 ? CONTEXT_ORDER.length : leftOrder;
    const rightRank = rightOrder === -1 ? CONTEXT_ORDER.length : rightOrder;
    return leftRank - rightRank || left.name.localeCompare(right.name);
  });
}

function signInFailureMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "That email and password did not match.";
  }
  return "Could not sign in.";
}

function failureMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function TaskLoop() {
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("loading");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setSessionPhase("signed-out");
        return;
      }
      setSessionPhase("signed-in");
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  if (sessionPhase === "loading") {
    return (
      <main className="mx-auto min-h-dvh max-w-lg bg-stone-50 px-4 py-8 text-stone-900">
        <p>Checking session.</p>
      </main>
    );
  }

  if (sessionPhase === "signed-out") {
    return <SignIn />;
  }

  return <SignedInLoop />;
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInFailureMessage(signInError.message));
    }
    setSubmitting(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-stone-50 px-4 py-8 text-stone-900">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        For the person this instrument belongs to.
      </p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full min-h-12 rounded-md border border-stone-300 bg-white px-3 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full min-h-12 rounded-md border border-stone-300 bg-white px-3 text-base"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-stone-800">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="min-h-12 w-full rounded-md bg-stone-900 px-4 text-center text-base text-stone-50 disabled:opacity-60"
        >
          {submitting ? "Signing in" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function SignedInLoop() {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dataPhase, setDataPhase] = useState<DataPhase>("loading");
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState<CaptureDraft>(emptyCaptureDraft);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<{ id: string; message: string } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    let ignore = false;

    async function load() {
      setDataPhase("loading");
      setDataError(null);
      try {
        const { data, error } = await client.auth.getUser();
        if (ignore) return;
        if (error || !data.user) {
          await client.auth.signOut();
          return;
        }
        const [loadedContexts, loadedTasks] = await Promise.all([
          loadContexts(client),
          loadOpenTasks(client),
        ]);
        if (ignore) return;
        setContexts(loadedContexts);
        setTasks(loadedTasks);
        setDataPhase("ready");
      } catch (error: unknown) {
        if (ignore) return;
        setDataError(failureMessage(error, "Could not load tasks."));
        setDataPhase("error");
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  async function onSignOut() {
    await getSupabaseBrowserClient().auth.signOut();
  }

  async function onCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createTask(getSupabaseBrowserClient(), newTaskFromCapture(draft));
      setTasks((current) => [...current, created]);
      setDraft(emptyCaptureDraft());
      titleRef.current?.focus();
    } catch (error: unknown) {
      setDraft((current) => draftAfterFailedSave(current));
      setSaveError(failureMessage(error, "Could not save this task."));
    } finally {
      setSaving(false);
    }
  }

  async function onComplete(taskId: string) {
    setCompletingId(taskId);
    setCompleteError(null);
    try {
      await completeTask(getSupabaseBrowserClient(), taskId, new Date());
      setTasks((current) => openTasksAfterCompletion(current, taskId));
    } catch (error: unknown) {
      setCompleteError({
        id: taskId,
        message: failureMessage(error, "Could not complete this task."),
      });
    } finally {
      setCompletingId(null);
    }
  }

  const contextNameById = new Map(contexts.map((context) => [context.id, context.name]));

  return (
    <main className="mx-auto min-h-dvh max-w-lg overflow-x-hidden bg-stone-50 px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] text-stone-900">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="min-h-11 px-2 text-sm text-stone-500"
        >
          Sign out
        </button>
      </div>

      {dataPhase === "loading" ? <p className="mt-6">Loading tasks.</p> : null}

      {dataPhase === "error" ? (
        <div className="mt-6">
          <p role="alert">{dataError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-4 min-h-12 rounded-md border border-stone-300 bg-white px-4 text-base"
          >
            Try again
          </button>
        </div>
      ) : null}

      {dataPhase === "ready" ? (
        <>
          <form className="mt-2" onSubmit={(event) => void onCapture(event)}>
            <label className="block text-xl font-medium tracking-tight" htmlFor="task-title">
              What needs doing?
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              required
              autoFocus
              ref={titleRef}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              className="mt-3 w-full min-h-12 rounded-md border border-stone-300 bg-white px-3 text-base"
            />

            <fieldset className="mt-6 space-y-4">
              <legend className="text-sm text-stone-600">Optional</legend>
              <div>
                <label className="block text-sm font-medium" htmlFor="task-context">
                  Context
                </label>
                <select
                  id="task-context"
                  name="context"
                  value={draft.contextId}
                  onChange={(event) => setDraft({ ...draft, contextId: event.target.value })}
                  className="mt-1 w-full min-h-12 rounded-md border border-stone-300 bg-white px-3 text-base"
                >
                  <option value="">None</option>
                  {orderedContexts(contexts).map((context) => (
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
                <p id="task-planned-hint" className="text-sm text-stone-600">
                  When you intend to work on it.
                </p>
                <input
                  id="task-planned"
                  name="planned"
                  type="date"
                  aria-describedby="task-planned-hint"
                  value={draft.plannedOn}
                  onChange={(event) => setDraft({ ...draft, plannedOn: event.target.value })}
                  className="mt-1 w-full min-h-12 rounded-md border border-stone-300 bg-white px-3 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="task-due">
                  Due
                </label>
                <p id="task-due-hint" className="text-sm text-stone-600">
                  When completion is required.
                </p>
                <input
                  id="task-due"
                  name="due"
                  type="date"
                  aria-describedby="task-due-hint"
                  value={draft.dueOn}
                  onChange={(event) => setDraft({ ...draft, dueOn: event.target.value })}
                  className="mt-1 w-full min-h-12 rounded-md border border-stone-300 bg-white px-3 text-base"
                />
              </div>
              <label className="flex min-h-12 items-center gap-3 text-base" htmlFor="task-must-do">
                <input
                  id="task-must-do"
                  name="must-do"
                  type="checkbox"
                  checked={draft.mustDo}
                  onChange={(event) => setDraft({ ...draft, mustDo: event.target.checked })}
                  className="size-5"
                />
                Must do
              </label>
            </fieldset>

            {saveError ? (
              <p role="alert" className="mt-4 text-sm text-stone-800">
                {saveError} The draft is still here.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="mt-6 min-h-12 w-full rounded-md bg-stone-900 px-4 text-center text-base text-stone-50 disabled:opacity-60"
            >
              {saving ? "Saving" : "Save"}
            </button>
          </form>

          <section className="mt-12" aria-labelledby="open-tasks-heading">
            <h1 id="open-tasks-heading" className="text-lg font-medium">
              Open tasks
            </h1>
            {tasks.length === 0 ? <p className="mt-4 text-stone-700">No open tasks.</p> : null}
            <ul className="mt-2">
              {tasks.map((task) => {
                const contextName = task.contextId
                  ? (contextNameById.get(task.contextId) ?? null)
                  : null;
                const completionFailed = completeError?.id === task.id;
                return (
                  <li key={task.id} className="border-t border-stone-200 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 break-words text-base">{task.title}</p>
                      <button
                        type="button"
                        onClick={() => void onComplete(task.id)}
                        disabled={completingId === task.id}
                        aria-describedby={completionFailed ? `complete-error-${task.id}` : undefined}
                        className="min-h-11 shrink-0 rounded-md border border-stone-300 bg-white px-3 text-sm disabled:opacity-60"
                      >
                        {completingId === task.id ? "Saving" : "Complete"}
                      </button>
                    </div>
                    <TaskFacts task={task} contextName={contextName} />
                    {completionFailed ? (
                      <p id={`complete-error-${task.id}`} role="alert" className="mt-2 text-sm">
                        {completeError.message} This task is still open.
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}

function TaskFacts({ task, contextName }: { task: Task; contextName: string | null }) {
  const dated = [
    task.plannedOn ? { label: "Planned", value: formatCivilDateLabel(task.plannedOn) } : null,
    task.dueOn ? { label: "Due", value: formatCivilDateLabel(task.dueOn) } : null,
  ].filter((fact) => fact !== null);

  if (!contextName && dated.length === 0 && !task.mustDo) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1 text-sm text-stone-700">
      {contextName ? (
        <p>
          <span className="text-stone-500">Context </span>
          {contextName}
        </p>
      ) : null}
      {dated.map((fact) => (
        <p key={fact.label}>
          <span className="text-stone-500">{fact.label} </span>
          {fact.value}
        </p>
      ))}
      {task.mustDo ? <p>Must do</p> : null}
    </div>
  );
}
