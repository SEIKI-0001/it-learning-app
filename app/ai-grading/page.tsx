"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import {
  getWrittenQuestion,
  getWrittenQuestions,
  getWrittenQuestionsForTopic,
} from "@/data/writtenQuestions";
import {
  fetchAiGradingBootstrap,
  getUserId,
  loadCachedAiGradingBootstrap,
  readTokenFromUrl,
  resolveToken,
  saveCachedAiGradingBootstrap,
  setUserId,
} from "@/lib/userSession";
import type {
  AiGradingBillingStatus,
  GradeResult,
  GradingRecord,
  WrittenGrade,
} from "@/types/aiGrading";

// AI採点ページ。記述問題に回答し、AIが採点・解説する。
// 無料ユーザーは Gemini（通常採点）、Proユーザーは Claude Sonnet（Pro採点）。
// 「答える」モードでは未回答の問題を優先して出題し、「復習」モードで回答済みを見直せる。
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

// ResultView が実際に使うメタ情報だけの軽量型（履歴の表示にも使う）。
type ResultMeta = {
  provider: "gemini" | "claude";
  model: string;
  fallback: boolean;
};

type BillingStatus = AiGradingBillingStatus;

type Mode = "answer" | "review";

// 回答済みの集合から、current の次の「未回答」問題のindexを返す。
// 全問回答済みなら単純に次へ巡回する。
function pickNextIndex(current: number, answered: Set<string>): number {
  const n = QUESTIONS.length;
  for (let step = 1; step <= n; step++) {
    const i = (current + step) % n;
    if (!answered.has(QUESTIONS[i].id)) return i;
  }
  return (current + 1) % n;
}

// 最初の未回答問題のindex（無ければ0）。
function firstUnansweredIndex(answered: Set<string>): number {
  const i = QUESTIONS.findIndex((q) => !answered.has(q.id));
  return i === -1 ? 0 : i;
}

function normalizeQuestionIndex(value: number): number {
  return Number.isInteger(value) && value >= 0 && value < QUESTIONS.length
    ? value
    : 0;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

async function requestBillingStatus(
  uid: string | null,
): Promise<BillingStatus | null> {
  try {
    const res = await fetch("/api/billing/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid }),
    });
    const data = (await res.json().catch(() => null)) as
      | ({ ok: true } & BillingStatus)
      | null;
    if (!data?.ok) return null;
    return {
      plan: data.plan,
      providerLabel: data.providerLabel,
      usage: data.usage,
      tracked: data.tracked,
      checkoutEnabled: data.checkoutEnabled,
    };
  } catch {
    return null;
  }
}

