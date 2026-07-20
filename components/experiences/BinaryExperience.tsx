"use client";

import { useState } from "react";

const FOUR_WEIGHTS = [8, 4, 2, 1] as const;
const EIGHT_WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1] as const;

function valueOf(bits: boolean[], weights: readonly number[]) {
  return bits.reduce((total, isOn, index) => total + (isOn ? weights[index] : 0), 0);
}

function bitsText(bits: boolean[]) {
  return bits.map((isOn) => (isOn ? "1" : "0")).join("");
}

function LampButton({
  weight,
  isOn,
  onToggle,
}: {
  weight: number;
  isOn: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${weight}のランプを${isOn ? "消す" : "つける"}`}
      className={`flex min-h-20 flex-col items-center justify-center rounded-xl border-2 px-1 transition active:scale-95 ${
        isOn
          ? "border-amber-400 bg-amber-100 text-amber-950 shadow-sm"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      <span className="font-mono text-sm font-bold">{weight}</span>
      <span aria-hidden className="mt-1 text-2xl leading-none">
        {isOn ? "💡" : "⚫"}
      </span>
      <span className="mt-1 text-[11px] font-bold">{isOn ? "ON" : "OFF"}</span>
    </button>
  );
}

function LampDisplay({ bits, weights }: { bits: boolean[]; weights: readonly number[] }) {
  return (
    <div className={`grid gap-2 ${weights.length === 4 ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-8"}`}>
      {weights.map((weight, index) => (
        <div
          key={weight}
          className={`flex min-h-18 flex-col items-center justify-center rounded-xl border-2 px-1 ${
            bits[index]
              ? "border-amber-400 bg-amber-100 text-amber-950"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          <span className="font-mono text-sm font-bold">{weight}</span>
          <span aria-hidden className="mt-1 text-xl leading-none">
            {bits[index] ? "💡" : "⚫"}
          </span>
        </div>
      ))}
    </div>
  );
}

function LessonCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-testid="binary-learning-step"
      data-step={step}
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5"
    >
      <p className="text-xs font-bold tracking-widest text-brand-600">STEP {step} / 5</p>
      <h3 className="mt-1 text-lg font-bold text-slate-900">STEP {step} {title}</h3>
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
      {!canContinue && blockedHint ? (
        <p className="mb-2 text-center text-xs font-bold text-amber-700">{blockedHint}</p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 1}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition active:scale-95 disabled:opacity-40"
        >
          戻る
        </button>
        <div className="flex items-center gap-1.5" aria-label={`${step} / 5`}>
          {Array.from({ length: 5 }, (_, index) => (
            <span
              key={index}
              aria-hidden
              className={`h-2 w-2 rounded-full ${index + 1 === step ? "bg-brand-600" : "bg-slate-200"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue || step === 5}
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
  const [fiveBits, setFiveBits] = useState([false, false, false, false]);
  const [nineBits, setNineBits] = useState([false, false, false, false]);
  const [readAnswer, setReadAnswer] = useState<number | null>(null);
  const [eightBits, setEightBits] = useState(Array(8).fill(false));

  const fiveValue = valueOf(fiveBits, FOUR_WEIGHTS);
  const nineValue = valueOf(nineBits, FOUR_WEIGHTS);
  const litForFive = FOUR_WEIGHTS.filter((_, index) => fiveBits[index]);
  const canContinue =
    step === 1 ? fiveValue === 5 : step === 3 ? readAnswer !== null : step === 4 ? nineValue === 9 : true;
  const blockedHint =
    step === 1
      ? "ランプで5を作ると次へ進めます"
      : step === 3
        ? "答えを選んでください"
        : step === 4
          ? "ランプで9を作ると次へ進めます"
          : undefined;

  const toggle = (setBits: React.Dispatch<React.SetStateAction<boolean[]>>, index: number) => {
    setBits((bits) => bits.map((isOn, bitIndex) => (bitIndex === index ? !isOn : isOn)));
  };

  let content: React.ReactNode;

  if (step === 1) {
    content = (
      <LessonCard step={1} title="ランプで数字を作る">
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          ランプが点いた数字だけを足します。まずは <b className="text-slate-900">5を作ってみよう</b>。
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {FOUR_WEIGHTS.map((weight, index) => (
            <LampButton
              key={weight}
              weight={weight}
              isOn={fiveBits[index]}
              onToggle={() => toggle(setFiveBits, index)}
            />
          ))}
        </div>
        <div aria-live="polite" className="mt-4 min-h-12 rounded-xl bg-amber-50 px-3 py-3 text-center text-sm font-bold text-amber-950 ring-1 ring-amber-200">
          {fiveValue === 5 ? (
            <span>{litForFive.join(" + ")} = 5</span>
          ) : (
            <span>いまは {litForFive.length ? `${litForFive.join(" + ")} = ${fiveValue}` : "0"}。5になる組み合わせを探そう。</span>
          )}
        </div>
      </LessonCard>
    );
  } else if (step === 2) {
    content = (
      <LessonCard step={2} title="ランプを0と1で表す">
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          さっきのランプを、そのまま記号にします。<b className="text-slate-900">点いている＝1、消えている＝0</b>です。
        </p>
        <div className="mt-4">
          <LampDisplay bits={fiveBits} weights={FOUR_WEIGHTS} />
          <div className="mt-3 grid grid-cols-4 gap-2 text-center font-mono text-xl font-bold text-brand-700">
            {fiveBits.map((isOn, index) => (
              <span key={FOUR_WEIGHTS[index]}>{isOn ? 1 : 0}</span>
            ))}
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-brand-50 px-3 py-3 text-center text-sm text-brand-900 ring-1 ring-brand-100">
          ランプの点き方を <b>{bitsText(fiveBits)}</b> と書く。これが <b>2進数</b> のはじまりです。
        </p>
      </LessonCard>
    );
  } else if (step === 3) {
    const readBits = [true, false, true, false];
    content = (
      <LessonCard step={3} title="2進数を読む">
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          <b className="font-mono text-slate-900">1010</b> はいくつ？ 点いているランプの数字を足してみよう。
        </p>
        <div className="mt-4">
          <LampDisplay bits={readBits} weights={FOUR_WEIGHTS} />
          <p className="mt-2 text-center font-mono text-xl font-bold text-brand-700">1 0 1 0</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[8, 10, 12].map((answer) => (
            <button
              key={answer}
              type="button"
              aria-pressed={readAnswer === answer}
              onClick={() => setReadAnswer(answer)}
              className="rounded-xl border border-slate-300 bg-white py-2.5 font-mono text-lg font-bold text-slate-700 active:scale-95 aria-pressed:border-brand-600 aria-pressed:bg-brand-50"
            >
              {answer}
            </button>
          ))}
        </div>
        {readAnswer !== null && (
          <p aria-live="polite" className={`mt-4 rounded-xl px-3 py-3 text-center text-sm font-bold ring-1 ${readAnswer === 10 ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-amber-50 text-amber-950 ring-amber-200"}`}>
            {readAnswer === 10 ? "正解！8と2が点いているので、8 + 2 = 10。" : "ランプを見直そう。点いた数字だけを足します。"}
          </p>
        )}
      </LessonCard>
    );
  } else if (step === 4) {
    content = (
      <LessonCard step={4} title="数字を2進数にする">
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          今度は逆向き。<b className="text-slate-900">9を作ろう</b>。完成したランプの並びが、そのまま2進数です。
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {FOUR_WEIGHTS.map((weight, index) => (
            <LampButton
              key={weight}
              weight={weight}
              isOn={nineBits[index]}
              onToggle={() => toggle(setNineBits, index)}
            />
          ))}
        </div>
        <div aria-live="polite" className="mt-4 min-h-12 rounded-xl bg-sky-50 px-3 py-3 text-center text-sm font-bold text-sky-950 ring-1 ring-sky-200">
          {nineValue === 9 ? (
            <span>8 + 1 = 9。2進数では <b className="font-mono text-lg">1001</b>。</span>
          ) : (
            <span>いまは {nineValue}。9になるようにランプを選ぼう。</span>
          )}
        </div>
      </LessonCard>
    );
  } else {
    content = (
      <LessonCard step={5} title="8bitへ発展">
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          4個のランプを、今度は8個に増やします。<b className="text-slate-900">ランプ8個ぶんを8bit（ビット）</b>と呼びます。
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {EIGHT_WEIGHTS.map((weight, index) => (
            <LampButton
              key={weight}
              weight={weight}
              isOn={eightBits[index]}
              onToggle={() => toggle(setEightBits, index)}
            />
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-brand-50 px-3 py-3 text-center text-sm font-bold text-brand-950 ring-1 ring-brand-200">
          <b>8bit = 1byte（バイト）</b>。コンピュータは、この0と1の並びで情報を扱います。
        </p>
        <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600 ring-1 ring-slate-200">
          <summary className="cursor-pointer font-bold text-slate-800">もう少し知りたい</summary>
          <p className="mt-2 leading-relaxed">byteが集まるとKB、MB、GBになります。スマホで見るGBも、もとはランプの0と1の集まりです。</p>
        </details>
      </LessonCard>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      {content}
      <StepNavigation
        step={step}
        canContinue={canContinue}
        blockedHint={blockedHint}
        onBack={() => setStep((current) => Math.max(1, current - 1))}
        onNext={() => setStep((current) => Math.min(5, current + 1))}
      />
    </div>
  );
}
