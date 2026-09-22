import type { CSSProperties } from "react";
import stage from "../scene/stage.module.css";
import styles from "./aiml.module.css";

// 機械学習の流れを1つの 2.5D ステージで見せる。
//   左：ラベル付きの学習データ（🐶犬 / 🐱猫 のカード）
//   中：モデル（箱）。前面は「特徴の平面」（横=鼻の長さ、縦=耳のとがり）。
//       学習データが1枚ずつ飛び込んで点になり、点を分ける「判断の境界線」がだんだん正しい向きに回る。
//   右：判定結果。未知の写真を入れると、境界線のどちら側に落ちたか・どれだけ離れているかで「犬 92%」が出る。

export const SCENE_W = 320;
export const SCENE_H = 250;

// 特徴の平面（モデルの前面）
const PLANE = { x: 110, y: 80, size: 100 };
const DEPTH = { x: 10, y: -8 };

export type Example = { id: string; kind: "dog" | "cat"; fx: number; fy: number };

/** 学習データ8枚（fx=鼻の長さ, fy=耳のとがり。0〜1） */
export const EXAMPLES: Example[] = [
  { id: "d1", kind: "dog", fx: 0.72, fy: 0.25 },
  { id: "c1", kind: "cat", fx: 0.25, fy: 0.75 },
  { id: "d2", kind: "dog", fx: 0.86, fy: 0.42 },
  { id: "c2", kind: "cat", fx: 0.15, fy: 0.58 },
  { id: "d3", kind: "dog", fx: 0.6, fy: 0.14 },
  { id: "c3", kind: "cat", fx: 0.36, fy: 0.88 },
  { id: "d4", kind: "dog", fx: 0.8, fy: 0.08 },
  { id: "c4", kind: "cat", fx: 0.3, fy: 0.52 },
];

export type Unknown = { id: string; label: string; emoji: string; fx: number; fy: number };

export const UNKNOWNS: Unknown[] = [
  { id: "a", label: "写真A", emoji: "🐕", fx: 0.86, fy: 0.28 },
  { id: "b", label: "写真B", emoji: "🐈", fx: 0.22, fy: 0.8 },
  { id: "c", label: "写真C", emoji: "🐾", fx: 0.53, fy: 0.46 },
];

/** 判断の境界線（平面上の点 pivot を通り、angle 度傾いた直線。上側=猫、下側=犬） */
export type Boundary = { px: number; py: number; angle: number };

export const BOUNDARY_ROUGH: Boundary = { px: 0.5, py: 0.8, angle: -8 };
export const BOUNDARY_FINAL: Boundary = { px: 0.5, py: 0.5, angle: 45 };

/** その境界で見たとき、点が猫側（上側）にあるか */
export function isCatSide(b: Boundary, fx: number, fy: number) {
  return fy > b.py + Math.tan((b.angle * Math.PI) / 180) * (fx - b.px);
}

/** 境界からの距離 → 犬である確率（学習用の簡略式） */
export function predict(u: { fx: number; fy: number }) {
  const d = (u.fx - u.fy) / Math.SQRT2;
  const dog = 1 / (1 + Math.exp(-6 * d));
  return dog >= 0.5 ? { kind: "dog" as const, pct: Math.round(dog * 100) } : { kind: "cat" as const, pct: Math.round((1 - dog) * 100) };
}

const toScreen = (fx: number, fy: number) => ({ x: PLANE.x + fx * PLANE.size, y: PLANE.y + (1 - fy) * PLANE.size });
const pct = (x: number, y: number): CSSProperties => ({ left: `${(x / SCENE_W) * 100}%`, top: `${(y / SCENE_H) * 100}%` });
const PILE = (i: number) => ({ x: 30 + (i % 2) * 34, y: 96 + Math.floor(i / 2) * 30 });
const UNKNOWN_HOME = { x: 47, y: 228 };
const OUT = { x: 268, y: 130 };

export type LearningSceneProps = {
  /** モデルに入った学習データの枚数（先頭から） */
  learned: number;
  boundary: Boundary | null;
  /** 学習データに対する正解数の表示（null=非表示） */
  score: { ok: number; total: number } | null;
  complete: boolean;
  unknown: Unknown;
  unknownIn: boolean;
  showResult: boolean;
  reducedMotion: boolean;
};

