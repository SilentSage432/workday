import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const REGRESSION = join(ROOT, "scripts/floor-command-standing-policy-regression.sh");

describe("standing floor command observation policy", () => {
  it(
    "keeps the grant inert on an ephemeral database",
    () => {
      expect(existsSync(REGRESSION)).toBe(true);
      const out = execFileSync("bash", [REGRESSION], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 180_000,
        env: process.env,
      });
      expect(out).toContain("UNAUTHORIZED_POLICY_OK");
      expect(out).toContain("INVALID_SCOPE_OK");
      expect(out).toContain("APPROVAL_EXPLICIT_OK");
      expect(out).toContain("REVOKE_DURABLE_OK");
      expect(out).toContain("SCOPE_FROZEN_OK");
      expect(out).toContain("NO_OBSERVATION_REQUEST_OK");
      expect(out).toContain("NO_SOURCE_READ_OK");
      expect(out).toContain("WINDOWS_LOCAL_OK");
      expect(out).toContain("EXPIRE_TERMINAL_OK");
      expect(out).toContain("CONCURRENT_POLICY_OK");
      expect(out).toContain("STANDING_POLICY_OK");
    },
    180_000,
  );
});
