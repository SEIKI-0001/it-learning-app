-- Durable learning history. Internal line_users IDs; server access only.
create table public.learning_journal_records (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.line_users(id) on delete cascade,
 record_type text not null check(record_type in ('daily','weekly','checkpoint')),
 record_key text not null,
 period_start date not null, period_end date not null check(period_end>=period_start),
 occurred_at timestamptz not null, timezone text not null,
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 narrative jsonb, narrative_status text not null default 'pending' check(narrative_status in ('pending','retry','ready','not_needed')),
 narrative_attempts integer not null default 0 check(narrative_attempts>=0),
 next_retry_at timestamptz not null default now(), lease_until timestamptz,
 created_at timestamptz not null default now(), finalized_at timestamptz, first_viewed_at timestamptz,
 unique(user_id,record_type,record_key)
);
create index learning_journal_month_idx on public.learning_journal_records(user_id,period_end desc,occurred_at desc);
create index learning_journal_retry_idx on public.learning_journal_records(next_retry_at) where narrative_status in ('pending','retry') and finalized_at is not null;
alter table public.learning_journal_records enable row level security;
revoke all on public.learning_journal_records from public,anon,authenticated;
grant all on public.learning_journal_records to service_role;
-- Scheduling metadata is separate from immutable historical evidence.
create table public.learning_journal_schedule (
 user_id uuid primary key references public.line_users(id) on delete cascade,
 timezone text not null default 'Asia/Tokyo', last_checked_at timestamptz,
 lease_until timestamptz, next_weekly_date date
);
alter table public.learning_journal_schedule enable row level security;
revoke all on public.learning_journal_schedule from public,anon,authenticated;
grant all on public.learning_journal_schedule to service_role;

create function public.protect_learning_journal() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if old.finalized_at is not null and
   (new.snapshot is distinct from old.snapshot or new.finalized_at is distinct from old.finalized_at
    or new.period_start is distinct from old.period_start or new.period_end is distinct from old.period_end
    or new.timezone is distinct from old.timezone or new.occurred_at is distinct from old.occurred_at
    or new.record_type is distinct from old.record_type or new.record_key is distinct from old.record_key
    or new.created_at is distinct from old.created_at) then
   raise exception 'JOURNAL_FACTS_IMMUTABLE';
 end if;
 if old.narrative_status='ready' and (new.narrative is distinct from old.narrative or new.narrative_status <> 'ready') then raise exception 'JOURNAL_AI_IMMUTABLE';end if;
 if new.narrative_status='ready' and (new.finalized_at is null or coalesce(new.narrative->>'source','')<>'ai') then raise exception 'JOURNAL_AI_REQUIRES_FINAL_FACTS';end if;
 if old.first_viewed_at is not null and new.first_viewed_at is distinct from old.first_viewed_at then raise exception 'JOURNAL_FIRST_VIEW_IMMUTABLE';end if;
 return new;
end $$;
create trigger protect_learning_journal before update on public.learning_journal_records for each row execute function public.protect_learning_journal();

create function public.claim_journal_narratives(p_user_id uuid default null,p_limit integer default 2)
returns setof public.learning_journal_records language sql set search_path=pg_catalog,public as $$
 update public.learning_journal_records r set lease_until=now()+interval '2 minutes',narrative_attempts=r.narrative_attempts+1
 where r.id in (select id from public.learning_journal_records
 where (p_user_id is null or user_id=p_user_id) and finalized_at is not null and narrative_status in ('pending','retry')
 and next_retry_at<=now() and (lease_until is null or lease_until<now())
 order by case when record_type='weekly' then 0 else 1 end,next_retry_at,created_at desc for update skip locked limit least(greatest(p_limit,1),5)) returning r.*;
$$;
create function public.claim_journal_users(p_limit integer default 10)
returns setof public.learning_journal_schedule language plpgsql set search_path=pg_catalog,public as $$
begin
 -- Enroll existing learners once, using their saved timezone where available.
 insert into public.learning_journal_schedule(user_id,timezone)
 select p.user_id,coalesce(n.timezone,'Asia/Tokyo') from public.user_progress p join public.line_users u on u.id=p.user_id
 left join public.notification_preferences n on n.user_id=p.user_id
 where u.merged_into is null on conflict(user_id) do nothing;
 return query update public.learning_journal_schedule s set lease_until=now()+interval '5 minutes'
 where s.user_id in (select q.user_id from public.learning_journal_schedule q join public.line_users u on u.id=q.user_id
 where u.merged_into is null and (q.lease_until is null or q.lease_until<now()) and (q.last_checked_at is null or q.last_checked_at<now()-interval '1 hour')
 order by q.last_checked_at nulls first for update of q skip locked limit least(greatest(p_limit,1),20)) returning s.*;
end $$;

-- Capture milestone evidence in the SAME transaction as the progress save.
create function public.capture_checkpoint_journal() returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare a jsonb; zone text; day date; cp text; at_time timestamptz; historical boolean;
 total_count integer; correct_count integer; completed integer; recovered integer; snapshot jsonb;
