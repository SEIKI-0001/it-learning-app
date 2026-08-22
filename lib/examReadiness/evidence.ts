import { EXAM_READINESS_CONFIG } from "@/lib/examReadiness/config";
import { freshnessCoefficient } from "@/lib/examReadiness/time";
import type {
  FirstAttemptState,
  ReadinessAnswerEvidence,
  ReadinessEvidenceKind,
} from "@/types/examReadiness";

type LegacyEvidenceKind = "summary_exam" | "mock_exam" | "past_exam";
type LegacyFirstAttemptEvidence = {
  exposureState?: FirstAttemptState;
  isFirstSeen?: boolean;
};

export type StrongestEvidence = {
  event: ReadinessAnswerEvidence;
  strength: number;
};

const NORMALIZED_EVIDENCE_KIND_BY_LEGACY_KIND: Record<LegacyEvidenceKind, ReadinessEvidenceKind> = {
  summary_exam: "summary",
  mock_exam: "mock",
  past_exam: "official_past",
};

export function normalizeEvidenceKind(
  kind: ReadinessEvidenceKind | LegacyEvidenceKind,
): ReadinessEvidenceKind {
  return NORMALIZED_EVIDENCE_KIND_BY_LEGACY_KIND[kind as LegacyEvidenceKind]
    ?? kind as ReadinessEvidenceKind;
}

export function normalizeFirstAttemptState(
  evidence: LegacyFirstAttemptEvidence,
): FirstAttemptState {
  if (evidence.exposureState !== undefined) return evidence.exposureState;
  return evidence.isFirstSeen === true ? "first" : "unknown";
}

export function dedupeAnswerEvents(
  events: ReadinessAnswerEvidence[],
): ReadinessAnswerEvidence[] {
  const answerIds = new Set<string>();
  const idempotencyKeys = new Set<string>();

  return events.filter((event) => {
    const isDuplicate = (event.answerId !== null && answerIds.has(event.answerId))
      || idempotencyKeys.has(event.idempotencyKey);

    if (event.answerId !== null) answerIds.add(event.answerId);
    idempotencyKeys.add(event.idempotencyKey);
    return !isDuplicate;
  });
}

export function strongestEvidenceByCanonicalQuestion(
  events: ReadinessAnswerEvidence[],
  calculationReferenceTime: Date,
): Map<string, StrongestEvidence> {
  return strongestEvidenceBy(events, calculationReferenceTime, (event) => event.canonicalQuestionId);
}

export function strongestEvidenceByTopic(
  events: ReadinessAnswerEvidence[],
  calculationReferenceTime: Date,
): Map<string, StrongestEvidence> {
  return strongestEvidenceBy(events, calculationReferenceTime, (event) => event.topicId);
}

function strongestEvidenceBy(
  events: ReadinessAnswerEvidence[],
  calculationReferenceTime: Date,
  groupKey: (event: ReadinessAnswerEvidence) => string,
): Map<string, StrongestEvidence> {
  const strongestByKey = new Map<string, StrongestEvidence>();

  for (const event of events) {
    const candidate = { event, strength: evidenceStrength(event, calculationReferenceTime) };
    const key = groupKey(event);
    const current = strongestByKey.get(key);

    if (current === undefined || isStrongerEvidence(candidate, current)) {
      strongestByKey.set(key, candidate);
    }
  }

  return strongestByKey;
}

function evidenceStrength(
  event: ReadinessAnswerEvidence,
  calculationReferenceTime: Date,
): number {
  return EXAM_READINESS_CONFIG.coverageEvidenceCoefficients[event.kind]
    * freshnessCoefficient(calculationReferenceTime, new Date(event.answeredAt));
}

function isStrongerEvidence(candidate: StrongestEvidence, current: StrongestEvidence): boolean {
  if (candidate.strength !== current.strength) return candidate.strength > current.strength;

  const candidateTime = new Date(candidate.event.answeredAt).getTime();
  const currentTime = new Date(current.event.answeredAt).getTime();
  if (candidateTime !== currentTime) return candidateTime > currentTime;

  return candidate.event.idempotencyKey < current.event.idempotencyKey;
}
