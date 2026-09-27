"use client";

import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「情報セキュリティ管理（ISMS・リスクアセスメント）」専用の解説。どれも操作不要の静的な図。
//   ① リスクアセスメントの流れ（資産 → 脅威・脆弱性 → 分析・評価 → 対応）と、
//      縦＝影響度・横＝発生可能性 のマトリクス。4つのマスに最初から具体的なリスクを置く
//   ② リスク対応4分類：名称 → 一言 → 具体例 → 向く場面（①のどのマスか）
//   ③ ISMS＝PDCAで続けて改善／情報セキュリティポリシー
// ============================================================================

const FLOW = ["守る資産を洗い出す", "脅威・脆弱性を把握", "リスクを分析・評価", "対応を決める"];

type Cell = { impact: "高" | "低"; prob: "高" | "低"; size: "大" | "中" | "小"; ex: string; verdict: string };

// 行＝影響度（上が高）、列＝発生可能性（右が高）
const MATRIX: Cell[] = [
  { impact: "高", prob: "低", size: "中", ex: "大地震でサーバ室が使えなくなる", verdict: "めったに起きないが被害は大きい" },
  { impact: "高", prob: "高", size: "大", ex: "更新していない公開Webサーバへの不正アクセス", verdict: "最優先で対策" },
  { impact: "低", prob: "低", size: "小", ex: "社内掲示板の表示が一時的に崩れる", verdict: "対策しないことも" },
  { impact: "低", prob: "高", size: "中", ex: "迷惑メールが毎日届く", verdict: "よく起きるが被害は小さい" },
];

const SIZE_TONE: Record<Cell["size"], string> = {
  大: "bg-amber-300 ring-amber-500",
  中: "bg-amber-50 ring-amber-200",
  小: "bg-white ring-gray-200",
};

function RiskMatrix() {
  return (
    <Panel>
      <SectionTitle step={1}>リスクの大きさ ＝ 発生可能性 × 影響度</SectionTitle>

      <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5 text-[12.5px] font-bold text-gray-800" data-testid="risk-flow">
        {FLOW.map((f, i) => (
          <li key={f} className="flex items-center gap-1">
            <span className="rounded-md px-2 py-1 ring-1 ring-gray-300">{f}</span>
            {i < FLOW.length - 1 && (
              <span className="text-gray-400" aria-hidden>
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4 grid grid-cols-[1.5rem_1.75rem_1fr_1fr] gap-1.5" data-testid="risk-matrix">
        {/* 縦軸の名前（2行ぶん） */}
        <div className="row-span-2 flex flex-col items-center justify-center gap-1">
          <span className="text-base font-bold leading-none text-gray-900" aria-hidden>
            ↑
          </span>
          <span className="whitespace-nowrap text-sm font-bold text-gray-900 [writing-mode:vertical-rl]">影響度（被害の大きさ）</span>
        </div>
        {(["高", "低"] as const).map((impact) => (
          <div key={impact} className="contents">
            <div className="flex items-center justify-center text-base font-bold text-gray-900">{impact}</div>
            {MATRIX.filter((c) => c.impact === impact).map((c) => (
              <div
                key={c.prob}
                className={`min-h-[6.5rem] rounded-lg p-2 ring-1 ${SIZE_TONE[c.size]}`}
                data-impact={c.impact}
                data-prob={c.prob}
                data-size={c.size}
                aria-label={`影響度${c.impact}・発生可能性${c.prob}：リスク${c.size}`}
              >
                <p className="text-[15px] font-bold leading-tight text-gray-900">リスク {c.size}</p>
                <p className="mt-1 text-[12.5px] font-bold leading-snug text-gray-800">{c.ex}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-gray-600">{c.verdict}</p>
              </div>
            ))}
          </div>
        ))}
        {/* 横軸 */}
        <div />
        <div />
        <div className="text-center text-base font-bold text-gray-900">低</div>
        <div className="text-center text-base font-bold text-gray-900">高</div>
        <div />
        <div />
        <div className="col-span-2 text-center text-sm font-bold text-gray-900">発生可能性（起こりやすさ） →</div>
      </div>

      <p className="mt-4 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700">
        右上ほどリスクが大きく、先に対策します。「めったに起きないが被害大」も「よく起きるが軽微」も無視せず、
        <b className="text-gray-900">2つをかけ合わせて</b>優先順位をつけます。
      </p>
    </Panel>
  );
}

const TREATMENTS = [
  { emo: "🚫", name: "回避", mean: "リスクのある活動そのものをやめる", ex: "危険な古いサービスの提供を終了する", fit: "被害が大きすぎて、続ける価値に見合わないとき" },
  { emo: "🛡️", name: "低減", mean: "対策で起こりやすさ・被害を小さくする", ex: "暗号化・バックアップ・社員教育", fit: "右上（リスク大）への基本の対応" },
  { emo: "🤝", name: "移転", mean: "損失を他者に肩代わりしてもらう", ex: "サイバー保険に入る・運用を外部に委託する", fit: "起きにくいが、起きると被害が大きいとき" },
  { emo: "😌", name: "受容", mean: "対策せず、そのまま受け入れる", ex: "表示崩れ程度なら様子を見る", fit: "左下（リスク小）で、対策費が見合わないとき" },
];

function Treatments() {
  return (
    <Panel>
      <SectionTitle step={2}>評価したあとの「対応」4つ</SectionTitle>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2" data-testid="risk-treatments">
        {TREATMENTS.map((t) => (
          <div key={t.name} className="rounded-xl p-3 ring-1 ring-gray-200" data-treatment={t.name}>
            <p className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
              <span aria-hidden>{t.emo}</span>
              {t.name}
            </p>
            <p className="mt-1 text-[15px] font-bold leading-snug text-gray-800">{t.mean}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-gray-700">例：{t.ex}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">向く場面：{t.fit}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function IsmsPdca() {
  const items = [
    { k: "P", t: "計画", d: "守る情報を決め、方針（ポリシー）と対策を立てる" },
    { k: "D", t: "実行", d: "対策を導入し、ルールどおりに運用する" },
    { k: "C", t: "点検", d: "うまくいっているか監査・チェックする" },
    { k: "A", t: "改善", d: "見つかった弱点を直し、次の計画へ反映する" },
  ];
  return (
    <Panel>
      <SectionTitle step={3}>ISMS＝続けて改善するしくみ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">ISMS（情報セキュリティマネジメントシステム）</b>は、組織として情報を守る仕組み。
        一度作って終わりではなく、<b className="text-gray-800">PDCAで回し続けて</b>改善します。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {items.map((it) => (
          <div key={it.k} className="rounded-xl p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="grid h-6 w-6 place-items-center rounded bg-brand-100 font-mono text-xs font-bold text-brand-700">
                {it.k}
              </span>
              <span className="text-base font-bold text-gray-900">{it.t}</span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-gray-700">{it.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 ISMSの国際規格は <b>ISO/IEC 27001</b>。組織の方針をまとめた文書が
        <b>情報セキュリティポリシー</b>です。
      </div>
    </Panel>
  );
}

export default function IsmsRiskExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        セキュリティは「技術」だけでなく<b>組織で管理するしくみ</b>が大事。
        リスクを<b>見積もって（アセスメント）→対応を選び→PDCAで回し続ける</b>のが ISMS です。
      </div>

      <RiskMatrix />
      <Treatments />
      <IsmsPdca />
    </div>
  );
}
