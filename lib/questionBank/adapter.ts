import type { CheckQuestion } from "@/types/content";
import type { ExamLevelQuestion } from "@/types/checkPack";
import type { QuestionRecord } from "@/types/questionBank";

// ============================================================================
// 問題バンクのレコードを、既存の画面が受け取る形へ変換するアダプター。
// ----------------------------------------------------------------------------
// 既存 UI（TopicQuiz / CheckPackRunner）は CheckQuestion しか知らない。
// バンク側の型が育っても UI を追随させずに済むよう、変換はここ1か所に閉じる。
//
// 注意: id はそのまま渡す。question_attempts のキーであり、
//       既存ユーザーの履歴との紐づきを壊さないため変換してはならない。
// ============================================================================

/** QuestionRecord を CheckQuestion（TopicQuiz が受け取る形）へ変換する。 */
export function questionRecordToCheckQuestion(q: QuestionRecord): CheckQuestion {
  return {
    id: q.id,
    prompt: q.prompt,
    choices: q.choices,
    correctChoice: q.correctChoice,
    explanation: q.explanation,
    difficulty: q.estimatedDifficulty,
    choiceExplanations: q.choiceExplanations,
    // 既存の ExamLevelQuestion.examTags は reviewTags に流し込まれていた。同じ扱いを保つ。
    reviewTags: q.tags.length > 0 ? q.tags : undefined,
  };
}

/**
 * QuestionRecord を旧 ExamLevelQuestion 形へ変換する。
 * 既存の呼び出し側（lib/checkPack.resolvePackExamQuestions）の戻り値互換を保つための橋渡し。
 */
export function questionRecordToExamLevelQuestion(q: QuestionRecord): ExamLevelQuestion {
  return {
    id: q.id,
    topicId: q.primaryTopicId,
    prompt: q.prompt,
    choices: q.choices,
    correctChoice: q.correctChoice,
    explanation: q.explanation,
    difficulty: q.estimatedDifficulty,
    examTags: q.tags.length > 0 ? q.tags : undefined,
  };
}
