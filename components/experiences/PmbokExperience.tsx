"use client";

import { useState, type ReactNode } from "react";
import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「PMBOKの基本」。二軸の整理が本質なので静的な図解。
//   ① 二軸のマトリクス：列＝5つのプロセス群、行＝10の知識エリア。●＝その組み合わせのプロセスがある
//      行か列をタップすると、その1本だけが強調される（見方の練習。アニメーションはしない）
//   ② ライフサイクル（フェーズ＝時間の流れ）とプロセス群（各フェーズの中で回す活動）を分けて、設計フェーズの具体例で見せる
//   ③ 知識体系であって手順書ではない（テーラリング）
//   ④ 試験ポイント

export default function PmbokExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        PMBOKは、プロジェクト管理の知恵を<b>2つの軸</b>で整理したガイドです。<b>横＝何のための活動か（プロセス群）</b>、<b>縦＝何を管理するか（知識エリア）</b>。
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
        <b className="text-gray-800">横軸＝プロセス群（何のための活動か）× 縦軸＝知識エリア（何を管理するか）</b>の表です。
        ●は、その組み合わせの管理作業（プロセス）があるところ。列名・行名をタップすると1本だけ強調できます。
      </p>

      <div className="mt-3" data-testid="pmbok-matrix" data-focus={focus ? `${focus.kind}-${focus.i}` : "none"}>
        {/* 横軸の見出し：表を見る前に「何×何の表か」を読ませる */}
        <div className="grid grid-cols-[1.6rem_6.4rem_1fr] gap-x-0.5">
          <div />
          <div />
          <div className="mb-1.5 flex items-center gap-1.5" data-testid="pmbok-axis-groups">
            <span className="whitespace-nowrap text-[15px] font-bold text-gray-900">プロセス群（5つ）</span>
            <span className="relative h-[3px] flex-1 bg-gray-900" aria-hidden>
              <span className="absolute -right-0.5 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-l-[9px] border-y-transparent border-l-gray-900" />
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[1.6rem_1fr] gap-x-0.5">
          {/* 縦軸の見出し */}
          <div className="flex flex-col items-center pt-8" data-testid="pmbok-axis-areas">
            <span className="text-[15px] font-bold leading-tight tracking-wider text-gray-900 [writing-mode:vertical-rl]">知識エリア（10）</span>
            <span className="relative mt-1 w-[3px] flex-1 bg-gray-900" aria-hidden>
              <span className="absolute -bottom-0.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[9px] border-x-transparent border-t-gray-900" />
            </span>
          </div>
          <div>
        <div className="mb-1 grid grid-cols-[6.4rem_repeat(5,1fr)] items-end gap-0.5">
          <div />
          {GROUPS.map((g, c) => {
            const on = focus?.kind === "group" && focus.i === c;
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggle({ kind: "group", i: c })}
                aria-pressed={on}
                aria-label={`プロセス群「${GROUP_FULL[c]}」を強調`}
                className={`rounded-md px-0 py-1.5 text-xs font-bold leading-tight transition active:scale-95 ${on ? "bg-brand-700 text-white" : "bg-brand-600 text-white"}`}
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
                  className={`rounded-md px-1.5 py-1 text-left text-xs font-bold leading-tight transition active:scale-95 ${on ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}
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
          </div>
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
      <b>どの知識エリアも「計画」と「監視コントロール」に●がある</b>。どの分野も、計画を立て、実績と比べて調整するからです。
    </>
  );
  if (focus?.kind === "group") {
    const g = GROUP_FULL[focus.i];
    const n = AREAS.filter((a) => a.cells[focus.i]).length;
    text = (
      <>
        「{g}」の列：{n}の分野に●。{focus.i === 4 ? "終結は統合だけ＝プロジェクト全体をまとめて閉じる活動です。" : focus.i === 0 ? "立上げは統合（憲章の作成）とステークホルダー（特定）だけ。" : "たくさんの分野にまたがる活動です。"}
      </>
    );
  } else if (focus?.kind === "area") {
    const a = AREAS[focus.i];
    const gs = GROUP_FULL.filter((_, c) => a.cells[c]).join("・");
    text = (
      <>
        「{a.name}」の行：{gs} で管理する。<b>知識エリアは「何を管理するか」</b>、プロセス群は「何のための活動か」。
      </>
    );
  }
  return <div className="mt-3 rounded-xl bg-gray-50 px-4 py-2.5 text-sm leading-relaxed text-gray-800 ring-1 ring-gray-200">{text}</div>;
}

// ---------------------------------------------------------------------------
// ② 重なりグラフ
// ---------------------------------------------------------------------------

const PHASES = ["要件定義", "設計", "開発", "テスト"];
const IN_PHASE: { g: string; ex: string; loop?: boolean }[] = [
  { g: "立上げ", ex: "設計フェーズを始めることを承認する" },
  { g: "計画", ex: "設計の範囲・担当・日程を決める", loop: true },
  { g: "実行", ex: "設計書を書く", loop: true },
  { g: "監視・コントロール", ex: "レビューで遅れや漏れを見つけ、必要なら計画を直す", loop: true },
  { g: "終結", ex: "設計書の完成を承認し、フェーズを閉じる" },
];

function Row({ x }: { x: (typeof IN_PHASE)[number] }) {
  return (
    <li className="py-0.5 text-sm">
      <b className={x.loop ? "text-brand-800" : "text-gray-900"}>{x.g}</b>
      <span className="ml-2 text-gray-700">{x.ex}</span>
    </li>
  );
}

function OverlapPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>「ライフサイクル」と「プロセス群」は別もの</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        立上げ→計画→実行→監視・コントロール→終結は、<b className="text-gray-800">プロジェクト全体で一度だけ順に進む工程ではありません</b>。
        社内システム開発の例で、2つを分けて見ます。
      </p>

      <h4 className="mt-4 text-base font-bold text-gray-900">プロジェクトのライフサイクル＝時間の流れ</h4>
      <p className="text-xs text-gray-600">フェーズ（段階）は時間の順に進む</p>
      <ol className="mt-2 flex flex-wrap items-center gap-1.5" data-testid="pmbok-lifecycle">
        {PHASES.map((p, i) => (
          <li key={p} className="flex items-center gap-1.5">
            <span className={`rounded-lg px-3 py-1.5 text-sm font-bold ${p === "設計" ? "bg-gray-900 text-white" : "bg-white text-gray-900 ring-1 ring-gray-300"}`}>
              {p}フェーズ
            </span>
            {i < PHASES.length - 1 && <span className="font-bold text-gray-500" aria-hidden>→</span>}
          </li>
        ))}
      </ol>

      <h4 className="mt-5 text-base font-bold text-gray-900">5つのプロセス群＝各フェーズの中で回す活動</h4>
      <p className="text-xs text-gray-600">たとえば「設計フェーズ」の中だけでも、5つがそろい、計画〜監視は何度も繰り返す</p>
      <div className="mt-2 rounded-xl p-3 ring-1 ring-gray-300" data-testid="pmbok-overlap">
        <div className="text-sm font-bold text-gray-900">設計フェーズの中</div>
        <ol className="mt-2 space-y-1">
          <Row x={IN_PHASE[0]} />
          <li className="ml-1 border-l-[3px] border-brand-600 py-0.5 pl-3">
            <ol className="space-y-1">
              {IN_PHASE.slice(1, 4).map((x) => (
                <Row key={x.g} x={x} />
              ))}
            </ol>
            <p className="mt-0.5 text-xs font-bold text-brand-700">↺ ここを何度も繰り返す</p>
          </li>
          <Row x={IN_PHASE[4]} />
        </ol>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        同じことが要件定義・開発・テストの各フェーズでも起こります。実行と監視・コントロールは<b className="text-gray-900">同時並行</b>で進むのがふつうです。
      </p>
      <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-white px-3 py-2 text-gray-800 ring-1 ring-rose-200">
          <b className="text-rose-700">✕ 誤解</b>
          <div className="mt-0.5">プロジェクト全体で、立上げ→…→終結を1回だけ順に進む</div>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 text-gray-800 ring-1 ring-gray-300">
          <b className="text-gray-900">○ 実際</b>
          <div className="mt-0.5">フェーズごとに5つの活動があり、計画〜監視は重なり・繰り返す</div>
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
