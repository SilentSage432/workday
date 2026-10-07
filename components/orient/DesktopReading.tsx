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
import { formatCivilDateLabel, parseCivilDate } from "@/domain/time/workFiscalWeek";
import { DAY_AXIS_MINUTES, type DayCanvasModel, type DayCanvasTimedPlacement } from "@/projections/dayCanvas";
import type { TimelineSourceKind } from "@/projections/timeline";

/**
 * Desktop Present is the instant. Desktop Day is the selected civil day.
 * Only Day carries the one-dimensional 00:00–24:00 inscription. Exact time opens the existing Day clock.
 * This is not the phone portrait stretched wide.
 */

export function DesktopReading({
  question,
  timeZone,
  now,
  anchor,
  model,
  sources,
  thread,
  focus,
  contextFor,
  withheld,
  onRefer,
  onThread,
  onExact,
  onAllDay,
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
  withheld: string | null;
  onRefer: (facts: FactAddress[]) => void;
  onThread: (event: { currentTarget: HTMLElement }) => void;
  onExact: (minute: number | null) => void;
  onAllDay: () => void;
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
    <div className="orient-desktop" data-desktop-reading="true" data-desktop-question={question}>
      <div className="orient-desktop-where" data-region="where">
        {question === "present" ? (
          <p className="orient-desktop-now" data-desktop-now="true">
            <span className="orient-desktop-now-time">{nowLabel}</span>
            <span className="orient-desktop-date">{dateLabel}</span>
          </p>
        ) : (
          <p className="orient-desktop-day" data-desktop-day="true">
            <span className="orient-desktop-date">{dateLabel}</span>
            {today ? <span className="orient-desktop-now-quiet">Now {nowLabel}</span> : null}
          </p>
        )}
      </div>

      <div className="orient-desktop-truth" data-region="around">
        {question === "present" ? (
          <div
            className="orient-desktop-memberships"
            data-membership="true"
            data-coexistence={orientation?.status === "complete" && orientation.facts.length > 1 ? "true" : "false"}
          >
            {orientation?.status === "incomplete" ? (
              <p data-reading="incomplete" className="orient-withheld">
                This reading is withheld. {orientation.message}
              </p>
            ) : null}
            {orientation?.status === "complete" && orientation.facts.length === 0 ? (
              <p data-membership-empty="true" className="orient-desktop-empty">
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
          <div className="orient-desktop-day-reading" data-day-reading="true" data-order="clock">
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
                      <span className="orient-membership-interval">{dayReadingInterval(placement)}</span>
                    </button>
                  );
                })}
            {!withheld && model && model.allDay.length === 0 && dayReading.length === 0 && model.axis !== "unpositioned" ? (
              <p data-day-empty="true" className="orient-desktop-empty">
                Nothing is established on this date.
              </p>
            ) : null}
          </div>
        )}

        <button type="button" className="orient-desktop-thread" data-desktop-thread="true" data-thread-weight={threadWeight} onClick={onThread}>
          <span className="orient-desktop-thread-line" aria-hidden="true" />
          <span>{threadText}</span>
        </button>
      </div>

      {question === "present" ? (
        <div className="orient-desktop-exact-row" data-region="reach">
          <button type="button" className="orient-desktop-exact" data-exact-time="true" data-present-precision="true" onClick={() => onExact(null)}>
            Exact time
          </button>
          <button type="button" className="orient-desktop-exact" data-all-day-establish="true" onClick={onAllDay}>
            All day
          </button>
        </div>
      ) : (
        <div className="orient-desktop-field" data-signature-role="structure">
          <DesktopSignature
            model={model}
            dateLabel={dateLabel}
            presentMinute={today ? clock.hour * 60 + clock.minute : null}
            focus={focus}
            contextFor={contextFor}
            onRefer={onRefer}
            onExact={onExact}
          />
          <div className="orient-desktop-exact-row" data-region="reach">
            <button type="button" className="orient-desktop-exact" data-exact-time="true" onClick={() => onExact(null)}>
              Exact time
            </button>
            <button type="button" className="orient-desktop-exact" data-all-day-establish="true" onClick={onAllDay}>
              All day
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DesktopSignature({
  model,
  dateLabel,
  presentMinute,
  focus,
  contextFor,
  onRefer,
  onExact,
}: {
  model: DayCanvasModel | null;
  dateLabel: string;
  presentMinute: number | null;
  focus: ContextFocus;
  contextFor: (kind: TimelineSourceKind, id: string) => string | null;
  onRefer: (facts: FactAddress[]) => void;
  onExact: (minute: number | null) => void;
}) {
  const placements = model && model.axis === "local-clock" ? [...model.context, ...model.foreground] : [];
  return (
    <div
      className="orient-desktop-signature"
      data-day-signature="true"
      role="group"
      aria-label={`Established shape of ${dateLabel}. Unmarked time is not established.`}
    >
      <div className="orient-desktop-hours" aria-hidden="true">
        {[0, 6, 12, 18].map((hour) => (
          <span key={hour} style={{ left: `${(hour / 24) * 100}%` }}>
            {formatLocalTimeLabel(`${String(hour).padStart(2, "0")}:00`)}
          </span>
        ))}
      </div>
      <div className="orient-desktop-rail" data-day-inscription="true">
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
      </div>
      {model?.axis === "unpositioned" ? <p className="orient-note">{model.clockLabelNote ?? "Time could not be positioned for this date."}</p> : null}
    </div>
  );
}

/** The selected week or month window, in the same upper-left orientation as Present and Day. */
export function DesktopWindow({
  distance,
  from,
  to,
}: {
  distance: "week" | "month";
  from: string;
  to: string;
}) {
  return (
    <div className="orient-desktop-window" data-desktop-window={distance} data-region="where">
      <p className="orient-desktop-span" data-desktop-span="true">
        {desktopSpanCopy(from, to)}
      </p>
    </div>
  );
}

export function desktopSpanCopy(from: string, to: string): string {
  const withYear = parseCivilDate(from).year !== parseCivilDate(to).year;
  return `${spanDate(from, withYear)} – ${spanDate(to, withYear)}`;
}

function spanDate(civil: string, withYear: boolean): string {
  const monthDay = formatCivilDateLabel(civil).split(", ").slice(1).join(", ");
  return withYear ? `${monthDay}, ${parseCivilDate(civil).year}` : monthDay;
}

function dayReadingInterval(placement: DayCanvasTimedPlacement): string {
  if (placement.clipped) return placement.sourceInterval;
  return `${minuteLabel(placement.visibleStartMinute)} – ${minuteLabel(placement.visibleEndMinute)}`;
}

function minuteLabel(minute: number): string {
  if (minute <= 0 || minute >= DAY_AXIS_MINUTES) return formatLocalTimeLabel("00:00");
  const hour = Math.floor(minute / 60);
  const mins = minute % 60;
  return formatLocalTimeLabel(`${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
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
