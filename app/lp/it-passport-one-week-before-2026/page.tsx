import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ITパスポート試験1週間前にやること｜正答率別7日間プラン【2026年】",
  description:
    "ITパスポート試験まであと1週間。過去問の正答率別に、弱点確認・復習・模試・前日確認までの7日間プランを解説。直前期に新しい教材へ手を広げず、合格に必要な学習へ絞る方法を紹介します。",
  keywords: [
    "ITパスポート 1週間前",
    "ITパスポート 試験直前",
    "ITパスポート 直前対策",
    "ITパスポート 1週間 勉強",
    "ITパスポート 過去問 正答率",
    "ITパスポート AI 学習",
  ],
  alternates: { canonical: "/lp/it-passport-one-week-before-2026" },
  openGraph: {
    title: "ITパスポート試験1週間前にやること【2026年】",
    description:
      "過去問の正答率別に、残り7日で優先する学習を整理。弱点を絞って本番までの勉強を迷わないための直前プランです。",
    type: "article",
    url: "/lp/it-passport-one-week-before-2026",
  },
  twitter: {
    card: "summary_large_image",
    title: "ITパスポート試験1週間前にやること【2026年】",
    description: "残り7日。新しい教材より、弱点の特定と再測定を優先する直前対策。",
  },
};

const cta = (placement: string) =>
  `/onboarding?source=one-week-before-exam-2026&placement=${placement}`;

