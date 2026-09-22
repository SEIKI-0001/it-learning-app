import type { CSSProperties } from "react";
import styles from "./threec.module.css";

// 3C分析の定番図（2D）：顧客・競合・自社の3つの円が重なり、真ん中が「作戦」。
// 各円を調べると事実が円の中に書き込まれ、3つそろうと重なり部分に作戦が浮かぶ。

export type Spot = "customer" | "competitor" | "company";

export const SPOT_META: Record<Spot, { label: string; en: string; short: string; tone: string; action: string }> = {
  customer: { label: "顧客", en: "Customer", short: "安くて写真映え", tone: "#0EA5E9", action: "顧客を調べる" },
  competitor: { label: "競合", en: "Competitor", short: "高い・提供が遅い", tone: "#F43F5E", action: "競合を調べる" },
  company: { label: "自社", en: "Company", short: "安い・早い・トッピング豊富", tone: "#10B981", action: "自社を調べる" },
};

const SPOTS: Spot[] = ["customer", "competitor", "company"];

export type VennSceneProps = {
  researched: Record<Spot, boolean>;
  focus: Spot | null;
  costTries: number;
  strategy: string;
  onResearch: (spot: Spot) => void;
};

export function VennScene({ researched, focus, costTries, strategy, onResearch }: VennSceneProps) {
  const count = SPOTS.filter((s) => researched[s]).length;
  const complete = count === 3;

  return (
    <div className={styles.venn} data-complete={complete ? "true" : "false"} data-testid="venn-3c">
      {SPOTS.map((s) => (
        <div
          key={s}
          className={styles.circle}
          data-spot={s}
          data-researched={researched[s] ? "true" : "false"}
          data-focus={focus === s ? "true" : "false"}
          style={{ "--tone": SPOT_META[s].tone } as CSSProperties}
          aria-hidden
        />
      ))}

      {SPOTS.map((s) => (
        <div key={s} className={styles.spotBox} data-spot={s} style={{ "--tone": SPOT_META[s].tone } as CSSProperties}>
          <span className={styles.spotName}>
            {SPOT_META[s].label}
            <small>{SPOT_META[s].en}</small>
          </span>
          {researched[s] ? (
            <button
              type="button"
              onClick={() => onResearch(s)}
              className={styles.fact}
              data-testid={`fact-${s}`}
              aria-pressed={focus === s}
            >
              {SPOT_META[s].short}
            </button>
          ) : (
            <button type="button" onClick={() => onResearch(s)} className={styles.probe} aria-pressed={false}>
              🔍 {SPOT_META[s].action}
            </button>
          )}
        </div>
      ))}

      {/* 3つの円が重なる真ん中＝作戦 */}
      <div className={styles.board} data-count={count} data-complete={complete ? "true" : "false"} data-testid="strategy-board">
        <span className={styles.boardTitle}>{complete ? "✨ 作戦" : `作戦 ${count}/3`}</span>
        {complete ? (
          <span className={styles.boardStrategy} data-testid="strategy">
            {strategy}
          </span>
        ) : (
          <span className={styles.boardSlots} aria-hidden>
            {SPOTS.map((s) => (
              <span key={s} className={styles.slot} data-filled={researched[s] ? "true" : "false"} style={{ "--tone": SPOT_META[s].tone } as CSSProperties} />
            ))}
          </span>
        )}
      </div>

      {costTries > 0 && (
        <span key={costTries} className={styles.reject} role="status" data-testid="cost-reject">
          💰 材料費300円 → ✕ Cost（費用）は3Cに入らない
        </span>
      )}
    </div>
  );
}
