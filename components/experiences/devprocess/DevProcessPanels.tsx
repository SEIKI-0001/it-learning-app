"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// 開発プロセスの解説で、過去問の出題に合わせて足した5枚。クイズ以外は操作不要の静的な図。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえている。
//   ⑤ 開発モデル4つ（ウォーターフォール・プロトタイピング・スパイラル・アジャイル）と向く場面
//   ⑥ アジャイルの手法：XP とその実践（ペアプログラミング・テスト駆動開発・リファクタリング）、スクラム
//   ⑦ DevOps：開発側と運用側が連携し、自動化ツールで導入・更新を迅速に
//   ⑧ 作ったあとの言葉：リバースエンジニアリング・レビュー、ソフトウェア導入（導入計画書→合意→導入）
//   ⑨ どの言葉？ クイズ

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-gray-600 [&_b]:font-bold [&_b]:text-gray-800">{children}</p>;
}

function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
  );
}

// ⑤ 開発モデル ------------------------------------------------------------------------
const STROKE = "stroke-gray-500";

function WaterfallFig() {
  return (
    <svg viewBox="0 0 80 48" className="h-12 w-20" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={4 + i * 17} y={4 + i * 10} width={16} height={7} rx={1.5} className="fill-sky-200 stroke-sky-500" strokeWidth={1} />
          {i < 3 && <path d={`M${20 + i * 17} ${7.5 + i * 10} h4 v6`} className={STROKE} fill="none" strokeWidth={1.2} />}
        </g>
      ))}
    </svg>
  );
}

function PrototypeFig() {
  return (
    <svg viewBox="0 0 80 48" className="h-12 w-20" aria-hidden>
      <rect x={6} y={8} width={22} height={14} rx={2} className="fill-amber-100 stroke-amber-500" strokeWidth={1} strokeDasharray="2 1.5" />
      <text x={17} y={18} textAnchor="middle" className="fill-amber-800 text-[7px] font-bold">試作</text>
      <circle cx={60} cy={13} r={5} className="fill-gray-200 stroke-gray-500" strokeWidth={1} />
      <path d="M52 28 q8 -8 16 0" className="fill-gray-200 stroke-gray-500" strokeWidth={1} />
      <path d="M30 12 h20" className={STROKE} strokeWidth={1.2} markerEnd="url(#dp-arrow)" />
      <path d="M50 22 q-10 14 -22 0" className={STROKE} fill="none" strokeWidth={1.2} />
      <text x={40} y={44} textAnchor="middle" className="fill-gray-600 text-[6.5px]">見せて直す</text>
      <defs>
        <marker id="dp-arrow" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={5} markerHeight={5} orient="auto">
          <path d="M0 0 L6 3 L0 6z" className="fill-gray-500" />
        </marker>
      </defs>
    </svg>
  );
}

function SpiralFig() {
  return (
    <svg viewBox="0 0 80 48" className="h-12 w-20" aria-hidden>
      <path d="M40 24 h22 M40 24 h-22 M40 24 v20 M40 24 v-20" className="stroke-gray-200" strokeWidth={1} />
      <path
        d="M40 24 m3 0 a3 3 0 0 1 -6 0 a6 6 0 0 1 12 0 a9 9 0 0 1 -18 0 a12 12 0 0 1 24 0 a15 15 0 0 1 -30 0 a18 18 0 0 1 36 0"
        className="stroke-violet-500"
        fill="none"
        strokeWidth={1.3}
      />
    </svg>
  );
}

function AgileFig() {
  return (
    <svg viewBox="0 0 80 48" className="h-12 w-20" aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={14 + i * 26} cy={22} r={10} className="fill-emerald-50 stroke-emerald-500" strokeWidth={1.2} />
          <path d={`M${14 + i * 26} 12 a10 10 0 1 1 -7 3`} className="stroke-emerald-600" fill="none" strokeWidth={1.2} />
          <rect x={10 + i * 26} y={38} width={8} height={6} rx={1} className="fill-emerald-500" />
        </g>
      ))}
    </svg>
  );
}

const MODELS = [
  {
    name: "ウォーターフォール",
    fig: <WaterfallFig />,
    how: "要件を確定してから、工程を上から順に進める",
    fit: "要求事項が明確で、仕様変更が少ない",
  },
  {
    name: "プロトタイピング",
    fig: <PrototypeFig />,
    how: "早い段階で確認用のソフトウェア（試作品）を作り、利用者に見せて要求を確かめる",
    fit: "利用者の要求が目に見えないと固まらない",
  },
  {
    name: "スパイラル",
    fig: <SpiralFig />,
    how: "設計・開発・評価などのサイクルを、渦巻きのように何周もくり返して大きくしていく",
    fit: "大きなシステムを、リスクを見ながら少しずつ",
  },
  {
    name: "アジャイル",
    fig: <AgileFig />,
    how: "機能を小さい単位に分け、優先度の高いものから短期間で開発とリリースをくり返す",
    fit: "変更が多い。例：2週間ごとに新バージョンを出す",
  },
];

