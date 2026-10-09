"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "../scene/useReducedMotion";
import { FlowStage } from "./FlowRun";
import { buildFlowTrace, describeStep, type TraceStep } from "./flowTrace";

// 「見る前に、自分でやる」。解説2（FlowRun）と同じ図を、学習者がコンピュータ役で実行する。
// ●が要所のノードに着くたびに止まり、学習者が答える：
//   条件「i ≦ 3 ?」→ はい／いいえ、「合計 ← 合計 + i」→ 合計の新しい値、
//   初めての「i ← i + 1」の後 → 次にどこへ進むか（条件へ戻る＝繰り返し）。
// 正解すると判定・変数の書き換えを見せて、次の要所まで●が自動で進む。間違えたら理由を出して選び直し。

const LIMIT = 3;
/** 自動で1ノード進む間隔（トークンの移動 1.4s を見せきる） */
const MOVE_MS = 1500;
/** 正解した直後、判定・変数の書き換えを読む間 */
const REVEAL_MS = 1800;
const REDUCED_MS = 600;

export type TryChoice = { label: string; ok?: boolean; why?: string };
export type TryAsk = { prompt: string; choices: TryChoice[] };

export function askAt(trace: TraceStep[], index: number, limit: number): TryAsk | null {
  const step = trace[index];
  const prev = trace[index - 1];
  if (!step || !prev) return null;

  if (step.node === "condition") {
    const i = step.i ?? 0;
    return {
      prompt: `i の箱は ${i}。「i ≦ ${limit} ?」の答えは？`,
      choices: [
        { label: "はい", ok: step.judge, why: `${i} は ${limit} より大きいので「いいえ」。` },
        { label: "いいえ", ok: !step.judge, why: `${i} ≦ ${limit} は成り立つので「はい」。` },
      ],
    };
  }

  if (step.node === "add-current") {
    const before = prev.total ?? 0;
    const i = step.i ?? 0;
    const correct = before + i;
    const candidates: TryChoice[] = [
      { label: String(correct), ok: true },
      { label: String(before), why: "足す前のまま。右の「合計 + i」を計算して、合計の箱に入れ直す。" },
      { label: String(i), why: `i の値を入れただけ。今の合計 ${before} に i を足す。` },
      { label: String(correct + 1), why: `足すのは今の i（${i}）。${before} + ${i} を計算する。` },
    ];
    const unique = candidates.filter((c, n) => candidates.findIndex((d) => d.label === c.label) === n).slice(0, 3);
    return {
      prompt: `「合計 ← 合計 + i」。合計の箱はいくつになる？`,
      choices: unique.sort((a, b) => Number(a.label) - Number(b.label)),
    };
  }

  // 「くり返し＝条件へ戻る」は初めての1回だけ聞く
  if (step.node === "increment-current" && trace.findIndex((s) => s.node === "increment-current") === index) {
    const away = "まだ条件を確かめていない。i を増やした後の矢印は、条件へ戻っている。";
    return {
      prompt: `i を1増やした（i = ${step.i}）。次はどこへ進む？`,
      choices: [
        { label: `「i ≦ ${limit} ?」へ戻る`, ok: true },
        { label: "「合計を表示」へ", why: away },
        { label: "「終了」へ", why: away },
      ],
    };
  }

  return null;
}

export function FlowTry() {
  const reducedMotion = useReducedMotion();
  const trace = buildFlowTrace(LIMIT);
  const last = trace.length - 1;
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);

  const ask = askAt(trace, index, LIMIT);
  const waiting = started && ask !== null && !answered;
  const done = index === last;

  useEffect(() => {
    if (!started || waiting || done) return;
    const delay = reducedMotion ? REDUCED_MS : answered ? REVEAL_MS : MOVE_MS;
    const timer = window.setTimeout(() => {
      setIndex((n) => Math.min(n + 1, last));
      setAnswered(false);
      setWrong([]);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [started, waiting, done, answered, reducedMotion, last, index]);

  function pick(choice: TryChoice) {
    if (choice.ok) {
      setAnswered(true);
      return;
    }
    if (!wrong.includes(choice.label)) {
      setWrong((w) => [...w, choice.label]);
      setMisses((m) => m + 1);
    }
  }

  function restart() {
    setIndex(0);
    setAnswered(false);
    setWrong([]);
    setMisses(0);
    setStarted(true);
  }

  const cur = trace[index];
  const { code, calc } = describeStep(cur, trace[index - 1], LIMIT);
  const lastWrong = ask?.choices.find((c) => c.label === wrong.at(-1));

  return (
    <div data-testid="flow-try" data-state={done ? "done" : waiting ? "ask" : started ? "moving" : "idle"}>
      <FlowStage
        trace={trace}
        index={index}
        limit={LIMIT}
        animate={started && !reducedMotion}
        reducedMotion={reducedMotion}
        pending={waiting}
        testId="flow-try-stage"
      />

      <div className="mt-2 min-h-[118px]" aria-live="polite">
        {!started && (
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="w-full rounded-xl bg-gray-900 px-3 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            実行をはじめる
          </button>
        )}

        {waiting && ask && (
          <div className="rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200" data-testid="flow-try-ask">
            <p className="text-sm font-bold leading-relaxed text-gray-900">{ask.prompt}</p>
            <div className={`mt-2 grid gap-1.5 ${ask.choices.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {ask.choices.map((c) => {
                const missed = wrong.includes(c.label);
                return (
                  <button
                    key={c.label}
                    type="button"
                    disabled={missed}
                    onClick={() => pick(c)}
                    className={`rounded-lg px-1 py-2 text-sm font-bold tabular-nums transition active:scale-95 ${
                      missed ? "bg-rose-50 text-rose-400 line-through ring-1 ring-rose-200" : "bg-white text-gray-800 ring-1 ring-gray-300"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            {lastWrong?.why && <p className="mt-2 text-xs font-bold leading-relaxed text-rose-600">{lastWrong.why}</p>}
          </div>
        )}

        {started && !waiting && !done && (
          <div className="rounded-xl bg-gray-900 px-3 py-2 text-white" data-testid="flow-try-now">
            <span className="block text-[10px] font-bold text-gray-400">{answered ? "正解！ コンピュータもこう実行する" : "コンピュータが実行中"}</span>
            <span className="font-mono text-sm font-bold">{code}</span>
            <span className="ml-2 text-xs text-amber-300">{calc}</span>
          </div>
        )}

        {done && (
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-200" data-testid="flow-try-done">
            <p className="text-sm font-bold text-emerald-900">
              最後まで実行できた！ 画面には <span className="font-mono">{cur.total}</span>（1 + 2 + 3）。
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-700">
              {misses === 0 ? "まちがいなし。" : `まちがえた所は ${misses} 回。`}
              次の解説で、コンピュータが同じ図を通る正しい流れを確かめよう。
            </p>
            <button type="button" onClick={restart} className="mt-2 text-xs font-bold text-gray-600 underline underline-offset-2">
              もう一度やる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
