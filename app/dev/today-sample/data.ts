// 3案で共通に使うサンプルデータ。見た目の比較だけが目的なので、中身は揃えておく。

export type LessonStatus = "done" | "now" | "next";

export type Lesson = {
  code: string;
  title: string;
  field: string;
  kind: "新規" | "復習";
  minutes: number;
  status: LessonStatus;
};

export const TODAY = {
  dateLabel: "9月13日 日曜日",
  greeting: "今日も9分から。",
};

export const FOCUS = {
  code: "T07",
  title: "インターネットとプロトコル",
  field: "テクノロジ系・ネットワーク",
  kind: "新規" as const,
  minutes: 9,
  questions: 4,
  xp: 40,
  reason: "昨日の「LANとWAN」の続き。セットで覚えると定着しやすい範囲です。",
};

export const ROUTE: Lesson[] = [
  { code: "T06", title: "LANとWAN", field: "ネットワーク", kind: "復習", minutes: 4, status: "done" },
  { code: "T07", title: "インターネットとプロトコル", field: "ネットワーク", kind: "新規", minutes: 9, status: "now" },
  { code: "T08", title: "HTTPとHTTPS", field: "ネットワーク", kind: "新規", minutes: 8, status: "next" },
  { code: "T03", title: "情報セキュリティの3要素", field: "セキュリティ", kind: "復習", minutes: 5, status: "next" },
];

export const EXAM = {
  daysLeft: 42,
  dateLabel: "10月25日",
  /** 学習開始からの経過割合（計画の消化率） */
  elapsed: 0.46,
};

export const READINESS = {
  score: 58,
  weekDelta: 3,
  /** 直近14日の推移 */
  history: [41, 42, 44, 44, 46, 47, 49, 50, 51, 53, 54, 55, 57, 58],
};

export const STREAK = {
  days: 12,
  /** 今週(月〜日)。true=学習済み、今日は日曜 */
  week: [true, true, true, true, true, true, false],
  /** 直近5週間(35日)の学習分数。0=未学習 */
  heat: [
    0, 12, 18, 0, 25, 9, 0, 14, 22, 0, 16, 30, 11, 0, 8, 19, 24, 0, 13, 27, 10, 21, 15, 18, 26, 12,
    20, 9, 17, 23, 14, 28, 19, 16, 4,
  ],
};

export const MISSIONS = [
  { label: "レッスンを1つ終える", progress: 1, goal: 1 },
  { label: "確認問題で5問正解", progress: 3, goal: 5 },
  { label: "復習を1件終える", progress: 0, goal: 1 },
];
export const MISSION_REWARD_XP = 30;

export const MILESTONE = {
  code: "CP2",
  title: "基礎理解",
  earned: 2,
  total: 4,
  badge: "ネットワーク入門",
};

export const remainingMinutes = ROUTE.filter((l) => l.status !== "done").reduce(
  (sum, l) => sum + l.minutes,
  0,
);
export const doneCount = ROUTE.filter((l) => l.status === "done").length;
export const missionsDone = MISSIONS.filter((m) => m.progress >= m.goal).length;
export const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
