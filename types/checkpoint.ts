// ITパスポート学習コーチ — バッジゲート型ロードマップの型定義
//
// 設計方針:
//   - 既存の Phase 0〜6（types/plan.ts / lib/studyPlanner.ts）を「チェックポイント
//     CP0〜CP6」として上位概念で束ねる。フェーズ進行の内部ロジックは壊さない。
//   - ロードマップ進行の本体は「学習課題を倒す＝バッジを集める → 最終問題が解放 →
//     最終問題を突破 → 次のチェックポイントへ」というクエスト型にする。
//   - 学習時間は主条件にしない。バッジ/XP/進行の主条件は確認問題・苦手克服・
//     復習解消・単語帳・過去問レベル・最終問題の突破とする。
//   - ランダム要素は「追加報酬・欠片・3択報酬」だけに限定する。必須バッジ・最終問題
//     免除・合格準備度・大量XP をランダムで動かさない。

import type { StudyPhaseId } from "@/types/plan";
import type { TopicField } from "@/types/content";

// ---------------------------------------------------------------------------
// チェックポイント
// ---------------------------------------------------------------------------

/** チェックポイント識別子（Phase 0〜6 と 1:1 対応）。 */
export type CheckpointId =
  | "cp0"
  | "cp1"
  | "cp2"
  | "cp3"
  | "cp4"
  | "cp5"
  | "cp6";

/** 最終問題の合格ライン（必要正解数 / 全問数）。 */
export type FinalExamRule = {
  questionCount: number; // 出題数
  passThreshold: number; // 合格に必要な正解数
  /** 苦手・誤答から優先して混ぜる割合（0〜1）。CP4 以降で 0 より大きくする。 */
  weakRatio: number;
};

/** バッジのカテゴリ。 */
export type BadgeCategory =
  | "topic" // 確認問題・トピック理解系
  | "field" // 分野横断（3分野の広がり）
  | "revenge" // 苦手克服・復習解消
  | "word" // 英略語・単語帳
  | "kakomon" // 過去問レベル
  | "final" // 最終問題突破の証
  | "collection"; // 収集・任意の達成

/** バッジのレア度（表示・ドロップ用。必須バッジの獲得可否には影響しない）。 */
export type BadgeRarity = "common" | "rare" | "epic";

export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
  topic: "確認問題",
  field: "分野",
  revenge: "苦手克服",
  word: "単語帳",
  kakomon: "過去問レベル",
  final: "突破試験",
  collection: "コレクション",
};

export const BADGE_RARITY_LABELS: Record<BadgeRarity, string> = {
  common: "ノーマル",
  rare: "レア",
  epic: "エピック",
};

/**
 * バッジ定義（静的）。
 * 獲得条件は conditionLabel で必ず表示し、隠さない。
 */
export type BadgeDef = {
  id: string;
  label: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  checkpointId: CheckpointId;
  /** true のとき、そのチェックポイントの最終問題を解放するために必須。 */
  requiredForGate: boolean;
  /** 常に表示できる短い獲得条件。 */
  conditionLabel: string;
  /** 判定対象のトピック（分野バッジは field を使う）。 */
  topicIds?: string[];
  field?: TopicField;
  /** 獲得時に加算する XP。 */
  xp: number;
  emoji: string;
};

/** チェックポイント定義（静的）。 */
export type CheckpointDef = {
  id: CheckpointId;
  order: number; // 0〜6
  phaseId: StudyPhaseId; // 対応する既存フェーズ
  emoji: string;
  title: string;
  summary: string;
  /** 最終問題を解放するために必要な「そのCPのバッジ」獲得数。 */
  requiredBadgeCount: number;
  /** 分野カバレッジ条件（指定分野すべてで最低1トピック完了が必要）。空なら条件なし。 */
  requiredFieldCoverage: TopicField[];
  /** 直近正答率の下限（0〜1）。未指定なら条件にしない。 */
  recentAccuracyMin?: number;
  /** 最終問題のルール（cp0 は最終問題なし → null）。 */
  finalExam: FinalExamRule | null;
  /** 最終問題の勝利条件を人が読める形にした説明。 */
  winConditionLabel: string;
};

// ---------------------------------------------------------------------------
// ユーザーのチェックポイント進行状態（UserProgress に格納）
// ---------------------------------------------------------------------------

/** 獲得済みバッジの1件。 */
export type EarnedBadge = {
  badgeId: string;
  earnedAt: string; // ISO
  /** 追加ドロップ（ランダム報酬）由来なら true。必須達成由来なら false。 */
  fromDrop?: boolean;
};

/** バッジの欠片（集めると宝箱・任意バッジに交換できる補助報酬）。 */
export type BadgeFragment = {
  fragmentId: string; // どのバッジ/宝箱の欠片か
  count: number;
};

