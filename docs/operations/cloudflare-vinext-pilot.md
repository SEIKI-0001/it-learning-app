# Cloudflare vinext Pilot Operations Log

## Safety boundary

This pilot uses a validation-only Cloudflare Worker. It does not change production DNS, Vercel production, production webhooks, or real-user data.

## Source and tool versions

- Branch: `codex/cloudflare-vinext-pilot-20260906`
- Baseline commit: `37313721db9ac3ff37548eb243b3a8ea9cf0ec4f` (`docs: plan Cloudflare vinext pilot`)
- Source commit check: `e71f6a947f08bb3113e1136f8232f147c01679dd` is an ancestor of the baseline commit (exit status `0`).
- Node.js: `v22.18.0`
- npm: `11.16.0`
- Next.js: `16.2.9`

All npm scripts below were run with `PATH` prefixed by `/Users/seikikobayashi/.npm/_npx/899bf9cc10daad37/node_modules/node/bin`; each command printed `node=v22.18.0` before it ran.

### Isolation and runtime recheck

Commands run before this Fix Round 1 documentation change:

```text
$ git branch --show-current
codex/cloudflare-vinext-pilot-20260906
$ git rev-parse HEAD
7262acb1e5a1f46c54df6844c04b65b14b7c3619
$ node --version
v22.18.0
$ npm --version
11.16.0
$ git status --short
```

`git status --short` returned no output, confirming a clean worktree before this documentation update. The commit above is descended from source commit `e71f6a947f08bb3113e1136f8232f147c01679dd`, as recorded by the initial baseline check (exit status `0`).

## Pre-migration baseline

| Command | Exit status | Result |
| --- | --- | --- |
| `npm run typecheck` | `0` | Passed. |
| `npm run lint` | `0` | Passed. |
| `npm test` | `0` | 150 test files passed; 1,866 tests passed. |
| `npm run build` | `0` | Passed: compiled successfully, TypeScript finished, and 470 static pages were generated. |

The first sandboxed `npm run build` attempt exited `1`: Turbopack could not bind a port (`Operation not permitted`). Re-running the same Node 22 command outside that restriction exited `0`.

`npm run build` also printed a warning that it inferred `/Users/seikikobayashi/Developer/it-learning-app` as the workspace root because it detected both that root's `package-lock.json` and this worktree's `package-lock.json`.

## vinext compatibility check

### Task 2 recovery (2026-09-09)

The interrupted initializer left valid uncommitted configuration at Task 2 base
`a586d884c5eeab14d375846c959e2177cc8537e1`. Its original checker output was not
retained. The pre-initialization result below was **reconstructed**, not recovered:
`git archive a586d884c5eeab14d375846c959e2177cc8537e1` was extracted into a temporary
directory under the ignored task ledger, then the following command ran there:

```sh
env PATH=/Users/seikikobayashi/.npm/_npx/899bf9cc10daad37/node_modules/node/bin:$PATH \
  sh -c 'node --version && npx vinext@1.0.0-beta.9 check'
```

Node printed `v22.18.0`; the checker exited `0`, reporting **94% compatible**:
16 supported, 0 partial, 1 issue. The temporary source copy was removed afterward.
The checker is advisory: its exit status alone does not mean no issues were found.

