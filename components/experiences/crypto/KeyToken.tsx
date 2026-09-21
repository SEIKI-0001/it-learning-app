import { useId } from "react";
import styles from "./crypto.module.css";

// 鍵を「物体」として描く。公開鍵と秘密鍵は色だけでなく、
// 持ち手の形（丸／六角）・歯の形・ラベル（PUBLIC／PRIVATE）でも区別する。

export type KeyKind = "public" | "private";

export function KeyGlyph({ kind, owner = "B" }: { kind: KeyKind; owner?: string }) {
  // スライドごとに非表示の SVG があっても参照が切れないよう、グラデーション id は個別に振る
  const id = `key-grad-${kind}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 44 20" className={styles.keyGlyph} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={kind === "public" ? "#5EE0B5" : "#FB7A93"} />
          <stop offset="0.55" stopColor={kind === "public" ? "#16A37A" : "#E11D48"} />
          <stop offset="1" stopColor={kind === "public" ? "#0B7457" : "#9F1239"} />
        </linearGradient>
      </defs>
      {/* 厚み（下にずらした影の面） */}
      <g transform="translate(0 1.6)" fill={kind === "public" ? "#075E46" : "#7F1030"}>
        {kind === "public" ? (
          <circle cx={9} cy={10} r={8} />
        ) : (
          <path d="M 9 1.6 L 16.3 5.8 L 16.3 14.2 L 9 18.4 L 1.7 14.2 L 1.7 5.8 Z" />
        )}
        <rect x={15} y={7.8} width={25} height={4.4} rx={1.2} />
      </g>
      {/* 軸と歯 */}
      <rect x={15} y={7.8} width={25} height={4.4} rx={1.2} fill={`url(#${id})`} />
      {kind === "public" ? (
        <path d="M 27 12 L 27 16 L 30 16 L 30 12 M 34 12 L 34 15 L 37 15 L 37 12" fill={`url(#${id})`} stroke={`url(#${id})`} />
      ) : (
        <path d="M 25 12 L 26.5 17 L 28 12 Z M 30 12 L 31.5 17.4 L 33 12 Z M 35 12 L 36.5 16 L 38 12 Z" fill={`url(#${id})`} />
      )}
      <rect x={16} y={8.4} width={23} height={1.1} rx={0.5} fill="#ffffff" opacity={0.45} />
      {/* 持ち手 */}
      {kind === "public" ? (
        <circle cx={9} cy={10} r={8} fill={`url(#${id})`} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={0.8} />
      ) : (
        <path
          d="M 9 1.6 L 16.3 5.8 L 16.3 14.2 L 9 18.4 L 1.7 14.2 L 1.7 5.8 Z"
          fill={`url(#${id})`}
          stroke="#ffffff"
          strokeOpacity={0.5}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      )}
      <text x={9} y={13.2} textAnchor="middle" fontSize={9} fontWeight={800} fill="#ffffff">
        {owner}
      </text>
    </svg>
  );
}

export function KeyTag({ kind }: { kind: KeyKind }) {
  return (
    <span className={styles.keyTag} data-kind={kind}>
      {kind === "private" && (
        <svg viewBox="0 0 10 12" className={styles.keyTagLock} aria-hidden>
          <path d="M 2.5 5 V 3.6 a 2.5 2.5 0 0 1 5 0 V 5" fill="none" stroke="currentColor" strokeWidth={1.4} />
          <rect x={1} y={5} width={8} height={6} rx={1.2} fill="currentColor" />
        </svg>
      )}
      {kind === "public" ? "PUBLIC" : "PRIVATE"}
    </span>
  );
}

/** シーン上に置く鍵。left/top の transition で「移動」を見せる。 */
export function KeyToken({
  kind,
  at,
  spot,
  caption,
  emphasis = false,
}: {
  kind: KeyKind;
  at: { left: string; top: string };
  spot: string;
  caption?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={styles.keyAnchor}
      style={at}
      data-key={kind}
      data-spot={spot}
      data-emphasis={emphasis ? "true" : "false"}
      aria-label={kind === "public" ? "Bの公開鍵" : "Bの秘密鍵"}
      role="img"
    >
      <span aria-hidden className={styles.keyShadow} />
      <span className={styles.keyBody}>
        <KeyGlyph kind={kind} />
        <KeyTag kind={kind} />
      </span>
      {caption && <span className={styles.keyCaption}>{caption}</span>}
    </div>
  );
}
