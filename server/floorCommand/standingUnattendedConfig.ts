/**
 * Unattended standing-evaluation configuration (RELEASE-046; Vercel Cron align in 048).
 * Scheduler credential authorizes wake identity only — never observation.
 *
 * Uses Vercel's documented `CRON_SECRET` env and Authorization Bearer delivery.
 */
import { assertServerOnly } from "@/server/assertServerOnly";

/** Vercel Cron shared secret. Must be configured for scheduler wakes to proceed. */
export const ORIENT_FLOOR_COMMAND_STANDING_CRON_SECRET_ENV = "CRON_SECRET" as const;

/**
 * Legacy custom header from RELEASE-046. Must never authenticate a wake after
 * RELEASE-048; retained only so isolation tests can prove rejection.
 */
export const STANDING_CRON_SECRET_HEADER = "x-orient-floor-command-standing-cron-secret" as const;

type EnvMap = Record<string, string | undefined>;

export type StandingCronSecretRead =
  | { status: "configured"; secret: string }
  | { status: "unconfigured" };

/**
 * Reads the standing cron secret. Empty/missing → unconfigured (fail closed).
 * Does not throw; callers must refuse wakes when unconfigured.
 */
export function readStandingCronSecret(env: EnvMap = process.env): StandingCronSecretRead {
  assertServerOnly("readStandingCronSecret");
  const value = env[ORIENT_FLOOR_COMMAND_STANDING_CRON_SECRET_ENV];
  if (!value || value.trim().length === 0) return { status: "unconfigured" };
  return { status: "configured", secret: value };
}