/**
 * ストリーク（連続学習日数）の付随情報。
 * おまもりは「累計付与数/累計消費数」の単調増加カウンタ2本で表現する
 * （所持数 = granted - used）。端末間マージは max を取るだけで冪等になり、
 * 消費済みのおまもりがマージで復活しない。
 */
export type StreakMeta = {
  /** 受領済みマイルストーン日数（一度きりの冪等キー）。 */
  claimedMilestones: number[];
  /** おまもり累計付与数（単調増加）。 */
  shieldsGranted: number;
  /** おまもり累計消費数（単調増加）。 */
  shieldsUsed: number;
  /** 自己ベストの連続日数（自分比較の成長軸）。 */
  longestStreak: number;
  lastShieldUsedAt?: string; // ISO
};

/** デイリーミッション1件の進捗（定義は lib/dailyQuests.ts の QUEST_DEFS が持つ）。 */
export type DailyQuestProgress = {
  id: string;
  goal: number;
  progress: number;
};

/**
 * 「今日の3ミッション」の状態。date（ローカル日付）が変わったら作り直す。
 * 進捗はすべて学習成果（確認問題の完了・正解など）から加算する。
 */
export type DailyQuestState = {
  date: string; // "YYYY-MM-DD"（ローカル）
  quests: DailyQuestProgress[];
  /** 報酬（宝箱）受け取り済みか（冪等キー）。 */
  claimed: boolean;
};

/** 最終問題の1回ぶんの結果。 */
export type FinalExamAttempt = {
  checkpointId: CheckpointId;
  passed: boolean;
  correct: number;
  total: number;
  attemptedAt: string; // ISO
  /** 間違えたトピック（不合格時の復習導線に使う）。 */
  wrongTopicIds: string[];
};

/**
 * ゲームフル機能の状態（docs/requirements/gameful-design-v2.md）。
 *
 * checkpoint_progress(jsonb) 内に1つのサブオブジェクトとしてまとめる。
 * フィールドを個別に散らすと lib/mergeAppState.ts の明示マージを更新し忘れて
 * 端末間マージで消える事故が起きやすいため、マージ規則を1関数に閉じる。
 *
 * 新しいフィールドを足すときは必ず同時に:
 *   1. ここに optional で追加（初期値は undefined＝旧データと同じ挙動）
 *   2. lib/mergeAppState.ts の mergeGamefulState を更新
 *   3. test/mergeCheckpointProgress.test.ts のキー一覧と fixture を更新
 */
export type GamefulState = {
  /** 成長確認（踊り場）の表示状況。 */
  growthCheck?: {
    /** 成長確認を表示済みのチェックポイント。CPごとに1回だけ見せるための冪等キー。 */
    shownCheckpointIds: CheckpointId[];
  };
  /** 追加報酬（3択・欠片・装飾）の状態。 */
  rewards?: RewardState;
  /** デイリーミッションの差し替え（1日1回）。 */
  questReroll?: QuestReroll;
  /** 合格宣言。任意で、有無によって学習評価も機能も変わらない。 */
  pledge?: Pledge;
  /** モチットの名前。未設定なら既定名を使う。 */
  mochitName?: MochitName;
  /** その日の学習量の選択。未設定ならプロフィールの予算をそのまま使う。 */
  studyAmount?: StudyAmountChoice;
};

/**
 * 当日の学習量の選択（GF-P1-001）。
 * 選ばなければこの記録自体が存在せず、従来どおりプロフィールの予算が使われる。
 * 「何を学ぶか」の優先順位はシステム側が保つので、ここは分量だけを持つ。
 */
export type StudyAmountChoice = {
  /** ローカル日付 "YYYY-MM-DD"。日をまたいだら選択は持ち越さない。 */
  date: string;
  minutes: number;
};

/**
 * その日のミッション差し替え記録（GF-P1-009）。
 * 1日1件だけ持ち、これがある日はもう差し替えられない。
 */
export type QuestReroll = {
  /** ローカル日付 "YYYY-MM-DD"。 */
  date: string;
  /** 差し替えたミッションID。 */
  replacedQuestId: string;
  /** 差し替え後のミッションID。 */
  newQuestId: string;
};

/**
 * 合格宣言（GF-P1-010）。
 * 宣言しても報酬は無く、しなくても不利益は無い。表示のためだけの記録。
 */
export type Pledge = {
  pledgedAt: string; // ISO
  /** 宣言した時点の試験日。後で試験日を変えても宣言の記録は動かさない。 */
  examDate?: string;
};

