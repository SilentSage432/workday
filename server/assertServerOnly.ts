/**
 * Runtime guard against accidental browser execution of privileged modules.
 * Prefer importing only from server Route Handlers / server modules.
 * Architectural tests also assert client code does not import `server/**`.
 */
export function assertServerOnly(moduleLabel: string): void {
  if (typeof window !== "undefined") {
    throw new Error(`${moduleLabel} is server-only and must not run in the browser.`);
  }
}
