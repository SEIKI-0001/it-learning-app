"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import {
  Appliance,
  Database,
  Desk,
  Floor,
  FloorRoute,
  Group,
  Laptop,
  Monitor,
  Parcel,
  Person,
  Plant,
  ServerRack,
  Wall,
  WallWindow,
  type CarryTone,
  type RouteTone,
} from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import type { CyberLaneId, CyberNodeId, CyberSceneProps, LaneTone } from "./CyberScene";
import styles from "./cyber.module.css";
import dio from "./cyberdiorama.module.css";

// サイバー攻撃の図解：ある会社（奥のサーバ室に Webサーバと DB、手前の執務室に社員PC）と、
// 社外のインターネット（通信会社のルータ）・攻撃者の部屋・自宅の利用者。
// 攻撃ごとに「攻撃が通る道」と「被害が出る場所」が違うことを、同じ会社の模型の上で見比べる。
//   DDoS＝大量の通信で Webサーバが止まる／SQLインジェクション＝Web経由で DB の中身が漏れる／
//   XSS＝Webに仕込んだ罠が利用者のブラウザで動く／標的型攻撃・ソーシャルエンジニアリング＝社員（人）を狙う。

const AT: Record<CyberNodeId, Vec3> = {
  attacker: { x: 120, y: 110, z: 0 },
  internet: { x: 330, y: 236, z: 0 },
  web: { x: 580, y: 120, z: 0 },
  db: { x: 716, y: 140, z: 0 },
  user: { x: 120, y: 348, z: 0 },
  staff: { x: 620, y: 322, z: 0 },
};
/** 運ばれる物が止まる点（機器の上） */
const STOP: Record<CyberNodeId, Vec3> = {
  attacker: { x: AT.attacker.x + 30, y: AT.attacker.y + 26, z: 64 },
  internet: { x: AT.internet.x, y: AT.internet.y + 6, z: 50 },
  web: { x: AT.web.x, y: AT.web.y + 40, z: 30 },
  db: { x: AT.db.x, y: AT.db.y + 30, z: 60 },
  user: { x: AT.user.x + 30, y: AT.user.y + 10, z: 64 },
  staff: { x: AT.staff.x + 28, y: AT.staff.y + 8, z: 66 },
};
/** 道のつなぎ目（床の高さ） */
const PORT: Record<CyberNodeId, Vec3> = {
  attacker: { x: 176, y: 150, z: 3 },
  internet: { x: 330, y: 262, z: 3 },
  web: { x: 580, y: 176, z: 3 },
  db: { x: 690, y: 170, z: 3 },
  user: { x: 176, y: 330, z: 3 },
  staff: { x: 580, y: 318, z: 3 },
};
const ENDS: Record<CyberLaneId, [CyberNodeId, CyberNodeId]> = {
  ai: ["attacker", "internet"],
  iw: ["internet", "web"],
  wd: ["web", "db"],
  ui: ["user", "internet"],
  is: ["internet", "staff"],
  as: ["attacker", "staff"],
  sw: ["staff", "web"],
};
const LANE_POINTS: Record<CyberLaneId, Vec3[]> = {
  ai: [PORT.attacker, { x: 270, y: 210, z: 3 }, PORT.internet],
  iw: [PORT.internet, { x: 460, y: 222, z: 3 }, PORT.web],
  wd: [PORT.web, PORT.db],
  ui: [PORT.user, { x: 260, y: 290, z: 3 }, PORT.internet],
  is: [PORT.internet, { x: 460, y: 300, z: 3 }, PORT.staff],
  as: [{ x: 190, y: 140, z: 3 }, { x: 420, y: 150, z: 3 }, { x: 500, y: 250, z: 3 }, { ...PORT.staff, y: PORT.staff.y - 10 }],
  sw: [{ ...PORT.staff, x: PORT.staff.x - 6 }, { x: 560, y: 240, z: 3 }, PORT.web],
};
const TONE: Record<LaneTone, RouteTone> = { attack: "danger", normal: "request", leak: "amber", phone: "violet" };
const CARRY: Record<LaneTone, CarryTone> = { attack: "danger", normal: "info", leak: "warn", phone: "muted" };

