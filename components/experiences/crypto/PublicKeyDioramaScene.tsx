"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import { KeyGlyph, Parcel } from "../scene/DioramaParts";
import { Badge, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import { CipherCapsule } from "./CipherCapsule";
import type { CryptoSceneProps } from "./CryptoScene";
import { KeyTag } from "./KeyToken";
import { A_DESK, B_DESK, EVE_AT, SPOT, TwoOfficesWorld, laneTo } from "./TwoOfficesWorld";
import styles from "./cryptodiorama.module.css";

// 公開鍵暗号の図解：A社のオフィス（送信者A）⇄ 公衆回線 ⇄ B社のオフィス（受信者B）。回線の途中に第三者。
// ① Bが自分の机で鍵ペアを持つ → 公開鍵（緑）だけが①の車線を通ってAの机へ届く（秘密鍵＝赤は B の机から動かない）
// ② Aが公開鍵で閉じた暗号文が②の車線を通る。第三者はコピーを取れるが、公開鍵では開かず、秘密鍵も持っていない
// ③ Bが秘密鍵で開いて元のメッセージに戻る。

const PUB: Record<CryptoSceneProps["publicKey"], Vec3> = {
  bHome: SPOT.bRight,
  aHome: SPOT.aRight,
  aUse: { ...SPOT.aScreen, x: SPOT.aScreen.x + 24, z: SPOT.aScreen.z + 22 },
};
const PRIV: Record<CryptoSceneProps["privateKey"], Vec3> = {
  bHome: SPOT.bLeft,
  bUse: { ...SPOT.bScreen, x: SPOT.bScreen.x - 24, z: SPOT.bScreen.z + 22 },
};
const MSG_A: Vec3 = { x: A_DESK.x + 2, y: A_DESK.y + 16, z: 60 };
const MSG_B: Vec3 = { x: B_DESK.x + 2, y: B_DESK.y + 16, z: 60 };
const COPY_AT: Vec3 = SPOT.eveHand;
/** 第三者が回線からコピーを抜き取る点（②の車線の中ほど） */
const TAP_AT = laneTo("data", 0.5, 24).at(-1) as Vec3;

const SHOTS: Camera[] = [
  { yaw: -16, pitch: 50, zoom: 1.35, fx: 640, fy: 150, fz: 60 },
  { yaw: -20, pitch: 54, zoom: 0.84, fx: 410, fy: 230, fz: 40 },
  { yaw: -14, pitch: 50, zoom: 1.35, fx: 160, fy: 330, fz: 60 },
  { yaw: -14, pitch: 50, zoom: 1.35, fx: 160, fy: 330, fz: 60 },
  { yaw: -20, pitch: 54, zoom: 0.84, fx: 410, fy: 250, fz: 40 },
  { yaw: -16, pitch: 50, zoom: 1.35, fx: 640, fy: 150, fz: 60 },
];

function shotOf({ publicKey, capsule }: Pick<CryptoSceneProps, "publicKey" | "capsule">) {
  if (!capsule) return publicKey === "bHome" ? 0 : 1;
  if (capsule.state === "plain") return 2;
  if (capsule.state === "encrypted") return capsule.stop === "aDesk" ? 3 : 4;
  return 5;
}

export function PublicKeyDioramaScene({
  nodes,
  lanes,
  publicKey,
  privateKey,
  capsule,
  intercepted,
  reducedMotion,
  forward = true,
}: Omit<CryptoSceneProps, "trail"> & { forward?: boolean }) {
  const shot = shotOf({ publicKey, capsule });
  const msgAt = capsule ? (capsule.stop === "aDesk" ? MSG_A : MSG_B) : null;

  return (
    <DioramaStage
      testId="crypto-scene"
      ariaLabel="手前にA社のオフィスのAさん、奥にB社のオフィスのBさん。2つのオフィスは公衆回線の①公開鍵の車線と②暗号文の車線で結ばれ、回線の途中の通信設備に第三者が立っている"
      shot={SHOTS[shot]}
      shotKey={shot}
      forward={forward}
      reducedMotion={reducedMotion}
      tokens={{
        pub: { at: PUB[publicKey], path: publicKey === "aHome" && shot === 1 ? [...laneTo("key", 1, 30), PUB.aHome] : undefined },
        priv: { at: PRIV[privateKey] },
        msg: { at: msgAt, path: capsule?.stop === "bDesk" ? [...laneTo("data", 1, 24), MSG_B] : undefined },
        copy: { at: intercepted ? COPY_AT : null, start: TAP_AT, path: [COPY_AT], delay: 900 },
      }}
      world={
        <>
          <TwoOfficesWorld nodes={nodes} lanes={lanes} tap={intercepted ? "data" : null} />
          <DioramaToken id="pub">
            <KeyGlyph kind="public" size={1.1} />
          </DioramaToken>
          <DioramaToken id="priv">
            <KeyGlyph kind="private" size={1.1} />
          </DioramaToken>
          <DioramaToken id="msg">
            {capsule && <Parcel tone={capsule.state === "encrypted" ? "secure" : capsule.state === "decrypted" ? "ok" : "plain"} icon={capsule.state === "encrypted" ? "🔒" : "✉"} />}
          </DioramaToken>
          <DioramaToken id="copy">
            <Parcel tone="muted" icon="🔒" size={0.8} />
          </DioramaToken>
        </>
      }
      labels={
        <>
          {capsule && (
            <DioramaLabel token="msg" dz={16} place={capsule.stop === "aDesk" ? "right" : "left"}>
              <div
                role="img"
                data-capsule-state={capsule.state}
                aria-label={
                  capsule.state === "encrypted"
                    ? "暗号化されたメッセージ"
                    : capsule.state === "decrypted"
                      ? "復号されたメッセージ：会議は10時"
                      : "平文のメッセージ：会議は10時"
                }
              >
                <CipherCapsule state={capsule.state} />
              </div>
            </DioramaLabel>
          )}

          {intercepted && (
            <DioramaLabel at={{ ...EVE_AT, z: 124 }} place="above">
              <div className={styles.eveCallout} role="status" data-testid="eve-callout">
                <span className={styles.calloutTitle}>😈 第三者の手元</span>
                <CipherCapsule state="failed" label="第三者が取った暗号文のコピー" />
                <ul className={styles.facts}>
                  <li>暗号文は見える</li>
                  <li>公開鍵では開かない</li>
                  <li>秘密鍵を持っていない</li>
                </ul>
              </div>
            </DioramaLabel>
          )}

          <DioramaLabel token="pub" dz={12} place={publicKey === "bHome" ? "right" : "above"}>
            <span className={styles.keyLabel} role="img" aria-label="Bの公開鍵" data-key="public" data-spot={publicKey} data-emphasis={publicKey === "aUse" ? "true" : "false"}>
              <KeyTag kind="public" />
            </span>
          </DioramaLabel>
          <DioramaLabel token="priv" dz={12} place={privateKey === "bHome" ? "left" : "above"}>
            <span className={styles.keyLabel} role="img" aria-label="Bの秘密鍵" data-key="private" data-spot={privateKey} data-emphasis={privateKey === "bUse" ? "true" : "false"}>
              <KeyTag kind="private" />
              {privateKey === "bHome" && <span className={styles.keyCaption}>Bだけが保持</span>}
            </span>
          </DioramaLabel>

          {lanes.key !== "idle" && (
            <DioramaLabel at={laneTo("key", 0.3, 6).at(-1)} place="above" optional>
              <span data-rail-caption="key" data-state={lanes.key}>
                <Badge tone="ok">① 公開鍵 ◀</Badge>
              </span>
            </DioramaLabel>
          )}
          {lanes.data !== "idle" && (
            <DioramaLabel at={laneTo("data", 0.3, 6).at(-1)} place="below" optional>
              <span data-rail-caption="data" data-state={lanes.data}>
                <Badge tone="info">② 暗号文 ▶</Badge>
              </span>
            </DioramaLabel>
          )}

          <DioramaLabel at={{ x: A_DESK.x, y: A_DESK.y + 86, z: 0 }} place="below" optional>
            <NameChip name="Aさん" sub="送信者・A社" tone="info" />
          </DioramaLabel>
          <DioramaLabel at={{ x: B_DESK.x, y: B_DESK.y + 86, z: 0 }} place="below" optional>
            <NameChip name="Bさん" sub="受信者・B社" tone="info" />
          </DioramaLabel>
          {!intercepted && (
            <DioramaLabel at={{ ...EVE_AT, z: 118 }} place="above" optional>
              <NameChip name="第三者" sub="通信を盗み見" tone="muted" />
            </DioramaLabel>
          )}
        </>
      }
    />
  );
}
