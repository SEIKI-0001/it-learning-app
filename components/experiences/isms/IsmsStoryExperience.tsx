"use client";

import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";
import { Choices, placeAnswer, type Choice } from "../calc/CalcParts";
import { StoryDay, StoryTimeline } from "../story/StoryDay";
import { Face } from "../story/Faces";
import type { StoryState, Who } from "../story/cast";
import {
  APRIL,
  AUGUST,
  JANUARY,
  JULY,
  JUNE,
  LEDGER_AFTER_JUNE,
  MARCH,
  MAY,
  OCTOBER,
  RISKS,
  SEPTEMBER,
  YEAR,
} from "./year";

// 「情報セキュリティ管理（ISMS・リスクアセスメント）」をストーリーで学ぶ体験。
//   ① 大枠：ISMS と1年の流れ・登場人物（ITIL の話と同じ会社・同じ人物）
//   ②〜⑩ 4月〜3月。前の月の出来事が次の月の理由になる1本の話。6〜7月はリスク台帳が埋まっていく
//   ⑪ 1年のふりかえり（PDCAとの対応）と仕分け
// 公式過去問31問（範囲・経営者・方針3層・脅威/脆弱性・アセスメント3段階・対応4分類・対策3分類・
// 廃棄・事故対応・内部監査・PDCA）で問われた知識を、出来事の順に1つずつ出す。

function YearStrip({ month }: { month: number }) {
  return <StoryTimeline items={YEAR} current={month} label="ISMSを作る1年" />;
}

