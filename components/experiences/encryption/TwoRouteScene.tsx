import type { CSSProperties } from "react";
import stage from "../scene/stage.module.css";
import styles from "./encryption.module.css";

// 同じ平文を2本のレーンへ流す 2D の図。
//   上：暗号化ルート  平文 →[🔑]→ 暗号文 →[🔑]→ 平文（元に戻る）
//   下：ハッシュルート 平文 →[ハッシュ関数]→ ハッシュ値 →（逆向きには門を通れない）
// データは1枚のカードで、門を通過した瞬間に中身が変わる（遷移の途中で面が切り替わる）。

export const SCENE_W = 320;
export const SCENE_H = 240;
const ENC_Y = 84;
const HASH_Y = 192;

const X = { start: 46, gate1: 104, mid: 160, gate2: 216, end: 274, digest: 216, back: 188 } as const;
// ハッシュ側のカードは（隠れた面のハッシュ値のぶん）幅が広いので、箱を少し右に置く
const HX = { start: 54, gate1: 126, digest: 232, back: 222 } as const;

export type EncPos = "start" | "mid" | "end";
export type EncState = "plain" | "cipher" | "restored";
export type HashPos = "start" | "digest" | "back";
export type HashState = "plain" | "digest" | "blocked";

export type TwoRouteSceneProps = {
  input: string;
  /** ハッシュルートに流す入力（最後のステップで1文字変えられる） */
  hashInput: string;
  cipher: string;
  digest: string;
  enc: { pos: EncPos; state: EncState; gate: "gate1" | "gate2" | null };
  hash: { pos: HashPos; state: HashState; gate: boolean; rerun?: boolean };
  focus: "both" | "enc" | "hash";
  reducedMotion: boolean;
};

const pct = (x: number, y: number): CSSProperties => ({ left: `${(x / SCENE_W) * 100}%`, top: `${(y / SCENE_H) * 100}%` });

