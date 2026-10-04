"use client";

import { useEffect, useRef, useState } from "react";
import { CurrentTime } from "@/components/CurrentTime";
import { composeCurrentTemporalReading, type SourceRead } from "@/components/currentTemporalReading";
import { GeneralCapture } from "@/components/GeneralCapture";
import { QuickCapture } from "@/components/QuickCapture";
import { millisecondsUntilNextMinute } from "@/components/minuteClock";
import { TaskEditForm } from "@/components/TaskEditForm";
import { TaskFacts } from "@/components/TaskFacts";
import { OpenTaskPlanButton, TodayPlan, type TodayZoneStatus } from "@/components/TodayPlan";
import { WorkOrientationView } from "@/components/WorkOrientation";
import { activeThreadAfterCompletion, type ActiveThread } from "@/domain/activeThread";
import { CANONICAL_CONTEXT_NAMES, type Context } from "@/domain/context";
import { openTasksAfterCompletion } from "@/domain/capture";
import type { Block } from "@/domain/block";
import type { Commitment } from "@/domain/commitment";
import type { ProtectedTime } from "@/domain/protectedTime";
import type { Task } from "@/domain/task";
import { taskEditDraftFromTask, taskPatchFromEditDraft, type TaskEditDraft } from "@/domain/taskEdit";
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
import { loadBlocks } from "@/persistence/block";
import { loadCommitments } from "@/persistence/commitment";
import {
  completeTask,
  loadContexts,
  loadOpenTasks,
  updateTask,
} from "@/persistence/contextsAndTasks";
import { loadProtectedTime } from "@/persistence/protectedTime";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import { loadTemporalSettings, loadWorkSchedule } from "@/persistence/workSchedule";

type DataPhase = "loading" | "ready" | "error";
type TaskEditPlace = "resume" | "today" | "open";

type OpenTaskEdit = {
  taskId: string;
  place: TaskEditPlace;
  draft: TaskEditDraft;
};

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

function establishedWindow(timeZone: string, now: Date): { from: string; to: string } {
  const today = formatCivilDate(civilDateInTimeZone(now, timeZone));
  const yesterday = formatCivilDate(addCivilDays(parseCivilDate(today), -1));
  return { from: yesterday, to: today };
}

async function readSource<T>(
  load: () => Promise<readonly T[]>,
  fallback: string,
): Promise<{ rows: T[]; notice: string | null }> {
  try {
    return { rows: [...(await load())], notice: null };
  } catch (error: unknown) {
    return { rows: [], notice: failureMessage(error, fallback) };
  }
}

function sourceRead<T>(rows: readonly T[], notice: string | null): SourceRead<T> {
  return notice === null ? { status: "ready", rows } : { status: "failed", message: notice };
}

