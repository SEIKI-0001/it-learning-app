"use client";

import { useState } from "react";
import type { NodeState } from "./network/NetworkSceneBase";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";
import { FactoryScene, STATIONS, type StationId, type SupportId } from "./valuechain/FactoryScene";

// ============================================================================
// 「バリューチェーン（価値連鎖）」専用の体験。
//   ① 工場ラインを進める … 2.5D のミニチュア企業（入荷→工場→倉庫・配送→店舗→顧客）を
//      再生すると製品が姿を変え、VALUE の柱が積み上がる（最後にコスト＋マージンへ）
//   ② 支援活動 … 同じ模型の土台（4層）を1つ止めると、影響を受ける拠点が止まる
//   ③ 「主活動？支援活動？」仕分けクイズ
// ============================================================================

// ① 主活動ライン ------------------------------------------------------------
const MAIN = [
  { emo: "📥", name: "購買物流", product: "🪵", state: "原材料が届いた", d: "原材料や部品を仕入れ、受け入れる", value: 15 },
  { emo: "🏭", name: "製造", product: "🪑", state: "製品ができた！", d: "材料を加工して製品をつくる", value: 40 },
  { emo: "📦", name: "出荷物流", product: "📦", state: "箱詰めして配送", d: "完成した製品を保管・配送する", value: 55 },
  { emo: "🛒", name: "販売・マーケティング", product: "🏷️", state: "店頭に並んだ", d: "宣伝し、顧客に売る", value: 75 },
  { emo: "🔧", name: "サービス", product: "😊", state: "顧客が満足！", d: "アフターサポートで価値を保つ", value: 90 },
];

const DELTAS = [15, 25, 15, 20, 15];
const COST = 70;
const FLOW_STEPS = [...MAIN.map((m) => ({ title: m.name })), { title: "マージン" }];

const idleStations = (): Record<StationId, NodeState> => ({
  inbound: "idle",
  operations: "idle",
  outbound: "idle",
  sales: "idle",
  service: "idle",
});

const ALL_ON: Record<SupportId, "on" | "off" | "focus"> = { infra: "on", hr: "on", tech: "on", procurement: "on" };

function MainFlow() {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(FLOW_STEPS.length, reducedMotion, 2400);
  const idx = Math.min(player.index, MAIN.length - 1);
  const cur = MAIN[idx];
  const atEnd = player.index === FLOW_STEPS.length - 1;
  const stations = idleStations();
  if (!atEnd) stations[STATIONS[idx]] = "active";

  return (
    <Panel>
      <SectionTitle step={1}>主活動 ― 工程を進めて価値を積み上げる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">主活動</b>は価値を直接生み出す流れ。いすを作る会社のミニチュアで再生して、
        <b className="text-gray-800">材料が売り物に変わっていく</b>様子を見てみよう。
      </p>

      {/* 工程チップ（模型の①〜⑤に対応） */}
      <div className="mt-3 flex gap-1">
        {MAIN.map((m, i) => (
          <div
            key={m.name}
            className={`min-w-0 flex-1 rounded-md px-0.5 py-1.5 text-center transition ${
              i === idx && !atEnd ? "bg-brand-600" : i <= idx ? "bg-brand-100" : "bg-gray-100"
            }`}
          >
            <div className={`text-[10px] font-bold leading-none ${i === idx && !atEnd ? "text-white" : "text-gray-500"}`}>{i + 1}</div>
            <div
              className={`mt-0.5 text-[9px] font-bold leading-tight ${
                i === idx && !atEnd ? "text-white" : i <= idx ? "text-brand-600" : "text-gray-400"
              }`}
            >
              {m.name.split("・")[0]}
            </div>
          </div>
        ))}
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <FactoryScene
          stations={stations}
          product={{ at: idx, emoji: cur.product, blocked: false }}
          supports={ALL_ON}
          value={{ blocks: DELTAS.slice(0, idx + 1), final: atEnd ? { cost: COST, margin: 90 - COST } : null }}
          stationNotes={{}}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* 製品の今 */}
      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-center ring-1 ring-gray-200" aria-live="polite" data-testid="vc-state">
        {atEnd ? (
          <p className="text-sm leading-relaxed text-emerald-700">
            🎉 各工程で加わった価値の合計が売値に。<b>コスト（紫）を引いて残った緑がマージン（利益）</b>です。
          </p>
        ) : (
          <>
            <div className="text-sm font-bold text-gray-800">
              {cur.product} {cur.state}
              <span className="ml-1.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[11px] text-brand-700">価値 +{DELTAS[idx]}</span>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              {cur.emo} {cur.name}：{cur.d}
            </div>
          </>
        )}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={FLOW_STEPS}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="主活動を再生"
          timelineLabel="主活動のタイムライン"
          startCaption="原材料"
          endCaption="マージン 💰"
          stepTone={(i) => (i === FLOW_STEPS.length - 1 ? "bg-emerald-500" : "bg-brand-600")}
        />
      </div>
    </Panel>
  );
}

// ② 支援活動 ----------------------------------------------------------------
const SUPPORT = [
  { emo: "🏢", name: "全般管理", d: "経営・経理・法務など全体の管理", without: "お金や契約の管理がぐちゃぐちゃに。ライン全体が混乱して止まる" },
  { emo: "👥", name: "人事・労務管理", d: "採用・教育・働く環境づくり", without: "働く人が足りず育たない。製造も販売も回らなくなる" },
  { emo: "🔬", name: "技術開発", d: "研究や新技術の開発", without: "製品が古いまま進化しない。ライバルに追い抜かれる" },
  { emo: "🛍️", name: "調達", d: "設備や資材を買い入れる活動", without: "機械も資材も届かない。ラインがそもそも動かせない" },
];

