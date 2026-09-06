# Cloudflare vinext Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reversible vinext path beside the existing Next.js/Vercel path, validate critical behavior on Cloudflare Workers, and publish a validation-only `workers.dev` deployment with an evidence-based production recommendation.

**Architecture:** Keep the application, existing `next` scripts, and Vercel deployment authoritative while adding pinned vinext, Vite, Wrangler, and Cloudflare deployment configuration. Validate locally first, adapt only proven incompatibilities, then deploy one isolated Worker using non-production credentials and record passed, failed, and unverified checks.

**Tech Stack:** Node.js 22.18.0, Next.js 16.2.9, React 19.2.x, vinext 1.0.0-beta.9, @vinext/cloudflare 1.0.0-beta.7, Vite 8.2.2, Wrangler 4.129.0, Vitest 4.1.10, Playwright 1.61.1, Cloudflare Workers, Supabase, LINE Messaging API, Stripe test mode.

**Spec:** `docs/superpowers/specs/2026-09-06-cloudflare-vinext-pilot-design.md`

## Global Constraints

- Keep `next dev`, `next build`, the Vercel project, and Vercel production behavior intact.
- Add vinext as a parallel development, build, preview, and deployment path.
- Use a dedicated validation Worker and `workers.dev` hostname. Do not change production DNS.
- Use validation-only Supabase, LINE, Stripe test-mode, and AI credentials. Do not read or mutate real-user data.
- Do not change production LINE or Stripe webhook destinations.
- Keep authorization checks, cookie security, product behavior, and the existing test suite enabled.
- Do not work around incompatibility by deleting features, weakening authentication, or excluding tests.
- Stop before creating a service that requires a new contract or additional spend and request approval.
- Do not perform the production cutover in this pilot.
- Run every install, build, test, compatibility, preview, and deployment command with Node.js 22.18.0.
- Work only in `/Users/seikikobayashi/Developer/it-learning-app/.worktrees/cloudflare-vinext-pilot-20260906` on `codex/cloudflare-vinext-pilot-20260906` until the reviewed branch is merged through GitHub.

---

### Task 1: Record the clean Node 22 baseline

**Files:**
- Create: `docs/operations/cloudflare-vinext-pilot.md`
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`
- Read: `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
- Read: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`

**Interfaces:**
- Consumes: approved design and source commit `e71f6a947f08bb3113e1136f8232f147c01679dd`.
- Produces: an operations log with exact baseline commands, versions, counts, and exit status for later comparison.

- [ ] **Step 1: Verify isolation and runtime**

Run:

```bash
git branch --show-current
git rev-parse HEAD
node --version
npm --version
git status --short
```

Expected: branch `codex/cloudflare-vinext-pilot-20260906`, baseline commit descended from `e71f6a9`, Node `v22.18.0`, and no uncommitted application changes.

- [ ] **Step 2: Read the installed Next.js guides**

Run:

```bash
sed -n '1,240p' node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
sed -n '1,220p' node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md
sed -n '1,240p' node_modules/next/dist/docs/01-app/02-guides/environment-variables.md
sed -n '1,180p' node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md
```

Expected: confirm the installed-version behavior before changing proxy, deployment, environment, or runtime configuration.

- [ ] **Step 3: Run all pre-migration gates**

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all commands pass. The test run must include 150 test files and 1,866 tests unless the latest `origin/main` changed the expected count before the branch was created.

- [ ] **Step 4: Create the operations log with actual results**

Create `docs/operations/cloudflare-vinext-pilot.md` with these fixed sections and populate them only from command output:

```markdown
# Cloudflare vinext Pilot Operations Log

## Safety boundary

This pilot uses a validation-only Cloudflare Worker. It does not change production DNS, Vercel production, production webhooks, or real-user data.

## Source and tool versions

## Pre-migration baseline

## vinext compatibility check

## Generated configuration review

## Local Workers verification

## Validation deployment

## Deployed verification matrix

## vinext versus OpenNext decision

## Unverified items

