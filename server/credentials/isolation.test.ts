import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV,
  readConfiguredExternalCredentialsEncryptionKey,
} from "@/server/credentials/crypto";
import { ExternalCredentialError } from "@/server/credentials/errors";
import {
  EXTERNAL_CONNECTION_COLUMNS,
  EXTERNAL_FACT_COLUMNS,
  EXTERNAL_SOURCE_COLUMNS,
} from "@/persistence/externalTemporal";
import {
  SUPABASE_SERVICE_ROLE_KEY_ENV,
  createSupabaseServiceRoleClient,
} from "@/server/supabaseServiceRoleClient";

const root = join(import.meta.dirname, "../..");

function walkFiles(dir: string, predicate: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walkFiles(path, predicate));
    else if (predicate(entry)) out.push(path);
  }
  return out;
}

describe("external credential architectural isolation", () => {
  it("keeps credential custody out of temporal domain and projections", () => {
    const files = [
      "domain/externalTemporal.ts",
      "projections/timeline.ts",
      "projections/currentTemporalOrientation.ts",
      "projections/dayCanvas.ts",
      "projections/weekShape.ts",
      "projections/month.ts",
      "projections/capacity.ts",
      "projections/presentMomentOrientation.ts",
      "persistence/externalTemporal.ts",
    ];
    for (const relative of files) {
      const source = readFileSync(join(root, relative), "utf8");
      expect(source).not.toMatch(/server\/credentials|external_provider_credentials|sealCredentialPayload|SUPABASE_SERVICE_ROLE_KEY|EXTERNAL_CREDENTIALS_ENCRYPTION_KEY/);
    }
  });

  it("keeps browser/client modules from importing privileged server credential modules", () => {
    const clientRoots = ["components", "app", "domain", "projections", "persistence"];
    const banned = [
      "@/server/credentials",
      "@/server/supabaseServiceRoleClient",
      "server/credentials",
      "server/supabaseServiceRoleClient",
      "external_provider_credentials",
    ];
    for (const dir of clientRoots) {
      const files = walkFiles(join(root, dir), (name) => name.endsWith(".ts") || name.endsWith(".tsx"));
      for (const file of files) {
        // App Router route handlers are server entrypoints and may import server modules.
        if (file.includes(`${join("app", "api")}`)) continue;
        if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
        const source = readFileSync(file, "utf8");
        for (const token of banned) {
          expect(source, file).not.toContain(token);
        }
      }
    }
  });

  it("does not expose credential fields through ordinary external temporal SourceRead columns", () => {
    for (const columns of [EXTERNAL_CONNECTION_COLUMNS, EXTERNAL_SOURCE_COLUMNS, EXTERNAL_FACT_COLUMNS]) {
      expect(columns).not.toMatch(/ciphertext|nonce|encryption_version|access_token|refresh_token|scopes/);
    }
  });

  it("enables RLS with no authenticated policies or grants for credentials", () => {
    const sql = readFileSync(
      join(root, "supabase/migrations/20261007210000_external_provider_credentials.sql"),
      "utf8",
    );
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/revoke all on table public\.external_provider_credentials from public, anon, authenticated/);
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/grant select|grant insert|grant update|grant delete/i);
    expect(sql).not.toMatch(/alter publication/i);
    expect(sql).not.toMatch(/add table public\./i);
    expect(sql).toMatch(/Intentionally omitted from realtime publication membership/);
  });

  it("leaves the browser Supabase client unchanged regarding service-role access", () => {
    const browser = readFileSync(join(root, "persistence/supabaseBrowserClient.ts"), "utf8");
    expect(browser).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(browser).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(browser).not.toContain("EXTERNAL_CREDENTIALS_ENCRYPTION_KEY");
    expect(browser).not.toContain("external_provider_credentials");
  });

  it("does not publish credentials in the Class-A realtime migration", () => {
    const realtime = readFileSync(
      join(root, "supabase/migrations/20261006235000_class_a_realtime_publication.sql"),
      "utf8",
    );
    expect(realtime).not.toContain("external_provider_credentials");
  });
});

describe("external credential config-optional behavior", () => {
  it("imports privileged modules without requiring secrets at load time", async () => {
    const previousService = process.env[SUPABASE_SERVICE_ROLE_KEY_ENV];
    const previousKey = process.env[EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV];
    delete process.env[SUPABASE_SERVICE_ROLE_KEY_ENV];
    delete process.env[EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV];
    try {
      await import("@/server/supabaseServiceRoleClient");
      await import("@/server/credentials/crypto");
      await import("@/server/credentials/repository");
    } finally {
      if (previousService === undefined) delete process.env[SUPABASE_SERVICE_ROLE_KEY_ENV];
      else process.env[SUPABASE_SERVICE_ROLE_KEY_ENV] = previousService;
      if (previousKey === undefined) delete process.env[EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV];
      else process.env[EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV] = previousKey;
    }
  });

  it("fails closed only when privileged factories are invoked without secrets", () => {
    const previousService = process.env[SUPABASE_SERVICE_ROLE_KEY_ENV];
    const previousKey = process.env[EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV];
    delete process.env[SUPABASE_SERVICE_ROLE_KEY_ENV];
    delete process.env[EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV];
    try {
      expect(() => createSupabaseServiceRoleClient()).toThrow(ExternalCredentialError);
      expect(() => readConfiguredExternalCredentialsEncryptionKey()).toThrow(ExternalCredentialError);
    } finally {
      if (previousService === undefined) delete process.env[SUPABASE_SERVICE_ROLE_KEY_ENV];
      else process.env[SUPABASE_SERVICE_ROLE_KEY_ENV] = previousService;
      if (previousKey === undefined) delete process.env[EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV];
      else process.env[EXTERNAL_CREDENTIALS_ENCRYPTION_KEY_ENV] = previousKey;
    }
  });
});
