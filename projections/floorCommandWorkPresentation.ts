import {
  projectFloorCommandObservation,
  type FloorCommandObservationMemory,
  type FloorCommandObservationReading,
} from "@/projections/floorCommandObservation";

/**
 * What Work may render. The bearer and the Floor Command base URL are absent.
 * `current` is a last accepted read while the pull is enabled. Rendering it
 * does not contact Floor Command.
 */
export type FloorCommandWorkReading =
  | { posture: "unapproved" }
  | { posture: "wrong_store" }
  | { posture: "unread" }
  | {
      posture: "unconfigured" | "retained" | "current";
      storeNumber: string;
      pullEnabled: boolean;
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
      observation,
    };
  }
  const pullEnabled = input.serverStore.pullEnabled;
  if (pullEnabled && observation.status === "fresh") {
    return {
      posture: "current",
      storeNumber: stored.storeNumber,
      pullEnabled: true,
      observation,
    };
  }
  return {
    posture: "retained",
    storeNumber: stored.storeNumber,
    pullEnabled,
    observation,
  };
}

export function isFloorCommandWorkReading(value: unknown): value is FloorCommandWorkReading {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const posture = (value as { posture?: unknown }).posture;
  if (posture === "unapproved" || posture === "wrong_store" || posture === "unread") {
    return Object.keys(value).length === 1;
  }
  if (posture !== "unconfigured" && posture !== "retained" && posture !== "current") return false;
  const row = value as {
    storeNumber?: unknown;
    pullEnabled?: unknown;
    observation?: unknown;
  };
  if (typeof row.storeNumber !== "string" || row.storeNumber.trim().length === 0) return false;
  if (row.pullEnabled !== true && row.pullEnabled !== false) return false;
  if (posture === "unconfigured" && row.pullEnabled) return false;
  if (posture === "current" && (!row.pullEnabled || !isFreshObservation(row.observation))) return false;
  return isObservation(row.observation);
}

function isFreshObservation(value: unknown): boolean {
  return isObservation(value) && (value as { status?: unknown }).status === "fresh";
}

function isObservation(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const status = (value as { status?: unknown }).status;
  if (status === "unobserved") return Array.isArray((value as { handoffs?: unknown }).handoffs);
  if (status !== "unavailable" && status !== "stale" && status !== "fresh") return false;
  return Array.isArray((value as { handoffs?: unknown }).handoffs);
}