## Production prerequisites
```

- [ ] **Step 5: Commit the baseline record**

```bash
git add docs/operations/cloudflare-vinext-pilot.md
git commit -m "docs: record Cloudflare pilot baseline"
```

---

### Task 2: Run compatibility analysis and add the parallel vinext toolchain

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create or modify from initializer: `vite.config.ts`
- Create or modify from initializer: `wrangler.jsonc`
- Modify if required: `.gitignore`
- Modify: `docs/operations/cloudflare-vinext-pilot.md`

**Interfaces:**
- Consumes: the passing baseline and existing Next.js `app/`, `public/`, `next.config.ts`, and `proxy.ts`.
- Produces: `npm run dev:vinext`, `npm run build:vinext`, and `npm run deploy:vinext`; validation Worker name `it-learning-app-vinext-pilot`; compatibility findings classified as supported, fixable, comparison-triggering, or unverified.

- [ ] **Step 1: Run the pinned compatibility checker before initialization**

Run:

```bash
npx vinext@1.0.0-beta.9 check
```

Expected: a compatibility report without modifying application source. Record every warning and error in the operations log, including file paths and whether it affects a critical acceptance row.

- [ ] **Step 2: Install exact pilot dependencies**

Run:

```bash
npm install react@19.2.6 react-dom@19.2.6
npm install --save-dev vinext@1.0.0-beta.9 @vinext/cloudflare@1.0.0-beta.7 vite@8.2.2 wrangler@4.129.0
```

Expected: the lockfile pins the selected versions and satisfies vinext's React `^19.2.6` peer requirement. Do not upgrade Next.js or unrelated dependencies.

- [ ] **Step 3: Initialize the Cloudflare target**

Run:

```bash
npx vinext@1.0.0-beta.9 init
```

Select Cloudflare Workers. Review the diff before accepting it. Preserve the existing `dev`, `build`, `start`, `lint`, `typecheck`, and `test` scripts.

- [ ] **Step 4: Normalize the parallel scripts**

Ensure `package.json` contains these exact additional scripts while retaining every existing script:

```json
{
  "dev:vinext": "vinext dev",
  "build:vinext": "vinext build",
  "deploy:vinext": "vinext build && vinext-cloudflare deploy",
  "cf:typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts",
  "verify:cloudflare": "node scripts/cloudflare/verify-pilot.mjs"
}
```

- [ ] **Step 5: Apply the validation-only Worker boundary**

Ensure `wrangler.jsonc` defines:

```json
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "it-learning-app-vinext-pilot",
  "compatibility_date": "2026-09-06",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true }
}
```

Retain initializer-required `main` and `assets` values. Do not add `routes`, `custom_domains`, production hostnames, or secret values.

- [ ] **Step 6: Generate types and verify both toolchains**

Run:

```bash
npm run cf:typegen
npm run typecheck
npm run build
npm run build:vinext
```

Expected: Cloudflare types generate without secrets; existing Next.js and vinext builds both pass. If vinext fails, classify the failure against the OpenNext triggers before editing application behavior.

- [ ] **Step 7: Commit the parallel toolchain**

List only files actually produced by initialization and review them before staging:

```bash
git status --short
git add package.json package-lock.json vite.config.ts wrangler.jsonc .gitignore cloudflare-env.d.ts docs/operations/cloudflare-vinext-pilot.md
git commit -m "build: add parallel vinext Cloudflare pilot"
```

If an initializer-listed file does not exist, omit only that filename from `git add`; do not stage unrelated files.

---

### Task 3: Add configuration and security contract tests

**Files:**
- Create: `test/cloudflarePilotConfig.test.ts`
- Create: `test/lineSession.test.ts`
- Modify only if tests expose a regression: `proxy.ts`
- Modify only if tests expose a regression: `lib/auth/lineSession.ts`

**Interfaces:**
- Consumes: `package.json`, `wrangler.jsonc`, `proxy(request: NextRequest)`, `signLineSession(userId)`, and `verifyLineSessionDetails(token)`.
- Produces: automated proof that the Vercel/Next scripts remain unchanged, the Worker has no production route, admin access fails closed, API routes retain per-handler authentication, and signed LINE sessions reject tampering and expiry.

- [ ] **Step 1: Write the failing configuration contract test**

Create `test/cloudflarePilotConfig.test.ts`:

```ts
import { readFileSync } from "node:fs";
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
    expect(pkg.scripts["dev:vinext"]).toBe("vinext dev");
    expect(pkg.scripts["build:vinext"]).toBe("vinext build");
  });

  it("uses a validation-only Worker with Node compatibility", () => {
    expect(wrangler).toMatch(/"name"\s*:\s*"it-learning-app-vinext-pilot"/);
    expect(wrangler).toMatch(/"nodejs_compat"/);
    expect(wrangler).not.toMatch(/"routes"\s*:/);
    expect(wrangler).not.toMatch(/"custom_domains"\s*:/);
    expect(wrangler).not.toContain("vercel.app");
  });
});
```

- [ ] **Step 2: Verify the configuration test fails before final normalization**

Run:

```bash
npx vitest run test/cloudflarePilotConfig.test.ts
```

Expected: fail if the initializer changed existing scripts, used a different Worker name, omitted `nodejs_compat`, or added a route.

- [ ] **Step 3: Make the minimum configuration correction**

Modify only the failing fields in `package.json` or `wrangler.jsonc`; do not change application authentication or production configuration.

- [ ] **Step 4: Add signed-session runtime coverage**

Create `test/lineSession.test.ts` using `vi.stubEnv` and fake timers:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LINE_SESSION_MAX_AGE,
  signLineSession,
  verifyLineSessionDetails,
} from "@/lib/auth/lineSession";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("signed LINE session", () => {
  it("accepts an untampered token and rejects a changed signature", () => {
    vi.stubEnv("SESSION_SECRET", "pilot-session-secret-with-sufficient-entropy");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T00:00:00Z"));
    const token = signLineSession("pilot-user");
    expect(token).not.toBeNull();
    expect(verifyLineSessionDetails(token)?.userId).toBe("pilot-user");
    expect(verifyLineSessionDetails(`${token}x`)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.stubEnv("SESSION_SECRET", "pilot-session-secret-with-sufficient-entropy");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T00:00:00Z"));
    const token = signLineSession("pilot-user");
    vi.setSystemTime(new Date(Date.now() + (LINE_SESSION_MAX_AGE + 1) * 1000));
    expect(verifyLineSessionDetails(token)).toBeNull();
  });
});
```

