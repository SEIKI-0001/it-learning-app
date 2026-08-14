-- 公式過去問 年度別演習（令和8年度 ITパスポート）の回答履歴を question_attempts に残す。
-- 加算のみ。既存の列・データ・インデックスには一切手を入れない。安全に再実行できる。
--
-- 追加する列はすべて nullable。既存の保存経路（確認問題 / 過去問レベル / ミニ模試 /
-- 100問模試）はこれらの列を送らないので、null のまま従来どおり動く。
--
-- question_type には 'official_past' を新しく使う。列に CHECK 制約は無いため
-- DDL の変更は不要で、アプリ側の許可リストにだけ追加する（コメントを更新しておく）。
--
-- 適用手順: Supabase の SQL Editor でこのファイルを実行する。
-- 未適用でもアプリは動く（新列付き insert が失敗したら旧形式で再試行する）。

begin;

alter table public.question_attempts
  -- 問題の出所。official_past / app_original / ai_generated / modified_official。
  add column if not exists question_origin      text,
  -- 回答した時点の QuestionRecord.version。後から解説を直しても、
  -- 「どの版に答えたか」を追えるようにする。
  add column if not exists question_version     integer,
  -- 公式過去問の実施年（西暦）。年度別の成績集計に使う。
  add column if not exists exam_year            integer,
  -- 演習モード。practice / exam。
  add column if not exists attempt_mode         text,
  -- 公式問題冊子上の出題区分。strategy / management / technology。
  -- シラバス上の内容分類（アプリ側の解釈）とは別物なので、混ぜて集計しないこと。
  add column if not exists official_exam_field  text,
  -- 100問の演習1回をまとめるID。1回ぶんの結果を後から復元・集計するのに使う。
  -- uuid ではなく text にしてあるのは、crypto.randomUUID() が使えない環境向けの
  -- フォールバックIDも受け入れるため（保存が落ちて履歴が欠けるのを避ける）。
  add column if not exists attempt_group_id     text;

comment on column public.question_attempts.question_type is
  'topic_quiz / exam_level / mini_exam / mock_exam / official_past';

-- 1回ぶんの演習をまとめて引くための索引。
create index if not exists question_attempts_group_idx
  on public.question_attempts(user_id, attempt_group_id);

-- 年度別の成績を引くための索引。
create index if not exists question_attempts_user_exam_year_idx
  on public.question_attempts(user_id, exam_year);

commit;
