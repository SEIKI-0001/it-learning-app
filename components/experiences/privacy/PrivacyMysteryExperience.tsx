"use client";

import type { ReactNode } from "react";
import { Panel } from "../ui";
import { placeAnswer } from "../calc/CalcParts";
import { CaseHeading, CaseMeter, CaseSheet, CaseVerdict, ChapterTrack, Deduce, MysteryCase, MysteryDay, Stamp } from "../story/MysteryDay";
import { Face } from "../story/Faces";
import type { StoryState, Who } from "../story/cast";
import Icon from "@/components/ui/Icon";
import { type Verdict, ANON, CASES, FACE, FORM, GDPR, JUDGES, MAP, MYNUMBER, PROVIDE, SORT } from "./case";

// 「個人情報保護」を謎解きゲーム風に見せる体験。台本は case.ts。
//   ① 事件ファイルの表紙：依頼・ミッション・登場人物、捜査の前に知っておくこと
//   ②〜⑦ 第1〜6章。上の「判定表」に、データごとの扱い方の判定が書き込まれていく
//   ⑧ 事件解決：判定のポイントの早見表・探偵ランク・最終推理
// 各章は「このデータ・この渡し方は許されるか」を見抜く形で、公式過去問6問の論点を1つずつ出す
// （個人情報・要配慮個人情報・マイナンバー・第三者提供の例外・オプトアウト・匿名加工情報・GDPR）。

const CHAPTERS = [FACE, FORM, MYNUMBER, PROVIDE, ANON, GDPR];
const TRACK = CASES.map((s) => ({ key: s.key, label: s.label }));

function Track({ at }: { at: number }) {
  return <ChapterTrack items={TRACK} current={at} label="事件ファイルの章" />;
}

