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
  title: "ITパスポートガイド｜資格比較・申し込み・勉強法・試験当日",
  h1: "ITパスポート学習ガイド",
  description:
    "ITパスポートを取る意味、基本情報との違い、申し込み方法、試験当日の持ち物から、勉強法・勉強時間・計算問題・過去問対策まで。受験を迷っている人から直前の準備をする人まで、疑問別に読めるガイドです。",
  datePublished: "2026-09-26",
  dateModified: "2026-10-25",
} as const;

export const GUIDES: GuideArticle[] = [
  {
    slug: "it-passport-one-week",
    title: "ITパスポートは1週間で間に合う？直前7日間の勉強法と一夜漬けの注意点",
    h1: "ITパスポートは1週間で間に合う？直前7日間の勉強法と一夜漬けの注意点",
    description: "ITパスポートの試験まであと1週間。初学者と復習段階の人を分け、残り7日間で優先する内容を日別に整理します。過去問での現在地の確認、苦手分野の復習、時間配分、前日の準備、一夜漬けを避けるための判断まで解説します。",
    summary: "あと7日で何をするか。現在地別の優先順位と、直前1週間の具体的な配分例。",
    datePublished: "2026-10-25",
    dateModified: "2026-10-25",
    related: ["study-time", "it-passport-calculation", "it-passport-exam-day"],
  },
  {
    slug: "it-passport-retake",
    title: "ITパスポートに落ちたら？再受験前に確認する点数と勉強法",
    h1: "ITパスポートに落ちたら？再受験前に確認する点数と勉強法",
    description: "ITパスポートに落ちた後、何からやり直すかを解説。総合評価点と分野別評価点の読み方、点数パターン別の復習方針、再受験日を決める手順、問題の丸暗記を避ける復習メモの作り方をまとめます。",
    summary: "不合格後の立て直し。評価点の見方と、原因別に変える再受験の準備。",
    datePublished: "2026-10-25",
    dateModified: "2026-10-25",
    related: ["pass-rate", "it-passport-one-week", "it-passport-application"],
  },
  {
    slug: "it-passport-acronyms",
    title: "ITパスポートの英略語が覚えられない？意味とセットで覚える勉強法",
    h1: "ITパスポートの英略語が覚えられない？意味とセットで覚える勉強法",
    description: "ITパスポートの英略語・アルファベット用語が覚えられない人向けに、正式名称・日本語の意味・具体例を結び付ける覚え方を解説。KPIとKGI、CRMとSCM、SaaS・PaaS・IaaSなどの違いを表と確認問題で整理します。",
    summary: "アルファベットの丸暗記を減らす。似た略語の比較表と、短い確認問題つき。",
    datePublished: "2026-10-25",
    dateModified: "2026-10-25",
    related: ["it-passport-study-method", "it-passport-one-week", "it-passport-retake"],
  },
  {
    slug: "it-passport-pseudocode",
    title: "ITパスポートの擬似言語・アルゴリズム問題の解き方｜例題でトレース",
    h1: "ITパスポートの擬似言語・アルゴリズム問題の解き方｜例題でトレース",
    description: "ITパスポートの擬似言語やプログラミング問題が苦手な人向けに、代入・条件分岐・繰返しを解説。オリジナル例題と変数の追跡表で、トレースの手順、whileの終了条件、配列の添字の注意点を確認できます。",
    summary: "代入・if・whileを、オリジナル例題と変数の追跡表で一行ずつ確認。",
    datePublished: "2026-10-25",
    dateModified: "2026-10-25",
    related: ["it-passport-calculation", "it-passport-one-week", "past-exam-strategy"],
  },
  {
    slug: "it-passport-vs-sg",
    title: "ITパスポートと情報セキュリティマネジメントの違い｜どっちが先？",
    h1: "ITパスポートと情報セキュリティマネジメントの違い｜どっちが先？",
    description: "ITパスポートと情報セキュリティマネジメント試験を、対象者・学習内容・試験時間・問題数で比較。IT未経験者や社内の情報管理を担う人の選び方、両方取る意味、ITパスポート合格後に学ぶことを整理します。",
    summary: "広いITの基礎と、組織の情報を守る知識。目的から選ぶ2試験の比較。",
    datePublished: "2026-10-25",
    dateModified: "2026-10-25",
    related: ["it-passport-worth", "it-passport-vs-fe", "it-passport-study-method"],
  },

  {
    slug: "it-passport-worth",
    title: "ITパスポートは意味ない？取得するメリットと役立つ場面",
    h1: "ITパスポートは意味ない？取るべき人と優先度が低い人",
    description: "ITパスポートが「意味ない」と言われる理由を、学べる知識と資格だけでは証明できない実務能力に分けて解説。学生・社会人・エンジニア志望別のメリット、就職や履歴書での伝え方、受験するか迷ったときの判断方法を紹介します。",
    summary: "就職・仕事で何に役立つか。資格の強みと限界、目的別の受験判断。",
    datePublished: "2026-10-20",
    dateModified: "2026-10-20",
    related: ["it-passport-vs-fe", "it-passport-study-method", "study-time"],
  },
  {
    slug: "it-passport-vs-fe",
    title: "ITパスポートと基本情報の違い｜どっちから受けるべき？",
    h1: "ITパスポートと基本情報技術者の違いは？どっちを先に受けるか",
    description: "ITパスポートと基本情報技術者試験の違いを、対象者・試験時間・問題形式・学習内容で比較。IT未経験者、非IT職、エンジニア志望別にどちらから受けるかを整理し、ITパスポートを飛ばす場合や合格後の学習の進め方も解説します。",
    summary: "対象者・試験形式・学習内容を比較。未経験者とエンジニア志望の選び方。",
    datePublished: "2026-10-20",
    dateModified: "2026-10-20",
    related: ["it-passport-worth", "it-passport-vs-sg", "past-exam-strategy"],
  },
  {
    slug: "it-passport-application",
    title: "ITパスポートの申し込み方法｜試験日・受験料・会場の選び方",
    h1: "ITパスポートの申し込み方法は？試験日・受験料・会場選びを解説",
    description: "ITパスポートの申し込みを、利用者ID登録から会場・試験日の選択、受験料7,500円の支払い、確認票の準備まで順番に解説。変更期限、空席がないときの探し方、2026年12月28日以降の試験休止予定も確認できます。",
    summary: "申し込みの手順と受験料、変更期限。2026年末の試験休止予定にも注意。",
    datePublished: "2026-10-20",
    dateModified: "2026-10-20",
    related: ["it-passport-exam-day", "study-plan", "exam-changes-2027"],
  },
  {
    slug: "it-passport-calculation",
    title: "ITパスポートの計算問題は捨てていい？公式と例題で解説",
    h1: "ITパスポートの計算問題は捨てていい？覚えたい公式と解き方",
    description: "ITパスポートの計算問題を全部捨てる前に、割合・損益分岐点・稼働率・通信時間・2進数の基本を確認。公式だけでなく途中式つきのオリジナル例題で解き方を解説し、苦手な人の学習順序と本番で後回しにする判断も紹介します。",
    summary: "割合・損益分岐点・稼働率・通信時間・2進数を、途中式つきの例題で確認。",
    datePublished: "2026-10-20",
    dateModified: "2026-10-20",
    related: ["past-exam-strategy", "it-passport-pseudocode", "it-passport-exam-day"],
  },
  {
    slug: "it-passport-exam-day",
    title: "ITパスポート試験当日の持ち物と流れ｜到着時間・注意点",
    h1: "ITパスポート試験当日の持ち物は？受付から試験終了までの流れ",
    description: "ITパスポート試験当日に必要な本人確認書類・確認票の情報をチェックリストで整理。印刷できない場合、到着時間の考え方、時計・電卓の扱い、CBTの操作確認、120分の時間配分、試験結果の確認まで順番に解説します。",
    summary: "本人確認書類と確認票の準備、会場での流れ、時計・電卓や時間配分の注意点。",
    datePublished: "2026-10-20",
    dateModified: "2026-10-20",
    related: ["it-passport-application", "it-passport-calculation", "pass-rate"],
  },

  {
    slug: "it-passport-app",
    title: "ITパスポートアプリの選び方｜無料範囲・解説・復習を確認",
    h1: "ITパスポートの勉強アプリはどう選ぶ？無料範囲と使いやすさの確認方法",
    description: "ITパスポートの勉強アプリを探す人向けに、無料で使える範囲、解説、復習、学習計画の確認項目を整理。初心者と過去問演習中心の人の選び方、登録前に教材を試す手順、アプリだけで勉強するときの注意点を紹介します。",
    summary: "無料範囲・解説・復習・計画で選ぶ。登録前に教材と過去問を試す手順。",
    datePublished: "2026-10-10",
    dateModified: "2026-10-10",
    related: ["it-passport-study-method", "past-exam-strategy", "study-plan"],
  },
  {
    slug: "it-passport-study-method",
    title: "ITパスポートの勉強法｜未経験者が何から始めるかを6ステップで解説",
    h1: "ITパスポートの勉強法：未経験者は何から始めればいい？",
    description:
      "ITパスポートの勉強は、参考書を最初から完璧に覚えるより「全体像→理解→確認問題→過去問→苦手復習→本番形式」を小さく回すほうが進めやすくなります。IT未経験者向けに、各ステップでやることと次へ進む目安を解説します。",
    summary: "何から始めるか。全体像→理解→確認問題→過去問→苦手復習→本番形式の回し方。",
    datePublished: "2026-09-26",
    dateModified: "2026-09-26",
    related: ["it-passport-acronyms", "past-exam-strategy", "study-time"],
  },
  {
    slug: "pass-rate",
    title: "ITパスポートの合格率は50%？年度別の推移と落ちる人に多いパターン",
    h1: "ITパスポートの合格率は約50%。半分が落ちるのは難しいから？",
    description:
      "ITパスポートの合格率は近年50%前後で、令和7年度は48.6%でした。IPAの公表値をもとに年度別の推移、社会人と学生の違い、合格率50%の読み方、総合評価点と分野別評価点の合格基準（足切り）、落ちる人に多いパターンと受験前の確認方法を解説します。",
    summary: "年度別の合格率の推移、50%の読み方、分野別の足切り、落ちる人に多いパターン。",
    datePublished: "2026-10-17",
    dateModified: "2026-10-17",
    related: ["it-passport-retake", "it-passport-exam-day", "it-passport-worth"],
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
    related: ["it-passport-one-week", "it-passport-study-method", "cant-continue-studying"],
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
    related: ["it-passport-application", "past-exam-strategy", "cant-continue-studying"],
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
  {
    slug: "exam-changes-2027",
    title: "ITパスポートは2027年度から何が変わる？新試験の変更点と今受けるべきかを解説",
    h1: "ITパスポート試験は2027年度から何が変わる？",
    description:
      "ITパスポート試験は2027年度春頃から新制度に移行し、出題分野が「ビジネス」「テクノロジ」「セキュリティ・倫理」の3つに再編される予定です。試験時間120分・100問・合格基準は変わりません。IPAの公表内容をもとに新旧の違いを表で整理し、現行試験で受けるか新試験を待つかの判断材料を解説します。",
    summary: "新旧の出題分野の違い、変わらない点、いつまで現行試験を受けられるか、今受けるか待つか。",
    datePublished: "2026-09-30",
    dateModified: "2026-09-30",
    related: ["study-plan", "study-time", "it-passport-study-method"],
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
