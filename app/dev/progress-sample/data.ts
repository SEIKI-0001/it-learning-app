// /progress 改善デザインのサンプル用データ（テスト環境専用）。
// 実ページでは checkpoints / ExamReadinessResult / IntegratedLearningStatus / rank /
// learningHistory が返す値に置き換わる。

export const EXAM = {
  daysLeft: 40,
  dateLabel: "10月25日",
};

export const CHECKPOINTS = [
  { order: 0, title: "初回設定" },
  { order: 1, title: "全体像把握" },
  { order: 2, title: "基礎理解" },
  { order: 3, title: "確認問題定着" },
  { order: 4, title: "弱点克服" },
  { order: 5, title: "過去問準備" },
  { order: 6, title: "直前総仕上げ" },
];

/** 突破済みの CP 数（CP0〜CP2）。いまは CP3 に向かう途中。 */
export const CLEARED_COUNT = 3;

/** CP3 の突破条件になる必須バッジ。未獲得のものは、進み具合と取り組み先を持つ。 */
export const GATE_BADGES = [
  {
    id: "b3",
    title: "テクノロジ系の確認問題で正答率80%",
    progressLabel: "いま 72%",
    ratio: 72 / 80,
    earned: false,
    action: { label: "確認問題を解く", href: "/learn" },
  },
  {
    id: "b4",
    title: "復習を20件こなす",
    progressLabel: "14/20件",
    ratio: 14 / 20,
    earned: false,
    action: { label: "復習する", href: "/review" },
  },
  {
    id: "b1",
    title: "基礎トピックを10個合格",
    progressLabel: "10/10",
    ratio: 1,
    earned: true,
    action: null,
  },
  {
    id: "b2",
    title: "7日連続で学習",
    progressLabel: "7/7日",
    ratio: 1,
    earned: true,
    action: null,
  },
];

export const NEXT_CHECKPOINT_TITLE = "弱点克服";

/** 予定ではどこにいるはずか（CP2→CP3 の区間のうち、どこまで）。0〜1。 */
export const EXPECTED_IN_SEGMENT = 0.35;

export const PACE = {
  label: "順調です",
  detail: "予定より2トピック先",
};

/** 合格準備度の段階。境界は lib/examReadiness/calculator.ts と同じ。 */
export const READINESS_BANDS = [
  { id: "needs_work", label: "要強化", from: 0, to: 60 },
  { id: "approaching", label: "あと一歩", from: 60, to: 75 },
  { id: "ready", label: "準備良好", from: 75, to: 85 },
  { id: "stable", label: "安定", from: 85, to: 100 },
] as const;

export const READINESS = {
  score: 64,
  bandLabel: "あと一歩",
  improvement: "「テクノロジ」の問題を優先しましょう",
  improvementReason: "出題数がいちばん多い分野で、準備度がまだ低めです。",
};

export const FIELDS = [
  { id: "strategy", label: "ストラテジ", score: 71, questions: 32 },
  { id: "management", label: "マネジメント", score: 66, questions: 18 },
  { id: "technology", label: "テクノロジ", score: 55, questions: 42 },
];

export const TOPICS = {
  total: 69,
  examReady: 12,
  basic: 21,
  needsWork: 7,
};

export const TOP_RISK = {
  label: "期限を過ぎた復習がたまっています",
  count: 5,
};

export const UNLOCKS = [
  {
    id: "rank",
    title: "次のランク「上級チャレンジャー」",
    detail: "あと 120 XP",
    ratio: 0.7,
    href: "/rank",
  },
  {
    id: "mochit",
    title: "モチットの成長段階3「つながりの達人」",
    detail: "CP4 を突破すると成長します",
    ratio: 0.5,
    href: "/avatar",
  },
] as const;

export const STATS = {
  accuracy: 78,
};

/** 直近84日の解答数（1日ごと）。0 は解いていない日。最後の要素が今日。 */
export const DAILY_ANSWERS = [
  0, 12, 18, 0, 25, 9, 0, 14, 22, 0, 16, 30, 11, 0, 8, 19, 24, 0, 13, 27, 10, 0,
  0, 15, 18, 26, 12, 0, 20, 9, 17, 23, 14, 28, 0, 16, 21, 0, 12, 30, 18, 9, 0,
  24, 15, 19, 11, 26, 0, 13, 22, 17, 0, 28, 14, 20, 25, 0, 18, 12, 31, 16, 22,
  0, 19, 26, 14, 21, 17, 0, 23, 28, 15, 19, 24, 12, 26, 20, 18, 22, 27, 25, 19,
  14,
];

export const LINKS = [
  {
    href: "/mock-exam",
    label: "本番形式 100問模試",
    detail: "3分野の実力をまとめて確かめる",
  },
  { href: "/report", label: "週間レポート", detail: "直近7日の積み上げを見る" },
  { href: "/badges", label: "バッジ図鑑", detail: "9/32 獲得" },
  {
    href: "/plan",
    label: "ロードマップ",
    detail: "チェックポイントの条件を見る",
  },
];
