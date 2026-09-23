"use client";

import type { ReactNode } from "react";
import styles from "./calc/calc.module.css";
import { Note, Replay } from "./calc/CalcParts";
import { useBeats } from "./calc/useBeats";
import { Arrow, Box, Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「技術開発戦略とロードマップ」。時間軸が本質なので、ロードマップだけ段階表示にする。
//   ① 研究 → 開発 → 事業化：3段階で「何ができあがるか」＋段階の間の壁（静的）
//   ② 技術ロードマップ：製品（ゴール）→ 必要技術 → 研究開発 の順に逆算して描かれる（段階表示）
//      製品・技術・研究の3段を同じ時間軸にそろえ、「長期の製品のための研究は今始まっている」を見せる
//   ③ 外の力を使う・発明を守る：オープンイノベーションと特許戦略（静的）
//   ④ 試験ポイント

export default function TechRoadmapExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        🗺️ 技術開発は<b>「いつ・何を売るか」から逆算</b>して、必要な技術と研究の時期を決めます。その計画図が<b>技術ロードマップ</b>です。
      </Lead>
      <StagesPanel />
      <RoadmapPanel />
      <OpenPatentPanel />
      <PointsPanel
        step={4}
        points={[
          <>研究＝原理を探す → 開発＝製品に使える形にする → 事業化＝生産・販売して稼ぐ</>,
          <>技術ロードマップ＝<b>製品・必要技術・研究開発の時期</b>を同じ時間軸に並べた計画図</>,
          <>外部の技術を取り込む＝<b>オープンイノベーション</b>、発明を権利化して守る・貸す＝<b>特許戦略</b></>,
        ]}
        traps={[
          ["研究と事業化は同じ活動", "研究は原理を探す段階、事業化は売って収益にする段階"],
          ["オープンイノベーション＝自社だけの秘密開発", "大学や他社など外部の技術・知識と組み合わせる"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 研究 → 開発 → 事業化
// ---------------------------------------------------------------------------

const STAGES = [
  { name: "研究", out: "新しい原理・知識", ex: "壊れる前の振動パターンを見つける" },
  { name: "開発", out: "製品に使える技術", ex: "振動から故障を予測するAIを作る" },
  { name: "事業化", out: "売れる製品・収益", ex: "故障予測サービスとして販売" },
];
const GAPS = ["魔の川", "死の谷"];

function StagesPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>研究 → 開発 → 事業化</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">工場の機械の「故障予測」を例に、段階ごとに<b className="text-gray-800">何ができあがるか</b>を見ます。</p>
      <div className="mt-3" data-testid="roadmap-stages">
        {STAGES.map((s, i) => (
          <div key={s.name}>
            {i > 0 && (
              <div className="flex items-center gap-2 py-1 pl-5" aria-hidden>
                <span className="text-base font-bold leading-none text-brand-500">↓</span>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800 ring-1 ring-sky-200">
                  〰 {GAPS[i - 1]}（越えるのが難しい壁）
                </span>
              </div>
            )}
            <div className="flex items-stretch gap-2">
              <div className="grid w-16 flex-none place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">{s.name}</div>
              <div className="flex-1 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-gray-200">
                <div className="text-[13px] font-bold text-gray-800">できあがるもの：{s.out}</div>
                <div className="text-[12px] text-gray-500">例：{s.ex}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-gray-500">
        ※ 研究が製品にならない壁を「魔の川」、開発した製品が事業にならない壁を「死の谷」、事業が市場競争で生き残れない壁を「ダーウィンの海」と呼びます。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 技術ロードマップ（段階表示）
// ---------------------------------------------------------------------------

const TERMS = ["短期（〜1年）", "中期（2〜3年）", "長期（5年〜）"];
const PRODUCTS = ["遠隔監視", "故障予測", "自律保全"];
const TECHS = ["IoT・通信", "予測AI", "自律制御AI"];
// 研究開発の期間（時間軸の % 位置）。製品より前から始まっている
const RND = [
  { label: "センサー実証", from: 0, to: 30 },
  { label: "予測モデルの開発", from: 12, to: 62 },
  { label: "自律制御の研究→実証", from: 30, to: 96 },
];
const ROADMAP_DELAYS = [700, 1300, 1300, 1400];

function RowLabel({ children, on }: { children: ReactNode; on: boolean }) {
  return (
    <div className={`grid place-items-center rounded-lg px-0.5 text-center text-[11px] font-bold leading-tight transition-colors duration-500 ${on ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"}`}>
      {children}
    </div>
  );
}

function RoadmapPanel() {
  const { ref, beat, reducedMotion, replay } = useBeats(5, ROADMAP_DELAYS);
  return (
    <Panel>
      <SectionTitle step={2}>技術ロードマップ ― 3段を同じ時間軸に</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">技術動向調査</b>（論文・特許・競合製品・市場）で変化をつかんだら、上の段（売りたい製品）から逆算して下の段を埋めていきます。
      </p>

      <div ref={ref} className="mt-3" data-testid="roadmap-chart" data-beat={beat}>
        <div className="grid grid-cols-[3.4rem_1fr] gap-x-1.5 gap-y-1">
          <div />
          <div className="grid grid-cols-3 text-center text-[11px] font-bold text-gray-500">
            {TERMS.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>

          <RowLabel on={beat >= 1}>製品・<br />サービス</RowLabel>
          <div className="grid grid-cols-3 gap-1">
            {PRODUCTS.map((p, i) =>
              beat >= 1 ? (
                <div key={p} className={styles.reveal} style={{ animationDelay: `${i * 120}ms` }}>
                  <Box tone="brand" className="!px-1 !py-1.5">
                    <span className="text-[12px]">{p}</span>
                  </Box>
                </div>
              ) : (
                <div key={p} className="h-10 rounded-lg border border-dashed border-gray-300" />
              ),
            )}
          </div>

          <div />
          <div className="grid grid-cols-3 text-center text-sm font-bold leading-none text-brand-400" aria-hidden>
            {TECHS.map((t) => (
              <span key={t} className={beat >= 2 ? "" : "opacity-0"}>↑</span>
            ))}
          </div>

          <RowLabel on={beat >= 2}>必要な<br />技術</RowLabel>
          <div className="grid grid-cols-3 gap-1">
            {TECHS.map((t, i) =>
              beat >= 2 ? (
                <div key={t} className={styles.reveal} style={{ animationDelay: `${i * 120}ms` }}>
                  <Box tone="soft" className="!px-1 !py-1.5">
                    <span className="text-[12px]">{t}</span>
                  </Box>
                </div>
              ) : (
                <div key={t} className="h-10 rounded-lg border border-dashed border-gray-300" />
              ),
            )}
          </div>

          <div />
          <div className="grid grid-cols-3 text-center text-sm font-bold leading-none text-brand-400" aria-hidden>
            {TECHS.map((t) => (
              <span key={t} className={beat >= 3 ? "" : "opacity-0"}>↑</span>
            ))}
          </div>

          <RowLabel on={beat >= 3}>研究<br />開発</RowLabel>
          <div className="relative h-[5.5rem] rounded-lg bg-gray-50 ring-1 ring-gray-200">
            <div className="absolute inset-y-0 left-1/3 border-l border-dashed border-gray-300" aria-hidden />
            <div className="absolute inset-y-0 left-2/3 border-l border-dashed border-gray-300" aria-hidden />
            {beat >= 3 &&
              RND.map((r, i) => (
                <div
                  key={r.label}
                  className={`absolute h-6 overflow-hidden whitespace-nowrap rounded-md bg-accent-400 px-1.5 text-[11px] font-bold leading-6 text-accent-800 ${styles.reveal}`}
                  style={{ left: `${r.from}%`, width: `${r.to - r.from}%`, top: `${6 + i * 27}px`, animationDelay: `${i * 160}ms` }}
                >
                  {r.label}
                </div>
              ))}
          </div>
        </div>
        <div className="mt-1 ml-[3.75rem] flex items-center text-[11px] font-bold text-gray-500" aria-hidden>
          <span>今</span>
          <span className="mx-1 h-px flex-1 bg-gray-400" />
          <span>時間 →</span>
        </div>

        {beat >= 4 && (
          <Note>
            💡 長期の「自律保全」のための研究は、<b>短期のうちにもう始まっている</b>。3段を同じ時間軸に重ねると、「いつ何に取りかかるか」が見えます。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ オープンイノベーションと特許戦略
// ---------------------------------------------------------------------------

function OpenPatentPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>外の力を使う・発明を守る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">ロードマップの穴を、全部自社で埋める必要はありません。</p>

      <Caption className="mt-3">オープンイノベーション</Caption>
      <div className="mt-1 grid grid-cols-2 gap-2" data-testid="roadmap-open">
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <div className="text-center text-[12px] font-bold text-gray-500">自社だけで開発</div>
          <div className="mt-2 flex flex-col items-center gap-0.5">
            <Box tone="plain" className="w-24">自社</Box>
            <Arrow />
            <Box tone="muted" className="w-24" sub="時間がかかる">新製品</Box>
          </div>
        </div>
        <div className="rounded-xl bg-brand-50 p-2 ring-1 ring-brand-200">
          <div className="text-center text-[12px] font-bold text-brand-700">外部と組み合わせる</div>
          <div className="mt-2 grid grid-cols-3 gap-0.5 text-center">
            <Box tone="plain" className="!px-0.5"><span className="text-[11px]">大学</span></Box>
            <Box tone="brand" className="!px-0.5"><span className="text-[11px]">自社</span></Box>
            <Box tone="plain" className="!px-0.5"><span className="text-[11px]">他社</span></Box>
          </div>
          <div className="text-center text-sm font-bold leading-tight text-brand-500" aria-hidden>↘ ↓ ↙</div>
          <Box tone="ok" className="mx-auto w-24" sub="速く・広く">新製品</Box>
        </div>
      </div>

      <Caption className="mt-4">特許戦略</Caption>
      <div className="mt-1 flex items-center gap-1.5" data-testid="roadmap-patent">
        <Box tone="soft" className="w-16 flex-none">発明</Box>
        <Arrow dir="right" label="出願" />
        <Box tone="brand" className="w-20 flex-none">特許権</Box>
        <div className="flex flex-1 flex-col gap-1">
          <Box tone="plain" className="!py-1"><span className="text-[12px]">🛡️ まねを防ぐ</span></Box>
          <Box tone="plain" className="!py-1"><span className="text-[12px]">🤝 ライセンスで収入</span></Box>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">💡 特許は「守る」だけでなく、他社に使わせて<b className="text-gray-800">稼ぐ・連携する</b>道具にもなります。</p>
    </Panel>
  );
}
