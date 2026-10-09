"use client";

import { useState } from "react";
import type { Commitment } from "@/domain/commitment";
import {
  leadOffsetLabel,
  PULSE_LEAD_OFFSET_CHOICES_SECONDS,
  type InterruptGrant,
} from "@/domain/pulse";

function failureMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error && caught.message.trim().length > 0 ? caught.message : fallback;
}

export function CommitmentPulseAuthority({
  commitment,
  grant,
  onEstablish,
  onRevoke,
}: {
  commitment: Commitment;
  grant: InterruptGrant | null;
  onEstablish: (leadOffsetSeconds: number) => Promise<void>;
  onRevoke: () => Promise<void>;
}) {
  const [leadSeconds, setLeadSeconds] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (commitment.kind !== "timed") {
    return null;
  }

  async function establish() {
    if (leadSeconds === "" || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onEstablish(leadSeconds);
      setLeadSeconds("");
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The reminder was not set."));
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onRevoke();
    } catch (caught: unknown) {
      setError(failureMessage(caught, "The reminder was not cleared."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-pulse-authority="commitment-start" className="orient-pulse-authority">
      {grant && grant.revokedAt === null ? (
        <>
          <p className="orient-note">
            Reminder set · {leadOffsetLabel(grant.leadOffsetSeconds)} before start
          </p>
          <button
            type="button"
            className="orient-action"
            data-pulse-revoke="true"
            disabled={busy}
            onClick={() => void revoke()}
          >
            Don&apos;t remind me
          </button>
        </>
      ) : (
        <>
          <label className="orient-note">
            Remind me
            <select
              aria-label="Reminder lead time"
              data-pulse-lead="true"
              value={leadSeconds === "" ? "" : String(leadSeconds)}
              onChange={(event) => {
                const value = event.target.value;
                setLeadSeconds(value.length === 0 ? "" : Number(value));
              }}
            >
              <option value="">Choose when…</option>
              {PULSE_LEAD_OFFSET_CHOICES_SECONDS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {leadOffsetLabel(seconds)} before
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="orient-action"
            data-pulse-establish="true"
            disabled={busy || leadSeconds === ""}
            onClick={() => void establish()}
          >
            Set reminder
          </button>
        </>
      )}
      {error ? (
        <p role="alert" className="orient-note">
          {error}
        </p>
      ) : null}
    </div>
  );
}