- [ ] **Step 5: Run focused and full tests**

```bash
npx vitest run test/cloudflarePilotConfig.test.ts test/lineSession.test.ts
npm test
```

Expected: both focused tests and the full suite pass without weakening existing behavior.

- [ ] **Step 6: Commit the contract tests**

```bash
git add test/cloudflarePilotConfig.test.ts test/lineSession.test.ts package.json wrangler.jsonc proxy.ts lib/auth/lineSession.ts
git commit -m "test: protect Cloudflare pilot security contracts"
```

Stage `proxy.ts` and `lib/auth/lineSession.ts` only if a focused test required a minimal behavior-preserving fix.

---

### Task 4: Verify and, only if required, remove request-time image filesystem access

**Files:**
- Test: `test/pastExamFigureSize.test.ts`
- Modify if triggered: `lib/pastExam/figureSize.ts`
- Create if triggered: `scripts/cloudflare/generate-figure-size-manifest.mjs`
- Create if triggered: `lib/pastExam/figureSizeManifest.generated.ts`
- Modify if triggered: `package.json`

**Interfaces:**
- Consumes: `getPngSize(publicPath: string): FigureSize | null` and PNG files below `public/question-bank/`.
- Produces if needed: generated constant `PAST_EXAM_FIGURE_SIZES: Readonly<Record<string, FigureSize>>`, preserving the existing `getPngSize` public interface.

- [ ] **Step 1: Exercise representative figures in vinext development and production builds**

Run:

```bash
npm run dev:vinext
npm run build:vinext
```

Request at least one page using `lib/questions/measureFigures.ts` and one using `lib/pastExam/viewModel.ts`. Inspect logs for `ENOENT`, `node:fs`, `process.cwd()`, or missing figure data.

Expected: if both local vinext and built Worker behavior return correct dimensions with no runtime filesystem error, retain `figureSize.ts` unchanged and record the evidence. Otherwise execute Steps 2-6.

- [ ] **Step 2: Write the failing manifest-backed test when the trigger fires**

Create `test/pastExamFigureSize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPngSize } from "@/lib/pastExam/figureSize";

describe("past-exam figure dimensions", () => {
  it("returns generated dimensions for a known official figure", () => {
    expect(
      getPngSize("/question-bank/official/ipa/it-passport/2022/q011-figure-1.png"),
    ).toEqual(
      expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }),
    );
  });

  it("rejects traversal and unknown images", () => {
    expect(getPngSize("/../secret.png")).toBeNull();
    expect(getPngSize("/question-bank/missing.png")).toBeNull();
  });
});
```

The selected fixture exists in the source baseline and must remain a real official-question asset.

- [ ] **Step 3: Verify the manifest test fails for the Worker-safe expectation**

