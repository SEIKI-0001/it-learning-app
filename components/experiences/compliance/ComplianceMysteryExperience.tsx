"use client";

import type { ReactNode } from "react";
import { Panel } from "../ui";
import { placeAnswer } from "../calc/CalcParts";
import { CaseHeading, CaseMeter, CaseSheet, CaseVerdict, ChapterTrack, Deduce, MysteryCase, MysteryDay, Stamp } from "../story/MysteryDay";
import { Face } from "../story/Faces";
import type { StoryState, Who } from "../story/cast";
import Icon from "@/components/ui/Icon";
import { AD, AI, CHECKS, GOV, MAIL, MAP, PARTNER, PAY, SALE, SORT } from "./sale";

// 「法務・コンプライアンス」を謎解きゲーム風に見せる体験。台本は sale.ts（ストーリー版と同じ）。
//   ① 事件ファイルの表紙：依頼・ミッション・登場人物、捜査の前に知っておくこと
//   ②〜⑦ 第1〜6章。上の「捜査ボード」に、突き止めた法律・ルールと手の打ち方が書き込まれていく
//   ⑧ 事件解決：法律の早見表・探偵ランク・最終推理
// 各章は「この案・この行為のどこが問題か」を見抜く形で、公式過去問10問の論点を1つずつ出す。

const CHAPTERS = [AD, MAIL, PAY, PARTNER, AI, GOV];
const TRACK = SALE.map((s) => ({ key: s.key, label: s.label }));

function Track({ at }: { at: number }) {
  return <ChapterTrack items={TRACK} current={at} label="事件ファイルの章" />;
}

