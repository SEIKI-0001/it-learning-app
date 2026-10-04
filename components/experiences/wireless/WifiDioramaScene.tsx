"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import { Box } from "../scene/Diorama3D";
import {
  Cable,
  Chair,
  Desk,
  Floor,
  GlassWall,
  Group,
  Laptop,
  Parcel,
  Person,
  Plant,
  Tree,
  Wall,
  WallWindow,
  WifiRouter,
} from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken, NameChip, lerp3 } from "../scene/DioramaStage";
import styles from "./wifidiorama.module.css";

// 無線LAN の図解：駅前カフェの2階（本物の公衆Wi-Fiで盗聴が起きる場面）を CSS 3D で再現する。
//   あなたの席のノートPC →（電波）→ 壁の上のアクセスポイント
//   電波はアクセスポイントだけを狙って飛ぶのではなく、ガラスも越えて周り全部へ広がる。
//   店の外のベンチで、受信用アンテナを付けたノートPCを開いている盗聴者にも同じ電波が届く。
//     暗号化なし … 盗聴者の画面に ID / PASSWORD がそのまま
//     WPA2/WPA3 … 受信はできるが中身は暗号文
//     有線（比較）… LANケーブルの中だけを通り、電波は出ない

export type WifiMode = "open" | "wpa" | "wired";
export type WifiPhase = "connect" | "send" | "arrive";

const SECRET = "id=tanaka&pass=spring123";
const CIPHER = "8f#2a@Qx$9Lw&X9q…";

// 主要な点
const LAPTOP: Vec3 = { x: 170, y: 262, z: 52 }; // あなたのノートPC（キーボードの上）
const AP: Vec3 = { x: 330, y: 20, z: 104 }; // 壁の棚のアクセスポイント
const EVE: Vec3 = { x: 640, y: 222, z: 46 }; // 店の外のベンチの盗聴者のノートPC

const PACKET_Z = 76;
const TO_AP: Vec3[] = [
  { ...LAPTOP, z: PACKET_Z },
  { ...lerp3(LAPTOP, AP, 0.5), z: 110 },
  { ...AP, z: AP.z! + 20 },
];
const TO_EVE: Vec3[] = [
  { ...LAPTOP, z: PACKET_Z },
  { ...lerp3(LAPTOP, EVE, 0.5), z: 96 },
  { ...EVE, z: EVE.z! + 26 },
];
// 有線：机の脚を下り、床を這って壁のアクセスポイントの下から上がる
const WIRE: Vec3[] = [
  { x: 200, y: 262, z: 48 },
  { x: 214, y: 250, z: 10 },
  { x: 214, y: 30, z: 10 },
  { x: 318, y: 30, z: 10 },
  { x: 318, y: 26, z: 96 },
];

const SHOTS: Record<WifiPhase, Camera> = {
  connect: { yaw: -16, pitch: 54, zoom: 1.5, fx: 190, fy: 240, fz: 60 },
  send: { yaw: -20, pitch: 56, zoom: 0.84, fx: 380, fy: 190, fz: 50 },
  arrive: { yaw: -24, pitch: 54, zoom: 0.86, fx: 420, fy: 170, fz: 60 },
};

const SSIDS: { name: string; lock: "open" | "wpa"; ours?: boolean }[] = [
  { name: "cafe-wifi-2F", lock: "open", ours: true },
  { name: "Free_WiFi", lock: "open" },
  { name: "aterm-3f9a2b", lock: "wpa" },
];

