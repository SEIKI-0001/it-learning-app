"use client";

import { useState, type ReactNode } from "react";
import { ComputerScene } from "./computer/ComputerScene";
import { DOC_TEXT, type ComputerSceneProps, type DocVersion, type SceneCaption } from "./computer/computerTypes";
import { usePhasePlayer } from "./scene/usePhasePlayer";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";
import Icon from "@/components/ui/Icon";

// ============================================================================
// 「CPU・メモリ・ストレージ」専用の体験。
//   ① 3つの部品の役割（頭脳・作業机・引き出し）
//   ② データの流れ体験 … PC内部の模型（WebGLがあれば3D、なければ2.5D）（ストレージ → メモリ ↔ CPU）で
//      文書を開く→書き換える→保存 の3 STEP。どの段階でも「電源を切る」を押せ、
//      保存前に切ると メモリ上の編集だけが消え、ストレージには古い版が残る（揮発性）
//   ③ メモリ vs ストレージ … 速さ・容量・電源OFFで消えるか（揮発性）の比較
//
// ② は「文章を読む」より「模型の動きを見る」体験にする。
//   - 各 STEP は数個の場面（フェーズ）に分かれ、場面ごとに模型の状態と短い吹き出し（35文字以内）が1つずつ変わる
//   - STEP に入ると場面が自動で進み、最後の場面で止まる。次の STEP へはユーザーが「次へ」を押したときだけ進む
//   - 「開く」を押す・「100」を「120」に書き換える場面は利用者に操作してもらい、操作するまで先へ進めない
//   - 長い説明・試験用語は「詳しく見る」に分け、開いている間は場面の再生を止める
// ============================================================================

