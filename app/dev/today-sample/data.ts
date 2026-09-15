// /today 改善デザインのサンプル用データ（テスト環境専用）。
// 実ページでは generateLearningPlan / buildQuestRoute / resolveDailyQuests が返す値に置き換わる。

export type TaskKind = "new" | "review";

export type Task = {
  id: string;
  title: string;
  field: string;
  kind: TaskKind;
  minutes: number;
  questions: number;
  reason: string;
};

export const KIND_LABEL: Record<TaskKind, string> = {
  new: "新規",
  review: "復習",
};

// 推奨順に並んだ候補。学習量（分）に収まるぶんだけを先頭から採る。
export const CANDIDATES: Task[] = [
  {
    id: "lan-wan",
    title: "LANとWAN",
    field: "ネットワーク",
    kind: "review",
    minutes: 4,
    questions: 3,
    reason: "3日前に学んだ範囲です。忘れかける前の今日が復習日です。",
  },
  {
    id: "protocol",
    title: "インターネットとプロトコル",
    field: "ネットワーク",
    kind: "new",
    minutes: 9,
    questions: 4,
    reason: "「LANとWAN」の続きです。つなげて覚えると定着しやすい範囲です。",
  },
  {
    id: "dns",
    title: "DNSとドメイン名",
    field: "ネットワーク",
    kind: "new",
    minutes: 8,
    questions: 4,
    reason: "プロトコルの次に学ぶと、名前から通信先を探す流れがつながります。",
  },
  {
    id: "cia",
    title: "情報セキュリティの3要素",
    field: "セキュリティ",
    kind: "review",
    minutes: 5,
    questions: 3,
    reason: "前回の確認問題で1問まちがえた範囲です。",
  },
  {
    id: "http",
    title: "HTTPとHTTPS",
    field: "ネットワーク",
    kind: "new",
    minutes: 7,
    questions: 4,
    reason: "DNSの次の段階です。ブラウザがページを受け取るまでを学びます。",
  },
  {
    id: "radix",
    title: "2進数と16進数",
    field: "基礎理論",
    kind: "review",
    minutes: 4,
    questions: 3,
    reason:
      "1週間前に学んだ範囲です。計算問題は間隔をあけて解き直すと定着します。",
  },
];

/** おまかせのときに使う分量（プロフィール由来の既定予算）。 */
export const DEFAULT_BUDGET = 26;
export const BUDGET_OPTIONS = [5, 15, 30] as const;

export function buildRoute(budget: number): Task[] {
  const route: Task[] = [];
  let used = 0;
  for (const task of CANDIDATES) {
    if (used + task.minutes > budget) continue;
    route.push(task);
    used += task.minutes;
  }
  return route;
}

export const MISSION_REWARD_XP = 30;

// 参考書の進み具合（1日1回の自己申告）。本番では daily_progress_reports に
// selected_level（all / half / little / none / rest）として保存し、合格準備度の
// 「インプット進捗」に使われる（参考書の章消化率と高い方が採用される）。
// ページはサービス側で分からないため、範囲は「今日の新規レッスンのトピック」で示す。
export const READING = {
  topics: ["インターネットとプロトコル", "DNSとドメイン名"],
};
