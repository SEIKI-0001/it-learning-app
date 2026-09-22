import type { CSSProperties } from "react";
import styles from "./process.module.css";

// 業務フローを1本のレーン（2D）で描く。改善前・改善後を同じ形で上下に並べて比べる。
// 各工程の上に「処理待ちの書類」が積み上がる。改善前のボトルネックは赤で強く示す。

export type LaneStation = {
  name: string;
  emoji: string;
  minutes: number;
  queue: number;
  /** 処理中の書類の進み具合（0〜1）。処理中でなければ null */
  work: number | null;
  bottleneck: boolean;
};

const MAX_MINUTES = 30;
const MAX_PILE = 5;

export function ProcessLane({
  kind,
  title,
  stations,
  incoming,
  done,
  total,
  perDoc,
  finishedAt,
}: {
  kind: "before" | "after";
  title: string;
  stations: LaneStation[];
  incoming: number;
  done: number;
  total: number;
  /** 1件あたりの合計時間 */
  perDoc: number;
  /** 全件が終わった時刻（まだなら null） */
  finishedAt: number | null;
}) {
  return (
    <section className={styles.lane} data-kind={kind} data-testid={`lane-${kind}`} aria-label={title}>
      <header className={styles.laneHead}>
        <span className={styles.laneTitle}>{title}</span>
        <span className={styles.lanePerDoc}>1件 {perDoc}分</span>
        <span className={styles.laneDone} data-testid={`done-${kind}`}>
          {finishedAt !== null ? `✅ ${total}件完了（${finishedAt}分）` : `発送済 ${done}/${total}`}
        </span>
      </header>

      <div className={styles.laneBody}>
        <div className={styles.inbox} aria-label={`到着前の書類 ${incoming}件`}>
          <span className={styles.inboxIcon} aria-hidden>
            📨
          </span>
          <span className={styles.inboxCount}>{incoming}</span>
        </div>

        {stations.map((s, i) => {
          const pile = Math.min(s.queue, MAX_PILE);
          return (
            <div
              key={s.name}
              className={styles.col}
              data-bottleneck={s.bottleneck ? "true" : "false"}
              data-testid={`${kind}-station-${i}`}
            >
              {s.bottleneck && <span className={styles.bottleneckTag}>🚨ボトルネック</span>}
              {/* 処理待ちの山 */}
              <div className={styles.pile} aria-hidden>
                {Array.from({ length: pile }, (_, k) => (
                  <span key={k} className={styles.pileDoc} style={{ "--k": k } as CSSProperties} />
                ))}
              </div>
              <span className={styles.queueLabel} data-empty={s.queue === 0 ? "true" : "false"} data-testid={s.queue > 0 ? `${kind}-queue-${i}` : undefined}>
                {s.queue > 0 ? `待ち${s.queue}件` : "待ちなし"}
              </span>

              <div className={styles.station}>
                <span className={styles.stationName}>
                  <span aria-hidden>{s.emoji}</span>
                  {s.name}
                </span>
                <span className={styles.bar} aria-hidden>
                  <span style={{ width: `${(s.minutes / MAX_MINUTES) * 100}%` }} />
                </span>
                <span className={styles.minutes}>{s.minutes}分</span>
                <span className={styles.work} data-busy={s.work !== null ? "true" : "false"} aria-hidden>
                  <span style={{ width: `${(s.work ?? 0) * 100}%` }} />
                </span>
              </div>
            </div>
          );
        })}

        <div className={styles.outbox} aria-label={`発送済み ${done}件`}>
          <span aria-hidden>📦</span>
          <span className={styles.inboxCount}>{done}</span>
        </div>
      </div>
    </section>
  );
}
