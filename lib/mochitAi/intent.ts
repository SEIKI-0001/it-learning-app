// 自由入力から「どの学習データを集めるか」を決める（ルールベース・純関数）。
// LLM に意図分類をさせない（1往復分のコストと遅延を省く）。外れても general の
// 最小コンテキストで答えるだけなので、学習判断には影響しない。

import type { MochitIntent, MochitPageKind } from "./types";

const RULES: { intent: MochitIntent; pattern: RegExp }[] = [
  { intent: "reflection", pattern: /(振り返|ふりかえ|今日どうだった|今日の反省)/ },
  { intent: "plan", pattern: /(間に合|試験まで|試験日|あと何日|ペース|計画|スケジュール|参考書.*(全部|ぜんぶ)|今週.*(勉強|できない|忙し))/ },
  { intent: "today", pattern: /(今日|きょう).*(何|なに|やる|タスク|ミッション|あと)|次(に)?(何|なに)を/ },
  { intent: "status", pattern: /(実力|今の状況|学習状況|どれくらいでき|苦手|得意|弱点|伸び|成長|合格.*(できそう|ライン|レベル)|点数|スコア|準備度)/ },
];

const QUESTION_HINT = /(この問題|これ|なんで|なぜ|どうして|違う|ダメ|正解|選択肢|[ア-エ]じゃ|[A-D]じゃ|解説|簡単に|具体例|詳しく)/;

export function inferMochitIntent(input: {
  message: string;
  page: MochitPageKind;
  hasQuestion: boolean;
  hasLearnTopic: boolean;
}): MochitIntent {
  const text = input.message.normalize("NFKC");
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.intent;
  }
  // 問題を開いているときの「これなんで？」は問題への質問として扱う
  if (input.hasQuestion && (input.page === "question" || QUESTION_HINT.test(text))) return "question";
  if (input.hasLearnTopic && input.page === "learn") return "learn";
  if (input.page === "today") return "today";
  if (input.page === "progress") return "status";
  return "general";
}
