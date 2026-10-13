"use client";

import { Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";

// 「イノベーションとMOT（技術経営）」。用語が多いテーマなので、1枚1テーマの静的な図にする。
//   ① MOT と2種類のイノベーション（プロダクト／プロセス）
//   ② 研究から産業化までの3つの壁（魔の川・死の谷・ダーウィンの海）
//   ③ イノベーター理論とキャズム（普及の釣鐘グラフ）
//   ④ イノベーションのジレンマ（性能×時間のグラフ）
//   ⑤ ハイプサイクル（期待の山と谷）
//   ⑥ 試験ポイント

export default function InnovationExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        すごい技術を発明しても、それだけでは利益になりません。技術を<b>事業の成果につなげる経営</b>が<b>MOT（技術経営）</b>。その途中に待っている壁と、新しい製品が広まるときの法則を見ていきます。
      </Lead>
      <MotPanel />
      <WallsPanel />
      <ChasmPanel />
      <DilemmaPanel />
      <HypePanel />
      <PointsPanel
        step={6}
        points={[
          <>MOT＝<b>技術を製品・サービスや利益につなげる</b>経営の考え方</>,
          <>プロダクトイノベーション＝<b>新しい製品</b>／プロセスイノベーション＝<b>新しい作り方・進め方</b></>,
          <>研究→開発＝<b>魔の川</b>、開発→事業化＝<b>死の谷</b>、事業化→産業化＝<b>ダーウィンの海</b></>,
          <>キャズム＝<b>アーリーアダプター</b>と<b>アーリーマジョリティ</b>の間の溝</>,
          <>イノベーションのジレンマ＝優良企業が<b>既存顧客を大切にするあまり</b>新技術に負ける</>,
        ]}
        traps={[
          ["3つの壁の順番は 死の谷→魔の川→ダーウィンの海", "川（研究の出口）→谷（開発の出口）→海（事業化の後）の順"],
          ["キャズムはイノベーターとアーリーアダプターの間", "アーリーアダプター（約16%まで）とアーリーマジョリティの間"],
          ["プロセスイノベーション＝新製品を出すこと", "新製品はプロダクト。プロセスは作り方・業務の進め方の革新"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① MOT とイノベーションの種類
// ---------------------------------------------------------------------------

function MotPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>MOT と2種類のイノベーション</SectionTitle>
      <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-200">
        <div className="text-[13px] font-bold text-brand-800">MOT（Management of Technology：技術経営）</div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-brand-900">どの技術に投資し、どう製品にして、どう稼ぐかまでを考える経営。研究開発だけで終わらせない。</p>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-gray-600">イノベーション（革新）は、<b className="text-gray-800">何が新しくなるか</b>で2つに分けます。</p>
      <div className="mt-2 grid grid-cols-2 gap-2" data-testid="inv-types">
        <div className="rounded-xl bg-white p-2.5 ring-1 ring-gray-300">
          <div className="text-[13px] font-bold text-gray-900">プロダクト<br />イノベーション</div>
          <div className="mt-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-center text-[12px] font-bold text-gray-700">新しい「製品」</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-gray-600">例：電話・音楽・カメラを1台にしたスマートフォンが登場した</p>
        </div>
        <div className="rounded-xl bg-white p-2.5 ring-1 ring-gray-300">
          <div className="text-[13px] font-bold text-gray-900">プロセス<br />イノベーション</div>
          <div className="mt-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-center text-[12px] font-bold text-gray-700">新しい「作り方」</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-gray-600">例：組立をロボットで自動化し、同じ製品を半分のコストで作れるようにした</p>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 3つの壁
// ---------------------------------------------------------------------------

const STAGES = [
  { name: "研究", out: "新しい原理を見つける" },
  { name: "開発", out: "製品として作れる形にする" },
  { name: "事業化", out: "量産して売り出す" },
  { name: "産業化", out: "競争に勝ち、利益を出し続ける" },
];
const WALLS = [
  { name: "魔の川", why: "研究の成果が製品づくりに進めない" },
  { name: "死の谷", why: "製品はできたが、資金や体制が足りず売り出せない" },
  { name: "ダーウィンの海", why: "売り出したが、ライバルとの競争で生き残れない" },
];

function WallsPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>研究から成功までの3つの壁</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        壁の名前は<b className="text-gray-800">川 → 谷 → 海</b>と、先へ進むほど大きくなると覚えます。
      </p>
      <div className="mt-3" data-testid="inv-walls">
        {STAGES.map((s, i) => (
          <div key={s.name}>
            {i > 0 && (
              <div className="flex items-start gap-2 py-1 pl-4">
                <span className="text-base font-bold leading-5 text-brand-500" aria-hidden>↓</span>
                <div className="rounded-lg bg-sky-50 px-2 py-1 ring-1 ring-sky-200">
                  <div className="text-[13px] font-bold text-sky-900">{WALLS[i - 1].name}</div>
                  <div className="text-[11px] leading-snug text-sky-800">{WALLS[i - 1].why}</div>
                </div>
              </div>
            )}
            <div className="flex items-stretch gap-2">
              <div className="grid w-16 flex-none place-items-center rounded-lg bg-brand-600 py-1.5 text-sm font-bold text-white">{s.name}</div>
              <div className="flex flex-1 items-center rounded-lg bg-white px-2.5 py-1.5 text-[13px] text-gray-700 ring-1 ring-gray-200">{s.out}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ イノベーター理論とキャズム
// ---------------------------------------------------------------------------

const BX0 = 14;
const BW = 272;
const BY0 = 118;
const BH = 92;
const bx = (z: number) => BX0 + ((z + 3) / 6) * BW;
const by = (z: number) => BY0 - Math.exp(-(z * z) / 2) * BH;

function bellArea(a: number, b: number) {
  const pts: string[] = [`${bx(a).toFixed(1)},${BY0}`];
  for (let z = a; z <= b + 1e-9; z += 0.05) pts.push(`${bx(z).toFixed(1)},${by(z).toFixed(1)}`);
  pts.push(`${bx(b).toFixed(1)},${BY0}`);
  return pts.join(" ");
}

// lx: ラベルの中心（狭い区間のラベルが隣と重ならないよう、手で置く）
const ADOPTERS = [
  { name: "イノベーター", pct: "2.5%", from: -3, to: -2, cls: "fill-brand-700", lx: 38 },
  { name: "アーリーアダプター", pct: "13.5%", from: -2, to: -1, cls: "fill-brand-500", lx: 80 },
  { name: "アーリーマジョリティ", pct: "34%", from: -1, to: 0, cls: "fill-brand-300", lx: 127 },
  { name: "レイトマジョリティ", pct: "34%", from: 0, to: 1, cls: "fill-brand-200", lx: 182 },
  { name: "ラガード", pct: "16%", from: 1, to: 3, cls: "fill-brand-100", lx: 240 },
];
const CHASM_GAP = 0.09;

function ChasmPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>イノベーター理論とキャズム</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        新製品を買う人を、<b className="text-gray-800">買うのが早い順</b>に5つのグループに分けます（左ほど早い）。
      </p>
      <svg viewBox="0 0 300 196" className="mx-auto mt-3 w-full max-w-md" role="img" data-testid="inv-chasm" aria-label="イノベーター2.5%、アーリーアダプター13.5%、アーリーマジョリティ34%、レイトマジョリティ34%、ラガード16%。アーリーアダプターとアーリーマジョリティの間にキャズム">
        {ADOPTERS.map((g) => {
          // キャズムの位置（z=-1）で左右の面を少し離して「溝」に見せる
          const a = g.from === -1 ? g.from + CHASM_GAP : g.from;
          const b = g.to === -1 ? g.to - CHASM_GAP : g.to;
          return <polygon key={g.name} points={bellArea(a, b)} className={`${g.cls} stroke-white`} strokeWidth="1" />;
        })}
        <line x1={BX0} x2={BX0 + BW} y1={BY0} y2={BY0} className="stroke-gray-400" />
        {/* キャズム */}
        <path d={`M${bx(-1) - 6} ${by(-1) - 8} L${bx(-1)} ${BY0 + 6} L${bx(-1) + 6} ${by(-1) - 8}`} className="fill-none stroke-rose-500" strokeWidth="1.6" strokeDasharray="3 2" />
        {/* 曲線の左上（まだ低い所）に置いて、山と重ならないようにする */}
        <text x={bx(-1) - 10} y={by(-1) - 22} textAnchor="end" fontSize="12" className="fill-rose-700 font-bold">キャズム</text>
        <text x={bx(-1) - 10} y={by(-1) - 8} textAnchor="end" fontSize="11" className="fill-rose-700">（深い溝）↘</text>
        {/* ラベル（隣どうしは上下の段を変える） */}
        {ADOPTERS.map((g, i) => {
          const y = BY0 + 16 + (i % 2) * 28;
          return (
            <g key={g.name}>
              <text x={g.lx} y={y} textAnchor="middle" fontSize="10" className="fill-gray-800 font-bold">{g.name}</text>
              <text x={g.lx} y={y + 12} textAnchor="middle" fontSize="10" className="fill-gray-500">{g.pct}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[12px] leading-snug">
        <div className="rounded-lg bg-gray-50 px-2 py-1.5 ring-1 ring-gray-200"><b className="text-gray-800">溝の左</b>：新しさに価値を感じて、多少不便でも試す人たち</div>
        <div className="rounded-lg bg-gray-50 px-2 py-1.5 ring-1 ring-gray-200"><b className="text-gray-800">溝の右</b>：みんなが使って安心できるなら買う、慎重な多数派</div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        <InlineIcon name="lightbulb" />買う理由がまったく違うので、ここで普及が止まりやすい。この溝を越えられるかが、新製品が大きく広まるかの分かれ目です。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ イノベーションのジレンマ
// ---------------------------------------------------------------------------

function DilemmaPanel() {
  return (
    <Panel>
      <SectionTitle step={4}>イノベーションのジレンマ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        業界トップの優良企業ほど、新技術に負けてしまうことがある ― その理由をグラフで見ます。
      </p>
      <svg viewBox="0 0 300 184" className="mx-auto mt-3 w-full max-w-md" role="img" data-testid="inv-dilemma" aria-label="既存技術は顧客が求める性能を超えて改良を続け、性能の低い新技術が後から求める性能に届いて市場を奪う">
        <line x1="30" y1="160" x2="290" y2="160" className="stroke-gray-400" />
        <line x1="30" y1="160" x2="30" y2="12" className="stroke-gray-400" />
        <text x="26" y="20" textAnchor="end" fontSize="11" className="fill-gray-500">性能</text>
        <text x="290" y="176" textAnchor="end" fontSize="11" className="fill-gray-500">時間 →</text>
        {/* 顧客が求める性能（帯） */}
        <polygon points="30,118 290,96 290,74 30,96" className="fill-emerald-100" />
        <text x="290" y="70" textAnchor="end" fontSize="11" className="fill-emerald-800 font-bold">多くの顧客が求める性能</text>
        {/* 既存技術 */}
        <path d="M30 100 C 120 82, 200 46, 290 18" className="fill-none stroke-brand-600" strokeWidth="2.4" />
        <text x="38" y="24" fontSize="11" className="fill-brand-700 font-bold">大企業の既存技術</text>
        <text x="38" y="37" fontSize="10.5" className="fill-brand-700">既存顧客のために改良を続ける</text>
        {/* 新技術 */}
        <path d="M110 152 C 170 140, 230 112, 290 82" className="fill-none stroke-accent-600" strokeWidth="2.4" />
        <text x="36" y="128" fontSize="11" className="fill-accent-800 font-bold">新技術</text>
        <text x="36" y="141" fontSize="10.5" className="fill-accent-800">安い・最初は低性能</text>
        {/* 帯に届く点 */}
        <circle cx="263" cy="95" r="5" className="fill-white stroke-rose-500" strokeWidth="2" />
        <line x1="263" y1="100" x2="263" y2="140" className="stroke-rose-400" strokeWidth="1.2" />
        <text x="290" y="152" textAnchor="end" fontSize="11" className="fill-rose-700 font-bold">ここで市場を奪われる</text>
      </svg>
      <ol className="mt-2 space-y-1 text-[13px] leading-relaxed text-gray-700">
        <li>1. 大企業は大切な既存顧客の要望に応え、性能を上げ続ける（やがて性能が過剰に）</li>
        <li>2. 性能の低い新技術は「うちの顧客は欲しがらない」と後回しにされる</li>
        <li>3. 新技術が「十分な性能」に届くと、安さや手軽さで一気に市場を奪う</li>
      </ol>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-500">※ 正しい経営判断を続けた結果として負けるので「ジレンマ（板ばさみ）」と呼びます。</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ⑤ ハイプサイクル
// ---------------------------------------------------------------------------

const PHASES = [
  { x: 28, y: 175, label: "黎明期", anchor: "start" as const },
  { x: 92, y: 14, label: "「過度な期待」のピーク期", anchor: "start" as const },
  { x: 150, y: 150, label: "幻滅期", anchor: "middle" as const },
  { x: 196, y: 104, label: "啓発期", anchor: "end" as const },
  { x: 288, y: 64, label: "生産性の安定期", anchor: "end" as const },
];

function HypePanel() {
  return (
    <Panel>
      <SectionTitle step={5}>ハイプサイクル ― 期待の山と谷</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        新技術への<b className="text-gray-800">世の中の期待</b>は、一度ふくらみすぎてしぼみ、そのあと実力に見合った形で落ち着きます。
      </p>
      <svg viewBox="0 0 300 182" className="mx-auto mt-3 w-full max-w-md" role="img" data-testid="inv-hype" aria-label="黎明期から期待が急上昇してピークを迎え、幻滅期に落ち込み、啓発期を経て生産性の安定期に落ち着く曲線">
        <line x1="24" y1="160" x2="292" y2="160" className="stroke-gray-400" />
        <line x1="24" y1="160" x2="24" y2="8" className="stroke-gray-400" />
        <text x="20" y="18" textAnchor="end" fontSize="11" className="fill-gray-500">期待</text>
        <text x="292" y="172" textAnchor="end" fontSize="11" className="fill-gray-500">時間 →</text>
        <path d="M28 156 C 60 150, 70 26, 90 26 C 112 26, 120 136, 152 136 C 190 136, 210 84, 290 78" className="fill-none stroke-brand-600" strokeWidth="2.4" />
        {PHASES.map((p) => (
          <text key={p.label} x={p.x} y={p.y} textAnchor={p.anchor} fontSize="11" className="fill-gray-800 font-bold">{p.label}</text>
        ))}
      </svg>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
        <InlineIcon name="lightbulb" />「話題になっている技術がいまどの段階か」を見て、導入の時期を判断するのに使います。
      </p>
    </Panel>
  );
}
