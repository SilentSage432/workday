import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const REGRESSION = join(ROOT, "scripts/floor-command-standing-policy-deployment-compatibility.sh");

describe("standing policy deployment compatibility", () => {
  it(
    "preserves the recorded ledger and keeps the grant inert",
    () => {
      expect(existsSync(REGRESSION)).toBe(true);
      const out = execFileSync("bash", [REGRESSION], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 180_000,
        env: process.env,
      });
      expect(out).toContain("LEDGER_BEFORE_OK");
      expect(out).toContain("MIGRATION_ONCE_OK");
      expect(out).toContain("LEDGER_PRESERVED_OK");
      expect(out).toContain("LIFECYCLE_INERT_OK");
      expect(out).toContain("WINDOWS_DENVER_OK");
      expect(out).toContain("EXISTING_FUNCTIONS_UNCHANGED_OK");
      expect(out).toContain("DIRECT_WRITE_REFUSED_OK");
      expect(out).toContain("SECOND_APPLY_STOPPED_OK");
      expect(out).toContain("FAILED_TRANSACTION_ROLLED_BACK_OK");
      expect(out).toContain("DEPLOYMENT_COMPATIBILITY_OK");
    },
    180_000,
  );
});
