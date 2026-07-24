import type { Metadata } from "next";
import Link from "next/link";

const title =
  "【2026年版】ITパスポート独学に役立つ無料ツール7選｜初心者向けの使い分けも解説";
const description =
  "ITパスポートを独学する初心者向けに、公式情報、学習計画、用語整理、確認問題、復習、過去問レベル演習、AI学習支援の7種類を紹介。無料ツールを使い分けて合格まで迷わず進む方法を解説します。";
const canonical =
  "https://it-learning-app.vercel.app/blog/it-passport-free-study-tools-2026";
const published = "2026-07-11";
const ipaRangeUrl =
  "https://www3.jitec.ipa.go.jp/JitesCbt/html/about/range.html";

export const metadata: Metadata = {
  title: `${title} | ITパスポート学習コーチ`,
  description,
  alternates: { canonical },
  keywords: [
    "ITパスポート 無料",
    "ITパスポート 勉強アプリ 無料",
    "ITパスポート 独学",
    "ITパスポート 勉強法",
    "ITパスポート AI",
    "ITパスポート 学習ツール",
  ],
  openGraph: {
    title,
    description,
    type: "article",
    url: canonical,
    siteName: "ITパスポート学習コーチ",
    locale: "ja_JP",
    publishedTime: published,
    modifiedTime: published,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: title,
  description,
  datePublished: published,
  dateModified: published,
  author: {
    "@type": "Organization",
    name: "ITパスポート学習コーチ編集部",
  },
  publisher: {
    "@type": "Organization",
    name: "ITパスポート学習コーチ",
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  url: canonical,
};

const tools = [
  {
    number: "01",
    name: "IPA公式の試験範囲",
    role: "最初に学習の全体像を確認する",
    use: "ストラテジ・マネジメント・テクノロジの3分野を把握し、教材の抜け漏れを防ぎます。最初から細部を暗記するのではなく、試験で扱う領域の地図として使うのが効果的です。",
    caution: "公式資料だけで学習を完結させるのではなく、初心者向け教材と併用する。",
    href: ipaRangeUrl,
    external: true,
  },
  {
    number: "02",
    name: "カレンダー・タスク管理",
    role: "試験日から学習量を逆算する",
    use: "参考書を読む日、確認問題を解く日、復習日を先に置きます。予定どおり進まなかった日は、未完了分を翌日に積み上げず、残り期間から計画を引き直すことが重要です。",
    caution: "入力項目を増やしすぎず、今日やることが一目で分かる状態にする。",
  },
  {
    number: "03",
    name: "用語メモ・単語帳",
    role: "略語と専門用語を短時間で反復する",
    use: "用語名と意味だけでなく、どの場面で使うかを1行で残します。例えばVPNなら『離れた場所から安全に社内ネットワークへ接続する仕組み』のように、利用場面とセットで覚えます。",
    caution: "単語帳だけに偏らず、確認問題で使い方まで確かめる。",
  },
  {
    number: "04",
    name: "短い確認問題",
    role: "読んだ直後の分かったつもりを減らす",
    use: "1テーマを学んだ直後に3〜5問だけ解きます。正解率よりも、根拠を説明できるかを確認し、説明できない問題は復習対象として残します。",
    caution: "大量演習を先に行わず、学習テーマと問題を対応させる。",
  },
  {
    number: "05",
    name: "復習リスト",
    role: "忘れた項目だけを再学習する",
    use: "学習済み、復習待ち、苦手の3状態で管理します。すべてを何度も読み直すのではなく、間違えた理由や説明できなかった項目に絞ると、短時間でも学習効率を上げられます。",
    caution: "復習件数をため込みすぎず、毎日の学習メニューに少量ずつ組み込む。",
  },
  {
    number: "06",
    name: "過去問レベルの演習",
    role: "知識を本試験形式で使えるか確認する",
    use: "基礎学習後に、複数分野が混ざった問題へ進みます。点数だけを見るのではなく、知識不足、読み違い、消去法の失敗など、誤答理由を分類して次の復習につなげます。",
    caution: "初学段階から過去問だけを繰り返し、答えを暗記しない。",
  },
  {
    number: "07",
    name: "AI学習支援アプリ",
    role: "計画・確認・復習を一つにつなげる",
    use: "AIへの単発質問だけでなく、試験日、使える時間、理解度をもとに、今日やることと次の復習対象を整理できるツールを選びます。判断の負担が減るため、独学初心者でも学習を再開しやすくなります。",
    caution: "AIの回答をそのまま暗記せず、公式範囲と確認問題で理解を確かめる。",
    href: "/onboarding",
  },
];

export default function ItPassportFreeStudyToolsPage() {
  return (
    <main className="min-h-screen bg-[#f3f8fb] text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#cfe5f2] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/blog" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b75a6] text-sm font-black text-white">
              IP
            </span>
            <span className="text-sm font-black text-[#12384d] sm:text-base">
              ITパスポート学習ガイド
            </span>
          </Link>
          <Link
            href="/onboarding"
            className="rounded-full bg-[#f7a600] px-4 py-2 text-sm font-black text-white"
          >
            無料で学習を始める
          </Link>
        </div>
      </header>

      <section className="bg-white px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            <p className="inline-flex rounded-full bg-[#fff2cc] px-3 py-1 text-xs font-bold text-[#9a6400]">
              無料学習ツールまとめ
            </p>
            <h1 className="mt-5 max-w-4xl text-[32px] font-black leading-[1.22] text-[#12384d] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">
              ITパスポートは、無料ツールだけでも学習を始められます。ただし、ツールを増やすだけでは合格まで進みません。重要なのは、試験範囲の確認、学習、理解度チェック、復習、演習を役割ごとに使い分けることです。
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span>公開日：2026-07-11</span>
              <span>読了目安：8分</span>
              <span>対象：IT未経験・独学初心者</span>
            </div>
          </div>

          <aside className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <p className="text-sm font-black text-[#12384d]">リード獲得設計</p>
            <dl className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
              <div>
                <dt className="font-black text-[#12384d]">SEOキーワード</dt>
                <dd>ITパスポート 無料 / 勉強アプリ 無料 / 学習ツール</dd>
              </div>
              <div>
                <dt className="font-black text-[#12384d]">想定読者</dt>
                <dd>費用を抑えて独学したいが、何を組み合わせればよいか分からない初心者</dd>
              </div>
              <div>
                <dt className="font-black text-[#12384d]">訴求軸</dt>
                <dd>無料ツールを点で使わず、計画・確認・復習を一つの流れにする</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,760px)_300px] lg:items-start">
        <article className="min-w-0 rounded-[22px] bg-white p-5 shadow-[0_14px_34px_rgba(22,94,131,0.08)] sm:p-8">
          <section className="rounded-[18px] border border-[#cfe5f2] bg-[#f7fbfe] p-5">
            <p className="text-lg font-black text-[#12384d]">この記事の結論</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:text-base">
              <li>・無料ツールは、役割を決めて使えば独学の強い味方になる。</li>
              <li>・問題数より、学習後に理解確認と復習が続く設計が重要。</li>
              <li>・複数ツールの管理が負担なら、学習計画まで一体化したサービスを使う。</li>
            </ul>
          </section>

          <div className="mt-9 space-y-7 text-base text-slate-700 sm:text-[17px] [&_a]:font-bold [&_a]:text-[#1b75a6] [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-12 [&_h2]:border-l-[7px] [&_h2]:border-[#1b75a6] [&_h2]:bg-[#eef8fd] [&_h2]:px-4 [&_h2]:py-3 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:leading-snug [&_h2]:text-[#12384d] [&_h3]:text-xl [&_h3]:font-black [&_h3]:leading-snug [&_h3]:text-[#12384d] [&_li]:leading-8 [&_p]:leading-8">
            <h2>無料ツールを選ぶ前に決めること</h2>
            <p>
              最初に決めるのは、使うアプリではなく試験日です。試験日が決まれば、参考書を読む期間、確認問題を解く期間、総合演習へ進む時期を逆算できます。
            </p>
            <p>
              次に、各ツールの役割を一つに絞ります。用語暗記、進捗管理、問題演習を同じツールに無理に任せる必要はありません。ただし、ツール間の移動が増えすぎると、学習より管理に時間を使う状態になります。
            </p>

            <h2>ITパスポート独学に役立つ無料ツール7選</h2>
            <div className="space-y-5">
              {tools.map((tool) => (
                <section
                  key={tool.number}
                  className="rounded-[18px] border border-[#cfe5f2] p-5 sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1b75a6] text-sm font-black text-white">
                      {tool.number}
                    </span>
                    <div>
                      <h3>{tool.name}</h3>
                      <p className="mt-1 text-sm font-bold text-[#1b75a6]">{tool.role}</p>
                    </div>
                  </div>
                  <p className="mt-4">{tool.use}</p>
                  <p className="mt-3 rounded-[12px] bg-[#fff8e6] px-4 py-3 text-sm leading-7">
                    <span className="font-black text-[#9a6400]">注意：</span>
                    {tool.caution}
                  </p>
                  {tool.href && (
                    <div className="mt-4">
                      {tool.external ? (
                        <a href={tool.href} target="_blank" rel="noreferrer">
                          IPA公式の出題範囲を見る
                        </a>
                      ) : (
                        <Link href={tool.href}>it-learning-appを無料で試す</Link>
                      )}
                    </div>
                  )}
                </section>
              ))}
            </div>

            <h2>無料ツールを組み合わせるおすすめ手順</h2>
            <ol className="space-y-3 rounded-[18px] bg-[#f7fbfe] p-5">
              <li>1. IPA公式の範囲で、学ぶ分野の全体像を確認する。</li>
              <li>2. 試験日から逆算し、1週間単位の学習予定を決める。</li>
              <li>3. 参考書や解説で1テーマ学び、直後に短い確認問題を解く。</li>
              <li>4. 説明できなかった用語だけを復習リストへ入れる。</li>
              <li>5. 基礎が固まったら、過去問レベルの総合演習へ進む。</li>
            </ol>

            <h2>複数ツールの管理が続かない場合</h2>
            <p>
              無料ツールを組み合わせる方法は費用を抑えられますが、毎日「どのツールを開くか」「何を復習するか」を自分で決める必要があります。ここで止まる人は、やる気ではなく判断回数が多すぎることが原因です。
            </p>
            <p>
              it-learning-appは、試験日と使える学習時間から今日の学習内容を整理し、確認問題、単語復習、過去問レベル演習を一つの流れにつなげることを目指しています。教材を増やすのではなく、今ある教材を最後まで進めるための学習コーチとして使えます。
            </p>

            <section className="mt-10 rounded-[22px] bg-[#12384d] p-6 text-white sm:p-8">
              <p className="text-sm font-black text-[#8bd8f5]">無料で学習計画を作成</p>
              <h2 className="mt-3 border-0 bg-transparent p-0 text-3xl text-white">
                今日やることを、もう自分で組み立てなくていい。
              </h2>
              <p className="mt-4 text-[#e6f6fc]">
                試験日と学習時間を入力して、it-learning-appで今日の学習メニューを確認してください。計画、理解度確認、復習を一つの画面から始められます。
              </p>
              <Link
                href="/onboarding"
                className="mt-6 inline-flex rounded-full bg-[#f7a600] px-6 py-4 text-sm font-black text-white no-underline transition hover:bg-[#d98f00]"
              >
                無料で今日の学習メニューを作る
              </Link>
            </section>
          </div>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <div className="rounded-[18px] border border-[#cfe5f2] bg-white p-5">
            <p className="font-black text-[#12384d]">この記事が向いている人</p>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
              <li>・できるだけ無料で始めたい</li>
              <li>・独学用ツールを比較したい</li>
              <li>・複数アプリの管理に疲れた</li>
              <li>・AIで勉強計画を軽くしたい</li>
            </ul>
          </div>
          <div className="rounded-[18px] bg-[#12384d] p-5 text-white">
            <p className="text-lg font-black">最初の1歩だけ無料で</p>
            <p className="mt-3 text-sm leading-7 text-[#e6f6fc]">
              試験日から逆算し、今日やることを整理します。
            </p>
            <Link
              href="/onboarding"
              className="mt-5 inline-flex w-full justify-center rounded-full bg-[#f7a600] px-5 py-3 text-sm font-black text-white"
            >
              学習計画を作る
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
