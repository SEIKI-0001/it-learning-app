"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { getWrittenQuestions } from "@/data/writtenQuestions";
import {
  getUserId,
  readTokenFromUrl,
  resolveToken,
  setUserId,
} from "@/lib/userSession";
import type { GradeResult, WrittenGrade } from "@/types/aiGrading";

// AI採点ページ。記述問題に回答し、AIが採点・解説する。
// 無料ユーザーは Gemini（通常採点）、Proユーザーは Claude Sonnet（Pro採点）。
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

type GradeMeta = {
  plan: "free" | "pro";
  provider: "gemini" | "claude";
  model: string;
  fallback: boolean;
  usage: { used: number; limit: number; remaining: number };
};

type BillingStatus = {
  plan: "free" | "pro";
  providerLabel: string;
  usage: { used: number; limit: number; remaining: number };
  tracked: boolean;
  checkoutEnabled: boolean;
};

export default function AiGradingPage() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [meta, setMeta] = useState<GradeMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [userId, setUid] = useState<string | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const question = QUESTIONS[index];
  const diff = DIFFICULTY_META[question.difficulty] ?? DIFFICULTY_META.normal;
  const canGrade = useMemo(() => answer.trim().length >= 20, [answer]);

  // プラン・利用状況を読み込む。
  const loadStatus = useCallback(async (uid: string | null) => {
    try {
      const res = await fetch("/api/billing/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      });
      const data = (await res.json().catch(() => null)) as
        | ({ ok: true } & BillingStatus)
        | null;
      if (data && data.ok) {
        setStatus({
          plan: data.plan,
          providerLabel: data.providerLabel,
          usage: data.usage,
          tracked: data.tracked,
          checkoutEnabled: data.checkoutEnabled,
        });
      }
    } catch {
      /* 取得失敗時は free 相当の既定UIのまま */
    }
  }, []);

  // 起動時に userId を解決（?t= があれば紐づけ）してからプラン状況を取得。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let uid = getUserId();
      const token = readTokenFromUrl();
      if (!uid && token) {
        const resolved = await resolveToken(token);
        if (resolved?.userId) {
          setUserId(resolved.userId);
          uid = resolved.userId;
        }
      }
      if (cancelled) return;
      setUid(uid);
      await loadStatus(uid);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

  // 次の問題へ（順番に巡回）。入力・結果はリセットする。
  function handleNext() {
    setIndex((prev) => (prev + 1) % QUESTIONS.length);
    setAnswer("");
    setResult(null);
    setMeta(null);
    setError(null);
  }

  async function handleGrade() {
    if (!canGrade || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setMeta(null);
    try {
      const res = await fetch("/api/ai-grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          userAnswer: answer.trim(),
          userId,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; result: GradeResult; meta: GradeMeta }
        | { ok: false; error: string }
        | null;

      if (!res.ok || !data || data.ok === false) {
        setError(
          (data && "error" in data && data.error) ||
            "採点に失敗しました。時間をおいてもう一度試してください。"
        );
        // 回数表示を最新化（429 のときなど）。
        void loadStatus(userId);
        return;
      }
      setResult(data.result);
      setMeta(data.meta);
      // 残り回数を反映。
      setStatus((prev) =>
        prev ? { ...prev, usage: data.meta.usage, plan: data.meta.plan } : prev
      );
    } catch {
      setError("採点に失敗しました。時間をおいてもう一度試してください。");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade() {
    if (upgrading) return;
    if (!status?.checkoutEnabled) {
      setError("決済は現在準備中です。もうしばらくお待ちください。");
      return;
    }
    setUpgrading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; url: string }
        | { ok: false; error: string }
        | null;
      if (data && data.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(
        (data && "error" in data && data.error) ||
          "アップグレードを開始できませんでした。"
      );
    } catch {
      setError("アップグレードを開始できませんでした。");
    } finally {
      setUpgrading(false);
    }
  }

  const isPro = status?.plan === "pro";

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
        {/* プラン表示（無料/Pro の出し分け） */}
        <PlanCard
          status={status}
          isPro={isPro}
          upgrading={upgrading}
          onUpgrade={handleUpgrade}
        />

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
            {loading
              ? "採点中…"
              : isPro
                ? "Claude Sonnetで採点する"
                : "採点する"}
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
        {result && <ResultView result={result} meta={meta} />}
      </div>

      <BottomNav />
    </main>
  );
}

/** 現在のプランと無料/Pro の出し分けカード。 */
function PlanCard({
  status,
  isPro,
  upgrading,
  onUpgrade,
}: {
  status: BillingStatus | null;
  isPro: boolean;
  upgrading: boolean;
  onUpgrade: () => void;
}) {
  const usage = status?.usage;
  const remainingText = usage
    ? `本日の残り採点回数：${usage.remaining} / ${usage.limit} 回`
    : null;

  if (isPro) {
    return (
      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-extrabold text-white">
            PRO
          </span>
          <span className="text-sm font-extrabold text-violet-800">
            Claude Sonnetで詳しく採点
          </span>
        </div>
        <p className="mt-1.5 text-xs font-bold leading-relaxed text-violet-900/80">
          高品質なAIが、良い点・不足点・改善のヒントまで丁寧に解説します。
        </p>
        {remainingText && (
          <p className="mt-1.5 text-[11px] font-bold text-violet-700">
            {remainingText}
          </p>
        )}
      </section>
    );
  }

  // 無料ユーザー向け：通常採点の案内＋Pro誘導。
  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-extrabold text-indigo-700">
          無料
        </span>
        <span className="text-sm font-extrabold text-gray-800">
          Geminiによる通常採点
        </span>
      </div>
      {remainingText && (
        <p className="mt-1.5 text-[11px] font-bold text-gray-500">
          {remainingText}
        </p>
      )}
      <div className="mt-3 rounded-xl bg-violet-50 p-3">
        <p className="text-xs font-extrabold text-violet-800">
          ✨ Claude Sonnetによる詳しい採点はPro機能です
        </p>
        <p className="mt-1 text-[11px] font-bold leading-relaxed text-violet-900/70">
          より深い解説と、1日の採点回数アップが使えるようになります。
        </p>
        <button
          type="button"
          onClick={onUpgrade}
          disabled={upgrading}
          className="mt-2.5 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
        >
          {upgrading ? "準備中…" : "Proにアップグレード"}
        </button>
      </div>
    </section>
  );
}

