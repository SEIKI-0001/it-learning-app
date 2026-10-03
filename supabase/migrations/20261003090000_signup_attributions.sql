-- 新規登録の流入元（どの投稿・記事から来て登録したか）と、βテスター特典の付与記録。
--
-- 1ユーザー1行（初回登録時のみ）。個人を特定する情報は持たない:
--   utm_source / utm_medium / utm_campaign / ref … 公開リンクに付けた識別子
--   referrer_host … 直前サイトのホスト名だけ（パスやクエリは保存しない）
--   landing_path  … 最初に開いた自サイトのパス（クエリなし）
-- beta_granted_at … βテスター特典（Pro 期間）を付与した時刻。先着上限の判定に使う。
--
-- 書き込みは service role（/auth/callback）経由のみ。RLS 有効・公開ポリシー無し。

create table if not exists public.signup_attributions (
  user_id uuid primary key references public.line_users(id) on delete cascade,
  utm_source text check (utm_source is null or char_length(utm_source) <= 64),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 64),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 64),
  ref text check (ref is null or char_length(ref) <= 64),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 255),
  landing_path text check (landing_path is null or char_length(landing_path) <= 255),
  first_seen_at timestamptz,
  beta_granted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists signup_attributions_beta_idx
  on public.signup_attributions (beta_granted_at)
  where beta_granted_at is not null;

alter table public.signup_attributions enable row level security;
revoke all on public.signup_attributions from public, anon, authenticated;

-- βテスター特典を先着 p_cap 名まで付与する。
-- 同時登録でも上限を超えないよう、トランザクション単位の advisory lock で直列化する。
-- 付与したら true、対象外（行が無い・付与済み・上限到達）なら false。
create or replace function public.grant_beta_pro(p_user_id uuid, p_days integer, p_cap integer)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  granted_count integer;
begin
  if p_user_id is null or p_days is null or p_days <= 0 or p_cap is null or p_cap <= 0 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext('grant_beta_pro'));

  select count(*) into granted_count
    from public.signup_attributions
    where beta_granted_at is not null;
  if granted_count >= p_cap then
    return false;
  end if;

  update public.signup_attributions
    set beta_granted_at = now()
    where user_id = p_user_id
      and beta_granted_at is null;
  if not found then
    return false;
  end if;

  perform 1 from public.user_profiles where user_id = p_user_id for update;

  insert into public.user_profiles (user_id, pro_until, plan_updated_at)
  values (p_user_id, now() + make_interval(days => p_days), now())
  on conflict (user_id) do update
  set pro_until = greatest(now(), coalesce(public.user_profiles.pro_until, now()))
                  + make_interval(days => p_days),
      plan_updated_at = now();

  return true;
end;
$$;

revoke all on function public.grant_beta_pro(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.grant_beta_pro(uuid, integer, integer) to service_role;
