import type { QuestionRecord } from "@/types/questionBank";
import type {
  AnomalyFlag,
  QuestionAttemptRow,
  QuestionQualityMetric,
  RecommendedDifficulty,
  SampleStatus,
} from "@/types/questionQuality";
import {
  ANOMALY_MIN_FIRST_ATTEMPTS,
  ANOMALY_THRESHOLDS,
  DIFFICULTY_BANDS,
  SAMPLE_THRESHOLDS,
} from "@/lib/questionQuality/metricsThresholds";

// ============================================================================
// 回答実績からの実測難易度・品質異常の算出。
// ----------------------------------------------------------------------------
// 主指標は「同一ユーザー・同一問題・同一version の最初の回答」だけで作る。
//
// なぜ初回だけなのか:
//   復習で同じ問題を2回目に解けば当然正答率は上がる。全回答で正答率を出すと、
//   「よく復習される問題ほど簡単」という逆の結論になり、難易度が壊れる。
//   全回答の指標も残すが、それは定着度を見るための参考値であって難易度ではない。
//
// version を分けるのは、本文を直した問題の前後を混ぜないため。
// 選択肢の文言を変えれば正答率は変わるので、別の問題として集計する。
//
// 未回答（selectedAnswer が null）も1回の回答として数える。
// 「解こうとしたが答えられなかった」は難易度の情報そのものなので、
// 分母から外すと難しい問題ほど簡単に見えてしまう。
//
// この関数は純粋。同じ入力なら必ず同じ出力になる（現在時刻・乱数を使わない）。
// ============================================================================

/** 未回答をまとめるキー。選択肢キー（A〜D）と衝突しない名前にする。 */
export const UNANSWERED_KEY = "unanswered";

/**
 * 集計キーの区切り。US（Unit Separator, U+001F）。
 * 問題IDやユーザーIDには現れない文字を使う。単純な連結にすると
 * "q1" + "12" と "q11" + "2" が同じキーになり、別の問題の履歴が混ざる。
 */
const KEY_SEP = String.fromCharCode(0x1f);

/**
 * 集計対象のキー。question_attempts には過去の version が入っていない行もあるため、
 * その場合は問題側の現在の version として扱う（正確ではないが、
 * 「version 不明の履歴を全部捨てる」よりは実測に近づく）。
 */
function versionOf(row: QuestionAttemptRow, fallback: number): number {
  return row.questionVersion ?? fallback;
}

/** 昇順に並べた数値配列の中央値。 */
export function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 昇順に並べた数値配列のパーセンタイル（nearest-rank 法）。
 * 補間しないのは、標本が小さいときに実在しない値を作らないため。
 */
export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.ceil(p * sorted.length);
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1];
}

export function toSampleStatus(uniqueUserCount: number): SampleStatus {
  if (uniqueUserCount >= SAMPLE_THRESHOLDS.reliable) return "reliable";
  if (uniqueUserCount >= SAMPLE_THRESHOLDS.provisional) return "provisional";
  return "insufficient";
}

/** 初回正答率から推奨難易度（1〜5）を出す。 */
export function toRecommendedDifficulty(correctRate: number | null): RecommendedDifficulty | null {
  if (correctRate === null) return null;
  for (const band of DIFFICULTY_BANDS) {
    if (correctRate >= band.minCorrectRate) return band.difficulty;
  }
  return DIFFICULTY_BANDS[DIFFICULTY_BANDS.length - 1].difficulty;
}

/**
 * 実測の1〜5を、作問時の目盛り（1〜3）へ丸める。
 * 突き合わせのためだけに使う値で、これを estimatedDifficulty に書き戻すことはしない。
 */
export function toEstimatedScale(recommended: RecommendedDifficulty): 1 | 2 | 3 {
  if (recommended <= 2) return 1;
  if (recommended === 3) return 2;
  return 3;
}

/**
 * 同一ユーザー・同一問題・同一version の最初の1回だけを残す。
 *
 * 「最初」は answered_at の昇順。同時刻の行が複数あるときは attemptId の昇順で決める
 * （DB の返却順に結果を依存させないため。同じ入力なら常に同じ結果になる）。
 */
