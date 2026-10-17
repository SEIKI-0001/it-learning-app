import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://it-learning-app.vercel.app";
const pagePath = "/guide/it-passport-acronyms-30-2026";
const pageUrl = `${siteUrl.replace(/\/$/, "")}${pagePath}`;
const cta = "/onboarding?source=acronyms-30-2026";
const title = "ITパスポートで覚えたい略語30選｜英字3文字・4文字の覚え方【2026年版】";
const description = "ITパスポート対策で覚えたい英字略語30個を、経営・マネジメント・テクノロジの3分野に分けて整理。意味だけの丸暗記を避ける覚え方と、AIを使った復習方法も解説します。";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "ITパスポート 略語",
    "ITパスポート 英字",
    "ITパスポート 用語 覚え方",
    "ITパスポート 単語",
    "ITパスポート AI 学習",
    "ITパスポート 2026",
  ],
  alternates: { canonical: pageUrl },
  openGraph: {
    title,
    description,
    type: "article",
    url: pageUrl,
    siteName: "it-learning-app",
    locale: "ja_JP",
  },
  twitter: { card: "summary_large_image", title, description },
};

type Term = {
  acronym: string;
  name: string;
  meaning: string;
  hook: string;
};

const strategyTerms: Term[] = [
  { acronym: "SWOT", name: "Strengths / Weaknesses / Opportunities / Threats", meaning: "強み・弱み・機会・脅威の4視点で状況を整理する分析手法。", hook: "内部＝S/W、外部＝O/Tまでセットで覚える。" },
  { acronym: "PPM", name: "Product Portfolio Management", meaning: "市場成長率と市場占有率から事業を分類し、経営資源の配分を考える手法。", hook: "花形・金のなる木・問題児・負け犬の4分類と結び付ける。" },
  { acronym: "CRM", name: "Customer Relationship Management", meaning: "顧客との関係を継続的に管理し、満足度や収益性の向上を目指す考え方。", hook: "C＝Customer。顧客との関係を管理、と直結させる。" },
  { acronym: "SCM", name: "Supply Chain Management", meaning: "調達から生産、物流、販売までの供給連鎖全体を最適化する管理手法。", hook: "S＝Supply。モノの流れを上流から下流まで見る。" },
  { acronym: "ERP", name: "Enterprise Resource Planning", meaning: "企業内の人・モノ・金・情報などの経営資源を統合的に管理する考え方やシステム。", hook: "E＝Enterprise。企業全体を一つにつなぐイメージ。" },
  { acronym: "BPR", name: "Business Process Re-engineering", meaning: "既存の業務プロセスを根本から見直し、大幅な改善を図る考え方。", hook: "小改善ではなく、業務プロセスそのものを再設計。" },
  { acronym: "KPI", name: "Key Performance Indicator", meaning: "目標達成までの途中経過を測る重要な業績評価指標。", hook: "KGI＝最終目標、KPI＝途中の指標、と対比する。" },
  { acronym: "KGI", name: "Key Goal Indicator", meaning: "組織や事業が最終的に達成したい目標を数値化した指標。", hook: "G＝Goal。最終ゴールの数字。" },
  { acronym: "RFP", name: "Request For Proposal", meaning: "システム導入などで発注側がベンダーへ具体的な提案を依頼する文書。", hook: "P＝Proposal。『提案してください』の文書。" },
  { acronym: "SLA", name: "Service Level Agreement", meaning: "サービス提供者と利用者の間で、品質水準などを合意した取り決め。", hook: "L＝Level。サービスの品質レベルの約束。" },
];

const managementTerms: Term[] = [
  { acronym: "PDCA", name: "Plan / Do / Check / Act", meaning: "計画・実行・評価・改善を繰り返す管理サイクル。", hook: "順番そのものが頻出。4語を時計回りにイメージする。" },
  { acronym: "WBS", name: "Work Breakdown Structure", meaning: "プロジェクトの作業を、管理できる小さな単位へ階層的に分解したもの。", hook: "B＝Breakdown。仕事を細かく分解する。" },
  { acronym: "QCD", name: "Quality / Cost / Delivery", meaning: "品質・コスト・納期という、プロジェクトや生産管理の代表的な評価軸。", hook: "品質、費用、納期の3点セット。" },
  { acronym: "PMBOK", name: "Project Management Body of Knowledge", meaning: "プロジェクトマネジメントの知識体系を整理したガイド。", hook: "PM＝Project Management、BOK＝Body of Knowledge。" },
  { acronym: "ITIL", name: "Information Technology Infrastructure Library", meaning: "ITサービスマネジメントのベストプラクティスを体系化した考え方。", hook: "システム開発ではなく、ITサービス運用・管理の文脈で覚える。" },
  { acronym: "RACI", name: "Responsible / Accountable / Consulted / Informed", meaning: "業務やプロジェクトにおける役割と責任を4種類で整理する考え方。", hook: "実行・説明責任・相談・報告の4役で整理する。" },
  { acronym: "EVM", name: "Earned Value Management", meaning: "計画価値・出来高・実コストなどを使ってプロジェクト進捗を定量管理する手法。", hook: "進捗とコストを『金額換算した価値』で比較する。" },
  { acronym: "BCP", name: "Business Continuity Plan", meaning: "災害や事故が起きても重要業務を継続・早期復旧するための事業継続計画。", hook: "C＝Continuity。止めない・早く戻す計画。" },
  { acronym: "RTO", name: "Recovery Time Objective", meaning: "障害発生後、いつまでに業務やシステムを復旧させるかという目標時間。", hook: "T＝Time。復旧までの時間。" },
  { acronym: "RPO", name: "Recovery Point Objective", meaning: "障害発生時、どの時点までデータを戻せればよいかという目標復旧時点。", hook: "P＝Point。どの時点のデータまで戻すか。" },
];

