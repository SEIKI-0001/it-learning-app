# Pilot authentication integration — 2026-09-15

## Authorized boundaries

The user identified `fe-quest` as Vercel production: do not modify it.
The user explicitly authorized repurposing unused `it-learning-app-2`
(`ymarkdjwszlsmrjmtfpy`) for the Cloudflare pilot. No new paid resource is needed.
Worker: `it-learning-app-vinext-pilot`; production DNS/webhooks remain unchanged.

## Completed database preparation

The destination initially had four old tables and no migration history.
They were moved, not deleted, into `pilot_legacy_20260915`, with schema access
revoked from PUBLIC/anon/authenticated. Retained counts: user_profiles 1,
answer_history 5, study_sessions 12, review_items 0. The old user_profiles schema
was incompatible with the current application's UUID user mapping.

Applied `pilot_archive_legacy_and_bootstrap_baseline` using the checked-in
20260813071636 baseline, followed by the nine checked-in migrations through
20260913111500. The bootstrap additionally revoked public/anon/authenticated
execution on public functions and default function execution permissions;
service_role retained the server RPC access. This prevents the baseline's
admin_dashboard_summary grant from exposing admin data in the pilot. No SQL was
run against the production project.

The nullable-readiness migration was initially blocked by the safety reviewer
for its historical-data UPDATE. A read-only query confirmed this newly created
table had zero rows and zero scores; retry with that evidence succeeded.

After all migrations: 32 public tables, all with RLS enabled. Security advisors
returned only RLS-without-policy informational notices (32 active + 4 archived
tables). This matches the server-only data-access design; do not add permissive
policies to suppress the notices. Authenticated API handlers must enforce user
ownership before service_role calls.

## Remaining connection work

- User created the Google OAuth client and saved its credentials; the test
  project's Google provider was confirmed Enabled. Actual sign-in is pending.
- Set Supabase Site URL to the pilot origin and allow its `/auth/callback` URL
  including the application's next query parameter.
- Local fix now loads an explicit allowlist of public Worker variables into
  Vite defines. The generated GoogleLoginButton client chunk contains the test
  project's public URL and publishable key. No server key is part of this change.
  The deployed pilot still uses synthetic configuration until redeployment.
- Register only the destination project's server key as the pilot Worker's
  SUPABASE_SERVICE_ROLE_KEY; never expose it in NEXT_PUBLIC_* or repository files.
- Verify real Google login, Cookie refresh, internal-user mapping, learning
  save/restore, logout and cross-user isolation before claiming usable login.
- LINE test channel, Stripe test configuration and AI key remain pending.

Dashboard authentication and Google credential setup require user cooperation
where the connected tooling cannot perform them securely. Never ask for secrets
in chat. No new deployment has been made in this setup step.

## Local verification of public-build configuration

Node 22.18.0: new regression tests first failed (3/3), then passed after the
allowlisted defines implementation. Typecheck, lint, and the full suite passed
(160 files / 1,946 tests). vinext build completed and the generated browser chunk
was checked for the destination's public URL/key. Wrangler reported a sandbox
log-file permission error, although the build itself exited 0. Next build first
failed because the sandbox disallowed Turbopack's local port binding; the same
command passed outside the sandbox (471 pages). Real-browser OAuth/session
acceptance, PR integration, and redeployment remain pending at this checkpoint.

Database-only smoke: under service_role, inserted a random test user and progress,
read back and asserted exp=7 inside a transaction, then rolled back. This is not
evidence of working browser authentication or persistent learning save/restore.
