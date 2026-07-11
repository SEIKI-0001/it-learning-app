// 最終問題（チェックポイント突破試験）の生成・採点（純粋関数）。
//
// 方針:
//   - CPごとに宣言した対象範囲と、完了済みトピックの積集合だけから構成する。
//   - 問題数・難易度配分・既出除外数はCP定義に合わせる。
//   - 問題が不足しても未学習/範囲外のトピックには広げず、学習を促す。
//   - 不合格時は間違えたトピックを復習キューへ（呼び出し側の recordFinalExamAttempt）。

import type { AppState, UserAnswer } from "@/types";
import type { CheckQuestion, Difficulty } from "@/types/content";
import type {
  CheckpointId,
  FinalExamAttempt,
  FinalExamRule,
} from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { getCheckpoint } from "@/lib/checkpoints";

type FinalExamScope = {
  /** このCPで出題してよい中分類。未学習トピックはこの範囲内でも出題しない。 */
  eligibleCategories: string[];
  difficultyDistribution: Partial<Record<Difficulty, number>>;
  recentQuestionExclusionCount: number;
};

// ロードマップ上のCPと、実際に使う最終問題の範囲を一つの定義にする。
// 従来のように「問題数不足なら未学習/全トピックへ広げる」ことはしない。
const FINAL_EXAM_SCOPES: Record<Exclude<CheckpointId, "cp0">, FinalExamScope> = {
  cp1: {
    eligibleCategories: [
      "基礎理論（情報の表現）",
      "コンピュータ構成要素",
      "開発プロセス",
      "企業活動",
    ],
    difficultyDistribution: { 1: 0.5, 2: 0.5 },
    recentQuestionExclusionCount: 12,
  },
  cp2: {
    eligibleCategories: [
      "基礎理論（情報の表現）",
      "基礎理論（アルゴリズム）",
      "コンピュータ構成要素",
      "ソフトウェア",
      "技術要素（ネットワーク）",
      "開発プロセス",
      "プロジェクトマネジメント",
      "サービスマネジメント",
      "企業活動",
      "経営戦略",
      "会計・財務",
      "法務",
    ],
    difficultyDistribution: { 1: 0.3, 2: 0.5, 3: 0.2 },
    recentQuestionExclusionCount: 20,
  },
  cp3: {
    eligibleCategories: [
      "基礎理論（情報の表現）",
      "基礎理論（アルゴリズム）",
      "基礎理論（プログラミング）",
      "コンピュータ構成要素",
      "ソフトウェア",
      "技術要素（ネットワーク）",
      "技術要素（データベース）",
      "技術要素（セキュリティ）",
      "開発プロセス",
      "プロジェクトマネジメント",
      "サービスマネジメント",
      "システム監査",
      "企業活動",
      "経営戦略",
      "会計・財務",
      "法務",
      "システム戦略",
    ],
    difficultyDistribution: { 1: 0.2, 2: 0.55, 3: 0.25 },
    recentQuestionExclusionCount: 24,
  },
  cp4: {
    eligibleCategories: [
      "基礎理論（情報の表現）",
      "基礎理論（アルゴリズム）",
      "基礎理論（プログラミング）",
      "コンピュータ構成要素",
      "ソフトウェア",
      "技術要素（ネットワーク）",
      "技術要素（データベース）",
      "技術要素（セキュリティ）",
      "開発プロセス",
      "プロジェクトマネジメント",
      "サービスマネジメント",
      "システム監査",
      "企業活動",
      "経営戦略",
      "会計・財務",
      "法務",
      "システム戦略",
      "経営管理システム",
    ],
    difficultyDistribution: { 1: 0.15, 2: 0.5, 3: 0.35 },
    recentQuestionExclusionCount: 24,
  },
  cp5: {
    eligibleCategories: [
      "基礎理論（情報の表現）",
      "基礎理論（アルゴリズム）",
      "基礎理論（プログラミング）",
      "コンピュータ構成要素",
      "ソフトウェア",
      "技術要素（ネットワーク）",
      "技術要素（データベース）",
      "技術要素（セキュリティ）",
      "技術要素（クラウド）",
      "開発プロセス",
      "プロジェクトマネジメント",
      "サービスマネジメント",
      "システム監査",
      "企業活動",
      "経営戦略",
      "マーケティング",
      "会計・財務",
      "法務",
      "システム戦略",
      "経営管理システム",
      "ビジネスインダストリ",
      "標準化",
    ],
    difficultyDistribution: { 1: 0.15, 2: 0.45, 3: 0.4 },
    recentQuestionExclusionCount: 30,
  },
  cp6: {
    // 総仕上げでも、学んでいないトピックは出題しない。範囲はコンテンツ全体に明示する。
    eligibleCategories: Array.from(new Set(getAllTopics().map((topic) => topic.category))),
    difficultyDistribution: { 1: 0.1, 2: 0.45, 3: 0.45 },
    recentQuestionExclusionCount: 40,
  },
};

export type FinalExam = {
  checkpointId: CheckpointId;
  rule: FinalExamRule;
  scope: FinalExamScope;
  attemptId: string;
  questions: CheckQuestion[];
  /** 出題した問題 id → トピック id（採点で「間違えたトピック」を割り出す）。 */
  topicIdByQuestionId: Record<string, string>;
  /** 出題範囲（トピック）。UI 表示にも使う。 */
  topicIds: string[];
  /** 範囲内の問題が不足し、直近の既出問題を再利用した場合に true。 */
  reusedRecentQuestion: boolean;
};