export function selectFirstAttempts(rows: QuestionAttemptRow[]): QuestionAttemptRow[] {
  const first = new Map<string, QuestionAttemptRow>();

  for (const row of rows) {
    const key = [row.userId, row.questionId, row.questionVersion ?? ""].join(KEY_SEP);
    const current = first.get(key);
    if (!current) {
      first.set(key, row);
      continue;
    }

    const rowTime = Date.parse(row.answeredAt);
    const currentTime = Date.parse(current.answeredAt);
    if (rowTime < currentTime || (rowTime === currentTime && row.attemptId < current.attemptId)) {
      first.set(key, row);
    }
  }

  return [...first.values()];
}

function rate(count: number, total: number): number | null {
  return total === 0 ? null : count / total;
}

/** 小数の丸め。JSON に出す値の桁を揃え、再実行での差分を防ぐ。 */
function round4(n: number | null): number | null {
  return n === null ? null : Math.round(n * 10000) / 10000;
}

function computeAnomalyFlags(
  metric: Omit<QuestionQualityMetric, "anomalyFlags">,
  question: QuestionRecord | undefined,
): AnomalyFlag[] {
  // 標本が足りないうちは何も断定しない。
  // 数人の結果で「この問題は難しすぎる」と言い出すと、直す必要のない問題を直してしまう。
  if (metric.sampleStatus === "insufficient") return [];
  if (metric.firstAttemptCount < ANOMALY_MIN_FIRST_ATTEMPTS) return [];

  const flags: AnomalyFlag[] = [];
  const correctRate = metric.firstAttemptCorrectRate;

  if (correctRate !== null) {
    if (correctRate >= ANOMALY_THRESHOLDS.tooEasyCorrectRate) flags.push("too_easy");
    if (correctRate <= ANOMALY_THRESHOLDS.tooHardCorrectRate) flags.push("too_hard");
  }

  // 選択肢の機能不全。正答以外の選択肢だけを見る。
  if (question) {
    const distractorKeys = question.choices
      .map((c) => c.key as string)
      .filter((key) => key !== question.correctChoice);

    const dead = distractorKeys.filter(
      (key) => (metric.choiceRates[key] ?? 0) <= ANOMALY_THRESHOLDS.nonFunctioningDistractorRate,
    );
    if (dead.length > 0) flags.push("non_functioning_distractor");

    const correctChoiceRate = metric.choiceRates[question.correctChoice] ?? 0;
    const dominant = distractorKeys.some(
      (key) =>
        (metric.choiceRates[key] ?? 0) >= ANOMALY_THRESHOLDS.dominantWrongChoiceRate &&
        (metric.choiceRates[key] ?? 0) > correctChoiceRate,
    );
    if (dominant) flags.push("dominant_wrong_choice");
  }

  if (metric.medianTimeSeconds !== null) {
    if (metric.medianTimeSeconds <= ANOMALY_THRESHOLDS.unusuallyFastMedianSeconds) {
      flags.push("unusually_fast");
    }
    if (metric.medianTimeSeconds >= ANOMALY_THRESHOLDS.unusuallySlowMedianSeconds) {
      flags.push("unusually_slow");
    }
  }

  if (
    metric.unansweredRate !== null &&
    metric.unansweredRate >= ANOMALY_THRESHOLDS.highUnansweredRate
  ) {
    flags.push("high_unanswered_rate");
  }

  // 作問時の見立てと実測のずれ。QuestionRecord は書き換えず、ここで報告するだけ。
  if (question && metric.recommendedDifficulty !== null) {
    const distance = Math.abs(
      toEstimatedScale(metric.recommendedDifficulty) - question.estimatedDifficulty,
    );
    if (distance >= ANOMALY_THRESHOLDS.estimateMismatchDistance) flags.push("estimate_mismatch");
  }

  return flags;
}

/**
 * 回答履歴から問題×version 単位のスナップショットを作る。
 *
 * @param rows question_attempts の行（対象問題ぶん）
 * @param questions 問題バンク（推奨難易度との突き合わせ・選択肢キーの解決に使う）
 */
