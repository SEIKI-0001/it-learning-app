import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { QuestionReviewRecord } from "@/types/questionQuality";

// ============================================================================
// レビュー記録ファイルの読み込み。
// ----------------------------------------------------------------------------
// data/question-bank/reviews/<question-id>.json を1問1ファイルで置く。
// 1問1ファイルにしているのは、レビューが同時並行で増えるものだからで、
// 1つの大きな JSON にすると別々の問題のレビュー追加が必ず衝突する。
//
// このモジュールは Node 専用（fs を使う）。画面・API から import しないこと。
// 呼び出し元は検証テストと scripts/question-bank/ のスクリプトだけ。
// ============================================================================

export const REVIEW_DIR_RELATIVE = "data/question-bank/reviews";

export type LoadedReviews = {
  /** questionId -> レビュー記録。 */
  byQuestionId: Map<string, QuestionReviewRecord>;
  /** questionId -> 読み込んだファイル名（ファイル名とIDの不一致を検査するため）。 */
  fileNames: Map<string, string>;
  /** JSON として読めなかったファイル。 */
  parseErrors: { fileName: string; message: string }[];
};

/** レビュー記録をすべて読み込む。ディレクトリが無い場合は空で返す。 */
export function loadReviewRecords(rootDir: string = process.cwd()): LoadedReviews {
  const dir = path.join(rootDir, REVIEW_DIR_RELATIVE);
  const byQuestionId = new Map<string, QuestionReviewRecord>();
  const fileNames = new Map<string, string>();
  const parseErrors: { fileName: string; message: string }[] = [];

  if (!existsSync(dir)) return { byQuestionId, fileNames, parseErrors };

  // 読み込み順を固定する（同一IDが2ファイルにあるときの勝者を実行環境に依存させない）。
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  for (const fileName of files) {
    const raw = readFileSync(path.join(dir, fileName), "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      parseErrors.push({
        fileName,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const review = parsed as QuestionReviewRecord;
    // questionId が空でもファイル名で引けるようにしておく。
    // （空であること自体は validateReviewRecord が blocker として報告する）
    const key = review?.questionId?.trim() || fileName.replace(/\.json$/, "");
    byQuestionId.set(key, review);
    fileNames.set(key, fileName);
  }

  return { byQuestionId, fileNames, parseErrors };
}
