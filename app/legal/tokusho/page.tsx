import type { Metadata } from "next";
import PublicFooter from "@/components/marketing/PublicFooter";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表示｜ITパスポート学習コーチ",
};

const TERMS = [
  ["販売価格", "3,480円（税込）"],
  ["商品以外の必要料金", "インターネット接続料金・通信料金は購入者の負担です。"],
  ["支払方法・時期", "Stripeによるクレジットカード決済。購入時に即時決済されます。"],
  ["提供時期", "決済完了後、Webhookによる反映を経て通常数分以内に提供を開始します。"],
  ["提供期間", "決済完了から6か月。買い切りのため自動更新はありません。"],
  ["キャンペーン特典", "対象期間中の先着購入者へ、20分のオンライン学習計画相談1回と相談後のLINEフォロー1回を提供します。"],
  ["返金条件", "購入日を含む7日以内、かつ20分相談の実施前に公式LINEから申し出た場合は、理由を問わず全額返金します。相談実施後は、サービスの重大な不具合または二重決済を除き返金しません。"],
  ["動作環境", "最新版のSafari、Chrome、Edge等のモダンブラウザとインターネット接続が必要です。"],
  ["販売事業者情報", "販売事業者の氏名（名称）、住所、電話番号は、請求があり次第、これらを記載した書面または電子メールを購入判断に間に合うよう遅滞なく提供します。"],
] as const;

export default function TokushoPage() {
  const lineUrl =
    process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL?.trim() || "";
  return (
    <>
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold text-slate-900">
          特定商取引法に基づく表示
        </h1>
        <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {TERMS.map(([term, value]) => (
            <div className="grid gap-2 py-5 sm:grid-cols-[12rem_1fr]" key={term}>
              <dt className="font-bold text-slate-800">{term}</dt>
              <dd className="leading-7 text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>
        <section className="mt-8 rounded-2xl bg-slate-100 p-5">
          <h2 className="font-bold text-slate-900">事業者情報の開示請求</h2>
          {lineUrl ? (
            <a className="mt-3 inline-block font-bold text-brand-700 underline" href={lineUrl}>
              公式LINEで開示を請求する
            </a>
          ) : (
            <p className="mt-3 text-slate-700">
              公式LINE窓口を準備中です。購入手続きも停止しています。
            </p>
          )}
        </section>
        <p className="mt-8 text-sm leading-7 text-slate-600">
          表示方法は
          <a className="underline" href="https://www.no-trouble.caa.go.jp/qa/advertising.html">
            消費者庁 通信販売広告Q&amp;A
          </a>
          および
          <a className="underline" href="https://www.no-trouble.caa.go.jp/what/mailorder/">
            通信販売のルール
          </a>
          を参照しています。
        </p>
      </main>
      <PublicFooter />
    </>
  );
}
