// 週間レポートの「文章」層（純関数・クライアント/サーバー共用）。
//
//   facts（lib/weeklyReportFacts.ts）
//     → buildTemplateNarrative: AI なしで必ず出せる文章（AI 障害時・生成中・0学習週）
//     → buildAiPayload:         AI へ渡す最小限の事実（氏名・メール・ID類は含めない）
//     → sanitizeAiPayload:      サーバーでクライアント送信値を検査し直す
//     → validateAiNarrative:    AI 出力を検査し、通った部分だけ残す
//     → mergeNarrative:         検査を通った AI 文章をテンプレートに重ねる
//
// AI が事実に無い数値を書いたら、その項目は捨ててテンプレート文に戻す
// （文中の数値はすべて payload に存在する数値でなければならない）。

import type { NextAction, WeeklyReportFacts, WeeklySignal, SignalCategory } from "@/lib/weeklyReportFacts";

export const MAX_ITEMS = 3;

export type NarrativeItem = { signalId: string; title: string; body: string };

export type WeeklyNarrative = {
  source: "ai" | "template";
  headline: string;
  summary: string;
  growth: NarrativeItem[];
  insights: NarrativeItem[];
  struggle: NarrativeItem | null;
  /** 次週の最優先に添える一言。null なら既存ロジックの理由をそのまま出す。 */
  nextActionNote: string | null;
  mochit: string;
};

/** 検査を通った AI 出力（通らなかった項目は undefined）。 */
export type AiNarrativePart = {
  headline?: string;
  summary?: string;
  growth?: NarrativeItem[];
  insights?: NarrativeItem[];
  struggle?: NarrativeItem;
  nextActionNote?: string;
  mochit?: string;
};

// ---------------------------------------------------------------------------
// テンプレート（AI なしの完全な文章）
// ---------------------------------------------------------------------------

const HEADLINE_BY_KIND: Record<string, string> = {
  checkpoint_pass: "チェックポイントを1つ越えた1週間でした。",
  recovered: "つまずいた所を取り返した1週間でした。",
  comeback: "止まっても、また戻ってきた1週間でした。",
  mastery_gain: "理解が一段深まった1週間でした。",
  accuracy_up: "解ける問題が増えた1週間でした。",
  badges: "ロードマップが一歩進んだ1週間でした。",
  consistency: "コツコツ積み上げた1週間でした。",
};

/** 今週の意味づけ（下の「できるようになったこと」と同じ文を繰り返さない）。 */
const MEANING_BY_KIND: Record<string, string> = {
  checkpoint_pass: "ロードマップの区切りを1つ越えた週です。",
  recovered: "新しく増やすより、つまずいた所を取り返すことが進んだ週です。",
  comeback: "止まっても戻ってこられたことが、いちばんの前進です。",
  mastery_gain: "くり返したぶんが、理解度にはっきり表れた週です。",
  accuracy_up: "解ける問題の割合が増えた週です。",
  badges: "突破までの条件が、また1つ近づいた週です。",
  consistency: "日を分けて少しずつ触れる形ができた週です。",
};

function topSignal(facts: WeeklyReportFacts, category: SignalCategory): WeeklySignal | undefined {
  return facts.signals.find((s) => s.category === category);
}

function toItem(s: WeeklySignal): NarrativeItem {
  return { signalId: s.id, title: s.title, body: s.body };
}

export function buildTemplateNarrative(facts: WeeklyReportFacts): WeeklyNarrative {
  if (facts.volume === "none") return zeroWeekNarrative(facts);

  const t = facts.totals;
  const growthSignals = facts.signals.filter((s) => s.category === "growth").slice(0, MAX_ITEMS);
  const topGrowth = growthSignals[0];

  const headline = facts.isFirstWeek
    ? "学習のスタートを切った1週間でした。"
    : (topGrowth && HEADLINE_BY_KIND[topGrowth.kind]) ??
      (facts.volume === "low"
        ? "小さく、でも確かに進めた1週間でした。"
        : "自分のペースで積み上げた1週間でした。");

  const opening = `今週は${t.daysStudied}日で${t.answered}問に取り組み、${t.correct}問正解しました。`;
  const summary = topGrowth ? `${opening}${MEANING_BY_KIND[topGrowth.kind] ?? ""}` : opening;

  const growth =
    growthSignals.length > 0
      ? growthSignals.map(toItem)
      : [
          {
            signalId: "steady",
            title: "今週も学習を止めませんでした",
            body: `${t.answered}問に取り組み、${t.correct}問正解しています。少しずつでも触れ続けることで、前に学んだ内容を忘れにくくなります。`,
          },
        ];

  const struggle = topSignal(facts, "struggle");

  return {
    source: "template",
    headline,
    summary,
    growth,
    insights: facts.signals.filter((s) => s.category === "insight").slice(0, MAX_ITEMS).map(toItem),
    struggle: struggle ? toItem(struggle) : null,
    nextActionNote: null,
    mochit: templateMochit(facts),
  };
}

