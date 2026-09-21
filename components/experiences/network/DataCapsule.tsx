import { toPercent, type ScreenPoint } from "./NetworkSceneBase";
import styles from "./network.module.css";

// 通信データそのものを表す半透明カプセル。シーン座標でレール上に浮かび、
// 押すと中身（種類・送信元→宛先・内容）を確認できる。

export type CapsuleKind = "input" | "query" | "response" | "connect" | "connected" | "page" | "timeout";

export function DataCapsule({
  kind,
  tag,
  payload,
  at,
  expanded,
  onToggle,
}: {
  kind: CapsuleKind;
  tag: string;
  payload: string;
  at: ScreenPoint;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={styles.capsuleAnchor} style={toPercent(at)} data-capsule-kind={kind}>
      <span aria-hidden className={styles.capsuleShadow} />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label="流れているデータの中身を見る"
        className={kind === "timeout" ? `${styles.capsule} ${styles.capsule_timeout}` : styles.capsule}
      >
        <span aria-hidden className={styles.capsuleCore} />
        <span className="flex min-w-0 flex-col items-start leading-none">
          <span className={styles.capsuleTag}>{tag}</span>
          <span className={styles.capsulePayload}>{payload}</span>
        </span>
      </button>
    </div>
  );
}
