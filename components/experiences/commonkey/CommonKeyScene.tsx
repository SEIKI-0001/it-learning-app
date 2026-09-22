import { useId, type CSSProperties } from "react";
import { CipherCapsule, type CapsuleState } from "../crypto/CipherCapsule";
import { DeskPersonIllustration, EavesdropperIllustration } from "../crypto/CryptoPeopleIllustration";
import cryptoStyles from "../crypto/crypto.module.css";
import {
  NetworkSceneBase,
  PAD_RADIUS,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, SceneRail, along, nudge, type Lane } from "../scene/IsoParts";
import styles from "./commonkey.module.css";

// 公開鍵暗号シーン（crypto/CryptoScene）と同じ舞台：A（左手前）・B（右奥）・盗聴者（奥の中央）。
// 違うのは鍵が「同じ形の1本（共通鍵）」だけで、それを2人が持つこと。
//   ① 鍵レーン（奥）: A → B。共通鍵そのものが通る ＝ 途中で盗まれるおそれ（鍵配送問題）
//   ② 暗号文レーン（手前）: A → B。共通鍵で暗号化した暗号文が通る

export type CkNodeId = "a" | "b" | "eve";

const AT: Record<CkNodeId, WorldPoint> = {
  a: { x: -40, y: 72 },
  b: { x: 72, y: -40 },
  eve: { x: -62, y: -62 },
};

function offsetLane(a: WorldPoint, b: WorldPoint, towardFront: number): Lane {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const o = towardFront / Math.SQRT2;
  return {
    from: { x: a.x + ux * PAD_RADIUS + o, y: a.y + uy * PAD_RADIUS + o },
    to: { x: b.x - ux * PAD_RADIUS + o, y: b.y - uy * PAD_RADIUS + o },
  };
}

const LANE = { key: offsetLane(AT.a, AT.b, -13), data: offsetLane(AT.a, AT.b, 13) };
const LANE_COLOR = { key: "#D97706", data: "#4F46E5" };

export type KeySpot = "aHome" | "transit" | "eveGrab" | "bHome" | "eveHome" | "aUse" | "bUse" | "eveUse";

const KEY_AT: Record<KeySpot, ScreenPoint> = {
  aHome: nudge(iso(AT.a), -2, -86),
  transit: iso(along(LANE.key, 0.5, 30)),
  bHome: nudge(iso(AT.b), 2, -86),
  // 盗まれたコピーは通信路から盗聴者の側（左上の棚）へ抜き取られる
  eveGrab: nudge(iso(along(LANE.key, 0.5, 30)), -30, -26),
  eveHome: { x: 54, y: 26 },
  aUse: nudge(iso(along(LANE.data, 0.12, 0)), -22, -26),
  bUse: nudge(iso(along(LANE.data, 0.88, 0)), 22, -26),
  eveUse: { x: 54, y: 26 },
};

export type CapsuleStop = "aDesk" | "mid" | "bDesk";
const CAPSULE_AT: Record<CapsuleStop, ScreenPoint> = {
  aDesk: iso(along(LANE.data, 0.12, 0)),
  mid: iso(along(LANE.data, 0.5, 0)),
  bDesk: iso(along(LANE.data, 0.88, 0)),
};

/** 共通鍵：公開鍵（丸）・秘密鍵（六角）と区別するため、四角い持ち手の金色の鍵。 */
export function CommonKeyGlyph() {
  const id = `ck-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 44 20" className={cryptoStyles.keyGlyph} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="0.55" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <g transform="translate(0 1.6)" fill="#92400E">
        <rect x={1.5} y={2.5} width={15} height={15} rx={3} />
        <rect x={15} y={7.8} width={25} height={4.4} rx={1.2} />
      </g>
      <rect x={15} y={7.8} width={25} height={4.4} rx={1.2} fill={`url(#${id})`} />
      <path d="M 26 12 L 26 16.5 L 29 16.5 L 29 12 M 33 12 L 33 15 L 36 15 L 36 12" fill={`url(#${id})`} stroke={`url(#${id})`} />
      <rect x={1.5} y={2.5} width={15} height={15} rx={3} fill={`url(#${id})`} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={0.8} />
      <rect x={6} y={7} width={6} height={6} rx={1.4} fill="#FFFBEB" />
    </svg>
  );
}

function CommonKeyToken({ spot, owner, emphasis, stolen }: { spot: KeySpot; owner: string; emphasis: boolean; stolen?: boolean }) {
  return (
    <div
      className={`${cryptoStyles.keyAnchor} ${styles.keyAnchor}`}
      style={toPercent(KEY_AT[spot])}
      data-key="common"
      data-owner={owner}
      data-spot={spot}
      data-emphasis={emphasis ? "true" : "false"}
      data-stolen={stolen ? "true" : "false"}
      role="img"
      aria-label={`${owner}が持つ共通鍵`}
    >
      <span aria-hidden className={cryptoStyles.keyShadow} />
      <span className={cryptoStyles.keyBody}>
        <CommonKeyGlyph />
        <span className={styles.keyTag}>COMMON</span>
      </span>
      <span className={cryptoStyles.keyCaption}>{stolen ? "盗まれたコピー" : `${owner}の共通鍵`}</span>
    </div>
  );
}

