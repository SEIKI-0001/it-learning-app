-- Explicit cross-device linking. Service-role RPCs only; no bearer code stored.
alter table public.line_users add column merged_into uuid references public.line_users(id);
create table public.account_link_codes(code_hash text primary key check(length(code_hash)=64),user_id uuid not null references public.line_users(id),expires_at timestamptz not null default now()+interval '10 minutes');
create table public.account_merge_archive(id bigint generated always as identity primary key,source_user_id uuid not null,target_user_id uuid not null,snapshot jsonb not null,created_at timestamptz not null default now());
alter table public.account_link_codes enable row level security;
alter table public.account_merge_archive enable row level security;
revoke all on public.account_link_codes,public.account_merge_archive from public,anon,authenticated;

create function public.canonical_account_id(p_id uuid) returns uuid language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(merged_into,id) from public.line_users where id=p_id
$$;
create function public.account_merge_tables() returns text[] language sql immutable set search_path=pg_catalog,public as $$
 select array['user_profiles','user_progress','user_answers','question_attempts','assessment_sessions','assessment_session_answers','assessment_attempt_receipts','ai_grading_records','ai_usage_logs','billing_purchases','billing_subscriptions','daily_progress_reports','daily_study_tasks','exam_readiness_current','exam_readiness_evidence_events','exam_readiness_evidence_state','exam_readiness_recalculation_jobs','exam_readiness_snapshots','integrated_learning_status','line_sessions','notification_deliveries','notification_preferences','plan_adjustment_proposals','progress_readiness_completions','topic_check_pack_attempts','topic_progress','user_feedback','user_reference_books','user_word_progress']::text[]
$$;
create function public.create_account_link_code(p_user_id uuid,p_hash text) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 perform 1 from public.line_users where id=p_user_id and line_user_id is not null and auth_user_id is null and merged_into is null for update;
 if not found then raise exception 'LINE_ONLY_REQUIRED' using errcode='22023';end if;
 delete from public.account_link_codes where user_id=p_user_id or expires_at<now();
 insert into public.account_link_codes(code_hash,user_id) values(p_hash,p_user_id);
end $$;
create function public.account_link_snapshot(p_target uuid,p_hash text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare src uuid;t text;rows jsonb;result jsonb:='{}';begin
 select c.user_id into src from public.account_link_codes c join public.line_users l on l.id=c.user_id
 where code_hash=p_hash and expires_at>now() and l.merged_into is null and l.line_user_id is not null and l.auth_user_id is null;
 if src is null then raise exception 'INVALID_LINK_CODE' using errcode='22023';end if;
 if not exists(select 1 from public.line_users where id=p_target and auth_user_id is not null and line_user_id is null and merged_into is null) then
 raise exception 'GOOGLE_ONLY_REQUIRED' using errcode='22023';end if;
 foreach t in array public.account_merge_tables() loop
 execute format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]'') from public.%I r where user_id in ($1,$2)',t) into rows using src,p_target;
 result:=result||jsonb_build_object(t,rows);
 end loop;
 return jsonb_build_object('source',src,'target',p_target,'tables',result);
end $$;
-- Ownership FKs must remain valid at transaction commit, including attempt receipts.
do $$ declare c record;begin
 for c in select conrelid::regclass as tbl,conname from pg_constraint where contype='f' and connamespace='public'::regnamespace and array_length(conkey,1)>1 and conrelid in (select format('public.%I',t)::regclass from unnest(public.account_merge_tables()) t) loop
 execute format('alter table %s alter constraint %I deferrable initially deferred',c.tbl,c.conname);
 end loop;
end $$;
create function public.complete_account_link(p_target uuid,p_hash text,p_snapshot jsonb,p_plan jsonb) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare src uuid;line_id text;t text;cols text;updates text;pk text;actual jsonb;allowed text[]:=public.account_merge_tables();begin
 set local lock_timeout='5s';
 lock table public.line_users in share row exclusive mode;
 -- Consistent lock order; compare every row again after the locks, not just progress.
 for t in select unnest(allowed) order by 1 loop execute format('lock table public.%I in share row exclusive mode',t);end loop;
 actual:=public.account_link_snapshot(p_target,p_hash);
 if actual is distinct from p_snapshot then raise exception 'ACCOUNT_CHANGED_RETRY' using errcode='40001';end if;
 src:=(actual->>'source')::uuid;
 if exists(select 1 from public.assessment_sessions where user_id in(src,p_target) and status='in_progress') or
 exists(select 1 from public.exam_readiness_evidence_state where user_id in(src,p_target) and lease_expires_at>now()) then
 raise exception 'FINISH_ACTIVE_SESSION' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(p_plan) k where not(k=any(allowed))) or (select count(*) from jsonb_object_keys(p_plan))<>array_length(allowed,1) then raise exception 'INVALID_PLAN';end if;
 insert into public.account_merge_archive(source_user_id,target_user_id,snapshot) values(src,p_target,p_snapshot);
 -- Demote before moving: the plan elects the earliest combined exposure.
 update public.question_attempts set is_first_attempt=false where user_id in(src,p_target);
 foreach t in array allowed loop
 if t=any(array['exam_readiness_current','exam_readiness_evidence_events','exam_readiness_evidence_state','exam_readiness_recalculation_jobs','exam_readiness_snapshots','integrated_learning_status','plan_adjustment_proposals']) then
   execute format('delete from public.%I where user_id in($1,$2)',t) using src,p_target;
   continue;
 end if;
 if exists(select 1 from jsonb_array_elements(p_plan->t) r where (r->>'user_id')::uuid is distinct from p_target) then raise exception 'INVALID_OWNER';end if;
 select string_agg(format('%I',a.attname),',' order by a.attnum),string_agg(format('%I=excluded.%I',a.attname,a.attname),',' order by a.attnum)
 into cols,updates from pg_attribute a where a.attrelid=format('public.%I',t)::regclass and a.attnum>0 and not a.attisdropped;
 select string_agg(format('%I',a.attname),',' order by k.n) into pk from pg_constraint c cross join lateral unnest(c.conkey) with ordinality k(attnum,n) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum where c.conrelid=format('public.%I',t)::regclass and c.contype='p';
 execute format('insert into public.%I(%s) select %s from jsonb_populate_recordset(null::public.%I,$1) on conflict(%s) do update set %s',t,cols,cols,t,pk,updates) using p_plan->t;
 end loop;
 -- Any unsupported uniqueness conflict aborts before any deletion is committed.
 foreach t in array allowed loop execute format('delete from public.%I where user_id=$1',t) using src;end loop;
 select line_user_id into line_id from public.line_users where id=src;
 update public.line_users set line_user_id=null,merged_into=p_target,updated_at=now() where id=src;
 update public.line_users set line_user_id=line_id,updated_at=now() where id=p_target;
 delete from public.account_link_codes where user_id in(src,p_target);
 return p_target;