const LABEL: Record<CyberNodeId, { name: string; sub: string; at: Vec3; place: "above" | "below" }> = {
  attacker: { name: "😈 攻撃者", sub: "社外", at: { ...AT.attacker, y: AT.attacker.y - 10, z: 100 }, place: "above" },
  internet: { name: "🌐 インターネット", sub: "通信会社のルータ", at: { ...AT.internet, y: AT.internet.y + 30 }, place: "below" },
  web: { name: "Webサーバ", sub: "会社の公開サイト", at: { ...AT.web, z: 124 }, place: "above" },
  db: { name: "DB", sub: "会員データ", at: { ...AT.db, y: AT.db.y + 36 }, place: "below" },
  user: { name: "利用者のブラウザ", sub: "自宅", at: { ...AT.user, y: AT.user.y + 72 }, place: "below" },
  staff: { name: "社員PC", sub: "執務室", at: { ...AT.staff, y: AT.staff.y + 74 }, place: "below" },
};

const SHOT_WIDE: Camera = { yaw: -20, pitch: 54, zoom: 0.84, fx: 420, fy: 240, fz: 40 };

function shotOf(stop: CyberNodeId | null): Camera {
  if (!stop) return SHOT_WIDE;
  const p = AT[stop];
  // 主役（止まった場所）へ少し寄る。全体の道も見えるよう寄りすぎない
  return { yaw: -20, pitch: 52, zoom: 1.0, fx: (p.x + 420) / 2, fy: (p.y + 240) / 2, fz: 40 };
}

/** 前の場所から今の場所までの道のり（隣り合うときは道に沿って） */
function pathBetween(from: CyberNodeId | null, to: CyberNodeId): Vec3[] | undefined {
  if (!from || from === to) return undefined;
  for (const [id, [a, b]] of Object.entries(ENDS) as [CyberLaneId, [CyberNodeId, CyberNodeId]][]) {
    const pts = LANE_POINTS[id].map((p) => ({ ...p, z: 18 }));
    if (a === from && b === to) return [...pts, STOP[to]];
    if (b === from && a === to) return [...[...pts].reverse(), STOP[to]];
  }
  return undefined;
}

