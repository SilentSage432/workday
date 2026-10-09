"use client";

import { formatLocalTimeLabel } from "@/domain/time/localTime";
import type { PulseOccurrence } from "@/domain/pulse";

export type ExpressiblePulse = {
  occurrence: PulseOccurrence;
  title: string;
};

export function PulseExpression({
  items,
  dismissedIds,
  onDismiss,
}: {
  items: readonly ExpressiblePulse[];
  dismissedIds: ReadonlySet<string>;
  onDismiss: (occurrenceId: string) => void;
}) {
  const visible = items.filter((item) => !dismissedIds.has(item.occurrence.id));
  if (visible.length === 0) return null;

  return (
    <div data-pulse-expression="true" className="orient-pulse-expression" role="status">
      {visible.map((item) => (
        <div
          key={item.occurrence.id}
          data-pulse-occurrence={item.occurrence.id}
          className="orient-pulse-expression-item"
        >
          <p>
            <span className="orient-pulse-expression-mark">Pulse</span>
            {item.title}
            <span className="orient-note">
              {" "}
              · starts {formatLocalTimeLabel(item.occurrence.sourceStartLocal)}
            </span>
          </p>
          <button
            type="button"
            className="orient-action"
            data-pulse-dismiss="true"
            aria-label="Dismiss pulse expression"
            onClick={() => onDismiss(item.occurrence.id)}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
