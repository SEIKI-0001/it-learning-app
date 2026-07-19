-- Billing correctness state and transactional one-time purchase application.
-- Additive and safe to re-run. Apply in Supabase SQL Editor before enabling the
-- corresponding application code in production.

begin;

create table if not exists public.billing_subscriptions (
  stripe_subscription_id text primary key,
  stripe_customer_id text not null,
  user_id uuid references public.line_users(id) on delete set null,
  price_id text,
  status text not null,
  latest_event_created bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists user_id uuid references public.line_users(id) on delete set null,
  add column if not exists price_id text,
  add column if not exists status text,
  add column if not exists latest_event_created bigint,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists billing_subscriptions_customer_idx
  on public.billing_subscriptions(stripe_customer_id);
create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions(user_id);

alter table public.billing_subscriptions enable row level security;

create or replace function public.record_stripe_subscription_event(
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_user_id uuid,
  p_price_id text,
  p_status text,
  p_latest_event_created bigint
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.billing_subscriptions as subscription_state (
    stripe_subscription_id,
    stripe_customer_id,
    user_id,
    price_id,
    status,
    latest_event_created,
    updated_at
  ) values (
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_user_id,
    p_price_id,
    p_status,
    p_latest_event_created,
    now()
  )
  on conflict (stripe_subscription_id) do update
  set stripe_customer_id = excluded.stripe_customer_id,
      user_id = coalesce(excluded.user_id, subscription_state.user_id),
      price_id = coalesce(excluded.price_id, subscription_state.price_id),
      status = excluded.status,
      latest_event_created = excluded.latest_event_created,
      updated_at = now()
  where coalesce(subscription_state.latest_event_created, -1) <= excluded.latest_event_created;

  return found;
end;
$$;

revoke all on function public.record_stripe_subscription_event(text, text, uuid, text, text, bigint)
  from public, anon, authenticated;
grant execute on function public.record_stripe_subscription_event(text, text, uuid, text, text, bigint)
  to service_role;

create or replace function public.apply_one_time_purchase(
  p_user_id uuid,
  p_plan_key text,
  p_months integer,
  p_amount_total integer,
  p_currency text,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_stripe_customer_id text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.billing_purchases (
    user_id,
    kind,
    plan_key,
    months,
    amount_total,
    currency,
    stripe_checkout_session_id,
    stripe_payment_intent_id
  ) values (
    p_user_id,
    'one_time',
    p_plan_key,
    p_months,
    p_amount_total,
    p_currency,
    p_stripe_checkout_session_id,
    p_stripe_payment_intent_id
  )
  on conflict (stripe_checkout_session_id) do nothing;

  if not found then
    return false;
  end if;

  perform 1
    from public.user_profiles
    where user_id = p_user_id
    for update;

  insert into public.user_profiles (
    user_id,
    pro_until,
    plan_updated_at,
    stripe_customer_id
  ) values (
    p_user_id,
    now() + make_interval(months => p_months),
    now(),
    p_stripe_customer_id
  )
  on conflict (user_id) do update
  set pro_until = greatest(
        now(),
        coalesce(public.user_profiles.pro_until, now())
      ) + make_interval(months => p_months),
      plan_updated_at = now(),
      stripe_customer_id = coalesce(
        excluded.stripe_customer_id,
        public.user_profiles.stripe_customer_id
      );

  return true;
end;
$$;

revoke all on function public.apply_one_time_purchase(uuid, text, integer, integer, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_one_time_purchase(uuid, text, integer, integer, text, text, text, text)
  to service_role;

commit;
