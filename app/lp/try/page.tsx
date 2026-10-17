import type { Metadata } from "next";
import { GUIDE_FACTS } from "@/lib/guide/facts";
import { FREE_RECORDING_DAYS } from "@/lib/billing/constants";
import TrialFlow from "./TrialFlow";

const TITLE = "IPアドレスとDNSを模型で体験｜登録不要・無料｜資格もちっと";
const DESCRIPTION = "URLを入力してからページが表示されるまでを、ネットワークの模型でデータの流れを追って体験。DNSがドメイン名をIPアドレスに変える役割が分かります。ITパスポートの教材を登録なしで体験できます。スマホ対応・インストール不要。";

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
    <main className="min-h-screen bg-slate-50 px-4 pb-24 pt-6 sm:pb-10 text-slate-900 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <a href="/lp" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4">
          資格もちっと · ITパスポート学習コーチ
        </a>
        <header className="mb-6 mt-4">
          <p className="text-sm font-bold text-brand-700">登録不要・無料の教材体験</p>
          <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">IPアドレスとDNS、<br />データの流れで見てみよう。</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">アプリの教材を、そのままお試し。URLを入力してからページが表示されるまでを再生し、途中で「DNSを止める」を押すと何が起きるか、模型で確かめてみましょう。</p>
        </header>

        <TrialFlow
          topics={GUIDE_FACTS.topicCount}
          official={GUIDE_FACTS.officialQuestionCount}
          freeDays={FREE_RECORDING_DAYS}
        />
        <footer className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
          <a className="inline-flex min-h-11 items-center underline" href="/privacy">プライバシーポリシー</a>
          <a className="inline-flex min-h-11 items-center underline" href="/legal/tokusho">特定商取引法に基づく表示</a>
        </footer>
      </div>
    </main>
  );
}
