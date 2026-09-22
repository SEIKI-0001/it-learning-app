"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../scene/useReducedMotion";
import { Panel, SectionTitle } from "../ui";
import { useTweenNumber } from "./useTweenNumber";

// 店長シミュレータ（因果の鎖版）。
//   施策 → KPI（リピート率）→ CSF（顧客定着）→ KGI（年間売上）を縦に並べ、施策を打つと
//   矢印が1本ずつ伸びて、その先の数字が順番に動く（影響が伝わっていく様子そのもの）。
//   CSFに効かない施策（広告・SNSフォロワー）は「それっぽい数字」だけ動き、CSFへの矢印が✕で切れる。

type Action = {
  id: string;
  emo: string;
  t: string;
  kpiUp: number; // リピート率の上昇(pt)
  hitsCsf: boolean;
  note: string;
  vanity?: { label: string; from: number; to: number; unit: string; kgi: number };
};

export const ACTIONS: Action[] = [
  { id: "name", emo: "🙋", t: "接客トレーニング（常連さんの名前を覚える）", kpiUp: 3, hitsCsf: true, note: "「自分の店」と感じてもらえてリピート率アップ！" },
  { id: "point", emo: "🎫", t: "ポイントカードを配る", kpiUp: 4, hitsCsf: true, note: "「また来る理由」ができてリピート率アップ！" },
  { id: "line", emo: "📱", t: "LINEで新作を知らせる", kpiUp: 4, hitsCsf: true, note: "来たことのある人が戻ってくるきっかけに。リピート率アップ！" },
  {
    id: "ad",
    emo: "📢",
    t: "とにかく広告で新規客を集める",
    kpiUp: 0,
    hitsCsf: false,
    note: "新規は来たけど一回きり…。成功のカギ（リピート）には効いていない。",
    vanity: { label: "新規来店（月）", from: 30, to: 60, unit: "人", kgi: 2 },
  },
  {
    id: "sns",
    emo: "✨",
    t: "SNSのフォロワー数だけ増やす",
    kpiUp: 0,
    hitsCsf: false,
    note: "数字は増えたけど、店に戻ってくる人は増えていない。売上は動かない。",
    vanity: { label: "SNSフォロワー", from: 1200, to: 2000, unit: "人", kgi: 0 },
  },
];

const KPI_START = 20;
const KPI_GOAL = 30;
const KGI_START = 100;
const KGI_GOAL = 150;
const STEP_MS = 650;

function kpiOf(used: Set<string>) {
  return ACTIONS.reduce((v, a) => (used.has(a.id) ? v + a.kpiUp : v), KPI_START);
}
function kgiOf(used: Set<string>) {
  const vanity = ACTIONS.reduce((v, a) => (used.has(a.id) && a.vanity ? v + a.vanity.kgi : v), 0);
  return KGI_START + (kpiOf(used) - KPI_START) * 5 + vanity;
}
// CSF（顧客定着）の度合い 0〜5：リピート率 20%→30% を5段階に
function csfOf(used: Set<string>) {
  return Math.max(0, Math.min(5, Math.round(((kpiOf(used) - KPI_START) / (KPI_GOAL - KPI_START)) * 5)));
}

// 伝わっていく矢印。active になった瞬間に上から下へ伸びる。broken は ✕ で途切れる。
function Link({ active, broken, label, testId }: { active: boolean; broken?: boolean; label: string; testId: string }) {
  return (
    <div className="flex h-7 items-center justify-center gap-2" data-testid={testId} data-state={broken ? "broken" : active ? "on" : "off"}>
      <div className="relative h-full w-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`absolute inset-x-0 top-0 rounded-full transition-[height] duration-500 ease-out motion-reduce:transition-none ${broken ? "bg-rose-300" : "bg-emerald-500"}`}
          style={{ height: active || broken ? (broken ? "45%" : "100%") : "0%" }}
        />
      </div>
      <span className={`text-[11px] font-bold ${broken ? "text-rose-600" : active ? "text-emerald-700" : "text-gray-400"}`}>
        {broken ? "✕ " : "↓ "}
        {label}
      </span>
    </div>
  );
}

