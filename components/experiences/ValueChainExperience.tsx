"use client";

import { useState } from "react";
import { Panel, SectionTitle, StepNav } from "./ui";

// ============================================================================
// 「バリューチェーン（価値連鎖）」専用の体験。
//   ① 工場ラインを進める … 主活動を1歩ずつ進めると製品が姿を変え、
//      価値バーが積み上がっていく（最後にマージン＝利益が見える）
//   ② 支援活動 … タップすると「もし無かったら」ラインがどう困るかが分かる
//   ③ 「主活動？支援活動？」仕分けクイズ
// ============================================================================

// ① 主活動ライン ------------------------------------------------------------
const MAIN = [
  { emo: "📥", name: "購買物流", product: "🪵", state: "原材料が届いた", d: "原材料や部品を仕入れ、受け入れる", value: 15 },
  { emo: "🏭", name: "製造", product: "🪑", state: "製品ができた！", d: "材料を加工して製品をつくる", value: 40 },
  { emo: "📦", name: "出荷物流", product: "📦", state: "箱詰めして配送", d: "完成した製品を保管・配送する", value: 55 },
  { emo: "🛒", name: "販売・マーケティング", product: "🏷️", state: "店頭に並んだ", d: "宣伝し、顧客に売る", value: 75 },
  { emo: "🔧", name: "サービス", product: "😊", state: "顧客が満足！", d: "アフターサポートで価値を保つ", value: 90 },
];

function MainFlow() {
  const [idx, setIdx] = useState(0);
  const cur = MAIN[idx];
  const atEnd = idx === MAIN.length - 1;
  return (
    <Panel>
      <SectionTitle step={1}>主活動 ― 工程を進めて価値を積み上げる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">主活動</b>は価値を直接生み出す流れ。いすを作る会社で「次へ」を押して、
        <b className="text-gray-800">材料が売り物に変わっていく</b>様子を見てみよう。
      </p>

      {/* 工程チップ */}
      <div className="mt-3 flex gap-1">
        {MAIN.map((m, i) => (
          <div
            key={m.name}
            className={`flex-1 rounded-md px-0.5 py-1.5 text-center transition ${
              i === idx ? "bg-brand-600" : i < idx ? "bg-brand-100" : "bg-gray-100"
            }`}
          >
            <div className="text-sm leading-none">{m.emo}</div>
            <div
              className={`mt-0.5 text-[9px] font-bold leading-tight ${
                i === idx ? "text-white" : i < idx ? "text-brand-600" : "text-gray-400"
              }`}
            >
              {m.name.split("・")[0]}
            </div>
          </div>
        ))}
      </div>

      {/* 製品の今 */}
      <div className="mt-3 rounded-xl bg-gray-50 p-4 text-center ring-1 ring-gray-200">
        <div className="text-4xl transition-all">{cur.product}</div>
        <div className="mt-1 text-sm font-bold text-gray-800">{cur.state}</div>
        <div className="mt-0.5 text-xs text-gray-500">
          {cur.emo} {cur.name}：{cur.d}
        </div>
      </div>

      {/* 価値バー */}
      <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-gray-600">💰 積み上がった価値</span>
          <span className={atEnd ? "text-emerald-600" : "text-brand-600"}>
            {atEnd ? "コスト＋マージン（利益）" : `価値 ${cur.value}`}
          </span>
        </div>
        <div className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${atEnd ? 70 : cur.value}%` }}
          />
          {atEnd && <div className="h-full w-[20%] bg-emerald-500 transition-all duration-500" />}
        </div>
        {atEnd && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-700">
            🎉 各工程で加わった価値の合計が売値に。<b>コスト（紫）を引いて残った緑がマージン（利益）</b>です。
          </p>
        )}
      </div>

      <StepNav
        index={idx}
        total={MAIN.length}
        onPrev={() => setIdx((i) => Math.max(0, i - 1))}
        onNext={() => setIdx((i) => Math.min(MAIN.length - 1, i + 1))}
        onReset={() => setIdx(0)}
        doneLabel="マージン 💰"
      />
    </Panel>
  );
}

// ② 支援活動 ----------------------------------------------------------------
const SUPPORT = [
  { emo: "🏢", name: "全般管理", d: "経営・経理・法務など全体の管理", without: "お金や契約の管理がぐちゃぐちゃに。ライン全体が混乱して止まる" },
  { emo: "👥", name: "人事・労務管理", d: "採用・教育・働く環境づくり", without: "働く人が足りず育たない。製造も販売も回らなくなる" },
  { emo: "🔬", name: "技術開発", d: "研究や新技術の開発", without: "製品が古いまま進化しない。ライバルに追い抜かれる" },
  { emo: "🛍️", name: "調達", d: "設備や資材を買い入れる活動", without: "機械も資材も届かない。ラインがそもそも動かせない" },
];

function Support() {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <Panel>
      <SectionTitle step={2}>支援活動 ― 無くなるとラインが困る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">支援活動</b>は直接モノを作らないけれど、主活動の全工程を下支えします。
        タップして<b className="text-gray-800">「もし無かったら」</b>を確かめてみよう。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {SUPPORT.map((s, i) => {
          const picked = sel === i;
          return (
            <button
              key={s.name}
              onClick={() => setSel(picked ? null : i)}
              className={`rounded-xl p-3 text-left ring-2 transition active:scale-95 ${
                picked ? "bg-rose-50 ring-rose-300" : "bg-gray-50 ring-gray-200"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{picked ? "🚫" : s.emo}</span>
                <span className={`text-sm font-bold ${picked ? "text-rose-700" : "text-gray-800"}`}>{s.name}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{s.d}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-3 min-h-[3.5em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {sel === null ? (
          <p className="text-sm leading-relaxed text-gray-400">どれかをタップすると、無くなったときの影響が出ます。</p>
        ) : (
          <p className="text-sm leading-relaxed text-rose-700">
            🚫 <b>{SUPPORT[sel].name}</b>が無いと… {SUPPORT[sel].without}。
            <span className="text-gray-600">直接は作らないけれど、<b className="text-gray-800">全工程に効いている</b>のが支援活動。</span>
          </p>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        ※ 人事・技術開発・調達は「価値を直接生む流れ」ではなく、それを<b>支える</b>側＝支援活動。
        ここが主活動とよく取り違えられます。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: "主活動" | "支援活動"; why: string }[] = [
  { t: "工場で部品を組み立てて製品をつくる", ans: "主活動", why: "製造は価値を直接生む主活動。" },
  { t: "社員を採用し、研修で育てる", ans: "支援活動", why: "人事・労務管理は主活動を支える支援活動。" },
  { t: "完成した商品を店舗やお客様へ配送する", ans: "主活動", why: "出荷物流は主活動。" },
  { t: "新しい素材を研究開発する", ans: "支援活動", why: "技術開発は支援活動。" },
  { t: "広告を出して商品を売り込む", ans: "主活動", why: "販売・マーケティングは主活動。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>主活動？　支援活動？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
                {(["主活動", "支援活動"] as const).map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === q.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === q.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は「${q.ans}」。 `}
                  {q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function ValueChainExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔗 バリューチェーン（価値連鎖）は、会社の活動を<b>「価値を直接生む主活動」</b>と
        <b>「それを支える支援活動」</b>に分け、<b>どこに強みがあるか</b>を見える化します。
      </div>

      <MainFlow />
      <Support />
      <Quiz />
    </div>
  );
}
