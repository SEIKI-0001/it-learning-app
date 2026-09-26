-- Today のトピック以外のタスク（関連用語・公式過去問）を daily_study_tasks に正式保存する。
--
-- これまでは端末の localStorage（fequest:todayActivities:v1）だけが「今日出した／終えた」の
-- 記録だったため、端末Aで終えたタスクが端末Bでは未完了として再表示されていた。
--
-- activity_key     … その日のタスクの識別子（'act:vocab' / 'act:past-exam' / 'act:past-exam-retry'）。
--                     トピックのタスクは NULL のまま（既存の一意条件をそのまま使う）。
-- activity_payload … 別端末で同じタスクを復元するための最小限の中身
--                     （種類・単語ID・問題ID・分野・問題数など。表示文言は持たない）。
--
-- 一意性: (user_id, date, activity_key)。NULL 同士は重複とみなされないので、
-- activity_key を持たない既存のトピックタスクには影響しない。既存の
-- daily_study_tasks_unique_per_day（user/date/種別/topic/title）もそのまま残す。

alter table public.daily_study_tasks
  add column if not exists activity_key text,
  add column if not exists activity_payload jsonb;

alter table public.daily_study_tasks
  add constraint daily_study_tasks_activity_key_check
    check (activity_key is null or activity_key in ('act:vocab', 'act:past-exam', 'act:past-exam-retry')),
  add constraint daily_study_tasks_activity_payload_check
    check (
      activity_payload is null
      or (
        activity_key is not null
        and jsonb_typeof(activity_payload) = 'object'
        and pg_column_size(activity_payload) <= 4096
      )
    ),
  add constraint daily_study_tasks_activity_unique_per_day
    unique (user_id, date, activity_key);

comment on column public.daily_study_tasks.activity_key is
  'Today activity identifier (act:vocab / act:past-exam / act:past-exam-retry). NULL for topic tasks.';
comment on column public.daily_study_tasks.activity_payload is
  'Minimal data to restore the same Today activity on another device (word/question ids, field, count).';
