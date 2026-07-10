import type { AppState, ReviewItem, UserAnswer } from "@/types";
import type { CheckQuestion, Difficulty, Topic } from "@/types/content";
import { getAllTopics } from "@/lib/content";

export type DifficultyDistribution = Partial<Record<Difficulty, number>>;

export type CheckpointExamDefinition = {
  id: string;
  title: string;
  description: string;
  /** 出題候補にできるトピック。カテゴリと併用した場合はいずれかに含まれるものだけを採用する。 */
  eligibleTopicIds?: string[];
  /** 出題候補にできる中分類。 */
  eligibleCategories?: string[];
  questionCount: number;
  passingScore: number;
  difficultyDistribution: DifficultyDistribution;
  /** 直近の回答から除外する問題数。候補不足時のみ再利用する。 */
  recentQuestionExclusionCount: number;
};

export type CheckpointQuestion = CheckQuestion & { topicId: string };

export type CheckpointExam = {
  definition: CheckpointExamDefinition;
  attemptId: string;
  questions: CheckpointQuestion[];
  reusedRecentQuestion: boolean;
};

const CHECKPOINT_EXAMS: CheckpointExamDefinition[] = [
  {
    id: "cp-technology-foundations",
    title: "CP1 テクノロジ基礎",
    description: "情報の表現、コンピュータ、ソフトウェア、ネットワークの基礎を確認します。",
    eligibleCategories: [
      "基礎理論（情報の表現）",
      "コンピュータ構成要素",
      "ソフトウェア",
      "技術要素（ネットワーク）",
    ],
    questionCount: 12,
    passingScore: 70,
    difficultyDistribution: { 1: 0.25, 2: 0.5, 3: 0.25 },
    recentQuestionExclusionCount: 24,
  },
  {
    id: "cp-management",
    title: "CP2 マネジメント",
    description: "開発・プロジェクト・サービス管理・監査を横断して確認します。",
    eligibleCategories: [
      "開発プロセス",
      "プロジェクトマネジメント",
      "サービスマネジメント",
      "システム監査",
    ],
    questionCount: 12,
    passingScore: 70,
    difficultyDistribution: { 1: 0.2, 2: 0.55, 3: 0.25 },
    recentQuestionExclusionCount: 24,
  },
  {
    id: "cp-strategy",
    title: "CP3 ストラテジ",
    description: "企業活動、戦略、会計・法務、システム戦略の理解を確認します。",
    eligibleCategories: [
      "企業活動",
      "経営戦略",
      "会計・財務",
      "法務",
      "システム戦略",
      "経営管理システム",
    ],
    questionCount: 12,
    passingScore: 70,
    difficultyDistribution: { 1: 0.2, 2: 0.55, 3: 0.25 },
    recentQuestionExclusionCount: 24,
  },
];

export function getAllCheckpointExams(): CheckpointExamDefinition[] {
  return CHECKPOINT_EXAMS;
}

export function getCheckpointExamDefinition(
  checkpointId: string,
): CheckpointExamDefinition | undefined {
  return CHECKPOINT_EXAMS.find((checkpoint) => checkpoint.id === checkpointId);
}

function eligibleTopics(
  definition: CheckpointExamDefinition,
  topics: Topic[],
): Topic[] {
  const topicIds = new Set(definition.eligibleTopicIds ?? []);
  const categories = new Set(definition.eligibleCategories ?? []);
  return topics.filter((topic) =>
    topicIds.size > 0 || categories.size > 0
      ? topicIds.has(topic.id) || categories.has(topic.category)
      : false,
  );
}

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function orderedBySeed<T extends { id: string }>(items: T[], seed: string): T[] {
  return [...items].sort((a, b) => {
    const aHash = hash(`${seed}:${a.id}`);
    const bHash = hash(`${seed}:${b.id}`);
    return aHash - bHash || a.id.localeCompare(b.id);
  });
}

