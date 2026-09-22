"use client";

import { useState, type ReactNode } from "react";
import { CommonKeyScene, type CommonKeySceneProps, type KeySpot } from "./commonkey/CommonKeyScene";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「共通鍵暗号方式」専用の体験。
//   ① 1本の鍵で暗号化も復号も（合鍵のたとえ）
//   ② 送信の流れ … ①同じ鍵を共有（弱点＝鍵配送）→ ②暗号化して送る（1歩ずつ）。
//      公開鍵体験と同じ 2.5D の舞台で、正常ケース／鍵を盗まれたケースを切り替えて比べる
//   ③ 公開鍵との使い分け
// 公開鍵方式の体験と同じ図の見せ方にして、違いを対比できるようにする。
// ============================================================================

type Mode = "safe" | "stolen";
type FlowStep = { phase: 1 | 2; title: string; detail: ReactNode; scene: Omit<CommonKeySceneProps, "reducedMotion"> };

const IDLE = { a: "idle", b: "idle", eve: "idle" } as const;

function stepsFor(mode: Mode): FlowStep[] {
  const stolen = mode === "stolen";
  const aKey = (emphasis = false) => ({ owner: "A" as const, spot: (emphasis ? "aUse" : "aHome") as KeySpot, emphasis });
  const bKey = (spot: KeySpot, emphasis = false) => ({ owner: "B" as const, spot, emphasis });
  const eveKey = (spot: KeySpot) => ({ owner: "盗聴者" as const, spot });
  const eveKeys = (spot: KeySpot) => (stolen ? [eveKey(spot)] : []);
  return [
    {
      phase: 1,
      title: "Aが共通鍵を用意",
      detail: <>【準備】AさんとBさんは<b>同じ共通鍵🔑</b>で暗号化・復号します。まずAが鍵を1本用意しました。</>,
      scene: { nodes: { ...IDLE, a: "active" }, lanes: { key: "idle", data: "idle" }, keys: [aKey()], capsule: null, tap: null, eve: null },
    },
    {
      phase: 1,
      title: stolen ? "鍵を送る途中で盗まれた！" : "共通鍵をBへ送る",
      detail: stolen ? (
        <>
          Aが鍵をBへ送る途中、😈盗聴者が<b>鍵そのものをコピー</b>しました。⚠️これが<b>鍵配送問題</b>：共通鍵は相手に渡さないと使えないのに、渡す途中が危ない。
        </>
      ) : (
        <>Aが<b>鍵そのもの</b>をBへ送ります。今回は盗まれずに届きました（でも、ここが一番危ない瞬間）。</>
      ),
      scene: {
        nodes: { ...IDLE, a: "sending", eve: stolen ? "error" : "idle" },
        lanes: { key: "active", data: "idle" },
        keys: [aKey(), bKey("transit"), ...eveKeys("eveGrab")],
        capsule: null,
        tap: stolen ? "key" : null,
        eve: stolen ? { key: true, reads: null, cipher: false } : null,
      },
    },
    {
      phase: 1,
      title: stolen ? "同じ鍵が3人の手に" : "AとBが同じ鍵を持つ",
      detail: stolen ? (
        <>AもBも同じ鍵を持てた…と思っていますが、<b>盗聴者も同じ鍵</b>を持っています。</>
      ) : (
        <>AとBが<b>まったく同じ1本の鍵</b>を持ちました。共通鍵は「同じ鍵を2人が持つ」方式です。</>
      ),
      scene: {
        nodes: { ...IDLE, a: "active", b: "active", eve: stolen ? "error" : "idle" },
        lanes: { key: "done", data: "idle" },
        keys: [aKey(), bKey("bHome"), ...eveKeys("eveHome")],
        capsule: null,
        tap: null,
        eve: stolen ? { key: true, reads: null, cipher: false } : null,
      },
    },
    {
      phase: 2,
      title: "Aが共通鍵で暗号化",
      detail: <>【通信①】Aさんが<b>共通鍵🔑で暗号化🔒</b>。平文「会議は10時」→ 暗号文に。</>,
      scene: {
        nodes: { ...IDLE, a: "active" },
        lanes: { key: "done", data: "idle" },
        keys: [aKey(true), bKey("bHome"), ...eveKeys("eveHome")],
        capsule: { stop: "aDesk", state: "encrypted" },
        tap: null,
        eve: stolen ? { key: true, reads: null, cipher: false } : null,
      },
    },
    {
      phase: 2,
      title: "暗号文をBへ送る",
      detail: stolen ? (
        <>【通信②】暗号文を A→B へ送信。盗聴者は<b>暗号文もコピー</b>しました。</>
      ) : (
        <>【通信②】暗号文を A→B へ送信。盗聴者は暗号文をコピーしましたが、<b>鍵を持っていない</b>ので開けません。</>
      ),
      scene: {
        nodes: { ...IDLE, a: "sending", eve: "error" },
        lanes: { key: "done", data: "active" },
        keys: [aKey(), bKey("bHome"), ...eveKeys("eveHome")],
        capsule: { stop: "mid", state: "encrypted" },
        tap: "data",
        eve: { key: stolen, reads: null, cipher: true },
      },
    },
    {
      phase: 2,
      title: stolen ? "Bが復号…盗聴者も復号できてしまう" : "Bが同じ共通鍵で復号",
      detail: stolen ? (
        <>
          【通信③】Bが同じ鍵で復号して「会議は10時」が読めた。でも<b>盗聴者も同じ鍵で復号</b>できてしまう！ 鍵を盗まれたら、その後の暗号文は<b>全部読まれます</b>。
        </>
      ) : (
        <>【通信③】Bさんが<b>同じ共通鍵🔑で復号</b>。「会議は10時」が読めた！ 盗聴者の手元の暗号文は<b>開かないまま</b>です。</>
      ),
      scene: {
        nodes: { a: "idle", b: "active", eve: stolen ? "error" : "idle" },
        lanes: { key: "done", data: "done" },
        keys: [aKey(), bKey("bUse", true), ...eveKeys("eveUse")],
        capsule: { stop: "bDesk", state: "decrypted" },
        tap: null,
        eve: { key: stolen, reads: stolen ? "会議は10時" : null, cipher: true },
      },
    },
  ];
}

