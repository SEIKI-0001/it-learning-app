import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// データ活用の解説で、過去問の出題に合わせて足したパネル群。操作不要の静的な図。
// 試験は「説明文 → 手法・図表・用語」を選ばせる形が多いので、問題文の言い回しで書く。

const Takeaway = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
);

function TermList({ items, testId }: { items: { t: string; d: string }[]; testId: string }) {
  return (
    <dl className="mt-2 space-y-1" data-testid={testId}>
      {items.map((it) => (
        <div key={it.t} className="grid grid-cols-[9rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug" data-term={it.t}>
          <dt className="font-bold text-gray-900">{it.t}</dt>
          <dd className="text-gray-700">{it.d}</dd>
        </div>
      ))}
    </dl>
  );
}

// ② 分析の手法と図表 --------------------------------------------------------------------
const METHODS = [
  { t: "A/Bテスト", d: "2つの案（新旧のデザインなど）を並行して出し、どちらが成果につながるか比べる" },
  { t: "主成分分析", d: "たくさんの項目を、少数の指標にまとめて説明する" },
  { t: "クラスター分析", d: "似ているものどうしをグループに分ける" },
  { t: "ABC分析", d: "売上などの大きい順に並べ、重要度でA・B・Cに分ける" },
  { t: "データマイニング", d: "大量のデータから、隠れた規則や関係を掘り出す" },
  { t: "BI", d: "データを集計・可視化して、経営の判断を助ける道具" },
];

export function AnalysisMethods({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>分析の手法と図表</SectionTitle>
      <TermList items={METHODS} testId="du-methods" />
      <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-sky-950 ring-1 ring-sky-200" data-testid="du-bubble">
        <p className="font-bold">バブルチャート：3つの要素を1枚で見せる</p>
        <p className="mt-0.5">
          横軸・縦軸に2つ、<b>円の大きさ</b>に3つ目の値をとる。例：店舗ごとの座席数（横）・客単価（縦）・売上高（円の大きさ）。
        </p>
      </div>
      <Takeaway>
        「項目を<b>少数に絞る</b>」→主成分分析、「<b>グループ分け</b>」→クラスター分析、「2案を<b>並行して比べる</b>」→A/Bテストです。
      </Takeaway>
    </Panel>
  );
}

// ③ ビッグデータの用語と、データの尺度 -------------------------------------------------------
const BIG = [
  { t: "3V", d: "ビッグデータの3つの特徴。Volume（大容量）・Velocity（頻繁な更新）・Variety（多種多様）" },
  { t: "ライフログ", d: "移動履歴・検索履歴・SNSの発信など、個人の活動の記録" },
  { t: "データサイエンティスト", d: "統計や機械学習でビッグデータを分析し、ビジネスに役立つ知見を得る人" },
  { t: "情報リテラシー", d: "データやツールを、課題の解決に適切に使いこなす能力" },
  { t: "CSV / XML", d: "CSV＝コンマなどで区切る形式。XML＝タグでデータの構造を書くマークアップ言語" },
];
const SCALES = [
  { t: "名義尺度", d: "区別するだけ", ex: "血液型・性別" },
  { t: "順序尺度", d: "順番に意味がある", ex: "学年・順位" },
  { t: "間隔尺度", d: "差に意味がある（0は「無い」ではない）", ex: "時刻・気温（℃）" },
  { t: "比例尺度", d: "比にも意味がある（0は「無い」）", ex: "睡眠時間・身長" },
];

export function BigDataScales({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>ビッグデータの用語と、データの尺度</SectionTitle>
      <TermList items={BIG} testId="du-bigdata" />
      <p className="mt-4 text-sm font-bold text-gray-800">データの尺度は4種類</p>
      <ol className="mt-1.5 grid grid-cols-2 gap-1.5" data-testid="du-scales">
        {SCALES.map((s) => (
          <li key={s.t} className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-scale={s.t}>
            <p className="text-[14px] font-bold text-gray-900">{s.t}</p>
            <p className="text-[12px] leading-snug text-gray-700">{s.d}</p>
            <p className="text-[12px] leading-snug text-gray-500">例：{s.ex}</p>
          </li>
        ))}
      </ol>
      <Takeaway>
        「10時は5時の2倍」とは言えないので時刻は<b>間隔尺度</b>。「8時間は4時間の2倍眠った」は言えるので睡眠時間は<b>比例尺度</b>です。
      </Takeaway>
    </Panel>
  );
}

// ⑧ 偏差値 ----------------------------------------------------------------------------
const SUBJECTS = [
  { s: "国語", mean: 60, sd: 10 },
  { s: "数学", mean: 55, sd: 8 },
];
const SCORE = 71;
const dev = (mean: number, sd: number) => 50 + (10 * (SCORE - mean)) / sd;

export function DeviationStage({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>偏差値 ― 同じ点数でも、教科で価値が変わる</SectionTitle>
      <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-center text-[14px] font-bold text-gray-900 ring-1 ring-gray-200">
        偏差値 ＝ 50 ＋ 10 ×（得点 − 平均点）÷ 標準偏差
      </p>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">国語も数学も {SCORE}点だったとき：</p>
      <table className="mt-2 w-full border-collapse text-[12.5px]" data-testid="du-deviation">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-1.5 py-1 font-bold">教科</th>
            <th className="px-1.5 py-1 font-bold">平均点</th>
            <th className="px-1.5 py-1 font-bold">標準偏差</th>
            <th className="px-1.5 py-1 font-bold">偏差値</th>
          </tr>
        </thead>
        <tbody>
          {SUBJECTS.map((x) => (
            <tr key={x.s} className="border-b border-gray-100" data-subject={x.s}>
              <td className="px-1.5 py-1.5 font-bold text-gray-900">{x.s}</td>
              <td className="px-1.5 py-1.5 tabular-nums">{x.mean}</td>
              <td className="px-1.5 py-1.5 tabular-nums">{x.sd}</td>
              <td className="px-1.5 py-1.5 tabular-nums">
                50 + 10 × {SCORE - x.mean} ÷ {x.sd} ＝ <b className="text-brand-800">{Math.round(dev(x.mean, x.sd) * 10) / 10}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Takeaway>
        平均点より<b>どれだけ上か</b>を、<b>ばらつき（標準偏差）</b>で割って比べます。平均が低く、ばらつきが小さい教科ほど、同じ点でも偏差値が高くなります。
      </Takeaway>
    </Panel>
  );
}