type Phase = Pick<ComputerSceneProps, "nodes" | "lanes" | "doc" | "packet"> & {
  stored: DocVersion;
  storedFlash?: boolean;
  caption: SceneCaption;
  /** 利用者の操作を待つ場面（open=「開く」を押す / type=金額を書き換える）。操作するまで次の場面へ進まない */
  action?: "open" | "type";
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
    title: "文書を開く",
    phases: [
      {
        nodes: at({ storage: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC1_STORAGE,
        packet: null,
        caption: { target: "storage", text: "文書はストレージ（引き出し）に保存されている" },
        action: "open",
      },
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
        nodes: at({ memory: "sending", cpu: "active" }),
        lanes: { bus: "active" },
        stored: 1,
        doc: DOC1_MEMORY,
        packet: { spot: "cpu", text: "読み取り", kind: "bus" },
        caption: { target: "cpu", text: "CPUがメモリから読み取り、表示用に処理する" },
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
          文書・写真・アプリなどは、ふだん<b>ストレージ（補助記憶装置）</b>に保存されています。SSD や HDD がストレージで、
          電源を切っても中身が消えない<b>不揮発性</b>の記憶装置です。
        </p>
        <p>
          開くと、文書は<b>メモリ（主記憶装置）</b>へ読み込まれます。ストレージは大容量ですが遅いので、使う分だけ速いメモリに広げて作業します。
          読み込みは<b>コピー</b>なので、ストレージの保存版はそのままです。
        </p>
        <p>
          <b>CPU（中央処理装置）</b>はメモリ上のデータを読み取り、計算や判断（処理）をします。CPU が直接やりとりするのはメモリです。
          CPU の速さは<b>クロック周波数（GHz）</b>で表します。
        </p>
        <Terms items={["補助記憶装置", "主記憶装置", "不揮発性", "クロック周波数"]} />
      </>
    ),
  },
  {
    title: "メモリ上で書き換える",
    phases: [
      {
        nodes: at({ memory: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC1_MEMORY,
        packet: null,
        caption: { target: "keyboard", text: "キーボードから入力する" },
        action: "type",
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
        nodes: at({ cpu: "sending" }),
        lanes: { bus: "active" },
        stored: 1,
        doc: DOC1_MEMORY,
        packet: { spot: "memory", text: "書き込み", kind: "bus" },
        caption: { target: "cpu", text: "計算結果をメモリへ書き込む" },
      },
      {
        nodes: at({ memory: "active", storage: "active" }),
        lanes: {},
        stored: 1,
        doc: DOC2_DIRTY,
        packet: null,
        caption: { target: "memory", text: "メモリ上は v2。引き出しはまだ v1。いま電源を切ると…？" },
      },
    ],
    detail: (
      <>
        <p>
          キーボードなどの<b>入力装置</b>から入ったデータも、まず CPU が受け取って処理し、結果をメモリへ書き込みます。
          編集した内容はまず<b>メモリの上</b>にあります（だから速い）。
        </p>
        <p>
          ただしメモリは電気が無いと中身を保てない<b>揮発性</b>の記憶装置です。保存する前に電源を切ると、メモリ上の編集は消えてしまいます。
        </p>
        <Terms items={["入力装置", "揮発性", "主記憶（メモリ）"]} />
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
        caption: { target: "storage", text: "ストレージに v2 が保存された。電源を切っても残る" },
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
const EDIT_STEP = 1;
const SAVE_STEP = 2;

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

function powerView(power: Power, phase: Phase) {
  const stored = phase.stored;
  const inMemory = phase.doc?.spot === "memory";
  const edited = phase.doc?.version === 2;
  // メモリにだけ新しい版がある（まだストレージに書き込まれていない）
  const lost = edited && stored === 1;
  if (power === "off") {
    return {
      nodes: { storage: "idle", memory: "disabled", cpu: "disabled" } as ComputerSceneProps["nodes"],
      doc: inMemory ? ({ spot: "memory", version: edited ? 2 : 1, status: "vanished" } as const) : ({ spot: "storage", version: stored, status: "clean" } as const),
      stored,
      tone: lost ? ("lost" as const) : ("safe" as const),
      title: lost ? "保存前に電源OFF → 編集が消えた" : "電源OFF → 失ったものはない",
      caption: (lost
        ? { target: "memory", text: `メモリ上の編集（${DOC_TEXT[2]}）が消えた`, tone: "lost" }
        : edited
          ? { target: "storage", text: "保存済みなので、v2 はストレージに残っている", tone: "safe" }
          : inMemory
            ? { target: "memory", text: "メモリは空に。でもまだ編集していない", tone: "safe" }
            : { target: "storage", text: "文書はストレージに残っている", tone: "safe" }) as SceneCaption,
      detail: lost ? (
        <>
          電源OFF。<b>メモリの上にあった編集（{DOC_TEXT[2]}）が消えました！</b>
          引き出し（ストレージ）には古い <b>v1（{DOC_TEXT[1]}）</b>しか残っていません。
        </>
      ) : edited ? (
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

/** 利用者に操作してもらう場面の小窓（アプリで「開く」を押す / 金額を 100 → 120 に書き換える） */
function ActionCard({ action, onDone }: { action: "open" | "type"; onDone: () => void }) {
  const [value, setValue] = useState("100");
  if (action === "open") {
    return (
      <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 ring-1 ring-brand-200" data-testid="cc-action">
        <p className="text-xs font-bold text-brand-800">あなたの番：アプリで文書を開いてみよう</p>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200">
          <span className="min-w-0 truncate text-sm text-gray-700">レポート.docx</span>
          <button type="button" onClick={onDone} className="flex-none rounded-full bg-brand-600 px-5 py-1.5 text-xs font-bold text-white active:scale-95">
            開く
          </button>
        </div>
      </div>
    );
  }
  // 全角数字でも受け付ける
  const typed = value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).trim();
  return (
    <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 ring-1 ring-brand-200" data-testid="cc-action">
      <p className="text-xs font-bold text-brand-800">あなたの番：「100」を「120」に書き換えてみよう</p>
      <form
        className="mt-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed === "120") onDone();
        }}
      >
        <label className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-gray-700">
          売上
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="numeric"
            aria-label="売上（万円）"
            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-right text-base font-bold text-gray-900 focus:border-brand-500 focus:outline-none"
          />
          万円
        </label>
        <button
          type="submit"
          disabled={typed !== "120"}
          className="flex-none rounded-full bg-brand-600 px-5 py-1.5 text-xs font-bold text-white active:scale-95 disabled:bg-gray-300"
        >
          確定
        </button>
      </form>
    </div>
  );
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
    undefined,
    (st, ph) => !!STEPS[st].phases[ph].action,
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
  // 利用者の操作待ちの間は止める・再開するものが無いので押せない
  const playState: "playing" | "stopped" | "done" | "waiting" =
    power !== "on" || player.done ? "done" : player.waiting ? "waiting" : stopped ? "stopped" : "playing";

  function powerOff() {
    setPower("off");
    if (phase.doc?.version === 2) setTried((t) => (phase.stored === 1 ? { ...t, lost: true } : { ...t, safe: true }));
  }

  const pv = power === "on" ? null : powerView(power, phase);
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

      {power === "on" && phase.action && <ActionCard key={`${idx}-${player.run}`} action={phase.action} onDone={player.advance} />}

      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => move(idx - 1)} disabled={idx === 0 && power === "on"} className={`${navBtn} bg-white text-gray-700 ring-1 ring-gray-300`} aria-label="前のSTEPへ">
          ← 戻る
        </button>
        <button
          type="button"
          onClick={playState === "playing" ? () => setStopped(true) : playState === "stopped" ? () => setStopped(false) : replay}
          disabled={playState === "waiting"}
          className={`${navBtn} min-w-[8.5rem] bg-white text-gray-700 ring-1 ring-gray-300`}
          data-testid="cc-play"
          data-state={playState}
        >
          {playState === "playing" ? "⏸ 停止" : playState === "stopped" ? "▶ 再開" : playState === "waiting" ? "操作を待っています" : "↻ もう一度見る"}
        </button>
        {/* 場面が残っている間は押せない（途中で押して見逃さないように）。電源OFFの実験中は戻るために押せる */}
        <button
          type="button"
          onClick={() => move(idx + 1)}
          disabled={power === "on" && (idx === STEPS.length - 1 || !player.done)}
          className={`${navBtn} bg-gray-900 text-white`}
          aria-label="次のSTEPへ"
        >
          {power === "on" && !player.done ? (player.waiting ? "操作してね" : "再生中…") : "次へ →"}
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        {power === "on" && (
          <button
            type="button"
            onClick={powerOff}
            className={`flex-1 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 ${
              idx === EDIT_STEP && player.done ? "bg-rose-600 text-white" : "bg-white text-rose-700 ring-1 ring-rose-300"
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
          ヒント：STEP {EDIT_STEP + 1}（メモリ上で書き換える）の最後で切ると…？
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
            <><InlineIcon name="lightbulb" />保存後なら残った。次は <b>STEP {EDIT_STEP + 1}（保存前）</b>の最後で切って比べてみよう。</>
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
    { k: "例", m: "DRAM（PCのメモリ）", s: "SSD・USBメモリ（フラッシュメモリ）・HDD" },
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
        <p className="mt-3 text-xs leading-relaxed text-gray-600" data-testid="core-nonvolatile-note">
          電源を切っても消えないものは、ほかに読出し専用の <b className="text-gray-800">ROM</b> や、光ディスクの DVD-RAM。
          名前に「RAM」が付いていても DVD-RAM は消えません。消えるのは<b className="text-gray-800">メモリの DRAM</b> です。
        </p>
      </Panel>
    </div>
  );
}
