"use client";

import type { ReactNode } from "react";
import { Panel } from "../ui";
import { placeAnswer } from "../calc/CalcParts";
import { CaseHeading, CaseMeter, CaseSheet, CaseVerdict, ChapterTrack, Deduce, MysteryCase, MysteryDay, Stamp } from "../story/MysteryDay";
import { Face } from "../story/Faces";
import type { StoryState, Who } from "../story/cast";
import Icon from "@/components/ui/Icon";
import { AUDIT_MONTH, AUDIT_STEPS, DAY1, DAY10, DAY12, DAY20, DAY28, DAY3, DAY5, FINDINGS, FLOW, NEXT_MONTH, SORT } from "./month";

// 「システム監査と内部統制」を謎解きゲーム風に見せる体験。台本は month.ts（ストーリー版から引き継いだもの）。
//   ① 事件ファイルの表紙：依頼・ミッション・登場人物、捜査の前に知っておくこと
//   ②〜⑨ 第1〜8章。上の「捜査ボード」に、監査の段階と、見つかった謎（指摘）が書き込まれていく
//   ⑩ 事件解決：真相・探偵ランク・捜査の流れ・最終推理

const CHAPTERS = [DAY1, DAY3, DAY5, DAY10, DAY12, DAY20, DAY28, NEXT_MONTH];
const TRACK = AUDIT_MONTH.map((d) => ({ key: d.key, label: d.short }));

function Track({ at }: { at: number }) {
  return <ChapterTrack items={TRACK} current={at} label="事件ファイルの章" />;
}

