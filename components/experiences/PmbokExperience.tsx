"use client";

import { useState, type ReactNode } from "react";
import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「PMBOKの基本」。二軸の整理が本質なので静的な図解。
//   ① 二軸のマトリクス：列＝5つのプロセス群、行＝10の知識エリア。●＝その組み合わせのプロセスがある
//      行か列をタップすると、その1本だけが強調される（見方の練習。アニメーションはしない）
//   ② プロセス群は「段階」ではない：活動量の重なりグラフ（実行と監視コントロールが同時に高い）
//   ③ 知識体系であって手順書ではない（テーラリング）
//   ④ 試験ポイント

export default function PmbokExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        📚 PMBOKは、プロジェクト管理の知恵を<b>2つの軸</b>で整理したガイドです。<b>横＝何のための活動か（プロセス群）</b>、<b>縦＝何を管理するか（知識エリア）</b>。
      </Lead>
      <MatrixPanel />
      <OverlapPanel />
      <TailoringPanel />
      <PointsPanel
        step={4}
        points={[
          <>プロセス群（5つ）＝立上げ・計画・実行・<b>監視コントロール</b>・終結</>,
          <>知識エリア＝スコープ・スケジュール・コスト・品質・資源・リスクなど<b>管理する分野</b></>,
          <>プロセス群は時系列の段階ではなく、<b>重なり・繰り返す</b>活動のまとまり</>,
        ]}
        traps={[
          ["PMBOKはどの案件にもそのまま当てはめる手順書", "案件に合わせて選んで使う知識体系（テーラリング）"],
          ["プロセス群は順番どおり一度だけ進む", "実行と監視コントロールは並行し、計画にも何度も戻る"],
          ["スコープ管理・コスト管理はプロセス群", "それらは知識エリア（管理する分野）"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 二軸のマトリクス
// ---------------------------------------------------------------------------

const GROUPS = ["立上げ", "計画", "実行", "監視", "終結"];
const GROUP_FULL = ["立上げ", "計画", "実行", "監視コントロール", "終結"];
// PMBOKガイド第6版の49プロセスの配置（どのプロセス群に、その知識エリアのプロセスがあるか）
const AREAS: { name: string; cells: boolean[] }[] = [
  { name: "統合", cells: [true, true, true, true, true] },
  { name: "スコープ", cells: [false, true, false, true, false] },
  { name: "スケジュール", cells: [false, true, false, true, false] },
  { name: "コスト", cells: [false, true, false, true, false] },
  { name: "品質", cells: [false, true, true, true, false] },
  { name: "資源", cells: [false, true, true, true, false] },
  { name: "コミュニケーション", cells: [false, true, true, true, false] },
  { name: "リスク", cells: [false, true, true, true, false] },
  { name: "調達", cells: [false, true, true, true, false] },
  { name: "ステークホルダー", cells: [true, true, true, true, false] },
];

type Focus = { kind: "group"; i: number } | { kind: "area"; i: number } | null;

function MatrixPanel() {
  const [focus, setFocus] = useState<Focus>(null);
  const toggle = (f: NonNullable<Focus>) => setFocus((cur) => (cur && cur.kind === f.kind && cur.i === f.i ? null : f));
  const lit = (r: number, c: number) => !focus || (focus.kind === "group" ? focus.i === c : focus.i === r);
  return (
    <Panel>
      <SectionTitle step={1}>2つの軸で整理する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ●は、その組み合わせの管理作業（プロセス）があるところ。<b className="text-gray-800">列名や行名をタップ</b>すると1本だけ強調します。
      </p>

      <div className="mt-3" data-testid="pmbok-matrix" data-focus={focus ? `${focus.kind}-${focus.i}` : "none"}>
        <div className="mb-1 grid grid-cols-[6.4rem_repeat(5,1fr)] items-end gap-0.5">
          <div className="pb-0.5 text-[11px] font-bold leading-tight text-gray-500">
            知識エリア ↓<br />プロセス群 →
          </div>
          {GROUPS.map((g, c) => {
            const on = focus?.kind === "group" && focus.i === c;
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggle({ kind: "group", i: c })}
                aria-pressed={on}
                aria-label={`プロセス群「${GROUP_FULL[c]}」を強調`}
                className={`rounded-md px-0 py-1 text-[11px] font-bold leading-tight transition active:scale-95 ${on ? "bg-brand-700 text-white" : "bg-brand-600 text-white"}`}
              >
                {g}
              </button>
            );
          })}
        </div>
        <div className="space-y-0.5">
          {AREAS.map((a, r) => {
            const on = focus?.kind === "area" && focus.i === r;
            return (
              <div key={a.name} className="grid grid-cols-[6.4rem_repeat(5,1fr)] gap-0.5">
                <button
                  type="button"
                  onClick={() => toggle({ kind: "area", i: r })}
                  aria-pressed={on}
                  aria-label={`知識エリア「${a.name}」を強調`}
                  className={`rounded-md px-1.5 py-1 text-left text-[11px] font-bold leading-tight transition active:scale-95 ${on ? "bg-accent-500 text-white" : "bg-accent-100 text-accent-800"}`}
                >
                  {a.name}
                </button>
                {a.cells.map((has, c) => (
                  <div
                    key={c}
                    className={`grid place-items-center rounded-md transition-opacity duration-200 ${lit(r, c) ? "opacity-100" : "opacity-20"} ${has ? "bg-gray-100" : "bg-gray-50"}`}
                    data-has={has ? "true" : undefined}
                  >
                    {has ? <span className="h-2.5 w-2.5 rounded-full bg-gray-700" aria-label="あり" /> : <span className="sr-only">なし</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-gray-500">監視＝監視コントロール。配置はPMBOKガイド第6版のもの。</p>
      </div>

      <FocusNote focus={focus} />
    </Panel>
  );
}

function FocusNote({ focus }: { focus: Focus }) {
  let text: ReactNode = (
    <>
      💡 <b>どの知識エリアも「計画」と「監視コントロール」に●がある</b>。どの分野も、計画を立て、実績と比べて調整するからです。
    </>
  );
  if (focus?.kind === "group") {
    const g = GROUP_FULL[focus.i];
    const n = AREAS.filter((a) => a.cells[focus.i]).length;
    text = (
      <>
        💡 「{g}」の列：{n}の分野に●。{focus.i === 4 ? "終結は統合だけ＝プロジェクト全体をまとめて閉じる活動です。" : focus.i === 0 ? "立上げは統合（憲章の作成）とステークホルダー（特定）だけ。" : "たくさんの分野にまたがる活動です。"}
      </>
    );
  } else if (focus?.kind === "area") {
    const a = AREAS[focus.i];
    const gs = GROUP_FULL.filter((_, c) => a.cells[c]).join("・");
    text = (
      <>
        💡 「{a.name}」の行：{gs} で管理する。<b>知識エリアは「何を管理するか」</b>、プロセス群は「何のための活動か」。
      </>
    );
  }
  return <div className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">{text}</div>;
}

// ---------------------------------------------------------------------------
// ② 重なりグラフ
// ---------------------------------------------------------------------------

// 各プロセス群の活動量（時間に沿った山）。0〜1 の 11 点。
const CURVES: { name: string; tone: string; pts: number[] }[] = [
  { name: "立上げ", tone: "stroke-gray-400", pts: [0.5, 0.35, 0.1, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "計画", tone: "stroke-sky-500", pts: [0.2, 0.7, 0.8, 0.55, 0.4, 0.35, 0.3, 0.25, 0.2, 0.1, 0] },
  { name: "実行", tone: "stroke-brand-600", pts: [0, 0.1, 0.35, 0.7, 0.9, 0.95, 0.9, 0.75, 0.5, 0.2, 0] },
  { name: "監視コントロール", tone: "stroke-accent-500", pts: [0.15, 0.25, 0.35, 0.45, 0.5, 0.55, 0.55, 0.5, 0.45, 0.35, 0.2] },
  { name: "終結", tone: "stroke-gray-700", pts: [0, 0, 0, 0, 0, 0, 0, 0.05, 0.2, 0.5, 0.7] },
];
const OX = 8;
const OW = 284;
const OY = 124;
const OH = 100;

function OverlapPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>プロセス群は「段階」ではない</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        プロジェクトの始めから終わりまでの、各プロセス群の<b className="text-gray-800">活動の量</b>です。
      </p>
      <svg viewBox="0 0 300 144" className="mt-3 w-full" role="img" aria-label="5つのプロセス群の活動量が時間に沿って重なっているグラフ。実行と監視コントロールは同時に高い" data-testid="pmbok-overlap">
        <line x1={OX} x2={OX + OW} y1={OY} y2={OY} className="stroke-gray-400" />
        {CURVES.map((c) => (
          <polyline
            key={c.name}
            points={c.pts.map((v, i) => `${OX + (i / (c.pts.length - 1)) * OW},${OY - v * OH}`).join(" ")}
            className={`fill-none ${c.tone}`}
            strokeWidth={c.name === "実行" || c.name === "監視コントロール" ? 3 : 2}
            strokeLinejoin="round"
          />
        ))}
        <rect x={OX + OW * 0.38} y={OY - OH} width={OW * 0.3} height={OH} className="fill-brand-500/10" />
        <text x={OX + OW * 0.53} y={OY - OH - 5} textAnchor="middle" fontSize="11" className="fill-brand-800 font-bold">
          実行と監視が同時に進む
        </text>
        <text x={OX} y={OY + 15} fontSize="11" className="fill-gray-500">開始</text>
        <text x={OX + OW} y={OY + 15} textAnchor="end" fontSize="11" className="fill-gray-500">終了 →</text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-gray-600">
        {CURVES.map((c) => (
          <span key={c.name} className="flex items-center gap-1">
            <svg viewBox="0 0 16 4" className="h-1 w-4" aria-hidden>
              <line x1="0" x2="16" y1="2" y2="2" className={c.tone} strokeWidth="4" />
            </svg>
            {c.name}
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[12px]">
        <div className="rounded-lg bg-rose-50 px-2 py-1.5 text-rose-800 ring-1 ring-rose-200">
          <b>✕ 段階のつもり</b>
          <div className="mt-0.5 font-mono text-[11px]">立上げ→計画→実行→監視→終結</div>
        </div>
        <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-900 ring-1 ring-emerald-200">
          <b>○ 実際</b>
          <div className="mt-0.5 text-[11px]">重なり合い、ずれたら計画に戻って繰り返す</div>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 手順書ではなく知識体系
// ---------------------------------------------------------------------------

function TailoringPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>手順書ではなく「知識の棚」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        PMBOKは全部をそのまま実行する手順書ではありません。案件に合わせて<b className="text-gray-800">必要なものを選んで調整</b>します（テーラリング）。
      </p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5" data-testid="pmbok-tailoring">
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <Caption className="text-center">PMBOK（知識の棚）</Caption>
          <div className="mt-1 grid grid-cols-5 gap-0.5">
            {Array.from({ length: 20 }, (_, i) => (
              <span key={i} className={`h-4 rounded-sm ${[1, 3, 6, 12, 17].includes(i) ? "bg-brand-500" : "bg-gray-300"}`} />
            ))}
          </div>
        </div>
        <span className="text-lg font-bold text-gray-400" aria-hidden>→</span>
        <div className="space-y-1">
          <div className="rounded-lg bg-white px-2 py-1 text-[12px] ring-1 ring-gray-200">
            <b className="text-gray-800">小さな社内改修</b>
            <div className="text-[11px] text-gray-500">必要なものだけ軽く</div>
          </div>
          <div className="rounded-lg bg-white px-2 py-1 text-[12px] ring-1 ring-gray-200">
            <b className="text-gray-800">大規模な基幹刷新</b>
            <div className="text-[11px] text-gray-500">調達・リスクも厚く</div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
