import { Fragment } from "react";
import { RiskResponseScene, type RiskResp } from "./RiskResponseScenes";

// リスク対応の4種類を、発生確率×影響度の2×2に絵で並べた早見表（操作なしで全部見える静的な図）。
// 並びはリスクマトリクス（横＝発生確率 低→高、縦＝影響度 大→小）と同じ向きにそろえる。
// 象限と対応の組合せは「どれを選ぶかの目安」で、決まりではない。

export const RISK_RESPONSES: Record<RiskResp, { name: string; alias?: string; short: string; tone: string; bg: string; ring: string; example: string }> = {
  avoid: { name: "回避", short: "危ないことはやめる", tone: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-200", example: "危険な新サービスの開始をやめる" },
  transfer: { name: "移転", alias: "転嫁", short: "損は他者に肩代わり", tone: "text-sky-600", bg: "bg-sky-50", ring: "ring-sky-200", example: "保険に入る・外部に委託する" },
  mitigate: { name: "低減", alias: "軽減", short: "備えて小さくする", tone: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", example: "バックアップ・ウイルス対策" },
  accept: { name: "受容", alias: "保有", short: "小さいので受け入れる", tone: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", example: "軽い表示崩れは様子を見る" },
};

// 行＝影響度（上が大）、列＝発生確率（右が高）
const ROWS: { label: string; cells: [RiskResp, RiskResp] }[] = [
  { label: "影響 大", cells: ["transfer", "avoid"] },
  { label: "影響 小", cells: ["accept", "mitigate"] },
];

export function RiskResponseMap() {
  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5" data-testid="risk-resp-map">
      <span aria-hidden />
      <span className="rounded-lg bg-gray-100 py-1 text-center text-xs font-bold text-gray-700">めったに起きない</span>
      <span className="rounded-lg bg-gray-100 py-1 text-center text-xs font-bold text-gray-700">よく起きる</span>

      {ROWS.map((row) => (
        <Fragment key={row.label}>
          <span className="flex items-center justify-center rounded-lg bg-gray-100 px-1 py-2 text-xs font-bold tracking-wider text-gray-700 [writing-mode:vertical-rl]">
            {row.label}
          </span>
          {row.cells.map((kind) => {
            const c = RISK_RESPONSES[kind];
            return (
              <div key={kind} className={`rounded-xl px-1.5 pb-2 pt-1 text-center ring-1 ${c.tone} ${c.bg} ${c.ring}`} data-resp={kind}>
                <RiskResponseScene kind={kind} />
                <p className="text-base font-bold leading-tight text-gray-900">
                  リスク{c.name}
                  {c.alias && <span className="block text-[10.5px] font-normal text-gray-500">（{c.alias}ともいう）</span>}
                </p>
                <p className="mt-0.5 text-[12px] font-bold leading-tight">{c.short}</p>
                <p className="mt-1 text-[11px] leading-snug text-gray-600">例：{c.example}</p>
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
