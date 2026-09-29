import type { MetadataRoute } from "next";
import { GUIDES, GUIDE_BASE_PATH, GUIDE_INDEX, guidePath } from "@/lib/guide/guides";
import { SITE_URL } from "@/lib/guide/seo";
import {
  KAKOMON_BASE_PATH,
  getAllKakomonQuestions,
  getKakomonYears,
  kakomonYearPath,
} from "@/lib/publicPages/kakomon";
import { WORDS_BASE_PATH, wordPath } from "@/lib/publicPages/words";
import { getAllWords } from "@/lib/wordlist";

// /sitemap.xml。未ログインで読める公開ページだけを載せる（アプリ画面はログイン必須なので載せない）。
// 公開過去問・英略語はデータから組み立てるので、問題や用語を足せば自動で載る。
// lastModified は内容の更新日が分かるページ（LP・ガイド）にだけ付ける。ビルド日時を入れると
// 「毎回更新された」と誤って伝えるため、データ由来のページには付けない。

const url = (path: string) => `${SITE_URL}${path}`;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: url("/lp"), lastModified: "2026-09-26", changeFrequency: "weekly", priority: 1.0 },
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
    { url: url(KAKOMON_BASE_PATH), changeFrequency: "monthly", priority: 0.8 },
    ...getKakomonYears().map((year) => ({
      url: url(kakomonYearPath(year)),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...getAllKakomonQuestions().map((q) => ({
      url: url(q.path),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: url(WORDS_BASE_PATH), changeFrequency: "monthly", priority: 0.7 },
    ...getAllWords().map((w) => ({
      url: url(wordPath(w.id)),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: url("/legal/tokusho"), lastModified: "2026-09-26", priority: 0.2 },
    { url: url("/privacy"), lastModified: "2026-09-26", priority: 0.2 },
  ];
}