type Breakdown = {
  support: SupportId;
  stations: Partial<Record<StationId, NodeState>>;
  notes: Partial<Record<StationId, string>>;
  product: { at: number; emoji: string; blocked: boolean };
  blocks: number[];
  final: { cost: number; margin: number } | null;
};

// 支援活動を1つ止めたとき、主活動ラインに何が起きるか（因果の見え方）
const BREAKDOWN: Record<SupportId, Breakdown> = {
  procurement: {
    support: "procurement",
    stations: { inbound: "error", operations: "error", outbound: "disabled", sales: "disabled", service: "disabled" },
    notes: { inbound: "原材料が届かない", operations: "製造停止" },
    product: { at: -1, emoji: "🪵", blocked: true },
    blocks: [],
    final: null,
  },
  hr: {
    support: "hr",
    stations: { inbound: "idle", operations: "error", outbound: "disabled", sales: "error", service: "disabled" },
    notes: { operations: "作る人がいない", sales: "売る人もいない" },
    product: { at: 0, emoji: "🪵", blocked: true },
    blocks: [15],
    final: null,
  },
  tech: {
    support: "tech",
    stations: { operations: "error" },
    notes: { operations: "古い製品のまま" },
    product: { at: 4, emoji: "😐", blocked: false },
    blocks: [15, 10, 15, 20, 15],
    final: { cost: COST, margin: 5 },
  },
  infra: {
    support: "infra",
    stations: { inbound: "error", operations: "error", outbound: "error", sales: "error", service: "error" },
    notes: { outbound: "お金・契約が混乱" },
    product: { at: 2, emoji: "📦", blocked: true },
    blocks: [15, 25],
    final: null,
  },
};

const SUPPORT_ID: SupportId[] = ["infra", "hr", "tech", "procurement"];

function Support() {
  const reducedMotion = useReducedMotion();
  const [sel, setSel] = useState<number | null>(null);
  const [tried, setTried] = useState<number[]>([]);
  const off = sel === null ? null : BREAKDOWN[SUPPORT_ID[sel]];
  const stations = { ...idleStations(), ...(off?.stations ?? {}) };
  const supports = { ...ALL_ON, ...(off ? { [off.support]: "off" as const } : {}) };

  function pick(i: number) {
    setSel((cur) => (cur === i ? null : i));
    setTried((cur) => (cur.includes(i) ? cur : [...cur, i]));
  }

  return (
    <Panel>
      <SectionTitle step={2}>支援活動 ― 無くなるとラインが困る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">支援活動</b>は直接モノを作らないけれど、主活動の全工程を下から支えます。
        模型の土台（4つの層）を1つ止めて、<b className="text-gray-800">「もし無かったら」</b>を確かめてみよう。
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <FactoryScene
          stations={stations}
          product={off ? off.product : { at: 4, emoji: "😊", blocked: false }}
          supports={supports}
          value={off ? { blocks: off.blocks, final: off.final } : { blocks: DELTAS, final: { cost: COST, margin: 90 - COST } }}
          stationNotes={off?.notes ?? {}}
          reducedMotion={reducedMotion}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {SUPPORT.map((s, i) => {
          const picked = sel === i;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={picked}
              className={`rounded-xl p-3 text-left ring-2 transition active:scale-95 ${
                picked ? "bg-rose-50 ring-rose-300" : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{picked ? "🚫" : s.emo}</span>
                <span className={`text-sm font-bold ${picked ? "text-rose-700" : "text-gray-800"}`}>{s.name}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{picked ? "タップで元に戻す" : `${s.d}（止めてみる）`}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-3 min-h-[3.5em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200" aria-live="polite" data-testid="support-result">
        {sel === null ? (
          <p className="text-sm leading-relaxed text-gray-400">どれかを止めると、無くなったときの影響が模型に出ます。</p>
        ) : (
          <p className="text-sm leading-relaxed text-rose-700">
            🚫 <b>{SUPPORT[sel].name}</b>が無いと… {SUPPORT[sel].without}。
            <span className="text-gray-600">直接は作らないけれど、<b className="text-gray-800">全工程に効いている</b>のが支援活動。</span>
          </p>
        )}
      </div>
      {tried.length === SUPPORT.length && (
        <p className="mt-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200" role="status">
          💡 4つとも、止めると<b>マージン（利益）が減るか消える</b>。支援活動は価値を直接は作らないが、主活動ラインの土台です。
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 人事・技術開発・調達は「価値を直接生む流れ」ではなく、それを<b>支える</b>側＝支援活動。
        ここが主活動とよく取り違えられます。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: "主活動" | "支援活動"; why: string }[] = [
  { t: "工場で部品を組み立てて製品をつくる", ans: "主活動", why: "製造は価値を直接生む主活動。" },
  { t: "社員を採用し、研修で育てる", ans: "支援活動", why: "人事・労務管理は主活動を支える支援活動。" },
  { t: "完成した商品を店舗やお客様へ配送する", ans: "主活動", why: "出荷物流は主活動。" },
  { t: "新しい素材を研究開発する", ans: "支援活動", why: "技術開発は支援活動。" },
  { t: "広告を出して商品を売り込む", ans: "主活動", why: "販売・マーケティングは主活動。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>主活動？　支援活動？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
                {(["主活動", "支援活動"] as const).map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === q.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === q.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${q.ans}」。 `}
                  {q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function ValueChainExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔗 バリューチェーン（価値連鎖）は、会社の活動を<b>「価値を直接生む主活動」</b>と
        <b>「それを支える支援活動」</b>に分け、<b>どこに強みがあるか</b>を見える化します。
      </div>

      <MainFlow />
      <Support />
      <Quiz />
    </div>
  );
}