const technologyTerms: Term[] = [
  { acronym: "CPU", name: "Central Processing Unit", meaning: "命令の解釈や計算、各装置の制御を行うコンピュータの中心的な処理装置。", hook: "Central＝中心。コンピュータの頭脳。" },
  { acronym: "RAM", name: "Random Access Memory", meaning: "作業中のデータやプログラムを一時的に置く、電源を切ると内容が消える主記憶装置。", hook: "作業机のイメージ。ROMとの違いをセットで確認。" },
  { acronym: "ROM", name: "Read Only Memory", meaning: "基本的に読み出しを中心に使う、不揮発性の記憶装置。", hook: "R＝Read。電源を切っても保持される点も確認。" },
  { acronym: "LAN", name: "Local Area Network", meaning: "建物や家庭、オフィスなど比較的狭い範囲を結ぶネットワーク。", hook: "Local＝狭い範囲。WANと対比する。" },
  { acronym: "WAN", name: "Wide Area Network", meaning: "離れた拠点など広い範囲を結ぶネットワーク。", hook: "Wide＝広い範囲。" },
  { acronym: "DNS", name: "Domain Name System", meaning: "ドメイン名とIPアドレスを対応付ける仕組み。", hook: "Web上の『名前』をIPアドレスへ案内する電話帳のイメージ。" },
  { acronym: "DHCP", name: "Dynamic Host Configuration Protocol", meaning: "ネットワーク接続機器へIPアドレスなどの設定を自動的に割り当てるプロトコル。", hook: "IPアドレスを自動配布する仕組み、とまず覚える。" },
  { acronym: "VPN", name: "Virtual Private Network", meaning: "公衆ネットワーク上などに仮想的な専用ネットワークを構築する技術。", hook: "Virtual＋Private。インターネット上の仮想専用線。" },
  { acronym: "SQL", name: "Structured Query Language", meaning: "リレーショナルデータベースのデータ操作や定義などに使う言語。", hook: "SELECT・INSERT・UPDATE・DELETEと結び付ける。" },
  { acronym: "API", name: "Application Programming Interface", meaning: "ソフトウェア同士が機能やデータをやり取りするための接点・仕組み。", hook: "アプリ同士をつなぐ『窓口』として理解する。" },
];

const groups = [
  { title: "ストラテジ系：経営・業務で覚えたい10語", description: "経営戦略や業務改善では、似た略語を『何を管理するものか』で分けるのがコツです。", terms: strategyTerms },
  { title: "マネジメント系：プロジェクト・運用で覚えたい10語", description: "プロジェクト管理とサービス管理は、目的と使う場面を一緒に覚えると混同しにくくなります。", terms: managementTerms },
  { title: "テクノロジ系：コンピュータ・ネットワークで覚えたい10語", description: "英単語の意味がそのまま機能のヒントになる用語が多いため、正式名称も一度確認しましょう。", terms: technologyTerms },
];

const faq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "ITパスポートの略語は正式名称まで暗記する必要がありますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "すべての正式名称を一字一句暗記するより、略語が何を意味し、どの場面で使われるかを説明できる状態を優先するのがおすすめです。正式名称の英単語は意味を推測する手掛かりとして活用できます。",
      },
    },
    {
      "@type": "Question",
      name: "英字3文字の用語が混ざって覚えられません。どうすればいいですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "似た略語を単独で暗記せず、KGIとKPI、LANとWAN、RTOとRPOのように比較して覚えると区別しやすくなります。問題演習で間違えた組み合わせを優先して復習してください。",
      },
    },
    {
      "@type": "Question",
      name: "2026年のITパスポートはどのシラバスで勉強すればよいですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "2026年8月時点でIPAが掲載している現行ITパスポート試験シラバスはVer.6.5です。受験前にはIPA公式サイトで最新情報も確認してください。",
      },
    },
  ],
};

const article = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  datePublished: "2026-08-15",
  dateModified: "2026-08-15",
  mainEntityOfPage: pageUrl,
  author: { "@type": "Organization", name: "it-learning-app" },
  publisher: { "@type": "Organization", name: "it-learning-app" },
};

