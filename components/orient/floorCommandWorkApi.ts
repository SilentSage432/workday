import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import {
  isFloorCommandWorkReading,
  type FloorCommandWorkReading,
} from "@/projections/floorCommandWorkPresentation";

const OBSERVATION_PATH = "/api/integrations/floor-command/observation";
const OBSERVATIONS_PATH = "/api/integrations/floor-command/observations";

/**
 * Loads the retained observation through the authenticated route.
 * The browser session is the Supabase access token. It is not the Floor Command bearer.
 */
export async function loadFloorCommandWorkReading(): Promise<FloorCommandWorkReading | null> {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) return null;
  let response: Response;
  try {
    response = await fetch(OBSERVATION_PATH, {
      method: "GET",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      cache: "no-store",
    });
  } catch {
    return { posture: "unread" };
  }
  if (response.status === 401) return null;
  if (!response.ok) return { posture: "unread" };
  const body: unknown = await response.json().catch(() => null);
  if (carriesCredentialKey(body) || !isFloorCommandWorkReading(body)) return { posture: "unread" };
  return body;
}

/**
 * One explicit observation. Opening Work does not call this.
 * The body names only the week. The server chooses the operator, store, and source.
 */
export async function requestFloorCommandObservation(
  week: string,
): Promise<{ outcome: string; reason?: string | null } | null> {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) return null;
  let response: Response;
  try {
    response = await fetch(OBSERVATIONS_PATH, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ week }),
      cache: "no-store",
    });
  } catch {
    return null;
  }
  const body: unknown = await response.json().catch(() => null);
  if (carriesCredentialKey(body) || !body || typeof body !== "object" || Array.isArray(body)) return null;
  const outcome = (body as { outcome?: unknown }).outcome;
  if (typeof outcome !== "string") return null;
  const reason = (body as { reason?: unknown }).reason;
  return { outcome, reason: typeof reason === "string" || reason === null ? reason : null };
}

function carriesCredentialKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value)) {
    if (/token|secret|password|service_role|ciphertext/i.test(key)) return true;
    if (carriesCredentialKey(child)) return true;
  }
  return false;
}
