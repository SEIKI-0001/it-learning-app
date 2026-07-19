import type { ReactNode } from "react";
import { TOTAL_STEPS } from "./learningModel";

export type AlgorithmStepShellProps = {
  step: number;
  title: string;
  canContinue: boolean;
  blockedHint?: string;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
};

export default function AlgorithmStepShell({
  step,
  title,
  canContinue,
  blockedHint,
  onBack,
  onNext,
  children,
}: AlgorithmStepShellProps) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-100 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black tracking-wide text-indigo-600">
          STEP {step} / {TOTAL_STEPS}
        </p>
        <p className="text-xs font-bold text-gray-500">
          {step === TOTAL_STEPS ? "仕上げ" : "基礎からひとつずつ"}
        </p>
      </div>

      <div
        className="mt-2 grid grid-cols-7 gap-1"
        aria-label={`学習ステップ ${step} / ${TOTAL_STEPS}`}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, index) => (
          <span
            key={index}
            aria-hidden
            className={`h-1.5 rounded-full ${
              index < step ? "bg-indigo-600" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <h3 className="mt-4 text-lg font-extrabold text-gray-900">{title}</h3>
      <div className="mt-4">{children}</div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        {!canContinue && blockedHint ? (
          <p className="mb-2 text-center text-xs font-semibold text-amber-700">
            {blockedHint}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={step === 1}
            className="min-h-11 rounded-xl border border-gray-200 bg-white font-bold text-gray-700 transition active:scale-[0.98] disabled:opacity-35"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue || step === TOTAL_STEPS}
            className="min-h-11 rounded-xl bg-indigo-600 font-bold text-white transition active:scale-[0.98] disabled:opacity-35"
          >
            {step === TOTAL_STEPS ? "学習完了" : "次へ"}
          </button>
        </div>
      </div>
    </section>
  );
}
