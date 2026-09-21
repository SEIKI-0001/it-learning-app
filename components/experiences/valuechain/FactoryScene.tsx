import type { CSSProperties, ReactNode } from "react";
import {
  SCENE_HEIGHT,
  SCENE_WIDTH,
  isoBox,
  isoLocal,
  leftFaceTransform,
  points,
  toPercent,
  type NodeState,
  type ScreenPoint,
} from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";
import { SceneDefs } from "../scene/IsoParts";
import styles from "./valuechain.module.css";

// ミニチュア企業。主活動の5拠点を1枚の台（デッキ）に並べ、製品トークンがその上を進む。
// デッキの下に支援活動の4層が敷かれ、主活動ライン全体を下から支える。
// 支援活動を止めると、その層が赤くなり、影響を受ける拠点も止まる。

export type StationId = "inbound" | "operations" | "outbound" | "sales" | "service";
export type SupportId = "infra" | "hr" | "tech" | "procurement";

export const STATIONS: StationId[] = ["inbound", "operations", "outbound", "sales", "service"];
export const SUPPORTS: SupportId[] = ["infra", "hr", "tech", "procurement"];

const STATION_X = [-104, -52, 0, 52, 104];
const LIFT = -20; // シーン全体を少し上へ（下の支援層の分）

function P(x: number, y: number, z = 0): ScreenPoint {
  const p = isoLocal(x, y, z);
  return { x: 160 + p.x, y: 144 + LIFT + p.y };
}

const DECK = { x0: -130, x1: 130, y0: -24, y1: 24, z0: 0, z1: 5 };
const LAYER_H = 8.5;

const SUPPORT_META: Record<SupportId, { name: string; color: string; side: string }> = {
  infra: { name: "全般管理", color: "#CBD5E1", side: "#94A3B8" },
  hr: { name: "人事・労務管理", color: "#FDE68A", side: "#F59E0B" },
  tech: { name: "技術開発", color: "#DDD6FE", side: "#8B5CF6" },
  procurement: { name: "調達", color: "#99F6E4", side: "#14B8A6" },
};

// ---------- 拠点の模型 ----------

function Box({ b, face, side, top, stroke }: { b: ReturnType<typeof isoBox>; face: string; side: string; top: string; stroke?: string }) {
  return (
    <>
      <polygon points={b.left} fill={face} />
      <polygon points={b.right} fill={side} />
      <polygon points={b.top} fill={top} stroke={stroke} strokeWidth={stroke ? 0.6 : 0} />
    </>
  );
}

function Dock() {
  const b = isoBox({ x0: -15, x1: 15, y0: -12, y1: 12, z0: 0, z1: 16 });
  return (
    <g data-illustration="station-inbound">
      <Box b={b} face="#F5F0E8" side="#DDD3C3" top="#FFFFFF" stroke="#DDD3C3" />
      <g transform={leftFaceTransform(-15, 12, 16)}>
        <rect x={6} y={4} width={18} height={12} rx={1} fill="#B8A88F" />
        {[6, 8.5, 11, 13.5].map((y) => (
          <line key={y} x1={6} y1={y} x2={24} y2={y} stroke="#9C8B70" strokeWidth={0.6} />
        ))}
      </g>
    </g>
  );
}

function Factory() {
  const b = isoBox({ x0: -16, x1: 16, y0: -13, y1: 13, z0: 0, z1: 18 });
  const saw = (x0: number) =>
    points([isoLocal(x0, 13, 18), isoLocal(x0 + 16, 13, 18), isoLocal(x0 + 16, 13, 27), isoLocal(x0, 13, 18)]);
  const sawRoof = (x0: number) =>
    points([isoLocal(x0, -13, 18), isoLocal(x0, 13, 18), isoLocal(x0 + 16, 13, 27), isoLocal(x0 + 16, -13, 27)]);
  const chimney = isoBox({ x0: 8, x1: 13, y0: -11, y1: -6, z0: 18, z1: 38 });
  return (
    <g data-illustration="station-operations">
      <Box b={b} face="#EEF2F7" side="#D2DAE6" top="#F8FAFC" />
      <Box b={chimney} face="#CBD5E1" side="#94A3B8" top="#64748B" />
      {[-16, 0].map((x0) => (
        <g key={x0}>
          <polygon points={sawRoof(x0)} fill="#A5B4FC" stroke="#818CF8" strokeWidth={0.5} />
          <polygon points={saw(x0)} fill="#C7D2FE" />
        </g>
      ))}
      <g transform={leftFaceTransform(-16, 13, 18)}>
        {[4, 12, 20].map((x) => (
          <rect key={x} x={x} y={5} width={6} height={6} rx={1} fill="#BFD3F2" />
        ))}
      </g>
    </g>
  );
}

