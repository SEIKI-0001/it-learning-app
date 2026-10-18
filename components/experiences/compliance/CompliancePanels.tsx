"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// 法務・コンプライアンスの解説で、過去問の出題に合わせて足したパネル群。
// 試験は「この事例はどの法律で問題になるか」「この法律の対象は何か」を問うので、法律ごとに事例で書く。

const Takeaway = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
);

// ② 事例でつかむ法律 ---------------------------------------------------------------------
const LAWS: { law: string; what: string; ng?: string; ok?: string }[] = [
  {
    law: "景品表示法",
    what: "うそや大げさな表示、行き過ぎた景品を規制",
    ng: "広告と分からない形で宣伝記事を載せる（ステルスマーケティング）／国産なのに外国製と思わせるタグを付ける",
    ok: "誰でも応募できるクイズの抽選で賞品を出す（オープン懸賞）は対象外",
  },
  {
    law: "特定電子メール法",
    what: "広告宣伝メールは、原則として受信者の事前の同意（オプトイン）が必要",
    ng: "「拒否されたら止めればよい」と考えて、同意なく広告メールを送る",
    ok: "取引関係のある相手・公表されているアドレスへの広告、事務連絡や請求のメール",
  },
  {
    law: "資金決済法",
    what: "前払式支払手段（先にお金を払う商品券・プリペイドカード）や暗号資産を規定",
    ok: "買い物でおまけにもらうポイントは、前払式支払手段ではない",
  },
  {
    law: "犯罪収益移転防止法（AML）",
    what: "マネーロンダリング（犯罪で得たお金を正当に見せかける）を防ぐ。口座開設時の本人確認・取引目的の確認、疑わしい取引の監視",
  },
  {
    law: "情報公開法",
    what: "国の行政機関が持つ行政文書の公開を、だれでも請求できる（国会・裁判所・民間企業の文書は対象外）",
  },
  {
    law: "官民データ活用推進基本法",
    what: "国・自治体・独立行政法人・大学・事業者などが持つデータ（官民データ）の公開と活用を進める",
  },
];

export function LawCases({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>事例でつかむ、よく出る法律</SectionTitle>
      <dl className="mt-3 space-y-1.5" data-testid="law-cases">
        {LAWS.map((l) => (
          <div key={l.law} className="rounded-lg px-2.5 py-1.5 ring-1 ring-gray-200" data-law={l.law}>
            <dt className="text-[14px] font-bold text-gray-900">{l.law}</dt>
            <dd className="text-[12.5px] leading-snug text-gray-700">
              {l.what}
              {l.ng && <span className="mt-0.5 block text-rose-700">問題になる：{l.ng}</span>}
              {l.ok && <span className="mt-0.5 block text-emerald-800">当たらない：{l.ok}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

// ③ 契約・社内ルール・AIの倫理 --------------------------------------------------------------
export function ContractsAndAi({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>契約・社内ルールと、AIを使うときの注意</SectionTitle>
      <dl className="mt-3 space-y-1.5" data-testid="rules-terms">
        <div className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-term="NDA">
          <dt className="text-[14px] font-bold text-gray-900">NDA（秘密保持契約）</dt>
          <dd className="text-[12.5px] leading-snug text-gray-700">営業秘密などの秘密情報を特定し、相手の秘密情報をきちんと管理することを合意する契約</dd>
        </div>
        <div className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200" data-term="ソーシャルメディアポリシー">
          <dt className="text-[14px] font-bold text-gray-900">ソーシャルメディアポリシー</dt>
          <dd className="text-[12.5px] leading-snug text-gray-700">
            役員・社員が公私を問わずSNSを使うときのルール。会社としてのSNSの心得を、社外の人にも分かるように示す
          </dd>
        </div>
      </dl>
      <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-950 ring-1 ring-amber-200" data-testid="ai-ethics">
        <p className="font-bold">AIを使うときに気をつけること</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>意図しない動きで、人の命や体に危害を与えるおそれ</li>
          <li>判断に差別的な内容が混ざるおそれ</li>
          <li>判断がプライバシーの侵害になるおそれ</li>
        </ul>
      </div>
      <Takeaway>
        コンプライアンスは法律だけでなく、<b>契約</b>（NDA）や<b>社内ルール</b>（SNSポリシー）、<b>倫理</b>（AIの使い方）まで含みます。
      </Takeaway>
    </Panel>
  );
}

// ④ この行為はどの法律？ ---------------------------------------------------------------------
const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "人気サイトが、依頼された商品をほめる記事を、広告と書かずに一般の記事として載せた",
    ans: "景品表示法",
    opts: ["景品表示法", "特定電子メール法", "資金決済法"],
    why: "ステルスマーケティングは景品表示法の不当表示。",
  },
  {
    t: "受信者の同意を取らず、「拒否されたら止める」つもりで広告メールを送った",
    ans: "特定電子メール法",
    opts: ["個人情報保護法", "特定電子メール法", "景品表示法"],
    why: "広告メールは原則オプトイン（事前同意）が必要。",
  },
  {
    t: "全国の店で使える、先にお金を払って買う商品券",
    ans: "資金決済法",
    opts: ["資金決済法", "景品表示法", "情報公開法"],
    why: "前払式支払手段＝資金決済法。",
  },
  {
    t: "口座を開くときに本人確認と取引目的を確かめ、疑わしい取引を監視する",
    ans: "AML",
    opts: ["AML", "インサイダー取引規制", "スキミング"],
    why: "マネーロンダリング対策＝AML（犯罪収益移転防止法）。",
  },
  {
    t: "総務省が作成・保有している文書の公開を請求する",
    ans: "情報公開法",
    opts: ["情報公開法", "官民データ活用推進基本法", "個人情報保護法"],
    why: "行政機関の行政文書＝情報公開法。",
  },
];

export function LawQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>この行為・仕組みは、どの法律？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="law-quiz">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={q.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{q.t}</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
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
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
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
