"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ComputerScene } from "./computer/ComputerScene";
import { DOC_TEXT, type ComputerSceneProps, type DocVersion, type SceneCaption } from "./computer/computerTypes";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";
import Icon from "@/components/ui/Icon";

// ============================================================================
// 「CPU・メモリ・ストレージ」専用の体験。
//   ① 3つの部品の役割（頭脳・作業机・引き出し）
//   ② データの流れ体験 … PC内部の模型（WebGLがあれば3D、なければ2.5D）（ストレージ → メモリ ↔ CPU）で
//      文書を開く→処理→編集→保存 を1歩ずつ。どの段階でも「電源を切る」を押せ、
//      保存前に切ると メモリ上の編集だけが消え、ストレージには古い版が残る（揮発性）
//   ③ メモリ vs ストレージ … 速さ・容量・電源OFFで消えるか（揮発性）の比較
//
// ② は「文章を読む」より「模型の動きを見る」体験にする。
//   - 各 STEP は 2〜3 の場面（フェーズ）に分かれ、場面ごとに模型の状態と短い吹き出し（35文字以内）が1つずつ変わる
//   - STEP に入ると場面が自動で進み、最後の場面で止まる。次の STEP へはユーザーが「次へ」を押したときだけ進む
//   - 長い説明・試験用語は「詳しく見る」に分け、開いている間は場面の再生を止める
// ============================================================================

/** 1つの場面を見せる長さ。移動のアニメーション（約1〜1.5秒）を見終えて吹き出しを読める長さにする */
const PHASE_MS = 2600;

type Phase = Pick<ComputerSceneProps, "nodes" | "lanes" | "doc" | "packet"> & {
  stored: DocVersion;
  storedFlash?: boolean;
  caption: SceneCaption;
};

type FlowStep = {
  title: string;
  phases: Phase[];
  /** 「詳しく見る」の中身（補足・試験で問われる用語） */
  detail: ReactNode;
};

const IDLE: ComputerSceneProps["nodes"] = { storage: "idle", memory: "idle", cpu: "idle" };
const at = (over: Partial<ComputerSceneProps["nodes"]>) => ({ ...IDLE, ...over });

const DOC1_STORAGE = { spot: "storage", version: 1, status: "clean" } as const;
const DOC1_MEMORY = { spot: "memory", version: 1, status: "clean" } as const;
const DOC2_DIRTY = { spot: "memory", version: 2, status: "dirty" } as const;
const DOC2_SAVED = { spot: "memory", version: 2, status: "saved" } as const;

