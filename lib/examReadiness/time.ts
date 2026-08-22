import { EXAM_READINESS_CONFIG } from "@/lib/examReadiness/config";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function elapsedWholeDays(referenceTime: Date, eventTime: Date): number {
  return Math.max(0, Math.floor((referenceTime.getTime() - eventTime.getTime()) / DAY_IN_MILLISECONDS));
}

export function freshnessCoefficient(referenceTime: Date, evidenceTime: Date): number {
  const elapsedDays = elapsedWholeDays(referenceTime, evidenceTime);
  const schedule = EXAM_READINESS_CONFIG.freshnessSchedule;

  for (let index = schedule.length - 1; index >= 0; index -= 1) {
    const entry = schedule[index];
    if (elapsedDays >= entry.minimumElapsedWholeDays) return entry.coefficient;
  }

  return schedule[0].coefficient;
}

export function retentionOverdueMultiplier(args: {
  referenceTime: Date;
  dueAt: Date;
  scheduledIntervalDays: number;
}): number {
  const overdueDays = elapsedWholeDays(args.referenceTime, args.dueAt);

  if (overdueDays < 1) return EXAM_READINESS_CONFIG.retentionOverdueSchedule.fewerThanOneWholeDay;
  if (overdueDays <= args.scheduledIntervalDays) {
    return EXAM_READINESS_CONFIG.retentionOverdueSchedule.throughScheduledInterval;
  }
  return EXAM_READINESS_CONFIG.retentionOverdueSchedule.beyondScheduledInterval;
}

export function nextTimeBoundary(args: {
  calculationReferenceTime: Date;
  evidenceTimes: Date[];
  reviews: Array<{ dueAt: Date; scheduledIntervalDays: number }>;
}): Date | null {
  const referenceMilliseconds = args.calculationReferenceTime.getTime();
  const candidates: number[] = [];

  for (const evidenceTime of args.evidenceTimes) {
    for (const { minimumElapsedWholeDays } of EXAM_READINESS_CONFIG.freshnessSchedule.slice(1)) {
      const boundary = evidenceTime.getTime() + minimumElapsedWholeDays * DAY_IN_MILLISECONDS;
      if (boundary > referenceMilliseconds) candidates.push(boundary);
    }
  }

  for (const review of args.reviews) {
    const dueAt = review.dueAt.getTime();
    const boundaries = [
      dueAt,
      dueAt + DAY_IN_MILLISECONDS,
      dueAt + (review.scheduledIntervalDays + 1) * DAY_IN_MILLISECONDS,
    ];
    for (const boundary of boundaries) {
      if (boundary > referenceMilliseconds) candidates.push(boundary);
    }
  }

  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates));
}

export function snapshotDateInTokyo(calculatedAt: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(calculatedAt);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}