function ResultView({
  result,
  meta,
}: {
  result: GradeResult;
  meta: GradeMeta | null;
}) {
  const gradeMeta = GRADE_META[result.grade] ?? GRADE_META.C;
  const verdict = result.isCorrect
    ? { label: "概ね正解", badge: "bg-green-100 text-green-700" }
    : result.score >= 60
      ? { label: "部分正解", badge: "bg-amber-100 text-amber-700" }
      : { label: "理解不足", badge: "bg-rose-100 text-rose-700" };

  const providerLabel =
    meta?.provider === "claude"
      ? `Claude Sonnet（${meta.model}）`
      : "Gemini（通常採点）";

  return (
    <section className="space-y-4">
      {/* 使用モデルの表示 / フォールバック通知 */}
      {meta && (
        <div className="space-y-2">
          <p className="text-right text-[11px] font-bold text-gray-400">
            採点エンジン：{providerLabel}
          </p>
          {meta.fallback && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800">
              Claude採点が一時的に使えなかったため、通常採点（Gemini）で表示しています。
            </div>
          )}
        </div>
      )}

      {/* スコア・グレード・判定 */}
      <div
        className={`flex items-center gap-4 rounded-2xl p-4 ring-1 ${gradeMeta.ring}`}
      >
        <div className="flex flex-col items-center">
          <span
            className={`text-4xl font-extrabold leading-none ${gradeMeta.text}`}
          >
            {result.grade}
          </span>
          <span className="mt-1 text-xs font-bold text-gray-500">グレード</span>
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-extrabold ${gradeMeta.text}`}>
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