| Finding and paths | Classification | Critical acceptance impact |
| --- | --- | --- |
| Missing `"type": "module"` in baseline `package.json`; the only baseline issue. | Fixable; initializer added ESM package mode. | Build prerequisite; no route/authentication behavior changes. |
| Initializer-generated free `__dirname` in `vite.config.ts`; recovery check also scored 94% before repair. | Fixable; first changed to `import.meta.dirname`, then the entire unused alias was removed during self-review because its target did not exist. | Build configuration only. |
| `next/navigation` (31 files), `next/link` (56), `next/server` (37), `next/headers` (3), `next/dynamic` (1), `next/image` (5), `server-only` (4). | Supported by the checker: 7/7 import families. | Static support does not prove runtime authorization, cookies, streaming, or signatures. |
| `next.config.ts` redirects; App Router; 44 pages, 1 layout, 37 route handlers, 2 loading boundaries; `proxy.ts`. | Supported by the checker. | Proxy and redirect behavior still require local/deployed verification. The design's earlier 36-API count is a snapshot; this scan counts 37 handlers including `/auth/callback`. |
| `@vercel/analytics` and Tailwind CSS. | Supported by the checker (2/2 libraries). | Analytics is a client script; analytics delivery on Workers remains unverified. |
| Checker notes that `next/image` uses `@unpic/react` and has no local optimization. Paths: `components/questions/QuestionFigures.tsx`, `components/roadmap-map/MapBackground.tsx`, `components/roadmap-map/MapDetailSheet.tsx`, `components/roadmap-map/MapFog.tsx`, `components/mochit/MochitFallback.tsx`. | Supported import; image delivery/dimensions remain unverified. | Past-exam figures and roadmap images need runtime checks; Cloudflare Images was not provisioned. |

After configuration repair, the pinned initializer's checker reported **100%
compatible**, 16 supported, 0 partial, 0 issues. No application source was changed.

## Generated configuration review

Recovery reran these dependency installations with Node 22.18.0 and npm 11.16.0:

```sh
npm install --save-exact react@19.2.6 react-dom@19.2.6
npm install --save-dev --save-exact vinext@1.0.0-beta.9 @vinext/cloudflare@1.0.0-beta.7 vite@8.2.2 wrangler@4.129.0 @cloudflare/vite-plugin@1.54.4 @vitejs/plugin-react@6.1.1 @vitejs/plugin-rsc@0.5.34
npx vinext@1.0.0-beta.9 init --platform=cloudflare --data-cache=none --cdn-cache=workers-cache --image-optimization=none
```

Each command used the same Node-22-prefixed `PATH` above, including child npm
scripts. All exited `0`. `react-server-dom-webpack@19.2.6` was retained from the
initializer and is pinned exactly alongside matching React/React DOM. `npm ls`
confirmed the ten pilot dependencies match the exact package/lock versions, and
Next.js remains `16.2.9`. Other direct dependencies were not upgraded. npm refreshed
the transitive Vite/Rolldown toolchain and deduplicated its dependencies in the lock.

The second initializer preserved the existing config and all original scripts.
The added commands are `dev:vinext`, `build:vinext`, `deploy:vinext`, `cf:typegen`,
and `verify:cloudflare` exactly as planned; generated `start:vinext` is retained
for local preview. `verify:cloudflare` is intentionally wired ahead of its verifier
implementation in Task 5 and is not yet a runnable verification gate.

- `vite.config.ts` uses vinext, the Cloudflare Vite RSC/SSR environments, and the
  Cloudflare CDN cache adapter. Its initializer-generated `sharp` alias pointed to
  root `empty-stub.js`, which the initializer did not create. The unused alias and
  its `node:path` import were removed during self-review. Authored `sharp` imports
  occur only in `scripts/process-roadmap-map-assets.mjs` and
  `scripts/richmenu/richmenu-image.mjs`; those offline tools still resolve the real
  installed package. No native application functionality is stubbed or removed.
- `wrangler.jsonc` names only `it-learning-app-vinext-pilot`, uses date `2026-09-06`,
  `nodejs_compat`, and enabled observability. Initializer-required main
  `vinext/server/fetch-handler`, assets `dist/client` / `ASSETS`, Workers Cache,
  and `CF_VERSION_METADATA` are retained. There are no production routes, custom
  domains, secret values, KV namespaces, or Cloudflare Images binding.
- `cloudflare-env.d.ts` is unmodified Wrangler output containing only the declared
  `ASSETS` and `CF_VERSION_METADATA` bindings plus generated runtime declarations.
- `.gitignore` excludes `/dist/`, `.vinext/`, and `.wrangler/`.
- No services were provisioned and no deployment command was run.

### Type and lint boundaries

