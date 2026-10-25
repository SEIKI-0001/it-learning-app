import type { MetadataRoute } from "next";
import { GUIDES, GUIDE_BASE_PATH, GUIDE_INDEX, guidePath } from "@/lib/guide/guides";
import { SITE_URL } from "@/lib/guide/seo";
import {
  KAKOMON_BASE_PATH,
  getAllKakomonQuestions,
  getKakomonYears,
  kakomonYearPath,
} from "@/lib/publicPages/kakomon";
import { KAISETSU_BASE_PATH, getKaisetsuTopics, kaisetsuPath } from "@/lib/publicPages/kaisetsu";
import { WORDS_BASE_PATH, wordPath } from "@/lib/publicPages/words";
import { getAllWords } from "@/lib/wordlist";
import { pageLastmod } from "@/lib/seo/pageLastmod";

// /sitemap.xml。未ログインで読める公開ページだけを載せる（アプリ画面はログイン必須なので載せない）。
// テーマ別解説・公開過去問・英略語はデータから組み立てるので、問題や用語を足せば自動で載る。
// lastModified は内容の更新日が分かるページにだけ付ける。ビルド日時を入れると
// 「毎回更新された」と誤って伝えるため使わない。
// データ由来のページ（過去問・英略語・解説）は、そのページの本体が実際に変わった日を
// lib/seo/pageLastmod から引く。全ページに同じ日付を付けると「何も変わっていないのに全部更新」と
// 伝えてしまうため、共通の作りを変えただけでは日付を動かさない。

const url = (path: string) => `${SITE_URL}${path}`;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: url("/lp"), lastModified: "2026-10-10", changeFrequency: "weekly", priority: 1.0 },
    {
      url: url(GUIDE_BASE_PATH),
      lastModified: GUIDE_INDEX.dateModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...GUIDES.map((g) => ({
      url: url(guidePath(g.slug)),
      lastModified: g.dateModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: url(KAISETSU_BASE_PATH), changeFrequency: "monthly", priority: 0.8 },
    ...getKaisetsuTopics().map((t) => ({
      url: url(kaisetsuPath(t.id)),
      lastModified: pageLastmod(kaisetsuPath(t.id)),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: url(KAKOMON_BASE_PATH), changeFrequency: "monthly", priority: 0.8 },
    ...getKakomonYears().map((year) => ({
      url: url(kakomonYearPath(year)),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...getAllKakomonQuestions().map((q) => ({
      url: url(q.path),
      lastModified: pageLastmod(q.path),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: url(WORDS_BASE_PATH), changeFrequency: "monthly", priority: 0.7 },
    ...getAllWords().map((w) => ({
      url: url(wordPath(w.id)),
      lastModified: pageLastmod(wordPath(w.id)),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: url("/legal/tokusho"), lastModified: "2026-09-26", priority: 0.2 },
    { url: url("/privacy"), lastModified: "2026-09-26", priority: 0.2 },
    { url: url("/terms"), lastModified: "2026-10-04", priority: 0.2 },
  ];
}
