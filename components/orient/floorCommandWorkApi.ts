import { getSupabaseBrowserClient } from "@/persistence/supabaseBrowserClient";
import {
  isFloorCommandWorkReading,
  type FloorCommandWorkReading,
} from "@/projections/floorCommandWorkPresentation";

const OBSERVATION_PATH = "/api/integrations/floor-command/observation";

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

function carriesCredentialKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value)) {
    if (/token|secret|password|service_role|ciphertext/i.test(key)) return true;
    if (carriesCredentialKey(child)) return true;
  }
  return false;
}
