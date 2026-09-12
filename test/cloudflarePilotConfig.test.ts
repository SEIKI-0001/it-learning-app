import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const wrangler = readFileSync(path.join(root, "wrangler.jsonc"), "utf8");

describe("Cloudflare pilot configuration", () => {
  it("keeps the existing Next.js scripts and adds separate vinext scripts", () => {
    expect(pkg.scripts.dev).toBe("next dev");
    expect(pkg.scripts.build).toBe("next build");
    expect(pkg.scripts.start).toBe("next start");
    expect(pkg.scripts.prebuild).toBe("npm run generate:figure-manifest");
    expect(pkg.scripts["dev:vinext"]).toBe("vinext dev");
    expect(pkg.scripts["prebuild:vinext"]).toBe("npm run generate:figure-manifest");
    expect(pkg.scripts["build:vinext"]).toBe("vinext build");
    expect(pkg.scripts["deploy:vinext"]).toBe(
      "npm run build:vinext && vinext-cloudflare deploy",
    );
  });

  it("uses a validation-only Worker with Node compatibility", () => {
    expect(wrangler).toMatch(/"name"\s*:\s*"it-learning-app-vinext-pilot"/);
    expect(wrangler).toMatch(/"nodejs_compat"/);
    expect(wrangler).not.toMatch(/"routes"\s*:/);
    expect(wrangler).not.toMatch(/"custom_domains"\s*:/);
    expect(wrangler).not.toContain("vercel.app");
  });

  it("exposes a repeatable Cloudflare verifier", () => {
    expect(pkg.scripts["verify:cloudflare"]).toBe(
      "node scripts/cloudflare/verify-pilot.mjs",
    );
    expect(
      existsSync(path.join(root, "scripts/cloudflare/verify-pilot.mjs")),
    ).toBe(true);
  });
});
