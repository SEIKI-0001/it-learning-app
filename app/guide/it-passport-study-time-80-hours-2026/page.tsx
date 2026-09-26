import type { Metadata } from "next";
import Link from "next/link";

const title = "ITパスポートは80時間で合格できる？勉強時間を短縮する学習設計【2026年】";
const description = "ITパスポートは何時間勉強すれば合格できる？100〜180時間という一般的な目安と、合格者データを比較しながら、80時間以内を狙うための問題先行・弱点集中型の学習法を解説します。";
const path = "/guide/it-passport-study-time-80-hours-2026";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["ITパスポート 勉強時間", "ITパスポート 80時間", "ITパスポート 何時間", "ITパスポート 最短", "ITパスポート 勉強法", "ITパスポート AI 学習"],
  alternates: { canonical: path },
  openGraph: { title, description, type: "article", url: path },
  twitter: { card: "summary_large_image", title, description },
};

const cta = (placement: string, label: string) => `/onboarding?source=study-time-80-hours-2026&placement=${placement}`;

export default function Page() {
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "ITパスポートは80時間で合格できますか？", acceptedAnswer: { "@type": "Answer", text: "可能な人はいますが、全員に保証できる時間ではありません。既有知識と現在地によって必要時間は大きく変わります。最初に問題で現在地を測り、理解済み範囲を省くことが重要です。" } },
      { "@type": "Question", name: "最初に参考書を全部読むべきですか？", acceptedAnswer: { "@type": "Answer", text: "完全初学者には全体像の確認が有効ですが、時間短縮を狙うなら各テーマで問題を先に解き、分からなかった範囲だけ解説へ戻る方法も有効です。" } },
      { "@type": "Question", name: "勉強時間が少ないと不利ですか？", acceptedAnswer: { "@type": "Answer", text: "総時間だけでなく、未習得領域へどれだけ時間を配分できるかが重要です。同じ問題の暗記ではなく、弱点を別問題で再測定してください。" } },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><span className="font-bold">ITパスポート学習ガイド</span><Link className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white" href={cta("header", "plan")}>無料で学習計画を作る</Link></div></header>

      <article className="mx-auto max-w-3xl px-5 py-12">
        <p className="mb-3 text-sm font-semibold text-blue-700">2026年9月更新｜勉強時間・短期学習</p>
        <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">ITパスポートは80時間で合格できる？<br />勉強時間を短縮する学習設計</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">「100時間必要」「初心者は180時間」と聞いて、始める前から重く感じていませんか。必要な勉強時間は固定値ではありません。重要なのは、すでに知っている範囲まで同じ時間をかけないことです。</p>
        <div className="mt-8 rounded-2xl bg-blue-50 p-6"><p className="font-bold">結論</p><p className="mt-2 leading-7">80時間以内は全員に保証できる目標ではありません。ただし、最初に現在地を測り、問題を先に解いて「知らないところだけ学ぶ」設計にすれば、従来の一律インプット型より学習時間を圧縮できる余地があります。</p><Link className="mt-5 inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold text-white" href={cta("hero", "diagnosis")}>無料で現在地から学習計画を作る →</Link></div>

        <h2 className="mt-14 text-2xl font-bold">「必要100〜180時間」は絶対ではない</h2>
        <p className="mt-4 leading-8">資格スクールや比較メディアでは100〜150時間、初心者では150〜180時間程度が目安としてよく示されます。一方で、合格者調査では100時間未満で合格した初心者も報告されています。この差が示すのは「正しい時間は何時間か」ではなく、スタート地点と学習方法によって必要時間が大きく変わるということです。</p>

        <h2 className="mt-14 text-2xl font-bold">80時間を狙うなら、最初の設計を変える</h2>
        <div className="mt-6 space-y-4">
          {[
            ["1. まず問題を解いて現在地を測る", "最初から全範囲を読む前に、初見問題で得意・不得意を確認します。既に解けるテーマは学習量を減らします。"],
            ["2. 各テーマも『問題→解説』で始める", "確認問題を先に解き、正解理由まで説明できるなら解説をスキップ。間違えた・迷った部分だけインプットします。"],
            ["3. 正解ではなく『迷った正解』も拾う", "偶然正解した問題を習得済みにすると本番で崩れます。自信度も含めて弱点を抽出します。"],
            ["4. 復習後は別問題で再測定する", "同じ問題の答えを覚えただけかを切り分けます。別条件の問題でも解ければ、次のテーマへ進みます。"],
          ].map(([h, p]) => <section key={h} className="rounded-xl border bg-white p-5"><h3 className="font-bold">{h}</h3><p className="mt-2 leading-7 text-slate-600">{p}</p></section>)}
        </div>

        <h2 className="mt-14 text-2xl font-bold">80時間モデル：時間ではなく「習得」で進める</h2>
        <div className="mt-6 overflow-x-auto"><table className="w-full border-collapse bg-white text-left"><thead><tr className="bg-slate-100"><th className="p-3">工程</th><th className="p-3">目安</th><th className="p-3">やること</th></tr></thead><tbody>{[["初期測定","2h","初見問題で現在地・分野差を確認"],["弱点中心の基礎","28h","問題先行で不足テーマだけ理解"],["分野別演習","25h","誤答・迷いを中心に反復"],["横断演習・模試","15h","本番形式で知識を接続"],["弱点再測定・仕上げ","10h","未定着だけを再学習"]].map(r => <tr key={r[0]} className="border-t"><td className="p-3 font-semibold">{r[0]}</td><td className="p-3">{r[1]}</td><td className="p-3">{r[2]}</td></tr>)}</tbody></table></div>
        <p className="mt-3 text-sm leading-6 text-slate-500">※80時間は目標モデルです。初期測定の結果によって増減させてください。時間を使い切ることではなく、合格に必要な習得状態へ到達することが目的です。</p>

        <div className="mt-12 rounded-2xl bg-slate-900 p-7 text-white"><h2 className="text-2xl font-bold">あなたに80時間必要とは限りません。</h2><p className="mt-3 leading-7 text-slate-300">it-learning-appは、現在地を測り、弱点・復習・再測定をつないで「次に何をするか」を決める学習支援アプリです。最初から全員に同じ量を課すのではなく、あなたの学習データから必要な学習へ絞ります。</p><Link className="mt-5 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-900" href={cta("mid", "personalized")}>無料で自分専用の学習計画を作る →</Link></div>

        <h2 className="mt-14 text-2xl font-bold">AIは「答えを聞く」より時間短縮に使う</h2>
        <p className="mt-4 leading-8">生成AIは、分からない用語の説明、似た概念の比較、誤答理由の言語化、条件を変えた類題の作成に向いています。ただし会話だけでは、どのテーマが未定着か、いつ復習するか、合格まで何が残っているかを継続管理しにくいのが弱点です。AIによる理解支援と、学習履歴に基づく進捗管理を役割分担すると効率的です。</p>

        <h2 className="mt-14 text-2xl font-bold">80時間にこだわりすぎない</h2>
        <p className="mt-4 leading-8">初期測定で基礎が不足しているなら、80時間を超えても必要な学習を削るべきではありません。逆に既有知識が多い人が「100時間が目安だから」と理解済みの章を読み続ける必要もありません。管理すべきなのは累計時間ではなく、未習得の量です。</p>

        <h2 className="mt-14 text-2xl font-bold">よくある質問</h2>
        <div className="mt-5 space-y-5"><section><h3 className="font-bold">Q. IT完全初心者でも80時間で可能？</h3><p className="mt-2 leading-7 text-slate-600">可能性はありますが、80時間を前提に無理に削るべきではありません。まず測定し、必要量を決める方が安全です。</p></section><section><h3 className="font-bold">Q. 過去問だけでいい？</h3><p className="mt-2 leading-7 text-slate-600">誤答の理由を理解せず答えを暗記すると、条件が変わった問題に対応できません。演習と必要箇所の理解を往復してください。</p></section></div>

        <div className="mt-14 rounded-2xl bg-blue-600 p-8 text-center text-white"><h2 className="text-2xl font-bold">まず「あと何時間」ではなく「何が足りないか」を知る</h2><p className="mx-auto mt-3 max-w-xl leading-7 text-blue-100">現在地から必要な学習を絞り、今日やることまで決めましょう。</p><Link className="mt-6 inline-block rounded-xl bg-white px-7 py-3 font-bold text-blue-700" href={cta("bottom", "start")}>無料で学習計画を作る →</Link></div>
      </article>
    </main>
  );
}
