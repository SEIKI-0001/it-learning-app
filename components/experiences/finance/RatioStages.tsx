"use client";

import { useState } from "react";
import styles from "../calc/calc.module.css";
import { LeveledPractice, Note, Replay, type LeveledQuestion } from "../calc/CalcParts";
import { useBeats } from "../calc/useBeats";
import { Panel, SectionTitle } from "../ui";

// 財務諸表から数字を取り出して指標を計算する。既存の BS/PL（①〜④）の後ろに足す。
//   ⑤ 1年ルール：勘定を1つずつ「1年以内？」で流動／固定へ振り分ける
//   ⑥ 流動比率：ブロックの高さ＝金額。流動資産の中に流動負債が何個入るか → 200%（自己資本比率も同じ形）
//   ⑦ 利益の5段階：売上高から上から順に引き・足して、段階ごとの利益を出す
//   ⑧ 指標の出どころ：BS の数字か PL の数字か
//   ⑨ 確認5問

export const FIN_STEPS = ["① 使う数字を選ぶ", "② 割る／引く", "③ 段階をたどる"];

// ---------------------------------------------------------------------------
// ⑤ 1年ルールで4つに分ける
// ---------------------------------------------------------------------------

type Box = "ca" | "fa" | "cl" | "fl" | "eq";
const BOX: Record<Box, { name: string; tone: string; head: string }> = {
  // 色は「資産＝brand／負債・純資産＝グレー」の2系統だけ。流動・固定は濃淡で分ける
  ca: { name: "流動資産", tone: "bg-brand-100 ring-brand-300", head: "text-brand-900" },
  fa: { name: "固定資産", tone: "bg-brand-50 ring-brand-200", head: "text-brand-900" },
  cl: { name: "流動負債", tone: "bg-gray-100 ring-gray-300", head: "text-gray-900" },
  fl: { name: "固定負債", tone: "bg-gray-50 ring-gray-300", head: "text-gray-900" },
  eq: { name: "純資産", tone: "bg-white ring-gray-400", head: "text-gray-900" },
};
const ITEMS: { name: string; box: Box; why: string }[] = [
  { name: "現金・預金", box: "ca", why: "すぐ使える" },
  { name: "売掛金", box: "ca", why: "1年以内に入金" },
  { name: "商品", box: "ca", why: "1年以内に売れる" },
  { name: "建物", box: "fa", why: "何年も使う" },
  { name: "買掛金", box: "cl", why: "1年以内に支払う" },
  { name: "短期借入金", box: "cl", why: "1年以内に返す" },
  { name: "長期借入金", box: "fl", why: "返すのは1年より先" },
  { name: "資本金", box: "eq", why: "返さなくてよい" },
];
const SPLIT_DELAYS = [900, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1400];

