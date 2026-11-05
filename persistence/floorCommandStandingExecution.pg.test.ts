import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const REGRESSION = join(ROOT, "scripts/floor-command-standing-execution-regression.sh");

describe("standing floor command execution sequencing", () => {
  it(
    "proves claim → revalidate → attempt → governed classify → link without network",
    () => {
      expect(existsSync(REGRESSION)).toBe(true);
      const out = execFileSync("bash", [REGRESSION], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 180_000,
        env: process.env,
      });
      expect(out).toContain("STANDING_EXECUTION_HAPPY_PATH_OK");
      expect(out).toContain("STANDING_EXECUTION_REVOKE_BEFORE_ATTEMPT_OK");
      expect(out).toContain("STANDING_EXECUTION_REVOKE_AFTER_ATTEMPT_OK");
      expect(out).toContain("STANDING_EXECUTION_GATE_DISABLED_OK");
      expect(out).toContain("STANDING_EXECUTION_SECURITY_OK");
      expect(out).toContain("STANDING_EXECUTION_CONCURRENT_CLAIM_OK");
      expect(out).toContain("STANDING_EXECUTION_REGRESSION_OK");
    },
    180_000,
  );
});
