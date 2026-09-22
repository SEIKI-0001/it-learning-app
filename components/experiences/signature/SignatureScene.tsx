import type { CSSProperties } from "react";
import { DeskPersonIllustration, EavesdropperIllustration } from "../crypto/CryptoPeopleIllustration";
import { KeyGlyph, KeyTag, type KeyKind } from "../crypto/KeyToken";
import cryptoStyles from "../crypto/crypto.module.css";
import {
  NetworkSceneBase,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  iso,
  toPercent,
  type NodeState,
  type ScreenPoint,
  type WorldPoint,
} from "../network/NetworkSceneBase";
import netStyles from "../network/network.module.css";
import { SceneDefs, SceneNode, SceneRail, along, laneBetween, nudge } from "../scene/IsoParts";
import styles from "./signature.module.css";

// 送信者（左手前）→ 通信路 → 受信者（右奥）。通信路の真ん中の奥に「書き換え犯」が立つ。
// 動くのは「文書＋署名」を1つに束ねた封筒。文書から作った指紋（ハッシュ値）を
// 送信者の秘密鍵で封じたものが署名で、受信者は送信者の公開鍵で開いて照合する。

export type SigNodeId = "sender" | "receiver" | "attacker";
export type EnvelopeStop = "sender" | "mid" | "receiver";

const AT: Record<SigNodeId, WorldPoint> = {
  sender: { x: -40, y: 72 },
  receiver: { x: 72, y: -40 },
  attacker: { x: -34, y: -34 },
};

const LANE = laneBetween(AT.sender, AT.receiver);
const ENV_Z = 16;

const ENVELOPE_AT: Record<EnvelopeStop, ScreenPoint> = {
  sender: nudge(iso(AT.sender), 30, -90),
  mid: iso(along(LANE, 0.5, ENV_Z)),
  receiver: nudge(iso(AT.receiver), -30, -90),
};

// 鍵は上端の「持ち主の棚」に置き、使うときだけ封筒の横へ降りてくる
const KEY_AT = {
  senderHome: { x: 50, y: 22 },
  senderSign: { x: 192, y: 58 },
  receiverHome: { x: 270, y: 22 },
  receiverVerify: { x: 120, y: 64 },
} as const;
export type SigKeySpot = keyof typeof KEY_AT;

function KeyChip({ kind, spot, label, caption, emphasis, forged }: { kind: KeyKind; spot: SigKeySpot; label: string; caption: string; emphasis: boolean; forged?: boolean }) {
  return (
    <div
      className={`${cryptoStyles.keyAnchor} ${styles.keyChip}`}
      style={toPercent(KEY_AT[spot])}
      data-key={kind}
      data-spot={spot}
      data-emphasis={emphasis ? "true" : "false"}
      data-forged={forged ? "true" : "false"}
      role="img"
      aria-label={label}
    >
      <span aria-hidden className={cryptoStyles.keyShadow} />
      <span className={cryptoStyles.keyBody}>
        <KeyGlyph kind={kind} owner={forged ? "X" : "Y"} />
        <KeyTag kind={kind} />
      </span>
      <span className={cryptoStyles.keyCaption}>{caption}</span>
    </div>
  );
}

export type Envelope = {
  stop: EnvelopeStop;
  text: string;
  tampered: boolean;
  /** 署名がまだ付いていない（作成直後） */
  signed: boolean;
  /** 署名に封じた指紋 */
  sealHash: string;
  forged: boolean;
};

export type Verify = {
  sigHash: string;
  docHash: string;
  verdict: "ok" | "tamper" | "fake";
} | null;

export type SignatureSceneProps = {
  nodes: Record<SigNodeId, NodeState>;
  laneActive: boolean;
  senderName: string;
  forgedSender: boolean;
  envelope: Envelope;
  /** 送信者が文書から計算した指紋（作成時） */
  senderHash: string | null;
  privateKey: SigKeySpot;
  publicKey: SigKeySpot;
  verify: Verify;
  reducedMotion: boolean;
};

const VERDICT: Record<"ok" | "tamper" | "fake", { stamp: string; sub: string }> = {
  ok: { stamp: "VERIFY OK", sub: "本人・改ざんなし" },
  tamper: { stamp: "改ざん検出", sub: "文書が変わっている" },
  fake: { stamp: "なりすまし検出", sub: "本人の鍵の署名ではない" },
};

