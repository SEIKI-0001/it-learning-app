import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/blog/it-passport-chatgpt-prompts-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;

export const metadata: Metadata = {
  title: "ITパスポート勉強に使えるChatGPTプロンプト7選｜初心者向け【2026年版】",
  description:
    "ITパスポートの独学にChatGPTを活用するための実践プロンプト7選。用語理解、確認問題、誤答復習、学習計画まで、初心者がそのまま使える例文を紹介します。",
  keywords: [
    "ITパスポート ChatGPT",
    "ITパスポート AI 勉強",
    "ITパスポート プロンプト",
    "ITパスポート 独学",
    "ITパスポート 勉強法",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "ITパスポート勉強に使えるChatGPTプロンプト7選",
    description:
      "用語理解、確認問題、誤答復習、学習計画に使える実践プロンプトを初心者向けに整理。",
    type: "article",
    url: pageUrl,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
    publishedTime: "2026-07-19",
    modifiedTime: "2026-07-19",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート勉強に使えるChatGPTプロンプト7選",
    description: "初心者がそのまま使えるAI学習プロンプトと、使う際の注意点を解説。",
  },
};

const prompts = [
  {
    title: "1. 専門用語を身近な例で理解する",
    purpose: "難しい言葉を丸暗記せず、使われる場面まで理解する",
    prompt:
      "ITパスポート初心者です。『ゼロトラスト』を、会社の日常業務に置き換えた具体例を使って説明してください。最後に、試験で問われやすい要点を3つにまとめてください。",
  },
  {
    title: "2. 似た用語の違いを比較する",
    purpose: "混同しやすい用語を表で整理する",
    prompt:
      "ITパスポート試験向けに『機密性・完全性・可用性』の違いを比較表にしてください。各項目について、意味、具体例、試験での見分け方を初心者向けに説明してください。",
  },
  {
    title: "3. 1問ずつ確認問題を出してもらう",
    purpose: "読んだ直後に理解できているか確認する",
    prompt:
      "ITパスポートの『プロジェクトマネジメント』から四択問題を1問ずつ出してください。私が回答するまで正解を言わず、回答後に正誤、理由、復習すべき用語を説明してください。全5問でお願いします。",
  },
  {
    title: "4. 間違えた理由を分析する",
    purpose: "正解だけでなく、誤答の原因を特定する",
    prompt:
      "次の問題で私はBを選びましたが、正解はDでした。問題文と選択肢を読んで、私が間違えた可能性を『知識不足・用語の混同・問題文の読み違い』に分類し、次に何を復習すべきか教えてください。［ここに問題文を貼る］",
  },
  {
    title: "5. 苦手分野の復習メニューを作る",
    purpose: "限られた時間を弱点に集中させる",
    prompt:
      "ITパスポートの模擬問題で、ストラテジ60%、マネジメント45%、テクノロジ70%でした。平日30分、休日60分使えます。今後7日間の復習メニューを、毎日やる内容と確認方法まで含めて作ってください。",
  },
  {
    title: "6. 自分の言葉で説明できるか確認する",
    purpose: "分かったつもりを減らす",
    prompt:
      "私が『クラウドコンピューティング』を説明します。ITパスポート試験の観点で、正しい点、不足している点、誤解している点を指摘してください。その後、理解を確認する追加質問を1問してください。［ここに自分の説明を書く］",
  },
  {
    title: "7. 試験日から逆算した計画をたたき台にする",
    purpose: "参考書・復習・演習の順番を整理する",
    prompt:
      "ITパスポート試験まで45日です。IT未経験で、平日30分、休日90分勉強できます。参考書、章末問題、用語復習、過去問レベル演習を含む週単位の計画を作ってください。各週の完了条件も示してください。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: "ITパスポート勉強に使えるChatGPTプロンプト7選｜初心者向け【2026年版】",
  description:
    "ITパスポートの独学にChatGPTを活用するための実践プロンプト7選を紹介します。",
  datePublished: "2026-07-19",
  dateModified: "2026-07-19",
  author: { "@type": "Organization", name: "ITパスポート学習コーチ編集部" },
  publisher: { "@type": "Organization", name: "ITパスポート学習コーチ" },
  mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  url: pageUrl,
};

export default function ChatGptPromptsArticle() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/blog" className="font-black text-[#12384d]">ITパスポート学習ガイド</Link>
          <Link href="/onboarding?source=chatgpt-prompts" className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white">無料で学習計画を作る</Link>
        </div>
      </header>

      <article>
        <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <p className="inline-flex rounded-full bg-[#e8f5fb] px-3 py-1 text-xs font-black text-[#1b75a6]">AI学習活用・プロンプトまとめ</p>
            <h1 className="mt-5 text-4xl font-black leading-tight text-[#12384d] sm:text-6xl">ITパスポート勉強に使えるChatGPTプロンプト7選</h1>
            <p className="mt-6 text-lg leading-9 text-slate-700">AIは、答えを聞くだけでなく、用語の理解、確認問題、誤答分析、復習計画に使うと効果を発揮します。ここでは、IT未経験者がそのままコピーして使える形でまとめました。</p>
            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f7fbfe] p-4"><p className="font-black text-[#12384d]">SEOキーワード</p><p className="mt-2 leading-6 text-slate-600">ITパスポート ChatGPT / AI 勉強 / プロンプト</p></div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4"><p className="font-black text-[#12384d]">想定読者</p><p className="mt-2 leading-6 text-slate-600">AIを使いたいが、質問の仕方が分からない独学初心者</p></div>
              <div className="rounded-2xl bg-[#f7fbfe] p-4"><p className="font-black text-[#12384d]">訴求軸</p><p className="mt-2 leading-6 text-slate-600">単発回答ではなく、理解・確認・復習を一つの流れにする</p></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-[24px] border border-[#cfe5f2] bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-black text-[#12384d]">先に知っておきたい使い方</h2>
            <p className="mt-4 leading-8 text-slate-700">質問には、現在の知識レベル、学びたい範囲、回答形式を含めます。AIの回答には誤りが含まれる可能性があるため、試験範囲や重要事項は公式情報・最新版の教材でも確認してください。</p>
            <p className="mt-4 text-sm leading-7 text-slate-600">ChatGPTには、段階的な説明や理解確認を支援する「Study Mode」もあります。利用できる機能はアカウントや画面によって変わる場合があります。</p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl space-y-6 px-4 pb-12 sm:px-6">
          {prompts.map((item) => (
            <section key={item.title} className="rounded-[24px] border border-[#cfe5f2] bg-white p-6 shadow-[0_12px_30px_rgba(22,94,131,0.07)] sm:p-8">
              <h2 className="text-2xl font-black text-[#12384d]">{item.title}</h2>
              <p className="mt-3 font-bold text-[#1b75a6]">目的：{item.purpose}</p>
              <div className="mt-5 rounded-2xl bg-[#f7fbfe] p-5 text-sm leading-7 text-slate-800 sm:text-base">{item.prompt}</div>
            </section>
          ))}
        </section>

        <section className="bg-[#12384d] px-4 py-12 text-white sm:px-6 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-black">AIへの質問だけでは、学習全体は管理しにくい</h2>
            <p className="mt-5 max-w-3xl leading-8 text-[#e6f6fc]">毎回よい質問を作れても、試験日までの進捗、復習の優先順位、確認問題の結果を自分でつなぐ必要があります。it-learning-appは、試験日から逆算した計画と「今日やること」を軸に、理解確認と復習を一つの流れに整理します。</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/onboarding?source=chatgpt-prompts" className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white">無料で自分専用の学習計画を作る</Link>
              <Link href="/it-passport-study-coach" className="inline-flex justify-center rounded-full border border-white/50 px-7 py-4 font-black text-white">AI学習コーチの仕組みを見る</Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h2 className="text-3xl font-black text-[#12384d]">まとめ</h2>
          <p className="mt-5 leading-8 text-slate-700">ChatGPTは、説明を簡単にする、似た用語を比較する、1問ずつ確認する、誤答を分析する用途に向いています。一方、合格まで続けるには、質問の質だけでなく、計画、実行、理解確認、復習を継続的につなぐ仕組みが必要です。</p>
          <div className="mt-8 rounded-[24px] border border-[#f0c56a] bg-[#fff8e8] p-6 sm:p-8">
            <p className="text-xl font-black text-[#7d5200]">今日の学習内容を決めるところから始める</p>
            <p className="mt-3 leading-7 text-slate-700">試験日と使える時間を入力し、it-learning-appで今日の学習メニューを無料作成できます。</p>
            <Link href="/onboarding?source=chatgpt-prompts-bottom" className="mt-5 inline-flex rounded-full bg-[#f7a600] px-6 py-3 font-black text-white">無料で始める</Link>
          </div>
        </section>
      </article>
    </main>
  );
}