function zeroWeekNarrative(facts: WeeklyReportFacts): WeeklyNarrative {
  const c = facts.cumulative;
  const mochit =
    c.completedTopics > 0
      ? `これまでに${c.completedTopics}トピック進めてきたこと、ちゃんと覚えてるよ。久しぶりでも、1問だけでも大丈夫。`
      : c.totalAnswered > 0
        ? `これまでに${c.totalAnswered}問いっしょに解いてきたね。また1問から、いっしょに始めよう。`
        : "ここからいっしょに始めよう。まずは1問だけでも大丈夫だよ。";
  return {
    source: "template",
    headline: "今週は学習記録がありませんでした。",
    summary:
      c.totalAnswered > 0
        ? "ここまで進めてきた内容がなくなったわけではありません。次は一番軽い復習から戻りましょう。"
        : "準備ができたら、まずは短い1レッスンから始めましょう。",
    growth: [],
    insights: [],
    struggle: null,
    nextActionNote: null,
    mochit,
  };
}

function templateMochit(facts: WeeklyReportFacts): string {
  const top = topSignal(facts, "growth");
  if (top?.kind === "comeback" && facts.comeback) {
    const c = facts.comeback;
    return `${c.gapDays}日あいたあと、${c.resumedWeekday}曜日に戻ってきたの、ちゃんと見てたよ。毎日完璧じゃなくても、また始められれば前に進んでる。`;
  }
  if (top?.kind === "recovered") {
    return `前にまちがえた問題、今週は${facts.recovered.questionCount}問取り返したね。つまずいた所が、そのまま伸びしろになってるよ。`;
  }
  if (top?.kind === "mastery_gain") {
    const m = facts.masteryChanges[0];
    if (m) return `「${m.title}」、理解度が${m.after}まで来たね。くり返したぶん、ちゃんと身についてるよ。`;
  }
  if (top?.kind === "checkpoint_pass") {
    return "突破試験の合格、おめでとう。次のエリアも、いっしょに進もう。";
  }
  const t = facts.totals;
  if (t.daysStudied >= 4) {
    return `今週は${t.daysStudied}日も会えたね。この調子で、来週も少しずつ進もう。`;
  }
  return `今週は${t.answered}問、いっしょに解いたね。少しずつでも、ちゃんと積み上がってるよ。`;
}


// ---------------------------------------------------------------------------
// AI へ渡すペイロード（個人情報なし・数値は確定済み）
// ---------------------------------------------------------------------------

export type AiPayloadSignal = {
  id: string;
  category: SignalCategory;
  fact: string;
  tentative: boolean;
  numbers: number[];
};

export type WeeklyAiPayload = {
  isFirstWeek: boolean;
  lowData: boolean;
  totals: { answered: number; correct: number; accuracy: number | null; daysStudied: number; topicsTouched: number };
  lastWeek: { answered: number; accuracy: number | null; daysStudied: number } | null;
  /** 曜日ごとの解答数（例: "月:5 火:0 …"）。 */
  dailyPattern: string;
  checkpoint: { label: string; earnedRequired: number; totalRequired: number };
  signals: AiPayloadSignal[];
  nextActions: { title: string; estimatedMinutes: number; reason: string }[];
};

