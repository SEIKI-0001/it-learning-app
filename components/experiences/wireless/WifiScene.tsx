import type { CSSProperties } from "react";
import { DeskPersonIllustration, EavesdropperIllustration } from "../crypto/CryptoPeopleIllustration";
import {
  IsoEllipse,
  NetworkSceneBase,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  isoBox,
  isoLocal,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, nudge } from "../scene/IsoParts";
import stage from "../scene/stage.module.css";
import styles from "./wireless.module.css";

// カフェの 2.5D 模型：手前左にノートPCの利用者、右奥に Wi-Fi アクセスポイント（AP）、左奥に盗聴者。
// ノートPCが送ったデータは「電波の輪」として床いっぱいに広がる＝APだけでなく盗聴者にも届く。
//   暗号化なし … 盗聴者の手元に ID / PASSWORD がそのまま
//   WPA2/WPA3 … 盗聴者も受信はできるが、中身は暗号文で読めない
//   有線（比較）… データはケーブルの上だけを通り、盗聴者には何も届かない

export type WifiMode = "open" | "wpa" | "wired";
export type WifiPhase = "connect" | "send" | "arrive";

const AT = {
  user: { x: -40, y: 72 },
  ap: { x: 72, y: -40 },
  eve: { x: -62, y: -62 },
} satisfies Record<string, WorldPoint>;

const SECRET = "ID: tanaka / PASS: spring123";
const CIPHER = "8f#2a@Qx…X9q&";

const lerp = (a: ScreenPoint, b: ScreenPoint, t: number): ScreenPoint => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

const LAPTOP = nudge(iso(AT.user), 4, -40);
const AP_TOP = nudge(iso(AT.ap), 0, -34);
const EVE_HAND = nudge(iso(AT.eve), 40, -22);

const router = isoBox({ x0: -10, x1: 10, y0: -8, y1: 8, z0: 0, z1: 7 });

function AccessPointIllustration({ state }: { state: NodeState }) {
  const a1 = isoLocal(-6, -6, 7);
  const a2 = isoLocal(6, -6, 7);
  const led = isoLocal(10, 0, 3.5);
  return (
    <g data-illustration="access-point">
      <polygon points={router.left} fill="#CBD5E3" />
      <polygon points={router.right} fill="#B4C1D3" />
      <polygon points={router.top} fill="#EEF2F8" stroke="#C3CEDD" strokeWidth={0.6} />
      <line x1={a1.x} y1={a1.y} x2={a1.x - 1} y2={a1.y - 16} stroke="#475569" strokeWidth={1.6} strokeLinecap="round" />
      <line x1={a2.x} y1={a2.y} x2={a2.x + 1} y2={a2.y - 16} stroke="#475569" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={led.x} cy={led.y} r={1.3} className={netStyles[`led_${state}`]} />
    </g>
  );
}

export type WifiSceneProps = {
  mode: WifiMode;
  phase: WifiPhase;
  reducedMotion: boolean;
};

