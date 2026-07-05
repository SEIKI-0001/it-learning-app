// 最終問題（チェックポイント突破試験）の生成・採点（純粋関数）。
//
// 方針（初期実装）:
//   - 既存トピックの checkQuestions を組み合わせて構成する。
//   - 問題数はチェックポイント定義に合わせる。同一トピックに偏りすぎない。
//   - 高重要度トピックを優先する。CP4 以降は苦手・誤答を一定割合で含める。
//   - 問題が不足するときは条件を緩めて補充し、どうしても足りない場合も「準備中」に
//     せず、既存の確認問題で必ず埋める。
//   - 不合格時は間違えたトピックを復習キューへ（呼び出し側の recordFinalExamAttempt）。

import type { AppState, UserAnswer } from "@/types";
import type { CheckQuestion, Topic } from "@/types/content";
import type {
  CheckpointId,
  FinalExamAttempt,
  FinalExamRule,
} from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import { getCheckpoint } from "@/lib/checkpoints";

const MASTERED = 75;

export type FinalExam = {
  checkpointId: CheckpointId;
  rule: FinalExamRule;
  questions: CheckQuestion[];
  /** 出題した問題 id → トピック id（採点で「間違えたトピック」を割り出す）。 */
  topicIdByQuestionId: Record<string, string>;
  /** 出題範囲（トピック）。UI 表示にも使う。 */
  topicIds: string[];
};

// ---------------------------------------------------------------------------
// 出題トピックの選定
// ---------------------------------------------------------------------------

/** 苦手・誤答に該当するトピック id 集合を作る。 */
function weakTopicIds(state: AppState): Set<string> {
  const ids = new Set<string>();
  for (const r of state.progress.reviewQueue ?? []) ids.add(r.topicId);
  // 習熟度が低い（未定着）トピック。
  for (const [id, m] of Object.entries(state.progress.topicMastery ?? {})) {
    if (m < MASTERED) ids.add(id);
  }
  // 苦手タグに一致するトピック。
  const weakTags = new Set(state.progress.weakTags ?? []);
  if (weakTags.size > 0) {
    for (const t of getAllTopics()) {
      if (t.tags.some((tag) => weakTags.has(tag))) ids.add(t.id);
    }
  }
  return ids;
}

function byImportance(a: Topic, b: Topic): number {
  return b.importance - a.importance || a.difficulty - b.difficulty;
}

/** 出題トピックを、重要度・苦手割合を考慮して順序づけて返す。 */
function selectTopics(state: AppState, rule: FinalExamRule): Topic[] {
  const all = getAllTopics().filter((t) => t.checkQuestions.length > 0);
  const completed = new Set(state.progress.completedTopics);
  const weak = weakTopicIds(state);

  const completedTopics = all.filter((t) => completed.has(t.id));
  const weakCompleted = completedTopics.filter((t) => weak.has(t.id)).sort(byImportance);
  const strongCompleted = completedTopics
    .filter((t) => !weak.has(t.id))
    .sort(byImportance);
  // 未着手トピックは補充用（不足時のみ）。重要度順。
  const fallback = all.filter((t) => !completed.has(t.id)).sort(byImportance);

  const want = rule.questionCount;
  const wantWeak = Math.round(want * rule.weakRatio);

  const ordered: Topic[] = [];
  const pushUnique = (list: Topic[]) => {
    for (const t of list) {
      if (!ordered.some((o) => o.id === t.id)) ordered.push(t);
    }
  };

  // 1) 苦手枠を先に確保、2) 重要度の高い定着トピック、3) 残りの苦手、
  // 4) 未着手トピック（不足時の補充）。
  pushUnique(weakCompleted.slice(0, wantWeak));
  pushUnique(strongCompleted);
  pushUnique(weakCompleted);
  pushUnique(fallback);

  return ordered;
}

// ---------------------------------------------------------------------------
// 最終問題の生成
// ---------------------------------------------------------------------------

/** チェックポイントの最終問題を生成する。必ず questionCount 問を返す。 */
export function generateFinalExam(
  state: AppState,
  checkpointId: CheckpointId,
): FinalExam {
  const checkpoint = getCheckpoint(checkpointId);
  const rule = checkpoint.finalExam ?? {
    questionCount: 6,
    passThreshold: 4,
    weakRatio: 0,
  };

  const topics = selectTopics(state, rule);
  const questions: CheckQuestion[] = [];
  const topicIdByQuestionId: Record<string, string> = {};
  const usedTopicIds: string[] = [];
  const usedQuestionIds = new Set<string>();

  // トピックごとの「次に使う確認問題」を難易度の高い順で持っておく。
  const queues = new Map<string, CheckQuestion[]>();
  for (const t of topics) {
    queues.set(t.id, [...t.checkQuestions].sort((a, b) => b.difficulty - a.difficulty));
  }

  const takeFromTopic = (t: Topic): boolean => {
    const q = queues.get(t.id);
    if (!q) return false;
    while (q.length > 0) {
      const next = q.shift()!;
      if (usedQuestionIds.has(next.id)) continue;
      questions.push(next);
      usedQuestionIds.add(next.id);
      topicIdByQuestionId[next.id] = t.id;
      if (!usedTopicIds.includes(t.id)) usedTopicIds.push(t.id);
      return true;
    }
    return false;
  };

  // ラウンド1: 1トピック1問（偏りを避ける）。
  for (const t of topics) {
    if (questions.length >= rule.questionCount) break;
    takeFromTopic(t);
  }

  // ラウンド2以降: まだ足りなければ、同じトピックから追加の問題を使う。
  let guard = 0;
  while (questions.length < rule.questionCount && guard < 10) {
    guard += 1;
    let progressed = false;
    for (const t of topics) {
      if (questions.length >= rule.questionCount) break;
      if (takeFromTopic(t)) progressed = true;
    }
    if (!progressed) break;
  }

  // どうしても不足する場合（コンテンツが極端に少ない環境）でも、
  // 全トピックの確認問題から重複を許してでも埋め、「準備中」にはしない。
  if (questions.length < rule.questionCount) {
    const pool: { q: CheckQuestion; topicId: string }[] = [];
    for (const t of getAllTopics()) {
      for (const q of t.checkQuestions) pool.push({ q, topicId: t.id });
    }
    let i = 0;
    while (questions.length < rule.questionCount && pool.length > 0) {
      const { q, topicId } = pool[i % pool.length];
      i += 1;
      // まず未使用を優先、一巡したら重複も許容する。
      if (i <= pool.length && usedQuestionIds.has(q.id)) continue;
      questions.push(q);
      usedQuestionIds.add(q.id);
      topicIdByQuestionId[q.id] = topicId;
      if (!usedTopicIds.includes(topicId)) usedTopicIds.push(topicId);
      if (i > pool.length * 2) break; // 安全弁
    }
  }

  return {
    checkpointId,
    rule,
    questions: questions.slice(0, rule.questionCount),
    topicIdByQuestionId,
    topicIds: usedTopicIds,
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
