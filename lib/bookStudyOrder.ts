import type { Topic } from "@/types/content";
import type { ReferenceBook } from "@/types/referenceBook";
import {
  canonicalTopicId,
  findReferenceLocation,
  hasUsableReferenceBook,
} from "@/lib/referenceBook";
import { stableHash } from "@/lib/stableHash";

// ============================================================================
// 参考書の章・節の並びから「新規学習の順番」を作る（純粋関数）。
//
// 責務分担:
//   - 参考書 … 新しく何を、どの順番で学ぶか（ここで決める）
//   - アプリ … いつ復習するか・何を補うか・今日どれだけやるか（learningLoop / planner 側）
//
// 粒度はユーザーの本に合わせる:
//   - 節のある章 … 節ごとに1ユニット。章に直接紐づいたトピックは章末の「章全体」ユニット
//   - 節のない章 … 章で1ユニット
// トピックの所属は findReferenceLocation（節優先→章）と同じ規則で決める。
// こうしておくと /today に出した節と、ReadingCheck の「全部」で読了にする節が一致する。
//
// 本に載っていないアプリのトピックは「補足」ユニットとして、同じ中分類→同じ分野の
// 最後のユニットの直後に差し込む（無ければ末尾）。
// ============================================================================

export type BookUnitLevel = "chapter" | "section" | "chapter_rest" | "supplement";

export type BookUnit = {
  /** ch:<章id> / sec:<節id> / chr:<章id> / sup:<アンカーのunitId> */
  unitId: string;
  level: BookUnitLevel;
  /** 本の何章目か（0始まり）。補足はアンカーの章 */
  chapterIndex: number;
  chapterId?: string;
  sectionId?: string;
  chapterTitle?: string;
  sectionTitle?: string;
  /** 表示用（「第1章 … ／ 1-1 …」「補足（本にないが試験に出る）」） */
  label: string;
  /** 学ぶ順に並んだトピック id（現行 id・カタログに実在するものだけ） */
  topicIds: string[];
  /** 紐づくトピックが無い章・節。表示はするが学習キューは止めない */
  readingOnly: boolean;
  /** 補足ユニットの差し込み先 */
  anchorUnitId?: string;
};

export type BookStudyOrder = {
  /** ユニット構成の指紋。構造変化の検知専用（本の identity には使わない） */
  structureHash: string;
  units: BookUnit[];
  /** トピック id → 学ぶ順の通し番号（0始まり。補足も含む） */
  orderIndex: Map<string, number>;
  /** トピック id → 所属ユニット id */
  unitOfTopic: Map<string, string>;
  /** 本に紐づいたトピック（現行 id） */
  mappedTopicIds: string[];
  /** 本に無く補足として差し込んだトピック */
  supplementTopicIds: string[];
  /** 本にあるがカタログに実在しない id（旧 id の読み替え後） */
  unknownTopicIds: string[];
};

export const SUPPLEMENT_UNIT_LABEL = "補足（本にないが試験に出る）";

function sectionLabel(chapterTitle: string, sectionTitle: string): string {
  return `${chapterTitle} ／ ${sectionTitle}`;
}

/**
 * 参考書から学ぶ順番を作る。使用中でない・章が無い・紐づくトピックが1件も無いときは null
 * （呼び出し側は従来のアプリ順で動く）。
 */