export function WifiScene({ mode, phase, reducedMotion }: WifiSceneProps) {
  const wireless = mode !== "wired";
  const encrypted = mode === "wpa";
  const sending = phase === "send";
  const arrived = phase === "arrive";
  const eveGets = wireless && phase !== "connect";

  const main = phase === "connect" ? LAPTOP : sending ? lerp(LAPTOP, AP_TOP, 0.5) : AP_TOP;
  const copy = phase === "connect" ? LAPTOP : sending ? lerp(LAPTOP, EVE_HAND, 0.5) : EVE_HAND;
  const cableFrom = iso({ x: AT.user.x + 8, y: AT.user.y - 18 });
  const cableBend = iso({ x: AT.user.x + 8, y: AT.ap.y + 10 });
  const cableTo = iso({ x: AT.ap.x - 16, y: AT.ap.y + 10 });

  return (
    <div
      className={`${netStyles.scene} ${stage.stage} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="wifi-scene"
      data-mode={mode}
      data-phase={phase}
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label={
          wireless
            ? "カフェの床。手前にノートPCの利用者、右奥にWi-Fiアクセスポイント、左奥に盗聴者。電波はノートPCから輪になって床全体に広がる"
            : "カフェの床。ノートPCとアクセスポイントがケーブルでつながり、データはケーブルの上だけを通る"
        }
      >
        <SceneDefs />
        <NetworkSceneBase
          pads={[
            { id: "user", at: AT.user, state: phase === "connect" ? "active" : sending ? "sending" : "idle" },
            { id: "ap", at: AT.ap, state: arrived ? "active" : "idle" },
          ]}
        />
        {/* 電波の輪：ノートPCを中心に、床全体へ広がる（APだけを狙って飛ぶわけではない） */}
        {wireless && sending && (
          <g className={styles.waves} data-testid="wifi-waves">
            {[0, 1, 2].map((i) => (
              <IsoEllipse
                key={i}
                center={iso(AT.user)}
                radius={150}
                className={styles.wave}
                style={{ animationDelay: `${i * 500}ms` } as CSSProperties}
              />
            ))}
            {/* reduced-motion 用：広がり切った範囲を静止で示す */}
            <IsoEllipse center={iso(AT.user)} radius={150} className={styles.waveStatic} />
          </g>
        )}
        {!wireless && (
          <polyline
            points={`${cableFrom.x},${cableFrom.y} ${cableBend.x},${cableBend.y} ${cableTo.x},${cableTo.y}`}
            className={styles.cable}
            data-active={sending ? "true" : "false"}
            data-testid="wifi-cable"
          />
        )}
        <SceneNode id="eve" at={AT.eve} state={eveGets ? "error" : "idle"} shadow={10}>
          <EavesdropperIllustration state={eveGets ? "error" : "idle"} />
        </SceneNode>
        <SceneNode id="ap" at={AT.ap} state={arrived ? "active" : "idle"} scale={1.3}>
          <AccessPointIllustration state={arrived ? "active" : "idle"} />
        </SceneNode>
        <SceneNode id="user" at={AT.user} state={phase === "connect" ? "active" : "idle"} scale={1.12}>
          <DeskPersonIllustration who="A" state={sending ? "sending" : "idle"} />
        </SceneNode>
      </svg>

      {/* SSID の看板：電波の「名前」。鍵（暗号化）の有無は別の札 */}
      <div className={styles.ssid} style={toPercent(nudge(iso(AT.ap), 0, -70))} data-testid="wifi-ssid">
        <span className={styles.ssidName}>📶 cafe-wifi-2F</span>
        <span className={styles.ssidLock} data-locked={encrypted ? "true" : "false"}>
          {mode === "wired" ? "🔌 有線" : encrypted ? "🔒 WPA2/WPA3" : "🔓 暗号化なし"}
        </span>
      </div>

      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(AT.user), 0, 26))}>
        <span className="font-bold text-gray-900">利用者</span>
        <span className={netStyles.nodeLabelSub}>ノートPC</span>
      </div>
      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(AT.ap), 0, 22))}>
        <span className="font-bold text-gray-900">アクセスポイント</span>
        <span className={netStyles.nodeLabelSub}>Wi-Fiの親機</span>
      </div>
      <div className={`${netStyles.nodeLabel} ${styles.eveLabel}`} style={toPercent(nudge(iso(AT.eve), -30, -10))}>
        <span className="font-bold text-gray-900">盗聴者</span>
      </div>

      {/* 本物の宛先へ向かうデータ */}
      <span
        className={`${stage.at} ${styles.packet}`}
        style={toPercent(main)}
        data-sealed={encrypted ? "true" : "false"}
        data-hidden={phase === "connect" ? "true" : "false"}
        data-testid="wifi-packet"
        role="img"
        aria-label={encrypted ? "暗号化されたデータ" : `暗号化されていないデータ：${SECRET}`}
      >
        {encrypted ? "🔒 暗号文" : "ID / PASS"}
      </span>
      {/* 同じ電波を盗聴者も受け取る（無線のときだけ） */}
      {wireless && (
        <span
          className={`${stage.at} ${styles.packet} ${styles.packetCopy}`}
          style={toPercent(copy)}
          data-sealed={encrypted ? "true" : "false"}
          data-hidden={phase === "connect" ? "true" : "false"}
          data-testid="wifi-packet-copy"
        >
          {encrypted ? "🔒 暗号文" : "ID / PASS"}
        </span>
      )}

      {arrived && (
        <div className={`${styles.apCallout} ${stage.pop}`} style={toPercent(nudge(iso(AT.ap), 0, -96))} data-testid="wifi-ap-result" role="status">
          ✓ 受信{encrypted ? "・正しい鍵で復号" : ""}
        </div>
      )}

      {/* 盗聴者の手元 */}
      {arrived && (
        <div className={styles.eveScreen} data-testid="wifi-eve" data-reads={wireless && !encrypted ? "true" : "false"} data-gets={wireless ? "true" : "false"} role="status">
          <span className={styles.eveScreenTitle}>😈 盗聴者の画面</span>
          {!wireless ? (
            <span className={styles.eveNothing}>何も届かない（電波が出ていない）</span>
          ) : encrypted ? (
            <>
              <span className={styles.eveCipher}>{CIPHER}</span>
              <span className={styles.eveNote}>受信できた…でも読めない</span>
            </>
          ) : (
            <>
              <span className={styles.eveSecret}>
                ID: tanaka
                <br />
                PASS: spring123
              </span>
              <span className={styles.eveNote}>そのまま読めてしまう！</span>
            </>
          )}
        </div>
      )}
      {sending && wireless && <span className={styles.waveNote} style={toPercent(nudge(iso(AT.user), 58, -2))}>電波は周り全部へ</span>}
      {sending && !wireless && <span className={styles.waveNote} style={toPercent(nudge(iso(AT.user), 58, -2))}>ケーブルの中だけ</span>}
      {phase === "connect" && <span className={styles.packetHint} style={toPercent(nudge(LAPTOP, 44, -8))}>ID / PASS を入力中…</span>}
    </div>
  );
}
