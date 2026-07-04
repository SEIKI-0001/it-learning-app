"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「法務とコンプライアンス」専用の体験。
//   ① 3つの盾を破ってみる … 法律・社内ルール・倫理の盾が「会社の信用」を守る図。
//      タップで盾が割れ、事件例が出て信用ゲージが下がる（法律だけ守ってもダメ）
//   ② 行動がコンプライアンス的にOK/NGかを判定するクイズ
// ============================================================================

type Ring = "law" | "rule" | "ethics";

const SHIELDS: { id: Ring; name: string; emoji: string; desc: string; incident: string; damage: number }[] = [
  {
    id: "law",
    name: "法律",
    emoji: "⚖️",
    desc: "国が定めたルール。破ると罰せられる（個人情報保護法・著作権法など）",
    incident: "個人情報を漏えいさせて書類送検。罰金＋ニュースで大きく報道…",
    damage: 60,
  },
  {
    id: "rule",
    name: "社内ルール",
    emoji: "📋",
    desc: "会社が決めた約束ごと（情報の持ち出し禁止・SNS投稿のルールなど）",
    incident: "ルール無視の情報持ち出しが事故に。処分＋取引先の信頼を失う…",
    damage: 30,
  },
  {
    id: "ethics",
    name: "社会の約束（倫理）",
    emoji: "🤝",
    desc: "法律になくても守るべき良識・フェアさ（うそをつかない・差別をしない）",
    incident: "法律違反ではないが不誠実な対応が炎上。客離れが止まらない…",
    damage: 40,
  },
];

function ShieldDemo() {
  const [broken, setBroken] = useState<Record<Ring, boolean>>({ law: false, rule: false, ethics: false });
  const brokenList = SHIELDS.filter((s) => broken[s.id]);
  const trust = Math.max(0, 100 - brokenList.reduce((sum, s) => sum + s.damage, 0));
  const tone = trust >= 70 ? "bg-emerald-500" : trust >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <Panel>
      <SectionTitle step={1}>3つの盾が「会社の信用」を守る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        会社の信用は<b className="text-gray-800">3つの盾</b>で守られています。
        盾をタップして<b className="text-gray-800">破ってみる</b>と、何が起きるか分かります。
      </p>

      {/* 信用ゲージ */}
      <div className="mt-4 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-gray-600">🏢 会社の信用</span>
          <span className={trust >= 70 ? "text-emerald-600" : trust >= 40 ? "text-amber-600" : "text-rose-600"}>
            {trust}%{trust === 0 && "（倒産の危機…）"}
          </span>
        </div>
        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${trust}%` }} />
        </div>
      </div>

      {/* 3つの盾 */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {SHIELDS.map((s) => {
          const isBroken = broken[s.id];
          return (
            <button
              key={s.id}
              onClick={() => setBroken((p) => ({ ...p, [s.id]: !p[s.id] }))}
              aria-pressed={isBroken}
              className={`flex flex-col items-center rounded-xl border-2 p-2.5 transition-all active:scale-95 ${
                isBroken
                  ? "rotate-3 border-dashed border-rose-400 bg-rose-50 opacity-80"
                  : "border-indigo-300 bg-indigo-50"
              }`}
            >
              <span className="text-2xl leading-none">{isBroken ? "💥" : s.emoji}</span>
              <span
                className={`mt-1 text-[11px] font-extrabold leading-tight ${
                  isBroken ? "text-rose-600" : "text-indigo-700"
                }`}
              >
                {s.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* 起きたことの表示 */}
      <div className="mt-3 min-h-[4em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {brokenList.length === 0 ? (
          <p className="text-sm leading-relaxed text-emerald-700">
            ✅ 3つとも守れている＝信用は満タン。<b>どれか1つ破れただけで信用は大きく下がります</b>。盾をタップして確かめてみよう。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {brokenList.map((s) => (
              <li key={s.id} className="text-sm leading-relaxed text-rose-700">
                💥 <b>{s.name}</b>を破った → {s.incident}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 盾の中身 */}
      <div className="mt-3 space-y-1.5">
        {SHIELDS.map((s) => (
          <div key={s.id} className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed ring-1 ring-gray-200">
            <span className="text-sm">{s.emoji}</span>
            <span className="text-gray-600">
              <b className="text-gray-800">{s.name}</b>：{s.desc}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 注目は<b>倫理の盾</b>——法律を破っていなくても、不誠実なら信用は落ちます。
        コンプライアンス＝「法令遵守」だけでなく、<b>ルールと良識もセット</b>で守ること。
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

      <ShieldDemo />
      <Quiz />
    </div>
  );
}