/** モチットの名前（GF-P1-007）。改名の前後関係を保つため更新時刻を持つ。 */
export type MochitName = {
  value: string;
  updatedAt: string; // ISO
};

/** 3択報酬の1候補（すべて補助＝学習進行を壊さない）。 */
export type PendingChoiceOption = {
  id: string;
  label: string;
  rarity: BadgeRarity;
  emoji: string;
  fragment?: { fragmentId: string; count: number };
};

/**
 * 受け取り待ちの3択。選ぶまで保持し、選んだら消す。
 * id は発生時刻(ISO)で単調増加し、二重付与を防ぐ冪等キーになる。
 */
export type PendingChoice = {
  id: string;
  rarity: BadgeRarity;
  options: PendingChoiceOption[];
};

/**
 * 追加報酬の保有状態。
 * ここに入るのはコスメ・称号などの補助報酬だけで、合格準備度・必須バッジ・
 * CP進行に影響する値は決して持たない。
 */
export type RewardState = {
  /** 未選択の3択。無ければ undefined。 */
  pendingChoice?: PendingChoice;
  /**
   * 最後に選択を確定した3択の id。単調増加なのでマージは max でよく、
   * これ以下の pendingChoice は「解決済み」として復活させない。
   */
  lastResolvedChoiceId?: string;
  /** 交換・獲得した称号などの装飾ID。 */
  unlockedCosmetics?: string[];
  /** 表示中の称号ID。未設定なら称号なし。 */
  equippedTitleId?: string;
};

/** ロードマップ進行状態。UserProgress に格納し、localStorage / マージで保全する。 */
export type CheckpointProgress = {
  currentCheckpointId: CheckpointId;
  clearedCheckpointIds: CheckpointId[];
  earnedBadges: EarnedBadge[];
  badgeFragments: BadgeFragment[];
  finalExamAttempts: FinalExamAttempt[];
  /** 直近で連続してレア報酬が出なかった回数（天井カウンタ）。 */
  rarePityCount: number;
  /** ストリークの節目受領・おまもり・自己ベスト。未使用なら undefined（旧データ互換）。 */
  streakMeta?: StreakMeta;
  /** 今日の3ミッション。未使用なら undefined（旧データ互換）。 */
  dailyQuests?: DailyQuestState;
  /** ゲームフル機能の状態。未使用なら undefined（旧データ互換）。 */
  gameful?: GamefulState;
};

/** 既存ユーザー・新規ユーザー共通の初期値。 */
export const INITIAL_CHECKPOINT_PROGRESS: CheckpointProgress = {
  currentCheckpointId: "cp0",
  clearedCheckpointIds: [],
  earnedBadges: [],
  badgeFragments: [],
  finalExamAttempts: [],
  rarePityCount: 0,
};

// ---------------------------------------------------------------------------
// 評価結果（UI 表示・進行判定に使う派生型）
// ---------------------------------------------------------------------------

/** バッジ1件の獲得状況（定義＋達成しているか＋獲得済みか）。 */
export type BadgeStatus = {
  def: BadgeDef;
  earned: boolean;
  /** 条件を満たしているか（earned でなくても、いま満たしていれば true）。 */
  conditionMet: boolean;
  earnedAt?: string;
  fromDrop?: boolean;
};

/** チェックポイントのゲート状況。 */
export type CheckpointGate = {
  checkpoint: CheckpointDef;
  earnedRequiredCount: number; // 獲得済みの必須バッジ数
  totalRequiredCount: number; // 必須バッジ総数
  requiredBadgeCount: number; // 解放に必要な数
  missingBadges: BadgeDef[]; // 未獲得の必須バッジ
  fieldCoverageMet: boolean;
  accuracyMet: boolean;
  finalExamUnlocked: boolean;
  finalExamPassed: boolean;
  canAdvance: boolean;
};

/**
 * 最終問題（突破試験）の状態。全画面で同じ語彙・同じ判定を使うための共通表現。
 * ロック中 / 挑戦できます / クリア済み の3状態に統一する。
 */
export type FinalExamState = "locked" | "unlocked" | "passed";

/** 状態ラベル（見出し・行内など幅のある場所向け）。 */
export const FINAL_EXAM_STATE_LABELS: Record<FinalExamState, string> = {
  locked: "🔒 突破試験：ロック中",
  unlocked: "⚔️ 突破試験：挑戦できます",
  passed: "🏆 突破試験：クリア済み",
};

/** 状態ラベル（ピル・バッジなど狭い場所向けの短縮形）。 */
export const FINAL_EXAM_STATE_SHORT: Record<FinalExamState, string> = {
  locked: "🔒 ロック中",
  unlocked: "⚔️ 挑戦できます",
  passed: "🏆 クリア済み",
};
