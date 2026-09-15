// 図表画像の実寸をビルド前に生成したマニフェストから読む。
//
// なぜデータに持たせないか:
//   QuestionRecord.figures は公式問題の転記結果そのもので、PR2-A から不変であることを
//   テストで保証している。表示の都合（next/image に必要な width / height）のために
//   その中身を書き換えたくないので、画像ファイル自身から生成した別データを使う。
//
// なぜ next/image に実寸が要るか:
//   パス文字列で指定した画像は、Next.js が実寸を知らないため width / height が必須。
//   これを渡すことで、読み込み中にレイアウトがずれる（CLS）のを防げる。
//
import { PAST_EXAM_FIGURE_SIZES } from "@/lib/pastExam/figureSizeManifest.generated";

export type FigureSize = { width: number; height: number };

/**
 * public 配下のパス（例: "/question-bank/.../q003-figure-1.png"）から実寸を得る。
 * 読めない場合は null を返し、呼び出し側でフォールバックさせる（画面は止めない）。
 */
export function getPngSize(publicPath: string): FigureSize | null {
  // "/" 始まりの public 配下パスだけを受け付ける。".." による外部参照は弾く。
  if (!publicPath.startsWith("/") || publicPath.includes("..")) return null;
  return PAST_EXAM_FIGURE_SIZES[publicPath] ?? null;
}
