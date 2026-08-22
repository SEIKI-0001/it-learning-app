import { describe, expect, it } from "vitest";

import {
  dedupeAnswerEvents,
  normalizeEvidenceKind,
  normalizeFirstAttemptState,
  strongestEvidenceByCanonicalQuestion,
  strongestEvidenceByTopic,
} from "@/lib/examReadiness/evidence";
import type { ReadinessAnswerEvidence } from "@/types/examReadiness";

const referenceTime = new Date("2026-08-22T00:00:00.000Z");

function evidence(overrides: Partial<ReadinessAnswerEvidence> = {}): ReadinessAnswerEvidence {
  return {
    answerId: "answer-1",
    idempotencyKey: "event-1",
    canonicalQuestionId: "question-1",
    topicId: "topic-1",
    fieldId: "technology",
    kind: "confirmation",
    isCorrect: true,
    firstAttemptState: "first",
    answeredAt: "2026-08-22T00:00:00.000Z",
    ...overrides,
  };
}

describe("dedupeAnswerEvents", () => {
  it("removes retransmitted copies by answer ID before considering their idempotency keys", () => {
    const original = evidence({ answerId: "answer-duplicate", idempotencyKey: "event-first" });
    const retransmission = evidence({ answerId: "answer-duplicate", idempotencyKey: "event-second" });

    expect(dedupeAnswerEvents([original, retransmission])).toEqual([original]);
  });

  it("removes idempotency-key retransmissions when no answer ID exists", () => {
    const original = evidence({ answerId: null, idempotencyKey: "event-duplicate" });
    const retransmission = evidence({ answerId: null, idempotencyKey: "event-duplicate", isCorrect: false });

    expect(dedupeAnswerEvents([original, retransmission])).toEqual([original]);
  });

  it("keeps real repeated answers as separate chronological events", () => {
    const firstAttempt = evidence({
      answerId: "answer-1",
      idempotencyKey: "event-1",
      answeredAt: "2026-08-20T00:00:00.000Z",
    });
    const reviewAttempt = evidence({
      answerId: "answer-2",
      idempotencyKey: "event-2",
      kind: "review",
      firstAttemptState: "seen",
      answeredAt: "2026-08-21T00:00:00.000Z",
    });

    expect(dedupeAnswerEvents([firstAttempt, reviewAttempt])).toEqual([firstAttempt, reviewAttempt]);
  });
});

describe("strongest evidence projections", () => {
  it("keeps the largest evidence coefficient times freshness for each canonical question without mutating history", () => {
    const history = dedupeAnswerEvents([
      evidence({ answerId: "answer-confirmation", idempotencyKey: "event-confirmation", kind: "confirmation" }),
      evidence({ answerId: "answer-review", idempotencyKey: "event-review", kind: "review" }),
      evidence({ answerId: "answer-mock", idempotencyKey: "event-mock", kind: "mock" }),
      evidence({ answerId: "answer-official", idempotencyKey: "event-official", kind: "official_past" }),
    ]);
    const originalHistory = [...history];

    const strongest = strongestEvidenceByCanonicalQuestion(history, referenceTime);

    expect(strongest.get("question-1")).toEqual({ event: history[3], strength: 1 });
    expect(history).toEqual(originalHistory);
    expect(history).toHaveLength(4);
  });

  it("uses the strongest evidence once for each topic projection", () => {
    const weaker = evidence({ answerId: "answer-weak", kind: "confirmation" });
    const stronger = evidence({
      answerId: "answer-strong",
      idempotencyKey: "event-strong",
      canonicalQuestionId: "question-2",
      kind: "review",
    });

    expect(strongestEvidenceByTopic([weaker, stronger], referenceTime).get("topic-1")).toEqual({
      event: stronger,
      strength: 0.7,
    });
  });

  it("prefers greater strength before later answer time", () => {
    const strongerEarlier = evidence({ answerId: "answer-strong", kind: "review", answeredAt: "2026-08-20T00:00:00.000Z" });
    const weakerLater = evidence({ answerId: "answer-weak", idempotencyKey: "event-weak", kind: "confirmation", answeredAt: "2026-08-22T00:00:00.000Z" });

    expect(strongestEvidenceByCanonicalQuestion([weakerLater, strongerEarlier], referenceTime).get("question-1")?.event)
      .toBe(strongerEarlier);
  });

  it("breaks equal-strength ties with the later answer time", () => {
    const earlier = evidence({ answerId: "answer-earlier", idempotencyKey: "event-earlier", answeredAt: "2026-08-21T00:00:00.000Z" });
    const later = evidence({ answerId: "answer-later", idempotencyKey: "event-later", answeredAt: "2026-08-22T00:00:00.000Z" });

    expect(strongestEvidenceByCanonicalQuestion([later, earlier], referenceTime).get("question-1")?.event)
      .toBe(later);
  });

  it("breaks fully equal ties with the lexical idempotency key", () => {
    const lexicalLater = evidence({ answerId: "answer-z", idempotencyKey: "event-z" });
    const lexicalEarlier = evidence({ answerId: "answer-a", idempotencyKey: "event-a" });

    expect(strongestEvidenceByCanonicalQuestion([lexicalLater, lexicalEarlier], referenceTime).get("question-1")?.event)
      .toBe(lexicalEarlier);
  });
});

describe("source and first-attempt normalization", () => {
  it.each([
    ["confirmation", "confirmation"],
    ["review", "review"],
    ["checkpoint", "checkpoint"],
    ["summary_exam", "summary"],
    ["mock_exam", "mock"],
    ["past_exam", "official_past"],
  ] as const)("normalizes the %s source", (source, expected) => {
    expect(normalizeEvidenceKind(source)).toBe(expected);
  });

  it("preserves explicit unknown and maps legacy false first-seen state to unknown", () => {
    expect(normalizeFirstAttemptState({ exposureState: "unknown", isFirstSeen: false })).toBe("unknown");
    expect(normalizeFirstAttemptState({ isFirstSeen: true })).toBe("first");
    expect(normalizeFirstAttemptState({ isFirstSeen: false })).toBe("unknown");
  });
});
