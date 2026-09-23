"use client";

import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「システム企画・RFP・調達管理」。一方向のプロセスなので静的なフロー図で見せる。
//   ① 調達の流れ（スイムレーン）：左＝発注側、右＝ベンダ。どの工程を誰がするか、書類がどちらへ渡るかを矢印で
//   ② 3つの依頼書：RFI（情報）／RFP（提案）／RFQ（見積）を「何を返してもらうか」と時期で並べる
//   ③ 評価と選定：重み付きの採点表で「最安値＝最適ではない」を見せる
//   ④ 試験ポイント

export default function SystemPlanningRfpExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        📑 システムを買う（調達する）ときは、<b>発注側が何をしたいか決めてから</b>、ベンダに提案を頼み、比べて選びます。家を建てるときに、希望をまとめて複数の工務店に提案を頼むのと同じ流れです。
      </Lead>
      <FlowPanel />
      <DocsPanel />
      <EvaluatePanel />
      <PointsPanel
        step={4}
        points={[
          <>企画（課題・目的）→ RFI → 要件整理 → <b>RFP</b> → 提案 → 評価・選定 → 契約</>,
          <>RFI＝<b>情報</b>をください、RFP＝<b>提案</b>をください、RFQ＝<b>見積り</b>をください</>,
          <>選定は価格だけでなく、要件への適合・品質・実現性・保守性を<b>総合評価</b></>,
        ]}
        traps={[
          ["RFPは発注後に結ぶ契約書", "RFPは契約の前に、ベンダへ提案を依頼する文書"],
          ["一番安い提案を選べばよい", "要件に合わない安い提案は、あとで高くつく。総合評価で選ぶ"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 調達の流れ（スイムレーン）
// ---------------------------------------------------------------------------

type Lane = "buyer" | "vendor" | "both";
type FlowStep = { lane: Lane; name: string; sub: string; doc?: { dir: "toVendor" | "toBuyer"; label: string } };

const FLOW: FlowStep[] = [
  { lane: "buyer", name: "① システム企画", sub: "課題から目的を決める" },
  { lane: "buyer", name: "② 情報を集める", sub: "製品・技術の情報を広く", doc: { dir: "toVendor", label: "RFI" } },
  { lane: "vendor", name: "情報を提供", sub: "製品資料・事例", doc: { dir: "toBuyer", label: "情報" } },
  { lane: "buyer", name: "③ 要件をまとめる", sub: "必要な機能・条件・予算" },
  { lane: "buyer", name: "④ 提案を依頼", sub: "要件を書いて複数社へ", doc: { dir: "toVendor", label: "RFP" } },
  { lane: "vendor", name: "提案書を作る", sub: "実現方法・体制・価格", doc: { dir: "toBuyer", label: "提案書" } },
  { lane: "buyer", name: "⑤ 評価・選定", sub: "決めた基準で比べる" },
  { lane: "both", name: "⑥ 契約", sub: "選んだ1社と結ぶ" },
];

function StepBox({ step }: { step: FlowStep }) {
  const tone = step.lane === "vendor" ? "bg-gray-100 text-gray-800 ring-gray-300" : step.lane === "both" ? "bg-emerald-50 text-emerald-900 ring-emerald-300" : "bg-brand-50 text-brand-900 ring-brand-200";
  return (
    <div className={`rounded-lg px-1.5 py-1.5 ring-1 ${tone}`}>
      <div className="text-[13px] font-bold leading-snug">{step.name}</div>
      <div className="text-[11px] leading-snug opacity-80">{step.sub}</div>
    </div>
  );
}

function DocArrow({ doc }: { doc: NonNullable<FlowStep["doc"]> }) {
  const important = doc.label === "RFP" || doc.label === "RFI";
  return (
    <div className="flex flex-col items-center justify-center" aria-label={`${doc.label}を${doc.dir === "toVendor" ? "ベンダへ" : "発注側へ"}渡す`}>
      <span className={`rounded px-1 text-[11px] font-bold ${important ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"}`}>{doc.label}</span>
      <span className="text-base font-bold leading-none text-gray-400" aria-hidden>
        {doc.dir === "toVendor" ? "→" : "←"}
      </span>
    </div>
  );
}

function FlowPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>企画から契約まで ― 誰が何をする？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        左が<b className="text-gray-800">発注側（ユーザー企業）</b>、右が<b className="text-gray-800">ベンダ</b>。上から順に進みます。
      </p>
      <div className="mt-3 grid grid-cols-[1fr_3rem_1fr] gap-x-1 gap-y-1" data-testid="rfp-flow">
        <div className="rounded-md bg-brand-600 py-1 text-center text-[12px] font-bold text-white">発注側</div>
        <div />
        <div className="rounded-md bg-gray-600 py-1 text-center text-[12px] font-bold text-white">ベンダ</div>
        {FLOW.map((s) =>
          s.lane === "both" ? (
            <div key={s.name} className="col-span-3" data-lane={s.lane}>
              <StepBox step={s} />
            </div>
          ) : (
            <div key={s.name} className="contents" data-lane={s.lane}>
              <div>{s.lane === "buyer" && <StepBox step={s} />}</div>
              <div>{s.doc ? <DocArrow doc={s.doc} /> : null}</div>
              <div>{s.lane === "vendor" && <StepBox step={s} />}</div>
            </div>
          ),
        )}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        💡 左の列（発注側）がずっと主役。<b className="text-gray-800">何を作りたいかを決めるのは発注側</b>で、ベンダはそれに答えて提案します。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 3つの依頼書
// ---------------------------------------------------------------------------

const DOCS = [
  { code: "RFI", ja: "情報提供依頼書", ask: "どんな製品・技術がある？", back: "製品資料・事例", when: "企画の初め" },
  { code: "RFP", ja: "提案依頼書", ask: "この要件をどう実現する？", back: "提案書（方法・体制・価格）", when: "要件がまとまったら" },
  { code: "RFQ", ja: "見積依頼書", ask: "この仕様でいくら・いつ？", back: "見積書（価格・納期）", when: "仕様がほぼ決まったら" },
];

function DocsPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>3つの依頼書 ― 何を返してもらう？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        RF＝Request For（〜をください）。<b className="text-gray-800">最後の1文字</b>が、ベンダに頼むものです。
      </p>
      <div className="mt-3 space-y-1.5" data-testid="rfp-docs">
        {DOCS.map((d) => (
          <div key={d.code} className={`rounded-xl p-2 ring-1 ${d.code === "RFP" ? "bg-brand-50 ring-brand-300" : "bg-gray-50 ring-gray-200"}`}>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold text-gray-400">
                RF<span className="text-brand-600">{d.code[2]}</span>
              </span>
              <span className="text-[13px] font-bold text-gray-800">{d.ja}</span>
              <span className="ml-auto text-[11px] font-bold text-gray-500">{d.when}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px]">
              <span className="rounded-md bg-white px-1.5 py-1 font-bold text-gray-700 ring-1 ring-gray-200">「{d.ask}」</span>
              <span className="text-gray-500">
                <span aria-hidden>→ </span>
                {d.back}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-500">I＝Information（情報）、P＝Proposal（提案）、Q＝Quotation（見積り）。</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 評価と選定
// ---------------------------------------------------------------------------

const CRITERIA = [
  { name: "要件への適合", w: 3 },
  { name: "品質・実績", w: 2 },
  { name: "価格の安さ", w: 2 },
  { name: "保守体制", w: 1 },
];
const VENDORS = [
  { name: "A社", note: "最安値", scores: [2, 3, 5, 2] },
  { name: "B社", note: "", scores: [5, 4, 3, 4] },
  { name: "C社", note: "", scores: [4, 3, 2, 5] },
];
export const vendorTotal = (scores: number[]) => scores.reduce((a, s, i) => a + s * CRITERIA[i].w, 0);

function EvaluatePanel() {
  const totals = VENDORS.map((v) => vendorTotal(v.scores));
  const best = Math.max(...totals);
  return (
    <Panel>
      <SectionTitle step={3}>評価・選定 ― 価格だけで決めない</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        RFPを出す前に<b className="text-gray-800">評価の基準と重み</b>を決めておき、提案を5点満点で採点します。
      </p>
      <table className="mt-3 w-full table-fixed text-center text-[12px]" data-testid="rfp-eval">
        <thead>
          <tr className="text-[11px] text-gray-500">
            <th className="w-[38%] py-1 text-left font-bold">基準（重み）</th>
            {VENDORS.map((v) => (
              <th key={v.name} className="py-1 font-bold text-gray-700">
                {v.name}
                {v.note && <div className="text-[11px] font-bold text-accent-700">{v.note}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CRITERIA.map((c, i) => (
            <tr key={c.name} className="border-t border-gray-100">
              <td className="py-1.5 text-left font-bold text-gray-700">
                {c.name} <span className="text-gray-400">×{c.w}</span>
              </td>
              {VENDORS.map((v) => (
                <td key={v.name} className={`py-1.5 tabular-nums ${v.scores[i] >= 4 ? "font-bold text-gray-800" : v.scores[i] <= 2 ? "text-rose-600" : "text-gray-600"}`}>
                  {v.scores[i]}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t-2 border-gray-300">
            <td className="py-1.5 text-left font-bold text-gray-800">合計</td>
            {VENDORS.map((v, i) => (
              <td key={v.name} className="py-1.5">
                <span className={`inline-block rounded-md px-1.5 font-bold tabular-nums ${totals[i] === best ? "bg-emerald-500 text-white" : "text-gray-700"}`} data-testid={`rfp-total-${v.name}`}>
                  {totals[i]}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        💡 最安値のA社は、肝心の<b className="text-gray-800">要件への適合が低い</b>。重みを付けて総合すると<b className="text-gray-800">B社</b>が選ばれます。
      </p>
      <Caption className="mt-2">※ 重み付きの合計 ＝ 各点 × 重み を足したもの（例：B社 5×3＋4×2＋3×2＋4×1 ＝ 33）</Caption>
    </Panel>
  );
}
