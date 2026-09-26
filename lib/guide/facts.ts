import type { StudyPhaseId } from "@/types/plan";
import type { TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import { getAllTopics } from "@/lib/content";
import {
  STUDY_PHASES,
  computeOnTrack,
  determineExpectedPhase,
  requiredMinutesEstimate,
  totalAvailableMinutes,
} from "@/lib/studyPlanner";
import {
  OFFICIAL_EXAM_QUESTION_COUNT,
  getPlayableOfficialExamYears,
} from "@/lib/questionBank";
import { formatJapaneseExamYear } from "@/lib/pastExam/yearLabel";
import { KAKOMON_FIELD_DRILL_TARGET } from "@/lib/pastExam/kakomonRules";
import { KAKOMON_EARLY_RULE } from "@/lib/kakomonAccess";
import { COMEBACK_MIN_DAYS_AWAY, COMEBACK_TARGET_MINUTES } from "@/lib/comebackMission";
import { STUDY_AMOUNT_OPTIONS } from "@/lib/studyAmount";
import { REVIEW_INTERVAL_DAYS } from "@/lib/learningLoop";
import type { UserProfile, UserProgress } from "@/types";

// ============================================================================
// ガイド本文に載せる「このサービスの事実」を、教材データと学習ロジックから導出する。
// 収録数や配分を本文へベタ書きすると、データ追加のたびに記事だけ古くなるため、
// 数字はここ経由で読む（ビルド時に評価されるサーバー専用モジュール）。
// ============================================================================

const FIELD_ORDER: TopicField[] = ["strategy", "management", "technology"];

function buildContentFacts() {
  const topics = getAllTopics();
  const byField = FIELD_ORDER.map((field) => {
    const list = topics.filter((t) => t.field === field);
    return {
      field,
      label: FIELD_LABELS[field],
      topicCount: list.length,
      inputMinutes: list.reduce((s, t) => s + t.estimatedMinutes, 0),
    };
  });
  const emptyProgress = { completedTopics: [], topicMastery: {} } as unknown as UserProgress;
  const years = getPlayableOfficialExamYears();
  const oldest = years[years.length - 1];
  const newest = years[0];

  return {
    topicCount: topics.length,
    byField,
    checkQuestionCount: topics.reduce((s, t) => s + (t.checkQuestions?.length ?? 0), 0),
    /** 全トピックを新規に学ぶときのインプット時間（分）。 */
    inputMinutes: topics.reduce((s, t) => s + t.estimatedMinutes, 0),
    /** 計画エンジンが「まっさらな状態」で見積もる必要学習量（分）。 */
    plannerRequiredMinutes: requiredMinutesEstimate(topics, emptyProgress),
    /** 必要量の内訳のうち、確認問題の回し直し（全トピック×5分×2周）。 */
    reviewMinutes: topics.length * 5 * 2,
    /** 必要量の内訳のうち、過去問演習の固定枠（20分×30コマ）。 */
    kakomonMinutes: 20 * 30,
    officialYears: years,
    officialYearRange:
      years.length > 0
        ? `${formatJapaneseExamYear(oldest).replace("年度", "")}〜${formatJapaneseExamYear(newest).replace("令和", "")}`
        : "",
    officialQuestionCount: years.length * OFFICIAL_EXAM_QUESTION_COUNT,
    officialExamQuestionCount: OFFICIAL_EXAM_QUESTION_COUNT,
    fieldDrillTarget: KAKOMON_FIELD_DRILL_TARGET,
    kakomonEarlyRule: KAKOMON_EARLY_RULE,
    comebackDaysAway: COMEBACK_MIN_DAYS_AWAY,
    comebackMinutes: COMEBACK_TARGET_MINUTES,
    studyAmountOptions: [...STUDY_AMOUNT_OPTIONS],
    reviewIntervalDays: [...REVIEW_INTERVAL_DAYS],
  };
}

export const GUIDE_FACTS = buildContentFacts();

export function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

// ---------------------------------------------------------------------------
// 試験日から逆算した配分例（determineExpectedPhase をそのまま使う）
// ---------------------------------------------------------------------------

export type PhaseSpan = {
  phaseId: StudyPhaseId;
  title: string;
  summary: string;
  fromDay: number; // 1始まり
  toDay: number;
  days: number;
};

function isoLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * 残り日数 totalDays の計画で、アプリが「本来いるべきフェーズ」を日ごとに求め、
 * 連続する同じフェーズを1区間にまとめる。/plan の予定比較と同じ関数を使う。
 */
export function expectedPhaseSpans(totalDays: number): PhaseSpan[] {
  const start = new Date(2026, 0, 1); // 基準日は任意（差分だけを使う）
  const exam = new Date(start);
  exam.setDate(exam.getDate() + totalDays);
  const profile = {
    planStartDate: isoLocal(start),
    examDate: isoLocal(exam),
  } as UserProfile;

  const spans: PhaseSpan[] = [];
  for (let i = 0; i < totalDays; i++) {
    const now = new Date(start);
    now.setDate(now.getDate() + i);
    const phaseId = determineExpectedPhase(profile, now) ?? "phase1";
    const last = spans[spans.length - 1];
    if (last && last.phaseId === phaseId) {
      last.toDay = i + 1;
      last.days += 1;
      continue;
    }
    const def = STUDY_PHASES.find((p) => p.id === phaseId)!;
    spans.push({
      phaseId,
      title: def.title,
      summary: def.summary,
      fromDay: i + 1,
      toDay: i + 1,
      days: 1,
    });
  }
  return spans;
}

// ---------------------------------------------------------------------------
// 1日の時間 × 残り日数 → 使える総時間と、必要量に対する余裕
// ---------------------------------------------------------------------------

export type CapacityExample = {
  days: number;
  weekdayMinutes: number;
  holidayMinutes: number;
  availableMinutes: number;
  ratio: number;
  level: "comfortable" | "tight" | "sprint";
};

export function capacityExample(
  days: number,
  weekdayMinutes: number,
  holidayMinutes: number,
): CapacityExample {
  const profile = { weekdayMinutes, holidayMinutes } as UserProfile;
  const availableMinutes = totalAvailableMinutes(profile, days) ?? 0;
  const required = GUIDE_FACTS.plannerRequiredMinutes;
  const level = computeOnTrack(availableMinutes, required);
  return {
    days,
    weekdayMinutes,
    holidayMinutes,
    availableMinutes,
    ratio: availableMinutes / required,
    level: level === "no-exam" ? "sprint" : level,
  };
}

export const CAPACITY_LABELS: Record<CapacityExample["level"], string> = {
  comfortable: "余裕あり",
  tight: "やや詰め込み",
  sprint: "短期集中が必要",
};