export function TaskLoop() {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const [dataPhase, setDataPhase] = useState<DataPhase>("loading");
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [zoneStatus, setZoneStatus] = useState<TodayZoneStatus>("unconfirmed");
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [workEntries, setWorkEntries] = useState<WorkScheduleEntry[]>([]);
  const [workNotice, setWorkNotice] = useState<string | null>(null);
  const [protectedTime, setProtectedTime] = useState<ProtectedTime[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [protectedNotice, setProtectedNotice] = useState<string | null>(null);
  const [blockNotice, setBlockNotice] = useState<string | null>(null);
  const [commitmentNotice, setCommitmentNotice] = useState<string | null>(null);
  const [instant, setInstant] = useState(() => new Date());
  const timeZoneRef = useRef<string | null>(null);
  const loadedCivilDateRef = useRef<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<{ id: string; message: string } | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<{ id: string; message: string } | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<{ id: string; message: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [edit, setEdit] = useState<OpenTaskEdit | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
            setProtectedTime([]);
            setBlocks([]);
            setCommitments([]);
            setProtectedNotice(null);
            setBlockNotice(null);
            setCommitmentNotice(null);
            loadedCivilDateRef.current = null;
          } else {
            setZoneStatus("confirmed");
            setTimeZone(settings.timeZone);
            const now = new Date();
            const window = establishedWindow(settings.timeZone, now);
            loadedCivilDateRef.current = window.to;
            const workRead = await readSource(
              () => loadWorkSchedule(client, window.from, window.to),
              "Could not load today's Work schedule.",
            );
            if (ignore) return;
            setWorkEntries(workRead.rows);
            setWorkNotice(workRead.notice);
            const [protectedRead, blockRead, commitmentRead] = await Promise.all([
              readSource(
                () => loadProtectedTime(client, window),
                "Could not load protected time.",
              ),
              readSource(() => loadBlocks(client, window), "Could not load blocks."),
              readSource(
                () => loadCommitments(client, window),
                "Could not load commitments.",
              ),
            ]);
            if (ignore) return;
            setProtectedTime(protectedRead.rows);
            setProtectedNotice(protectedRead.notice);
            setBlocks(blockRead.rows);
            setBlockNotice(blockRead.notice);
            setCommitments(commitmentRead.rows);
            setCommitmentNotice(commitmentRead.notice);
          }
        } catch {
          if (ignore) return;
          setZoneStatus("unavailable");
          setTimeZone(null);
          setWorkEntries([]);
          setWorkNotice(null);
          setProtectedTime([]);
          setBlocks([]);
          setCommitments([]);
          setProtectedNotice(null);
          setBlockNotice(null);
          setCommitmentNotice(null);
          loadedCivilDateRef.current = null;
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
    timeZoneRef.current = timeZone;
  }, [timeZone]);

  useEffect(() => {
    let timer = 0;

    function noteDay(now: Date) {
      const zone = timeZoneRef.current;
      if (!zone || !loadedCivilDateRef.current) return;
      const day = formatCivilDate(civilDateInTimeZone(now, zone));
      if (loadedCivilDateRef.current === day) return;
      loadedCivilDateRef.current = day;
      setReloadKey((current) => current + 1);
    }

    function arm(from: Date) {
      timer = window.setTimeout(() => {
        const now = new Date();
        setInstant(now);
        noteDay(now);
        arm(now);
      }, millisecondsUntilNextMinute(from));
    }

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      const now = new Date();
      setInstant(now);
      noteDay(now);
      arm(now);
    }

    arm(new Date());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

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

  function beginEdit(taskId: string, place: TaskEditPlace) {
    if (edit) return;
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;
    setEditError(null);
    setEdit({ taskId, place, draft: taskEditDraftFromTask(task) });
  }

  function cancelEdit() {
    if (editSaving) return;
    setEdit(null);
    setEditError(null);
  }

  async function saveEdit() {
    if (!edit || editSaving) return;
    const taskId = edit.taskId;
    let patch;
    try {
      patch = taskPatchFromEditDraft(edit.draft);
    } catch (error: unknown) {
      setEditError(
        `${failureMessage(error, "A task title is required.")} This task is unchanged. The draft is still here.`,
      );
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateTask(getSupabaseBrowserClient(), taskId, patch);
      if (updated.id !== taskId) {
        throw new Error("Could not save these changes.");
      }
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
      setEdit(null);
    } catch (error: unknown) {
      setEditError(
        `${failureMessage(error, "Could not save these changes.")} This task is unchanged. The draft is still here.`,
      );
    } finally {
      setEditSaving(false);
    }
  }

  function taskEditForm(taskId: string, place: TaskEditPlace) {
    if (!edit || edit.taskId !== taskId || edit.place !== place) return null;
    return (
      <TaskEditForm
        draft={edit.draft}
        contexts={orderedContexts(contexts)}
        saving={editSaving}
        saveError={editError}
        onChange={(draft) => setEdit({ taskId, place, draft })}
        onSave={() => void saveEdit()}
        onCancel={cancelEdit}
      />
    );
  }

  const contextNameById = new Map(contexts.map((context) => [context.id, context.name]));
  const contextName = (contextId: string | null) =>
    contextId ? (contextNameById.get(contextId) ?? null) : null;
  const resume = projectResume({ activeThread, openTasks: tasks });
  const civilDate =
    zoneStatus === "confirmed" && timeZone
      ? formatCivilDate(civilDateInTimeZone(instant, timeZone))
      : null;
  const todayTasks = civilDate ? projectTodayTasks({ openTasks: tasks, civilDate }) : [];
  const otherOpenTasks = civilDate
    ? tasks.filter((task) => task.plannedOn !== civilDate)
    : tasks;
  const workOrientation =
    timeZone && !workNotice
      ? projectWorkOrientation({
          instant,
          timeZone,
          todayEntry: entryOn(workEntries, formatCivilDate(civilDateInTimeZone(instant, timeZone))),
          previousEntry: entryOn(
            workEntries,
            formatCivilDate(addCivilDays(civilDateInTimeZone(instant, timeZone), -1)),
          ),
        })
      : null;
  const temporalReading =
    zoneStatus === "confirmed" && timeZone
      ? composeCurrentTemporalReading({
          instant,
          timeZone,
          work: sourceRead(workEntries, workNotice),
          protectedTime: sourceRead(protectedTime, protectedNotice),
          blocks: sourceRead(blocks, blockNotice),
          commitments: sourceRead(commitments, commitmentNotice),
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
          <QuickCapture
            contexts={orderedContexts(contexts)}
            onCreated={(created) => setTasks((current) => [...current, created])}
          />
          <GeneralCapture onTaskCreated={(created) => setTasks((current) => [...current, created])} />

          {resume ? (
            <section
              className="mt-2 rounded-md border border-stone-700 bg-stone-900 p-4"
              aria-labelledby="resume-heading"
            >
              <h2 id="resume-heading" className="text-sm font-medium text-stone-400">
                Resume
              </h2>
              {taskEditForm(resume.task.id, "resume") ?? (
                <p className="mt-2 break-words text-xl font-medium">{resume.task.title}</p>
              )}
              <p className="mt-1 text-sm text-stone-300">This is what you’re doing.</p>
              {edit?.taskId === resume.task.id && edit.place === "resume" ? null : (
                <TaskFacts task={resume.task} contextName={contextName(resume.task.contextId)} />
              )}
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
                  disabled={completingId === resume.task.id || edit?.taskId === resume.task.id}
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
                {edit?.taskId === resume.task.id && edit.place === "resume" ? null : (
                  <button
                    type="button"
                    onClick={() => beginEdit(resume.task.id, "resume")}
                    disabled={edit !== null}
                    aria-label={`Edit ${resume.task.title}`}
                    className={secondaryButtonClass}
                  >
                    Edit
                  </button>
                )}
              </div>
            </section>
          ) : null}

          <CurrentTime
            zoneStatus={zoneStatus}
            facts={temporalReading?.status === "complete" ? temporalReading.facts : null}
            notice={temporalReading?.status === "incomplete" ? temporalReading.message : null}
          />

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
            editingTaskId={edit?.taskId ?? null}
            editFormFor={(taskId) => taskEditForm(taskId, "today")}
            onBeginEdit={(taskId) => beginEdit(taskId, "today")}
          />

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
                const editForm = taskEditForm(task.id, "open");
                const editingThis = edit?.taskId === task.id;
                return (
                  <li key={task.id} className="border-t border-stone-800 py-4">
                    {editForm ?? (
                      <>
                        <p className="min-w-0 break-words text-base">{task.title}</p>
                        <TaskFacts task={task} contextName={contextName(task.contextId)} />
                      </>
                    )}
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
                        disabled={completingId === task.id || editingThis}
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
                      disabled={planningId !== null || editingThis}
                      onPlan={(taskId, plannedOn) => void onSetPlanned(taskId, plannedOn)}
                    />
                    {editForm ? null : (
                      <button
                        type="button"
                        onClick={() => beginEdit(task.id, "open")}
                        disabled={edit !== null}
                        aria-label={`Edit ${task.title}`}
                        className={`mt-3 w-full ${secondaryButtonClass}`}
                      >
                        Edit
                      </button>
                    )}
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
