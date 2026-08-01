-- ============================================================================
-- 問題の実測難易度・品質指標のスナップショット（加算マイグレーション）
-- ----------------------------------------------------------------------------
-- 目的:
--   回答実績（question_attempts）から、問題ごとの実測難易度と品質異常を算出して保存する。
--
-- 方針:
--   - 加算のみ。既存のテーブル・列・データ・インデックスには一切手を入れない。
--     安全に再実行できる（すべて if not exists）。
--   - このテーブルは「集計結果の置き場」であって正ではない。
--     正は question_attempts で、ここはいつ捨てて作り直してもよい。
--   - 問題本文（Git 管理の QuestionRecord）をこの結果で書き換えることはしない。
--     recommended_difficulty はあくまで推奨値で、estimatedDifficulty の自動更新はしない。
--     作問時の見立てを実測で黙って上書きすると、「誰がその難易度を決めたのか」が
--     追えなくなり、問題を直すべきなのか難易度表記を直すべきなのか判断できなくなる。
--   - 主指標は「同一ユーザー・同一問題・同一version の最初の回答」だけで作る。
--     復習による正答率の上昇を難易度に混ぜないため。全回答の指標は参考値として別に持つ。
--   - アクセスは既存方針どおり service role 経由に限定（RLS 有効・公開ポリシーなし）。
--     集計は scripts/question-bank/analyze-quality.mjs から行う。
--
-- 適用手順: Supabase の SQL Editor でこのファイルを実行する。
-- 未適用でもアプリは動く（このテーブルを読む画面・API は無い）。
-- ============================================================================

begin;

create table if not exists public.question_quality_metrics (
  -- 問題ID × version でスナップショットを持つ。
  -- 本文を直して version を上げたら別の行になる（前後の実績を混ぜない）。
  question_id                text        not null,
  question_version           integer     not null,

  -- この行を計算した時刻。集計をいつ回したかを追うためだけに使う。
  calculated_at              timestamptz not null default now(),

  -- insufficient（30ユーザー未満） / provisional（30〜99） / reliable（100以上）
  -- insufficient のあいだは難易度も品質も断定しない（参考値として扱う）。
  sample_status              text        not null,

  -- 標本の大きさ。ユニークユーザー数で標本の十分さを判定する
  -- （回答数で見ると、1人が繰り返し解いただけで「十分」になってしまう）。
  unique_user_count          integer     not null default 0,
  first_attempt_count        integer     not null default 0,
  all_attempt_count          integer     not null default 0,

  -- 主指標。初回回答だけの正答率。
  first_attempt_correct_rate numeric(6,4),
  -- 参考値。反復練習を含む全回答の正答率。難易度判定には使わない。
  all_attempt_correct_rate   numeric(6,4),

  -- 解答時間（初回回答のうち、時間が記録されているものだけ）。
  median_time_seconds        numeric(10,2),
  p90_time_seconds           numeric(10,2),

  -- 未回答のまま飛ばされた割合（初回回答に占める割合）。
  unanswered_rate            numeric(6,4),

  -- 選択肢別の内訳。{"A": 12, "B": 3, "C": 0, "D": 5, "unanswered": 1}
  -- 誰も選ばなかった選択肢を消さないよう、0 の選択肢も残す。
  choice_counts              jsonb       not null default '{}'::jsonb,
  choice_rates               jsonb       not null default '{}'::jsonb,

  -- 実測から出した推奨難易度（1〜5）。作問時の estimatedDifficulty（1〜3）とは
  -- 目盛りが違う。突き合わせるときは 1〜3 に丸めてから比較する。
  -- この値を QuestionRecord へ自動反映してはいけない。
  recommended_difficulty     smallint,

  -- 品質異常のフラグ。["too_hard", "dominant_wrong_choice"] のような配列。
  -- too_easy / too_hard / non_functioning_distractor / dominant_wrong_choice /
  -- unusually_fast / unusually_slow / high_unanswered_rate / estimate_mismatch
  anomaly_flags              jsonb       not null default '[]'::jsonb,

  primary key (question_id, question_version)
);

comment on table public.question_quality_metrics is
  '問題ごとの実測難易度・品質指標のスナップショット。question_attempts から再生成できる派生データで、これ自体は正ではない。';

comment on column public.question_quality_metrics.first_attempt_correct_rate is
  '主指標。同一ユーザー・同一問題・同一versionの最初の回答だけで計算した正答率。';

comment on column public.question_quality_metrics.all_attempt_correct_rate is
  '参考値。全回答の正答率。復習で上がるため難易度判定には使わない。';

comment on column public.question_quality_metrics.recommended_difficulty is
  '実測からの推奨難易度（1〜5）。QuestionRecord.estimatedDifficulty を自動更新してはいけない。';

-- 異常のある問題を引くための索引。
create index if not exists question_quality_metrics_sample_status_idx
  on public.question_quality_metrics(sample_status);

-- 難易度順に並べるための索引。
create index if not exists question_quality_metrics_difficulty_idx
  on public.question_quality_metrics(recommended_difficulty);

-- RLS: 有効化のみ（公開ポリシーなし）。アクセスは service role 経由に限定。
alter table public.question_quality_metrics enable row level security;

-- 集計クエリ（question_attempts を問題×versionで舐める）を支える索引。
-- 既存の索引は user_id 起点なので、問題起点の走査には効かない。
create index if not exists question_attempts_question_version_idx
  on public.question_attempts(question_id, question_version);

commit;
