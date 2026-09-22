"use client";

import { useState, type ReactNode } from "react";
import { ComputerScene, DOC_TEXT, type ComputerSceneProps, type DocVersion } from "./computer/ComputerScene";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「CPU・メモリ・ストレージ」専用の体験。
//   ① 3つの部品の役割（頭脳・作業机・引き出し）
//   ② データの流れ体験 … PC内部の 2.5D 模型（ストレージ → メモリ ↔ CPU）で
//      文書を開く→処理→編集→保存 を1歩ずつ。どの段階でも「⚡電源を切る」を押せ、
//      保存前に切ると メモリ上の編集だけが消え、ストレージには古い版が残る（揮発性）
//   ③ メモリ vs ストレージ … 速さ・容量・電源OFFで消えるか（揮発性）の比較
// ============================================================================

type FlowStep = {
  title: string;
  nodes: ComputerSceneProps["nodes"];
  lanes: ComputerSceneProps["lanes"];
  stored: DocVersion;
  doc: ComputerSceneProps["doc"];
  packet: ComputerSceneProps["packet"];
  detail: ReactNode;
};

const STEPS: FlowStep[] = [
  {
    title: "ふだんは引き出しに保管",
    nodes: { storage: "active", memory: "idle", cpu: "idle" },
    lanes: {},
    stored: 1,
    doc: { spot: "storage", version: 1, status: "clean" },
    packet: null,
    detail: <>💾 文書はふだん<b>ストレージ（引き出し）</b>に保管されています。アプリで「開く」を押しました。</>,
  },
  {
    title: "メモリへ読み込む",
    nodes: { storage: "sending", memory: "active", cpu: "idle" },
    lanes: { load: "active" },
    stored: 1,
    doc: { spot: "memory", version: 1, status: "clean" },
    packet: null,
    detail: (
      <>
        📤 文書のコピーを<b>メモリ（作業机）</b>に読み込みます。ストレージは遅いので、使うものだけ机に広げます。
        引き出しの中の<b>保存版 v1 はそのまま</b>残っています。
      </>
    ),
  },
  {
    title: "CPUが処理",
    nodes: { storage: "idle", memory: "active", cpu: "active" },
    lanes: { bus: "active" },
    stored: 1,
    doc: { spot: "memory", version: 1, status: "clean" },
    packet: { spot: "cpu", text: "読んで表示", kind: "bus" },
    detail: <>🧠 <b>CPU（頭脳）</b>がメモリ上の文書を読んで処理（表示・計算）。CPUとメモリの間は超高速でやりとりします。</>,
  },
  {
    title: "メモリ上で編集",
    nodes: { storage: "idle", memory: "active", cpu: "active" },
    lanes: { bus: "active" },
    stored: 1,
    doc: { spot: "memory", version: 2, status: "dirty" },
    packet: { spot: "memory", text: "100 → 120 に書き換え", kind: "bus" },
    detail: (
      <>
        ✏️ あなたが書き直すと、変更はまず<b>メモリの上</b>にあります（だから速い）。
        机の上は <b>v2</b>、でも引き出しの中は<b>まだ v1</b>。ここで <b>⚡電源を切る</b> を押してみよう。
      </>
    ),
  },
  {
    title: "ストレージへ保存",
    nodes: { storage: "active", memory: "sending", cpu: "idle" },
    lanes: { save: "active" },
    stored: 2,
    doc: { spot: "memory", version: 2, status: "saved" },
    packet: { spot: "storage", text: "v2 を書き込み", kind: "save" },
    detail: <>💾 「保存」を押すと、メモリの内容が<b>ストレージに書き込まれ</b>ます。これで電源を切っても残ります。</>,
  },
];

const EDIT_STEP = 3;
const SAVE_STEP = 4;

type Power = "on" | "off" | "rebooted";

