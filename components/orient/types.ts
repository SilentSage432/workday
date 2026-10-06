import type { CanvasEstablishment, CanvasFactRemoval, CanvasFactUpdate, OpenTaskChoice } from "@/components/canvasEstablishment";
import type { SourceRead } from "@/components/currentTemporalReading";
import type { CaptureSession } from "@/domain/capture";
import type { Block } from "@/domain/block";
import type { CitedTaskIdentity } from "@/domain/citedTask";
import type { Commitment } from "@/domain/commitment";
import type { Destination } from "@/domain/destination";
import type { BlockPriorityService, TaskPriorityService } from "@/domain/executionDirection";
import type { Priority } from "@/domain/priority";
import type { ProtectedTime } from "@/domain/protectedTime";
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
};

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
  onUpdateTask: (taskId: string, patch: import("@/domain/task").TaskPatch) => Promise<void>;
  onTasksChanged: () => void;
  onLoadWorkWeek: (from: string, to: string) => Promise<WorkScheduleEntry[]>;
  onSaveWorkWeek: (weekStart: string, writes: WeekWrite[]) => Promise<void>;
};

export type { OpenTaskChoice };
