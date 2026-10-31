"use client";

import type { ReactNode } from "react";
import { Panel } from "../ui";
import { placeAnswer } from "../calc/CalcParts";
import { CaseHeading, CaseMeter, CaseSheet, CaseVerdict, ChapterTrack, Deduce, MysteryCase, MysteryDay, Stamp } from "../story/MysteryDay";
import { Face } from "../story/Faces";
import type { StoryState, Who } from "../story/cast";
import Icon from "@/components/ui/Icon";
import { type Tone, CASES, DOWN, FAKE, FORM, LOGIN, MAP, PHONE, SORT, TRACE, TRICKS } from "./case";

// 「サイバー攻撃の手口」を謎解きゲーム風に見せる体験。台本は case.ts。
//   ① 事件ファイルの表紙：依頼・ミッション・登場人物、捜査の前に知っておくこと
//   ②〜⑦ 第1〜6章。起きたこと（症状）から手口を見抜くたびに、上の「手口ファイル」に名前が書き込まれていく
//   ⑧ 事件解決：手口の早見表・探偵ランク・最終推理
// 公式過去問13問の論点（パスワードリスト・ソーシャルエンジニアリング・DDoS・ゼロデイ・DNSキャッシュポイズニング・
// ドライブバイダウンロード・サニタイジング・バッファオーバーフロー・バックドア・ダークウェブ・APT・サイバーキルチェーン）を出す。

const CHAPTERS = [LOGIN, PHONE, DOWN, FAKE, FORM, TRACE];
const TRACK = CASES.map((s) => ({ key: s.key, label: s.label }));

function Track({ at }: { at: number }) {
  return <ChapterTrack items={TRACK} current={at} label="事件ファイルの章" />;
}

function Cover() {
  const cast: { who: Who; name: string; role: string }[] = [
    { who: "takagi", name: "高木さん", role: "探偵役（情報システム部）" },
    { who: "mori", name: "森さん", role: "助手（とどくんの担当）" },
    { who: "user", name: "サポート窓口の社員", role: "事件を知らせる" },
    { who: "boss", name: "社長", role: "依頼人" },
  ];
  return (
    <Panel>
      <CaseSheet>
        <CaseHeading kicker="CASE FILE No.07">とどくん社を狙う、見えない犯人</CaseHeading>
        <div className="mt-3 rounded-lg bg-[#f3ead6] px-3.5 py-3 text-[13px] leading-relaxed text-stone-800 shadow-lg shadow-black/30">
          <div className="text-[10.5px] font-black tracking-wider text-stone-500">依頼状</div>
          <p className="mt-1">
            とどくんが有名になってから、うちの会社でおかしなことばかり起きる。だれが、どうやってやっているのか。一つ残らず突き止めてくれ。
          </p>
          <p className="mt-1 text-right text-[12px] font-bold text-stone-600">― 社長</p>
        </div>
        <div className="mt-3 rounded-lg px-3 py-2.5 ring-1 ring-amber-400/40" data-testid="mystery-mission">
          <div className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.2em] text-amber-300">
            <Icon name="target" className="h-4 w-4" />
            ミッション
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-200">
            半年のあいだに起きる6つの事件から、犯人が使った<b className="text-white">手口（{TRICKS.length}件）</b>を、起きたことを手がかりに見抜け。
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {TRICKS.map((c, i) => (
              <span key={c.id} className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-white/10">
                <Icon name="lock" className="h-3 w-3" />
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 text-[12px] font-bold text-slate-400">捜査の前に知っておくこと</div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-300 [&_b]:text-white">
          サイバー攻撃の手口は、<b>機械（ソフトの弱点）を攻める</b>ものと、<b>人をだます</b>ものに分かれます。
          試験では「<b>この説明はどの攻撃か</b>」と、手口の名前を見抜く問題が多く出ます。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2" data-testid="cyber-cast">
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

const TONE: Record<Tone, "rose" | "amber"> = { machine: "rose", people: "amber", inside: "rose" };

// 手口ファイル：見抜いた手口。まだのものは数だけ出す
function CaseBoard({ state }: { state: StoryState }) {
  const found = TRICKS.filter((t) => state[`t.${t.id}`]);
  const left = TRICKS.length - found.length;
  return (
    <div className="mt-3 rounded-lg bg-black/25 px-3 py-2.5 ring-1 ring-white/10" data-testid="cyber-sheet">
      <div className="flex items-center justify-between text-[10.5px] font-black tracking-[0.2em] text-slate-400">
        <span>手口ファイル</span>
        <span className="tracking-normal">
          見抜いた {found.length}/{TRICKS.length}
        </span>
      </div>
      <ul className="mt-1.5 space-y-1.5">
        {found.map((t) => {
          const name = String(state[`t.${t.id}`]);
          return (
            <li key={t.id} className="text-[12px]" data-trick={t.id} data-status={name}>
              <div className="leading-snug text-slate-300">{t.what}</div>
              <div key={name} className="mt-0.5">
                <Stamp tone={TONE[t.tone]}>{name}</Stamp>
              </div>
            </li>
          );
        })}
        {left > 0 && (
          <li className="flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
            <Icon name="lock" className="h-3.5 w-3.5" />
            まだ見抜いていない手口：{left}件
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
        <CaseHeading kicker="CASE CLOSED">事件解決：犯人の手口</CaseHeading>
        <div className="mt-3 flex justify-center">
          <Stamp tone="emerald">解決済</Stamp>
        </div>
        <ul className="mt-3 space-y-1.5" data-testid="cyber-map">
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
                <Deduce choices={placeAnswer(s.choices, i + 1)} testId={`cyber-sort-${i}`} />
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
    <b>ブルートフォース攻撃</b>＝パスワードを総当たりで試す。<b>パスワードリスト攻撃</b>＝別のサイトから漏れたIDとパスワードを流用する（使い回しが狙われる）。
  </>,
  <>
    <b>ソーシャルエンジニアリング</b>＝技術を使わず人をだます。なりすまし電話・ショルダーハッキング・トラッシング。対策＝捨てる機器の記憶装置は物理的に壊す。
  </>,
  <>
    <b>DDoS攻撃</b>＝多数の機器（踏み台）から一斉に送りつけてサービスを止める。<b>ゼロデイ攻撃</b>＝修正プログラムが出る前に脆弱性を突く。
  </>,
  <>
    <b>DNSキャッシュポイズニング</b>＝名前とIPアドレスの対応を書き換えて偽サイトへ。<b>ドライブバイダウンロード</b>＝サイトを開いただけでマルウェアが送り込まれる。
  </>,
  <>
    <b>SQLインジェクション</b>＝入力欄に命令文を混ぜる。対策＝<b>サニタイジング</b>。<b>バッファオーバーフロー</b>＝長いデータであふれさせる。対策＝セキュリティパッチ。
  </>,
  <>
    <b>バックドア</b>＝再び入るための裏口。<b>ダークウェブ</b>＝ふつうの検索では見つからない匿名の場所。<b>APT攻撃</b>＝特定の組織を長期間ねらい続ける。段階に分けたモデルが<b>サイバーキルチェーン</b>。
  </>,
];

export default function CyberMysteryExperience() {
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