function Warehouse() {
  const b = isoBox({ x0: -17, x1: 3, y0: -12, y1: 12, z0: 0, z1: 18 });
  const cargo = isoBox({ x0: 5, x1: 15, y0: -6, y1: 6, z0: 2, z1: 12 });
  const cab = isoBox({ x0: 15, x1: 20, y0: -6, y1: 6, z0: 2, z1: 9 });
  const wheel = (x: number) => isoLocal(x, 6, 2);
  return (
    <g data-illustration="station-outbound">
      <Box b={b} face="#FEF3C7" side="#FCD34D" top="#FFFBEB" stroke="#FCD34D" />
      <g transform={leftFaceTransform(-17, 12, 18)}>
        <rect x={4} y={6} width={12} height={12} rx={1} fill="#D97706" opacity={0.8} />
      </g>
      <Box b={cargo} face="#FFFFFF" side="#E2E8F0" top="#F8FAFC" stroke="#CBD5E1" />
      <Box b={cab} face="#3B82F6" side="#2563EB" top="#60A5FA" />
      {[8, 17].map((x) => (
        <circle key={x} cx={wheel(x).x} cy={wheel(x).y} r={2} fill="#334155" />
      ))}
    </g>
  );
}

function Shop() {
  const b = isoBox({ x0: -15, x1: 15, y0: -12, y1: 12, z0: 0, z1: 18 });
  const awning = points([isoLocal(-15, 12, 16), isoLocal(15, 12, 16), isoLocal(15, 18, 11), isoLocal(-15, 18, 11)]);
  return (
    <g data-illustration="station-sales">
      <Box b={b} face="#FFF1F2" side="#FECDD3" top="#FFFFFF" stroke="#FECDD3" />
      <g transform={leftFaceTransform(-15, 12, 18)}>
        <rect x={4} y={7} width={22} height={8} rx={1} fill="#BFDBFE" />
      </g>
      <polygon points={awning} fill="#F43F5E" />
      {[-9, 1, 11].map((x) => (
        <polygon key={x} points={points([isoLocal(x, 12, 16), isoLocal(x + 5, 12, 16), isoLocal(x + 5, 18, 11), isoLocal(x, 18, 11)])} fill="#FFFFFF" opacity={0.85} />
      ))}
    </g>
  );
}

function Customer() {
  const booth = isoBox({ x0: 2, x1: 16, y0: -10, y1: 4, z0: 0, z1: 10 });
  const p = isoLocal(-6, 4, 0);
  return (
    <g data-illustration="station-service">
      <Box b={booth} face="#ECFDF5" side="#A7F3D0" top="#FFFFFF" stroke="#A7F3D0" />
      <path d={`M ${p.x - 7} ${p.y} L ${p.x - 7} ${p.y - 20} Q ${p.x - 7} ${p.y - 27} ${p.x} ${p.y - 28} Q ${p.x + 7} ${p.y - 27} ${p.x + 7} ${p.y - 20} L ${p.x + 7} ${p.y} Z`} fill="#10B981" />
      <circle cx={p.x} cy={p.y - 34} r={6.5} fill="#F6D3B8" />
      <path d={`M ${p.x - 6.8} ${p.y - 35} A 6.8 6.8 0 0 1 ${p.x + 6.8} ${p.y - 35} Q ${p.x} ${p.y - 38} ${p.x - 6.8} ${p.y - 35} Z`} fill="#3F2A1D" />
      <circle cx={p.x - 2.2} cy={p.y - 33.5} r={0.8} fill="#2B3140" />
      <circle cx={p.x + 2.2} cy={p.y - 33.5} r={0.8} fill="#2B3140" />
      <path d={`M ${p.x - 2} ${p.y - 30.8} Q ${p.x} ${p.y - 29.4} ${p.x + 2} ${p.y - 30.8}`} fill="none" stroke="#2B3140" strokeWidth={0.7} strokeLinecap="round" />
    </g>
  );
}

const ILLUSTRATION: Record<StationId, () => ReactNode> = {
  inbound: Dock,
  operations: Factory,
  outbound: Warehouse,
  sales: Shop,
  service: Customer,
};

// ---------- シーン ----------

export type FactorySceneProps = {
  stations: Record<StationId, NodeState>;
  /** 製品がいる拠点（-1＝原材料が届く前、null＝表示しない） */
  product: { at: number; emoji: string; blocked: boolean } | null;
  supports: Record<SupportId, "on" | "off" | "focus">;
  /** 積み上がった価値（拠点ごとの増分）。margin があれば最後にコスト＋マージンへ組み替える */
  value: { blocks: number[]; final: { cost: number; margin: number } | null };
  stationNotes: Partial<Record<StationId, string>>;
  reducedMotion: boolean;
};

const BLOCK_COLORS = ["#A5B4FC", "#818CF8", "#6366F1", "#4F46E5", "#4338CA"];
const VALUE_MAX = 100;

