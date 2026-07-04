// ITパスポート学習コーチ — 学習計画（ロードマップ）の型定義
//
// 設計方針:
//   - 計画ロジックは lib/studyPlanner.ts の純粋関数に閉じ込め、UI からはこの型を通じてのみ参照する。
//   - AI API は使わない。試験日・学習時間・進捗・苦手分野・復習状況からルールベースで導出する。
//   - 出力は「合格までの全体ロードマップ / 今週のゴール / 今日やること」の3層で見せる前提の形にする。

import type { TopicField } from "@/types/content";
import type { ReviewItem, TodayMenu } from "@/types";

// ---------------------------------------------------------------------------
// フェーズ（合格までのロードマップ）
// ---------------------------------------------------------------------------

/** 学習フェーズの識別子（Phase 0〜6） */
export type StudyPhaseId =
  | "phase0" // 初回設定・診断
  | "phase1" // 全体像をつかむ
  | "phase2" // テーマ別に理解する
  | "phase3" // 確認問題で固める
  | "phase4" // 弱点復習
  | "phase5" // 過去問演習
  | "phase6"; // 直前総復習

/** フェーズの静的な定義（表示用メタ情報） */
export type StudyPhaseDef = {
  id: StudyPhaseId;
  order: number; // 0〜6
  emoji: string;
  title: string; // 例: "テーマ別に理解する"
  summary: string; // このフェーズで何をするか（1〜2文）
  detail: string; // 詳細シートで表示する、学習者向けの丁寧な説明
  checkpoints: string[]; // このフェーズで意識する具体ポイント
  completionGoal: string; // 次フェーズへ進む目安
};

/** フェーズの進み具合（ロードマップ表示用） */
export type PhaseStatus = "done" | "current" | "upcoming";

export type PhaseProgress = {
  id: StudyPhaseId;
  status: PhaseStatus;
  progress: number; // 0〜100（そのフェーズの達成度の目安）
  hint: string; // いま/次に何をすると良いかの一言
};

/** 期待フェーズ（本来いるべき位置）と現在フェーズの比較。 */
export type PhaseComparison = {
  expected: StudyPhaseId; // 経過日数から見た本来のフェーズ
  actual: StudyPhaseId; // いまのフェーズ
  delta: number; // actual.order - expected.order（負=遅れ / 0=計画通り / 正=先行）
  message: string; // 前向きな一言
};

// ---------------------------------------------------------------------------
// 間に合い度（試験日までに間に合うかの目安）
// ---------------------------------------------------------------------------

export type OnTrackLevel =
  | "comfortable" // 余裕あり
  | "tight" // やや詰め込み
  | "sprint" // 短期集中が必要
  | "no-exam"; // 試験日未設定

export const ON_TRACK_LABELS: Record<OnTrackLevel, string> = {
  comfortable: "余裕あり",
  tight: "やや詰め込み",
  sprint: "短期集中が必要",
  "no-exam": "試験日未設定",
};

/** 間に合い度バッジの配色（ホーム/plan で共有）。 */
export const ON_TRACK_STYLE: Record<OnTrackLevel, string> = {
  comfortable: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  tight: "bg-amber-100 text-amber-700 ring-amber-200",
  sprint: "bg-rose-100 text-rose-700 ring-rose-200",
  "no-exam": "bg-gray-100 text-gray-600 ring-gray-200",
};

// ---------------------------------------------------------------------------
// 今週のゴール
// ---------------------------------------------------------------------------

export type WeeklyGoal = {
  headline: string; // 例: "テクノロジ系の基礎を5テーマ進める"
  targetTopicCount: number; // 今週進めたいテーマ数
  focusField?: TopicField; // 今週の重点分野
  reviewCount: number; // 今週こなしたい復習件数
  detail: string; // 補足の一言
};

/** 今週のタスクリストの1項目（表示用・チェック状態は都度導出）。 */
export type WeeklyItemView = {
  topicId: string;
  kind: "learn" | "review";
  title: string;
  minutes: number; // 目安時間(分)
  checked: boolean; // 完了/復習クリア済みか
};

// ---------------------------------------------------------------------------
// 遅れ調整（リスケジュール）
// ---------------------------------------------------------------------------

/** 遅れの度合い（none=遅れなし〜severe=大きな遅れ） */
export type DelayLevel = "none" | "slight" | "moderate" | "severe";

export type RescheduleAdvice = {
  level: DelayLevel;
  headline: string; // 前向きな見出し（ユーザーを責めない）
  actions: string[]; // 具体的な調整方針
};

// ---------------------------------------------------------------------------
// 学習計画（エンジンの出力）
// ---------------------------------------------------------------------------

export type LearningPlan = {
  // 時間・分量
  daysUntilExam: number | null; // 試験日未設定なら null
  dailyMinutesTarget: number; // 1日の目安学習時間(分)
  totalAvailableMinutes: number | null; // 試験日までの学習可能総時間(分)。未設定なら null
  requiredMinutesEstimate: number; // 必要学習量の目安(分)
  onTrack: OnTrackLevel; // 間に合い度

  // フェーズ・ロードマップ
  currentPhase: StudyPhaseId;
  phases: PhaseProgress[]; // Phase 0〜6 の進捗
  phaseComparison?: PhaseComparison; // 本来いるべきフェーズとの比較（試験日+開始日があるとき）

  // 3層表示
  weeklyGoal: WeeklyGoal;
  weeklyItems: WeeklyItemView[]; // 今週やること（チェック可能な実リスト）
  todayMenu: TodayMenu; // 今日の学習メニュー（aiPlanner を再利用）
  todayReasons: string[]; // 今日その学習を行う理由（1つ以上）

  // 過去問・復習
  kakomonStartDate: string | null; // 過去問演習の開始目安日(ISO "YYYY-MM-DD")。未設定なら null
  kakomonReady: boolean; // いま過去問を始めてよいか
  reviewPriority: "low" | "medium" | "high"; // 復習優先度

  // 遅れ調整
  reschedule: RescheduleAdvice;

  // 全体像・進捗
  completedTopicCount: number;
  totalTopicCount: number;
  readinessPct: number; // 統一到達度(0〜100)。完了率と習熟度の折衷（progressSummary）
  message: string; // ユーザー向けの一言方針
};

// ---------------------------------------------------------------------------
// 過去問の段階（トピック確認問題 → 分野別 → ランダム → 模試 → 誤答再演習）
// ---------------------------------------------------------------------------

export type KakomonStageId =
  | "topic-check"
  | "field-drill"
  | "random"
  | "mock"
  | "retry-wrong";

export type KakomonStage = {
  id: KakomonStageId;
  order: number;
  title: string;
  description: string;
  /** その段階に「今」進んでよいか（段階的アンロック） */
  unlocked: boolean;
};

/** LINE「計画」「今週」向けの軽量サマリ（本文は出さず要約＋リンク方針） */
export type PlanSummary = {
  daysUntilExam: number | null;
  onTrack: OnTrackLevel;
  currentPhaseTitle: string;
  weeklyHeadline: string;
  todayTheme: string;
};

export type { ReviewItem };
