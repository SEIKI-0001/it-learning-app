"use client";

import type { CSSProperties } from "react";
import { FloorStrip, type Camera, type Vec3 } from "../scene/Diorama3D";
import { Building, Floor, FloorRoute, Group, Parcel, Person, Tree, Truck, type BuildingKind } from "../scene/DioramaParts";
import { Badge, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import { STATIONS, SUPPORTS, type StationId, type SupportId, type ValueChainDiagramProps } from "./valueChainTypes";
import base from "./valuechain.module.css";
import styles from "./valuechaindiorama.module.css";

// バリューチェーンの図解：家具メーカーの1本の流れ。手前に主活動の5つの現場、奥に本社の支援部門。
//   購買物流（資材倉庫）→ 製造（工場）→ 出荷物流（出荷場とトラック）→ 販売・マーケ（店舗）→ サービス（修理・相談窓口）
// 支援活動（全般管理・人事・技術開発・調達）は、それぞれ奥の部門から5つの現場すべての後ろを通る帯で「全工程を支える」。
// 支援を止めると帯が赤く途切れ、影響を受けた現場が止まる。価値の積み上がりは模型の下の棒グラフ。

const META: Record<StationId, { name: string; kind: BuildingKind; w: number; d: number; h: number; color?: string }> = {
  inbound: { name: "購買物流", kind: "warehouse", w: 104, d: 76, h: 60 },
  operations: { name: "製造", kind: "factory", w: 112, d: 84, h: 70 },
  outbound: { name: "出荷物流", kind: "warehouse", w: 96, d: 70, h: 52, color: "#dbe3ec" },
  sales: { name: "販売・マーケ", kind: "store", w: 104, d: 74, h: 60 },
  service: { name: "サービス", kind: "office", w: 92, d: 70, h: 56, color: "#e6eef8" },
};
const SUPPORT_META: Record<SupportId, { name: string; kind: BuildingKind; color: string }> = {
  infra: { name: "全般管理", kind: "office", color: "#e2e8f0" },
  hr: { name: "人事・労務管理", kind: "office", color: "#fef3c7" },
  tech: { name: "技術開発", kind: "office", color: "#ede9fe" },
  procurement: { name: "調達", kind: "office", color: "#ccfbf1" },
};

const X = [110, 260, 410, 560, 710];
const ST_Y = 300;
const PATH_Y = 372;
const SUPPORT_X = [150, 320, 490, 660];
const SUPPORT_Y = 70;
const BAND_Y = [178, 194, 210, 226];

const productAt = (at: number): Vec3 => (at < 0 ? { x: 20, y: PATH_Y, z: 8 } : { x: X[at], y: PATH_Y, z: 8 });

function shotFor(at: number, wide: boolean): Camera {
  if (wide) return { yaw: -14, pitch: 56, zoom: 0.84, fx: 410, fy: 230, fz: 30 };
  const x = X[Math.max(0, Math.min(4, at))];
  return { yaw: -14, pitch: 52, zoom: 1.12, fx: Math.max(200, Math.min(620, x)), fy: 280, fz: 40 };
}

export function ValueChainDiorama({ stations, product, supports, value, stationNotes, reducedMotion = false, forward = true }: ValueChainDiagramProps & { reducedMotion?: boolean; forward?: boolean }) {
  const total = value.blocks.reduce((a, b) => a + b, 0);
  const marginOn = value.final !== null && value.final.margin > 0;
  const anyOff = SUPPORTS.some((id) => supports[id] === "off");
  const wide = anyOff || value.final !== null;
  const from = productAt(Math.max(-1, product.at - 1));
  const to = productAt(product.at);

  return (
    <div className={styles.wrap} data-testid="vc-diagram">
      <DioramaStage
        ariaLabel="家具メーカーの模型。手前に資材倉庫・工場・出荷場・店舗・サービス窓口の5つの現場が一列に並び（主活動）、奥の本社の4つの部門（支援活動）から5つの現場すべての後ろを帯が通っている"
        shot={shotFor(product.at, wide)}
        shotKey={`${product.at}-${wide ? "w" : ""}`}
        forward={forward}
        reducedMotion={reducedMotion}
        aspect="20 / 13"
        aspectMobile="10 / 9"
        tokens={{ product: { at: to, path: [{ ...from, z: 8 }, to] } }}
        world={
          <>
            <Floor x={0} y={20} w={820} d={410} h={16} material="plain" />
            <Floor x={10} y={30} w={800} d={130} h={4} z={0} material="paving" />
            <Floor x={10} y={240} w={800} d={180} h={4} z={0} material="concrete" />

            {/* ---------- 本社の支援部門（奥） ---------- */}
            {SUPPORTS.map((id, i) => (
              <Group key={id} z={4} data={{ "data-support": id, "data-state": supports[id] }}>
                <Building x={SUPPORT_X[i]} y={SUPPORT_Y} w={120} d={70} h={70} kind={SUPPORT_META[id].kind} color={SUPPORT_META[id].color} dim={supports[id] === "off"} />
              </Group>
            ))}
            {/* 支援の帯：5つの現場すべての後ろを通る */}
            {SUPPORTS.map((id, i) => (
              <div key={id} className={styles.band} data-state={supports[id]} style={{ "--band": SUPPORT_META[id].color } as CSSProperties}>
                <FloorStrip from={{ x: 30, y: BAND_Y[i] }} to={{ x: 790, y: BAND_Y[i] }} width={12} z={4.6} className={styles.bandStrip} />
                <FloorStrip from={{ x: SUPPORT_X[i], y: SUPPORT_Y + 36 }} to={{ x: SUPPORT_X[i], y: BAND_Y[i] }} width={8} z={4.6} className={styles.bandStrip} />
              </div>
            ))}

            {/* ---------- 主活動の5つの現場（手前） ---------- */}
            {STATIONS.map((id, i) => (
              <Group key={id} z={4} data={{ "data-node": id, "data-state": stations[id] }}>
                <Building
                  x={X[i]}
                  y={ST_Y - 20}
                  w={META[id].w}
                  d={META[id].d}
                  h={META[id].h}
                  kind={META[id].kind}
                  color={META[id].color}
                  dim={stations[id] === "disabled"}
                  state={stations[id] === "error" ? "error" : stations[id] === "active" ? "active" : "idle"}
                />
              </Group>
            ))}
            <Truck x={X[2] + 4} y={PATH_Y + 30} />
            <Person x={X[3] + 30} y={PATH_Y + 18} pose="stand" shirt="#e0803a" size={0.8} />
            <Person x={X[4] + 24} y={PATH_Y + 18} pose="stand" shirt="#3f9a73" size={0.8} />
            <Tree x={790} y={60} size={0.8} />

            {/* 製品が流れる道 */}
            <FloorRoute
              points={[
                { x: 20, y: PATH_Y, z: 3 },
                { x: 780, y: PATH_Y, z: 3 },
              ]}
              width={14}
              z={4.8}
              tone={product.blocked ? "blocked" : "request"}
              active={!product.blocked}
            />
            <DioramaToken id="product">
              <Parcel tone={product.blocked ? "danger" : "warn"} size={1.1} mark={product.blocked ? "alert" : "none"} />
            </DioramaToken>
          </>
        }
        labels={
          <>
            <DioramaLabel token="product" dz={16} place="above">
              <div
                className={styles.product}
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
            </DioramaLabel>

            {STATIONS.map((id, i) =>
              stationNotes[id] ? (
                <DioramaLabel key={`n-${id}`} at={{ x: X[i], y: ST_Y - 20, z: META[id].h + 30 }} place="above">
                  <span className={styles.note} data-testid={`note-${id}`}>
                    {stationNotes[id]}
                  </span>
                </DioramaLabel>
              ) : null,
            )}

            {STATIONS.map((id, i) => (
              <DioramaLabel key={id} at={{ x: X[i], y: ST_Y + 20, z: 0 }} place="below" optional>
                <span className={styles.station} data-state={stations[id]}>
                  <b>{stations[id] === "error" ? "✕" : i + 1}</b> {META[id].name}
                </span>
              </DioramaLabel>
            ))}
            {SUPPORTS.map((id, i) => (
              <DioramaLabel key={id} at={{ x: SUPPORT_X[i], y: SUPPORT_Y, z: 76 }} place="above" optional>
                <NameChip name={supports[id] === "off" ? `✕ ${SUPPORT_META[id].name}（停止）` : SUPPORT_META[id].name} tone={supports[id] === "off" ? "danger" : "muted"} />
              </DioramaLabel>
            ))}
            {marginOn && (
              <DioramaLabel at={{ x: 780, y: PATH_Y, z: 10 }} place="above" optional>
                <Badge tone="ok">マージン</Badge>
              </DioramaLabel>
            )}
          </>
        }
      />

      {/* 価値の積み上がり（横棒） */}
      <div className={base.valueRow} data-testid="value-column" data-total={total}>
        <div className={base.valueHead}>
          <span className={base.valueTitle}>VALUE（生み出した価値）</span>
          <span className={base.valueTotal}>{value.final ? `売値 ${value.final.cost + value.final.margin}` : `価値 ${total}`}</span>
        </div>
        <div className={base.valueTrack}>
          {value.final ? (
            <>
              <span className={base.valueCost} style={{ width: `${value.final.cost}%` }}>
                コスト {value.final.cost}
              </span>
              <span
                className={base.valueMargin}
                style={{ width: `${value.final.margin}%` }}
                data-narrow={value.final.margin < 15 ? "true" : "false"}
                data-testid="margin-block"
              >
                <span className={base.marginLabel}>{`マージン ${value.final.margin}`}</span>
              </span>
            </>
          ) : (
            value.blocks.map((v, i) => <span key={i} className={base.valueBlock} style={{ width: `${v}%`, background: BLOCK_COLORS[i] }} aria-hidden />)
          )}
        </div>
      </div>
    </div>
  );
}

const BLOCK_COLORS = ["#A5B4FC", "#818CF8", "#6366F1", "#4F46E5", "#4338CA"];
