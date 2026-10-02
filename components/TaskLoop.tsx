"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WorkOrientationView } from "@/components/WorkOrientation";
import { WorkSchedule } from "@/components/WorkSchedule";
import { activeThreadAfterCompletion, type ActiveThread } from "@/domain/activeThread";
import { CANONICAL_CONTEXT_NAMES, type Context } from "@/domain/context";
import {
  captureAfterFailedSave,
  captureAfterSuccessfulSave,
  captureDraftHasMeaning,
  collapseCapture,
  initialCaptureSession,
  newTaskFromCapture,
  openCapture,
  openTasksAfterCompletion,
  type CaptureSession,
} from "@/domain/capture";
import type { Task } from "@/domain/task";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  formatCivilDateLabel,
  parseCivilDate,
} from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { projectResume } from "@/projections/resume";
import { projectWorkOrientation } from "@/projections/workOrientation";
import { clearActiveThread, establishActiveThread, loadActiveThread } from "@/persistence/activeThread";
import {
  completeTask,
  createTask,
  loadContexts,
  loadOpenTasks,
} from "@/persistence/contextsAndTasks";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import { loadTemporalSettings, loadWorkSchedule } from "@/persistence/workSchedule";

type SessionPhase = "loading" | "signed-out" | "signed-in";
type DataPhase = "loading" | "ready" | "error";

const CONTEXT_ORDER: readonly string[] = CANONICAL_CONTEXT_NAMES;

const pageClass =
  "mx-auto min-h-dvh max-w-lg overflow-x-hidden bg-stone-950 px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] text-stone-100";
const fieldClass =
  "mt-1 w-full min-h-12 rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300";
const primaryButtonClass =
  "min-h-12 rounded-md bg-stone-100 px-4 text-center text-base text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";
const secondaryButtonClass =
  "min-h-12 rounded-md border border-stone-600 bg-stone-900 px-4 text-center text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

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

function entryOn(entries: WorkScheduleEntry[], workOn: string): WorkScheduleEntry | null {
  return entries.find((entry) => entry.workOn === workOn) ?? null;
}

