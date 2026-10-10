import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CORRECTION = join(
  ROOT,
  "supabase/migrations/20261010170000_pulse_interrupt_grants_source_delete_authority.sql",
);
const HISTORICAL = join(
  ROOT,
  "supabase/migrations/20261010093000_pulse_block_start_authority.sql",
);
const REGRESSION = join(
  ROOT,
  "scripts/pulse-source-deletion-authority-regression.sh",
);

describe("ORIENT-PULSE-LIFECYCLE-002 source deletion authority correction", () => {
  it("keeps historical cascade INVOKER immutable and hardens the forward DEFINER repair", () => {
    const historical = readFileSync(HISTORICAL, "utf8");
    const correction = readFileSync(CORRECTION, "utf8");

    expect(historical).toContain("pulse_interrupt_grants_cascade_source_delete");
    const historicalCascade = historical.match(
      /create or replace function public\.pulse_interrupt_grants_cascade_source_delete\(\)([\s\S]*?)\n\$\$;/,
    );
    expect(historicalCascade?.[1]).toBeTruthy();
    expect(historicalCascade?.[1]).toMatch(/language plpgsql/);
    expect(historicalCascade?.[1]).not.toMatch(/security definer/i);
    expect(historicalCascade?.[1]).not.toMatch(/set search_path/i);

    expect(correction).toContain("ORIENT-PULSE-LIFECYCLE-002");
    expect(correction).toContain("security definer");
    expect(correction).toContain("set search_path = public");
    expect(correction).toContain("delete from public.pulse_interrupt_grants");
    expect(correction).toContain("source_kind = tg_argv[0]");
    expect(correction).toContain("source_id = old.id");
    expect(correction).toContain("user_id = old.user_id");
    expect(correction).toContain("tg_argv[0] is distinct from 'commitment'");
    expect(correction).toContain("tg_argv[0] is distinct from 'block'");
    expect(correction).toContain(
      "revoke all on function public.pulse_interrupt_grants_cascade_source_delete()",
    );
    expect(correction).toContain(
      "grant execute on function public.pulse_interrupt_grants_cascade_source_delete()",
    );
    expect(correction).toContain("to authenticated");
    expect(correction).not.toMatch(/grant delete on table public\.pulse_interrupt_grants/i);
    expect(correction).not.toMatch(/for delete/i);
    expect(correction).not.toMatch(/drop trigger/i);
    expect(correction).not.toMatch(/notification|vibrate|wear|push|kotlin|fcm/i);
  });

  it(
    "executes PostgreSQL regression: INVOKER 42501, then DEFINER source-delete lifecycle",
    () => {
      expect(existsSync(REGRESSION)).toBe(true);
      const out = execFileSync("bash", [REGRESSION], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 120_000,
        env: process.env,
      });
      expect(out).toContain("REPRODUCED_INVOKER_42501");
      expect(out).toContain("TRIGGERS_PRESERVED_OK");
      expect(out).toContain("COMMITMENT_SOURCE_DELETE_OK");
      expect(out).toContain("CROSS_SOURCE_AND_USER_ISOLATION_AFTER_COMMITMENT_OK");
      expect(out).toContain("BLOCK_SOURCE_DELETE_OK");
      expect(out).toContain("CROSS_USER_ISOLATION_AFTER_BLOCK_OK");
      expect(out).toContain("SOFT_REVOKE_OK");
      expect(out).toContain("DIRECT_GRANT_DELETE_FORBIDDEN_OK");
      expect(out).toContain("EXECUTE_POSTURE_OK");
      expect(out).toContain("ORIENT-PULSE-SOURCE-DELETION-AUTHORITY-REGRESSION-CLEAR");
    },
    120_000,
  );
});
