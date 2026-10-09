/**
 * ORIENT-ANDROID-PULSE-BRIDGE-002
 *
 * Owner-scoped device push token registration contract.
 * Delivery transport only — not Pulse authority, temporal truth, acknowledgment,
 * urgency, or perception evidence.
 *
 * Android/Kotlin persistence is deferred. This module records the registration
 * semantics the future native client and hosted dispatcher must obey. It does not
 * talk to Supabase from the web runtime.
 */

export const DEVICE_PUSH_PLATFORM_ANDROID = "android" as const;

export type DevicePushPlatform = typeof DEVICE_PUSH_PLATFORM_ANDROID;

export type DevicePushToken = {
  id: string;
  userId: string;
  fcmToken: string;
  platform: DevicePushPlatform;
  /** Database-controlled refresh instant; not client-authored telemetry. */
  updatedAt: string;
};

export type RegisterDevicePushTokenInput = {
  userId: string;
  fcmToken: string;
  platform: DevicePushPlatform;
};

/**
 * True when the platform value is the only first-proof value (`android`).
 */
export function isAllowedDevicePushPlatform(
  platform: string,
): platform is DevicePushPlatform {
  return platform === DEVICE_PUSH_PLATFORM_ANDROID;
}

/**
 * Normalize a candidate FCM token for registration.
 * Empty / whitespace-only tokens are rejected.
 */
export function normalizeDevicePushToken(fcmToken: string): string | null {
  const trimmed = fcmToken.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Registration/refresh semantics for an authenticated owner.
 *
 * Convergence rules (schema-backed; no web writer yet):
 * 1. Caller must already be the authenticated `userId` (RLS WITH CHECK).
 * 2. `fcm_token` is globally unique — insert of another user's token fails closed.
 * 3. Ordinary clients cannot reassign a foreign-owned token (RLS blocks UPDATE;
 *    UNIQUE blocks INSERT takeover).
 * 4. Same owner refreshing the same token updates that row; `updated_at` is set
 *    by the database trigger, never trusted from the client.
 * 5. Same owner registering a new token inserts another row (multi-token OK for
 *    first proof). Logout/uninstall cleanup may DELETE own rows later.
 */
export function describeDevicePushTokenRegistration(): {
  ownerScoped: true;
  platform: DevicePushPlatform;
  tokenGloballyUnique: true;
  crossUserReassignment: "rejected";
  updatedAt: "database_controlled";
  webRuntimeWriter: "deferred";
} {
  return {
    ownerScoped: true,
    platform: DEVICE_PUSH_PLATFORM_ANDROID,
    tokenGloballyUnique: true,
    crossUserReassignment: "rejected",
    updatedAt: "database_controlled",
    webRuntimeWriter: "deferred",
  };
}

/**
 * Decide whether an authenticated upsert attempt is owner-safe given an existing
 * row for the same FCM token (if any). Used by future native registration logic
 * and contract tests — not a database writer.
 */
export function devicePushTokenRegistrationDecision(input: {
  actingUserId: string;
  fcmToken: string;
  existing: Pick<DevicePushToken, "userId" | "fcmToken"> | null;
}): "insert" | "refresh_own" | "reject_foreign_owner" | "reject_invalid_token" {
  const token = normalizeDevicePushToken(input.fcmToken);
  if (!token) {
    return "reject_invalid_token";
  }
  if (!input.existing) {
    return "insert";
  }
  if (input.existing.userId !== input.actingUserId) {
    return "reject_foreign_owner";
  }
  return "refresh_own";
}
