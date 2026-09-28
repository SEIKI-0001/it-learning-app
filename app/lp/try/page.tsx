import type { Metadata } from "next";
import LogicOperationsExperience from "@/components/experiences/LogicOperationsExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

const TITLE = "AND・ORをスイッチで体験｜登録不要・無料｜資格もちっと";
const DESCRIPTION = "ANDとORの違いを、スイッチと光る回路で体験。ITパスポートの教材を登録なしで体験できます。スマホ対応・インストール不要。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://shikaku-mochit.com/lp/try" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://shikaku-mochit.com/lp/try",
    type: "website",
    locale: "ja_JP",
    images: [{ url: "https://shikaku-mochit.com/og/lp.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function TrialPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <a href="/lp" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4">
          資格もちっと · ITパスポート学習コーチ
        </a>
        <header className="mb-6 mt-4">
          <p className="text-sm font-bold text-brand-700">登録不要・無料の教材体験</p>
          <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">ANDとOR、<br />スイッチで違いを見てみよう。</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">アプリの教材を、そのままお試し。まずは入力Bをタップして「1」に。出力ランプが光ったら、Aを「0」にしてみましょう。</p>
        </header>

        <ExperienceSlideDeck><LogicOperationsExperience /></ExperienceSlideDeck>

        <section aria-labelledby="start-learning" className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
          <h2 id="start-learning" className="text-xl font-bold">こんなふうに、ほかのテーマも。</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">SQLやネットワークなどの教材と公式過去問も、無料で学習できます。GoogleまたはLINEで登録すると、自分の試験日に合わせた学習を始められます。</p>
          <a href="/login?next=/onboarding" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-center font-bold text-white transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
            無料登録して学習を始める
          </a>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">クレジットカード不要。この体験の操作は学習記録に保存されません。登録後の学習記録の保存は最初の7日間無料です。以降も教材と公式過去問は無料で使えます。</p>
          <a href="/lp#price" className="mt-3 inline-flex min-h-11 items-center text-sm text-brand-700 underline underline-offset-4">無料で使える範囲と料金を見る</a>
        </section>
        <footer className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
          <a className="inline-flex min-h-11 items-center underline" href="/privacy">プライバシーポリシー</a>
          <a className="inline-flex min-h-11 items-center underline" href="/legal/tokusho">特定商取引法に基づく表示</a>
        </footer>
      </div>
    </main>
  );
}
