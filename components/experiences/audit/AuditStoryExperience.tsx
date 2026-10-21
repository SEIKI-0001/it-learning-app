"use client";

import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";
import { Choices, placeAnswer, type Choice } from "../calc/CalcParts";
import { StoryDay, StoryTimeline } from "../story/StoryDay";
import { Face } from "../story/Faces";
import type { StoryState, Who } from "../story/cast";
import { AUDIT_MONTH, AUDIT_STEPS, DAY1, DAY10, DAY12, DAY20, DAY28, DAY3, DAY5, FINDINGS, NEXT_MONTH } from "./month";

// 「システム監査と内部統制」をストーリーで学ぶ体験。
//   ① 大枠：システム監査・内部統制・ITガバナンスの関係と登場人物（ITIL・ISMS と同じ会社）
//   ②〜⑨ 宮本さんが経理システムを監査する1か月。上に「監査調書」（段階と指摘）が書き込まれていく
//   ⑩ ふりかえり（監査の流れ）と仕分け
// 公式過去問22問（監査の種類と目的・独立性・計画と判断尺度・調査手段・内部統制6要素・職務分掌・けん制・
// 評価と結論・監査人の役割・ITガバナンス）で問われた知識を、出来事の順に1つずつ出す。

function MonthStrip({ at }: { at: number }) {
  return <StoryTimeline items={AUDIT_MONTH} current={at} label="システム監査の1か月" />;
}

