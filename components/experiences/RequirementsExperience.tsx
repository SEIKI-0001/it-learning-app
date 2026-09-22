"use client";

import { useState, type ReactNode } from "react";
import { REQS, RequirementsStage, type ReqMode } from "./requirements/RequirementsStage";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「要件定義」専用の体験。
//   ① 要件定義 = 何を作るかを利用者と決めて合意する工程
//   ② 開発シミュレータ：依頼者の頭の中 → 言葉 → 開発者の理解 → 完成物 を1つのステージで動かす。
//      あいまい＝ズレたまま完成して手戻り／はっきり＝要件カードが渡るほど一致度が上がり、
//      完成物の周りに機能要件・非機能要件が積み上がる
//   ③ 機能要件 / 非機能要件 の振り分けクイズ
// ============================================================================

function WhatIs() {
  return (
    <Panel>
      <SectionTitle step={1}>要件定義ってなに？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        作り始める前に、<b className="text-gray-800">システムに何をしてほしいか</b>を
        <b className="text-gray-800">利用者と開発者で確認して決める</b>工程です。
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="rounded-xl bg-gray-50 px-3 py-3 text-center ring-1 ring-gray-200">
          <div className="text-2xl">🙋</div>
          <div className="mt-1 text-[11px] font-bold text-gray-700">利用者</div>
          <div className="text-[10px] text-gray-500">ほしい物を伝える</div>
        </div>
        <div className="flex flex-col items-center">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">合意</span>
          <span className="text-lg text-gray-300">🤝</span>
        </div>
        <div className="rounded-xl bg-brand-50 px-3 py-3 text-center ring-1 ring-brand-200">
          <div className="text-2xl">🧑‍💻</div>
          <div className="mt-1 text-[11px] font-bold text-brand-700">開発者</div>
          <div className="text-[10px] text-gray-500">作れる形に整理</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 料理の注文と同じ。「何を・何人分・いつまでに」を先に確認しておくイメージです。
        ⚠️ 開発者だけで決めず、利用者と合意するのが大切。
      </div>
    </Panel>
  );
}

// 開発シミュレータ：伝え方で結末が変わる
// 曖昧＝言葉にしなかった条件が届かず、ズレたまま完成 →「これじゃない」→ 手戻り。
// 明確＝要件を1枚ずつ渡すたびに開発者のイメージが依頼者に近づき、機能／非機能要件が積み上がる。
const VAGUE_STEPS: { title: string; text: ReactNode }[] = [
  {
    title: "頭の中",
    text: <>依頼者の頭の中には「<b>スマホで日時を選んで予約・キャンセルでき、サッと表示される</b>」完成イメージ。開発者にはまだ何も見えていません。</>,
  },
  {
    title: "言葉で伝える",
    text: <>伝えたのは「<b>使いやすい予約システムがほしい</b>」だけ。言葉にしなかった細かい条件は、<b>開発者に届きません</b>。</>,
  },
  {
    title: "開発者が解釈",
    text: <>開発者は「使いやすい＝大きな画面」と解釈し、足りない部分は<b>想像で埋めました</b>。一致度はたった25%。でも<b>2人ともズレに気づいていません</b>。</>,
  },
  {
    title: "完成",
    text: <>数か月後、開発者は理解どおり真面目に完成させました。頭の中と並べると ✕ だらけ…「<b>これじゃない！</b>」</>,
  },
  {
    title: "手戻り",
    text: <>要件定義まで<b>戻ってやり直し</b>（手戻り）。誤りは<b>後の工程で見つかるほど</b>、直す範囲が広がり時間もお金も大きくなります。</>,
  },
];

const CLEAR_STEPS: { title: string; text: ReactNode }[] = [
  { title: "頭の中", text: VAGUE_STEPS[0].text },
  ...REQS.map((r) => ({
    title: r.text,
    text: (
      <>
        「<b>{r.text}</b>」を要件として書き出して合意。開発者のイメージにも反映され、一致度が上がります。
        これは<b>{r.note}</b>の条件＝<b>{r.kind}要件</b>。
      </>
    ),
  })),
  {
    title: "完成",
    text: <>要件を明確にしたので、完成物は頭の中と<b>100%一致</b>。「これこれ！」で手戻りゼロ。周りに積み上がったのが<b>機能要件（何ができるか）</b>と<b>非機能要件（速さ・使いやすさ等）</b>です。</>,
  },
];

