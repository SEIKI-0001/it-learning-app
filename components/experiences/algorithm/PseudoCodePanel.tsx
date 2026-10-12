"use client";

import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";
import { CodeLines, FlowDiagram } from "./FlowDiagram";

// ============================================================================
// 「アルゴリズムとフローチャート」④ 同じ手順を試験の擬似言語で読む（静的な図）。
//   上で動かした「1〜n を足す」のフローチャートと、試験の擬似言語を並べ、
//   ノードと行に同じ番号（①〜⑦）を振って対応させる。
//   続けて for 版（③④⑥ が1行にまとまる）と、if〜endif・÷ の商／余り の読み方。
//   記法は IPA の擬似言語（○整数型: 関数名(…)・←・if/elseif/else/endif・
//   for (i を 1 から n まで 1 ずつ増やす)/endfor・while/endwhile・return）に合わせる。
// ============================================================================

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-gray-600 [&_b]:font-bold [&_b]:text-gray-800">{children}</p>;
}

function SumFlow() {
  return (
    <FlowDiagram
      testId="pseudo-flow"
      title="合計に0、iに1を入れる。iがn以下なら合計にiを足し、iを1増やして条件へ戻る。n以下でなくなったら合計を返す"
      width={310}
      height={272}
      maxWidth="max-w-[19rem]"
      nodes={[
        { id: "start", x: 140, y: 12, w: 70, kind: "terminal", label: "sum(n)", badge: "①" },
        { id: "t0", x: 140, y: 48, w: 110, kind: "process", label: "合計 ← 0", badge: "②" },
        { id: "i1", x: 140, y: 88, w: 110, kind: "process", label: "i ← 1", badge: "③" },
        { id: "if", x: 140, y: 146, w: 104, h: 44, kind: "decision", label: "i ≦ n ?", badge: "④" },
        { id: "add", x: 140, y: 200, w: 120, kind: "process", label: "合計 ← 合計 ＋ i", badge: "⑤" },
        { id: "inc", x: 140, y: 240, w: 120, kind: "process", label: "i ← i ＋ 1", badge: "⑥" },
        { id: "ret", x: 266, y: 200, w: 76, kind: "terminal", label: "合計を返す", badge: "⑦" },
      ]}
      edges={[
        { pts: [[140, 23], [140, 34]] },
        { pts: [[140, 62], [140, 74]] },
        { pts: [[140, 102], [140, 124]] },
        { pts: [[140, 168], [140, 186]], kind: "yes", label: "はい", labelAt: [158, 177] },
        { pts: [[140, 214], [140, 226]] },
        { pts: [[140, 254], [140, 264], [26, 264], [26, 113], [136, 113]], kind: "loop", label: "戻る", labelAt: [26, 190] },
        { pts: [[192, 146], [266, 146], [266, 189]], kind: "no", label: "いいえ", labelAt: [230, 146] },
      ]}
    />
  );
}

export function PseudoCodePanel() {
  return (
    <Panel>
      <SectionTitle icon="file-text">同じ手順を、試験の擬似言語で読む</SectionTitle>
      <Lead>
        試験では、フローチャートと同じ手順が<b>擬似言語</b>という決まった書き方の文章でも出ます。
        さっきの「足し算」を、上限を <b>n</b> にして書き直しました。<b>同じ番号どうしが同じ処理</b>です。
      </Lead>

      <div className="mt-4 grid items-center gap-4 sm:grid-cols-2">
        <SumFlow />
        <CodeLines
          testId="pseudo-while"
          lines={[
            { badge: "①", code: "○整数型: sum(整数型: n)", note: "関数の始まり" },
            { indent: 1, code: "整数型: 合計, i", note: "使う変数" },
            { badge: "②", indent: 1, code: "合計 ← 0" },
            { badge: "③", indent: 1, code: "i ← 1" },
            { badge: "④", indent: 1, code: "while (i ≦ n)", focus: true },
            { badge: "⑤", indent: 2, code: "合計 ← 合計 + i" },
            { badge: "⑥", indent: 2, code: "i ← i + 1" },
            { indent: 1, code: "endwhile", note: "④へ戻る" },
            { badge: "⑦", indent: 1, code: "return 合計", note: "値を返して終わる" },
          ]}
        />
      </div>

      <dl className="mt-4 space-y-1.5 text-[13px] leading-relaxed text-gray-700" data-testid="pseudo-reading">
        <div className="flex gap-2">
          <dt className="w-[8.5rem] flex-none font-mono font-bold text-gray-900">○整数型: sum(…)</dt>
          <dd>関数の始まり。<b className="text-gray-900">○の後ろの型</b>（整数型）は、返す値の種類</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-[8.5rem] flex-none font-mono font-bold text-gray-900">while 〜 endwhile</dt>
          <dd>条件が成り立つ間、間の行をくり返す。<b className="text-gray-900">endwhile まで来たら条件へ戻る</b></dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-[8.5rem] flex-none font-mono font-bold text-gray-900">return 合計</dt>
          <dd>合計の値を呼び出し元へ返し、関数を終える。sum(5) なら 15 が返る</dd>
        </div>
      </dl>
    </Panel>
  );
}

