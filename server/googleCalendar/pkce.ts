import { createHash, randomBytes } from "node:crypto";
import { assertServerOnly } from "@/server/assertServerOnly";

const VERIFIER_BYTES = 32;

/** RFC 7636 unreserved character encoding for PKCE. */
function base64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generatePkceVerifier(): string {
  assertServerOnly("generatePkceVerifier");
  return base64Url(randomBytes(VERIFIER_BYTES));
}

export function pkceS256Challenge(verifier: string): string {
  assertServerOnly("pkceS256Challenge");
  return base64Url(createHash("sha256").update(verifier, "ascii").digest());
}

export function generateOAuthState(): string {
  assertServerOnly("generateOAuthState");
  return base64Url(randomBytes(32));
}