const faq = [
  {
    q: "ITパスポート試験1週間前からでも間に合いますか？",
    a: "現在の理解度によって異なります。1週間で全範囲をゼロから完成させる前提ではなく、まず問題演習で現在地を確認し、得点につながりやすい弱点へ時間を集中させることが重要です。受験日の変更可否や空席は公式申込サイトで確認してください。",
  },
  {
    q: "直前は参考書と過去問のどちらを優先すべきですか？",
    a: "原則は問題演習を起点にし、間違えた論点だけ参考書や解説へ戻る方が優先順位を付けやすくなります。既に理解できている章を最初から読み直すより、弱点を特定して復習する方が直前期の時間を使いやすいです。",
  },
  {
    q: "過去問で何％取れれば合格できますか？",
    a: "過去問の正答率と本試験の評価点は同じではありません。本試験はIRTに基づいて評価点を算出し、総合600点以上かつ3分野それぞれ300点以上が合格基準です。正答率はあくまで現在地を測る参考指標として使ってください。",
  },
  {
    q: "AIは直前対策にどう使えばいいですか？",
    a: "誤答した理由の言語化、似た用語の比較、理解できない選択肢のかみ砕き説明、同じ論点の類題作成などに向いています。試験制度や出題範囲などの事実確認はIPAなどの一次情報を優先してください。",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "ITパスポート試験1週間前にやること｜正答率別7日間プラン【2026年】",
  description:
    "ITパスポート試験まで残り1週間の受験者向けに、現在地の測定から弱点復習、模試、前日確認までを整理した直前学習ガイド。",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="font-black text-blue-700">it-learning-app</span>
          <Link
            href={cta("header")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            無料で直前プランを作る
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-16 md:py-24">
        <div className="max-w-4xl">
          <p className="font-bold text-blue-700">ITパスポート直前対策 2026</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            試験まであと1週間。
            <br />
            全部やり直さない。
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            残り7日で重要なのは、新しい教材を増やすことではありません。まず問題を解いて現在地を測り、間違えた原因を絞り、必要な範囲だけ復習して再測定する。直前期は「何を捨てるか」まで決めると、勉強を進めやすくなります。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={cta("hero")}
              className="rounded-xl bg-blue-600 px-7 py-4 font-bold text-white shadow"
            >
              無料で残り7日の学習計画を作る →
            </Link>
            <a
              href="#seven-days"
              className="rounded-xl border border-slate-300 bg-white px-7 py-4 font-bold"
            >
              7日間プランを見る
            </a>
          </div>
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <p className="text-sm font-bold text-slate-500">まず確認</p>
          <h2 className="mt-2 text-3xl font-black">本試験は「総合点だけ」では決まらない</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-6">
              <p className="text-sm font-bold text-slate-500">試験時間</p>
              <p className="mt-2 text-3xl font-black">120分</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-6">
              <p className="text-sm font-bold text-slate-500">出題数</p>
              <p className="mt-2 text-3xl font-black">100問</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-6">
              <p className="text-sm font-bold text-slate-500">合格基準</p>
              <p className="mt-2 text-xl font-black">総合600点＋各分野300点以上</p>
            </div>
          </div>
          <p className="mt-6 max-w-4xl leading-7 text-slate-600">
            IPA公式では、総合評価点600点以上に加え、ストラテジ・マネジメント・テクノロジの各分野で300点以上が必要です。採点はIRT方式なので、過去問の単純な正答率を本番得点へそのまま換算することはできません。直前期こそ「総合正答率だけ」ではなく、分野別の弱点も確認してください。
          </p>
          <a
            className="mt-4 inline-block text-sm font-bold text-blue-700 underline"
            href="https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html"
            target="_blank"
            rel="noreferrer"
          >
            IPA公式の試験内容・合格基準を確認する ↗
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="font-bold text-blue-700">STEP 1</p>
        <h2 className="mt-2 text-3xl font-black">今日、まず30〜100問解いて現在地を測る</h2>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          直前期に避けたいのは、不安だから参考書の1ページ目へ戻ることです。先に問題を解けば、残り7日で優先すべき場所が見えます。正解した問題でも「勘で選んだ」「2択で迷った」ものは復習候補に入れてください。
        </p>
        <div className="mt-8 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-4">過去問の目安</th>
                <th className="p-4">直前期の優先</th>
                <th className="p-4">避けたい行動</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-4 font-bold">60％未満</td>
                <td className="p-4">頻出の基礎論点と大きな弱点を絞る。全範囲の完璧を狙わない。</td>
                <td className="p-4">難問・細かい用語へ時間を使いすぎる</td>
              </tr>
              <tr className="border-t">
                <td className="p-4 font-bold">60〜75％前後</td>
                <td className="p-4">誤答と迷った正解を分類し、分野別の穴を重点的に埋める。</td>
                <td className="p-4">同じ問題の答えだけを暗記する</td>
              </tr>
              <tr className="border-t">
                <td className="p-4 font-bold">75％以上</td>
                <td className="p-4">初見問題・時間配分・計算問題・弱い1分野を確認する。</td>
                <td className="p-4">得意問題だけを繰り返して安心する</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          ※上記の正答率は学習方針を分けるための目安であり、合格を保証する基準ではありません。本試験の評価点とは別物です。
        </p>
      </section>

      <section id="seven-days" className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <p className="font-bold text-blue-300">STEP 2</p>
          <h2 className="mt-2 text-3xl font-black">残り7日の学習プラン</h2>
          <p className="mt-4 max-w-3xl leading-8 text-slate-300">
            すべての日に同じ量を詰め込む必要はありません。「測る日」と「直す日」を分けて、最後にもう一度測ります。
          </p>
          <div className="mt-8 grid gap-4">
            {[
              ["7日前", "現在地測定", "30〜100問を解き、誤答・迷った正解・分野別の弱点を抽出する。"],
              ["6日前", "弱点①を復習", "最も弱い分野から、間違えた論点だけ解説・参考書へ戻る。"],
              ["5日前", "弱点②を復習", "似た用語の混同、計算手順、知らなかった用語を整理する。"],
              ["4日前", "別問題で再測定", "復習した論点を別の問題で解き、答えの暗記ではなく理解できたか確かめる。"],
              ["3日前", "100問を意識した演習", "可能なら本番と同じ120分を意識し、1問に固執しない練習をする。"],
              ["2日前", "最後の弱点補強", "再測定でも間違えた論点と、各分野の取りこぼしだけに絞る。"],
              ["前日", "軽い確認＋準備", "新しい範囲を広げず、間違えやすい用語・計算手順を確認。会場・時間・持ち物も確認する。"],
            ].map(([day, title, body]) => (
              <div key={day} className="grid gap-2 rounded-2xl border border-slate-700 bg-slate-800 p-5 md:grid-cols-[110px_180px_1fr] md:items-start">
                <p className="font-black text-blue-300">{day}</p>
                <p className="font-black">{title}</p>
                <p className="leading-7 text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="font-bold text-blue-700">STEP 3</p>
        <h2 className="mt-2 text-3xl font-black">間違いを4種類に分けると、復習先が決まる</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {[
            ["知らなかった", "用語・概念そのものを知らない。", "解説や参考書で基礎を確認 → その日のうちに類題を1〜3問。"],
            ["混同した", "似た言葉の区別が曖昧。", "2つの概念を比較表にする。AIに『違いを例付きで説明して』と聞くのも有効。"],
            ["手順を忘れた", "計算・考え方の途中で止まった。", "答えではなく解法手順を再現し、数字を変えた問題で確認。"],
            ["迷いすぎた", "知識はあるが選択肢を絞れない。", "正解根拠だけでなく、不正解の選択肢がなぜ違うかまで確認。"],
          ].map(([title, symptom, action]) => (
            <article key={title} className="rounded-2xl border bg-white p-6">
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{symptom}</p>
              <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm font-semibold leading-6 text-slate-700">{action}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y bg-blue-50">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="font-bold text-blue-700">it-learning-app</p>
              <h2 className="mt-2 text-3xl font-black">直前期こそ、「次に何をやるか」を自分で毎回考えない。</h2>
              <p className="mt-5 leading-8 text-slate-700">
                残り時間が少ないほど、教材選びや復習範囲の判断に時間を使いたくありません。it-learning-appは、学習結果から現在地と弱点を整理し、次の学習につなげることを目的としたITパスポート学習支援アプリです。
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">残り7日からでも</p>
              <p className="mt-2 text-2xl font-black">弱点 → 復習 → 再測定</p>
              <p className="mt-3 leading-7 text-slate-600">今の状態から優先順位を整理し、やることを絞ります。</p>
              <Link
                href={cta("mid")}
                className="mt-6 block rounded-xl bg-blue-600 px-6 py-4 text-center font-bold text-white"
              >
                無料で直前の学習計画を作る →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-3xl font-black">直前1週間でやらないこと</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            "不安になって参考書を最初から全部読み直す",
            "新しい問題集・動画・アプリを次々に追加する",
            "一度解いた過去問の正答率だけを見て安心する",
            "苦手分野を捨てて総合点だけを上げようとする",
            "1問に長時間こだわり、本番の時間配分を練習しない",
            "前日に睡眠時間を削って新範囲を詰め込む",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-xl border bg-white p-5">
              <span aria-hidden className="font-black text-red-500">×</span>
              <p className="font-semibold leading-7">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-3xl font-black">よくある質問</h2>
          <div className="mt-8 space-y-7">
            {faq.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-black">{q}</h3>
                <p className="mt-2 max-w-4xl leading-7 text-slate-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center">
        <p className="font-bold text-blue-700">残り7日を、迷う時間にしない。</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black md:text-4xl">
          今の弱点から、試験日までにやることを整理する。
        </h2>
        <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-600">
          全範囲をやり直すのではなく、現在地を測って優先順位を決める。it-learning-appで直前期の学習計画を作れます。
        </p>
        <Link
          href={cta("bottom")}
          className="mt-8 inline-block rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow"
        >
          無料で残り7日の学習計画を作る →
        </Link>
        <p className="mt-4 text-xs text-slate-500">利用状況や学習成果によって結果は異なります。合格を保証するものではありません。</p>
      </section>
    </main>
  );
}