function Intro() {
  const cast: { who: Who; name: string; role: string }[] = [
    { who: "mori", name: "森さん", role: "ISMSの担当" },
    { who: "takagi", name: "高木さん", role: "10年目の先輩" },
    { who: "boss", name: "社長", role: "トップ" },
    { who: "auditor", name: "宮本さん", role: "内部監査室" },
  ];
  return (
    <Panel>
      <SectionTitle step={1}>ISMSは、セキュリティを「組織のしくみ」で回し続けること</SectionTitle>
      <div className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <p className="text-sm">
          <span className="mr-1.5 rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold text-white">ひとことで</span>
          情報セキュリティを、技術だけでなく<b>組織のしくみとして管理し、PDCAで改善し続ける</b>のが
          <b>ISMS（情報セキュリティマネジメントシステム）</b>です。
        </p>
        <ol className="space-y-1 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
          {[
            <>守る範囲と方針を決める（<b>適用範囲</b>・<b>基本方針</b>）</>,
            <>何が危ないかを見積もる（<b>リスクアセスメント</b>）</>,
            <>リスクごとに対応を選び、対策を入れる（<b>回避・共有・低減・保有</b>）</>,
            <>事故が起きたら、すぐ報告して広げない（<b>CSIRT</b>）</>,
            <>第三者が確かめて、直す（<b>内部監査</b>・<b>是正処置</b>）</>,
          ].map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-4 border-t border-dashed border-gray-300 pt-3 text-[13px] leading-relaxed text-gray-700">
        <span className="mr-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200">
          お話で見る
        </span>
        ITILの話と同じ会社で、森さんたちが<b className="text-gray-900">1年かけてISMSを作ります</b>。
        4月に取引先から出された宿題が、3月まで続いていきます。
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="isms-cast">
        {cast.map((c) => (
          <div key={c.who} className="flex items-center gap-2 rounded-xl bg-gray-50 px-2.5 py-2 ring-1 ring-gray-200">
            <Face who={c.who} mood="smile" size={40} />
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-gray-900">{c.name}</div>
              <div className="text-[11px] text-gray-500">{c.role}</div>
            </div>
          </div>
        ))}
      </div>
      <YearStrip month={-1} />
    </Panel>
  );
}

const LEVEL_TONE: Record<string, string> = {
  大: "bg-rose-100 text-rose-800",
  中: "bg-amber-100 text-amber-800",
  小: "bg-gray-100 text-gray-600",
};

// リスク台帳：6月に洗い出し・レベル・評価、7月に対応が書き込まれていく
function RiskLedger({ state }: { state: StoryState }) {
  const rows = RISKS.filter((r) => state[`${r.id}.on`]);
  return (
    <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200" data-testid="isms-ledger">
      <div className="text-[11px] font-bold text-gray-500">リスク台帳</div>
      {rows.length === 0 ? (
        <p className="mt-1 text-[12px] text-gray-400">まだ何も書かれていません</p>
      ) : (
        <table className="mt-1 w-full text-left text-[12px]">
          <thead>
            <tr className="text-[10px] text-gray-400">
              <th className="py-0.5 font-bold">リスク</th>
              <th className="w-[3.6rem] py-0.5 text-center font-bold">レベル</th>
              <th className="w-[3.2rem] py-0.5 text-center font-bold">対応</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => {
              const level = state[`${r.id}.level`] as string | undefined;
              const need = state[`${r.id}.need`] as string | undefined;
              const resp = state[`${r.id}.resp`] as string | undefined;
              return (
                <tr key={r.id} data-risk={r.id} data-level={level ?? ""} data-resp={resp ?? ""}>
                  <td className="py-1 pr-1 leading-snug text-gray-800">{r.name}</td>
                  <td className="py-1 text-center">
                    {level ? (
                      <>
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${LEVEL_TONE[level]}`}>{level}</span>
                        {need && <div className="mt-0.5 text-[9px] font-bold text-gray-500">{need}</div>}
                      </>
                    ) : (
                      <span className="text-gray-300">－</span>
                    )}
                  </td>
                  <td className="py-1 text-center">
                    {resp ? (
                      <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold text-white">{resp}</span>
                    ) : (
                      <span className="text-gray-300">－</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
const ledger = (state: StoryState) => <RiskLedger state={state} />;

function MonthPanel({
  step,
  month,
  children,
}: {
  step: number;
  month: number;
  children: ReactNode;
}) {
  return (
    <Panel>
      <SectionTitle step={step}>
        {YEAR[month].label}：{YEAR[month].title}
      </SectionTitle>
      <YearStrip month={month} />
      {children}
    </Panel>
  );
}

// 1年のふりかえり：PDCAとの対応
const PDCA_MAP: { k: string; name: string; months: string; what: string }[] = [
  { k: "P", name: "計画", months: "4〜7月", what: "適用範囲・基本方針・リスクアセスメント・対応を決める" },
  { k: "D", name: "運用", months: "8〜10月", what: "決めた対策を運用する（入退室・廃棄・事故の報告）" },
  { k: "C", name: "パフォーマンス評価", months: "1月", what: "第三者が客観的に評価する（内部監査）" },
  { k: "A", name: "改善", months: "3月", what: "是正処置で直し、次の計画へ" },
];

const SORT: { t: string; choices: Choice[] }[] = [
  {
    t: "サーバ監視の具体的な目的と手順を定める",
    choices: [
      { label: "P（計画）", ok: true },
      { label: "D（運用）", why: "運用は、定めた手順どおりに監視すること。定めるのは計画です（4〜7月）。" },
      { label: "C（評価）", why: "評価は、第三者が監視の作業を評価することです。" },
      { label: "A（改善）", why: "改善は、見つかった問題を是正処置で直すことです。" },
    ],
  },
  {
    t: "サーバ監視の作業内容を、第三者が客観的に評価する",
    choices: [
      { label: "C（評価）", ok: true },
      { label: "D（運用）", why: "監視するのが運用、それを第三者が評価するのがC（1月の内部監査）です。" },
      { label: "A（改善）", why: "直すのは評価のあとです。" },
      { label: "P（計画）", why: "計画は、目的と手順を定める段階です。" },
    ],
  },
  {
    t: "情報漏えいの賠償に備えて、サイバー保険に入る",
    choices: [
      { label: "リスク共有", ok: true },
      { label: "リスク低減", why: "保険は起こりやすさを下げません。損害を別の組織と分け合うのが共有です（7月）。" },
      { label: "リスク回避", why: "活動そのものはやめていません。" },
      { label: "リスク保有", why: "保険で備えているので、そのまま受け入れてはいません。" },
    ],
  },
  {
    t: "ノートPCの紛失や盗難に備え、社外への持ち出しを厳しく管理する",
    choices: [
      { label: "リスク低減", ok: true },
      { label: "リスク回避", why: "持ち出しをやめてはいません。起こりにくくする対策なので低減です（7月）。" },
      { label: "リスク共有", why: "別の組織に移していません。" },
      { label: "リスク保有", why: "対策をしているので、保有ではありません。" },
    ],
  },
  {
    t: "被災しても続けられるよう、遠隔地にバックアップシステムを用意する",
    choices: [
      { label: "物理的対策", ok: true },
      { label: "技術的対策", why: "場所を分けて災害から守るので、物理的対策に分類されます（8月）。" },
      { label: "人的対策", why: "教育や周知の話ではありません。" },
    ],
  },
  {
    t: "守るべき情報資産に、損害を与える原因になるもの",
    choices: [
      { label: "脅威", ok: true },
      { label: "脆弱性", why: "脆弱性は、脅威につけ込まれる弱点のほうです（6月）。" },
      { label: "リスク", why: "リスクは、脅威が脆弱性を突いて損害が出るおそれです。" },
    ],
  },
  {
    t: "ISMSの実施項目のうち、いちばん最初に行うもの",
    choices: [
      { label: "適用範囲の決定", ok: true },
      { label: "情報資産の洗い出し", why: "範囲を決めてからでないと、どこまで洗い出すか決まりません（4月）。" },
      { label: "内部監査", why: "監査は、運用したあとの評価の段階です。" },
      { label: "リスク分析", why: "分析は、範囲と資産が決まってからです。" },
    ],
  },
];

function RecapPanel() {
  return (
    <Panel>
      <SectionTitle step={11}>1年のふりかえり：PDCAで見ると</SectionTitle>
      <ol className="mt-3 space-y-1.5" data-testid="isms-pdca-year">
        {PDCA_MAP.map((p) => (
          <li key={p.k} className="flex items-start gap-2 rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-phase={p.k}>
            <span className="grid h-6 w-6 flex-none place-items-center rounded bg-brand-100 font-mono text-xs font-bold text-brand-700">
              {p.k}
            </span>
            <div className="min-w-0 text-[12.5px] leading-snug">
              <b className="text-gray-900">{p.name}</b>
              <span className="ml-1.5 text-[11px] font-bold text-gray-400">{p.months}</span>
              <p className="text-gray-700">{p.what}</p>
            </div>
          </li>
        ))}
      </ol>
      <h4 className="mt-5 text-sm font-bold text-gray-900">どれにあたる？（森さんの1年を思い出して）</h4>
      <ul className="mt-2 space-y-3">
        {SORT.map((s, i) => (
          <li key={s.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <p className="text-[13px] font-bold leading-relaxed text-gray-800">{s.t}</p>
            <div className="mt-2">
              <Choices
                choices={placeAnswer(s.choices, i)}
                cols={s.choices.length === 3 ? 1 : 2}
                testId={`isms-sort-${i}`}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function IsmsStoryExperience() {
  return (
    <div className="space-y-5">
      <Intro />
      <MonthPanel step={2} month={0}>
        <StoryDay
          unit="月"
          beats={APRIL}
          summary={
            <>
              <b>最初にやるのは、ISMSの適用範囲の決定。</b>
              <br />
              経営者は担当者に丸投げせず、方針・予算・人を決めて、自ら状況を確かめる。
            </>
          }
        />
      </MonthPanel>
      <MonthPanel step={3} month={1}>
        <StoryDay
          unit="月"
          beats={MAY}
          summary={
            <>
              <b>基本方針</b>（トップの意思・方向付け・改善し続ける約束）→ <b>対策基準</b>（ルール）→ <b>実施手順</b>（やり方）
              <br />
              作る順番：責任者を決める → 基本方針 → 情報資産の洗い出し → リスク分析
            </>
          }
        />
      </MonthPanel>
      <MonthPanel step={4} month={2}>
        <StoryDay
          unit="月"
          beats={JUNE}
          renderState={ledger}
          summary={
            <>
              脅威＝損害の<b>原因</b>／脆弱性＝つけ込まれる<b>弱点</b>
              <br />
              リスクアセスメント：<b>特定</b>（洗い出す）→ <b>分析</b>（レベルを決める）→ <b>評価</b>（受容基準と比べて決める）
            </>
          }
        />
      </MonthPanel>
      <MonthPanel step={5} month={3}>
        <StoryDay
          unit="月"
          beats={JULY}
          initialState={LEDGER_AFTER_JUNE}
          renderState={ledger}
          summary={
            <>
              <b>低減</b>＝対策で下げる／<b>共有（移転）</b>＝保険などで分け合う／<b>回避</b>＝活動をやめる／
              <b>保有（受容）</b>＝そのまま受け入れる
              <br />
              4つは順番に進める手順ではなく、リスクごとに選ぶ選択肢。
            </>
          }
        />
      </MonthPanel>
      <MonthPanel step={6} month={4}>
        <StoryDay
          unit="月"
          beats={AUGUST}
          summary={
            <>
              <b>技術的</b>＝仕組みで守る（通信の遮断・アカウント管理）／<b>人的</b>＝人に働きかける（教育・周知）／
              <b>物理的</b>＝場所と物を守る（入退室管理・アンチパスバック・遠隔地のバックアップ・クリアデスク）
            </>
          }
        />
      </MonthPanel>
      <MonthPanel step={7} month={5}>
        <StoryDay
          unit="月"
          beats={SEPTEMBER}
          summary={
            <>
              <b>安全</b>：専用ソフトで全領域にランダムなデータを上書き／物理的に破壊／SSDは Secure Erase
              <br />
              <b>危ない</b>：ファイルの削除・ごみ箱を空にする・論理フォーマット
            </>
          }
        />
      </MonthPanel>
      <MonthPanel step={8} month={6}>
        <StoryDay
          unit="月"
          beats={OCTOBER}
          summary={
            <>
              事故は<b>決めてある連絡経路で速やかに報告</b>（経路は前もって用意）。
              <br />
              <b>CSIRT</b>＝影響範囲を調べ、被害の拡大を防ぐ支援／<b>デジタルフォレンジックス</b>＝証拠を集めて保全
            </>
          }
        />
      </MonthPanel>
      <MonthPanel step={9} month={7}>
        <StoryDay
          unit="月"
          beats={JANUARY}
          summary={
            <>
              <b>内部監査＝C（パフォーマンス評価）</b>。第三者の立場で客観的に評価する。
              <br />
              見るのは、決めた基準に合っているか（<b>適合性</b>）と、効果が出ているか（<b>有効性</b>）の両方。
            </>
          }
        />
      </MonthPanel>
      <MonthPanel step={10} month={8}>
        <StoryDay
          unit="月"
          beats={MARCH}
          summary={
            <>
              <b>是正処置＝A（改善）</b>。直したら、また計画に戻って回す。
              <br />
              <b>PCI DSS</b>＝カード情報を扱う事業者の基準／<b>セキュリティバイデザイン</b>＝企画・設計の段階から守る
            </>
          }
        />
      </MonthPanel>
      <RecapPanel />
    </div>
  );
}
