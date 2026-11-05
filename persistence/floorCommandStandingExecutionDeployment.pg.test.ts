import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const COMPAT = join(ROOT, "scripts/floor-command-standing-execution-deployment-compatibility.sh");

describe("standing execution dark deployment compatibility", () => {
  it(
    "upgrades from the 20261103160000 baseline without enabling execution",
    () => {
      expect(existsSync(COMPAT)).toBe(true);
      const out = execFileSync("bash", [COMPAT], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 180_000,
        env: process.env,
      });
      expect(out).toContain("UPGRADE_BASELINE_PRESERVED_OK");
      expect(out).toContain("LINK_PRIVILEGE_OK");
      expect(out).toContain("HARDEN_PRIVILEGE_OK");
      expect(out).toContain("GATE_INDEPENDENT_APPROVAL_OK");
      expect(out).toContain("OUT_OF_ORDER_RPC_REFUSED_OK");
      expect(out).toContain("LINK_REAPPLY_IDEMPOTENT_OK");
      expect(out).toContain("HARDEN_REAPPLY_IDEMPOTENT_OK");
      expect(out).toContain("NO_NETWORK_IN_STANDING_FUNCS_OK");
      expect(out).toContain("TEMPORAL_UNCHANGED_OK");
      expect(out).toContain("STANDING_EXECUTION_DEPLOY_COMPAT_OK");
    },
    180_000,
  );

  it("keeps standing execution unreachable from app routes and policy modules", () => {
    const root = join(ROOT, "app/api/integrations/floor-command");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".ts")) files.push(path);
      }
    };
    walk(root);
    const inspectRoute = join(root, "standing-opportunity/inspect/route.ts");
    expect(files).toContain(inspectRoute);
    for (const path of files) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toContain("executeStandingFloorCommandObservation");
      expect(source).not.toContain("createFakeStandingSource");
      expect(source).not.toContain("link_floor_command_standing_opportunity_observation");
      expect(source).not.toContain("record_floor_command_standing_opportunity_source_attempt");
      expect(source).not.toContain("claim_floor_command_standing_opportunity");
      if (path === inspectRoute) {
        expect(source).toContain("handleStandingOpportunityInspectPost");
        expect(source).not.toContain("inspect_floor_command_standing_opportunity");
      } else {
        expect(source).not.toContain("inspectStandingFloorCommandOpportunity");
        expect(source).not.toContain("handleStandingOpportunityInspectPost");
        expect(source).not.toContain("inspect_floor_command_standing_opportunity");
      }
    }
    const policy = readFileSync(join(ROOT, "server/floorCommand/standingPolicy.ts"), "utf8");
    const policyRoute = readFileSync(join(ROOT, "server/floorCommand/standingPolicyRoute.ts"), "utf8");
    const governed = readFileSync(join(ROOT, "server/floorCommand/governedObservation.ts"), "utf8");
    for (const source of [policy, policyRoute, governed]) {
      expect(source).not.toContain("executeStandingFloorCommandObservation");
      expect(source).not.toContain("inspectStandingFloorCommandOpportunity");
      expect(source).not.toContain("createFakeStandingSource");
      expect(source).not.toContain("standingSourceAdapter");
    }
    expect(existsSync(join(ROOT, "vercel.json"))).toBe(false);
    expect(
      existsSync(join(ROOT, "server/floorCommand/standingUnattendedEvaluateRoute.ts")),
    ).toBe(true);
    expect(
      files.some((path) => path.includes(`${join("standing-opportunity", "evaluate")}`)),
    ).toBe(false);
    for (const path of files) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toContain("handleStandingOpportunityEvaluateGet");
      expect(source).not.toContain("handleStandingOpportunityEvaluatePost");
      expect(source).not.toContain("evaluateStandingOpportunityUnattended");
    }
  });
});
