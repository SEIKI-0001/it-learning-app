// 学習用の簡易変換（本物の暗号・ハッシュではない）。可逆／一方向の「感覚」をつかむためのもの。

/** 16桁の16進ハッシュ値。最後に混ぜ直し（fmix）を入れ、1文字の違いでも全体が大きく変わるようにする。 */
export function hashHex(s: string): string {
  const mk = (seed: number) => {
    let h = seed >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0).toString(16).padStart(8, "0");
  };
  return (mk(0x811c9dc5) + mk(0x12345678)).toUpperCase();
}

const CIPHER_TABLE = "Q#7x%K@z&9$Rw!mP";

/** 見た目用の暗号文（同じ長さの読めない記号列）。鍵が同じなら同じ暗号文になる。 */
export function toyCipher(text: string, key: number): string {
  return [...text].map((c, i) => CIPHER_TABLE[(c.charCodeAt(0) * 5 + key * 3 + i * 7) % CIPHER_TABLE.length]).join("");
}

/** 2つのハッシュ値で、位置ごとに違う文字の数 */
export function diffCount(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) n++;
  return n;
}
