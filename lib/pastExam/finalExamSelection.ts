// 公式過去問から出す突破試験（CP5 過去問実戦）の出題選び。純粋関数（fetch を除く）。
//
// 問題バンク本体はクライアントへ載せない（lib/pastExam/officialHistory と同じ方針）。
// そのため出題は2段に分ける:
//   1. クライアント … 端末の回答履歴から「解いた問題・誤答・弱点トピック」を集めて送る
//                     （buildOfficialFinalExamRequest）
//   2. サーバ       … 問題バンクの索引から問題を選び、本文つきで返す
//                     （/api/past-exams/final-exam → selectOfficialFinalExamIds）
// 選び方は部分演習の「3分野混合」と同じ（lib/pastExam/drillSelection）:
// 本試験の出題比率で3分野を配分し、未出題 × 弱点トピックを優先する。

import type { AppState } from "@/types";
import type { CheckQuestion } from "@/types/content";
import { getWeakTopics } from "@/lib/learningLoop";
import { summarizeOfficialHistory } from "@/lib/pastExam/officialHistory";
import {
  DRILL_COUNT_LIMIT,
  selectDrillQuestionIds,
  type DrillIndexEntry,
} from "@/lib/pastExam/drillSelection";

/** 公式過去問の突破試験で出す1問（問題と復習先トピック）。 */
export type OfficialFinalExamQuestion = {
  question: CheckQuestion;
  topicId: string;
};

/** クライアントからサーバへ送る出題の材料。 */
export type OfficialFinalExamRequest = {
  count: number;
  answeredIds: string[];
  wrongIds: string[];
  weakTopicIds: string[];
  seed: string;
};

/** 端末の回答履歴から、出題の材料を作る。 */
export function buildOfficialFinalExamRequest(
  state: AppState,
  count: number,
  seed: string,
): OfficialFinalExamRequest {
  const history = summarizeOfficialHistory(state.answers);
  return {
    count,
    answeredIds: [...history.answeredIds],
    wrongIds: [...history.latestWrongIds],
    weakTopicIds: getWeakTopics(state.progress.topicMasteryStats ?? {}).map((weak) => weak.topicId),
    seed,
  };
}

/** 出題する公式過去問の ID を選ぶ（3分野を本試験の比率で配分・未出題優先）。 */
export function selectOfficialFinalExamIds(
  index: DrillIndexEntry[],
  request: OfficialFinalExamRequest,
): string[] {
  return selectDrillQuestionIds({
    stage: "mixed",
    index,
    count: request.count,
    answeredIds: new Set(request.answeredIds),
    wrongIds: new Set(request.wrongIds),
    weakTopicIds: new Set(request.weakTopicIds),
    seed: request.seed,
  });
}

const MAX_ID_LIST = 2000;

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length <= MAX_ID_LIST
    && value.every((item) => typeof item === "string" && item.length > 0 && item.length <= 200);
}

/** API が受け取った本文を検証する。壊れていれば null。 */
export function parseOfficialFinalExamRequest(value: unknown): OfficialFinalExamRequest | null {
  if (typeof value !== "object" || value === null) return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.count !== "number"
    || !Number.isInteger(body.count)
    || body.count < DRILL_COUNT_LIMIT.min
    || body.count > DRILL_COUNT_LIMIT.max
    || !isStringList(body.answeredIds)
    || !isStringList(body.wrongIds)
    || !isStringList(body.weakTopicIds)
    || typeof body.seed !== "string"
    || body.seed.length === 0
    || body.seed.length > 200
  ) return null;
  return {
    count: body.count,
    answeredIds: body.answeredIds,
    wrongIds: body.wrongIds,
    weakTopicIds: body.weakTopicIds,
    seed: body.seed,
  };
}

/** 突破試験に出す公式過去問をサーバから受け取る。 */
export async function fetchOfficialFinalExamQuestions(
  request: OfficialFinalExamRequest,
): Promise<OfficialFinalExamQuestion[]> {
  const response = await fetch("/api/past-exams/final-exam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`official final exam questions: ${response.status}`);
  const body = (await response.json()) as { questions?: OfficialFinalExamQuestion[] };
  if (!Array.isArray(body.questions)) throw new Error("official final exam questions: invalid body");
  return body.questions;
}