export function PseudoSyntaxPanel() {
  return (
    <Panel>
      <SectionTitle icon="file-text">擬似言語の書き方：for・if・商と余り</SectionTitle>

      <h4 className="mt-3 text-sm font-bold text-gray-800">for で書くと、③④⑥ が1行にまとまる</h4>
      <div className="mt-2">
        <CodeLines
          testId="pseudo-for"
          lines={[
            { indent: 1, code: "合計 ← 0" },
            { badge: "③④⑥", indent: 1, code: "for (i を 1 から n まで 1 ずつ増やす)", focus: true },
            { badge: "⑤", indent: 2, code: "合計 ← 合計 + i" },
            { indent: 1, code: "endfor" },
            { badge: "⑦", indent: 1, code: "return 合計" },
          ]}
        />
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-700">
        for の1行に「i を 1 から始める（③）」「n を超えたら抜ける（④）」「1周ごとに i を1増やす（⑥）」が入っています。
        だから間に書くのは ⑤ だけ。<b className="text-gray-900">while 版と同じ結果</b>になります。
      </p>

      <h4 className="mt-5 text-sm font-bold text-gray-800">分岐 if 〜 endif：上から調べて、当てはまった1つだけ実行</h4>
      <div className="mt-2">
        <CodeLines
          testId="pseudo-if"
          lines={[
            { code: "if (点数 ≧ 80)" },
            { indent: 1, code: "評価 ← \"A\"" },
            { code: "elseif (点数 ≧ 60)", note: "80未満のときだけ調べる" },
            { indent: 1, code: "評価 ← \"B\"" },
            { code: "else", note: "どれにも当てはまらないとき" },
            { indent: 1, code: "評価 ← \"C\"" },
            { code: "endif" },
          ]}
        />
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-700">
        点数が 70 なら、1つ目（80以上）は「いいえ」、2つ目（60以上）が「はい」で 評価 は <b className="text-gray-900">B</b>。
        フローチャートのひし形を、上から順に並べたものです。
      </p>

      <h4 className="mt-5 text-sm font-bold text-gray-800">割り算は「商」と「余り」を区別する</h4>
      <div className="mt-2 grid gap-1.5 text-[13px] sm:grid-cols-3" data-testid="pseudo-divmod">
        {[
          { code: "7 ÷ 3 の商", value: "2", note: "割り算の整数部分" },
          { code: "7 ÷ 3 の余り", value: "1", note: "割り切れずに残った数" },
          { code: "i ÷ 3 の余り が 0 と等しい", value: "i は 3 の倍数", note: "割り切れる、という意味" },
        ].map((d) => (
          <div key={d.code} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <code className="block font-mono text-xs font-bold text-gray-900">{d.code}</code>
            <p className="mt-0.5 font-bold text-gray-900">→ {d.value}</p>
            <p className="text-[11px] text-gray-500">{d.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700">
        解き方はフローチャートと同じ。<b className="text-gray-900">変数の値を1行ずつメモしながら</b>、上から順にたどります。
      </p>
    </Panel>
  );
}
