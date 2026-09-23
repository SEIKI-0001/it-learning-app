"use client";

import type { ReactNode } from "react";
import { Arrow, Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「エンジニアリングシステム」。暗記ではなく「設計データが工程を流れていく」で覚える。静的な図解のみ。
//   ① 流れ図：CAD（設計）→ CAE（解析、NGなら設計へ戻る）→ CAM（製造）を、CIM（工場全体の統合）の枠が包む
//   ② 最後の1文字で見分ける：D＝Design／E＝Engineering（解析）／M＝Manufacturing／I＝Integrated
//   ③ コンカレントエンジニアリング：順番にやる vs 重ねてやる のガント比較
//   ④ 試験ポイント

export default function EngineeringSystemsExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        ⚙️ 製品づくりでは、<b>1つの設計データ</b>が「設計 → 解析 → 製造」へ受け渡されます。どの工程をコンピュータで支援するかで、名前が変わります。
      </Lead>
      <FlowPanel />
      <LetterPanel />
      <ConcurrentPanel />
      <PointsPanel
        step={4}
        points={[
          <>CAD＝設計、CAE＝試作前の解析（強度・熱など）、CAM＝製造（加工・機械制御）</>,
          <>CIM＝設計から生産管理までの情報をつないで<b>工場全体を統合</b></>,
          <>コンカレントエンジニアリング＝工程を<b>並行</b>して進め、開発期間と手戻りを減らす</>,
        ]}
        traps={[
          ["CAEは製造機械を制御する", "機械の制御データを作るのはCAM。CAEは試作前のシミュレーション"],
          ["コンカレント＝工程をきっちり順番に進める", "設計・製造・調達を早い段階から重ねて進める"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 設計データの流れ
// ---------------------------------------------------------------------------

function Step({ name, what, icon, testId }: { name: string; what: ReactNode; icon: ReactNode; testId?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white p-1.5 ring-1 ring-gray-300" data-testid={testId}>
      <div className="grid w-14 flex-none place-items-center self-stretch rounded-lg bg-brand-600 text-sm font-bold text-white">{name}</div>
      <div className="min-w-0 flex-1 text-[13px] leading-snug text-gray-700">{what}</div>
      <div className="flex-none">{icon}</div>
    </div>
  );
}

function IconSvg({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 48 36" className="h-9 w-12" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

function FlowPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>設計データが工程を流れる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">椅子の脚を作る例。外側の枠が、全体をつなぐ<b className="text-gray-800">CIM</b>です。</p>

      <div className="mt-3 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/60 p-2" data-testid="eng-flow">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="rounded-md bg-brand-700 px-2 py-0.5 text-[13px] font-bold text-white">CIM</span>
          <span className="text-[11px] font-bold text-brand-800">工場全体の情報を統合</span>
        </div>

        <div>
          <div>
            <Step
              name="CAD"
              testId="eng-cad"
              what={<><b>設計</b>：図面・3次元の形をコンピュータで作る</>}
              icon={
                <IconSvg label="図面">
                  <rect x="4" y="4" width="40" height="28" rx="2" className="fill-sky-50 stroke-sky-400" />
                  <path d="M12 26 L12 12 L30 12 L30 26" className="fill-none stroke-sky-700" strokeWidth="1.5" />
                  <path d="M12 9 L30 9 M34 12 L34 26" className="stroke-sky-400" strokeWidth="1" strokeDasharray="2 1.5" />
                </IconSvg>
              }
            />
            <Arrow label="設計データ" tone="brand" />
            <Step
              name="CAE"
              testId="eng-cae"
              what={<><b>解析</b>：<b>試作する前に</b>強度・熱などをシミュレーション</>}
              icon={
                <IconSvg label="強度の解析結果">
                  <defs>
                    <linearGradient id="eng-stress" x1="0" x2="1">
                      <stop offset="0" stopColor="#2f6fdb" />
                      <stop offset="0.55" stopColor="#f2cda6" />
                      <stop offset="1" stopColor="#e11d48" />
                    </linearGradient>
                  </defs>
                  <path d="M6 24 L42 18 L42 24 L6 30 Z" fill="url(#eng-stress)" />
                  <path d="M42 8 L42 16" className="stroke-rose-600" strokeWidth="2" />
                  <path d="M39 13 L42 17 L45 13" className="fill-none stroke-rose-600" strokeWidth="2" />
                </IconSvg>
              }
            />
            <div className="flex items-center justify-between gap-2 py-0.5">
              <Arrow label="OKなら製造へ" tone="brand" />
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">↑ NGならCADに戻して修正</span>
            </div>
            <Step
              name="CAM"
              testId="eng-cam"
              what={<><b>製造</b>：加工手順・工作機械の制御データを作る</>}
              icon={
                <IconSvg label="工作機械で削る">
                  <rect x="18" y="2" width="12" height="14" rx="1" className="fill-gray-400" />
                  <path d="M22 16 L26 16 L24 22 Z" className="fill-gray-700" />
                  <rect x="6" y="24" width="36" height="8" rx="1" className="fill-accent-200 stroke-accent-500" />
                  <path d="M8 22 Q24 18 40 22" className="fill-none stroke-brand-500" strokeWidth="1.2" strokeDasharray="2 2" />
                </IconSvg>
              }
            />
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1">
          {["生産計画", "在庫・資材", "受発注"].map((t) => (
            <div key={t} className="rounded-lg bg-white py-1 text-center text-[12px] font-bold text-gray-700 ring-1 ring-brand-200">
              {t}
            </div>
          ))}
        </div>
        <p className="mt-1 text-center text-[11px] font-bold text-brand-800">↑ 設計・製造の情報とも、ここでつながる</p>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        💡 CAEのおかげで、<b className="text-gray-800">試作品を何度も作って壊さなくても</b>弱い所がわかる。直すなら設計（CAD）へ戻ります。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 最後の1文字で見分ける
// ---------------------------------------------------------------------------

const LETTERS = [
  { pre: "CA", key: "D", post: "", word: "Design", ja: "設計" },
  { pre: "CA", key: "E", post: "", word: "Engineering", ja: "解析（シミュレーション）" },
  { pre: "CA", key: "M", post: "", word: "Manufacturing", ja: "製造" },
  { pre: "C", key: "I", post: "M", word: "Integrated Mfg.", ja: "工場全体の統合" },
];

function LetterPanel() {
  return (
    <Panel>
      <SectionTitle step={2}>最後の1文字で見分ける</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        CA＝Computer Aided（コンピュータで支援する）。<b className="text-gray-800">何を支援するか</b>が最後の文字です。
      </p>
      <div className="mt-3 space-y-1.5" data-testid="eng-letters">
        {LETTERS.map((l) => (
          <div key={l.word} className="flex items-center gap-2 rounded-xl bg-gray-50 px-2 py-1.5 ring-1 ring-gray-200">
            <div className="w-16 flex-none text-center font-mono text-lg font-bold tracking-wide text-gray-400">
              {l.pre}
              <span className="text-brand-600">{l.key}</span>
              {l.post}
            </div>
            <div className="w-[6.2rem] flex-none text-[11px] font-bold text-gray-500">{l.word}</div>
            <div className="flex-1 text-[13px] font-bold text-gray-800">{l.ja}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-500">※ CIMは「I（統合）」が付くのが目印。CAD・CAE・CAMを含めて工場全体をつなぐ、一段大きな仕組みです。</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ コンカレントエンジニアリング
// ---------------------------------------------------------------------------

const TASKS = ["設計", "試作・評価", "製造準備"];
const SERIAL = [
  [0, 33],
  [33, 66],
  [66, 100],
];
const CONCURRENT = [
  [0, 36],
  [16, 52],
  [30, 64],
];

function Gantt({ bars, tone }: { bars: number[][]; tone: "gray" | "brand" }) {
  return (
    <div className="space-y-1">
      {TASKS.map((t, i) => (
        <div key={t} className="flex items-center gap-1.5">
          <div className="w-16 flex-none text-right text-[11px] font-bold text-gray-600">{t}</div>
          <div className="relative h-5 flex-1 rounded bg-gray-50 ring-1 ring-gray-200">
            <div
              className={`absolute inset-y-0 rounded ${tone === "brand" ? "bg-brand-500" : "bg-gray-400"}`}
              style={{ left: `${bars[i][0]}%`, width: `${bars[i][1] - bars[i][0]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConcurrentPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>コンカレントエンジニアリング</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        前の工程が<b className="text-gray-800">終わるのを待たずに</b>、次の工程の担当も早くから参加して並行に進めます。
      </p>
      <div className="mt-3 space-y-3" data-testid="eng-concurrent">
        <div>
          <Caption className="mb-1">順番に進める（シーケンシャル）</Caption>
          <Gantt bars={SERIAL} tone="gray" />
          <p className="mt-1 text-right text-[12px] font-bold text-gray-600">完成まで 12か月</p>
        </div>
        <div>
          <Caption className="mb-1">重ねて進める（コンカレント）</Caption>
          <Gantt bars={CONCURRENT} tone="brand" />
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <span className="text-[12px] font-bold text-brand-700">完成まで 約8か月</span>
            <span className="rounded-full bg-emerald-50 px-1.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">短縮</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        💡 製造の担当が設計の段階から加わるので、「この形は作れない」が<b className="text-gray-800">早く見つかり、手戻りも減る</b>。
      </p>
    </Panel>
  );
}
