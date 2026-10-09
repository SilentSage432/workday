import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEVICE_PUSH_PLATFORM_ANDROID,
  describeDevicePushTokenRegistration,
  devicePushTokenRegistrationDecision,
  isAllowedDevicePushPlatform,
  normalizeDevicePushToken,
} from "@/domain/devicePushToken";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261009120000_orient_device_push_tokens.sql",
);

const PULSE_START = join(
  process.cwd(),
  "supabase/migrations/20261008230000_pulse_commitment_start.sql",
);

const PULSE_HOSTED = join(
  process.cwd(),
  "supabase/migrations/20261008240000_pulse_hosted_establishment.sql",
);

describe("device push token registration contract", () => {
  it("allows only android and rejects empty tokens", () => {
    expect(isAllowedDevicePushPlatform("android")).toBe(true);
    expect(isAllowedDevicePushPlatform(DEVICE_PUSH_PLATFORM_ANDROID)).toBe(true);
    expect(isAllowedDevicePushPlatform("ios")).toBe(false);
    expect(isAllowedDevicePushPlatform("wear")).toBe(false);
    expect(normalizeDevicePushToken("  abc  ")).toBe("abc");
    expect(normalizeDevicePushToken("   ")).toBeNull();
  });

  it("records deferred web writer and closed cross-user reassignment", () => {
    expect(describeDevicePushTokenRegistration()).toEqual({
      ownerScoped: true,
      platform: "android",
      tokenGloballyUnique: true,
      crossUserReassignment: "rejected",
      updatedAt: "database_controlled",
      webRuntimeWriter: "deferred",
    });
  });

  it("converges insert/refresh for owner and rejects foreign token ownership", () => {
    const user = "11111111-1111-1111-1111-111111111111";
    const other = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const token = "fcm-token-1";

    expect(
      devicePushTokenRegistrationDecision({
        actingUserId: user,
        fcmToken: token,
        existing: null,
      }),
    ).toBe("insert");

    expect(
      devicePushTokenRegistrationDecision({
        actingUserId: user,
        fcmToken: token,
        existing: { userId: user, fcmToken: token },
      }),
    ).toBe("refresh_own");

    expect(
      devicePushTokenRegistrationDecision({
        actingUserId: user,
        fcmToken: token,
        existing: { userId: other, fcmToken: token },
      }),
    ).toBe("reject_foreign_owner");

    expect(
      devicePushTokenRegistrationDecision({
        actingUserId: user,
        fcmToken: "   ",
        existing: null,
      }),
    ).toBe("reject_invalid_token");
  });
});

describe("orient_device_push_tokens migration contract", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("defines the minimum owner-scoped token table", () => {
    expect(sql).toContain("create table public.orient_device_push_tokens");
    expect(sql).toContain("user_id uuid not null references auth.users (id) on delete cascade");
    expect(sql).toContain("fcm_token text not null");
    expect(sql).toContain("platform text not null");
    expect(sql).toContain("updated_at timestamptz not null");
    expect(sql).toContain("constraint orient_device_push_tokens_platform_known check (platform = 'android')");
    expect(sql).toContain(
      "constraint orient_device_push_tokens_fcm_token_unique unique (fcm_token)",
    );
    expect(sql).toContain(
      "create index orient_device_push_tokens_user_id_idx",
    );
  });

  it("keeps updated_at database-controlled", () => {
    expect(sql).toContain("orient_device_push_tokens_set_updated_at");
    expect(sql).toContain("before insert or update on public.orient_device_push_tokens");
    expect(sql).toContain("new.updated_at := timezone('utc', now())");
  });

  it("revokes defaults and grants narrow authenticated owner CRUD", () => {
    expect(sql).toContain(
      "alter table public.orient_device_push_tokens enable row level security;",
    );
    expect(sql).toContain(
      "revoke all on table public.orient_device_push_tokens from public;",
    );
    expect(sql).toContain(
      "revoke all on table public.orient_device_push_tokens from anon;",
    );
    expect(sql).toContain(
      "revoke all on table public.orient_device_push_tokens from authenticated;",
    );
    expect(sql).toContain(
      "revoke all on table public.orient_device_push_tokens from service_role;",
    );
    expect(sql).toContain(
      "grant select, insert, update, delete on table public.orient_device_push_tokens to authenticated;",
    );
    expect(sql).not.toMatch(
      /grant .* on table public\.orient_device_push_tokens to (public|anon)/,
    );
  });

  it("expresses intended service_role SELECT-only lookup boundary", () => {
    expect(sql).toContain(
      "grant select on table public.orient_device_push_tokens to service_role;",
    );
    expect(sql).not.toMatch(
      /grant (insert|update|delete|all).* on table public\.orient_device_push_tokens to service_role/i,
    );
  });

  it("constrains ownership with auth.uid() on all policies", () => {
    expect(sql).toContain("orient_device_push_tokens_select_own");
    expect(sql).toContain("orient_device_push_tokens_insert_own");
    expect(sql).toContain("orient_device_push_tokens_update_own");
    expect(sql).toContain("orient_device_push_tokens_delete_own");
    expect(sql).toMatch(
      /for select[\s\S]*using \(user_id = \(select auth\.uid\(\)\)\)/,
    );
    expect(sql).toMatch(
      /for insert[\s\S]*with check \(user_id = \(select auth\.uid\(\)\)\)/,
    );
    expect(sql).toMatch(
      /for update[\s\S]*using \(user_id = \(select auth\.uid\(\)\)\)[\s\S]*with check \(user_id = \(select auth\.uid\(\)\)\)/,
    );
    expect(sql).toMatch(
      /for delete[\s\S]*using \(user_id = \(select auth\.uid\(\)\)\)/,
    );
  });

  it("does not invent device inventory, Pulse links, delivery, or realtime publication", () => {
    const tableBody = sql.match(
      /create table public\.orient_device_push_tokens \(([\s\S]*?)\);/,
    )?.[1];
    expect(tableBody).toBeTruthy();
    expect(tableBody).toMatch(/^\s*id uuid/m);
    expect(tableBody).toMatch(/user_id uuid/);
    expect(tableBody).toMatch(/fcm_token text/);
    expect(tableBody).toMatch(/platform text/);
    expect(tableBody).toMatch(/updated_at timestamptz/);
    expect(tableBody).not.toMatch(
      /device_name|last_seen|notification_pref|watch_|grant_id|occurrence|acked_at|urgency|telemetry/i,
    );
    expect(sql).not.toMatch(/alter publication supabase_realtime/);
    expect(sql).not.toMatch(/fcm\.googleapis|create extension|pg_net|http_request/i);
    expect(sql).not.toMatch(
      /create table public\.pulse_|alter table public\.pulse_|create or replace function public\.(establish_due|run_pulse)/i,
    );
  });

  it("does not alter existing Pulse authority migrations", () => {
    const start = readFileSync(PULSE_START, "utf8");
    const hosted = readFileSync(PULSE_HOSTED, "utf8");
    expect(start).toContain("create table public.pulse_interrupt_grants");
    expect(start).toContain("create table public.pulse_occurrences");
    expect(hosted).toContain("establish_due_commitment_start_pulse_occurrences");
    expect(sql).not.toMatch(/create table public\.pulse_/);
    expect(sql).not.toMatch(/alter table public\.pulse_/);
    expect(sql).not.toMatch(
      /create or replace function public\.(establish_due_commitment_start_pulse_occurrences|run_pulse_hosted_establishment)/,
    );
    expect(sql).not.toMatch(/alter table public\.temporal_settings|create table public\.temporal_settings/);
  });
});
