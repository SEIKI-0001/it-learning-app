"use client";

import type { ReactNode } from "react";
import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「処理形態とシステム構成」。1枚に詰め込まず、観点（軸）ごとに1枚ずつ分ける。すべて静的。
//   ① 処理タイミング：バッチ（ためて月末にまとめて）／リアルタイム（来たらすぐ）を時間軸で
//   ② 接続形態：オンライン／オフラインは①と別の軸 → 2×2 で組み合わせの例
//   ③ 処理場所：集中処理／分散処理
//   ④ 役割分担：クライアントサーバ／三層／P2P のミニ構成図
//   ⑤ 場面から見分ける：問題文のキーワード → どの軸の、どの方式か
//   ⑥ 試験ポイント

export default function ProcessingArchitectureExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        🧩 この単元の用語は、<b>4つの別々の軸</b>の答えです。「いつ処理する？」「回線につなぐ？」「どこで処理する？」「役割をどう分ける？」――1枚ずつ見ていきます。
      </Lead>
      <TimingPanel />
      <ConnectionPanel />
      <PlacePanel />
      <RolesPanel />
      <ScenePanel />
      <PointsPanel
        step={6}
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
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">💡 試験に出やすいのは<b className="text-gray-800">オンラインリアルタイム（座席予約・銀行ATM）</b>と<b className="text-gray-800">バッチ（給与計算）</b>。</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 処理場所
// ---------------------------------------------------------------------------

function Node({ x, y, label, main }: { x: number; y: number; label: string; main?: boolean }) {
  return (
    <g>
      <rect x={x - 20} y={y - 11} width="40" height="22" rx="4" className={main ? "fill-brand-600" : "fill-white stroke-gray-400"} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="11" className={main ? "fill-white font-bold" : "fill-gray-700 font-bold"}>
        {label}
      </text>
    </g>
  );
}

function PlacePanel() {
  return (
    <Panel>
      <SectionTitle step={3}>どこで処理する？ ― 集中／分散</SectionTitle>
      <div className="mt-2">
        <AxisBadge>処理場所</AxisBadge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="arch-place">
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <div className="text-[13px] font-bold text-gray-800">集中処理</div>
          <svg viewBox="0 0 140 96" className="mt-1 w-full mx-auto max-w-[14rem]" role="img" aria-label="本部の1台がすべての店の処理をする">
            {[
              [22, 16],
              [118, 16],
              [22, 80],
              [118, 80],
            ].map(([x, y], i) => (
              <line key={i} x1={x} y1={y} x2="70" y2="48" className="stroke-gray-400" />
            ))}
            <Node x={70} y={48} label="本部" main />
            <Node x={22} y={16} label="店" />
            <Node x={118} y={16} label="店" />
            <Node x={22} y={80} label="店" />
            <Node x={118} y={80} label="店" />
          </svg>
          <p className="mt-1 text-[12px] leading-snug text-gray-600">1か所に集めて処理。管理しやすいが、本部が止まると全部止まる。</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <div className="text-[13px] font-bold text-gray-800">分散処理</div>
          <svg viewBox="0 0 140 96" className="mt-1 w-full mx-auto max-w-[14rem]" role="img" aria-label="各店のコンピュータがそれぞれ処理し、必要なときだけ連携する">
            <line x1="22" y1="16" x2="118" y2="16" className="stroke-gray-300" strokeDasharray="3 3" />
            <line x1="22" y1="80" x2="118" y2="80" className="stroke-gray-300" strokeDasharray="3 3" />
            <line x1="22" y1="16" x2="22" y2="80" className="stroke-gray-300" strokeDasharray="3 3" />
            <line x1="118" y1="16" x2="118" y2="80" className="stroke-gray-300" strokeDasharray="3 3" />
            <Node x={22} y={16} label="店" main />
            <Node x={118} y={16} label="店" main />
            <Node x={22} y={80} label="店" main />
            <Node x={118} y={80} label="店" main />
          </svg>
          <p className="mt-1 text-[12px] leading-snug text-gray-600">複数に分けて処理。1台止まっても他は動くが、管理は複雑。</p>
        </div>
      </div>
      <p className="mt-2 text-[12px] text-gray-500">青い箱＝処理をしているコンピュータ</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 役割分担
// ---------------------------------------------------------------------------

function RoleCard({ name, desc, children }: { name: string; desc: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
      <div className="w-[7.5rem] flex-none">{children}</div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-gray-800">{name}</div>
        <div className="text-[12px] leading-snug text-gray-600">{desc}</div>
      </div>
    </div>
  );
}

function RolesPanel() {
  return (
    <Panel>
      <SectionTitle step={4}>役割をどう分ける？</SectionTitle>
      <div className="mt-2">
        <AxisBadge>役割分担（システム構成）</AxisBadge>
      </div>
      <div className="mt-3 space-y-2" data-testid="arch-roles">
        <RoleCard name="クライアントサーバ" desc={<>頼む側（クライアント）と、応える側（サーバ）に分ける</>}>
          <svg viewBox="0 0 120 70" className="w-full" role="img" aria-label="3台のクライアントが1台のサーバに依頼する">
            {[14, 35, 56].map((y) => (
              <g key={y}>
                <line x1="36" y1={y} x2="84" y2="35" className="stroke-gray-400" markerEnd="url(#arch-arrow)" />
                <rect x="2" y={y - 8} width="34" height="16" rx="3" className="fill-white stroke-gray-400" />
                <text x="19" y={y + 4} textAnchor="middle" fontSize="11" className="fill-gray-700 font-bold">PC</text>
              </g>
            ))}
            <rect x="84" y="20" width="34" height="30" rx="4" className="fill-brand-600" />
            <text x="101" y="39" textAnchor="middle" fontSize="11" className="fill-white font-bold">サーバ</text>
            <defs>
              <marker id="arch-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0 0 L6 3 L0 6 z" className="fill-gray-400" />
              </marker>
            </defs>
          </svg>
        </RoleCard>
        <RoleCard name="三層システム" desc={<>表示・業務の処理・データの<b>3つの層</b>に分ける</>}>
          <div className="space-y-0.5 text-center text-[11px] font-bold">
            <div className="rounded bg-brand-100 py-0.5 text-brand-900">表示（ブラウザ）</div>
            <div className="rounded bg-brand-400 py-0.5 text-white">業務処理（AP）</div>
            <div className="rounded bg-brand-700 py-0.5 text-white">データ（DB）</div>
          </div>
        </RoleCard>
        <RoleCard name="P2P" desc={<>専用サーバなし。どの端末も<b>対等</b>に、提供も利用もする</>}>
          <svg viewBox="0 0 120 70" className="w-full" role="img" aria-label="4台の端末が互いに直接つながる">
            {[
              [20, 14, 100, 14],
              [20, 56, 100, 56],
              [20, 14, 20, 56],
              [100, 14, 100, 56],
              [20, 14, 100, 56],
              [100, 14, 20, 56],
            ].map(([a, b, c, d], i) => (
              <line key={i} x1={a} y1={b} x2={c} y2={d} className="stroke-brand-300" strokeWidth="1.5" />
            ))}
            {[
              [20, 14],
              [100, 14],
              [20, 56],
              [100, 56],
            ].map(([x, y], i) => (
              <g key={i}>
                <rect x={x - 17} y={y - 8} width="34" height="16" rx="3" className="fill-white stroke-brand-500" />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="11" className="fill-brand-800 font-bold">PC</text>
              </g>
            ))}
          </svg>
        </RoleCard>
      </div>
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
      <SectionTitle step={5}>問題文から見分ける</SectionTitle>
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