export function buildAiPayload(facts: WeeklyReportFacts): WeeklyAiPayload {
  const t = facts.totals;
  return {
    isFirstWeek: facts.isFirstWeek,
    lowData: facts.volume === "low",
    totals: {
      answered: t.answered,
      correct: t.correct,
      accuracy: t.accuracy,
      daysStudied: t.daysStudied,
      topicsTouched: t.topicsTouched,
    },
    lastWeek: facts.lastWeek
      ? {
          answered: facts.lastWeek.answered,
          accuracy: facts.lastWeek.accuracy,
          daysStudied: facts.lastWeek.daysStudied,
        }
      : null,
    dailyPattern: facts.period.days.map((d) => `${d.weekday}:${d.answered}`).join(" "),
    checkpoint: {
      label: facts.checkpoint.label,
      earnedRequired: facts.checkpoint.earnedRequired,
      totalRequired: facts.checkpoint.totalRequired,
    },
    signals: facts.signals.map((s) => ({
      id: s.id,
      category: s.category,
      fact: s.fact,
      tentative: s.tentative,
      numbers: s.numbers,
    })),
    nextActions: facts.nextActions.map((a: NextAction) => ({
      title: a.title,
      estimatedMinutes: a.estimatedMinutes,
      reason: a.reason,
    })),
  };
}

// ---------------------------------------------------------------------------
// サーバー側の入力検査（クライアント送信値を信用しない）
// ---------------------------------------------------------------------------

const MAX_TEXT = 200;
const MAX_SIGNALS = 20;

function cleanText(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== "string") return null;
  // 制御文字・山括弧・波括弧を落とし、プロンプトの構造を壊す入力を無害化する。
  const s = v.replace(/[\u0000-\u001f\u007f<>{}]/g, "").trim();
  return s ? s.slice(0, max) : null;
}

function cleanInt(v: unknown, max = 100_000): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(-max, Math.min(max, Math.round(v)));
}

const CATEGORIES: SignalCategory[] = ["growth", "insight", "struggle"];

/** クライアントから届いたペイロードを検査し直す。形が崩れていれば null。 */
export function sanitizeAiPayload(input: unknown): WeeklyAiPayload | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;
  const totals = p.totals as Record<string, unknown> | undefined;
  if (!totals) return null;
  const answered = cleanInt(totals.answered);
  const correct = cleanInt(totals.correct);
  const daysStudied = cleanInt(totals.daysStudied, 7);
  const topicsTouched = cleanInt(totals.topicsTouched);
  if (answered === null || correct === null || daysStudied === null || topicsTouched === null) {
    return null;
  }
  const accuracyOrNull = (v: unknown) => (v === null ? null : cleanInt(v, 100));

  const lw = p.lastWeek as Record<string, unknown> | null | undefined;
  const lastWeek =
    lw && typeof lw === "object"
      ? {
          answered: cleanInt(lw.answered) ?? 0,
          accuracy: accuracyOrNull(lw.accuracy),
          daysStudied: cleanInt(lw.daysStudied, 7) ?? 0,
        }
      : null;

  const cp = (p.checkpoint ?? {}) as Record<string, unknown>;
  const signals = (Array.isArray(p.signals) ? p.signals : [])
    .slice(0, MAX_SIGNALS)
    .flatMap((raw): AiPayloadSignal[] => {
      if (!raw || typeof raw !== "object") return [];
      const s = raw as Record<string, unknown>;
      const id = cleanText(s.id, 80);
      const fact = cleanText(s.fact);
      const category = CATEGORIES.find((c) => c === s.category);
      if (!id || !fact || !category) return [];
      const numbers = (Array.isArray(s.numbers) ? s.numbers : [])
        .slice(0, 8)
        .flatMap((n) => {
          const v = cleanInt(n);
          return v === null ? [] : [v];
        });
      return [{ id, category, fact, tentative: s.tentative === true, numbers }];
    });

  const nextActions = (Array.isArray(p.nextActions) ? p.nextActions : [])
    .slice(0, 2)
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const a = raw as Record<string, unknown>;
      const title = cleanText(a.title, 60);
      const reason = cleanText(a.reason, 80);
      const estimatedMinutes = cleanInt(a.estimatedMinutes, 120);
      return title && reason && estimatedMinutes !== null ? [{ title, reason, estimatedMinutes }] : [];
    });

  return {
    isFirstWeek: p.isFirstWeek === true,
    lowData: p.lowData === true,
    totals: {
      answered,
      correct,
      accuracy: accuracyOrNull(totals.accuracy),
      daysStudied,
      topicsTouched,
    },
    lastWeek,
    dailyPattern: cleanText(p.dailyPattern, 80) ?? "",
    checkpoint: {
      label: cleanText(cp.label, 60) ?? "",
      earnedRequired: cleanInt(cp.earnedRequired, 100) ?? 0,
      totalRequired: cleanInt(cp.totalRequired, 100) ?? 0,
    },
    signals,
    nextActions,
  };
}