Generated Wrangler declarations change the global `Body.json<T>()` default to
`unknown`. The interrupted implementer reported 12 TS18046 errors in existing
tests. Per the recorded ruling, `tsconfig.typecheck.json` excludes only root
`cloudflare-env.d.ts`; all application/test inputs remain included and the
generated declarations are not edited. `cf:typegen` and `build:vinext` verify the
Cloudflare generation/bundle path. The ordinary Next build passed without changing
`tsconfig.json` or application response typing.

A fresh check after `build:vinext` found another artifact collision:
`.next/types/validator.ts:5` could not import `AppRoutes`, `LayoutRoutes`, `ParamMap`,
or `AppRouteHandlerRoutes` (four TS2305 errors). vinext beta.9's
`node_modules/vinext/dist/typegen.js` hardcodes `.next/types/routes.d.ts` and writes
its own declarations and `next-env.d.ts` there. It has no configurable output or
disable option. The added `pretypecheck: "next typegen"` hook regenerates the
authoritative Next route validators before the unchanged existing `typecheck`
command. This uses the supported Next CLI, not a vinext patch. Maintenance cost:
one route-generation step per npm typecheck; revisit this hook if vinext provides
separate type output. Running raw `tsc` after vinext may still consume vinext's
artifacts; use `npm run typecheck`. Do not run the two generators concurrently in
the same checkout.

The first post-build lint exited `1` with 225 errors and 6,286 warnings from bundled
output and generated declarations (including two unused-disable warnings in
`cloudflare-env.d.ts`).
Examples include `dist/client/_next/static/*/_buildManifest.js`, minified files
under `dist/client/_next/static/chunks/`, and `dist/server/ssr/vinext-client-assets.js`.
`eslint.config.mjs` now ignores only generated pilot artifacts: `dist/**`,
`.vinext/**`, `.wrangler/**`, and `cloudflare-env.d.ts`. Authored app, tests, and
pilot config remain linted. The rerun exited `0` without warnings.

### Task 2 verification and warnings

| Node 22.18.0 command | Exit status | Evidence |
| --- | --- | --- |
| `npm run cf:typegen` | `0` | Wrangler 4.129.0 generated the two non-secret bindings and runtime declarations. |
| `npm run typecheck` | `0` | Existing application/test typecheck passed after the root Cloudflare declaration boundary. |
| `npm run build` | `0` | Next 16.2.9 compiled, finished TypeScript, generated 470 static pages. |
| `npm run build:vinext` | `0` | All five Vite 8.2.2 phases passed, producing client and Worker bundles. |
| `npm test` | `0` | 150 test files / 1,866 tests passed. |
| `npm run lint` | `0` | Passed after generated-artifact ignores. |

After removing the unused native-module alias, the complete sequence
`npx vinext@1.0.0-beta.9 check && npm run build:vinext && npm run typecheck && npm run build && npm run typecheck && npm run lint`
exited `0` under Node 22.18.0. This explicitly verifies that typechecking works
after either build, with the automatic `next typegen` hook visible before both
typecheck invocations. The final checker again reported 100% compatibility.

Remaining diagnostics are recorded, not treated as runtime acceptance:

- npm reported 13 dependency advisories (3 moderate, 9 high, 1 critical); no
  unrequested `npm audit fix` or dependency upgrade was performed.
- npm warned that install scripts for esbuild 0.28.1, fsevents 2.3.3/2.3.2,
  sharp 0.34.5, unrs-resolver 1.12.2, and workerd 1.20260903.1 were not covered by
  `allowScripts`. The required installed binaries worked in the successful builds.
- Vite warned that `vitest.config.ts:6` uses `__dirname`, unsupported by its planned
  future native config loader. Current Vitest 4.1.10 passed all tests; no unrelated
  test config change was made.
- Next repeated its baseline multiple-lockfile workspace-root warning.
- vinext reported client chunks over 500 kB and unknown classification for some
  pages because static analysis cannot detect all `headers()` / `cookies()` use.
  Runtime rendering/cache behavior remains to be verified.