export function FactoryScene({ stations, product, supports, value, stationNotes, reducedMotion }: FactorySceneProps) {
  const deck = isoBox(DECK);
  const shift = (list: string) =>
    list
      .split(" ")
      .map((pair) => {
        const [x, y] = pair.split(",").map(Number);
        return `${(x + 160).toFixed(1)},${(y + 144 + LIFT).toFixed(1)}`;
      })
      .join(" ");
  const productAt = product ? (product.at < 0 ? P(-138, 0, 20) : P(STATION_X[product.at], 0, 44)) : null;
  const total = value.blocks.reduce((a, b) => a + b, 0);

  return (
    <div
      className={`${netStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="factory-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="台の上に、入荷・工場・倉庫と配送・店舗・顧客の5拠点が一列に並ぶミニチュア企業。台の下には支援活動の4つの層が重なって支えている"
      >
        <SceneDefs />
        {/* 支援活動の層（下から順に積む：調達 → 技術開発 → 人事 → 全般管理） */}
        {[...SUPPORTS].reverse().map((id, i) => {
          const zTop = -(SUPPORTS.length - 1 - i) * LAYER_H;
          const layer = isoBox({ ...DECK, z0: zTop - LAYER_H, z1: zTop });
          const meta = SUPPORT_META[id];
          return (
            <g
              key={id}
              className={styles.layer}
              data-support={id}
              data-state={supports[id]}
              style={{ "--layer": meta.color, "--layer-side": meta.side } as CSSProperties}
            >
              <polygon points={shift(layer.left)} className={styles.layerFace} />
              <polygon points={shift(layer.right)} className={styles.layerSide} />
              <g transform={`translate(160 ${144 + LIFT}) ${leftFaceTransform(DECK.x0, DECK.y1, zTop)}`}>
                <text x={8} y={6.4} fontSize={6.4} fontWeight={800} className={styles.layerText}>
                  {supports[id] === "off" ? `✕ ${meta.name}（停止）` : meta.name}
                </text>
              </g>
            </g>
          );
        })}
        {/* 主活動のデッキ */}
        <polygon points={shift(deck.left)} fill="#E2E8F0" />
        <polygon points={shift(deck.right)} fill="#CBD5E1" />
        <polygon points={shift(deck.top)} fill="#F8FAFC" stroke="#D5DEEC" strokeWidth={0.8} />
        {/* ベルトコンベア */}
        <line
          x1={P(-128, 0, 5).x}
          y1={P(-128, 0, 5).y}
          x2={P(128, 0, 5).x}
          y2={P(128, 0, 5).y}
          className={styles.belt}
        />
        {STATIONS.map((id, i) => {
          const at = P(STATION_X[i], 0, 5);
          const Illustration = ILLUSTRATION[id];
          return (
            <g key={id} transform={`translate(${at.x} ${at.y})`}>
              <g className={netStyles.node} data-node={id} data-state={stations[id]}>
                <ellipse cx={0} cy={1} rx={22} ry={12} className={netStyles.nodeShadow} />
                <g className={netStyles.nodeLift}>
                  <Illustration />
                </g>
              </g>
              <g transform={`translate(${isoLocal(-18, 22, 0).x} ${isoLocal(-18, 22, 0).y})`} className={styles.stationBadge} data-state={stations[id]}>
                <circle r={6} />
                <text y={2.4} textAnchor="middle">
                  {i + 1}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {STATIONS.map((id, i) =>
        stationNotes[id] ? (
          <span
            key={id}
            className={styles.note}
            style={toPercent(P(STATION_X[i] + 16, 0, 36))}
            data-state={stations[id]}
            data-testid={`note-${id}`}
          >
            {stationNotes[id]}
          </span>
        ) : null,
      )}

      {product && productAt && (
        <div
          className={styles.product}
          style={toPercent(productAt)}
          data-at={product.at}
          data-blocked={product.blocked ? "true" : "false"}
          data-testid="product"
          role="img"
          aria-label={`いま製品は ${product.emoji}`}
        >
          <span aria-hidden className={styles.productShadow} />
          <span key={product.emoji} className={styles.productBody}>
            {product.emoji}
          </span>
        </div>
      )}

      {/* 価値の積み上がり */}
      <div className={styles.valueBox} data-testid="value-column" data-total={total}>
        <span className={styles.valueTitle}>VALUE</span>
        <div className={styles.valueTrack}>
          {value.final ? (
            <>
              <span className={styles.valueCost} style={{ height: `${(value.final.cost / VALUE_MAX) * 100}%` }}>
                コスト {value.final.cost}
              </span>
              <span className={styles.valueMargin} style={{ height: `${(value.final.margin / VALUE_MAX) * 100}%` }} data-testid="margin-block">
                {`マージン ${value.final.margin}`}
              </span>
            </>
          ) : (
            value.blocks.map((v, i) => (
              <span
                key={i}
                className={styles.valueBlock}
                style={{ height: `${(v / VALUE_MAX) * 100}%`, background: BLOCK_COLORS[i] }}
                aria-hidden
              />
            ))
          )}
        </div>
        <span className={styles.valueTotal}>{value.final ? `売値 ${value.final.cost + value.final.margin}` : `価値 ${total}`}</span>
      </div>
    </div>
  );
}
