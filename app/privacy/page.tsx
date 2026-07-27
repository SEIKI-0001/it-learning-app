import type { Metadata } from "next";
import PublicFooter from "@/components/marketing/PublicFooter";

export const metadata: Metadata = {
  title: "プライバシーポリシー｜ITパスポート学習コーチ",
};

const SECTIONS = [
  ["取得する情報", "GoogleおよびLINEの識別子・メールアドレス、Stripeの購入情報と支払状況、Supabaseのアカウント情報、学習履歴、問題への回答、AI採点履歴、端末・ブラウザ・アクセス時のリクエスト情報を取得します。"],
  ["利用目的", "本人認証、学習の継続、Pro権限の付与、請求と購入サポート、不正防止と安全管理、サービス改善、問い合わせ対応、キャンペーン特典の提供に利用します。"],
  ["外部サービスへの送信", "認証のためGoogle・LINE・Supabaseへ、決済のためStripeへ、AI採点のため設定済みAI提供者へ、それぞれ処理に必要な範囲の情報を送信します。各社では各社の規約とプライバシーポリシーに従って処理されます。"],
  ["相談特典", "LINEで受け取った購入時メールアドレスは、Stripe上の購入照合と相談特典の提供だけに利用します。"],
  ["保存と安全管理", "情報は利用目的、法令上の保存義務、紛争対応に必要な期間だけ保持し、アクセス制限など合理的な安全管理措置を講じます。不要になった情報は、法令上の保存義務がある場合を除き、削除または匿名化します。"],
  ["開示・訂正・削除・問い合わせ", "公式LINEから請求できます。第三者への誤開示を防ぐため、必要に応じて本人確認を行います。"],
  ["改定", "重要な変更がある場合は、本サービス上で分かりやすく告知します。"],
] as const;

export default function PrivacyPage() {
  const lineUrl =
    process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL?.trim() || "";
  return (
    <>
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold text-slate-900">
          プライバシーポリシー
        </h1>
        <div className="mt-8 space-y-8">
          {SECTIONS.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="text-xl font-bold text-slate-900">{heading}</h2>
              <p className="mt-2 leading-8 text-slate-700">{body}</p>
            </section>
          ))}
        </div>
        {lineUrl && (
          <a className="mt-8 inline-block font-bold text-brand-700 underline" href={lineUrl}>
            公式LINEへ問い合わせる
          </a>
        )}
      </main>
      <PublicFooter />
    </>
  );
}
