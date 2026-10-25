// サイトマップの lastmod（ページごとの更新日）。
//
// 中身が実際に変わったページにだけ新しい日付を付けるため、ページごとの「本体の指紋」と日付を
// data/seo/page-lastmod.json に持つ。指紋は過去問=問題・選択肢・正解・解説・論点、
// 英略語=用語データ、解説=トピックのデータとそのトピック専用の解説コンポーネントのソースから作る
// （test/seoPageLastmod.test.ts）。共通の枠（CTA・ナビ・パンくず・構造化データ）は含めないので、
// 全ページ共通の作りを変えても日付は動かない。
//
// 本体を変えたら `npm run seo:lastmod` を実行する。指紋が変わったページだけ今日の日付になる。
// 実行し忘れるとテストが落ちる。
import manifest from "@/data/seo/page-lastmod.json";

export type PageLastmodEntry = { date: string; hash: string };
export type PageLastmodManifest = Record<string, PageLastmodEntry>;

const PAGES = manifest as PageLastmodManifest;

/** そのパスの本体を最後に変えた日（YYYY-MM-DD）。記録が無ければ undefined（lastmod を付けない）。 */
export function pageLastmod(path: string): string | undefined {
  return PAGES[path]?.date;
}
