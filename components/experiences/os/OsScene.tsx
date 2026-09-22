import type { CSSProperties } from "react";
import { SCENE_HEIGHT, SCENE_WIDTH, isoBox, isoLocal, toPercent, type NodeState, type ScreenPoint } from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";
import { SceneDefs } from "../scene/IsoParts";
import styles from "./os.module.css";

// スマホの中身を3枚の板に分解した模型（分解図）。上から アプリ / OS / ハードウェア。
// 要求（リクエスト）は板を上から下へ、結果は下から上へ流れる。
// アプリがハードウェアへ直接届こうとすると、OS の板で止められる。

export type OsLayer = "app" | "os" | "hw";
export type OsPart = "music" | "files" | "core" | "cpu" | "speaker" | "storage" | "user" | "wallL" | "wallR";
type BlockPart = Exclude<OsPart, "user" | "wallL" | "wallR">;

const LEVEL_Y: Record<OsLayer, number> = { app: 66, os: 138, hw: 208 };
const SLAB = { x0: -68, x1: 68, y0: -20, y1: 20 };
const THICK = 7;
const CX = 176;

function P(layer: OsLayer, x: number, y: number, z = 0): ScreenPoint {
  const p = isoLocal(x, y, z);
  return { x: CX + p.x, y: LEVEL_Y[layer] + p.y };
}

const PART: Record<BlockPart, { layer: OsLayer; x: number; y: number; icon: string; name: string }> = {
  music: { layer: "app", x: -34, y: 0, icon: "🎵", name: "音楽App" },
  files: { layer: "app", x: 34, y: 0, icon: "📝", name: "メモApp" },
  core: { layer: "os", x: 0, y: 0, icon: "⚙️", name: "OS" },
  cpu: { layer: "hw", x: -42, y: 0, icon: "🧠", name: "CPU" },
  speaker: { layer: "hw", x: 0, y: 2, icon: "🔊", name: "スピーカー" },
  storage: { layer: "hw", x: 42, y: 0, icon: "💾", name: "ストレージ" },
};

export function partAt(part: OsPart): ScreenPoint {
  if (part === "user") return { x: 262, y: 22 };
  // 直接アクセスを止める OS の板の上の地点（アプリの真下）
  if (part === "wallL") return P("os", -34, 0, 2);
  if (part === "wallR") return P("os", 34, 0, 2);
  const p = PART[part];
  return P(p.layer, p.x, p.y, 16);
}

const LAYER_META: Record<OsLayer, { name: string; sub: string; face: string; side: string; top: string; ink: string }> = {
  app: { name: "アプリ", sub: "応用ソフト", face: "#E0F2FE", side: "#BAE6FD", top: "#F0F9FF", ink: "#0369A1" },
  os: { name: "OS", sub: "基本ソフト", face: "#E0E7FF", side: "#C7D2FE", top: "#EEF2FF", ink: "#4338CA" },
  hw: { name: "ハードウェア", sub: "機械", face: "#E5E7EB", side: "#D1D5DB", top: "#F3F4F6", ink: "#374151" },
};

function Slab({ layer, state, barrier }: { layer: OsLayer; state: NodeState; barrier: boolean }) {
  const b = isoBox({ ...SLAB, z0: -THICK, z1: 0 });
  const m = LAYER_META[layer];
  const shift = (pts: string) =>
    pts
      .split(" ")
      .map((pair) => {
        const [x, y] = pair.split(",").map(Number);
        return `${(x + CX).toFixed(1)},${(y + LEVEL_Y[layer]).toFixed(1)}`;
      })
      .join(" ");
  return (
    <g className={styles.slab} data-layer={layer} data-state={state} data-barrier={barrier ? "true" : "false"}>
      <polygon points={shift(b.left)} fill={m.face} />
      <polygon points={shift(b.right)} fill={m.side} />
      <polygon points={shift(b.top)} fill={m.top} className={styles.slabTop} style={{ "--ink": m.ink } as CSSProperties} />
    </g>
  );
}

/** 板の上に立つ小さな部品（台座つきのブロック）。 */
function PartBlock({ part, state }: { part: BlockPart; state: NodeState }) {
  const p = PART[part];
  const w = part === "core" ? 16 : 11;
  const h = part === "core" ? 14 : 10;
  const b = isoBox({ x0: p.x - w, x1: p.x + w, y0: p.y - 9, y1: p.y + 9, z0: 0, z1: h });
  const tone = p.layer === "app" ? ["#FFFFFF", "#DBEAFE", "#FFFFFF"] : p.layer === "os" ? ["#6366F1", "#4F46E5", "#818CF8"] : ["#FFFFFF", "#D1D5DB", "#F9FAFB"];
  return (
    <g transform={`translate(${CX} ${LEVEL_Y[p.layer]})`} className={styles.part} data-part={part} data-state={state}>
      <polygon points={b.left} fill={tone[0]} stroke="#CBD4E2" strokeWidth={0.5} />
      <polygon points={b.right} fill={tone[1]} />
      <polygon points={b.top} fill={tone[2]} stroke="#CBD4E2" strokeWidth={0.5} />
    </g>
  );
}

