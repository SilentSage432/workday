"use client";

import { useEffect, useState } from "react";
import type { CanvasEstablishment, CanvasFactRemoval, CanvasFactUpdate } from "@/components/canvasEstablishment";
import type { SourceRead } from "@/components/currentTemporalReading";
import { useCapture } from "@/components/AppFrame";
import {
  attachCanonicalVisibilityRecovery,
  createCanonicalReload,
  subscribeCanonicalChangesFromBrowser,
} from "@/components/orient/canonicalCoherence";
import { observeGoogleCalendars } from "@/components/orient/externalCalendarsApi";
import { experienceLoadWindow, orientCivilDate } from "@/components/orient/grammar";
import { OrientView } from "@/components/orient/OrientView";
import type { ExpressiblePulse } from "@/components/orient/PulseExpression";
import type { OrientSources, PulseReading, ThreadReading } from "@/components/orient/types";
import type { ActiveThread } from "@/domain/activeThread";
import type { Block } from "@/domain/block";
import type { CitedTaskIdentity } from "@/domain/citedTask";
import type { Commitment } from "@/domain/commitment";
import type { Context } from "@/domain/context";
import type { Destination } from "@/domain/destination";
import type {
  ExternalConnection,
  ExternalTemporalFact,
  ObservedTemporalSource,
} from "@/domain/externalTemporal";
import type { BlockPriorityService, TaskPriorityService } from "@/domain/executionDirection";
import type { InterruptGrant, PulseOccurrence } from "@/domain/pulse";
import {
  isActiveInterruptGrant,
  PULSE_RELATIONSHIP_RELATIVE_BEFORE,
  pulseOccurrenceStillBeforeStart,
} from "@/domain/pulse";
import type { Priority } from "@/domain/priority";
import type { ProtectedTime } from "@/domain/protectedTime";
import type {
  RecurringTaskDefinition,
  RecurringTaskDefinitionPatch,
  RecurringTaskWeekday,
} from "@/domain/recurringTask";
import type {
  StewardshipCycleKind,
  StewardshipDefinition,
  StewardshipDefinitionRevision,
  StewardshipSatisfaction,
} from "@/domain/stewardship";
import type { Task, TaskPatch } from "@/domain/task";
import type { WorkScheduleEntry } from "@/domain/workSchedule";
import { clearActiveThread, establishActiveThread, loadActiveThread } from "@/persistence/activeThread";
import { createBlock, deleteBlock, loadBlocks, updateBlock } from "@/persistence/block";
import { loadBlockPriorityService } from "@/persistence/blockPriorityService";
import { loadCitedTaskIdentities } from "@/persistence/citedTaskIdentity";
import { createCommitment, deleteCommitment, loadCommitments, updateCommitment } from "@/persistence/commitment";
import { completeTask, loadContexts, loadOpenTasks, reopenTask, updateTask } from "@/persistence/contextsAndTasks";
import { loadDestinations } from "@/persistence/destination";
import {
  loadExternalConnections,
  loadExternalTemporalFacts,
  loadObservedTemporalSources,
} from "@/persistence/externalTemporal";
import { loadPriorities } from "@/persistence/priority";
import { createProtectedTime, deleteProtectedTime, loadProtectedTime, updateProtectedTime } from "@/persistence/protectedTime";
import {
  establishBlockStartInterruptGrant,
  establishCommitmentStartInterruptGrant,
  establishEligiblePulseOccurrences,
  loadActiveInterruptGrants,
  loadPulseOccurrences,
  revokeInterruptGrant,
} from "@/persistence/pulse";
import {
  ensureEligibleRecurringTaskOccurrences,
  ensureRecurringTaskOccurrenceForDefinition,
  establishRecurringTaskDefinition,
  loadRecurringTaskDefinitions,
  retireRecurringTaskDefinition,
  updateRecurringTaskDefinition,
} from "@/persistence/recurringTask";
import {
  editStewardshipDefinitionForward,
  establishStewardshipDefinition,
  loadStewardshipDefinitionRevisions,
  loadStewardshipDefinitions,
  loadStewardshipSatisfactions,
  retireStewardshipDefinition,
  satisfyStewardshipOccurrence,
  withdrawStewardshipSatisfaction,
} from "@/persistence/stewardship";
import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import { loadTaskPriorityService } from "@/persistence/taskPriorityService";
import { loadTemporalSettings, loadWorkSchedule } from "@/persistence/workSchedule";
import { saveWorkWeek } from "@/persistence/saveWorkWeek";
import { projectResume } from "@/projections/resume";

type LoadedTruth = {
  loaded: { from: string; to: string };
  sources: OrientSources;
  contexts: SourceRead<Context>;
  tasks: SourceRead<Task>;
  activeThread: SourceRead<ActiveThread | null>;
  pulseGrants: SourceRead<InterruptGrant>;
  pulseOccurrences: SourceRead<PulseOccurrence>;
};

