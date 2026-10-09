import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { assertServerOnly } from "@/server/assertServerOnly";
import {
  readFirebaseServiceAccountConfig,
  type FirebaseServiceAccountConfig,
} from "@/server/pulseDispatch/config";
import { PulseDispatchError } from "@/server/pulseDispatch/errors";

type MessagingLike = {
  send: (message: {
    token: string;
    data: Record<string, string>;
    android?: { priority?: "normal" | "high" };
  }) => Promise<string>;
};

let cachedApp: App | null = null;
let cachedFingerprint: string | null = null;

function configFingerprint(config: FirebaseServiceAccountConfig): string {
  return `${config.projectId}\n${config.clientEmail}`;
}

/**
 * Lazily initialize Firebase Admin from FIREBASE_SERVICE_ACCOUNT_JSON.
 * Server-only. Never logs credential material.
 */
export function getFirebaseMessaging(
  env: Record<string, string | undefined> = process.env,
): MessagingLike {
  assertServerOnly("getFirebaseMessaging");
  const config = readFirebaseServiceAccountConfig(env);
  const fingerprint = configFingerprint(config);

  try {
    if (!cachedApp || cachedFingerprint !== fingerprint) {
      const existing = getApps()[0] ?? null;
      cachedApp =
        existing ??
        initializeApp({
          credential: cert({
            projectId: config.projectId,
            clientEmail: config.clientEmail,
            privateKey: config.privateKey,
          }),
          projectId: config.projectId,
        });
      cachedFingerprint = fingerprint;
    }

    return getMessaging(cachedApp) as unknown as MessagingLike;
  } catch (error) {
    if (error instanceof PulseDispatchError) throw error;
    throw new PulseDispatchError(
      "firebase_unavailable",
      "Firebase messaging is unavailable.",
    );
  }
}

/** Test seam: reset cached Admin app between cases. */
export function resetFirebaseAdminForTests(): void {
  cachedApp = null;
  cachedFingerprint = null;
}

export type { MessagingLike };