// ---------- シーン ----------

export type OsSceneProps = {
  layers: Record<OsLayer, NodeState>;
  parts: Partial<Record<BlockPart, NodeState>>;
  /** 板と板をつなぐ縦の経路（上から下へ／下から上へ） */
  links: { from: OsPart; to: OsPart; tone: "request" | "result" | "blocked" }[];
  capsule: { at: OsPart; text: string; tone: "request" | "result" | "blocked" } | null;
  barrier: boolean;
  userHears: string | null;
  reducedMotion: boolean;
};

const LINK_COLOR = { request: "#2F6FDB", result: "#059669", blocked: "#E11D48" } as const;

export function OsScene({ layers, parts, links, capsule, barrier, userHears, reducedMotion }: OsSceneProps) {
  return (
    <div className={`${netStyles.scene} ${styles.scene}`} data-reduced-motion={reducedMotion ? "true" : "false"} data-barrier={barrier ? "true" : "false"} data-testid="os-scene">
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="スマホの中身を3枚の板に分けた模型。上からアプリ（音楽App・メモApp）、OS、ハードウェア（CPU・スピーカー・ストレージ）"
      >
        <SceneDefs />
        {/* 下の板から描く（上の板が手前に重なる） */}
        {(["hw", "os", "app"] as const).map((layer) => (
          <g key={layer}>
            <Slab layer={layer} state={layers[layer]} barrier={layer === "os" && barrier} />
            {(Object.keys(PART) as BlockPart[])
              .filter((id) => PART[id].layer === layer)
              .map((id) => (
                <PartBlock key={id} part={id} state={parts[id] ?? "idle"} />
              ))}
            {/* この板より下へ向かう経路は、この板の上に重ねて描く */}
            {links
              .filter((l) => l.from in PART && PART[l.from as BlockPart].layer === layer)
              .map((l, i) => {
                const a = partAt(l.from);
                const b = partAt(l.to);
                return (
                  <line
                    key={`${l.from}-${l.to}-${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className={styles.link}
                    style={{ "--link": LINK_COLOR[l.tone] } as CSSProperties}
                    data-link={`${l.from}-${l.to}`}
                    data-tone={l.tone}
                  />
                );
              })}
          </g>
        ))}
        {links
          .filter((l) => l.from === "user")
          .map((l, i) => {
            const a = partAt(l.from);
            const b = partAt(l.to);
            return <line key={`u-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.link} style={{ "--link": LINK_COLOR[l.tone] } as CSSProperties} data-tone={l.tone} />;
          })}
      </svg>

      {(Object.keys(LAYER_META) as OsLayer[]).map((layer) => (
        <span key={layer} className={styles.layerTag} style={toPercent({ x: 8, y: LEVEL_Y[layer] - 6 })} data-layer-tag={layer} data-state={layers[layer]}>
          <b>{LAYER_META[layer].name}</b>
          <span>{LAYER_META[layer].sub}</span>
        </span>
      ))}

      {(Object.keys(PART) as BlockPart[]).map((id) => {
        const at = partAt(id);
        return (
          <span key={id} className={styles.partTag} style={toPercent({ x: at.x, y: at.y - 2 })} data-part-tag={id} data-state={parts[id] ?? "idle"}>
            <span aria-hidden>{PART[id].icon}</span>
            {PART[id].name}
          </span>
        );
      })}

      <span className={styles.user} style={toPercent(partAt("user"))} data-hears={userHears ? "true" : "false"} data-testid="os-user">
        🙂{userHears ? ` ${userHears}` : " ユーザー"}
      </span>

      {barrier && (
        <span className={styles.denied} role="status" data-testid="os-denied" style={toPercent({ x: CX, y: LEVEL_Y.os + 30 })}>
          ⛔ OSを経由してください
        </span>
      )}

      {capsule && (
        <div className={styles.capsuleAnchor} style={toPercent(nudgeUp(partAt(capsule.at), capsule.at === "user" ? 22 : 18))} data-at={capsule.at} data-tone={capsule.tone} data-testid="os-capsule">
          <span className={styles.capsule} style={{ "--link": LINK_COLOR[capsule.tone] } as CSSProperties}>
            {capsule.text}
          </span>
        </div>
      )}
    </div>
  );
}

function nudgeUp(p: ScreenPoint, dy: number): ScreenPoint {
  return { x: p.x, y: p.y - dy };
}

