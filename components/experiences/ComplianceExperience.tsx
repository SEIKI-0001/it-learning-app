"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「法務とコンプライアンス」専用の体験。
//   ① コンプライアンスが守る3つの輪（法律＋社内ルール＋社会の約束）をタップ
//   ② 行動がコンプライアンス的にOK/NGかを判定するクイズ
// ============================================================================

type Ring = "law" | "rule" | "ethics";

const RINGS: Record<Ring, { name: string; emoji: string; desc: string; ex: string; color: string }> = {
  law: {
    name: "法律",
    emoji: "⚖️",
    desc: "国が定めたルール。破ると罰せられる",
    ex: "例：個人情報保護法、著作権法、不正アクセス禁止法",
    color: "indigo",
  },
  rule: {
    name: "社内ルール",
    emoji: "📋",
    desc: "会社が決めた約束ごと・マニュアル",
    ex: "例：情報の持ち出し禁止、SNS投稿のルール",
    color: "emerald",
  },
  ethics: {
    name: "社会の約束（倫理）",
    emoji: "🤝",
    desc: "法律になくても守るべき良識・フェアさ",
    ex: "例：うそをつかない、差別をしない",
    color: "amber",
  },
};

const TONE: Record<string, { on: string; off: string }> = {
  indigo: { on: "bg-indigo-500 text-white ring-indigo-500", off: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  emerald: { on: "bg-emerald-500 text-white ring-emerald-500", off: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  amber: { on: "bg-amber-500 text-white ring-amber-500", off: "bg-amber-50 text-amber-700 ring-amber-200" },
};

function Rings() {
  const [sel, setSel] = useState<Ring | null>(null);
  const order: Ring[] = ["law", "rule", "ethics"];
  return (
    <Panel>
      <SectionTitle step={1}>コンプライアンス＝「守る」こと</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        コンプライアンスは「法令遵守」と訳されますが、守る対象は法律だけではありません。3つをタップで確認しよう。
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {order.map((r) => {
          const c = RINGS[r];
          const on = sel === r;
          const tone = TONE[c.color];
          return (
            <button
              key={r}
              onClick={() => setSel(r)}
              className={`flex flex-col items-center rounded-xl p-2.5 ring-2 transition active:scale-95 ${
                on ? tone.on : tone.off
              }`}
            >
              <span className="text-2xl leading-none">{c.emoji}</span>
              <span className="mt-1 text-[11px] font-extrabold leading-tight">{c.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 min-h-[4em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {sel ? (
          <>
            <div className="text-sm font-extrabold text-gray-800">
              {RINGS[sel].emoji} {RINGS[sel].name}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{RINGS[sel].desc}</p>
            <p className="mt-1 text-xs text-gray-500">{RINGS[sel].ex}</p>
          </>
        ) : (
          <span className="text-sm text-gray-400">3つのうちどれかをタップしてね。</span>
        )}
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 スポーツで「反則しない（法律）」だけでなく「フェアプレー（倫理）」も大切なのと同じ。
        違反は<b>会社の信用</b>を失わせます。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "仕事で知った顧客の住所を友だちに教える", ok: false, why: "個人情報の漏えい。法律にも社内ルールにも反する。" },
  { t: "ネットの画像を出典も確認せず広告に使う", ok: false, why: "著作権の侵害になりうる。許可や確認が必要。" },
  { t: "社内ルールに従って情報を適切に管理する", ok: true, why: "ルールを守る＝コンプライアンスの基本。" },
  { t: "ミスを隠さず正直に報告する", ok: true, why: "正直さ・誠実さ（倫理）もコンプライアンスに含まれる。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={2}>この行動、コンプライアンス的にOK？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const answered = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-2">
                {[
                  { v: true, label: "⭕ OK" },
                  { v: false, label: "🚫 NG" },
                ].map((opt) => {
                  const picked = chosen === opt.v;
                  const tone = !answered
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt.v === it.ok
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(opt.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : "❌ 残念。 "}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function ComplianceExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🧑‍⚖️ <b>コンプライアンス</b>は、<b>法律・社内ルール・社会の約束</b>を守ること。
        ITでは個人情報・著作権・不正アクセスなど、情報の扱いがよく問われます。
      </div>

      <Rings />
      <Quiz />
    </div>
  );
}