function Track({ y, color }: { y: number; color: string }) {
  const x0 = 14;
  const x1 = 306;
  return (
    <g>
      <line x1={x0} y1={y} x2={x1 - 6} y2={y} stroke={color} strokeOpacity={0.35} strokeWidth={2} />
      <path d={`M ${x1 - 8} ${y - 5} L ${x1} ${y} L ${x1 - 8} ${y + 5}`} fill="none" stroke={color} strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** 処理の「箱」。カードはこの箱を通り抜けるときに中身が変わる */
function Gate({ x, y, color, active, blocked, w = 22 }: { x: number; y: number; color: string; active: boolean; blocked?: boolean; w?: number }) {
  return (
    <g className={styles.gate} data-active={active ? "true" : "false"} data-blocked={blocked ? "true" : "false"} style={{ "--gate": color } as CSSProperties}>
      <rect x={x - w} y={y - 46} width={w * 2} height={58} rx={6} className={styles.gateFace} />
    </g>
  );
}

export function TwoRouteScene({ input, hashInput, cipher, digest, enc, hash, focus, reducedMotion }: TwoRouteSceneProps) {
  const encText = enc.state === "cipher" ? "cipher" : "plain";
  const hashText = hash.state === "plain" ? "plain" : "digest";
  const short = `${digest.slice(0, 8)}…`;
  return (
    <div
      className={`${stage.stage} ${styles.scene}`}
      style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="enc-hash-scene"
    >
      <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className={stage.svg} role="img" aria-label="上のレーンは暗号化ルート（鍵の箱を2回通る）、下のレーンはハッシュルート（ハッシュ関数の箱を1回通る）">
        <g className={styles.lane} data-dim={focus === "hash" ? "true" : "false"}>
          <Track y={ENC_Y} color="#4F46E5" />
          <Gate x={X.gate1} y={ENC_Y} color="#4F46E5" active={enc.gate === "gate1"} />
          <Gate x={X.gate2} y={ENC_Y} color="#059669" active={enc.gate === "gate2"} />
        </g>
        <g className={styles.lane} data-dim={focus === "enc" ? "true" : "false"}>
          <Track y={HASH_Y} color="#0F766E" />
          <Gate x={HX.gate1} y={HASH_Y} color="#0F766E" active={hash.gate} blocked={hash.state === "blocked"} w={25} />
          {hash.state === "blocked" && (
            <g className={styles.reverse} data-testid="hash-reverse">
              {/* レーンの下に「押し戻す」向きの矢印。箱の手前で止まる */}
              <path d={`M ${HX.digest + 20} ${HASH_Y + 24} L ${HX.gate1 + 30} ${HASH_Y + 24}`} className={styles.reverseLine} />
              <path d={`M ${HX.gate1 + 36} ${HASH_Y + 20} L ${HX.gate1 + 30} ${HASH_Y + 24} L ${HX.gate1 + 36} ${HASH_Y + 28}`} className={styles.reverseHead} />
            </g>
          )}
        </g>
      </svg>

      {/* ルート名 */}
      <span className={`${styles.routeTitle} ${styles.routeEnc}`} style={pct(10, ENC_Y - 66)} data-dim={focus === "hash" ? "true" : "false"}>
        🔒 暗号化ルート
      </span>
      <span className={`${styles.routeTitle} ${styles.routeHash}`} style={pct(10, HASH_Y - 66)} data-dim={focus === "enc" ? "true" : "false"}>
        🥤 ハッシュルート
      </span>

      {/* 箱の札 */}
      <span className={styles.gateLabel} style={pct(X.gate1, ENC_Y - 39)} data-dim={focus === "hash" ? "true" : "false"}>🔑 暗号化</span>
      <span className={styles.gateLabel} style={pct(X.gate2, ENC_Y - 39)} data-dim={focus === "hash" ? "true" : "false"}>🔑 復号</span>
      <span className={styles.gateLabel} style={pct(HX.gate1, HASH_Y - 39)} data-dim={focus === "enc" ? "true" : "false"}>ハッシュ関数</span>

      {hash.state === "blocked" && (
        <>
          <span className={`${stage.at} ${stage.pop} ${styles.barrier}`} style={pct(HX.gate1 + 36, HASH_Y - 20)} data-testid="hash-barrier" role="img" aria-label="逆向きには門を通れない">
            ✕
          </span>
          <span className={`${stage.at} ${stage.pop} ${styles.ghost}`} style={pct(HX.start, HASH_Y - 16)} data-testid="hash-ghost">
            <span className={styles.ghostText}>？？？</span>
            <span className={styles.cardTag}>元の入力は作れない</span>
          </span>
        </>
      )}

      {/* 暗号化ルートのデータ（1枚のカードが門で姿を変える） */}
      <div
        className={`${stage.at} ${styles.card}`}
        style={pct(X[enc.pos], ENC_Y - 16)}
        data-testid="enc-card"
        data-pos={enc.pos}
        data-state={enc.state}
        data-dim={focus === "hash" ? "true" : "false"}
        role="img"
        aria-label={enc.state === "cipher" ? `暗号文：${cipher}` : enc.state === "restored" ? `元に戻った平文：${input}` : `平文：${input}`}
      >
        <span className={styles.faces}>
          <span className={styles.face} data-on={encText === "plain" ? "true" : "false"}>{input}</span>
          <span className={`${styles.face} ${styles.mono}`} data-on={encText === "cipher" ? "true" : "false"}>{cipher}</span>
        </span>
        <span className={styles.cardTag}>{enc.state === "cipher" ? "暗号文（読めない）" : enc.state === "restored" ? "✓ 元どおり" : "平文"}</span>
      </div>

      {/* ハッシュルートのデータ */}
      <div
        key={hash.rerun ? `rerun-${hashInput}` : "run"}
        className={`${stage.at} ${styles.card} ${hash.rerun ? styles.rerun : ""}`}
        style={pct(HX[hash.pos], HASH_Y - 16)}
        data-testid="hash-card"
        data-pos={hash.pos}
        data-state={hash.state}
        data-dim={focus === "enc" ? "true" : "false"}
        role="img"
        aria-label={hash.state === "plain" ? `平文：${hashInput}` : `ハッシュ値：${digest}`}
      >
        <span className={styles.faces}>
          <span className={styles.face} data-on={hashText === "plain" ? "true" : "false"}>{hashInput}</span>
          <span className={`${styles.face} ${styles.mono}`} data-on={hashText === "digest" ? "true" : "false"}>{short}</span>
        </span>
        <span className={styles.cardTag}>{hash.state === "plain" ? "平文" : hash.state === "blocked" ? "✕ 戻れない" : "ハッシュ値（固定長）"}</span>
      </div>
    </div>
  );
}