function powerView(power: Power, idx: number) {
  const step = STEPS[idx];
  const inMemory = idx >= 1;
  const edited = idx >= EDIT_STEP;
  const lost = idx === EDIT_STEP;
  const stored = step.stored;
  if (power === "off") {
    return {
      nodes: { storage: "idle", memory: "disabled", cpu: "disabled" } as ComputerSceneProps["nodes"],
      doc: inMemory ? ({ spot: "memory", version: edited ? 2 : 1, status: "vanished" } as const) : ({ spot: "storage", version: stored, status: "clean" } as const),
      tone: lost ? ("lost" as const) : ("safe" as const),
      detail: lost ? (
        <>
          ⚡ 電源OFF。<b>メモリの上にあった編集（{DOC_TEXT[2]}）が消えました！</b>
          引き出し（ストレージ）には古い <b>v1（{DOC_TEXT[1]}）</b>しか残っていません。
        </>
      ) : idx === SAVE_STEP ? (
        <>⚡ 電源OFF。メモリの中身は消えましたが、<b>保存済み</b>なのでストレージに <b>v2</b> が残っています。</>
      ) : inMemory ? (
        <>⚡ 電源OFF。メモリ上の文書は消えました。でも<b>まだ編集していない</b>ので、ストレージの v1 と同じ＝失ったものはありません。</>
      ) : (
        <>⚡ 電源OFF。メモリはもともと空。文書はストレージに残っています。</>
      ),
    };
  }
  // rebooted：電源を入れ直して開く＝ストレージにある版がメモリに読み込まれる
  return {
    nodes: { storage: "sending", memory: "active", cpu: "idle" } as ComputerSceneProps["nodes"],
    doc: { spot: "memory", version: stored, status: "clean" } as const,
    tone: lost ? ("lost" as const) : ("safe" as const),
    detail: lost ? (
      <>
        🔌 電源を入れ直して開くと、読み込まれたのは<b>ストレージにあった v1（{DOC_TEXT[1]}）</b>。
        書き直した 120万円 は<b>どこにも残っていません</b>。
      </>
    ) : (
      <>🔌 電源を入れ直して開くと、ストレージから <b>v{stored}（{DOC_TEXT[stored]}）</b> が読み込まれました。</>
    ),
  };
}

function DataFlow() {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(STEPS.length, reducedMotion);
  const [power, setPower] = useState<Power>("on");
  const [tried, setTried] = useState<{ lost: boolean; safe: boolean }>({ lost: false, safe: false });
  const idx = player.index;
  const step = STEPS[idx];

  function move(next: number) {
    setPower("on");
    player.move(next);
  }

  function powerOff() {
    if (player.playing) player.togglePlay();
    setPower("off");
    if (idx === EDIT_STEP) setTried((t) => ({ ...t, lost: true }));
    if (idx === SAVE_STEP) setTried((t) => ({ ...t, safe: true }));
  }

  const pv = power === "on" ? null : powerView(power, idx);
  const scene: ComputerSceneProps = pv
    ? {
        nodes: pv.nodes,
        lanes: power === "rebooted" ? { load: "active" } : {},
        stored: step.stored,
        storedFlash: false,
        doc: pv.doc,
        packet: null,
        power: power === "off" ? "off" : "on",
        reducedMotion,
      }
    : {
        nodes: step.nodes,
        lanes: step.lanes,
        stored: step.stored,
        storedFlash: idx === SAVE_STEP,
        doc: step.doc,
        packet: step.packet,
        power: "on",
        reducedMotion,
      };

  return (
    <Panel>
      <SectionTitle step={2}>データの流れを追う（文書を開く→編集→保存）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        PCケースの中で、ファイルを開いて書き直して保存するまで、データが<b className="text-gray-800">どこを通るか</b>を1歩ずつ。
        途中で<b className="text-gray-800">⚡電源を切る</b>こともできます。
      </p>

      <div className="mt-3 min-w-0">
        <p className={`text-[11px] font-bold ${power === "on" ? "text-brand-700" : pv?.tone === "lost" ? "text-rose-700" : "text-emerald-700"}`}>
          {power === "on" ? `STEP ${idx + 1} / ${STEPS.length}` : power === "off" ? "実験：ここで電源を切ったら？" : "実験：電源を入れ直して開くと？"}
        </p>
        <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="cc-step-title">
          {power === "on"
            ? step.title
            : power === "off"
              ? pv?.tone === "lost"
                ? "保存前に電源OFF → 編集が消えた"
                : "電源OFF → 失ったものはない"
              : `ストレージから v${step.stored} を読み込み`}
        </p>
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <ComputerScene {...scene} />
      </div>

      <div
        className={`mt-3 min-h-[3.5em] rounded-xl px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 [&_b]:text-gray-900 ${
          pv?.tone === "lost" ? "bg-rose-50 ring-rose-200" : pv ? "bg-emerald-50 ring-emerald-200" : "bg-sky-50 ring-sky-200"
        }`}
        aria-live="polite"
        data-testid="cc-detail"
      >
        {pv ? pv.detail : step.detail}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={idx}
          steps={STEPS}
          playing={player.playing && power === "on"}
          reducedMotion={reducedMotion}
          onMove={move}
          onTogglePlay={() => {
            setPower("on");
            player.togglePlay();
          }}
          playLabel="データの流れを再生"
          timelineLabel="データの流れのタイムライン"
          startCaption="開く"
          endCaption="保存"
        />
      </div>

      <div className="mt-3 flex gap-2">
        {power === "on" && (
          <button
            type="button"
            onClick={powerOff}
            className={`flex-1 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 ${
              idx === EDIT_STEP ? "bg-rose-600 text-white" : "bg-white text-rose-700 ring-1 ring-rose-300"
            }`}
          >
            ⚡ 電源を切る
          </button>
        )}
        {power === "off" && (
          <button type="button" onClick={() => setPower("rebooted")} className="flex-1 rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white active:scale-95">
            🔌 電源を入れて文書を開き直す
          </button>
        )}
        {power !== "on" && (
          <button type="button" onClick={() => setPower("on")} className="flex-none rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-300 active:scale-95">
            ↩ 電源OFFの前に戻る
          </button>
        )}
      </div>
      {power === "on" && idx !== EDIT_STEP && !tried.lost && (
        <p className="mt-2 text-center text-[11px] text-gray-500">ヒント：STEP 4（メモリ上で編集）で切ると…？</p>
      )}

      {(tried.lost || tried.safe) && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="cc-insight">
          {tried.lost && tried.safe ? (
            <>
              💡 同じ「電源OFF」でも、<b>保存前</b>は編集が消え、<b>保存後</b>は残った。
              メモリは電気が無いと中身を保てない＝<b>揮発性</b>。だから「保存」でストレージ（<b>不揮発性</b>）へ移すのが大切！
            </>
          ) : tried.lost ? (
            <>💡 保存前に切ると編集が消えた。次は <b>STEP 5（保存）の後</b>に切って比べてみよう。</>
          ) : (
            <>💡 保存後なら残った。次は <b>STEP 4（保存前）</b>で切って比べてみよう。</>
          )}
        </div>
      )}
    </Panel>
  );
}

