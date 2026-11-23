-- X Growth Engine P2: experiment configuration and tagging of posts with their assigned arm.
-- Additive only. Not applied to production by this change. No existing function is modified.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.x_growth_experiments
  add column hypothesis_key text check (hypothesis_key is null or hypothesis_key ~ '^[a-z0-9_]{1,80}$'),
  add column config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  -- Two arms only (P2): [{"id":"A","contentStyle":"definition_first"},{"id":"B","contentStyle":"question_first"}]
  add constraint x_growth_experiments_two_variants check (
    jsonb_array_length(variants) in (0, 2)
    and (status = 'draft' or jsonb_array_length(variants) = 2)
  ),
  add constraint x_growth_experiments_running_has_period check (status not in ('approved','running') or (start_at is not null and allocation_seed is not null));

-- At most one running experiment, so every slot has a single unambiguous assignment.
create unique index x_growth_experiments_one_running on public.x_growth_experiments ((true)) where status = 'running';

create function public.active_x_experiment(p_slot timestamptz)
returns setof public.x_growth_experiments
language sql stable security invoker set search_path = pg_catalog, public as $$
  select e.* from public.x_growth_experiments e
  where e.status = 'running' and e.start_at <= p_slot and (e.end_at is null or p_slot < e.end_at)
  limit 1;
$$;

-- Tags a claimed DRAFT row with its experiment arm before prepare/publish. The arm itself is
-- computed by application code; this function only accepts values consistent with the experiment.
create function public.tag_x_post_experiment(p_id uuid, p_experiment uuid, p_variant text, p_style text, p_topic text, p_version text)
returns boolean
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare e public.x_growth_experiments; p public.x_social_posts;
begin
  select * into p from public.x_social_posts where id = p_id;
  if not found then return false; end if;
  select * into e from public.x_growth_experiments where id = p_experiment;
  if not found or e.status <> 'running' or p.scheduled_at < e.start_at or (e.end_at is not null and p.scheduled_at >= e.end_at) then raise exception 'experiment_not_running'; end if;
  if not exists (select 1 from jsonb_array_elements(e.variants) v where v->>'id' = p_variant and v->>'contentStyle' = p_style) then raise exception 'experiment_variant_mismatch'; end if;
  update public.x_social_posts set experiment_id = p_experiment, variant_id = p_variant, content_style = p_style, topic_id = p_topic,
    generation_version = p_version, metrics_eligible = true, updated_at = now()
    where id = p_id and status = 'draft' and experiment_id is null;
  return found;
end $$;

revoke all on function public.active_x_experiment(timestamptz), public.tag_x_post_experiment(uuid,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.active_x_experiment(timestamptz), public.tag_x_post_experiment(uuid,uuid,text,text,text,text) to service_role;
commit;
