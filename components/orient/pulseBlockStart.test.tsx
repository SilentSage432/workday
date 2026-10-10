/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { BlockPulseAuthority } from "@/components/orient/BlockPulseAuthority";
import { defineBlock } from "@/domain/block";
import type { InterruptGrant } from "@/domain/pulse";

const GRANT = "22222222-2222-2222-2222-222222222222";
const BLOCK = "55555555-5555-5555-5555-555555555555";

function timed() {
  return {
    ...defineBlock({
      kind: "timed" as const,
      startsOn: "2026-10-08",
      startLocal: "15:00",
      endLocal: "16:00",
      purpose: "Deep work",
    }),
    id: BLOCK,
    createdAt: "2026-10-01T12:00:00.000Z",
  };
}

function grant(): InterruptGrant {
  return {
    id: GRANT,
    userId: "11111111-1111-1111-1111-111111111111",
    sourceKind: "block",
    sourceId: BLOCK,
    transitionKind: "start",
    relationship: "relative_before",
    leadOffsetSeconds: 900,
    establishedAt: "2026-10-08T12:00:00.000Z",
    revokedAt: null,
  };
}

describe("BlockPulseAuthority", () => {
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

  it("lets a timed Block explicitly establish Reach me without a default lead", async () => {
    const established: number[] = [];
    const view = await render(
      <BlockPulseAuthority
        block={timed()}
        grant={null}
        onEstablish={async (lead) => {
          established.push(lead);
        }}
        onRevoke={async () => {}}
      />,
    );
    expect(view.querySelector('[data-pulse-authority="block-start"]')).not.toBeNull();
    expect((view.querySelector("[data-pulse-establish]") as HTMLButtonElement).disabled).toBe(true);
    const select = view.querySelector("[data-pulse-lead]") as HTMLSelectElement;
    expect(select.value).toBe("");
    await act(async () => {
      select.value = "900";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect((view.querySelector("[data-pulse-establish]") as HTMLButtonElement).disabled).toBe(false);
    await act(async () => {
      (view.querySelector("[data-pulse-establish]") as HTMLButtonElement).click();
    });
    expect(established).toEqual([900]);
  });

  it("shows active Reach me grant and supports revoke", async () => {
    const revoked: string[] = [];
    const view = await render(
      <BlockPulseAuthority
        block={timed()}
        grant={grant()}
        onEstablish={async () => {}}
        onRevoke={async () => {
          revoked.push("ok");
        }}
      />,
    );
    expect(view.textContent).toMatch(/Reach me/);
    expect(view.textContent).toMatch(/15 minutes before start/);
    expect(view.querySelector("[data-pulse-establish]")).toBeNull();
    await act(async () => {
      (view.querySelector("[data-pulse-revoke]") as HTMLButtonElement).click();
    });
    expect(revoked).toEqual(["ok"]);
  });

  it("does not render for all-day Blocks", async () => {
    const allDay = {
      ...defineBlock({ kind: "all_day" as const, startsOn: "2026-10-08", purpose: "Focus day" }),
      id: BLOCK,
      createdAt: "2026-10-01T12:00:00.000Z",
    };
    const view = await render(
      <BlockPulseAuthority block={allDay} grant={null} onEstablish={async () => {}} onRevoke={async () => {}} />,
    );
    expect(view.querySelector("[data-pulse-authority]")).toBeNull();
  });

  it("wires instrument establishment without delivery/device branching", () => {
    const instrument = readFileSync("components/orient/OrientInstrument.tsx", "utf8");
    const authority = readFileSync("components/orient/BlockPulseAuthority.tsx", "utf8");
    expect(authority).toContain("Reach me");
    expect(authority).not.toMatch(/watch|fcm|haptic|alarm|MustDo|importance/i);
    expect(instrument).toContain("establishBlockStartInterruptGrant");
    expect(instrument).toContain("blocks");
    expect(instrument).not.toMatch(/sourceKind === \"block\".*dispatch|wear.*block/i);
  });
});
