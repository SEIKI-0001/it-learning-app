"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import { Building, Coin, Floor, FloorRoute, Group, Paper, Parcel, Person, Phone, Tree, Truck, type BuildingKind, type RouteTone } from "../scene/DioramaParts";
import { Badge, DioramaLabel, DioramaStage, DioramaToken, NameChip, pathLength } from "../scene/DioramaStage";
import { useTimeline } from "../scene/useTimeline";
import { FLOWS, ROLE, STEP_MS, type Kind, type NodeKey, type TermKey } from "./TradeFlowMap";

// 取引マップの 3D 版：1つの街の模型に、企業（左奥）・取引先企業（右奥）・個人の家2軒（手前）を置く。
// 用語を選ぶと、その取引で「誰から誰へ・何が」動くかを①②③の順に道の上を運ぶ。
//   情報＝書類（青い道）／お金＝硬貨（緑の道）／モノ＝小包・車（橙の道）
// スマホ（フィンテック）と仲介サービスのデータセンター（シェアリング）は、使う取引のときだけ現れる。
// 流れ終わった道は色付きのまま残るので、最後の状態だけでも取引の形が読める。

const NODES: Record<NodeKey, { spot: Vec3; label: string; via?: boolean }> = {
  compA: { spot: { x: 150, y: 190 }, label: "企業" },
  compB: { spot: { x: 530, y: 190 }, label: "取引先企業" },
  persA: { spot: { x: 150, y: 330 }, label: "個人" },
  persB: { spot: { x: 530, y: 330 }, label: "個人" },
  phone: { spot: { x: 330, y: 320 }, label: "スマホ", via: true },
  platform: { spot: { x: 340, y: 255 }, label: "仲介サービス", via: true },
};

// 名札を付ける位置（建物の上・家の前）
const TAG_AT: Record<NodeKey, Vec3> = {
  compA: { x: 150, y: 110, z: 100 },
  compB: { x: 530, y: 110, z: 84 },
  persA: { x: 130, y: 425, z: 0 },
  persB: { x: 550, y: 425, z: 0 },
  phone: { x: 330, y: 320, z: 70 },
  platform: { x: 340, y: 185, z: 80 },
};

const KIND_ROUTE: Record<Kind, RouteTone> = { info: "request", money: "done", goods: "amber" };
const LANE_GAP = 13;
const TOKEN_Z = 8;

// 用語ごとの「企業」の建物（同じ場所でも、ECは倉庫・フィンテックは金融サービス）
const COMP_A_KIND: Record<TermKey | "none", BuildingKind> = { none: "office", ec: "warehouse", edi: "office", fintech: "bank", sharing: "office" };

const SHOTS: Record<TermKey | "none", Camera> = {
  none: { yaw: -10, pitch: 56, zoom: 0.82, fx: 340, fy: 250, fz: 30 },
  ec: { yaw: -16, pitch: 56, zoom: 1.05, fx: 200, fy: 250, fz: 30 },
  edi: { yaw: -8, pitch: 54, zoom: 0.92, fx: 340, fy: 170, fz: 40 },
  fintech: { yaw: -16, pitch: 56, zoom: 1.05, fx: 200, fy: 250, fz: 30 },
  sharing: { yaw: -6, pitch: 56, zoom: 0.92, fx: 360, fy: 300, fz: 30 },
};

/** 経路を進行方向の左右へずらして、同じ区間を通る流れを車線に分ける */
function lane(path: NodeKey[], offset: number): Vec3[] {
  const pts = path.map((k) => NODES[k].spot);
  return pts.map((p, i) => {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: Math.round(p.x + (-dy / len) * offset), y: Math.round(p.y + (dx / len) * offset), z: 0 };
  });
}

function Carry({ kind, car }: { kind: Kind; car: boolean }) {
  if (kind === "money") return <Coin />;
  if (kind === "info") return <Paper tone="info" count={2} />;
  if (car) return <Truck x={0} y={0} color="#f59e0b" />;
  return <Parcel tone="warn" size={0.85} />;
}

