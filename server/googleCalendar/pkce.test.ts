import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateOAuthState, generatePkceVerifier, pkceS256Challenge } from "@/server/googleCalendar/pkce";

describe("Google OAuth PKCE", () => {
  it("derives the RFC 7636 S256 challenge", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const expected = createHash("sha256")
      .update(verifier, "ascii")
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(pkceS256Challenge(verifier)).toBe(expected);
  });

  it("generates unpredictable state and verifier material", () => {
    const states = new Set(Array.from({ length: 20 }, () => generateOAuthState()));
    const verifiers = new Set(Array.from({ length: 20 }, () => generatePkceVerifier()));
    expect(states.size).toBe(20);
    expect(verifiers.size).toBe(20);
    for (const state of states) expect(state.length).toBeGreaterThanOrEqual(32);
    for (const verifier of verifiers) expect(verifier.length).toBeGreaterThanOrEqual(43);
  });
});
