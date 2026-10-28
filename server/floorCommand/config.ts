import { assertServerOnly } from "@/server/assertServerOnly";
import { floorCommandStoreIdentity } from "@/domain/floorCommandObservation";

export const FLOOR_COMMAND_READ_TOKEN_ENV = "ORIENT_FLOOR_COMMAND_READ_TOKEN";
export const FLOOR_COMMAND_STORE_NUMBER_ENV = "ORIENT_FLOOR_COMMAND_STORE_NUMBER";
export const FLOOR_COMMAND_BASE_URL_ENV = "ORIENT_FLOOR_COMMAND_BASE_URL";
export const FLOOR_COMMAND_PULL_ENABLED_ENV = "ORIENT_FLOOR_COMMAND_PULL_ENABLED";

/** Exact Floor Command production host. Any other spelling is refused. */
export const FLOOR_COMMAND_PRODUCTION_HOST = "deptsync-hub.vercel.app";

export const FLOOR_COMMAND_PULL_TIMEOUT_MS = 8_000;

type EnvMap = Record<string, string | undefined>;

export type FloorCommandConnectionConfiguration =
  | { status: "unconfigured" }
  | { status: "configured"; storeNumber: string; pullEnabled: boolean; baseUrl: string };

/**
 * Server configuration for one read credential.
 * The returned value never includes the bearer.
 * A missing token, store, or usable base URL is unconfigured.
 * The pull stays off unless the enable flag is exactly "1".
 */
export function describeFloorCommandConnection(
  env: EnvMap = process.env,
): FloorCommandConnectionConfiguration {
  assertServerOnly("describeFloorCommandConnection");
  const token = env[FLOOR_COMMAND_READ_TOKEN_ENV]?.trim() ?? "";
  const storeNumber = floorCommandStoreIdentity(env[FLOOR_COMMAND_STORE_NUMBER_ENV]);
  const baseUrl = usableBaseUrl(env[FLOOR_COMMAND_BASE_URL_ENV]);
  if (!token || !storeNumber || !baseUrl) return { status: "unconfigured" };
  return {
    status: "configured",
    storeNumber,
    pullEnabled: env[FLOOR_COMMAND_PULL_ENABLED_ENV]?.trim() === "1",
    baseUrl,
  };
}

/** Reads the bearer for a server request. Callers must not log or return it. */
export function readFloorCommandReadToken(env: EnvMap = process.env): string | null {
  assertServerOnly("readFloorCommandReadToken");
  const token = env[FLOOR_COMMAND_READ_TOKEN_ENV]?.trim() ?? "";
  return token || null;
}

function usableBaseUrl(value: string | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const hostname = url.hostname.toLowerCase();
  if (hostname === FLOOR_COMMAND_PRODUCTION_HOST) {
    if (url.protocol !== "https:" || url.port !== "") return null;
    return url.origin;
  }
  if (isFloorCommandHostLookalike(hostname)) return null;
  const local = hostname === "127.0.0.1" || hostname === "localhost";
  if (!local && url.port !== "") return null;
  if (url.protocol === "https:" || (url.protocol === "http:" && local)) {
    return url.origin;
  }
  return null;
}

function isFloorCommandHostLookalike(hostname: string): boolean {
  return hostname.endsWith(".vercel.app") || hostname.includes("deptsync-hub");
}