function Cover() {
  const cast: { who: Who; name: string; role: string }[] = [
    { who: "legal", name: "石田さん", role: "探偵役（法務）" },
    { who: "mori", name: "森さん", role: "助手（とどくんの担当）" },
    { who: "takagi", name: "高木さん", role: "アプリとメール" },
    { who: "boss", name: "社長", role: "依頼人" },
  ];
  return (
    <Panel>
      <CaseSheet>
        <CaseHeading kicker="CASE FILE No.05">とどくん売り出し作戦に潜む落とし穴</CaseHeading>
        <div className="mt-3 rounded-lg bg-[#f3ead6] px-3.5 py-3 text-[13px] leading-relaxed text-stone-800 shadow-lg shadow-black/30">
          <div className="text-[10.5px] font-black tracking-wider text-stone-500">依頼状</div>
          <p className="mt-1">
            とどくんを派手に売り出したい。だが、法律やルールを破って信用を失うことだけは避けたい。危ない案は、出す前に見抜いてくれ。
          </p>
          <p className="mt-1 text-right text-[12px] font-bold text-stone-600">― 社長</p>
        </div>
        <div className="mt-3 rounded-lg px-3 py-2.5 ring-1 ring-amber-400/40" data-testid="mystery-mission">
          <div className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.2em] text-amber-300">
            <Icon name="target" className="h-4 w-4" />
            ミッション
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-200">
            売り出しの6つの場面で、危ない案を見抜き、関わる<b className="text-white">法律・ルール（{CHECKS.length}個）</b>を突き止めて、正しく手を打て。
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {CHECKS.map((c, i) => (
              <span key={c.id} className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-white/10">
                <Icon name="lock" className="h-3 w-3" />
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 text-[12px] font-bold text-slate-400">捜査の前に知っておくこと</div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300 [&_b]:text-white">
          <b>コンプライアンス</b>は「法令遵守」。ただし守るのは法律だけでなく、<b>契約・社内ルール</b>と<b>倫理（良識）</b>まで。
          試験では「<b>この事例はどの法律で問題になるか</b>」が問われます。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2" data-testid="compliance-cast">
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

// 捜査ボード：突き止めた法律・ルールと手の打ち方。まだのものは数だけ出す
function CaseBoard({ state }: { state: StoryState }) {
  const found = CHECKS.filter((c) => state[`c.${c.id}`]);
  const left = CHECKS.length - found.length;
  return (
    <div className="mt-3 rounded-lg bg-black/25 px-3 py-2.5 ring-1 ring-white/10" data-testid="compliance-sheet">
      <div className="flex items-center justify-between text-[10.5px] font-black tracking-[0.2em] text-slate-400">
        <span>捜査ボード</span>
        <span className="tracking-normal">
          突き止めた {found.length}/{CHECKS.length}
        </span>
      </div>
      <ul className="mt-1.5 space-y-1">
        {found.map((c) => {
          const st = String(state[`c.${c.id}`]);
          return (
            <li key={c.id} className="flex items-start justify-between gap-2 text-[12px]" data-check={c.id} data-status={st}>
              <span className="min-w-0 leading-snug">
                <b className="text-amber-300">{c.name}</b>
                <span className="text-slate-300">：{c.what}</span>
              </span>
              <span key={st} className="flex-none">
                <Stamp tone={st === "直した" ? "amber" : "emerald"}>{st}</Stamp>
              </span>
            </li>
          );
        })}
        {left > 0 && (
          <li className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
            <Icon name="lock" className="h-3.5 w-3.5" />
            まだ突き止めていない法律・ルール：{left}個
          </li>
        )}
      </ul>
      <CaseMeter />
    </div>
  );
}
const caseBoard = (state: StoryState) => <CaseBoard state={state} />;

function stateAfter(...scenes: { state?: StoryState }[][]): StoryState {
  return scenes.flat().reduce<StoryState>((acc, b) => ({ ...acc, ...b.state }), {});
}

function ChapterPanel({ n, summary }: { n: number; summary: ReactNode }) {
  const s = SALE[n - 1];
  return (
    <Panel>
      <CaseSheet>
        <CaseHeading kicker={`CHAPTER ${n} ／ ${s.label}`}>
          第{n}章　{s.title}
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
        <CaseHeading kicker="CASE CLOSED">事件解決：突き止めた法律・ルール</CaseHeading>
        <div className="mt-3 flex justify-center">
          <Stamp tone="emerald">解決済</Stamp>
        </div>
        <ul className="mt-3 space-y-1.5" data-testid="compliance-map">
          {MAP.map((m) => (
            <li key={m.law} className="rounded-md bg-[#f3ead6] px-3 py-2 text-[12px] leading-snug text-stone-700 shadow-md shadow-black/30" data-law={m.law}>
              <b className="text-[13px] text-stone-950">{m.law}</b>
              <div>
                {m.what}
                <span className="text-stone-500">（とどくん：{m.ex}）</span>
              </div>
            </li>
          ))}
        </ul>
        <CaseVerdict />
        <div className="mt-5 flex items-center gap-1.5 text-[11px] font-black tracking-[0.2em] text-amber-300">
          <Icon name="search" className="h-4 w-4" />
          最終推理：この事例は、どの法律？
        </div>
        <ul className="mt-2 space-y-3">
          {SORT.map((s, i) => (
            <li key={s.t} className="rounded-lg bg-white/[0.04] p-3 ring-1 ring-white/10">
              <p className="text-[13px] font-bold leading-relaxed text-white">{s.t}</p>
              <div className="mt-2">
                <Deduce choices={placeAnswer(s.choices, i + 1)} testId={`compliance-sort-${i}`} />
              </div>
            </li>
          ))}
        </ul>
      </CaseSheet>
    </Panel>
  );
}

export default function ComplianceMysteryExperience() {
  return (
    <MysteryCase chapters={CHAPTERS}>
      <div className="space-y-5">
        <Cover />
        <ChapterPanel
          n={1}
          summary={
            <>
              <b>景品表示法</b>＝うそや大げさな表示・行き過ぎた景品を規制。<b>ステルスマーケティング</b>や
              <b>原産国の不当表示</b>は問題になる。だれでも応募できる<b>オープン懸賞</b>は対象外。
            </>
          }
        />
        <ChapterPanel
          n={2}
          summary={
            <>
              <b>特定電子メール法</b>＝宣伝メールは事前の同意（<b>オプトイン</b>）が原則。
              取引関係のある相手・公表されているアドレスは例外。事務連絡や請求は宣伝メールではない。
            </>
          }
        />
        <ChapterPanel
          n={3}
          summary={
            <>
              <b>資金決済法</b>＝商品券やプリペイドカードなどの<b>前払式支払手段</b>（おまけのポイントは当たらない）。
              <br />
              <b>AML</b>＝マネーロンダリング対策。口座開設時の本人確認・取引目的の確認、疑わしい取引の監視。
            </>
          }
        />
        <ChapterPanel
          n={4}
          summary={
            <>
              <b>NDA</b>＝秘密情報を特定し、相手の秘密を管理することを合意する契約。
              <br />
              <b>ソーシャルメディアポリシー</b>＝役員・社員が公私を問わずSNSを使うときのルール。社外にも示す。
            </>
          }
        />
        <ChapterPanel
          n={5}
          summary={
            <>
              AIを使うときは、<b>生命・身体への危害</b>・<b>差別的な判断</b>・<b>プライバシーの侵害</b>の3つに気をつける。
            </>
          }
        />
        <ChapterPanel
          n={6}
          summary={
            <>
              <b>官民データ活用推進基本法</b>＝国・自治体・独立行政法人・大学・事業者のデータの公開と活用を進める。
              <br />
              <b>情報公開法</b>＝行政機関の<b>行政文書</b>をだれでも請求できる（国会・裁判所・民間企業は対象外）。
            </>
          }
        />
        <Solved />
      </div>
    </MysteryCase>
  );
}
