"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// e-ビジネスの解説で、過去問の出題に合わせて足した4枚。①取引マップ（Blender製の街）と②仕分けクイズはそのまま残す。
//   ③ お金の集め方と安全な払い方：クラウドファンディング4類型、エスクロー
//   ④ 料金のしくみとネット広告：フリーミアム、サブスクリプション、紛らわしい「フリー○○」、リスティング広告
//   ⑤ 金融×ITのしくみ：フィンテック、オープンAPI、ブロックチェーン
//   ⑥ どれ？ クイズ
// 文言は公式過去問（令和4〜8年度）の言い回しにそろえ、例は過去問と別の場面にしている。

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-gray-600 [&_b]:font-bold [&_b]:text-gray-800">{children}</p>;
}

function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
  );
}

function TermList({ items, testId, col }: { items: { t: string; d: ReactNode }[]; testId: string; col: string }) {
  return (
    <dl className="mt-2 space-y-1.5" data-testid={testId}>
      {items.map((x) => (
        <div key={x.t} className="grid items-baseline gap-2 text-[12.5px] leading-snug" style={{ gridTemplateColumns: `${col} 1fr` }} data-term={x.t}>
          <dt className="font-bold text-gray-900">{x.t}</dt>
          <dd className="text-gray-700">{x.d}</dd>
        </div>
      ))}
    </dl>
  );
}

// ③ お金の集め方と安全な払い方 ------------------------------------------------------------
const CROWD: { t: string; back: string; ex: string }[] = [
  { t: "寄付型", back: "見返りなし", ex: "災害で壊れた商店街の修繕に寄付する" },
  { t: "購入型", back: "商品・サービス", ex: "新しい保温ボトルの開発を応援し、完成品を受け取る" },
  { t: "貸付型", back: "元本＋利息", ex: "お金を貸し、期日に利息を付けて返してもらう" },
  { t: "投資型", back: "配当・株式", ex: "匿名組合契約や株式で出資し、利益の一部を配当で受け取る" },
];

export function FundingEscrowPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>お金の集め方と安全な払い方</SectionTitle>
      <Lead>
        <b>クラウドファンディング</b>は、ネットを通じて多くの人から資金を集めるしくみ。<b>資金提供者が何を受け取るか</b>で4つに分かれます。
      </Lead>
      <table className="mt-2.5 w-full table-fixed border-separate border-spacing-y-1 text-[12px] leading-snug" data-testid="crowdfunding-types">
        <thead>
          <tr className="text-left text-[11px] text-gray-500">
            <th className="w-[4.25rem] font-medium">種類</th>
            <th className="w-[5.5rem] font-medium">受け取るもの</th>
            <th className="font-medium">例</th>
          </tr>
        </thead>
        <tbody>
          {CROWD.map((c) => (
            <tr key={c.t} data-term={c.t}>
              <td className="rounded-l-lg bg-brand-50 py-1.5 pl-2 font-bold text-brand-900">{c.t}</td>
              <td className="bg-brand-50 py-1.5 pr-1 font-bold text-gray-800">{c.back}</td>
              <td className="rounded-r-lg bg-brand-50 py-1.5 pr-2 text-gray-700">{c.ex}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 rounded-xl px-3 py-2.5 ring-1 ring-gray-200" data-testid="escrow">
        <p className="text-[13.5px] font-bold text-gray-900">エスクローサービス</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
          ネットの売買で、<b className="text-gray-900">仲介者が代金をいったん預かり</b>、買い手に商品が届いたことを確かめてから売り手に支払うしくみ。
        </p>
        <div className="mt-2 grid grid-cols-3 items-center gap-1 text-center text-[11.5px] font-bold">
          <span className="rounded-lg bg-slate-50 px-1 py-1.5 text-gray-700 ring-1 ring-slate-200">① 買い手が仲介者に支払う</span>
          <span className="rounded-lg bg-amber-50 px-1 py-1.5 text-amber-900 ring-1 ring-amber-200">② 届いたことを確認</span>
          <span className="rounded-lg bg-slate-50 px-1 py-1.5 text-gray-700 ring-1 ring-slate-200">③ 仲介者が売り手に支払う</span>
        </div>
        <p className="mt-2 text-[12.5px] leading-snug text-gray-700">
          減らせるのは<b className="text-gray-900">「代金を払ったのに商品が届かない」</b>リスク。入力ミスの取消し、パスワード漏えい、自己都合の解約には効きません。
        </p>
      </div>
    </Panel>
  );
}

// ④ 料金のしくみとネット広告 ---------------------------------------------------------------
const FREE_WORDS = [
  { t: "フリーウェア", d: "無料で使えるソフトウェア（改変は許されないこともある）" },
  { t: "フリーライド", d: "費用を負担せずに利益だけ得る、ただ乗り" },
  { t: "フリーランス", d: "組織に属さず、仕事ごとに契約して働く人" },
];

const ADS = [
  { t: "リスティング広告", d: "検索ボックスに入力したキーワードに連動して、検索結果に表示する" },
  { t: "行動ターゲティング広告", d: "閲覧履歴や購買履歴などの行動履歴を基に表示する" },
  { t: "オプトインメール広告", d: "事前に受信を許諾した人にだけ広告メールを送る" },
];

export function PricingAdsPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>料金のしくみとネット広告</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="pricing-models">
        <div className="rounded-xl bg-brand-50 px-2.5 py-2 ring-1 ring-brand-200" data-term="フリーミアム">
          <p className="text-[13.5px] font-bold text-brand-900">フリーミアム</p>
          <p className="mt-0.5 text-[12px] leading-snug text-gray-700">
            <b className="text-gray-900">基本は無料</b>、<b className="text-gray-900">追加の機能やサービスを有料</b>にして利益を上げる
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-gray-500">例：写真の保存は5GBまで無料、容量を増やすと有料</p>
        </div>
        <div className="rounded-xl bg-brand-50 px-2.5 py-2 ring-1 ring-brand-200" data-term="サブスクリプション">
          <p className="text-[13.5px] font-bold text-brand-900">サブスク​リプション</p>
          <p className="mt-0.5 text-[12px] leading-snug text-gray-700">
            <b className="text-gray-900">定額の料金</b>で<b className="text-gray-900">一定の期間</b>利用できる
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-gray-500">例：月額料金で音楽が聴き放題</p>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-gray-600">
        広告収入で無料にしている情報誌は、有料の追加機能がないのでフリーミアムではありません。定額パスで期限内は何杯でも、はサブスクリプションです。
      </p>

      <p className="mt-3 text-[13px] font-bold text-gray-800">紛らわしい「フリー○○」</p>
      <TermList testId="free-words" col="6.25rem" items={FREE_WORDS} />

      <p className="mt-3 text-[13px] font-bold text-gray-800">ネット広告は「何に連動して出すか」</p>
      <TermList testId="ad-types" col="8.5rem" items={ADS} />
    </Panel>
  );
}

