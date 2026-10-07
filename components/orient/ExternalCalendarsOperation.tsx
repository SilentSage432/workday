"use client";

import { useEffect, useMemo, useState } from "react";
import {
  beginGoogleConnect,
  disconnectGoogleCalendar,
  fetchGoogleCalendars,
  fetchGoogleConnectionStatus,
  saveGoogleCalendarSelection,
  type GoogleCalendarOption,
  type GoogleConnectionStatusResponse,
} from "@/components/orient/externalCalendarsApi";

type Phase =
  | { kind: "status-loading" }
  | { kind: "status-error"; message: string }
  | { kind: "disconnected" }
  | { kind: "pending_auth" }
  | { kind: "auth_failed"; message: string }
  | { kind: "connected"; status: GoogleConnectionStatusResponse }
  | { kind: "calendars-loading"; status: GoogleConnectionStatusResponse }
  | {
      kind: "calendars-ready";
      status: GoogleConnectionStatusResponse;
      calendars: GoogleCalendarOption[];
      enumerationStatus: "complete" | "partial";
      enumerationMessage: string | null;
    }
  | { kind: "calendars-error"; status: GoogleConnectionStatusResponse; message: string };

export function ExternalCalendarsOperation({
  onDismiss,
  initialError = null,
}: {
  onDismiss: () => void;
  initialError?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "status-loading" });
  const [draftSelected, setDraftSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    void fetchGoogleConnectionStatus()
      .then((status) => {
        if (ignore) return;
        if (status.status === "disconnected") {
          setPhase({ kind: "disconnected" });
          return;
        }
        if (status.status === "pending_auth") {
          setPhase({ kind: "pending_auth" });
          return;
        }
        if (status.status === "auth_failed") {
          setPhase({
            kind: "auth_failed",
            message: "Google authorization failed. Connect again.",
          });
          return;
        }
        setPhase({ kind: "connected", status });
      })
      .catch((error: unknown) => {
        if (ignore) return;
        setPhase({
          kind: "status-error",
          message: error instanceof Error ? error.message : "Google Calendar status could not be read.",
        });
      });
    return () => {
      ignore = true;
    };
  }, []);

  const selectedCount = useMemo(() => draftSelected.size, [draftSelected]);

  async function connect() {
    setBusy(true);
    setActionError(null);
    try {
      const { authorizeUrl } = await beginGoogleConnect();
      window.location.assign(authorizeUrl);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Google Calendar could not be connected.");
      setBusy(false);
    }
  }

  async function loadCalendars(status: GoogleConnectionStatusResponse) {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    setPhase({ kind: "calendars-loading", status });
    try {
      const result = await fetchGoogleCalendars();
      setDraftSelected(
        new Set(result.calendars.filter((calendar) => calendar.selected).map((calendar) => calendar.sourceLocalId)),
      );
      setPhase({
        kind: "calendars-ready",
        status,
        calendars: result.calendars,
        enumerationStatus: result.enumerationStatus,
        enumerationMessage: result.message,
      });
    } catch (error: unknown) {
      setPhase({
        kind: "calendars-error",
        status,
        message: error instanceof Error ? error.message : "Calendars could not be loaded.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveSelection(status: GoogleConnectionStatusResponse) {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const result = await saveGoogleCalendarSelection([...draftSelected]);
      setNotice(
        result.selectedCount === 0
          ? "No calendars selected for observation."
          : `${result.selectedCount} calendar${result.selectedCount === 1 ? "" : "s"} selected for observation.`,
      );
      setPhase({ kind: "connected", status: { ...status, selectedCount: result.selectedCount } });
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Calendar selection could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const result = await disconnectGoogleCalendar();
      setPhase({ kind: "disconnected" });
      setDraftSelected(new Set());
      setNotice(result.message);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Disconnect failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-external-calendars="true">
      <header className="orient-surface-header">
        <div>
          <h2>Google Calendar</h2>
          <p className="orient-capture-lead">Choose which calendars Orient may observe.</p>
        </div>
        <button type="button" className="orient-action" onClick={onDismiss}>
          Close
        </button>
      </header>

      {phase.kind === "status-loading" ? <p>Reading connection…</p> : null}
      {phase.kind === "status-error" ? <p role="alert">{phase.message}</p> : null}

      {phase.kind === "disconnected" ? (
        <section>
          <p>Not connected.</p>
          <div className="orient-actions">
            <button type="button" className="orient-action" data-google-connect="true" disabled={busy} onClick={() => void connect()}>
              Connect
            </button>
          </div>
        </section>
      ) : null}

      {phase.kind === "pending_auth" ? (
        <section>
          <p>Authorization is unfinished. Connect again to continue.</p>
          <div className="orient-actions">
            <button type="button" className="orient-action" disabled={busy} onClick={() => void connect()}>
              Connect
            </button>
          </div>
        </section>
      ) : null}

      {phase.kind === "auth_failed" ? (
        <section>
          <p role="alert">{phase.message}</p>
          <div className="orient-actions">
            <button type="button" className="orient-action" disabled={busy} onClick={() => void connect()}>
              Connect again
            </button>
          </div>
        </section>
      ) : null}

      {phase.kind === "connected" ||
      phase.kind === "calendars-loading" ||
      phase.kind === "calendars-ready" ||
      phase.kind === "calendars-error" ? (
        <section>
          <p>
            Connected.
            {"selectedCount" in phase.status ? ` ${phase.status.selectedCount} selected.` : null}
          </p>
          <p className="orient-note">
            Selection permits later observation. Events are not loaded here.
          </p>
          <div className="orient-actions">
            <button
              type="button"
              className="orient-action"
              data-google-load-calendars="true"
              disabled={busy}
              onClick={() => void loadCalendars(phase.status)}
            >
              {phase.kind === "calendars-loading" ? "Loading calendars…" : "Load calendars"}
            </button>
            <button type="button" className="orient-action" disabled={busy} onClick={() => void disconnect()}>
              Disconnect
            </button>
          </div>
        </section>
      ) : null}

      {phase.kind === "calendars-error" ? <p role="alert">{phase.message}</p> : null}

      {phase.kind === "calendars-ready" ? (
        <section data-google-calendar-list="true">
          {phase.enumerationStatus === "partial" ? (
            <p role="alert">{phase.enumerationMessage ?? "Calendar list was incomplete."}</p>
          ) : null}
          {phase.calendars.length === 0 ? (
            <p>No calendars were returned.</p>
          ) : (
            <ul className="orient-note">
              {phase.calendars.map((calendar) => (
                <li key={calendar.sourceLocalId}>
                  <label>
                    <input
                      type="checkbox"
                      checked={draftSelected.has(calendar.sourceLocalId)}
                      onChange={(event) => {
                        setDraftSelected((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(calendar.sourceLocalId);
                          else next.delete(calendar.sourceLocalId);
                          return next;
                        });
                      }}
                    />{" "}
                    {calendar.displayName}
                    {calendar.primary ? " (primary)" : ""}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="orient-note">{selectedCount} selected in draft.</p>
          <div className="orient-actions">
            <button
              type="button"
              className="orient-action"
              data-google-save-selection="true"
              disabled={busy || phase.enumerationStatus !== "complete"}
              onClick={() => void saveSelection(phase.status)}
            >
              Save selection
            </button>
          </div>
        </section>
      ) : null}

      {actionError ? <p role="alert">{actionError}</p> : null}
      {notice ? <p>{notice}</p> : null}
    </div>
  );
}
