/**
 * 文字列の安定ハッシュ（FNV-1a 32bit, base36）。
 * 暗号用途ではない。同一性判定（構造が変わったか・計画の前提が同じか）にだけ使う。
 * ブラウザ・サーバーの両方で同じ値になる（node:crypto に依存しない）。
 */
export function stableHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
