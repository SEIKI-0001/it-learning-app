begin;

create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(3);

select is(
  (
    select is_nullable::text
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'integrated_learning_status'
      and column_name = 'readiness_score'
  ),
  'YES'::text,
  'the legacy readiness compatibility column is nullable'
);

insert into public.line_users (id, line_user_id)
values ('23000000-0000-0000-0000-000000000010', 'nullable-readiness-test-user');

select lives_ok(
  $$
    insert into public.integrated_learning_status (
      user_id,
      status_date,
      overall_status,
      readiness_score
    ) values (
      '23000000-0000-0000-0000-000000000010',
      '2026-08-23',
      'on_track',
      null
    )
  $$,
  'a measuring readiness snapshot persists without a numeric sentinel'
);

select is(
  (
    select readiness_score
    from public.integrated_learning_status
    where user_id = '23000000-0000-0000-0000-000000000010'
      and status_date = '2026-08-23'
  ),
  null::integer,
  'the compatibility value remains null on read'
);

select * from finish();
rollback;
