import { ChevronLeft, ChevronRight } from "lucide-react";
import { Icon } from "@/components/Icon";
import { formatLocalTimeLabel } from "@/domain/time/localTime";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import type { DayCanvasModel, DayCanvasTimedPlacement } from "@/projections/dayCanvas";

/**
 * Display floor for a timed fact. It is not the fact's duration.
 * True duration stays on `data-minutes`.
 */
export const DAY_CANVAS_MIN_VISUAL_HEIGHT = "1.75rem";

const AXIS_HEIGHT = "78rem";
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const PROTECTED_HATCH =
  "repeating-linear-gradient(135deg, transparent, transparent 4px, rgb(168 162 158 / 0.35) 4px, rgb(168 162 158 / 0.35) 5px)";

export function DayCanvas({
  selectedDay,
  today,
  phase,
  error,
  model,
  onPreviousDay,
  onNextDay,
  onToday,
}: {
  selectedDay: string;
  today: string | null;
  phase: "loading" | "ready" | "error";
  error: string | null;
  model: DayCanvasModel | null;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}) {
  return (
    <section className="mt-4" aria-labelledby="day-canvas-heading">
      <h2 id="day-canvas-heading" className="sr-only">
        Day
      </h2>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous day"
          onClick={onPreviousDay}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-stone-700 text-stone-200"
        >
          <Icon icon={ChevronLeft} />
        </button>
        <time dateTime={selectedDay} className="text-center text-base font-medium">
          {formatCivilDateLabel(selectedDay)}
        </time>
        <button
          type="button"
          aria-label="Next day"
          onClick={onNextDay}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-stone-700 text-stone-200"
        >
          <Icon icon={ChevronRight} />
        </button>
      </div>
      {today && selectedDay !== today ? (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={onToday}
            className="min-h-11 px-3 text-sm text-stone-300"
          >
            Today
          </button>
        </div>
      ) : null}

      {phase === "loading" ? <p className="mt-4 text-sm text-stone-300">Loading this day.</p> : null}
      {phase === "error" && error ? (
        <p role="alert" className="mt-4 text-sm text-stone-200">
          {error}
        </p>
      ) : null}

      {phase === "ready" && model && model.selectedDay === selectedDay ? <DayCanvasBody model={model} /> : null}
    </section>
  );
}

