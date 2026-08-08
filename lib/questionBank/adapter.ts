import type {
  CheckQuestion,
  QuestionFigureView,
  QuestionOfficialView,
} from "@/types/content";
import type { ExamLevelQuestion } from "@/types/checkPack";
import type { QuestionFigure, QuestionRecord } from "@/types/questionBank";

// ============================================================================
// 問題バンクのレコードを、既存の画面が受け取る形へ変換するアダプター。
// ----------------------------------------------------------------------------
// 既存 UI（TopicQuiz / CheckPackRunner）は CheckQuestion しか知らない。
// バンク側の型が育っても UI を追随させずに済むよう、変換はここ1か所に閉じる。
//
// 注意: id はそのまま渡す。question_attempts のキーであり、
//       既存ユーザーの履歴との紐づきを壊さないため変換してはならない。
// ============================================================================

/**
 * 出典を持つ問題か（＝公式の原文・改変問題か）。
 *
 * 出題時の扱いがここで分かれる: 選択肢を並び替えない・図表を出す・出典を表示する。
 * origin は4種類あるが、この3つの制約がかかるのは official を持つ2種類だけなので、
 * 判定を1か所にまとめて、呼び出し側で origin の列挙を繰り返さないようにする。
 */
export function isOfficialQuestion(q: Pick<QuestionRecord, "origin">): boolean {
  return q.origin === "official_past" || q.origin === "modified_official";
}

/** 図表を表示用の形へ写す（実寸はここでは分からないので付けない）。 */
function toFigureView(figure: QuestionFigure): QuestionFigureView {
  return {
    id: figure.id,
    kind: figure.kind,
    src: figure.src,
    body: figure.body,
    alt: figure.alt,
    caption: figure.caption,
  };
}

/** 出典を表示用の形へ写す。 */
function toOfficialView(q: QuestionRecord): QuestionOfficialView | undefined {
  const official = q.official;
  if (!official) return undefined;
  return {
    attribution: official.attribution,
    sourceUrl: official.sourceUrl,
    answerSourceUrl: official.answerSourceUrl,
    year: official.year,
    questionNumber: official.questionNumber,
  };
}

/**
 * QuestionRecord を CheckQuestion（TopicQuiz が受け取る形）へ変換する。
 *
 * 出所・版・出典・図表・表示制御まで持たせる。ここで落とすと、確認パックに公式問題を
 * 入れた瞬間に「選択肢が並び替わり、図表が消え、出典が出ない」状態で出題されてしまう。
 * アプリ独自問題では公式向けの項目が付かないので、従来どおりの出題のまま変わらない。
 */
export function questionRecordToCheckQuestion(q: QuestionRecord): CheckQuestion {
  const official = isOfficialQuestion(q);
  const figures = q.figures ?? [];

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

    origin: q.origin,
    version: q.version,
    // 公式問題は公式の選択肢順そのものが出題の一部なので、並び替えを禁じる。
    // アプリ独自問題は undefined のまま＝従来どおりシャッフルされる。
    shuffleChoices: official ? false : undefined,
    official: toOfficialView(q),
    figures: figures.length > 0 ? figures.map(toFigureView) : undefined,
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
