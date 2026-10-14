"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ComputerCoreExperience from "@/components/experiences/ComputerCoreExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { FUNNEL_PLACEMENTS } from "@/lib/growth/funnel";
import { sendFunnelEvent } from "@/lib/growth/funnelClient";

// 体験の教材（ComputerCoreExperience）はそのまま使い、外側で「開始・完了」を数えて、
// 最後のスライドまで進んだ人にだけ、登録すると何が続くかを見せる。登録しなくても体験は最後まで使える。
const SIGNUP_HREF = "/login?next=/onboarding&from=trial";

export default function TrialFlow({
  topics,
  official,
  freeDays,
}: {
  topics: number;
  official: number;
  freeDays: number;
}) {
  const started = useRef(false);
  const [completed, setCompleted] = useState(false);
  const completedRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const doneCtaRef = useRef<HTMLAnchorElement>(null);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    sendFunnelEvent("trial_start");
  }, []);

  const onActiveChange = useCallback(
    (active: number, total: number) => {
      if (active > 0) start();
      if (active === total - 1 && total > 1 && !completedRef.current) {
        completedRef.current = true;
        setCompleted(true);
        sendFunnelEvent("trial_complete");
      }
    },
    [start],
  );

  // 完了カードの登録ボタンが画面に見えている間は、固定バーを重ねない。
  useEffect(() => {
    const el = doneCtaRef.current;
    if (!completed || !el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setCardVisible(e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [completed]);

  return (
    <>
      <div onPointerDownCapture={start} onKeyDownCapture={start}>
        <ExperienceSlideDeck onActiveChange={onActiveChange}>
          <ComputerCoreExperience />
        </ExperienceSlideDeck>
      </div>

      <section
        aria-labelledby="start-learning"
        className={`mt-8 rounded-2xl bg-white p-5 sm:p-6 ${completed ? "ring-2 ring-brand-500" : "ring-1 ring-slate-200"}`}
      >
        {completed ? (
          <>
            <p className="text-sm font-bold text-brand-700">体験おつかれさまでした</p>
            <h2 id="start-learning" className="mt-1 text-xl font-bold leading-snug">この続きを、あなたの試験日に合わせて。</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
              <li className="flex gap-2.5">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.4} />
                <span>試験日から逆算して、その日にやる量を毎日案内します。</span>
              </li>
              <li className="flex gap-2.5">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.4} />
                <span>全{topics}トピックの教材と確認問題、公式過去問{official}問を無料で使えます。</span>
              </li>
              <li className="flex gap-2.5">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.4} />
                <span>解いた結果を記録して、間違えた問題を復習に回せます（記録の保存は登録から{freeDays}日間無料）。</span>
              </li>
            </ul>
            <a
              ref={doneCtaRef}
              href={SIGNUP_HREF}
              data-funnel={FUNNEL_PLACEMENTS.trialDoneSignup}
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-center text-base font-bold text-white transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
            >
              無料で登録して続きを学ぶ
            </a>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              クレジットカード不要。GoogleまたはLINEで登録 → 試験日などの初回設定（約1分） → 今日の学習へ進みます。
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5">
              <Link href="/kaisetsu" className="inline-flex min-h-11 items-center text-sm text-brand-700 underline underline-offset-4">登録せずにほかの解説を見る</Link>
              <a href="/lp#price" className="inline-flex min-h-11 items-center text-sm text-brand-700 underline underline-offset-4">無料で使える範囲と料金</a>
            </div>
          </>
        ) : (
          <>
            <h2 id="start-learning" className="text-xl font-bold">こんなふうに、ほかのテーマも。</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">SQLやネットワークなどの教材と公式過去問も、無料で学習できます。GoogleまたはLINEで登録すると、自分の試験日に合わせた学習を始められます。</p>
            <a
              href={SIGNUP_HREF}
              data-funnel={FUNNEL_PLACEMENTS.trialBottomSignup}
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-center font-bold text-white transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
            >
              無料登録して学習を始める
            </a>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">クレジットカード不要。この体験の操作は学習記録に保存されません。登録後の学習記録の保存は最初の{freeDays}日間無料です。以降も教材と公式過去問は無料で使えます。</p>
            <a href="/lp#price" className="mt-3 inline-flex min-h-11 items-center text-sm text-brand-700 underline underline-offset-4">無料で使える範囲と料金を見る</a>
          </>
        )}
      </section>

      {completed && !dismissed && !cardVisible && (
        <div
          role="region"
          aria-label="体験の続き"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-2xl items-center gap-2">
            <a
              href={SIGNUP_HREF}
              data-funnel={FUNNEL_PLACEMENTS.trialStickySignup}
              className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-brand-600 px-4 text-center text-base font-bold text-white active:bg-brand-700"
            >
              無料で登録して続きを学ぶ
            </a>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="閉じる"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-slate-500 ring-1 ring-slate-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
