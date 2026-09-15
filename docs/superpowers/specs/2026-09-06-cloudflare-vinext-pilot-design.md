# Cloudflare vinext Pilot Design

## Purpose

Validate whether the existing Next.js application can run safely on Cloudflare Workers through vinext without changing the current Vercel production path. The pilot ends with a separately addressable `workers.dev` deployment, recorded verification evidence, and a recommendation either to continue toward production or to reconsider OpenNext.

The source baseline is `origin/main` at `e71f6a947f08bb3113e1136f8232f147c01679dd`. Work occurs on `codex/cloudflare-vinext-pilot-20260906` in a dedicated worktree with Node.js `22.18.0`.

## Global constraints

- Keep `next dev`, `next build`, the Vercel project, and Vercel production behavior intact.
- Add vinext as a parallel development, build, preview, and deployment path.
- Use a dedicated validation Worker and `workers.dev` hostname. Do not change production DNS.
- Use validation-only Supabase, LINE, Stripe test-mode, and AI credentials. Do not read or mutate real-user data.
- Do not change production LINE or Stripe webhook destinations.
- Keep authorization checks, cookie security, product behavior, and the existing test suite enabled.
- Do not work around incompatibility by deleting features, weakening authentication, or excluding tests.
- Stop before creating a service that requires a new contract or additional spend and request approval.
- Do not perform the production cutover in this pilot.

## Chosen approach

Use vinext beside the existing Next.js toolchain. Cloudflare currently recommends vinext for new Next.js 16 migrations and documents support for App Router, Route Handlers, React Server Components, server actions, SSR, streaming, and `proxy.ts`. The implementation remains reversible because the existing Next.js commands and Vercel deployment configuration stay authoritative until a separate production decision.

OpenNext remains the comparison path, not a second implementation. A comparison is triggered before the team becomes locked into vinext-specific work when any of these conditions appears:

- `proxy.ts` or Supabase session-cookie refresh cannot retain equivalent behavior and security;
- a request-time path needs a vinext fork or a persistent patch to vinext internals;
- more than one critical subsystem requires replacement of supported Next.js APIs;
- vinext-specific branching leaks into normal Vercel application code;
- required workarounds would create recurring upgrade work rather than a contained compatibility adapter;
- a Workers platform limit prevents a required application path from operating on the intended plan.

The comparison records the affected routes, change size, runtime behavior, security impact, maintenance cost, and whether OpenNext avoids the issue. Static Pages plus a separately hosted API is excluded because this application has 36 API Route Handlers, authentication callbacks, and LINE and Stripe webhooks.

## Repository structure

The pilot is expected to add or modify these responsibilities while retaining vinext-generated names when the initializer requires them:

- `package.json` and `package-lock.json`: pin vinext, Wrangler, and required Vite/Cloudflare dependencies; add parallel scripts without changing existing scripts.
- vinext/Vite configuration: adapt the existing `app/`, `public/`, `next.config.ts`, and `proxy.ts` inputs for vinext.
- `wrangler.jsonc`: define one validation Worker, `nodejs_compat`, static assets, observability, and non-secret validation variables. It must not define a production custom route.
- generated Cloudflare environment types: type declared bindings without containing values.
- `.gitignore`: exclude generated vinext/Workers output and local Wrangler state where the initializer has not already done so.
- image-dimension compatibility code and tests, only if runtime filesystem access is not preserved by the generated Worker bundle.
- `docs/operations/cloudflare-vinext-pilot.md`: reproducible setup, secret-name inventory, deployment commands, rollback instructions, and verification record.
- `docs/operations/browser-storage-migration.md`: browser-storage inventory and production migration options.

Generated configuration will be reviewed before it is accepted. Unrelated files and Vercel settings will not be reformatted or rewritten.

## Runtime and configuration design

All migration commands, builds, and tests run under Node.js `22.18.0`, matching `.nvmrc` and `package.json`. The host's default Node.js version is not relied upon.

The Worker configuration uses a validation-specific name and no custom domain. Node.js compatibility is enabled at the Worker boundary. Observability is enabled for the validation Worker so runtime errors can be tied to the tested commit and timestamp.