const KIND = { dog: { emoji: "🐶", label: "犬" }, cat: { emoji: "🐱", label: "猫" } } as const;

export function LearningScene({ learned, boundary, score, complete, unknown, unknownIn, showResult, reducedMotion }: LearningSceneProps) {
  const center = boundary ? toScreen(boundary.px, boundary.py) : null;
  const result = predict(unknown);
  const u = toScreen(unknown.fx, unknown.fy);
  const { x, y, size } = PLANE;
  return (
    <div
      className={`${stage.stage} ${styles.scene}`}
      style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="ml-scene"
      data-learned={learned}
      data-complete={complete ? "true" : "false"}
    >
      <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className={stage.svg} role="img" aria-label="左に犬と猫の学習データ、中央にモデルの箱、右に判定結果。モデルの前面は特徴の平面で、学習データは点になって並ぶ">
        <defs>
          <clipPath id="ml-plane-clip">
            <rect x={x} y={y} width={size} height={size} />
          </clipPath>
        </defs>
        {/* 学習データの台 */}
        <polygon points={`16,80 94,80 100,74 22,74`} fill="#DCE4EF" />
        <rect x={16} y={80} width={78} height={120} rx={3} fill="#EEF2F8" stroke="#D5DEEC" />
        {/* モデルの箱（上面・右側面・前面） */}
        <polygon points={`${x},${y} ${x + size},${y} ${x + size + DEPTH.x},${y + DEPTH.y} ${x + DEPTH.x},${y + DEPTH.y}`} className={styles.boxTop} />
        <polygon points={`${x + size},${y} ${x + size + DEPTH.x},${y + DEPTH.y} ${x + size + DEPTH.x},${y + size + DEPTH.y} ${x + size},${y + size}`} className={styles.boxSide} />
        <rect x={x} y={y} width={size} height={size} className={styles.plane} data-complete={complete ? "true" : "false"} />
        {/* 平面のグリッド */}
        <g stroke="#E3E9F2" strokeWidth={0.6}>
          {[0.25, 0.5, 0.75].map((t) => (
            <g key={t}>
              <line x1={x + t * size} y1={y} x2={x + t * size} y2={y + size} />
              <line x1={x} y1={y + t * size} x2={x + size} y2={y + t * size} />
            </g>
          ))}
        </g>
        {/* 判断の境界（学習が進むと回って落ち着く）。上側=猫の領域、下側=犬の領域 */}
        {boundary && center && (
          <g clipPath="url(#ml-plane-clip)">
            <g
              className={styles.boundary}
              style={{ transform: `translate(${center.x}px, ${center.y}px) rotate(${-boundary.angle}deg)` }}
              data-testid="ml-boundary"
              data-angle={boundary.angle}
            >
              <rect x={-160} y={-160} width={320} height={160} className={styles.zoneCat} data-strong={complete ? "true" : "false"} />
              <rect x={-160} y={0} width={320} height={160} className={styles.zoneDog} data-strong={complete ? "true" : "false"} />
              <line x1={-160} y1={0} x2={160} y2={0} className={styles.boundaryLine} />
            </g>
          </g>
        )}
        <rect x={x} y={y} width={size} height={size} fill="none" stroke="#B9C5D6" strokeWidth={1} />
        {/* 学習済みの点 */}
        {EXAMPLES.slice(0, learned).map((e) => {
          const p = toScreen(e.fx, e.fy);
          const wrong = boundary ? isCatSide(boundary, e.fx, e.fy) !== (e.kind === "cat") : false;
          return (
            <g key={e.id} transform={`translate(${p.x} ${p.y})`}>
              <g className={styles.dot} data-kind={e.kind} data-wrong={wrong ? "true" : "false"} data-testid={`ml-dot-${e.id}`}>
                {wrong && <circle r={8.5} className={styles.wrongRing} />}
                <circle r={5.2} />
                <text y={2.4} textAnchor="middle" fontSize={6.5}>
                  {KIND[e.kind].emoji}
                </text>
              </g>
            </g>
          );
        })}
        {/* 未知の写真が落ちた位置 */}
        {unknownIn && (
          <g transform={`translate(${u.x} ${u.y})`}>
            <g className={styles.unknownDot} data-testid="ml-unknown-dot">
              <circle r={6.5} />
            </g>
          </g>
        )}
        {/* 判定結果の台 */}
        <polygon points={`${OUT.x - 38},${OUT.y + 34} ${OUT.x + 38},${OUT.y + 34} ${OUT.x + 44},${OUT.y + 28} ${OUT.x - 32},${OUT.y + 28}`} fill="#DCE4EF" />
        <line x1={x + size + DEPTH.x + 2} y1={OUT.y} x2={OUT.x - 40} y2={OUT.y} className={styles.outRail} data-active={showResult ? "true" : "false"} />
      </svg>

      <span className={styles.caption} style={pct(55, 64)}>学習データ（正解つき）</span>
      <span className={styles.caption} style={pct(x + size / 2 + 4, 58)}>
        モデル{complete ? "（判断の型）" : learned === 0 ? "（まだ空っぽ）" : "（学習中）"}
      </span>
      <span className={styles.axis} style={pct(x + size / 2, y + size + 9)}>鼻が長い →</span>
      <span className={`${styles.axis} ${styles.axisY}`} style={pct(x - 7, y + size / 2)}>耳がとがる →</span>
      <span className={styles.caption} style={pct(OUT.x, 88)}>判定</span>

      {learned === 0 && (
        <span className={styles.emptyNote} style={pct(x + size / 2, y + size / 2)}>
          答えは
          <br />
          まだ知らない
        </span>
      )}

      {complete && (
        <>
          <span className={`${styles.zoneLabel} ${styles.zoneLabelCat}`} style={pct(x + 0.13 * size, y + 0.7 * size)}>🐱 猫</span>
          <span className={`${styles.zoneLabel} ${styles.zoneLabelDog}`} style={pct(x + 0.87 * size, y + 0.3 * size)}>🐶 犬</span>
        </>
      )}

      {score && (
        <span className={styles.score} style={pct(x + size / 2 + 4, y + size + 22)} data-testid="ml-score" data-ok={score.ok} data-total={score.total}>
          学習データの正解 {score.ok}/{score.total}
        </span>
      )}

      {/* 学習データのカード：学習するとモデルの中の点の位置へ飛び込む */}
      {EXAMPLES.map((e, i) => {
        const inModel = i < learned;
        const at = inModel ? toScreen(e.fx, e.fy) : PILE(i);
        return (
          <span
            key={e.id}
            className={`${stage.at} ${styles.card}`}
            style={pct(at.x, at.y)}
            data-kind={e.kind}
            data-in={inModel ? "true" : "false"}
            data-testid={`ml-example-${e.id}`}
            role="img"
            aria-label={`学習データ：${KIND[e.kind].label}${inModel ? "（学習済み）" : ""}`}
          >
            <span className={styles.cardEmoji}>{KIND[e.kind].emoji}</span>
            <span className={styles.cardLabel}>{KIND[e.kind].label}</span>
          </span>
        );
      })}

      {/* 未知の写真：ラベルなし */}
      <span
        className={`${stage.at} ${styles.card} ${styles.unknownCard}`}
        style={pct(unknownIn ? u.x : UNKNOWN_HOME.x, unknownIn ? u.y : UNKNOWN_HOME.y)}
        data-in={unknownIn ? "true" : "false"}
        data-testid="ml-unknown"
        role="img"
        aria-label={`はじめて見る${unknown.label}（ラベルなし）`}
      >
        <span className={styles.cardEmoji}>{unknown.emoji}</span>
        <span className={styles.cardLabel}>？</span>
      </span>
      {!unknownIn && <span className={styles.caption} style={pct(UNKNOWN_HOME.x + 42, UNKNOWN_HOME.y)}>← 初めて見る写真</span>}

      {/* 判定結果 */}
      <div className={`${stage.at} ${styles.result}`} style={pct(OUT.x, OUT.y)} data-show={showResult ? "true" : "false"} data-testid="ml-result" data-kind={result.kind}>
        {showResult ? (
          <>
            <span className={styles.resultMain}>
              {KIND[result.kind].emoji} {KIND[result.kind].label} {result.pct}%
            </span>
            <span className={styles.resultBar}>
              <span style={{ width: `${result.pct}%` }} />
            </span>
            <span className={styles.resultSub}>{result.pct < 70 ? "境界に近い＝自信が低い" : "境界から遠い＝自信が高い"}</span>
          </>
        ) : (
          <span className={styles.resultWait}>{unknownIn ? "判定中…" : "—"}</span>
        )}
      </div>
    </div>
  );
}
