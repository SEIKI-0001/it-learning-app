-- X Growth Engine: auto-drafted next experiments and explicit approve/pause.
-- Additive only. Not applied to production by this change. Drafts never post anything:
-- only an operator-triggered approve_x_experiment() makes an experiment running.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.x_growth_experiments
  add column created_by text not null default 'operator' check (created_by in ('operator','auto_draft')),
  add column approved_at timestamptz;

-- At most one open (draft/approved/running) experiment per hypothesis, so repeated weekly runs
-- cannot pile up duplicate drafts.
create unique index x_growth_experiments_one_open_per_hypothesis on public.x_growth_experiments (hypothesis_key)
  where hypothesis_key is not null and status in ('draft','approved','running');

create function public.create_x_experiment_draft(p_name text, p_hypothesis text, p_hypothesis_key text, p_start timestamptz, p_end timestamptz,
  p_min_posts integer, p_variants jsonb, p_seed text, p_config jsonb)
returns table(experiment_id uuid, created boolean)
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  if p_hypothesis_key is null or p_start is null or p_end is null or p_end <= p_start or jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) <> 2 then raise exception 'invalid_draft'; end if;
  insert into public.x_growth_experiments(name, hypothesis, status, primary_metric, start_at, end_at, min_posts_per_variant, variants, allocation_seed, experiment_version, hypothesis_key, config, created_by)
    values (p_name, p_hypothesis, 'draft', 'impressions_72h', p_start, p_end, p_min_posts, p_variants, p_seed, 'v1', p_hypothesis_key, coalesce(p_config, '{}'::jsonb), 'auto_draft')
    on conflict (hypothesis_key) where hypothesis_key is not null and status in ('draft','approved','running') do nothing
    returning id into v_id;
  if v_id is null then
    select e.id into v_id from public.x_growth_experiments e where e.hypothesis_key = p_hypothesis_key and e.status in ('draft','approved','running') limit 1;
    return query select v_id, false; return;
  end if;
  return query select v_id, true;
end $$;

-- draft → running. Refuses when another experiment is running (one assignment per slot).
create function public.approve_x_experiment(p_id uuid)
returns text
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare e public.x_growth_experiments;
begin
  perform pg_advisory_xact_lock(hashtext('x_growth_experiment_status'));
  select * into e from public.x_growth_experiments where id = p_id for update;
  if not found then return 'not_found'; end if;
  if e.status <> 'draft' then return 'not_draft'; end if;
  if e.end_at is not null and e.end_at <= now() then return 'already_ended'; end if;
  if exists (select 1 from public.x_growth_experiments where status = 'running') then return 'another_running'; end if;
  update public.x_growth_experiments set status = 'running', approved_at = now() where id = p_id;
  return 'running';
end $$;

-- running → paused (the kill switch for one experiment; posts fall back to the normal pipeline).
create function public.pause_x_experiment(p_id uuid)
returns text
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  update public.x_growth_experiments set status = 'paused' where id = p_id and status = 'running';
  return case when found then 'paused' else 'not_running' end;
end $$;

revoke all on function public.create_x_experiment_draft(text,text,text,timestamptz,timestamptz,integer,jsonb,text,jsonb), public.approve_x_experiment(uuid), public.pause_x_experiment(uuid) from public, anon, authenticated;
grant execute on function public.create_x_experiment_draft(text,text,text,timestamptz,timestamptz,integer,jsonb,text,jsonb), public.approve_x_experiment(uuid), public.pause_x_experiment(uuid) to service_role;
commit;
