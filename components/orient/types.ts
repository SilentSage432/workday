import type { CanvasEstablishment, CanvasFactRemoval, CanvasFactUpdate, OpenTaskChoice } from "@/components/canvasEstablishment";
import type { SourceRead } from "@/components/currentTemporalReading";
import type { CaptureSession } from "@/domain/capture";
import type { Block } from "@/domain/block";
import type { CitedTaskIdentity } from "@/domain/citedTask";
import type { Commitment } from "@/domain/commitment";
import type { Destination } from "@/domain/destination";
import type {
  ExternalConnection,
  ExternalTemporalFact,
  ObservedTemporalSource,
} from "@/domain/externalTemporal";
import type { BlockPriorityService, TaskPriorityService } from "@/domain/executionDirection";
import type { Priority } from "@/domain/priority";
import type { ProtectedTime } from "@/domain/protectedTime";
import type { StewardshipCycleKind, StewardshipDefinition, StewardshipDefinitionRevision, StewardshipSatisfaction } from "@/domain/stewardship";
import type { Task } from "@/domain/task";
import type { WeekWrite } from "@/components/weekDraft";
import type { WorkScheduleEntry } from "@/domain/workSchedule";

export type ThreadReading =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "ready"; active: false; taskId: null; resumeTitle: null }
  | { status: "ready"; active: true; taskId: string; resumeTitle: string | null };

export type OrientSources = {
  work: SourceRead<WorkScheduleEntry>;
  protectedTime: SourceRead<ProtectedTime>;
  blocks: SourceRead<Block>;
  commitments: SourceRead<Commitment>;
  destinations: SourceRead<Destination>;
  priorities: SourceRead<Priority>;
  taskPriorityService: SourceRead<TaskPriorityService>;
  blockPriorityService: SourceRead<BlockPriorityService>;
  citedTasks: SourceRead<CitedTaskIdentity>;
  /** Separate external evidence. Failed external read must not erase Orient-owned readiness. */
  externalConnections: SourceRead<ExternalConnection>;
  externalSources: SourceRead<ObservedTemporalSource>;
  externalFacts: SourceRead<ExternalTemporalFact>;
  stewardshipDefinitions: SourceRead<StewardshipDefinition>;
  stewardshipRevisions: SourceRead<StewardshipDefinitionRevision>;
  stewardshipSatisfactions: SourceRead<StewardshipSatisfaction>;
};

/**
 * Ready empty external + stewardship reads for tests and fixtures that do not
 * exercise observation or stewardship content.
 */
export const EMPTY_EXTERNAL_ORIENT_SOURCES = {
  externalConnections: { status: "ready" as const, rows: [] as const },
  externalSources: { status: "ready" as const, rows: [] as const },
  externalFacts: { status: "ready" as const, rows: [] as const },
  stewardshipDefinitions: { status: "ready" as const, rows: [] as const },
  stewardshipRevisions: { status: "ready" as const, rows: [] as const },
  stewardshipSatisfactions: { status: "ready" as const, rows: [] as const },
} satisfies Pick<
  OrientSources,
  | "externalConnections"
  | "externalSources"
  | "externalFacts"
  | "stewardshipDefinitions"
  | "stewardshipRevisions"
  | "stewardshipSatisfactions"
>;

export type CaptureBridge = {
  session: CaptureSession;
  update: (session: CaptureSession) => void;
  saving: boolean;
  saveError: string | null;
  submit: () => Promise<Task | null>;
};

export type OrientActions = {
  onEstablish: (establishment: CanvasEstablishment) => Promise<void>;
  onUpdate: (update: CanvasFactUpdate) => Promise<void>;
  onRemove: (removal: CanvasFactRemoval) => Promise<void>;
  onSignOut: () => void;
  onStartThread: (taskId: string) => Promise<void>;
  onLeaveThread: () => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onReopenTask: (taskId: string) => Promise<void>;
  onUpdateTask: (taskId: string, patch: import("@/domain/task").TaskPatch) => Promise<void>;
  onSatisfyStewardship: (input: {
    definitionId: string;
    cycleKind: StewardshipCycleKind;
    cycleKey: string;
  }) => Promise<void>;
  onWithdrawStewardship: (input: {
    definitionId: string;
    cycleKind: StewardshipCycleKind;
    cycleKey: string;
  }) => Promise<void>;
  onEstablishStewardship: (input: {
    content: string;
    cycleKind: StewardshipCycleKind;
    contextId: string | null;
  }) => Promise<void>;
  onEditStewardshipForward: (input: { definitionId: string; content: string }) => Promise<void>;
  onRetireStewardship: (definitionId: string) => Promise<void>;
  onTasksChanged: () => void;
  onLoadWorkWeek: (from: string, to: string) => Promise<WorkScheduleEntry[]>;
  onSaveWorkWeek: (weekStart: string, writes: WeekWrite[]) => Promise<void>;
  /** Reread external evidence after observation/disconnect without inventing realtime. */
  onExternalObservationComplete?: () => void;
};

export type { OpenTaskChoice };