- Wrangler's unedited generated declarations contain trailing spaces on lines
  11956, 12470, 12538, 13060, and 13553. `git diff --check` reports these five
  generator-owned warnings; authored files pass that check. The generated file
  is kept byte-for-byte as produced by `cf:typegen` rather than hand-edited.
- Sandboxed npm registry lookup failed with `ENOTFOUND`; the waiting install was
  interrupted and rerun successfully outside that restriction. Sandboxed Wrangler
  typegen generated types but could not write its user-level log (`EPERM`); a clean
  rerun outside the restriction exited `0`. Builds used the same approved local
  execution context that passed the baseline Turbopack port restriction.

## Local Workers verification

### Repeatable pilot smoke verifier

`npm run verify:cloudflare` checks the validation origin without following
redirects or printing response bodies, cookies, authorization headers, or secret
values. `PILOT_BASE_URL` selects the origin. Set `PILOT_EXPECT_AUTH_GATE=1` only
when validation-only Supabase public configuration and `SESSION_SECRET` are loaded;
the `/today` redirect is otherwise reported as unverified.

For a local vinext run, put dummy values that cannot reach production services in
the ignored `.env.local` file. The Cloudflare Vite plugin loads Worker variables
from that file; exporting them only in the parent shell did not populate the
Worker runtime in this pilot.

```dotenv
# .env.local (validation-only example; do not use or commit production values)
NEXT_PUBLIC_SUPABASE_URL="https://pilot.invalid"
NEXT_PUBLIC_SUPABASE_ANON_KEY="pilot-anon-key"
SESSION_SECRET="pilot-only-session-secret-with-sufficient-entropy"
APP_BASE_URL="http://localhost:3000"
LINE_CHANNEL_SECRET="pilot-only-line-secret"
```

```sh
npm run dev:vinext

PILOT_BASE_URL=http://localhost:3000 \
  PILOT_EXPECT_AUTH_GATE=1 \
  LINE_CHANNEL_SECRET=pilot-only-line-secret \
  npm run verify:cloudflare
```

When `LINE_CHANNEL_SECRET` is supplied to both the validation Worker and verifier,
the verifier checks rejection of an invalid signature and acceptance of a signed
empty event. Without it, LINE is explicitly reported as unverified. When
`STRIPE_WEBHOOK_SECRET` is supplied to the Worker, the same value enables the
invalid-signature check; without it, the mandatory check expects the endpoint to
fail closed with HTTP 503. Use validation credentials only. The command emits a
non-secret JSON summary and exits nonzero if any performed HTTP contract fails.

Task 5 ran the verifier against vinext development on `http://localhost:4315`
with Node `v22.18.0`, an unreachable `.invalid` Supabase URL, and dummy local
session/LINE secrets loaded from a temporary `.env.local`. The temporary file was
deleted after the run. The command exited `0` with these performed contracts:

| Contract | HTTP status | Result |
| --- | --- | --- |
| Public `/login` | `200` | Passed. |
| Unauthenticated `/today` with auth gate expected | `307` to `/login` | Passed. |
| Unauthenticated `/api/progress/save` | `401` | Passed. |
| Invalid LINE signature | `401` | Passed. |
| Validly signed empty LINE event | `200` | Passed. |
| Stripe webhook without configuration | `503` | Passed fail-closed check. |

A second run omitted verifier-side LINE credentials and the auth-gate expectation;
both checks were emitted with `verified: false` while the remaining mandatory
checks passed and the command exited `0`. No validation Stripe secret was available,
so Task 5 did not run the configured invalid-signature branch.

The first local setup attempt exported Worker variables only in the parent shell.
The verifier exited `1`, correctly reporting `/today` as `200` and the invalid LINE
signature as `200`; after loading the same dummy values through `.env.local`, both
security contracts passed. A separate sandboxed attempt against the local server
reported connection failures because the loopback listener was outside that
sandbox. Neither failure was treated as application acceptance evidence.

### Task 4 image filesystem compatibility (2026-09-12)