function Flow() {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("safe");
  const steps = stepsFor(mode);
  const player = useStepPlayer(steps.length, reducedMotion);
  const step = steps[player.index];
  const last = player.index === player.lastIndex;
  const [tried, setTried] = useState<Set<Mode>>(new Set());
  if (last && !tried.has(mode)) setTried(new Set(tried).add(mode));

  return (
    <Panel>
      <SectionTitle step={2}>送信の流れ（2段階：鍵を共有 → 暗号通信）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        AさんからBさんへ秘密のメッセージを送ります。<b className="text-gray-800">同じ鍵を共有してから</b>通信する流れを1歩ずつ。
        <b className="text-gray-800">鍵を盗まれたケース</b>とも比べてみよう。
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {(
          [
            { v: "safe", label: "✅ 正常ケース" },
            { v: "stolen", label: "😈 鍵を盗まれたケース" },
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
            className={`rounded-lg px-2 py-1.5 text-xs font-bold transition active:scale-95 ${
              mode === o.v ? (o.v === "stolen" ? "bg-rose-600 text-white" : "bg-brand-600 text-white") : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {o.label}
            {tried.has(o.v) && " ✓"}
          </button>
        ))}
      </div>

      {/* フェーズ表示（2段階） */}
      <div className="mt-3 flex gap-2 text-center text-[11px] font-bold" data-testid="ck-phase" data-phase={step.phase}>
        <div className={`flex-1 rounded-lg px-2 py-1.5 ring-1 ${step.phase === 1 ? "bg-amber-500 text-white ring-amber-500" : "bg-gray-50 text-gray-400 ring-gray-200"}`}>
          ① 同じ鍵を共有
        </div>
        <div className={`flex-1 rounded-lg px-2 py-1.5 ring-1 ${step.phase === 2 ? "bg-brand-600 text-white ring-brand-600" : "bg-gray-50 text-gray-400 ring-gray-200"}`}>
          ② 暗号化して送る
        </div>
      </div>

      <p className="mt-3 text-sm font-bold text-gray-900" data-testid="ck-step-title">
        STEP {player.index + 1}：{step.title}
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <CommonKeyScene {...step.scene} reducedMotion={reducedMotion} />
      </div>

      <div
        className={`mt-3 min-h-[3.5em] rounded-xl px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 [&_b]:text-gray-900 ${
          mode === "stolen" && player.index > 0 ? "bg-rose-50 ring-rose-200" : "bg-sky-50 ring-sky-200"
        }`}
        aria-live="polite"
      >
        {step.detail}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={steps}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="共通鍵暗号の流れを再生"
          timelineLabel="共通鍵暗号の流れのタイムライン"
          startCaption="①鍵を共有"
          endCaption="②復号"
          stepTone={(i) => (steps[i].phase === 1 ? "bg-amber-500" : "bg-brand-600")}
        />
      </div>

      {tried.size === 2 && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="ck-insight">
          💡 ポイント：1本の鍵だから <b>処理が速い</b>。ただし<b>鍵そのものを盗まれると、その後の暗号文はすべて読まれる</b>。
          だから <b>その鍵を安全に渡すのが課題</b>（鍵配送問題）。
        </div>
      )}
    </Panel>
  );
}

export default function CommonKeyExperience() {
  const rows = [
    { k: "鍵の数", c: "1本（同じ鍵を共有）", p: "2本ペア（公開鍵＋秘密鍵）" },
    { k: "暗号化／復号", c: "同じ鍵で両方", p: "公開鍵で暗号化→秘密鍵で復号" },
    { k: "速さ", c: "速い 🚀", p: "遅め" },
    { k: "鍵を配る悩み", c: "あり（鍵配送問題）", p: "小さい（公開鍵は配ってよい）" },
    { k: "向いている用途", c: "大量データの暗号化", p: "鍵の受け渡し・少量データ" },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔑 たとえると<b>「合鍵」</b>。AさんもBさんも<b>同じ1本の鍵</b>を持ち、
        その鍵で<b>閉める（暗号化）も開ける（復号）も</b>できます。便利で速い反面、
        <b>合鍵を相手にどう安全に渡すか</b>が悩みどころです。
      </div>

      <Panel>
        <SectionTitle step={1}>1本の鍵で暗号化も復号も</SectionTitle>
        <div className="mt-3 flex items-center justify-center gap-2 text-center">
          <div className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <div className="text-sm font-bold text-gray-700">平文</div>
            <div className="text-[11px] text-gray-500">会議は10時</div>
          </div>
          <div className="text-center">
            <div className="text-lg">🔑→🔒</div>
            <div className="text-[10px] text-gray-400">共通鍵で暗号化</div>
          </div>
          <div className="rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-200">
            <div className="text-sm font-bold text-brand-700">暗号文</div>
            <div className="text-[11px] text-gray-500">＃＄％‥</div>
          </div>
          <div className="text-center">
            <div className="text-lg">🔑→🔓</div>
            <div className="text-[10px] text-gray-400">同じ鍵で復号</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-200">
            <div className="text-sm font-bold text-emerald-700">平文</div>
            <div className="text-[11px] text-gray-500">会議は10時</div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          暗号化に使った鍵と、復号に使う鍵が<b className="text-gray-800">まったく同じ（1本）</b>。これが共通鍵暗号方式です。
          鍵が1本でシンプルなので<b className="text-gray-800">処理が速い</b>のが長所。
        </p>
      </Panel>

      <Flow />

      <Panel>
        <SectionTitle step={3}>公開鍵方式との使い分け</SectionTitle>
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 text-left font-bold"> </th>
                <th className="px-3 py-2 text-center font-bold text-brand-700">共通鍵</th>
                <th className="px-3 py-2 text-center font-bold text-gray-700">公開鍵</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.c}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          💡 実際のしくみ（HTTPSなど）は<b>両方のいいとこ取り</b>：<b>共通鍵を公開鍵で安全に届けて</b>、
          そのあとは速い共通鍵でやり取りします（ハイブリッド方式）。
        </p>
      </Panel>
    </div>
  );
}
