-- Security hardening for auth/session/billing flows.
-- Additive only: existing users, progress, answers, reference books, and
-- existing line_sessions rows are not modified.

-- New LINE handoff tokens should expire quickly. The application writes
-- expires_at explicitly; this default protects any future inserts that omit it.
alter table if exists public.line_sessions
  alter column expires_at set default (now() + interval '15 minutes');

-- Stripe webhook idempotency. The application inserts event.id before handling
-- and treats duplicate primary-key violations as already processed.
create table if not exists public.stripe_webhook_events (
  event_id    text primary key,
  event_type  text,
  received_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_received_at_idx
  on public.stripe_webhook_events(received_at);

alter table public.stripe_webhook_events enable row level security;

-- No public RLS policies are added. This table is intended for service role
-- access from server-side webhook handling only.
