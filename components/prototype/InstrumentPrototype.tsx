"use client";

import { useEffect, useState } from "react";
import type { CanvasEstablishment, CanvasFactRemoval, CanvasFactUpdate, OpenTaskChoice } from "@/components/canvasEstablishment";
import type { SourceRead } from "@/components/currentTemporalReading";
import { InstrumentView, type InstrumentSources, type ThreadReading } from "@/components/prototype/InstrumentView";
import { prototypeLoadWindow } from "@/components/prototype/instrumentModel";
import { PrototypeCapture } from "@/components/prototype/PrototypeCapture";
import type { ActiveThread } from "@/domain/activeThread";
import type { Block } from "@/domain/block";
import type { CitedTaskIdentity } from "@/domain/citedTask";
import type { Commitment } from "@/domain/commitment";
import type { Context } from "@/domain/context";
import type { Destination } from "@/domain/destination";
import type { BlockPriorityService, TaskPriorityService } from "@/domain/executionDirection";
import type { Priority } from "@/domain/priority";
import type { ProtectedTime } from "@/domain/protectedTime";
import type { Task } from "@/domain/task";
import { civilDateInTimeZone, formatCivilDate } from "@/domain/time/workFiscalWeek";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { loadActiveThread } from "@/persistence/activeThread";
import { createBlock, deleteBlock, loadBlocks, updateBlock } from "@/persistence/block";
import { loadBlockPriorityService } from "@/persistence/blockPriorityService";
import { loadCitedTaskIdentities } from "@/persistence/citedTaskIdentity";
import { createCommitment, deleteCommitment, loadCommitments, updateCommitment } from "@/persistence/commitment";
import { loadContexts, loadOpenTasks } from "@/persistence/contextsAndTasks";
import { loadDestinations } from "@/persistence/destination";
import { loadPriorities } from "@/persistence/priority";
import { createProtectedTime, deleteProtectedTime, loadProtectedTime, updateProtectedTime } from "@/persistence/protectedTime";
import { loadTaskPriorityService } from "@/persistence/taskPriorityService";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import { loadTemporalSettings, loadWorkSchedule } from "@/persistence/workSchedule";
import { projectResume } from "@/projections/resume";

type LoadedTruth = {
  loaded: { from: string; to: string };
  sources: InstrumentSources;
  contexts: SourceRead<Context>;
  tasks: SourceRead<Task>;
  activeThread: SourceRead<ActiveThread | null>;
};

function failureMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error && caught.message.trim().length > 0 ? caught.message : fallback;
}

async function readRows<T>(read: () => Promise<readonly T[]>): Promise<SourceRead<T>> {
  try {
    return { status: "ready", rows: await read() };
  } catch (caught: unknown) {
    return { status: "failed", message: failureMessage(caught, "Could not read.") };
  }
}

async function readValue<T>(read: () => Promise<T>): Promise<SourceRead<T>> {
  try {
    return { status: "ready", rows: [await read()] };
  } catch (caught: unknown) {
    return { status: "failed", message: failureMessage(caught, "Could not read.") };
  }
}

function threadReading(activeThread: SourceRead<ActiveThread | null>, tasks: SourceRead<Task>): ThreadReading {
  if (activeThread.status === "failed") return { status: "failed", message: activeThread.message };
  const thread = activeThread.rows[0] ?? null;
  if (thread && tasks.status === "failed") return { status: "failed", message: tasks.message };
  if (!thread) return { status: "ready", active: false, resumeTitle: null };
  if (tasks.status !== "ready") return { status: "failed", message: "Active thread could not be read." };
  const resume = projectResume({ activeThread: thread, openTasks: tasks.rows });
  if (resume) return { status: "ready", active: true, resumeTitle: resume.task.title };
  return { status: "ready", active: true, resumeTitle: null };
}

function taskChoices(tasks: SourceRead<Task>): SourceRead<OpenTaskChoice> {
  if (tasks.status === "failed") return tasks;
  return { status: "ready", rows: tasks.rows.map((task) => ({ id: task.id, title: task.title })) };
}

/**
 * Disposable prototype loader.
 * It reads and writes existing truth. Question, focus, and strip job are not stored here.
 */
