import type { CheckQuestion, Topic } from "@/types/content";
import type { ExamLevelQuestion, TopicCheckPack } from "@/types/checkPack";
import { topicCheckPacks } from "@/data/topicCheckPacks";
import { getQuestionForDelivery } from "@/lib/questionBank/loader";
import {
  questionRecordToCheckQuestion,
  questionRecordToExamLevelQuestion,
} from "@/lib/questionBank/adapter";
import { getWord } from "@/lib/wordlist";
import type { WordlistEntry } from "@/types/wordlist";

// ============================================================================
// 確認パックのデータアクセス層（純粋関数）。
// UI・API はここ経由でパックの構成要素（確認問題 / 単語 / 過去問レベル問題）を解決する。
//
// 過去問レベル問題の実体は統一問題バンク（lib/questionBank）に移した。
// data/examLevelQuestions.ts は参照しない（移行前後の同一性検証用に残してあるだけ）。
// 出題順・問題数・ID・正答は移行前と同じになるようにしている。
// ============================================================================

const PACK_BY_ID = new Map(topicCheckPacks.map((p) => [p.packId, p]));
const PACK_BY_TOPIC = new Map(topicCheckPacks.map((p) => [p.topicId, p]));

/** トピックに紐づく確認パック（無ければ undefined）。 */
export function getCheckPackByTopic(topicId: string): TopicCheckPack | undefined {
  return PACK_BY_TOPIC.get(topicId);
}

/** packId で確認パックを取得（無ければ undefined）。 */
export function getCheckPack(packId: string): TopicCheckPack | undefined {
  return PACK_BY_ID.get(packId);
}

/** 確認パックを持つトピックか。 */
export function hasCheckPack(topicId: string): boolean {
  return PACK_BY_TOPIC.has(topicId);
}

/** すべての確認パック。 */
export function getAllCheckPacks(): TopicCheckPack[] {
  return topicCheckPacks;
}

/**
 * パックの「基礎確認問題」を解決する。
 * pack.quizQuestionIds に一致するトピックの checkQuestions を返す。
 * 1問も一致しなければトピックの全確認問題にフォールバックする（空表示を避ける）。
 */
export function resolvePackQuizQuestions(
  topic: Topic,
  pack: TopicCheckPack,
): CheckQuestion[] {
  const wanted = new Set(pack.quizQuestionIds);
  const picked = topic.checkQuestions.filter((q) => wanted.has(q.id));
  return picked.length > 0 ? picked : topic.checkQuestions;
}

/** パックの関連単語（存在するものだけ）。 */
export function resolvePackFlashcards(pack: TopicCheckPack): WordlistEntry[] {
  return pack.flashcardIds
    .map((id) => getWord(id))
    .filter((e): e is WordlistEntry => Boolean(e));
}

/**
 * パックの過去問レベル問題（出題してよいものだけ）。
 *
 * 解決できないID・retired の問題は従来どおり黙って除外し、画面を止めない。
 * 参照切れと retired 参照は npm run validate:questions が検出して CI で落とす
 * （画面側で気づけないぶん、検証側で必ず気づけるようにしてある）。
 *
 * draft は従来どおり出題される。既存146問が draft のままなので、
 * ここで status を狭めると確認パックの第3段階が空になる。
 */
export function resolvePackExamQuestions(pack: TopicCheckPack): ExamLevelQuestion[] {
  return pack.examLevelQuestionIds
    .map((id) => getQuestionForDelivery(id, "check_pack"))
    .filter((q) => q !== undefined)
    .map(questionRecordToExamLevelQuestion);
}

/** パックの過去問レベル問題を CheckQuestion 形（TopicQuiz 用）で返す。 */
export function resolvePackExamAsCheckQuestions(pack: TopicCheckPack): CheckQuestion[] {
  return pack.examLevelQuestionIds
    .map((id) => getQuestionForDelivery(id, "check_pack"))
    .filter((q) => q !== undefined)
    .map(questionRecordToCheckQuestion);
}
