"use client";

import type { ReactNode } from "react";
import { Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「システム性能の指標」。公式だけを置かず、どの指標も
//   何を求める → 何と何を使って求める → 数値例 → 答え の順に読む（Steps）。
//   ① レスポンスタイム／ターンアラウンドタイム：公式ではなく時間軸（操作 → 最初の応答 → すべて完了）で測る範囲を示す
//   ② スループット：処理件数 ÷ 時間（5分で1,000件 → 200件/分）
//   ③ ボトルネック：いちばん遅い部分が全体の処理量を決める（最小を探す）＋ベンチマーク
//   ④ 試験ポイント

function Steps({ rows, testId }: { rows: [string, ReactNode][]; testId?: string }) {
  return (
    <dl className="mt-3 divide-y divide-gray-100 rounded-xl ring-1 ring-gray-200" data-testid={testId}>
      {rows.map(([k, v], i) => (
        <div key={k} className="grid grid-cols-[5.5rem_1fr] gap-2 px-3 py-2 sm:grid-cols-[7rem_1fr]">
          <dt className="flex items-start gap-1.5 text-[12px] font-bold text-gray-500">
            <span className="mt-px grid h-4 w-4 flex-none place-items-center rounded-full bg-gray-900 text-[9px] text-white">{i + 1}</span>
            {k}
          </dt>
          <dd className="text-[15px] leading-relaxed text-gray-900 [&_b]:font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 時間軸：0秒で操作 → 0.8秒で最初の応答 → 3秒ですべて完了 */
function TimeAxis() {
  const W = 300;
  const x = (s: number) => 40 + (s / 3) * 220;
  return (
    <svg viewBox={`0 0 ${W} 132`} className="mx-auto mt-3 block w-full max-w-md" role="img" aria-label="0秒で検索ボタンを押し、0.8秒で最初の結果が出て、3秒ですべての結果が出そろう。0から0.8秒がレスポンスタイム、0から3秒がターンアラウンドタイム" data-testid="perf-timeline">
      <defs>
        <marker id="perf-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="#6b7280" />
        </marker>
      </defs>
      <line x1={x(0)} y1={40} x2={x(3) + 14} y2={40} stroke="#6b7280" strokeWidth={1.5} markerEnd="url(#perf-arrow)" />
      {[
        { s: 0, top: "操作", sub: "検索を押す" },
        { s: 0.8, top: "最初の応答", sub: "1件目が出る" },
        { s: 3, top: "すべて完了", sub: "全件そろう" },
      ].map((e) => (
        <g key={e.s}>
          <circle cx={x(e.s)} cy={40} r={4.5} fill="#111827" />
          <text x={x(e.s)} y={14} textAnchor="middle" fontSize={11} fontWeight={800} fill="#111827">
            {e.top}
          </text>
          <text x={x(e.s)} y={27} textAnchor="middle" fontSize={9.5} fill="#4b5563">
            {e.sub}
          </text>
          <text x={x(e.s)} y={56} textAnchor="middle" fontSize={10} fontWeight={700} fill="#374151">
            {e.s}秒
          </text>
        </g>
      ))}
      {/* 測る範囲 */}
      <rect x={x(0)} y={68} width={x(0.8) - x(0)} height={20} rx={4} fill="#fef3c7" stroke="#f59e0b" />
      <text x={x(0.8) + 6} y={82} fontSize={11} fontWeight={800} fill="#92400e">
        レスポンスタイム 0.8秒
      </text>
      <rect x={x(0)} y={98} width={x(3) - x(0)} height={20} rx={4} fill="#f3f4f6" stroke="#6b7280" />
      <text x={(x(0) + x(3)) / 2} y={112} textAnchor="middle" fontSize={11} fontWeight={800} fill="#111827">
        ターンアラウンドタイム 3秒
      </text>
    </svg>
  );
}

function TimePanel() {
  return (
    <Panel>
      <SectionTitle step={1}>レスポンスタイム と ターンアラウンドタイム</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">
        どちらも「待つ時間」。違いは<b className="text-gray-900">どこまでを測るか</b>です。公式ではなく、時間の線の上で範囲を見ます。
      </p>
      <TimeAxis />
      <Steps
        testId="perf-response"
        rows={[
          ["何を求める", <><b>レスポンスタイム</b>：操作してから、<b>最初の応答</b>が返るまでの時間</>],
          ["どう測る", "最初の応答が出た時刻 − 操作した時刻"],
          ["数値例", "0秒に検索 → 0.8秒に1件目が表示"],
          ["答え", <><b>0.8秒</b>（短いほど良い）</>],
        ]}
      />
      <Steps
        testId="perf-turnaround"
        rows={[
          ["何を求める", <><b>ターンアラウンドタイム</b>：依頼してから、<b>結果がすべてそろう</b>までの時間</>],
          ["どう測る", "すべて完了した時刻 − 依頼した時刻"],
          ["数値例", "22:00に夜間集計を依頼 → 23:30に全部完成"],
          ["答え", <><b>1時間30分</b>（短いほど良い）</>],
        ]}
      />
    </Panel>
  );
}

function ThroughputPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>スループット ＝ 決まった時間にどれだけ処理できるか</SectionTitle>
      <Steps
        testId="perf-throughput"
        rows={[
          ["何を求める", "一定時間（1秒・1分など）あたりに処理できる量"],
          ["求め方", <><b>処理件数 ÷ かかった時間</b></>],
          ["数値例", "5分で1,000件を処理した"],
          ["答え", <>1,000 ÷ 5 ＝ <b>200件/分</b>（多いほど良い）</>],
        ]}
      />
      <div className="mt-4" data-testid="perf-throughput-bars" aria-hidden>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((m) => (
            <div key={m} className="flex-1 text-center">
              <div className="grid h-10 place-items-center rounded bg-gray-700 text-[13px] font-bold text-white">200件</div>
              <span className="text-[10.5px] text-gray-500">{m}分目</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-center text-[12.5px] text-gray-700">1分ごとに200件ずつ ＝ 5分で合計1,000件</p>
      </div>
    </Panel>
  );
}

const PARTS = [
  { name: "CPU", rate: 1000 },
  { name: "ストレージ", rate: 300 },
  { name: "ネットワーク", rate: 800 },
];

function BottleneckPanel() {
  const min = Math.min(...PARTS.map((p) => p.rate));
  return (
    <Panel>
      <SectionTitle step={3}>ボトルネック ＝ 全体の速さを決める、いちばん遅い部分</SectionTitle>
      <div className="mt-4 space-y-1.5" data-testid="perf-bottleneck">
        {PARTS.map((p) => (
          <div key={p.name} className="flex items-center gap-2" data-bottleneck={p.rate === min ? "true" : undefined}>
            <span className="w-24 flex-none text-[13px] font-bold text-gray-800">{p.name}</span>
            <div className="h-6 flex-1">
              <div
                className={`flex h-full items-center rounded px-2 text-[12px] font-bold ${p.rate === min ? "bg-amber-400 text-amber-950" : "bg-gray-200 text-gray-700"}`}
                style={{ width: `${(p.rate / 1000) * 100}%` }}
              >
                {p.rate.toLocaleString()}件/分
              </div>
            </div>
          </div>
        ))}
      </div>
      <Steps
        rows={[
          ["何を求める", "システム全体で1分あたり何件処理できるか"],
          ["求め方", <>各部分の処理能力を比べて、<b>いちばん小さい値</b>を選ぶ</>],
          ["数値例", "CPU 1,000件/分・ストレージ 300件/分・ネットワーク 800件/分"],
          ["答え", <>全体は <b>300件/分</b>。改善すべきはストレージ</>],
        ]}
      />
      <p className="mt-4 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700">
        CPUを速くしても全体は300件/分のまま。性能を比べるときは、同じ処理を<b className="text-gray-900">同じ条件で</b>実行して測る
        <b className="text-gray-900">ベンチマーク</b>を使います。
      </p>
    </Panel>
  );
}

export default function SystemPerformanceExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        性能は<b>「どれだけ待つか（時間）」</b>と<b>「どれだけこなせるか（処理量）」</b>で測ります。
        それぞれ、何を求めて・どう計算するかを数字で追いましょう。
      </Lead>
      <TimePanel />
      <ThroughputPanel />
      <BottleneckPanel />
      <PointsPanel
        step={4}
        points={[
          <>レスポンスタイム＝<b>最初の応答</b>まで、ターンアラウンドタイム＝<b>すべて完了</b>まで</>,
          <>スループット＝<b>処理件数 ÷ 時間</b>（30秒で90件 → 3件/秒）</>,
          <>全体の性能は<b>いちばん遅い部分（ボトルネック）</b>で決まる</>,
        ]}
        traps={[
          ["レスポンスタイムと完了までの時間は同じ", "最初の応答が出た時点で測るのがレスポンスタイム"],
          ["処理に時間がかかるほどスループットが高い", "同じ時間でたくさん処理できるほど高い"],
        ]}
      />
    </div>
  );
}
