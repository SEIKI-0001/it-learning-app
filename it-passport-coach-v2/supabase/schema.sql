create table if not exists user_profiles (
  id text primary key,
  line_user_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  exam_date date not null,
  study_start_date date not null,
  weekday_minutes integer not null,
  weekend_minutes integer not null,
  rest_weekdays jsonb not null default '[]',
  selected_book_id text not null,
  it_experience text not null,
  weak_domains jsonb not null default '[]'
);

create table if not exists answer_history (
  id text primary key,
  user_id text not null references user_profiles(id) on delete cascade,
  question_id text not null,
  topic_id text not null,
  domain text not null,
  selected_choice_id text not null,
  is_correct boolean not null,
  answered_at timestamptz not null
);

create index if not exists answer_history_user_id_idx on answer_history(user_id);
create index if not exists answer_history_topic_id_idx on answer_history(topic_id);

create table if not exists review_items (
  user_id text not null references user_profiles(id) on delete cascade,
  topic_id text not null,
  priority integer not null,
  reason text not null,
  due_date date not null,
  consecutive_correct integer not null default 0,
  updated_at timestamptz not null,
  primary key (user_id, topic_id)
);

create table if not exists study_sessions (
  id text primary key,
  user_id text not null references user_profiles(id) on delete cascade,
  topic_id text not null,
  started_at timestamptz not null
);

create index if not exists study_sessions_user_id_idx on study_sessions(user_id);
