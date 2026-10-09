"use client";

import { Fragment, useState } from "react";
import { MaintenanceScene, type MaintKind } from "./maintenance/MaintenanceScenes";
import { Panel, SectionTitle } from "./ui";
import { InlineIcon } from "@/components/ui/Pictogram";

// ============================================================================
// 「システムの運用と保守」の体験：〇〇保守の違いを絵で一目で見分ける。
//   ① 2つの質問（いつ？ 何のため？）で4つの保守を2×2に並べた絵の早見表
//   ② どこからが保守？（納入前の手直しは保守ではない＝令和4年度 問47の論点）
//   ③ 場面を読んで振り分けるクイズ
// 分類は JIS X 0161（ISO/IEC 14764）：訂正＝是正・予防、改良＝適応・完全化。
// ============================================================================

const KINDS: Record<
  MaintKind,
  {
    name: string;
    alias?: string;
    short: string;
    tone: string;
    ring: string;
    bg: string;
    example: string;
    clue: string;
  }
> = {
  corrective: {
    name: "是正保守",
    alias: "修正保守",
    short: "壊れた所を直す",
    tone: "text-rose-600",
    ring: "ring-rose-300",
    bg: "bg-rose-50",
    example: "利用者から「請求額の計算がずれる」と連絡があり、原因のプログラムを直した。",
    clue: "障害が起きた・不具合が見つかった",
  },
  preventive: {
    name: "予防保守",
    short: "壊れる前に手を打つ",
    tone: "text-amber-600",
    ring: "ring-amber-300",
    bg: "bg-amber-50",
    example: "まだ障害は出ていないが、月末に処理が重なると止まる不具合（潜在不良）を見つけ、先に直した。",
    clue: "障害が起きる前・潜在的な不良・寿命が近い",
  },
  adaptive: {
    name: "適応保守",
    short: "外の変化に合わせる",
    tone: "text-sky-600",
    ring: "ring-sky-300",
    bg: "bg-sky-50",
    example: "消費税率の変更（法改正）や新しいOSに合わせて、プログラムを変更した。",
    clue: "OS更新・法改正・制度変更など外部環境の変化",
  },
  perfective: {
    name: "完全化保守",
    short: "もっと良くする",
    tone: "text-emerald-600",
    ring: "ring-emerald-300",
    bg: "bg-emerald-50",
    example: "正しく動いてはいるが、画面の表示が遅いので処理を見直して速くした。",
    clue: "性能向上・使いやすさ・保守のしやすさの改善",
  },
};

// 行＝何のため？ 列＝いつ？
const ROWS: { label: string; cells: [MaintKind, MaintKind] }[] = [
  { label: "不具合を直す", cells: ["corrective", "preventive"] },
  { label: "変える・良くする", cells: ["adaptive", "perfective"] },
];

