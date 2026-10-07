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
    expect(view.textContent).not.toMatch(/\bevent\b/i);
  });

  it("loads calendars, supports empty and failure states, and saves selection", async () => {
    api.fetchGoogleConnectionStatus.mockResolvedValue({
      status: "connected",
      connectionId: "conn-1",
      selectedCount: 0,
      sources: [],
    });
    const view = await renderOp();
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.textContent).toMatch(/Connected/);
    expect(view.textContent).toMatch(/Events are not loaded here/);

    api.fetchGoogleCalendars.mockResolvedValueOnce({
      connectionId: "conn-1",
      enumerationStatus: "complete",
      message: null,
      calendars: [],
    });
    await act(async () => {
      (view.querySelector("[data-google-load-calendars]") as HTMLButtonElement).click();
    });
    expect(view.textContent).toMatch(/No calendars were returned/);

    api.fetchGoogleCalendars.mockRejectedValueOnce(new Error("Calendar list could not be completed."));
    await act(async () => {
      (view.querySelector("[data-google-load-calendars]") as HTMLButtonElement).click();
    });
    expect(view.textContent).toMatch(/Calendar list could not be completed/);

    api.fetchGoogleCalendars.mockResolvedValueOnce({
      connectionId: "conn-1",
      enumerationStatus: "complete",
      message: null,
      calendars: [
        {
          sourceLocalId: "cal-a",
          displayName: "Alpha",
          primary: true,
          accessRole: "owner",
          sourceTimeZone: "UTC",
          selected: false,
        },
      ],
    });
    api.saveGoogleCalendarSelection.mockResolvedValue({ selectedCount: 1 });
    await act(async () => {
      (view.querySelector("[data-google-load-calendars]") as HTMLButtonElement).click();
    });
    expect(view.querySelector("[data-google-calendar-list]")).not.toBeNull();
    await act(async () => {
      (view.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    });
    await act(async () => {
      (view.querySelector("[data-google-save-selection]") as HTMLButtonElement).click();
    });
    expect(api.saveGoogleCalendarSelection).toHaveBeenCalledWith(["cal-a"]);
  });

  it("disconnects from the connected state", async () => {
    api.fetchGoogleConnectionStatus.mockResolvedValue({
      status: "connected",
      connectionId: "conn-1",
      selectedCount: 1,
      sources: [],
    });
    api.disconnectGoogleCalendar.mockResolvedValue({
      status: "disconnected",
      revokedRemotely: true,
      message: null,
    });
    const view = await renderOp();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      const buttons = [...view.querySelectorAll("button")];
      buttons.find((button) => button.textContent?.trim() === "Disconnect")?.click();
    });
    expect(api.disconnectGoogleCalendar).toHaveBeenCalled();
    expect(view.textContent).toMatch(/Not connected/);
  });
});
