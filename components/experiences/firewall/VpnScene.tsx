import { CipherCapsule, type CapsuleState } from "../crypto/CipherCapsule";
import { EavesdropperIllustration } from "../crypto/CryptoPeopleIllustration";
import httpsStyles from "../https/https.module.css";
import {
  NetworkSceneBase,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  isoBox,
  isoLocal,
  leftFaceTransform,
  points,
  rightFaceTransform,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import cryptoStyles from "../crypto/crypto.module.css";
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, SceneRail, along, laneBetween, nudge } from "../scene/IsoParts";
import styles from "./firewall.module.css";

// 自宅（左手前）→ インターネット（公衆回線・中央の雲）→ 会社（右奥）。
// VPN をつなぐと、公衆回線の上に暗号トンネルが「伸びて」できあがり、
// 中を通るデータは盗聴者から読めなくなる。

export type VpnStop = "home" | "mid" | "office";

const AT = {
  home: { x: -44, y: 66 },
  office: { x: 66, y: -44 },
  eve: { x: -60, y: -60 },
} satisfies Record<string, WorldPoint>;

const ROUTE = laneBetween(AT.home, AT.office);
const CLOUD_AT = iso({ ...along(ROUTE, 0.5), z: 40 });
const CAPSULE_AT: Record<VpnStop, ScreenPoint> = {
  home: iso(along(ROUTE, 0.1, 10)),
  mid: iso(along(ROUTE, 0.5, 10)),
  office: iso(along(ROUTE, 0.9, 10)),
};

function HouseIllustration() {
  const body = isoBox({ x0: -13, x1: 13, y0: -11, y1: 11, z0: 0, z1: 18 });
  const roofFront = points([isoLocal(-15, 0, 31), isoLocal(15, 0, 31), isoLocal(15, 13, 17), isoLocal(-15, 13, 17)]);
  const gable = points([isoLocal(13, -11, 18), isoLocal(13, 11, 18), isoLocal(13, 0, 30)]);
  return (
    <g data-illustration="home">
      <polygon points={body.left} fill="#FFF7ED" />
      <polygon points={body.right} fill="#FED7AA" />
      <polygon points={gable} fill="#FDBA74" />
      <polygon points={roofFront} fill="#EA580C" stroke="#C2410C" strokeWidth={0.6} />
      <g transform={leftFaceTransform(-13, 11, 18)}>
        <rect x={5} y={6} width={6} height={12} rx={1} fill="#9A3412" />
        <rect x={15} y={5} width={7} height={6} rx={1} fill="#BFDBFE" stroke="#FFFFFF" strokeWidth={0.8} />
      </g>
    </g>
  );
}

function OfficeIllustration({ state }: { state: NodeState }) {
  const box = isoBox({ x0: -13, x1: 13, y0: -13, y1: 13, z0: 0, z1: 56 });
  const rows = [6, 15, 24, 33, 42];
  return (
    <g data-illustration="office">
      <polygon points={box.left} fill="#F1F5F9" />
      <polygon points={box.right} fill="#D8E0EA" />
      <polygon points={box.top} fill="#FFFFFF" stroke="#CBD4E2" strokeWidth={0.8} />
      <g transform={leftFaceTransform(-13, 13, 56)}>
        {rows.map((y) =>
          [4, 11, 18].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width={5} height={5} rx={0.8} fill="#BFD3F2" />),
        )}
        <rect x={9} y={48} width={8} height={8} rx={0.8} fill="#64748B" />
      </g>
      <g transform={rightFaceTransform(13, 13, 56)}>
        {rows.map((y) =>
          [4, 11, 18].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width={5} height={5} rx={0.8} fill="#A9BEDF" />),
        )}
      </g>
      <circle cx={isoLocal(13, 0, 52).x} cy={isoLocal(13, 0, 52).y} r={1.4} className={netStyles[`led_${state}`]} />
    </g>
  );
}

export type VpnSceneProps = {
  vpn: boolean;
  stop: VpnStop;
  sending: boolean;
  reducedMotion: boolean;
};

