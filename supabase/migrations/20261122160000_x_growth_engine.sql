-- X Growth Engine P1: experiment registry, metrics snapshots, read budget ledger, reviews.
-- Additive only: no existing column, constraint, policy, grant or function is changed.
-- Private to the service-role CLI. Not applied to production by this change.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.x_growth_experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  hypothesis text not null check (length(hypothesis) between 1 and 2000),
  status text not null default 'draft' check (status in ('draft','approved','running','paused','completed')),
  primary_metric text not null default 'impressions_72h' check (primary_metric ~ '^[a-z0-9_]{1,64}$'),
  start_at timestamptz,
  end_at timestamptz,
  min_posts_per_variant integer not null default 14 check (min_posts_per_variant between 1 and 1000),
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  allocation_seed text check (allocation_seed is null or length(allocation_seed) <= 200),
  experiment_version text not null default 'v1' check (length(experiment_version) between 1 and 64),
  created_at timestamptz not null default now(),
  check (start_at is null or end_at is null or end_at > start_at)
);

-- Nullable / constant-default columns: existing rows and the posting RPCs keep working unchanged.
alter table public.x_social_posts
  add column experiment_id uuid references public.x_growth_experiments(id),
  add column variant_id text check (variant_id is null or variant_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  add column content_style text check (content_style is null or content_style ~ '^[a-z0-9_]{1,64}$'),
  add column topic_id text check (topic_id is null or length(topic_id) between 1 and 200),
  add column generation_version text check (generation_version is null or length(generation_version) between 1 and 64),
  add column metrics_eligible boolean not null default false;

-- One row per collection attempt batch. Reserved reads always count against the budget,
-- even when the request later fails (conservative: never under-count possible charges).
create table public.x_growth_metric_runs (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references public.x_posting_accounts(account_id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  reserved_reads integer not null check (reserved_reads between 1 and 100),
  estimated_usd numeric(10,4) not null check (estimated_usd >= 0),
  status text not null default 'reserved' check (status in ('reserved','ok','partial','rate_limited','permission_error','failed','interrupted')),
  error_code text check (error_code is null or error_code ~ '^[a-z0-9_]{1,80}$'),
  rate_limit_reset_at timestamptz,
  summary jsonb check (summary is null or jsonb_typeof(summary) = 'object')
);
create index x_growth_metric_runs_account_time on public.x_growth_metric_runs(account_id, started_at desc);

create table public.x_growth_post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.x_social_posts(id),
  x_post_id text not null check (x_post_id ~ '^[0-9]{1,25}$'),
  run_id uuid references public.x_growth_metric_runs(id),
  snapshot_stage text not null check (snapshot_stage in ('24h','72h','7d','manual')),
  measured_at timestamptz not null,
  age_hours numeric(8,2) check (age_hours is null or age_hours >= 0),
  impressions bigint check (impressions is null or impressions >= 0),
  likes bigint check (likes is null or likes >= 0),
  reposts bigint check (reposts is null or reposts >= 0),
  replies bigint check (replies is null or replies >= 0),
  quotes bigint check (quotes is null or quotes >= 0),
  bookmarks bigint check (bookmarks is null or bookmarks >= 0),
  organic jsonb check (organic is null or jsonb_typeof(organic) = 'object'),
  -- Site attribution at measurement time, from the existing x_post_performance() (cumulative).
  site_visits bigint check (site_visits is null or site_visits >= 0),
  site_visitors bigint check (site_visitors is null or site_visitors >= 0),
  site_signups bigint check (site_signups is null or site_signups >= 0),
  metric_source text not null check (metric_source ~ '^[a-z0-9_]{1,64}$'),
  collection_status text not null check (collection_status in ('ok','unavailable','permission_error','rate_limited','failed')),
  error_code text check (error_code is null or error_code ~ '^[a-z0-9_]{1,80}$'),
  attempt_count integer not null default 1 check (attempt_count between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, snapshot_stage),
  -- "ok" means the primary metric was actually read; missing data is never stored as 0.
  check (collection_status <> 'ok' or impressions is not null),
  check (collection_status = 'ok' or error_code is not null)
);

create table public.x_growth_reviews (
  id uuid primary key default gen_random_uuid(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  experiment_id uuid references public.x_growth_experiments(id),
  report jsonb not null check (jsonb_typeof(report) = 'object'),
  decision text not null check (decision in ('continue','inconclusive','propose_change','stop')),
  ai_analysis text check (ai_analysis is null or length(ai_analysis) <= 20000),
  approved boolean not null default false,
  generated_at timestamptz not null default now(),
  check (period_end > period_start)
);

alter table public.x_growth_experiments enable row level security;
alter table public.x_growth_metric_runs enable row level security;
alter table public.x_growth_post_metrics enable row level security;
alter table public.x_growth_reviews enable row level security;
-- Supabase default privileges grant ALL (incl. DELETE/TRUNCATE) on new public tables to anon,
-- authenticated AND service_role, so revoke from service_role too before granting only what is used.
revoke all on public.x_growth_experiments, public.x_growth_metric_runs, public.x_growth_post_metrics, public.x_growth_reviews from public, anon, authenticated, service_role;
grant select, insert, update on public.x_growth_experiments, public.x_growth_metric_runs, public.x_growth_post_metrics, public.x_growth_reviews to service_role;

-- Snapshot windows (hours after published_at): 24h = [22,40), 72h = [70,88).
-- A late run inside the window still measures (actual age is stored); after the window the
-- stage is recorded as missed instead of being measured at the wrong age.
-- Only our own published posts from the last 7 days. Rows that are final (ok, unavailable,
-- permission_error) or out of attempts are never returned again.
create function public.x_metrics_due(p_account text, p_now timestamptz, p_max_attempts integer)
returns table(post_id uuid, x_post_id text, published_at timestamptz, snapshot_stage text, age_hours numeric, attempt_count integer, window_state text)
language sql stable security invoker set search_path = pg_catalog, public as $$
  select p.id, p.x_post_id, p.published_at, s.stage, round(a.age, 2), coalesce(m.attempt_count, 0),
    case when a.age < s.close_h then 'due' else 'missed' end
  from public.x_social_posts p
  cross join lateral (select extract(epoch from (p_now - p.published_at)) / 3600.0 as age) a
  cross join (values ('24h', 22, 40), ('72h', 70, 88)) as s(stage, open_h, close_h)
  left join public.x_growth_post_metrics m on m.post_id = p.id and m.snapshot_stage = s.stage
  where p.account_id = p_account and p.status = 'published' and p.x_post_id is not null and p.published_at is not null
    and p.published_at <= p_now and p.published_at > p_now - interval '7 days'
    and a.age >= s.open_h
    and (
      (m.id is null)
      or (m.collection_status in ('rate_limited','failed') and m.attempt_count < p_max_attempts and a.age < s.close_h)
    )
  order by p.published_at, s.stage;
$$;

-- Atomic budget reservation BEFORE any X request. Serialized per account; one run at a time.
create function public.reserve_x_metrics_reads(p_account text, p_reads integer, p_daily integer, p_monthly integer, p_usd_per_read numeric)
returns table(run_id uuid, reason text)
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare used_day bigint; used_month bigint; v_id uuid;
begin
  if p_reads is null or p_reads not between 1 and 100 or p_daily is null or p_daily not between 1 and 10000
    or p_monthly is null or p_monthly not between 1 and 100000 or p_usd_per_read is null or p_usd_per_read < 0 then
    raise exception 'invalid_limits';
  end if;
  if not exists (select 1 from public.x_posting_accounts where account_id = p_account) then raise exception 'unknown_account'; end if;
  perform pg_advisory_xact_lock(hashtext('x_growth_metrics:' || p_account));
  -- A reservation left open for 30 minutes is an interrupted run; it still counts.
  update public.x_growth_metric_runs set status = 'interrupted', error_code = 'interrupted_run_no_retry', finished_at = now()
    where account_id = p_account and status = 'reserved' and started_at < now() - interval '30 minutes';
  if exists (select 1 from public.x_growth_metric_runs where account_id = p_account and status = 'reserved') then
    return query select null::uuid, 'run_in_progress'; return;
  end if;
  if exists (select 1 from public.x_growth_metric_runs where account_id = p_account and rate_limit_reset_at > now()) then
    return query select null::uuid, 'rate_limit_wait'; return;
  end if;
  select coalesce(sum(reserved_reads), 0) into used_day from public.x_growth_metric_runs
    where account_id = p_account and (started_at at time zone 'Asia/Tokyo')::date = (now() at time zone 'Asia/Tokyo')::date;
  if used_day + p_reads > p_daily then return query select null::uuid, 'daily_budget_exhausted'; return; end if;
  select coalesce(sum(reserved_reads), 0) into used_month from public.x_growth_metric_runs
    where account_id = p_account and date_trunc('month', started_at at time zone 'Asia/Tokyo') = date_trunc('month', now() at time zone 'Asia/Tokyo');
  if used_month + p_reads > p_monthly then return query select null::uuid, 'monthly_budget_exhausted'; return; end if;
  insert into public.x_growth_metric_runs(account_id, reserved_reads, estimated_usd)
    values (p_account, p_reads, round(p_reads * p_usd_per_read, 4)) returning id into v_id;
  return query select v_id, 'reserved';
end $$;

-- Idempotent snapshot write. A final row is never overwritten; a retryable row is updated in
-- place with attempt_count + 1 (bounded). Site attribution comes from x_post_performance().
create function public.record_x_metrics_snapshot(p_run uuid, p_post uuid, p_stage text, p_snapshot jsonb, p_max_attempts integer)
returns text
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare r public.x_growth_metric_runs; p public.x_social_posts; v_measured timestamptz; v_visits bigint; v_visitors bigint; v_signups bigint; v_result text;
begin
  if p_max_attempts is null or p_max_attempts not between 1 and 10 then raise exception 'invalid_limits'; end if;
  select * into r from public.x_growth_metric_runs where id = p_run;
  if not found or r.status <> 'reserved' then raise exception 'run_not_open'; end if;
  select * into p from public.x_social_posts where id = p_post;
  if not found or p.account_id <> r.account_id or p.status <> 'published' or p.x_post_id is distinct from p_snapshot->>'xPostId' then raise exception 'post_not_eligible'; end if;
  v_measured := (p_snapshot->>'measuredAt')::timestamptz;
  begin
    select perf.visits, perf.visitors, perf.signups into v_visits, v_visitors, v_signups from public.x_post_performance() perf where perf.id = p_post;
  exception when others then v_visits := null; v_visitors := null; v_signups := null; -- attribution is optional, never invented
  end;
  insert into public.x_growth_post_metrics as m (post_id, x_post_id, run_id, snapshot_stage, measured_at, age_hours, impressions, likes, reposts, replies, quotes, bookmarks, organic,
      site_visits, site_visitors, site_signups, metric_source, collection_status, error_code, attempt_count)
    values (p_post, p.x_post_id, p_run, p_stage, v_measured, round(greatest(extract(epoch from (v_measured - p.published_at)) / 3600.0, 0), 2),
      (p_snapshot->>'impressions')::bigint, (p_snapshot->>'likes')::bigint, (p_snapshot->>'reposts')::bigint, (p_snapshot->>'replies')::bigint,
      (p_snapshot->>'quotes')::bigint, (p_snapshot->>'bookmarks')::bigint, case when jsonb_typeof(p_snapshot->'organic') = 'object' then p_snapshot->'organic' end,
      v_visits, v_visitors, v_signups, coalesce(p_snapshot->>'metricSource', 'x_api_v2_get_tweets'), p_snapshot->>'collectionStatus', p_snapshot->>'errorCode', 1)
    on conflict (post_id, snapshot_stage) do update set
      run_id = excluded.run_id, measured_at = excluded.measured_at, age_hours = excluded.age_hours,
      impressions = excluded.impressions, likes = excluded.likes, reposts = excluded.reposts, replies = excluded.replies,
      quotes = excluded.quotes, bookmarks = excluded.bookmarks, organic = excluded.organic,
      site_visits = excluded.site_visits, site_visitors = excluded.site_visitors, site_signups = excluded.site_signups,
      metric_source = excluded.metric_source, collection_status = excluded.collection_status, error_code = excluded.error_code,
      attempt_count = m.attempt_count + 1, updated_at = now()
    where m.collection_status in ('rate_limited','failed') and m.attempt_count < p_max_attempts
    returning case when m.xmax::text = '0' then 'inserted' else 'updated' end into v_result;
  return coalesce(v_result, 'kept_final');
end $$;

-- Stages whose window passed without a measurement are recorded once as missed (no X request).
create function public.mark_x_metrics_missed(p_account text, p_now timestamptz)
returns integer
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare n integer;
begin
  insert into public.x_growth_post_metrics(post_id, x_post_id, snapshot_stage, measured_at, age_hours, metric_source, collection_status, error_code, attempt_count)
    select d.post_id, d.x_post_id, d.snapshot_stage, p_now, d.age_hours, 'x_api_v2_get_tweets', 'unavailable', 'x_metrics_window_missed', 0
    from public.x_metrics_due(p_account, p_now, 10) d
    where d.window_state = 'missed' and d.attempt_count = 0
  on conflict (post_id, snapshot_stage) do nothing;
  get diagnostics n = row_count; return n;
end $$;

create function public.finish_x_metrics_run(p_run uuid, p_status text, p_error text, p_reset timestamptz, p_summary jsonb)
returns boolean
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if p_status is null or p_status not in ('ok','partial','rate_limited','permission_error','failed') then raise exception 'invalid_state'; end if;
  update public.x_growth_metric_runs set status = p_status, error_code = p_error, rate_limit_reset_at = p_reset, summary = p_summary, finished_at = now()
    where id = p_run and status = 'reserved';
  return found;
end $$;

-- Per-post report: latest 24h/72h snapshots + current site attribution from x_post_performance().
create function public.x_growth_post_report(p_account text, p_since timestamptz)
returns table(post_id uuid, x_post_id text, published_at timestamptz, theme text, experiment_id uuid, variant_id text, content_style text, metrics_eligible boolean,
  status_24h text, measured_24h timestamptz, age_24h numeric, impressions_24h bigint,
  status_72h text, measured_72h timestamptz, age_72h numeric, impressions_72h bigint, likes_72h bigint, reposts_72h bigint, replies_72h bigint, quotes_72h bigint, bookmarks_72h bigint,
  engagements_72h bigint, organic_72h jsonb, site_visits bigint, site_visitors bigint, site_signups bigint)
language sql stable security invoker set search_path = pg_catalog, public as $$
  select p.id, p.x_post_id, p.published_at, p.theme, p.experiment_id, p.variant_id, p.content_style, p.metrics_eligible,
    d.collection_status, d.measured_at, d.age_hours, d.impressions,
    t.collection_status, t.measured_at, t.age_hours, t.impressions, t.likes, t.reposts, t.replies, t.quotes, t.bookmarks,
    t.likes + t.reposts + t.replies + t.quotes + t.bookmarks, t.organic,
    perf.visits, perf.visitors, perf.signups
  from public.x_social_posts p
  left join public.x_growth_post_metrics d on d.post_id = p.id and d.snapshot_stage = '24h'
  left join public.x_growth_post_metrics t on t.post_id = p.id and t.snapshot_stage = '72h'
  left join public.x_post_performance() perf on perf.id = p.id
  where p.account_id = p_account and p.status = 'published' and p.published_at >= p_since
  order by p.published_at desc;
$$;

revoke all on function public.x_metrics_due(text,timestamptz,integer), public.reserve_x_metrics_reads(text,integer,integer,integer,numeric),
  public.record_x_metrics_snapshot(uuid,uuid,text,jsonb,integer), public.mark_x_metrics_missed(text,timestamptz),
  public.finish_x_metrics_run(uuid,text,text,timestamptz,jsonb), public.x_growth_post_report(text,timestamptz) from public, anon, authenticated;
grant execute on function public.x_metrics_due(text,timestamptz,integer), public.reserve_x_metrics_reads(text,integer,integer,integer,numeric),
  public.record_x_metrics_snapshot(uuid,uuid,text,jsonb,integer), public.mark_x_metrics_missed(text,timestamptz),
  public.finish_x_metrics_run(uuid,text,text,timestamptz,jsonb), public.x_growth_post_report(text,timestamptz) to service_role;
commit;
