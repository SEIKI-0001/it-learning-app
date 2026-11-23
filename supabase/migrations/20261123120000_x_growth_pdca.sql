-- X Growth Engine P3: weekly reviews (idempotent), hypotheses with outcomes, analysis inputs.
-- Additive only. Not applied to production by this change. No existing function is modified.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.x_growth_reviews
  add column action text check (action is null or action in ('continue','pause','repeat','replace','propose_adoption')),
  add column report_version text check (report_version is null or report_version ~ '^[a-z0-9_.-]{1,40}$');
-- One review per period per experiment (NULL = the period-level summary row).
create unique index x_growth_reviews_period_experiment on public.x_growth_reviews (period_start, period_end, coalesce(experiment_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.x_growth_hypotheses (
  id uuid primary key default gen_random_uuid(),
  hypothesis_key text not null check (hypothesis_key ~ '^[a-z0-9_]{1,120}$'),
  kind text not null check (kind in ('measurement','replicate','extend','rerun','explore')),
  statement text not null check (length(statement) between 1 and 500),
  rationale text not null check (length(rationale) between 1 and 2000),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  proposed_experiment jsonb check (proposed_experiment is null or jsonb_typeof(proposed_experiment) = 'object'),
  justification text check (justification is null or length(justification) <= 1000),
  -- Proposals never activate anything; an operator moves them to accepted/rejected.
  status text not null default 'proposed' check (status in ('proposed','accepted','rejected','tested','retired')),
  outcome text check (outcome is null or outcome in ('no_effect','inconclusive','lead','validated')),
  source_review_id uuid not null references public.x_growth_reviews(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (source_review_id, hypothesis_key)
);
create index x_growth_hypotheses_key on public.x_growth_hypotheses (hypothesis_key, created_at desc);

alter table public.x_growth_hypotheses enable row level security;
revoke all on public.x_growth_hypotheses from public, anon, authenticated, service_role;
grant select, insert, update on public.x_growth_hypotheses to service_role;

-- Analysis input: every scheduled post of the account in [since, until) with its snapshots and
-- per-post site attribution. Failed/uncertain rows are included for reliability metrics.
create function public.x_growth_analysis_rows(p_account text, p_since timestamptz, p_until timestamptz)
returns table(post_id uuid, status text, scheduled_at timestamptz, published_at timestamptz, theme text, error_summary text,
  experiment_id uuid, variant_id text, content_style text, topic_id text, metrics_eligible boolean,
  s24_status text, s24_impressions bigint,
  s72_status text, s72_impressions bigint, s72_likes bigint, s72_reposts bigint, s72_replies bigint, s72_quotes bigint, s72_bookmarks bigint, s72_age_hours numeric,
  site_visits bigint, site_visitors bigint, site_signups bigint)
language sql stable security invoker set search_path = pg_catalog, public as $$
  select p.id, p.status, p.scheduled_at, p.published_at, p.theme, p.error_summary,
    p.experiment_id, p.variant_id, p.content_style, p.topic_id, p.metrics_eligible,
    d.collection_status, d.impressions,
    t.collection_status, t.impressions, t.likes, t.reposts, t.replies, t.quotes, t.bookmarks, t.age_hours,
    perf.visits, perf.visitors, perf.signups
  from public.x_social_posts p
  left join public.x_growth_post_metrics d on d.post_id = p.id and d.snapshot_stage = '24h'
  left join public.x_growth_post_metrics t on t.post_id = p.id and t.snapshot_stage = '72h'
  left join public.x_post_performance() perf on perf.id = p.id
  where p.account_id = p_account and p.scheduled_at >= p_since and p.scheduled_at < p_until
  order by p.scheduled_at;
$$;

create function public.x_growth_list_experiments()
returns setof public.x_growth_experiments
language sql stable security invoker set search_path = pg_catalog, public as $$
  select * from public.x_growth_experiments order by created_at;
$$;

-- Earlier per-experiment classifications (for replication checks) and hypothesis outcomes
-- (to avoid re-proposing ineffective ideas).
create function public.x_growth_review_history(p_since timestamptz)
returns table(period_end timestamptz, experiment_id uuid, hypothesis_key text, status text, leader_style text, other_style text)
language sql stable security invoker set search_path = pg_catalog, public as $$
  select r.period_end, r.experiment_id, r.report->>'hypothesisKey', r.report->>'status', r.report->>'leaderStyle', r.report->>'otherStyle'
  from public.x_growth_reviews r
  where r.experiment_id is not null and r.period_end >= p_since
  order by r.period_end;
$$;
create function public.x_growth_hypothesis_outcomes(p_since timestamptz)
returns table(hypothesis_key text, outcome text, decided_at timestamptz)
language sql stable security invoker set search_path = pg_catalog, public as $$
  select h.hypothesis_key, h.outcome, h.decided_at from public.x_growth_hypotheses h
  where h.outcome is not null and h.decided_at >= p_since;
$$;

-- Operational summary for alerts (counts only; no post text, no user data).
create function public.x_growth_ops_summary(p_account text, p_now timestamptz)
returns jsonb
language sql stable security invoker set search_path = pg_catalog, public as $$
  select jsonb_build_object(
    'uncertain', (select count(*) from public.x_social_posts where account_id = p_account and status = 'uncertain'),
    'staleReady', (select count(*) from public.x_social_posts where account_id = p_account and status = 'ready' and updated_at < p_now - interval '1 day'),
    'stalePublishing', (select count(*) from public.x_social_posts where account_id = p_account and status = 'publishing' and updated_at < p_now - interval '20 minutes'),
    'readsToday', (select coalesce(sum(reserved_reads), 0) from public.x_growth_metric_runs where account_id = p_account and (started_at at time zone 'Asia/Tokyo')::date = (p_now at time zone 'Asia/Tokyo')::date),
    'readsMonth', (select coalesce(sum(reserved_reads), 0) from public.x_growth_metric_runs where account_id = p_account and date_trunc('month', started_at at time zone 'Asia/Tokyo') = date_trunc('month', p_now at time zone 'Asia/Tokyo')),
    'estimatedUsdMonth', (select coalesce(sum(estimated_usd), 0) from public.x_growth_metric_runs where account_id = p_account and date_trunc('month', started_at at time zone 'Asia/Tokyo') = date_trunc('month', p_now at time zone 'Asia/Tokyo')),
    'runs7d', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from public.x_growth_metric_runs where account_id = p_account and started_at >= p_now - interval '7 days' group by status) x),
    'runErrors7d', (select coalesce(jsonb_object_agg(error_code, n), '{}'::jsonb) from (select error_code, count(*) n from public.x_growth_metric_runs where account_id = p_account and started_at >= p_now - interval '7 days' and error_code is not null group by error_code) x),
    'runningExperiments', (select count(*) from public.x_growth_experiments where status = 'running')
  );
$$;

-- Idempotent save. An existing review for the same period/experiment is never overwritten; its id
-- is returned with created=false. Hypotheses are inserted only with a newly created review.
-- When an ended experiment is classified, open hypotheses with its key get the outcome.
create function public.save_x_growth_review(p_period_start timestamptz, p_period_end timestamptz, p_experiment uuid, p_report jsonb,
  p_decision text, p_action text, p_ai text, p_version text, p_hypotheses jsonb)
returns table(review_id uuid, created boolean)
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_id uuid; h jsonb; v_outcome text;
begin
  if p_hypotheses is not null and (jsonb_typeof(p_hypotheses) <> 'array' or jsonb_array_length(p_hypotheses) > 3) then raise exception 'invalid_hypotheses'; end if;
  insert into public.x_growth_reviews(period_start, period_end, experiment_id, report, decision, action, ai_analysis, report_version)
    values (p_period_start, p_period_end, p_experiment, p_report, p_decision, p_action, p_ai, p_version)
    on conflict (period_start, period_end, coalesce(experiment_id, '00000000-0000-0000-0000-000000000000'::uuid)) do nothing
    returning id into v_id;
  if v_id is null then
    select r.id into v_id from public.x_growth_reviews r where r.period_start = p_period_start and r.period_end = p_period_end
      and coalesce(r.experiment_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_experiment, '00000000-0000-0000-0000-000000000000'::uuid);
    return query select v_id, false; return;
  end if;
  for h in select * from jsonb_array_elements(coalesce(p_hypotheses, '[]'::jsonb)) loop
    insert into public.x_growth_hypotheses(hypothesis_key, kind, statement, rationale, evidence, proposed_experiment, justification, source_review_id)
      values (h->>'key', h->>'kind', h->>'statement', h->>'rationale', coalesce(h->'evidence', '{}'::jsonb),
        case when jsonb_typeof(h->'proposedExperiment') = 'object' then h->'proposedExperiment' end, h->>'justification', v_id);
  end loop;
  if p_experiment is not null and (p_report->>'ended')::boolean is true and p_report->>'hypothesisKey' is not null then
    v_outcome := case p_report->>'status' when 'no_clear_difference' then 'no_effect' when 'exploratory_lead' then 'lead' when 'validated_lead' then 'validated' else 'inconclusive' end;
    update public.x_growth_hypotheses set status = 'tested', outcome = v_outcome, decided_at = now()
      where hypothesis_key = p_report->>'hypothesisKey' and status in ('proposed','accepted');
  end if;
  return query select v_id, true;
end $$;

revoke all on function public.x_growth_ops_summary(text,timestamptz), public.x_growth_analysis_rows(text,timestamptz,timestamptz), public.x_growth_list_experiments(), public.x_growth_review_history(timestamptz),
  public.x_growth_hypothesis_outcomes(timestamptz), public.save_x_growth_review(timestamptz,timestamptz,uuid,jsonb,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.x_growth_ops_summary(text,timestamptz), public.x_growth_analysis_rows(text,timestamptz,timestamptz), public.x_growth_list_experiments(), public.x_growth_review_history(timestamptz),
  public.x_growth_hypothesis_outcomes(timestamptz), public.save_x_growth_review(timestamptz,timestamptz,uuid,jsonb,text,text,text,text,jsonb) to service_role;
commit;
