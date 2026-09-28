"use client";

import { Box, type Camera, type Vec3 } from "../scene/Diorama3D";
import {
  Building,
  Desk,
  Floor,
  FloorRoute,
  Group,
  KeyGlyph,
  Monitor,
  Paper,
  Person,
  Tree,
  type RouteTone,
} from "../scene/DioramaParts";
import { Badge, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import { CA_STATIONS, type CaFlowView, type CaStation } from "./signatureTypes";
import styles from "./ca.module.css";
import cryptoStyles from "../crypto/cryptodiorama.module.css";

// 認証局（CA）の図解：山田さんのオフィス → 認証局の窓口 → 電子証明書の発行台 → 利用者（あなた）のPC。
// 公開鍵を持って窓口へ行き、CA が本人確認をしてから、公開鍵に「CA印の電子証明書」を付けて発行する。
// 偽者が申請すると窓口の本人確認で止まり、利用者の手元には証明書つきの鍵が届かない。

const AT: Record<CaStation, Vec3> = {
  owner: { x: 120, y: 318, z: 0 },
  ca: { x: 330, y: 230, z: 0 },
  cert: { x: 520, y: 244, z: 0 },
  user: { x: 690, y: 200, z: 0 },
};
/** 鍵が置かれる場所（机の上・窓口のカウンター・発行台・利用者の机） */
const TOKEN_AT: Record<CaStation, Vec3> = {
  owner: { x: AT.owner.x + 36, y: AT.owner.y + 10, z: 60 },
  ca: { x: AT.ca.x, y: AT.ca.y + 28, z: 62 },
  cert: { x: AT.cert.x, y: AT.cert.y + 6, z: 64 },
  user: { x: AT.user.x - 36, y: AT.user.y + 12, z: 60 },
};
const G = 3;
const ROAD: Vec3[] = [
  { x: 166, y: 300, z: G },
  { x: 250, y: 276, z: G },
  { x: 330, y: 272, z: G },
  { x: 430, y: 270, z: G },
  { x: 520, y: 268, z: G },
  { x: 610, y: 242, z: G },
  { x: 650, y: 232, z: G },
];
const ROAD_AT: Record<CaStation, number> = { owner: 0, ca: 2, cert: 4, user: 6 };

function pathTo(at: CaStation): Vec3[] {
  const i = ROAD_AT[at];
  return [...ROAD.slice(0, i + 1).map((p) => ({ ...p, z: 20 })), TOKEN_AT[at]];
}

const SHOTS: Record<CaStation, Camera> = {
  owner: { yaw: -16, pitch: 52, zoom: 1.15, fx: 200, fy: 300, fz: 50 },
  ca: { yaw: -18, pitch: 50, zoom: 1.1, fx: 320, fy: 250, fz: 60 },
  cert: { yaw: -20, pitch: 52, zoom: 1.05, fx: 470, fy: 250, fz: 50 },
  user: { yaw: -20, pitch: 54, zoom: 0.86, fx: 430, fy: 250, fz: 40 },
};

export function CaDioramaScene({ view, reducedMotion, forward = true }: { view: CaFlowView; reducedMotion: boolean; forward?: boolean }) {
  const fake = view.applicant === "fake";
  const rejectedAtCa = view.check === "reject";
  const reached = CA_STATIONS.indexOf(view.at);
  const roadTone: RouteTone = rejectedAtCa ? "blocked" : view.certified ? "response" : "request";

  return (
    <DioramaStage
      testId="ca-flow"
      ariaLabel="左手前に山田さんのオフィス、中央に認証局（CA）の建物と窓口、右に電子証明書の発行台、右奥に利用者のPC。公開鍵が窓口で本人確認を受け、CA印の電子証明書を付けて利用者へ届く"
      shot={SHOTS[view.at]}
      shotKey={`${view.at}-${view.applicant}-${view.check ?? ""}-${view.userVerdict ?? ""}`}
      forward={forward}
      reducedMotion={reducedMotion}
      dataAttrs={{ "data-applicant": view.applicant }}
      tokens={{ key: { at: TOKEN_AT[view.at], path: pathTo(view.at).slice(ROAD_AT[CA_STATIONS[Math.max(0, reached - 1)]]) } }}
      world={
        <>
          <Floor x={0} y={100} w={800} d={320} h={16} material="plain" />
          <Floor x={10} y={116} w={780} d={296} h={3} z={0} material="paving" />

          {/* ---------- 山田さん（または偽者）のオフィスの机 ---------- */}
          <Group z={3} data={{ "data-station": "owner", "data-active": view.active.includes("owner") ? "true" : "false" }}>
            <Desk x={AT.owner.x} y={AT.owner.y} w={110} d={58} />
            <Monitor x={AT.owner.x - 12} y={AT.owner.y - 6} w={50} />
            <Person x={AT.owner.x - 12} y={AT.owner.y + 64} pose={fake ? "attacker" : "sit"} shirt="#4f86e8" />
            <Tree x={40} y={200} size={0.9} />
          </Group>

          {/* ---------- 認証局（CA）：建物と本人確認の窓口 ---------- */}
          <Group z={3} data={{ "data-station": "ca", "data-active": view.active.includes("ca") ? "true" : "false", "data-rejected": rejectedAtCa ? "true" : "false" }}>
            <Building x={AT.ca.x} y={AT.ca.y - 76} w={170} d={90} h={120} kind="bank" state={rejectedAtCa ? "error" : view.active.includes("ca") ? "active" : "idle"} />
            <Desk x={AT.ca.x} y={AT.ca.y + 20} w={120} d={40} h={44} tone="counter" />
            <Person x={AT.ca.x + 30} y={AT.ca.y - 12} pose="stand" shirt="#1e3a8a" />
            {/* 本人確認の印鑑 */}
            <Box x={AT.ca.x - 44} y={AT.ca.y + 20} z={44} w={10} d={10} h={14} color={rejectedAtCa ? "#e11d48" : "#b91c1c"} />
          </Group>

          {/* ---------- 電子証明書の発行台 ---------- */}
          <Group z={3} data={{ "data-station": "cert", "data-active": view.active.includes("cert") ? "true" : "false" }}>
            <Box x={AT.cert.x - 26} y={AT.cert.y - 14} w={52} d={30} h={50} color="#cfd6e0" />
            <Box x={AT.cert.x - 30} y={AT.cert.y - 18} z={50} w={60} d={38} h={4} color="#eef1f5" />
          </Group>

          {/* ---------- 利用者（あなた）の机 ---------- */}
          <Group z={3} data={{ "data-station": "user", "data-active": view.active.includes("user") ? "true" : "false", "data-rejected": view.userVerdict === "reject" ? "true" : "false" }}>
            <Desk x={AT.user.x} y={AT.user.y} w={110} d={58} />
            <Monitor x={AT.user.x + 10} y={AT.user.y - 6} w={50} glow={view.userVerdict === "trust"} />
            <Person x={AT.user.x + 10} y={AT.user.y + 64} pose="sit" shirt="#6b7fd6" />
          </Group>

          <FloorRoute points={ROAD} width={10} z={3.8} tone={roadTone} active={view.active.length > 0 && !rejectedAtCa} />

          <DioramaToken id="key">
            <KeyGlyph kind="public" size={1.1} />
            {view.certified && (
              <div style={{ position: "absolute", transformStyle: "preserve-3d", transform: "translate3d(0px, 6px, -14px)" }}>
                <Paper stamp="info" />
              </div>
            )}
          </DioramaToken>
        </>
      }
      labels={
        <>
          <DioramaLabel token="key" dz={14} place="above">
            <div
              className={cryptoStyles.keyLabel}
              data-at={view.at}
              data-certified={view.certified ? "true" : "false"}
              data-testid="ca-token"
              role="img"
              aria-label={`${fake ? "偽者が「山田さんの公開鍵」と称する鍵" : "山田さんの公開鍵"}${view.certified ? "（CAの電子証明書つき）" : ""}`}
            >
              <span className={styles.tokenText}>
                <span>{view.certified ? "山田の公開鍵" : "山田の公開鍵？"}</span>
                {view.certified && <span className={styles.caSeal}>CA印</span>}
              </span>
            </div>
          </DioramaLabel>

          {view.check && (
            <DioramaLabel at={{ ...AT.ca, y: AT.ca.y + 20, z: 70 }} place="right">
              <span data-testid="ca-check">
                <Badge tone={view.check === "pass" ? "ok" : "danger"}>{view.check === "pass" ? "本人確認 ✓" : "本人確認 ✗"}</Badge>
              </span>
            </DioramaLabel>
          )}
          {view.userVerdict && (
            <DioramaLabel at={{ ...AT.user, z: 100 }} place="above">
              <span data-testid="ca-user-verdict">
                <Badge tone={view.userVerdict === "trust" ? "ok" : "danger"}>{view.userVerdict === "trust" ? "本物と確認 ✓" : "信用しない ✗"}</Badge>
              </span>
            </DioramaLabel>
          )}

          <DioramaLabel at={{ ...AT.owner, y: AT.owner.y + 80 }} place="below" optional>
            <NameChip name={fake ? "偽者" : "本人（山田さん）"} sub="公開鍵を申請" tone={fake ? "danger" : "info"} />
          </DioramaLabel>
          <DioramaLabel at={{ ...AT.ca, y: AT.ca.y - 76, z: 124 }} place="above" optional>
            <NameChip name="認証局(CA)" sub="本人確認して証明" tone="info" />
          </DioramaLabel>
          <DioramaLabel at={{ ...AT.cert, y: AT.cert.y + 20, z: 0 }} place="below" optional>
            <NameChip name="電子証明書" sub="CA印つきの公開鍵" tone="muted" />
          </DioramaLabel>
          <DioramaLabel at={{ ...AT.user, y: AT.user.y + 80 }} place="below" optional>
            <NameChip name="利用者（あなた）" tone="info" />
          </DioramaLabel>
        </>
      }
    />
  );
}
