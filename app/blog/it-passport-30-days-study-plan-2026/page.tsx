import type { Metadata } from "next";
import Link from "next/link";

const pageUrl = "https://it-learning-app.vercel.app/blog/it-passport-30-days-study-plan-2026";
const cta = "/onboarding?source=30-days-study-plan-2026";

export const metadata: Metadata = {
  title: "ITパスポートは1か月で合格できる？30日間の勉強スケジュール【2026年版】",
  description: "ITパスポートを1か月で目指す人向けに、30日間の具体的な勉強スケジュールを解説。参考書、確認問題、過去問の進め方と理解度に応じた計画調整を紹介します。",
  keywords: ["ITパスポート 1ヶ月", "ITパスポート 1か月 勉強", "ITパスポート 30日", "ITパスポート 短期合格", "ITパスポート 勉強スケジュール"],
  alternates: { canonical: pageUrl },
  openGraph: { title: "ITパスポートは1か月で合格できる？30日間の勉強スケジュール", description: "30日で何をどこまで進めるかを週別に整理。", type: "article", url: pageUrl, locale: "ja_JP", siteName: "it-learning-app" },
};

const weeks = [
  ["1〜7日目", "全体像をつかむ", "参考書や解説で3分野の全体像を確認します。完璧な暗記を目指さず、学習直後に確認問題を解いて理解不足を残します。"],
  ["8〜14日目", "問題演習を増やす", "インプットだけでなく問題演習を中心にします。正解しても根拠を説明できない問題は復習対象にし、弱い分野へ翌日の学習量を多く配分します。"],
  ["15〜21日目", "本番レベルへ", "公開問題や過去問レベルの問題をまとまった単位で解きます。誤答原因を知識不足、用語の混同、読み違いに分けて復習します。"],
  ["22〜27日目", "苦手分野を潰す", "新しい教材を増やさず、これまでの誤答と正答率の低い分野を優先します。確認問題、解説、再演習を繰り返します。"],
  ["28〜30日目", "本番形式で仕上げる", "通し演習で時間配分を確認します。直前は新しい知識を広げるより、これまで間違えた項目を確実に取り切れる状態を目指します。"],
];

export default function Page() {
  return <main className="min-h-screen bg-white text-slate-900"><article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
    <p className="mb-4 text-sm font-semibold text-blue-700">ITパスポート短期対策｜2026年版</p>
    <h1 className="text-3xl font-bold leading-tight sm:text-4xl">ITパスポートは1か月で合格できる？<br />30日間の勉強スケジュール</h1>
    <p className="mt-6 text-lg leading-8 text-slate-600">試験まであと1か月。「何から、どの順番で進めればいい？」という人向けに、30日間を5段階に分けた学習計画をまとめました。</p>
    <div className="mt-8 rounded-2xl bg-blue-50 p-6"><p className="font-bold">先に自分専用の計画を作りたい方へ</p><p className="mt-2 text-slate-700">試験日と学習状況から、今日やることを整理できます。</p><Link href={`${cta}&position=hero`} className="mt-4 inline-block rounded-xl bg-blue-700 px-6 py-3 font-bold text-white">無料で学習計画を作る</Link></div>
    <section className="mt-12"><h2 className="text-2xl font-bold">結論：1か月なら「全部覚えてから問題を解く」をやめる</h2><p className="mt-4 leading-8 text-slate-700">短期間では、参考書を完璧にしてから演習へ進む方法は非効率になりがちです。基礎を学んだ直後に問題を解き、理解できていない部分を特定して戻るサイクルを早く回すことが重要です。</p><p className="mt-4 leading-8 text-slate-700">また、IPAはシステムリプレースに伴い2027年1月以降の試験実施を一時休止する予定と案内しています。年内受験を考えている人は試験日も早めに確保しましょう。</p></section>
    <section className="mt-12"><h2 className="text-2xl font-bold">30日間の具体的な進め方</h2><div className="mt-6 space-y-5">{weeks.map(([label,title,body]) => <div key={label} className="rounded-2xl border border-slate-200 p-6"><p className="text-sm font-bold text-blue-700">{label}</p><h3 className="mt-1 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-slate-700">{body}</p></div>)}</div></section>
    <section className="mt-12"><h2 className="text-2xl font-bold">時間ではなく「理解できたか」で翌日を変える</h2><p className="mt-4 leading-8 text-slate-700">計画には「平日60分」のように時間を入れて構いません。ただし予定時間を消化したことだけを進捗の基準にすると、理解不足を残す危険があります。確認問題や演習結果で理解度を確認し、十分なら次へ、弱ければ翌日に復習を追加する。この調整が短期学習では重要です。</p></section>
    <section className="mt-12 rounded-2xl bg-slate-900 p-7 text-white"><h2 className="text-2xl font-bold">30日間を、自分専用の計画に変える</h2><p className="mt-3 leading-7 text-slate-200">it-learning-appでは、試験日から逆算して毎日の学習内容を整理し、確認問題や演習結果をもとに次の学習を判断できます。</p><Link href={`${cta}&position=mid`} className="mt-5 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-900">無料で自分専用の計画を作る</Link></section>
    <section className="mt-12"><h2 className="text-2xl font-bold">よくある質問</h2><h3 className="mt-6 font-bold">IT未経験でも1か月で合格できますか？</h3><p className="mt-2 leading-7 text-slate-700">可能性はありますが、開始時点の知識と確保できる学習量で難易度は変わります。最初に問題を解いて現在地を確認し、結果に応じて計画を調整するのが現実的です。</p><h3 className="mt-6 font-bold">1日何時間勉強すればよいですか？</h3><p className="mt-2 leading-7 text-slate-700">時間だけで一律に決めるより、その日に設定した範囲を理解できたかを確認問題で判定する方が有効です。</p><h3 className="mt-6 font-bold">過去問はいつから始めますか？</h3><p className="mt-2 leading-7 text-slate-700">1か月の短期学習では全範囲のインプット完了を待ちすぎず、2週目から演習を増やし、3週目には本番レベルへ進む構成を推奨します。</p></section>
    <section className="mt-12 border-t border-slate-200 pt-10 text-center"><h2 className="text-2xl font-bold">試験日から逆算して、今日やることを決めよう</h2><p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">30日という限られた期間だからこそ、理解度に合わせて進めることが重要です。</p><Link href={`${cta}&position=bottom`} className="mt-6 inline-block rounded-xl bg-blue-700 px-8 py-4 font-bold text-white">無料で学習計画を作る</Link></section>
  </article></main>;
}
