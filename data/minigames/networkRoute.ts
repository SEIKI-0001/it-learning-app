import type { MiniGame } from "@/types/minigame";

// 通信ルートをつなげ: Webページが表示されるまでの順番を並べ替えで完成させる。
// テーマ: ブラウザ / DNS / Webサーバ / API / DB / リクエストとレスポンス。
export const networkRouteGame: MiniGame = {
  id: "network-route",
  title: "通信ルートをつなげ",
  field: "technology",
  themes: ["ブラウザ", "DNS", "Webサーバ", "API", "データベース"],
  difficulty: 2,
  estimatedMinutes: 3,
  description:
    "URLを入れてからWebページが表示されるまでの流れを、上下ボタンで正しい順番に並べ替えるゲームです。Webサービスの裏側を一本の線でつかみます。",
  examPoints: [
    "URLを入れるだけで、裏側では複数の処理が順番に動いている",
    "DNSはドメイン名をIPアドレスに変換する（住所録の役割）",
    "リクエスト→処理→レスポンスの流れと、Webサーバ・API・DBの関係",
  ],
  relatedTopicId: "tech-web-internet-basics",
  content: {
    kind: "network-route",
    steps: [
      {
        id: "step-url",
        label: "ユーザーがURLを入力する",
        detail: "見たいページの住所（URL）をブラウザに入れるところから始まります。",
      },
      {
        id: "step-dns",
        label: "DNSでドメイン名からIPアドレスを調べる",
        detail:
          "DNSは住所録の役割。人が読める名前(example.com)を、機械が使う番号(IPアドレス)に変換します。",
      },
      {
        id: "step-request",
        label: "ブラウザがWebサーバにリクエストを送る",
        detail: "調べた住所(IPアドレス)あてに「このページをください」と要求(リクエスト)します。",
      },
      {
        id: "step-api",
        label: "WebサーバがAPIを呼び出す",
        detail: "Webサーバは必要なデータを取るため、処理の窓口であるAPIを呼びます。",
      },
      {
        id: "step-db",
        label: "APIがDBからデータを取得する",
        detail: "APIは保存場所であるDB(データベース)から、必要なデータを取り出します。",
      },
      {
        id: "step-response",
        label: "WebサーバがHTMLやデータを返す",
        detail: "集めた結果を、ブラウザが表示できる形(HTMLやデータ)にして返します(レスポンス)。",
      },
      {
        id: "step-render",
        label: "ブラウザが画面を表示する",
        detail: "受け取ったHTMLやデータをもとに、ブラウザが画面を組み立てて表示します。",
      },
    ],
    summary:
      "URLを入れる→DNSで住所を調べる→Webサーバに頼む→APIがDBからデータを取る→結果を返す→画面を表示。たった1回のアクセスでも、裏ではこれだけの処理がバトンをつないでいます。",
  },
};
