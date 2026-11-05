"use client";

import { useEffect, useRef, useState } from "react";
import {
  inspectStandingOpportunityForWork,
  type StandingOpportunityInspectClientResult,
} from "@/components/orient/floorCommandWorkApi";
import {
  presentStandingInspectionStatus,
  standingInspectionContextFromReading,
  type StandingInspectionPresentation,
} from "@/components/orient/standingOpportunityInspectionPresentation";
import type { FloorCommandWorkReading } from "@/projections/floorCommandWorkPresentation";

/**
 * Compact standing-coordination visibility inside Floor Command Work detail.
 * Inspection is deliberate, advisory, and non-consuming. No execute controls.
 */
export function StandingCoordination({
  reading,
}: {
  reading: Extract<FloorCommandWorkReading, { storeNumber: string }>;
}) {
  const context = standingInspectionContextFromReading(reading);
  const [pending, setPending] = useState(false);
  const [presentation, setPresentation] = useState<StandingInspectionPresentation>(() =>
    presentStandingInspectionStatus(null, { notRequested: true }),
  );
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [checkedAtLabel, setCheckedAtLabel] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const canInspect = context.status === "ready" && !pending;

  return (
    <section
      className="orient-standing-coordination"
      data-standing-coordination="true"
      aria-labelledby="orient-standing-coordination-heading"
    >
      <h3 id="orient-standing-coordination-heading">Standing Coordination</h3>
      <p>
        Floor Command published-week relationship for store {reading.storeNumber}. Inspection is
        visibility only.
      </p>
      {context.status === "ready" ? (
        <p>
          Operational week from retained evidence: {context.operationalWeek}. Opportunity kind:
          publication.
        </p>
      ) : context.status === "missing_week" ? (
        <p>
          No operational week is available from retained Floor Command evidence, so standing
          inspection cannot be bound yet.
        </p>
      ) : (
        <p>Standing inspection is unavailable for this Floor Command posture.</p>
      )}
      <p>
        Retained observation evidence above is separate from standing eligibility. Inspection does
        not create temporal records.
      </p>
      <div className="orient-actions">
        <button
          type="button"
          className="orient-action"
          data-standing-coordination-inspect="true"
          data-emphasis={pending ? undefined : "save"}
          data-standing-coordination-pending={pending ? "true" : undefined}
          disabled={!canInspect}
          aria-busy={pending || undefined}
          onClick={() => {
            if (context.status !== "ready" || pending) return;
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setPending(true);
            setPresentation({
              category: "loading",
              headline: "Checking standing opportunity",
              detail: "Advisory inspection in progress. This does not reserve or execute.",
            });
            void inspectStandingOpportunityForWork({
              operationalWeek: context.operationalWeek,
              signal: controller.signal,
            })
              .then((result) => {
                if (controller.signal.aborted) return;
                applyInspectResult(result, setPresentation, setLastStatus, setCheckedAtLabel);
              })
              .finally(() => {
                if (!controller.signal.aborted) setPending(false);
              });
          }}
        >
          {pending ? "Checking standing opportunity" : "Check standing opportunity"}
        </button>
      </div>
      <div
        role="status"
        aria-live="polite"
        data-standing-coordination-result={presentation.category}
      >
        <p>
          <strong>{presentation.headline}</strong>
        </p>
        <p>{presentation.detail}</p>
        {lastStatus ? <p>Inspection status: {lastStatus}</p> : null}
        {checkedAtLabel ? <p>Checked at inspection time: {checkedAtLabel}</p> : null}
      </div>
    </section>
  );
}

function applyInspectResult(
  result: StandingOpportunityInspectClientResult,
  setPresentation: (value: StandingInspectionPresentation) => void,
  setLastStatus: (value: string | null) => void,
  setCheckedAtLabel: (value: string | null) => void,
): void {
  if (result.kind === "advisory") {
    setLastStatus(result.status);
    setCheckedAtLabel(result.asOf);
    setPresentation(presentStandingInspectionStatus(result.status));
    return;
  }
  setLastStatus(null);
  setCheckedAtLabel(null);
  if (result.kind === "context_unavailable") {
    setPresentation(
      presentStandingInspectionStatus(null, { contextUnavailable: result.reason }),
    );
    return;
  }
  if (result.kind === "invalid_intent") {
    setPresentation(
      presentStandingInspectionStatus("invalid_intent", { requestFailed: true }),
    );
    return;
  }
  if (result.kind === "unauthorized") {
    setPresentation(presentStandingInspectionStatus("unauthorized", { requestFailed: true }));
    return;
  }
  if (result.kind === "unconfigured" || result.kind === "unavailable" || result.kind === "failed") {
    setPresentation(presentStandingInspectionStatus("unavailable", { requestFailed: true }));
  }
}
