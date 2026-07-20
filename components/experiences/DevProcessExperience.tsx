"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「開発プロセス」専用の体験。
//   ① 仕様変更シミュレータ … WF/アジャイルを選んで開発を進めると、
//      途中で「⚡変更したい！」が発生。後戻りの大きさの違いを体感する
//   ② くらべて整理（向き・不向き）
//   ③ これはどっち？ クイズ
// ============================================================================

const PHASES = ["要件定義", "設計", "製造", "テスト", "完成"] as const;

type SimStep = {
  active: number; // ハイライトする工程 index（-1=なし）
  done: number[]; // 完了済み工程 index
  tone: "normal" | "event" | "rework" | "goal";
  msg: string;
};

const WF_STEPS: SimStep[] = [
  { active: 0, done: [], tone: "normal", msg: "📝 最初に作るものを全部決めます。この計画どおり、工程を順番に下っていきます。" },
  { active: 1, done: [0], tone: "normal", msg: "📐 決めた要件をもとに、作り方を細かく設計します。" },
  { active: 2, done: [0, 1], tone: "normal", msg: "🔨 設計図どおりにプログラムを作ります。順調、順調…" },
  { active: 2, done: [0, 1], tone: "event", msg: "⚡ お客様「やっぱり機能を変えたい！」——でも要件も設計も確定済み。さあどうする…？" },
  { active: 1, done: [0], tone: "rework", msg: "↩️ 設計からやり直し（後戻り）！ 作ったプログラムの多くがムダに。時間もお金も大きくかかります。" },
  { active: 4, done: [0, 1, 2, 3], tone: "goal", msg: "🏁 やり直して完成。⭕ 計画が立てやすい反面、⚠️ 途中の変更にとても弱い——これがウォーターフォール。" },
];

const AGILE_STEPS: SimStep[] = [
  { active: 0, done: [], tone: "normal", msg: "🔁 スプリント1：まず一番大事な機能だけ「作る→見せる→直す」。小さく完成させます。" },
  { active: 1, done: [0], tone: "normal", msg: "🔁 スプリント2：次の機能を追加して、また利用者に見せて確認します。" },
  { active: 1, done: [0], tone: "event", msg: "⚡ お客様「やっぱり機能を変えたい！」——アジャイルなら「OK！次のスプリントの計画に入れましょう」。" },
  { active: 2, done: [0, 1], tone: "rework", msg: "✅ スプリント3で変更を反映。作り直しは最小限。小さく区切っているから方向転換がしやすい！" },
  { active: 3, done: [0, 1, 2], tone: "goal", msg: "🏁 反復を重ねて完成。⭕ 変更に強い反面、⚠️ 全体像が見えにくいことも——これがアジャイル。" },
];

const SPRINTS = ["スプリント1", "スプリント2", "スプリント3", "完成"] as const;

