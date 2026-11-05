import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const REGRESSION = join(ROOT, "scripts/floor-command-standing-opportunity-claim-regression.sh");

describe("standing floor command opportunity claims", () => {
  it(
    "atomically consumes one opportunity without observing on an ephemeral database",
    () => {
      expect(existsSync(REGRESSION)).toBe(true);
      const out = execFileSync("bash", [REGRESSION], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 180_000,
        env: process.env,
      });
      expect(out).toContain("UNAUTHORIZED_OR_GATE_OK");
      expect(out).toContain("CLAIM_PREDICATE_OK");
      expect(out).toContain("RECONCILIATION_OK");
      expect(out).toContain("ROLLBACK_AND_DURABILITY_OK");
      expect(out).toContain("REVOCATION_EXPIRY_OK");
      expect(out).toContain("SECURITY_OK");
      expect(out).toContain("CONCURRENT_CLAIM_OK");
      expect(out).toContain("REVOKE_RACE_OK");
      expect(out).toContain("NO_OBSERVATION_SIDE_EFFECT_OK");
      expect(out).toContain("STANDING_OPPORTUNITY_CLAIM_OK");
      expect(out).toContain("OPPORTUNITY_CLAIM_CORE_OK");
    },
    180_000,
  );
});
