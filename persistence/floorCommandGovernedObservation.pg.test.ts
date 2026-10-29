import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const REGRESSION = join(ROOT, "scripts/floor-command-governed-observation-regression.sh");

describe("governed floor command observation persistence", () => {
  it(
    "executes the ephemeral PostgreSQL lifecycle",
    () => {
      expect(existsSync(REGRESSION)).toBe(true);
      const out = execFileSync("bash", [REGRESSION], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 180_000,
        env: process.env,
      });
      expect(out).toContain("ONE_SHOT_PRESERVED_OK");
      expect(out).toContain("FIRST_PUBLISHED_OK");
      expect(out).toContain("UNCHANGED_OK");
      expect(out).toContain("REVISED_HISTORY_OK");
      expect(out).toContain("UNPUBLISHED_REJECTED_OK");
      expect(out).toContain("SEQUENCE_REGRESSION_OK");
      expect(out).toContain("SEQUENCE_CONFLICT_OK");
      expect(out).toContain("FAILURE_PRESERVED_OK");
      expect(out).toContain("CLAIM_FENCE_OK");
      expect(out).toContain("UNAUTHORIZED_SQL_OK");
      expect(out).toContain("CONCURRENT_REQUESTS_OK");
      expect(out).toContain("GOVERNED_OBSERVATION_OK");
    },
    180_000,
  );
});