export function CyberDioramaScene({
  caption,
  nodes,
  lanes,
  payload,
  flood,
  damage,
  reducedMotion,
  forward = true,
  previousStop = null,
}: CyberSceneProps & { forward?: boolean; previousStop?: CyberNodeId | null }) {
  const stop = payload?.stop ?? null;
  return (
    <div className={styles.frame}>
      {caption && (
        <div className={styles.caption} aria-live="polite">
          <div className={styles.captionHead}>
            <span className={styles.captionLabel}>{caption.label}</span>
            {caption.badge}
          </div>
          <p className={styles.captionTitle} data-testid="cyber-step-title">
            {caption.title}
          </p>
        </div>
      )}
      <DioramaStage
        testId="cyber-scene"
        ariaLabel="ある会社の模型。奥のサーバ室にWebサーバとデータベース、手前の執務室に社員PC。社外にインターネット（通信会社のルータ）、攻撃者の部屋、自宅の利用者がいる"
        shot={shotOf(stop)}
        shotKey={`${stop ?? "-"}-${payload?.text ?? ""}-${damage.map((d) => d.at).join(",")}`}
        forward={forward}
        reducedMotion={reducedMotion}
        tokens={{ payload: { at: stop ? STOP[stop] : null, path: stop ? pathBetween(previousStop, stop) : undefined } }}
        world={
          <>
            <Floor x={0} y={20} w={820} d={420} h={16} material="plain" />

            {/* ---------- 攻撃者の部屋 ---------- */}
            <Floor x={20} y={40} w={200} d={150} h={5} z={4} material="asphalt" />
            <Group z={4} data={{ "data-node": "attacker", "data-state": nodes.attacker }}>
              <Desk x={AT.attacker.x} y={AT.attacker.y} w={96} d={52} tone="wood" />
              <Laptop x={AT.attacker.x} y={AT.attacker.y} z={44} tone="dark" glow={nodes.attacker !== "idle"} />
              <Person x={AT.attacker.x - 4} y={AT.attacker.y + 58} pose="attacker" active={nodes.attacker !== "idle"} />
            </Group>

            {/* ---------- 自宅の利用者 ---------- */}
            <Floor x={20} y={270} w={200} d={160} h={5} z={4} material="wood" />
            <Group z={4} data={{ "data-node": "user", "data-state": nodes.user }}>
              <Desk x={AT.user.x} y={AT.user.y} w={96} d={52} tone="wood" />
              <Laptop x={AT.user.x} y={AT.user.y} z={44} glow={nodes.user !== "idle"} />
              <Person x={AT.user.x - 4} y={AT.user.y + 58} pose="sit" shirt="#3f9a73" size={0.95} />
            </Group>

            {/* ---------- インターネット ---------- */}
            <Group z={0} data={{ "data-node": "internet", "data-state": nodes.internet }}>
              <Appliance x={AT.internet.x} y={AT.internet.y} kind="router" stand={30} w={56} state={nodes.internet} />
            </Group>

            {/* ---------- 会社：奥のサーバ室と手前の執務室 ---------- */}
            <Floor x={440} y={40} w={370} d={390} h={5} z={4} material="carpet" />
            <Floor x={500} y={44} w={306} d={150} h={2} z={9} material="dc" />
            <Wall x={440} y={40} length={370} h={124} tone="office">
              <WallWindow left={20} top={18} w={70} h={48} />
            </Wall>
            <Group z={9} data={{ "data-node": "web", "data-state": nodes.web }}>
              <ServerRack x={AT.web.x} y={AT.web.y} state={nodes.web} accent="#2f6fdb" />
            </Group>
            <ServerRack x={AT.web.x + 66} y={AT.web.y} z={9} h={96} units={5} />
            <Group z={9} data={{ "data-node": "db", "data-state": nodes.db }}>
              <Database x={AT.db.x} y={AT.db.y} state={nodes.db} />
            </Group>
            <Group z={4} data={{ "data-node": "staff", "data-state": nodes.staff }}>
              <Desk x={AT.staff.x} y={AT.staff.y} w={110} d={56} />
              <Monitor x={AT.staff.x - 10} y={AT.staff.y - 6} w={52} glow={nodes.staff !== "idle"} tone={nodes.staff === "error" ? "dark" : "light"} />
              <Person x={AT.staff.x - 10} y={AT.staff.y + 60} pose="sit" shirt="#6b7fd6" size={0.95} />
              <Desk x={AT.staff.x + 130} y={AT.staff.y} w={100} d={56} />
              <Monitor x={AT.staff.x + 130} y={AT.staff.y - 6} w={50} />
              <Plant x={790} y={410} size={0.8} />
            </Group>

            {(Object.keys(LANE_POINTS) as CyberLaneId[]).map((id) => {
              const state = lanes[id];
              return (
                <FloorRoute
                  key={id}
                  points={LANE_POINTS[id]}
                  width={id === "as" ? 5 : 8}
                  z={4.8}
                  tone={!state ? "idle" : state === "blocked" ? "blocked" : TONE[state]}
                  active={!!state && state !== "blocked"}
                  fast={flood.includes(id)}
                  data={{
                    "data-lane": id,
                    "data-state": !state ? "idle" : state === "blocked" ? "blocked" : "active",
                    "data-tone": state && state !== "blocked" ? state : undefined,
                    "data-flood": flood.includes(id) ? id : undefined,
                  }}
                />
              );
            })}

            <DioramaToken id="payload">
              {payload && <Parcel tone={CARRY[payload.tone]} icon={payload.tone === "phone" ? "☎" : payload.tone === "leak" ? "▤" : "!"} />}
            </DioramaToken>
          </>
        }
        labels={
          <>
            {payload && (
              <DioramaLabel token="payload" dz={16} place="above">
                <div data-stop={payload.stop} data-tone={payload.tone} data-testid="cyber-payload">
                  <span className={dio.payload} data-tone={payload.tone}>
                    {payload.text}
                  </span>
                </div>
              </DioramaLabel>
            )}
            {damage.map((d) => (
              <DioramaLabel key={d.at} at={{ ...STOP[d.at], z: STOP[d.at].z! - 20 }} place="below">
                <span className={dio.damage} data-damage={d.at} data-testid={`damage-${d.at}`}>
                  💥 {d.text}
                </span>
              </DioramaLabel>
            ))}
            {(Object.keys(LABEL) as CyberNodeId[]).map((id) => (
              <DioramaLabel key={id} at={LABEL[id].at} place={LABEL[id].place} optional>
                <div data-node-label={id} data-state={nodes[id]}>
                  <NameChip name={LABEL[id].name} sub={LABEL[id].sub} tone={nodes[id] === "error" ? "danger" : nodes[id] === "idle" ? "muted" : "info"} />
                </div>
              </DioramaLabel>
            ))}
            {!caption && (
              <DioramaLabel at={{ x: 625, y: 40, z: 124 }} place="above" optional>
                <NameChip name="🏢 実験用の会社" tone="muted" />
              </DioramaLabel>
            )}
          </>
        }
      />
      {caption?.note && <p className={styles.captionNote}>😈 {caption.note}</p>}
    </div>
  );
}
