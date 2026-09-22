"use client";

import { useState } from "react";
import { ExchangeMap, type Holder } from "./stakeholder/ExchangeMap";
import styles from "./stakeholder/stakeholder.module.css";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「企業活動とステークホルダ」専用の体験。
//   ① 自社を中心にした放射図。相手をタップすると、その相手との2本の流れ
//      （相手 → 自社、自社 → 相手）だけが順に動き、「おたがいさま」の交換が見える。
//      「全部の交換を流す」で7者ぶんが一斉に集まって返り、会社が交換の束でできていると分かる
//   ② ステークホルダに含まれる？ 仕分けクイズ（株主だけと思う罠）
//   ③ CSR（社会的責任）のひとこと
// ============================================================================

const HOLDERS: (Holder & { note?: string })[] = [
  { name: "顧客", emoji: "🙋", give: "商品・サービス", get: "代金・信頼", inTok: { icon: "💴", label: "代金" }, outTok: { icon: "📦", label: "商品" } },
  {
    name: "株主",
    emoji: "💰",
    give: "配当・成長・情報開示",
    get: "資金（出資）・経営の監視",
    inTok: { icon: "💰", label: "出資" },
    outTok: { icon: "💹", label: "配当" },
    note: "株主には経営状況を公開し（ディスクロージャー）、社外取締役などが経営を監視・けん制します（コーポレートガバナンス）。",
  },
  { name: "従業員", emoji: "👷", give: "給料・働く場", get: "労働力・アイデア", inTok: { icon: "💪", label: "労働" }, outTok: { icon: "💴", label: "給料" } },
  { name: "取引先", emoji: "🤝", give: "代金・注文", get: "材料・協力", inTok: { icon: "🧱", label: "材料" }, outTok: { icon: "💴", label: "代金" } },
  { name: "金融機関", emoji: "🏦", give: "利息・返済", get: "融資（借入）", inTok: { icon: "🏦", label: "融資" }, outTok: { icon: "💴", label: "利息" } },
  { name: "地域社会", emoji: "🏘️", give: "雇用・地域貢献", get: "働く人・活動の場", inTok: { icon: "🙌", label: "働き手" }, outTok: { icon: "🌱", label: "雇用" } },
  { name: "国・行政", emoji: "🏛️", give: "税金", get: "ルール・インフラ", inTok: { icon: "🛣️", label: "道路等" }, outTok: { icon: "🧾", label: "税金" } },
];

function Hub() {
  const reducedMotion = useReducedMotion();
  const [sel, setSel] = useState<number | "all" | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());
  const h = typeof sel === "number" ? HOLDERS[sel] : null;
  const allSeen = seen.size === HOLDERS.length;

  function pick(i: number) {
    if (sel === i) {
      setSel(null);
      return;
    }
    setSel(i);
    setRunKey((k) => k + 1);
    setSeen((prev) => new Set(prev).add(i));
  }

  function playAll() {
    setSel("all");
    setRunKey((k) => k + 1);
  }

  // 文章の行は、対応するトークンが届いたころに現れる（reduced-motion では最初から出す）
  const rowStyle = (delay: number) => (reducedMotion ? undefined : { animationDelay: `${delay}ms` });
  const rowClass = reducedMotion ? "" : styles.rowIn;

  return (
    <Panel>
      <SectionTitle step={1}>会社は多くの相手とつながっている</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        会社に関わる人や組織を<b className="text-gray-800">ステークホルダ（利害関係者）</b>と呼びます。
        まわりをタップすると、<b className="text-gray-800">相手から受け取るもの</b>と<b className="text-gray-800">会社が返すもの</b>が流れます。
      </p>

      <ExchangeMap holders={HOLDERS} sel={sel} runKey={runKey} reducedMotion={reducedMotion} onSelect={pick} />

      <div className="mt-1 flex items-center justify-center gap-3 text-[11px] font-bold">
        <span className="flex items-center gap-1 text-emerald-700">
          <span className="inline-block h-0.5 w-4 bg-emerald-500" />
          相手 → 自社
        </span>
        <span className="flex items-center gap-1 text-brand-700">
          <span className="inline-block h-0.5 w-4 bg-brand-600" />
          自社 → 相手
        </span>
      </div>

      {/* 与える⇄受け取る の表示 */}
      <div className="mt-3 min-h-[5.5em] rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200" aria-live="polite">
        {h ? (
          <div key={runKey}>
            <div className="text-sm font-bold text-gray-800">
              {h.emoji} {h.name} とのやり取り
            </div>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className={`flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 ${rowClass}`} style={rowStyle(900)}>
                <span className="flex-none text-xs font-bold text-emerald-600">① → 自社</span>
                <span className="font-semibold text-gray-800">{h.get}</span>
              </div>
              <div className={`flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 ${rowClass}`} style={rowStyle(2250)}>
                <span className="flex-none text-xs font-bold text-brand-500">② 自社 →</span>
                <span className="font-semibold text-gray-800">{h.give}</span>
              </div>
              {h.note && (
                <p className={`pt-1 text-xs leading-relaxed text-gray-600 ${rowClass}`} style={rowStyle(2500)}>
                  {h.note}
                </p>
              )}
            </div>
          </div>
        ) : sel === "all" ? (
          <div key={runKey} className={rowClass} style={rowStyle(2700)} data-testid="stakeholder-all-summary">
            <div className="text-sm font-bold text-gray-800">7者との交換が同時に回っている</div>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              お金・労働・材料・融資・場所を<b>受け取り</b>、商品・給料・配当・税金などで<b>返す</b>。
              どれか1本でも止まると、会社は活動を続けられません。
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            まわりの相手をタップしてね。<b>一方通行ではなく「おたがいさま」</b>の関係が見えてきます。
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-gray-500" data-testid="stakeholder-seen">
          見た相手 {seen.size} / {HOLDERS.length}
        </span>
        <button
          type="button"
          onClick={playAll}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold active:scale-95 ${
            allSeen || sel === "all" ? "bg-brand-600 text-white" : "text-brand-700 ring-1 ring-brand-300"
          }`}
        >
          🔁 全部の交換を流す
        </button>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 会社は<b>たくさんの相手との交換関係</b>で成り立っています。
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
    <div>
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🏢 会社は商品やサービスで価値を生み、利益を得ながら社会に役立ちます。会社に関わる人・組織が
        <b>ステークホルダ（利害関係者）</b>。株主だけでなく、顧客・従業員・地域なども含みます。
      </div>
      <Hub />
      <Quiz />
      <CsrSummary />
    </div>
  );
}
