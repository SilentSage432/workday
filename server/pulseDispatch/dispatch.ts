import type { SupabaseClient } from "@supabase/supabase-js";
import { assertServerOnly } from "@/server/assertServerOnly";
import { ExternalCredentialError } from "@/server/credentials/errors";
import {
  getFirebaseMessaging,
  type MessagingLike,
} from "@/server/pulseDispatch/firebaseAdmin";
import { PulseDispatchError } from "@/server/pulseDispatch/errors";
import { createSupabaseServiceRoleClient } from "@/server/supabaseServiceRoleClient";

export type PulseDispatchTokenResult = {
  /** Truncated token fingerprint for ops — never the full FCM token. */
  tokenFingerprint: string;
  outcome: "sent" | "failed";
  errorCode?: string;
};

export type PulseDispatchResult = {
  pulseOccurrenceId: string;
  ownerUserId: string;
  status: "dispatched" | "partial" | "no_targets";
  tokenCount: number;
  sentCount: number;
  failedCount: number;
  results: readonly PulseDispatchTokenResult[];
};

type OccurrenceRow = {
  id: string;
  user_id: string;
};

type TokenRow = {
  fcm_token: string;
  platform: string;
};

function tokenFingerprint(token: string): string {
  if (token.length <= 12) return "***";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

function classifySendError(error: unknown): string {
  if (!error || typeof error !== "object") return "send_failed";
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && code.trim().length > 0) {
    // Keep Firebase error codes; never include message bodies that may echo tokens.
    return code.slice(0, 120);
  }
  return "send_failed";
}

async function loadOccurrence(
  admin: SupabaseClient,
  pulseOccurrenceId: string,
): Promise<OccurrenceRow> {
  const { data, error } = await admin
    .from("pulse_occurrences")
    .select("id, user_id")
    .eq("id", pulseOccurrenceId)
    .maybeSingle();

  if (error) {
    throw new PulseDispatchError(
      "service_role_unavailable",
      "Could not read Pulse occurrence for dispatch.",
    );
  }
  if (!data || typeof data.id !== "string" || typeof data.user_id !== "string") {
    throw new PulseDispatchError(
      "occurrence_not_found",
      "Pulse occurrence was not found.",
    );
  }
  return { id: data.id, user_id: data.user_id };
}

async function loadOwnerTokens(
  admin: SupabaseClient,
  ownerUserId: string,
): Promise<TokenRow[]> {
  const { data, error } = await admin
    .from("orient_device_push_tokens")
    .select("fcm_token, platform")
    .eq("user_id", ownerUserId)
    .eq("platform", "android");

  if (error) {
    throw new PulseDispatchError(
      "service_role_unavailable",
      "Could not read device push tokens for dispatch.",
    );
  }

  return (data ?? []).filter(
    (row): row is TokenRow =>
      !!row &&
      typeof row.fcm_token === "string" &&
      row.fcm_token.trim().length > 0 &&
      row.platform === "android",
  );
}

async function defaultSend(
  messaging: MessagingLike,
  token: string,
  pulseOccurrenceId: string,
): Promise<void> {
  await messaging.send({
    token,
    data: {
      pulse_occurrence_id: pulseOccurrenceId,
    },
    android: {
      // Closed-app wake path on Android; does not encode urgency semantics.
      priority: "high",
    },
  });
}

/**
 * Transport an already-durable pulse_occurrence identity to owner Android FCM tokens.
 *
 * Does not create/mutate occurrences, grants, or temporal truth.
 * Does not delete stale tokens (service_role is SELECT-only on the token table).
 * Duplicate invocation is allowed; Android local dedupe remains the perception edge.
 */
export async function dispatchPulseOccurrence(input: {
  pulseOccurrenceId: string;
  admin?: SupabaseClient;
  messaging?: MessagingLike;
  sendToToken?: (
    token: string,
    pulseOccurrenceId: string,
  ) => Promise<void>;
}): Promise<PulseDispatchResult> {
  assertServerOnly("dispatchPulseOccurrence");

  let admin: SupabaseClient;
  try {
    admin = input.admin ?? createSupabaseServiceRoleClient();
  } catch (error) {
    if (error instanceof ExternalCredentialError) {
      throw new PulseDispatchError(
        "service_role_unavailable",
        "Supabase service-role access is not configured for Pulse dispatch.",
      );
    }
    throw error;
  }

  const occurrence = await loadOccurrence(admin, input.pulseOccurrenceId);
  const tokens = await loadOwnerTokens(admin, occurrence.user_id);

  if (tokens.length === 0) {
    return {
      pulseOccurrenceId: occurrence.id,
      ownerUserId: occurrence.user_id,
      status: "no_targets",
      tokenCount: 0,
      sentCount: 0,
      failedCount: 0,
      results: [],
    };
  }

  const send =
    input.sendToToken ??
    (async (token: string, pulseOccurrenceId: string) => {
      const messaging = input.messaging ?? getFirebaseMessaging();
      await defaultSend(messaging, token, pulseOccurrenceId);
    });

  const results: PulseDispatchTokenResult[] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const row of tokens) {
    try {
      await send(row.fcm_token, occurrence.id);
      sentCount += 1;
      results.push({
        tokenFingerprint: tokenFingerprint(row.fcm_token),
        outcome: "sent",
      });
    } catch (error) {
      failedCount += 1;
      results.push({
        tokenFingerprint: tokenFingerprint(row.fcm_token),
        outcome: "failed",
        errorCode: classifySendError(error),
      });
    }
  }

  // Transport outcomes never mutate Pulse occurrence truth.
  return {
    pulseOccurrenceId: occurrence.id,
    ownerUserId: occurrence.user_id,
    status: failedCount === 0 ? "dispatched" : "partial",
    tokenCount: tokens.length,
    sentCount,
    failedCount,
    results,
  };
}