function Bar({ value, goal, max, tone }: { value: number; goal: number; max: number; tone: string }) {
  return (
    <div className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-gray-200">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      <div className="absolute top-0 h-full w-0.5 bg-gray-500" style={{ left: `${(goal / max) * 100}%` }} />
    </div>
  );
}

function Box({ tag, tagTone, title, children, lit, testId }: { tag: string; tagTone: string; title: string; children?: React.ReactNode; lit: boolean; testId: string }) {
  return (
    <div className={`rounded-xl p-3 ring-1 transition-colors duration-300 ${lit ? "bg-white ring-2 ring-emerald-400" : "bg-gray-50 ring-gray-200"}`} data-testid={testId}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
        <span className={`flex-none whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-white ${tagTone}`}>{tag}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

export function ChainSimulator() {
  const reducedMotion = useReducedMotion();
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [prev, setPrev] = useState<Set<string>>(new Set());
  const [last, setLast] = useState<Action | null>(null);
  // 0=施策 1=KPIへ 2=CSFへ 3=KGIへ 4=完了（reduced-motion では常に 4）
  const [stage, setStage] = useState(4);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const shownStage = reducedMotion ? 4 : stage;
  const at = (s: number) => (shownStage >= s ? used : prev);
  const kpi = useTweenNumber(kpiOf(at(1)), reducedMotion);
  const csf = csfOf(at(2));
  const kgi = useTweenNumber(kgiOf(at(3)), reducedMotion);
  const vanity = last?.vanity;
  const vanityValue = useTweenNumber(vanity ? (shownStage >= 1 ? vanity.to : vanity.from) : 0, reducedMotion);

  const csfHits = ACTIONS.filter((a) => a.hitsCsf && used.has(a.id)).length;
  const vanityUsed = ACTIONS.some((a) => a.vanity && used.has(a.id));
  const showInsight = csfHits >= 2 && vanityUsed && shownStage >= 4;
  const hits = last?.hitsCsf ?? true;

  function doAction(a: Action) {
    timers.current.forEach((t) => window.clearTimeout(t));
    setPrev(used);
    setUsed(new Set(used).add(a.id));
    setLast(a);
    setStage(0);
    timers.current = [1, 2, 3, 4].map((s) => window.setTimeout(() => setStage(s), s * STEP_MS));
  }

  function reset() {
    timers.current.forEach((t) => window.clearTimeout(t));
    setUsed(new Set());
    setPrev(new Set());
    setLast(null);
    setStage(4);
  }

  return (
    <Panel>
      <SectionTitle step={1}>店長になって、ゴールまでの数字をつなげよう</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        あなたはクレープ屋の店長。<b className="text-gray-800">ゴール（KGI）＝年間売上150</b>。
        分析の結果、<b className="text-gray-800">成功のカギ（CSF）＝リピート客を増やすこと</b>と分かりました。
        施策を打つと、影響が<b className="text-gray-800">上から順に</b>伝わっていきます。
      </p>

      <div className="mt-3" data-testid="goal-chain" data-stage={shownStage}>
        {/* 施策 */}
        <Box tag="施策" tagTone="bg-gray-500" title={last ? `${last.emo} ${last.t}` : "下のボタンから施策を選ぶ"} lit={!!last && shownStage >= 0} testId="goal-action" />
        <Link active={!!last && shownStage >= 1} label={vanity ? `${vanity.label}が増える` : "リピート率が動く"} testId="goal-link-kpi" />

        {/* KPI（と、CSFにつながらない「それっぽい数字」） */}
        <div className={vanity ? "grid grid-cols-2 gap-1.5" : ""}>
          <Box tag="KPI" tagTone="bg-emerald-500" title="リピート率" lit={!!last && hits && shownStage >= 1} testId="goal-kpi">
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono text-lg font-bold text-gray-800" data-testid="goal-kpi-value">
                {Math.round(kpi)}%
              </span>
              <span className="text-[10px] font-bold text-gray-400">目標 {KPI_GOAL}%</span>
            </div>
            <Bar value={kpi} goal={KPI_GOAL} max={40} tone="bg-emerald-500" />
          </Box>
          {vanity && (
            <div className="rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200" data-testid="goal-vanity">
              <div className="text-xs font-bold text-rose-800">📈 {vanity.label}</div>
              <div className="mt-1 font-mono text-lg font-bold text-rose-700">
                {Math.round(vanityValue).toLocaleString()}
                {vanity.unit}
              </div>
              <div className="text-[10px] font-bold leading-tight text-rose-500">数字は動いた…けど？</div>
            </div>
          )}
        </div>
        <Link
          active={!!last && hits && shownStage >= 2}
          broken={!!last && !hits && shownStage >= 2}
          label={hits ? "リピート客が増える＝顧客定着が進む" : "リピート客は増えない（CSFにつながらない）"}
          testId="goal-link-csf"
        />

        {/* CSF */}
        <Box tag="CSF" tagTone="bg-amber-500" title="🗝️ 顧客定着（リピート客を増やす）" lit={!!last && hits && shownStage >= 2} testId="goal-csf">
          <div className="mt-1.5 flex items-center gap-1" data-testid="goal-csf-level" data-level={csf}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={`h-2.5 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none ${i < csf ? "bg-amber-400" : "bg-gray-200"}`} />
            ))}
            <span className="ml-1 text-[10px] font-bold text-gray-500">定着度 {csf}/5</span>
          </div>
        </Box>
        <Link active={!!last && hits && shownStage >= 3} broken={!!last && !hits && shownStage >= 3} label={hits ? "常連が増えて売上が積み上がる" : "ゴールは動かない"} testId="goal-link-kgi" />

        {/* KGI */}
        <Box tag="KGI" tagTone="bg-brand-500" title="年間売上（最終ゴール）" lit={!!last && hits && shownStage >= 3} testId="goal-kgi">
          <div className="mt-1 flex items-baseline justify-between">
            <span className={`font-mono text-lg font-bold ${kgi >= KGI_GOAL ? "text-emerald-600" : "text-gray-800"}`} data-testid="goal-kgi-value">
              {Math.round(kgi)}
              {kgi >= KGI_GOAL && " 🎉"}
            </span>
            <span className="text-[10px] font-bold text-gray-400">目標 {KGI_GOAL}</span>
          </div>
          <Bar value={kgi} goal={KGI_GOAL} max={170} tone="bg-brand-500" />
        </Box>
      </div>

      {/* 施策ボタン */}
      <p className="mt-4 text-xs font-bold text-gray-500">打てる施策（それぞれ1回）：</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {ACTIONS.map((a) => {
          const done = used.has(a.id);
          return (
            <button
              key={a.id}
              onClick={() => doAction(a)}
              disabled={done}
              className={`rounded-xl p-2.5 text-left text-xs font-bold transition active:scale-95 ${
                done ? "bg-gray-100 text-gray-400 ring-1 ring-gray-200" : "bg-white text-gray-700 ring-1 ring-gray-300"
              }`}
            >
              <span className="text-base">{a.emo}</span> {a.t}
              {done && " ✓"}
            </button>
          );
        })}
      </div>

      {/* 直前の施策の結果（伝わりきってから） */}
      {last && shownStage >= 4 && (
        <div
          className={`mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed ring-1 ${
            last.hitsCsf ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"
          }`}
          data-testid="goal-result"
        >
          {last.emo} <b>{last.t}</b> → {last.hitsCsf ? `リピート率 +${last.kpiUp}pt。` : "リピート率 ±0。"}
          {last.note}
        </div>
      )}

      {showInsight && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200">
          💡 <b>気づいた？</b>　KPIは「小さいKGI」ではなく、<b>CSF（カギ）が進んでいるかを測る数字</b>。
          CSFにつながる数字（リピート率）が動くと、KGIがついてくる。フォロワー数のように
          <b>CSFにつながらない数字は、増えてもゴールは近づかない</b>。
          だから<b>KGI（ゴール）→ CSF（カギ）→ KPI（途中の数字）</b>の順で決めるのです。
        </div>
      )}

      {used.size > 0 && (
        <button onClick={reset} className="mt-2 w-full rounded-lg py-1.5 text-xs font-bold text-gray-500 ring-1 ring-gray-300 active:scale-95">
          ↺ 最初からやり直す
        </button>
      )}

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ <b>KGI＝最終ゴール</b>、<b>KPI＝途中の進み具合</b>。この2つの取り違えが定番のひっかけ。
        CSFは「指標」ではなく「重要な要因」である点も注意。
      </p>
    </Panel>
  );
}