begin
 if tg_op='UPDATE' and new.user_id is distinct from old.user_id then return new;end if;
 zone:=coalesce((select timezone from public.learning_journal_schedule where user_id=new.user_id),'Asia/Tokyo');
 for a in select value from jsonb_array_elements(coalesce(new.checkpoint_progress->'finalExamAttempts','[]')) loop
 if a->>'passed' is distinct from 'true' or a->>'checkpointId' !~ '^cp[0-6]$' or a->>'attemptedAt' is null then continue;end if;
 cp:=a->>'checkpointId';
 if tg_op='UPDATE' and exists(select 1 from jsonb_array_elements(coalesce(old.checkpoint_progress->'finalExamAttempts','[]')) x where x->>'checkpointId'=cp and x->>'passed'='true') then continue;end if;
 if exists(select 1 from public.learning_journal_records r where r.user_id=new.user_id and r.record_type='checkpoint' and r.snapshot->'checkpoint'->>'id'=cp) then continue;end if;
 begin at_time:=(a->>'attemptedAt')::timestamptz;exception when others then continue;end;
 if at_time>now()+interval '5 minutes' then continue;end if;
 day:=(at_time at time zone zone)::date;
 historical:=at_time<now()-interval '1 day';
 -- Pair legacy/modern mirrors by stable evidence coordinates, preserving repetitions.
 with modern as (select question_id,answered_at,is_correct from public.question_attempts where user_id=new.user_id and answered_at<=at_time),
 evidence as (select * from modern union all select question_id,answered_at,is_correct from public.user_answers l where l.user_id=new.user_id and l.answered_at<=at_time and not exists(select 1 from modern m where m.question_id=l.question_id and m.answered_at=l.answered_at and m.is_correct=l.is_correct))
 select count(*),count(*) filter(where is_correct),count(distinct e.question_id) filter(where e.is_correct and exists(select 1 from evidence p where p.question_id=e.question_id and not p.is_correct and p.answered_at<e.answered_at))
 into total_count,correct_count,recovered from evidence e;
 completed:=case when historical then null else cardinality(coalesce(new.completed_topics,'{}')) end;
 snapshot:=jsonb_build_object('version',1,'historical',historical,'facts',null,'comparison',null,
 'metrics',jsonb_build_object('answered',total_count,'correct',correct_count,'accuracy',case when total_count>0 then round(100.0*correct_count/total_count) else null end,'seconds',null,'unmeasured',total_count,'daysStudied',0,'completedTopics',completed),
 'comment',format('ここまでに保存された%s問の回答を重ね、CHECKPOINT %sを突破しました。以前間違えた問題のうち%s問に、その後正解した記録があります。',total_count,substring(cp from 3),recovered),
 'checkpoint',jsonb_build_object('id',cp,'label','CHECKPOINT '||substring(cp from 3),'next',case when substring(cp from 3)::int<6 then 'CHECKPOINT '||(substring(cp from 3)::int+1) else null end,'skills',jsonb_build_array(format('突破試験 %s問中%s問正解',a->>'total',a->>'correct'))),
 'progressAtCapture',case when historical then null else to_jsonb(new) - 'user_id' end);
 insert into public.learning_journal_records(user_id,record_type,record_key,period_start,period_end,occurred_at,timezone,snapshot,narrative_status,finalized_at)
 values(new.user_id,'checkpoint',new.user_id::text||':cp:'||cp,day,day,at_time,zone,snapshot,'not_needed',now()) on conflict do nothing;
 end loop;
 return new;
end $$;
create trigger capture_checkpoint_journal after insert or update of checkpoint_progress on public.user_progress for each row execute function public.capture_checkpoint_journal();

-- Include immutable history in existing account linking; move history before progress.
create or replace function public.account_merge_tables() returns text[] language sql immutable set search_path=pg_catalog,public as $$
 select array['learning_journal_records','learning_journal_schedule','user_profiles','user_progress','user_answers','question_attempts','assessment_sessions','assessment_session_answers','assessment_attempt_receipts','ai_grading_records','ai_usage_logs','billing_purchases','billing_subscriptions','daily_progress_reports','daily_study_tasks','exam_readiness_current','exam_readiness_evidence_events','exam_readiness_evidence_state','exam_readiness_recalculation_jobs','exam_readiness_snapshots','integrated_learning_status','line_sessions','notification_deliveries','notification_preferences','plan_adjustment_proposals','progress_readiness_completions','topic_check_pack_attempts','topic_progress','user_feedback','user_reference_books','user_word_progress']::text[]
$$;
revoke all on function public.protect_learning_journal(),public.capture_checkpoint_journal(),public.claim_journal_narratives(uuid,integer),public.claim_journal_users(integer),public.account_merge_tables() from public,anon,authenticated;
grant execute on function public.claim_journal_narratives(uuid,integer),public.claim_journal_users(integer) to service_role;

create function public.claim_journal_user(p_user_id uuid,p_timezone text)
returns setof public.learning_journal_schedule language plpgsql set search_path=pg_catalog,public as $$
begin
 if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'INVALID_TIMEZONE';end if;
 insert into public.learning_journal_schedule(user_id,timezone) values(p_user_id,p_timezone) on conflict do nothing;
 return query update public.learning_journal_schedule set timezone=p_timezone,lease_until=now()+interval '5 minutes'
 where user_id=p_user_id and (lease_until is null or lease_until<now()) returning *;
end $$;
revoke all on function public.claim_journal_user(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_journal_user(uuid,text) to service_role;
