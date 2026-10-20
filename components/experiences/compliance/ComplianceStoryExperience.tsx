"use client";

import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";
import { Choices, placeAnswer, type Choice } from "../calc/CalcParts";
import { StoryDay, StoryTimeline } from "../story/StoryDay";
import { Face } from "../story/Faces";
import type { StoryState, Who } from "../story/cast";
import { AD, AI, CHECKS, GOV, MAIL, PARTNER, PAY, SALE } from "./sale";

// 「法務・コンプライアンス」をストーリーで学ぶ体験。
//   ① 大枠：コンプライアンス＝法律・社内ルール・倫理を守ること、と登場人物（知的財産権の話の続き）
//   ②〜⑦ とどくんを売り出してから。上の「コンプラ点検表」に、確かめた法律・ルールが書き込まれていく
//   ⑧ 法律の早見表と「どの法律？」
// 公式過去問10問（景品表示法・特定電子メール法・資金決済法・AML×2・NDA・ソーシャルメディアポリシー・
// AIの利活用・官民データ活用推進基本法・情報公開法）で問われた知識を、出来事の順に1つずつ出す。

function Strip({ at }: { at: number }) {
  return <StoryTimeline items={SALE} current={at} label="とどくんを売り出してから" />;
}

function Intro() {
  const cast: { who: Who; name: string; role: string }[] = [
    { who: "mori", name: "森さん", role: "とどくんの担当" },
    { who: "takagi", name: "高木さん", role: "アプリとメール" },
    { who: "boss", name: "社長", role: "売り出したい人" },
    { who: "legal", name: "石田さん", role: "法務" },
  ];
  return (
    <Panel>
      <SectionTitle step={1}>コンプライアンスは、法律・ルール・良識を守ること</SectionTitle>
      <div className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <p className="text-sm">
          <span className="mr-1.5 rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold text-white">ひとことで</span>
          <b>コンプライアンス</b>は「法令遵守」。ただし法律だけでなく、次の3つをまとめて守ることです。
        </p>
        <ol className="space-y-1 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
          {[
            <>
              <b>法律</b>：景品表示法・特定電子メール法・資金決済法など
            </>,
            <>
              <b>契約・社内ルール</b>：NDA・ソーシャルメディアポリシーなど
            </>,
            <>
              <b>倫理（良識）</b>：法律になくても誠実に。AIの使い方など
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
        <p>
          試験では「<b>この事例はどの法律で問題になるか</b>」が問われます。法律ごとに、典型的な事例で覚えましょう。
        </p>
      </div>
      <div className="mt-4 border-t border-dashed border-gray-300 pt-3 text-[13px] leading-relaxed text-gray-700">
        <span className="mr-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200">
          お話で見る
        </span>
        知的財産権の話で生まれた<b className="text-gray-900">スマート宅配ボックス「とどくん」</b>を売り出してから。
        上の「コンプラ点検表」に、確かめた法律やルールが書き込まれていきます。
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="compliance-cast">
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
      <Strip at={-1} />
    </Panel>
  );
}

// コンプラ点検表：確かめた法律・ルールと、その対応
function CheckSheet({ state }: { state: StoryState }) {
  const rows = CHECKS.filter((c) => state[`c.${c.id}`]);
  return (
    <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200" data-testid="compliance-sheet">
      <div className="text-[11px] font-bold text-gray-500">コンプラ点検表（とどくん）</div>
      {rows.length === 0 ? (
        <p className="mt-1 text-[12px] text-gray-400">まだ何も確かめていません</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {rows.map((c) => {
            const st = String(state[`c.${c.id}`]);
            return (
              <li key={c.id} className="flex items-start justify-between gap-2 text-[12px]" data-check={c.id} data-status={st}>
                <span className="min-w-0 leading-snug">
                  <b className="text-gray-900">{c.name}</b>
                  <span className="text-gray-600">：{c.what}</span>
                </span>
                <span
                  className={`flex-none rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    st === "直した" ? "bg-amber-100 text-amber-800" : "bg-gray-900 text-white"
                  }`}
                >
                  {st}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
const checkSheet = (state: StoryState) => <CheckSheet state={state} />;

function stateAfter(...scenes: { state?: StoryState }[][]): StoryState {
  return scenes.flat().reduce<StoryState>((acc, b) => ({ ...acc, ...b.state }), {});
}

function ScenePanel({ step, at, children }: { step: number; at: number; children: ReactNode }) {
  return (
    <Panel>
      <SectionTitle step={step}>
        {SALE[at].label}：{SALE[at].title}
      </SectionTitle>
      <Strip at={at} />
      {children}
    </Panel>
  );
}

// 法律の早見表
const MAP: { law: string; what: string; ex: string }[] = [
  { law: "景品表示法", what: "うそ・大げさな表示、行き過ぎた景品", ex: "ステマ・原産国のタグ" },
  { law: "特定電子メール法", what: "宣伝メールは事前の同意（オプトイン）", ex: "配信停止だけでは不可" },
  { law: "資金決済法", what: "前払式支払手段・暗号資産など", ex: "使用期限のない回数券" },
  { law: "犯罪収益移転防止法（AML）", what: "マネーロンダリング対策", ex: "口座開設時の本人確認" },
  { law: "NDA（契約）", what: "秘密情報を特定し、管理を約束", ex: "運送会社との共同開発" },
  { law: "ソーシャルメディアポリシー", what: "社員が公私を問わずSNSを使うルール", ex: "試作品の写真を投稿" },
  { law: "AIの利活用（倫理）", what: "危害・差別・プライバシーの侵害に注意", ex: "顔認証で開くふた" },
  { law: "官民データ活用推進基本法", what: "国・自治体・事業者のデータの活用", ex: "市・大学・電力会社と" },
  { law: "情報公開法", what: "行政機関の行政文書をだれでも請求", ex: "国が調べた置き配の資料" },
];

const SORT: { t: string; choices: Choice[] }[] = [
  {
    t: "誰でも応募できるクイズに答えた人から、抽選で現金10万円が当たるキャンペーン。景品表示法では？",
    choices: [
      { label: "問題にならない（オープン懸賞）", ok: true },
      { label: "問題になる（景品の上限を超える）", why: "商品を買わなくても応募できるオープン懸賞は、景品の規制の対象外です（宣伝の場面）。" },
    ],
  },
  {
    t: "人気サイトが、依頼された商品をほめる記事を、広告と書かずにふつうの記事として載せた。問題になる法律は？",
    choices: [
      { label: "景品表示法", ok: true },
      { label: "特定電子メール法", why: "メールの話ではありません。広告であることを隠した宣伝（ステマ）です。" },
      { label: "資金決済法", why: "支払いの話ではありません。" },
    ],
  },
  {
    t: "買い物でおまけにもらい、次の買い物に使えるポイント。資金決済法の前払式支払手段にあたる？",
    choices: [
      { label: "あたらない", ok: true },
      { label: "あたる", why: "お金を先に払っていないので、前払式支払手段ではありません（支払の場面）。" },
    ],
  },
  {
    t: "犯罪で得た資金を、正当に得たように見せかける行為を防ぐ取組は？",
    choices: [
      { label: "AML", ok: true },
      { label: "インサイダー取引規制", why: "会社の内部情報を使った株の売買を禁じるものです。" },
      { label: "スキミング", why: "カードの情報を盗み取る犯罪です。" },
      { label: "フィッシング", why: "偽のサイトやメールで情報をだまし取る攻撃です。" },
    ],
  },
  {
    t: "情報公開法で公開を請求できるのは？",
    choices: [
      { label: "行政機関の行政文書", ok: true },
      { label: "上場企業の社内文書", why: "民間企業の文書は対象外です（行政の場面）。" },
      { label: "裁判所の司法文書", why: "裁判所は行政機関ではありません。" },
    ],
  },
];

function RecapPanel() {
  return (
    <Panel>
      <SectionTitle step={8}>ふりかえり：この事例は、どの法律？</SectionTitle>
      <ul className="mt-3 divide-y divide-gray-100 text-[12px]" data-testid="compliance-map">
        {MAP.map((m) => (
          <li key={m.law} className="py-1.5" data-law={m.law}>
            <b className="text-[13px] text-gray-900">{m.law}</b>
            <div className="text-gray-700">
              {m.what}
              <span className="text-gray-400">（とどくん：{m.ex}）</span>
            </div>
          </li>
        ))}
      </ul>
      <h4 className="mt-5 text-sm font-bold text-gray-900">どれにあたる？（とどくんの話を思い出して）</h4>
      <ul className="mt-2 space-y-3">
        {SORT.map((s, i) => (
          <li key={s.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <p className="text-[13px] font-bold leading-relaxed text-gray-800">{s.t}</p>
            <div className="mt-2">
              <Choices choices={placeAnswer(s.choices, i + 1)} cols={1} testId={`compliance-sort-${i}`} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function ComplianceStoryExperience() {
  return (
    <div className="space-y-5">
      <Intro />
      <ScenePanel step={2} at={0}>
        <StoryDay
          unit="場面"
          beats={AD}
          renderState={checkSheet}
          summary={
            <>
              <b>景品表示法</b>＝うそや大げさな表示・行き過ぎた景品を規制。<b>ステルスマーケティング</b>や
              <b>原産国の不当表示</b>は問題になる。だれでも応募できる<b>オープン懸賞</b>は対象外。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={3} at={1}>
        <StoryDay
          unit="場面"
          beats={MAIL}
          initialState={stateAfter(AD)}
          renderState={checkSheet}
          summary={
            <>
              <b>特定電子メール法</b>＝宣伝メールは事前の同意（<b>オプトイン</b>）が原則。
              取引関係のある相手・公表されているアドレスは例外。事務連絡や請求は宣伝メールではない。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={4} at={2}>
        <StoryDay
          unit="場面"
          beats={PAY}
          initialState={stateAfter(AD, MAIL)}
          renderState={checkSheet}
          summary={
            <>
              <b>資金決済法</b>＝商品券やプリペイドカードなどの<b>前払式支払手段</b>（おまけのポイントは当たらない）。
              <br />
              <b>AML</b>＝マネーロンダリング対策。口座開設時の本人確認・取引目的の確認、疑わしい取引の監視。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={5} at={3}>
        <StoryDay
          unit="場面"
          beats={PARTNER}
          initialState={stateAfter(AD, MAIL, PAY)}
          renderState={checkSheet}
          summary={
            <>
              <b>NDA</b>＝秘密情報を特定し、相手の秘密を管理することを合意する契約。
              <br />
              <b>ソーシャルメディアポリシー</b>＝役員・社員が公私を問わずSNSを使うときのルール。社外にも示す。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={6} at={4}>
        <StoryDay
          unit="場面"
          beats={AI}
          initialState={stateAfter(AD, MAIL, PAY, PARTNER)}
          renderState={checkSheet}
          summary={
            <>
              AIを使うときは、<b>生命・身体への危害</b>・<b>差別的な判断</b>・<b>プライバシーの侵害</b>の3つに気をつける。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={7} at={5}>
        <StoryDay
          unit="場面"
          beats={GOV}
          initialState={stateAfter(AD, MAIL, PAY, PARTNER, AI)}
          renderState={checkSheet}
          summary={
            <>
              <b>官民データ活用推進基本法</b>＝国・自治体・独立行政法人・大学・事業者のデータの公開と活用を進める。
              <br />
              <b>情報公開法</b>＝行政機関の<b>行政文書</b>をだれでも請求できる（国会・裁判所・民間企業は対象外）。
            </>
          }
        />
      </ScenePanel>
      <RecapPanel />
    </div>
  );
}
