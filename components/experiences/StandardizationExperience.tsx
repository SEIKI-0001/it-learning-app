"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「標準化（JIS・ISO・デファクト・バーコード）」専用の体験。
//   ① ばらばら ⇄ そろえる トグルで標準化のメリットを体感
//   ② 規格の種類（JIS/ISO/デファクト）
//   ③ JIS/ISO/デファクト 仕分けクイズ
// ============================================================================

function WhyStandardize() {
  const [std, setStd] = useState(false);
  return (
    <Panel>
      <SectionTitle step={1}>そろえると、何がうれしい？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        標準化は、形やルールを<b className="text-gray-800">みんなで共通にそろえる</b>こと。
        切り替えて違いを見てみましょう。
      </p>

      <div className="mt-3 flex gap-1.5">
        <button
          onClick={() => setStd(false)}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            !std ? "bg-rose-500 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          ばらばら
        </button>
        <button
          onClick={() => setStd(true)}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            std ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
          }`}
        >
          そろえる（標準化）
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 rounded-xl bg-gray-50 px-4 py-5 ring-1 ring-gray-200">
        {std ? (
          <>
            <span className="text-3xl">🔌</span>
            <span className="text-2xl text-emerald-500">→</span>
            <span className="text-3xl">🔋</span>
            <span className="text-2xl text-emerald-500">✓</span>
          </>
        ) : (
          <>
            <span className="text-3xl">🔌</span>
            <span className="text-2xl text-rose-400">→</span>
            <span className="text-3xl opacity-40">🔋</span>
            <span className="text-2xl text-rose-500">✕</span>
          </>
        )}
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${
          std
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : "bg-rose-50 text-rose-800 ring-rose-200"
        }`}
      >
        {std ? (
          <>
            ✅ 規格がそろっていれば、<b>どのメーカーの製品でも組み合わせて使える</b>。
            交換・修理・大量生産がしやすく、コストも下がる。
          </>
        ) : (
          <>
            ⚠️ 形やサイズがバラバラだと、<b>組み合わせられず・交換もできない</b>。
            毎回専用品が必要で不便でコスト高。
          </>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        ※ 乾電池・ネジ・USBなどが世界共通なのは標準化のおかげ。互換性・効率・品質の安定につながる。
      </p>
    </Panel>
  );
}

const KINDS = [
  { emo: "🇯🇵", name: "JIS", d: "日本の国家規格（日本産業規格）。国内で正式に定められたもの。" },
  { emo: "🌍", name: "ISO", d: "国際規格。ISO（国際標準化機構）が世界共通として定めたもの。" },
  { emo: "📈", name: "デファクトスタンダード", d: "公的に決めたわけではないが、広く使われて“事実上の標準”になったもの。" },
];

function Kinds() {
  return (
    <Panel>
      <SectionTitle step={2}>規格にも種類がある</SectionTitle>
      <div className="mt-3 space-y-2">
        {KINDS.map((k) => (
          <div key={k.name} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-lg">{k.emo}</span>
              <span className="text-sm font-extrabold text-gray-800">{k.name}</span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-600">{k.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-2.5 text-xs leading-relaxed text-sky-800 ring-1 ring-sky-200">
        📌 商品管理では <b>バーコード（JANコード）</b>＝横線で数字を表す／
        <b>QRコード</b>＝四角の二次元コードで多くの情報を持てる、もよく出ます。
      </div>
    </Panel>
  );
}

const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "国際標準化機構が世界共通として定めた規格。",
    ans: "ISO",
    opts: ["ISO", "JIS", "デファクトスタンダード"],
    why: "国際規格＝ISO。",
  },
  {
    t: "日本の国家規格として正式に定められたもの。",
    ans: "JIS",
    opts: ["JIS", "ISO", "デファクトスタンダード"],
    why: "日本の国家規格＝JIS（日本産業規格）。",
  },
  {
    t: "公的に決めたわけではないが、市場で広く使われて事実上の標準になったもの。",
    ans: "デファクトスタンダード",
    opts: ["デファクトスタンダード", "JIS", "ISO"],
    why: "事実上の標準＝デファクトスタンダード。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>どの規格？</SectionTitle>
      <ul className="mt-3 space-y-3">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.opts.map((opt) => {
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
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${tone}`}
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

export default function StandardizationExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        📏 標準化は<b>「形やルールを共通にそろえる」</b>こと。そろえると組み合わせ・交換・大量生産がしやすくなります。
        規格は<b>JIS（日本）／ISO（国際）／デファクト（事実上）</b>。
      </div>

      <WhyStandardize />
      <Kinds />
      <Quiz />
    </div>
  );
}
