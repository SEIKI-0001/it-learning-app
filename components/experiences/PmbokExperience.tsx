"use client";

import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「PMBOKの基本」。二軸の整理が本質なので静的な図解。1枚に載せるのは1つの話だけ。
//   ① 二軸の骨組み：横＝5つのプロセス群、縦＝代表的な知識エリア。交点の例を1つだけ示す
//      （10×5の●表は試験で問われない細かさなので載せない）
//   ② ライフサイクル（フェーズ＝時間の流れ）とプロセス群（各フェーズの中で回す活動）を分ける。設計フェーズを拡大して見せる
//   ③ 知識体系であって手順書ではない（テーラリング）
//   ④ 試験ポイント（②③で扱った誤解は繰り返さない）

export default function PmbokExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        PMBOKは、プロジェクト管理の知恵を<b>2つの軸</b>で整理したガイドです。
      </Lead>
      <AxesPanel />
      <OverlapPanel />
      <TailoringPanel />
      <PointsPanel
        step={4}
        points={[
          <>プロセス群（5つ）＝立上げ・計画・実行・<b>監視コントロール</b>・終結</>,
          <>知識エリア＝スコープ・コスト・リスクなど<b>管理する分野</b></>,
          <>プロセス群は一度きりの段階ではなく、<b>重なり・繰り返す</b></>,
        ]}
        traps={[["スコープ管理・コスト管理はプロセス群", "それらは知識エリア（管理する分野）"]]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 二軸の骨組み
// ---------------------------------------------------------------------------

const GROUPS = ["立上げ", "計画", "実行", "監視", "終結"];
// 試験でよく見る6分野だけ。残り4つ（統合・コミュニケーション・調達・ステークホルダー）は「など」に含める
const MAIN_AREAS = ["スコープ", "スケジュール", "コスト", "品質", "資源", "リスク"];
// 交点の例：計画 × コスト
const EX_ROW = 2;
const EX_COL = 1;

function AxesPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>2つの軸で整理する</SectionTitle>
      <div className="mt-3 grid grid-cols-[5.6rem_repeat(5,1fr)] gap-0.5" data-testid="pmbok-axes">
        <div />
        {GROUPS.map((g, c) => (
          <div
            key={g}
            className={`rounded-md py-1.5 text-center text-xs font-bold leading-tight text-white ${c === EX_COL ? "bg-brand-700" : "bg-brand-600"}`}
          >
            {g}
          </div>
        ))}
        {MAIN_AREAS.map((a, r) => (
          <AreaRow key={a} name={a} r={r} />
        ))}
        <div className="col-span-6 flex justify-between px-1.5 pt-1 text-xs text-gray-500">
          <span>など（全10）</span>
          <span>監視＝監視コントロール</span>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 text-sm leading-relaxed text-gray-800">
        <p>
          <b className="text-brand-800">横＝プロセス群</b>：何のための活動か（5つ）
        </p>
        <p>
          <b className="text-gray-900">縦＝知識エリア</b>：何を管理するか
        </p>
        <p className="rounded-lg bg-brand-50 px-3 py-2 ring-1 ring-brand-200">
          交点の例：<b>計画 × コスト</b>＝予算を立てる
        </p>
      </div>
    </Panel>
  );
}

function AreaRow({ name, r }: { name: string; r: number }) {
  return (
    <>
      <div className={`rounded-md px-1.5 py-1 text-xs font-bold leading-tight ${r === EX_ROW ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"}`}>{name}</div>
      {GROUPS.map((g, c) => {
        const hit = r === EX_ROW && c === EX_COL;
        return (
          <div
            key={g}
            className={`grid min-h-[1.6rem] place-items-center rounded-md ${hit ? "bg-brand-100 ring-2 ring-brand-500" : "bg-gray-50"}`}
            data-example={hit ? "true" : undefined}
          >
            {hit && <span className="text-[11px] font-bold text-brand-800">予算</span>}
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// ② ライフサイクルとプロセス群（設計フェーズを拡大して中のプロセス群を見せる）
// ---------------------------------------------------------------------------

const PHASES = ["要件定義", "設計", "開発", "テスト"];
// 拡大元「設計」の左右の位置（横幅に対する%）。4列等幅の2列目
const ZOOM_FROM = [25, 50];
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
      {/* 列の間に gap を入れない（拡大線の起点＝2列目の端を 25%・50% に合わせるため）。余白は各列の内側で取る */}
      <ol className="mt-2 grid grid-cols-4" data-testid="pmbok-lifecycle">
        {PHASES.map((p) => (
          <li key={p} className="px-[3px]">
            <span className={`block rounded-lg py-1.5 text-center text-sm font-bold ${p === "設計" ? "bg-gray-900 text-white" : "bg-white text-gray-900 ring-1 ring-gray-300"}`}>
              {p}
            </span>
          </li>
        ))}
      </ol>

      {/* 拡大線：上の「設計」（2列目＝横幅の25%〜50%）から下の箱いっぱいへ広がる */}
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="block h-8 w-full" aria-hidden data-testid="pmbok-zoom">
        <polygon points={`${ZOOM_FROM[0]},0 ${ZOOM_FROM[1]},0 100,10 0,10`} className="fill-gray-200" />
        <line x1={ZOOM_FROM[0]} y1="0" x2="0" y2="10" className="stroke-gray-900" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="4 3" />
        <line x1={ZOOM_FROM[1]} y1="0" x2="100" y2="10" className="stroke-gray-900" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="4 3" />
      </svg>
      <div className="rounded-xl p-3 ring-2 ring-gray-900" data-testid="pmbok-overlap">
        <span className="inline-block rounded-md bg-gray-900 px-2 py-0.5 text-xs font-bold text-white">設計フェーズを拡大</span>
        <h4 className="mt-2 text-base font-bold text-gray-900">5つのプロセス群＝各フェーズの中で回す活動</h4>
        <p className="text-xs text-gray-600">設計フェーズの中だけでも、5つがそろい、計画〜監視は何度も繰り返す</p>
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
