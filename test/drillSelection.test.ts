import { describe, expect, it } from "vitest";
import type { TopicField } from "@/types/content";
import { getPublishedQuestions, getQuestionById } from "@/lib/questionBank";
import {
  mixedFieldCounts,
  selectDrillQuestionIds,
  type DrillIndexEntry,
  type DrillSelectionInput,
} from "@/lib/pastExam/drillSelection";

// 実際の問題バンク（公開済みの公式過去問）から作った索引で確かめる。
const index: DrillIndexEntry[] = getPublishedQuestions()
  .filter((q) => q.origin === "official_past" && q.official)
  .map((q) => ({ id: q.id, field: q.official!.examField as TopicField, topicId: q.primaryTopicId }));

function select(patch: Partial<DrillSelectionInput>): string[] {
  return selectDrillQuestionIds({
    stage: "random",
    index,
    count: 12,
    answeredIds: new Set(),
    wrongIds: new Set(),
    weakTopicIds: new Set(),
    seed: "seed",
    ...patch,
  });
}

const fieldOf = (id: string) => getQuestionById(id)?.official?.examField;

describe("公式過去問の部分演習の出題", () => {
  it("索引は問題バンクの公開済み公式過去問そのもの（データを複製しない）", () => {
    expect(index.length).toBeGreaterThanOrEqual(500);
    expect(new Set(index.map((e) => e.id)).size).toBe(index.length);
  });

  it("分野別演習は対象分野の問題だけを出す", () => {
    for (const field of ["technology", "management", "strategy"] as const) {
      const ids = select({ stage: "field-drill", field, count: 15 });
      expect(ids).toHaveLength(15);
      expect(ids.every((id) => fieldOf(id) === field)).toBe(true);
    }
    expect(select({ stage: "field-drill", field: undefined })).toEqual([]);
  });

  it("ランダム演習は複数分野から出題する", () => {
    const ids = select({ stage: "random", count: 25 });
    expect(ids).toHaveLength(25);
    expect(new Set(ids.map(fieldOf)).size).toBeGreaterThan(1);
  });

  it("3分野混合は公式の構成比で3分野すべてから出す", () => {
    expect(mixedFieldCounts(15)).toEqual({ strategy: 5, management: 3, technology: 7 });
    expect(mixedFieldCounts(20)).toEqual({ strategy: 7, management: 4, technology: 9 });
    const ids = select({ stage: "mixed", count: 15 });
    const counts = ids.reduce<Record<string, number>>((acc, id) => {
      const f = fieldOf(id)!;
      acc[f] = (acc[f] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ strategy: 5, management: 3, technology: 7 });
  });

  it("未出題の問題を優先し、その中でも弱点トピックを先に出す", () => {
    const tech = index.filter((e) => e.field === "technology");
    const answeredIds = new Set(tech.slice(0, tech.length - 5).map((e) => e.id));
    const unseen = tech.slice(tech.length - 5);
    const weakTopic = unseen[4].topicId;
    const ids = select({
      stage: "field-drill",
      field: "technology",
      count: 8,
      answeredIds,
      weakTopicIds: new Set([weakTopic]),
    });
    expect(ids.slice(0, 5).sort()).toEqual(unseen.map((e) => e.id).sort());
    expect(index.find((e) => e.id === ids[0])?.topicId).toBe(weakTopic);
  });

  it("未出題が足りなければ、前に間違えた問題を正解済みより先に補う", () => {
    const tech = index.filter((e) => e.field === "technology");
    const answeredIds = new Set(tech.map((e) => e.id));
    const wrong = tech.slice(10, 13).map((e) => e.id);
    const ids = select({ stage: "field-drill", field: "technology", count: 3, answeredIds, wrongIds: new Set(wrong) });
    expect(ids.sort()).toEqual([...wrong].sort());
  });

  it("誤答の解き直しは渡された問題だけ（索引に無い ID は落とす）", () => {
    const ids = select({
      stage: "retry-wrong",
      ids: ["ipa-it-passport-2026-q010", "not-a-question", "ipa-it-passport-2026-q010", "ipa-it-passport-2025-q070"],
    });
    expect(ids).toEqual(["ipa-it-passport-2026-q010", "ipa-it-passport-2025-q070"]);
  });

  it("同じシードなら同じ問題（再読み込みで入れ替わらない）", () => {
    expect(select({ seed: "a" })).toEqual(select({ seed: "a" }));
    expect(select({ seed: "a" })).not.toEqual(select({ seed: "b" }));
  });
});
