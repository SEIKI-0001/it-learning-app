"use client";

import { useState, type ReactNode } from "react";
import { ArchDioramaScene, type ArchMode } from "./arch/ArchDioramaScene";
import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";

// 「処理形態とシステム構成」。1枚に詰め込まず、観点（軸）ごとに分ける。
//   ① 処理タイミング：バッチ（ためて月末にまとめて）／リアルタイム（来たらすぐ）を時間軸で
//   ② 接続形態：オンライン／オフラインは①と別の軸 → 2×2 で組み合わせの例
//   ③ 処理場所（集中／分散）と役割分担（クライアントサーバ／三層／P2P）：コンビニチェーンの3D模型で方式を切り替える
//   ④ 場面から見分ける：問題文のキーワード → どの軸の、どの方式か
//   ⑤ 試験ポイント

export default function ProcessingArchitectureExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        この単元の用語は、<b>4つの別々の軸</b>の答えです。「いつ処理する？」「回線につなぐ？」「どこで処理する？」「役割をどう分ける？」――1枚ずつ見ていきます。
      </Lead>
      <TimingPanel />
      <ConnectionPanel />
      <ChainPanel />
      <ScenePanel />
      <PointsPanel
        step={5}
        points={[
          <>バッチ／リアルタイム＝<b>いつ</b>処理するか（まとめて後で／制限時間内にすぐ）</>,
          <>オンライン／オフライン＝回線に<b>つなぐか</b>。タイミングと組み合わせられる</>,
          <>集中／分散＝<b>どこで</b>処理するか、クライアントサーバ・三層・P2P＝<b>役割の分け方</b></>,
        ]}
        traps={[
          ["オンラインなら必ず1台に集中する", "オンラインは接続の話。集中か分散かは別の軸"],
          ["リアルタイム＝ただ速い処理", "発生したときに、制限時間内に応答する処理"],
        ]}
      />
    </div>
  );
}

function AxisBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[11px] font-bold text-white">軸：{children}</span>;
}

// ---------------------------------------------------------------------------
// ① 処理タイミング
// ---------------------------------------------------------------------------

const EVENTS = [2, 5, 9, 13, 16, 20, 24, 27];
const TX0 = 64;
const TW = 226;
const tday = (d: number) => TX0 + (d / 31) * TW;

function TimingPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>いつ処理する？ ― バッチ／リアルタイム</SectionTitle>
      <div className="mt-2">
        <AxisBadge>処理タイミング</AxisBadge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">1か月の間に、データ（●）が発生します。処理（▼）はいつ行われる？</p>
      <svg viewBox="0 0 300 150" className="mt-2 w-full mx-auto max-w-md" role="img" aria-label="バッチはデータをためて月末にまとめて処理し、リアルタイムはデータが来るたびにすぐ処理する" data-testid="arch-timing">
        {/* バッチ */}
        <text x="4" y="40" fontSize="12" className="fill-gray-800 font-bold">バッチ</text>
        <line x1={TX0} x2={TX0 + TW} y1="40" y2="40" className="stroke-gray-300" strokeWidth="2" />
        {EVENTS.map((d) => (
          <circle key={d} cx={tday(d)} cy="40" r="4" className="fill-gray-500" />
        ))}
        <path d={`M${tday(3)} 28 Q ${tday(17)} 12 ${tday(30)} 26`} className="fill-none stroke-gray-400" strokeDasharray="3 3" />
        <text x={tday(15)} y="14" textAnchor="middle" fontSize="11" className="fill-gray-500">ためておく</text>
        <path d={`M${tday(31)} 50 l-6 -9 h12 z`} className="fill-brand-600" transform={`translate(0 6)`} />
        <text x={tday(31)} y="72" textAnchor="end" fontSize="11" className="fill-brand-700 font-bold">月末にまとめて処理</text>

        {/* リアルタイム */}
        <text x="4" y="112" fontSize="12" className="fill-gray-800 font-bold">リアル</text>
        <text x="4" y="126" fontSize="12" className="fill-gray-800 font-bold">タイム</text>
        <line x1={TX0} x2={TX0 + TW} y1="112" y2="112" className="stroke-gray-300" strokeWidth="2" />
        {EVENTS.map((d) => (
          <g key={d}>
            <circle cx={tday(d)} cy="112" r="4" className="fill-gray-500" />
            <path d={`M${tday(d)} 128 l-5 -8 h10 z`} className="fill-brand-600" />
          </g>
        ))}
        <text x={TX0 + TW} y="144" textAnchor="end" fontSize="11" className="fill-brand-700 font-bold">来るたびに、すぐ処理</text>
      </svg>
      <div className="mt-1 grid grid-cols-2 gap-1.5 text-[12px]">
        <div className="rounded-lg bg-gray-50 px-2 py-1.5 ring-1 ring-gray-200">
          <b className="text-gray-800">バッチ</b>
          <div className="text-gray-600">例：月末の給与計算、夜間の売上集計</div>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-1.5 ring-1 ring-gray-200">
          <b className="text-gray-800">リアルタイム</b>
          <div className="text-gray-600">例：座席予約、機器の制御</div>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 接続形態（2×2）