export function BsSplitStage() {
  const { ref, beat: b, reducedMotion, replay } = useBeats(ITEMS.length + 2, SPLIT_DELAYS);
  const placed = Math.min(b, ITEMS.length);
  const current = b >= 1 && b <= ITEMS.length ? ITEMS[b - 1] : null;
  const box = (k: Box) => (
    <div className={`min-h-[64px] rounded-lg p-1.5 ring-1 ${BOX[k].tone}`} data-testid={`fin-split-${k}`}>
      <div className={`text-[11px] font-bold ${BOX[k].head}`}>{BOX[k].name}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {ITEMS.slice(0, placed)
          .filter((it) => it.box === k)
          .map((it) => (
            <span key={it.name} className={`rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-700 ring-1 ring-gray-200 ${styles.pop}`}>
              {it.name}
            </span>
          ))}
      </div>
    </div>
  );
  return (
    <Panel>
      <SectionTitle step={5}>「1年ルール」で流動と固定に分ける</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        BSの資産と負債は、さらに2つに分かれます。決め手は<b className="text-gray-800">1年以内にお金に変わる（払う）かどうか</b>だけです。
      </p>

      <div ref={ref} className="mt-3" data-testid="fin-split" data-beat={b}>
        <div className="grid min-h-[2.2em] place-items-center">
          {current && (
            <p key={current.name} className={`text-center text-sm font-bold text-gray-800 ${styles.reveal}`} data-testid="fin-split-current">
              {current.name} → <span className="text-brand-700">{current.why}</span> → {BOX[current.box].name}
            </p>
          )}
          {b > ITEMS.length && (
            <p className={`text-center text-sm font-bold text-gray-800 ${styles.reveal}`}>8つとも「1年以内か」だけで振り分けられた</p>
          )}
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          <div className="space-y-1.5">
            <div className="text-center text-[10px] font-bold text-gray-500">資産（使い道）</div>
            {box("ca")}
            {box("fa")}
          </div>
          <div className="space-y-1.5">
            <div className="text-center text-[10px] font-bold text-gray-500">負債・純資産（集め方）</div>
            {box("cl")}
            {box("fl")}
            {box("eq")}
          </div>
        </div>
        {b >= ITEMS.length + 1 && (
          <Note>
            💡 <b>流動＝1年以内</b>に現金化できる・支払う。<b>固定＝1年を超える</b>。上の段（流動）どうしを比べると「近いうちの支払いに困らないか」が分かります。
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑥ 流動比率（と自己資本比率）― 2つのブロックを取り出して割る
// ---------------------------------------------------------------------------

const BS = { ca: 3000, fa: 2000, cl: 1500, fl: 1500, eq: 2000 };
const TOTAL = BS.ca + BS.fa;
const PX = 180 / TOTAL; // 金額 → 高さ(px)
const RATIO_DELAYS = [1200, 1500, 1800, 1600, 1600];

function Block({ k, dim, glow }: { k: Box; dim: boolean; glow: boolean }) {
  return (
    <div
      className={`grid place-items-center rounded-md text-center ring-1 transition-all duration-500 ${BOX[k].tone} ${dim ? "opacity-30" : ""} ${glow ? "outline outline-2 outline-offset-1 outline-brand-500" : ""}`}
      style={{ height: BS[k] * PX }}
      data-testid={`fin-ratio-block-${k}`}
      data-glow={glow ? "true" : undefined}
    >
      <div className={`text-[10px] font-bold leading-tight ${BOX[k].head}`}>
        {BOX[k].name}
        <br />
        <span className="tabular-nums">{BS[k].toLocaleString()}</span>
      </div>
    </div>
  );
}

export function RatioStage() {
  const [mode, setMode] = useState<"current" | "equity">("current");
  const { ref, beat: b, reducedMotion, replay } = useBeats(6, RATIO_DELAYS);
  const cur = mode === "current";
  const picked: Box[] = cur ? ["ca", "cl"] : ["eq", "ca", "fa"];
  const glowOn = b >= 1;
  const pick = (m: "current" | "equity") => {
    setMode(m);
    replay();
  };
  return (
    <Panel>
      <SectionTitle step={6}>{cur ? "流動比率 ― 近いうちの支払いに困らない？" : "自己資本比率 ― 自分のお金は何割？"}</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        {(["current", "equity"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            aria-pressed={mode === m}
            className={`rounded-lg px-1 py-1.5 text-xs font-bold transition active:scale-95 ${mode === m ? "bg-brand-600 text-white" : "text-gray-500"}`}
          >
            {m === "current" ? "流動比率" : "自己資本比率"}
          </button>
        ))}
      </div>

      <div ref={ref} className="mt-3" data-testid="fin-ratio" data-mode={mode} data-beat={b}>
        <div className="grid grid-cols-[1fr_1fr_1.1fr] items-end gap-2">
          <div className="space-y-0.5">
            <div className="text-center text-[10px] font-bold text-gray-500">資産</div>
            <Block k="ca" dim={glowOn && !picked.includes("ca")} glow={glowOn && picked.includes("ca")} />
            <Block k="fa" dim={glowOn && !picked.includes("fa")} glow={glowOn && picked.includes("fa")} />
          </div>
          <div className="space-y-0.5">
            <div className="text-center text-[10px] font-bold text-gray-500">負債・純資産</div>
            <Block k="cl" dim={glowOn && !picked.includes("cl")} glow={glowOn && picked.includes("cl")} />
            <Block k="fl" dim={glowOn} glow={false} />
            <Block k="eq" dim={glowOn && !picked.includes("eq")} glow={glowOn && picked.includes("eq")} />
          </div>

          {/* 取り出した2つを並べて比べる */}
          <div className="self-stretch rounded-lg bg-gray-50 p-1.5 ring-1 ring-gray-200" data-testid="fin-ratio-compare">
            <div className="text-center text-[10px] font-bold text-gray-500">取り出して比べる</div>
            {b >= 2 && cur && (
              <div className={`mt-1 flex items-end justify-center gap-1 ${styles.reveal}`}>
                <div className="w-9 rounded bg-brand-200 ring-1 ring-brand-400" style={{ height: BS.ca * PX }} />
                <div className="flex w-9 flex-col-reverse gap-px">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className={`grid place-items-center rounded bg-gray-200 text-[10px] font-bold text-gray-900 ring-1 ring-gray-400 ${styles.pop}`}
                      style={{ height: BS.cl * PX - 1, animationDelay: `${i * 500}ms` }}
                    >
                      {i + 1}個
                    </div>
                  ))}
                </div>
              </div>
            )}
            {b >= 2 && !cur && (
              <div className={`mx-auto mt-1 w-10 overflow-hidden rounded bg-brand-100 ring-1 ring-brand-300 ${styles.reveal}`} style={{ height: TOTAL * PX }}>
                <div className="h-[60%]" />
                <div className={`grid h-[40%] place-items-center bg-gray-700 text-[10px] font-bold text-white ${styles.pop}`}>4割</div>
              </div>
            )}
            {b >= 2 && (
              <p className={`mt-1 text-center text-[10px] font-bold leading-tight text-gray-600 ${styles.reveal}`}>
                {cur ? "流動資産に流動負債が2個入る" : "資産全体のうち純資産は4割"}
              </p>
            )}
          </div>
        </div>

        {b >= 3 && (
          <div className={`mt-3 rounded-xl bg-white px-3 py-2 text-center text-base font-bold ring-1 ring-gray-200 ${styles.reveal}`} data-testid="fin-ratio-eq">
            {cur ? (
              <>
                3,000 ÷ 1,500 × 100 ＝ <span className="text-brand-600">200%</span>
              </>
            ) : (
              <>
                2,000 ÷ 5,000 × 100 ＝ <span className="text-brand-600">40%</span>
              </>
            )}
          </div>
        )}
        {b >= 4 && (
          <p className={`mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-800 ring-1 ring-gray-200 ${styles.reveal}`}>
            {cur ? (
              <>
                <b>なぜ割る？</b> 近いうちに払う<b>1円</b>に対して、近いうちに使える資産を<b>何円</b>持っているかを見たいから。3,000 ÷ 1,500 ＝ 2 → <b>1円の支払いに2円の備え</b>。
              </>
            ) : (
              <>
                <b>なぜ割る？</b> 資産全体（＝負債＋純資産の合計 5,000）のうち、<b>返さなくてよいお金（純資産）がどれだけか</b>を見たいから。高いほど借金に頼っていない。
              </>
            )}
          </p>
        )}
        {b >= 5 && (
          <div className={`mt-3 rounded-xl bg-brand-50 px-3 py-2.5 text-center ring-2 ring-brand-300 ${styles.reveal}`}>
            <div className="text-[11px] font-bold text-brand-700">一般化すると</div>
            <div className="mt-0.5 text-sm font-bold text-gray-800">
              {cur ? "流動比率 ＝ 流動資産 ÷ 流動負債 × 100" : "自己資本比率 ＝ 純資産 ÷ 総資産 × 100"}
            </div>
            <div className="mt-1 text-[11px] text-gray-600">
              {cur
                ? "100%を下回ると、1年以内の支払いに手元の資産が足りないおそれ。固定資産・固定負債は使わない"
                : "負債（1,500＋1,500）を使うと 60% ＝ 借りたお金の割合になり、意味が逆になる"}
            </div>
          </div>
        )}
        <Replay onClick={() => pick(mode)} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑦ 利益の5段階
// ---------------------------------------------------------------------------

type PlStep = { op?: string; item: string; amount: number; profit: string; value: number; meaning: string; detail: string };
export const PL_STEPS: PlStep[] = [
  { op: "−", item: "売上原価 600", amount: 600, profit: "売上総利益", value: 400, meaning: "商品そのもので稼いだ利益（粗利）", detail: "売上から、売った商品の仕入れ・製造にかかった分だけを引く" },
  { op: "−", item: "販売費及び一般管理費 250", amount: 250, profit: "営業利益", value: 150, meaning: "本業で稼いだ利益", detail: "人件費・広告費・家賃など、商売を回す費用まで引く" },
  { op: "＋−", item: "営業外収益 30・営業外費用 20", amount: 10, profit: "経常利益", value: 160, meaning: "本業＋本業以外（利息など）をふくめた、ふだんの利益", detail: "受取利息・支払利息など、毎期ふつうに起きる本業以外の損益を足し引き" },
  { op: "＋−", item: "特別利益 10・特別損失 40", amount: -30, profit: "税引前当期純利益", value: 130, meaning: "臨時の損益までふくめた、税金を払う前の利益", detail: "災害の損失や土地の売却益など、その期だけの出来事を反映" },
  { op: "−", item: "法人税等 50", amount: 50, profit: "当期純利益", value: 80, meaning: "税金を払ったあと、最後に会社に残る利益", detail: "株主への配当や、次の投資の元手になる" },
];
const SALES = 1000;
// 利益の「意味」を最初から全部読めるように、段階表示のアニメーションはしない
export function ProfitStagesStage() {
  return (
    <Panel>
      <SectionTitle step={7}>損益計算書の「5つの利益」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        PL は売上高から<b className="text-gray-800">上から順に引いたり足したり</b>して、途中の利益に名前を付けていきます。
        大事なのは金額より、<b className="text-gray-800">それぞれの利益が何を表すか</b>です。
      </p>

      <div className="mt-3" data-testid="fin-pl">
      <ol>
        <li className="flex items-baseline justify-between border-b border-gray-200 pb-2">
          <span className="text-sm font-bold text-gray-900">売上高</span>
          <span className="text-sm font-bold tabular-nums text-gray-900">{SALES.toLocaleString()}</span>
        </li>
        {PL_STEPS.map((s, i) => (
          <li key={s.profit} className="border-b border-gray-200 py-2.5" data-testid={`fin-pl-${s.profit}`}>
            <p className="text-xs tabular-nums text-gray-500">
              {s.op} {s.item}
            </p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <h4 className="text-base font-bold text-gray-900">
                <span className="mr-1.5 font-mono text-xs text-gray-400">{i + 1}</span>
                {s.profit}
              </h4>
              <span className="text-sm font-bold tabular-nums text-gray-700">{s.value.toLocaleString()}</span>
            </div>
            <p className="mt-0.5 text-[15px] font-bold leading-snug text-brand-800">＝ {s.meaning}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{s.detail}</p>
            {/* 金額の大きさは補助情報。細い線で「売上のうちどれだけ残ったか」だけ示す */}
            <div className="mt-1.5 h-[3px] rounded-full bg-gray-100" aria-hidden>
              <div className="h-full rounded-full bg-gray-400" style={{ width: `${(s.value / SALES) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
      </div>
      <Note>
        順番は<b>売上総利益 → 営業利益 → 経常利益 → 税引前当期純利益 → 当期純利益</b>。空欄がある問題も、この順に式を1本立てれば逆算できます。
      </Note>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑧ 指標の数字は、どの表から？
// ---------------------------------------------------------------------------

const INDICATORS: { name: string; top: [string, "BS" | "PL"]; bottom: [string, "BS" | "PL"]; use: string }[] = [
  { name: "流動比率", top: ["流動資産", "BS"], bottom: ["流動負債", "BS"], use: "短期の支払能力（安全性）" },
  { name: "自己資本比率", top: ["純資産", "BS"], bottom: ["総資産", "BS"], use: "借金に頼っていないか（安全性）" },
  { name: "売上高○○利益率", top: ["各段階の利益", "PL"], bottom: ["売上高", "PL"], use: "売上に対するもうけ（収益性）" },
  { name: "自己資本利益率（ROE）", top: ["当期純利益", "PL"], bottom: ["純資産", "BS"], use: "自分のお金でどれだけ稼いだか" },
  { name: "総資本回転率", top: ["売上高", "PL"], bottom: ["総資本（総資産）", "BS"], use: "資本を効率よく使えているか" },
];

function Src({ s }: { s: "BS" | "PL" }) {
  return <span className={`ml-0.5 rounded px-1 text-[9px] font-bold ${s === "BS" ? "bg-gray-900 text-white" : "bg-brand-100 text-brand-800"}`}>{s}</span>;
}

export function IndicatorSourceStage() {
  const [only, setOnly] = useState<"all" | "PL">("all");
  return (
    <Panel>
      <SectionTitle step={8}>指標の数字は、どの表から取る？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        指標はどれも<b className="text-gray-800">「○○ ÷ △△」</b>。分子と分母が BS と PL のどちらにあるかで、使える資料が決まります。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1">
        {(["all", "PL"] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOnly(o)}
            aria-pressed={only === o}
            className={`rounded-lg px-1 py-1.5 text-xs font-bold transition active:scale-95 ${only === o ? "bg-brand-600 text-white" : "text-gray-500"}`}
          >
            {o === "all" ? "全部の指標" : "PLだけで計算できる？"}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5" data-testid="fin-indicators" data-filter={only}>
        {INDICATORS.map((it) => {
          const ok = it.top[1] === "PL" && it.bottom[1] === "PL";
          const dim = only === "PL" && !ok;
          return (
            <li
              key={it.name}
              className={`rounded-lg px-2.5 py-1.5 ring-1 transition-opacity duration-300 ${dim ? "bg-gray-50 opacity-40 ring-gray-200" : only === "PL" ? "bg-brand-50 ring-brand-300" : "bg-white ring-gray-200"}`}
              data-testid={`fin-ind-${it.name}`}
              data-dim={dim ? "true" : undefined}
            >
              <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                <span>{it.name}</span>
                <span className="text-[10px] font-medium text-gray-500">{it.use}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-gray-700">
                {it.top[0]}
                <Src s={it.top[1]} /> ÷ {it.bottom[0]}
                <Src s={it.bottom[1]} />
              </div>
            </li>
          );
        })}
      </ul>
      <Note>
        💡 <b>PLだけで出せるのは、分子も分母も PL の指標</b>（売上高利益率など）。純資産や総資産が出てきたら BS も必要です。
      </Note>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑨ 確認5問
// ---------------------------------------------------------------------------

export const FIN_QUESTIONS: LeveledQuestion[] = [
  {
    level: "Lv.1 流動比率",
    prompt: "流動資産2,400、固定資産3,000、流動負債1,200、固定負債1,800のとき、流動比率は何%？",
    choices: [
      { label: "200%", ok: true },
      { label: "50%", why: "割る向きが逆です（1,200 ÷ 2,400）。流動資産 ÷ 流動負債。", step: 1 },
      { label: "約133%", why: "固定負債で割っています（2,400 ÷ 1,800）。使うのは流動どうし。", step: 0 },
      { label: "80%", why: "流動資産 ÷ 固定資産 です。比べるのは流動資産と流動負債。", step: 0 },
    ],
    solution: "① 流動資産2,400・流動負債1,200 → ② 2,400 ÷ 1,200 × 100 ＝ 200%",
  },
  {
    level: "Lv.2 自己資本比率",
    prompt: "流動資産600、固定資産400、流動負債300、固定負債400、純資産300のとき、自己資本比率は何%？",
    choices: [
      { label: "30%", ok: true },
      { label: "70%", why: "負債合計（300＋400）で計算しています。それは借りたお金の割合。", step: 0 },
      { label: "50%", why: "純資産 ÷ 流動資産 です。分母は総資産（600＋400＝1,000）。", step: 0 },
      { label: "約43%", why: "純資産 ÷ 固定負債 です。分母は総資産。", step: 0 },
    ],
    solution: "① 純資産300・総資産600＋400＝1,000 → ② 300 ÷ 1,000 × 100 ＝ 30%",
  },
  {
    level: "Lv.3 利益の段階",
    prompt: "売上高900、売上原価500、販売費及び一般管理費250、営業外費用30のとき、営業利益は？",
    choices: [
      { label: "150", ok: true },
      { label: "400", why: "売上総利益（900 − 500）で止まっています。営業利益は販管費も引きます。", step: 2 },
      { label: "120", why: "営業外費用まで引いた経常利益です。営業利益はその1つ手前。", step: 2 },
    ],
    solution: "③ 900 − 500 ＝ 400（売上総利益）→ 400 − 250 ＝ 150（営業利益）",
  },
  {
    level: "Lv.4 本試験レベル（逆算）",
    prompt: "売上高5,000、売上原価3,000、営業外収益100、営業外費用50、特別損失50、法人税等300で、当期純利益は700だった。販売費及び一般管理費はいくらか。",
    choices: [
      { label: "1,000", ok: true },
      { label: "1,300", why: "法人税等300を引き忘れています。当期純利益は税金を引いた後の段階です。", step: 2 },
      { label: "700", why: "当期純利益をそのまま答えています。上から順に式を立て、販管費を X と置きます。", step: 0 },
      { label: "2,000", why: "売上総利益（5,000 − 3,000）です。ここから販管費を引いて、さらに下の段階まで進みます。", step: 2 },
    ],
    solution: "③ 5,000 − 3,000 − X ＋ 100 − 50 − 50 − 300 ＝ 700 → 1,700 − X ＝ 700 → X ＝ 1,000",
  },
  {
    level: "Lv.5 本試験レベル（資料の種類）",
    prompt: "損益計算書だけから計算できる指標はどれか。",
    choices: [
      { label: "売上高営業利益率", ok: true },
      { label: "流動比率", why: "流動資産・流動負債はどちらも BS の数字です。", step: 0 },
      { label: "自己資本利益率", why: "分母の純資産（自己資本）は BS の数字です。", step: 0 },
      { label: "自己資本比率", why: "純資産・総資産はどちらも BS の数字です。", step: 0 },
    ],
    solution: "① 営業利益も売上高も PL の数字 → 売上高営業利益率 ＝ 営業利益 ÷ 売上高",
  },
];

export function FinancePractice() {
  return (
    <LeveledPractice
      step={9}
      title="確認問題：5段階で本試験レベルへ"
      steps={FIN_STEPS}
      questions={FIN_QUESTIONS}
      testId="fin-practice"
      done={
        <>
          🎉 ここまで解ければ、本試験の財務指標の問題に対応できます。<b>使う数字を選ぶ → 割る／引く → 段階をたどる</b>。
        </>
      }
    />
  );
}
