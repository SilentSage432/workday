/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CommitmentPulseAuthority } from "@/components/orient/CommitmentPulseAuthority";
import { PulseExpression } from "@/components/orient/PulseExpression";
import { defineCommitment } from "@/domain/commitment";
import type { InterruptGrant, PulseOccurrence } from "@/domain/pulse";

const GRANT = "22222222-2222-2222-2222-222222222222";
const COMMITMENT = "33333333-3333-3333-3333-333333333333";

function timed() {
  return {
    ...defineCommitment({
      kind: "timed" as const,
      startsOn: "2026-10-08",
      startLocal: "15:00",
      endLocal: "16:00",
      title: "Doctor appointment",
    }),
    id: COMMITMENT,
    createdAt: "2026-10-01T12:00:00.000Z",
  };
}

function grant(): InterruptGrant {
  return {
    id: GRANT,
    userId: "11111111-1111-1111-1111-111111111111",
    sourceKind: "commitment",
    sourceId: COMMITMENT,
    transitionKind: "start",
    relationship: "relative_before",
    leadOffsetSeconds: 900,
    establishedAt: "2026-10-08T12:00:00.000Z",
    revokedAt: null,
  };
}

function occurrence(): PulseOccurrence {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    userId: "11111111-1111-1111-1111-111111111111",
    grantId: GRANT,
    sourceKind: "commitment",
    sourceId: COMMITMENT,
    relationship: "relative_before",
    sourceStartsOn: "2026-10-08",
    sourceStartLocal: "15:00",
    thresholdAt: "2026-10-08T20:45:00.000Z",
    sourceStartAt: "2026-10-08T21:00:00.000Z",
    establishedAt: "2026-10-08T20:45:00.000Z",
  };
}

describe("CommitmentPulseAuthority", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
  });

  async function render(ui: ReactNode) {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(ui);
    });
    return host!;
  }

  it("lets a timed Commitment explicitly establish reminder authority without a default", async () => {
    const established: number[] = [];
    const view = await render(
      <CommitmentPulseAuthority
        commitment={timed()}
        grant={null}
        onEstablish={async (lead) => {
          established.push(lead);
        }}
        onRevoke={async () => {}}
      />,
    );
    expect(view.querySelector("[data-pulse-authority]")).not.toBeNull();
    expect((view.querySelector("[data-pulse-establish]") as HTMLButtonElement).disabled).toBe(true);
    const select = view.querySelector("[data-pulse-lead]") as HTMLSelectElement;
    expect(select.value).toBe("");
    await act(async () => {
      select.value = "900";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      (view.querySelector("[data-pulse-establish]") as HTMLButtonElement).click();
    });
    expect(established).toEqual([900]);
  });

  it("does not expose grant UI for all-day Commitments", async () => {
    const allDay = {
      ...defineCommitment({ kind: "all_day" as const, startsOn: "2026-10-08", title: "Holiday" }),
      id: COMMITMENT,
      createdAt: "2026-10-01T12:00:00.000Z",
    };
    const view = await render(
      <CommitmentPulseAuthority
        commitment={allDay}
        grant={null}
        onEstablish={async () => {}}
        onRevoke={async () => {}}
      />,
    );
    expect(view.querySelector("[data-pulse-authority]")).toBeNull();
  });

  it("offers revoke when an active grant exists", async () => {
    const revoked: string[] = [];
    const view = await render(
      <CommitmentPulseAuthority
        commitment={timed()}
        grant={grant()}
        onEstablish={async () => {}}
        onRevoke={async () => {
          revoked.push("yes");
        }}
      />,
    );
    expect(view.textContent).toContain("Reminder set");
    await act(async () => {
      (view.querySelector("[data-pulse-revoke]") as HTMLButtonElement).click();
    });
    expect(revoked).toEqual(["yes"]);
  });
});

describe("PulseExpression", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
  });

  it("is restrained, non-modal, and dismisses expression only", async () => {
    const dismissed: string[] = [];
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <PulseExpression
          items={[{ occurrence: occurrence(), title: "Doctor appointment" }]}
          dismissedIds={new Set()}
          onDismiss={(id) => dismissed.push(id)}
        />,
      );
    });
    const view = host!;
    expect(view.querySelector("[data-pulse-expression]")).not.toBeNull();
    expect(view.querySelector("[role='dialog']")).toBeNull();
    expect(view.textContent).toContain("Doctor appointment");
    expect(view.textContent).not.toMatch(/must do|overdue|urgent|acknowledge/i);
    await act(async () => {
      (view.querySelector("[data-pulse-dismiss]") as HTMLButtonElement).click();
    });
    expect(dismissed).toEqual([occurrence().id]);
  });
});

describe("pulse instrument wiring", () => {
  it("keeps grant establishment and expression out of MustDo and ACT mutation paths", () => {
    const instrument = readFileSync("components/orient/OrientInstrument.tsx", "utf8");
    const authority = readFileSync("components/orient/CommitmentPulseAuthority.tsx", "utf8");
    const expression = readFileSync("components/orient/PulseExpression.tsx", "utf8");
    expect(instrument).toContain("establishCommitmentStartInterruptGrant");
    expect(instrument).toContain("establishEligiblePulseOccurrences");
    expect(instrument).not.toMatch(/mustDo\s*=\s*true|must_do:\s*true/);
    expect(authority).toContain("Set reminder");
    expect(authority).toContain("Don&apos;t remind me");
    expect(expression).toContain('role="status"');
    expect(expression).not.toMatch(/acknowledge|must do|MustDo/i);
    expect(expression).not.toContain("data-act-control");
  });
});