export type CommonKeySceneProps = {
  nodes: Record<CkNodeId, NodeState>;
  lanes: { key: "idle" | "active" | "done"; data: "idle" | "active" | "done" };
  /** 画面上にある共通鍵（持ち主ごと） */
  keys: { owner: "A" | "B" | "盗聴者"; spot: KeySpot; emphasis?: boolean }[];
  capsule: { stop: CapsuleStop; state: CapsuleState } | null;
  /** 盗聴者がどのレーンを盗み見ているか */
  tap: "key" | "data" | null;
  /** 盗聴者の手元（null=何も取れていない） */
  eve: { key: boolean; reads: string | null; cipher: boolean } | null;
  reducedMotion: boolean;
};

export function CommonKeyScene({ nodes, lanes, keys, capsule, tap, eve, reducedMotion }: CommonKeySceneProps) {
  const eveAt = iso(AT.eve);
  const tapTo = tap ? iso(along(LANE[tap], 0.5, 0)) : iso(along(LANE.data, 0.5, 0));
  return (
    <div
      className={`${netStyles.scene} ${cryptoStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="commonkey-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="左にAさん、右にBさんがデスクで向かい合い、奥の①鍵レーンと手前の②暗号文レーンで結ばれている。奥の中央に盗聴者が立つ"
      >
        <SceneDefs />
        <NetworkSceneBase pads={(["a", "b"] as const).map((id) => ({ id, at: AT[id], state: nodes[id] }))} />
        <SceneNode id="eve" at={AT.eve} state={nodes.eve} shadow={10}>
          <EavesdropperIllustration state={nodes.eve} />
        </SceneNode>
        <line x1={eveAt.x} y1={eveAt.y - 6} x2={tapTo.x} y2={tapTo.y} className={cryptoStyles.tapLine} data-active={tap ? "true" : "false"} data-testid="ck-tap" data-tap={tap ?? "none"} />
        <SceneRail lane={LANE.key} id="key" state={lanes.key === "active" ? "active" : "idle"} color={LANE_COLOR.key} chevrons={[0.4, 0.6]} />
        <SceneRail lane={LANE.data} id="data" state={lanes.data === "active" ? "active" : "idle"} color={LANE_COLOR.data} chevrons={[0.4, 0.6]} />
        <SceneNode id="a" at={AT.a} state={nodes.a} scale={1.12}>
          <DeskPersonIllustration who="A" state={nodes.a} />
        </SceneNode>
        <SceneNode id="b" at={AT.b} state={nodes.b} scale={1.12}>
          <DeskPersonIllustration who="B" state={nodes.b} />
        </SceneNode>
      </svg>

      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(AT.a), 0, 26))}>
        <span className="font-bold text-gray-900">Aさん</span>
        <span className={netStyles.nodeLabelSub}>送信者</span>
      </div>
      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(AT.b), 0, 26))}>
        <span className="font-bold text-gray-900">Bさん</span>
        <span className={netStyles.nodeLabelSub}>受信者</span>
      </div>
      <div className={`${netStyles.nodeLabel} ${netStyles.nodeLabelStart} ${cryptoStyles.eveLabel}`} style={toPercent(nudge(eveAt, -12, -30))}>
        <span className="font-bold text-gray-900">盗聴者</span>
        <span className={netStyles.nodeLabelSub}>通信を盗み見</span>
      </div>

      {(["key", "data"] as const).map((id) => {
        const a = iso(LANE[id].from);
        const b = iso(LANE[id].to);
        const at = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (id === "key" ? -11 : 18) };
        return (
          <span key={id} className={cryptoStyles.railCaption} style={{ ...toPercent(at), "--lane": LANE_COLOR[id] } as CSSProperties} data-state={lanes[id]}>
            {id === "key" ? "① 共通鍵" : "② 暗号文"}
            <span aria-hidden> ▶</span>
          </span>
        );
      })}

      {eve && (
        <div className={`${cryptoStyles.eveCallout} ${styles.eveCallout}`} role="status" data-testid="ck-eve" data-reads={eve.reads ? "true" : "false"}>
          {eve.key && <span className={styles.eveKey}>🔑 鍵のコピー</span>}
          {eve.cipher && <CipherCapsule state={eve.reads ? "decrypted" : "failed"} body={eve.reads ?? undefined} tag={eve.reads ? "盗み読み" : undefined} label="盗聴者が取った暗号文" />}
          {!eve.cipher && eve.key && <span className={styles.eveNote}>このあとの暗号文を待つ…</span>}
        </div>
      )}

      {keys.map((k) => (
        <CommonKeyToken key={k.owner} spot={k.spot} owner={k.owner} emphasis={k.emphasis ?? false} stolen={k.owner === "盗聴者"} />
      ))}

      {capsule && (
        <CipherCapsule
          state={capsule.state}
          at={toPercent(CAPSULE_AT[capsule.stop])}
          label={capsule.state === "encrypted" ? "共通鍵で暗号化されたメッセージ" : capsule.state === "decrypted" ? "復号されたメッセージ：会議は10時" : "平文のメッセージ：会議は10時"}
        />
      )}
    </div>
  );
}