The compatibility trigger fired before implementation. With the original
`lib/pastExam/figureSize.ts`, both vinext development and the built local Worker
returned HTTP `200` for `/past-exams/2026`, but the serialized view for the real
`/question-bank/official/ipa/it-passport/2026/q003-figure-1.png` contained
`width: undefined` and `height: undefined`. The filesystem exception was swallowed
by the existing fallback, so neither server log showed `ENOENT`. Both environments
also returned HTTP `200` for `/check-pack/tech-binary-data`, exercising the
`lib/questions/measureFigures.ts` page path. Current check-pack question data has
no image figures, so that URL cannot itself demonstrate non-null dimensions.

Task 4 therefore replaced request-time `node:fs` / `process.cwd()` reads with a
checked-in manifest generated from the PNG IHDR data before vinext builds. The
generator found 42 PNGs, validates the PNG signature and IHDR, sorts URL keys, and
rejects any derived path outside `public/`. It does not modify `QuestionRecord`
data, and `getPngSize(publicPath): FigureSize | null` remains the caller contract.

The first Worker-safe test run failed as intended: with `node:fs` made unavailable,
the existing implementation returned `null` instead of the hand-checked `900 x
350` dimensions for the real 2022 question 11 fixture. After implementation, that
test and the unknown/traversal cases passed. A before/regenerate/after SHA-256
comparison produced identical manifest hashes:
`85d333345bd538583cae7cf9f5ae663f625b859dff05c3e9d53cf196718f71cd`.

Post-fix route probes returned HTTP `200` in both vinext development and the built
local Worker. `/past-exams/2026` serialized the real 2026 question 3 figure as
`width: 648, height: 170`; `/check-pack/tech-binary-data` remained successful.
Neither response nor either runtime log contained `ENOENT`, `node:fs`,
`process.cwd()`, or an internal-server error. The built figure-size module contains
the generated data and no request-time PNG filesystem reader.

| Node 22.18.0 command | Exit status | Evidence |
| --- | --- | --- |
| `npx vitest run test/pastExamFigureSize.test.ts test/pastExamQuestions.test.ts` | `0` | 2 files / 42 tests passed. |
| `npm run typecheck` | `0` | Application and generated-manifest types passed. |
| `npm run lint` | `0` | Passed without errors or warnings. |
| `npm test` | `0` | 154 files / 1,876 tests passed. |
| `npm run validate:questions` | `0` | 12 files / 338 question validation tests passed. |
| `npm run build` | `0` | Next compiled, typechecked, and generated 470 static pages. |
| `npm run build:vinext` | `0` | Prebuild regenerated 42 entries; all five vinext phases completed. |

The first sandboxed Next build attempt reproduced the already-recorded Turbopack
port restriction and exited `1`; the same Node 22 command rerun with local port
permission exited `0`. An initial corrected-build probe used a PATH that omitted
the npm executable, so `prebuild:vinext` stopped before running the generator or
build; the complete rerun restored npm after the cached Node directory, used
`set -e`, and exited `0`.

### Task 4 Fix Round 1 (2026-09-12)

Review found two stale/invalid-manifest paths. Ordinary `npm run build` did not
regenerate the checked-in manifest, and `deploy:vinext` invoked `vinext build`
directly, bypassing npm's `prebuild:vinext` lifecycle. The package now adds
`prebuild: "npm run generate:figure-manifest"` while preserving the exact
`build: "next build"` command. `deploy:vinext` now starts with
`npm run build:vinext`, so direct builds, vinext builds, and vinext deployments
all reach the generator through npm lifecycle hooks.

The PNG parser also accepted a 24-byte pseudo-PNG containing the signature, IHDR
length/type, and width/height but not the complete 13-byte IHDR data or CRC. A
focused integration test copies the real generator into a temporary project and
feeds it the checked-in truncated-header hex fixture. Before the fix, the test
failed because the generator exited `0` and wrote a manifest. The parser now
requires at least 33 bytes before accepting the first IHDR chunk; the same test
passes by observing a nonzero exit, `Invalid PNG IHDR`, and no output manifest.

