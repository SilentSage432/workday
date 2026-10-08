"use client";

import type { FactAddress } from "@/components/factAddress";
import { composeCurrentTemporalReading } from "@/components/currentTemporalReading";
import {
  accessibleFactName,
  kindContour,
  markEmphasis,
  minuteFraction,
  threadLine,
  threadRestingWeight,
  type ContextFocus,
  type OrientQuestion,
} from "@/components/orient/grammar";
import { membershipCopy, minuteFromSignatureRatio, overlappingFacts, signaturePlacement } from "@/components/orient/phoneSignature";
import type { OrientSources, ThreadReading } from "@/components/orient/types";
import { formatLocalTimeLabel, zonedLocalClock } from "@/domain/time/localTime";
import { formatCivilDateLabel } from "@/domain/time/workFiscalWeek";
import type { DayCanvasModel, DayCanvasTimedPlacement } from "@/projections/dayCanvas";
import type { TimelineSourceKind } from "@/projections/timeline";

/**
 * Phone reading of one civil day. The vertical clock is not mounted here.
 * Exact time is a deliberate closer look at the same day.
 */

export function PhoneContinuity({
  question,
  timeZone,
  now,
  anchor,
  model,
  sources,
  thread,
  focus,
  contextFor,
  off,
  withheld,
  onRefer,
  onThread,
  onExact,
}: {
  question: Extract<OrientQuestion, "present" | "day">;
  timeZone: string;
  now: Date;
  anchor: string;
  model: DayCanvasModel | null;
  sources: OrientSources;
  thread: ThreadReading;
  focus: ContextFocus;
  contextFor: (kind: TimelineSourceKind, id: string) => string | null;
  off: boolean;
  withheld: string | null;
  onRefer: (facts: FactAddress[]) => void;
  onThread: (event: { currentTarget: HTMLElement }) => void;
  onExact: (minute: number | null) => void;
}) {
  const clock = zonedLocalClock(now, timeZone);
  const nowLabel = formatLocalTimeLabel(`${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`);
  const dateLabel = formatCivilDateLabel(anchor);
  const today = clock.civilDate === anchor;
  const orientation =
    question === "present"
      ? composeCurrentTemporalReading({
          instant: now,
          timeZone,
          work: sources.work,
          protectedTime: sources.protectedTime,
          blocks: sources.blocks,
          commitments: sources.commitments,
          externalConnections: sources.externalConnections,
          externalSources: sources.externalSources,
          externalFacts: sources.externalFacts,
        })
      : null;
  const threadText = threadLine({
    status: thread.status === "ready" ? "ready" : thread.status,
    active: thread.status === "ready" ? thread.active : false,
    resumeTitle: thread.status === "ready" && thread.active ? thread.resumeTitle : null,
  });
  const threadWeight = threadRestingWeight({
    status: thread.status === "ready" ? "ready" : thread.status,
    active: thread.status === "ready" ? thread.active : false,
  });
  const placements = model ? [...model.context, ...model.foreground] : [];
  const dayReading = [...placements].sort((a, b) => a.visibleStartMinute - b.visibleStartMinute || a.sourceId.localeCompare(b.sourceId));

  return (
    <div className="orient-phone" data-phone-reading="true" data-phone-question={question} data-portrait="field">
      <div className="orient-portrait-where" data-region="where">
        {question === "present" ? (
          <p className="orient-phone-now" data-phone-now="true">
            <span className="orient-phone-now-time">{nowLabel}</span>
            <span className="orient-phone-date">{dateLabel}</span>
          </p>
        ) : (
          <p className="orient-phone-day" data-phone-day="true">
            <span className="orient-phone-date">{dateLabel}</span>
            {today ? <span className="orient-phone-now-quiet">Now {nowLabel}</span> : null}
          </p>
        )}
      </div>

      <div className="orient-portrait-around" data-region="around">
      {question === "present" ? (
        <div className="orient-memberships" data-membership="true" data-coexistence={orientation?.status === "complete" && orientation.facts.length > 1 ? "true" : "false"}>
          {orientation?.status === "incomplete" ? (
            <p data-reading="incomplete" className="orient-withheld">
              This reading is withheld. {orientation.message}
            </p>
          ) : null}
          {orientation?.status === "complete" && orientation.facts.length === 0 ? (
            <p data-membership-empty="true" className="orient-phone-empty">
              No established truth contains this instant.
            </p>
          ) : null}
          {orientation?.status === "complete"
            ? orientation.facts.map((fact) => {
                const copy = membershipCopy(fact);
                const contextId = fact.sourceKind === "block" ? contextFor("block", fact.sourceId) : null;
                const emphasis = markEmphasis({ sourceKind: fact.sourceKind, contextId, focus });
                return (
                  <button
                    key={`${fact.sourceKind}:${fact.sourceId}`}
                    type="button"
                    className="orient-membership"
                    data-source-kind={fact.sourceKind}
                    data-source-id={fact.sourceId}
                    data-kind={fact.sourceKind}
                    data-contour={kindContour(fact.sourceKind)}
                    data-emphasis={emphasis}
                    aria-label={accessibleFactName(`${copy.kind}. ${copy.name}. ${copy.interval}`, emphasis)}
                    onClick={() => onRefer([{ sourceKind: fact.sourceKind, sourceId: fact.sourceId }])}
                  >
                    <span className="orient-membership-kind">{copy.kind}</span>
                    <span className="orient-membership-name">{copy.name}</span>
                    <span className="orient-membership-interval">{copy.interval}</span>
                  </button>
                );
              })
            : null}
        </div>
      ) : (
        <div className="orient-day-reading" data-day-reading="true" data-order="clock">
          {withheld ? (
            <p data-reading="incomplete" className="orient-withheld">
              This reading is withheld. {withheld}
            </p>
          ) : null}
          {withheld
            ? null
            : model?.allDay.map((fact) => (
            <button
              key={`${fact.sourceKind}:${fact.sourceId}`}
              type="button"
              className="orient-membership"
              data-source-kind={fact.sourceKind}
              data-source-id={fact.sourceId}
              data-contour={kindContour(fact.sourceKind)}
              aria-label={fact.accessibleLabel}
              onClick={() => onRefer([{ sourceKind: fact.sourceKind, sourceId: fact.sourceId }])}
            >
              <span className="orient-membership-kind">{fact.kindLabel}</span>
              <span className="orient-membership-name">{fact.primary}</span>
              <span className="orient-membership-interval">All day</span>
            </button>
          ))}
          {withheld
            ? null
            : dayReading.map((placement) => {
            const emphasis = emphasisFor(placement, contextFor, focus);
            return (
              <button
                key={`${placement.sourceKind}:${placement.sourceId}`}
                type="button"
                className="orient-membership"
                data-source-kind={placement.sourceKind}
                data-source-id={placement.sourceId}
                data-kind={placement.sourceKind}
                data-contour={kindContour(placement.sourceKind)}
                data-emphasis={emphasis}
                data-start-minute={placement.visibleStartMinute}
                aria-label={accessibleFactName(placement.accessibleLabel, emphasis)}
                onClick={() => onRefer(overlappingFacts(placement, placements))}
              >
                <span className="orient-membership-kind">{placement.kindLabel}</span>
                <span className="orient-membership-name">{placement.primary}</span>
                <span className="orient-membership-interval">{placement.shownInterval ?? placement.sourceInterval}</span>
              </button>
            );
          })}
          {!withheld && model && model.allDay.length === 0 && dayReading.length === 0 && model.axis !== "unpositioned" ? (
            <p data-day-empty="true" className="orient-phone-empty">
              Nothing is established on this date.
            </p>
          ) : null}
        </div>
      )}

      <button
        type="button"
        className="orient-phone-thread"
        data-phone-thread="true"
        data-thread-weight={threadWeight}
        onClick={onThread}
      >
        <span className="orient-phone-thread-line" aria-hidden="true" />
        <span>{threadText}</span>
      </button>

      <DaySignature
        model={model}
        dateLabel={dateLabel}
        presentMinute={today ? clock.hour * 60 + clock.minute : null}
        off={off}
        focus={focus}
        contextFor={contextFor}
        onRefer={onRefer}
        onExact={onExact}
      />
      </div>

      <div className="orient-portrait-reach" data-region="reach">
        <button type="button" className="orient-exact-entry" data-exact-time="true" onClick={() => onExact(null)}>
          Exact time
        </button>
      </div>
    </div>
  );
}