export function aggregateQuestionMetrics(
  rows: QuestionAttemptRow[],
  questions: QuestionRecord[],
): QuestionQualityMetric[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const firstAttempts = selectFirstAttempts(rows);

  /** questionId + KEY_SEP + version -> 行 */
  const groupAll = new Map<string, QuestionAttemptRow[]>();
  const groupFirst = new Map<string, QuestionAttemptRow[]>();

  const push = (map: Map<string, QuestionAttemptRow[]>, row: QuestionAttemptRow) => {
    const question = byId.get(row.questionId);
    const version = versionOf(row, question?.version ?? 1);
    const key = [row.questionId, version].join(KEY_SEP);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  };

  for (const row of rows) push(groupAll, row);
  for (const row of firstAttempts) push(groupFirst, row);

  const out: QuestionQualityMetric[] = [];

  // 初回回答がある組だけを行にする。全回答しか無い組は原理的に存在しない
  // （どの回答も、そのユーザーにとっての初回か2回目以降かのどちらかなので）。
  for (const [key, first] of groupFirst) {
    const [questionId, versionText] = key.split(KEY_SEP);
    const questionVersion = Number(versionText);
    const question = byId.get(questionId);
    const all = groupAll.get(key) ?? [];

    const uniqueUserCount = new Set(first.map((r) => r.userId)).size;
    const sampleStatus = toSampleStatus(uniqueUserCount);

    const answeredTimes = first
      .map((r) => r.timeSpentSeconds)
      .filter((t): t is number => typeof t === "number" && Number.isFinite(t) && t >= 0)
      .sort((a, b) => a - b);

    const unansweredCount = first.filter(
      (r) => r.selectedAnswer === null || r.selectedAnswer === undefined || r.selectedAnswer === "",
    ).length;

    // 選択肢別の内訳。問題側の選択肢キーを先に 0 で埋めておくことで、
    // 「誰も選ばなかった選択肢」がレポートから消えないようにする。
    const choiceCounts: Record<string, number> = {};
    for (const choice of question?.choices ?? []) choiceCounts[choice.key] = 0;
    choiceCounts[UNANSWERED_KEY] = 0;

    for (const row of first) {
      const key2 =
        row.selectedAnswer === null || row.selectedAnswer === undefined || row.selectedAnswer === ""
          ? UNANSWERED_KEY
          : row.selectedAnswer;
      choiceCounts[key2] = (choiceCounts[key2] ?? 0) + 1;
    }

    const choiceRates: Record<string, number> = {};
    for (const [k, count] of Object.entries(choiceCounts)) {
      choiceRates[k] = round4(rate(count, first.length)) ?? 0;
    }

    const firstCorrectRate = round4(rate(first.filter((r) => r.isCorrect).length, first.length));

    const base: Omit<QuestionQualityMetric, "anomalyFlags"> = {
      questionId,
      questionVersion,
      sampleStatus,
      uniqueUserCount,
      firstAttemptCount: first.length,
      allAttemptCount: all.length,
      firstAttemptCorrectRate: firstCorrectRate,
      allAttemptCorrectRate: round4(rate(all.filter((r) => r.isCorrect).length, all.length)),
      medianTimeSeconds: median(answeredTimes),
      p90TimeSeconds: percentile(answeredTimes, 0.9),
      unansweredRate: round4(rate(unansweredCount, first.length)),
      choiceCounts,
      choiceRates,
      recommendedDifficulty: toRecommendedDifficulty(firstCorrectRate),
    };

    out.push({ ...base, anomalyFlags: computeAnomalyFlags(base, question) });
  }

  // 並びを固定する（問題ID → version）。同じ入力なら同じレポートになる。
  return out.sort(
    (a, b) =>
      (a.questionId < b.questionId ? -1 : a.questionId > b.questionId ? 1 : 0) ||
      a.questionVersion - b.questionVersion,
  );
}

// ---------------------------------------------------------------------------
// レポート
// ---------------------------------------------------------------------------

/**
 * 集計に使った入力の出所。
 * fixture 由来のレポートを実測値と取り違えないよう、出力に必ず書き残す。
 */
