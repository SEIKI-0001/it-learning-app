"use client";

import type { ReactNode } from "react";
import { Arrow, Box, Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「株式会社のしくみと組織形態」。関係・構造が本質なので静的な図解だけで見せる（動きは付けない）。
//   ① 所有と経営：株主 → 株主総会 → 取締役会 → 業務執行 の縦の関係図（左帯で「所有／経営」を分ける）
//   ② 会社の目的を示す言葉：経営理念 → ミッション → ビジョン → 経営目標 の積み上げ
//   ③ 4つの組織形態：ミニ組織図を 2×2 で横並び比較
//   ④ 見分ける順番：期間限定？ → 上司が2人？ → 何で分ける？ の判定フロー
//   ⑤ 試験ポイント

export default function CorporationOrganizationExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        🏢 会社の<b>「持ち主」と「動かす人」は別</b>です。まず上から下への関係を見て、そのあと部署の分け方（組織形態）を並べて比べます。
      </Lead>
      <OwnershipPanel />
      <PurposePanel />
      <OrgFormsPanel />
      <OrgDecisionPanel />
      <PointsPanel
        step={5}
        points={[
          <>取締役を<b>選ぶ</b>のは株主総会、経営の重要事項を<b>決めて監督</b>するのは取締役会</>,
          <>所有（株主）と経営（取締役・経営者）を分ける＝<b>所有と経営の分離</b></>,
          <>2つの軸が交差＝<b>マトリックス</b>、目的のための期間限定チーム＝<b>プロジェクト</b></>,
        ]}
        traps={[
          ["株主が日々の業務を直接指揮する", "株主は株主総会で取締役を選ぶ。業務は経営者が執行する"],
          ["取締役会が取締役を選任する", "取締役を選任するのは株主総会"],
          ["マトリックス組織とプロジェクト組織は同じ", "マトリックス＝上司2人の常設組織／プロジェクト＝期間限定チーム"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ① 所有と経営
// ---------------------------------------------------------------------------

function OwnershipPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>所有と経営 ― 誰が誰を選ぶ？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">矢印は「上が下を選ぶ・任せる」。左の帯が、会社を<b className="text-gray-800">持つ側</b>と<b className="text-gray-800">動かす側</b>です。</p>

      <div className="mt-3 grid grid-cols-[2.25rem_1fr] gap-x-2" data-testid="corp-ownership">
        {/* 所有 */}
        <Band tone="own" rows="row-span-3">所有</Band>
        <Box tone="soft" sub="お金を出した会社の持ち主">👥 株主</Box>
        <Arrow label="集まって議決する" />
        <Box tone="soft" sub="取締役の選任・定款変更など基本事項を決める">株主総会</Box>

        {/* 経営 */}
        <Band tone="run" rows="row-span-5">経営</Band>
        <Arrow tone="brand" label="取締役を選任する" />
        <Box tone="brand" sub="経営の重要事項を決め、執行を監督する">取締役会</Box>
        <div className="flex items-center justify-center gap-5 py-0.5 text-[11px] font-bold text-gray-500" aria-hidden>
          <span><span className="text-base text-brand-500">↓</span> 業務を任せる</span>
          <span><span className="text-base text-brand-500">↑</span> 報告・監督</span>
        </div>
        <Box sub="代表取締役など。方針に沿って事業を動かす">経営者（業務執行）</Box>
        <Arrow label="指示" />

        <div />
        <Box tone="muted" sub="営業・製造・開発…">社員・各部門の日々の業務</Box>
      </div>

      <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[13px] leading-relaxed text-rose-800 ring-1 ring-rose-200">
        ✕ 株主が現場へ直接「こうしろ」と指示する線は<b>ありません</b>。株主が口を出せるのは株主総会での議決（取締役を選ぶなど）です。
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
        💡 持ち主（所有）と、経営のプロ（経営）を分ける＝<b className="text-gray-800">所有と経営の分離</b>。
      </p>
    </Panel>
  );
}

function Band({ children, tone, rows }: { children: ReactNode; tone: "own" | "run"; rows: string }) {
  return (
    <div
      className={`${rows} grid place-items-center rounded-lg text-xs font-bold [writing-mode:vertical-rl] ${
        tone === "own" ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "bg-brand-600 text-white"
      }`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ② 経営理念・ミッション・ビジョン
// ---------------------------------------------------------------------------

const PURPOSE = [
  { name: "経営理念", what: "大切にする根本の考え方", ex: "「地域の毎日においしさを」" },
  { name: "ミッション", what: "社会で果たす使命・存在意義", ex: "「焼きたてを毎朝届ける」" },
  { name: "ビジョン", what: "実現したい将来像", ex: "「5年後、市内で一番通われる店」" },
  { name: "経営目標", what: "数字で測れる到達点", ex: "「来年の売上 1.2倍」" },
];

function PurposePanel() {
  return (
    <Panel>
      <SectionTitle step={2}>会社の「目的」を示す言葉</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">パン屋を例に、<b className="text-gray-800">土台（考え方）から具体（数字）へ</b>積み上げます。</p>
      <div className="mt-3 space-y-1" data-testid="corp-purpose">
        {PURPOSE.map((p, i) => (
          <div key={p.name} className="flex items-stretch gap-2">
            <div
              className={`grid w-24 flex-none place-items-center rounded-lg px-1 py-2 text-[13px] font-bold ${
                i === 0 ? "bg-brand-700 text-white" : i === 1 ? "bg-brand-500 text-white" : i === 2 ? "bg-brand-200 text-brand-900" : "bg-gray-100 text-gray-700"
              }`}
            >
              {p.name}
            </div>
            <div className="flex-1 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-gray-200">
              <div className="text-[13px] font-bold text-gray-800">{p.what}</div>
              <div className="text-[12px] text-gray-500">例：{p.ex}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between px-1 text-[11px] font-bold text-gray-400" aria-hidden>
        <span>↑ 変わりにくい・抽象的</span>
        <span>具体的・数字 ↓</span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-600">💡 「使命・存在意義」なら<b className="text-gray-800">ミッション</b>、「将来こうなりたい姿」なら<b className="text-gray-800">ビジョン</b>。</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ 4つの組織形態（ミニ組織図）
// ---------------------------------------------------------------------------

function Top({ children = "社長" }: { children?: ReactNode }) {
  return <div className="mx-auto w-14 rounded bg-gray-800 py-0.5 text-center text-[11px] font-bold text-white">{children}</div>;
}

function Stem() {
  return <div className="mx-auto h-2 w-px bg-gray-400" aria-hidden />;
}

function Unit({ children, tone = "plain", className = "" }: { children: ReactNode; tone?: "plain" | "func" | "biz" | "pj"; className?: string }) {
  const t =
    tone === "func"
      ? "bg-brand-100 text-brand-900"
      : tone === "biz"
        ? "bg-accent-100 text-accent-800"
        : tone === "pj"
          ? "bg-emerald-100 text-emerald-900"
          : "bg-white text-gray-700 ring-1 ring-gray-300";
  return <div className={`rounded px-0.5 py-0.5 text-center text-[11px] font-bold leading-tight ${t} ${className}`}>{children}</div>;
}

function FunctionalChart() {
  return (
    <div>
      <Top />
      <Stem />
      <div className="grid grid-cols-3 gap-1 border-t border-gray-400 pt-2">
        <Unit tone="func">営業</Unit>
        <Unit tone="func">製造</Unit>
        <Unit tone="func">開発</Unit>
      </div>
    </div>
  );
}

function DivisionalChart() {
  return (
    <div>
      <Top />
      <Stem />
      <div className="grid grid-cols-2 gap-1 border-t border-gray-400 pt-2">
        {["家電", "車載"].map((d) => (
          <div key={d} className="rounded bg-accent-50 p-0.5 ring-1 ring-accent-200">
            <Unit tone="biz">{d}事業部</Unit>
            <div className="mt-0.5 grid grid-cols-3 gap-px text-center text-[11px] font-bold text-gray-600">
              <span>営</span>
              <span>製</span>
              <span>開</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatrixChart() {
  return (
    <div className="grid grid-cols-[2.3rem_1fr_1fr] gap-x-0 gap-y-0 text-[11px]">
      <div />
      <Unit tone="func">営業部</Unit>
      <Unit tone="func">製造部</Unit>
      {["家電", "車載"].map((d) => (
        <div key={d} className="contents">
          <Unit tone="biz">{d}</Unit>
          <Person />
          <Person />
        </div>
      ))}
    </div>
  );
}

function Person() {
  // 縦線（職能の上司から）と横線（事業の上司から）が交わる所に人がいる＝上司が2人
  return (
    <div className="relative grid h-7 place-items-center">
      <span aria-hidden className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-brand-400" />
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-accent-400" />
      <span aria-hidden className="relative grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] ring-1 ring-gray-300">
        👤
      </span>
    </div>
  );
}

function ProjectChart() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-1">
        <Unit>営業</Unit>
        <Unit>設計</Unit>
        <Unit>製造</Unit>
      </div>
      <div className="grid grid-cols-3 text-center text-[11px] leading-none text-emerald-600" aria-hidden>
        <span>↓</span>
        <span>↓</span>
        <span>↓</span>
      </div>
      <div className="rounded border-2 border-dashed border-emerald-400 bg-emerald-50 px-1 py-1 text-center">
        <div className="text-[11px] font-bold text-emerald-900">新製品チーム</div>
        <div className="text-[11px] text-emerald-800">👤👤👤</div>
        <div className="text-[11px] font-bold text-emerald-800">⏳ 終われば解散</div>
      </div>
    </div>
  );
}

const FORMS = [
  { name: "職能別組織", axis: "仕事の種類で分ける", strong: "専門性が高まる", chart: <FunctionalChart /> },
  { name: "事業部制組織", axis: "製品・地域で分ける", strong: "事業ごとに素早く判断・利益責任", chart: <DivisionalChart /> },
  { name: "マトリックス組織", axis: "職能 × 事業の2軸", strong: "上司が2人（指揮系統が2つ）", chart: <MatrixChart /> },
  { name: "プロジェクト組織", axis: "目的ごとに部門横断", strong: "期間限定。終われば解散", chart: <ProjectChart /> },
];

function OrgFormsPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>4つの組織形態を並べる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <span className="rounded bg-brand-100 px-1 font-bold text-brand-900">青＝職能</span>
        {"　"}
        <span className="rounded bg-accent-100 px-1 font-bold text-accent-800">橙＝事業</span>
        {"　"}
        <span className="rounded bg-emerald-100 px-1 font-bold text-emerald-900">緑＝期間限定</span>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="corp-forms">
        {FORMS.map((f) => (
          <div key={f.name} className="flex flex-col rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
            <div className="text-[13px] font-bold text-gray-800">{f.name}</div>
            <div className="text-[11px] font-bold text-brand-700">{f.axis}</div>
            <div className="my-2 flex-1">{f.chart}</div>
            <div className="border-t border-gray-200 pt-1 text-[11px] leading-snug text-gray-600">{f.strong}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        💡 マトリックスの 👤 には<b className="text-gray-800">上（職能）と左（事業）の両方から線</b>が来ています。これが「上司が2人」。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 見分ける順番
// ---------------------------------------------------------------------------

function Question({ children }: { children: ReactNode }) {
  return <div className="rounded-lg bg-white px-2 py-1.5 text-center text-[13px] font-bold text-gray-800 ring-2 ring-brand-300">{children}</div>;
}

function Yes({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex-none text-[11px] font-bold text-emerald-700">はい →</span>
      <Box tone="ok" className="flex-1">
        {children}
      </Box>
    </div>
  );
}

function OrgDecisionPanel() {
  return (
    <Panel>
      <SectionTitle step={4}>問題文から見分ける順番</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">上から順に3つ聞けば、どの形態かが1つに決まります。</p>
      <div className="mt-3 space-y-1.5" data-testid="corp-decision">
        <Question>① 目的のための<b>期間限定</b>チーム？</Question>
        <Yes>プロジェクト組織</Yes>
        <Arrow label="いいえ" />
        <Question>② <b>上司（指揮系統）が2つ</b>ある？</Question>
        <Yes>マトリックス組織</Yes>
        <Arrow label="いいえ" />
        <Question>③ 何で分けている？</Question>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Caption className="mb-0.5 text-center">営業・製造など仕事の種類</Caption>
            <Box tone="ok">職能別組織</Box>
          </div>
          <div>
            <Caption className="mb-0.5 text-center">製品・地域</Caption>
            <Box tone="ok">事業部制組織</Box>
          </div>
        </div>
      </div>
    </Panel>
  );
}
