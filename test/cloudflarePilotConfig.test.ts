import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const wrangler = readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
const reminder = readFileSync(
  path.join(root, "workers/line-reminder-cron/wrangler.jsonc"),
  "utf8",
);
const verifier = path.join(root, "scripts/cloudflare/verify-pilot.mjs");

function runVerifier(baseURL: string) {
  return spawnSync(process.execPath, [verifier], {
    encoding: "utf8",
    env: {
      ...process.env,
      LINE_CHANNEL_SECRET: "",
      PILOT_BASE_URL: baseURL,
      PILOT_EXPECT_AUTH_GATE: "",
      STRIPE_WEBHOOK_SECRET: "",
    },
  });
}

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

  it("routes production links and the reminder to the Cloudflare domain", () => {
    expect(wrangler).toMatch(/"name"\s*:\s*"it-learning-app-vinext-pilot"/);
    expect(wrangler).toMatch(/"nodejs_compat"/);
    const config = JSON.parse(wrangler);
    expect(config.vars.APP_BASE_URL).toBe("https://shikaku-mochit.com");
    expect(config.vars.NEXT_PUBLIC_APP_URL).toBe("https://shikaku-mochit.com");
    expect(config.vars.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://kebebakugaxdidehzjnh.supabase.co",
    );
    expect(config.vars.NEXT_PUBLIC_SUPABASE_ANON_KEY).toMatch(
      /^sb_publishable_/,
    );
    expect(config.vars.NEXT_PUBLIC_LINE_ADD_FRIEND_URL).toBe(
      "https://lin.ee/Oc2SBlS",
    );
    expect(reminder).toContain('"APP_BASE_URL": "https://shikaku-mochit.com"');
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

  it("rejects an invalid pilot URL without disclosing its input", () => {
    const secretInput = "https://pilot-user:do-not-print-this@[";
    const result = runVerifier(secretInput);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    expect(result.stdout).not.toContain(secretInput);
    expect(JSON.parse(result.stdout)).toEqual({
      baseURL: null,
      results: [],
      error: {
        code: "INVALID_PILOT_BASE_URL",
        message: "PILOT_BASE_URL must be a valid absolute URL",
      },
    });
  });

  it("marks a network failure as mandatory but unverified", () => {
    const result = runVerifier("http://127.0.0.1:1");

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    const summary = JSON.parse(result.stdout);
    expect(summary.results[0]).toEqual({
      name: "public login",
      status: null,
      passed: false,
      verified: false,
    });
  });
});