export function InstrumentPrototype() {
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [clockError, setClockError] = useState<string | null>(null);
  const [truth, setTruth] = useState<LoadedTruth | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const settings = await loadTemporalSettings(getSupabaseBrowserClient());
        if (cancelled) return;
        if (!settings) {
          setClockError("The clock is not confirmed.");
          return;
        }
        const clock = new Date();
        setTimeZone(settings.timeZone);
        setAnchor((current) => current ?? formatCivilDate(civilDateInTimeZone(clock, settings.timeZone)));
        setNow((current) => current ?? clock);
        setClockError(null);
      } catch (caught: unknown) {
        if (!cancelled) setClockError(failureMessage(caught, "The clock could not be read."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!timeZone || !anchor) return;
    let cancelled = false;
    const client = getSupabaseBrowserClient();
    const loaded = prototypeLoadWindow(anchor);
    void (async () => {
      const [work, protectedTime, blocks, commitments, contexts, tasks, activeThread, destinations, priorities, taskPriorityService, blockPriorityService] =
        await Promise.all([
          readRows<WorkScheduleEntry>(() => loadWorkSchedule(client, loaded.from, loaded.to)),
          readRows<ProtectedTime>(() => loadProtectedTime(client, loaded)),
          readRows<Block>(() => loadBlocks(client, loaded)),
          readRows<Commitment>(() => loadCommitments(client, loaded)),
          readRows<Context>(() => loadContexts(client)),
          readRows<Task>(() => loadOpenTasks(client)),
          readValue<ActiveThread | null>(() => loadActiveThread(client)),
          readRows<Destination>(() => loadDestinations(client)),
          readRows<Priority>(() => loadPriorities(client)),
          readRows<TaskPriorityService>(() => loadTaskPriorityService(client)),
          readRows<BlockPriorityService>(() => loadBlockPriorityService(client)),
        ]);
      let citedTasks: SourceRead<CitedTaskIdentity>;
      if (taskPriorityService.status === "failed") {
        citedTasks = { status: "failed", message: taskPriorityService.message };
      } else {
        citedTasks = await readRows(() =>
          loadCitedTaskIdentities(
            client,
            taskPriorityService.rows.map((pair) => pair.taskId),
          ),
        );
      }
      if (cancelled) return;
      setTruth({
        loaded,
        sources: {
          work,
          protectedTime,
          blocks,
          commitments,
          destinations,
          priorities,
          taskPriorityService,
          blockPriorityService,
          citedTasks,
        },
        contexts,
        tasks,
        activeThread,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [timeZone, anchor, reloadToken]);

  async function persist(write: () => Promise<void>) {
    await write();
    setReloadToken((token) => token + 1);
  }

  async function onEstablish(establishment: CanvasEstablishment) {
    const client = getSupabaseBrowserClient();
    await persist(async () => {
      if (establishment.meaning === "protected_time") await createProtectedTime(client, establishment.input);
      else if (establishment.meaning === "block") await createBlock(client, establishment.input);
      else await createCommitment(client, establishment.input);
    });
  }

  async function onUpdate(update: CanvasFactUpdate) {
    const client = getSupabaseBrowserClient();
    await persist(async () => {
      if (update.meaning === "protected_time") await updateProtectedTime(client, update.id, update.input);
      else if (update.meaning === "block") await updateBlock(client, update.id, update.input);
      else await updateCommitment(client, update.id, update.input);
    });
  }

  async function onRemove(removal: CanvasFactRemoval) {
    const client = getSupabaseBrowserClient();
    await persist(async () => {
      if (removal.meaning === "protected_time") await deleteProtectedTime(client, removal.id);
      else if (removal.meaning === "block") await deleteBlock(client, removal.id);
      else await deleteCommitment(client, removal.id);
    });
  }

  if (clockError) {
    return (
      <p data-reading="incomplete" className="p-4 text-stone-100">
        This reading is withheld. {clockError}
      </p>
    );
  }

  if (!timeZone || !anchor || !now || !truth) {
    return <p className="p-4 text-stone-100">Reading this time.</p>;
  }

  const contextOptions = truth.contexts.status === "ready" ? truth.contexts.rows.map((context) => ({ id: context.id, name: context.name })) : [];

  return (
    <InstrumentView
      timeZone={timeZone}
      now={now}
      anchor={anchor}
      onAnchor={setAnchor}
      loaded={truth.loaded}
      sources={truth.sources}
      contexts={truth.contexts}
      openTasks={taskChoices(truth.tasks)}
      thread={threadReading(truth.activeThread, truth.tasks)}
      capture={<PrototypeCapture contexts={contextOptions} />}
      onEstablish={onEstablish}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onSignOut={() => void getSupabaseBrowserClient().auth.signOut()}
    />
  );
}