end $$;
revoke all on function public.canonical_account_id(uuid),public.account_merge_tables(),public.create_account_link_code(uuid,text),public.account_link_snapshot(uuid,text),public.complete_account_link(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.canonical_account_id(uuid),public.create_account_link_code(uuid,text),public.account_link_snapshot(uuid,text),public.complete_account_link(uuid,text,jsonb,jsonb) to service_role;

-- Preserve the original idempotency payload while atomically saving its merged
-- state. Optimistic comparison protects writes racing each other or a merge.
create function public.save_shared_user_progress(p_user_id uuid,p_original jsonb,p_expected jsonb,p_merged jsonb,p_trigger_type text default null,p_trigger_id text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actual jsonb;result jsonb;begin
 perform 1 from public.line_users where id=p_user_id and merged_into is null for update;
 if not found then raise exception 'ACCOUNT_CHANGED_RETRY' using errcode='40001';end if;
 if p_trigger_id is not null and exists(select 1 from public.progress_readiness_completions where user_id=p_user_id and trigger_type=p_trigger_type and trigger_id=p_trigger_id) then
   return public.save_user_progress_with_readiness_evidence(p_user_id,p_original,p_trigger_type,p_trigger_id);
 end if;
 select to_jsonb(r) into actual from public.user_progress r where user_id=p_user_id for update;
 if actual is distinct from p_expected then raise exception 'PROGRESS_CHANGED_RETRY' using errcode='40001';end if;
 result:=public.save_user_progress_with_readiness_evidence(p_user_id,p_merged,p_trigger_type,p_trigger_id);
 if p_trigger_id is not null then
 update public.progress_readiness_completions set progress_payload=p_original,payload_fingerprint=md5(p_original::text) where user_id=p_user_id and trigger_type=p_trigger_type and trigger_id=p_trigger_id;
 end if;
 return result;
end $$;
revoke all on function public.save_shared_user_progress(uuid,jsonb,jsonb,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.save_shared_user_progress(uuid,jsonb,jsonb,jsonb,text,text) to service_role;

-- A request can have resolved its identity before linking began. Reject that
-- stale write at the database boundary instead of recreating split records.
create function public.guard_merged_account_write() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare merged uuid;begin
 if new.user_id is null then return new;end if;
 select merged_into into merged from public.line_users where id=new.user_id for share;
 if merged is not null then raise exception 'ACCOUNT_LINKED_RELOAD' using errcode='40001';end if;
 return new;
end $$;
revoke all on function public.guard_merged_account_write() from public,anon,authenticated;
do $$ declare t text;begin
 foreach t in array public.account_merge_tables() loop
 execute format('create trigger guard_merged_account before insert or update on public.%I for each row execute function public.guard_merged_account_write()',t);
 end loop;
end $$;

-- Word counters are accumulated facts; late snapshots cannot lower them.
create function public.preserve_shared_word_progress() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 new.correct_count:=greatest(old.correct_count,new.correct_count);
 new.wrong_count:=greatest(old.wrong_count,new.wrong_count);
 new.review_count:=greatest(old.review_count,new.review_count);
 if old.last_reviewed_at is not null and (new.last_reviewed_at is null or new.last_reviewed_at<old.last_reviewed_at) then
 new.last_reviewed_at:=old.last_reviewed_at;new.next_review_at:=old.next_review_at;
 new.last_self_rating:=old.last_self_rating;new.status:=old.status;
 end if;
 return new;
end $$;
revoke all on function public.preserve_shared_word_progress() from public,anon,authenticated;
create trigger preserve_shared_word_progress before update on public.user_word_progress for each row execute function public.preserve_shared_word_progress();
