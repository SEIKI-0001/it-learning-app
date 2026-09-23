"use client";

import type { ReactNode } from "react";
import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「プロジェクトの要員・役割管理とRACI」。表そのものが答えなので静的な図解。
//   ① 1つの成果物（要件定義書）のまわりに R・A・C・I を置き、矢印の向きで関係を見せる
//      R＝作る、A＝承認して最終責任、C＝事前に相談（⇄ 双方向）、I＝結果の報告を受ける（→ 一方向）
//   ② RACI表：作業 × 人。どの行にも A はちょうど1つ
//   ③ よくない表：A が2人／A がいない（どちらも最終判断者が決まらない）、R は複数でもよい
//   ④ 要員計画：人数だけでなく、スキル・時期・役割をそろえる（ヒストグラム）
//   ⑤ 試験ポイント

export default function RaciExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        👥 「誰がやるの？」「誰が決めるの？」があいまいだと、プロジェクトは止まります。<b>RACI</b>は、作業ごとに4つの役割を割り当てる表です。
      </Lead>
      <OneTaskPanel />
      <TablePanel />
      <BadPanel />
      <StaffingPanel />
      <PointsPanel
        step={5}
        points={[
          <>R＝実際に作業する人、A＝完成・承認の<b>最終説明責任者（1人）</b></>,
          <>C＝決める<b>前に相談</b>される（双方向）、I＝決めた<b>後に報告</b>を受ける（一方向）</>,
          <>要員計画＝人数だけでなく<b>スキル・配置時期・役割と責任</b>をそろえる</>,
        ]}
        traps={[
          ["Responsible と Accountable は同じ", "R＝手を動かす人、A＝最終的に責任を負い承認する人"],
          ["全員を A にすれば責任がはっきりする", "A が何人もいると最終判断者があいまいになる。A は1人"],
        ]}
      />
    </div>
  );
}

const ROLE_TONE: Record<string, string> = {
  R: "bg-brand-600 text-white",
  A: "bg-gray-900 text-white",
  C: "bg-brand-100 text-brand-900 ring-1 ring-brand-300",
  I: "bg-white text-gray-600 ring-1 ring-gray-300",
};

