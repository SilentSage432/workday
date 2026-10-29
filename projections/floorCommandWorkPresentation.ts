import {
  projectFloorCommandObservation,
  type FloorCommandObservationMemory,
  type FloorCommandObservationReading,
} from "@/projections/floorCommandObservation";
import type { FloorCommandGovernedRequestView } from "@/projections/floorCommandEvidenceCopy";

/**
 * What Work may render. The bearer and the Floor Command base URL are absent.
 * Rendering it does not contact Floor Command. A pull flag is not a live reading.
 */
export type FloorCommandWorkReading =
  | { posture: "unapproved" }
  | { posture: "wrong_store" }
  | { posture: "unread" }
  | {
      posture: "unconfigured" | "retained";
      storeNumber: string;
      pullEnabled: boolean;
      timeZone: string | null;
      governedRequests: readonly FloorCommandGovernedRequestView[];
      observation: FloorCommandObservationReading;
    };

export type FloorCommandWorkServerStore = {
  status: "unconfigured" | "configured";
  storeNumber: string | null;
  pullEnabled: boolean;
};

export function presentFloorCommandWork(input: {
  operatorId: string;
  stored: { userId: string; storeNumber: string; memory: FloorCommandObservationMemory } | null;
  serverStore: FloorCommandWorkServerStore;
  timeZone?: string | null;
  governedRequests?: readonly FloorCommandGovernedRequestView[];
}): FloorCommandWorkReading {
  const stored = input.stored;
  if (!input.operatorId.trim() || !stored || stored.userId !== input.operatorId) {
    return { posture: "unapproved" };
  }
  if (
    input.serverStore.status === "configured" &&
    input.serverStore.storeNumber !== stored.storeNumber
  ) {
    return { posture: "wrong_store" };
  }
  const observation = projectFloorCommandObservation(stored.memory);
  if (input.serverStore.status === "unconfigured") {
    return {
      posture: "unconfigured",
      storeNumber: stored.storeNumber,
      pullEnabled: false,
      timeZone: input.timeZone ?? null,
      governedRequests: input.governedRequests ?? [],
      observation,
    };
  }
  return {
    posture: "retained",
    storeNumber: stored.storeNumber,
    pullEnabled: input.serverStore.pullEnabled,
    timeZone: input.timeZone ?? null,
    governedRequests: input.governedRequests ?? [],
    observation,
  };
}

export function isFloorCommandWorkReading(value: unknown): value is FloorCommandWorkReading {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const posture = (value as { posture?: unknown }).posture;
  if (posture === "unapproved" || posture === "wrong_store" || posture === "unread") {
    return Object.keys(value).length === 1;
  }
  if (posture !== "unconfigured" && posture !== "retained") return false;
  const row = value as {
    storeNumber?: unknown;
    pullEnabled?: unknown;
    timeZone?: unknown;
    governedRequests?: unknown;
    observation?: unknown;
  };
  if (typeof row.storeNumber !== "string" || row.storeNumber.trim().length === 0) return false;
  if (row.pullEnabled !== true && row.pullEnabled !== false) return false;
  if (posture === "unconfigured" && row.pullEnabled) return false;
  if (row.timeZone !== undefined && row.timeZone !== null && typeof row.timeZone !== "string") return false;
  if (row.governedRequests !== undefined && !Array.isArray(row.governedRequests)) return false;
  return isObservation(row.observation);
}

function isObservation(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const status = (value as { status?: unknown }).status;
  if (status === "unobserved") return Array.isArray((value as { handoffs?: unknown }).handoffs);
  if (status !== "unavailable" && status !== "stale" && status !== "retained") return false;
  return Array.isArray((value as { handoffs?: unknown }).handoffs);
}
