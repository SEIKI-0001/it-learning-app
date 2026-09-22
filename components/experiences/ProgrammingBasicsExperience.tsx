"use client";

import { BranchStage, StairsStage, VariableStage } from "./progbasics/LifeStages";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「プログラミング基礎」専用の体験。
//   3つの部品を「朝、家を出るまで」のひと続きの場面で見せる。どれも自動で動き、
//   下のプログラムの「いま実行している行」が光る。ユーザーが選ぶのは条件（天気・回数）だけ。
//   ① 変数     … 天気予報の値が〈天気〉の箱に入る／名前で呼ぶと中身が出る／上書きで入れ替わる
//   ② 条件分岐 … 「天気は雨？」で 傘の道／そのままの道 に分かれて歩く（中心の体験）
//   ③ 繰り返し … 「1段のぼる」を N 回くり返して階段をのぼり、N 回で止まる
//   （処理の流れ全体をフローチャートで追うのはアルゴリズム体験。ここは部品の直感に絞る）
// ============================================================================

export default function ProgrammingBasicsExperience() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💻 プログラムは、コンピュータへの<b>作業手順書</b>。組み合わせる部品は基本この3つだけ：
        <b>変数（値を入れる箱）</b>・<b>条件分岐（もし〜なら）</b>・<b>繰り返し（同じことを何回も）</b>。
        どれも<b>朝、家を出るまでに毎日やっていること</b>です。
      </div>

      <Panel>
        <SectionTitle step={1}>変数 ＝ 名前をつけた箱</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          天気予報を見て、覚えておく。その「覚えておく場所」が変数です。自動で動くので見ていてね。
        </p>
        <div className="mt-3">
          <VariableStage reducedMotion={reducedMotion} />
        </div>
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          ⚠️ 「<b>←</b>」（言語によっては「<b>=</b>」）は算数の<b>「等しい」ではありません</b>。
          「<b>右の値を箱に入れる</b>」という意味で、これを<b>代入</b>といいます。箱に入る値は<b>いつも1つ</b>です。
        </div>
      </Panel>

      <Panel>
        <SectionTitle step={2}>条件分岐 ＝ もし〜なら</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          「<b className="text-gray-800">雨なら傘を持つ、そうでなければそのまま</b>」。条件によって<b className="text-gray-800">やることが変わる</b>のが条件分岐です。
          天気を切り替えると、すぐに歩き出します。
        </p>
        <div className="mt-3">
          <BranchStage reducedMotion={reducedMotion} />
        </div>
      </Panel>

      <Panel>
        <SectionTitle step={3}>繰り返し ＝ 同じことを何回も</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          駅の階段。「1段のぼる」を5回書く代わりに、<b className="text-gray-800">「5回くり返す」の1行</b>で済ませるのが繰り返しです。
        </p>
        <div className="mt-3">
          <StairsStage reducedMotion={reducedMotion} />
        </div>
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          ⚠️ 「<b>いつ止めるか（終了条件）</b>」が大切。決め忘れると、いつまでも止まりません（<b>無限ループ</b>）。
        </div>
      </Panel>
    </div>
  );
}
