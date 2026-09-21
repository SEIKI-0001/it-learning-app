import styles from "./crypto.module.css";

// メッセージそのものを表すカプセル。同じカプセルが
// 平文 → 暗号文 → 復号済み と状態を変えることで「同じデータが元に戻った」と分かる。

export type CapsuleState = "plain" | "encrypted" | "decrypted" | "failed";

export const PLAIN_TEXT = "会議は10時";
export const CIPHER_TEXT = "7fQ#x9…";

const COPY: Record<CapsuleState, { tag: string; body: string; sub?: string }> = {
  plain: { tag: "平文", body: PLAIN_TEXT },
  encrypted: { tag: "ENCRYPTED DATA", body: CIPHER_TEXT },
  decrypted: { tag: "復号OK", body: PLAIN_TEXT },
  failed: { tag: "開かない", body: CIPHER_TEXT },
};

export function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 14 16" className={styles.lockIcon} data-locked={locked ? "true" : "false"} aria-hidden>
      <path
        className={styles.lockShackle}
        d={locked ? "M 3.5 7 V 4.8 a 3.5 3.5 0 0 1 7 0 V 7" : "M 3.5 7 V 4.8 a 3.5 3.5 0 0 1 7 0 V 5.4"}
        fill="none"
        strokeWidth={1.8}
        strokeLinecap="round"
        transform={locked ? undefined : "translate(0 -2.2)"}
      />
      <rect x={1.5} y={7} width={11} height={8} rx={2} className={styles.lockBody} />
      <circle cx={7} cy={10.6} r={1.3} className={styles.lockHole} />
    </svg>
  );
}

export function CipherCapsule({
  state,
  at,
  label,
  tag,
  body: bodyText,
}: {
  state: CapsuleState;
  at?: { left: string; top: string };
  /** スクリーンリーダー向けの補足 */
  label?: string;
  /** 表示文言の差し替え（HTTPS 体験などで中身を利用者が入力する場合） */
  tag?: string;
  body?: string;
}) {
  const copy = { tag: tag ?? COPY[state].tag, body: bodyText ?? COPY[state].body };
  const locked = state === "encrypted" || state === "failed";
  const body = (
    <span className={styles.capsule} data-state={state}>
      {/* key を変えて状態が切り替わった瞬間の演出を毎回再生する */}
      <span key={state} className={styles.capsuleFlash} aria-hidden />
      <LockIcon locked={locked} />
      <span className="flex min-w-0 flex-col items-start leading-none">
        <span className={styles.capsuleTag}>{copy.tag}</span>
        <span className={styles.capsuleBody}>{copy.body}</span>
      </span>
    </span>
  );
  if (!at) {
    return (
      <span className={styles.capsuleInline} data-capsule-state={state} aria-label={label}>
        {body}
      </span>
    );
  }
  return (
    <div className={styles.capsuleAnchor} style={at} data-capsule-state={state} aria-label={label} role="img">
      <span aria-hidden className={styles.capsuleShadow} />
      {body}
    </div>
  );
}
