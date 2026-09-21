# Shared LINE / Google learning accounts

## Linking flow

Open Settings from the LINE learning link, issue a ten-minute code, and enter it
in Settings while signed in with Google. The code proves control of the LINE
account; the authenticated Google session determines the destination. Never infer
account ownership from a display name or email supplied by the browser.

The service-role transaction locks and rechecks the full source snapshot,
archives it, combines learning records, moves the LINE identity to the Google
account, and retains an alias for old signed cookies and Stripe metadata.
Expired/reused codes, active assessments, concurrent updates, incompatible books,
and distinct billing customers cannot silently merge. No public database role can
read codes or invoke the merge. Codes are random 96-bit values stored as hashes.

Ordinary progress saves merge completed learning with server records using an
optimistic comparison, retaining original completion payloads for idempotent
retries. Database guards reject in-flight writes to archived identities. Old
browser tabs should be reopened after linking. The Google account's study profile
is preferred when both profiles exist. Original rows remain in the private merge
archive for operational recovery. Derived readiness projections are rebuilt from
retained evidence on subsequent recalculation.

## Deployment order

1. Pass typecheck, lint, and the full test suite, then merge the PR into main.
2. Apply `20260919150000_shared_learning_accounts.sql` to the pilot Supabase
   project `ymarkdjwszlsmrjmtfpy`.
3. Build/deploy main to `it-learning-app-vinext-pilot`.
4. Use the real LINE/Google pairing flow; verify both sets of completions,
   logout/login, and reopening the other device.

The root Wrangler prices now target live Stripe account `acct_1TnJeZCPaZ1RH6Fh`.
They reuse the existing Pro product and first-month 20% coupon `qrpW93tR`.
The Cloudflare live webhook is `we_1UI0SUCPaZ1RH6FhxdemT7UK`, named
`it-learning-cloudflare-live`, with checkout.session.completed and
customer.subscription.updated/deleted events. Before deploying this configuration,
register the matching live STRIPE_SECRET_KEY and this endpoint's
STRIPE_WEBHOOK_SECRET on the Worker. Keep secrets out of Git.

The previous sandbox was `acct_1TnJekC8AM1Ae2R2`, with webhook
`we_1UHPUMC8AM1Ae2R2THBJQTLI`. Its customer IDs cannot be reused in live mode.
Archive the verified sandbox billing association before clearing it from the
shared user profile; preserve all learning data. Verify live Checkout and portal
after cutover, and retire the two old Vercel webhook destinations only after the
Cloudflare receiver is ready. Do not replay old Vercel purchase events into the
pilot database without verifying user mapping.

## Verification status (2026-09-21)

- Automated tests cover atomic SQL merging, aliases, composite ownership FKs,
  attempt receipts, first-attempt counts, code reuse, concurrent snapshot changes,
  public-role denial, origin checks, canonical IDs, stale progress, and fragment
  spending. They use a local PostgreSQL engine, not customer data.
- Real Gemini grading on the pilot returned and persisted a non-dummy result.
- LINE/Google linking succeeded on the deployed main. Google re-login restored
  three completed topics and 12 answers; the user confirmed the same counts on
  the LINE phone. New post-link bidirectional writes still need a paired-device check.
- Sandbox Checkout completed, its webhook succeeded, and Pro survived re-login
  and linking. This does not prove live billing.
- After replacing the Anthropic key with a workspace-scoped key, real Claude
  Sonnet (`claude-sonnet-4-6`) returned 92/100 on the supervised-learning answer.
- Live prices/coupon and the new webhook are prepared. Live secret registration,
  deployment, sandbox billing cleanup, and live Checkout verification are pending.
