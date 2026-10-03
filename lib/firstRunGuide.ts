// 操作ガイド（実画面に重ねるコーチマーク）の台本と入口。
// 紹介動画（/tutorial）は「使ってみたい」を担い、操作はこのガイドが実画面の上で教える。
// 表示のきっかけは URL の ?guide=<値> だけにする（オンボーディング完了時と「その他」からの再表示）。
// 既読フラグを持たないので、端末をまたいでも既存ユーザーに突然出ることはない。
// 「今日」は初回ガイド（?guide=1）、ほかのページは見方ガイド（?guide=learn など）。

export const FIRST_RUN_GUIDE_PARAM = "guide";
export const FIRST_RUN_GUIDE_HREF = `/today?${FIRST_RUN_GUIDE_PARAM}=1`;

export type FirstRunGuideStep = {
  id: string;
  /** 照らす要素。null は画面中央のあいさつ。見つからない要素のステップは飛ばす。 */
  target: string | null;
  title: string;
  body: string;
};

export type PageGuideId = "today" | "learn" | "progress" | "more";

export type PageGuide = {
  /** ?guide= の値。「今日」は既存の入口（?guide=1）を保つ。 */
  param: string;
  path: string;
  /** 最後のステップのボタン */
  doneLabel: string;
  steps: readonly FirstRunGuideStep[];
};

export const FIRST_RUN_GUIDE_STEPS: readonly FirstRunGuideStep[] = [
  {
    id: "welcome",
    target: null,
    title: "ようこそ！ここが毎日のスタート地点です",
    body: "「今日」の画面の使い方を、30秒で案内します。",
  },
  {
    id: "cues",
    target: '[data-guide="today-cues"]',
    title: "やることは上から順番に",
    body: "今日の学習が順番に並んでいます。いまの1件のボタンを押せば、そのまま学習が始まります。",
  },
  {
    id: "budget",
    target: '[data-guide="today-budget"]',
    title: "忙しい日は学習量を変えられます",
    body: "5分だけの日もOK。選んだ時間に合わせて、今日の順番が組み直されます。",
  },
  {
    id: "missions",
    target: '[data-guide="today-missions"]',
    title: "3つのミッションで宝箱",
    body: "学習を進めると自然にたまります。3つそろったら宝箱を開けてXPを受け取りましょう。",
  },
  {
    id: "mochit",
    target: ".mochit-companion",
    title: "困ったらモチットに相談",
    body: "タップすると勉強の相談ができます。長押しでメニュー、ドラッグで好きな場所へ動かせます。",
  },
  {
    id: "nav",
    target: "nav[data-app-nav]",
    title: "画面の切り替えはここから",
    body: "学ぶ＝教材一覧、復習＝間違えた問題、進捗＝合格までの道のり。使い方動画とこのガイドは「その他」からいつでも見返せます。",
  },
];

const LEARN_GUIDE_STEPS: readonly FirstRunGuideStep[] = [
  {
    id: "welcome",
    target: null,
    title: "「学ぶ」は教材の本棚です",
    body: "試験範囲のレッスンが、参考書の章立てで並んでいます。見方を順に案内します。",
  },
  {
    id: "overall",
    target: '[data-guide="learn-overall"]',
    title: "全体でどこまで学んだか",
    body: "学習済みのレッスン数と割合です。レッスンを学び終えるたびに伸びていきます。",
  },
  {
    id: "continue",
    target: '[data-guide="learn-continue"]',
    title: "前回の続きはここから",
    body: "最後に開いたレッスンの続きへ、すぐに戻れます。",
  },
  {
    id: "filter",
    target: '[data-guide="learn-filter"]',
    title: "分野と検索で探す",
    body: "試験の3分野（ストラテジ・マネジメント・テクノロジ）で絞り込んだり、用語で検索したりできます。",
  },
  {
    id: "themes",
    target: '[data-guide="learn-themes"]',
    title: "章を押すとレッスンが開きます",
    body: "1行が1つの章です。押すと中のレッスン一覧が開きます。右の表示と左の色の線で、学習中・復習待ち・習得済みが分かります。",
  },
  {
    id: "theme-exam",
    target: '[data-guide="learn-theme-exam"]',
    title: "章の仕上げに総まとめ試験",
    body: "章を学び終えたら、本試験に近い形式の問題で理解を確かめましょう。",
  },
];