function Simulator() {
  const [mode, setMode] = useState<"wf" | "agile">("wf");
  const [idx, setIdx] = useState(0);
  const steps = mode === "wf" ? WF_STEPS : AGILE_STEPS;
  const labels: readonly string[] = mode === "wf" ? PHASES : SPRINTS;
  const step = steps[idx];

  const pick = (m: "wf" | "agile") => {
    setMode(m);
    setIdx(0);
  };

  const msgTone =
    step.tone === "event"
      ? "bg-amber-50 ring-amber-200 text-amber-900"
      : step.tone === "rework"
        ? mode === "wf"
          ? "bg-rose-50 ring-rose-200 text-rose-800"
          : "bg-emerald-50 ring-emerald-200 text-emerald-800"
        : step.tone === "goal"
          ? "bg-sky-50 ring-sky-200 text-gray-700"
          : "bg-gray-50 ring-gray-200 text-gray-700";

  return (
    <Panel>
      <SectionTitle step={1}>仕様変更シミュレータ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        開発の途中で<b className="text-gray-800">「⚡やっぱり変更したい！」</b>が来たらどうなる？
        進め方を選んで「次へ」で開発を進め、<b className="text-gray-800">後戻りの大きさの違い</b>を体感しよう。
      </p>

      {/* モード切替 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => pick("wf")}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            mode === "wf" ? "bg-sky-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          🪜 ウォーターフォール
        </button>
        <button
          onClick={() => pick("agile")}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            mode === "agile" ? "bg-emerald-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          🔁 アジャイル
        </button>
      </div>

      {/* 工程の見える化 */}
      <div className="mt-3 flex items-center gap-1">
        {labels.map((label, i) => {
          const isActive = step.active === i;
          const isDone = step.done.includes(i);
          const isReworkTarget = step.tone === "rework" && isActive;
          const tone = isReworkTarget
            ? mode === "wf"
              ? "bg-rose-500 text-white"
              : "bg-emerald-500 text-white"
            : isActive
              ? "bg-brand-600 text-white"
              : isDone
                ? "bg-brand-100 text-brand-600"
                : "bg-gray-100 text-gray-400";
          return (
            <div key={label} className="flex flex-1 items-center gap-1">
              <div className={`w-full rounded-md px-0.5 py-2 text-center text-[10px] font-bold leading-tight transition ${tone}`}>
                {isReworkTarget && mode === "wf" ? "↩️ " : ""}
                {label}
              </div>
              {i < labels.length - 1 && <span className="flex-none text-[10px] text-gray-300">{mode === "wf" ? "▶" : "↻"}</span>}
            </div>
          );
        })}
      </div>

      {/* 実況メッセージ */}
      <p className={`mt-3 min-h-[5em] rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${msgTone}`}>{step.msg}</p>

      <StepNav
        index={idx}
        total={steps.length}
        onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
        onReset={() => setIdx(0)}
        doneLabel={mode === "wf" ? "変更に弱い ⚠️" : "変更に強い 💪"}
      />

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 両方試すと違いが分かります。ちなみにアジャイルは<b>「無計画」ではありません</b>——計画を小さく区切って、こまめに見直すだけです。
      </div>
    </Panel>
  );
}

function Compare() {
  const rows = [
    { k: "進め方", wf: "工程を順番に下る", agile: "小さく作って反復" },
    { k: "計画", wf: "最初に全部決める", agile: "区切りごとに見直す" },
    { k: "変更", wf: "弱い（後戻りが大変）", agile: "強い（次の反復で対応）" },
    { k: "向く開発", wf: "仕様が固まっている", agile: "要望が変わりやすい" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>くらべて整理</SectionTitle>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-2 py-2 text-left font-bold"> </th>
              <th className="px-2 py-2 text-center font-bold text-sky-700">🪜 WF</th>
              <th className="px-2 py-2 text-center font-bold text-emerald-700">🔁 アジャイル</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                <td className="whitespace-nowrap px-2 py-2 font-bold text-gray-700">{r.k}</td>
                <td className="px-2 py-2 text-center text-xs text-gray-700">{r.wf}</td>
                <td className="px-2 py-2 text-center text-xs text-gray-700">{r.agile}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ 開発の工程そのもの（要件定義→設計→製造→テスト→運用）はどちらも同じ。<b>進め方</b>が違うだけです。
      </p>
    </Panel>
  );
}

const ITEMS: { t: string; ans: "WF" | "Agile"; why: string }[] = [
  { t: "最初に全体を決め、工程を順番に進めて完成させる", ans: "WF", why: "順番に下る＝ウォーターフォール。" },
  { t: "小さく作って利用者に見せ、反応を見て改善する", ans: "Agile", why: "小さく反復＝アジャイル。" },
  { t: "仕様が固まっていて、後から大きく変わらない開発", ans: "WF", why: "計画重視ならウォーターフォールが向く。" },
  { t: "要望が変わりやすく、早く形にして試したい開発", ans: "Agile", why: "変化に強いアジャイルが向く。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, "WF" | "Agile">>({});
  const label = (k: "WF" | "Agile") => (k === "WF" ? "ウォーターフォール" : "アジャイル");
  return (
    <Panel>
      <SectionTitle step={3}>これはどっち？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {(["WF", "Agile"] as const).map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
                    >
                      {label(opt)}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${label(it.ans)}。 `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function DevProcessExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🛠️ システム開発は<b>要件定義→設計→製造→テスト→運用</b>の流れ。進め方には
        <b>ウォーターフォール（順番に）</b>と<b>アジャイル（小さく反復）</b>の2つがあります。
      </div>

      <Simulator />
      <Compare />
      <Quiz />
    </div>
  );
}