export function SignatureScene({
  nodes,
  laneActive,
  senderName,
  forgedSender,
  envelope,
  senderHash,
  privateKey,
  publicKey,
  verify,
  reducedMotion,
}: SignatureSceneProps) {
  const attackerAt = iso(AT.attacker);
  const mid = iso(along(LANE, 0.5, 0));
  return (
    <div
      className={`${netStyles.scene} ${cryptoStyles.scene} ${styles.scene}`}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-testid="signature-scene"
    >
      <svg
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        aria-label="左手前に送信者、右奥に受信者（あなた）がデスクで向かい合い、通信路で結ばれている。通信路の奥に書き換えを狙う第三者が立つ"
      >
        <SceneDefs />
        <NetworkSceneBase
          pads={(["sender", "receiver"] as const).map((id) => ({ id, at: AT[id], state: nodes[id] }))}
        />
        <SceneNode id="attacker" at={AT.attacker} state={nodes.attacker} shadow={10}>
          <EavesdropperIllustration state={nodes.attacker} />
        </SceneNode>
        <line
          x1={attackerAt.x}
          y1={attackerAt.y - 6}
          x2={mid.x}
          y2={mid.y}
          className={cryptoStyles.tapLine}
          data-active={nodes.attacker === "error" ? "true" : "false"}
        />
        <SceneRail lane={LANE} id="channel" state={laneActive ? "active" : "idle"} color="#4F46E5" chevrons={[0.3, 0.7]} />
        <SceneNode id="sender" at={AT.sender} state={nodes.sender} scale={1.12}>
          <DeskPersonIllustration who="A" state={nodes.sender} />
        </SceneNode>
        <SceneNode id="receiver" at={AT.receiver} state={nodes.receiver} scale={1.12}>
          <DeskPersonIllustration who="B" state={nodes.receiver} />
        </SceneNode>
      </svg>

      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(AT.sender), 0, 26))} data-node-label="sender" data-forged={forgedSender ? "true" : "false"}>
        <span className={`font-bold ${forgedSender ? "text-rose-700" : "text-gray-900"}`}>{senderName}</span>
        <span className={netStyles.nodeLabelSub}>送信者</span>
      </div>
      <div className={netStyles.nodeLabel} style={toPercent(nudge(iso(AT.receiver), 0, 26))} data-node-label="receiver">
        <span className="font-bold text-gray-900">あなた</span>
        <span className={netStyles.nodeLabelSub}>受信者</span>
      </div>
      {nodes.attacker === "error" && (
        <div className={`${netStyles.nodeLabel} ${styles.attackerLabel}`} style={toPercent(nudge(attackerAt, -14, -30))} data-node-label="attacker" data-state={nodes.attacker}>
          <span className="font-bold text-rose-700">第三者</span>
          <span className={netStyles.nodeLabelSub}>文書を書き換え</span>
        </div>
      )}

      <KeyChip
        kind="private"
        spot={privateKey}
        label={forgedSender ? "偽者の秘密鍵" : "山田さんの秘密鍵"}
        caption={forgedSender ? "偽者の秘密鍵" : "山田さんの秘密鍵"}
        emphasis={privateKey === "senderSign"}
        forged={forgedSender}
      />
      <KeyChip kind="public" spot={publicKey} label="山田さんの公開鍵" caption="山田さんの公開鍵" emphasis={publicKey === "receiverVerify"} />

      <div
        className={styles.envAnchor}
        style={toPercent(ENVELOPE_AT[envelope.stop])}
        data-stop={envelope.stop}
        data-tampered={envelope.tampered ? "true" : "false"}
        data-signed={envelope.signed ? "true" : "false"}
        data-testid="signed-envelope"
        role="img"
        aria-label={`文書「${envelope.text}」${envelope.signed ? "＋署名" : ""}${envelope.tampered ? "（途中で書き換えられた）" : ""}`}
      >
        <span aria-hidden className={styles.envShadow} />
        <span className={styles.envelope}>
          <span className={styles.docPart}>
            <span className={styles.docTag}>📄 文書</span>
            <span key={envelope.text} className={styles.docText}>
              {envelope.text}
            </span>
            {senderHash && (
              <span className={styles.hashNote} data-testid="sender-hash">
                指紋 {senderHash}
              </span>
            )}
            {envelope.tampered && <span className={styles.tamperMark}>書換</span>}
          </span>
          {envelope.signed && (
            <span className={styles.sealPart} data-forged={envelope.forged ? "true" : "false"}>
              <span className={styles.sealIcon} aria-hidden>
                ✍
              </span>
              <span className="flex flex-col leading-none">
                <span className={styles.sealTag}>署名</span>
                <span className={styles.sealHash}>🔒{envelope.sealHash}</span>
              </span>
            </span>
          )}
        </span>
      </div>

      {verify && (
        <div className={styles.verify} data-verdict={verify.verdict} role="status" data-testid="verify-panel">
          <div className={styles.verifyRow}>
            <span className={styles.hashChip} data-kind="sig">
              <span>署名を公開鍵で開く</span>
              <b>{verify.sigHash}</b>
            </span>
            <span className={styles.verifyEq} aria-label={verify.verdict === "ok" ? "一致" : "不一致"}>
              {verify.verdict === "ok" ? "＝" : "≠"}
            </span>
            <span className={styles.hashChip} data-kind="doc">
              <span>届いた文書から計算</span>
              <b>{verify.docHash}</b>
            </span>
          </div>
          <span className={styles.stamp} style={{ "--stamp": verify.verdict === "ok" ? "#059669" : "#E11D48" } as CSSProperties}>
            {verify.verdict === "ok" ? "✅" : "❌"} {VERDICT[verify.verdict].stamp}
            <span>{VERDICT[verify.verdict].sub}</span>
          </span>
        </div>
      )}
    </div>
  );
}
