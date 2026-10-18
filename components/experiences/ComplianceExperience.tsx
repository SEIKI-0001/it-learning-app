"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";
import { ContractsAndAi, LawCases, LawQuiz } from "./compliance/CompliancePanels";
import { InlineIcon } from "@/components/ui/Pictogram";
import Icon, { type IconName } from "@/components/ui/Icon";

// ============================================================================
// 「法務とコンプライアンス」専用の体験。
//   ① 3つの盾を破ってみる … 法律・社内ルール・倫理の盾が「会社の信用」を守る図。
//      タップで盾が割れ、事件例が出て信用ゲージが下がる（法律だけ守ってもダメ）
//   ② 事例でつかむ法律（景品表示法・特定電子メール法・資金決済法・AML・情報公開法・官民データ活用推進基本法）
//   ③ 契約・社内ルール（NDA・ソーシャルメディアポリシー）と、AIを使うときの注意
//   ④ この行為・仕組みはどの法律？クイズ
//   ②〜④は過去問の出題に合わせた図（compliance/CompliancePanels）
// ============================================================================

type Ring = "law" | "rule" | "ethics";

const SHIELDS: { id: Ring; name: string; icon: IconName; desc: string; incident: string; damage: number }[] = [
  {
    id: "law",
    name: "法律",
    icon: "scale",
    desc: "国が定めたルール。破ると罰せられる（個人情報保護法・著作権法など）",
    incident: "個人情報を漏えいさせて書類送検。罰金＋ニュースで大きく報道…",
    damage: 60,
  },
  {
    id: "rule",
    name: "社内ルール",
    icon: "clipboard",
    desc: "会社が決めた約束ごと（情報の持ち出し禁止・SNS投稿のルールなど）",
    incident: "ルール無視の情報持ち出しが事故に。処分＋取引先の信頼を失う…",
    damage: 30,
  },
  {
    id: "ethics",
    name: "社会の約束（倫理）",
    icon: "handshake",
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
          <span className="text-gray-600">会社の信用</span>
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
                  : "border-brand-300 bg-brand-50"
              }`}
            >
              <Icon name={isBroken ? "alert" : s.icon} className="h-7 w-7" />
              <span
                className={`mt-1 text-[11px] font-bold leading-tight ${
                  isBroken ? "text-rose-600" : "text-brand-700"
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
            3つとも守れている＝信用は満タン。<b>どれか1つ破れただけで信用は大きく下がります</b>。盾をタップして確かめてみよう。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {brokenList.map((s) => (
              <li key={s.id} className="text-sm leading-relaxed text-rose-700">
                <b>{s.name}</b>を破った → {s.incident}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 盾の中身 */}
      <div className="mt-3 space-y-1.5">
        {SHIELDS.map((s) => (
          <div key={s.id} className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed ring-1 ring-gray-200">
            <Icon name={s.icon} className="mt-0.5 h-4 w-4 flex-none text-gray-600" />
            <span className="text-gray-600">
              <b className="text-gray-800">{s.name}</b>：{s.desc}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        <InlineIcon name="lightbulb" />注目は<b>倫理の盾</b>——法律を破っていなくても、不誠実なら信用は落ちます。
        コンプライアンス＝「法令遵守」だけでなく、<b>ルールと良識もセット</b>で守ること。
      </div>
    </Panel>
  );
}

export default function ComplianceExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <b>コンプライアンス</b>は、<b>法律・社内ルール・社会の約束</b>を守ること。
        試験では「この事例はどの法律で問題になるか」が問われるので、法律ごとに<b>典型的な事例</b>で覚えます。
      </div>

      <ShieldDemo />
      <LawCases step={2} />
      <ContractsAndAi step={3} />
      <LawQuiz step={4} />
    </div>
  );
}
