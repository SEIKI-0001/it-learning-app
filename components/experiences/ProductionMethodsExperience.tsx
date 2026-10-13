"use client";

import { useState, type ReactNode } from "react";
import styles from "./calc/calc.module.css";
import { Note, Replay } from "./calc/CalcParts";
import { useBeats } from "./calc/useBeats";
import { Arrow, Box, Caption, Lead, PointsPanel, Seg } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";
import Icon from "@/components/ui/Icon";
import { InlineIcon } from "@/components/ui/Pictogram";

// 「生産方式（ライン・セル・JIT・BTO）」。「いつ作るか」と「どう作るか」の2軸で整理する。
//   ① いつ作る？ 見込生産／受注生産／BTO を切り替え、「注文」がどこに来るかで見分ける
//   ② どう作る？ ライン生産／セル生産を切り替え、1人が受け持つ工程の数で見分ける
//   ③ JIT とかんばん：後工程が使った分だけ引き取り、前工程はその分だけ作る（段階表示）
//   ④ リーン生産方式：ムリ・ムラ・ムダ（静的）
//   ⑤ 試験ポイント

export default function ProductionMethodsExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        生産方式は<b>「いつ作るか」</b>と<b>「どう作るか」</b>の2つに分けると迷いません。お弁当屋さんと工場の例で見ていきます。
      </Lead>
      <WhenPanel />
      <HowPanel />
      <JitPanel />
      <LeanPanel />
      <PointsPanel
        step={5}
        points={[
          <>見込生産＝<b>注文の前</b>に作る／受注生産＝<b>注文の後</b>に作る／BTO＝注文の後に<b>選ばれた構成で組み立てる</b></>,
          <>ライン生産＝流れ作業で<b>1人1工程</b>（少品種大量）／セル生産＝<b>少人数で多くの工程</b>（多品種少量）</>,
          <>JIT＝必要なものを<b>必要なときに必要な量だけ</b>。かんばん方式＝<b>後工程が引き取った分</b>だけ前工程が作る</>,
          <>リーン生産方式＝<b>ムリ・ムラ・ムダ</b>をなくす。ムダ＝作りすぎ・手待ちなど付加価値を生まないもの</>,
        ]}
        traps={[
          ["セル生産は流れ作業の一種", "流れ作業はライン生産。セル生産は少人数で組付けから検査まで受け持つ"],
          ["かんばん方式は前工程が作った分を後工程へ送る", "後工程が使った分だけ前工程へ引き取りに行く（引っ張る）"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① いつ作る？
// ---------------------------------------------------------------------------

type When = "stock" | "order" | "bto";

const WHEN: Record<When, { steps: { label: string; sub: string; order?: boolean }[]; good: string; care: string; ex: string }> = {
  stock: {
    steps: [
      { label: "売れ行きを予測", sub: "昼は唐揚げ弁当が30個" },
      { label: "先に作る", sub: "朝のうちに30個作り置き" },
      { label: "注文", sub: "お客さんが来店", order: true },
      { label: "すぐ渡す", sub: "棚から取って会計" },
    ],
    good: "待たせずにすぐ渡せる",
    care: "予測が外れると売れ残る・品切れする",
    ex: "コンビニ弁当・日用品など定番品",
  },
  order: {
    steps: [
      { label: "注文", sub: "「20人分の仕出し弁当を」", order: true },
      { label: "内容を決める", sub: "人数・予算・好みを聞く" },
      { label: "作る", sub: "注文に合わせて調理" },
      { label: "届ける", sub: "当日に配達" },
    ],
    good: "売れ残りが出ない・注文ごとに合わせられる",
    care: "注文から受け取りまで時間がかかる",
    ex: "注文住宅・船・業務システムなど",
  },
  bto: {
    steps: [
      { label: "部品を用意", sub: "ご飯・おかずを仕込んでおく" },
      { label: "注文", sub: "おかずを3品選んでもらう", order: true },
      { label: "組み立てる", sub: "選ばれたおかずを詰める" },
      { label: "渡す", sub: "数分で完成" },
    ],
    good: "好みの構成を、短い待ち時間で届けられる",
    care: "部品の在庫は持つ必要がある",
    ex: "CPU・メモリを選んで買うパソコン",
  },
};

function WhenPanel() {
  const [mode, setMode] = useState<When>("stock");
  const w = WHEN[mode];
  return (
    <Panel>
      <SectionTitle step={1}>いつ作る？ ― 「注文」がどこに来るか</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">切り替えて、<b className="text-gray-800">注文（色の濃い箱）</b>が作る前か後かを見比べよう。</p>
      <div className="mt-3">
        <Seg
          testId="pm-when"
          value={mode}
          onChange={setMode}
          options={[
            { value: "stock", label: "見込生産" },
            { value: "order", label: "受注生産" },
            { value: "bto", label: "BTO" },
          ]}
        />
      </div>
      <div key={mode} className={`mt-3 grid grid-cols-4 items-stretch gap-2.5 ${styles.reveal}`} data-testid="pm-when-steps" data-mode={mode}>
        {w.steps.map((s, i) => (
          <div key={s.label} className="relative">
            <Box tone={s.order ? "brand" : "plain"} sub={s.sub} className="h-full !px-1">
              <span className="text-[12px]">{s.label}</span>
            </Box>
            {i < w.steps.length - 1 && (
              <span aria-hidden className="absolute -right-[9px] top-1/2 z-10 -translate-y-1/2 text-sm font-bold leading-none text-gray-500">›</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[13px] leading-snug">
        <div className="rounded-lg bg-emerald-50 px-2.5 py-2 text-emerald-900 ring-1 ring-emerald-200">
          <Caption className="!text-emerald-700">よい点</Caption>
          {w.good}
        </div>
        <div className="rounded-lg bg-amber-50 px-2.5 py-2 text-amber-900 ring-1 ring-amber-200">
          <Caption className="!text-amber-700">気をつける点</Caption>
          {w.care}
        </div>
      </div>
      <p className="mt-2 text-[12px] text-gray-500">例：{w.ex}</p>
      {mode === "bto" && (
        <p className="mt-1 text-[12px] leading-relaxed text-gray-500">※ BTO（Build To Order）は受注生産の一種。部品は先に用意し、組み立てだけを注文の後に行います。</p>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② どう作る？
// ---------------------------------------------------------------------------

type How = "line" | "cell";
const PROCESSES = ["部品を付ける", "配線する", "組み立てる", "検査する"];

function Worker({ tone = "gray" }: { tone?: "gray" | "brand" }) {
  return (
    <span className={`grid h-8 w-8 place-items-center rounded-full ring-1 ${tone === "brand" ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-gray-700 ring-gray-300"}`}>
      <Icon name="user" className="h-4 w-4" />
    </span>
  );
}

function HowPanel() {
  const [mode, setMode] = useState<How>("line");
  return (
    <Panel>
      <SectionTitle step={2}>どう作る？ ― 1人が受け持つ工程の数</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">同じ4つの工程を、ライン生産とセル生産で受け持つとどうなるか比べます。</p>
      <div className="mt-3">
        <Seg
          testId="pm-how"
          value={mode}
          onChange={setMode}
          options={[
            { value: "line", label: "ライン生産方式" },
            { value: "cell", label: "セル生産方式" },
          ]}
        />
      </div>

      <div key={mode} className={`mt-4 ${styles.reveal}`} data-testid="pm-how-figure" data-mode={mode}>
        {mode === "line" ? (
          <div>
            <div className="grid grid-cols-4 gap-1 text-center">
              {PROCESSES.map((p) => (
                <div key={p} className="flex flex-col items-center gap-1">
                  <Worker />
                  <Box tone="soft" className="w-full !px-0.5"><span className="text-[11px]">{p}</span></Box>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-500" aria-hidden>
              <span>ベルトコンベア</span>
              <span className="h-px flex-1 bg-gray-400" />
              <span>→ 製品が流れる</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-gray-700">4人が<b>1工程ずつ</b>担当。同じ作業を繰り返すので慣れが早く、<b>同じ製品を大量に</b>作るのに向きます（少品種大量生産）。</p>
          </div>
        ) : (
          <div>
            <div className="mx-auto grid max-w-[18rem] grid-cols-3 items-center gap-1.5">
              {PROCESSES.slice(0, 3).map((p, i) => (
                <Box key={p} tone="soft" className="!px-0.5"><span className="text-[11px]">{i + 1}. {p}</span></Box>
              ))}
              <span />
              <div className="flex flex-col items-center gap-0.5">
                <Worker tone="brand" />
                <span className="text-[10px] font-bold text-brand-700">1人で1→4</span>
              </div>
              <Box tone="soft" className="!px-0.5"><span className="text-[11px]">4. {PROCESSES[3]}</span></Box>
            </div>
            <p className="mt-1 text-center text-[11px] font-bold text-gray-500">作業者を囲むように作業台を並べた「セル（小部屋）」</p>
            <p className="mt-3 text-[13px] leading-relaxed text-gray-700"><b>1人（または少人数）</b>が組付けから検査まで<b>多くの工程</b>を受け持ちます。作る製品をすぐ切り替えられるので、<b>多品種少量生産</b>に向きます。</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ JIT とかんばん方式（段階表示）
// ---------------------------------------------------------------------------

const JIT_DELAYS = [900, 1300, 1300, 1300];

function Row({ on, children }: { on: boolean; children: ReactNode }) {
  return <div className={`transition-opacity duration-500 ${on ? "opacity-100" : "opacity-0"}`}>{children}</div>;
}

function JitPanel() {
  const { ref, beat, reducedMotion, replay } = useBeats(5, JIT_DELAYS);
  return (
    <Panel>
      <SectionTitle step={3}>JIT とかんばん方式 ― 後ろから引っ張る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">JIT（ジャストインタイム）</b>は、必要なものを<b className="text-gray-800">必要なときに必要な量だけ</b>作る考え方。その手段が<b className="text-gray-800">かんばん方式</b>です。
      </p>
      <div ref={ref} className="mt-4" data-testid="pm-jit" data-beat={beat}>
        <div className="grid grid-cols-2 gap-2 text-center">
          <Box tone="plain" sub="部品を作る">前工程</Box>
          <Box tone="plain" sub="製品を組み立てる">後工程</Box>
        </div>
        <div className="mt-2 space-y-1.5">
          <Row on={beat >= 1}>
            <div className="flex items-center justify-end gap-1.5 text-[13px] font-bold text-gray-700">
              <span>① 部品を3個使った</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 ring-1 ring-gray-300">部品×3</span>
            </div>
          </Row>
          <Row on={beat >= 2}>
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-brand-700">
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 ring-1 ring-amber-300">かんばん</span>
              <span aria-hidden className="text-base leading-none text-brand-500">←</span>
              <span className="-ml-1.5 h-px flex-1 border-t-2 border-dashed border-brand-400" />
              <span>② 使った分の札を持って引き取りに行く</span>
            </div>
          </Row>
          <Row on={beat >= 3}>
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-gray-700">
              <span>③ 札に書かれた3個だけ作る</span>
              <span className="rounded bg-brand-50 px-1.5 py-0.5 text-brand-800 ring-1 ring-brand-300">部品×3</span>
            </div>
          </Row>
          <Row on={beat >= 3}>
            <div className="flex justify-center">
              <Arrow dir="right" label="引き取った3個を後工程へ" tone="brand" />
            </div>
          </Row>
        </div>
        {beat >= 4 && (
          <Note>
            <InlineIcon name="lightbulb" />前工程は<b>引き取られた分しか作らない</b>ので、作りすぎや工程間の在庫が減ります。前工程が作れるだけ作って送り出す「押し出し」とは逆の、<b>後工程からの引っ張り</b>です。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ リーン生産方式
// ---------------------------------------------------------------------------

const MURI = [
  { name: "ムリ", def: "能力を超える負荷", ex: "1人で処理しきれない量を押し付ける計画" },
  { name: "ムラ", def: "作業量・品質のばらつき", ex: "日によって忙しさが違う・人によって出来が違う" },
  { name: "ムダ", def: "付加価値を生まないもの", ex: "作りすぎ・在庫・手待ち・運搬・必要以上の加工" },
];

function LeanPanel() {
  return (
    <Panel>
      <SectionTitle step={4}>リーン生産方式 ― ムリ・ムラ・ムダをなくす</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        JITなどの考え方を体系にしたのが<b className="text-gray-800">リーン生産方式</b>（リーン＝ぜい肉のない）。3つの「ム」をなくして効率を高めます。
      </p>
      <div className="mt-3 space-y-2" data-testid="pm-lean">
        {MURI.map((m) => (
          <div key={m.name} className={`flex items-stretch gap-2 rounded-xl p-2 ring-1 ${m.name === "ムダ" ? "bg-brand-50 ring-brand-200" : "bg-gray-50 ring-gray-200"}`}>
            <span className={`grid w-14 flex-none place-items-center rounded-lg text-base font-bold ${m.name === "ムダ" ? "bg-brand-600 text-white" : "bg-white text-gray-800 ring-1 ring-gray-300"}`}>{m.name}</span>
            <div>
              <div className="text-[13px] font-bold text-gray-800">{m.def}</div>
              <div className="text-[12px] text-gray-500">例：{m.ex}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        <InlineIcon name="lightbulb" />試験では「ムダに当たるもの」がよく問われます。<b className="text-gray-800">付加価値を生まない</b>（待つ・運ぶ・作りすぎる）ものがムダです。
      </p>
    </Panel>
  );
}