// ---------------------------------------------------------------------------
// AI 出力の検査
// ---------------------------------------------------------------------------

/** 過剰な保証・誇張・責める表現。含む文章は捨てる。 */
const BANNED = /絶対|必ず合格|合格確実|間違いなく|確実に合格|天才|完璧です|完璧な理解|サボ|怠け|ダメ|だめ|もっと頑張|さぼ/;

function normalizeDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/** payload に登場する数値すべて（文字列中の数字も含む）。 */
export function allowedNumbers(payload: WeeklyAiPayload): Set<number> {
  // 1 と 7（「1問」「7日のうち」）は期間・単位として常に許す。
  const set = new Set<number>([1, 7]);
  const walk = (v: unknown) => {
    if (typeof v === "number") set.add(Math.abs(v));
    else if (typeof v === "string") {
      for (const m of normalizeDigits(v).match(/\d+/g) ?? []) set.add(Number(m));
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(payload);
  return set;
}

function numbersOk(text: string, allowed: Set<number>): boolean {
  return (normalizeDigits(text).match(/\d+/g) ?? []).every((m) => allowed.has(Number(m)));
}

function okText(v: unknown, max: number, allowed: Set<number>): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!s || s.length > max || BANNED.test(s) || !numbersOk(s, allowed)) return undefined;
  return s;
}

const HEDGE = "まだ数が少ないので参考程度ですが、";

function okItems(
  raw: unknown,
  category: SignalCategory,
  payload: WeeklyAiPayload,
  allowed: Set<number>,
  limit: number,
): NarrativeItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const byId = new Map(payload.signals.filter((s) => s.category === category).map((s) => [s.id, s]));
  const used = new Set<string>();
  const items: NarrativeItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const signal = typeof o.signalId === "string" ? byId.get(o.signalId) : undefined;
    if (!signal || used.has(signal.id)) continue;
    const title = okText(o.title, 40, allowed);
    let body = okText(o.body, 220, allowed);
    if (!title || !body) continue;
    // データが少ない候補は、AI が書き忘れても断定しない形にする。
    if (signal.tentative && !/参考|少ない|まだ/.test(body)) body = `${HEDGE}${body}`;
    used.add(signal.id);
    items.push({ signalId: signal.id, title, body });
    if (items.length >= limit) break;
  }
  return items.length > 0 ? items : undefined;
}

/** Mochit の一言が、その週の事実に触れているか（毎週同じ定型文を防ぐ）。 */
function mentionsFact(text: string, payload: WeeklyAiPayload): boolean {
  const digits = (normalizeDigits(text).match(/\d+/g) ?? []).map(Number);
  if (digits.some((n) => n >= 2)) return true;
  if (/[月火水木金土日]曜/.test(text)) return true;
  const titles = [...payload.signals.flatMap((s) => s.fact.match(/「([^」]+)」/g) ?? []), ...payload.nextActions.map((a) => a.title)];
  return titles.some((t) => text.includes(t.replace(/[「」]/g, "")));
}

/** AI の生出力を検査し、通った部分だけを返す。 */
export function validateAiNarrative(raw: unknown, payload: WeeklyAiPayload): AiNarrativePart {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const allowed = allowedNumbers(payload);
  const part: AiNarrativePart = {};

  part.headline = okText(o.headline, 40, allowed);
  part.summary = okText(o.summary, 200, allowed);
  part.growth = okItems(o.growth, "growth", payload, allowed, MAX_ITEMS);
  part.insights = okItems(o.insights, "insight", payload, allowed, MAX_ITEMS);
  part.struggle = okItems(o.struggle ? [o.struggle] : [], "struggle", payload, allowed, 1)?.[0];
  part.nextActionNote = payload.nextActions.length > 0 ? okText(o.nextActionNote, 120, allowed) : undefined;
  const mochit = okText(o.mochit, 120, allowed);
  part.mochit = mochit && mentionsFact(mochit, payload) ? mochit : undefined;

  for (const k of Object.keys(part) as (keyof AiNarrativePart)[]) {
    if (part[k] === undefined) delete part[k];
  }
  return part;
}

