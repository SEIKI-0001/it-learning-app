"use client";

import { useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { getWrittenQuestions } from "@/data/writtenQuestions";
import type { GradeResult, WrittenGrade } from "@/types/aiGrading";

// AI採点ページ。記述問題に回答し、Gemini（未設定時はダミー）が採点・解説する。
// 既存の単語帳などと同じ「グラデ上部バナー＋max-w-md＋BottomNav」の体裁に合わせる。

const QUESTIONS = getWrittenQuestions();

// 難易度バッジの色。
const DIFFICULTY_META: Record<string, { label: string; badge: string }> = {
  normal: { label: "標準", badge: "bg-sky-100 text-sky-700" },
  hard: { label: "やや難", badge: "bg-rose-100 text-rose-700" },
};

// グレードごとの配色（結果カードの主役）。
const GRADE_META: Record<WrittenGrade, { ring: string; text: string }> = {
  S: { ring: "ring-emerald-200 bg-emerald-50", text: "text-emerald-600" },
  A: { ring: "ring-green-200 bg-green-50", text: "text-green-600" },
  B: { ring: "ring-sky-200 bg-sky-50", text: "text-sky-600" },
  C: { ring: "ring-amber-200 bg-amber-50", text: "text-amber-600" },
  D: { ring: "ring-rose-200 bg-rose-50", text: "text-rose-600" },
};

export default function AiGradingPage() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const question = QUESTIONS[index];
  const diff = DIFFICULTY_META[question.difficulty] ?? DIFFICULTY_META.normal;
  const canGrade = useMemo(() => answer.trim().length >= 20, [answer]);

  // 次の問題へ（順番に巡回）。入力・結果はリセットする。
  function handleNext() {
    setIndex((prev) => (prev + 1) % QUESTIONS.length);
    setAnswer("");
    setResult(null);
    setError(null);
  }

  async function handleGrade() {
    if (!canGrade || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai-grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          userAnswer: answer.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; result: GradeResult }
        | { ok: false; error: string }
        | null;

      if (!res.ok || !data || data.ok === false) {
        setError(
          (data && "error" in data && data.error) ||
            "採点に失敗しました。時間をおいてもう一度試してください。"
        );
        return;
      }
      setResult(data.result);
    } catch {
      setError("採点に失敗しました。時間をおいてもう一度試してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gradient-to-r from-indigo-500 to-violet-600 px-4 pb-4 pt-4 text-white">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-xl font-extrabold">📝 AI採点</h1>
          <p className="mt-0.5 text-xs text-white/90">
            用語を覚えるだけでなく、説明できるかをAIがチェックします
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-4 py-5">
        {/* 問題カード */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
              {question.category}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${diff.badge}`}
            >
              {diff.label}
            </span>
            <span className="ml-auto text-[11px] font-bold text-gray-400">
              第{index + 1}問 / 全{QUESTIONS.length}問
            </span>
          </div>
          <p className="mt-3 text-[15px] font-bold leading-relaxed text-gray-800">
            {question.question}
          </p>
        </section>

        {/* 回答入力 */}
        <section className="space-y-2">
          <label
            htmlFor="answer"
            className="block text-sm font-extrabold text-gray-700"
          >
            あなたの回答
          </label>
          <textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={6}
            placeholder="理由・仕組み・具体例を含めて、自分の言葉で説明してみましょう。"
            className="w-full resize-y rounded-2xl border border-gray-200 bg-white p-3 text-sm leading-relaxed text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <p className="text-right text-[11px] font-bold text-gray-400">
            {answer.trim().length} 文字（20文字以上で採点できます）
          </p>
        </section>

        {/* ボタン */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleGrade}
            disabled={!canGrade || loading}
            className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3.5 text-base font-extrabold text-white shadow-sm transition active:scale-[0.99] disabled:bg-gray-300 disabled:text-gray-500"
          >
            {loading ? "採点中…" : "採点する"}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-extrabold text-gray-600 shadow-sm transition active:scale-[0.99] disabled:opacity-50"
          >
            別の問題
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        {/* 採点結果 */}
        {result && <ResultView result={result} />}
      </div>

      <BottomNav />
    </main>
  );
}

function ResultView({ result }: { result: GradeResult }) {
  const meta = GRADE_META[result.grade] ?? GRADE_META.C;
  const verdict = result.isCorrect
    ? { label: "概ね正解", badge: "bg-green-100 text-green-700" }
    : result.score >= 60
      ? { label: "部分正解", badge: "bg-amber-100 text-amber-700" }
      : { label: "理解不足", badge: "bg-rose-100 text-rose-700" };

  return (
    <section className="space-y-4">
      {/* スコア・グレード・判定 */}
      <div
        className={`flex items-center gap-4 rounded-2xl p-4 ring-1 ${meta.ring}`}
      >
        <div className="flex flex-col items-center">
          <span className={`text-4xl font-extrabold leading-none ${meta.text}`}>
            {result.grade}
          </span>
          <span className="mt-1 text-xs font-bold text-gray-500">グレード</span>
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-extrabold ${meta.text}`}>
              {result.score}
            </span>
            <span className="text-sm font-bold text-gray-400">/ 100点</span>
          </div>
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${verdict.badge}`}
          >
            {verdict.label}
          </span>
        </div>
      </div>

      {result.summary && (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-relaxed text-gray-700 ring-1 ring-gray-100">
          {result.summary}
        </p>
      )}

      {result.goodPoints.length > 0 && (
        <ResultBlock
          title="✅ 良かった点"
          items={result.goodPoints}
          tone="text-green-700"
        />
      )}
      {result.missingPoints.length > 0 && (
        <ResultBlock
          title="⚠️ 不足している点"
          items={result.missingPoints}
          tone="text-amber-700"
        />
      )}

      {result.feedback && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-extrabold text-gray-800">💡 解説</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            {result.feedback}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
        <h3 className="text-sm font-extrabold text-indigo-700">📘 模範解答</h3>
        <p className="mt-2 text-sm leading-relaxed text-indigo-900/90">
          {result.modelAnswer}
        </p>
      </div>

      {result.nextReviewTheme && (
        <div className="rounded-2xl bg-gray-100 px-4 py-3">
          <span className="text-xs font-bold text-gray-500">
            次に復習すべきテーマ
          </span>
          <p className="mt-0.5 text-sm font-extrabold text-gray-700">
            {result.nextReviewTheme}
          </p>
        </div>
      )}
    </section>
  );
}

function ResultBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className={`text-sm font-extrabold ${tone}`}>{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-700">
            <span className="text-gray-300">・</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
