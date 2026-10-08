"use client";

import { useEffect, useMemo, useState } from "react";
import {
  beginGoogleConnect,
  disconnectGoogleCalendar,
  fetchGoogleCalendars,
  fetchGoogleConnectionStatus,
  observeGoogleCalendars,
  saveGoogleCalendarSelection,
  type GoogleCalendarOption,
  type GoogleConnectionStatusResponse,
  type GoogleObservationResponse,
  type GoogleSourceStatus,
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
  onObservationComplete,
}: {
  onDismiss: () => void;
  initialError?: string | null;
  /** Invoked after a successful observation so production can reread external evidence. */
  onObservationComplete?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "status-loading" });
  const [draftSelected, setDraftSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [observing, setObserving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastObservation, setLastObservation] = useState<GoogleObservationResponse | null>(null);

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
  const connectedStatus =
    phase.kind === "connected" ||
    phase.kind === "calendars-loading" ||
    phase.kind === "calendars-ready" ||
    phase.kind === "calendars-error"
      ? phase.status
      : null;

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
      const nextStatus = { ...status, selectedCount: result.selectedCount };
      setPhase({ kind: "connected", status: nextStatus });
      setNotice(
        result.selectedCount === 0
          ? "No calendars selected for observation."
          : `${result.selectedCount} calendar${result.selectedCount === 1 ? "" : "s"} selected for observation.`,
      );
      if (result.selectedCount > 0) {
        // Selection route stays free of observation logic; client triggers the canonical observe path.
        await runObservation({ force: true, refreshStatus: true });
      }
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Calendar selection could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function runObservation(input: { force: boolean; refreshStatus: boolean }) {
    setObserving(true);
    setActionError(null);
    try {
      const result = await observeGoogleCalendars({ force: input.force });
      setLastObservation(result);
      setNotice(observationNotice(result));
      if (input.refreshStatus) {
        const status = await fetchGoogleConnectionStatus();
        if (status.status === "connected") {
          setPhase({ kind: "connected", status });
        }
      }
      onObservationComplete?.();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Observation failed.");
    } finally {
      setObserving(false);
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
      setLastObservation(null);
      setNotice(result.message);
      onObservationComplete?.();
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

      {connectedStatus ? (
        <section>
          <p>
            Connected.
            {` ${connectedStatus.selectedCount} selected.`}
          </p>
          <ObservationStatusBlock
            sources={connectedStatus.sources.filter((source) => source.selected)}
            observing={observing}
            lastObservation={lastObservation}
          />
          <div className="orient-actions">
            <button
              type="button"
              className="orient-action"
              data-google-load-calendars="true"
              disabled={busy || observing}
              onClick={() => void loadCalendars(connectedStatus)}
            >
              {phase.kind === "calendars-loading" ? "Loading calendars…" : "Load calendars"}
            </button>
            <button
              type="button"
              className="orient-action"
              data-google-observe="true"
              disabled={busy || observing || connectedStatus.selectedCount === 0}
              onClick={() => void runObservation({ force: true, refreshStatus: true })}
            >
              {observing ? "Observing…" : "Refresh observed calendars"}
            </button>
            <button type="button" className="orient-action" disabled={busy || observing} onClick={() => void disconnect()}>
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
              disabled={busy || observing || phase.enumerationStatus !== "complete"}
              onClick={() => void saveSelection(phase.status)}
            >
              Save selection
            </button>
          </div>
        </section>
      ) : null}

      {actionError ? <p role="alert">{actionError}</p> : null}
      {notice ? <p data-observation-notice="true">{notice}</p> : null}
    </div>
  );
}

function ObservationStatusBlock({
  sources,
  observing,
  lastObservation,
}: {
  sources: GoogleSourceStatus[];
  observing: boolean;
  lastObservation: GoogleObservationResponse | null;
}) {
  if (observing) {
    return <p data-observation-status="observing">Observing selected calendars…</p>;
  }
  if (sources.length === 0) {
    return <p data-observation-status="none-selected">No calendars selected for observation.</p>;
  }
  if (lastObservation?.reconnectRequired) {
    return <p data-observation-status="reconnect-required" role="alert">Reconnect required. Observation could not authorize Google.</p>;
  }
  if (lastObservation && lastObservation.failedSourceCount > 0 && lastObservation.successfulSourceCount === 0) {
    return <p data-observation-status="failed" role="alert">Observation failed. Last-known evidence was retained.</p>;
  }
  if (lastObservation && lastObservation.partialSourceCount > 0) {
    return (
      <p data-observation-status="partial" role="alert">
        Observation partially failed for {lastObservation.partialSourceCount} source
        {lastObservation.partialSourceCount === 1 ? "" : "s"}. Last-known evidence was retained where needed.
      </p>
    );
  }
  if (lastObservation && lastObservation.successfulSourceCount > 0) {
    const zero = lastObservation.sources.every(
      (source) => source.result !== "success_complete" || source.observedEventCount === 0,
    );
    return (
      <p data-observation-status={zero ? "success-zero" : "success"}>
        {zero
          ? "Successfully observed. No events in the observation window."
          : `Successfully observed ${lastObservation.successfulSourceCount} source${lastObservation.successfulSourceCount === 1 ? "" : "s"}.`}
      </p>
    );
  }

  const neverObserved = sources.every((source) => source.lastSuccessfulObservedAt === null);
  if (neverObserved) {
    return <p data-observation-status="never-observed">Never observed.</p>;
  }
  const failed = sources.some((source) => source.lastAttemptResult === "failure");
  if (failed) {
    return <p data-observation-status="failed-retained">Observation failed. Last-known evidence was retained.</p>;
  }
  const latest = sources
    .map((source) => source.lastSuccessfulObservedAt)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1);
  return (
    <p data-observation-status="last-observed">
      Last observed{latest ? `: ${new Date(latest).toLocaleString()}` : "."}
    </p>
  );
}

function observationNotice(result: GoogleObservationResponse): string {
  if (result.selectedSourceCount === 0) return "No calendars selected for observation.";
  if (result.reconnectRequired) return "Reconnect required.";
  if (result.failedSourceCount > 0 && result.successfulSourceCount === 0) {
    return "Observation failed. Last-known evidence was retained.";
  }
  if (result.partialSourceCount > 0) {
    return "Observation partially failed. Last-known evidence was retained where needed.";
  }
  if (result.successfulSourceCount > 0) {
    const zero = result.sources.every(
      (source) => source.result !== "success_complete" || source.observedEventCount === 0,
    );
    return zero
      ? "Successfully observed. No events in the observation window."
      : "Observation complete.";
  }
  if (result.skippedThrottleCount > 0) return "Observation recently ran; skipped.";
  return "Observation finished.";
}