function WhyMatters() {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<ReqMode>("vague");
  const steps = mode === "vague" ? VAGUE_STEPS : CLEAR_STEPS;
  const player = useStepPlayer(steps.length, reducedMotion);
  const step = steps[player.index];
  const last = player.index === player.lastIndex;
  const [tried, setTried] = useState<Set<ReqMode>>(new Set());
  if (last && !tried.has(mode)) setTried(new Set(tried).add(mode));

  return (
    <Panel>
      <SectionTitle step={2}>開発ごっこ：伝え方で結末が変わる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたは予約システムを注文する<b className="text-gray-800">依頼者🙋</b>。
        伝え方を選んで進め、<b className="text-gray-800">開発者の理解が頭の中とどうズレる／そろうか</b>を見比べよう。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        {(
          [
            { v: "vague", label: "😶‍🌫️ あいまいに伝える", on: "bg-rose-600 text-white" },
            { v: "clear", label: "📝 要件をはっきり", on: "bg-emerald-600 text-white" },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={mode === o.v}
            onClick={() => {
              setMode(o.v);
              player.reset();
            }}
            className={`rounded-lg px-2 py-2 text-xs font-bold transition active:scale-95 ${mode === o.v ? o.on : "text-gray-600"}`}
          >
            {o.label}
            {tried.has(o.v) && " ✓"}
          </button>
        ))}
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-md">
        <RequirementsStage mode={mode} phase={player.index} reducedMotion={reducedMotion} />
      </div>

      <div
        className={`mt-3 min-h-[4.5em] rounded-xl px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 [&_b]:text-gray-900 ${
          mode === "vague" && player.index >= 2 ? "bg-rose-50 ring-rose-200" : last ? "bg-emerald-50 ring-emerald-200" : "bg-sky-50 ring-sky-200"
        }`}
        aria-live="polite"
      >
        <b>
          STEP {player.index + 1}／{step.title}
        </b>
        ：{step.text}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={steps}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="開発の流れを再生"
          timelineLabel="開発の流れのタイムライン"
          startCaption="頭の中"
          endCaption={mode === "vague" ? "手戻り" : "完成"}
        />
      </div>

      {tried.size === 2 && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="req-lesson">
          💡 <b>要件定義をしないとズレる。要件を明確にすると認識がそろう。</b>
          丁寧に要件定義をするほど、後工程の手戻りが減ります。
        </div>
      )}
    </Panel>
  );
}

const ITEMS: { t: string; ans: "機能" | "非機能"; why: string }[] = [
  { t: "席を選んで予約できる", ans: "機能", why: "システムができること＝機能要件。" },
  { t: "予約のキャンセルができる", ans: "機能", why: "提供する機能そのもの＝機能要件。" },
  { t: "3秒以内に画面が表示される", ans: "非機能", why: "速さ（性能）は機能以外の条件＝非機能要件。" },
  { t: "同時に1000人が使っても落ちない", ans: "非機能", why: "性能・安定性＝非機能要件。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, "機能" | "非機能">>({});
  return (
    <Panel>
      <SectionTitle step={3}>機能要件？ 非機能要件？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">機能要件＝何ができるか</b>、
        <b className="text-gray-800">非機能要件＝速さ・安定性などの条件</b>。どっち？
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {(["機能", "非機能"] as const).map((opt) => {
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
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}要件
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${it.ans}要件。 `}
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

export default function RequirementsExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📝 <b>要件定義</b>は、作り始める前に<b>「何を作るか」を利用者と決めて合意する</b>工程。
        ここがあいまいだと、完成後に「思ってたのと違う」が起きやすくなります。
      </div>

      <WhatIs />
      <WhyMatters />
      <Quiz />
    </div>
  );
}
