import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  isMissingColumnError,
  questionAttemptToRow,
  questionAttemptToRowV2,
  type QuestionAttemptInput,
} from "@/lib/dbMappers";

// ============================================================================
// question_attempts の新旧形式と、マイグレーション未適用時の後方互換の検証。
// ============================================================================

const LEGACY_COLUMNS = [
  "user_id",
  "question_id",
  "question_type",
  "topic_id",
  "selected_answer",
  "is_correct",
  "mistake_reason",
  "answered_at",
  "time_spent_seconds",
  "source_task_id",
];

const NEW_COLUMNS = [
  "question_origin",
  "question_version",
  "exam_year",
  "attempt_mode",
  "official_exam_field",
  "attempt_group_id",
];

const OFFICIAL_ATTEMPT: QuestionAttemptInput = {
  questionId: "ipa-it-passport-2026-q001",
  questionType: "official_past",
  topicId: "strat-intellectual-property",
  selectedAnswer: "A",
  isCorrect: true,
  answeredAt: "2026-07-26T10:00:00.000Z",
  timeSpentSeconds: 42,
  questionOrigin: "official_past",
  questionVersion: 2,
  examYear: 2026,
  attemptMode: "exam",
  officialExamField: "strategy",
  attemptGroupId: "group-1",
};

const LEGACY_ATTEMPT: QuestionAttemptInput = {
  questionId: "check-1",
  questionType: "topic_quiz",
  topicId: "tech-security-cia",
  selectedAnswer: "B",
  isCorrect: false,
  answeredAt: "2026-07-26T10:00:00.000Z",
};

describe("旧形式（questionAttemptToRow）", () => {
  it("従来の列だけを持ち、新列は付けない", () => {
    const row = questionAttemptToRow("user-1", OFFICIAL_ATTEMPT);
    expect(Object.keys(row).sort()).toEqual([...LEGACY_COLUMNS].sort());
    for (const column of NEW_COLUMNS) {
      expect(row).not.toHaveProperty(column);
    }
  });

  it("既存の保存経路の出力が変わっていない", () => {
    expect(questionAttemptToRow("user-1", LEGACY_ATTEMPT)).toEqual({
      user_id: "user-1",
      question_id: "check-1",
      question_type: "topic_quiz",
      topic_id: "tech-security-cia",
      selected_answer: "B",
      is_correct: false,
      mistake_reason: null,
      answered_at: "2026-07-26T10:00:00.000Z",
      time_spent_seconds: null,
      source_task_id: null,
    });
  });
});

describe("新形式（questionAttemptToRowV2）", () => {
  it("旧列に加えて新列を持つ", () => {
    const row = questionAttemptToRowV2("user-1", OFFICIAL_ATTEMPT);
    expect(Object.keys(row).sort()).toEqual([...LEGACY_COLUMNS, ...NEW_COLUMNS].sort());
  });

  it("公式過去問の付加情報が入る", () => {
    const row = questionAttemptToRowV2("user-1", OFFICIAL_ATTEMPT);
    expect(row.question_origin).toBe("official_past");
    expect(row.question_version).toBe(2);
    expect(row.exam_year).toBe(2026);
    expect(row.attempt_mode).toBe("exam");
    expect(row.official_exam_field).toBe("strategy");
    expect(row.attempt_group_id).toBe("group-1");
  });

  it("旧経路では新列がすべて null になる（既存データと同じ意味を保つ）", () => {
    const row = questionAttemptToRowV2("user-1", LEGACY_ATTEMPT);
    for (const column of NEW_COLUMNS) {
      expect(row[column as keyof typeof row]).toBeNull();
    }
  });

  it("旧列の値は旧形式と完全に一致する", () => {
    const legacy = questionAttemptToRow("user-1", OFFICIAL_ATTEMPT);
    const v2 = questionAttemptToRowV2("user-1", OFFICIAL_ATTEMPT);
    for (const column of LEGACY_COLUMNS) {
      expect(v2[column as keyof typeof v2]).toEqual(legacy[column as keyof typeof legacy]);
    }
  });
});

describe("マイグレーション未適用の検出", () => {
  it("列が無いエラーを検出する", () => {
    expect(isMissingColumnError({ code: "42703", message: "" })).toBe(true);
    expect(isMissingColumnError({ code: "PGRST204", message: "" })).toBe(true);
    expect(
      isMissingColumnError({
        code: null,
        message: 'column "attempt_mode" does not exist',
      }),
    ).toBe(true);
    expect(
      isMissingColumnError({
        code: null,
        message: "Could not find the 'exam_year' column of 'question_attempts'",
      }),
    ).toBe(true);
  });

  it("それ以外のエラーは旧形式へ落とさない", () => {
    expect(isMissingColumnError(null)).toBe(false);
    expect(isMissingColumnError({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingColumnError({ code: "42501", message: "permission denied" })).toBe(
      false,
    );
  });
});

describe("マイグレーションSQL", () => {
  const sql = readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260726_official_past_exam_attempts.sql"),
    "utf8",
  );

  it("すべて add column if not exists の加算のみ", () => {
    for (const column of NEW_COLUMNS) {
      expect(sql).toContain(`add column if not exists ${column}`);
    }
  });

  it("既存の列やデータを壊す操作を含まない", () => {
    expect(sql).not.toMatch(/drop\s+(table|column|index)/i);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql).not.toMatch(/alter\s+column/i);
    // not null 制約を新たに付けると既存行が違反するので入れない。
    expect(sql).not.toMatch(/add column if not exists \w+\s+\w+\s+not null/i);
  });

  it("schema.sql にも同じ列が反映されている", () => {
    const schema = readFileSync(path.join(process.cwd(), "supabase/schema.sql"), "utf8");
    for (const column of NEW_COLUMNS) {
      expect(schema).toContain(column);
    }
    expect(schema).toContain("official_past");
  });
});
