"use client";

import { Box, type Camera, type Vec3 } from "../scene/Diorama3D";
import {
  Appliance,
  Barrier,
  Database,
  Floor,
  FloorRoute,
  GlassWall,
  Group,
  Parcel,
  Person,
  Phone,
  ServerRack,
  Tree,
  Wall,
  offsetPath,
  slicePath,
  type RouteTone,
} from "../scene/DioramaParts";
import { Callout, DataTag, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import type { NodeState } from "../network/NetworkSceneBase";
import type { ApiLaneId, ApiSceneProps, ApiStop } from "./apiTypes";
import styles from "./apidiorama.module.css";

// API の図解：歩道でスマホの天気アプリを開く人 → 天気会社のデータセンター。
// データセンターはガラスの仕切りで囲まれていて、外から入れる口は API Gateway だけ。
// リクエストは Gateway を通って天気サービス（サーバ）に届き、サービスが DB から読んだ結果がレスポンスで戻る。
// 「APIを通さず直接」の実験では、リクエストが DB へまっすぐ向かい、ガラスの境界で止められる。

const PHONE: Vec3 = { x: 170, y: 318, z: 50 };
const GATE: Vec3 = { x: 318, y: 250, z: 0 };
const SVC: Vec3 = { x: 540, y: 196, z: 0 };
const DB: Vec3 = { x: 660, y: 318, z: 0 };

const G = 3; // 車線の高さ
const TO_GATE: Vec3[] = [
  { x: 196, y: 300, z: G },
  { x: 250, y: 272, z: G },
  { x: 300, y: 256, z: G },
];
const TO_SVC: Vec3[] = [
  { x: 340, y: 256, z: G },
  { x: 430, y: 246, z: G },
  { x: 512, y: 236, z: G },
];
const DIRECT: Vec3[] = [
  { x: 196, y: 318, z: G },
  { x: 300, y: 318, z: G },
  { x: 630, y: 322, z: G },
];
const reverse = (p: Vec3[]) => [...p].reverse();
const LANE: Record<ApiLaneId, Vec3[]> = {
  req1: offsetPath(TO_GATE, -6),
  req2: offsetPath(TO_SVC, -6),
  res1: offsetPath(reverse(TO_SVC), -6),
  res2: offsetPath(reverse(TO_GATE), -6),
  direct: DIRECT,
};
const Z = G + 1;

function stopPath(stop: ApiStop): Vec3[] {
  switch (stop) {
    case "app":
      return [{ x: PHONE.x + 30, y: PHONE.y - 6, z: 88 }];
    case "apiIn":
      return slicePath(LANE.req1, 0.92, Z);
    case "svc":
      return slicePath(LANE.req2, 0.9, Z);
    case "apiOut":
      return slicePath(LANE.res1, 0.92, Z);
    case "appBack":
      return slicePath(LANE.res2, 0.88, Z);
    case "wall":
      return slicePath(LANE.direct, 0.27, Z);
  }
}

const LANE_TONE: Record<ApiLaneId, RouteTone> = {
  req1: "request",
  req2: "request",
  res1: "response",
  res2: "response",
  direct: "danger",
};

const STATUS: Partial<Record<NodeState, { word: string; tone: "info" | "ok" | "danger" }>> = {
  active: { word: "処理中", tone: "ok" },
  sending: { word: "送信", tone: "info" },
  error: { word: "侵入を拒否", tone: "danger" },
};

const SHOTS: Record<ApiStop | "bypass", Camera> = {
  app: { yaw: -14, pitch: 50, zoom: 1.5, fx: 170, fy: 300, fz: 60 },
  apiIn: { yaw: -18, pitch: 52, zoom: 1.12, fx: 260, fy: 260, fz: 50 },
  svc: { yaw: -24, pitch: 54, zoom: 1.02, fx: 450, fy: 240, fz: 50 },
  apiOut: { yaw: -22, pitch: 54, zoom: 1.02, fx: 400, fy: 250, fz: 50 },
  appBack: { yaw: -16, pitch: 52, zoom: 1.2, fx: 230, fy: 280, fz: 50 },
  // 直接アクセス：止められたガラスの境界と、本来の入口（Gateway）が両方見える位置
  wall: { yaw: -16, pitch: 50, zoom: 1.1, fx: 300, fy: 280, fz: 50 },
  bypass: { yaw: -16, pitch: 50, zoom: 1.1, fx: 300, fy: 280, fz: 50 },
};

function WeatherScreen({ text }: { text: string | null }) {
  const ready = !!text && !text.includes("--");
  return (
    <div className={styles.app}>
      <span className={styles.appCity}>東京</span>
      <span className={styles.appSun} data-ready={ready ? "true" : "false"} />
      <span className={styles.appTemp}>{ready ? "25℃" : "--℃"}</span>
      <span className={styles.appRows}>
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

export function ApiDioramaScene({
  nodes,
  lanes,
  capsule,
  screen,
  bypass,
  reducedMotion,
  forward = true,
}: ApiSceneProps & { forward?: boolean }) {
  const stop = capsule?.stop ?? null;
  const path = stop ? stopPath(stop) : null;
  const shot = bypass ? SHOTS.bypass : stop ? SHOTS[stop] : SHOTS.app;
  const lastScreen = screen ?? (stop === "appBack" ? "東京 ☀ 25℃" : null);

  return (
    <DioramaStage
      testId="api-scene"
      ariaLabel="歩道でスマホの天気アプリを開く人と、ガラスの仕切りで囲まれた天気会社のデータセンター。外から入れる口は API Gateway だけで、中に天気サービスのサーバとデータベースがある"
      shot={shot}
      shotKey={`${stop ?? "none"}-${bypass ? "b" : ""}`}
      forward={forward}
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-bypass": bypass ? "true" : "false" }}
      tokens={{ req: { at: path ? path[path.length - 1] : null, path: path ?? undefined } }}
      world={
        <>
          <Floor x={0} y={-10} w={820} d={440} h={16} material="plain" />

          {/* ---------- 歩道：スマホで天気アプリを開く人 ---------- */}
          <Floor x={16} y={140} w={262} d={280} h={5} z={4} material="paving" />
          <Group z={4}>
            <Tree x={58} y={176} size={0.95} />
            {/* ベンチ */}
            <Box x={40} y={336} w={6} d={20} h={16} color="#4b5563" />
            <Box x={96} y={336} w={6} d={20} h={16} color="#4b5563" />
            <Box x={34} y={334} w={74} d={24} h={4} z={16} color="#9a7350" />
            <Box x={34} y={356} w={74} d={4} h={20} z={18} color="#8a6a4a" />
            <Group data={{ "data-illustration": "phone", "data-node": "app", "data-state": nodes.app }}>
              <Phone
                x={PHONE.x}
                y={PHONE.y}
                z={PHONE.z}
                scale={0.9}
                glow={nodes.app === "active"}
                screen={<WeatherScreen text={lastScreen} />}
              />
              <Person x={PHONE.x - 24} y={PHONE.y + 14} pose="back" shirt="#e0803a" size={1.05} />
            </Group>
          </Group>

          {/* ---------- 天気会社のデータセンター ---------- */}
          <Floor x={300} y={20} w={500} d={390} h={5} z={4} material="dc" />
          <Wall x={300} y={20} length={500} h={130} tone="dc" />
          <Group z={4}>
            {/* ガラスの境界（入口は Gateway の1か所だけ） */}
            <GlassWall x={300} y={24} length={206} axis="y" alarm={bypass} />
            <GlassWall x={300} y={276} length={130} axis="y" alarm={bypass} />

            <Group data={{ "data-illustration": "api-counter", "data-node": "api", "data-state": nodes.api }}>
              <Appliance x={GATE.x} y={GATE.y} kind="gateway" stand={34} w={52} rot={90} state={nodes.api} />
              {/* 入口の門枠 */}
              <Box x={300} y={228} w={6} d={6} h={90} color="#5b6474" />
              <Box x={300} y={270} w={6} d={6} h={90} color="#5b6474" />
              <Box x={300} y={228} z={86} w={6} d={48} h={6} color="#5b6474" />
            </Group>

            <Group data={{ "data-illustration": "service", "data-node": "svc", "data-state": nodes.svc }}>
              <ServerRack x={SVC.x} y={SVC.y} state={nodes.svc} accent="#f59e0b" />
              <ServerRack x={SVC.x + 72} y={SVC.y} state={nodes.svc === "active" ? "active" : "idle"} />
              <Database x={DB.x} y={DB.y} state={bypass ? "error" : nodes.svc} />
            </Group>
            <ServerRack x={SVC.x + 144} y={SVC.y} h={96} units={5} />
          </Group>

          {/* ---------- 経路 ---------- */}
          {(["req1", "req2", "res1", "res2"] as ApiLaneId[]).map((id) => (
            <FloorRoute
              key={id}
              points={LANE[id]}
              width={7}
              z={4.8}
              tone={lanes[id] === "active" ? LANE_TONE[id] : "idle"}
              active={lanes[id] === "active"}
              data={{ "data-lane": id, "data-state": lanes[id] ?? "idle" }}
            />
          ))}
          {bypass && <FloorRoute points={slicePath(LANE.direct, 0.3)} width={7} z={4.8} tone="blocked" data={{ "data-lane": "direct", "data-state": "blocked" }} />}
          <Barrier x={302} y={318} z={4} w={80} h={80} axis="y" on={bypass} />
          {/* サーバから DB への内部の線（外からは見えない場所） */}
          <FloorRoute points={[{ x: SVC.x + 20, y: SVC.y + 40, z: G }, { x: DB.x - 16, y: DB.y - 10, z: G }]} width={4} z={4.8} tone={nodes.svc === "active" ? "request" : "idle"} active={nodes.svc === "active"} />

          <DioramaToken id="req">
            {capsule && <Parcel tone={capsule.kind === "response" ? "ok" : capsule.kind === "blocked" ? "danger" : "info"} mark={capsule.kind === "response" ? "check" : capsule.kind === "blocked" ? "alert" : "none"} />}
          </DioramaToken>
        </>
      }
      labels={
        <>
          {capsule && (
            <DioramaLabel token="req" dz={14} place={stop === "app" || stop === "appBack" ? "right" : stop === "svc" || stop === "apiOut" ? "below" : "above"}>
              <div data-testid="api-capsule" data-stop={capsule.stop} data-capsule-kind={capsule.kind === "request" ? "query" : capsule.kind === "response" ? "response" : "timeout"}>
                <DataTag tag={capsule.tag} body={capsule.payload} tone={capsule.kind === "response" ? "ok" : capsule.kind === "blocked" ? "danger" : "info"} />
              </div>
            </DioramaLabel>
          )}

          {bypass && (
            <DioramaLabel at={{ x: 420, y: 380, z: 0 }} place="below">
              <div role="status" data-testid="bypass-denied">
                <Callout tone="danger" title="⛔ 入口は API だけ" />
              </div>
            </DioramaLabel>
          )}

          {screen && (
            <DioramaLabel at={{ x: PHONE.x - 30, y: PHONE.y, z: 90 }} place="left">
              <div role="status" data-testid="app-screen">
                <Callout tone={screen.includes("--") ? "muted" : "ok"} body={screen} />
              </div>
            </DioramaLabel>
          )}

          <DioramaLabel at={{ x: PHONE.x, y: PHONE.y + 60, z: 0 }} place="below" optional>
            <NameChip name="天気アプリ" status={STATUS[nodes.app]?.word} tone={STATUS[nodes.app]?.tone} />
          </DioramaLabel>
          <DioramaLabel at={{ ...GATE, z: 96 }} place="above" optional>
            <NameChip name="API Gateway" status={STATUS[nodes.api]?.word} tone={STATUS[nodes.api]?.tone} />
          </DioramaLabel>
          <DioramaLabel at={{ ...SVC, x: SVC.x + 36, z: 126 }} place="above" optional>
            <NameChip name="天気サービス" status={STATUS[nodes.svc]?.word} tone={STATUS[nodes.svc]?.tone} />
          </DioramaLabel>
          {bypass && (
            <DioramaLabel at={{ ...DB, y: DB.y + 24, z: 0 }} place="below" optional>
              <NameChip name="天気DB" tone="muted" />
            </DioramaLabel>
          )}
        </>
      }
    />
  );
}
