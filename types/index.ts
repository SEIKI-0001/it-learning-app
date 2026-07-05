// ITパスポート学習コーチ — 共通型定義
//
// 設計方針:
//   - 7日固定(currentDay 1〜7)に依存しない。学習はトピック単位で進む。
//   - 進捗・プロフィールは「将来 AIプランナー(lib/aiPlanner.ts)へ渡す」前提で持つ。
//   - 旧 FE Quest 由来のフィールド(currentDay / completedDays / Question 等)は
//     既存DB・localStorage との後方互換のために残すが、新しいUI/ロジックでは使わない。

import type { TopicField } from "@/types/content";

export type ChoiceKey = "A" | "B" | "C" | "D";

// ---------------------------------------------------------------------------
// ユーザープロフィール(オンボーディングで取得 → AIプランナーへ渡す)
// ---------------------------------------------------------------------------

/** 学習スタイルの希望 */
export type StudyStyle = "balanced" | "weakness" | "rush";

export const STUDY_STYLE_LABELS: Record<StudyStyle, string> = {
  balanced: "3分野をバランスよく",
  weakness: "苦手分野を優先",
  rush: "試験日まで一気に",
};

export type UserProfile = {
  // --- 旧版からの互換フィールド ---
  itExperience: string;
  dailyMinutes: string; // 旧: 1日の目安(分)を表す文字列。互換のため保持。
  examPlan: string; // 旧: 受験予定の有無。互換のため保持。
  confidence: number; // 現在の理解度(0〜5)

  // --- ITパスポート学習コーチの新フィールド ---
  examDate?: string; // 試験予定日(ISO "YYYY-MM-DD")。未定なら undefined。
  planStartDate?: string; // 学習開始日(ISO "YYYY-MM-DD")。ロードマップの経過日数の基点。
  weekdayMinutes?: number; // 平日の学習可能時間(分)
  holidayMinutes?: number; // 休日の学習可能時間(分)
  weakFields?: TopicField[]; // 苦手分野(3分野から複数可)
  studyStyle?: StudyStyle; // 学習スタイルの希望
};

// ---------------------------------------------------------------------------
// 進捗(トピック単位 + モチベーション要素)
// ---------------------------------------------------------------------------

/** 復習キューの1項目 */
export type ReviewItem = {
  topicId: string;
  dueAt: string; // 復習期限(ISO)
  reason: string; // "間違えた" | "苦手分野" | "復習期限" など
};

/**
 * 今週のタスクリスト（スナップショット）。
 * 週の途中で内容が入れ替わらないよう、週初め（月曜）に一度確定して保存する。
 * チェック状態は保存せず、completedTopics / 復習状況から都度導出する。
 */
export type WeeklyPlan = {
  weekStartDate: string; // その週の月曜(ISO "YYYY-MM-DD"・ローカル)
  topicIds: string[]; // 今週進めたい新規学習トピック
  reviewIds: string[]; // 今週こなしたい復習トピック
};

export type UserProgress = {
  level: number;
  exp: number;
  streakCount: number;
  weakTags: string[]; // 不正解だったタグ(復習トピックの推定に使う)
  lastPlayedAt?: string;

  // --- トピック単位の学習状態(新) ---
  completedTopics: string[]; // 学習完了したトピックid
  topicMastery: Record<string, number>; // topicId → 習熟度(0〜100)
  reviewQueue: ReviewItem[]; // 復習対象
  weeklyPlan?: WeeklyPlan | null; // 今週のタスクリスト（週初めに確定・端末間同期）

  // --- 旧版からの互換フィールド(新ロジックでは未使用) ---
  currentDay: number; // 旧: 1〜7。互換のため残すが進行には使わない。
  completedDays: number[]; // 旧: クリア済みDay。互換のため残す。
};

export type UserAnswer = {
  questionId: string;
  // 時間切れで未回答のまま保存される場合があるため optional。
  // DB の selected_choice も nullable。
  selectedChoice?: ChoiceKey;
  isCorrect: boolean;
  answeredAt: string;
  tag: string;
  topicId?: string; // どのトピックの確認問題か(新)
};

export type AppState = {
  profile?: UserProfile;
  progress: UserProgress;
  answers: UserAnswer[];
};

// ---------------------------------------------------------------------------
// AIプランナーの入出力型(lib/aiPlanner.ts)。LLM置換しやすい素直な形にする。
// ---------------------------------------------------------------------------

/** 全体学習プラン(試験日から逆算した方針) */
export type StudyPlan = {
  daysUntilExam: number | null; // 試験日未設定なら null
  dailyMinutesTarget: number; // 1日の目安学習時間(分)
  fieldFocus: { field: TopicField; weight: number }[]; // 分野ごとの重み(合計1)
  recommendedTopicIds: string[]; // 次に学ぶと良いトピック順
  message: string; // ユーザー向けの一言方針
};

/** 今日の学習メニューの1項目 */
export type TodayMenuItem = {
  topicId: string;
  title: string;
  field: TopicField;
  estimatedMinutes: number;
  kind: "learn" | "review"; // 新規学習か復習か
};

/** 今日の学習メニュー */
export type TodayMenu = {
  items: TodayMenuItem[];
  message: string;
};