| Node 22.18.0 command | Exit status | Evidence |
| --- | --- | --- |
| focused generator, figure lookup, and Cloudflare config tests | `0` | 3 files / 5 tests passed after the expected 2-test RED run. |
| two `npm run generate:figure-manifest` runs + SHA-256 comparison | `0` | Both generated `85d333345bd538583cae7cf9f5ae663f625b859dff05c3e9d53cf196718f71cd`. |
| `npm run build` | `0` | `prebuild` regenerated 42 entries before unchanged `next build`; 470 static pages generated. |
| `npm run build:vinext` | `0` | `prebuild:vinext` regenerated 42 entries; all five vinext phases completed. |
| post-build manifest hash comparison | `0` | Manifest remained byte-identical. |
| `npm run typecheck` | `0` | Passed after both build toolchains. |
| `npm run lint` | `0` | Passed without errors or warnings. |
| `npm test` | `0` | 155 files / 1,877 tests passed. |

### Task 6 browser-storage migration assessment (2026-09-12)

The source inventory command from the implementation plan was rerun across
`app`, `components`, and `lib`. It identified 14 persisted `fequest:*` key
patterns: 12 `localStorage` patterns and two legacy `sessionStorage` patterns.
Five additional `fequest:*` literals are DOM event names rather than stored
data, and were explicitly separated from the migration inventory.

The key-by-key authority, synchronization, loss, recovery, and production
handling assessment is recorded in
`docs/operations/browser-storage-migration.md`. Important findings are:

- `fequest:appstate`, `fequest:wordlistProgress`, and
  `fequest:referenceBook` have authenticated server paths, but can still contain
  anonymous or failed/fire-and-forget local writes; server backing alone is not
  proof that every browser change is recoverable. Cookie-session AppState
  restoration merges local/server state but writes back only merged progress,
  while LINE token restoration replaces local AppState when a server snapshot
  exists. Reference-book local deletion also has no server-delete path.
- `fequest:dailyReport:<date>` writes authenticated reports to the server but
  has no client rehydration path, so losing the local key changes the destination
  UI even when a server row exists.
- `fequest:pastExam:*` and
  `fequest:assessmentFinalization:v1:*` can contain non-reconstructible pending
  work. Their server-side assessment-session, attempt, progress, and answer rows
  do not reconstruct the local cursor/retry frame. A different-origin cutover
  must drain them or use a separately reviewed, schema-valid migration path.
- `fequest:userId` is a client hint only. It is excluded from migration and is
  never authentication authority; the destination must resolve identity from a
  validated token or server cookie.

The recommended production path is unchanged: retain the existing custom domain
so the browser origin is preserved. The `workers.dev` pilot starts with empty
browser storage and uses validation-only data. Production export/import remains
outside this pilot; a changed production origin is blocked until synchronization
or a schema-versioned, size-limited, integrity-checked and authenticated
export/import design is separately approved.

## Validation deployment

Not run in this baseline-record task.

## Deployed verification matrix

Not run in this baseline-record task.

## vinext versus OpenNext decision

No comparison trigger has been established by Task 2. Both toolchains build; the
fixes are confined to generated-artifact boundaries and configuration. They do
not change authentication, patch vinext internals, replace a critical subsystem,
or introduce vinext branches into request-time application code. Runtime security,
filesystem access, limits, and external-service behavior remain unverified; a
passing checker/build must not be used to waive the later comparison gate.

## Unverified items

- No validation deployment or deployed-route verification has been run.
- `proxy.ts` / Supabase cookie behavior, signed webhook raw bodies, Node crypto,
  external providers, cache behavior, and validation-account platform limits need
  their planned checks. Past-exam dimensions now pass local vinext development and
  built-Worker verification; validation deployment remains pending.
- The verifier script is scheduled for Task 5; `verify:cloudflare` is not yet run.

## Production prerequisites

No production change was run in this baseline-record task.
