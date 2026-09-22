import type { CSSProperties } from "react";
import stage from "../scene/stage.module.css";
import styles from "./datautil.module.css";

// 「データが意思決定に変わる過程」を1つのステージで動かす。
//   数字のカードがバラバラに置かれる → カードが自分の列へ移動し棒グラフが伸びる →
//   数学だけが平均線より下で赤く浮かぶ → そこから「数学を重点学習」の行動カードが生まれる →
//   次のテストで数学の棒が伸びる（前回の高さは点線で残る＝Before/After）。
// 比較用の「ためるだけ」では、カードは保存箱にしまわれ、次のテストでも何も変わらない。

export type DataMode = "use" | "store";

export const SUBJECTS = [
  { name: "数学", score: 45 },
  { name: "国語", score: 78 },
  { name: "英語", score: 72 },
  { name: "理科", score: 80 },
] as const;
export const WEAK = "数学";
export const IMPROVED = 68;
export const AVERAGE = Math.round(SUBJECTS.reduce((a, s) => a + s.score, 0) / SUBJECTS.length);

const H = 232;
const BASE = 180; // 棒グラフの底
const PX_PER_POINT = 1.3;
const COL = (i: number) => 17 + i * 22; // 列の中心（%）
// 集めた直後の「数字の山」の置き場所（%, px, 傾き）
const SCATTER: [number, number, number][] = [
  [58, 132, 4],
  [22, 70, 3],
  [72, 60, -5],
  [34, 150, -3],
];

export type DecisionStageProps = {
  mode: DataMode;
  /** 0=目的 1=集める 2=見える化/保存 3=気づく 4=行動 5=次のテスト */
  phase: number;
  reducedMotion: boolean;
};

export function DecisionStage({ mode, phase, reducedMotion }: DecisionStageProps) {
  const use = mode === "use";
  const charted = use && phase >= 2;
  const stored = !use && phase >= 2;
  const insight = use && phase >= 3;
  const action = use && phase >= 4;
  const after = phase >= 5;

  return (
    <div
      className={`${stage.stage} ${styles.stage}`}
      style={{ height: H }}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="data-stage"
      data-mode={mode}
      data-phase={phase}
    >
      {phase === 0 && (
        <div className={styles.goal}>
          <span className={styles.goalIcon}>🎯</span>
          <span className={styles.goalText}>成績を上げたい！</span>
          <span className={styles.goalSub}>→ まず点数のデータを集めよう</span>
        </div>
      )}

      {/* 棒グラフの床と平均線 */}
      <div className={styles.axis} data-show={charted ? "true" : "false"} style={{ top: BASE }} aria-hidden />
      {insight && (
        <div className={styles.avg} style={{ top: BASE - AVERAGE * PX_PER_POINT }} data-testid="data-average">
          <span>平均 {AVERAGE}</span>
        </div>
      )}

      {/* 棒 */}
      {SUBJECTS.map((s, i) => {
        const weak = s.name === WEAK;
        const score = after && use && weak ? IMPROVED : s.score;
        return (
          <div
            key={s.name}
            className={styles.bar}
            data-show={charted ? "true" : "false"}
            data-tone={insight ? (weak ? (after ? "up" : "weak") : "dim") : "base"}
            style={{ left: `${COL(i)}%`, bottom: H - BASE, height: charted ? score * PX_PER_POINT : 0 }}
            data-testid={`data-bar-${s.name}`}
            data-score={charted ? score : undefined}
          >
            {charted && <span className={styles.barValue}>{score}</span>}
          </div>
        );
      })}

      {/* Before：前回の数学の高さを点線で残す */}
      {use && after && (
        <div className={styles.ghost} style={{ left: `${COL(0)}%`, bottom: H - BASE, height: SUBJECTS[0].score * PX_PER_POINT }} data-testid="data-before">
          <span className={styles.delta}>+{IMPROVED - SUBJECTS[0].score}</span>
        </div>
      )}

      {/* 数字のカード：バラバラ → 自分の列の下へ（活用）／保存箱の中へ（ためるだけ） */}
      {phase >= 1 &&
        SUBJECTS.map((s, i) => {
          const [sx, sy, tilt] = SCATTER[i];
          const pos: CSSProperties = charted
            ? { left: `${COL(i)}%`, top: BASE + 16 }
            : stored
              ? { left: "50%", top: 150 }
              : { left: `${sx}%`, top: sy, "--tilt": `${tilt}deg` } as CSSProperties;
          const weak = s.name === WEAK;
          return (
            <span
              key={s.name}
              className={`${stage.at} ${styles.card}`}
              style={pos}
              data-place={charted ? "chart" : stored ? "box" : "scatter"}
              data-weak={insight && weak ? "true" : "false"}
              data-testid={`data-card-${s.name}`}
            >
              {s.name}
              <b>{charted ? "" : ` ${s.score}`}</b>
            </span>
          );
        })}

      {/* ためるだけ：保存箱 */}
      {!use && phase >= 2 && (
        <div className={styles.box} data-testid="data-box">
          <span className={styles.boxLid} aria-hidden />
          <span className={styles.boxLabel}>📦 保存済み（{SUBJECTS.length}件）</span>
        </div>
      )}
      {!use && phase >= 3 && <span className={`${styles.note} ${stage.pop}`}>👀 眺めるだけ…何も見えてこない</span>}

      {/* 気づき → 行動 */}
      {insight && !action && (
        <span className={`${styles.callout} ${stage.pop}`} style={{ left: `${COL(0) + 18}%`, top: 44 }} data-testid="data-insight">
          ⚠ 数学だけ平均より {AVERAGE - SUBJECTS[0].score} 点低い
        </span>
      )}
      {action && (
        <span className={styles.action} data-testid="data-action">
          📘 行動：数学を重点学習
          <small>毎日の勉強に数学 +20分</small>
        </span>
      )}

      {after && (
        <span className={styles.nextTest} data-testid="data-next">
          {use ? `📈 次のテスト：数学 ${SUBJECTS[0].score} → ${IMPROVED}` : `次のテスト：数学 ${SUBJECTS[0].score} → ${SUBJECTS[0].score}（変化なし）`}
        </span>
      )}
    </div>
  );
}
