// 7日間の冒険マップ。各 Day = 1ステージ。
export type Stage = {
  dayNo: number;
  stageName: string;
  emoji: string;
  blurb: string; // やさしい一言紹介
  themes: string[]; // その日に触れるテーマ
  accent: string; // Tailwind のグラデーション（from-... to-...）
};

export const stages: Stage[] = [
  {
    dayNo: 1,
    stageName: "はじまりの村",
    emoji: "🏡",
    blurb: "まずはコンピュータの中身をのぞいてみよう。",
    themes: ["ITの全体像", "CPU", "メモリ"],
    accent: "from-emerald-400 to-teal-500",
  },
  {
    dayNo: 2,
    stageName: "2進数の洞窟",
    emoji: "🕯️",
    blurb: "コンピュータが使う「0と1」の言葉を学ぼう。",
    themes: ["2進数", "ビット", "バイト"],
    accent: "from-sky-400 to-indigo-500",
  },
  {
    dayNo: 3,
    stageName: "ネットワークの森",
    emoji: "🌲",
    blurb: "インターネットがどうつながっているのか探検しよう。",
    themes: ["IPアドレス", "DNS", "HTTP/HTTPS"],
    accent: "from-lime-400 to-green-600",
  },
  {
    dayNo: 4,
    stageName: "セキュリティ城",
    emoji: "🏰",
    blurb: "大切な情報を守るしくみを身につけよう。",
    themes: ["パスワード認証", "暗号化", "マルウェア"],
    accent: "from-amber-400 to-orange-600",
  },
  {
    dayNo: 5,
    stageName: "データベース鉱山",
    emoji: "⛏️",
    blurb: "たくさんの情報をきれいに整理する方法を掘り出そう。",
    themes: ["データベース", "テーブル", "SQL"],
    accent: "from-rose-400 to-pink-600",
  },
  {
    dayNo: 6,
    stageName: "アルゴリズム迷宮",
    emoji: "🧭",
    blurb: "コンピュータへの「手順の伝え方」を攻略しよう。",
    themes: ["変数", "条件分岐", "繰り返し"],
    accent: "from-violet-400 to-purple-600",
  },
  {
    dayNo: 7,
    stageName: "ボス城",
    emoji: "👑",
    blurb: "これまでの冒険の総まとめ。ボスに挑もう！",
    themes: ["CPU", "DNS", "セキュリティ", "SQL", "アルゴリズム"],
    accent: "from-fuchsia-500 to-rose-600",
  },
];

export const LAST_DAY = 7;

export function getStage(dayNo: number): Stage | undefined {
  return stages.find((s) => s.dayNo === dayNo);
}