function Cover() {
  const cast: { who: Who; name: string; role: string }[] = [
    { who: "legal", name: "石田さん", role: "探偵役（法務）" },
    { who: "mori", name: "森さん", role: "助手（とどくん便の担当）" },
    { who: "user", name: "総務の社員", role: "相談を持ちこむ" },
    { who: "boss", name: "社長", role: "依頼人" },
  ];
  return (
    <Panel>
      <CaseSheet>
        <CaseHeading kicker="CASE FILE No.06">そのデータ、扱っていいの？</CaseHeading>
        <div className="mt-3 rounded-lg bg-[#f3ead6] px-3.5 py-3 text-[13px] leading-relaxed text-stone-800 shadow-lg shadow-black/30">
          <div className="text-[10.5px] font-black tracking-wider text-stone-500">依頼状</div>
          <p className="mt-1">
            とどくんが売れて、お客さんのデータがどんどん集まっている。使い方を一つでも間違えれば、信用は一瞬で消える。持ちこまれる相談を、一件ずつ判定してくれ。
          </p>
          <p className="mt-1 text-right text-[12px] font-bold text-stone-600">― 社長</p>
        </div>
        <div className="mt-3 rounded-lg px-3 py-2.5 ring-1 ring-amber-400/40" data-testid="mystery-mission">
          <div className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.2em] text-amber-300">
            <Icon name="target" className="h-4 w-4" />
            ミッション
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-200">
            6つの相談に出てくる<b className="text-white">データと渡し方（{JUDGES.length}件）</b>を、個人情報保護法に照らして、使ってよいか・渡してよいかを判定せよ。
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {JUDGES.map((c, i) => (
              <span key={c.id} className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-white/10">
                <Icon name="lock" className="h-3 w-3" />
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 text-[12px] font-bold text-slate-400">捜査の前に知っておくこと</div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300 [&_b]:text-white">
          <b>個人情報保護法</b>は、個人情報を<b>集めるとき・使うとき・渡すとき</b>のルールを決めた法律です。
          試験では「<b>これは個人情報か</b>」「<b>同意なしに渡してよいか</b>」が問われます。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2" data-testid="privacy-cast">
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

const TONE: Record<Verdict, "rose" | "amber" | "emerald"> = { ok: "emerald", ng: "rose", care: "amber" };

// 判定表：判定したデータと渡し方。まだのものは数だけ出す
function CaseBoard({ state }: { state: StoryState }) {
  const judged = JUDGES.filter((j) => state[`j.${j.id}`]);
  const left = JUDGES.length - judged.length;
  return (
    <div className="mt-3 rounded-lg bg-black/25 px-3 py-2.5 ring-1 ring-white/10" data-testid="privacy-sheet">
      <div className="flex items-center justify-between text-[10.5px] font-black tracking-[0.2em] text-slate-400">
        <span>判定表</span>
        <span className="tracking-normal">
          判定した {judged.length}/{JUDGES.length}
        </span>
      </div>
      <ul className="mt-1.5 space-y-1">
        {judged.map((j) => {
          const st = String(state[`j.${j.id}`]);
          return (
            <li key={j.id} className="flex items-start justify-between gap-2 text-[12px]" data-judge={j.id} data-status={st}>
              <span className="min-w-0 leading-snug text-slate-200">{j.what}</span>
              <span key={st} className="flex-none">
                <Stamp tone={TONE[j.tone]}>{st}</Stamp>
              </span>
            </li>
          );
        })}
        {left > 0 && (
          <li className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
            <Icon name="lock" className="h-3.5 w-3.5" />
            まだ判定していないもの：{left}件
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
  const s = CASES[n - 1];
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
        <CaseHeading kicker="CASE CLOSED">事件解決：判定のポイント</CaseHeading>
        <div className="mt-3 flex justify-center">
          <Stamp tone="emerald">解決済</Stamp>
        </div>
        <ul className="mt-3 space-y-1.5" data-testid="privacy-map">
          {MAP.map((m) => (
            <li key={m.name} className="rounded-md bg-[#f3ead6] px-3 py-2 text-[12px] leading-snug text-stone-700 shadow-md shadow-black/30" data-term={m.name}>
              <b className="text-[13px] text-stone-950">{m.name}</b>
              <div>{m.what}</div>
            </li>
          ))}
        </ul>
        <CaseVerdict />
        <div className="mt-5 flex items-center gap-1.5 text-[11px] font-black tracking-[0.2em] text-amber-300">
          <Icon name="search" className="h-4 w-4" />
          最終推理
        </div>
        <ul className="mt-2 space-y-3">
          {SORT.map((s, i) => (
            <li key={s.t} className="rounded-lg bg-white/[0.04] p-3 ring-1 ring-white/10">
              <p className="text-[13px] font-bold leading-relaxed text-white">{s.t}</p>
              <div className="mt-2">
                <Deduce choices={placeAnswer(s.choices, i + 1)} testId={`privacy-sort-${i}`} />
              </div>
            </li>
          ))}
        </ul>
      </CaseSheet>
    </Panel>
  );
}

const SUMMARY: ReactNode[] = [
  <>
    <b>個人情報</b>＝生きている個人で、特定の個人を見分けられる情報（氏名がなくても顔画像はあたる）。集めるときは<b>利用目的</b>を決めて知らせる。
  </>,
  <>
    <b>要配慮個人情報</b>＝人種・信条・社会的身分・病歴・犯罪歴など。学歴・国籍・資産額は含まない。
  </>,
  <>
    <b>マイナンバー</b>＝社会保障・税・災害対策だけに使う。社員番号には使えない。番号は選べず、自由に変えられない。
  </>,
  <>
    <b>第三者提供</b>は原則、本人の同意が要る。例外＝<b>法令に基づく</b>・<b>生命や財産を守るために必要</b>など。
    <br />
    <b>オプトアウト</b>＝本人が求めたら提供を止める。
  </>,
  <>
    <b>匿名加工情報</b>＝個人を識別できず、元に戻せないように加工した情報。ルールの下で同意なく活用できる。
  </>,
  <>
    <b>GDPR</b>＝EUの個人データ保護の規則。EUの中の人に提供するなら、EUに拠点がなくても適用される。
  </>,
];

export default function PrivacyMysteryExperience() {
  return (
    <MysteryCase chapters={CHAPTERS}>
      <div className="space-y-5">
        <Cover />
        {SUMMARY.map((s, i) => (
          <ChapterPanel key={i} n={i + 1} summary={s} />
        ))}
        <Solved />
      </div>
    </MysteryCase>
  );
}
