"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";
import styles from "./calc.module.css";

// 計算系の解説で共通の小さな部品。
//   Choices   : 3〜4択。誤答では「どのステップでつまずいたか」を返す
//   StepChips : 解き方の手順チップ。つまずいた手順だけ赤くする
//   Replay    : 「↺ もう一度見る」（reduced-motion では出さない）
//   Note      : 1画面1メッセージの「ひとこと」

export type Choice = {
  label: string;
  ok?: boolean;
  /** 誤答のとき：何をした値か（例：Byte→bit の ×8 をしていない値） */
  why?: string;
  /** 誤答のとき：つまずいた手順の番号（StepChips と対応） */
  step?: number;
};

export function Choices({
  choices,
  steps,
  onAnswer,
  cols = 3,
  testId,
}: {
  choices: Choice[];
  /** 解き方の手順名。渡すと誤答時につまずいた手順を StepChips で示す */
  steps?: string[];
  onAnswer?: (ok: boolean) => void;
  cols?: 1 | 2 | 3 | 4;
  testId?: string;
}) {
  const [pick, setPick] = useState<number | null>(null);
  const chosen = pick === null ? null : choices[pick];
  const grid = cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <div data-testid={testId} data-result={chosen ? (chosen.ok ? "ok" : "ng") : "none"}>
      <div className={`grid gap-1.5 ${grid}`}>
        {choices.map((c, i) => {
          const tone =
            pick === null
              ? "bg-white text-gray-700 ring-1 ring-gray-300"
              : pick === i
                ? c.ok
                  ? "bg-emerald-500 text-white"
                  : "bg-rose-500 text-white"
                : c.ok
                  ? "bg-white text-emerald-700 ring-2 ring-emerald-400"
                  : "bg-white text-gray-400 ring-1 ring-gray-200";
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                setPick(i);
                onAnswer?.(Boolean(c.ok));
              }}
              aria-pressed={pick === i}
              className={`rounded-lg px-1 py-2 text-sm font-bold tabular-nums transition active:scale-95 ${tone}`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div className={`mt-2 space-y-1.5 ${styles.reveal}`} aria-live="polite">
          <p className={`text-xs font-bold leading-relaxed ${chosen.ok ? "text-emerald-700" : "text-rose-600"}`}>
            {chosen.ok ? "⭕ 正解！" : `❌ ${chosen.why ?? "もう一度考えてみよう。"}`}
          </p>
          {steps && !chosen.ok && chosen.step !== undefined && <StepChips steps={steps} failed={chosen.step} />}
        </div>
      )}
    </div>
  );
}

export function StepChips({ steps, failed, active }: { steps: string[]; failed?: number; active?: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1 text-[11px] font-bold" aria-label="解き方の手順">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300">→</span>}
          <span
            className={`rounded-full px-2 py-0.5 ${
              failed === i
                ? "bg-rose-500 text-white"
                : active !== undefined && i <= active
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600"
            }`}
            data-failed={failed === i ? "true" : undefined}
          >
            {s}
            {failed === i && " ← ここ"}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Replay({ onClick, hidden, label = "↺ もう一度見る" }: { onClick: () => void; hidden?: boolean; label?: string }) {
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
    >
      {label}
    </button>
  );
}

export function Note({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "emerald" | "sky" }) {
  const color =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
      : tone === "sky"
        ? "bg-sky-50 text-sky-900 ring-sky-200"
        : "bg-amber-50 text-amber-900 ring-amber-200";
  return <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm leading-relaxed ring-1 ${color} ${styles.reveal}`}>{children}</div>;
}

/** 式の1項。flipKey が変わるとラベルがくるっと置き換わる。was は置き換え前の値（小さく残す）。 */
export function Term({
  children,
  flipKey,
  was,
  tone = "gray",
}: {
  children: ReactNode;
  flipKey?: string;
  was?: ReactNode;
  tone?: "gray" | "brand" | "emerald" | "rose" | "amber";
}) {
  const color = {
    gray: "bg-gray-50 text-gray-800 ring-gray-300",
    brand: "bg-brand-50 text-brand-800 ring-brand-300",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-300",
    rose: "bg-rose-50 text-rose-800 ring-rose-300",
    amber: "bg-amber-50 text-amber-900 ring-amber-300",
  }[tone];
  return (
    <span className="inline-flex flex-col items-center align-middle">
      <span key={flipKey} className={`rounded-lg px-2 py-1 font-bold ring-1 ${color} ${flipKey ? styles.flip : ""}`}>
        {children}
      </span>
      {was !== undefined && <span className="mt-0.5 text-[10px] font-bold text-gray-400">{was}</span>}
    </span>
  );
}

/** 正解を index 番目に置き直す（データは正解を先頭に書いてよい。表示で位置が偏らないようにする） */
export function placeAnswer(choices: Choice[], index: number): Choice[] {
  const ok = choices.find((c) => c.ok);
  if (!ok) return choices;
  const rest = choices.filter((c) => c !== ok);
  const at = index % choices.length;
  return [...rest.slice(0, at), ok, ...rest.slice(at)];
}

export type LeveledQuestion = { level: string; prompt: ReactNode; choices: Choice[]; solution: ReactNode; cols?: 1 | 2 | 3 | 4 };

/** 段階つき確認問題（Lv.1 → 本試験レベル）。1問ずつ出し、答えると解き方と「次の問題へ」が出る。 */
export function LeveledPractice({
  step,
  title,
  steps,
  questions,
  done,
  testId,
}: {
  step: number;
  title: ReactNode;
  steps?: string[];
  questions: LeveledQuestion[];
  /** 最後の問題に答えたあとのまとめ */
  done: ReactNode;
  testId?: string;
}) {
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const q = questions[index];
  const last = index === questions.length - 1;
  return (
    <Panel>
      <SectionTitle step={step}>{title}</SectionTitle>
      {steps && (
        <div className="mt-3">
          <StepChips steps={steps} />
        </div>
      )}
      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200" data-testid={testId} data-index={index}>
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-brand-700">{q.level}</span>
          <span className="text-gray-400">
            {index + 1} / {questions.length}
          </span>
        </div>
        <div className="mt-1 text-sm font-bold leading-relaxed text-gray-800">{q.prompt}</div>
        <div className="mt-2">
          <Choices key={index} choices={placeAnswer(q.choices, index * 2 + 1)} steps={steps} cols={q.cols ?? (q.choices.length === 4 ? 2 : 3)} onAnswer={() => setAnswered(true)} />
        </div>
        {answered && <div className={`mt-2 text-xs leading-relaxed text-gray-600 ${styles.reveal}`}>{q.solution}</div>}
      </div>
      {answered && !last && (
        <button
          type="button"
          onClick={() => {
            setIndex(index + 1);
            setAnswered(false);
          }}
          className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white active:scale-95"
        >
          次の問題へ →
        </button>
      )}
      {answered && last && <Note tone="emerald">{done}</Note>}
    </Panel>
  );
}
