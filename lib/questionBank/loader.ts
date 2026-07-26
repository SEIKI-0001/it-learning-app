import { questionBankFiles } from "@/data/question-bank";
import type {
  QuestionBankFile,
  QuestionOrigin,
  QuestionRecord,
  QuestionStatus,
} from "@/types/questionBank";

// ============================================================================
// 統一問題バンクのデータアクセス層。
// ----------------------------------------------------------------------------
// 画面・API は必ずここ経由で問題を読む（data/question-bank の JSON を直接 import しない）。
// これにより、後から公式過去問のファイルを増やしても取得側の変更が要らなくなる。
//
// 重複IDは学習履歴（question_attempts）の取り違えに直結するため、
// 読み込み時点で例外にする（黙って先勝ちにしない）。
// ============================================================================

export class QuestionBankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionBankError";
  }
}

function loadAll(files: QuestionBankFile[]): QuestionRecord[] {
  const out: QuestionRecord[] = [];
  const seen = new Map<string, string>(); // id -> 最初に出てきたファイル

  for (const file of files) {
    for (const question of file.questions) {
      const duplicatedIn = seen.get(question.id);
      if (duplicatedIn !== undefined) {
        throw new QuestionBankError(
          `問題IDが重複しています: "${question.id}"（${duplicatedIn} と ${file.source}）`,
        );
      }
      seen.set(question.id, file.source);
      out.push(question);
    }
  }

  return out;
}

// ファイル記載順を保持する。確認パックは ID 指定で引くため表示順には影響しないが、
// 年度別演習など「並び順そのもの」を使う機能のために安定した順序を保証する。
const ALL: QuestionRecord[] = loadAll(questionBankFiles);

const BY_ID = new Map(ALL.map((q) => [q.id, q]));

const BY_TOPIC = (() => {
  const map = new Map<string, QuestionRecord[]>();
  for (const q of ALL) {
    const list = map.get(q.primaryTopicId);
    if (list) list.push(q);
    else map.set(q.primaryTopicId, [q]);
  }
  return map;
})();

/**
 * 問題を1件取得する（なければ undefined）。
 * status では絞らない。確認パックのように問題IDを明示指定して出題する導線が
 * draft の問題も従来どおり解決できる必要があるため（移行した既存146問がこれに当たる）。
 */
export function getQuestionById(id: string): QuestionRecord | undefined {
  return BY_ID.get(id);
}

/** すべての問題（status を問わない）。 */
export function getAllQuestions(): QuestionRecord[] {
  return ALL;
}

/**
 * 公開済み（status: "published"）の問題のみ。
 * 「監査を通った問題だけを使いたい」場面（将来の年度別演習・自動出題など）はこちらを使う。
 * 移行しただけの既存問題は draft なので、ここには出てこない。
 */
export function getPublishedQuestions(): QuestionRecord[] {
  return ALL.filter((q) => q.status === "published");
}

/** アプリ内トピックに紐づく問題（primaryTopicId 一致）。 */
export function getQuestionsByTopic(topicId: string): QuestionRecord[] {
  return BY_TOPIC.get(topicId) ?? [];
}

/** 出所で絞り込む（公式過去問だけを年度別演習に使う、などの用途）。 */
export function getQuestionsByOrigin(origin: QuestionOrigin): QuestionRecord[] {
  return ALL.filter((q) => q.origin === origin);
}

/** status で絞り込む。運用・検証向けの補助。 */
export function getQuestionsByStatus(status: QuestionStatus): QuestionRecord[] {
  return ALL.filter((q) => q.status === status);
}

// ---------------------------------------------------------------------------
// 年度別演習
// ---------------------------------------------------------------------------

/** 公式過去問の年度別演習で必要な問題数（1年度ぶんの公開問題）。 */
export const OFFICIAL_EXAM_QUESTION_COUNT = 100;

/**
 * 年度別演習に出す公式過去問（公開済み・公式の問番号順）。
 *
 * 条件をすべて満たしたものだけを返す:
 *   - origin: "official_past"（改変問題や独自問題は混ぜない）
 *   - status: "published"（二段階監査を通った問題だけ）
 *   - official.year が指定年と一致
 *
 * 並びは official.questionNumber の昇順に固定する。ファイル記載順ではなく問番号で
 * 並べ直すのは、「問1から順に解く」という年度別演習の前提を、ファイルの並び順の
 * 事故から切り離すため。
 *
 * 100問そろわない年度は、年度別演習を開始させてはいけない
 * （途中の問番号が欠けたまま「問n/100」を表示すると採点も区分集計も破綻する）。
 * 呼び出し側は isPlayableOfficialExamYear() で判定してから使うこと。
 */
export function getPublishedOfficialQuestionsByYear(year: number): QuestionRecord[] {
  return ALL.filter(
    (q) =>
      q.origin === "official_past" &&
      q.status === "published" &&
      q.official?.year === year,
  ).sort((a, b) => (a.official?.questionNumber ?? 0) - (b.official?.questionNumber ?? 0));
}

/**
 * その年度の年度別演習を開始してよいか（＝公開済みの公式過去問がちょうど100問あるか）。
 * 問番号が 1〜100 の連番になっていることまで確認する。
 */
export function isPlayableOfficialExamYear(year: number): boolean {
  const questions = getPublishedOfficialQuestionsByYear(year);
  if (questions.length !== OFFICIAL_EXAM_QUESTION_COUNT) return false;
  return questions.every((q, i) => q.official?.questionNumber === i + 1);
}

/** 年度別演習を開始できる年度の一覧（新しい年度が先）。 */
export function getPlayableOfficialExamYears(): number[] {
  const years = new Set<number>();
  for (const q of ALL) {
    if (q.origin === "official_past" && q.status === "published" && q.official) {
      years.add(q.official.year);
    }
  }
  return [...years].filter(isPlayableOfficialExamYear).sort((a, b) => b - a);
}
