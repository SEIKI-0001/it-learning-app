// ============================================================================
// 公開ガイド（/guide 配下）の記事レジストリ。
// ----------------------------------------------------------------------------
// title / description / 日付 / 関連記事はここだけで持つ。metadata・JSON-LD・
// 一覧ページ・関連リンク・sitemap の回帰テストはすべてこの配列を参照する。
// 本文は各ページ（app/guide/<slug>/page.tsx）に置く。
//
// 将来 /guide/topics/... や用語解説を足すときは path を拡張して同じ形で登録する。
// ============================================================================

export const GUIDE_BASE_PATH = "/guide";

export type GuideArticle = {
  /** URL の末尾（/guide/<slug>）。 */
  slug: string;
  /** <title>。検索キーワードを自然に含める。 */
  title: string;
  /** ページ内の H1。 */
  h1: string;
  /** meta description / OG / Article.description。 */
  description: string;
  /** 一覧・関連リンクに出す短い説明。 */
  summary: string;
  datePublished: string; // "YYYY-MM-DD"
  dateModified: string; // "YYYY-MM-DD"
  /** 関連記事（slug）。2〜3件。 */
  related: string[];
};

export const GUIDE_INDEX = {
  title: "ITパスポート学習ガイド｜勉強法・勉強時間・計画・過去問の使い方",
  h1: "ITパスポート学習ガイド",
  description:
    "ITパスポート試験の勉強法、勉強時間の見積もり方、試験日から逆算する学習計画、勉強が続かないときの立て直し方、過去問の使い方をまとめたガイドです。",
  datePublished: "2026-09-26",
  dateModified: "2026-09-26",
} as const;

export const GUIDES: GuideArticle[] = [
  {
    slug: "it-passport-study-method",
    title: "ITパスポートの勉強法｜未経験者が何から始めるかを6ステップで解説",
    h1: "ITパスポートの勉強法：未経験者は何から始めればいい？",
    description:
      "ITパスポートの勉強は、参考書を最初から完璧に覚えるより「全体像→理解→確認問題→過去問→苦手復習→本番形式」を小さく回すほうが進めやすくなります。IT未経験者向けに、各ステップでやることと次へ進む目安を解説します。",
    summary: "何から始めるか。全体像→理解→確認問題→過去問→苦手復習→本番形式の回し方。",
    datePublished: "2026-09-26",
    dateModified: "2026-09-26",
    related: ["study-plan", "past-exam-strategy", "study-time"],
  },
  {
    slug: "study-time",
    title: "ITパスポートの勉強時間は何時間？前提知識別の見積もり方と期間の目安",
    h1: "ITパスポート合格までの勉強時間は？前提知識と1日の時間で変わる",
    description:
      "ITパスポートの勉強時間は一律には決まりません。前提知識・今の理解度・1日に使える時間で変わります。IT初心者・基礎知識あり・再受験のケース別に、必要な学習量の見積もり方と、何ヶ月かかるかの計算方法を解説します。",
    summary: "何時間・何ヶ月かかるか。ケース別の見積もり方と、1日の時間から期間を出す計算。",
    datePublished: "2026-09-26",
    dateModified: "2026-09-26",
    related: ["study-plan", "it-passport-study-method", "cant-continue-studying"],
  },
  {
    slug: "study-plan",
    title: "ITパスポートの勉強計画｜試験日から逆算するスケジュールの立て方",
    h1: "試験日から逆算するITパスポートの学習計画",
    description:
      "ITパスポートの勉強計画は、試験日までの日数・1日に使える時間・現在地・苦手分野から逆算して立てます。試験まで30日・60日の例で、理解・確認問題・弱点復習・過去問の配分と、遅れたときの立て直し方を解説します。",
    summary: "試験まで30日・60日の配分例と、遅れたときの計画の引き直し方。",
    datePublished: "2026-09-26",
    dateModified: "2026-09-26",
    related: ["study-time", "past-exam-strategy", "cant-continue-studying"],
  },
  {
    slug: "cant-continue-studying",
    title: "ITパスポートの勉強が続かない・参考書で挫折したときの立て直し方",
    h1: "ITパスポートの勉強が続かないときの立て直し方",
    description:
      "ITパスポートの勉強が止まる原因は、やる気よりも「内容が分からない」「何をやるか決められない」「量が多すぎる」「間違いが続く」「一度途切れた」といった具体的な詰まりです。原因別に、今日から再開する方法を解説します。",
    summary: "止まった原因を5つに分けて、それぞれの再開方法を示します。",
    datePublished: "2026-09-26",
    dateModified: "2026-09-26",
    related: ["study-plan", "it-passport-study-method", "study-time"],
  },
  {
    slug: "past-exam-strategy",
    title: "ITパスポートの過去問は何年分・いつから？目的別の解き方",
    h1: "ITパスポートの過去問はいつから・何年分解くべきか",
    description:
      "ITパスポートの過去問は、基礎を一通り学んでから分野別に始め、最後に本番と同じ100問形式へ進むのが基本です。何年分を解くかの考え方と、形式に慣れる・理解不足を見つける・弱点を特定する・本番形式に移る、の目的別の使い方を解説します。",
    summary: "始める時期、何年分を解くか、分野別→ランダム→100問の順番。",
    datePublished: "2026-09-26",
    dateModified: "2026-09-26",
    related: ["it-passport-study-method", "study-plan", "study-time"],
  },
];

export function guidePath(slug: string): string {
  return `${GUIDE_BASE_PATH}/${slug}`;
}

export function getGuide(slug: string): GuideArticle {
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) throw new Error(`Unknown guide slug: ${slug}`);
  return guide;
}