export default function Page() {
  return (
    <main className="min-h-screen bg-stone-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold">it-learning-app</Link>
          <Link href={`${cta}&position=header`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">無料で学習計画を作る</Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center">
        <p className="text-sm font-bold text-emerald-700">ITパスポート用語まとめ・2026年版</p>
        <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">英字3文字が混ざる人へ。<br />覚えたい略語30選</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">略語だけを丸暗記すると、CRM・SCM・ERPのような似た用語が混ざります。30語を「意味」「正式名称」「覚えるフック」の3点で整理しました。</p>
        <Link href={`${cta}&position=hero`} className="mt-8 inline-block rounded-xl bg-emerald-700 px-8 py-4 font-bold text-white">無料で自分専用の学習計画を作る</Link>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto max-w-4xl px-5 py-14">
          <h2 className="text-2xl font-black">略語は「3点セット」で覚える</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              ["① 何のための用語か", "まず日本語で役割を一文にする。"],
              ["② 何と間違えやすいか", "似た用語をペアで比較する。"],
              ["③ 問題でどう問われるか", "選択肢で見分ける練習まで行う。"],
            ].map((item) => (
              <div key={item[0]} className="rounded-2xl border p-5">
                <h3 className="font-bold">{item[0]}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item[1]}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 leading-8 text-slate-600">正式名称の英単語は、意味を推測するヒントとして使います。すべてのスペルを暗唱することより、「その用語は何をするものか」を説明できる状態を優先しましょう。</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        {groups.map((group) => (
          <div key={group.title} className="mb-16">
            <h2 className="text-3xl font-black">{group.title}</h2>
            <p className="mt-4 max-w-3xl leading-8 text-slate-600">{group.description}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {group.terms.map((term) => (
                <article key={term.acronym} className="rounded-2xl border bg-white p-6 shadow-sm">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-2xl font-black text-emerald-800">{term.acronym}</h3>
                    <p className="text-xs font-semibold text-slate-500">{term.name}</p>
                  </div>
                  <p className="mt-4 leading-7 text-slate-700">{term.meaning}</p>
                  <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-900">覚え方：{term.hook}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-5 py-14">
          <p className="text-sm font-bold text-emerald-300">30語を一度に完璧にする必要はありません。</p>
          <h2 className="mt-3 text-3xl font-black">間違えた略語から、優先して覚える</h2>
          <p className="mt-5 max-w-3xl leading-8 text-slate-300">効率がいいのは、問題を解いて混同した用語を特定し、その組み合わせだけ比較して覚える方法です。it-learning-appでは、試験日や学習状況をもとに「今日やること」を決めながら学習を進められます。</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`${cta}&position=mid`} className="rounded-xl bg-white px-7 py-4 font-bold text-slate-900">無料で自分専用の学習計画を作る</Link>
            <Link href="/glossary/list" className="rounded-xl border border-slate-600 px-7 py-4 font-bold text-white">用語一覧を見る</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="text-3xl font-black">AIを使うなら「説明させる」だけで終わらせない</h2>
        <p className="mt-5 leading-8 text-slate-700">AIに用語の意味を聞くだけでは、読んで分かった状態で止まりがちです。例えば「KGIとKPIを新人向けに比較して」「RTOとRPOを災害復旧の例で説明して」「この2語を区別する4択問題を3問作って」のように、比較と確認問題まで依頼すると理解を確認しやすくなります。</p>
        <div className="mt-8 rounded-2xl border bg-white p-6">
          <h3 className="text-xl font-black">おすすめ復習ループ</h3>
          <p className="mt-4 leading-8 text-slate-600">問題を解く → 間違えた略語を記録 → 正式名称と役割を確認 → 似た用語と比較 → 別問題で再確認。この順序なら、覚える対象を弱点に絞れます。</p>
        </div>

        <h2 className="mt-14 text-3xl font-black">2026年受験者が確認しておきたいこと</h2>
        <p className="mt-5 leading-8 text-slate-700">2026年8月時点でIPAが掲載している現行ITパスポート試験シラバスはVer.6.5です。また、2026年5月以降のCBT試験は申込受付が再開されており、2026年12月28日以降は試験休止が予定されています。受験日を決めたうえで、最新のIPA公式案内を確認しながら学習を進めてください。</p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-emerald-800">
          <a href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer">IPA 試験要綱・シラバス →</a>
          <a href="https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html" target="_blank" rel="noreferrer">IPA 2026年5月以降のCBT試験案内 →</a>
        </div>

        <div className="mt-14 rounded-3xl bg-emerald-50 p-8 text-center">
          <p className="text-sm font-bold text-emerald-800">覚える順番に迷ったら</p>
          <h2 className="mt-3 text-3xl font-black">試験日から、今日の学習を決める</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">単語帳を最初から全部覚えるより、自分の弱点と残り期間に合わせて進める。it-learning-appで学習計画を作って、今日の1テーマから始められます。</p>
          <Link href={`${cta}&position=bottom`} className="mt-7 inline-block rounded-xl bg-emerald-700 px-8 py-4 font-bold text-white">無料で学習計画を作る</Link>
        </div>
      </section>
    </main>
  );
}