const PROGRESS_GUIDE_STEPS: readonly FirstRunGuideStep[] = [
  {
    id: "welcome",
    target: null,
    title: "「進捗」は合格までの地図です",
    body: "いまどこにいて、合格まで何が残っているかをまとめています。見方を順に案内します。",
  },
  {
    id: "readiness",
    target: '[data-guide="progress-readiness"]',
    title: "合格準備度はいちばん大切な指標",
    body: "実際の回答と覚えている度合いから、いま試験を受けたらどれくらい戦えるかを100点満点で示します。問題に答えると判定が始まります。",
  },
  {
    id: "road",
    target: '[data-guide="progress-road"]',
    title: "合格までの道のり",
    body: "CP（チェックポイント）を順に突破すると試験本番です。モチットの位置がいまの場所。CPを押すと完了条件を確認できます。",
  },
  {
    id: "kpis",
    target: '[data-guide="progress-kpis"]',
    title: "試験日とペースをひと目で",
    body: "試験までの日数、予定と比べたペース、いまのCPの達成条件の数です。",
  },
  {
    id: "gate",
    target: "#gate",
    title: "いまの目標＝次のCPの突破",
    body: "条件がそろうと突破試験に挑戦できます。合格すると次のCPへ進みます。",
  },
  {
    id: "breakdown",
    target: '[data-guide="progress-breakdown"]',
    title: "分野ごとの内訳と、伸ばしどころ",
    body: "分野別の準備度と、いちばん伸ばせるところが出ます。問題に答えるほど判定が正確になります。",
  },
  {
    id: "links",
    target: '[data-guide="progress-links"]',
    title: "もっとくわしく見たいとき",
    body: "学習の記録・100問模試・週間レポートなどへは、ここから移動できます。",
  },
];

const MORE_GUIDE_STEPS: readonly FirstRunGuideStep[] = [
  {
    id: "welcome",
    target: null,
    title: "「その他」は機能の引き出しです",
    body: "毎日の学習以外の機能を、目的ごとにまとめています。",
  },
  {
    id: "plan",
    target: '[data-guide="more-計画・実力確認"]',
    title: "計画を見直す・実力を試す",
    body: "学習計画の確認や、100問模試・公式過去問で本番前の腕試しができます。",
  },
  {
    id: "tools",
    target: '[data-guide="more-学習ツール"]',
    title: "すきま時間の学習ツール",
    body: "単語帳で用語を覚えたり、AI採点で「説明できるか」を試したりできます。",
  },
  {
    id: "settings",
    target: '[data-guide="more-成長・設定"]',
    title: "試験日や学習時間の変更",
    body: "試験日や1日の学習時間は「設定」から変えられます。変えた内容は学習計画にも反映されます。",
  },
  {
    id: "howto",
    target: '[data-guide="more-使い方"]',
    title: "迷ったらここ",
    body: "使い方動画と、各ページの操作ガイドをいつでも見返せます。",
  },
  {
    id: "billing",
    target: "#billing",
    title: "プランの確認",
    body: "いまのプランの確認やお支払いはここから行えます。",
  },
];

export const PAGE_GUIDES: Record<PageGuideId, PageGuide> = {
  today: { param: "1", path: "/today", doneLabel: "学習を始める", steps: FIRST_RUN_GUIDE_STEPS },
  learn: { param: "learn", path: "/learn", doneLabel: "閉じる", steps: LEARN_GUIDE_STEPS },
  progress: { param: "progress", path: "/progress", doneLabel: "閉じる", steps: PROGRESS_GUIDE_STEPS },
  more: { param: "more", path: "/more", doneLabel: "閉じる", steps: MORE_GUIDE_STEPS },
};

export function pageGuideHref(id: PageGuideId): string {
  const guide = PAGE_GUIDES[id];
  return `${guide.path}?${FIRST_RUN_GUIDE_PARAM}=${guide.param}`;
}
