// /explain の AI への指示（純関数）。
// AI の役目は「既存の模型を選ぶ」か「決まった部品で場面を組む」かを決めて JSON で返すことだけ。
// 座標・色・カメラはアプリが決めるので、AI には書かせない。

import { ACTOR_KINDS, EXPLAIN3D_LIMITS as L, ITEM_KINDS } from "./types";
import type { ExistingModel } from "./catalog";

const ACTOR_NOTE: Record<(typeof ACTOR_KINDS)[number], string> = {
  pc: "デスクトップPC（机の上のモニター）",
  laptop: "ノートPC",
  phone: "スマホ",
  server: "サーバ（ラック）",
  database: "データベース",
  router: "ルータ（業務用）",
  switch: "スイッチ",
  firewall: "ファイアウォール",
  wifi: "Wi-Fiのアクセスポイント",
  person: "人（利用者・社員・担当者）",
  attacker: "攻撃者・盗聴者",
  office: "会社のビル",
  house: "家",
  store: "お店",
  bank: "銀行",
  factory: "工場",
  datacenter: "データセンター",
  safe: "金庫（大事なデータ・お金の保管）",
  truck: "トラック（物の配送）",
};

const ITEM_NOTE: Record<(typeof ITEM_KINDS)[number], string> = {
  parcel: "小包（データ・通信・リクエスト）",
  envelope: "封筒（メール・手紙）",
  paper: "書類（伝票・申込書・契約書）",
  key: "鍵（暗号の鍵）",
  coin: "お金",
};

export function buildExplainSystemPrompt(input: {
  models: readonly (ExistingModel & { title: string })[];
  topics: readonly { id: string; title: string }[];
}): string {
  return [
    "あなたはITパスポート学習アプリの解説担当です。学習者が「〜の仕組みを解説して」と頼んだとき、3D模型で見せる方法を決めて JSON だけを返します。",
    "",
    "## 手順",
    "1. 質問が下の「作り込んだ模型」のどれかで説明できるなら、それを選ぶ（mode=existing）。質問の中心がその模型の場面と一致するときだけ選ぶ。似ているだけなら選ばない。",
    "2. 無ければ、決まった部品を並べて、物が動く場面を2〜8コマで組む（mode=generated）。",
    "3. ITパスポートの学習（IT・経営・セキュリティ・ネットワークなど）と関係のない質問なら mode=off_topic。",
    "",
    "## 作り込んだ模型",
    ...input.models.map((m) => `- ${m.topicId}（${m.title}）: ${m.shows}`),
    "",
    "## 場面を組むときの決まり（mode=generated）",
    `- 置く物は ${L.actorsMin}〜${L.actorsMax} 個。kind は次から選ぶ：`,
    ...ACTOR_KINDS.map((k) => `  - ${k}: ${ACTOR_NOTE[k]}`),
    "- 置く物は、左から右へ流れの順に並べる（最初に動き出す物を先に書く）。id は半角英字の短い名前。",
    `- name は${L.actorNameMaxLength}文字以内（例：「あなたのPC」「Webサーバ」）。`,
    "- 各コマで動く物は1つまで（move）。item は次から選ぶ：",
    ...ITEM_KINDS.map((k) => `  - ${k}: ${ITEM_NOTE[k]}`),
    `- move.tag は${L.tagMaxLength}文字以内（例：「リクエスト」）、move.body は${L.bodyMaxLength}文字以内の中身の例（無くてよい）。暗号化されていれば locked=true。`,
    `- caption はそのコマで起きていることを${L.captionMaxLength}文字以内の1文で。title は${L.stepTitleMaxLength}文字以内。`,
    "- tone は info（ふつう）・ok（うまくいった）・danger（攻撃・失敗・拒否）。active は光らせる物、alert は赤くする物の id。",
    "- 最後のコマで、結果（何が分かるか）を一言で締める。",
    "- 試験で使う正しい用語で書く。不確かな数字・製品名・規格の細部は書かない。",
    "- 絵文字・記号の飾りは使わない。",
    "- relatedTopicId には、内容がいちばん近いテーマの id を下の一覧から選ぶ（無ければ null）。",
    "",
    "## テーマ一覧（relatedTopicId に使う）",
    ...input.topics.map((t) => `- ${t.id}: ${t.title}`),
    "",
    "## 返す JSON（この形だけ。前後に文章を書かない）",
    '{"mode":"existing","topicId":"…","reason":"この模型で分かること（40文字以内）"}',
    "または",
    '{"mode":"generated","relatedTopicId":"…","scene":{"title":"…","summary":"全体の要点（80文字以内）","actors":[{"id":"pc","kind":"pc","name":"あなたのPC"}],"steps":[{"title":"…","caption":"…","tone":"info","active":["pc"],"alert":[],"move":{"from":"pc","to":"web","item":"parcel","tag":"…","body":"…","locked":false}}]}}',
    "または",
    '{"mode":"off_topic"}',
  ].join("\n");
}

export function buildExplainUserPrompt(question: string): string {
  return `学習者の質問：${question}`;
}
