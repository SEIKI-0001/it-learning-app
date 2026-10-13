-- Private posting queue. No access for application users; service-role CLI only.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create table public.x_posting_accounts (
  account_id text primary key check (account_id ~ '^[a-zA-Z0-9_-]{1,64}$')
);
create table public.x_social_posts (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references public.x_posting_accounts(account_id),
  scheduled_at timestamptz not null,
  published_at timestamptz,
  publish_attempt_at timestamptz,
  theme text check (theme in ('question','terms','trick','study','challenge','knowhow','service')),
  text text,
  status text not null default 'draft' check (status in ('draft','ready','publishing','published','failed','uncertain','cancelled')),
  x_post_id text unique,
  post_url text,
  destination_url text,
  utm_content text not null,
  utm jsonb not null,
  ai_model text,
  generation jsonb,
  content_id text,
  content_hash text,
  content_keys text[],
  error_summary text,
  reconciliation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, scheduled_at),
  check (status <> 'published' or (x_post_id is not null and published_at is not null)),
  check (status not in ('ready','publishing','published','uncertain') or text is not null)
);
create index x_social_posts_account_time on public.x_social_posts(account_id, scheduled_at desc);
create unique index x_social_posts_exact on public.x_social_posts(account_id, content_hash)
  where status in ('ready','publishing','published','uncertain');
alter table public.x_posting_accounts enable row level security;
alter table public.x_social_posts enable row level security;
revoke all on public.x_posting_accounts, public.x_social_posts from public, anon, authenticated;
grant select, insert, update on public.x_posting_accounts, public.x_social_posts to service_role;

-- Reserve quota BEFORE AI. All attempts (also failed/cancelled/dry-run) count.
create function public.claim_x_post(p_account text, p_slot timestamptz, p_daily integer, p_monthly integer)
returns setof public.x_social_posts language plpgsql security invoker set search_path = pg_catalog, public as $$
declare n integer; v_id uuid := gen_random_uuid(); v_content text := 'x-' || v_id::text;
begin
  if p_slot is null or p_daily is null or p_daily not between 1 and 4 or p_monthly is null or p_monthly not between 1 and 124 then raise exception 'invalid_limits'; end if;
  insert into public.x_posting_accounts values(p_account) on conflict do nothing;
  perform 1 from public.x_posting_accounts where account_id=p_account for update;
  if exists(select 1 from public.x_social_posts where account_id=p_account and scheduled_at=p_slot) then return; end if;
  select count(*) into n from public.x_social_posts where account_id=p_account
    and (scheduled_at at time zone 'Asia/Tokyo')::date=(p_slot at time zone 'Asia/Tokyo')::date;
  if n>=p_daily then return; end if;
  select count(*) into n from public.x_social_posts where account_id=p_account
    and date_trunc('month', created_at at time zone 'Asia/Tokyo')=date_trunc('month', now() at time zone 'Asia/Tokyo');
  if n>=p_monthly then return; end if;
  return query insert into public.x_social_posts(id,account_id,scheduled_at,utm_content,utm)
    values(v_id,p_account,p_slot,v_content,jsonb_build_object('utm_source','x','utm_medium','social','utm_campaign','organic_x','utm_content',v_content,'ref',v_content)) returning *;
end $$;

create function public.prepare_x_post(p_id uuid, p_generation jsonb, p_model text, p_hash text, p_keys text[])
returns boolean language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.x_social_posts;
begin
  select * into p from public.x_social_posts where id=p_id;
  if not found then return false; end if;
  perform 1 from public.x_posting_accounts where account_id=p.account_id for update;
  select * into p from public.x_social_posts where id=p_id for update;
  if p.status <> 'draft' then return false; end if;
  if coalesce((p_generation->'quality'->>'passed')::boolean,false) is not true or coalesce(length(p_generation->>'text'),0)=0 or cardinality(p_keys)<1 then raise exception 'invalid_generation'; end if;
  if exists(select 1 from public.x_social_posts h where h.account_id=p.account_id and h.id<>p_id
    and h.status in ('ready','publishing','published','uncertain')
    and (h.content_hash=p_hash or h.content_id=p_generation->>'contentId'
      or (2.0*(select count(*) from (select unnest(h.content_keys) intersect select unnest(p_keys)) k)
          / greatest(cardinality(h.content_keys)+cardinality(p_keys),1)) >= 0.72)) then
    update public.x_social_posts set status='cancelled',error_summary='duplicate_content',updated_at=now() where id=p_id;
    return false;
  end if;
  update public.x_social_posts set status='ready',generation=p_generation,text=p_generation->>'text',theme=p_generation->>'theme',
    content_id=p_generation->>'contentId',destination_url=p_generation->>'destinationUrl',ai_model=p_model,content_hash=p_hash,content_keys=p_keys,updated_at=now() where id=p_id;
  return true;
