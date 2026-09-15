// /progress 改善デザインのサンプル用データ（テスト環境専用）。
// 実ページでは ExamReadinessResult / IntegratedLearningStatus / checkpoints / rank /
// learningHistory が返す値に置き換わる。

export const EXAM = {
  daysLeft: 40,
  dateLabel: "10月25日",
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
  improvementReason: "配点がいちばん大きい分野で、準備度がまだ低めです。",
};

export const PACE = {
  label: "順調です",
  message: "予定より2トピック先に進んでいます。",
};

export const FIELDS = [
  { id: "strategy", label: "ストラテジ", score: 71, questions: 32 },
  { id: "management", label: "マネジメント", score: 66, questions: 18 },
  { id: "technology", label: "テクノロジ", score: 55, questions: 42 },
];
export const SCORED_QUESTIONS = 92;

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

export const CHECKPOINTS = [
  { order: 0, title: "初回設定" },
  { order: 1, title: "全体像把握" },
  { order: 2, title: "基礎理解" },
  { order: 3, title: "確認問題定着" },
  { order: 4, title: "弱点克服" },
  { order: 5, title: "過去問準備" },
  { order: 6, title: "直前総仕上げ" },
];
export const CURRENT_CHECKPOINT = 3;
export const GATE = { earned: 2, required: 4 };

export const UNLOCKS = [
  {
    id: "gate",
    title: "CP3「確認問題定着」の突破試験",
    detail: "必須バッジ あと2つ",
    ratio: GATE.earned / GATE.required,
    href: "/plan",
  },
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
  streak: 12,
  longestStreak: 15,
  studyDays: 38,
  totalAnswers: 612,
  accuracy: 78,
};

/** 直近12週（84日）の学習分数。0 は学習していない日。最後の要素が今日。 */
export const HEATMAP_MINUTES = [
  0, 12, 18, 0, 25, 9, 0, 14, 22, 0, 16, 30, 11, 0, 8, 19, 24, 0, 13, 27, 10, 0,
  0, 15, 18, 26, 12, 0, 20, 9, 17, 23, 14, 28, 0, 16, 21, 0, 12, 30, 18, 9, 0,
  24, 15, 19, 11, 26, 0, 13, 22, 17, 0, 28, 14, 20, 25, 0, 18, 12, 31, 16, 22,
  0, 19, 26, 14, 21, 17, 0, 23, 28, 15, 19, 24, 12, 26, 20, 18, 22, 27, 25, 19,
  14,
];

export const LINKS = [
  { href: "/mock-exam", label: "本番形式 100問模試" },
  { href: "/report", label: "週間レポート" },
  { href: "/badges", label: "バッジ図鑑 9/32" },
  { href: "/plan", label: "ロードマップ" },
];