function Cover() {
  const cast: { who: Who; name: string; role: string }[] = [
    { who: "auditor", name: "宮本さん", role: "探偵役（監査人）" },
    { who: "mori", name: "森さん", role: "助手（記録係）" },
    { who: "takagi", name: "高木さん", role: "システムの運用担当" },
    { who: "boss", name: "社長", role: "依頼人" },
  ];
  return (
    <Panel>
      <CaseSheet>
        <CaseHeading kicker="CASE FILE No.03">経理システムに潜む、2つのすきま</CaseHeading>
        <div className="mt-3 rounded-lg bg-[#f3ead6] px-3.5 py-3 text-[13px] leading-relaxed text-stone-800 shadow-lg shadow-black/30">
          <div className="text-[10.5px] font-black tracking-wider text-stone-500">依頼状</div>
          <p className="mt-1">
            経理システムを入れ替えて1年。きちんと使えているか、リスクに備えられているか、確かめてほしい。
          </p>
          <p className="mt-1 text-right text-[12px] font-bold text-stone-600">― 社長</p>
        </div>
        <div className="mt-3 rounded-lg px-3 py-2.5 ring-1 ring-amber-400/40" data-testid="mystery-mission">
          <div className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.2em] text-amber-300">
            <Icon name="target" className="h-4 w-4" />
            ミッション
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-200">
            不正や誤りが入りこむ<b className="text-white">すきま（謎）を2つ</b>見つけ出し、ふさがれるまで見届けよ。
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1.5">
            {FINDINGS.map((f, i) => (
              <li key={f.id} className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1.5 text-[12px] font-bold text-slate-400 ring-1 ring-white/10">
                <Icon name="lock" className="h-3.5 w-3.5" />謎{i + 1}：？？？
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 text-[12px] font-bold text-slate-400">捜査の前に知っておくこと</div>
        <ol className="mt-1.5 space-y-1 text-[12.5px] leading-relaxed text-slate-300 [&_b]:text-white">
          <li>
            <b>内部統制</b>：会社が自分で不正や誤りを防ぐしくみ（職務分掌など）
          </li>
          <li>
            <b>システム監査</b>：そのしくみが働いているかを、<b>独立した人</b>が確かめ、改善を提案する
          </li>
          <li>
            <b>ITガバナンス</b>：経営陣がITの使い方を決めて、見守る
          </li>
        </ol>
        <div className="mt-4 grid grid-cols-2 gap-2" data-testid="audit-cast">
          {cast.map((c) => (
            <div key={c.who} className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 ring-1 ring-white/10">
              <div className="rounded-full ring-2 ring-white/15">
                <Face who={c.who} mood="smile" size={38} />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-white">{c.name}</div>
                <div className="text-[10.5px] text-slate-400">{c.role}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
          話は自動で進みます。「推理せよ」で止まったら答えを選ぼう。一発で当てると★。手がかりは章をまたいで貯まります。
        </p>
        <Track at={-1} />
      </CaseSheet>
    </Panel>
  );
}

const FINDING_LOOK: Record<string, { label: string; tone: "rose" | "amber" | "emerald" }> = {
  指摘: { label: "発見", tone: "rose" },
  改善を提案: { label: "提案済", tone: "amber" },
  改善済: { label: "解決", tone: "emerald" },
};

// 捜査ボード：監査の段階と、2つの謎（見つかるまでは伏せる）
function CaseBoard({ state }: { state: StoryState }) {
  return (
    <div className="mt-3 rounded-lg bg-black/25 px-3 py-2.5 ring-1 ring-white/10" data-testid="audit-file">
      <div className="text-[10.5px] font-black tracking-[0.2em] text-slate-400">捜査ボード</div>
      <ol className="mt-1.5 grid grid-cols-6 gap-0.5" aria-label="監査の段階">
        {AUDIT_STEPS.map((s) => {
          const done = Boolean(state[`p.${s.id}`]);
          return (
            <li
              key={s.id}
              data-step={s.id}
              data-done={done ? "true" : "false"}
              className={`rounded px-0.5 py-1 text-center text-[9.5px] font-bold leading-tight ${
                done ? "bg-amber-400 text-[#151a24]" : "text-slate-500 ring-1 ring-white/10"
              }`}
            >
              {s.name}
            </li>
          );
        })}
      </ol>
      <ul className="mt-2 space-y-1">
        {FINDINGS.map((f, i) => {
          const st = state[`f.${f.id}`];
          if (!st)
            return (
              <li key={f.id} className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500" data-finding={f.id} data-status="">
                <Icon name="lock" className="h-3.5 w-3.5" />謎{i + 1}：？？？
              </li>
            );
          const look = FINDING_LOOK[String(st)];
          return (
            <li key={f.id} className="flex items-start justify-between gap-2 text-[12px]" data-finding={f.id} data-status={String(st)}>
              <span className="leading-snug text-slate-100">
                <b className="text-amber-300">謎{i + 1}：</b>
                {f.name}
              </span>
              {look && (
                <span key={look.label} className="flex-none">
                  <Stamp tone={look.tone}>{look.label}</Stamp>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <CaseMeter />
    </div>
  );
}
const caseBoard = (state: StoryState) => <CaseBoard state={state} />;

function stateAfter(...days: { state?: StoryState }[][]): StoryState {
  return days.flat().reduce<StoryState>((acc, b) => ({ ...acc, ...b.state }), {});
}

function ChapterPanel({ n, summary }: { n: number; summary: ReactNode }) {
  const d = AUDIT_MONTH[n - 1];
  return (
    <Panel>
      <CaseSheet>
        <CaseHeading kicker={`CHAPTER ${n} ／ ${d.label}`}>
          第{n}章　{d.title}
        </CaseHeading>
        <Track at={n - 1} />
        <MysteryDay
          chapter={n}
          beats={CHAPTERS[n - 1]}
          initialState={stateAfter(...CHAPTERS.slice(0, n - 1))}
          renderState={caseBoard}
          summary={summary}
        />
      </CaseSheet>
    </Panel>
  );
}

function Solved() {
  return (
    <Panel>
      <CaseSheet>
        <CaseHeading kicker="CASE CLOSED">事件解決：2つのすきまの真相</CaseHeading>
        <div className="mt-3 flex justify-center">
          <Stamp tone="emerald">解決済</Stamp>
        </div>
        <ul className="mt-3 space-y-2" data-testid="mystery-truth">
          {[
            { q: FINDINGS[0].name, why: "申請と承認が分かれていない（職務分掌がない）", fix: "起票した人とは別の人が承認しないと通らない設定にした" },
            { q: FINDINGS[1].name, why: "退職の連絡とIDの停止がつながっていなかった", fix: "その日のうちにIDを止める手順を作った" },
          ].map((t, i) => (
            <li key={t.q} className="rounded-md bg-[#f3ead6] px-3 py-2.5 text-[12.5px] leading-relaxed text-stone-800 shadow-lg shadow-black/30">
              <b className="text-stone-950">
                謎{i + 1}：{t.q}
              </b>
              <div>原因：{t.why}</div>
              <div>解決：{t.fix}</div>
            </li>
          ))}
        </ul>
        <CaseVerdict />
        <div className="mt-5 text-[12px] font-bold text-slate-400">捜査の流れと、誰がやるか</div>
        <ol className="mt-1.5 space-y-1" data-testid="audit-flow-recap">
          {FLOW.map((f, i) => (
            <li key={f.name} className="flex items-start gap-2 text-[12.5px] leading-snug" data-who={f.who}>
              <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-white/10 text-[11px] font-bold text-slate-300">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <b className="text-white">{f.name}</b>
                <span className="text-slate-400">：{f.what}</span>
              </span>
              <span
                className={`flex-none rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  f.who === "監査人" ? "bg-amber-400 text-[#151a24]" : "bg-white/10 text-slate-200"
                }`}
              >
                {f.who}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex items-center gap-1.5 text-[11px] font-black tracking-[0.2em] text-amber-300">
          <Icon name="search" className="h-4 w-4" />
          最終推理
        </div>
        <ul className="mt-2 space-y-3">
          {SORT.map((s, i) => (
            <li key={s.t} className="rounded-lg bg-white/[0.04] p-3 ring-1 ring-white/10">
              <p className="text-[13px] font-bold leading-relaxed text-white">{s.t}</p>
              <div className="mt-2">
                <Deduce choices={placeAnswer(s.choices, i + 1)} testId={`audit-sort-${i}`} />
              </div>
            </li>
          ))}
        </ul>
      </CaseSheet>
    </Panel>
  );
}

export default function AuditMysteryExperience() {
  return (
    <MysteryCase chapters={CHAPTERS}>
      <div className="space-y-5">
        <Cover />
        <ChapterPanel
          n={1}
          summary={
            <>
              <b>システム監査</b>＝情報システムのリスクへの対応を確かめる。ほかに<b>会計監査</b>（決算まで誤りがないか）・
              <b>業務監査</b>（業務が合理的・効率的か）・<b>情報セキュリティ監査</b>がある。
            </>
          }
        />
        <ChapterPanel
          n={2}
          summary={
            <>
              監査人は<b>監査対象から独立</b>していること（外観上・精神上）。社内の人でも、指揮命令の系統が別ならよい。
            </>
          }
        />
        <ChapterPanel
          n={3}
          summary={
            <>
              <b>監査計画</b>は監査人が立てる（手続の種類・時期・範囲）。判断尺度はテーマに応じて選んでよい。
            </>
          }
        />
        <ChapterPanel
          n={4}
          summary={
            <>
              <b>予備調査</b>で概要をつかみ、<b>本調査</b>で閲覧・ヒアリング・コンピュータを利用した監査技法で証拠を集める。
            </>
          }
        />
        <ChapterPanel
          n={5}
          summary={
            <>
              <b>職務分掌</b>＝申請者は自分の申請を承認できない。<b>内部統制の6要素</b>＝統制環境・リスクの評価と対応・統制活動・情報と伝達・モニタリング・ITへの対応。
            </>
          }
        />
        <ChapterPanel
          n={6}
          summary={
            <>
              <b>評価・結論</b>で監査意見をまとめ、<b>監査報告書</b>で経営者に報告。監査人は改善を<b>提案</b>するが、<b>指示はしない</b>。
            </>
          }
        />
        <ChapterPanel
          n={7}
          summary={
            <>
              <b>ITガバナンス</b>＝経営陣がITの利用を<b>評価・指示・モニター</b>する。外部に全面的に任せることはできない。
            </>
          }
        />
        <ChapterPanel
          n={8}
          summary={
            <>
              <b>フォローアップ</b>＝監査人が、改善提案に基づく改善の実施状況を確かめる。
            </>
          }
        />
        <Solved />
      </div>
    </MysteryCase>
  );
}