function DaySignature({
  model,
  dateLabel,
  presentMinute,
  off,
  focus,
  contextFor,
  onRefer,
  onExact,
}: {
  model: DayCanvasModel | null;
  dateLabel: string;
  presentMinute: number | null;
  off: boolean;
  focus: ContextFocus;
  contextFor: (kind: TimelineSourceKind, id: string) => string | null;
  onRefer: (facts: FactAddress[]) => void;
  onExact: (minute: number | null) => void;
}) {
  const placements = model && model.axis === "local-clock" ? [...model.context, ...model.foreground] : [];
  return (
    <div
      className="orient-signature"
      data-day-signature="true"
      role="group"
      aria-label={`Established shape of ${dateLabel}. Unmarked time is not established.`}
    >
      <div className="orient-signature-hours" aria-hidden="true">
        {[0, 6, 12, 18].map((hour) => (
          <span key={hour} style={{ left: `${(hour / 24) * 100}%` }}>
            {formatLocalTimeLabel(`${String(hour).padStart(2, "0")}:00`)}
          </span>
        ))}
      </div>
      <div className="orient-signature-rail">
        <button
          type="button"
          className="orient-signature-ground"
          data-signature-ground="true"
          aria-label={`Exact time, ${dateLabel}`}
          onClick={(event) => {
            if (event.detail === 0) {
              onExact(null);
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
            onExact(minuteFromSignatureRatio(ratio));
          }}
        />
        {placements.map((placement) => {
          const span = signaturePlacement(placement.visibleStartMinute, placement.visibleEndMinute);
          const emphasis = emphasisFor(placement, contextFor, focus);
          return (
            <button
              key={`${placement.sourceKind}:${placement.sourceId}`}
              type="button"
              className="orient-signature-fact"
              data-source-kind={placement.sourceKind}
              data-source-id={placement.sourceId}
              data-kind={placement.sourceKind}
              data-contour={kindContour(placement.sourceKind)}
              data-emphasis={emphasis}
              data-start={span.start}
              data-width={span.width}
              aria-label={accessibleFactName(placement.accessibleLabel, emphasis)}
              style={{ left: `${span.start * 100}%`, width: `${span.width * 100}%` }}
              onClick={(event) => {
                event.stopPropagation();
                onRefer(overlappingFacts(placement, placements));
              }}
            >
              <span className="orient-signature-mark" data-kind={placement.sourceKind} />
            </button>
          );
        })}
        {presentMinute !== null ? (
          <div
            className="orient-signature-now"
            data-signature-now="true"
            style={{ left: `${minuteFraction(presentMinute) * 100}%` }}
            aria-hidden="true"
          />
        ) : null}
        {off ? (
          <span data-work-off="true" className="orient-off">
            Off
          </span>
        ) : null}
      </div>
      {model?.axis === "unpositioned" ? <p className="orient-note">{model.clockLabelNote ?? "Time could not be positioned for this date."}</p> : null}
    </div>
  );
}

function emphasisFor(
  placement: DayCanvasTimedPlacement,
  contextFor: (kind: TimelineSourceKind, id: string) => string | null,
  focus: ContextFocus,
) {
  const contextId =
    placement.stored?.sourceKind === "block" ? placement.stored.contextId : contextFor(placement.sourceKind, placement.sourceId);
  return markEmphasis({ sourceKind: placement.sourceKind, contextId, focus });
}