export type MetricsSource = "supabase" | "fixture";

/**
 * 実測レポートの Markdown。
 *
 * user_id はもちろん、「ユーザーを特定できる粒度の値」を一切出さない。
 * 出すのは問題単位の集計値だけで、回答日時や attempt_id も載せない
 * （少人数の問題で日時を出すと、誰の回答かが実質的に分かってしまう）。
 */
export function renderMetricsMarkdown(
  metrics: QuestionQualityMetric[],
  source: MetricsSource = "supabase",
): string {
  const lines: string[] = [];
  const countBy = (status: string) => metrics.filter((m) => m.sampleStatus === status).length;

  lines.push("# 問題の実測難易度レポート");
  lines.push("");
  lines.push(
    "`npm run questions:analyze-quality` の出力。主指標は同一ユーザー・同一問題・同一versionの**最初の回答**のみで算出している" +
      "（復習による正答率の上昇を難易度に混ぜないため）。",
  );
  lines.push("");
  if (source === "fixture") {
    lines.push(
      "> **これは fixture（架空の回答履歴）から作ったレポートです。実データではありません。**",
    );
    lines.push(">");
    lines.push(
      "> 集計ロジックの動作確認用で、`test/fixtures/questionAttempts.sample.json` を入力にしています。" +
        "実測値を見るには Supabase に接続して `npm run questions:analyze-quality` を実行してください。",
    );
    lines.push("");
  }
  lines.push("個人を識別できる値（user_id・回答日時・attempt_id）はこのレポートに含めない。");
  lines.push("");

  lines.push("## サマリ");
  lines.push("");
  lines.push("| 指標 | 値 |");
  lines.push("| --- | ---: |");
  lines.push(`| 集計対象（問題×version） | ${metrics.length} |`);
  lines.push(`| reliable（100ユーザー以上） | ${countBy("reliable")} |`);
  lines.push(`| provisional（30〜99） | ${countBy("provisional")} |`);
  lines.push(`| insufficient（30未満） | ${countBy("insufficient")} |`);
  lines.push("");

  const flagged = metrics.filter((m) => m.anomalyFlags.length > 0);
  lines.push("## 異常フラグ");
  lines.push("");
  if (flagged.length === 0) {
    lines.push("なし。");
  } else {
    lines.push("| 問題ID | ver | 標本 | ユーザー数 | 初回正答率 | 推奨難易度 | フラグ |");
    lines.push("| --- | ---: | --- | ---: | ---: | ---: | --- |");
    for (const m of flagged) {
      lines.push(
        `| ${m.questionId} | ${m.questionVersion} | ${m.sampleStatus} | ${m.uniqueUserCount} | ${formatRate(m.firstAttemptCorrectRate)} | ${m.recommendedDifficulty ?? "-"} | ${m.anomalyFlags.join(", ")} |`,
      );
    }
  }
  lines.push("");

  lines.push("## 全件");
  lines.push("");
  if (metrics.length === 0) {
    lines.push("回答履歴がありません（0件）。すべて insufficient として扱う。");
  } else {
    lines.push(
      "| 問題ID | ver | 標本 | ユーザー数 | 初回回答 | 全回答 | 初回正答率 | 全回答正答率 | 中央値(秒) | p90(秒) | 未回答率 | 推奨難易度 |",
    );
    lines.push("| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
    for (const m of metrics) {
      lines.push(
        `| ${m.questionId} | ${m.questionVersion} | ${m.sampleStatus} | ${m.uniqueUserCount} | ${m.firstAttemptCount} | ${m.allAttemptCount} | ${formatRate(m.firstAttemptCorrectRate)} | ${formatRate(m.allAttemptCorrectRate)} | ${m.medianTimeSeconds ?? "-"} | ${m.p90TimeSeconds ?? "-"} | ${formatRate(m.unansweredRate)} | ${m.recommendedDifficulty ?? "-"}${m.sampleStatus === "insufficient" ? "（参考）" : ""} |`,
      );
    }
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function formatRate(value: number | null): string {
  return value === null ? "-" : `${(value * 100).toFixed(1)}%`;
}