function targetCountByDifficulty(
  definition: CheckpointExamDefinition,
  difficulty: Difficulty,
): number {
  return Math.floor(
    definition.questionCount * (definition.difficultyDistribution[difficulty] ?? 0),
  );
}

/**
 * チェックポイント試験の問題を決定する。
 *
 * - 定義済みの対象トピック・カテゴリ以外は絶対に混ぜない。
 * - attemptId をseedにするため、同じ挑戦は常に同じ問題順になる。
 * - 直近に答えた問題を優先して除外し、同一試験内の重複を許可しない。
 */
export function buildCheckpointExam({
  checkpointId,
  attemptId,
  recentQuestionIds = [],
  topics = getAllTopics(),
}: {
  checkpointId: string;
  attemptId: string;
  recentQuestionIds?: string[];
  topics?: Topic[];
}): CheckpointExam {
  const definition = getCheckpointExamDefinition(checkpointId);
  if (!definition) throw new Error(`Unknown checkpoint exam: ${checkpointId}`);

  const candidates = eligibleTopics(definition, topics).flatMap((topic) =>
    topic.checkQuestions.map((question) => ({ ...question, topicId: topic.id })),
  );
  const uniqueCandidates = Array.from(
    new Map(candidates.map((question) => [question.id, question])).values(),
  );
  const recent = new Set(recentQuestionIds.slice(0, definition.recentQuestionExclusionCount));
  const withoutRecent = uniqueCandidates.filter((question) => !recent.has(question.id));
  const source = withoutRecent.length >= definition.questionCount ? withoutRecent : uniqueCandidates;
  const selectedIds = new Set<string>();
  const selected: CheckpointQuestion[] = [];

  for (const difficulty of [1, 2, 3] as Difficulty[]) {
    const target = targetCountByDifficulty(definition, difficulty);
    const candidatesAtDifficulty = orderedBySeed(
      source.filter((question) => question.difficulty === difficulty),
      `${attemptId}:${difficulty}`,
    );
    for (const question of candidatesAtDifficulty) {
      if (selected.length >= definition.questionCount || selectedIds.has(question.id)) break;
      if (selected.filter((item) => item.difficulty === difficulty).length >= target) break;
      selected.push(question);
      selectedIds.add(question.id);
    }
  }

  for (const question of orderedBySeed(source, attemptId)) {
    if (selected.length >= definition.questionCount) break;
    if (selectedIds.has(question.id)) continue;
    selected.push(question);
    selectedIds.add(question.id);
  }

  if (selected.length < definition.questionCount) {
    throw new Error(
      `Checkpoint ${checkpointId} has only ${selected.length} eligible questions; ${definition.questionCount} are required`,
    );
  }

  return {
    definition,
    attemptId,
    questions: orderedBySeed(selected, `${attemptId}:order`),
    reusedRecentQuestion: source === uniqueCandidates && recent.size > 0,
  };
}

/** 試験結果を回答履歴と復習キューへ反映する。自己申告で習熟度は変更しない。 */
export function recordCheckpointExamResult(
  state: AppState,
  answers: UserAnswer[],
  now: Date = new Date(),
): AppState {
  const wrongTopicIds = new Set(
    answers.filter((answer) => !answer.isCorrect).flatMap((answer) => answer.topicId ?? []),
  );
  const reviewByTopic = new Map<string, ReviewItem>(
    state.progress.reviewQueue.map((item) => [item.topicId, item]),
  );
  for (const topicId of wrongTopicIds) {
    reviewByTopic.set(topicId, {
      topicId,
      dueAt: now.toISOString(),
      reason: "突破試験で要復習",
    });
  }

  const allAnswers = [...state.answers, ...answers];
  return {
    ...state,
    answers: allAnswers,
    progress: {
      ...state.progress,
      weakTags: Array.from(
        new Set(allAnswers.filter((answer) => !answer.isCorrect).map((answer) => answer.tag)),
      ),
      reviewQueue: Array.from(reviewByTopic.values()),
      lastPlayedAt: now.toISOString(),
    },
  };
}
