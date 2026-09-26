// モチット AI のプロンプトと、回答の後処理ガード（純関数）。
//
// LLM に渡すのは Learning Context 層が集めた「事実」だけ。LLM は説明・会話を担当し、
// 実力・計画・正誤を独自に判定しない。ガードは、事実に無い数字で実力を語る文や
// アプリの判定を上書きする断定（「合格レベル」など）を落とす最後の防波堤。

import type { MochitChatMessage, MochitIntent } from "./types";

export function buildMochitSystemPrompt(displayName: string): string {
  return [
    `あなたはITパスポート学習アプリのマスコット「${displayName}」です。学習者の相談に日本語で答えます。`,
    "",
    "## 口調と長さ",
    "- 親しみやすい短い話し言葉（「〜だよ」「〜しよう」）。上から目線にしない。",
    "- 原則3〜6文・数段落以内。箇条書きは3点まで。初学者に分かる言葉で。",
    "- 過剰に褒めない。「頑張れば大丈夫」のような根拠のない励ましはしない。",
    "- 最後に「次にやること」を1つ具体的に示す（振り返り以外）。",
    "- Markdown の見出し・表は使わない。強調記号（**）も使わない。",
    "",
    "## 学習状況の扱い（最重要）",
    "- 学習状況は「アプリの学習データ」に書かれた事実だけを使う。書かれていないことは推測で作らない。",
    "- 実力の段階・スコア・確からしさ・分野別の評価・苦手・今日のタスク・学習計画は、アプリの判定をそのまま伝える。自分で計算し直したり、上書きしたりしない。",
    "- 実力の段階が「準備良好」「安定」でない限り、「合格レベル」「合格できる」などと言わない。",
    "- データが「なし」「判断材料不足」の項目は、「まだデータが少ないから判断できない」と正直に伝える。",
    "- 数字を並べすぎない。「データ → 意味 → 次にやること」の順で説明する。",
    "- 新しい学習計画やタスクを作らない。次にやることは、アプリの「次の改善」「今日のタスク」から選ぶ。",
    "",
    "## 問題の質問",
    "- 正解はアプリのデータ（正解の選択肢）が正しい。自分で正誤を判定し直さない。",
    "- 1) どこで迷いやすいか 2) 正解と選んだ選択肢の違い 3) 覚えるポイント の順で簡潔に。",
    "",
    "## その他",
    "- ITパスポートや学習と関係のない依頼は、短く断って学習の話に戻す。",
    "- 個人情報を聞き出さない。",
  ].join("\n");
}

/** 意図ごとの一言指示（システムプロンプトの補足）。 */
const INTENT_NOTE: Record<MochitIntent, string> = {
  status: "学習状況の質問。実力の段階と確からしさ、分野の差、苦手、次の改善の順に、必要な分だけ話す。",
  today: "今日やることの相談。今日のタスクの残りとミッションの状況から、次の1手を示す。",
  plan: "試験までの進め方の相談。試験日までの日数・学習ペース・実力の段階から、無理のない方針を示す。間に合うかを断定しない。",
  question: "表示中の問題についての質問。",
  learn: "表示中の学習内容についての質問。トピックの要点から説明する。",
  reflection:
    "1日の振り返り。1) 今日やったこと 2) 良かったところ 3) 少し気になるところ 4) 明日の方向性 を合計4〜5文で。最後に「今日、何か気になったことある？」のような軽い質問を1つだけ添えてよい。",
  general: "一般的な相談。必要なら学習データを使う。",
};

export function buildMochitUserPrompt(input: {
  intent: MochitIntent;
  facts: unknown;
  history: MochitChatMessage[];
  message: string;
}): string {
  const lines = [
    `## 相談の種類\n${INTENT_NOTE[input.intent]}`,
    `## アプリの学習データ（JSON・これ以外の学習状況は不明）\n${JSON.stringify(input.facts)}`,
  ];
  if (input.history.length > 0) {
    lines.push(
      `## ここまでの会話\n${input.history
        .map((m) => `${m.role === "user" ? "学習者" : "モチット"}: ${m.text}`)
        .join("\n")}`,
    );
  }
  lines.push(`## 学習者の今回の発言\n${input.message}`);
  return lines.join("\n\n");
}

// ---------------------------------------------------------------------------
// 回答ガード
// ---------------------------------------------------------------------------

/** 実力を語る数字（点・%）を含む文の目印。 */
const SCORE_SENTENCE = /(点|％|%|スコア|正答率|準備度)/;
/** アプリの判定を上書きする断定。 */
const PASS_ASSERTION = /(合格(レベル|圏|確実|できる|間違いない|できます|でき(そう|る))|もう(大丈夫|安心)|余裕で合格)/;
const PASS_ALLOWED_BANDS = new Set(["準備良好", "安定"]);

function collectNumbers(value: unknown, out: Set<string>): void {
  if (typeof value === "number" && Number.isFinite(value)) {
    out.add(String(Math.round(value)));
    return;
  }
  if (typeof value === "string") {
    for (const m of value.matchAll(/\d+(?:\.\d+)?/g)) out.add(m[0]);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectNumbers(v, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectNumbers(v, out);
  }
}

function splitSentences(text: string): string[] {
  return text.match(/[^。！？!?\n]+[。！？!?]?\n?|\n/g) ?? [text];
}

/**
 * LLM の返答から、事実に無い数字で実力を語る文と、アプリの判定を超える合格断定を落とす。
 * 全部落ちたら null（呼び出し側で定型文へ切り替える）。
 */
export function guardMochitReply(
  reply: string,
  facts: unknown,
  options: { band: string | null; context?: string },
): string | null {
  const allowed = new Set<string>();
  collectNumbers(facts, allowed);
  if (options.context) collectNumbers(options.context, allowed);
  const passAllowed = options.band !== null && PASS_ALLOWED_BANDS.has(options.band);

  const kept = splitSentences(reply.replace(/\*\*/g, "")).filter((sentence) => {
    if (!passAllowed && PASS_ASSERTION.test(sentence) && !/(ない|ません|まだ)/.test(sentence)) return false;
    if (SCORE_SENTENCE.test(sentence)) {
      const numbers = sentence.match(/\d+(?:\.\d+)?/g) ?? [];
      if (numbers.some((n) => !allowed.has(n))) return false;
    }
    return true;
  });
  const text = kept.join("").replace(/\n{3,}/g, "\n\n").trim();
  return text.length > 0 ? text : null;
}

export const MOCHIT_FALLBACK_REPLY =
  "ごめんね、今はうまく答えられないみたい。学習はそのまま続けられるよ。";