/** ノートPCの画面：Wi-Fiの一覧から、いまつなぐ SSID を選んでいるところ */
function WifiListScreen({ mode }: { mode: WifiMode }) {
  return (
    <div className={styles.osScreen}>
      <div className={styles.osBar}>Wi-Fi</div>
      {SSIDS.map((s) => {
        const lock = s.ours ? (mode === "wpa" ? "wpa" : "open") : s.lock;
        return (
          <div key={s.name} className={styles.osRow} data-picked={s.ours && mode !== "wired" ? "true" : "false"}>
            <span>{s.name}</span>
            <span>{lock === "wpa" ? "🔒" : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

export function WifiDioramaScene({
  mode,
  phase,
  forward,
  reducedMotion,
}: {
  mode: WifiMode;
  phase: WifiPhase;
  /** 前へ進んだ直後か（戻る・飛ばすときは小包を瞬間移動させる） */
  forward: boolean;
  reducedMotion: boolean;
}) {
  const wireless = mode !== "wired";
  const encrypted = mode === "wpa";
  const sending = phase === "send";
  const arrived = phase === "arrive";
  const eveGets = wireless && arrived;
  const radio = wireless && phase !== "connect";

  const route = wireless ? TO_AP : WIRE.map((p) => ({ ...p, z: (p.z ?? 0) + 8 }));
  const at = phase === "connect" ? null : sending ? (wireless ? route[1] : route[2]) : route[route.length - 1];
  const packetPath = phase === "connect" ? undefined : sending ? route.slice(1, wireless ? 2 : 3) : route.slice(wireless ? 2 : 3);
  const copyAt = !wireless || phase === "connect" ? null : sending ? TO_EVE[1] : TO_EVE[2];

  const tone = encrypted ? "secure" : wireless ? "danger" : "plain";

  return (
    <DioramaStage
      testId="wifi-scene"
      ariaLabel={
        wireless
          ? "駅前カフェの2階の模型。窓ぎわの席のノートPCから出た電波が、壁のアクセスポイントだけでなく、ガラスを越えて店の外のベンチにいる盗聴者のノートPCまで届く"
          : "駅前カフェの2階の模型。ノートPCと壁のアクセスポイントがLANケーブルでつながり、データはケーブルの中だけを通る"
      }
      shot={SHOTS[phase]}
      shotKey={`${mode}-${phase}`}
      forward={forward}
      reducedMotion={reducedMotion}
      className={styles.stage}
      dataAttrs={{ "data-mode": mode, "data-phase": phase }}
      tokens={{
        packet: { at, path: packetPath },
        copy: { at: copyAt, start: TO_EVE[0], path: sending ? [TO_EVE[1]] : [TO_EVE[2]] },
      }}
      corner={
        <span className={styles.ssidPlate} data-lock={mode} data-testid="wifi-ssid">
          <span className={styles.ssidName}>📶 cafe-wifi-2F</span>
          <span className={styles.ssidLock}>{mode === "wired" ? "🔌 有線LAN" : encrypted ? "🔒 WPA2/WPA3" : "🔓 暗号化なし"}</span>
        </span>
      }
      world={
        <>
          {/* 台座 */}
          <Floor x={-10} y={-20} w={820} d={440} h={16} material="plain" />

          {/* ---------- カフェの2階 ---------- */}
          <Floor x={0} y={0} w={500} d={400} h={6} z={6} material="wood" />
          <Wall x={0} y={0} length={500} h={130} tone="cafe">
            <WallWindow left={24} top={22} w={120} h={70} />
            <div className={styles.menuBoard} style={{ left: 170, top: 18, width: 96, height: 44 }} />
            <div className={styles.wifiSign} style={{ left: 380, top: 58, width: 92, height: 34 }}>
              <b>Wi-Fi</b>
              <span>cafe-wifi-2F</span>
            </div>
          </Wall>
          <Group z={6}>
            {/* 壁の棚のアクセスポイント */}
            <Box x={306} y={4} z={86} w={50} d={24} h={4} color="#b58a60" />
            <Group data={{ "data-node": "ap", "data-state": arrived ? "active" : "idle" }}>
              <WifiRouter x={AP.x} y={AP.y} z={90} testId="wifi-ap" />
            </Group>

            {/* あなたの席（窓ぎわ） */}
            <Desk x={LAPTOP.x} y={LAPTOP.y} w={110} d={64} tone="wood" />
            <Laptop
              x={LAPTOP.x}
              y={LAPTOP.y}
              z={44}
              glow={phase === "connect"}
              screen={<WifiListScreen mode={mode} />}
            />
            <Box x={210} y={250} z={44} w={10} d={10} h={11} color="#fafafa" />
            <Person x={LAPTOP.x - 4} y={LAPTOP.y + 72} pose="sit" shirt="#4f86e8" />

            {/* ほかの客席（雰囲気） */}
            <Desk x={360} y={180} w={86} d={60} tone="wood" />
            <Chair x={360} y={228} rot={180} />
            <Box x={350} y={170} z={44} w={10} d={10} h={11} color="#fafafa" />
            <Desk x={380} y={318} w={86} d={60} tone="wood" />
            <Chair x={380} y={366} rot={180} />
            <Person x={386} y={290} pose="stand" shirt="#d98a4a" size={0.92} />
            <Plant x={36} y={40} />
            <Plant x={470} y={372} size={0.9} />
          </Group>

          {/* 店の正面のガラス（電波はガラスも壁も越える） */}
          <GlassWall x={500} y={0} length={400} h={122} axis="y" />

          {/* ---------- 店の外（歩道とベンチ） ---------- */}
          <Floor x={506} y={0} w={294} d={400} h={4} z={4} material="paving" />
          <Tree x={760} y={70} />
          <Tree x={760} y={360} size={0.9} />
          {/* ベンチ */}
          <Box x={600} y={200} z={4} w={90} d={34} h={30} color="#8a6a4a" faceClass={{ top: styles.benchTop }} />
          <Group data={{ "data-illustration": "eavesdropper" }}>
            <Laptop x={EVE.x} y={EVE.y - 4} z={34} rot={180} tone="dark" glow={eveGets} />
            {/* USB の受信アンテナ（電波を拾う） */}
            <Box x={664} y={204} z={34} w={3} d={3} h={26} color="#111827" />
            <Box x={662} y={202} z={60} w={7} d={7} h={5} color={eveGets && !encrypted ? "#e11d48" : "#475569"} />
            <Person x={646} y={186} pose="attacker" active={eveGets} />
          </Group>

          {/* ---------- 電波の輪（ノートPCを中心に、床いっぱいに広がる） ---------- */}
          {radio && (
            <div className={styles.waveOrigin} style={{ transform: `translate3d(${LAPTOP.x}px, ${LAPTOP.y}px, 50px)` }} data-testid="wifi-waves">
              <span className={styles.wave} />
              <span className={styles.wave} />
              <span className={styles.wave} />
              <span className={styles.waveStatic} />
            </div>
          )}

          {/* ---------- 有線（比較）：LANケーブル ---------- */}
          {!wireless && (
            <Group testId="wifi-cable" data={{ "data-active": sending ? "true" : "false" }}>
              {WIRE.slice(1).map((to, i) => (
                <Cable key={i} from={WIRE[i]} to={to} r={2.2} tone={phase === "connect" ? "idle" : "request"} segments={6} />
              ))}
            </Group>
          )}

          {/* ---------- 流れるデータ ---------- */}
          <DioramaToken id="packet">
            <Group testId="wifi-packet" data={{ "data-sealed": encrypted ? "true" : "false" }}>
              <Parcel tone={tone} mark={encrypted ? "lock" : wireless ? "alert" : "none"} />
            </Group>
          </DioramaToken>
          <DioramaToken id="copy">
            <Group testId="wifi-packet-copy">
              <Parcel tone={tone} mark={encrypted ? "lock" : "alert"} size={0.75} />
            </Group>
          </DioramaToken>

        </>
      }
      labels={
        <>
          {phase === "connect" && (
            <DioramaLabel at={{ x: LAPTOP.x, y: LAPTOP.y - 30, z: 96 }} place="right">
              <div className={styles.wifiList} data-testid="wifi-list">
                <span className={styles.wifiListTitle}>ノートPCの Wi-Fi 一覧</span>
                {SSIDS.map((s) => {
                  const lock = s.ours ? (mode === "wpa" ? "wpa" : "open") : s.lock;
                  const picked = !!s.ours && mode !== "wired";
                  return (
                    <span key={s.name} className={styles.wifiRow} data-picked={picked ? "true" : "false"}>
                      <span className={styles.wifiName}>{s.name}</span>
                      <span className={styles.wifiLock} data-lock={lock}>
                        {lock === "wpa" ? "🔒 WPA2/3" : "鍵なし"}
                      </span>
                    </span>
                  );
                })}
                {mode === "wired" && <span className={styles.wifiWired}>🔌 今回は Wi-Fi を使わず LANケーブル</span>}
              </div>
            </DioramaLabel>
          )}

          {phase !== "connect" && (
            <DioramaLabel token="packet" dz={14} place={sending ? "above" : "left"}>
              <div className={styles.dataTag} data-tone={tone} role="img" aria-label={encrypted ? "暗号化されたデータ" : `暗号化されていないデータ：${SECRET}`}>
                <span className={styles.dataTagHead}>{encrypted ? "🔒 WPA2/WPA3 で暗号化" : wireless ? "暗号化なし" : "ケーブルの中"}</span>
                <span className={styles.dataTagBody}>{encrypted ? CIPHER : SECRET}</span>
              </div>
            </DioramaLabel>
          )}

          {arrived && (
            <DioramaLabel at={{ ...EVE, z: EVE.z! + 60 }} place="above" pinned>
              <div
                className={styles.eveScreen}
                data-testid="wifi-eve"
                data-reads={wireless && !encrypted ? "true" : "false"}
                data-gets={wireless ? "true" : "false"}
                data-mode={mode}
                role="status"
              >
                <span className={styles.eveTitle}>😈 盗聴者のノートPC（受信した電波）</span>
                {!wireless ? (
                  <span className={styles.eveNothing}>何も届かない（電波が出ていない）</span>
                ) : encrypted ? (
                  <>
                    <span className={styles.eveLine}>{CIPHER}</span>
                    <span className={styles.eveVerdict} data-tone="ok">受信できた…でも読めない</span>
                  </>
                ) : (
                  <>
                    <span className={styles.eveLine}>POST /login</span>
                    <span className={styles.eveLine} data-secret>
                      id=tanaka
                      <br />
                      pass=spring123
                    </span>
                    <span className={styles.eveVerdict}>そのまま読めた！</span>
                  </>
                )}
              </div>
            </DioramaLabel>
          )}

          <DioramaLabel at={{ x: 130, y: 350, z: 0 }} place="below" optional>
            <NameChip name="あなた" status={phase === "connect" ? "接続中" : sending ? "送信" : undefined} tone={sending ? "info" : "ok"} />
          </DioramaLabel>
          <DioramaLabel at={{ ...AP, z: AP.z! + 28 }} place="above" optional>
            <NameChip name="アクセスポイント" />
          </DioramaLabel>
          {!arrived && (
            <DioramaLabel at={{ x: 646, y: 186, z: 118 }} place="above" optional>
              <NameChip name="盗聴者" status={radio ? "受信中" : undefined} tone="danger" />
            </DioramaLabel>
          )}
        </>
      }
    />
  );
}