export default function ComputerCoreExperience() {
  const parts = [
    { emo: "🧠", name: "CPU", tag: "頭脳", d: "計算や判断をする処理の中心。速さは「クロック周波数（GHz）」で表す。", ex: "人（宿題をする自分）" },
    { emo: "🗒️", name: "メモリ（主記憶）", tag: "作業机", d: "今すぐ使うデータを一時的に広げる場所。速いが、電源を切ると消える。", ex: "机の広さ（RAM）" },
    { emo: "🗄️", name: "ストレージ（補助記憶）", tag: "引き出し", d: "写真・アプリ・文書を長く保存する場所。大容量だが遅い。電源を切っても残る。", ex: "本棚・引き出し（SSD/HDD）" },
  ];

  const rows = [
    { k: "役割", m: "作業机（一時置き）", s: "引き出し（長期保存）" },
    { k: "速さ", m: "速い 🚀", s: "遅い 🐢" },
    { k: "容量", m: "小さめ", s: "大きい" },
    { k: "電源を切ると", m: "消える（揮発性）", s: "残る（不揮発性）" },
    { k: "例", m: "RAM", s: "SSD・HDD" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🖥️ パソコンの中身は<b>「机で勉強する」</b>イメージ。<b>あなた＝CPU（頭脳）</b>、
        <b>机の広さ＝メモリ</b>、<b>引き出し＝ストレージ</b>。この3つの役割を分けると一気に読みやすくなります。
      </div>

      <Panel>
        <SectionTitle step={1}>3つの部品の役割</SectionTitle>
        <ul className="mt-3 space-y-2.5">
          {parts.map((p) => (
            <li key={p.name} className="flex gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-white text-2xl ring-1 ring-gray-200">
                {p.emo}
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
                <th className="px-3 py-2 text-center font-bold">🗒️ メモリ</th>
                <th className="px-3 py-2 text-center font-bold">🗄️ ストレージ</th>
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
