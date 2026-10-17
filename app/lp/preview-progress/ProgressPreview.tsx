"use client";

import { useState } from "react";
import ProgressPage from "@/app/progress/page";
import { getAllTopics } from "@/lib/content";
import { computeIntegratedStatus } from "@/lib/integratedStatus";
import { applyReadingLevel, chapterTopicIds, saveReferenceBook } from "@/lib/referenceBook";
import { listReferenceBookPresets, referenceBookFromPreset } from "@/lib/referenceBookPresets";
import { initializeAppState, saveAppState } from "@/lib/storage";
import { saveCachedProgressBootstrap } from "@/lib/userSession";
import type { ReferenceBook, ReferenceReadTarget } from "@/types/referenceBook";
import type { UserAnswer } from "@/types";
import type { ExamReadinessResult } from "@/types/examReadiness";

// サンプル: かやのき先生の本を前から読み進め、2章読了・3章は途中。
// 読んだ章のトピックは学習済み・確認問題に回答済み、という「ふつうに使っている人」の状態を作る。
// テスト環境（workers.dev）の localStorage にだけ書く。本番ドメインのデータには触れない。

const DAY = 24 * 60 * 60_000;

function sampleBook(): ReferenceBook | null {
  const preset = listReferenceBookPresets()[0];
  const base = preset ? referenceBookFromPreset(preset.id) : null;
  if (!base) return null;
  const all = (from: number, to: number): ReferenceReadTarget[] =>
    base.chapters.slice(from, to).flatMap((c) =>
      (c.sections ?? []).length > 0
        ? (c.sections ?? []).map((s) => ({ chapterId: c.id, sectionId: s.id }))
        : [{ chapterId: c.id }],
    );
  const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();
  let book = applyReadingLevel(base, all(0, 2), "all", iso(6));
  const third = base.chapters[2];
  const sections = third?.sections ?? [];
  if (third && sections.length > 0) {
    const half = Math.max(1, Math.floor(sections.length / 2));
    book = applyReadingLevel(
      book,
      sections.slice(0, half).map((s) => ({ chapterId: third.id, sectionId: s.id })),
      "all",
      iso(2),
    );
    if (sections[half]) {
      book = applyReadingLevel(book, [{ chapterId: third.id, sectionId: sections[half].id }], "little", iso(1));
    }
  }
  return { ...book, updatedAt: new Date().toISOString() };
}

function seed(): void {
  const book = sampleBook();
  if (!book) return;
  saveReferenceBook(book, { touch: false });

  // 読了した2章分のトピックを学習済みにする。
  const known = new Set(getAllTopics().map((t) => t.id));
  const learned = book.chapters.slice(0, 2).flatMap(chapterTopicIds).filter((id) => known.has(id));
  const now = Date.now();
  const answers: UserAnswer[] = learned.flatMap((topicId, i) =>
    [0, 1, 2].map((q) => ({
      questionId: `${topicId}-preview-${q}`,
      topicId,
      isCorrect: (i + q) % 4 !== 0,
      answeredAt: new Date(now - (i % 14) * DAY - q * 60_000).toISOString(),
      tag: topicId,
    })),
  );
  const examDate = new Date(now + 45 * DAY).toISOString().slice(0, 10);
  const state = initializeAppState({
    itExperience: "beginner",
    dailyMinutes: "30",
    examPlan: "decided",
    confidence: 2,
    examDate,
    planStartDate: new Date(now - 14 * DAY).toISOString().slice(0, 10),
    weekdayMinutes: 30,
    holidayMinutes: 60,
  });
  state.progress.completedTopics = learned;
  state.progress.topicMastery = Object.fromEntries(learned.map((id, i) => [id, 50 + (i % 5) * 10]));
  state.progress.streakCount = 4;
  state.answers = answers;
  saveAppState(state);

  // 統合進捗（トピック到達度）と合格準備度のサンプル。
  const topics = getAllTopics().map((t) => ({ id: t.id, field: t.field, title: t.title }));
  const stages = ["basic_understood", "exam_ready", "review_needed", "basic_understood", "weak"] as const;
  const status = computeIntegratedStatus({
    statusDate: new Date(now).toISOString().slice(0, 10),
    now: new Date(now),
    daysUntilExam: 45,
    topics,
    topicProgress: learned.map((topicId, i) => ({ topicId, stage: stages[i % stages.length] })),
    wordProgress: [],
    totalWordCount: 103,
    recentReports: [],
    examLevelAttempts: [],
    referenceBookRatio: null,
    examReadiness: null,
  });
  // ?pending を付けると「判定前」の表示になる。
  const pending = new URLSearchParams(window.location.search).has("pending");
  saveCachedProgressBootstrap(null, {
    integratedStatus: status,
    examReadiness: pending ? null : sampleReadiness(new Date(now)),
    planAdjustmentProposal: null,
  });
}

function sampleReadiness(now: Date): ExamReadinessResult {
  const gate = { evaluated: true, cap: null, reasonCode: null };
  return {
    score: 58,
    band: "approaching",
    confidence: { score: 55, level: "medium", reasons: [] },
    fields: [
      { fieldId: "strategy", label: "ストラテジ", score: 64, evidenceSufficiency: 70, scoreGate: gate },
      { fieldId: "management", label: "マネジメント", score: 47, evidenceSufficiency: 60, scoreGate: gate },
      { fieldId: "technology", label: "テクノロジ", score: 58, evidenceSufficiency: 70, scoreGate: gate },
    ],
    components: { firstPerformance: 62, summativePerformance: null, topicMastery: 55, retention: 60, assessmentCoverage: 40 },
    calculation: { baseScore: 60, weakTopicPenalty: 2, preGateScore: 58, appliedCaps: [] },
    evidence: { uniqueQuestionCount: 60, weightedEvidenceUnits: 80, summativeSessionCount: 1, summativeSessionIds: [], evidenceRevision: 1 },
    weakTopics: [],
    primaryImprovement: { code: "improve_field", fieldId: "management" },
    modelVersion: "preview",
    examSchemeVersion: "ip-3field-2026",
    calculationReferenceTime: now.toISOString(),
    calculatedAt: now.toISOString(),
    validUntil: null,
    snapshotDate: now.toISOString().slice(0, 10),
  };
}

export default function ProgressPreview() {
  // 子（/progress）の effect が localStorage を読む前に、最初の描画で一度だけ書き込む。
  // サーバー側では何もしない（/progress は初回描画が読み込み画面なので hydration は一致する）。
  useState(() => {
    if (typeof window !== "undefined") seed();
    return true;
  });
  return <ProgressPage />;
}