function expressiblePulses(input: {
  occurrences: readonly PulseOccurrence[];
  grants: readonly InterruptGrant[];
  commitments: readonly Commitment[];
  blocks: readonly Block[];
  now: Date;
  timeZone: string;
}): ExpressiblePulse[] {
  const activeGrantIds = new Set(
    input.grants
      .filter(
        (grant) =>
          isActiveInterruptGrant(grant) &&
          grant.relationship === PULSE_RELATIONSHIP_RELATIVE_BEFORE,
      )
      .map((grant) => grant.id),
  );
  const items: ExpressiblePulse[] = [];
  for (const occurrence of input.occurrences) {
    if (occurrence.relationship !== PULSE_RELATIONSHIP_RELATIVE_BEFORE) continue;
    if (occurrence.grantId === null || !activeGrantIds.has(occurrence.grantId)) continue;
    if (!pulseOccurrenceStillBeforeStart({ occurrence, now: input.now, timeZone: input.timeZone })) {
      continue;
    }
    if (occurrence.sourceKind === "block") {
      const block =
        occurrence.sourceId === null
          ? null
          : (input.blocks.find((row) => row.id === occurrence.sourceId) ?? null);
      items.push({
        occurrence,
        title: block?.purpose ?? "Block",
      });
      continue;
    }
    const commitment =
      occurrence.sourceId === null
        ? null
        : (input.commitments.find((row) => row.id === occurrence.sourceId) ?? null);
    items.push({
      occurrence,
      title: commitment?.title ?? "Commitment",
    });
  }
  return items;
}

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
  if (!thread) return { status: "ready", active: false, taskId: null, resumeTitle: null };
  if (tasks.status !== "ready") return { status: "failed", message: "The thread could not be read." };
  const resume = projectResume({ activeThread: thread, openTasks: tasks.rows });
  if (resume) return { status: "ready", active: true, taskId: resume.task.id, resumeTitle: resume.task.title };
  return { status: "ready", active: true, taskId: thread.taskId, resumeTitle: null };
}

