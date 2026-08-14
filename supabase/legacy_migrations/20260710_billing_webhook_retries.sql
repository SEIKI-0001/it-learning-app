-- Stripe Webhook を「処理中 / 成功 / 失敗」として記録する。
-- 旧実装で event_id だけが記録済みの行は、過去に受領済みとして succeeded にする。
-- 新しい失敗はアプリが 5xx を返すため、Stripe による再送時に再処理される。

begin;

alter table if exists public.stripe_webhook_events
  add column if not exists status text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists event_payload jsonb,
  add column if not exists processed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.stripe_webhook_events
set status = 'succeeded',
    attempt_count = greatest(attempt_count, 1),
    processed_at = coalesce(processed_at, received_at),
    updated_at = coalesce(updated_at, received_at)
where status is null;

alter table public.stripe_webhook_events
  alter column status set default 'processing',
  alter column status set not null;

alter table public.stripe_webhook_events
  drop constraint if exists stripe_webhook_events_status_check;
alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_status_check
  check (status in ('processing', 'succeeded', 'failed'));

create index if not exists stripe_webhook_events_status_updated_at_idx
  on public.stripe_webhook_events(status, updated_at);

commit;
