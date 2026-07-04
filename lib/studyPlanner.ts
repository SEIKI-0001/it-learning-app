import type { Topic, TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import type { AppState, UserAnswer, UserProfile, UserProgress } from "@/types";
import type {
  DelayLevel,
  KakomonStage,
  LearningPlan,
  OnTrackLevel,
  PhaseProgress,
  PhaseStatus,
  PlanSummary,
  RescheduleAdvice,
  StudyPhaseDef,
  StudyPhaseId,
  WeeklyGoal,
  WeeklyItemView,
} from "@/types/plan";
import type { WeeklyPlan } from "@/types";
import {
  getAllTopics,
  getRecommendedTopicsForUser,
  getReviewItemsForUser,
  getTopic,
} from "@/lib/content";
import { daysUntilExam, generateTodayMenu } from "@/lib/aiPlanner";
import { fieldMastery } from "@/lib/study";
import { computeProgressSummary } from "@/lib/progressSummary";

// ============================================================================
// 学習計画エンジン（studyPlanner）
// ----------------------------------------------------------------------------
// 役割:
//   試験日・学習可能時間・進捗・苦手分野・復習状況をもとに、AI API を使わず
//   ルールベースで「合格までのロードマップ・今週のゴール・今日やること・理由・
//   過去問開始目安・遅れ調整方針」を導出する。
//
// 設計の約束:
//   - すべて純粋関数（副作用なし・now を引数で受ける）。UI に計画ロジックを書かない。
//   - 既存の aiPlanner.generateTodayMenu / daysUntilExam を土台として再利用する。
//   - 参考書完走ではなく「問題を解ける状態」をゴールに、広く浅く何度も回す方針。
//   - 遅れても全タスクを後ろ倒しにせず、頻出・苦手・過去問を優先する。
//   - ユーザーを責める表現は使わない（前向きな言い換え）。
// ============================================================================

const DAY_MS = 1000 * 60 * 60 * 24;
const ALL_FIELDS: TopicField[] = ["technology", "management", "strategy"];

/** フェーズの静的定義（Phase 0〜6） */
export const STUDY_PHASES: StudyPhaseDef[] = [
  {
    id: "phase0",
    order: 0,
    emoji: "🧭",
    title: "初回設定・診断",
    summary: "試験日や学習時間を決めて、いまの理解度をつかみます。",
    detail:
      "ここは学習を始める前の土台づくりです。試験予定日、平日と休日に使える時間、苦手だと感じる分野、使っている参考書を登録し、アプリが無理のない計画を出せる状態にします。すでに少し学習している場合は、回答履歴や復習対象も計画に反映されます。",
    checkpoints: [
      "試験予定日と1日の学習時間を設定する",
      "苦手分野や参考書を登録し、学習の前提をそろえる",
      "最初の数テーマや確認問題で、現在地をアプリに覚えさせる",
    ],
    completionGoal:
      "設定が済み、今日やること・今週のゴールが表示されていれば次へ進めます。",
  },
  {
    id: "phase1",
    order: 1,
    emoji: "🗺️",
    title: "全体像をつかむ",
    summary: "3分野がどんな内容かをざっと知り、地図を頭に入れます。",
    detail:
      "ITパスポートは、ストラテジ・マネジメント・テクノロジの3分野から出題されます。この段階では細かい用語を完璧に暗記するより、どの分野で何を扱うのか、よく出るテーマがどこにあるのかを先に眺めます。地図を持ってから歩き始めるイメージで、あとから学ぶ内容の置き場所を作ります。",
    checkpoints: [
      "3分野をそれぞれ少なくとも1テーマずつ触ってみる",
      "知らない用語は深追いしすぎず、どの分野の言葉かをつかむ",
      "苦手そうな分野と、意外と理解しやすい分野を見分ける",
    ],
    completionGoal:
      "3分野の違いを自分の言葉でざっくり説明でき、次に学ぶ分野を選べる状態が目安です。",
  },
  {
    id: "phase2",
    order: 2,
    emoji: "📚",
    title: "テーマ別に理解する",
    summary: "テーマごとに図解と体験で、しくみを『わかる』状態にします。",
    detail:
      "ここからは各テーマを一つずつ理解していきます。用語を丸暗記するだけでなく、なぜその考え方が必要なのか、実務や日常のどんな場面に近いのかを押さえます。図解や体験コンテンツを使って、初見の問題でも意味を推測できる理解に近づけます。",
    checkpoints: [
      "テーマの説明を読み、重要語句と具体例をセットで押さえる",
      "似た用語は違いを比べる",
      "理解が浅いテーマは、参考書や探すキーワードで補強する",
    ],
    completionGoal:
      "学んだテーマについて、定義だけでなく具体例や使われる場面まで説明できれば順調です。",
  },
  {
    id: "phase3",
    order: 3,
    emoji: "✏️",
    title: "確認問題で固める",
    summary: "各テーマの確認問題を解いて、『解ける』状態に近づけます。",
    detail:
      "理解した内容を、試験で選択肢から選べる力に変える段階です。正解したかだけで終わらせず、なぜ他の選択肢が違うのか、どの言葉が判断の決め手だったのかを確認します。ここで間違えた問題は、後の弱点復習に回して定着させます。",
    checkpoints: [
      "学んだテーマの確認問題を解く",
      "間違えた理由を、用語不足・読み違い・考え方不足に分けて見る",
      "正解した問題も、根拠を言えるか確認する",
    ],
    completionGoal:
      "主要テーマの確認問題で根拠を持って選べる問題が増え、習熟度が上がってきたら次へ進みます。",
  },
  {
    id: "phase4",
    order: 4,
    emoji: "🔁",
    title: "弱点復習",
    summary: "間違えた問題・苦手分野を重点的に復習して穴を埋めます。",
    detail:
      "ここでは新しい範囲を増やすより、点を落としやすい穴をふさぎます。復習キュー、苦手タグ、習熟度が低いテーマを見て、同じ間違いを繰り返さないように戻ります。苦手分野は一気に克服しようとせず、短い復習を何度も回すほうが安定します。",
    checkpoints: [
      "復習キューにあるテーマを優先して解き直す",
      "間違えた選択肢のどこに引っかかったかを確認する",
      "苦手分野は説明に戻ってから、もう一度問題を解く",
    ],
    completionGoal:
      "復習対象が減り、同じテーマでの間違い方が変わってきたら過去問演習へ進みやすくなります。",
  },
  {
    id: "phase5",
    order: 5,
    emoji: "🎯",
    title: "過去問演習",
    summary: "分野別→ランダム→模試の順に過去問を解いて実戦力をつけます。",
    detail:
      "ここからは本番形式に近い問題で、知識を使う練習を増やします。最初は分野別で弱いところを確認し、慣れてきたらランダム演習や模試形式に進みます。過去問は解く量だけでなく、間違えた問題をどれだけ回収できるかが大事です。",
    checkpoints: [
      "分野別演習で苦手分野を見つける",
      "ランダム演習で、分野が混ざっても判断できるか確認する",
      "模試形式では時間配分と見直しの流れも練習する",
    ],
    completionGoal:
      "頻出テーマで大きく崩れず、誤答を復習に戻せる流れができれば直前総復習に入れます。",
  },
  {
    id: "phase6",
    order: 6,
    emoji: "🏁",
    title: "直前総復習",
    summary: "頻出テーマと誤答を総ざらいして、本番に備えます。",
    detail:
      "試験直前は、新しい範囲を広げすぎず、得点につながりやすい内容を整える段階です。頻出テーマ、過去に間違えた問題、苦手タグを中心に短く回し、本番で迷いそうな用語を最後に確認します。睡眠や当日の準備も含めて、力を出し切る状態に整えます。",
    checkpoints: [
      "頻出テーマと誤答だけを優先して見直す",
      "あいまいな用語は短いメモで確認する",
      "試験時間、持ち物、当日の流れを前日までに確認する",
    ],
    completionGoal:
      "完璧を目指すより、取れる問題を落とさない準備ができていれば本番に向かえます。",
  },
];

export function getPhaseDef(id: StudyPhaseId): StudyPhaseDef {
  return STUDY_PHASES.find((p) => p.id === id) ?? STUDY_PHASES[0];
}

// ---------------------------------------------------------------------------
// 学習時間の見積り
// ---------------------------------------------------------------------------

/** 1日の目安学習時間(分)。平日値を基準にする（未設定は旧 dailyMinutes → 既定10分）。 */
function resolveDailyMinutes(profile?: UserProfile): number {
  if (!profile) return 10;
  if (typeof profile.weekdayMinutes === "number" && profile.weekdayMinutes > 0) {
    return profile.weekdayMinutes;
  }
  const parsed = Number.parseInt(profile.dailyMinutes ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

/** 1週間あたりの学習可能時間(分)。平日5日＋休日2日で見積もる。 */
function weeklyMinutes(profile?: UserProfile): number {
  const weekday = resolveDailyMinutes(profile);
  const holiday =
    typeof profile?.holidayMinutes === "number" && profile.holidayMinutes > 0
      ? profile.holidayMinutes
      : weekday;
  return weekday * 5 + holiday * 2;
}

/** 試験日までの学習可能総時間(分)。試験日未設定なら null。 */
export function totalAvailableMinutes(
  profile: UserProfile | undefined,
  daysRemaining: number | null,
): number | null {
  if (daysRemaining === null) return null;
  const perWeek = weeklyMinutes(profile);
  return Math.round((perWeek / 7) * daysRemaining);
}

/**
 * 必要学習量の目安(分)。
 * 「未完了トピックのインプット + 全トピックの確認問題まわし直し + 過去問演習」を
 * ざっくり積み上げる（広く浅く何度も回す方針を反映）。
 */
export function requiredMinutesEstimate(
  topics: Topic[],
  progress: UserProgress,
): number {
  const completed = new Set(progress.completedTopics);
  const remainingTopics = topics.filter((t) => !completed.has(t.id));
  const inputMinutes = remainingTopics.reduce(
    (s, t) => s + t.estimatedMinutes,
    0,
  );
  // 確認問題の回し直し（全トピックを平均5分で2周想定）＋過去問演習の固定枠。
  const reviewMinutes = topics.length * 5 * 2;
  const kakomonMinutes = 20 * 30; // 過去問 約30コマ×20分
  return inputMinutes + reviewMinutes + kakomonMinutes;
}

// ---------------------------------------------------------------------------
// 間に合い度
// ---------------------------------------------------------------------------

export function computeOnTrack(
  available: number | null,
  required: number,
): OnTrackLevel {
  if (available === null) return "no-exam";
  if (required <= 0) return "comfortable";
  const ratio = available / required;
  if (ratio >= 1.5) return "comfortable";
  if (ratio >= 1.0) return "tight";
  return "sprint";
}

/**
 * 間に合い度を1回で算出する簡易ヘルパー。
 * LearningPlan を作らずに onTrack だけ欲しい呼び出し側（/topics 等）向け。
 */
export function computeOnTrackForState(
  profile: UserProfile | undefined,
  progress: UserProgress,
  topics: Topic[] = getAllTopics(),
  now: Date = new Date(),
): OnTrackLevel {
  const daysRemaining = daysUntilExam(profile, now);
  const available = totalAvailableMinutes(profile, daysRemaining);
  const required = requiredMinutesEstimate(topics, progress);
  return computeOnTrack(available, required);
}

// ---------------------------------------------------------------------------
// 進捗の集計
// ---------------------------------------------------------------------------

function completedRatio(topics: Topic[], progress: UserProgress): number {
  if (topics.length === 0) return 0;
  return progress.completedTopics.length / topics.length;
}

/** 習熟度が一定以上（>=70）のトピック割合。「解ける」状態の目安。 */
function masteredRatio(topics: Topic[], progress: UserProgress): number {
  if (topics.length === 0) return 0;
  const n = topics.filter((t) => (progress.topicMastery[t.id] ?? 0) >= 70)
    .length;
  return n / topics.length;
}

/** 直近の解答の正答率（無ければ null）。 */
function recentAccuracy(answers: UserAnswer[], take = 20): number | null {
  const recent = answers.slice(-take);
  if (recent.length === 0) return null;
  return recent.filter((a) => a.isCorrect).length / recent.length;
}

// ---------------------------------------------------------------------------
// 過去問移行ロジック
// ---------------------------------------------------------------------------

/**
 * 過去問フェーズを始めてよいか。
 * 参考書完走を待たず、以下のいずれかを満たしたら開始可能とする:
 *   - 主要テーマを一定数完了（完了率 >= 0.5）
 *   - 試験日が近い（<= 14日）かつ ある程度進んでいる（完了率 >= 0.25）
 *   - 分野別確認問題で一定の正答率（直近 >= 0.7）かつ ある程度進んでいる
 */
export function isKakomonReady(
  topics: Topic[],
  progress: UserProgress,
  answers: UserAnswer[],
  daysRemaining: number | null,
): boolean {
  const ratio = completedRatio(topics, progress);
  const acc = recentAccuracy(answers);
  if (ratio >= 0.5) return true;
  if (daysRemaining !== null && daysRemaining <= 14 && ratio >= 0.25) {
    return true;
  }
  if (acc !== null && acc >= 0.7 && ratio >= 0.35) return true;
  return false;
}

/** 過去問演習の段階（トピック確認問題→分野別→ランダム→模試→誤答再演習）。 */
export function buildKakomonStages(
  topics: Topic[],
  progress: UserProgress,
  answers: UserAnswer[],
  daysRemaining: number | null,
): KakomonStage[] {
  const ratio = completedRatio(topics, progress);
  const ready = isKakomonReady(topics, progress, answers, daysRemaining);
  const near = daysRemaining !== null && daysRemaining <= 21;
  const hasWrong = progress.reviewQueue.length > 0 || progress.weakTags.length > 0;
  return [
    {
      id: "topic-check",
      order: 1,
      title: "トピック別確認問題",
      description: "各テーマの確認問題。まずはここから解ける状態にします。",
      unlocked: true,
    },
    {
      id: "field-drill",
      order: 2,
      title: "分野別過去問",
      description: "分野をしぼって過去問道場で演習します。",
      unlocked: ready,
    },
    {
      id: "random",
      order: 3,
      title: "ランダム演習",
      description: "分野をまぜてランダムに解き、実戦感覚を養います。",
      unlocked: ready && ratio >= 0.6,
    },
    {
      id: "mock",
      order: 4,
      title: "模擬試験形式",
      description: "本番と同じ100問形式で時間を計って解きます。",
      unlocked: ready && (near || ratio >= 0.8),
    },
    {
      id: "retry-wrong",
      order: 5,
      title: "間違えた問題の再演習",
      description: "間違えた問題だけを繰り返し、確実につぶします。",
      unlocked: hasWrong,
    },
  ];
}

/** 過去問演習の開始目安日(ISO "YYYY-MM-DD")。試験日未設定なら null。 */
function kakomonStartDate(
  profile: UserProfile | undefined,
  daysRemaining: number | null,
  ready: boolean,
  now: Date,
): string | null {
  if (!profile?.examDate || daysRemaining === null) return null;
  // すでに過去問OKなら今日から。まだなら残り日数の後半40%を過去問に充てる目安。
  const offset = ready ? 0 : Math.ceil(daysRemaining * 0.6);
  const target = new Date(now.getTime() + offset * DAY_MS);
  return target.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// フェーズ判定
// ---------------------------------------------------------------------------

/**
 * 現在フェーズを判定する。
 * 残り日数に応じて重みを変える:
 *   - 試験直前(<=3日) → 直前総復習
 *   - 過去問OK かつ 試験が近い/十分進んだ → 過去問演習
 *   - それ以外は進捗（完了率・習熟度）でインプット系フェーズを決める
 *   - 試験日未設定 → 重要度順に通常学習（進捗ベースで phase1〜4）
 */
export function determineCurrentPhase(
  topics: Topic[],
  profile: UserProfile | undefined,
  progress: UserProgress,
  answers: UserAnswer[],
  daysRemaining: number | null,
): StudyPhaseId {
  if (!profile) return "phase0";

  const cRatio = completedRatio(topics, progress);
  const mRatio = masteredRatio(topics, progress);
  const ready = isKakomonReady(topics, progress, answers, daysRemaining);

  // 直前は総復習に寄せる。
  if (daysRemaining !== null && daysRemaining <= 3) return "phase6";

  // 過去問フェーズ: 試験が近い or 十分進んでいて、過去問OKなら。
  if (ready && ((daysRemaining !== null && daysRemaining <= 21) || cRatio >= 0.7)) {
    return "phase5";
  }

  // インプット〜確認問題〜弱点復習は進捗で判定。
  if (cRatio < 0.1) return "phase1";
  if (cRatio < 0.55) return "phase2";
  if (mRatio < 0.6) return "phase3";
  return "phase4";
}

// ---------------------------------------------------------------------------
// 期待フェーズ（学習開始日からの経過日数で「本来いるべき位置」を算出）
// ---------------------------------------------------------------------------

/** ローカルの "YYYY-MM-DD"。 */
function localDateIso(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 2つの "YYYY-MM-DD" の日数差（to - from）。不正なら NaN。 */
function daysBetweenDates(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return NaN;
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * 「本来いるべきフェーズ」を、学習開始日から試験日までの経過割合で算出する。
 * 完了率ベースの境界（determineCurrentPhase）を時間軸に読み替えた、推奨スケジュール。
 * 各フェーズの時間配分（累積）: phase1=10% / phase2=45% / phase3=65% /
 * phase4=80% / phase5=95% / phase6=100%（phase0=初回設定は瞬間）。
 * 試験日・学習開始日が未設定なら null（比較は出さない）。
 */
export function determineExpectedPhase(
  profile: UserProfile | undefined,
  now: Date = new Date(),
): StudyPhaseId | null {
  if (!profile?.examDate || !profile.planStartDate) return null;
  const total = daysBetweenDates(profile.planStartDate, profile.examDate);
  if (!Number.isFinite(total) || total <= 0) return "phase6";
  const elapsed = daysBetweenDates(profile.planStartDate, localDateIso(now));
  const r = Math.max(0, Math.min(1, elapsed / total));
  if (r < 0.1) return "phase1";
  if (r < 0.45) return "phase2";
  if (r < 0.65) return "phase3";
  if (r < 0.8) return "phase4";
  if (r < 0.95) return "phase5";
  return "phase6";
}

/**
 * 期待フェーズと現在フェーズの比較メッセージ（前向き・ユーザーを責めない）。
 * delta = 現在フェーズの順序 - 期待フェーズの順序（負=遅れ / 0=計画通り / 正=先行）。
 */
export function buildPhaseComparisonMessage(
  expected: StudyPhaseId,
  actual: StudyPhaseId,
): string {
  const e = getPhaseDef(expected);
  const a = getPhaseDef(actual);
  const delta = a.order - e.order;
  if (delta <= -2) {
    return `いまの目安は「${e.title}」フェーズですが、まだ「${a.title}」です。頻出テーマから優先して追いつきましょう。`;
  }
  if (delta === -1) {
    return "計画よりやや遅れ気味です。今週のゴールを一つずつ消化していきましょう。";
  }
  if (delta === 0) {
    return "ほぼ計画どおりのペースです。この調子で進めましょう。";
  }
  return "計画より進んでいます。この調子で！";
}

/** 各フェーズの進捗（done/current/upcoming ＋ 目安%）を組み立てる。 */
function buildPhaseProgress(
  currentPhase: StudyPhaseId,
  topics: Topic[],
  progress: UserProgress,
  reviewCleared: boolean,
  daysRemaining: number | null,
): PhaseProgress[] {
  const currentOrder = getPhaseDef(currentPhase).order;
  const cRatio = completedRatio(topics, progress);
  const mRatio = masteredRatio(topics, progress);

  // 各フェーズの「達成度%」の目安（ざっくり）。
  const pct: Record<StudyPhaseId, number> = {
    phase0: 100, // ここに来ている時点で設定は済んでいる
    phase1: clampPct(cRatio / 0.1),
    phase2: clampPct((cRatio - 0.1) / 0.45),
    phase3: clampPct(mRatio / 0.6),
    phase4: reviewCleared ? 100 : clampPct(mRatio),
    phase5: clampPct(cRatio - 0.5),
    phase6: daysRemaining !== null && daysRemaining <= 3 ? 60 : 0,
  };

  return STUDY_PHASES.map((def) => {
    let status: PhaseStatus;
    if (def.order < currentOrder) status = "done";
    else if (def.order === currentOrder) status = "current";
    else status = "upcoming";

    const progressPct =
      status === "done" ? 100 : status === "current" ? Math.max(5, pct[def.id]) : 0;

    return {
      id: def.id,
      status,
      progress: progressPct,
      hint:
        status === "done"
          ? "クリア済み"
          : status === "current"
            ? phaseHint(def.id)
            : "このあと取り組みます",
    };
  });
}

function clampPct(x: number): number {
  return Math.max(0, Math.min(100, Math.round(x * 100)));
}

function phaseHint(id: StudyPhaseId): string {
  switch (id) {
    case "phase0":
      return "設定を済ませましょう";
    case "phase1":
      return "各分野を1つずつのぞいてみましょう";
    case "phase2":
      return "テーマの図解と体験で理解を進めましょう";
    case "phase3":
      return "確認問題を解いて『解ける』にしましょう";
    case "phase4":
      return "間違えた問題と苦手分野を復習しましょう";
    case "phase5":
      return "過去問道場で分野別に演習しましょう";
    case "phase6":
      return "頻出テーマと誤答を総ざらいしましょう";
  }
}

// ---------------------------------------------------------------------------
// 今週のゴール
// ---------------------------------------------------------------------------

function weakestField(
  topics: Topic[],
  progress: UserProgress,
  profile?: UserProfile,
): TopicField {
  // 苦手申告があればそれを最優先。無ければ習熟度が最も低い分野。
  if (profile?.weakFields && profile.weakFields.length > 0) {
    return profile.weakFields[0];
  }
  const mastery = fieldMastery(progress, topics);
  return ALL_FIELDS.slice().sort((a, b) => mastery[a] - mastery[b])[0];
}

function buildWeeklyGoal(
  topics: Topic[],
  profile: UserProfile | undefined,
  progress: UserProgress,
  currentPhase: StudyPhaseId,
  daysRemaining: number | null,
): WeeklyGoal {
  const completed = new Set(progress.completedTopics);
  const remainingTopics = topics.filter((t) => !completed.has(t.id));
  const focusField = weakestField(topics, progress, profile);

  // 1週間で進めたいテーマ数: 残りを残り週数で割る。初学者には小さく見せる。
  const weeks =
    daysRemaining !== null ? Math.max(1, Math.ceil(daysRemaining / 7)) : 4;
  const beginner = completedRatio(topics, progress) < 0.15;
  const rawPerWeek = Math.ceil(remainingTopics.length / weeks);
  const cap = beginner ? 5 : 8;
  const targetTopicCount = Math.max(
    remainingTopics.length === 0 ? 0 : 1,
    Math.min(rawPerWeek, cap),
  );

  const reviewCount = Math.min(progress.reviewQueue.length, beginner ? 3 : 6);

  let headline: string;
  let detail: string;

  if (currentPhase === "phase5" || currentPhase === "phase6") {
    headline =
      currentPhase === "phase6"
        ? "頻出テーマと誤答を総ざらいする"
        : "過去問を分野別に解きすすめる";
    detail = "新しい暗記より、解いて間違いを潰すことを優先しましょう。";
  } else if (remainingTopics.length === 0) {
    headline = "復習と過去問で仕上げる";
    detail = "ひととおり学び終えました。定着と実戦練習に移りましょう。";
  } else {
    headline = `${FIELD_LABELS[focusField]}を中心に${targetTopicCount}テーマ進める`;
    detail = beginner
      ? "まずは小さく。1日1テーマでも前に進めば十分です。"
      : "確認問題まで解いて『解ける』状態を積み上げましょう。";
  }

  return {
    headline,
    targetTopicCount,
    focusField,
    reviewCount,
    detail,
  };
}

// ---------------------------------------------------------------------------
// 今週のタスクリスト（実体化・スナップショット）
// ---------------------------------------------------------------------------

/** その週の月曜日(ローカル)を "YYYY-MM-DD" で返す。週の識別キーに使う。 */
export function weekStartKey(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffToMonday = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - diffToMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * 今週やることの具体的なトピック/復習リストを組み立てる（スナップショット）。
 * 件数は buildWeeklyGoal と同じ目安（targetTopicCount / reviewCount）を使い、
 * 推薦順（getRecommendedTopicsForUser）と復習対象（getReviewItemsForUser）の
 * 先頭から採用する。今日やること（generateTodayMenu）と同じ優先順位に基づくので、
 * 当日メニューは通常この週次リストに含まれる。
 */
export function buildWeeklyPlan(
  state: AppState,
  topics: Topic[] = getAllTopics(),
  now: Date = new Date(),
): WeeklyPlan {
  const { profile, progress, answers } = state;
  const daysRemaining = daysUntilExam(profile, now);
  const currentPhase = determineCurrentPhase(
    topics,
    profile,
    progress,
    answers,
    daysRemaining,
  );
  const goal = buildWeeklyGoal(topics, profile, progress, currentPhase, daysRemaining);

  const topicIds = getRecommendedTopicsForUser({
    progress,
    weakFields: profile?.weakFields,
  })
    .slice(0, goal.targetTopicCount)
    .map((t) => t.id);

  const reviewIds = getReviewItemsForUser(
    { progress, weakFields: profile?.weakFields },
    now,
  )
    .slice(0, goal.reviewCount)
    .map((r) => r.topicId);

  return { weekStartDate: weekStartKey(now), topicIds, reviewIds };
}

/**
 * 今週のタスクリストを解決する。
 * 保存済みスナップショットが今週のものならそのまま使い（週の途中で内容が
 * 入れ替わらない）、無い/古いときだけ再生成する。永続化は呼び出し側が行う。
 */
export function resolveWeeklyPlan(
  state: AppState,
  topics: Topic[] = getAllTopics(),
  now: Date = new Date(),
): WeeklyPlan {
  const existing = state.progress.weeklyPlan;
  if (existing && existing.weekStartDate === weekStartKey(now)) {
    return existing;
  }
  return buildWeeklyPlan(state, topics, now);
}

/**
 * 週次リストを表示用（チェック状態つき）に展開する。
 * チェック状態は保存せず、completedTopics / 現在の復習対象から都度導出する。
 */
export function buildWeeklyChecklist(
  weekly: WeeklyPlan,
  state: AppState,
  now: Date = new Date(),
): WeeklyItemView[] {
  const { progress, profile } = state;
  const completed = new Set(progress.completedTopics);
  const dueSet = new Set(
    getReviewItemsForUser(
      { progress, weakFields: profile?.weakFields },
      now,
    ).map((r) => r.topicId),
  );

  const learn: WeeklyItemView[] = weekly.topicIds.map((id) => {
    const t = getTopic(id);
    return {
      topicId: id,
      kind: "learn",
      title: t?.title ?? id,
      minutes: t?.estimatedMinutes ?? 0,
      checked: completed.has(id),
    };
  });

  const review: WeeklyItemView[] = weekly.reviewIds.map((id) => {
    const t = getTopic(id);
    const mastery = progress.topicMastery[id] ?? 0;
    return {
      topicId: id,
      kind: "review",
      title: t?.title ?? id,
      minutes: t?.estimatedMinutes ?? 0,
      // 復習は「もう期限対象でない」または「習熟度>=70」でクリア扱い。
      checked: !dueSet.has(id) || mastery >= 70,
    };
  });

  return [...learn, ...review];
}

// ---------------------------------------------------------------------------
// 今日その学習を行う理由
// ---------------------------------------------------------------------------

/**
 * 今日の学習メニューの主テーマについて、「なぜ今日これをやるか」を組み立てる。
 * 必ず1つ以上返す（/today で常時表示する前提）。
 */
export function buildTodayReasons(
  primary: Topic | undefined,
  progress: UserProgress,
  profile: UserProfile | undefined,
  daysRemaining: number | null,
  currentPhase: StudyPhaseId,
): string[] {
  const reasons: string[] = [];

  if (!primary) {
    if (progress.reviewQueue.length > 0) {
      reasons.push("学んだ内容を忘れないよう、今日は復習で定着させます。");
    } else {
      reasons.push("まずは気になる分野からのぞいてみましょう。");
    }
    return reasons;
  }

  const isReview = progress.reviewQueue.some((r) => r.topicId === primary.id);
  const isWeakField = (profile?.weakFields ?? []).includes(primary.field);
  const relatedWrong = primary.tags.some((tag) =>
    progress.weakTags.includes(tag),
  );

  if (daysRemaining !== null && daysRemaining <= 7 && isReview) {
    reasons.push("試験日が近いため、復習を優先しています。");
  }
  if (isReview && reasons.length === 0) {
    reasons.push("以前学んだ内容の定着を確認するため、復習として選んでいます。");
  }
  if (isWeakField) {
    reasons.push("苦手分野として選択されているため、優先しています。");
  }
  if (relatedWrong) {
    reasons.push("前回間違えた内容と関連しているため、いま押さえておきます。");
  }
  if (
    (primary.examFrequency === "high" || primary.importance >= 3) &&
    reasons.length < 2
  ) {
    reasons.push(`このテーマは${FIELD_LABELS[primary.field]}の頻出テーマです。`);
  }
  if (currentPhase === "phase5" && reasons.length < 2) {
    reasons.push("過去問演習に入る前に押さえておきたい基礎です。");
  }

  if (reasons.length === 0) {
    reasons.push(
      `${FIELD_LABELS[primary.field]}の理解を広げるため、今日はこのテーマを選んでいます。`,
    );
  }
  return reasons;
}

// ---------------------------------------------------------------------------
// 復習優先度
// ---------------------------------------------------------------------------

function computeReviewPriority(
  progress: UserProgress,
  daysRemaining: number | null,
  answers: UserAnswer[],
): "low" | "medium" | "high" {
  const queue = progress.reviewQueue.length;
  const acc = recentAccuracy(answers, 10);
  if ((daysRemaining !== null && daysRemaining <= 7) || queue >= 5) return "high";
  if (queue >= 2 || (acc !== null && acc < 0.6)) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// 遅れ調整（リスケジュール）
// ---------------------------------------------------------------------------

/**
 * 遅れ具合を推定して、前向きな調整方針を返す。
 * 単純な後ろ倒しはせず、遅れが大きいほど頻出・苦手・過去問に絞る。
 */
export function buildRescheduleAdvice(
  topics: Topic[],
  profile: UserProfile | undefined,
  progress: UserProgress,
  daysRemaining: number | null,
): RescheduleAdvice {
  if (!profile?.examDate || daysRemaining === null) {
    return {
      level: "none",
      headline: "試験日を決めると、遅れの調整もご案内できます。",
      actions: ["設定から試験予定日を登録しましょう。"],
    };
  }

  // 期待進捗: 学習可能時間に対する必要時間の割合で「今どこまで進んでいるべきか」を近似。
  const available = totalAvailableMinutes(profile, daysRemaining);
  const required = requiredMinutesEstimate(topics, progress);
  const cRatio = completedRatio(topics, progress);

  // 残り時間で必要量をこなせるかの余裕度。
  const slack = available !== null && required > 0 ? available / required : 1;

  let level: DelayLevel;
  if (slack >= 1.2) level = "none";
  else if (slack >= 1.0) level = "slight";
  else if (slack >= 0.7) level = "moderate";
  else level = "severe";

  // 進捗がほぼ無い直前は severe 寄りに補正。
  if (daysRemaining <= 7 && cRatio < 0.4 && level !== "severe") {
    level = level === "none" ? "moderate" : "severe";
  }

  switch (level) {
    case "none":
      return {
        level,
        headline: "いまのペースなら計画どおりです。この調子で進めましょう。",
        actions: [
          "毎日の1〜3アクションを続ける",
          "復習は削らずにこなす",
        ],
      };
    case "slight":
      return {
        level,
        headline: "少し前倒しすると安心です。数日で吸収できる範囲です。",
        actions: [
          "次の数日で遅れぶんを吸収する",
          "復習は削らない",
          "新規学習の量を少しだけ減らす",
        ],
      };
    case "moderate":
      return {
        level,
        headline: "合格可能性を上げるため、頻出・苦手を優先する計画に組み替えます。",
        actions: [
          "重要度の低いテーマは後回しにする",
          "頻出分野・苦手分野・過去問を優先する",
          "復習は残す",
        ],
      };
    case "severe":
      return {
        level,
        headline:
          "合格可能性を上げるため、頻出テーマ優先の短期集中プランに切り替えます。",
        actions: [
          "低頻度テーマは思い切って削る",
          "頻出テーマ・過去問・誤答復習に絞る",
          "1日3アクションに集中する",
        ],
      };
  }
}

// ---------------------------------------------------------------------------
// メイン: 学習計画を生成
// ---------------------------------------------------------------------------

export function generateLearningPlan(
  state: AppState,
  topics: Topic[] = getAllTopics(),
  now: Date = new Date(),
): LearningPlan {
  const { profile, progress, answers } = state;

  const daysRemaining = daysUntilExam(profile, now);
  const dailyMinutesTarget = resolveDailyMinutes(profile);
  const available = totalAvailableMinutes(profile, daysRemaining);
  const required = requiredMinutesEstimate(topics, progress);
  const onTrack = computeOnTrack(available, required);
  const summary = computeProgressSummary(topics, progress);

  const currentPhase = determineCurrentPhase(
    topics,
    profile,
    progress,
    answers,
    daysRemaining,
  );

  const reviewItems = getReviewItemsForUser({
    progress,
    weakFields: profile?.weakFields,
  }, now);
  const reviewCleared = reviewItems.length === 0;

  const phases = buildPhaseProgress(
    currentPhase,
    topics,
    progress,
    reviewCleared,
    daysRemaining,
  );

  const expectedPhase = determineExpectedPhase(profile, now);
  const phaseComparison = expectedPhase
    ? {
        expected: expectedPhase,
        actual: currentPhase,
        delta: getPhaseDef(currentPhase).order - getPhaseDef(expectedPhase).order,
        message: buildPhaseComparisonMessage(expectedPhase, currentPhase),
      }
    : undefined;

  const weeklyGoal = buildWeeklyGoal(
    topics,
    profile,
    progress,
    currentPhase,
    daysRemaining,
  );

  const weekly = resolveWeeklyPlan(state, topics, now);
  const weeklyItems = buildWeeklyChecklist(weekly, state, now);

  const todayMenu = generateTodayMenu(profile, progress, topics, answers);
  const primaryItem = todayMenu.items.find((i) => i.kind === "learn");
  const primary = primaryItem ? getTopic(primaryItem.topicId) : undefined;
  const todayReasons = buildTodayReasons(
    primary,
    progress,
    profile,
    daysRemaining,
    currentPhase,
  );

  const ready = isKakomonReady(topics, progress, answers, daysRemaining);
  const kakomonStart = kakomonStartDate(profile, daysRemaining, ready, now);
  const reviewPriority = computeReviewPriority(progress, daysRemaining, answers);
  const reschedule = buildRescheduleAdvice(
    topics,
    profile,
    progress,
    daysRemaining,
  );

  const phaseDef = getPhaseDef(currentPhase);
  let message: string;
  if (daysRemaining === null) {
    message =
      "試験予定日を設定すると、残り日数から逆算してロードマップを最適化します。いまは重要度順に進めましょう。";
  } else if (daysRemaining <= 0) {
    message = "試験当日ですね。頻出テーマと間違えた問題の見直しに集中しましょう。";
  } else {
    message = `試験まであと${daysRemaining}日。現在は「${phaseDef.title}」フェーズです。${weeklyGoal.headline}のが今週のゴールです。`;
  }

  return {
    daysUntilExam: daysRemaining,
    dailyMinutesTarget,
    totalAvailableMinutes: available,
    requiredMinutesEstimate: required,
    onTrack,
    currentPhase,
    phases,
    phaseComparison,
    weeklyGoal,
    weeklyItems,
    todayMenu,
    todayReasons,
    kakomonStartDate: kakomonStart,
    kakomonReady: ready,
    reviewPriority,
    reschedule,
    completedTopicCount: summary.completedCount,
    totalTopicCount: summary.totalCount,
    readinessPct: summary.readinessPct,
    message,
  };
}

/** LINE「計画」「今週」向けの軽量サマリ（本文は出さず要約＋リンク方針）。 */
export function summarizePlan(plan: LearningPlan): PlanSummary {
  return {
    daysUntilExam: plan.daysUntilExam,
    onTrack: plan.onTrack,
    currentPhaseTitle: getPhaseDef(plan.currentPhase).title,
    weeklyHeadline: plan.weeklyGoal.headline,
    todayTheme: plan.todayMenu.theme,
  };
}
