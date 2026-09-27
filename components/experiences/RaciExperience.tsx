"use client";

import { Caption, Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「プロジェクトの要員・役割管理とRACI」。表そのものが答えなので静的な図解。
//   ① RACI表：R・A・C・I の意味 ＋ 勤怠システム導入の例で「作業 × 人」の表。どの行にも A はちょうど1つ
//   ② よくない表：A が2人／A がいない（どちらも最終判断者が決まらない）、R は複数でもよい
//   ③ 要員計画：人数だけでなく、スキル・時期・役割をそろえる（ヒストグラム）
//   ④ 試験ポイント

export default function RaciExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        「誰がやるの？」「誰が決めるの？」があいまいだと、プロジェクトは止まります。<b>RACI</b>は、作業ごとに4つの役割を割り当てる表です。
      </Lead>
      <TablePanel />
      <BadPanel />
      <StaffingPanel />
      <PointsPanel
        step={4}
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
// ① RACI表：役割の意味 ＋ 簡単なプロジェクト例
//    （旧①「1つの成果物のまわりに4人」は②の表と内容が重なり、学習目的が伝わりにくかったため統合）
// ---------------------------------------------------------------------------

const ROLES: [string, string, string, string][] = [
  ["R", "Responsible", "実行する人", "実際に作業する。複数いてもよい"],
  ["A", "Accountable", "最終責任を持つ人", "完成を承認し、結果に責任を負う。1作業に1人"],
  ["C", "Consulted", "相談される人", "決める前に意見を聞かれる（双方向）"],
  ["I", "Informed", "報告を受ける人", "決まった後に知らされる（一方向）"],
];

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
      <SectionTitle step={1}>RACI表 ― 作業ごとに4つの役割を割り当てる</SectionTitle>
      <dl className="mt-3 divide-y divide-gray-200 border-y border-gray-200" data-testid="raci-roles">
        {ROLES.map(([r, en, ja, d]) => (
          <div key={r} className="grid grid-cols-[2rem_1fr] items-start gap-x-3 py-2">
            <dt className="pt-0.5">
              <Letter r={r} size="lg" />
            </dt>
            <dd>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[15px] font-bold text-gray-900">{ja}</span>
                <span className="text-xs text-gray-500">{en}</span>
              </div>
              <div className="text-sm text-gray-700">{d}</div>
            </dd>
          </div>
        ))}
      </dl>

      <h4 className="mt-5 text-base font-bold text-gray-900">例：社内の勤怠管理システムを導入するプロジェクト</h4>
      <p className="mt-0.5 text-sm text-gray-600">
        縦に作業、横に人。<b className="text-gray-800">どの行にも A はちょうど1つ</b>です（右端の ✓）。
      </p>
      <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-gray-300" data-testid="raci-table">
        <div className="grid grid-cols-[5.6rem_repeat(5,1fr)_1.4rem] items-center bg-gray-50 py-1.5 text-center text-xs font-bold text-gray-800">
          <span className="pl-1.5 text-left text-gray-600">作業 ＼ 人</span>
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
            <div key={t.task} className="grid grid-cols-[5.6rem_repeat(5,1fr)_1.4rem] items-center border-t border-gray-200 py-1.5 text-center" data-a={aCount}>
              <span className="pl-1.5 text-left text-[13px] font-bold leading-tight text-gray-900">{t.task}</span>
              {t.roles.map((r, i) => (
                <span key={i} className="grid place-items-center">
                  {r ? <Letter r={r} /> : <span className="text-gray-300">―</span>}
                </span>
              ))}
              <span className={`text-[12px] font-bold ${aCount === 1 ? "text-gray-900" : "text-rose-600"}`}>{aCount === 1 ? "✓" : "✕"}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        1行目の読み方：要件定義書は<b className="text-gray-900">SEが作り（R）</b>、<b className="text-gray-900">PMが承認して責任を持ち（A）</b>、業務部門とセキュリティ担当に<b className="text-gray-900">相談し（C）</b>、部長に<b className="text-gray-900">報告する（I）</b>。
        同じ部長でも、リリース判断では A（最終決定）になります。
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
      <SectionTitle step={2}>よくない表を見分ける</SectionTitle>
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
  { name: "テスト", tone: "bg-gray-400", per: [0, 0, 0, 1, 3, 2] },
];

function StaffingPanel() {
  const max = 5;
  return (
    <Panel>
      <SectionTitle step={3}>要員計画 ― 人数だけでは足りない</SectionTitle>
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
