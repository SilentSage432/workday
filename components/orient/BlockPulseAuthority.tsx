"use client";

import { useState } from "react";
import type { Block } from "@/domain/block";
import {
  leadOffsetLabel,
  PULSE_LEAD_OFFSET_CHOICES_SECONDS,
  type InterruptGrant,
} from "@/domain/pulse";

function failureMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error && caught.message.trim().length > 0 ? caught.message : fallback;
}

export function BlockPulseAuthority({
  block,
  grant,
  onEstablish,
  onRevoke,
}: {
  block: Block;
  grant: InterruptGrant | null;
  onEstablish: (leadOffsetSeconds: number) => Promise<void>;
  onRevoke: () => Promise<void>;
}) {
  const [leadSeconds, setLeadSeconds] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (block.kind !== "timed") {
    return null;
  }

  async function establish() {
    if (leadSeconds === "" || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onEstablish(leadSeconds);
    } catch (caught: unknown) {
      setError(failureMessage(caught, "Reach me was not set."));
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
      setError(failureMessage(caught, "Reach me was not cleared."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-pulse-authority="block-start" className="orient-pulse-authority">
      {grant && grant.revokedAt === null ? (
        <>
          <p className="orient-note">
            Reach me ·{" "}
            {grant.leadOffsetSeconds !== null
              ? leadOffsetLabel(grant.leadOffsetSeconds)
              : "—"}{" "}
            before start
          </p>
          <button
            type="button"
            className="orient-action"
            data-pulse-revoke="true"
            disabled={busy}
            onClick={() => void revoke()}
          >
            Don&apos;t reach me
          </button>
        </>
      ) : (
        <>
          <label className="orient-note">
            Reach me
            <select
              aria-label="Reach me lead time"
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
            Reach me
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