Run the test after temporarily making `node:fs` unavailable in the test mock, or run it inside the vinext Worker build where the failure was reproduced:

```bash
npx vitest run test/pastExamFigureSize.test.ts
```

Expected: fail because request-time code cannot read the deployed public file.

- [ ] **Step 4: Generate a deterministic manifest**

Implement `scripts/cloudflare/generate-figure-size-manifest.mjs` to sort `public/question-bank/**/*.png`, validate the PNG signature and IHDR length, and write imports-free TypeScript containing URL keys and positive integer dimensions. Refuse traversal, skip non-PNG files, and produce identical bytes on repeated runs.

Add:

```json
{
  "generate:figure-manifest": "node scripts/cloudflare/generate-figure-size-manifest.mjs",
  "prebuild:vinext": "npm run generate:figure-manifest"
}
```

- [ ] **Step 5: Switch lookup without changing callers**

Replace request-time filesystem reads in `lib/pastExam/figureSize.ts` with:

```ts
import { PAST_EXAM_FIGURE_SIZES } from "@/lib/pastExam/figureSizeManifest.generated";

export function getPngSize(publicPath: string): FigureSize | null {
  if (!publicPath.startsWith("/") || publicPath.includes("..")) return null;
  return PAST_EXAM_FIGURE_SIZES[publicPath] ?? null;
}
```

- [ ] **Step 6: Verify deterministic output and both builds**

```bash
npm run generate:figure-manifest
git diff --exit-code lib/pastExam/figureSizeManifest.generated.ts
npx vitest run test/pastExamFigureSize.test.ts test/pastExamQuestions.test.ts
npm run build
npm run build:vinext
```

Expected: repeated generation is clean, tests pass, and both toolchains render the same dimensions.

- [ ] **Step 7: Commit only if the compatibility trigger fired**

```bash
git add package.json package-lock.json scripts/cloudflare/generate-figure-size-manifest.mjs lib/pastExam/figureSize.ts lib/pastExam/figureSizeManifest.generated.ts test/pastExamFigureSize.test.ts docs/operations/cloudflare-vinext-pilot.md
git commit -m "fix: make past-exam figure sizes Worker-safe"
```

If the trigger did not fire, update and commit only the operations evidence with `docs: record image compatibility`.

---

### Task 5: Add a repeatable validation-origin smoke verifier

**Files:**
- Create: `scripts/cloudflare/verify-pilot.mjs`
- Modify: `docs/operations/cloudflare-vinext-pilot.md`
- Test: `test/cloudflarePilotConfig.test.ts`

**Interfaces:**
- Consumes: `PILOT_BASE_URL`; optional `LINE_CHANNEL_SECRET` and `STRIPE_WEBHOOK_SECRET` from the process environment.
- Produces: a non-secret JSON summary on stdout and a nonzero exit code for failed mandatory HTTP contracts.

- [ ] **Step 1: Write the verifier contract test**

Extend `test/cloudflarePilotConfig.test.ts`:

```ts
it("exposes a repeatable Cloudflare verifier", () => {
  expect(pkg.scripts["verify:cloudflare"]).toBe(
    "node scripts/cloudflare/verify-pilot.mjs",
  );
});
```

- [ ] **Step 2: Verify the new contract fails**

```bash
npx vitest run test/cloudflarePilotConfig.test.ts
```

Expected: fail until the script entry and file exist.

- [ ] **Step 3: Implement the verifier**

Create `scripts/cloudflare/verify-pilot.mjs` with these behaviors:

