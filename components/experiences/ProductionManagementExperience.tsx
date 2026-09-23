"use client";

import { useState, type ReactNode } from "react";
import styles from "./calc/calc.module.css";
import { Note, Replay } from "./calc/CalcParts";
import { useBeats } from "./calc/useBeats";
import d from "./diagram/diagram.module.css";
import { Arrow, Box, Caption, Lead, PointsPanel, Seg } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「生産管理と発注方式」。
//   ① MRP：完成品の需要 → 部品の総所要量 → 在庫を差し引く → 発注、を数字が流れる形で（段階表示）
//      40台 × 3本 ＝ 120本、在庫25本を引いて 95本（確認問題と同じ数字）
//   ② 在庫の動き：定量発注／定期発注を切り替え、30日分の在庫グラフが左から右へ進む（軽いアニメ）
//      在庫が減る → 発注点を切る（定量）／決まった日が来る（定期）→ 調達期間のあと補充 → 安全在庫で品切れを防ぐ
//   ③ 2方式の比較（静的）
//   ④ 試験ポイント

export default function ProductionManagementExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        🏭 「何台作るか」が決まると、<b>必要な部品の数</b>が決まり、<b>手元の在庫を引いた分だけ</b>発注します。そのあと在庫を切らさないための発注のしかたを見ます。
      </Lead>
      <MrpPanel />
      <InventoryPanel />
      <ComparePanel />
      <PointsPanel
        step={4}
        points={[
          <>MRP：製品の生産数 × 1台あたりの部品数 ＝ 総所要量、そこから<b>在庫を引いた分</b>を発注</>,
          <>定量発注＝<b>発注点</b>を切ったら<b>毎回同じ量</b>／定期発注＝<b>決まった日</b>に<b>毎回計算した量</b></>,
          <>安全在庫＝需要のぶれ・納入の遅れに備える<b>余分な在庫</b></>,
        ]}
        traps={[
          ["在庫を足して発注量を求める", "発注量＝総所要量 − 使える在庫（引き算）"],
          ["定量発注は決まった日に発注する", "決まった日に発注するのは定期発注。定量は発注点で発注する"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① MRP
// ---------------------------------------------------------------------------

const MRP_DELAYS = [900, 1100, 1300, 1200];

function MrpPanel() {
  const { ref, beat, reducedMotion, replay } = useBeats(5, MRP_DELAYS);
  const on = (n: number) => (beat >= n ? styles.reveal : "invisible");
  return (
    <Panel>
      <SectionTitle step={1}>MRP ― 需要から発注量を逆算する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">いすを<b className="text-gray-800">40台</b>作ります。いす1台に<b className="text-gray-800">脚の部品が3本</b>（部品表）。</p>

      <div ref={ref} className="mt-3 space-y-0.5" data-testid="prod-mrp" data-beat={beat}>
        <div className={on(1)}>
          <Row label="① 需要" sub="生産計画">
            <Box tone="soft">🪑 いす 40台</Box>
          </Row>
        </div>
        <div className={on(2)}>
          <Arrow label="× 1台あたり3本（部品表）" tone="brand" />
          <Row label="② 総所要量" sub="部品の総数">
            <Box tone="soft">40 × 3 ＝ <b>120本</b></Box>
          </Row>
        </div>
        <div className={on(3)}>
          <Arrow label="− 倉庫にある使える在庫" tone="brand" />
          <Row label="③ 在庫差引" sub="足りない分だけ">
            <div className="flex h-9 overflow-hidden rounded-lg ring-1 ring-gray-300" aria-label="120本のうち25本は在庫、95本が不足">
              <div className="grid w-[21%] place-items-center bg-gray-200 text-[11px] font-bold text-gray-600">在庫25</div>
              <div className="grid flex-1 place-items-center bg-brand-500 text-[13px] font-bold text-white">不足 95本</div>
            </div>
          </Row>
        </div>
        <div className={on(4)}>
          <Arrow label="調達期間を見込んで時期も決める" tone="brand" />
          <Row label="④ 発注" sub="数量と時期">
            <Box tone="ok" testId="prod-mrp-answer">
              120 − 25 ＝ <b>95本</b>を発注
            </Box>
          </Row>
        </div>
      </div>
      {beat >= 4 && <Note>💡 在庫は<b>引く</b>。「必要な数 − 手元にある数 ＝ 注文する数」です。</Note>}
      <Replay onClick={replay} hidden={reducedMotion} />
    </Panel>
  );
}

function Row({ label, sub, children }: { label: string; sub: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-[5.2rem] flex-none">
        <div className="text-[13px] font-bold text-gray-800">{label}</div>
        <div className="text-[11px] text-gray-500">{sub}</div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ② 在庫の動き（定量発注／定期発注）
// ---------------------------------------------------------------------------

type Mode = "fixedQty" | "fixedTime";
type Sim = { pts: [number, number][]; orders: { day: number; qty: number }[]; arrivals: { day: number; low: number }[] };

// 30日分の1日ごとの使用量（平均およそ10個）
const DEMAND = [9, 11, 10, 12, 8, 10, 13, 9, 10, 11, 12, 10, 8, 9, 14, 11, 10, 9, 12, 10, 11, 8, 10, 13, 12, 9, 10, 11, 10, 9];
const DAYS = DEMAND.length;
const LEAD = 3; // 調達期間（日）
const SAFETY = 20; // 安全在庫
const ORDER_POINT = 10 * LEAD + SAFETY; // 発注点 ＝ 1日の使用量 × 調達期間 ＋ 安全在庫 ＝ 50
const ORDER_QTY = 70; // 定量発注の1回の量
const CYCLE = 10; // 定期発注の間隔（日）
const FIRST = 4;
const TARGET = 150; // 定期発注で補充する目標（次の発注＋調達期間の使用量＋安全在庫）

export function simulate(mode: Mode): Sim {
  let stock = 100;
  const pending: { day: number; qty: number }[] = [];
  const pts: [number, number][] = [[0, stock]];
  const orders: Sim["orders"] = [];
  const arrivals: Sim["arrivals"] = [];
  for (let day = 0; day < DAYS; day++) {
    for (const p of pending.filter((q) => q.day === day)) {
      pts.push([day, stock]);
      arrivals.push({ day, low: stock });
      stock += p.qty;
      pts.push([day, stock]);
      pending.splice(pending.indexOf(p), 1);
    }
    stock -= DEMAND[day];
    pts.push([day + 1, stock]);
    const today = day + 1;
    if (mode === "fixedQty" && stock <= ORDER_POINT && pending.length === 0) {
      orders.push({ day: today, qty: ORDER_QTY });
      pending.push({ day: today + LEAD, qty: ORDER_QTY });
    }
    if (mode === "fixedTime" && today >= FIRST && (today - FIRST) % CYCLE === 0) {
      const qty = TARGET - stock - pending.reduce((a, p) => a + p.qty, 0);
      orders.push({ day: today, qty });
      pending.push({ day: today + LEAD, qty });
    }
  }
  return { pts, orders, arrivals };
}

const SIMS: Record<Mode, Sim> = { fixedQty: simulate("fixedQty"), fixedTime: simulate("fixedTime") };
const GX0 = 30;
const GW = 224;
const GY0 = 146;
const DUR = 3600;
const gx = (day: number) => GX0 + (day / DAYS) * GW;
const gy = (v: number) => GY0 - v;

function InventoryPanel() {
  const [mode, setMode] = useState<Mode>("fixedQty");
  const [run, setRun] = useState(0);
  const { ref, beat, reducedMotion, replay } = useBeats(2, [DUR]);
  const sim = SIMS[mode];
  const pick = (m: Mode) => {
    setMode(m);
    setRun((r) => r + 1);
    replay();
  };
  const playing = !reducedMotion;
  const at = (day: number) => ({ animationDelay: `${(day / DAYS) * DUR}ms` });
  return (
    <Panel>
      <SectionTitle step={2}>在庫が減る → 発注 → 補充</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        毎日およそ10個ずつ使う部品の、30日間の在庫です。発注してから届くまで<b className="text-gray-800">3日</b>かかります。
      </p>
      <div className="mt-3">
        <Seg
          testId="prod-mode"
          value={mode}
          onChange={pick}
          options={[
            { value: "fixedQty", label: "定量発注方式" },
            { value: "fixedTime", label: "定期発注方式" },
          ]}
        />
      </div>

      <div ref={ref} className="mt-2" data-testid="prod-inventory" data-mode={mode} data-beat={beat}>
        <svg key={`${mode}-${run}`} viewBox="0 0 300 186" className="w-full" role="img" aria-label={mode === "fixedQty" ? "定量発注：在庫が発注点50を切るたびに毎回70個を発注" : "定期発注：10日ごとに、その時の在庫から計算した量を発注"}>
          <defs>
            <clipPath id={`prod-clip-${mode}`}>
              <rect x={GX0} y="0" width={GW + 4} height="186" className={playing ? d.wipe : undefined} style={{ ["--dur" as string]: `${DUR}ms` }} />
            </clipPath>
          </defs>
          {/* 目盛り */}
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={GX0} x2={GX0 + GW} y1={gy(v)} y2={gy(v)} className="stroke-gray-200" />
              <text x={GX0 - 4} y={gy(v) + 4} textAnchor="end" fontSize="11" className="fill-gray-500">
                {v}
              </text>
            </g>
          ))}
          <text x="2" y="12" fontSize="11" className="fill-gray-500">在庫(個)</text>
          {/* 安全在庫 */}
          <rect x={GX0} y={gy(SAFETY)} width={GW} height={SAFETY} className="fill-amber-100" />
          <text x={GX0 + GW + 4} y={gy(SAFETY) + 8} fontSize="11" className="fill-amber-800 font-bold">
            安全
          </text>
          <text x={GX0 + GW + 4} y={gy(SAFETY) + 21} fontSize="11" className="fill-amber-800 font-bold">
            在庫
          </text>
          {/* 発注点（定量のみ） */}
          {mode === "fixedQty" && (
            <g>
              <line x1={GX0} x2={GX0 + GW} y1={gy(ORDER_POINT)} y2={gy(ORDER_POINT)} className="stroke-rose-400" strokeDasharray="5 3" strokeWidth="1.5" />
              <text x={GX0 + GW + 4} y={gy(ORDER_POINT) - 2} fontSize="11" className="fill-rose-700 font-bold">
                発注点
              </text>
              <text x={GX0 + GW + 4} y={gy(ORDER_POINT) + 11} fontSize="11" className="fill-rose-700 font-bold">
                {ORDER_POINT}
              </text>
            </g>
          )}
          {/* 在庫の線（左から右へ進む） */}
          <g clipPath={`url(#prod-clip-${mode})`}>
            <polyline points={sim.pts.map(([x, v]) => `${gx(x)},${gy(v)}`).join(" ")} className="fill-none stroke-brand-600" strokeWidth="2.2" strokeLinejoin="round" />
            {/* 最初の補充にだけ名前を付ける（形が同じなので2回目以降は線で読める） */}
            <text x={gx(sim.arrivals[0].day) + 3} y={gy(sim.arrivals[0].low) + 2} fontSize="11" className="fill-emerald-700 font-bold">
              ↑届いて補充
            </text>
          </g>
          {/* 発注のタイミング（x軸の下） */}
          <line x1={GX0} x2={GX0 + GW} y1={GY0} y2={GY0} className="stroke-gray-400" />
          {sim.orders.map((o) => (
            <g key={o.day} className={playing ? d.mark : undefined} style={playing ? at(o.day) : undefined}>
              <path d={`M${gx(o.day)} ${GY0 + 3} l-5 8 h10 z`} className="fill-rose-500" />
              <text x={gx(o.day)} y={GY0 + 24} textAnchor="middle" fontSize="11" className="fill-rose-700 font-bold">
                {o.qty}個
              </text>
            </g>
          ))}
          <text x={GX0 - 4} y={GY0 + 24} textAnchor="end" fontSize="11" className="fill-gray-500">
            発注
          </text>
          <text x={GX0 + GW} y={GY0 + 38} textAnchor="end" fontSize="11" className="fill-gray-400">
            → 30日
          </text>
        </svg>

        <div className="mt-1 grid grid-cols-2 gap-1.5 text-center" data-testid="prod-rule">
          <div className="rounded-lg bg-gray-50 px-1 py-1.5 ring-1 ring-gray-200">
            <Caption>いつ発注？</Caption>
            <div className="text-[13px] font-bold text-gray-800">{mode === "fixedQty" ? "発注点を切ったとき（不定期）" : `${CYCLE}日ごと（決まった日）`}</div>
          </div>
          <div className="rounded-lg bg-gray-50 px-1 py-1.5 ring-1 ring-gray-200">
            <Caption>何個？</Caption>
            <div className="text-[13px] font-bold text-gray-800">
              {mode === "fixedQty" ? `毎回同じ ${ORDER_QTY}個` : `毎回計算（${sim.orders.map((o) => o.qty).join("・")}）`}
            </div>
          </div>
        </div>
        {beat >= 1 && (
          <Note>
            {mode === "fixedQty" ? (
              <>
                💡 ▲の<b>間隔はばらばら</b>、でも<b>量は毎回同じ</b>。発注点 ＝ 1日の使用量10 × 調達期間3日 ＋ 安全在庫20 ＝ <b>50</b>。届くまでの3日分を残して発注します。
              </>
            ) : (
              <>
                💡 ▲は<b>10日おきに等間隔</b>、でも<b>量は毎回ちがう</b>。その日の在庫を見て「次の補充まで足りる量」を計算します。
              </>
            )}
          </Note>
        )}
        <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
          ※ 使う量が多い日が続くと、補充の直前に在庫が<span className="font-bold text-amber-800">安全在庫</span>まで食い込みます。この余分があるから品切れしません。
        </p>
        <Replay onClick={() => pick(mode)} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 比較
// ---------------------------------------------------------------------------

const COMPARE = [
  { k: "発注する時", q: "在庫が発注点まで減ったとき", t: "毎週・毎月など決まった日" },
  { k: "発注する量", q: "毎回同じ（一定量）", t: "毎回、需要予測と在庫から計算" },
  { k: "向く品目", q: "安くて、使う量が安定した部品", t: "高価・重要で、在庫を細かく管理したい品" },
];

function ComparePanel() {
  return (
    <Panel>
      <SectionTitle step={3}>2つの方式を並べる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">「何が一定か」で見分けます。<b className="text-gray-800">名前に入っている方が固定</b>です。</p>
      <div className="mt-3 grid grid-cols-[4.2rem_1fr_1fr] gap-1 text-[12px]" data-testid="prod-compare">
        <div />
        <div className="rounded-lg bg-brand-600 py-1 text-center text-[13px] font-bold text-white">定量発注</div>
        <div className="rounded-lg bg-gray-700 py-1 text-center text-[13px] font-bold text-white">定期発注</div>
        {COMPARE.map((r, i) => (
          <div key={r.k} className="contents">
            <div className="grid place-items-center rounded-lg bg-gray-100 px-1 text-center font-bold text-gray-600">{r.k}</div>
            <div className={`rounded-lg px-1.5 py-1.5 leading-snug ring-1 ${i === 1 ? "bg-brand-50 font-bold text-brand-900 ring-brand-300" : "bg-white text-gray-700 ring-gray-200"}`}>{r.q}</div>
            <div className={`rounded-lg px-1.5 py-1.5 leading-snug ring-1 ${i === 0 ? "bg-gray-100 font-bold text-gray-900 ring-gray-400" : "bg-white text-gray-700 ring-gray-200"}`}>{r.t}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
        💡 定<b className="text-gray-800">量</b>＝量が固定、定<b className="text-gray-800">期</b>＝時期が固定。濃い枠が「固定されている方」です。
      </p>
    </Panel>
  );
}
