"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// データベースとSQLの解説で、過去問の出題に合わせて足した4枚。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえ、例の表は過去問と別にしている。
//   ⑤ 関係データベースの部品（表・レコード・フィールド）と、3つの操作（選択・射影・結合）
//   ⑥ 主キーの決まりと、DBMSの言葉（インデックス・レプリケーション など）
//   ⑦ あいまい検索：% と _ をあてはめる
//   ⑧ どれ？ クイズ
// 主キー・外部キーそのものの体験は「DBMS・主キー・外部キー」（KeysExperience）にあるので、ここは試験の論点だけ。

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-gray-600 [&_b]:font-bold [&_b]:text-gray-800">{children}</p>;
}

function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
  );
}

// 小さな表。hiRows / hiCols で選ばれた行・列を色付けする
function MiniGrid({
  cols,
  rows,
  hiRows = [],
  hiCols = [],
  testId,
}: {
  cols: string[];
  rows: string[][];
  hiRows?: number[];
  hiCols?: number[];
  testId?: string;
}) {
  return (
    <table className="w-full table-fixed border-collapse text-center text-[11px]" data-testid={testId}>
      <thead>
        <tr>
          {cols.map((c, ci) => (
            <th key={c} className={`border border-gray-200 px-0.5 py-0.5 font-bold ${hiCols.includes(ci) ? "bg-sky-100 text-sky-900" : "bg-gray-50 text-gray-600"}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri}>
            {r.map((v, ci) => {
              const on = hiRows.includes(ri) || hiCols.includes(ci);
              return (
                <td key={ci} className={`border border-gray-200 px-0.5 py-0.5 ${on ? "bg-amber-100 font-bold text-gray-900" : "text-gray-500"}`}>
                  {v}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ⑤ 部品と3つの操作 ---------------------------------------------------------------------
const MEMBER_COLS = ["会員番号", "氏名", "店舗"];
const MEMBERS = [
  ["M1", "青木", "S1"],
  ["M2", "井上", "S2"],
  ["M3", "上田", "S1"],
];

export function RelationalOpsPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>関係データベースの部品と、3つの操作</SectionTitle>
      <Lead>
        データを<b>行と列からなる表</b>で表すのが<b>関係モデル</b>（関係データベース）。
        <b>表</b>の中の1行が<b>レコード</b>、1列（項目）が<b>フィールド</b>です。
      </Lead>
      <p className="mt-2 text-center text-[12.5px] font-bold text-gray-800" data-testid="rdb-parts">
        表 ⊃ レコード（行）⊃ フィールド（列）の値
      </p>

      <div className="mt-3 space-y-2.5" data-testid="rdb-ops">
        <div data-op="選択">
          <p className="text-[13px] font-bold text-gray-900">
            選択 <span className="font-medium text-gray-600">… 条件を満たす<b className="text-gray-900">行</b>を抜き出す（店舗＝S1）</span>
          </p>
          <div className="mt-1">
            <MiniGrid cols={MEMBER_COLS} rows={MEMBERS} hiRows={[0, 2]} />
          </div>
        </div>
        <div data-op="射影">
          <p className="text-[13px] font-bold text-gray-900">
            射影 <span className="font-medium text-gray-600">… 特定の<b className="text-gray-900">列</b>だけを抜き出す（氏名の列）</span>
          </p>
          <div className="mt-1">
            <MiniGrid cols={MEMBER_COLS} rows={MEMBERS} hiCols={[1]} />
          </div>
        </div>
        <div data-op="結合">
          <p className="text-[13px] font-bold text-gray-900">
            結合 <span className="font-medium text-gray-600">… 2つの表を、フィールドの値で<b className="text-gray-900">関連付けて</b>1つの表にする</span>
          </p>
          <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-[11px]">
            <MiniGrid cols={["氏名", "店舗"]} rows={[["青木", "S1"], ["井上", "S2"]]} hiCols={[1]} />
            <span className="font-bold text-gray-500">＋</span>
            <MiniGrid cols={["店舗", "店舗名"]} rows={[["S1", "駅前店"], ["S2", "本町店"]]} hiCols={[0]} />
          </div>
          <p className="mt-1 text-center text-[11.5px] text-gray-700">
            → 店舗の値でつなぐと「青木・駅前店」「井上・本町店」
          </p>
        </div>
      </div>
      <Takeaway>
        「2つの表から<b>同じ値をもつレコード</b>を抜き出す」は結合ではなく<b>共通</b>（積）。
        ほかのモデルに<b>階層モデル</b>（木の形）・<b>ネットワークモデル</b>（網の目）があります。
      </Takeaway>
    </Panel>
  );
}

// ⑥ 主キーとDBMSの言葉 -------------------------------------------------------------------
const PK_RULES: { t: string; ok: boolean }[] = [
  { t: "他のレコードと値が重複しない", ok: true },
  { t: "複数のフィールドを組み合わせて主キーにできる", ok: true },
  { t: "主キーの値は数値でなければならない", ok: false },
  { t: "主キーの列にインデックスは設定できない", ok: false },
];
const DB_TERMS = [
  { t: "インデックス", d: "データの検索を高速にするために、必要に応じて設定する索引" },
  { t: "外部キー", d: "他の表の主キーを参照して、表どうしをつなぐ項目" },
  { t: "レプリケーション", d: "データベースを他のコンピュータに複製し、内容が一致するよう同期させる" },
  { t: "バックアップ", d: "障害に備えて、ある時点のコピーを取っておく（同期はしない）" },
  { t: "ロールバック", d: "トランザクションの更新を取り消し、更新前の状態に戻す" },
];

export function KeyAndDbmsPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>主キーの決まりと、DBMSの言葉</SectionTitle>
      <Lead>
        <b>主キー</b>は、表の中で1件のレコードを<b>確実に見分ける</b>項目。会員表なら会員番号です。
        同姓同名がありうる<b>氏名</b>は主キーになりません。
      </Lead>
      <ul className="mt-2 space-y-1" data-testid="pk-rules">
        {PK_RULES.map((r) => (
          <li key={r.t} className="flex items-start gap-2 text-[12.5px] leading-snug text-gray-800" data-ok={r.ok}>
            <span
              className={`mt-0.5 w-7 flex-none rounded text-center text-[11px] font-bold ${r.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}
            >
              {r.ok ? "○" : "×"}
            </span>
            {r.t}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[12px] leading-snug text-gray-600">
        例：「受講記録」表は会員番号だけでは何度も出てくるので、<b className="text-gray-900">会員番号＋講座コード</b>の2つで主キーにする。
      </p>

      <dl className="mt-3 space-y-1.5" data-testid="dbms-terms">
        {DB_TERMS.map((x) => (
          <div key={x.t} className="grid grid-cols-[6.75rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug" data-term={x.t}>
            <dt className="font-bold text-gray-900">{x.t}</dt>
            <dd className="text-gray-700">{x.d}</dd>
          </div>
        ))}
      </dl>
      <Takeaway>
        データベース設計の<b>データ分析</b>では、必要なデータ項目を洗い出し、<b>項目間の関連を整理</b>します。
      </Takeaway>
    </Panel>
  );
}

// ⑦ あいまい検索 --------------------------------------------------------------------------
const NAMES = ["山田", "田中", "山田花", "田", "前田一郎", "田代美"];
const PATTERNS = ["%田", "田_", "%田_"];

/** SQL の LIKE と同じ：% は0文字以上の任意の文字列、_ は任意の1文字 */
export function likeMatch(value: string, pattern: string): boolean {
  const re = new RegExp(
    "^" +
      [...pattern]
        .map((ch) => (ch === "%" ? ".*" : ch === "_" ? "." : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
        .join("") +
      "$",
    "u",
  );
  return re.test(value);
}

export function LikePanel({ step }: { step: number }) {
  const [pattern, setPattern] = useState(PATTERNS[2]);
  const hits = NAMES.filter((n) => likeMatch(n, pattern));
  return (
    <Panel>
      <SectionTitle step={step}>あいまい検索：% と _ をあてはめる</SectionTitle>
      <Lead>
        氏名の一部だけで探すときは、条件に<b>記号</b>を使います（SQL では LIKE）。
      </Lead>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-center text-[12.5px]">
        <div className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
          <b className="font-mono text-base text-gray-900">%</b>
          <p className="text-gray-700">0文字以上の任意の文字列</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
          <b className="font-mono text-base text-gray-900">_</b>
          <p className="text-gray-700">任意の1文字（ちょうど1文字）</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {PATTERNS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={pattern === p}
            onClick={() => setPattern(p)}
            className={`rounded-lg py-1.5 font-mono text-[14px] font-bold transition active:scale-95 ${pattern === p ? "bg-gray-900 text-white" : "text-gray-700 ring-1 ring-gray-300"}`}
          >
            &apos;{p}&apos;
          </button>
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-1.5" data-testid="like-names" data-pattern={pattern} data-hits={hits.length}>
        {NAMES.map((n) => {
          const hit = hits.includes(n);
          return (
            <li
              key={n}
              data-hit={hit}
              className={`rounded-lg py-1.5 text-center text-[13px] font-bold transition ${hit ? "bg-amber-100 text-gray-900 ring-2 ring-amber-400" : "bg-white text-gray-400 ring-1 ring-gray-200"}`}
            >
              {n}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-center text-[13px] text-gray-800" data-testid="like-count">
        &apos;{pattern}&apos; に該当：<b className="text-gray-900">{hits.length} 名</b>
      </p>
      <Takeaway>
        &apos;%田_&apos; は「田の後ろに<b>ちょうど1文字</b>」。田で終わる山田・田や、後ろが2文字以上の前田一郎・田代美は該当しません。
        %は<b>0文字</b>でもよいので、田中のように田の前に何もなくても該当します。
      </Takeaway>
    </Panel>
  );
}

// ⑧ どれ？ ------------------------------------------------------------------------------
const QUIZ = [
  {
    t: "“商品”表から、価格の列だけを取り出す操作は？",
    ans: "射影",
    opts: ["選択", "射影", "結合"],
    why: "列を取り出す＝射影。行を取り出すのが選択。",
  },
  {
    t: "データベースの内容を別のコンピュータに複製し、同期させる機能は？",
    ans: "レプリケーション",
    opts: ["バックアップ", "レプリケーション", "ロールバック"],
    why: "複製して内容を一致させ続ける＝レプリケーション。",
  },
  {
    t: "検索を高速にするために設定するものは？",
    ans: "インデックス",
    opts: ["インデックス", "外部キー", "スキーマ"],
    why: "本の索引と同じ＝インデックス。スキーマはデータベースの構造の定義。",
  },
  {
    t: "氏名が '_木%' に該当するのは？（_ は任意の1文字、% は0文字以上）",
    ans: "青木花子",
    opts: ["木村", "青木花子", "佐々木"],
    why: "1文字目は何でもよく、2文字目が木、その後は何文字でもよい。木村は1文字目が木、佐々木は3文字目が木。",
  },
];

export function SqlQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>どれ？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="sql-quiz">
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