```js
import { createHmac } from "node:crypto";

const base = new URL(process.env.PILOT_BASE_URL ?? "http://127.0.0.1:3000");
const results = [];

function skip(name, reason) {
  results.push({ name, status: null, passed: true, verified: false, reason });
}

async function check(name, path, init, expected) {
  const response = await fetch(new URL(path, base), { redirect: "manual", ...init });
  const passed = expected(response);
  results.push({ name, status: response.status, passed });
}

await check("public login", "/login", {}, (r) => r.status === 200);
if (process.env.PILOT_EXPECT_AUTH_GATE === "1") {
  await check("protected today", "/today", {}, (r) =>
    [302, 303, 307, 308].includes(r.status) &&
    new URL(r.headers.get("location"), base).pathname === "/login"
  );
} else {
  skip("protected today", "PILOT_EXPECT_AUTH_GATE is not enabled");
}
await check(
  "unauthenticated progress save",
  "/api/progress/save",
  { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
  (r) => r.status === 401,
);
if (process.env.LINE_CHANNEL_SECRET) {
  await check(
    "invalid LINE signature",
    "/api/line/webhook",
    { method: "POST", headers: { "content-type": "application/json", "x-line-signature": "invalid" }, body: '{"events":[]}' },
    (r) => r.status === 401,
  );
  const body = '{"events":[]}';
  const signature = createHmac("sha256", process.env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  await check(
    "valid empty LINE event",
    "/api/line/webhook",
    { method: "POST", headers: { "content-type": "application/json", "x-line-signature": signature }, body },
    (r) => r.status === 200,
  );
} else {
  skip("LINE webhook signatures", "LINE_CHANNEL_SECRET is unavailable");
}

if (process.env.STRIPE_WEBHOOK_SECRET) {
  await check(
    "invalid Stripe signature",
    "/api/billing/webhook",
    { method: "POST", headers: { "content-type": "application/json", "stripe-signature": "t=0,v1=invalid" }, body: "{}" },
    (r) => r.status === 400,
  );
} else {
  await check("Stripe webhook fails closed when unconfigured", "/api/billing/webhook", { method: "POST", body: "{}" }, (r) => r.status === 503);
}

console.log(JSON.stringify({ baseURL: base.origin, results }, null, 2));
if (results.some((result) => !result.passed)) process.exitCode = 1;
```

The script must not print secret values, cookies, response bodies, or authorization headers.

- [ ] **Step 4: Run against local vinext**

Start the server in one terminal:

```bash
npm run dev:vinext
```

Run in another:

```bash
PILOT_BASE_URL=http://127.0.0.1:3000 PILOT_EXPECT_AUTH_GATE=1 npm run verify:cloudflare
```

Expected: public, redirect, and authorization checks pass with validation auth configuration loaded. LINE and Stripe signature checks run only when their validation secrets are supplied; unavailable credentials are printed as unverified rather than passed.

- [ ] **Step 5: Commit the verifier**

```bash
git add scripts/cloudflare/verify-pilot.mjs package.json package-lock.json test/cloudflarePilotConfig.test.ts docs/operations/cloudflare-vinext-pilot.md
git commit -m "test: add Cloudflare pilot smoke verifier"
```

---

### Task 6: Document browser-storage migration scope

**Files:**
- Create: `docs/operations/browser-storage-migration.md`
- Modify: `docs/operations/cloudflare-vinext-pilot.md`
- Read: `lib/storage.ts`
- Read: `lib/userSession.ts`
- Read: `lib/wordlistProgress.ts`
- Read: `lib/referenceBook.ts`
- Read: `lib/pastExam/session.ts`
- Read: `lib/examReadiness/pendingFinalization.ts`
- Read: `lib/questRoute.ts`

**Interfaces:**
- Consumes: all `fequest:*` localStorage/sessionStorage keys and their server synchronization paths.
- Produces: a key-by-key authority, loss impact, recovery, and migration decision table; no production data export code.

- [ ] **Step 1: Regenerate the key inventory from source**

```bash
rg -n 'localStorage|sessionStorage|fequest:' app components lib -g '*.ts' -g '*.tsx'
```

Expected: every key in the design is traceable to source and newly discovered keys are added to the assessment.

- [ ] **Step 2: Write the migration document**

For each key, record storage type, owner file, whether it is server-backed, whether it may contain unsynchronized work, whether it is safe to recreate, and the production handling choice. The conclusions must state:

- keeping the existing custom domain preserves the browser origin and is preferred;
- `workers.dev` validation starts with empty browser storage and must use validation data only;
- a changed production origin requires synchronization or a schema-versioned, size-limited, integrity-checked export/import for unsynchronized records;
- imported `fequest:userId` is never accepted as authentication authority;
- production export/import is outside this pilot.

- [ ] **Step 3: Commit the assessment**

```bash
git add docs/operations/browser-storage-migration.md docs/operations/cloudflare-vinext-pilot.md
git commit -m "docs: assess browser storage migration"
```

---

### Task 7: Configure and deploy the validation Worker

**Files:**
- Modify: `docs/operations/cloudflare-vinext-pilot.md`
- Do not create: committed `.env*`, Wrangler state, account identifiers, or secret files.