function KindMap() {
  const [sel, setSel] = useState<MaintKind>("corrective");
  const k = KINDS[sel];

  return (
    <Panel>
      <SectionTitle step={1}>4つの保守は「いつ」と「何のため」で分かれる</SectionTitle>

      {/* マトリクス：列＝いつ？ 行＝何のため？（行見出しは左の縦書き） */}
      <div className="mt-3 grid grid-cols-[auto_1fr_1fr] gap-1.5" data-testid="maint-map">
        <span aria-hidden />
        <span className="rounded-lg bg-gray-100 py-1 text-center text-xs font-bold text-gray-700">問題が起きてから</span>
        <span className="rounded-lg bg-gray-100 py-1 text-center text-xs font-bold text-gray-700">起きる前に</span>

        {ROWS.map((row) => (
          <Fragment key={row.label}>
            <span
              className="flex items-center justify-center rounded-lg bg-gray-100 px-1 py-2 text-xs font-bold tracking-wider text-gray-700 [writing-mode:vertical-rl]"
              data-testid="maint-row-label"
            >
              {row.label}
            </span>
            {row.cells.map((kind) => {
              const c = KINDS[kind];
              const on = sel === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setSel(kind)}
                  aria-pressed={on}
                  data-testid={`maint-cell-${kind}`}
                  className={`rounded-xl px-1.5 pb-2 pt-1 text-center transition active:scale-[0.98] ${c.tone} ${
                    on ? `${c.bg} ring-2 ${c.ring}` : "bg-white ring-1 ring-gray-200"
                  }`}
                >
                  <MaintenanceScene kind={kind} />
                  <span className="block text-sm font-bold text-gray-900">{c.name}</span>
                  <span className="block text-[11px] font-bold leading-tight">{c.short}</span>
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${k.bg} ${k.ring}`} aria-live="polite" data-testid="maint-detail">
        <p className="font-bold text-gray-900">
          <span className={k.tone}>{k.name}</span>
          {k.alias && <span className="ml-1 text-xs font-normal text-gray-500">（{k.alias}とも呼ぶ）</span>}
        </p>
        <p className="mt-1 text-gray-700">{k.example}</p>
        <p className="mt-1 text-xs text-gray-500">見分けるキーワード：{k.clue}</p>
      </div>
    </Panel>
  );
}

// どこからが保守？：納入（運用開始）の線より右だけが保守
function ScopeTimeline() {
  const items: { t: string; ok: boolean }[] = [
    { t: "テスト中に見つけたバグの修正", ok: false },
    { t: "障害の修正（是正）", ok: true },
    { t: "潜在不良を先回りで修正（予防）", ok: true },
    { t: "法改正・仕様変更への対応", ok: true },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>どこからが「保守」？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        保守は<b className="text-gray-800">納入して運用が始まった後</b>の手直し。直す理由が障害でも、法改正でも、仕様変更でも保守です。
      </p>

      <div className="mt-3" data-testid="maint-scope">
        <div className="relative flex h-9 overflow-hidden rounded-lg text-xs font-bold">
          <div className="flex w-[34%] items-center justify-center bg-gray-100 text-gray-500">開発</div>
          <div className="flex flex-1 items-center justify-center bg-brand-50 text-brand-700">運用中 ＝ 保守の範囲</div>
          <div className="absolute inset-y-0 left-[34%] w-0.5 bg-gray-800" aria-hidden />
        </div>
        <div className="relative mt-1 h-4 text-[11px] font-bold text-gray-800">
          <span className="absolute left-[34%] -translate-x-1/2 whitespace-nowrap">納入・運用開始</span>
        </div>

        <ul className="mt-2 space-y-1.5">
          {items.map((it) => (
            <li
              key={it.t}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                it.ok ? "ml-[24%] bg-brand-50 text-gray-800" : "mr-[40%] bg-gray-100 text-gray-500"
              }`}
            >
              <span className={`font-bold ${it.ok ? "text-brand-700" : "text-gray-400"}`}>{it.ok ? "✓" : "✕"}</span>
              {it.t}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900 ring-1 ring-rose-200">
        <InlineIcon name="alert" />よくある引っかけ：「納入前の開発中に直したバグも保守」は<b>誤り</b>。
        「障害が起きる前に直すのは保守ではない」も<b>誤り</b>（それが予防保守）。
      </div>
    </Panel>
  );
}

type Ans = MaintKind | "none";
const QUIZ: { t: string; ans: Ans; why: string }[] = [
  { t: "インボイス制度が始まるので、請求書の出力を作り変えた", ans: "adaptive", why: "制度という外部環境の変化に合わせる＝適応保守。" },
  { t: "使用時間から寿命が近いディスクを、故障する前に交換した", ans: "preventive", why: "まだ壊れていないうちに手を打つ＝予防保守。" },
  { t: "問題なく動くが、後で直しやすいようにプログラムを整理した", ans: "perfective", why: "保守のしやすさを高める改良＝完全化保守。" },
  { t: "納入前の結合テストで見つかったバグを直した", ans: "none", why: "保守ではない。まだ開発中で、納入前の修正は保守に含まれません。" },
];
const OPTS: { key: Ans; label: string }[] = [
  { key: "corrective", label: "是正" },
  { key: "preventive", label: "予防" },
  { key: "adaptive", label: "適応" },
  { key: "perfective", label: "完全化" },
  { key: "none", label: "保守外" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, Ans>>({});
  return (
    <Panel>
      <SectionTitle step={3}>どの保守にあたる？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「いつ（起きてから／前に）」と「何のため（直す／変える・良くする）」の順に考えよう。
      </p>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 grid grid-cols-5 gap-1">
                {OPTS.map((opt) => {
                  const picked = chosen === opt.key;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt.key === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt.key === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt.key }))}
                      className={`rounded-lg px-0.5 py-1.5 text-[11px] font-bold leading-tight transition active:scale-95 ${tone}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : "ちがうよ。 "}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function MaintenanceTypesExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        〇〇保守は<b>「いつ直す？」</b>と<b>「何のため？」</b>の2つで見分けます。
        壊れてから直すのが<b>是正</b>、壊れる前が<b>予防</b>、外の変化に合わせるのが<b>適応</b>、もっと良くするのが<b>完全化</b>。
      </div>

      <KindMap />
      <ScopeTimeline />
      <Quiz />
    </div>
  );
}
