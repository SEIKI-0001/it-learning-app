"use client";

import { Box, type Camera, type Vec3 } from "../scene/Diorama3D";
import {
  Appliance,
  Desk,
  Floor,
  FloorRoute,
  GlassTube,
  Group,
  Laptop,
  Monitor,
  Parcel,
  Person,
  Plant,
  Wall,
  WallWindow,
  WifiRouter,
} from "../scene/DioramaParts";
import { Badge, Callout, DataTag, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import type { VpnSceneProps, VpnStop } from "./firewallTypes";
import styles from "./firewalldiorama.module.css";

// VPN の図解：自宅の部屋（リモートワーク）→ インターネットの公衆回線 → 会社のオフィス。
// 公衆回線の途中にある道ばたの通信設備には盗聴者が回線をつないでいる。
// VPN をオンにすると、自宅のPCから会社の VPN 装置までガラスの暗号トンネルが通り、盗聴者には暗号文しか見えない。

const PC: Vec3 = { x: 120, y: 318, z: 50 };
const ROUTER: Vec3 = { x: 206, y: 262, z: 30 };
const TAP: Vec3 = { x: 400, y: 214, z: 0 };
const EVE: Vec3 = { x: 430, y: 300, z: 0 };
const GW: Vec3 = { x: 590, y: 170, z: 0 };

const G = 3;
const LINE: Vec3[] = [
  { x: 206, y: 262, z: G },
  { x: 300, y: 230, z: G },
  { x: 400, y: 214, z: G },
  { x: 500, y: 196, z: G },
  { x: 582, y: 180, z: G },
];
const STOP_AT: Record<VpnStop, Vec3> = {
  home: { x: PC.x + 30, y: PC.y - 20, z: 70 },
  mid: { x: 400, y: 214, z: 10 },
  office: { x: 600, y: 176, z: 46 },
};
const PATHS: Record<VpnStop, Vec3[]> = {
  home: [STOP_AT.home],
  mid: [{ ...LINE[0], z: 10 }, { ...LINE[1], z: 10 }, STOP_AT.mid],
  office: [{ ...LINE[3], z: 10 }, { ...LINE[4], z: 10 }, STOP_AT.office],
};

const SHOTS: Record<VpnStop, Camera> = {
  // 送る前＝自宅に寄る／途中＝盗聴者のいる通信設備／届いた＝会社の VPN 装置
  home: { yaw: -16, pitch: 50, zoom: 1.2, fx: 170, fy: 300, fz: 50 },
  mid: { yaw: -18, pitch: 52, zoom: 1.1, fx: 380, fy: 250, fz: 40 },
  office: { yaw: -22, pitch: 52, zoom: 1.1, fx: 560, fy: 190, fz: 50 },
};

export function VpnDioramaScene({ vpn, stop, sending, reducedMotion }: VpnSceneProps) {
  const intercepted = stop !== "home";
  const capsuleState = !vpn ? "plain" : stop === "office" ? "decrypted" : stop === "mid" ? "encrypted" : "plain";
  // 送った後も、回線がむき出しか（赤）トンネルの中か（緑）が分かるように色を残す
  const lineTone = vpn ? "secure" : intercepted || sending ? "danger" : "idle";

  return (
    <DioramaStage
      testId="vpn-scene"
      ariaLabel={
        vpn
          ? "自宅の部屋のPCから会社のオフィスまで、インターネットの公衆回線の上にガラスの暗号トンネルが通っている。途中の通信設備で盗聴者が回線をのぞいている"
          : "自宅の部屋のPCから会社のオフィスまで、インターネットの公衆回線がむき出しでつながっている。途中の通信設備で盗聴者が回線をのぞいている"
      }
      shot={SHOTS[stop]}
      shotKey={`${stop}-${vpn ? "v" : ""}`}
      forward={sending}
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-mode": vpn ? "https" : "http" }}
      tokens={{ doc: { at: STOP_AT[stop], path: PATHS[stop] } }}
      corner={
        <span className={styles.plate} data-on={vpn ? "true" : "false"}>
          {vpn ? "VPN オン 🔒" : "VPN なし"}
        </span>
      }
      world={
        <>
          <Floor x={0} y={0} w={800} d={430} h={16} material="plain" />

          {/* ---------- 自宅の部屋 ---------- */}
          <Floor x={16} y={230} w={230} d={190} h={5} z={4} material="wood" />
          <Wall x={16} y={230} length={230} h={100} tone="home">
            <WallWindow left={24} top={16} w={70} h={48} />
          </Wall>
          <Group z={4}>
            <Desk x={PC.x} y={PC.y} w={100} d={58} tone="wood" />
            <Laptop x={PC.x} y={PC.y} z={44} glow={stop === "home" && sending} />
            <Person x={PC.x - 4} y={PC.y + 70} pose="sit" shirt="#3f9a73" />
            <Box x={ROUTER.x - 20} y={ROUTER.y - 14} w={40} d={28} h={26} color="#b08968" />
            <WifiRouter x={ROUTER.x} y={ROUTER.y} z={26} />
            <Plant x={36} y={390} size={0.85} />
          </Group>

          {/* ---------- 公衆回線と、道ばたの通信設備 ---------- */}
          <Floor x={260} y={150} w={250} d={140} h={3} z={4} material="concrete" />
          <Group z={4}>
            <Box x={TAP.x - 18} y={TAP.y + 16} w={36} d={22} h={42} color="#9aa3af" />
            <Person x={EVE.x} y={EVE.y} pose="attacker" active={intercepted} />
            <Laptop x={EVE.x + 40} y={EVE.y - 14} z={0} w={44} tone="dark" rot={200} />
          </Group>
          <FloorRoute points={LINE} width={10} z={4.8} tone={lineTone} active={sending} />
          {/* 盗聴者が回線につないだ線 */}
          <FloorRoute
            points={[{ x: TAP.x, y: TAP.y + 8, z: G }, { x: EVE.x - 6, y: EVE.y - 20, z: G }]}
            width={3}
            z={4.8}
            tone={intercepted ? "danger" : "idle"}
          />

          {/* ---------- 会社のオフィス ---------- */}
          <Floor x={560} y={20} w={240} d={260} h={5} z={4} material="carpet" />
          <Wall x={560} y={20} length={240} h={120} tone="office">
            <WallWindow left={120} top={18} w={90} h={52} />
          </Wall>
          <Group z={4}>
            <Group data={{ "data-illustration": "office" }}>
              <Appliance x={GW.x} y={GW.y} kind="vpn" stand={30} w={46} rot={90} state={stop === "office" ? "active" : "idle"} />
            </Group>
            <Desk x={700} y={110} w={110} d={56} />
            <Monitor x={680} y={104} w={50} />
            <Monitor x={730} y={104} w={50} />
            <Desk x={700} y={220} w={110} d={56} />
            <Monitor x={690} y={214} w={50} glow={stop === "office"} />
            <Person x={690} y={272} pose="sit" shirt="#6b7fd6" size={0.9} />
          </Group>

          {/* ---------- VPN の暗号トンネル ---------- */}
          {vpn && (
            <Group testId="vpn-tunnel">
              <GlassTube from={{ x: PC.x + 22, y: PC.y - 26, z: 58 }} to={{ x: 206, y: 262, z: 16 }} r={10} on />
              <GlassTube from={{ x: 206, y: 262, z: 16 }} to={{ x: 400, y: 214, z: 16 }} r={12} on />
              <GlassTube from={{ x: 400, y: 214, z: 16 }} to={{ x: GW.x - 8, y: GW.y + 8, z: 40 }} r={12} on />
            </Group>
          )}

          <DioramaToken id="doc">
            <Parcel tone={capsuleState === "encrypted" ? "secure" : "plain"} mark={capsuleState === "encrypted" ? "lock" : "none"} />
          </DioramaToken>
        </>
      }
      labels={
        <>
          <DioramaLabel token="doc" dz={16} place={stop === "home" ? "right" : "above"}>
            <DataTag
              tag={capsuleState === "encrypted" ? "VPNで暗号化" : capsuleState === "decrypted" ? "会社で復号" : "平文"}
              body={capsuleState === "encrypted" ? "9F2C 7A1E…" : "会議資料.pdf"}
              tone={capsuleState === "encrypted" ? "secure" : capsuleState === "decrypted" ? "ok" : "plain"}
              label={capsuleState === "encrypted" ? "暗号化された会議資料" : "会議資料.pdf"}
            />
          </DioramaLabel>

          {intercepted && (
            <DioramaLabel at={{ ...EVE, z: 120 }} place="above">
              <div role="status" data-testid="vpn-eve-screen">
                <Callout
                  tone={vpn ? "muted" : "danger"}
                  title="😈 盗聴者の画面"
                  body={vpn ? "9F2C 7A1E 04B8…" : "会議資料.pdf／パスワード"}
                  verdict={vpn ? "トンネルの中は読めない" : "丸見え"}
                />
              </div>
            </DioramaLabel>
          )}

          {vpn && (
            <DioramaLabel at={{ x: 300, y: 230, z: 30 }} place="above" optional>
              <span data-testid="vpn-badge">
                <Badge tone="ok">🔒 VPNトンネル</Badge>
              </span>
            </DioramaLabel>
          )}

          <DioramaLabel at={{ x: PC.x, y: PC.y + 86, z: 0 }} place="below" optional>
            <NameChip name="自宅" sub="リモートワーク" tone="info" />
          </DioramaLabel>
          <DioramaLabel at={{ x: 680, y: 30, z: 120 }} place="above" optional>
            <NameChip name="会社" sub="社内ネットワーク" tone="info" />
          </DioramaLabel>
          <DioramaLabel at={{ x: 330, y: 170, z: 0 }} place="above" optional>
            <NameChip name="インターネット" sub="公衆回線" tone="muted" />
          </DioramaLabel>
        </>
      }
    />
  );
}
