import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const REGRESSION = join(ROOT, "scripts/floor-command-standing-window-a-and-inspect-regression.sh");

describe("standing Window-A hardening and inspection", () => {
  it(
    "proves atomic attempt reauthorization and non-consuming inspection",
    () => {
      expect(existsSync(REGRESSION)).toBe(true);
      const out = execFileSync("bash", [REGRESSION], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 240_000,
        env: process.env,
      });
      expect(out).toContain("WINDOW_A_REVOKE_AFTER_REVALIDATE_OK");
      expect(out).toContain("WINDOW_A_GATE_DISABLE_AFTER_REVALIDATE_OK");
      expect(out).toContain("WINDOW_A_OUTSIDE_WINDOW_OK");
      expect(out).toContain("WINDOW_A_AT_MOST_ONCE_OK");
      expect(out).toContain("INSPECT_NON_CONSUMING_OK");
      expect(out).toContain("WINDOW_A_CONCURRENT_REVOKE_LINEARIZATION_OK");
      expect(out).toContain("WINDOW_A_CONCURRENT_GATE_LINEARIZATION_OK");
      expect(out).toContain("WINDOW_A_CONCURRENT_DUPLICATE_ATTEMPT_OK");
      expect(out).toContain("STANDING_WINDOW_A_AND_INSPECT_REGRESSION_OK");
    },
    240_000,
  );
});