**Interfaces:**
- Consumes: reviewed vinext build; authenticated Cloudflare account; validation-only public variables and secrets.
- Produces: one `it-learning-app-vinext-pilot` deployment and its `workers.dev` URL, without custom routes or production webhook changes.

- [ ] **Step 1: Confirm account and cost boundary before mutation**

Run:

```bash
npx wrangler@4.129.0 whoami
```

If login is required, run `npx wrangler@4.129.0 login`. Inspect the account and current plan. If creating or deploying this Worker requires a new contract or additional spend, stop and request approval.

- [ ] **Step 2: Confirm validation integrations without exposing values**

Use the repository's `stripe-projects-cli` skill for Stripe and third-party project access. Confirm that Supabase is explicitly non-production, Stripe keys start in test mode, the LINE channel is a test channel, and the AI key is approved for validation. Record only configuration names and availability, never values.

- [ ] **Step 3: Set public validation variables**

Set `APP_BASE_URL` and `NEXT_PUBLIC_APP_URL` to the assigned `workers.dev` origin. Set only validation values for public Supabase, LINE add-friend URL, model names, campaign flag, and Stripe test price identifiers. Keep these values in the validation Worker configuration or Cloudflare dashboard as appropriate; do not copy production URLs.

- [ ] **Step 4: Register server secrets**

For every available validation secret, run the interactive form so the value is not placed in shell history:

```bash
npx wrangler@4.129.0 secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler@4.129.0 secret put SESSION_SECRET
npx wrangler@4.129.0 secret put ADMIN_PASSWORD
npx wrangler@4.129.0 secret put LINE_CHANNEL_SECRET
npx wrangler@4.129.0 secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler@4.129.0 secret put STRIPE_SECRET_KEY
npx wrangler@4.129.0 secret put STRIPE_WEBHOOK_SECRET
npx wrangler@4.129.0 secret put GEMINI_API_KEY
npx wrangler@4.129.0 secret put ANTHROPIC_API_KEY
```

Skip unavailable credentials and mark their acceptance rows unverified. Never substitute production secrets.

- [ ] **Step 5: Build and deploy the exact commit**

```bash
git status --short
git rev-parse HEAD
npm run build:vinext
npm run deploy:vinext
```

Expected: Wrangler prints one validation `workers.dev` URL. Record it under `## Validation deployment` on a line beginning `- URL: `, followed by the deployment identifier, source commit, JST/UTC timestamp, bundle size, and selected account/project names without secrets.

- [ ] **Step 6: Verify no production routing was added**

```bash
npx wrangler@4.129.0 deployments list
rg -n 'routes|custom_domains|vercel\.app' wrangler.jsonc
```

Expected: the pilot deployment exists and the configuration contains no production route or Vercel hostname.

---

### Task 8: Execute the deployed verification matrix

**Files:**
- Modify: `docs/operations/cloudflare-vinext-pilot.md`
- Modify only for proven compatibility bugs: the smallest owning application/configuration file.
- Test alongside any bug fix: the nearest existing `test/*.test.ts` file or a new focused test named for the failing contract.

**Interfaces:**
- Consumes: validation Worker URL and validation-only accounts/fixtures.
- Produces: passed, failed, or unverified evidence for authentication, cookies, learning persistence, images, LINE, Stripe, AI grading, assets, and operational limits.

- [ ] **Step 1: Run automated deployed smoke verification**

```bash
PILOT_BASE_URL="$(sed -n 's/^- URL: //p' docs/operations/cloudflare-vinext-pilot.md | tail -1)" PILOT_EXPECT_AUTH_GATE=1 npm run verify:cloudflare
```

This reads the exact deployed URL recorded in Task 7. If a validation LINE secret is available, provide it through the process environment without placing the value in command history.

- [ ] **Step 2: Verify authentication and cookies in a clean browser profile**

Check unauthenticated `/today`, login return target, Google callback on the validation Supabase redirect allowlist, cookie refresh after reload, admin missing/invalid/valid credentials, LINE token resolution, signed cookie, and expiry. Capture statuses and cookie attributes but redact values.

- [ ] **Step 3: Verify user isolation and learning persistence**

With a validation user only, save an answer, reload, and compare progress, review state, readiness, word progress, and reference-book recovery. Send unauthenticated requests and another validation user's identifier to representative read and mutation APIs; require rejection or session-owned data only.

- [ ] **Step 4: Verify past-exam images and static assets**

