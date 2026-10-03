import type { Task } from "@/domain/task";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";

export function TaskFacts({
  task,
  contextName,
  showPlanned = true,
}: {
  task: Task;
  contextName: string | null;
  showPlanned?: boolean;
}) {
  const dated = [
    showPlanned && task.plannedOn
      ? { label: "Planned", value: formatCivilDateLabel(task.plannedOn) }
      : null,
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
