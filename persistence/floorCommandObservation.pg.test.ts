import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const REGRESSION = join(ROOT, "scripts/floor-command-observation-persistence-regression.sh");

describe("floor command observation persistence regression", () => {
  it(
    "executes the ephemeral PostgreSQL lifecycle",
    () => {
      expect(existsSync(REGRESSION)).toBe(true);
      const out = execFileSync("bash", [REGRESSION], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 120_000,
        env: process.env,
      });
      expect(out).toContain("APPROVAL_OK");
      expect(out).toContain("FIRST_SNAPSHOT_OK");
      expect(out).toContain("REPLAY_OK");
      expect(out).toContain("NEW_REVISION_OK");
      expect(out).toContain("OLDER_REJECTED_OK");
      expect(out).toContain("UNTIMED_AFTER_TIMED_REJECTED_OK");
      expect(out).toContain("EQUAL_TIMESTAMP_APPLIED_OK");
      expect(out).toContain("UNTIMED_RETAINED_AMBIGUOUS_OK");
      expect(out).toContain("FAILURE_WITHOUT_SNAPSHOT_OK");
      expect(out).toContain("FAILURE_KEEPS_SNAPSHOT_OK");
      expect(out).toContain("DISMISSAL_OK");
      expect(out).toContain("DISMISSAL_NOT_COMPLETION_OK");
      expect(out).toContain("NEW_REVISION_AFTER_DISMISSAL_OK");
      expect(out).toContain("STORE_ISOLATION_OK");
      expect(out).toContain("CROSS_STORE_REJECTED_OK");
      expect(out).toContain("ISO_WEEK_OK");
      expect(out).toContain("CLEARED_HISTORY_OK");
      expect(out).toContain("AUTHENTICATED_WRITE_FORBIDDEN_OK");
      expect(out).toContain("CREDENTIAL_REJECTED_OK");
    expect(out).toContain("NO_PERSONAL_TABLES_OK");
    expect(out).toContain("SEQUENCE_ZERO_TO_PUBLISHED_OK");
    expect(out).toContain("SEQUENCE_REPLAY_CONFLICT_OLDER_OK");
    expect(out).toContain("SEQUENCE_DELETE_AND_WITHHELD_OK");
    expect(out).toContain("SEQUENCE_DISMISSAL_KEPT_OK");
    expect(out).toContain("ORIENT-FLOOR-COMMAND-003-PERSISTENCE-CLEAR");
    },
    120_000,
  );
});
