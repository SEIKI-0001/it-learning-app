-- PostgREST 14 retries SQLSTATE 40001 indefinitely inside RPC transactions.
-- Replace application-level optimistic-concurrency signals with ordinary
-- PL/pgSQL exceptions (P0001) so callers can handle/retry them explicitly.

do $$
declare
  r record;
  ddl text;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname in (
        'complete_account_link',
        'complete_assessment_session',
        'guard_merged_account_write',
        'record_assessment_question_attempts_with_exposure',
        'save_shared_user_progress'
      )
      and pg_get_functiondef(p.oid) like '%40001%'
  loop
    ddl := pg_get_functiondef(r.oid);
    ddl := replace(ddl, ' using errcode = ''40001''', '');
    ddl := replace(ddl, ' using errcode=''40001''', '');

    if ddl like '%40001%' then
      raise exception 'unhandled SQLSTATE 40001 remained in function %', r.oid::regprocedure;
    end if;

    execute ddl;
  end loop;
end
$$;
