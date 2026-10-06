import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(bytes.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("installed app identity", () => {
  it("names the installed application Orient and points only at ordinary Beacon icons", () => {
    const installed = manifest();
    expect(installed.name).toBe("Orient");
    expect(installed.short_name).toBe("Orient");
    expect(installed.description).toBe("One field of time.");
    expect(installed.start_url).toBe("/");
    expect(installed.display).toBe("standalone");
    expect(installed.background_color).toBe("#10141c");
    expect(installed.theme_color).toBe("#10141c");
    expect(installed.icons).toEqual([
      { src: "/orient-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/orient-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ]);
    expect(JSON.stringify(installed)).not.toContain("maskable");
    expect(JSON.stringify(installed)).not.toContain("Desktop");
  });

  it("matches each declared size to the generated PNG", () => {
    for (const icon of manifest().icons ?? []) {
      const [width, height] = icon.sizes?.split("x").map(Number) ?? [];
      expect(pngSize(`public${icon.src}`)).toEqual({ width, height });
    }
    expect(pngSize("public/orient-app-icon-master.png")).toEqual({ width: 1254, height: 1254 });
  });

  it("keeps the horizontal instrument mark separate from the install icon", () => {
    const identity = readFileSync("components/orient/OrientIdentity.tsx", "utf8");
    const layout = readFileSync("app/layout.tsx", "utf8");
    const page = readFileSync("app/page.tsx", "utf8");
    expect(identity).toContain('src="/orient-logo.png"');
    expect(identity).not.toContain("orient-icon");
    expect(identity).not.toContain("Desktop");
    expect(layout).toContain('url: "/orient-icon-192.png"');
    expect(layout).toContain('url: "/orient-icon-512.png"');
    expect(layout).not.toContain("orient-logo.png");
    expect(layout).not.toContain("Desktop");
    expect(page).toContain("OrientInstrument");
    expect(readFileSync("public/orient-logo.png").byteLength).toBe(1182123);
  });
});
