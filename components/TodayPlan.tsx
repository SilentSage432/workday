import Link from "next/link";
import { TaskFacts } from "@/components/TaskFacts";
import type { Task } from "@/domain/task";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import { todayPlanAction } from "@/projections/today";

const secondaryButtonClass =
  "min-h-12 rounded-md border border-stone-600 bg-stone-900 px-4 text-center text-base text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-300 disabled:opacity-60";

export type TodayZoneStatus = "confirmed" | "unconfirmed" | "unavailable";

export function TodayPlan({
  zoneStatus,
  civilDate,
  tasks,
  contextName,
  activeTaskId,
  planningId,
  planError,
  completingId,
  completeError,
  startingId,
  startError,
  onPlan,
  onStart,
  onComplete,
}: {
  zoneStatus: TodayZoneStatus;
  civilDate: string | null;
  tasks: readonly Task[];
  contextName: (contextId: string | null) => string | null;
  activeTaskId: string | null;
  planningId: string | null;
  planError: { id: string; message: string } | null;
  completingId: string | null;
  completeError: { id: string; message: string } | null;
  startingId: string | null;
  startError: { id: string; message: string } | null;
  onPlan: (taskId: string, plannedOn: string | null) => void;
  onStart: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}) {
  return (
    <section className="mt-8" aria-labelledby="today-heading">
      <h2 id="today-heading" className="text-sm font-medium text-stone-400">
        Today
      </h2>
      {zoneStatus === "confirmed" && civilDate ? (
        <ConfirmedToday
          civilDate={civilDate}
          tasks={tasks}
          contextName={contextName}
          activeTaskId={activeTaskId}
          planningId={planningId}
          planError={planError}
          completingId={completingId}
          completeError={completeError}
          startingId={startingId}
          startError={startError}
          onPlan={onPlan}
          onStart={onStart}
          onComplete={onComplete}
        />
      ) : null}
      {zoneStatus === "unconfirmed" ? (
        <div className="mt-2">
          <p className="text-sm text-stone-300">Today needs a confirmed time zone.</p>
          <Link href="/schedule" className={`mt-3 inline-flex items-center ${secondaryButtonClass}`}>
            Confirm time zone
          </Link>
        </div>
      ) : null}
      {zoneStatus === "unavailable" ? (
        <p className="mt-2 text-sm text-stone-300" role="status">
          The confirmed time zone could not be loaded.
        </p>
      ) : null}
    </section>
  );
}

function ConfirmedToday({
  civilDate,
  tasks,
  contextName,
  activeTaskId,
  planningId,
  planError,
  completingId,
  completeError,
  startingId,
  startError,
  onPlan,
  onStart,
  onComplete,
}: {
  civilDate: string;
  tasks: readonly Task[];
  contextName: (contextId: string | null) => string | null;
  activeTaskId: string | null;
  planningId: string | null;
  planError: { id: string; message: string } | null;
  completingId: string | null;
  completeError: { id: string; message: string } | null;
  startingId: string | null;
  startError: { id: string; message: string } | null;
  onPlan: (taskId: string, plannedOn: string | null) => void;
  onStart: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}) {
  return (
    <>
      <p className="mt-1 text-sm text-stone-400">{formatCivilDateLabel(civilDate)}</p>
      {tasks.length === 0 ? (
        <p className="mt-2 text-sm text-stone-300">Nothing is planned for today.</p>
      ) : null}
      <ul className="mt-2">
        {tasks.map((task) => {
          const current = task.id === activeTaskId;
          const planning = planningId === task.id;
          return (
            <li key={task.id} className="border-t border-stone-800 py-4">
              <p className="min-w-0 break-words text-base">{task.title}</p>
              <TaskFacts
                task={task}
                contextName={contextName(task.contextId)}
                showPlanned={false}
              />
              {current ? <p className="mt-2 text-sm text-stone-300">Current thread</p> : null}
              {current ? null : (
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => onStart(task.id)}
                    disabled={startingId !== null}
                    className={`flex-1 ${secondaryButtonClass}`}
                  >
                    {startingId === task.id ? "Saving" : "Start"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onComplete(task.id)}
                    disabled={completingId === task.id}
                    className={`flex-1 ${secondaryButtonClass}`}
                  >
                    {completingId === task.id ? "Saving" : "Complete"}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => onPlan(task.id, null)}
                disabled={planningId !== null}
                aria-label={`Remove ${task.title} from Today`}
                className={`mt-3 w-full ${secondaryButtonClass}`}
              >
                {planning ? "Saving" : "Remove from Today"}
              </button>
              {!current && startError?.id === task.id ? (
                <p role="alert" className="mt-2 text-sm">
                  {startError.message}
                </p>
              ) : null}
              {!current && completeError?.id === task.id ? (
                <p role="alert" className="mt-2 text-sm">
                  {completeError.message}
                </p>
              ) : null}
              {planError?.id === task.id ? (
                <p role="alert" className="mt-2 text-sm">
                  {planError.message}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function OpenTaskPlanButton({
  task,
  civilDate,
  pending,
  disabled,
  onPlan,
}: {
  task: Task;
  civilDate: string | null;
  pending: boolean;
  disabled: boolean;
  onPlan: (taskId: string, plannedOn: string) => void;
}) {
  if (civilDate === null) {
    return null;
  }
  const action = todayPlanAction(task.plannedOn, civilDate);
  if (action === "remove") {
    return null;
  }
  const label = action === "move" ? "Move to Today" : "Plan for Today";
  const accessible =
    action === "move" ? `Move ${task.title} to Today` : `Plan ${task.title} for Today`;

  return (
    <button
      type="button"
      onClick={() => onPlan(task.id, civilDate)}
      disabled={disabled}
      aria-label={accessible}
      className={`mt-3 w-full ${secondaryButtonClass}`}
    >
      {pending ? "Saving" : label}
    </button>
  );
}