// ---------------------------------------------------------------------------
// 出題トピックの選定
// ---------------------------------------------------------------------------

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function orderedBySeed<T extends { id: string }>(items: T[], seed: string): T[] {
  return [...items].sort((a, b) => {
    const result = hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`);
    return result || a.id.localeCompare(b.id);
  });
}

function targetCount(
  rule: FinalExamRule,
  scope: FinalExamScope,
  difficulty: Difficulty,
): number {
  return Math.floor(rule.questionCount * (scope.difficultyDistribution[difficulty] ?? 0));
}

// ---------------------------------------------------------------------------
// 最終問題の生成
// ---------------------------------------------------------------------------

/** チェックポイントの最終問題を生成する。必ず questionCount 問を返す。 */
export function generateFinalExam(
  state: AppState,
  checkpointId: CheckpointId,
  options: { attemptId?: string; recentQuestionIds?: string[] } = {},
): FinalExam {
  const checkpoint = getCheckpoint(checkpointId);
  if (!checkpoint.finalExam || checkpointId === "cp0") {
    throw new Error(`Checkpoint ${checkpointId} does not have a final exam`);
  }
  const rule = checkpoint.finalExam ?? {
    questionCount: 6,
    passThreshold: 4,
    weakRatio: 0,
  };
  const scope = FINAL_EXAM_SCOPES[checkpointId];
  const attemptId = options.attemptId ?? "final-exam";
  const completedTopicIds = new Set(state.progress.completedTopics);
  const topics = getAllTopics().filter(
    (topic) =>
      completedTopicIds.has(topic.id) &&
      scope.eligibleCategories.includes(topic.category) &&
      topic.checkQuestions.length > 0,
  );
  const candidates = topics.flatMap((topic) =>
    topic.checkQuestions.map((question) => ({ id: question.id, question, topicId: topic.id })),
  );
  const recent = new Set(
    (options.recentQuestionIds ?? state.answers.map((answer) => answer.questionId)).slice(
      0,
      scope.recentQuestionExclusionCount,
    ),
  );
  const withoutRecent = candidates.filter((candidate) => !recent.has(candidate.question.id));
  const source = withoutRecent.length >= rule.questionCount ? withoutRecent : candidates;
  if (source.length < rule.questionCount) {
    throw new Error(
      `Checkpoint ${checkpointId} needs ${rule.questionCount} scoped questions from completed topics, but only ${source.length} are available`,
    );
  }

  const selected: { id: string; question: CheckQuestion; topicId: string }[] = [];
  const topicIdByQuestionId: Record<string, string> = {};
  const usedQuestionIds = new Set<string>();
  for (const difficulty of [1, 2, 3] as Difficulty[]) {
    const wanted = targetCount(rule, scope, difficulty);
    for (const candidate of orderedBySeed(
      source.filter((item) => item.question.difficulty === difficulty),
      `${attemptId}:${difficulty}`,
    )) {
      if (selected.length >= rule.questionCount || usedQuestionIds.has(candidate.question.id)) break;
      if (selected.filter((item) => item.question.difficulty === difficulty).length >= wanted) break;
      selected.push(candidate);
      usedQuestionIds.add(candidate.question.id);
    }
  }
  for (const candidate of orderedBySeed(source, attemptId)) {
    if (selected.length >= rule.questionCount) break;
    if (usedQuestionIds.has(candidate.question.id)) continue;
    selected.push(candidate);
    usedQuestionIds.add(candidate.question.id);
  }

  const ordered = orderedBySeed(
    selected,
    `${attemptId}:order`,
  );
  for (const item of ordered) topicIdByQuestionId[item.question.id] = item.topicId;

  return {
    checkpointId,
    rule,
    scope,
    attemptId,
    questions: ordered.map((item) => item.question),
    topicIdByQuestionId,
    topicIds: [...new Set(ordered.map((item) => item.topicId))],
    reusedRecentQuestion: source === candidates && recent.size > 0,
  };
}

// ---------------------------------------------------------------------------
// 採点
// ---------------------------------------------------------------------------

export type FinalExamResult = {
  correct: number;
  total: number;
  passed: boolean;
  wrongTopicIds: string[];
};

/** 最終問題の回答を採点する。 */
export function scoreFinalExam(exam: FinalExam, answers: UserAnswer[]): FinalExamResult {
  const total = exam.questions.length;
  let correct = 0;
  const wrong = new Set<string>();
  for (const a of answers) {
    if (a.isCorrect) {
      correct += 1;
    } else {
      const topicId = exam.topicIdByQuestionId[a.questionId] ?? a.topicId;
      if (topicId) wrong.add(topicId);
    }
  }
  return {
    correct,
    total,
    passed: correct >= exam.rule.passThreshold,
    wrongTopicIds: [...wrong],
  };
}

/** 採点結果から FinalExamAttempt を作る。 */
export function buildFinalExamAttempt(
  exam: FinalExam,
  result: FinalExamResult,
  now: Date = new Date(),
): FinalExamAttempt {
  return {
    checkpointId: exam.checkpointId,
    passed: result.passed,
    correct: result.correct,
    total: result.total,
    attemptedAt: now.toISOString(),
    wrongTopicIds: result.wrongTopicIds,
  };
}