// ⑤ 金融×ITのしくみ ----------------------------------------------------------------------
const BLOCKS = ["取引1〜3", "取引4〜6", "取引7〜9"];

export function FintechTechPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>金融×ITのしくみ</SectionTitle>
      <div className="mt-3 rounded-xl px-3 py-2 ring-1 ring-gray-200" data-term="フィンテック">
        <p className="text-[13.5px] font-bold text-gray-900">フィンテック（FinTech）</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
          堅ろうだが柔軟性に欠けた従来の金融システムに、<b className="text-gray-900">インターネット関連技術を取り込み</b>、
          <b className="text-gray-900">ベンチャー企業と組む</b>などして、革新的な金融サービスを提供する潮流。
        </p>
      </div>

      <div className="mt-2.5 rounded-xl px-3 py-2 ring-1 ring-gray-200" data-term="オープンAPI">
        <p className="text-[13.5px] font-bold text-gray-900">オープンAPI</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
          銀行などが<b className="text-gray-900">システムの接続仕様（API）を外部に公開</b>し、
          <b className="text-gray-900">契約を結んだ外部事業者のアクセスを認める</b>取組。
        </p>
        <p className="mt-1 text-[11.5px] leading-snug text-gray-500">例：家計簿アプリが、銀行の口座の入出金を自動で取り込む</p>
      </div>

      <div className="mt-2.5 rounded-xl px-3 py-2 ring-1 ring-gray-200" data-term="ブロックチェーン">
        <p className="text-[13.5px] font-bold text-gray-900">ブロックチェーン</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-gray-700">
          取引の記録をまとめたブロックを<b className="text-gray-900">鎖のようにつなぎ</b>、<b className="text-gray-900">参加者全員で同じ台帳を共有</b>する。
          1か所を書き換えると後ろとつながらなくなるので、<b className="text-gray-900">改ざんや不整合を防げる</b>。
        </p>
        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-bold" aria-hidden>
          {BLOCKS.map((b, i) => (
            <span key={b} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-400">―</span>}
              <span className="rounded-md bg-gray-900 px-2 py-1 text-white">{b}</span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-gray-500">
          例：暗号資産、電子的な社債や証明書の記録。応答を速くする・大量のデータを保存して検索する、はブロックチェーンの目的ではありません。
        </p>
      </div>

      <Takeaway>
        選択肢に並ぶ別物：<b>BPO</b>＝業務の外部委託、<b>RPA</b>＝ソフトウェアのロボットで定型作業を自動化、<b>オムニチャネル</b>＝店舗やネットなど全ての販売経路を統合。
      </Takeaway>
    </Panel>
  );
}

// ⑥ どれ？ ------------------------------------------------------------------------------
const QUIZ = [
  {
    t: "新しい自転車の開発資金を募り、支援してくれた人に完成品を1台ずつ送る。",
    ans: "購入型",
    opts: ["寄付型", "購入型", "投資型"],
    why: "見返りが商品・サービス＝購入型。配当なら投資型、見返りなしなら寄付型。",
  },
  {
    t: "フリマアプリの運営会社が代金を預かり、買い手の受取り評価の後で出品者に支払う。",
    ans: "エスクロー",
    opts: ["エスクロー", "オープンAPI", "サブスク​リプション"],
    why: "仲介者が代金を預かる＝エスクロー。払ったのに届かないリスクを減らす。",
  },
  {
    t: "料理レシピアプリ。閲覧は無料、献立の自動作成は月額の有料会員だけ。",
    ans: "フリーミアム",
    opts: ["フリーウェア", "フリーミアム", "フリーライド"],
    why: "基本は無料、追加機能が有料＝フリーミアム。",
  },
  {
    t: "「キャンプ用品」と検索した人の検索結果に、アウトドア店の広告が出た。",
    ans: "リスティング広告",
    opts: ["リスティング広告", "行動​ターゲティング広告", "オプトイン​メール広告"],
    why: "検索したキーワードに連動＝リスティング広告。",
  },
];

export function EbizQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>どれ？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="ebiz-exam-quiz">
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