async function readWorkWindow(client: SupabaseClient): Promise<{
  timeZone: string | null;
  entries: WorkScheduleEntry[];
}> {
  const settings = await loadTemporalSettings(client);
  if (!settings) {
    return { timeZone: null, entries: [] };
  }
  const now = new Date();
  const today = formatCivilDate(civilDateInTimeZone(now, settings.timeZone));
  const yesterday = formatCivilDate(addCivilDays(parseCivilDate(today), -1));
  const entries = await loadWorkSchedule(client, yesterday, today);
  return { timeZone: settings.timeZone, entries };
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
      <main className={pageClass}>
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
    <main className={`flex flex-col ${pageClass}`}>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm leading-6 text-stone-400">
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
            className={fieldClass}
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
            className={fieldClass}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-stone-200">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={submitting} className={`w-full ${primaryButtonClass}`}>
          {submitting ? "Signing in" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function SignedInLoop() {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const [dataPhase, setDataPhase] = useState<DataPhase>("loading");
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [capture, setCapture] = useState<CaptureSession>(initialCaptureSession);
  const [surface, setSurface] = useState<"tasks" | "schedule">("tasks");
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [workEntries, setWorkEntries] = useState<WorkScheduleEntry[]>([]);
  const [workNotice, setWorkNotice] = useState<string | null>(null);
  const [workReload, setWorkReload] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<{ id: string; message: string } | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<{ id: string; message: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
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
        const [loadedContexts, loadedTasks, loadedThread] = await Promise.all([
          loadContexts(client),
          loadOpenTasks(client),
          loadActiveThread(client),
        ]);
        if (ignore) return;
        setContexts(loadedContexts);
        setTasks(loadedTasks);
        setActiveThread(loadedThread);
        setDataPhase("ready");
        try {
          const window = await readWorkWindow(client);
          if (ignore) return;
          setTimeZone(window.timeZone);
          setWorkEntries(window.entries);
          setWorkNotice(null);
        } catch (error: unknown) {
          if (ignore) return;
          setTimeZone(null);
          setWorkEntries([]);
          setWorkNotice(failureMessage(error, "Could not load today's Work schedule."));
        }
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

  useEffect(() => {
    if (capture.open) {
      titleRef.current?.focus();
    }
  }, [capture.open]);

  useEffect(() => {
    if (workReload === 0) return;
    const client = getSupabaseBrowserClient();
    let ignore = false;

    async function refreshWork() {
      try {
        const window = await readWorkWindow(client);
        if (ignore) return;
        setTimeZone(window.timeZone);
        setWorkEntries(window.entries);
        setWorkNotice(null);
      } catch (error: unknown) {
        if (ignore) return;
        setTimeZone(null);
        setWorkEntries([]);
        setWorkNotice(failureMessage(error, "Could not load today's Work schedule."));
      }
    }

    void refreshWork();
    return () => {
      ignore = true;
    };
  }, [workReload]);

  async function onSignOut() {
    await getSupabaseBrowserClient().auth.signOut();
  }

  async function onCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createTask(
        getSupabaseBrowserClient(),
        newTaskFromCapture(capture.draft),
      );
      setTasks((current) => [...current, created]);
      setCapture(captureAfterSuccessfulSave());
    } catch (error: unknown) {
      setCapture((current) => captureAfterFailedSave(current));
      setSaveError(failureMessage(error, "Could not save this task."));
    } finally {
      setSaving(false);
    }
  }

  async function onStart(taskId: string) {
    setStartingId(taskId);
    setStartError(null);
    const hadThread = activeThread !== null;
    try {
      const established = await establishActiveThread(
        getSupabaseBrowserClient(),
        taskId,
        new Date(),
      );
      setActiveThread(established);
    } catch (error: unknown) {
      const reason = failureMessage(error, "Could not make this the current thread.");
      setStartError({
        id: taskId,
        message: hadThread ? `${reason} The current thread is unchanged.` : reason,
      });
    } finally {
      setStartingId(null);
    }
  }

  async function onLeave() {
    setLeaving(true);
    setLeaveError(null);
    try {
      await clearActiveThread(getSupabaseBrowserClient());
      setActiveThread(null);
    } catch (error: unknown) {
      setLeaveError(
        `${failureMessage(error, "Could not leave this thread.")} It is still active.`,
      );
    } finally {
      setLeaving(false);
    }
  }

  async function onComplete(taskId: string) {
    setCompletingId(taskId);
    setCompleteError(null);
    const wasActive = activeThread?.taskId === taskId;
    try {
      await completeTask(getSupabaseBrowserClient(), taskId, new Date());
      setTasks((current) => openTasksAfterCompletion(current, taskId));
      setActiveThread((current) => activeThreadAfterCompletion(current, taskId));
    } catch (error: unknown) {
      const reason = failureMessage(error, "Could not complete this task.");
      setCompleteError({
        id: taskId,
        message: wasActive
          ? `${reason} This task is still open, and it is still the current thread.`
          : `${reason} This task is still open.`,
      });
    } finally {
      setCompletingId(null);
    }
  }

  const contextNameById = new Map(contexts.map((context) => [context.id, context.name]));
  const resume = projectResume({ activeThread, openTasks: tasks });
  const observedAt = new Date();
  const workOrientation =
    timeZone && !workNotice
      ? projectWorkOrientation({
          instant: observedAt,
          timeZone,
          todayEntry: entryOn(
            workEntries,
            formatCivilDate(civilDateInTimeZone(observedAt, timeZone)),
          ),
          previousEntry: entryOn(
            workEntries,
            formatCivilDate(addCivilDays(civilDateInTimeZone(observedAt, timeZone), -1)),
          ),
        })
      : null;

  return (
    <main className={pageClass}>
      <div className="flex items-center justify-between gap-3">
        {dataPhase === "ready" && surface === "schedule" ? (
          <button
            type="button"
            onClick={() => {
              setSurface("tasks");
              setWorkReload((current) => current + 1);
            }}
            className="min-h-11 px-2 text-sm text-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300"
          >
            Tasks
          </button>
        ) : dataPhase === "ready" ? (
          <button
            type="button"
            onClick={() => setSurface("schedule")}
            className="min-h-11 px-2 text-sm text-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300"
          >
            Work schedule
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="min-h-11 px-2 text-sm text-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300"
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
            className={`mt-4 ${secondaryButtonClass}`}
          >
            Try again
          </button>
        </div>
      ) : null}

      {dataPhase === "ready" && surface === "schedule" ? <WorkSchedule /> : null}

      {dataPhase === "ready" && surface === "tasks" ? (
        <>
          {resume ? (
            <section
              className="mt-2 rounded-md border border-stone-700 bg-stone-900 p-4"
              aria-labelledby="resume-heading"
            >
              <h2 id="resume-heading" className="text-sm font-medium text-stone-400">
                Resume
              </h2>
              <p className="mt-2 break-words text-xl font-medium">{resume.task.title}</p>
              <p className="mt-1 text-sm text-stone-300">This is what you’re doing.</p>
              <TaskFacts
                task={resume.task}
                contextName={
                  resume.task.contextId
                    ? (contextNameById.get(resume.task.contextId) ?? null)
                    : null
                }
              />
              {completeError?.id === resume.task.id ? (
                <p role="alert" className="mt-3 text-sm text-stone-200">
                  {completeError.message}
                </p>
              ) : null}
              {leaveError ? (
                <p role="alert" className="mt-3 text-sm text-stone-200">
                  {leaveError}
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => void onComplete(resume.task.id)}
                  disabled={completingId === resume.task.id}
                  className={primaryButtonClass}
                >
                  {completingId === resume.task.id ? "Saving" : "Complete"}
                </button>
                <button
                  type="button"
                  onClick={() => void onLeave()}
                  disabled={leaving}
                  className={secondaryButtonClass}
                >
                  {leaving ? "Saving" : "Leave thread"}
                </button>
              </div>
            </section>
          ) : null}

          {workOrientation ? <WorkOrientationView orientation={workOrientation} /> : null}
          {workNotice ? (
            <p className="mt-6 text-sm text-stone-300" role="status">
              {workNotice}
            </p>
          ) : null}

          <div className="mt-8">
            {capture.open ? (
              <form onSubmit={(event) => void onCapture(event)}>
                <label className="block text-xl font-medium tracking-tight" htmlFor="task-title">
                  What needs doing?
                </label>
                <input
                  id="task-title"
                  name="title"
                  type="text"
                  required
                  ref={titleRef}
                  value={capture.draft.title}
                  onChange={(event) =>
                    setCapture({
                      ...capture,
                      draft: { ...capture.draft, title: event.target.value },
                    })
                  }
                  className={fieldClass}
                />
                {capture.detailsOpen ? (
                  <fieldset className="mt-4 space-y-4">
                    <legend className="text-sm text-stone-400">Optional</legend>
                    <div>
                      <label className="block text-sm font-medium" htmlFor="task-context">
                        Context
                      </label>
                      <select
                        id="task-context"
                        name="context"
                        value={capture.draft.contextId}
                        onChange={(event) =>
                          setCapture({
                            ...capture,
                            draft: { ...capture.draft, contextId: event.target.value },
                          })
                        }
                        className={fieldClass}
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
                      <p id="task-planned-hint" className="text-sm text-stone-400">
                        When you intend to work on it.
                      </p>
                      <input
                        id="task-planned"
                        name="planned"
                        type="date"
                        aria-describedby="task-planned-hint"
                        value={capture.draft.plannedOn}
                        onChange={(event) =>
                          setCapture({
                            ...capture,
                            draft: { ...capture.draft, plannedOn: event.target.value },
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
                        value={capture.draft.dueOn}
                        onChange={(event) =>
                          setCapture({
                            ...capture,
                            draft: { ...capture.draft, dueOn: event.target.value },
                          })
                        }
                        className={fieldClass}
                      />
                    </div>
                    <label className="flex min-h-12 items-center gap-3 text-base" htmlFor="task-must-do">
                      <input
                        id="task-must-do"
                        name="must-do"
                        type="checkbox"
                        checked={capture.draft.mustDo}
                        onChange={(event) =>
                          setCapture({
                            ...capture,
                            draft: { ...capture.draft, mustDo: event.target.checked },
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
                  onClick={() => setCapture({ ...capture, detailsOpen: !capture.detailsOpen })}
                  aria-expanded={capture.detailsOpen}
                  className={`mt-3 w-full ${secondaryButtonClass}`}
                >
                  {capture.detailsOpen ? "Fewer options" : "More options"}
                </button>
                <button
                  type="button"
                  onClick={() => setCapture((current) => collapseCapture(current))}
                  className="mt-2 min-h-11 w-full text-sm text-stone-400"
                >
                  Close
                </button>
              </form>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setCapture((current) => openCapture(current))}
                  className={`w-full ${secondaryButtonClass}`}
                >
                  + Capture
                </button>
                {captureDraftHasMeaning(capture.draft) ? (
                  <p className="mt-2 text-sm text-stone-400">An unsaved capture is still here.</p>
                ) : null}
              </div>
            )}
          </div>

          <section className="mt-12" aria-labelledby="open-tasks-heading">
            <h1 id="open-tasks-heading" className="text-lg font-medium">
              Open tasks
            </h1>
            {tasks.length === 0 ? <p className="mt-4 text-stone-300">No open tasks.</p> : null}
            <ul className="mt-2">
              {tasks.map((task) => {
                const contextName = task.contextId
                  ? (contextNameById.get(task.contextId) ?? null)
                  : null;
                const isCurrent = resume?.task.id === task.id;
                const completionFailed = completeError?.id === task.id;
                const startFailed = startError?.id === task.id;
                return (
                  <li key={task.id} className="border-t border-stone-800 py-4">
                    <p className="min-w-0 break-words text-base">{task.title}</p>
                    <TaskFacts task={task} contextName={contextName} />
                    <div className="mt-3 flex gap-3">
                      {isCurrent ? (
                        <p className="flex min-h-11 flex-1 items-center text-sm text-stone-300">
                          Current thread
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onStart(task.id)}
                          disabled={startingId !== null}
                          aria-describedby={startFailed ? `start-error-${task.id}` : undefined}
                          className={`flex-1 ${secondaryButtonClass}`}
                        >
                          {startingId === task.id ? "Saving" : "Start"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void onComplete(task.id)}
                        disabled={completingId === task.id}
                        aria-describedby={
                          completionFailed ? `complete-error-${task.id}` : undefined
                        }
                        className={`flex-1 ${secondaryButtonClass}`}
                      >
                        {completingId === task.id ? "Saving" : "Complete"}
                      </button>
                    </div>
                    {startFailed ? (
                      <p id={`start-error-${task.id}`} role="alert" className="mt-2 text-sm">
                        {startError.message}
                      </p>
                    ) : null}
                    {completionFailed ? (
                      <p id={`complete-error-${task.id}`} role="alert" className="mt-2 text-sm">
                        {completeError.message}
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
    <div className="mt-2 space-y-1 text-sm text-stone-300">
      {contextName ? (
        <p>
          <span className="text-stone-400">Context </span>
          {contextName}
        </p>
      ) : null}
      {dated.map((fact) => (
        <p key={fact.label}>
          <span className="text-stone-400">{fact.label} </span>
          {fact.value}
        </p>
      ))}
      {task.mustDo ? <p>Must do</p> : null}
    </div>
  );
}
