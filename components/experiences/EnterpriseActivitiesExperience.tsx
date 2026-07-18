"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";
import ExplanationSlides from "@/components/learn/ExplanationSlides";

// ============================================================================
// 「企業活動とステークホルダ」専用の体験。
//   ① 自社を中心にした放射図。タップすると「与える⇄受け取る」の交換が見える
//   ② ステークホルダに含まれる？ 仕分けクイズ（株主だけと思う罠）
//   ③ CSR（社会的責任）のひとこと
// ============================================================================

type Holder = {
  name: string;
  emoji: string;
  give: string; // 会社 → 相手
  get: string; // 相手 → 会社
};

const HOLDERS: Holder[] = [
  { name: "顧客", emoji: "🙋", give: "商品・サービス", get: "代金・信頼" },
  { name: "株主", emoji: "💰", give: "配当・成長", get: "資金（出資）" },
  { name: "従業員", emoji: "👷", give: "給料・働く場", get: "労働力・アイデア" },
  { name: "取引先", emoji: "🤝", give: "代金・注文", get: "材料・協力" },
  { name: "地域社会", emoji: "🏘️", give: "雇用・地域貢献", get: "働く人・活動の場" },
  { name: "国・行政", emoji: "🏛️", give: "税金", get: "ルール・インフラ" },
];

// 放射図の配置（%指定、上から時計回りに6方向）
const POSITIONS = [
  { left: "50%", top: "0%" },
  { left: "93%", top: "25%" },
  { left: "93%", top: "75%" },
  { left: "50%", top: "100%" },
  { left: "7%", top: "75%" },
  { left: "7%", top: "25%" },
];

function Hub() {
  const [sel, setSel] = useState<number | null>(null);
  const h = sel !== null ? HOLDERS[sel] : null;

  return (
    <Panel>
      <SectionTitle step={1}>会社は多くの相手とつながっている</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        会社に関わる人や組織を<b className="text-gray-800">ステークホルダ（利害関係者）</b>と呼びます。
        まわりをタップすると、<b className="text-gray-800">おたがいに何をやり取りしているか</b>が見えます。
      </p>

      {/* 放射図: 中心=自社、周囲6ノード */}
      <div className="relative mx-auto mt-6 h-56 max-w-[300px]">
        {/* つながりの線（中心から各ノードへ） */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {POSITIONS.map((p, i) => (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={parseFloat(p.left)}
              y2={parseFloat(p.top)}
              stroke={sel === i ? "#4f46e5" : "#e5e7eb"}
              strokeWidth={sel === i ? 2.5 : 1.5}
              strokeDasharray={sel === i ? "none" : "3 3"}
            />
          ))}
        </svg>

        {/* 中心=自社 */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-indigo-600 text-center text-xs font-extrabold leading-tight text-white ring-4 ring-indigo-100">
            🏢
            <br />
            自社
          </div>
        </div>

        {/* 周囲のステークホルダ */}
        {HOLDERS.map((holder, i) => {
          const on = sel === i;
          return (
            <button
              key={holder.name}
              onClick={() => setSel(on ? null : i)}
              style={{ left: POSITIONS[i].left, top: POSITIONS[i].top }}
              className={`absolute z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center ring-2 transition active:scale-95 ${
                on ? "bg-emerald-500 text-white ring-emerald-500" : "bg-emerald-50 text-emerald-800 ring-emerald-200"
              }`}
            >
              <span className="text-base leading-none">{holder.emoji}</span>
              <span className="mt-0.5 text-[9px] font-extrabold leading-tight">{holder.name}</span>
            </button>
          );
        })}
      </div>

      {/* 与える⇄受け取る の表示 */}
      <div className="mt-4 min-h-[5.5em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        {h ? (
          <div>
            <div className="text-sm font-extrabold text-gray-800">
              {h.emoji} {h.name} とのやり取り
            </div>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5">
                <span className="text-xs font-bold text-indigo-500">自社 →</span>
                <span className="font-semibold text-gray-800">{h.give}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5">
                <span className="text-xs font-bold text-emerald-600">→ 自社</span>
                <span className="font-semibold text-gray-800">{h.get}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            まわりの相手をタップしてね。<b>一方通行ではなく「おたがいさま」</b>の関係が見えてきます。
          </p>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 たとえると学校行事も、生徒だけでなく<b>先生・保護者・地域の人</b>に関係します。
        「ステークホルダ＝株主だけ」ではない点が試験のポイント。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "その会社の商品を買う顧客", ok: true, why: "顧客はステークホルダの代表例。" },
  { t: "そこで働く従業員", ok: true, why: "従業員も会社と利害を共にする関係者。" },
  { t: "まったく関わりのない外国の知らない人", ok: false, why: "利害関係がなければステークホルダではない。" },
  { t: "会社がある地域の住民", ok: true, why: "地域社会もステークホルダ。環境や雇用で関わる。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={2}>ステークホルダにあたる？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「ステークホルダ＝株主だけ」と思いがちですが、もっと広い相手を指します。
      </p>
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
                  { v: true, label: "⭕ あたる" },
                  { v: false, label: "❌ ちがう" },
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

function CsrSummary() {
  return (
    <Panel>
      <SectionTitle step={3}>利益と社会的責任を両立する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        会社は利益を出すだけでなく、社会の一員としての責任（<b className="text-gray-800">CSR</b>）も果たします。
      </p>
      <div className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        🌍 ステークホルダには株主だけでなく、顧客・従業員・取引先・地域社会なども含まれます。
        信頼を得て活動を続けるために、利益とCSRの両方を大切にします。
      </div>
    </Panel>
  );
}

export default function EnterpriseActivitiesExperience() {
  return (
    <ExplanationSlides
      title={null}
      slides={[
        {
          id: "stakeholder-map",
          label: "関係図",
          content: (
            <div className="space-y-5">
              <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
                🏢 会社は商品やサービスで価値を生み、利益を得ながら社会に役立ちます。会社に関わる人・組織が
                <b>ステークホルダ（利害関係者）</b>。株主だけでなく、顧客・従業員・地域なども含みます。
              </div>
              <Hub />
            </div>
          ),
        },
        {
          id: "stakeholder-quiz",
          label: "見分け方",
          content: <Quiz />,
        },
        {
          id: "csr-summary",
          label: "CSRの要点",
          content: <CsrSummary />,
        },
      ]}
    />
  );
}
