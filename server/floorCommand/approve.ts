import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FLOOR_COMMAND_READ_PURPOSE,
  FLOOR_COMMAND_SOURCE,
} from "@/domain/floorCommandObservation";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  describeFloorCommandConnection,
  type FloorCommandConnectionConfiguration,
} from "@/server/floorCommand/config";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

type EnvMap = Record<string, string | undefined>;

export type FloorCommandApproval =
  | {
      status: "approved";
      storeNumber: string;
      source: typeof FLOOR_COMMAND_SOURCE;
      purpose: typeof FLOOR_COMMAND_READ_PURPOSE;
    }
  | { status: "unconfigured" }
  | { status: "unauthorized" }
  | { status: "already_bound" }
  | { status: "unavailable" };

/**
 * Records the signed-in operator's approval of the server-configured store.
 * The caller cannot choose the store, the source, or the purpose.
 * No credential is written.
 */
export async function approveFloorCommandConnection(
  session: SupabaseClient,
  deps: { env?: EnvMap; admin?: SupabaseClient } = {},
): Promise<FloorCommandApproval> {
  assertServerOnly("approveFloorCommandConnection");
  const configuration = describeFloorCommandConnection(deps.env);
  if (configuration.status !== "configured") return { status: "unconfigured" };

  const userId = await signedInOperator(session);
  if (!userId) return { status: "unauthorized" };

  const admin = deps.admin ?? openAdmin();
  if (!admin) return { status: "unavailable" };

  const { error } = await admin.rpc("bind_floor_command_observation", {
    p_user_id: userId,
    p_store_number: configuration.storeNumber,
    p_source: FLOOR_COMMAND_SOURCE,
    p_purpose: FLOOR_COMMAND_READ_PURPOSE,
  });
  if (!error) {
    return approved(configuration);
  }
  if (error.message.includes("floor_command_observation_already_bound")) {
    return { status: "already_bound" };
  }
  return { status: "unavailable" };
}

function approved(
  configuration: Extract<FloorCommandConnectionConfiguration, { status: "configured" }>,
): FloorCommandApproval {
  return {
    status: "approved",
    storeNumber: configuration.storeNumber,
    source: FLOOR_COMMAND_SOURCE,
    purpose: FLOOR_COMMAND_READ_PURPOSE,
  };
}

async function signedInOperator(session: SupabaseClient): Promise<string | null> {
  const { data, error } = await session.auth.getUser();
  if (error || !data.user?.id) return null;
  return data.user.id;
}

function openAdmin(): SupabaseClient | null {
  try {
    return createSupabaseServiceRoleClient();
  } catch {
    return null;
  }
}
