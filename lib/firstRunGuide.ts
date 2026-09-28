// 初回操作ガイド（/today に重ねるコーチマーク）の台本と入口。
// 紹介動画（/tutorial）は「使ってみたい」を担い、操作はこのガイドが実画面の上で教える。
// 表示のきっかけは URL の ?guide=1 だけにする（オンボーディング完了時と「その他」からの再表示）。
// 既読フラグを持たないので、端末をまたいでも既存ユーザーに突然出ることはない。

export const FIRST_RUN_GUIDE_PARAM = "guide";
export const FIRST_RUN_GUIDE_HREF = `/today?${FIRST_RUN_GUIDE_PARAM}=1`;

export type FirstRunGuideStep = {
  id: string;
  /** 照らす要素。null は画面中央のあいさつ。見つからない要素のステップは飛ばす。 */
  target: string | null;
  title: string;
  body: string;
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
