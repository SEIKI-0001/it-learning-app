// モチットを開いたページから「最初に出す候補」を決める（純関数）。
// モチット自体は全ページ共通の1コンポーネントで、ここは候補の出し分けだけを受け持つ。

import type { MochitPageKind, MochitQuickAction } from "./types";

function within(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * パスからページの種類を決める。問題を表示中かどうかはパスでは分からないので、
 * 呼び出し側が「回答済みの問題が公開されている」ときに question へ上書きする。
 */
export function pageKindForPath(pathname: string): MochitPageKind {
  if (within(pathname, "/today")) return "today";
  if (within(pathname, "/progress") || within(pathname, "/plan")) return "progress";
  if (topicIdFromPath(pathname)) return "learn";
  return "general";
}

/** 学習ページ（/learn/<theme>/<section>/<topicId>・/topics/<topicId>）のトピックID。 */
export function topicIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "learn" && segments.length === 4) return decodeURIComponent(segments[3]);
  if (segments[0] === "topics" && segments.length === 2 && segments[1] !== "theme") {
    return decodeURIComponent(segments[1]);
  }
  return null;
}

const STATUS: MochitQuickAction = {
  id: "status",
  label: "今の学習状況を見る",
  intent: "status",
  message: "今の学習状況を教えて",
};

const QUICK_ACTIONS: Record<MochitPageKind, readonly MochitQuickAction[]> = {
  today: [
    STATUS,
    { id: "today_next", label: "今日あと何をすればいい？", intent: "today", message: "今日あと何をすればいい？" },
    { id: "today_consult", label: "今日のタスクについて相談", intent: "today", message: "今日のタスクについて相談したい" },
  ],
  question: [
    { id: "q_explain", label: "この問題を説明して", intent: "question", message: "この問題を説明して" },
    { id: "q_why_wrong", label: "なぜ自分の回答ではダメ？", intent: "question", message: "なぜ自分の回答ではダメなの？" },
    { id: "q_simpler", label: "もっと簡単に説明して", intent: "question", message: "もっと簡単に説明して" },
    { id: "q_field", label: "この分野について質問する", intent: "question", message: "この分野で押さえるべきポイントは？" },
  ],
  learn: [
    { id: "learn_simple", label: "この内容を簡単に説明して", intent: "learn", message: "この内容を簡単に説明して" },
    { id: "learn_importance", label: "この内容はどれくらい重要？", intent: "learn", message: "この内容は試験でどれくらい重要？" },
    { id: "learn_status", label: "関連する学習状況を見る", intent: "learn", message: "この内容に関係する自分の学習状況を教えて" },
  ],
  progress: [
    { id: "p_level", label: "今の実力を教えて", intent: "status", message: "今の実力を教えて" },
    { id: "p_weak", label: "苦手なところを教えて", intent: "status", message: "苦手なところを教えて" },
    { id: "p_growth", label: "最近伸びたところを教えて", intent: "status", message: "最近伸びたところを教えて" },
    { id: "p_exam", label: "試験までの進み具合を教えて", intent: "plan", message: "試験までの進み具合を教えて" },
  ],
  general: [
    STATUS,
    { id: "g_today", label: "今日やることについて相談", intent: "today", message: "今日は何をすればいい？" },
    { id: "g_question", label: "分からないことを聞く", intent: "general", message: "" },
  ],
};

/**
 * ページの種類に応じた初期候補。message が空の候補は「入力欄へフォーカスするだけ」
 * （自由入力を促す）として扱う。
 */
export function quickActionsFor(page: MochitPageKind): readonly MochitQuickAction[] {
  return QUICK_ACTIONS[page];
}

/** 自由入力のあとに出す追いかけ候補（問題の説明のあと等）。 */
export const QUESTION_FOLLOW_UPS: readonly MochitQuickAction[] = [
  { id: "fu_simpler", label: "もっと簡単に", intent: "question", message: "もっと簡単に説明して" },
  { id: "fu_example", label: "具体例で", intent: "question", message: "具体例で説明して" },
  { id: "fu_detail", label: "もう少し詳しく", intent: "question", message: "もう少し詳しく教えて" },
];