/** 検査済みの AI 文章をテンプレートに重ねる。足りない所はテンプレートのまま。 */
export function mergeNarrative(template: WeeklyNarrative, ai: AiNarrativePart | null): WeeklyNarrative {
  if (!ai || Object.keys(ai).length === 0) return template;
  // 課題の候補があるときは必ず出す（悪い結果を隠さない）。AI が別の候補を選んだらそれを使う。
  const struggle = template.struggle ? (ai.struggle ?? template.struggle) : null;
  return {
    source: "ai",
    headline: ai.headline ?? template.headline,
    summary: ai.summary ?? template.summary,
    growth: ai.growth ?? template.growth,
    insights: ai.insights ?? template.insights,
    struggle,
    nextActionNote: ai.nextActionNote ?? null,
    mochit: ai.mochit ?? template.mochit,
  };
}

// ---------------------------------------------------------------------------
// プロンプト
// ---------------------------------------------------------------------------

export function buildWeeklyReportSystemPrompt(): string {
  return [
    "あなたはITパスポート試験の学習アプリの学習コーチです。",
    "ユーザーの1週間の学習データ（アプリが計算済みの事実）を読み、本人が気づいていない成長・変化・傾向を言葉にして、次週のやる気につなげます。",
    "目的は褒めることではなく、事実から意味を見つけることです。",
    "",
    "厳守するルール:",
    "- 数値は入力 JSON に書かれている数値だけを使う。足し算・引き算・割合の計算をして新しい数値を作らない。",
    "- 入力に無い成長・出来事・因果関係を作らない。「〜したから伸びた」と断定せず「〜しています」「〜かもしれません」と書く。",
    "- tentative が true の候補、または lowData が true のときは「まだ数が少ないので参考程度ですが」のように断定を避ける。",
    "- 合格の保証（絶対・確実・必ず合格）を書かない。",
    "- 「すごい」「天才」「努力家」のような抽象的な褒め言葉を使わない。事実→それが何を意味するか、の順で書く。",
    "- 学習量が少なくても責めない。「もっと頑張りましょう」等も書かない。",
    "- 量よりも、苦手克服・定着・復習の効果・チェックポイントの進展・学習の再開・継続を優先して拾う。",
    "- isFirstWeek が true のときは先週との比較をしない。lastWeek が null のときも比較しない。",
    "- です・ます調。やわらかく、短く。絵文字は使わない。",
    "- mochit はアプリのマスコット「モチット」のセリフ。やさしいタメ口で、その週の具体的な事実（数値・曜日・トピック名のいずれか）を必ず1つ入れる。",
    "",
    "出力は次の JSON だけを返す（前後に説明文を付けない）:",
    "{",
    '  "headline": "今週を一言で表す文（30字以内）",',
    '  "summary": "今週の意味を2〜3文で（150字以内）",',
    '  "growth": [{ "signalId": "category=growth の候補 id", "title": "できるようになったこと（30字以内）", "body": "数値や行動→それが何を意味するか（120字以内）" }],',
    '  "insights": [{ "signalId": "category=insight の候補 id", "title": "見つけた傾向（30字以内）", "body": "事実→今の状態の意味→どう活かせるか（140字以内）" }],',
    '  "struggle": { "signalId": "category=struggle の候補 id", "title": "（30字以内）", "body": "事実→状況の意味→次にできること（140字以内）" } または null,',
    '  "nextActionNote": "nextActions[0] をなぜ最優先にするとよいか、今週の事実とつなげて1〜2文（80字以内）",',
    '  "mochit": "モチットの一言（80字以内）"',
    "}",
    "growth / insights はそれぞれ最大3件。候補が無いカテゴリは空配列。struggle の候補があるときは null にしない（悪い結果を隠さない）。",
    "signalId は入力の signals にある id をそのまま使う。",
  ].join("\n");
}

export function buildWeeklyReportUserPrompt(payload: WeeklyAiPayload): string {
  return `今週の学習データ（計算済みの事実）:\n${JSON.stringify(payload, null, 2)}`;
}
