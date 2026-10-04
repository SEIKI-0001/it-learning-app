import type { Topic, TopicField } from "@/types/content";
import type { BookStudyOrder } from "@/lib/bookStudyOrder";

// ============================================================================
// 参考書が「学習順の背骨」として使える品質かを判定する（純粋関数）。
//
// 紐づけが少ない本で参考書順にすると、大半のトピックが「補足」になり、
// 本の順に進むという約束が成り立たない。そこで紐づけの量と偏りを数値で確かめ、
// 基準を満たす本だけを参考書順（Book mode）の対象にする。
// ユーザーが作った本の章立ては検証できないので、構造の真偽ではなく指標で判定する。
// ============================================================================

export const BOOK_QUALITY_THRESHOLDS = {
  /** 全トピックのうち本に紐づいている割合 */
  minMappedRatio: 0.6,
  /** 重要度3（最重要）のトピックのうち本に紐づいている割合 */
  minImportantMappedRatio: 0.7,
  /** 各分野で本に紐づいているトピックの最低数 */
  minMappedPerField: 1,
  /** トピックを持つユニット（章・節）の最低数 */
  minUnits: 3,
} as const;

export type BookQualityFailure =
  | "mapped_ratio"
  | "important_mapped_ratio"
  | "field_coverage"
  | "unit_count";

export type BookQuality = {
  eligible: boolean;
  failures: BookQualityFailure[];
  catalogSize: number;
  mappedCount: number;
  mappedRatio: number;
  importantTotal: number;
  importantMapped: number;
  importantMappedRatio: number;
  supplementCount: number;
  supplementRatio: number;
  mappedByField: Record<TopicField, number>;
  unknownIdCount: number;
  /** トピックを持つ章・節ユニット数（補足は含まない） */
  unitCount: number;
  /** 紐づくトピックが無い章・節ユニット数 */
  readingOnlyUnitCount: number;
};

const IMPORTANT = 3;

/** order が null（紐づけ0件・本なし）のときは不適格として返す。 */
export function assessBookQuality(
  order: BookStudyOrder | null,
  topics: Topic[],
): BookQuality {
  const catalogSize = topics.length;
  const mapped = new Set(order?.mappedTopicIds ?? []);
  const important = topics.filter((topic) => topic.importance >= IMPORTANT);
  const importantMapped = important.filter((topic) => mapped.has(topic.id)).length;
  const mappedByField: Record<TopicField, number> = {
    technology: 0,
    management: 0,
    strategy: 0,
  };
  for (const topic of topics) {
    if (mapped.has(topic.id)) mappedByField[topic.field] += 1;
  }
  const bookUnits = (order?.units ?? []).filter((unit) => unit.level !== "supplement");
  const unitCount = bookUnits.filter((unit) => unit.topicIds.length > 0).length;
  const readingOnlyUnitCount = bookUnits.filter((unit) => unit.readingOnly).length;

  const mappedRatio = catalogSize > 0 ? mapped.size / catalogSize : 0;
  const importantMappedRatio = important.length > 0 ? importantMapped / important.length : 0;
  const supplementCount = order?.supplementTopicIds.length ?? catalogSize;

  const failures: BookQualityFailure[] = [];
  const t = BOOK_QUALITY_THRESHOLDS;
  if (mappedRatio < t.minMappedRatio) failures.push("mapped_ratio");
  if (importantMappedRatio < t.minImportantMappedRatio) failures.push("important_mapped_ratio");
  if (Object.values(mappedByField).some((count) => count < t.minMappedPerField)) {
    failures.push("field_coverage");
  }
  if (unitCount < t.minUnits) failures.push("unit_count");

  return {
    eligible: order !== null && failures.length === 0,
    failures: order === null && failures.length === 0 ? ["mapped_ratio"] : failures,
    catalogSize,
    mappedCount: mapped.size,
    mappedRatio,
    importantTotal: important.length,
    importantMapped,
    importantMappedRatio,
    supplementCount,
    supplementRatio: catalogSize > 0 ? supplementCount / catalogSize : 0,
    mappedByField,
    unknownIdCount: order?.unknownTopicIds.length ?? 0,
    unitCount,
    readingOnlyUnitCount,
  };
}

/** 不適格の理由をユーザー向けの言葉にする。 */
export const BOOK_QUALITY_FAILURE_LABELS: Record<BookQualityFailure, string> = {
  mapped_ratio: "アプリの学習テーマと結びついている章・節がまだ少ないです",
  important_mapped_ratio: "試験でよく出るテーマの多くが、まだ本の章・節と結びついていません",
  field_coverage: "3分野（テクノロジ・マネジメント・ストラテジ）のどれかが本と結びついていません",
  unit_count: "章・節の登録がまだ少ないです",
};
