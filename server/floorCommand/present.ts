import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthenticatedUserError } from "@/server/auth/requireAuthenticatedUser";
import { assertServerOnly } from "@/server/assertServerOnly";
import { describeFloorCommandConnection } from "@/server/floorCommand/config";
import {
  floorCommandObservationMemoryFromStore,
  loadFloorCommandObservationStore,
} from "@/persistence/floorCommandObservation";
import {
  presentFloorCommandWork,
  type FloorCommandWorkReading,
} from "@/projections/floorCommandWorkPresentation";

type EnvMap = Record<string, string | undefined>;

/**
 * Reads one operator's retained Floor Command observation.
 * The store comes from that operator's binding. A query string cannot choose it.
 * This does not call Floor Command.
 */
export async function loadFloorCommandWorkReading(
  client: SupabaseClient,
  operatorId: string,
  env: EnvMap = process.env,
): Promise<FloorCommandWorkReading> {
  assertServerOnly("loadFloorCommandWorkReading");
  const described = describeFloorCommandConnection(env);
  const serverStore =
    described.status === "configured"
      ? {
          status: "configured" as const,
          storeNumber: described.storeNumber,
          pullEnabled: described.pullEnabled,
        }
      : { status: "unconfigured" as const, storeNumber: null, pullEnabled: false };
  const stored = operatorId.trim() ? await loadFloorCommandObservationStore(client, operatorId) : null;
  return presentFloorCommandWork({
    operatorId,
    serverStore,
    stored: stored
      ? {
          userId: stored.userId,
          storeNumber: stored.storeNumber,
          memory: floorCommandObservationMemoryFromStore(stored),
        }
      : null,
  });
}

/** A failed observation read. The message is static and carries no credential. */
export function floorCommandObservationHttpError(error: unknown): Response {
  if (error instanceof AuthenticatedUserError) {
    return Response.json(
      { error: "Sign in is required." },
      { status: error.code === "auth_unavailable" ? 503 : 401 },
    );
  }
  return Response.json({ error: "Floor Command observation could not be read." }, { status: 503 });
}
