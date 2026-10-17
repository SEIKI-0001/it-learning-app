import acronyms from "@/data/wordlist/itpassAcronyms.json";
import { getPublishedQuestions, isContentHashValid } from "@/lib/questionBank";
import { compose, HOOKS, validLength, type Source, type Theme } from "@/lib/growth/xPosting/core";
import type { QuestionRecord } from "@/types/questionBank";

// Only educational IPA text with attribution, or owned application material.
// No third-party figures, modified questions, or draft/AI-generated questions.
export function questionSource(q: QuestionRecord, theme: "question" | "trick"): Source | null {
  if (q.status !== "published" || !q.reviewedAt || !q.reviewedBy || !isContentHashValid(q) || q.figures?.length || !["official_past", "app_original"].includes(q.origin)) return null;
  if (q.origin === "official_past" && (q.official?.provider !== "ipa" || q.official.isModified || !q.official.sourceUrl || !q.official.original)) return null;
  const attribution = q.official ? `\n出典：${q.official.year}年度 ITパスポート試験 問${q.official.questionNumber}（IPA）` : "\n資格もちっと独自問題";
  const text = `${q.prompt}\n${q.choices.map(c => `${c.key} ${c.text}`).join("\n")}\n正答：${q.correctChoice}\n${q.explanation}${attribution}`;
  const s: Source = { id: q.id, theme, text, evidence: q.official?.sourceUrl ?? `data/question-bank/original/${q.id}@${q.version}`, path: q.official ? `/kakomon/${q.official.year}/${q.official.questionNumber}` : "/kakomon", rights: q.official ? "ipa_attributed" : "app_original" };
  // Require room for a shortened URL (23 weighted chars) and the approved hook/tag.
  return validLength(compose(HOOKS[0], s, "https://example.com")) ? s : null;
}
const studyTips = [
  "1テーマ学んだら、すぐ問題を解いて「分かったつもり」を確かめてみましょう。",
  "今日は苦手な用語を一つ選び、自分の言葉で説明してから解説と比べてみましょう。",
  "過去問を解いた後は、正解の理由だけでなく、他の選択肢が違う理由も確認してみましょう。",
  "学習の最初に前回の内容を一つ思い出し、その後で解説を開いて確認してみましょう。",
  "覚える用語が増えてきたら、似た言葉を並べて違いを一つずつ整理してみましょう。",
  "今日は新しい範囲に進む前に、前回間違えた問題をもう一度解いてみましょう。",
  "長い学習時間を取れない日は、一つのテーマを決めて問題と解説を確認してみましょう。",
];
export function availableSources(theme: Theme, slot: string): Source[] {
  let sources: Source[];
  if (theme === "question" || theme === "trick") {
    sources = getPublishedQuestions().map(q => questionSource(q, theme as "question" | "trick")).filter((s): s is Source => s !== null);
    if (sources.length) return rotate(sources, slot).slice(0, 10);
    theme = "terms"; // Current full questions cannot fit; never silently shorten their facts.
  }
  if (theme === "terms" || theme === "challenge") {
    sources = acronyms.map(w => ({ id: `${theme}-${w.id}`, theme, text: `${theme === "challenge" ? "週末チャレンジ：意味を思い出せますか？\n" : ""}${w.acronym}（${w.japanese}）\n${w.oneLine}`, evidence: `data/wordlist/itpassAcronyms.json#${w.id}`, path: theme === "challenge" ? "/kakomon" : "/words", rights: "app_original" }));
  } else if (theme === "service") {
    // The LP currently offers a free public lesson, not an anonymous readiness diagnosis.
    sources = [{ id: "service-trial-core", theme, text: "DNSがなぜ必要か、URLを入力してからページが出るまでを模型で確かめてみませんか。資格もちっとの教材を登録不要で無料体験できます。", evidence: "app/lp/try/page.tsx", path: "/lp/try", rights: "app_original" }, { id: "service-learning", theme, text: "ITパスポートの学習に。資格もちっとでは、教材と公式過去問で学べます。無料で使える範囲と料金はサービス紹介ページで確認できます。", evidence: "app/lp/page.tsx", path: "/lp", rights: "app_original" }];
  } else {
    // Saturday uses learning know-how, without generating unverified latest exam news.
    sources = studyTips.map((text, i) => ({ id: `${theme}-tip-${i}`, theme, text, evidence: "app/guide/it-passport-study-method/page.tsx", path: "/guide/it-passport-study-method", rights: "app_original" }));
  }
  return rotate(sources.filter(s => validLength(compose(HOOKS[0], s, "https://example.com"))), slot).slice(0, 10);
}
function rotate<T>(sources: T[], slot: string): T[] {
  const offset = Math.floor(Date.parse(slot) / 86400000) % Math.max(sources.length, 1);
  return [...sources.slice(offset), ...sources.slice(0, offset)];
}
