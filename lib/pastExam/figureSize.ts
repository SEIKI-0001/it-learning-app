// 図表画像の実寸を public/ 配下の PNG から読む（サーバ専用）。
//
// なぜデータに持たせないか:
//   QuestionRecord.figures は公式問題の転記結果そのもので、PR2-A から不変であることを
//   テストで保証している。表示の都合（next/image に必要な width / height）のために
//   その中身を書き換えたくないので、画像ファイル自身から読む。
//
// なぜ next/image に実寸が要るか:
//   パス文字列で指定した画像は、Next.js が実寸を知らないため width / height が必須。
//   これを渡すことで、読み込み中にレイアウトがずれる（CLS）のを防げる。
//
// PNG の実寸は先頭の IHDR チャンクに入っているので、外部ライブラリなしで読める。
// 呼び出し元はサーバコンポーネントに限ること（fs を使うため）。

import { readFileSync } from "node:fs";
import path from "node:path";

export type FigureSize = { width: number; height: number };

const PNG_SIGNATURE = "89504e470d0a1a0a";

// 同じ画像を何度も読み直さないための、プロセス内キャッシュ。
const cache = new Map<string, FigureSize | null>();

/**
 * public 配下のパス（例: "/question-bank/.../q003-figure-1.png"）から実寸を得る。
 * 読めない場合は null を返し、呼び出し側でフォールバックさせる（画面は止めない）。
 */
export function getPngSize(publicPath: string): FigureSize | null {
  const cached = cache.get(publicPath);
  if (cached !== undefined) return cached;

  const size = readPngSize(publicPath);
  cache.set(publicPath, size);
  return size;
}

function readPngSize(publicPath: string): FigureSize | null {
  // "/" 始まりの public 配下パスだけを受け付ける。".." による外部参照は弾く。
  if (!publicPath.startsWith("/") || publicPath.includes("..")) return null;

  try {
    const absolute = path.join(process.cwd(), "public", publicPath);
    const buffer = readFileSync(absolute);
    // 8バイトの署名 + 4バイト長 + "IHDR" の後に、幅・高さが4バイトずつ並ぶ。
    if (buffer.length < 24) return null;
    if (buffer.toString("hex", 0, 8) !== PNG_SIGNATURE) return null;

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width <= 0 || height <= 0) return null;

    return { width, height };
  } catch {
    return null;
  }
}