async function requestGradingHistory(
  uid: string | null,
): Promise<GradingRecord[] | null> {
  try {
    const res = await fetch("/api/ai-grading/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; records: GradingRecord[] }
      | null;
    if (!data?.ok || !Array.isArray(data.records)) return null;
    return data.records;
  } catch {
    return null;
  }
}

export default function AiGradingPage() {
  const [mode, setMode] = useState<Mode>("answer");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [meta, setMeta] = useState<GradeMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const [userId, setUid] = useState<string | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  // 採点履歴（復習用）。新しい順。
  const [records, setRecords] = useState<GradingRecord[]>([]);

  // キャッシュ即表示後の背景フェッチが、ユーザーの操作（入力・問題変更・採点）を
  // 巻き戻さないようにするためのフラグ。
  const touchedRef = useRef(false);

  const question = QUESTIONS[index];
  const diff = DIFFICULTY_META[question.difficulty] ?? DIFFICULTY_META.normal;
  const canGrade = useMemo(() => answer.trim().length >= 20, [answer]);

  // 回答済みの問題ID集合。
  const answeredIds = useMemo(
    () => new Set(records.map((r) => r.questionId)),
    [records]
  );
  const allAnswered =
    answeredIds.size > 0 && answeredIds.size >= QUESTIONS.length;
  const isCurrentAnswered = answeredIds.has(question.id);

  // プラン・利用状況を読み込む。
  const loadStatus = useCallback(async (uid: string | null) => {
    const nextStatus = await requestBillingStatus(uid);
    if (nextStatus) setStatus(nextStatus);
  }, []);

  // 起動時に userId を解決（?t= があれば紐づけ）してから状況・履歴を一括取得。
  // 前回のブートストラップ結果がキャッシュにあれば即表示し、最新値は背景で差し替える。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitializing(true);
      const requestedTopicId =
        typeof window === "undefined"
          ? null
          : new URLSearchParams(window.location.search).get("topicId");
      const requestedQuestionId = requestedTopicId
        ? getWrittenQuestionsForTopic(requestedTopicId)[0]?.id
        : undefined;
      const requestedIndex = requestedQuestionId
        ? QUESTIONS.findIndex((q) => q.id === requestedQuestionId)
        : -1;
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

      const cached = loadCachedAiGradingBootstrap();
      if (cached) {
        setUid(cached.userId ?? uid);
        setStatus(cached.billingStatus);
        setRecords(cached.gradingHistory);
        setIndex(
          requestedIndex >= 0
            ? requestedIndex
            : normalizeQuestionIndex(cached.initialQuestionIndex),
        );
        setInitializing(false);
      }

      const bootstrap = await fetchAiGradingBootstrap(uid);
      if (cancelled) return;

      if (bootstrap) {
        setUid(bootstrap.userId ?? uid);
        setStatus(bootstrap.billingStatus);
        // 操作が始まっていたら履歴・出題位置は上書きしない
        // （採点直後のローカル追記や選び直した問題を巻き戻さない）。
        if (!touchedRef.current) {
          setRecords(bootstrap.gradingHistory);
          setIndex(
            requestedIndex >= 0
              ? requestedIndex
              : normalizeQuestionIndex(bootstrap.initialQuestionIndex),
          );
        }
      } else if (!cached) {
        setUid(uid);
        const [nextStatus, nextRecords] = await Promise.all([
          requestBillingStatus(uid),
          requestGradingHistory(uid),
        ]);
        if (cancelled) return;
        if (nextStatus) setStatus(nextStatus);
        if (nextRecords && !touchedRef.current) {
          setRecords(nextRecords);
          const answered = new Set(nextRecords.map((r) => r.questionId));
          setIndex(
            requestedIndex >= 0
              ? requestedIndex
              : firstUnansweredIndex(answered),
          );
        }
      }
      setInitializing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 次の問題へ（未回答を優先して巡回）。入力・結果はリセットする。
  function handleNext() {
    touchedRef.current = true;
    setIndex((prev) => pickNextIndex(prev, answeredIds));
    setAnswer("");
    setResult(null);
    setMeta(null);
    setError(null);
  }

  async function handleGrade() {
    if (!canGrade || loading) return;
    touchedRef.current = true;
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
      const nextStatus: BillingStatus | null = status
        ? { ...status, usage: data.meta.usage, plan: data.meta.plan }
        : null;
      if (nextStatus) setStatus(nextStatus);
      // 履歴に追加（＝回答済みになり、次は未回答が出る／復習で見直せる）。
      const newRecord: GradingRecord = {
        id: `local-${Date.now()}`,
        questionId: question.id,
        category: question.category,
        userAnswer: answer.trim(),
        result: data.result,
        provider: data.meta.provider,
        model: data.meta.model,
        createdAt: new Date().toISOString(),
      };
      const nextRecords = [newRecord, ...records];
      setRecords(nextRecords);
      // 次回訪問の即時表示キャッシュにも最新状態を反映しておく。
      if (nextStatus) {
        saveCachedAiGradingBootstrap({
          userId,
          billingStatus: nextStatus,
          gradingHistory: nextRecords,
          initialQuestionIndex: firstUnansweredIndex(
            new Set(nextRecords.map((r) => r.questionId)),
          ),
        });
      }
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
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <h1 className="text-xl font-extrabold">📝 AI採点</h1>
          <p className="mt-0.5 text-xs text-white/90">
            用語を覚えるだけでなく、説明できるかをAIがチェックします
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md md:max-w-2xl space-y-5 px-4 py-5">
        {initializing ? (
          <AiGradingInitialSkeleton />
        ) : (
          <>
            {/* プラン表示（無料/Pro の出し分け） */}
            <PlanCard
              status={status}
              isPro={isPro}
              upgrading={upgrading}
              onUpgrade={handleUpgrade}
            />

            {/* 答える / 復習 の切り替え */}
            <ModeTabs
              mode={mode}
              reviewCount={records.length}
              onChange={(m) => {
                touchedRef.current = true;
                setMode(m);
              }}
            />

            {mode === "answer" ? (
              <>
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
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        isCurrentAnswered
                          ? "bg-gray-100 text-gray-500"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {isCurrentAnswered ? "回答済み" : "未回答"}
                    </span>
                    <span className="ml-auto text-[11px] font-bold text-gray-400">
                      回答済み {answeredIds.size} / {QUESTIONS.length} 問
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] font-bold leading-relaxed text-gray-800">
                    {question.question}
                  </p>
                  {allAnswered && (
                    <p className="mt-2 text-[11px] font-bold text-emerald-600">
                      🎉 全問回答済みです。「復習」タブで見直したり、もう一度挑戦できます。
                    </p>
                  )}
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
                    onChange={(e) => {
                      touchedRef.current = true;
                      setAnswer(e.target.value);
                    }}
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
              </>
            ) : (
              <ReviewList records={records} />
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

/** 答える / 復習 の切り替えタブ。 */
function AiGradingInitialSkeleton() {
  return (
    <div className="space-y-5">
      <SkeletonCard label="プラン情報を確認中" lines={3} />
      <SkeletonCard label="採点履歴を読み込み中" lines={2} />
      <SkeletonCard label="問題を準備中" lines={4} />
    </div>
  );
}

function SkeletonCard({ label, lines }: { label: string; lines: number }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-gray-500">{label}</span>
        <span className="h-2.5 w-2.5 rounded-full bg-indigo-200" />
      </div>
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-3 animate-pulse rounded-full bg-gray-100 ${
              i === lines - 1 ? "w-7/12" : "w-full"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function ModeTabs({
  mode,
  reviewCount,
  onChange,
}: {
  mode: Mode;
  reviewCount: number;
  onChange: (m: Mode) => void;
}) {
  const base =
    "flex-1 rounded-xl px-4 py-2.5 text-sm font-extrabold transition active:scale-[0.99]";
  return (
    <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-1.5">
      <button
        type="button"
        onClick={() => onChange("answer")}
        className={`${base} ${
          mode === "answer" ? "bg-indigo-600 text-white" : "text-gray-500"
        }`}
      >
        答える
      </button>
      <button
        type="button"
        onClick={() => onChange("review")}
        className={`${base} ${
          mode === "review" ? "bg-indigo-600 text-white" : "text-gray-500"
        }`}
      >
        復習{reviewCount > 0 ? `（${reviewCount}）` : ""}
      </button>
    </div>
  );
}

/** 回答済みの記録一覧（タップで採点結果の詳細を開閉）。 */
function ReviewList({ records }: { records: GradingRecord[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
        <p className="text-sm font-bold text-gray-500">
          まだ採点した記録がありません。
        </p>
        <p className="mt-1 text-xs font-bold text-gray-400">
          「答える」から記述問題に挑戦すると、ここで見直せます。
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {records.map((rec) => {
        const q = getWrittenQuestion(rec.questionId);
        const gradeMeta = GRADE_META[rec.result.grade] ?? GRADE_META.C;
        const open = openId === rec.id;
        return (
          <div
            key={rec.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : rec.id)}
              className="flex w-full items-center gap-3 p-4 text-left transition active:scale-[0.99]"
            >
              <div
                className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ring-1 ${gradeMeta.ring}`}
              >
                <span className={`text-lg font-extrabold leading-none ${gradeMeta.text}`}>
                  {rec.result.grade}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  {rec.result.score}点
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    {rec.category || "AI採点"}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    {formatDate(rec.createdAt)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-bold text-gray-800">
                  {q?.question ?? rec.questionId}
                </p>
              </div>
              <span className="shrink-0 text-gray-400">{open ? "▲" : "▼"}</span>
            </button>

            {open && (
              <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-3">
                <div className="rounded-2xl bg-gray-50 p-3">
                  <span className="text-[11px] font-bold text-gray-500">
                    あなたの回答
                  </span>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {rec.userAnswer}
                  </p>
                </div>
                <ResultView
                  result={rec.result}
                  meta={{
                    provider: rec.provider,
                    model: rec.model,
                    fallback: false,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </section>
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
  if (!status) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-extrabold text-gray-600">
            確認中
          </span>
          <span className="text-sm font-extrabold text-gray-800">
            プラン情報を確認できませんでした
          </span>
        </div>
        <p className="mt-1.5 text-xs font-bold leading-relaxed text-gray-500">
          採点時にサーバー側で現在のプランを確認します。
        </p>
      </section>
    );
  }

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
  meta: ResultMeta | null;
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
