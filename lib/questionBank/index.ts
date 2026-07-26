// 統一問題バンクの公開窓口。利用側はこのモジュールから読む。
// （data/question-bank 配下の JSON を画面・API から直接 import しないこと）

export {
  OFFICIAL_EXAM_QUESTION_COUNT,
  QuestionBankError,
  getAllQuestions,
  getPlayableOfficialExamYears,
  getPublishedOfficialQuestionsByYear,
  getPublishedQuestions,
  getQuestionById,
  getQuestionsByOrigin,
  getQuestionsByStatus,
  getQuestionsByTopic,
  isPlayableOfficialExamYear,
} from "@/lib/questionBank/loader";

export {
  questionRecordToCheckQuestion,
  questionRecordToExamLevelQuestion,
} from "@/lib/questionBank/adapter";

export {
  CONTENT_HASH_PREFIX,
  buildContentHashInput,
  computeContentHash,
  isContentHashValid,
} from "@/lib/questionBank/contentHash";

export {
  formatIssues,
  validatePackReferences,
  validateQuestion,
  validateQuestions,
} from "@/lib/questionBank/validate";

export type { QuestionBankIssue } from "@/lib/questionBank/validate";
