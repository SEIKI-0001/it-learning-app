import { GUIDES, GUIDE_BASE_PATH, guidePath } from "@/lib/guide/guides";
import { SERVICE_NAME, SITE_URL } from "@/lib/guide/seo";
import { KAISETSU_BASE_PATH, KAISETSU_FIELD_ORDER, getKaisetsuTopicsByField, kaisetsuPath } from "@/lib/publicPages/kaisetsu";
import { KAKOMON_BASE_PATH, getAllKakomonQuestions, getKakomonYears, kakomonYearLabel, kakomonYearPath } from "@/lib/publicPages/kakomon";
import { WORDS_BASE_PATH } from "@/lib/publicPages/words";
import { FIELD_LABELS } from "@/types/content";

// /llms.txt（https://llmstxt.org の形式）。AI検索・AIアシスタントに、このサイトが何で、
// どの公開ページを読めばよいかを Markdown で伝える。sitemap と同じく公開ページだけを載せ、
// 記事・テーマ・過去問のデータから組み立てるので、ページを足せば自動で載る。

const abs = (path: string) => `${SITE_URL}${path}`;

export function buildLlmsTxt(): string {
  const years = getKakomonYears();
  const kakomonCount = getAllKakomonQuestions().length;

  const lines: string[] = [
    `# ${SERVICE_NAME}`,
    "",
    "> ITパスポート試験（IPA実施の国家試験）の合格を目指す人のための学習サービス。試験日から逆算して毎日の学習内容を案内し、93テーマの解説、IPAの公式過去問、英略語集を未ログインで公開しています。",
    "",
    "- 対象: ITパスポート試験の受験者（IT未経験者を含む）",
    "- 公開ページの教材・過去問解説は、このサービスが独自に作成したものです。過去問の問題文と選択肢はIPAの公開問題に基づきます。",
    "- 試験制度の最新情報は、IPA（https://www.ipa.go.jp/shiken/kubun/ip.html）の発表を優先してください。",
    "",
    "## 学習ガイド",
    "",
    `- [学習ガイド一覧](${abs(GUIDE_BASE_PATH)}): 勉強法・勉強時間・学習計画・過去問の使い方・新試験の変更点`,
    ...GUIDES.map((g) => `- [${g.h1}](${abs(guidePath(g.slug))}): ${g.summary}`),
    "",
    "## テーマ別解説",
    "",
    `- [テーマ別解説一覧](${abs(KAISETSU_BASE_PATH)}): 頻出テーマを分野別に図解とたとえで解説`,
  ];

  for (const field of KAISETSU_FIELD_ORDER) {
    const topics = getKaisetsuTopicsByField(field).flatMap((g) => g.topics);
    lines.push("", `### ${FIELD_LABELS[field]}`, "");
    for (const t of topics) lines.push(`- [${t.title}](${abs(kaisetsuPath(t.id))}): ${t.summary}`);
  }

  lines.push(
    "",
    "## 公式過去問",
    "",
    `- [ITパスポート過去問一覧](${abs(KAKOMON_BASE_PATH)}): IPA公開問題 ${years.length}年度分・${kakomonCount}問を1問ずつ解説`,
    ...years.map((y) => `- [${kakomonYearLabel(y)}](${abs(kakomonYearPath(y))})`),
    "",
    "## 英略語",
    "",
    `- [ITパスポートの英略語一覧](${abs(WORDS_BASE_PATH)}): 試験に出る英略語の意味と関連する過去問`,
    "",
    "## Optional",
    "",
    `- [ITパスポートの勉強アプリ（サービス紹介）](${abs("/lp")}): 機能・料金・よくある質問`,
    "",
  );

  return lines.join("\n");
}