// ---------------------------------------------------------------------------

const GRID: { on: boolean; rt: boolean; ex: string }[] = [
  { on: true, rt: false, ex: "ネットで受けた注文を、夜間にまとめて集計" },
  { on: true, rt: true, ex: "座席予約。選んだ瞬間に確定し、空席表示も更新" },
  { on: false, rt: false, ex: "店舗のデータをUSBで持ち帰り、月末に処理" },
  { on: false, rt: true, ex: "通信しない家電の中で、温度をすぐ制御" },
];

function ConnectionPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>回線につなぐ？ ― オンライン／オフライン</SectionTitle>
      <div className="mt-2">
        <AxisBadge>接続形態</AxisBadge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ①とは<b className="text-gray-800">別の軸</b>なので、掛け合わせられます。縦＝接続、横＝タイミング。
      </p>
      <div className="mt-3 grid grid-cols-[3.6rem_1fr_1fr] gap-1" data-testid="arch-grid">
        <div />
        <div className="rounded-md bg-gray-200 py-1 text-center text-[12px] font-bold text-gray-700">バッチ</div>
        <div className="rounded-md bg-gray-200 py-1 text-center text-[12px] font-bold text-gray-700">リアルタイム</div>
        {[true, false].map((on) => (
          <div key={String(on)} className="contents">
            <div className={`grid place-items-center rounded-md px-0.5 text-center text-[12px] font-bold ${on ? "bg-brand-600 text-white" : "bg-gray-600 text-white"}`}>
              {on ? "オンライン" : "オフライン"}
            </div>
            {GRID.filter((g) => g.on === on).map((g) => (
              <div key={g.ex} className={`rounded-lg px-1.5 py-1.5 text-[12px] leading-snug ring-1 ${g.on && g.rt ? "bg-brand-50 font-bold text-brand-900 ring-brand-300" : "bg-white text-gray-700 ring-gray-200"}`}>
                <div className="mb-0.5 text-[11px] font-bold text-gray-500">
                  {on ? "オンライン" : "オフライン"}
                  {g.rt ? "リアルタイム" : "バッチ"}
                </div>
                {g.ex}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600"><InlineIcon name="lightbulb" />試験に出やすいのは<b className="text-gray-800">オンラインリアルタイム（座席予約・銀行ATM）</b>と<b className="text-gray-800">バッチ（給与計算）</b>。</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ どこで処理する？＋役割をどう分ける？（コンビニチェーンの模型）
// ---------------------------------------------------------------------------

const MODES: { key: ArchMode; label: string; axis: "処理場所" | "役割分担"; result: ReactNode }[] = [
  { key: "central", label: "集中処理", axis: "処理場所", result: <>全店のデータが<b>本部の1台</b>に集まって処理されます。管理はしやすいけれど、本部が止まると全店が止まります。</> },
  { key: "distributed", label: "分散処理", axis: "処理場所", result: <>各店の<b>小さなサーバ</b>がそれぞれ処理し、必要なときだけ連携します。1台止まっても他の店は動きますが、管理は複雑です。</> },
  { key: "cs", label: "クライアントサーバ", axis: "役割分担", result: <>店の端末（<b>クライアント＝頼む側</b>）が本部の<b>サーバ（応える側）</b>に依頼し、結果が返ってきます。</> },
  { key: "three", label: "三層", axis: "役割分担", result: <>①<b>表示</b>（店の端末のブラウザ）→ ②<b>業務処理</b>（APサーバ）→ ③<b>データ</b>（DB）の3つの層に分けて往復します。</> },
  { key: "p2p", label: "P2P", axis: "役割分担", result: <>専用のサーバを使わず、<b>端末どうしが対等</b>に直接やり取りします。どの端末も提供も利用もします。</> },
];

function ChainPanel() {
  const [mode, setMode] = useState<ArchMode | null>(null);
  const [runKey, setRunKey] = useState(0);
  const reducedMotion = useReducedMotion();
  const m = MODES.find((x) => x.key === mode) ?? null;
  const pick = (key: ArchMode) => {
    setMode(key);
    setRunKey((k) => k + 1);
  };
  const group = (axis: "処理場所" | "役割分担") => (
    <div>
      <AxisBadge>{axis === "役割分担" ? "役割分担（システム構成）" : axis}</AxisBadge>
      <div className={`mt-1.5 grid gap-1.5 ${axis === "処理場所" ? "grid-cols-2" : "grid-cols-[1.5fr_1fr_1fr]"}`}>
        {MODES.filter((x) => x.axis === axis).map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => pick(x.key)}
            aria-pressed={mode === x.key}
            className={`rounded-lg px-1 py-2 text-[12px] font-bold leading-tight transition active:scale-95 ${
              mode === x.key ? "bg-brand-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <Panel>
      <SectionTitle step={3}>どこで処理する？ 役割をどう分ける？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        コンビニチェーンの本部と4つの店です。方式を選ぶと、<b className="text-gray-800">どのコンピュータが処理し、データがどう動くか</b>が見えます。
      </p>
      <div className="mt-3 space-y-2" data-testid="arch-modes">
        {group("処理場所")}
        {group("役割分担")}
      </div>
      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <ArchDioramaScene mode={mode} runKey={runKey} reducedMotion={reducedMotion} />
      </div>
      {m && (
        <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-200 [&_b]:text-gray-900" data-testid="arch-result">
          <b>{m.label}</b>：{m.result}
        </p>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ 場面から見分ける
// ---------------------------------------------------------------------------

const SCENES = [
  { scene: "月末に勤怠をまとめて給与計算", axis: "タイミング", ans: "バッチ処理" },
  { scene: "座席を選んだ瞬間に確定・空席更新", axis: "接続×タイミング", ans: "オンラインリアルタイム" },
  { scene: "画面・業務ルール・DBを分けて構成", axis: "役割分担", ans: "三層システム" },
  { scene: "サーバなしで端末同士がファイル共有", axis: "役割分担", ans: "P2P" },
];

function ScenePanel() {
  return (
    <Panel>
      <SectionTitle step={4}>問題文から見分ける</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">まず「どの軸の話か」を決めてから、方式を選びます。</p>
      <div className="mt-3 space-y-1.5" data-testid="arch-scenes">
        {SCENES.map((s) => (
          <div key={s.scene} className="rounded-xl bg-white p-2 ring-1 ring-gray-200">
            <div className="text-[13px] text-gray-700">「{s.scene}」</div>
            <div className="mt-1 flex items-center gap-1.5">
              <Caption>{s.axis}</Caption>
              <span className="text-gray-400" aria-hidden>→</span>
              <span className="rounded-md bg-brand-600 px-2 py-0.5 text-[13px] font-bold text-white">{s.ans}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