Open representative past-exam questions containing figures and record rendered natural dimensions, aspect ratio, HTTP status, MIME type, and absence of Worker filesystem errors. Verify PNG, SVG, Rive, and `_next`/vinext assets are not redirected to login.

- [ ] **Step 5: Verify LINE safely**

Post an invalid signature and require 401. Post a correctly signed `{"events":[]}` body and require 200. Do not send a message/follow event with a real reply token and do not change the production webhook.

- [ ] **Step 6: Verify Stripe test mode safely**

Use a validation-only Stripe test webhook endpoint or Stripe CLI forwarding to the pilot URL. Require invalid-signature rejection, valid test-event acceptance, duplicate-event idempotency, Checkout/Portal test URLs, and return URLs on the validation origin. Do not use live keys or complete a real charge.

- [ ] **Step 7: Verify AI grading safely**

Use non-sensitive validation text to exercise success. Separately verify unauthenticated rejection, missing-key behavior, provider failure, and malformed provider output using existing mocks or validation configuration. Do not log prompts, keys, or full provider responses.

- [ ] **Step 8: Apply the OpenNext comparison gate**

If any trigger in the design fires, stop compatibility edits and add a comparison table to the operations log covering affected routes, required file changes, security behavior, expected recurring maintenance, and whether OpenNext's lack of Node.js Middleware support still blocks the existing `proxy.ts`. Report the conclusion before further adapter-specific changes.

- [ ] **Step 9: Fix only isolated compatibility defects and redeploy**

For each fixable failure: write a focused failing test, reproduce it, implement the smallest behavior-preserving change, pass the focused and full tests, commit named files only, rebuild, redeploy, and rerun the failed deployed check. Never combine unrelated fixes in one commit.

---

### Task 9: Run final gates, report, and merge the retained pilot path

**Files:**
- Modify: `docs/operations/cloudflare-vinext-pilot.md`
- Modify: `docs/operations/browser-storage-migration.md`
- Modify if findings change requirements: `docs/superpowers/specs/2026-09-06-cloudflare-vinext-pilot-design.md`

**Interfaces:**
- Consumes: exact deployed commit and complete verification evidence.
- Produces: final trial URL, commit, change summary, verification results, unverified items, production prerequisites, and merged `origin/main` containing only a usable parallel path and documentation.

- [ ] **Step 1: Run all final local gates under Node 22.18.0**

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run build:vinext
git diff --check origin/main...HEAD
```

Expected: all commands pass. If question-bank files changed, treat that as a scope violation unless explicitly justified, and run `npm run validate:questions` before continuing.

- [ ] **Step 2: Complete the final report**

The operations log must include:

- validation URL and whether it is still active;
- source and deployment commit hashes;
- vinext, Cloudflare adapter, Wrangler, Node, Next.js, and React versions;
- files and behavior changed;
- every acceptance row marked passed, failed, or unverified with evidence and timestamp;
- Worker bundle/limit findings and sanitized runtime errors;
- vinext maintenance assessment and OpenNext comparison when triggered;
- browser-storage migration-sensitive keys and the recommended production approach;
- remaining conditions before production DNS, webhooks, credentials, or data migration.

- [ ] **Step 3: Commit documentation and verify the staged scope**

```bash
git add docs/operations/cloudflare-vinext-pilot.md docs/operations/browser-storage-migration.md docs/superpowers/specs/2026-09-06-cloudflare-vinext-pilot-design.md
git status --short
git diff --cached --check
git commit -m "docs: report Cloudflare vinext pilot results"
```

Omit unchanged filenames. Do not use `git add -A`.

- [ ] **Step 4: Push the branch and merge through a reviewed PR**

```bash
git push -u origin codex/cloudflare-vinext-pilot-20260906
gh pr create --base main --head codex/cloudflare-vinext-pilot-20260906 --title "Add Cloudflare vinext validation path" --body-file docs/operations/cloudflare-vinext-pilot.md
gh pr checks --watch
gh pr merge --merge --delete-branch
git fetch origin
git merge-base --is-ancestor HEAD origin/main
```

Expected: required checks pass, the PR is merged, and all retained commits are ancestors of `origin/main`. If vinext is rejected, remove broken adapter configuration before the PR and merge only the evidence, comparison, and browser-storage assessment.

- [ ] **Step 5: Hand off the production decision**

Report the validation URL, merged main commit, changes, passed/failed/unverified checks, and production prerequisites. Explicitly state that production DNS and webhook switching were not performed and require a separate decision.
