import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MIGRATION = join(
  ROOT,
  "supabase/migrations/20261010200000_pulse_authorized_temporal_relationships.sql",
);
const REGRESSION = join(
  ROOT,
  "scripts/pulse-arrival-relationship-foundation-regression.sh",
);

describe("ORIENT-PULSE-EXPRESSION-005-I arrival relationship foundation", () => {
  it("evolves grants/occurrences/evaluator with explicit relationship identity", () => {
    expect(existsSync(MIGRATION)).toBe(true);
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("ORIENT-PULSE-EXPRESSION-005-I");
    expect(sql).toContain("relationship");
    expect(sql).toContain("relative_before");
    expect(sql).toContain("arrival");
    expect(sql).toContain("pulse_interrupt_grants_relationship_lead");
    expect(sql).toContain("pulse_interrupt_grants_one_active_idx");
    expect(sql).toContain("relationship");
    expect(sql).toContain("threshold_at := source_start_at - make_interval(secs => g.lead_offset_seconds)");
    expect(sql).toContain("threshold_at := source_start_at");
    expect(sql).toContain("v_relationship");
    expect(sql).toContain("v_source_starts_on");
    expect(sql).toContain("on conflict (grant_id, source_starts_on, source_start_local) do nothing");
    expect(sql).not.toMatch(/add constraint blocks_id_user_key/i);
    expect(sql).not.toMatch(/grant delete on table public\.pulse_interrupt_grants/i);
    expect(sql).not.toMatch(/for delete/i);
    expect(sql).not.toMatch(/notification|vibrate|wear|push|kotlin|fcm/i);
    expect(sql).not.toMatch(/approach/i);
    // Cleanup left to LIFECYCLE-003 DEFINER function — do not recreate INVOKER path.
    expect(sql).not.toContain("create or replace function public.pulse_interrupt_grants_cascade_source_delete");
  });

  it(
    "executes PostgreSQL regression for relationship constraints, evaluator, lifecycle",
    () => {
      expect(existsSync(REGRESSION)).toBe(true);
      const out = execFileSync("bash", [REGRESSION], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 180_000,
        env: process.env,
      });
      expect(out).toContain("MIGRATION_BACKFILL_RELATIVE_BEFORE_ONLY_OK");
      expect(out).toContain("RELATIVE_BEFORE_VALID_OK");
      expect(out).toContain("ARRIVAL_NULL_LEAD_OK");
      expect(out).toContain("DUAL_ACTIVE_RELATIONSHIPS_OK");
      expect(out).toContain("INDEPENDENT_REVOKE_OK");
      expect(out).toContain("CROSS_USER_ISOLATION_OK");
      expect(out).toContain("COMMITMENT_RELATIVE_BEFORE_ESTABLISHED_OK");
      expect(out).toContain("RELATIVE_BEFORE_THRESHOLD_T_MINUS_L_OK");
      expect(out).toContain("RELATIVE_BEFORE_RERUN_NO_DUPLICATE_OK");
      expect(out).toContain("COMMITMENT_ARRIVAL_ESTABLISHED_OK");
      expect(out).toContain("ARRIVAL_THRESHOLD_T_OK");
      expect(out).toContain("ARRIVAL_RERUN_NO_DUPLICATE_OK");
      expect(out).toContain("BLOCK_RELATIVE_BEFORE_ESTABLISHED_OK");
      expect(out).toContain("BLOCK_ARRIVAL_ESTABLISHED_OK");
      expect(out).toContain("RESCHEDULE_RELATIVE_BEFORE_FOLLOWS_LIVE_T_OK");
      expect(out).toContain("RESCHEDULE_ARRIVAL_FOLLOWS_LIVE_T_OK");
      expect(out).toContain("SOURCE_DELETE_BOTH_RELATIONSHIPS_OCCURRENCES_RETAINED_OK");
      expect(out).toContain("DIRECT_GRANT_DELETE_FORBIDDEN_OK");
      expect(out).toContain("ORIENT-PULSE-ARRIVAL-RELATIONSHIP-FOUNDATION-REGRESSION-CLEAR");
    },
    180_000,
  );
});