export function OrientInstrument() {
  const capture = useCapture();
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
        setAnchor((current) => current ?? orientCivilDate(clock, settings.timeZone));
        setNow(clock);
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
    if (!timeZone) return;
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [timeZone]);

  useEffect(() => {
    const reload = createCanonicalReload({
      reload: () => setReloadToken((token) => token + 1),
    });
    let closed = false;
    let unsubscribe: (() => void) | null = null;
    const requestThrottledObservation = () => {
      void observeGoogleCalendars({ force: false })
        .then((result) => {
          if (closed) return;
          if (result.successfulSourceCount > 0 || result.failedSourceCount > 0 || result.partialSourceCount > 0) {
            reload.request();
          }
        })
        .catch(() => {
          // Observation is best-effort on visibility; landscape reread stays independent.
        });
    };
    const detachVisibility = attachCanonicalVisibilityRecovery(document, () => {
      requestThrottledObservation();
      reload.request();
    });
    const client = getSupabaseBrowserClient();
    void (async () => {
      try {
        const { data, error } = await client.auth.getUser();
        if (closed || error || !data.user) return;
        unsubscribe = subscribeCanonicalChangesFromBrowser(client, data.user.id, () => {
          if (!closed) reload.request();
        });
        if (closed) unsubscribe();
        // Initial load may observe when selected sources exist and are stale (server throttle).
        requestThrottledObservation();
      } catch {
        return;
      }
    })();
    return () => {
      closed = true;
      detachVisibility();
      reload.close();
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!timeZone || !anchor) return;
    let cancelled = false;
    const client = getSupabaseBrowserClient();
    const loaded = experienceLoadWindow(anchor);
    void (async () => {
      // Actual civil now — never the navigated Orient viewpoint — drives recurrence.
      const civilNowInstant = new Date();
      const recurringTaskDefinitions = await readRows<RecurringTaskDefinition>(() =>
        loadRecurringTaskDefinitions(client),
      );
      if (recurringTaskDefinitions.status === "ready") {
        await ensureEligibleRecurringTaskOccurrences(client, {
          definitions: recurringTaskDefinitions.rows,
          instant: civilNowInstant,
          timeZone,
        });
      }

      const [
        work,
        protectedTime,
        blocks,
        commitments,
        contexts,
        tasks,
        activeThread,
        destinations,
        priorities,
        taskPriorityService,
        blockPriorityService,
        externalConnections,
        externalSources,
        externalFacts,
        stewardshipDefinitions,
        stewardshipRevisions,
        stewardshipSatisfactions,
        pulseGrants,
        pulseOccurrences,
      ] = await Promise.all([
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
        readRows<ExternalConnection>(() => loadExternalConnections(client)),
        readRows<ObservedTemporalSource>(() => loadObservedTemporalSources(client)),
        readRows<ExternalTemporalFact>(() => loadExternalTemporalFacts(client)),
        readRows<StewardshipDefinition>(() => loadStewardshipDefinitions(client)),
        readRows<StewardshipDefinitionRevision>(() => loadStewardshipDefinitionRevisions(client)),
        readRows<StewardshipSatisfaction>(() => loadStewardshipSatisfactions(client)),
        readRows<InterruptGrant>(() => loadActiveInterruptGrants(client)),
        readRows<PulseOccurrence>(() => loadPulseOccurrences(client)),
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
          externalConnections,
          externalSources,
          externalFacts,
          stewardshipDefinitions,
          stewardshipRevisions,
          stewardshipSatisfactions,
          recurringTaskDefinitions,
        },
        contexts,
        tasks,
        activeThread,
        pulseGrants,
        pulseOccurrences,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [timeZone, anchor, reloadToken]);

  useEffect(() => {
    if (!timeZone || !now || !truth) return;
    if (truth.pulseGrants.status !== "ready") return;
    if (truth.pulseOccurrences.status !== "ready") return;
    if (truth.sources.commitments.status !== "ready") return;
    if (truth.sources.blocks.status !== "ready") return;
    let cancelled = false;
    const client = getSupabaseBrowserClient();
    const grants = truth.pulseGrants.rows;
    const commitments = truth.sources.commitments.rows;
    const blocks = truth.sources.blocks.rows;
    const occurrences = truth.pulseOccurrences.rows;
    void (async () => {
      try {
        const minted = await establishEligiblePulseOccurrences(client, {
          grants,
          commitments,
          blocks,
          occurrences,
          timeZone,
          now,
        });
        if (cancelled || minted.length === 0) return;
        setTruth((current) => {
          if (!current || current.pulseOccurrences.status !== "ready") return current;
          const known = new Set(current.pulseOccurrences.rows.map((row) => row.id));
          const added = minted.filter((row) => !known.has(row.id));
          if (added.length === 0) return current;
          return {
            ...current,
            pulseOccurrences: {
              status: "ready",
              rows: [...current.pulseOccurrences.rows, ...added],
            },
          };
        });
      } catch {
        // Establishment failure must not erase loaded orientation truth.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [timeZone, now, truth]);

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
      <p data-reading="incomplete" className="p-4">
        This reading is withheld. {clockError}
      </p>
    );
  }

  if (!timeZone || !anchor || !now || !truth) {
    return <p className="p-4">Reading this time.</p>;
  }

  const pulse: PulseReading = {
    grants: truth.pulseGrants,
    occurrences: truth.pulseOccurrences,
    expressible:
      truth.pulseGrants.status === "ready" &&
      truth.pulseOccurrences.status === "ready" &&
      truth.sources.commitments.status === "ready" &&
      truth.sources.blocks.status === "ready"
        ? expressiblePulses({
            occurrences: truth.pulseOccurrences.rows,
            grants: truth.pulseGrants.rows,
            commitments: truth.sources.commitments.rows,
            blocks: truth.sources.blocks.rows,
            now,
            timeZone,
          })
        : [],
  };

  return (
    <OrientView
      timeZone={timeZone}
      now={now}
      anchor={anchor}
      onAnchor={setAnchor}
      loaded={truth.loaded}
      sources={truth.sources}
      contexts={truth.contexts}
      tasks={truth.tasks}
      thread={threadReading(truth.activeThread, truth.tasks)}
      pulse={pulse}
      capture={capture}
      actions={{
        onEstablish,
        onUpdate,
        onRemove,
        onSignOut: () => void getSupabaseBrowserClient().auth.signOut(),
        onStartThread: async (taskId) => {
          await persist(async () => {
            await establishActiveThread(getSupabaseBrowserClient(), taskId, new Date());
          });
        },
        onLeaveThread: async () => {
          await persist(async () => {
            await clearActiveThread(getSupabaseBrowserClient());
          });
        },
        onCompleteTask: async (taskId) => {
          await persist(async () => {
            await completeTask(getSupabaseBrowserClient(), taskId, new Date());
          });
        },
        onReopenTask: async (taskId) => {
          await persist(async () => {
            await reopenTask(getSupabaseBrowserClient(), taskId);
          });
        },
        onUpdateTask: async (taskId, patch: TaskPatch) => {
          await persist(async () => {
            await updateTask(getSupabaseBrowserClient(), taskId, patch);
          });
        },
        onSatisfyStewardship: async (input: {
          definitionId: string;
          cycleKind: StewardshipCycleKind;
          cycleKey: string;
        }) => {
          await persist(async () => {
            await satisfyStewardshipOccurrence(getSupabaseBrowserClient(), {
              ...input,
              satisfiedAt: new Date(),
            });
          });
        },
        onWithdrawStewardship: async (input: {
          definitionId: string;
          cycleKind: StewardshipCycleKind;
          cycleKey: string;
        }) => {
          await persist(async () => {
            await withdrawStewardshipSatisfaction(getSupabaseBrowserClient(), input);
          });
        },
        onEstablishStewardship: async (input: {
          content: string;
          cycleKind: StewardshipCycleKind;
          contextId: string | null;
        }) => {
          await persist(async () => {
            const establishedAt = new Date();
            await establishStewardshipDefinition(getSupabaseBrowserClient(), {
              id: crypto.randomUUID(),
              revisionId: crypto.randomUUID(),
              content: input.content,
              cycleKind: input.cycleKind,
              contextId: input.contextId,
              establishedAt,
            });
          });
        },
        onEditStewardshipForward: async (input: { definitionId: string; content: string }) => {
          await persist(async () => {
            await editStewardshipDefinitionForward(getSupabaseBrowserClient(), {
              definitionId: input.definitionId,
              revisionId: crypto.randomUUID(),
              content: input.content,
              effectiveAt: new Date(),
            });
          });
        },
        onRetireStewardship: async (definitionId: string) => {
          await persist(async () => {
            await retireStewardshipDefinition(getSupabaseBrowserClient(), {
              definitionId,
              retiredAt: new Date(),
            });
          });
        },
        onEstablishRecurringTask: async (input: {
          title: string;
          availableWeekday: RecurringTaskWeekday;
          dueWeekday: RecurringTaskWeekday;
          contextId: string | null;
        }) => {
          await persist(async () => {
            const client = getSupabaseBrowserClient();
            const establishedAt = new Date();
            const definition = await establishRecurringTaskDefinition(client, {
              id: crypto.randomUUID(),
              title: input.title,
              availableWeekday: input.availableWeekday,
              dueWeekday: input.dueWeekday,
              contextId: input.contextId,
              establishedAt,
            });
            if (!timeZone) return;
            await ensureRecurringTaskOccurrenceForDefinition(client, definition, {
              instant: establishedAt,
              timeZone,
            });
          });
        },
        onUpdateRecurringTask: async (definitionId: string, patch: RecurringTaskDefinitionPatch) => {
          await persist(async () => {
            await updateRecurringTaskDefinition(getSupabaseBrowserClient(), definitionId, patch);
          });
        },
        onRetireRecurringTask: async (definitionId: string) => {
          await persist(async () => {
            await retireRecurringTaskDefinition(getSupabaseBrowserClient(), {
              definitionId,
              retiredAt: new Date(),
            });
          });
        },
        onTasksChanged: () => setReloadToken((token) => token + 1),
        onLoadWorkWeek: (from, to) => loadWorkSchedule(getSupabaseBrowserClient(), from, to),
        onSaveWorkWeek: async (weekStart, writes) => {
          await persist(async () => {
            await saveWorkWeek(getSupabaseBrowserClient(), weekStart, writes);
          });
        },
        onExternalObservationComplete: () => setReloadToken((token) => token + 1),
        onEstablishCommitmentPulseGrant: async (commitmentId, leadOffsetSeconds) => {
          await persist(async () => {
            const commitment =
              truth.sources.commitments.status === "ready"
                ? (truth.sources.commitments.rows.find((row) => row.id === commitmentId) ?? null)
                : null;
            if (!commitment) {
              throw new Error("That Commitment could not be read.");
            }
            await establishCommitmentStartInterruptGrant(getSupabaseBrowserClient(), {
              commitment,
              leadOffsetSeconds,
              establishedAt: new Date(),
            });
          });
        },
        onRevokeCommitmentPulseGrant: async (grantId) => {
          await persist(async () => {
            await revokeInterruptGrant(getSupabaseBrowserClient(), grantId, new Date());
          });
        },
        onEstablishBlockPulseGrant: async (blockId, leadOffsetSeconds) => {
          await persist(async () => {
            const block =
              truth.sources.blocks.status === "ready"
                ? (truth.sources.blocks.rows.find((row) => row.id === blockId) ?? null)
                : null;
            if (!block) {
              throw new Error("That Block could not be read.");
            }
            await establishBlockStartInterruptGrant(getSupabaseBrowserClient(), {
              block,
              leadOffsetSeconds,
              establishedAt: new Date(),
            });
          });
        },
        onRevokeBlockPulseGrant: async (grantId) => {
          await persist(async () => {
            await revokeInterruptGrant(getSupabaseBrowserClient(), grantId, new Date());
          });
        },
      }}
    />
  );
}
