/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StandingCoordination } from "@/components/orient/StandingCoordination";
import * as workApi from "@/components/orient/floorCommandWorkApi";
import type { FloorCommandWorkReading } from "@/projections/floorCommandWorkPresentation";

const POLICY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CORR = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

function readingWithWeek(week: string | null): Extract<FloorCommandWorkReading, { storeNumber: string }> {
  if (!week) {
    return {
      posture: "retained",
      storeNumber: "2587",
      pullEnabled: false,
      timeZone: "America/Boise",
      governedRequests: [],
      observation: { status: "unobserved", handoffs: [] },
    };
  }
  return {
    posture: "retained",
    storeNumber: "2587",
    pullEnabled: false,
    timeZone: "America/Boise",
    governedRequests: [],
    observation: {
      status: "retained",
      readAt: "2026-10-29T00:40:17.666Z",
      handoffs: [{ operationalWeek: week } as never],
    },
  };
}

describe("StandingCoordination", () => {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    host = null;
    root = null;
    vi.restoreAllMocks();
  });

  it("renders in Work detail without inspecting until the operator asks", () => {
    const inspect = vi.spyOn(workApi, "inspectStandingOpportunityForWork");
    act(() => {
      root?.render(<StandingCoordination reading={readingWithWeek("2026-W44")} />);
    });
    expect(host?.querySelector("[data-standing-coordination='true']")).toBeTruthy();
    expect(host?.textContent).toContain("Standing Coordination");
    expect(host?.textContent).toContain("Inspection not yet requested");
    expect(host?.textContent).toContain("2026-W44");
    expect(host?.textContent).not.toContain("Approve");
    expect(host?.textContent).not.toContain("Execute");
    expect(host?.textContent).not.toContain("Run Now");
    expect(inspect).not.toHaveBeenCalled();
  });

  it("disables inspection when retained week context is missing", () => {
    act(() => {
      root?.render(<StandingCoordination reading={readingWithWeek(null)} />);
    });
    const button = host?.querySelector(
      "[data-standing-coordination-inspect='true']",
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(host?.textContent).toContain("No operational week is available");
  });

  it("shows eligible, consumed, and failure outcomes from deliberate inspection", async () => {
    const inspect = vi
      .spyOn(workApi, "inspectStandingOpportunityForWork")
      .mockResolvedValueOnce({
        kind: "advisory",
        status: "eligible_now",
        advisory: true,
        consumesOpportunity: false,
        correlationId: CORR,
        asOf: "2026-11-02T18:00:00.000Z",
        policyId: POLICY,
        policyVersion: 1,
        operationalWeek: "2026-W44",
        opportunityKind: "publication_opportunity",
        disclaimer: "eligibility_is_not_a_reservation",
      })
      .mockResolvedValueOnce({
        kind: "advisory",
        status: "already_claimed",
        advisory: true,
        consumesOpportunity: false,
        correlationId: CORR,
        asOf: null,
        policyId: POLICY,
        policyVersion: 1,
        operationalWeek: "2026-W44",
        opportunityKind: "publication_opportunity",
        disclaimer: "eligibility_is_not_a_reservation",
      })
      .mockResolvedValueOnce({ kind: "failed" });

    act(() => {
      root?.render(<StandingCoordination reading={readingWithWeek("2026-W44")} />);
    });
    const button = host?.querySelector(
      "[data-standing-coordination-inspect='true']",
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
    });
    expect(inspect).toHaveBeenCalledTimes(1);
    expect(inspect.mock.calls[0]?.[0]?.operationalWeek).toBe("2026-W44");
    expect(host?.textContent).toContain("Eligible when checked");
    expect(host?.textContent).toContain("does not reserve the opportunity");

    await act(async () => {
      button.click();
    });
    expect(host?.textContent).toContain("Opportunity already consumed");

    await act(async () => {
      button.click();
    });
    expect(host?.textContent).toContain("Inspection could not be completed");
    expect(host?.textContent).toContain("not a verified policy denial");
    expect(inspect).toHaveBeenCalledTimes(3);
  });

  it("shows missing-policy context without emitting execution fields", async () => {
    const inspect = vi.spyOn(workApi, "inspectStandingOpportunityForWork").mockResolvedValue({
      kind: "context_unavailable",
      reason: "No approved standing grant is available to inspect.",
    });
    act(() => {
      root?.render(<StandingCoordination reading={readingWithWeek("2026-W44")} />);
    });
    await act(async () => {
      (host?.querySelector("[data-standing-coordination-inspect='true']") as HTMLButtonElement).click();
    });
    expect(inspect).toHaveBeenCalledTimes(1);
    expect(host?.textContent).toContain("No approved standing grant is available to inspect.");
    expect(JSON.stringify(inspect.mock.calls[0]?.[0] ?? {})).not.toMatch(
      /confirmation|observe_standing|execute|storeNumber|asOf/,
    );
  });

  it("aborts an outstanding inspection when the section unmounts", async () => {
    const deferred: {
      resolve: ((value: workApi.StandingOpportunityInspectClientResult) => void) | null;
    } = { resolve: null };
    const inspect = vi.spyOn(workApi, "inspectStandingOpportunityForWork").mockImplementation(
      ({ signal }) =>
        new Promise<workApi.StandingOpportunityInspectClientResult>((resolve) => {
          deferred.resolve = resolve;
          signal?.addEventListener("abort", () => {
            resolve({ kind: "failed" });
          });
        }),
    );
    act(() => {
      root?.render(<StandingCoordination reading={readingWithWeek("2026-W44")} />);
    });
    await act(async () => {
      (host?.querySelector("[data-standing-coordination-inspect='true']") as HTMLButtonElement).click();
    });
    expect(inspect).toHaveBeenCalledTimes(1);
    act(() => {
      root?.unmount();
      root = null;
    });
    expect(inspect.mock.calls[0]?.[0]?.signal?.aborted).toBe(true);
    deferred.resolve?.({ kind: "failed" });
  });
});
