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

The root Wrangler prices are **sandbox only**, belonging to Stripe account
`acct_1TnJekC8AM1Ae2R2`. The sandbox webhook is
`we_1UHPUMC8AM1Ae2R2THBJQTLI`; its signing secret is registered on the pilot Worker.
`STRIPE_SECRET_KEY` must be the key for that same sandbox. Keep secrets out of Git.
Before production billing, verify actual Checkout, webhook delivery, Pro
entitlements, and Claude grading. Then configure a matching live account's prices,
key and webhook together; sandbox IDs cannot be reused in live mode.

## Verification status (2026-09-20)

- Automated tests cover atomic SQL merging, aliases, composite ownership FKs,
  attempt receipts, first-attempt counts, code reuse, concurrent snapshot changes,
  public-role denial, origin checks, canonical IDs, stale progress, and fragment
  spending. They use a local PostgreSQL engine, not customer data.
- Real Gemini grading on the pilot returned and persisted a non-dummy result.
- Both Gemini and Anthropic secret names were verified on the pilot.
- Actual paired-device linking, Stripe Checkout, Pro activation, and real Claude
  grading remain pending deployment / sandbox secret registration. Do not treat
  configuration or unit tests as proof of those end-to-end steps.
