/**
 * @vitest-environment happy-dom
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalCalendarsOperation } from "@/components/orient/ExternalCalendarsOperation";

const api = vi.hoisted(() => ({
  fetchGoogleConnectionStatus: vi.fn(),
  beginGoogleConnect: vi.fn(),
  fetchGoogleCalendars: vi.fn(),
  saveGoogleCalendarSelection: vi.fn(),
  observeGoogleCalendars: vi.fn(),
  disconnectGoogleCalendar: vi.fn(),
}));

vi.mock("@/components/orient/externalCalendarsApi", () => api);

describe("ExternalCalendarsOperation", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
    vi.clearAllMocks();
  });

  async function renderOp() {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<ExternalCalendarsOperation onDismiss={() => {}} />);
    });
    return host!;
  }

  it("shows disconnected Connect state", async () => {
    api.fetchGoogleConnectionStatus.mockResolvedValue({
      status: "disconnected",
      connectionId: null,
      selectedCount: 0,
      sources: [],
    });
    const view = await renderOp();
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.textContent).toMatch(/Not connected/);
    expect(view.querySelector("[data-google-connect]")).not.toBeNull();
    expect(view.textContent).not.toMatch(/access_token|refresh_token|ciphertext/);
  });

  it("supports never-observed, manual refresh, zero-event success, and failed observation", async () => {
    api.fetchGoogleConnectionStatus.mockResolvedValue({
      status: "connected",
      connectionId: "conn-1",
      selectedCount: 1,
      sources: [
        {
          id: "s1",
          sourceLocalId: "cal-1",
          displayName: "Work",
          selected: true,
          sourceTimeZone: null,
          accessRole: "owner",
          lastAttemptedAt: null,
          lastAttemptResult: null,
          lastSuccessfulObservedAt: null,
          lastSuccessfulWindowStartsOn: null,
          lastSuccessfulWindowEndsBefore: null,
        },
      ],
    });
    const view = await renderOp();
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.querySelector('[data-observation-status="never-observed"]')).not.toBeNull();
    expect(view.querySelector("[data-google-observe]")?.textContent).toMatch(/Refresh observed calendars/);
    expect(view.textContent).not.toMatch(/\bSync\b/);

    api.observeGoogleCalendars.mockResolvedValueOnce({
      connectionId: "conn-1",
      windowStartsOn: "2026-09-30",
      windowEndsBefore: "2026-11-19",
      selectedSourceCount: 1,
      successfulSourceCount: 1,
      failedSourceCount: 0,
      partialSourceCount: 0,
      skippedThrottleCount: 0,
      reconnectRequired: false,
      sources: [
        {
          sourceId: "s1",
          sourceLocalId: "cal-1",
          displayName: "Work",
          result: "success_complete",
          observedEventCount: 0,
          code: null,
          message: null,
          reconnectRequired: false,
        },
      ],
    });
    api.fetchGoogleConnectionStatus.mockResolvedValue({
      status: "connected",
      connectionId: "conn-1",
      selectedCount: 1,
      sources: [
        {
          id: "s1",
          sourceLocalId: "cal-1",
          displayName: "Work",
          selected: true,
          sourceTimeZone: null,
          accessRole: "owner",
          lastAttemptedAt: "2026-10-07T18:00:00.000Z",
          lastAttemptResult: "success_complete",
          lastSuccessfulObservedAt: "2026-10-07T18:00:00.000Z",
          lastSuccessfulWindowStartsOn: "2026-09-30",
          lastSuccessfulWindowEndsBefore: "2026-11-19",
        },
      ],
    });

    await act(async () => {
      view.querySelector<HTMLButtonElement>("[data-google-observe]")?.click();
      await Promise.resolve();
    });
    expect(api.observeGoogleCalendars).toHaveBeenCalledWith({ force: true });
    expect(view.querySelector('[data-observation-status="success-zero"]')).not.toBeNull();

    api.observeGoogleCalendars.mockResolvedValueOnce({
      connectionId: "conn-1",
      windowStartsOn: "2026-09-30",
      windowEndsBefore: "2026-11-19",
      selectedSourceCount: 1,
      successfulSourceCount: 0,
      failedSourceCount: 1,
      partialSourceCount: 0,
      skippedThrottleCount: 0,
      reconnectRequired: false,
      sources: [
        {
          sourceId: "s1",
          sourceLocalId: "cal-1",
          displayName: "Work",
          result: "failure",
          observedEventCount: null,
          code: "transient_provider_failure",
          message: "down",
          reconnectRequired: false,
        },
      ],
    });
    await act(async () => {
      view.querySelector<HTMLButtonElement>("[data-google-observe]")?.click();
      await Promise.resolve();
    });
    expect(view.querySelector('[data-observation-status="failed"]')).not.toBeNull();
    expect(view.textContent).toMatch(/Last-known evidence was retained/);
  });

  it("shows reconnect-required distinctly from zero events", async () => {
    api.fetchGoogleConnectionStatus.mockResolvedValue({
      status: "connected",
      connectionId: "conn-1",
      selectedCount: 1,
      sources: [
        {
          id: "s1",
          sourceLocalId: "cal-1",
          displayName: "Work",
          selected: true,
          sourceTimeZone: null,
          accessRole: "owner",
          lastAttemptedAt: "t",
          lastAttemptResult: "failure",
          lastSuccessfulObservedAt: "t",
          lastSuccessfulWindowStartsOn: null,
          lastSuccessfulWindowEndsBefore: null,
        },
      ],
    });
    api.observeGoogleCalendars.mockResolvedValue({
      connectionId: "conn-1",
      windowStartsOn: "2026-09-30",
      windowEndsBefore: "2026-11-19",
      selectedSourceCount: 1,
      successfulSourceCount: 0,
      failedSourceCount: 1,
      partialSourceCount: 0,
      skippedThrottleCount: 0,
      reconnectRequired: true,
      sources: [
        {
          sourceId: "s1",
          sourceLocalId: "cal-1",
          displayName: "Work",
          result: "failure",
          observedEventCount: null,
          code: "authorization_invalid",
          message: "auth",
          reconnectRequired: true,
        },
      ],
    });
    const view = await renderOp();
    await act(async () => {
      await Promise.resolve();
      view.querySelector<HTMLButtonElement>("[data-google-observe]")?.click();
      await Promise.resolve();
    });
    expect(view.querySelector('[data-observation-status="reconnect-required"]')).not.toBeNull();
    expect(view.querySelector('[data-observation-status="success-zero"]')).toBeNull();
  });

  it("triggers observation after selection save through the canonical observe path", async () => {
    api.fetchGoogleConnectionStatus.mockResolvedValue({
      status: "connected",
      connectionId: "conn-1",
      selectedCount: 0,
      sources: [],
    });
    api.fetchGoogleCalendars.mockResolvedValue({
      connectionId: "conn-1",
      enumerationStatus: "complete",
      message: null,
      calendars: [
        {
          sourceLocalId: "cal-1",
          displayName: "Work",
          primary: true,
          accessRole: "owner",
          sourceTimeZone: null,
          selected: false,
        },
      ],
    });
    api.saveGoogleCalendarSelection.mockResolvedValue({ selectedCount: 1 });
    api.observeGoogleCalendars.mockResolvedValue({
      connectionId: "conn-1",
      windowStartsOn: "2026-09-30",
      windowEndsBefore: "2026-11-19",
      selectedSourceCount: 1,
      successfulSourceCount: 1,
      failedSourceCount: 0,
      partialSourceCount: 0,
      skippedThrottleCount: 0,
      reconnectRequired: false,
      sources: [
        {
          sourceId: "s1",
          sourceLocalId: "cal-1",
          displayName: "Work",
          result: "success_complete",
          observedEventCount: 1,
          code: null,
          message: null,
          reconnectRequired: false,
        },
      ],
    });

    const view = await renderOp();
    await act(async () => {
      await Promise.resolve();
      view.querySelector<HTMLButtonElement>("[data-google-load-calendars]")?.click();
      await Promise.resolve();
    });
    await act(async () => {
      const checkbox = view.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
      await Promise.resolve();
    });
    await act(async () => {
      view.querySelector<HTMLButtonElement>("[data-google-save-selection]")?.click();
      await Promise.resolve();
    });
    expect(api.saveGoogleCalendarSelection).toHaveBeenCalled();
    expect(api.observeGoogleCalendars).toHaveBeenCalledWith({ force: true });
  });
});