Configuration is divided into three classes:

1. Public build variables, including `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_LINE_ADD_FRIEND_URL`.
2. Non-secret server variables, including model names, price identifiers for Stripe test mode, campaign flags, and `APP_BASE_URL`.
3. Secrets registered through Wrangler, including `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and AI API keys.

`APP_BASE_URL` and `NEXT_PUBLIC_APP_URL` must resolve to the same deployed `workers.dev` origin. Secret values never appear in Git, terminal summaries, screenshots, or verification documents. Validation stops with an explicit missing-configuration result when a safe validation credential is unavailable.

## Request and authentication flow

The incoming request reaches the validation Worker and then vinext's Next.js-compatible routing layer. Static assets and excluded image paths bypass the application gate according to the existing `proxy.ts` matcher. All other routes preserve the current order:

1. `/admin` and `/api/admin/*` use Basic authentication and fail closed with 503 if `ADMIN_PASSWORD` is absent.
2. Other `/api/*` requests reach their Route Handler, where existing per-route user validation remains authoritative.
3. Page requests refresh Supabase cookies through `@supabase/ssr`.
4. Public paths remain accessible.
5. Protected paths require a verified Supabase user, signed LINE cookie, or initial LINE token exactly as the existing implementation specifies.
6. Unauthorized page requests redirect to `/login` while preserving the safe return target and any refreshed cookies.

The test suite must verify both page gating and API authorization. A page rendering successfully does not count as proof that mutation APIs enforce user identity.

## Required compatibility areas

### Node.js APIs

`node:crypto` HMAC, `timingSafeEqual`, UUID generation, Web `fetch`, raw request bodies, and explicit `runtime = "nodejs"` declarations must build and run under the Workers compatibility layer. Application-level fallbacks must not replace signature verification.

### Past-exam image dimensions

`lib/pastExam/figureSize.ts` currently reads PNG headers below `process.cwd()/public` at request time. The first implementation attempt may keep this unchanged only if vinext bundles and serves the files consistently in local Workers preview and the deployed Worker.

If that assumption fails, generate a deterministic TypeScript or JSON dimension manifest from `public/question-bank/**/*.png` before the vinext build. Runtime lookup will use the manifest while retaining the existing path validation and null fallback. `QuestionRecord.figures` remains unchanged. Manifest generation receives focused tests for valid PNGs, invalid inputs, missing entries, and deterministic output.

### External calls

- Supabase uses a validation project or an existing explicitly non-production project and validation users only.
- LINE validation uses a dedicated test channel when available. Signature verification is exercised with invalid signatures and a correctly signed empty `events` payload so no user receives a message.
- Stripe uses test-mode keys and test objects only. Webhook validation covers signature rejection, success, and duplicate-event idempotency. Checkout and Portal tests verify that return URLs stay on the validation origin without completing a real charge.
- AI grading uses a validation key and non-sensitive fixture text. Tests cover success, unauthorized access, missing configuration, provider failure, and malformed output without exposing provider responses containing sensitive data.

## Verification strategy

### Baseline and regression gates

Before vinext changes, run under Node.js `22.18.0`:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

The initial test baseline already records 150 passing test files and 1,866 passing tests. All four commands are repeated after implementation. Changes to question-bank data are outside scope; if such files change unexpectedly, also run `npm run validate:questions` and investigate the scope breach.

### vinext and Workers gates

- Run the pinned vinext compatibility check and save the actionable findings in the operations document.
- Build with vinext under Node.js 22.
- Start a local Workers preview and perform HTTP smoke tests against public pages, protected pages, static assets, and representative APIs.
- Deploy the exact tested commit to the dedicated Worker.
- Record Worker bundle size, build duration, response status, runtime exceptions, and available CPU/execution measurements.

### Deployed acceptance matrix

The deployed pilot passes only when evidence supports all applicable rows:

| Area | Acceptance condition |
| --- | --- |
| Public/static | Login and public assets return successfully; PNG, SVG, Rive, and Next assets have correct MIME types and are not redirected to login. |
| Protected page | Unauthenticated `/today` redirects to `/login` with the return target preserved. |
| Admin | Missing configuration fails closed; invalid Basic credentials return 401; validation credentials allow access. |
| Google/Supabase | Callback completes on the validation origin; refreshed cookies survive navigation and reload; the same validation user's server data is restored. |
| LINE session | Invalid token/cookie is rejected; a valid validation token produces the signed session cookie; expiry is enforced. |
| User isolation | Unauthenticated requests and attempts to name another user cannot read or mutate that user's records. |
| Learning state | A validation answer can be saved, reloaded, and reconciled across progress, review, and readiness views. |
| Past-exam figures | Representative official questions render all figures at the correct dimensions and aspect ratio without runtime filesystem errors. |
| LINE webhook | Invalid signatures fail; a valid signed empty-events payload succeeds; no outbound message reaches a real user. |
| Stripe | Test signatures, duplicate events, Checkout, Portal, and validation-origin return URLs behave correctly; no live-mode key or real charge is used. |
| AI grading | Validation input succeeds; unauthorized, unconfigured, provider-failure, and malformed-response paths retain current safe behavior. |
| Operational limits | Bundle size and observed execution remain within the selected Workers plan; logs contain no secrets or unexplained runtime errors. |

An unavailable external validation credential produces a clearly marked unverified row, not a synthetic pass. The final recommendation distinguishes failed, passed, and unverified behavior.

## Browser-storage migration assessment

Browser storage is origin-scoped, so a temporary `workers.dev` origin does not inherit Vercel-origin state. The pilot inventories every `fequest:*` key and classifies it by authority and recovery behavior.

### Server-backed or recoverable

- `fequest:appstate`: core learning state with server bootstrap/merge behavior for authenticated users.
- `fequest:wordlistProgress`: local-first progress with server synchronization.
- `fequest:referenceBook`: local-first reference-book data with authenticated server synchronization.
- `fequest:progressBootstrapCache` and `fequest:aiGradingBootstrapCache`: caches that can be repopulated.
- `fequest:userId`: identity hint only; server cookies and authenticated resolution remain authoritative.

### Potentially unsynchronized and migration-sensitive

- `fequest:pastExam:*`: in-progress past-exam sessions.
- `fequest:assessmentFinalization:v1:*`: pending finalization records that may represent unsent work.
- `fequest:todayRoute:v1`: the day's stable route ordering.
- `fequest:dailyReport:*`: per-day report display state.
- `fequest:pendingResult` and `fequest:lastResult`: legacy session-storage handoff/display state.

### Re-creatable preferences and presentation state

- `fequest:floatingMochit:v1`.
- `fequest:seenRevealedPhases`.

The preferred production path keeps the existing custom domain and therefore the browser origin. If production must move to a different origin, the production plan must first choose between server synchronization and a one-time, user-authorized export/import mechanism for migration-sensitive records. The export must be schema-versioned, size-limited, integrity-checked, and must never treat imported `userId` as authentication authority. The pilot documents counts and recovery behavior but does not copy production browser data.

## Error handling and rollback

- A failed compatibility check blocks initialization until findings are classified.
- A failed build or runtime smoke test blocks deployment.
- A failed critical acceptance row blocks a production recommendation.
- A missing safe external credential leaves the affected row unverified and blocks production adoption of that integration.
- A deployed validation Worker can be disabled or deleted without changing production traffic.
- Vercel production remains the rollback target throughout; no database migration may make the current Vercel version incompatible.

## Deliverables

The pilot produces:

- parallel vinext/Workers configuration or a documented decision not to retain it;
- automated compatibility fixes and focused tests where required;
- a `workers.dev` validation deployment when account access and safe credentials are available;
- an operations and verification report containing the URL, UTC/JST verification time, source commit, deployment identifier, versions, configuration names, results, and logs without secrets;
- a browser-storage migration assessment;
- an evidence-based vinext-versus-OpenNext comparison if a trigger is reached;
- a final list of unverified items and prerequisites for production migration.

Passing this pilot does not authorize production DNS, production webhooks, production credentials, or production data migration. Those actions require a separate decision after reviewing the final report.
