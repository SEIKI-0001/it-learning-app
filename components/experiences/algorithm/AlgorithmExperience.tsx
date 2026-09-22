"use client";

import { Panel, SectionTitle } from "../ui";
import { FlowRun } from "./FlowRun";
import { FORMAL_MAPPINGS } from "./learningModel";

// ============================================================================
// 「アルゴリズムとフローチャート」専用の体験。
//   ① メイン：コンピュータになって「1〜N を足す」フローチャートを最後まで実行する。
//      実行トークンが矢印の上を進み、条件で道が分かれ、くり返しで条件へ戻る。横の変数の箱が書き換わる
//   ② まとめ：いま動かした図の中にある「順次・選択・繰り返し」と、試験の書き方（←）
// ============================================================================

const STRUCTURES = [
  {
    name: "順次",
    tone: "bg-amber-50 ring-amber-200 text-amber-900",
    where: "「合計 ← 0」→「i ← 1」",
    what: "上から順に、1つずつ実行する",
  },
  {
    name: "選択（分岐）",
    tone: "bg-emerald-50 ring-emerald-200 text-emerald-900",
    where: "ひし形「i ≦ 5 ?」",
    what: "はい／いいえ で進む道が変わる",
  },
  {
    name: "繰り返し",
    tone: "bg-sky-50 ring-sky-200 text-sky-900",
    where: "「↺ 条件へ戻る」矢印",
    what: "条件が「はい」の間、同じ処理をくり返す",
  },
];

export default function AlgorithmExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🧭 <b>アルゴリズム</b>＝問題を解くための手順。<b>フローチャート</b>＝その手順を、箱と矢印で描いた図です。
        コンピュータは図のとおり、<b>1つずつ・書いてある順に</b>実行します。
      </div>

      <Panel>
        <SectionTitle emoji="▶">コンピュータになって最後まで実行</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          お題は<b className="text-gray-800">「1 から 5 までを足す」</b>。黄色い●が「いま実行している場所」です。
          再生すると●が矢印の上を進み、<b className="text-gray-800">条件の答えで道が変わり</b>、
          くり返しでは<b className="text-gray-800">条件へ戻り</b>ます。右の変数の箱がどう変わるかも見てみよう。
        </p>
        <div className="mt-3">
          <FlowRun />
        </div>
      </Panel>

      <Panel>
        <SectionTitle emoji="📌">いま動かした図に、3つの基本構造がそろっている</SectionTitle>
        <ul className="mt-3 space-y-2">
          {STRUCTURES.map((s) => (
            <li key={s.name} className={`rounded-xl px-3.5 py-2.5 text-sm ring-1 ${s.tone}`}>
              <b>{s.name}</b>
              <span className="ml-1.5 text-xs opacity-80">図の {s.where}</span>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-700">{s.what}</p>
            </li>
          ))}
        </ul>

        <h4 className="mt-4 text-sm font-bold text-gray-800">試験の書き方：「←」は「右の値を左の箱に入れる」</h4>
        <dl className="mt-2 space-y-1.5">
          {FORMAL_MAPPINGS.map((m) => (
            <div key={m.formal} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <dt className="text-xs font-bold leading-relaxed text-gray-700">{m.beginner}</dt>
              <dd>
                <code className="rounded-lg bg-gray-900 px-2.5 py-1 font-mono text-xs font-bold text-white">{m.formal}</code>
              </dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