export function VpnScene({ vpn, stop, sending, reducedMotion }: VpnSceneProps) {
  const a = iso(ROUTE.from);
  const b = iso(ROUTE.to);
  const eve = iso(AT.eve);
  const tap = iso(along(ROUTE, 0.5));
  const intercepted = stop !== "home";
  const capsuleState: CapsuleState = !vpn ? "plain" : stop === "office" ? "decrypted" : stop === "mid" ? "encrypted" : "plain";
  const eveNodeState: NodeState = intercepted ? "error" : "idle";

  return (
    <div
      className={`${netStyles.scene} ${cryptoStyles.scene} ${httpsStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-mode={vpn ? "https" : "http"}
      data-testid="vpn-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label={
          vpn
            ? "自宅から会社まで、インターネットの上に暗号トンネルが通っている。奥で盗聴者が回線をのぞいている"
            : "自宅から会社まで、インターネットの公衆回線がむき出しでつながっている。奥で盗聴者が回線をのぞいている"
        }
      >
        <SceneDefs />
        <NetworkSceneBase
          pads={[
            { id: "home", at: AT.home, state: stop === "home" && sending ? "active" : "idle" },
            { id: "office", at: AT.office, state: stop === "office" ? "active" : "idle" },
          ]}
        />
        <SceneNode id="eve" at={AT.eve} state={eveNodeState} shadow={10}>
          <EavesdropperIllustration state={eveNodeState} />
        </SceneNode>
        <line
          x1={eve.x}
          y1={eve.y - 6}
          x2={tap.x}
          y2={tap.y}
          className={httpsStyles.tapLine}
          data-active={intercepted ? "true" : "false"}
        />
        <SceneRail lane={ROUTE} id="public" state={sending ? "active" : "idle"} color={vpn ? "#16A37A" : "#E11D48"} chevrons={[0.3, 0.7]} />

        {/* 暗号トンネル：ON にした瞬間に自宅側から会社へ向かって伸びる */}
        {vpn && (
          <g data-testid="vpn-tunnel">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} pathLength={1} className={styles.vpnTube} />
            <line x1={a.x} y1={a.y - 5} x2={b.x} y2={b.y - 5} pathLength={1} className={styles.vpnShine} />
            <circle cx={a.x} cy={a.y} r={4} className={styles.vpnPort} />
            <circle cx={b.x} cy={b.y} r={4} className={styles.vpnPort} />
          </g>
        )}

        {/* インターネット（公衆回線）の雲 */}
        <g transform={`translate(${CLOUD_AT.x} ${CLOUD_AT.y})`}>
          <ellipse cx={0} cy={30} rx={20} ry={5} fill="#1E2A40" opacity={0.06} />
          <path
            d="M -24 4 Q -26 -6 -15 -7 Q -12 -17 0 -15 Q 10 -21 17 -11 Q 27 -10 25 0 Q 27 8 17 8 L -16 8 Q -26 9 -24 4 Z"
            fill="#EEF4FF"
            stroke="#C3D2EC"
            strokeWidth={1}
            transform="scale(1.35)"
          />
        </g>

        <SceneNode id="office" at={AT.office} state={stop === "office" ? "active" : "idle"}>
          <OfficeIllustration state={stop === "office" ? "active" : "idle"} />
        </SceneNode>
        <SceneNode id="home" at={AT.home} state="idle" scale={1.1}>
          <HouseIllustration />
        </SceneNode>
      </svg>

      <span className={styles.cloudLabel} style={toPercent(nudge(CLOUD_AT, 0, -4))}>
        インターネット
        <br />
        （公衆回線）
      </span>
      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(AT.home), 0, 24))}>
        <span className="font-bold text-gray-900">自宅</span>
        <span className={netStyles.nodeLabelSub}>リモートワーク</span>
      </div>
      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(AT.office), 0, 24))}>
        <span className="font-bold text-gray-900">会社</span>
        <span className={netStyles.nodeLabelSub}>社内ネットワーク</span>
      </div>
      {vpn && (
        <span className={styles.vpnBadge} style={toPercent(nudge(iso(along(ROUTE, 0.3)), 12, 16))} data-testid="vpn-badge">
          🔒 VPNトンネル
        </span>
      )}

      {intercepted && (
        <div className={httpsStyles.eveScreen} data-mode={vpn ? "https" : "http"} role="status" data-testid="vpn-eve-screen">
          <span className={httpsStyles.eveScreenTitle}>盗聴者の画面</span>
          <span className={httpsStyles.eveScreenBody}>{vpn ? "9F2C 7A1E 04B8…" : "会議資料.pdf／パスワード"}</span>
          <span className={httpsStyles.eveScreenVerdict}>{vpn ? "トンネルの中は読めない" : "丸見え"}</span>
        </div>
      )}

      <CipherCapsule
        state={capsuleState}
        at={toPercent(CAPSULE_AT[stop])}
        tag={capsuleState === "encrypted" ? "VPNで暗号化" : capsuleState === "decrypted" ? "会社で復号" : "平文"}
        body={capsuleState === "encrypted" ? "9F2C 7A1E…" : "会議資料.pdf"}
        label={capsuleState === "encrypted" ? "暗号化された会議資料" : "会議資料.pdf"}
      />
    </div>
  );
}