export function TradeTownScene({ sel, runKey, reducedMotion }: { sel: TermKey | null; runKey: number; reducedMotion: boolean }) {
  const steps = sel ? FLOWS[sel] : [];
  const used = new Set(steps.flatMap((s) => s.path));
  const lanes = steps.map((s, i) => lane(s.path, (i - (steps.length - 1) / 2) * LANE_GAP));
  const on = (k: NodeKey) => used.has(k);
  const dim = (k: NodeKey) => sel !== null && !on(k);
  const name = (k: NodeKey) => (sel && ROLE[sel][k]) || NODES[k].label;

  const tokens = Object.fromEntries(
    [0, 1, 2].map((i) => {
      const l = lanes[i];
      if (!l) return [`s${i}`, { at: null }];
      const lifted = l.map((p) => ({ ...p, z: TOKEN_Z }));
      return [`s${i}`, { at: lifted[lifted.length - 1], start: lifted[0], path: lifted.slice(1), restart: true, delay: i * STEP_MS }];
    }),
  );

  // 運ぶ物の札は「いま動いている物」だけに出す（3つ同時に出すと、名札や互いに重なる）。
  // 動き出し＝150ms＋i×STEP_MS、着く＝そこから 900ms＋道の長さ×2.6（DioramaStage と同じ式）。
  // 次の物が動き出したら前の札は消す（同じ道を続けて通ると札が重なるため、札は常に1枚）
  const spans = lanes.map((l, i) => {
    const start = 150 + i * STEP_MS;
    const end = start + 900 + pathLength(l) * 2.6;
    return [start, i < lanes.length - 1 ? Math.min(end, start + STEP_MS) : end] as const;
  });
  const marks = [...new Set(spans.flat())].sort((a, b) => a - b);
  const passed = useTimeline(`${sel ?? "none"}-${runKey}`, marks, reducedMotion);
  const now = passed === 0 ? -1 : marks[passed - 1];
  const moving = (i: number) => !reducedMotion && spans[i] !== undefined && spans[i][0] <= now && now < spans[i][1];

  return (
    <DioramaStage
      testId="ebiz-map"
      ariaLabel="街の模型。左奥に企業、右奥に取引先企業の工場、手前に個人の家が2軒。用語を選ぶと、情報（書類）・お金（硬貨）・モノ（小包）が道の上を順に運ばれる"
      shot={SHOTS[sel ?? "none"]}
      shotKey={`${sel ?? "none"}-${runKey}`}
      forward
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-sel": sel ?? "none" }}
      tokens={tokens}
      world={
        <>
          <Floor x={-20} y={-20} w={720} d={470} h={16} material="grass" />
          {/* 街の道（十字） */}
          <Floor x={-20} y={240} w={720} d={44} h={2} z={2} material="asphalt" />
          <Floor x={318} y={-20} w={44} d={470} h={2} z={2} material="asphalt" />

          {/* 企業（左奥）と取引先企業（右奥） */}
          <Group testId="ebiz-node-compA" data={{ "data-on": on("compA") ? "true" : "false" }}>
            <Building x={150} y={110} w={130} d={90} h={sel === "fintech" ? 96 : 76} kind={COMP_A_KIND[sel ?? "none"]} state={on("compA") ? "active" : "idle"} dim={dim("compA")} />
          </Group>
          <Group testId="ebiz-node-compB" data={{ "data-on": on("compB") ? "true" : "false" }}>
            <Building x={530} y={110} w={140} d={90} h={70} kind="factory" state={on("compB") ? "active" : "idle"} dim={dim("compB")} />
          </Group>

          {/* 個人の家（手前の2軒） */}
          <Group testId="ebiz-node-persA" data={{ "data-on": on("persA") ? "true" : "false" }}>
            <Building x={130} y={390} w={100} d={70} h={58} kind="house" dim={dim("persA")} />
            <Person x={186} y={350} pose="stand" shirt="#e8835f" size={0.8} dim={dim("persA")} />
          </Group>
          <Group testId="ebiz-node-persB" data={{ "data-on": on("persB") ? "true" : "false" }}>
            <Building x={550} y={390} w={100} d={70} h={58} kind="house" color="#e9e1f2" dim={dim("persB")} />
            <Person x={480} y={350} pose="stand" shirt="#4f86e8" size={0.8} dim={dim("persB")} />
            {sel === "sharing" && <Truck x={600} y={330} color="#f59e0b" />}
          </Group>

          {/* 使う取引のときだけ現れる中継役 */}
          {on("phone") && (
            <Group testId="ebiz-node-phone" data={{ "data-on": "true" }}>
              <Phone x={NODES.phone.spot.x} y={NODES.phone.spot.y} z={0} scale={1.2} glow />
            </Group>
          )}
          {on("platform") && (
            <Group testId="ebiz-node-platform" data={{ "data-on": "true" }}>
              <Building x={NODES.platform.spot.x} y={NODES.platform.spot.y - 70} w={70} d={50} h={70} kind="datacenter" state="active" />
            </Group>
          )}

          <Tree x={40} y={250} size={0.6} />
          <Tree x={640} y={250} size={0.6} />
          <Tree x={300} y={410} size={0.6} />

          {/* 流れの道（流れ終わっても残る） */}
          {steps.map((s, i) => (
            <FloorRoute
              key={`lane-${runKey}-${i}`}
              points={lanes[i]}
              width={8}
              z={3}
              tone={KIND_ROUTE[s.kind]}
              active
              testId="ebiz-lane"
              data={{ "data-kind": s.kind }}
            />
          ))}

          {[0, 1, 2].map((i) => (
            <DioramaToken key={i} id={`s${i}`}>
              {steps[i] && <Carry kind={steps[i].kind} car={steps[i].icon === "car"} />}
            </DioramaToken>
          ))}
        </>
      }
      labels={
        <>
          {(Object.keys(NODES) as NodeKey[])
            .filter((k) => (sel ? on(k) : !NODES[k].via))
            .map((k) => (
              <DioramaLabel key={k} at={TAG_AT[k]} place={k.startsWith("pers") ? "below" : "above"} optional={!on(k)}>
                <NameChip name={name(k)} tone={on(k) ? "info" : "muted"} />
              </DioramaLabel>
            ))}
          {steps.map(
            (s, i) =>
              moving(i) && (
                <DioramaLabel key={`t${i}-${runKey}`} token={`s${i}`} place="above">
                  <Badge tone={s.kind === "money" ? "ok" : s.kind === "info" ? "info" : "warn"}>
                    {"①②③"[i]}
                    {s.label}
                  </Badge>
                </DioramaLabel>
              ),
          )}
        </>
      }
    />
  );
}