end $$;

create function public.begin_x_publish(p_id uuid, p_daily integer default 4)
returns boolean language plpgsql security invoker set search_path = pg_catalog, public as $$
declare p public.x_social_posts; n integer;
begin
  if p_daily is null or p_daily not between 1 and 4 then raise exception 'invalid_limits'; end if;
  select * into p from public.x_social_posts where id=p_id;
  if not found then return false; end if;
  perform 1 from public.x_posting_accounts where account_id=p.account_id for update;
  -- Actual request date is also capped, including uncertain/failed attempts.
  select count(*) into n from public.x_social_posts where account_id=p.account_id
    and (publish_attempt_at at time zone 'Asia/Tokyo')::date=(now() at time zone 'Asia/Tokyo')::date;
  if n>=p_daily then return false; end if;
  update public.x_social_posts set status='publishing',publish_attempt_at=now(),updated_at=now() where id=p_id and status='ready';
  return found;
end $$;

create function public.finish_x_post(p_id uuid, p_status text, p_x_id text, p_error text)
returns boolean language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if p_status not in ('published','failed','uncertain') or p_status is null then raise exception 'invalid_state'; end if;
  if p_status='published' and (p_x_id is null or p_x_id !~ '^[0-9]{1,25}$') then raise exception 'invalid_post_id'; end if;
  update public.x_social_posts set status=p_status,x_post_id=p_x_id,
    published_at=case when p_status='published' then now() else null end,
    post_url=case when p_status='published' then 'https://x.com/i/web/status/'||p_x_id else null end,
    error_summary=left(p_error,200),updated_at=now() where id=p_id and status='publishing';
  return found;
end $$;

create function public.recover_x_posts() returns integer language plpgsql security invoker set search_path = pg_catalog, public as $$
declare n integer;
begin
  update public.x_social_posts set status=case when status='publishing' then 'uncertain' else 'failed' end,
    error_summary='interrupted_run_no_retry',updated_at=now()
    where status in ('draft','publishing') and updated_at < now()-interval '20 minutes';
  get diagnostics n = row_count; return n;
end $$;

-- Operator attestation only. Cancellation never releases the slot or AI quota.
create function public.reconcile_x_post(p_id uuid, p_x_id text, p_note text) returns boolean
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if coalesce(length(trim(p_note)),0)<10 or (p_x_id is not null and p_x_id !~ '^[0-9]{1,25}$') then raise exception 'reconciliation_requires_evidence'; end if;
  update public.x_social_posts set status=case when p_x_id is null then 'cancelled' else 'published' end,
    x_post_id=p_x_id,published_at=case when p_x_id is not null then coalesce(publish_attempt_at,now()) else null end,
    post_url=case when p_x_id is not null then 'https://x.com/i/web/status/'||p_x_id else null end,
    reconciliation_note=left(p_note,500),updated_at=now()
    where id=p_id and status in ('uncertain','ready');
  return found;
end $$;

-- Aggregate visits and signups separately to avoid multiplying either count.
create function public.x_post_performance() returns table(id uuid,scheduled_at timestamptz,theme text,status text,visits bigint,visitors bigint,signups bigint,conversion numeric)
language sql security invoker set search_path = pg_catalog, public as $$
  select p.id,p.scheduled_at,p.theme,p.status,v.visits,v.visitors,s.signups,
    round(100.0*s.signups/nullif(v.visitors,0),2)
  from public.x_social_posts p
  cross join lateral (select count(*) as visits,count(distinct f.visitor_id) as visitors from public.public_funnel_events f where f.event='view' and f.placement=p.utm_content) v
  cross join lateral (select count(*) as signups from public.signup_attributions a where a.ref=p.utm_content and a.utm_source='x' and a.utm_medium='social' and a.utm_campaign='organic_x') s;
$$;
revoke all on function public.claim_x_post(text,timestamptz,integer,integer),public.prepare_x_post(uuid,jsonb,text,text,text[]),public.begin_x_publish(uuid,integer),public.finish_x_post(uuid,text,text,text),public.recover_x_posts(),public.reconcile_x_post(uuid,text,text),public.x_post_performance() from public,anon,authenticated;
grant execute on function public.claim_x_post(text,timestamptz,integer,integer),public.prepare_x_post(uuid,jsonb,text,text,text[]),public.begin_x_publish(uuid,integer),public.finish_x_post(uuid,text,text,text),public.recover_x_posts(),public.reconcile_x_post(uuid,text,text),public.x_post_performance() to service_role;
commit;
