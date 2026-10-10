import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CORRECTION = join(
  ROOT,
  "supabase/migrations/20261010154000_pulse_hosted_evaluator_ambiguity_correction.sql",
);
const HISTORICAL = join(
  ROOT,
  "supabase/migrations/20261010093000_pulse_block_start_authority.sql",
);
const REGRESSION = join(
  ROOT,
  "scripts/pulse-hosted-evaluator-ambiguity-regression.sh",
);

describe("ORIENT-PULSE-AUTHORITY-004 hosted evaluator ambiguity correction", () => {
  it("keeps historical migration immutable and qualifies PL/pgSQL variables in the forward repair", () => {
    const historical = readFileSync(HISTORICAL, "utf8");
    const correction = readFileSync(CORRECTION, "utf8");

    expect(historical).toContain("and po.source_starts_on = source_starts_on");
    expect(historical).toContain("and po.source_start_local = source_start_local");

    expect(correction).toContain("ORIENT-PULSE-AUTHORITY-004");
    expect(correction).toContain("v_source_starts_on date");
    expect(correction).toContain("v_source_start_local time");
    expect(correction).toContain("po.source_starts_on = v_source_starts_on");
    expect(correction).toContain("po.source_start_local = v_source_start_local");
    expect(correction).toContain("on conflict (grant_id, source_starts_on, source_start_local) do nothing");
    expect(correction).toContain("g.source_kind = 'block'");
    expect(correction).toContain("g.source_kind = 'commitment'");
    expect(correction).not.toMatch(/and po\.source_starts_on = source_starts_on\b/);
    expect(correction).not.toMatch(/notification|vibrate|wear|push|kotlin|fcm/i);
    expect(correction).not.toMatch(/cron\.schedule|alter table public\.pulse_/i);
  });

  it(
    "executes PostgreSQL regression: reproduce ambiguity, then Block+Commitment exactly-once",
    () => {
      expect(existsSync(REGRESSION)).toBe(true);
      const out = execFileSync("bash", [REGRESSION], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 120_000,
        env: process.env,
      });
      expect(out).toContain("REPRODUCED_AMBIGUOUS_AT_EXECUTION");
      expect(out).toContain("BLOCK_ESTABLISHED_OK");
      expect(out).toContain("BLOCK_SECOND_NO_DUPLICATE_OK");
      expect(out).toContain("COMMITMENT_ESTABLISHED_OK");
      expect(out).toContain("COMMITMENT_SECOND_NO_DUPLICATE_OK");
      expect(out).toContain("ORIENT-PULSE-HOSTED-EVALUATOR-AMBIGUITY-REGRESSION-CLEAR");
    },
    120_000,
  );
});
