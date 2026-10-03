"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCapture } from "@/components/AppFrame";
import { CapturePanel } from "@/components/CapturePanel";
import { TaskFacts } from "@/components/TaskFacts";
import { OpenTaskPlanButton, TodayPlan, type TodayZoneStatus } from "@/components/TodayPlan";
import { WorkOrientationView } from "@/components/WorkOrientation";
import { activeThreadAfterCompletion, type ActiveThread } from "@/domain/activeThread";
import { CANONICAL_CONTEXT_NAMES, type Context } from "@/domain/context";
import {
  captureAfterFailedSave,
  captureAfterSuccessfulSave,
  newTaskFromCapture,
  openTasksAfterCompletion,
} from "@/domain/capture";
import type { Task } from "@/domain/task";
import {
  addCivilDays,
  civilDateInTimeZone,
  formatCivilDate,
  parseCivilDate,
} from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { projectResume } from "@/projections/resume";
import { projectTodayTasks } from "@/projections/today";
import { projectWorkOrientation } from "@/projections/workOrientation";
import { clearActiveThread, establishActiveThread, loadActiveThread } from "@/persistence/activeThread";
import {
  completeTask,
  createTask,
  loadContexts,
  loadOpenTasks,
  updateTask,
} from "@/persistence/contextsAndTasks";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import { loadTemporalSettings, loadWorkSchedule } from "@/persistence/workSchedule";

type DataPhase = "loading" | "ready" | "error";

const CONTEXT_ORDER: readonly string[] = CANONICAL_CONTEXT_NAMES;

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

function failureMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function entryOn(entries: WorkScheduleEntry[], workOn: string): WorkScheduleEntry | null {
  return entries.find((entry) => entry.workOn === workOn) ?? null;
}

async function readWorkWindow(
  client: SupabaseClient,
  timeZone: string,
): Promise<WorkScheduleEntry[]> {
  const now = new Date();
  const today = formatCivilDate(civilDateInTimeZone(now, timeZone));
  const yesterday = formatCivilDate(addCivilDays(parseCivilDate(today), -1));
  return loadWorkSchedule(client, yesterday, today);
}

export function TaskLoop() {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const [dataPhase, setDataPhase] = useState<DataPhase>("loading");
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { session: capture, update: setCapture } = useCapture();
  const [zoneStatus, setZoneStatus] = useState<TodayZoneStatus>("unconfirmed");
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [workEntries, setWorkEntries] = useState<WorkScheduleEntry[]>([]);
  const [workNotice, setWorkNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<{ id: string; message: string } | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<{ id: string; message: string } | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<{ id: string; message: string } | null>(null);
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
        try {
          const settings = await loadTemporalSettings(client);
          if (ignore) return;
          if (!settings) {
            setZoneStatus("unconfirmed");
            setTimeZone(null);
            setWorkEntries([]);
            setWorkNotice(null);
          } else {
            setZoneStatus("confirmed");
            setTimeZone(settings.timeZone);
            try {
              const entries = await readWorkWindow(client, settings.timeZone);
              if (ignore) return;
              setWorkEntries(entries);
              setWorkNotice(null);
            } catch (error: unknown) {
              if (ignore) return;
              setWorkEntries([]);
              setWorkNotice(failureMessage(error, "Could not load today's Work schedule."));
            }
          }
        } catch {
          if (ignore) return;
          setZoneStatus("unavailable");
          setTimeZone(null);
          setWorkEntries([]);
          setWorkNotice(null);
        }
        if (ignore) return;
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

  useEffect(() => {
    if (capture.open) {
      titleRef.current?.focus();
    }
  }, [capture.open]);

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
      setCapture(captureAfterFailedSave(capture));
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

  async function onSetPlanned(taskId: string, plannedOn: string | null) {
    setPlanningId(taskId);
    setPlanError(null);
    try {
      const updated = await updateTask(getSupabaseBrowserClient(), taskId, { plannedOn });
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
    } catch (error: unknown) {
      setPlanError({
        id: taskId,
        message: `${failureMessage(error, "Could not change this plan.")} The planned day is unchanged.`,
      });
    } finally {
      setPlanningId(null);
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
  const contextName = (contextId: string | null) =>
    contextId ? (contextNameById.get(contextId) ?? null) : null;
  const resume = projectResume({ activeThread, openTasks: tasks });
  const observedAt = new Date();
  const civilDate =
    zoneStatus === "confirmed" && timeZone
      ? formatCivilDate(civilDateInTimeZone(observedAt, timeZone))
      : null;
  const todayTasks = civilDate ? projectTodayTasks({ openTasks: tasks, civilDate }) : [];
  const otherOpenTasks = civilDate
    ? tasks.filter((task) => task.plannedOn !== civilDate)
    : tasks;
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
    <main>
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

      {dataPhase === "ready" ? (
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
              <TaskFacts task={resume.task} contextName={contextName(resume.task.contextId)} />
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

          <TodayPlan
            zoneStatus={zoneStatus}
            civilDate={civilDate}
            tasks={todayTasks}
            contextName={contextName}
            activeTaskId={resume?.task.id ?? null}
            planningId={planningId}
            planError={planError}
            completingId={completingId}
            completeError={completeError}
            startingId={startingId}
            startError={startError}
            onPlan={(taskId, plannedOn) => void onSetPlanned(taskId, plannedOn)}
            onStart={(taskId) => void onStart(taskId)}
            onComplete={(taskId) => void onComplete(taskId)}
          />

          <div className="mt-8">
            <CapturePanel
              session={capture}
              contexts={orderedContexts(contexts)}
              saving={saving}
              saveError={saveError}
              titleRef={titleRef}
              onChange={setCapture}
              onSubmit={(event) => void onCapture(event)}
            />
          </div>

          <section className="mt-12" aria-labelledby="open-tasks-heading">
            <h1 id="open-tasks-heading" className="text-lg font-medium">
              Open tasks
            </h1>
            {otherOpenTasks.length === 0 ? (
              <p className="mt-4 text-stone-300">
                {tasks.length === 0 ? "No open tasks." : "Every open task is planned today."}
              </p>
            ) : null}
            <ul className="mt-2">
              {otherOpenTasks.map((task) => {
                const isCurrent = resume?.task.id === task.id;
                const completionFailed = completeError?.id === task.id;
                const startFailed = startError?.id === task.id;
                return (
                  <li key={task.id} className="border-t border-stone-800 py-4">
                    <p className="min-w-0 break-words text-base">{task.title}</p>
                    <TaskFacts task={task} contextName={contextName(task.contextId)} />
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
                    <OpenTaskPlanButton
                      task={task}
                      civilDate={civilDate}
                      pending={planningId === task.id}
                      disabled={planningId !== null}
                      onPlan={(taskId, plannedOn) => void onSetPlanned(taskId, plannedOn)}
                    />
                    {planError?.id === task.id ? (
                      <p role="alert" className="mt-2 text-sm">
                        {planError.message}
                      </p>
                    ) : null}
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
