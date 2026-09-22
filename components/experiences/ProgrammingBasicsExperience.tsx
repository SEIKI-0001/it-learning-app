"use client";

import { DataFormatStage, FunctionStage, NumberBranchStage, SumLoopStage, TranslateStage } from "./progbasics/ExamStages";
import { BranchStage, StairsStage, VariableStage } from "./progbasics/LifeStages";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「プログラミング基礎」専用の体験。
//   3つの部品を「朝、家を出るまで」のひと続きの場面で見せる。どれも自動で動き、
//   下のプログラムの「いま実行している行」が光る。ユーザーが選ぶのは条件（天気・回数）だけ。
//   ① 変数     … 天気予報の値が〈天気〉の箱に入る／名前で呼ぶと中身が出る／上書きで入れ替わる
//   ② 条件分岐 … 「天気は雨？」で 傘の道／そのままの道 に分かれて歩く（中心の体験）
//      → 数の条件（a ≧ 5）でも、実行されるのはどちらか一方だけ
//   ③ 繰り返し … 「1段のぼる」を N 回くり返して階段をのぼり、N 回で止まる
//      → カウンタ i と 合計 を書き換えながらくり返し、i が上限を超えたら抜ける
//   ④ 関数     … 手順のまとまりに名前をつけ、呼び出す → 中身を実行 → 戻る
//   ⑤ 翻訳     … コンパイラ／インタプリタ／アセンブラ（＋リンカ）で機械語にする
//   ⑥ データの書き方 … 同じデータを JSON／XML／HTML／CSV で書き比べる
//   ②〜⑥の後半は、下の確認問題を解ける所まで持っていくための追加解説。
// ============================================================================

export default function ProgrammingBasicsExperience() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💻 プログラムは、コンピュータへの<b>作業手順書</b>。組み合わせる部品は基本この3つだけ：
        <b>変数（値を入れる箱）</b>・<b>条件分岐（もし〜なら）</b>・<b>繰り返し（同じことを何回も）</b>。
        どれも<b>朝、家を出るまでに毎日やっていること</b>です。
        後半では、手順をまとめる<b>関数</b>、機械語への<b>翻訳</b>、<b>データの書き方</b>も見ていきます。
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
        <p className="mt-4 text-sm leading-relaxed text-gray-600">
          試験では<b className="text-gray-800">数の条件</b>でよく出ます。a に入れる数を変えてみよう。
        </p>
        <div className="mt-2">
          <NumberBranchStage reducedMotion={reducedMotion} />
        </div>
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          ⚠️ 実行されるのは<b>どちらか一方だけ</b>（両方・どちらも無し にはならない）。
          「<b>≧（以上）</b>」は境目の数を<b>含み</b>、「<b>＞（より大きい）</b>」は含みません。
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

      <Panel>
        <SectionTitle step={4}>繰り返しで合計を求める</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          試験の定番は、回数を数える<b className="text-gray-800">カウンタ i</b> を使って「<b className="text-gray-800">i が3以下の間、合計に i を足す</b>」形。
          箱の中身がどう変わるか、1行ずつ追ってみよう。
        </p>
        <div className="mt-3">
          <SumLoopStage reducedMotion={reducedMotion} />
        </div>
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
          ⚠️ 解き方のコツ：<b>i と 合計 の表</b>を書いて1行ずつ追う。条件を確かめるのは<b>足す前</b>なので、
          i が4になった時点で終わり、4は足しません（1＋2＋3＝<b>6</b>）。最後の i（4）や、4まで足した10と間違えないこと。
        </div>
      </Panel>

      <Panel>
        <SectionTitle step={5}>関数 ＝ 手順のまとまりに名前をつける</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          毎朝の「顔を洗う・歯をみがく・着替える」を毎回書くのは大変。まとめて<b className="text-gray-800">名前をつけておけば、1行で呼び出せます</b>。
        </p>
        <div className="mt-3">
          <FunctionStage reducedMotion={reducedMotion} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs" data-testid="fn-compare">
          {[
            { name: "変数", ex: "天気 ← 雨", note: "値を1つ入れる箱" },
            { name: "配列", ex: "気温[1], 気温[2]…", note: "同じ種類の値を番号で並べた箱" },
            { name: "関数（サブルーチン）", ex: "身支度()", note: "処理のまとまりに名前→何度も呼べる", hit: true },
            { name: "コメント", ex: "// 朝の準備", note: "人向けのメモ。実行されない" },
          ].map((c) => (
            <div key={c.name} className={`rounded-xl p-2.5 ring-1 ${c.hit ? "bg-sky-50 ring-sky-300" : "bg-gray-50 ring-gray-200"}`}>
              <p className="font-bold text-gray-800">{c.name}</p>
              <code className="mt-0.5 block font-mono text-[11px] text-gray-500">{c.ex}</code>
              <p className="mt-0.5 leading-snug text-gray-600">{c.note}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle step={6}>書いたプログラムを機械語に翻訳する</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          CPUが直接わかるのは<b className="text-gray-800">機械語（0と1）</b>だけ。人が書いたプログラムは、翻訳役のソフトが機械語にします。
          翻訳役を切り替えて、違いを見てみよう。
        </p>
        <div className="mt-3">
          <TranslateStage reducedMotion={reducedMotion} />
        </div>
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-200" data-testid="trans-summary">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="px-2.5 py-1.5 text-left font-bold">翻訳役</th>
                <th className="px-2 py-1.5 text-left font-bold">何を・どう翻訳する？</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["アセンブラ", "アセンブリ言語（記号）→ 機械語。1対1で置き換え"],
                ["コンパイラ", "高水準言語 → 機械語。全体をまとめて翻訳してから実行"],
                ["インタプリタ", "高水準言語を1行ずつ翻訳しながら実行"],
                ["リンカ", "翻訳ではなく、翻訳済みの部品をつなげて実行ファイルにする"],
              ].map(([name, what]) => (
                <tr key={name} className="border-t border-gray-100">
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-bold text-gray-800">{name}</td>
                  <td className="px-2 py-1.5 text-gray-600">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <SectionTitle step={7}>データの書き方 ＝ JSON・XML・HTML・CSV</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          プログラム同士やWebでデータをやりとりするときの<b className="text-gray-800">書き方（データ記述言語）</b>です。形式を切り替えて見比べよう。
        </p>
        <div className="mt-3">
          <DataFormatStage />
        </div>
        <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
          📌 見分け方：<b>キーと値の組</b>→JSON ／ <b>自由に決めたタグ</b>→XML ／ <b>Webページの構造</b>→HTML ／ <b>カンマ区切りの表</b>→CSV
        </div>
      </Panel>
    </div>
  );
}
