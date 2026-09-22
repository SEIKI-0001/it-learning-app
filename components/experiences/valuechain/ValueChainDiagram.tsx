import type { CSSProperties } from "react";
import styles from "./valuechain.module.css";

// ポーターのバリューチェーン図（2D）。
// 上段＝支援活動の4本の帯、下段＝主活動の5つの列、右端＝マージンの矢じり。
// 製品トークンは主活動の列の下を左から右へ進み、下の VALUE バーが積み上がる。
// 支援活動を止めると、その帯が赤くなり、影響を受ける主活動の列も止まる。

export type StationState = "idle" | "active" | "error" | "disabled";
export type StationId = "inbound" | "operations" | "outbound" | "sales" | "service";
export type SupportId = "infra" | "hr" | "tech" | "procurement";

export const STATIONS: StationId[] = ["inbound", "operations", "outbound", "sales", "service"];
export const SUPPORTS: SupportId[] = ["infra", "hr", "tech", "procurement"];

const STATION_META: Record<StationId, { emo: string; name: string }> = {
  inbound: { emo: "📥", name: "購買物流" },
  operations: { emo: "🏭", name: "製造" },
  outbound: { emo: "📦", name: "出荷物流" },
  sales: { emo: "🛒", name: "販売・マーケ" },
  service: { emo: "🔧", name: "サービス" },
};

const SUPPORT_META: Record<SupportId, { name: string; color: string }> = {
  infra: { name: "全般管理", color: "#E2E8F0" },
  hr: { name: "人事・労務管理", color: "#FEF3C7" },
  tech: { name: "技術開発", color: "#EDE9FE" },
  procurement: { name: "調達", color: "#CCFBF1" },
};

export type ValueChainDiagramProps = {
  stations: Record<StationId, StationState>;
  /** 製品がいる列（-1＝原材料が届く前） */
  product: { at: number; emoji: string; blocked: boolean };
  supports: Record<SupportId, "on" | "off">;
  /** 積み上がった価値（列ごとの増分）。final があればコスト＋マージンへ組み替える */
  value: { blocks: number[]; final: { cost: number; margin: number } | null };
  stationNotes: Partial<Record<StationId, string>>;
};

const BLOCK_COLORS = ["#A5B4FC", "#818CF8", "#6366F1", "#4F46E5", "#4338CA"];
const VALUE_MAX = 100;

export function ValueChainDiagram({ stations, product, supports, value, stationNotes }: ValueChainDiagramProps) {
  const total = value.blocks.reduce((a, b) => a + b, 0);
  const marginOn = value.final !== null && value.final.margin > 0;
  // トークンの位置：列の中央（-1 は左端の外＝入荷前）
  const tokenLeft = `${((product.at + 0.5) / STATIONS.length) * 100}%`;

  return (
    <div className={styles.diagram} data-testid="vc-diagram">
      <div
        className={styles.chain}
        role="img"
        aria-label="バリューチェーン図。上に支援活動の4本の帯、下に主活動の5つの列、右端にマージン"
      >
        <div className={styles.supports}>
          {SUPPORTS.map((id) => (
            <div
              key={id}
              className={styles.supportBar}
              data-support={id}
              data-state={supports[id]}
              style={{ "--bar": SUPPORT_META[id].color } as CSSProperties}
            >
              {supports[id] === "off" ? `✕ ${SUPPORT_META[id].name}（停止）` : SUPPORT_META[id].name}
            </div>
          ))}
        </div>
        <div className={styles.primaries}>
          {STATIONS.map((id, i) => (
            <div key={id} className={styles.station} data-node={id} data-state={stations[id]}>
              <span className={styles.stationNo}>{stations[id] === "error" ? "✕" : i + 1}</span>
              <span className={styles.stationEmo} aria-hidden>
                {STATION_META[id].emo}
              </span>
              <span className={styles.stationName}>{STATION_META[id].name}</span>
              {stationNotes[id] && (
                <span className={styles.note} data-testid={`note-${id}`}>
                  {stationNotes[id]}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className={styles.margin} data-on={marginOn ? "true" : "false"}>
          マージン
        </div>
      </div>
      <div className={styles.axis} aria-hidden>
        <span>支援活動＝上の帯（全工程を支える）</span>
        <span>主活動＝下の列 →</span>
      </div>

      {/* 製品トークンの通り道 */}
      <div className={styles.lane}>
        <div
          className={styles.product}
          style={{ left: tokenLeft }}
          data-at={product.at}
          data-blocked={product.blocked ? "true" : "false"}
          data-testid="product"
          role="img"
          aria-label={`いま製品は ${product.emoji}`}
        >
          <span key={product.emoji} className={styles.productBody}>
            {product.emoji}
          </span>
          {product.blocked && <span className={styles.blocked}>止まった</span>}
        </div>
      </div>

      {/* 価値の積み上がり（横棒） */}
      <div className={styles.valueRow} data-testid="value-column" data-total={total}>
        <div className={styles.valueHead}>
          <span className={styles.valueTitle}>VALUE（生み出した価値）</span>
          <span className={styles.valueTotal}>{value.final ? `売値 ${value.final.cost + value.final.margin}` : `価値 ${total}`}</span>
        </div>
        <div className={styles.valueTrack}>
          {value.final ? (
            <>
              <span className={styles.valueCost} style={{ width: `${(value.final.cost / VALUE_MAX) * 100}%` }}>
                コスト {value.final.cost}
              </span>
              <span
                className={styles.valueMargin}
                style={{ width: `${(value.final.margin / VALUE_MAX) * 100}%` }}
                data-narrow={value.final.margin < 15 ? "true" : "false"}
                data-testid="margin-block"
              >
                <span className={styles.marginLabel}>{`マージン ${value.final.margin}`}</span>
              </span>
            </>
          ) : (
            value.blocks.map((v, i) => (
              <span
                key={i}
                className={styles.valueBlock}
                style={{ width: `${(v / VALUE_MAX) * 100}%`, background: BLOCK_COLORS[i] }}
                aria-hidden
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