export function DevModelsPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>開発モデル4つと、向いている場面</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="dev-models">
        {MODELS.map((m) => (
          <li key={m.name} className="flex gap-2.5 rounded-xl bg-white px-2.5 py-2 ring-1 ring-gray-200" data-model={m.name}>
            <div className="flex-none pt-0.5">{m.fig}</div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-gray-900">{m.name}</p>
              <p className="text-[12.5px] leading-snug text-gray-700">{m.how}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500">向く：{m.fit}</p>
            </div>
          </li>
        ))}
      </ul>
      <Takeaway>
        アジャイルは、ウォーターフォールの<b>課題を改善する</b>形で提唱され、開発工程で生じる<b>種々の変更に迅速に対応</b>できるようにした手法の総称です。
        新機能の候補や不具合を一覧表で管理し、優先順位をつけて逐次リリースするのもアジャイル。
      </Takeaway>
    </Panel>
  );
}

// ⑥ アジャイルの手法 ---------------------------------------------------------------------
const PRACTICES = [
  { t: "ペアプログラミング", d: "1つのプログラムを2人のプログラマが、1台のコンピュータに向かって共同で開発する" },
  { t: "テスト駆動開発", d: "テストプログラムを先に作成し、そのテストに合格するようにコードを書く" },
  { t: "リファクタリング", d: "プログラムの振る舞い（機能仕様）を変えずに、内部構造を改善する" },
];