const STEPS: FlowStep[] = [
  {
    title: "ふだんは引き出しに保管",
    phases: [
      {
        nodes: at({ storage: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC1_STORAGE,
        packet: null,
        caption: { target: "storage", text: "文書はストレージ（引き出し）に保存されている" },
      },
      {
        nodes: at({ storage: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC1_STORAGE,
        packet: null,
        caption: { target: "monitor", text: "アプリで文書を「開く」を押した" },
      },
    ],
    detail: (
      <>
        <p>
          文書・写真・アプリなどは、ふだん<b>ストレージ（補助記憶装置）</b>に保存されています。SSD や HDD がストレージです。
          電源を切っても中身が消えない<b>不揮発性</b>の記憶装置です。
        </p>
        <Terms items={["補助記憶装置", "SSD / HDD", "不揮発性"]} />
      </>
    ),
  },
  {
    title: "メモリへ読み込む",
    phases: [
      {
        nodes: at({ storage: "sending" }),
        lanes: { load: "active" },
        stored: 1,
        doc: DOC1_MEMORY,
        packet: null,
        caption: { target: "storage", text: "ストレージから文書のコピーを読み出す" },
      },
      {
        nodes: at({ memory: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC1_MEMORY,
        packet: null,
        caption: { target: "memory", text: "メモリ（作業机）に広げる。ここは読み書きが速い" },
      },
      {
        nodes: at({ storage: "active", memory: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC1_MEMORY,
        packet: null,
        caption: { target: "storage", text: "保存版 v1 は引き出しにそのまま残る" },
      },
    ],
    detail: (
      <>
        <p>
          プログラムやデータは、使うときに<b>メモリ（主記憶装置）</b>へ読み込まれます。ストレージは大容量ですが遅いので、
          使う分だけ速いメモリに広げて作業します。読み込みは<b>コピー</b>なので、ストレージの保存版はそのままです。
        </p>
        <Terms items={["主記憶装置", "RAM", "補助記憶装置より高速・小容量"]} />
      </>
    ),
  },
  {
    title: "CPUが読んで表示",
    phases: [
      {
        nodes: at({ memory: "sending" }),
        lanes: { bus: "active" },
        stored: 1,
        doc: DOC1_MEMORY,
        packet: { spot: "cpu", text: "読み取り", kind: "bus" },
        caption: { target: "memory", text: "メモリからCPUへデータを渡す" },
      },
      {
        nodes: at({ memory: "active", cpu: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC1_MEMORY,
        packet: { spot: "cpu", text: "処理中", kind: "bus" },
        caption: { target: "cpu", text: "CPUがデータを読み取り、表示用に処理する" },
      },
      {
        nodes: at({ memory: "active", cpu: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC1_MEMORY,
        packet: null,
        caption: { target: "monitor", text: "処理結果が画面に表示される" },
      },
    ],
    detail: (
      <>
        <p>
          <b>CPU（中央処理装置）</b>はコンピュータの頭脳です。メモリ上のデータや命令を読み取り、計算や判断（処理）をします。
          CPU が直接やりとりするのはメモリで、CPU とメモリの間は非常に高速です。
          CPU の速さは<b>クロック周波数（GHz）</b>で表します。
        </p>
        <Terms items={["CPU（中央処理装置）", "クロック周波数", "演算・制御"]} />
      </>
    ),
  },
  {
    title: "CPUが書き換えを計算",
    phases: [
      {
        nodes: IDLE,
        lanes: {},
        stored: 1,
        doc: DOC1_MEMORY,
        packet: null,
        caption: { target: "keyboard", text: "キーボードで「120」と入力した" },
      },
      {
        nodes: at({ cpu: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC1_MEMORY,
        packet: { spot: "cpu", text: "計算中", kind: "bus" },
        caption: { target: "cpu", text: "CPUが入力を受け取り、新しい内容を計算する" },
      },
      {
        nodes: at({ cpu: "active", memory: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC1_MEMORY,
        packet: { spot: "cpu", text: "計算中", kind: "bus" },
        caption: { target: "memory", text: "この時点で、メモリの文書はまだ v1 のまま" },
      },
    ],
    detail: (
      <>
        <p>
          キーボードなどの<b>入力装置</b>から入ったデータも、まず CPU が受け取って処理します。
          計算した結果はすぐにはメモリに反映されず、次の場面でメモリへ書き込まれます。
        </p>
        <Terms items={["入力装置", "CPU が処理の中心"]} />
      </>
    ),
  },
  {
    title: "メモリ上で編集",
    phases: [
      {
        nodes: at({ cpu: "sending" }),
        lanes: { bus: "active" },
        stored: 1,
        doc: DOC1_MEMORY,
        packet: { spot: "memory", text: "書き込み", kind: "bus" },
        caption: { target: "cpu", text: "計算結果をメモリへ送る" },
      },
      {
        nodes: at({ memory: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC2_DIRTY,
        packet: null,
        caption: { target: "memory", text: "メモリ上の文書が v2 に。まだ保存していない" },
      },
      {
        nodes: at({ memory: "active", storage: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC2_DIRTY,
        packet: null,
        caption: { target: "storage", text: "引き出しの中はまだ v1。ここで電源を切ると…？" },
      },
    ],
    detail: (
      <>
        <p>
          編集した内容は、まず<b>メモリの上</b>にあります（だから速い）。ただしメモリは電気が無いと中身を保てない
          <b>揮発性</b>の記憶装置です。保存する前に電源を切ると、メモリ上の編集は消えてしまいます。
        </p>
        <Terms items={["揮発性", "主記憶（メモリ）"]} />
      </>
    ),
  },
  {
    title: "ストレージへ保存",
    phases: [
      {
        nodes: at({ memory: "sending" }),
        lanes: { save: "active" },
        stored: 1,
        doc: DOC2_DIRTY,
        packet: { spot: "storage", text: "保存", kind: "save" },
        caption: { target: "memory", text: "「保存」で、メモリの内容をストレージへ書き込む" },
      },
      {
        nodes: at({ storage: "active" }),
        lanes: {},
        stored: 2,
        storedFlash: true,
        doc: DOC2_SAVED,
        packet: null,
        caption: { target: "storage", text: "ストレージに v2 が保存された" },
      },
      {
        nodes: at({ storage: "active" }),
        lanes: {},
        stored: 2,
        doc: DOC2_SAVED,
        packet: null,
        caption: { target: "storage", text: "電源を切っても v2 は残る（不揮発性）" },
      },
    ],
    detail: (
      <>
        <p>
          「保存」を押すと、メモリの内容が<b>ストレージに書き込まれ</b>ます。ストレージは<b>不揮発性</b>なので、電源を切っても残ります。
          こまめに保存するのは、揮発性のメモリから不揮発性のストレージへ移すためです。
        </p>
        <Terms items={["不揮発性", "保存＝ストレージへの書き込み"]} />
      </>
    ),
  },
];

/** 保存前の編集がメモリにだけある STEP（ここで電源を切ると編集が消える） */
const EDIT_STEP = 4;
const SAVE_STEP = 5;

function Terms({ items }: { items: string[] }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="font-bold text-gray-500">試験で問われる用語</span>
      {items.map((t) => (
        <span key={t} className="rounded-full bg-white px-2 py-0.5 font-bold text-gray-700 ring-1 ring-gray-200">
          {t}
        </span>
      ))}
    </p>
  );
}

type Power = "on" | "off" | "rebooted";

function powerView(power: Power, idx: number) {
  const step = STEPS[idx];
  const stored = step.phases[step.phases.length - 1].stored;
  const inMemory = idx >= 1;
  const edited = idx >= EDIT_STEP;
  const lost = idx === EDIT_STEP;
  if (power === "off") {
    return {
      nodes: { storage: "idle", memory: "disabled", cpu: "disabled" } as ComputerSceneProps["nodes"],
      doc: inMemory ? ({ spot: "memory", version: edited ? 2 : 1, status: "vanished" } as const) : ({ spot: "storage", version: stored, status: "clean" } as const),
      stored,
      tone: lost ? ("lost" as const) : ("safe" as const),
      title: lost ? "保存前に電源OFF → 編集が消えた" : "電源OFF → 失ったものはない",
      caption: (lost
        ? { target: "memory", text: `メモリ上の編集（${DOC_TEXT[2]}）が消えた`, tone: "lost" }
        : idx === SAVE_STEP
          ? { target: "storage", text: "保存済みなので、v2 はストレージに残っている", tone: "safe" }
          : inMemory
            ? { target: "memory", text: "メモリは空に。でもまだ編集していない", tone: "safe" }
            : { target: "storage", text: "文書はストレージに残っている", tone: "safe" }) as SceneCaption,
      detail: lost ? (
        <>
          電源OFF。<b>メモリの上にあった編集（{DOC_TEXT[2]}）が消えました！</b>
          引き出し（ストレージ）には古い <b>v1（{DOC_TEXT[1]}）</b>しか残っていません。
        </>
      ) : idx === SAVE_STEP ? (
        <>電源OFF。メモリの中身は消えましたが、<b>保存済み</b>なのでストレージに <b>v2</b> が残っています。</>
      ) : inMemory ? (
        <>電源OFF。メモリ上の文書は消えました。でも<b>まだ編集していない</b>ので、ストレージの v1 と同じ＝失ったものはありません。</>
      ) : (
        <>電源OFF。メモリはもともと空。文書はストレージに残っています。</>
      ),
    };
  }
  // rebooted：電源を入れ直して開く＝ストレージにある版がメモリに読み込まれる
  return {
    nodes: { storage: "sending", memory: "active", cpu: "idle" } as ComputerSceneProps["nodes"],
    doc: { spot: "memory", version: stored, status: "clean" } as const,
    stored,
    tone: lost ? ("lost" as const) : ("safe" as const),
    title: `ストレージから v${stored} を読み込み`,
    caption: (lost
      ? { target: "memory", text: `読み込まれたのは v1（${DOC_TEXT[1]}）。120万円は消えた`, tone: "lost" }
      : { target: "memory", text: `ストレージの v${stored}（${DOC_TEXT[stored]}）が読み込まれた`, tone: "safe" }) as SceneCaption,
    detail: lost ? (
      <>
        電源を入れ直して開くと、読み込まれたのは<b>ストレージにあった v1（{DOC_TEXT[1]}）</b>。
        書き直した 120万円 は<b>どこにも残っていません</b>。
      </>
    ) : (
      <>電源を入れ直して開くと、ストレージから <b>v{stored}（{DOC_TEXT[stored]}）</b> が読み込まれました。</>
    ),
  };
}

/**
 * STEP と場面（フェーズ）の再生。STEP に入ると場面が自動で進み、最後の場面で止まる。
 * 次の STEP へは move を呼んだときだけ進む。paused の間は場面を進めない。
 * run は「もう一度見る」のたびに増え、模型のアニメーションを最初からやり直す合図にする。
 */
function usePhasePlayer(phaseCounts: number[], paused: boolean) {
  const [pos, setPos] = useState({ step: 0, phase: 0, run: 0 });
  const lastPhase = phaseCounts[pos.step] - 1;
  useEffect(() => {
    if (paused || pos.phase >= lastPhase) return;
    const timer = window.setTimeout(() => setPos((p) => ({ ...p, phase: p.phase + 1 })), PHASE_MS);
    return () => window.clearTimeout(timer);
  }, [pos, paused, lastPhase]);
  return {
    ...pos,
    lastPhase,
    done: pos.phase >= lastPhase,
    move: (step: number) => setPos((p) => ({ step: Math.max(0, Math.min(step, phaseCounts.length - 1)), phase: 0, run: p.run + 1 })),
    replay: () => setPos((p) => ({ ...p, phase: 0, run: p.run + 1 })),
  };
}

function DataFlow() {
  const reducedMotion = useReducedMotion();
  const [power, setPower] = useState<Power>("on");
  const [showDetail, setShowDetail] = useState(false);
  /** 「停止」を押して止めている（「再開」で続きから） */
  const [stopped, setStopped] = useState(false);
  const [tried, setTried] = useState<{ lost: boolean; safe: boolean }>({ lost: false, safe: false });
  const player = usePhasePlayer(
    STEPS.map((s) => s.phases.length),
    stopped || showDetail || power !== "on",
  );
  const idx = player.step;
  const step = STEPS[idx];
  const phase = step.phases[player.phase];

  function move(next: number) {
    setPower("on");
    setStopped(false);
    player.move(next);
  }

  function replay() {
    setPower("on");
    setStopped(false);
    player.replay();
  }

  // 再生ボタンは状況で役割が変わる：再生中＝停止 / 停止中＝再開 / 見終わった（または電源OFFの実験中）＝もう一度見る
  const playState: "playing" | "stopped" | "done" = power !== "on" || player.done ? "done" : stopped ? "stopped" : "playing";

  function powerOff() {
    setPower("off");
    if (idx === EDIT_STEP) setTried((t) => ({ ...t, lost: true }));
    if (idx === SAVE_STEP) setTried((t) => ({ ...t, safe: true }));
  }

  const pv = power === "on" ? null : powerView(power, idx);
  const scene: ComputerSceneProps = pv
    ? {
        nodes: pv.nodes,
        lanes: power === "rebooted" ? { load: "active" } : {},
        stored: pv.stored,
        storedFlash: false,
        doc: pv.doc,
        packet: null,
        power: power === "off" ? "off" : "on",
        reducedMotion,
        caption: pv.caption,
        epoch: player.run,
        paused: showDetail,
      }
    : {
        nodes: phase.nodes,
        lanes: phase.lanes,
        stored: phase.stored,
        storedFlash: !!phase.storedFlash,
        doc: phase.doc,
        packet: phase.packet,
        power: "on",
        reducedMotion,
        caption: phase.caption,
        epoch: player.run,
        paused: stopped || showDetail,
      };

  const navBtn =
    "inline-flex h-10 items-center justify-center gap-1 rounded-full px-4 text-xs font-bold transition active:scale-95 disabled:opacity-35 disabled:active:scale-100";

  return (
    <Panel>
      <SectionTitle step={2}>データの流れを追う（文書を開く→編集→保存）</SectionTitle>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[11px] font-bold ${power === "on" ? "text-brand-700" : pv?.tone === "lost" ? "text-rose-700" : "text-emerald-700"}`}>
            {power === "on" ? `STEP ${idx + 1} / ${STEPS.length}` : power === "off" ? "実験：ここで電源を切ったら？" : "実験：電源を入れ直して開くと？"}
          </p>
          <p className="mt-0.5 text-base font-bold text-gray-900" data-testid="cc-step-title">
            {pv ? pv.title : step.title}
          </p>
        </div>
        {power === "on" && (
          <div className="flex flex-none items-center gap-1 pb-1" aria-label={`場面 ${player.phase + 1} / ${step.phases.length}`} role="img">
            {step.phases.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === player.phase ? "w-4 bg-brand-600" : i < player.phase ? "w-1.5 bg-brand-300" : "w-1.5 bg-gray-300"}`} />
            ))}
          </div>
        )}
      </div>

      <div className="-mx-2 mt-2 sm:mx-0">
        <ComputerScene {...scene} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => move(idx - 1)} disabled={idx === 0 && power === "on"} className={`${navBtn} bg-white text-gray-700 ring-1 ring-gray-300`} aria-label="前のSTEPへ">
          ← 戻る
        </button>
        <button
          type="button"
          onClick={playState === "playing" ? () => setStopped(true) : playState === "stopped" ? () => setStopped(false) : replay}
          className={`${navBtn} min-w-[8.5rem] bg-white text-gray-700 ring-1 ring-gray-300`}
          data-testid="cc-play"
          data-state={playState}
        >
          {playState === "playing" ? "⏸ 停止" : playState === "stopped" ? "▶ 再開" : "↻ もう一度見る"}
        </button>
        {/* 場面が残っている間は押せない（途中で押して見逃さないように）。電源OFFの実験中は戻るために押せる */}
        <button
          type="button"
          onClick={() => move(idx + 1)}
          disabled={power === "on" && (idx === STEPS.length - 1 || !player.done)}
          className={`${navBtn} bg-gray-900 text-white`}
          aria-label="次のSTEPへ"
        >
          {power === "on" && !player.done ? "再生中…" : "次へ →"}
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        {power === "on" && (
          <button
            type="button"
            onClick={powerOff}
            className={`flex-1 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 ${
              idx === EDIT_STEP ? "bg-rose-600 text-white" : "bg-white text-rose-700 ring-1 ring-rose-300"
            }`}
          >
            電源を切る
          </button>
        )}
        {power === "off" && (
          <button type="button" onClick={() => setPower("rebooted")} className="flex-1 rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white active:scale-95">
            電源を入れて文書を開き直す
          </button>
        )}
        {power !== "on" && (
          <button type="button" onClick={() => setPower("on")} className="flex-none rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-300 active:scale-95">
            ↩ 電源OFFの前に戻る
          </button>
        )}
      </div>
      {power === "on" && idx !== EDIT_STEP && !tried.lost && (
        <p className="mt-2 text-center text-[11px] text-gray-500">
          ヒント：STEP {EDIT_STEP + 1}（メモリ上で編集）で切ると…？
        </p>
      )}

      <details
        className="group mt-3 rounded-xl bg-gray-50 ring-1 ring-gray-200 [&_b]:text-gray-900"
        open={showDetail}
        onToggle={(e) => setShowDetail((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-bold text-gray-700">
          詳しく見る{showDetail && "（再生を一時停止中）"}
          <span className="text-gray-400 transition group-open:rotate-180">▾</span>
        </summary>
        <div className="space-y-2 px-4 pb-3 text-sm leading-relaxed text-gray-700" data-testid="cc-detail">
          {pv ? <p>{pv.detail}</p> : step.detail}
        </div>
      </details>

      {(tried.lost || tried.safe) && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="cc-insight">
          {tried.lost && tried.safe ? (
            <>
              <InlineIcon name="lightbulb" />同じ「電源OFF」でも、<b>保存前</b>は編集が消え、<b>保存後</b>は残った。
              メモリは電気が無いと中身を保てない＝<b>揮発性</b>。だから「保存」でストレージ（<b>不揮発性</b>）へ移すのが大切！
            </>
          ) : tried.lost ? (
            <><InlineIcon name="lightbulb" />保存前に切ると編集が消えた。次は <b>STEP {SAVE_STEP + 1}（保存）の後</b>に切って比べてみよう。</>
          ) : (
            <><InlineIcon name="lightbulb" />保存後なら残った。次は <b>STEP {EDIT_STEP + 1}（保存前）</b>で切って比べてみよう。</>
          )}
        </div>
      )}
    </Panel>
  );
}

export default function ComputerCoreExperience() {
  const parts = [
    { icon: "lightbulb" as const, name: "CPU", tag: "頭脳", d: "計算や判断をする処理の中心。速さは「クロック周波数（GHz）」で表す。", ex: "人（宿題をする自分）" },
    { icon: "clipboard" as const, name: "メモリ（主記憶）", tag: "作業机", d: "今すぐ使うデータを一時的に広げる場所。速いが、電源を切ると消える。", ex: "机の広さ（RAM）" },
    { icon: "server" as const, name: "ストレージ（補助記憶）", tag: "引き出し", d: "写真・アプリ・文書を長く保存する場所。大容量だが遅い。電源を切っても残る。", ex: "本棚・引き出し（SSD/HDD）" },
  ];

  const rows = [
    { k: "役割", m: "作業机（一時置き）", s: "引き出し（長期保存）" },
    { k: "速さ", m: "速い", s: "遅い" },
    { k: "容量", m: "小さめ", s: "大きい" },
    { k: "電源を切ると", m: "消える（揮発性）", s: "残る（不揮発性）" },
    { k: "例", m: "RAM", s: "SSD・HDD" },
  ];

  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        パソコンの中身は<b>「机で勉強する」</b>イメージ。<b>あなた＝CPU（頭脳）</b>、
        <b>机の広さ＝メモリ</b>、<b>引き出し＝ストレージ</b>。この3つの役割を分けると一気に読みやすくなります。
      </div>

      <Panel>
        <SectionTitle step={1}>3つの部品の役割</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {parts.map((p) => (
            <li key={p.name} className="flex gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-white ring-1 ring-gray-200">
                <Icon name={p.icon} className="h-7 w-7 text-gray-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800">{p.name}</span>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                    {p.tag}
                  </span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{p.d}</p>
                <p className="mt-1 text-xs text-gray-400">たとえ：{p.ex}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <DataFlow />

      <Panel>
        <SectionTitle step={3}>まちがえやすい：メモリ と ストレージ</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          どちらも「データを置く場所」なので混同しがち。<b className="text-gray-800">電源を切ると消えるのがメモリ</b>、
          というのが最大の見分けポイント（試験で頻出）。
        </p>
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 text-left font-bold"> </th>
                <th className="px-3 py-2 text-center font-bold">メモリ</th>
                <th className="px-3 py-2 text-center font-bold">ストレージ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.m}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