function Intro() {
  const cast: { who: Who; name: string; role: string }[] = [
    { who: "auditor", name: "宮本さん", role: "内部監査室" },
    { who: "mori", name: "森さん", role: "記録係" },
    { who: "takagi", name: "高木さん", role: "システムの運用担当" },
    { who: "boss", name: "社長", role: "監査を依頼" },
  ];
  return (
    <Panel>
      <SectionTitle step={1}>システム監査は、独立した人がリスクへの備えを確かめること</SectionTitle>
      <div className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <p className="text-sm">
          <span className="mr-1.5 rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold text-white">ひとことで</span>
          <b>システム監査</b>は、情報システムに係るリスクに適切に対応しているかを、
          <b>監査対象から独立した人</b>が確かめ、改善を提案することです。
        </p>
        <ol className="space-y-1 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
          {[
            <>
              <b>内部統制</b>：会社が自分で不正や誤りを防ぐしくみ（職務分掌など）
            </>,
            <>
              <b>システム監査</b>：そのしくみが働いているかを、独立した人が確かめる
            </>,
            <>
              <b>ITガバナンス</b>：経営陣がITの使い方を決めて、見守る
            </>,
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
        ISMSの話で出てきた内部監査室の<b className="text-gray-900">宮本さんが、経理システムを監査する1か月</b>です。
        上の「監査調書」に、いまの段階と見つかった指摘が書き込まれていきます。
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="audit-cast">
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
      <MonthStrip at={-1} />
    </Panel>
  );
}

const FINDING_TONE: Record<string, string> = {
  指摘: "bg-rose-100 text-rose-800",
  改善を提案: "bg-amber-100 text-amber-800",
  改善済: "bg-emerald-100 text-emerald-800",
};

// 監査調書：段階（済になると黒）と、見つかった指摘の状態
function AuditFile({ state }: { state: StoryState }) {
  const findings = FINDINGS.filter((f) => state[`f.${f.id}`]);
  return (
    <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200" data-testid="audit-file">
      <div className="text-[11px] font-bold text-gray-500">監査調書（経理システム）</div>
      <ol className="mt-1.5 grid grid-cols-6 gap-0.5" aria-label="監査の段階">
        {AUDIT_STEPS.map((s) => {
          const done = Boolean(state[`p.${s.id}`]);
          return (
            <li
              key={s.id}
              data-step={s.id}
              data-done={done ? "true" : "false"}
              className={`rounded px-0.5 py-1 text-center text-[9.5px] font-bold leading-tight ${
                done ? "bg-gray-900 text-white" : "bg-white text-gray-400 ring-1 ring-gray-200"
              }`}
            >
              {s.name}
            </li>
          );
        })}
      </ol>
      {findings.length > 0 && (
        <ul className="mt-2 space-y-1">
          {findings.map((f) => {
            const st = String(state[`f.${f.id}`]);
            return (
              <li key={f.id} className="flex items-start justify-between gap-2 text-[12px]" data-finding={f.id} data-status={st}>
                <span className="leading-snug text-gray-800">{f.name}</span>
                <span className={`flex-none rounded px-1.5 py-0.5 text-[10px] font-bold ${FINDING_TONE[st] ?? ""}`}>{st}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
const auditFile = (state: StoryState) => <AuditFile state={state} />;

/** 前の場面までに書き込まれた調書から始める */
function stateAfter(...days: { state?: StoryState }[][]): StoryState {
  return days.flat().reduce<StoryState>((acc, b) => ({ ...acc, ...b.state }), {});
}

function DayPanel({ step, at, children }: { step: number; at: number; children: ReactNode }) {
  return (
    <Panel>
      <SectionTitle step={step}>
        {AUDIT_MONTH[at].label}：{AUDIT_MONTH[at].title}
      </SectionTitle>
      <MonthStrip at={at} />
      {children}
    </Panel>
  );
}

export const FLOW: { name: string; what: string; who: string }[] = [
  { name: "監査計画", what: "手続の種類・時期・範囲を決める", who: "監査人" },
  { name: "予備調査", what: "資料を集めて概要をつかむ", who: "監査人" },
  { name: "本調査", what: "閲覧・ヒアリング・監査技法で証拠を集める", who: "監査人" },
  { name: "評価・結論", what: "証拠をもとに監査意見をまとめる", who: "監査人" },
  { name: "報告", what: "監査報告書と改善提案を経営者へ", who: "監査人" },
  { name: "改善", what: "指摘を直す（指示は経営者）", who: "監査対象" },
  { name: "フォローアップ", what: "改善の実施状況を確かめる", who: "監査人" },
];

export const SORT: { t: string; choices: Choice[] }[] = [
  {
    t: "社内で開発・運用している経理システムの内部監査。監査人にふさわしいのは？",
    choices: [
      { label: "経理とITの知識がある、経営者直轄組織の従業員", ok: true },
      { label: "経理システムの運用担当者", why: "自分の仕事を自分で評価することになります（3日）。" },
      { label: "開発を担当した委託会社の従業員", why: "自分たちが作ったものを評価することになります。" },
      { label: "経理システムを使う経理担当者", why: "監査対象の当事者です。" },
    ],
  },
  {
    t: "日常の取引から決算報告書まで、不正や誤りのない処理かを確かめる監査は？",
    choices: [
      { label: "会計監査", ok: true },
      { label: "システム監査", why: "システム監査は、情報システムのリスクへの対応を確かめます（1日）。" },
      { label: "業務監査", why: "業務監査は、業務が方針どおり合理的・効率的かを確かめます。" },
      { label: "情報セキュリティ監査", why: "情報資産のリスクマネジメントを確かめる監査です。" },
    ],
  },
  {
    t: "システム監査人の役割として、ふさわしくないのは？",
    choices: [
      { label: "改善提案に基づく改善の実施を、監査対象部門に指示する", ok: true },
      { label: "監査手続の種類・時期・範囲を決め、監査計画を立てる", why: "これは監査人の役割です（5日）。" },
      { label: "改善の実施状況をモニタリングする", why: "フォローアップも監査人の役割です（翌月）。" },
    ],
  },
  {
    t: "不正を防ぐための職務分掌の例は？",
    choices: [
      { label: "申請者は、自分の申請を承認できないようにする", ok: true },
      { label: "1つの業務を、複数の担当者で手分けする", why: "手分けするだけでは、互いのチェックになりません（12日）。" },
      { label: "申請部署と承認部署の役員を兼務させる", why: "同じ人が両方を担うことになり、分けたことになりません。" },
    ],
  },
  {
    t: "ITが適切に活用されるための活動のうち、「ルールを決める活動」は？",
    choices: [
      { label: "IT投資の判断基準を確立する", ok: true },
      { label: "SLAを守るためのオペレーション管理", why: "決められたルールに従って行動する活動です（28日）。" },
      { label: "開発プロジェクトの予算管理", why: "決められたルールに従って行動する活動です。" },
    ],
  },
  {
    t: "統制環境・リスクの評価と対応・統制活動・情報と伝達・モニタリング・ITへの対応から構成される取組は？",
    choices: [
      { label: "内部統制", ok: true },
      { label: "ITガバナンス", why: "6つの要素で構成されるのは内部統制です（12日）。" },
      { label: "システム監査", why: "監査は、内部統制が働いているかを確かめる側です。" },
    ],
  },
];

function RecapPanel() {
  return (
    <Panel>
      <SectionTitle step={10}>ふりかえり：監査の流れと、誰がやるか</SectionTitle>
      <ol className="mt-3 space-y-1" data-testid="audit-flow-recap">
        {FLOW.map((f, i) => (
          <li key={f.name} className="flex items-start gap-2 text-[12.5px] leading-snug" data-who={f.who}>
            <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-600">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <b className="text-gray-900">{f.name}</b>
              <span className="text-gray-600">：{f.what}</span>
            </span>
            <span
              className={`flex-none rounded px-1.5 py-0.5 text-[10px] font-bold ${
                f.who === "監査人" ? "bg-gray-900 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {f.who}
            </span>
          </li>
        ))}
      </ol>
      <h4 className="mt-5 text-sm font-bold text-gray-900">どれにあたる？（宮本さんの1か月を思い出して）</h4>
      <ul className="mt-2 space-y-3">
        {SORT.map((s, i) => (
          <li key={s.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <p className="text-[13px] font-bold leading-relaxed text-gray-800">{s.t}</p>
            <div className="mt-2">
              <Choices choices={placeAnswer(s.choices, i + 1)} cols={1} testId={`audit-sort-${i}`} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function AuditStoryExperience() {
  return (
    <div className="space-y-5">
      <Intro />
      <DayPanel step={2} at={0}>
        <StoryDay
          beats={DAY1}
          renderState={auditFile}
          summary={
            <>
              <b>システム監査</b>＝情報システムに係るリスクへの対応を検証し、組織の目標の達成に役立てる。
              <br />
              会計監査＝決算までの処理／業務監査＝業務の効率／情報セキュリティ監査＝情報資産のリスクマネジメント
            </>
          }
        />
      </DayPanel>
      <DayPanel step={3} at={1}>
        <StoryDay
          beats={DAY3}
          renderState={auditFile}
          summary={
            <>
              監査人は<b>監査対象から独立</b>していること。社外かどうかではない。
              <br />
              <b>外観上の独立性</b>（指揮命令系統が別）と<b>精神上の独立性</b>（客観的な立場で公正に判断）。
            </>
          }
        />
      </DayPanel>
      <DayPanel step={4} at={2}>
        <StoryDay
          beats={DAY5}
          renderState={auditFile}
          summary={
            <>
              <b>監査計画</b>（手続の種類・時期・範囲）は監査人が立てる。
              <br />
              判断尺度はシステム管理基準など。<b>テーマに応じて、ほかの基準を使ってもよい</b>。
            </>
          }
        />
      </DayPanel>
      <DayPanel step={5} at={3}>
        <StoryDay
          beats={DAY10}
          initialState={stateAfter(DAY5)}
          renderState={auditFile}
          summary={
            <>
              <b>予備調査</b>（概要をつかむ）→ <b>本調査</b>（証拠を集める）。
              <br />
              調査手段＝資料の閲覧・ヒアリング・コンピュータを利用した監査技法（EAは手段ではない）。
            </>
          }
        />
      </DayPanel>
      <DayPanel step={6} at={4}>
        <StoryDay
          beats={DAY12}
          initialState={stateAfter(DAY5, DAY10)}
          renderState={auditFile}
          summary={
            <>
              <b>職務分掌</b>＝申請者は自分の申請を承認できない／<b>けん制</b>＝別の部署が日ごろから確かめ合う
              <br />
              内部統制の6要素：統制環境・リスクの評価と対応・統制活動・情報と伝達・モニタリング・ITへの対応。
              重大な誤りは速やかに公表し、内部通報は上司を通さずに使える窓口も用意する。
            </>
          }
        />
      </DayPanel>
      <DayPanel step={7} at={5}>
        <StoryDay
          beats={DAY20}
          initialState={stateAfter(DAY5, DAY10, DAY12)}
          renderState={auditFile}
          summary={
            <>
              <b>評価・結論</b>＝証拠をもとに監査意見をまとめる → <b>監査報告書</b>を依頼した経営者へ（社内に公開するものではない）。
              <br />
              監査人は<b>改善を提案</b>するまで。<b>指示はしない</b>。
            </>
          }
        />
      </DayPanel>
      <DayPanel step={8} at={6}>
        <StoryDay
          beats={DAY28}
          initialState={stateAfter(DAY5, DAY10, DAY12, DAY20)}
          renderState={auditFile}
          summary={
            <>
              <b>ITガバナンス</b>＝経営陣が<b>評価・指示・モニター</b>する。現在と将来のITの利用を評価する。
              <br />
              外部に全面的に任せない。役員が規範を作り、率先して守る。IT投資の判断基準を決めるのは「ルールを決める活動」。
            </>
          }
        />
      </DayPanel>
      <DayPanel step={9} at={7}>
        <StoryDay
          beats={NEXT_MONTH}
          initialState={stateAfter(DAY5, DAY10, DAY12, DAY20, DAY28)}
          renderState={auditFile}
          summary={
            <>
              <b>フォローアップ</b>＝改善の実施状況を確かめる。これも監査人の役割。
            </>
          }
        />
      </DayPanel>
      <RecapPanel />
    </div>
  );
}