export function AgileMethodsPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>アジャイルの手法：XPとスクラム</SectionTitle>
      <Lead>
        アジャイルは手法の総称で、代表が <b>XP</b> と <b>スクラム</b>。どちらも短いサイクルでリリースをくり返します。
      </Lead>

      <div className="mt-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200" data-testid="xp-box">
        <p className="text-[14px] font-bold text-emerald-900">XP（エクストリームプログラミング）</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
          要求の変化に対応した高品質のソフトウェアを、短いサイクルでリリースするアジャイル開発のアプローチの一つ。次のような<b>実践</b>を含みます。
        </p>
        <dl className="mt-2 space-y-1.5" data-testid="xp-practices">
          {PRACTICES.map((p) => (
            <div key={p.t} className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-emerald-100" data-term={p.t}>
              <dt className="text-[13px] font-bold text-gray-900">{p.t}</dt>
              <dd className="text-[12px] leading-snug text-gray-700">{p.d}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-2.5 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
        <p className="text-[14px] font-bold text-gray-900">スクラム</p>
        <p className="text-[12.5px] leading-snug text-gray-700">数週間の<b>スプリント</b>ごとに、チームで計画・開発・振り返りをくり返す。</p>
      </div>

      <Takeaway>
        試験では「XPの説明は？」に、ペアプログラミングやテスト駆動開発の説明が誤りとして並びます。それらは<b>XPの中の実践の1つ</b>で、XPそのものの説明ではありません。
      </Takeaway>
    </Panel>
  );
}

// ⑦ DevOps ----------------------------------------------------------------------------
const DEV = ["計画", "開発", "テスト"];
const OPS = ["リリース", "運用", "監視"];

export function DevOpsPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>DevOps：開発と運用が手を組む</SectionTitle>
      <Lead>
        <b>Dev</b>（開発）と<b>Ops</b>（運用）を合わせた言葉。開発側と運用側が<b>密接に連携</b>し、
        <b>自動化ツール</b>を取り入れて、機能の導入や更新を<b>迅速</b>に進めます。
      </Lead>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5" data-testid="devops-loop">
        <div className="rounded-xl bg-sky-50 p-2 ring-1 ring-sky-200">
          <p className="text-center text-[12px] font-bold text-sky-900">開発側（Dev）</p>
          <ol className="mt-1 space-y-1">
            {DEV.map((d) => (
              <li key={d} className="rounded bg-white py-0.5 text-center text-[12px] text-gray-800 ring-1 ring-sky-100">
                {d}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col items-center gap-1 text-[10.5px] font-bold text-gray-600">
          <span className="text-lg leading-none text-gray-900">⇄</span>
          <span className="rounded bg-gray-900 px-1.5 py-0.5 text-white">自動化</span>
          <span>連携</span>
        </div>
        <div className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-200">
          <p className="text-center text-[12px] font-bold text-amber-900">運用側（Ops）</p>
          <ol className="mt-1 space-y-1">
            {OPS.map((d) => (
              <li key={d} className="rounded bg-white py-0.5 text-center text-[12px] text-gray-800 ring-1 ring-amber-100">
                {d}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[12px] text-gray-600">運用で見つけた改善点を、すぐ次の開発へ。この輪を速く回す</p>

      <table className="mt-3 w-full table-fixed border-collapse text-[12px] leading-snug" data-testid="devops-not">
        <colgroup>
          <col />
          <col className="w-[8.5rem]" />
        </colgroup>
        <thead>
          <tr className="text-left text-gray-600">
            <th className="px-1 py-1 font-bold">DevOps と並ぶ誤りの選択肢</th>
            <th className="px-1 py-1 font-bold">本当は</th>
          </tr>
        </thead>
        <tbody className="text-gray-800">
          {[
            ["要件定義で開発側がプロトタイプを作り、画面イメージを確かめる", "プロトタイピング"],
            ["設計・開発・テストを順に行い、全部揃えてから運用側に引き渡す", "ウォーターフォール"],
            ["1つのプログラムを2人で共同開発する", "ペアプログラミング"],
            ["固定された短期間のサイクルをくり返し、機能を順次追加する", "アジャイル"],
          ].map(([a, b]) => (
            <tr key={a} className="border-t border-gray-100 align-top">
              <td className="px-1 py-1">{a}</td>
              <td className="px-1 py-1 font-bold">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// ⑧ 作ったあと：解析・レビュー・導入 ------------------------------------------------------
const AFTER_TERMS = [
  { t: "リバースエンジニアリング", d: "ソースコードなどを解析して、仕様書を作る（仕様を明らかにする）" },
  { t: "リファクタリング", d: "機能仕様を変えずに、内部構造を改善する" },
  { t: "コードレビュー", d: "書いたプログラムを、他の人が読んで誤りを見つける" },
  { t: "デザインレビュー", d: "設計書を、関係者が確認して誤りを見つける" },
];
const INSTALL = ["導入計画書を作る", "関係者の合意を得る", "本番環境に導入（インストール）する"];

export function AfterBuildPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>作ったソフトウェアを読み解く・本番に入れる</SectionTitle>
      <Lead>
        運用中のソフトウェアの<b>仕様書がない</b>とき、ソースコードを解析して仕様書を作るのが<b>リバースエンジニアリング</b>。
        似た名前の言葉と区別します。
      </Lead>
      <dl className="mt-2.5 space-y-1" data-testid="after-terms">
        {AFTER_TERMS.map((x) => (
          <div key={x.t} className="grid grid-cols-[9.75rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug" data-term={x.t}>
            <dt className="font-bold text-gray-900">{x.t}</dt>
            <dd className="text-gray-700">{x.d}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200" data-testid="install-flow">
        <p className="text-[14px] font-bold text-gray-900">ソフトウェア導入</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
          開発が完了したソフトウェアを<b>本番環境にインストールする手順を明確にし、それを実施する</b>工程。順番は必ずこう：
        </p>
        <ol className="mt-2 flex items-stretch gap-1 text-center text-[12px] font-bold text-gray-900">
          {INSTALL.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-1">
              <span className="flex-1 rounded-lg bg-white px-1 py-1.5 leading-snug ring-1 ring-gray-300">
                <span className="block font-mono text-[10px] text-gray-500">{i + 1}</span>
                {s}
              </span>
              {i < INSTALL.length - 1 && <span className="text-gray-400">→</span>}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[12px] leading-snug text-gray-600">
          新規開発でも、自社開発でも、本番稼働中のソフトウェアへの機能追加でも同じ。<b className="text-gray-900">導入してから計画書を作る・合意を後回しにするのは誤り</b>。
        </p>
      </div>
      <Takeaway>
        統合（部品を組み合わせる）・妥当性確認（使う目的に合うか確かめる）・利用者教育は、導入とは別の作業です。
      </Takeaway>
    </Panel>
  );
}

// ⑨ どの言葉？ -------------------------------------------------------------------------
const QUIZ = [
  {
    t: "開発側と運用側が連携し、自動化ツールで新機能の導入や更新を迅速に進める。",
    ans: "DevOps",
    opts: ["DevOps", "スパイラル", "XP"],
    why: "開発（Dev）と運用（Ops）の連携＋自動化＝DevOps。",
  },
  {
    t: "テストプログラムを先に作り、それに合格するようにコードを書く。",
    ans: "テスト駆動開発",
    opts: ["リファクタリング", "テスト駆動開発", "ペア\u200bプログラミング"],
    why: "テストが先＝テスト駆動開発。XPの実践の1つ。",
  },
  {
    t: "仕様書のない運用中のソフトウェアを解析して、仕様書を作った。",
    ans: "リバース\u200bエンジニアリング",
    opts: ["コードレビュー", "リファクタリング", "リバース\u200bエンジニアリング"],
    why: "完成品から仕様を明らかにする＝リバースエンジニアリング。",
  },
  {
    t: "要求事項が明確で、仕様変更が少ないと見込まれる開発に向く。",
    ans: "ウォーター\u200bフォール",
    opts: ["ウォーター\u200bフォール", "アジャイル", "プロトタイピング"],
    why: "最初に決めて順に進められる＝ウォーターフォール。",
  },
  {
    t: "機能追加したソフトウェアを本番に入れる。最初にすることは？",
    ans: "導入計画書の作成",
    opts: ["すぐ導入する", "導入計画書の作成", "導入報告書の作成"],
    why: "導入計画書を作って合意を得てから導入する。",
  },
];

export function DevTermsQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>どの言葉？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="dev-terms-quiz">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={q.t} className="rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
              <div className="text-[13px] font-bold leading-snug text-gray-800">{q.t}</div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {q.opts.map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === q.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === q.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition [word-break:auto-phrase] active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-1.5 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : `正解は「${q.ans}」。 `}
                  {q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