function Letter({ r, size = "md" }: { r: string; size?: "md" | "lg" }) {
  return (
    <span className={`inline-grid place-items-center rounded-md font-mono font-bold ${ROLE_TONE[r]} ${size === "lg" ? "h-8 w-8 text-base" : "h-6 w-6 text-[13px]"}`}>
      {r}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ① 1つの成果物で見る
// ---------------------------------------------------------------------------

function Person({ r, who, what }: { r: string; who: string; what: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-white p-1.5 ring-1 ring-gray-200">
      <Letter r={r} size="lg" />
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-gray-800">{who}</div>
        <div className="text-[11px] leading-snug text-gray-500">{what}</div>
      </div>
    </div>
  );
}

function Link({ glyph, label }: { glyph: string; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1 py-0.5 text-[11px] font-bold text-gray-500" aria-hidden>
      <span className="text-base leading-none text-brand-500">{glyph}</span>
      {label}
    </div>
  );
}

function OneTaskPanel() {
  return (
    <Panel>
      <SectionTitle step={1}>1つの成果物で見る ― 要件定義書</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        真ん中の成果物に対して、4人がそれぞれ<b className="text-gray-800">違う向きの矢印</b>でつながっています。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-x-1.5" data-testid="raci-one">
        <Person r="R" who="SE 佐藤・鈴木" what="書く・作る（複数でもOK）" />
        <Person r="A" who="PM 田中" what="承認し、最終責任を負う（1人）" />
        <Link glyph="↓" label="作って提出" />
        <Link glyph="↓" label="承認する" />
        <div className="col-span-2 mx-auto my-0.5 w-44 rounded-xl bg-accent-100 py-2.5 text-center ring-2 ring-accent-400">
          <div className="text-[11px] font-bold text-accent-700">成果物</div>
          <div className="text-sm font-bold text-accent-800">📄 要件定義書</div>
        </div>
        <Link glyph="⇅" label="決める前に相談" />
        <Link glyph="↓" label="決まったら報告" />
        <Person r="C" who="セキュリティ担当" what="専門の意見を出す（双方向）" />
        <Person r="I" who="営業部長" what="結果を知らされる（一方向）" />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px] font-bold" aria-label="頭文字の意味">
        {[
          ["R", "Responsible", "実行"],
          ["A", "Accountable", "説明責任"],
          ["C", "Consulted", "相談"],
          ["I", "Informed", "報告先"],
        ].map(([r, en, ja]) => (
          <div key={r} className="rounded-lg bg-gray-50 px-0.5 py-1 ring-1 ring-gray-200">
            <Letter r={r} />
            <div className="mt-0.5 text-[11px] leading-tight text-gray-500">{en}</div>
            <div className="text-gray-800">{ja}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② RACI表
// ---------------------------------------------------------------------------

const PEOPLE = ["PM", "SE", "業務\n部門", "セキュ\nリティ", "部長"];
const TASKS: { task: string; roles: string[] }[] = [
  { task: "要件定義書", roles: ["A", "R", "C", "C", "I"] },
  { task: "画面デザイン", roles: ["A", "R", "C", "", "I"] },
  { task: "テスト計画", roles: ["A", "R", "I", "C", ""] },
  { task: "本番リリースの判断", roles: ["R", "C", "C", "C", "A"] },
];

function TablePanel() {
  return (
    <Panel>
      <SectionTitle step={2}>RACI表 ― 作業 × 人</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        縦に作業、横に人。<b className="text-gray-800">どの行にも A はちょうど1つ</b>です（右端の ✓）。
      </p>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-200" data-testid="raci-table">
        <div className="grid grid-cols-[5.6rem_repeat(5,1fr)_1.4rem] items-center bg-gray-50 py-1 text-center text-[11px] font-bold text-gray-600">
          <span className="pl-1.5 text-left">作業 ＼ 人</span>
          {PEOPLE.map((p) => (
            <span key={p} className="whitespace-pre-line leading-tight">
              {p}
            </span>
          ))}
          <span>A</span>
        </div>
        {TASKS.map((t) => {
          const aCount = t.roles.filter((r) => r === "A").length;
          return (
            <div key={t.task} className="grid grid-cols-[5.6rem_repeat(5,1fr)_1.4rem] items-center border-t border-gray-100 py-1 text-center" data-a={aCount}>
              <span className="pl-1.5 text-left text-[12px] font-bold leading-tight text-gray-800">{t.task}</span>
              {t.roles.map((r, i) => (
                <span key={i} className="grid place-items-center">
                  {r ? <Letter r={r} /> : <span className="text-gray-300">―</span>}
                </span>
              ))}
              <span className={`text-[12px] font-bold ${aCount === 1 ? "text-emerald-600" : "text-rose-600"}`}>{aCount === 1 ? "✓" : "✕"}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
        💡 同じ人でも作業によって役割は変わります。部長は要件定義書では I（報告を受けるだけ）、リリース判断では A（最終決定）。
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ よくない表
// ---------------------------------------------------------------------------

const CASES: { title: string; roles: string[]; ok: boolean; why: string }[] = [
  { title: "A が2人", roles: ["A", "R", "A", "I"], ok: false, why: "意見が割れたとき、どちらが最終判断するか決まらない" },
  { title: "A がいない", roles: ["R", "R", "C", "I"], ok: false, why: "作る人はいるが、完成を承認して責任を負う人がいない" },
  { title: "R が2人、A は1人", roles: ["A", "R", "R", "I"], ok: true, why: "作業を分担するのは問題なし。最終責任者は1人に決まっている" },
];

function BadPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>よくない表を見分ける</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">4人で「テスト計画書」を作るときの割り当て例です。</p>
      <div className="mt-3 space-y-2" data-testid="raci-bad">
        {CASES.map((c) => (
          <div key={c.title} className={`rounded-xl p-2 ring-1 ${c.ok ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"}`} data-ok={c.ok ? "true" : "false"}>
            <div className="flex items-center gap-2">
              <span className={`text-[13px] font-bold ${c.ok ? "text-emerald-800" : "text-rose-700"}`}>
                {c.ok ? "○" : "✕"} {c.title}
              </span>
              <span className="ml-auto flex gap-1">
                {c.roles.map((r, i) => (
                  <Letter key={i} r={r} />
                ))}
              </span>
            </div>
            <p className={`mt-1 text-[12px] leading-snug ${c.ok ? "text-emerald-900" : "text-rose-800"}`}>{c.why}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 要員計画
// ---------------------------------------------------------------------------

// 月ごとに必要な人数を、スキル別に積み上げる
const MONTHS = ["4月", "5月", "6月", "7月", "8月", "9月"];
const SKILLS: { name: string; tone: string; per: number[] }[] = [
  { name: "設計", tone: "bg-brand-300", per: [2, 2, 1, 0, 0, 0] },
  { name: "プログラミング", tone: "bg-brand-600", per: [0, 1, 4, 4, 2, 0] },
  { name: "テスト", tone: "bg-accent-400", per: [0, 0, 0, 1, 3, 2] },
];

function StaffingPanel() {
  const max = 5;
  return (
    <Panel>
      <SectionTitle step={4}>要員計画 ― 人数だけでは足りない</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「5人必要」だけでは計画になりません。<b className="text-gray-800">どのスキルの人を、いつ、何人</b>入れるかを積み上げます。
      </p>
      <div className="mt-3 flex items-end gap-1.5" data-testid="raci-staffing">
        {MONTHS.map((m, i) => {
          const total = SKILLS.reduce((a, s) => a + s.per[i], 0);
          return (
            <div key={m} className="flex flex-1 flex-col items-center">
              <span className="text-[11px] font-bold tabular-nums text-gray-600">{total}人</span>
              <div className="flex h-28 w-full flex-col-reverse overflow-hidden rounded-md bg-gray-50 ring-1 ring-gray-200">
                {SKILLS.map((s) =>
                  s.per[i] ? <div key={s.name} className={`${s.tone} border-t border-white`} style={{ height: `${(s.per[i] / max) * 100}%` }} /> : null,
                )}
              </div>
              <span className="mt-0.5 text-[11px] font-bold text-gray-600">{m}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-gray-600">
        {SKILLS.map((s) => (
          <span key={s.name} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded-sm ${s.tone}`} />
            {s.name}
          </span>
        ))}
      </div>
      <Caption className="mt-2">計画に入れるもの：必要な人数 ＋ スキル ＋ 配置する時期 ＋ 役割と責任（RACI）</Caption>
    </Panel>
  );
}