export function buildBookStudyOrder(
  book: ReferenceBook | null,
  topics: Topic[],
): BookStudyOrder | null {
  if (!book || !hasUsableReferenceBook(book)) return null;
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const assigned = new Set<string>();
  const unknown = new Set<string>();
  const units: BookUnit[] = [];

  // このユニットに属するトピックを、本に列挙された順で集める。
  // 所属は findReferenceLocation の結果と一致するものだけ（重複紐づけは最初の場所が勝つ）。
  const collect = (
    ids: string[] | undefined,
    belongsHere: (topicId: string) => boolean,
  ): string[] => {
    const out: string[] = [];
    for (const raw of ids ?? []) {
      const id = canonicalTopicId(raw);
      if (!topicById.has(id)) {
        unknown.add(id);
        continue;
      }
      if (assigned.has(id) || !belongsHere(id)) continue;
      assigned.add(id);
      out.push(id);
    }
    return out;
  };

  book.chapters.forEach((chapter, chapterIndex) => {
    const sections = chapter.sections ?? [];
    for (const section of sections) {
      const topicIds = collect(section.topicIds, (id) => {
        const location = findReferenceLocation(book, id);
        return location?.section?.id === section.id && location.chapter.id === chapter.id;
      });
      units.push({
        unitId: `sec:${section.id}`,
        level: "section",
        chapterIndex,
        chapterId: chapter.id,
        sectionId: section.id,
        chapterTitle: chapter.title,
        sectionTitle: section.title,
        label: sectionLabel(chapter.title, section.title),
        topicIds,
        readingOnly: topicIds.length === 0,
      });
    }
    const chapterTopicIds = collect(chapter.topicIds, (id) => {
      const location = findReferenceLocation(book, id);
      return location?.chapter.id === chapter.id && !location.section;
    });
    if (sections.length === 0) {
      units.push({
        unitId: `ch:${chapter.id}`,
        level: "chapter",
        chapterIndex,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        label: chapter.title,
        topicIds: chapterTopicIds,
        readingOnly: chapterTopicIds.length === 0,
      });
    } else if (chapterTopicIds.length > 0) {
      units.push({
        unitId: `chr:${chapter.id}`,
        level: "chapter_rest",
        chapterIndex,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        label: `${chapter.title}（章全体）`,
        topicIds: chapterTopicIds,
        readingOnly: false,
      });
    }
  });

  const mappedTopicIds = units.flatMap((unit) => unit.topicIds);
  if (mappedTopicIds.length === 0) return null;

  // --- 補足（本に無いトピック）を関連する章の直後へ ---
  const supplements = topics.filter((topic) => !assigned.has(topic.id));
  const lastUnitIndexBy = (match: (topic: Topic) => boolean): number => {
    for (let i = units.length - 1; i >= 0; i--) {
      if (units[i].topicIds.some((id) => match(topicById.get(id)!))) return i;
    }
    return -1;
  };
  const byAnchor = new Map<number, Topic[]>();
  for (const topic of supplements) {
    let anchor = lastUnitIndexBy((t) => t.category === topic.category);
    if (anchor < 0) anchor = lastUnitIndexBy((t) => t.field === topic.field);
    if (anchor < 0) anchor = units.length - 1;
    const list = byAnchor.get(anchor) ?? [];
    list.push(topic);
    byAnchor.set(anchor, list);
  }
  const ordered: BookUnit[] = [];
  units.forEach((unit, index) => {
    ordered.push(unit);
    const extra = byAnchor.get(index);
    if (!extra) return;
    const topicIds = [...extra]
      .sort(
        (a, b) =>
          b.importance - a.importance ||
          a.difficulty - b.difficulty ||
          a.id.localeCompare(b.id),
      )
      .map((topic) => topic.id);
    ordered.push({
      unitId: `sup:${unit.unitId}`,
      level: "supplement",
      chapterIndex: unit.chapterIndex,
      chapterId: unit.chapterId,
      chapterTitle: unit.chapterTitle,
      label: SUPPLEMENT_UNIT_LABEL,
      topicIds,
      readingOnly: false,
      anchorUnitId: unit.unitId,
    });
  });

  const orderIndex = new Map<string, number>();
  const unitOfTopic = new Map<string, string>();
  for (const unit of ordered) {
    for (const id of unit.topicIds) {
      orderIndex.set(id, orderIndex.size);
      unitOfTopic.set(id, unit.unitId);
    }
  }

  return {
    structureHash: stableHash(
      JSON.stringify(ordered.map((unit) => [unit.unitId, unit.topicIds])),
    ),
    units: ordered,
    orderIndex,
    unitOfTopic,
    mappedTopicIds,
    supplementTopicIds: supplements.map((topic) => topic.id),
    unknownTopicIds: Array.from(unknown).sort(),
  };
}

/** ユニットのトピックをすべて学習済みか（読むだけのユニットは常に false）。 */
export function isBookUnitLearned(unit: BookUnit, completed: ReadonlySet<string>): boolean {
  return unit.topicIds.length > 0 && unit.topicIds.every((id) => completed.has(id));
}

/**
 * いま進めているユニット = 未完了のトピックを持つ最初のユニット。すべて学習済みなら null。
 * 読むだけのユニットは位置に数えない（完了にも未完了にもしない）。
 */
export function currentBookUnit(
  order: BookStudyOrder,
  completedTopicIds: Iterable<string>,
): BookUnit | null {
  const completed = new Set(completedTopicIds);
  return (
    order.units.find(
      (unit) => unit.topicIds.length > 0 && !isBookUnitLearned(unit, completed),
    ) ?? null
  );
}

/** 本の順で次に学ぶ未完了トピックを n 件。 */
export function nextBookTopicIds(
  order: BookStudyOrder,
  completedTopicIds: Iterable<string>,
  n: number,
): string[] {
  const completed = new Set(completedTopicIds);
  const out: string[] = [];
  for (const unit of order.units) {
    for (const id of unit.topicIds) {
      if (out.length >= n) return out;
      if (!completed.has(id)) out.push(id);
    }
  }
  return out;
}
