"use client";

import { useMemo, useState } from "react";
import type {
  ProcessActor,
  ProcessDemoSpec,
  ProcessScenario,
  ProcessScreen,
  ProcessStep,
} from "@/types/content";

// プロセスデモのレンダラ。
// 「利用者目線の入口 → 画面操作 → 裏側の処理ステップ（1つずつ） →
//   結果 → ミニ理解チェック → 用語対応 → 試験ポイント」を
//   トピック詳細ページ内で完結させる。別ページ遷移はしない。

const OUTCOME_STYLE: Record<
  ProcessScenario["outcomeTone"],
  { box: string; label: string; mark: string }
> = {
  ok: {
    box: "bg-emerald-50 ring-emerald-200",
    label: "text-emerald-800",
    mark: "✅ 成功",
  },
  blocked: {
    box: "bg-rose-50 ring-rose-200",
    label: "text-rose-800",
    mark: "⛔ 停止",
  },
  info: {
    box: "bg-sky-50 ring-sky-200",
    label: "text-sky-800",
    mark: "ℹ️ 結果",
  },
};

export default function ProcessDemoSection({ demo }: { demo: ProcessDemoSpec }) {
  const actorMap = useMemo(() => {
    const map: Record<string, ProcessActor> = {};
    for (const a of demo.actors) map[a.id] = a;
    return map;
  }, [demo.actors]);

  // rolePicker の選択状態（グループ id → オプション id）。初期値は各グループの先頭。
  const initialSelection = useMemo(() => {
    if (demo.screen.kind !== "rolePicker") return {};
    const sel: Record<string, string> = {};
    for (const g of demo.screen.groups) sel[g.id] = g.options[0].id;
    return sel;
  }, [demo.screen]);

  const [selection, setSelection] =
    useState<Record<string, string>>(initialSelection);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0); // 表示済みステップ数

  const activeScenario =
    demo.scenarios.find((s) => s.id === activeScenarioId) ?? null;

  function scenarioForSelection(): ProcessScenario | undefined {
    if (demo.screen.kind !== "rolePicker") return demo.scenarios[0];
    return demo.scenarios.find(
      (s) =>
        s.selection &&
        Object.entries(s.selection).every(([k, v]) => selection[k] === v),
    );
  }

  function run() {
    const scenario = scenarioForSelection();
    if (!scenario) return;
    setActiveScenarioId(scenario.id);
    setRevealed(1);
  }

  function reset() {
    setActiveScenarioId(null);
    setRevealed(0);
  }

  function pick(groupId: string, optionId: string) {
    setSelection((cur) => ({ ...cur, [groupId]: optionId }));
    reset();
  }

  const totalSteps = activeScenario?.steps.length ?? 0;
  const allRevealed = activeScenario != null && revealed >= totalSteps;

  return (
    <div className="space-y-8">
      {/* 1. 何が分かるページか */}
      <section className="rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100">
        <h2 className="text-lg font-bold text-brand-950">{demo.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-brand-900/80">
          {demo.lead}
        </p>
      </section>

      {/* 2. 利用者目線の入口 */}
      <section>
        <SectionHeading emoji="🙋" title="まずは利用者の目線で" />
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-100">
          {demo.userScenario}
        </p>
      </section>

      {/* 3. 画面上での操作 */}
      <section>
        <SectionHeading emoji="🖱️" title="画面で操作してみる" />
        <ScreenView
          screen={demo.screen}
          selection={selection}
          onPick={pick}
          onRun={run}
          running={activeScenario != null}
        />
      </section>

      {/* 4-5. 裏側の処理ステップ（何がどこに渡るか） */}
      {activeScenario && (
        <section>
          <SectionHeading emoji="⚙️" title="裏側で動いている処理" />
          <p className="mb-3 text-xs font-medium text-gray-500">
            {revealed} / {totalSteps} ステップ
          </p>
          <ol className="space-y-2.5">
            {activeScenario.steps.slice(0, revealed).map((step, i) => (
              <li key={step.id}>
                <StepCard
                  step={step}
                  index={i}
                  actorMap={actorMap}
                  fallbackNextActorId={
                    activeScenario.steps[i + 1]?.actorId
                  }
                />
              </li>
            ))}
          </ol>

          {/* 進行ボタン */}
          <div className="mt-4 flex items-center gap-2">
            {!allRevealed ? (
              <button
                type="button"
                onClick={() => setRevealed((n) => Math.min(n + 1, totalSteps))}
                className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white active:scale-[0.99]"
              >
                次へ進む →
              </button>
            ) : null}
            <button
              type="button"
              onClick={reset}
              className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-600 ring-1 ring-gray-200 active:scale-[0.99]"
            >
              最初から
            </button>
          </div>

          {/* 結果 + 学習ポイント */}
          {allRevealed && (
            <div
              className={`mt-4 rounded-xl p-4 ring-1 ${OUTCOME_STYLE[activeScenario.outcomeTone].box}`}
            >
              <p
                className={`text-sm font-bold ${OUTCOME_STYLE[activeScenario.outcomeTone].label}`}
              >
                {OUTCOME_STYLE[activeScenario.outcomeTone].mark}：
                {activeScenario.outcomeLabel}
              </p>
              {activeScenario.takeaway && (
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {activeScenario.takeaway}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 6. ミニ理解チェック */}
      {demo.miniCheck && (
        <section>
          <SectionHeading emoji="🧠" title="ミニ理解チェック" />
          <MiniCheckView check={demo.miniCheck} />
        </section>
      )}

      {/* 7. 用語対応 */}
      <section>
        <SectionHeading emoji="🔤" title="ITパスポート用語との対応" />
        <ul className="space-y-2">
          {demo.termMappings.map((m) => (
            <li
              key={m.term}
              className="rounded-xl bg-white p-3 ring-1 ring-gray-200"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                  {m.term}
                </span>
                <span className="text-sm font-semibold text-gray-800">
                  {m.meaning}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                このデモでは：{m.inThisDemo}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 8. 試験での問われ方 */}
      <section>
        <SectionHeading emoji="🎯" title="試験で問われるポイント" />
        <ul className="space-y-2">
          {demo.examPoints.map((p, i) => (
            <li
              key={i}
              className="flex gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-100"
            >
              <span aria-hidden className="font-bold text-brand-500">
                ✓
              </span>
              {p}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SectionHeading({ emoji, title }: { emoji: string; title: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
      <span aria-hidden>{emoji}</span>
      {title}
    </h3>
  );
}

// --- 画面イメージ -----------------------------------------------------------

function ScreenView({
  screen,
  selection,
  onPick,
  onRun,
  running,
}: {
  screen: ProcessScreen;
  selection: Record<string, string>;
  onPick: (groupId: string, optionId: string) => void;
  onRun: () => void;
  running: boolean;
}) {
  return (
    <div className="rounded-xl bg-gray-100 p-4 ring-1 ring-gray-200">
      {screen.kind === "browserBar" && (
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2.5 ring-1 ring-gray-200">
          <span aria-hidden className="text-gray-400">
            🔒
          </span>
          <span className="truncate text-sm font-semibold text-gray-700">
            {screen.url}
          </span>
        </div>
      )}

      {screen.kind === "searchForm" && (
        <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-gray-200">
          {screen.fields.map((f) => (
            <div
              key={f.label}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-200"
            >
              <span className="text-xs font-bold text-gray-500">{f.label}</span>
              <span className="text-sm font-bold text-gray-800">
                {f.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {screen.kind === "rolePicker" && (
        <div className="space-y-3">
          {screen.groups.map((g) => (
            <div key={g.id}>
              <p className="mb-1.5 text-xs font-bold text-gray-500">{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const active = selection[g.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onPick(g.id, o.id)}
                      className={
                        active
                          ? "rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white"
                          : "rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-200"
                      }
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onRun}
        className="mt-3 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white active:scale-[0.99]"
      >
        {running ? "もう一度実行する" : screen.buttonLabel}
      </button>
    </div>
  );
}

// --- 処理ステップ1枚 --------------------------------------------------------

function StepCard({
  step,
  index,
  actorMap,
  fallbackNextActorId,
}: {
  step: ProcessStep;
  index: number;
  actorMap: Record<string, ProcessActor>;
  fallbackNextActorId?: string;
}) {
  const actor = actorMap[step.actorId];
  const toActor = actorMap[step.toActorId ?? fallbackNextActorId ?? ""];

  return (
    <div
      className={
        step.highlight
          ? "rounded-xl bg-white p-3.5 ring-2 ring-rose-300"
          : "rounded-xl bg-white p-3.5 ring-1 ring-gray-200"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
          {actor?.emoji && <span aria-hidden>{actor.emoji}</span>}
          {actor?.label ?? step.actorId}
        </span>
        {step.term && (
          <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
            {step.term}
          </span>
        )}
      </div>

      <p className="mt-2 flex gap-1.5 text-sm font-bold leading-snug text-gray-800">
        <span aria-hidden className="text-gray-400">
          {index + 1}.
        </span>
        {step.title}
      </p>
      {step.action && (
        <p className="mt-1 pl-5 text-xs leading-relaxed text-gray-500">
          {step.action}
        </p>
      )}

      {/* 何がどこに渡るか */}
      {(step.input || step.output) && (
        <div className="mt-2.5 space-y-1 pl-5">
          {step.input && (
            <p className="text-xs font-semibold text-sky-700">
              ← 受け取る：{step.input}
            </p>
          )}
          {step.output && (
            <p className="text-xs font-semibold text-emerald-700">
              → 渡す：{step.output}
              {toActor && (
                <span className="text-emerald-600">（{toActor.label}へ）</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- ミニ理解チェック -------------------------------------------------------

function MiniCheckView({
  check,
}: {
  check: NonNullable<ProcessDemoSpec["miniCheck"]>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const correct = selected === check.correctIndex;

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200">
      <p className="text-sm font-bold leading-relaxed text-gray-800">
        {check.question}
      </p>
      <div className="mt-3 space-y-2">
        {check.choices.map((choice, i) => {
          const isAnswer = i === check.correctIndex;
          const isPicked = i === selected;
          let cls =
            "w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold ring-1 active:scale-[0.99] ";
          if (!answered) {
            cls += "bg-gray-50 text-gray-700 ring-gray-200";
          } else if (isAnswer) {
            cls += "bg-emerald-50 text-emerald-800 ring-emerald-300";
          } else if (isPicked) {
            cls += "bg-rose-50 text-rose-800 ring-rose-300";
          } else {
            cls += "bg-gray-50 text-gray-400 ring-gray-200";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setSelected(i)}
              className={cls}
            >
              {answered && isAnswer && <span aria-hidden>✓ </span>}
              {answered && isPicked && !isAnswer && <span aria-hidden>✗ </span>}
              {choice}
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className={
            correct
              ? "mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-emerald-800"
              : "mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold leading-relaxed text-amber-900"
          }
        >
          {correct ? "正解！ " : "おしい！ "}
          {check.explanation}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mt-2 block text-xs font-bold text-gray-500 underline"
          >
            もう一度ためす
          </button>
        </div>
      )}
    </div>
  );
}