function DayCanvasBody({ model }: { model: DayCanvasModel }) {
  return (
    <div className="mt-4 max-w-full">
      {model.clockLabelNote ? <p className="text-sm leading-6 text-stone-400">{model.clockLabelNote}</p> : null}
      {model.allDay.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-label="All day">
          {model.allDay.map((fact) => (
            <li
              key={`${fact.sourceKind}:${fact.sourceId}`}
              data-region="all-day"
              data-source-kind={fact.sourceKind}
              className={listedClass(fact.sourceKind)}
              aria-label={fact.accessibleLabel}
            >
              <FactText kind={fact.kindLabel} primary={fact.primary} detail={fact.detail} />
            </li>
          ))}
        </ul>
      ) : null}
      {model.unresolved.length > 0 ? (
        <section className="mt-3" aria-label="Unresolved time">
          <h3 className="text-sm text-stone-400">Unresolved time</h3>
          <p className="mt-1 text-sm text-stone-400">Time could not be positioned for this date.</p>
          <ul className="mt-2 space-y-2">
            {model.unresolved.map((fact) => (
              <li
                key={`${fact.sourceKind}:${fact.sourceId}`}
                data-region="unresolved"
                data-source-kind={fact.sourceKind}
                className="rounded-md border border-stone-700 px-2 py-2 text-stone-300"
                aria-label={fact.accessibleLabel}
              >
                <FactText kind={fact.kindLabel} primary={fact.primary} detail={fact.detail} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {model.axis === "local-clock" ? <TimedAxis model={model} /> : null}
    </div>
  );
}

function TimedAxis({ model }: { model: DayCanvasModel }) {
  return (
    <div className="mt-4 max-h-[28rem] max-w-full overflow-y-auto" data-axis-scroll="midnight">
      <div className="flex max-w-full pt-3" data-axis="local-clock">
        <div className="relative w-14 shrink-0" style={{ height: AXIS_HEIGHT }}>
          {HOURS.map((hour) => (
            <span
              key={hour}
              data-hour={hour}
              className="absolute right-2 w-12 -translate-y-1/2 text-right text-xs text-stone-500"
              style={{ top: `${(hour / 24) * 100}%` }}
            >
              {formatLocalTimeLabel(`${String(hour).padStart(2, "0")}:00`)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 border-l border-stone-800" style={{ height: AXIS_HEIGHT }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              data-hour-line={hour}
              className="absolute inset-x-0 border-t border-stone-800/80"
              style={{ top: `${(hour / 24) * 100}%` }}
            />
          ))}
          {model.context.map((item) => (
            <TimedFact key={`${item.sourceKind}:${item.sourceId}`} item={item} />
          ))}
          {model.foreground.map((item) => (
            <TimedFact key={`${item.sourceKind}:${item.sourceId}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimedFact({ item }: { item: DayCanvasTimedPlacement }) {
  const minutes = item.visibleEndMinute - item.visibleStartMinute;
  return (
    <article
      data-source-kind={item.sourceKind}
      data-layer={item.layer}
      data-lane={item.lane}
      data-lane-count={item.laneCount}
      data-minutes={minutes}
      data-start-minute={item.visibleStartMinute}
      data-end-minute={item.visibleEndMinute}
      data-clipped={item.clipped ? "true" : "false"}
      aria-label={item.accessibleLabel}
      className={`absolute overflow-hidden px-1 py-0.5 ${placementClass(item)}`}
      style={placementStyle(item)}
    >
      <FactText
        kind={item.kindLabel}
        primary={item.primary}
        detail={item.shownInterval ?? item.sourceInterval}
        quiet={item.contextName}
      />
    </article>
  );
}

function FactText({
  kind,
  primary,
  detail,
  quiet,
}: {
  kind: string;
  primary: string;
  detail: string;
  quiet?: string | null;
}) {
  return (
    <>
      <p className="truncate text-[11px] leading-4">
        <span className="text-stone-400">{kind}</span>
        <span className="text-stone-500"> · </span>
        {primary}
      </p>
      <p className="truncate text-[11px] leading-4 text-stone-400">{detail}</p>
      {quiet ? <p className="truncate text-[11px] leading-4 text-stone-500">{quiet}</p> : null}
    </>
  );
}

function listedClass(sourceKind: DayCanvasTimedPlacement["sourceKind"]): string {
  if (sourceKind === "work_schedule") return "rounded-md border-l-2 border-stone-500 bg-stone-800/40 px-2 py-2 text-stone-300";
  if (sourceKind === "protected_time") {
    return "rounded-md border border-dashed border-stone-500 px-2 py-2 text-stone-300";
  }
  if (sourceKind === "block") return "rounded-md border border-stone-300 bg-stone-900 px-2 py-2 text-stone-100";
  return "rounded-md border border-stone-400 px-2 py-2 text-stone-100";
}

function placementClass(item: DayCanvasTimedPlacement): string {
  if (item.sourceKind === "work_schedule") return "z-0 border-l-2 border-stone-500 bg-stone-800/35 text-stone-400";
  if (item.sourceKind === "protected_time") return "z-[1] border border-dashed border-stone-500 text-stone-300";
  if (item.sourceKind === "block") return "z-10 border border-stone-300 bg-stone-900/95 text-stone-100";
  return "z-10 border border-stone-400 bg-stone-950/95 text-stone-100";
}

function placementStyle(item: DayCanvasTimedPlacement): {
  top: string;
  height: string;
  minHeight: string;
  left?: string;
  width?: string;
  backgroundImage?: string;
} {
  const frame = {
    top: `${item.top * 100}%`,
    height: `${item.height * 100}%`,
    minHeight: DAY_CANVAS_MIN_VISUAL_HEIGHT,
  };
  if (item.layer === "context") {
    return item.sourceKind === "protected_time" ? { ...frame, backgroundImage: PROTECTED_HATCH } : frame;
  }
  return {
    ...frame,
    left: `calc(0.375rem + ${item.lane} * (100% - 0.75rem) / ${item.laneCount})`,
    width: `calc((100% - 0.75rem) / ${item.laneCount} - 0.125rem)`,
  };
}
