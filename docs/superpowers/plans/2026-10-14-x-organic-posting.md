# X organic posting implementation plan

> Execute inline with superpowers:executing-plans; the user explicitly requested working implementation, workflow and tests in this session.

Goal: automated educational X posts, disabled until operator activation, with first-touch acquisition measurement.
Architecture: Node 22 CLI in GitHub Actions; existing Anthropic SDK and credentials; private Supabase tables and atomic RPCs; direct X OAuth 1.0a user context. Reuse signup ref and funnel placement for the post identifier alongside utm_content, without altering existing tables.
Spec: user-provided implementation instructions (13 sections).

## Constraints and decisions
- 07:00 JST slot (22:00 UTC previous day), configuration supports multiple JST times; daily/monthly attempt caps include failures/dry runs.
- The unique account/slot claim permits one generation only. Never automatically retry an existing slot. Interrupted draft becomes failed; interrupted publishing becomes uncertain. Only an operator may reconcile an uncertain result.
- Exact and bigram similarity checks run under the per-account DB lock before publication. Reserve daily quota before AI calls.
- Published, rights-approved question sources only; exact full question/choices/answer/explanation. No suitable weighted-length question currently exists, so fallback to terminology. No current exam-policy facts are generated without a curated dated official reference.
- Constrain AI output to approved factual blocks, approved hooks and CTA. Reject unsupported prose or evidence. Existing Anthropic model default; one API request without SDK retries.
- Offline dry run requires an explicit fixture flag and uses a JSON file store. It cannot publish and is not shared concurrency storage. Connected dry run uses real AI/DB but never X.
- No changes to deployment, authentication, learning or billing behavior.

## Tasks
- [x] Core scheduling, JSON schema/grounding, rights/length filters, deduplication, UTM and mockable X transport. Tests first, then implementation.
- [x] Atomic claim/prepare/publish/reconcile/recovery migration and DB adapter; executable SQL tests with PGlite.
- [x] Orchestrator, existing Anthropic SDK, offline/connected CLI, workflow, cost/analytics report and operating guide; mocked integration tests.
- [x] Minimal funnel entry placement capture and signup ref regression tests.
- [x] Required typecheck/lint/full tests, offline dry run, fresh branch review; merge/push origin/main and remove worktree.

## Review focus
- GitHub cron delay across midnight must resolve the original scheduled slot, never retry based on wall-clock date.
- Unknown X outcomes and success followed by failed DB persistence must never become retryable.
- Concurrent different slots must respect daily caps and similarity checks.
- Untrusted AI text/evidence and disabled/fixture modes must fail closed.
- Report must count visits and signups independently to avoid join multiplication; conversions are first-touch estimates.

## Execution record

2026-10-14: implemented inline. All 3,589 tests, typecheck, both builds pass; lint has only two existing warnings. Read-only independent reviewer identified first-touch cookie overwrite from reuse of ref; reproduced with three failing mounted-component cases and fixed only recognized organic_x refs, preserving beta invitation behavior. Required commands rerun after fix. No live API posting or remote migration performed. Integration follows AGENTS.md's explicit main/push instruction without changing the shared checkout.
