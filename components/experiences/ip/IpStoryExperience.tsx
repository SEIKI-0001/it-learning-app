"use client";

import type { ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";
import { Choices, placeAnswer, type Choice } from "../calc/CalcParts";
import { StoryDay, StoryTimeline } from "../story/StoryDay";
import { Face } from "../story/Faces";
import type { StoryState, Who } from "../story/cast";
import { APP, COPY, INVENT, LAUNCH, PLAN, PROMO, RIGHTS, SHAPE, USE } from "./launch";

// 「知的財産権」をストーリーで学ぶ体験。
//   ① 大枠：知的財産権の地図と登場人物（ITIL・ISMS・システム監査と同じ会社）
//   ②〜⑧ 新製品「とどくん」を世に出すまで。上の「知財ノート」に取った権利が書き込まれていく
//   ⑨ 権利の早見表と仕分け
// 公式過去問14問（特許・実用新案・意匠・商標とサービスマーク・著作物の範囲・生成AI・パブリシティ権・
// 不正競争防止法と限定提供データ・シュリンクラップ契約・特許の効果・ポートフォリオ・IPランドスケープ）で
// 問われた知識を、出来事の順に1つずつ出す。

function Strip({ at }: { at: number }) {
  return <StoryTimeline items={LAUNCH} current={at} label="とどくんを世に出すまで" />;
}

function Intro() {
  const cast: { who: Who; name: string; role: string }[] = [
    { who: "mori", name: "森さん", role: "とどくんの担当" },
    { who: "takagi", name: "高木さん", role: "設計とアプリ" },
    { who: "boss", name: "社長", role: "言い出した人" },
    { who: "expert", name: "大川さん", role: "弁理士" },
  ];
  return (
    <Panel>
      <SectionTitle step={1}>知的財産権は、頭で生み出したものを守る権利</SectionTitle>
      <div className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <p className="text-sm">
          <span className="mr-1.5 rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold text-white">ひとことで</span>
          発明・デザイン・名前・作品など、人が考えて生み出したものを守るのが<b>知的財産権</b>です。
          何を守るかで、使う権利が変わります。
        </p>
        <ol className="space-y-1 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
          {[
            <>
              <b>産業財産権</b>：特許権・実用新案権・意匠権・商標権（登録が必要）
            </>,
            <>
              <b>著作権</b>：作品やプログラムの表現（作った時点で生まれる）
            </>,
            <>
              <b>そのほか</b>：パブリシティ権・不正競争防止法で守られるもの
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
        ISMSの話の最後で森さんが言った新製品、<b className="text-gray-900">スマート宅配ボックス「とどくん」</b>を世に出すまで。
        上の「知財ノート」に、取った権利が書き込まれていきます。
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="ip-cast">
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

const STATUS_TONE: Record<string, string> = {
  出願中: "bg-amber-100 text-amber-800",
  登録: "bg-gray-900 text-white",
  自動で発生: "bg-emerald-100 text-emerald-800",
};

// 知財ノート：とどくんのために取った権利と、その状態
function IpNote({ state }: { state: StoryState }) {
  const rows = RIGHTS.filter((r) => state[`r.${r.id}`]);
  return (
    <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200" data-testid="ip-note">
      <div className="text-[11px] font-bold text-gray-500">知財ノート（とどくん）</div>
      {rows.length === 0 ? (
        <p className="mt-1 text-[12px] text-gray-400">まだ何も取っていません</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {rows.map((r) => {
            const st = String(state[`r.${r.id}`]);
            return (
              <li key={r.id} className="flex items-start justify-between gap-2 text-[12px]" data-right={r.id} data-status={st}>
                <span className="min-w-0 leading-snug">
                  <b className="text-gray-900">{r.name}</b>
                  <span className="text-gray-600">：{r.what}</span>
                </span>
                <span className={`flex-none rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_TONE[st] ?? ""}`}>{st}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
const ipNote = (state: StoryState) => <IpNote state={state} />;

function stateAfter(...scenes: { state?: StoryState }[][]): StoryState {
  return scenes.flat().reduce<StoryState>((acc, b) => ({ ...acc, ...b.state }), {});
}

function ScenePanel({ step, at, children }: { step: number; at: number; children: ReactNode }) {
  return (
    <Panel>
      <SectionTitle step={step}>
        {LAUNCH[at].label}：{LAUNCH[at].title}
      </SectionTitle>
      <Strip at={at} />
      {children}
    </Panel>
  );
}

// 権利の早見表
const MAP: { name: string; what: string; reg: string; ex: string }[] = [
  { name: "特許権", what: "高度な発明（方法も）", reg: "出願・登録", ex: "配達員だけが開けられるしくみ" },
  { name: "実用新案権", what: "物の形・構造・組合せ", reg: "審査なしで登録", ex: "箱＋保冷バッグ" },
  { name: "意匠権", what: "見た目のデザイン", reg: "登録", ex: "丸みのある見た目" },
  { name: "商標権", what: "商品・サービスの名前やマーク", reg: "登録", ex: "とどくん／とどくん便" },
  { name: "著作権", what: "作品・プログラムの表現", reg: "不要（作った時点）", ex: "アプリのソースプログラム" },
  { name: "パブリシティ権", what: "有名人の名前や姿の価値", reg: "不要", ex: "選手の写真" },
  { name: "不正競争防止法", what: "営業秘密・限定提供データ・コピー防止", reg: "不要", ex: "配達データ・動画" },
];

const SORT: { t: string; choices: Choice[] }[] = [
  {
    t: "著作権法で守られる「著作物」にあたるのは？",
    choices: [
      { label: "原稿なしで話した講演の録音", ok: true },
      { label: "時刻表に載ったバスの到着時刻", why: "ただの事実やデータは、創作的な表現ではありません。" },
      { label: "創造性の高い技術の発明", why: "発明は特許で守ります（発明の場面）。" },
    ],
  },
  {
    t: "著作権と特許権について、正しいのは？",
    choices: [
      { label: "特許権は出願と登録が必要、著作権は出願も登録も要らない", ok: true },
      { label: "偶然同じものが生まれたら、特許は両方、著作権は一方だけに認められる", why: "逆です。特許は先に出願した一方だけ、著作権は別々に作ればそれぞれに生まれます。" },
      { label: "ソフトウェアでは、特許も著作権もソースプログラムの文字に認められる", why: "特許が守るのはしくみ（発明）で、プログラムの文字そのものではありません。" },
    ],
  },
  {
    t: "広告の新しいビジネスモデルを、コンピュータシステムとして実現した。守る法律は？",
    choices: [
      { label: "特許法", ok: true },
      { label: "著作権法", why: "ビジネスの方法（アイデア）は、表現ではありません。" },
      { label: "実用新案法", why: "実用新案は物品の形・構造・組合せです。方法は対象外。" },
      { label: "意匠法", why: "意匠は見た目のデザインです。" },
    ],
  },
  {
    t: "銀行や運送会社が、自社の役務（サービス）を他社と区別するために付ける商標は？",
    choices: [
      { label: "サービスマーク", ok: true },
      { label: "トレードマーク", why: "トレードマークは商品に付ける商標です（形と名の場面）。" },
      { label: "プライベートブランド", why: "小売業者が開発した自社ブランドの商品です。" },
    ],
  },
  {
    t: "人気選手がサインしている姿を撮影し、プリントして販売した。侵害のおそれがある権利は？",
    choices: [
      { label: "パブリシティ権", ok: true },
      { label: "著作権", why: "写真の著作権は撮った人にあります。選手が持つのは、名前や姿の価値を守る権利です。" },
      { label: "商標権", why: "名前やマークを商品に登録したものではありません。" },
      { label: "意匠権", why: "見た目のデザインの話ではありません。" },
    ],
  },
  {
    t: "知財情報を事業・経営の情報と合わせて分析し、経営戦略に反映させることは？",
    choices: [
      { label: "IPランドスケープ", ok: true },
      { label: "特許ポートフォリオ", why: "持っている特許を分析できるようにまとめたもの。経営戦略への反映まではいいません。" },
      { label: "MOT", why: "MOTは技術経営です。" },
      { label: "SWOT分析", why: "強み・弱み・機会・脅威の分析です。" },
    ],
  },
];

function RecapPanel() {
  return (
    <Panel>
      <SectionTitle step={9}>ふりかえり：何を、どの権利で守る？</SectionTitle>
      <ul className="mt-3 divide-y divide-gray-100 text-[12px]" data-testid="ip-map">
        {MAP.map((m) => (
          <li key={m.name} className="py-1.5" data-right={m.name}>
            <div className="flex items-baseline justify-between gap-2">
              <b className="text-[13px] text-gray-900">{m.name}</b>
              <span className="flex-none text-[10.5px] font-bold text-gray-500">{m.reg}</span>
            </div>
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
              <Choices choices={placeAnswer(s.choices, i + 2)} cols={1} testId={`ip-sort-${i}`} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function IpStoryExperience() {
  return (
    <div className="space-y-5">
      <Intro />
      <ScenePanel step={2} at={0}>
        <StoryDay
          unit="場面"
          beats={PLAN}
          renderState={ipNote}
          summary={
            <>
              <b>IPランドスケープ</b>＝知財情報を事業・経営の情報と合わせて分析し、経営戦略に生かす。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={3} at={1}>
        <StoryDay
          unit="場面"
          beats={INVENT}
          renderState={ipNote}
          summary={
            <>
              <b>特許権</b>＝高度な発明（方法やビジネスモデルも）。出願・登録が必要で、先に出願した人に認められる。
              <br />
              <b>実用新案権</b>＝物品の形・構造・組合せ。高度さは不要・審査なしで登録・方法は対象外。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={4} at={2}>
        <StoryDay
          unit="場面"
          beats={SHAPE}
          initialState={stateAfter(INVENT)}
          renderState={ipNote}
          summary={
            <>
              <b>意匠権</b>＝見た目のデザイン／<b>商標権</b>＝名前やマーク。商品に付けるのがトレードマーク、
              役務（サービス）に付けるのが<b>サービスマーク</b>。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={5} at={3}>
        <StoryDay
          unit="場面"
          beats={APP}
          initialState={stateAfter(INVENT, SHAPE)}
          renderState={ipNote}
          summary={
            <>
              <b>著作権</b>は登録不要。ソースプログラムやマニュアルは守られるが、
              <b>アルゴリズム・通信プロトコルは守られない</b>。
              <br />
              <b>シュリンクラップ契約</b>＝包装を開けた時点で契約が成立する。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={6} at={4}>
        <StoryDay
          unit="場面"
          beats={PROMO}
          initialState={stateAfter(INVENT, SHAPE, APP)}
          renderState={ipNote}
          summary={
            <>
              既存の作品に似せて生成AIで作り、<b>公開する</b>と許諾が必要になる可能性がある（個人で楽しむだけなら問題になりにくい）。
              <br />
              有名人の名前や姿を勝手に商売に使うと<b>パブリシティ権</b>の侵害。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={7} at={5}>
        <StoryDay
          unit="場面"
          beats={COPY}
          initialState={stateAfter(INVENT, SHAPE, APP)}
          renderState={ipNote}
          summary={
            <>
              <b>不正競争防止法</b>＝コピープロテクトを外すソフトの販売・営業秘密の不正取得などを規制。
              <br />
              <b>限定提供データ</b>＝特定の相手に提供するため電子的に大量に蓄積・管理するデータ（秘密管理の営業秘密とは別）。
            </>
          }
        />
      </ScenePanel>
      <ScenePanel step={8} at={6}>
        <StoryDay
          unit="場面"
          beats={USE}
          initialState={stateAfter(INVENT, SHAPE, APP)}
          renderState={ipNote}
          summary={
            <>
              特許の効果＝<b>他社の参入を防ぐ・ライセンスで開発費を回収・提携で有利</b>。
              <br />
              <b>特許ポートフォリオ</b>＝持っている特許を事業への貢献などで整理したもの／<b>クロスライセンス</b>＝互いの特許を使い合う。
            </>
          }
        />
      </ScenePanel>
      <RecapPanel />
    </div>
  );
}
