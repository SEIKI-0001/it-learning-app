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

/**
 * P0 mastery and question_attempts are written from the same client answer. Reconcile
 * that physical fact before time-series calculations while keeping the attempt's stable
 * database/session identity and P0's richer Review/exposure semantics.
 */
export function reconcileP0AndAttemptEvents(
  p0Events: ReadinessAnswerEvidence[],
  attemptEvents: ReadinessAnswerEvidence[],
): ReadinessAnswerEvidence[] {
  const unmatchedAttempts = [...attemptEvents];
  const reconciled = p0Events.map((p0Event) => {
    const attemptIndex = unmatchedAttempts.findIndex(
      (attemptEvent) => isEquivalentPhysicalFact(p0Event, attemptEvent),
    );
    if (attemptIndex < 0) return p0Event;
    const [attemptEvent] = unmatchedAttempts.splice(attemptIndex, 1);
    return {
      ...attemptEvent,
      kind: p0Event.kind,
      firstAttemptState: p0Event.firstAttemptState,
    };
  });
  return [...reconciled, ...unmatchedAttempts];
}

function isEquivalentPhysicalFact(
  p0Event: ReadinessAnswerEvidence,
  attemptEvent: ReadinessAnswerEvidence,
): boolean {
  const kindMatches = p0Event.kind === attemptEvent.kind
    || (attemptEvent.kind === "confirmation"
      && (p0Event.kind === "confirmation" || p0Event.kind === "review"));
  return kindMatches
    && p0Event.canonicalQuestionId === attemptEvent.canonicalQuestionId
    && p0Event.topicId === attemptEvent.topicId
    && p0Event.isCorrect === attemptEvent.isCorrect
    && Date.parse(p0Event.answeredAt) === Date.parse(attemptEvent.answeredAt);
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
