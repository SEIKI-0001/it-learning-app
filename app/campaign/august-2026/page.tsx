import type { Metadata } from "next";
import Link from "next/link";
import August2026Checkout from "@/components/campaign/August2026Checkout";
import { getInternalUserId } from "@/lib/auth/currentUser";
import {
  AUGUST_2026_CAMPAIGN,
  isAugust2026BonusActive,
  isAugust2026BonusOpen,
  parseAugust2026CheckoutResult,
} from "@/lib/campaign/august2026";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pro 6か月 3,480円｜ITパスポート学習コーチ",
  description:
    "ITパスポート学習コーチの6か月Pro買い切りプラン。2026年8月10日まで先着6名に20分の学習計画相談付き。",
};

export default async function CampaignPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkout?: string | string[];
    campaign?: string | string[];
  }>;
}) {
  const [userId, query] = await Promise.all([getInternalUserId(), searchParams]);
  const lineUrl = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL?.trim() || "";
  const bonusActive = isAugust2026BonusActive({
    now: new Date(),
    bonusOpen: isAugust2026BonusOpen(process.env.AUGUST_2026_BONUS_OPEN),
  });
  const checkoutEnabled = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ID_PRO_6M?.trim(),
  );
  const audience = [
    "何をどの順番で勉強すればよいか迷っている",
    "参考書のカタカナ用語で止まった",
    "過去問の正答率だけでは、合格までの距離が分からない",
  ];
  const proFeatures = [
    "学習記録を6か月保存",
    "合格準備度・復習・毎日の学習計画",
    "Claude SonnetによるAI採点を1日10回まで",
    "69トピック、確認問題276問、英略語103語",
  ];
  const steps = [
    "登録",
    "Stripeで決済",
    "Pro反映",
    "LINEで購入時メールアドレスを送信",
    "相談日時を決定",
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-brand-900 px-5 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-bold text-brand-100">
            2026年8月10日 23:59（日本時間）まで・先着6名
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            ITパスポート学習コーチ Pro 6か月
          </h1>
          <p className="mt-5 text-2xl font-bold">3,480円（税込・買い切り）</p>
          <p className="mt-5 max-w-2xl leading-8 text-brand-50">
            参考書で止まった人へ。試験日から逆算した「今日やること」と、
            理解を確かめるAI採点を6か月使えます。
          </p>
          <p className="mt-3 text-sm text-brand-100">自動更新はありません。</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold">こんな方へ</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              {audience.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-bold">6か月Proで使えること</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {proFeatures.map((item) => (
                <li
                  className="rounded-xl bg-white p-4 ring-1 ring-slate-200"
                  key={item}
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-200">
            <h2 className="text-2xl font-bold">先着6名の期間限定特典</h2>
            <p className="mt-3 font-bold">
              20分のオンライン学習計画相談1回＋相談後のLINEフォロー1回
            </p>
            <p className="mt-3 leading-7 text-slate-700">
              本特典は、試験日と生活時間に合わせた学習計画を一緒に作るものです。
              合格を保証するものではありません。
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold">購入から相談まで</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-5">
              {steps.map((step, index) => (
                <li
                  className="rounded-xl bg-white p-3 ring-1 ring-slate-200"
                  key={step}
                >
                  <span className="block text-xs font-bold text-brand-700">
                    STEP {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h2 className="text-2xl font-bold">返金条件</h2>
            <p className="mt-3 leading-7">
              購入日を含む7日以内、かつ20分相談の実施前に公式LINEから
              申し出た場合は全額返金します。
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold">よくある質問</h2>
            <div className="mt-4 space-y-3">
              <details>
                <summary>自動更新されますか？</summary>
                <p>いいえ。6か月の買い切りです。</p>
              </details>
              <details>
                <summary>相談特典はどう受け取りますか？</summary>
                <p>購入後、公式LINEへ購入時メールアドレスを送ってください。</p>
              </details>
              <details>
                <summary>返金できますか？</summary>
                <p>上記の返金条件を満たす場合は全額返金します。</p>
              </details>
              <details>
                <summary>必要な動作環境は？</summary>
                <p>最新版のモダンブラウザとインターネット接続が必要です。</p>
              </details>
            </div>
          </section>
        </div>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <August2026Checkout
            authenticated={Boolean(userId)}
            bonusActive={bonusActive}
            checkoutEnabled={checkoutEnabled}
            lineUrl={lineUrl}
            checkoutResult={parseAugust2026CheckoutResult(query.checkout)}
            campaignPurchase={
              query.campaign === AUGUST_2026_CAMPAIGN.key &&
              query.checkout === "success"
            }
          />
        </aside>
      </div>
      <nav
        className="border-t border-slate-200 px-5 py-8 text-center text-sm"
        aria-label="法務情報"
      >
        <Link className="underline" href="/legal/tokusho">
          特定商取引法に基づく表示
        </Link>
        <span aria-hidden="true"> ・ </span>
        <Link className="underline" href="/privacy">
          プライバシーポリシー
        </Link>
      </nav>
    </main>
  );
}
