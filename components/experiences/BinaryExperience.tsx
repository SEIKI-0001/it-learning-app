"use client";

import { useState, type ReactNode } from "react";
import { ByteStep, ExamStep, ReadStep, WeightsStep, WriteStep, ZeroOneStep } from "./binary/Steps";

// ============================================================================
// 「2進数とデータ量の単位」専用の体験。ランプの ON/OFF で、1画面ずつ進める。
//   1 0と1 → 2 なぜ8・4・2・1？ → 3 2進数→10進数 → 4 10進数→2進数 → 5 本試験の足し算 → 6 8bit＝1Byte
//   1・3・4 は、その画面の操作（ランプを点ける／答える／9を作る）をすると次へ進める。
// ============================================================================

const TOTAL = 6;

const STEPS: { title: string; hint?: string }[] = [
  { title: "0と1とは？", hint: "ランプをタップすると次へ進めます" },
  { title: "なぜ 8・4・2・1 なのか" },
  { title: "2進数を読む", hint: "1011 の答えを選んでください" },
  { title: "数字を2進数にする", hint: "ランプで9を作ると次へ進めます" },
  { title: "本試験の問題へ" },
  { title: "8bit ＝ 1Byte" },
];

function LessonCard({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section data-testid="binary-learning-step" data-step={step} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <p className="text-xs font-bold tracking-widest text-brand-600">
        STEP {step} / {TOTAL}
      </p>
      <h3 className="mt-1 text-lg font-bold text-slate-900">
        STEP {step} {title}
      </h3>
      {children}
    </section>
  );
}

function StepNavigation({
  step,
  canContinue,
  blockedHint,
  onBack,
  onNext,
}: {
  step: number;
  canContinue: boolean;
  blockedHint?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <nav aria-label="2進数レッスンのステップ移動" className="mt-3">
      {!canContinue && blockedHint ? <p className="mb-2 text-center text-xs font-bold text-amber-700">{blockedHint}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 1}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition active:scale-95 disabled:opacity-40"
        >
          戻る
        </button>
        <div className="flex items-center gap-1.5" aria-label={`${step} / ${TOTAL}`}>
          {Array.from({ length: TOTAL }, (_, index) => (
            <span key={index} aria-hidden className={`h-2 w-2 rounded-full ${index + 1 === step ? "bg-brand-600" : "bg-slate-200"}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue || step === TOTAL}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-40"
        >
          次へ
        </button>
      </div>
    </nav>
  );
}

export default function BinaryExperience() {
  const [step, setStep] = useState(1);
  // 操作が必要なステップのうち、一度クリアしたもの（戻ってきても次へ進める）
  const [cleared, setCleared] = useState<Set<number>>(new Set());
  const clear = (n: number) => setCleared((prev) => (prev.has(n) ? prev : new Set(prev).add(n)));
  const meta = STEPS[step - 1];
  const canContinue = !meta.hint || cleared.has(step);

  let content: ReactNode;
  if (step === 1) content = <ZeroOneStep onReady={() => clear(1)} />;
  else if (step === 2) content = <WeightsStep />;
  else if (step === 3) content = <ReadStep onReady={() => clear(3)} />;
  else if (step === 4) content = <WriteStep onReady={() => clear(4)} />;
  else if (step === 5) content = <ExamStep />;
  else content = <ByteStep />;

  return (
    <div className="mx-auto w-full max-w-xl">
      <LessonCard step={step} title={meta.title}>
        {content}
      </LessonCard>
      <StepNavigation
        step={step}
        canContinue={canContinue}
        blockedHint={meta.hint}
        onBack={() => setStep((current) => Math.max(1, current - 1))}
        onNext={() => setStep((current) => Math.min(TOTAL, current + 1))}
      />
    </div>
  );
}
