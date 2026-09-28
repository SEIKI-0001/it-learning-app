"use client";

import type { Camera, Vec3 } from "../scene/Diorama3D";
import { KeyGlyph, Parcel } from "../scene/DioramaParts";
import { Badge, DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import { CipherCapsule } from "../crypto/CipherCapsule";
import { A_DESK, B_DESK, EVE_AT, JUNCTION, SPOT, TwoOfficesWorld, laneTo } from "../crypto/TwoOfficesWorld";
import cryptoStyles from "../crypto/cryptodiorama.module.css";
import type { CapsuleStop, CommonKeySceneProps, KeySpot } from "./commonKeyTypes";
import styles from "./commonkeydiorama.module.css";

// 共通鍵暗号の図解：公開鍵暗号と同じ舞台（A社 ⇄ 公衆回線 ⇄ B社、途中に盗聴者）。
// ① 鍵の共有：Aが用意した1本の共通鍵（金）を①の車線でBへ渡す。盗まれたケースでは途中で盗聴者がコピーを取る。
// ② 暗号通信：同じ鍵で閉じた暗号文が②の車線を通る。鍵のコピーを持つ盗聴者には、この先の通信がすべて読めてしまう。

const KEY_AT: Record<KeySpot, Vec3> = {
  aHome: SPOT.aRight,
  transit: laneTo("key", 0.46, 30, "toB").at(-1) as Vec3,
  eveGrab: { ...JUNCTION, z: 72 },
  bHome: SPOT.bRight,
  eveHome: SPOT.eveHand,
  aUse: { ...SPOT.aScreen, x: SPOT.aScreen.x + 26, z: SPOT.aScreen.z + 22 },
  bUse: { ...SPOT.bScreen, x: SPOT.bScreen.x - 26, z: SPOT.bScreen.z + 22 },
  eveUse: { ...SPOT.eveHand, z: SPOT.eveHand.z + 26 },
};
const MSG_AT: Record<CapsuleStop, Vec3> = {
  aDesk: { x: A_DESK.x + 2, y: A_DESK.y + 16, z: 60 },
  mid: laneTo("data", 0.5, 24).at(-1) as Vec3,
  bDesk: { x: B_DESK.x + 2, y: B_DESK.y + 16, z: 60 },
};

function keyPath(spot: KeySpot): Vec3[] | undefined {
  if (spot === "transit") return laneTo("key", 0.46, 30, "toB");
  if (spot === "bHome") return [...laneTo("key", 1, 30, "toB"), KEY_AT.bHome];
  if (spot === "eveHome") return [KEY_AT.eveHome];
  return undefined;
}

function msgPath(stop: CapsuleStop): Vec3[] | undefined {
  if (stop === "mid") return laneTo("data", 0.5, 24);
  if (stop === "bDesk") return [...laneTo("data", 1, 24), MSG_AT.bDesk];
  return undefined;
}

const SHOT_A: Camera = { yaw: -14, pitch: 50, zoom: 1.3, fx: 170, fy: 320, fz: 60 };
const SHOT_WIDE: Camera = { yaw: -20, pitch: 54, zoom: 0.84, fx: 410, fy: 240, fz: 40 };
const SHOT_B: Camera = { yaw: -16, pitch: 50, zoom: 1.3, fx: 640, fy: 150, fz: 60 };

function shotOf({ keys, capsule, eve }: CommonKeySceneProps): Camera {
  if (capsule?.stop === "mid") return SHOT_WIDE;
  if (capsule?.stop === "bDesk") return eve?.reads ? SHOT_WIDE : SHOT_B;
  if (capsule?.stop === "aDesk") return SHOT_A;
  if (keys.some((k) => k.spot === "transit" || k.spot === "eveGrab" || k.spot === "eveHome")) return SHOT_WIDE;
  if (keys.some((k) => k.spot === "bHome")) return SHOT_WIDE;
  return SHOT_A;
}

export function CommonKeyDioramaScene(props: CommonKeySceneProps & { forward?: boolean }) {
  const { nodes, lanes, keys, capsule, tap, eve, reducedMotion, forward = true } = props;
  const shot = shotOf(props);
  const owners = ["A", "B", "盗聴者"] as const;

  const tokens = Object.fromEntries([
    ...owners.map((owner) => {
      const k = keys.find((x) => x.owner === owner);
      const at = k ? KEY_AT[k.spot] : null;
      return [
        `key-${owner}`,
        {
          at,
          path: k ? keyPath(k.spot) : undefined,
          // 盗まれたコピーは回線（受け渡しの途中）から分かれて盗聴者の手元へ
          start: owner === "盗聴者" ? KEY_AT.transit : owner === "B" ? KEY_AT.aHome : undefined,
        },
      ];
    }),
    ["msg", { at: capsule ? MSG_AT[capsule.stop] : null, path: capsule ? msgPath(capsule.stop) : undefined }],
  ]);

  return (
    <DioramaStage
      testId="commonkey-scene"
      ariaLabel="手前にA社のオフィスのAさん、奥にB社のオフィスのBさん。2つのオフィスは公衆回線の①鍵の車線と②暗号文の車線で結ばれ、回線の途中の通信設備に盗聴者が立っている"
      shot={shot}
      shotKey={`${keys.map((k) => `${k.owner}:${k.spot}`).join(",")}|${capsule?.stop ?? "-"}|${eve?.reads ? "r" : ""}`}
      forward={forward}
      reducedMotion={reducedMotion}
      tokens={tokens}
      world={
        <>
          <TwoOfficesWorld nodes={nodes} lanes={lanes} tap={tap} keyDirection="toB" />
          {owners.map((owner) => (
            <DioramaToken key={owner} id={`key-${owner}`}>
              <KeyGlyph kind="common" size={1.1} />
            </DioramaToken>
          ))}
          <DioramaToken id="msg">
            {capsule && <Parcel tone={capsule.state === "encrypted" ? "warn" : capsule.state === "decrypted" ? "ok" : "plain"} mark={capsule.state === "encrypted" ? "lock" : capsule.state === "decrypted" ? "check" : "none"} />}
          </DioramaToken>
        </>
      }
      labels={
        <>
          {/* 盗聴者がどちらの車線をのぞいているか（見た目は床の赤い線） */}
          <span hidden data-testid="ck-tap" data-tap={tap ?? "none"} data-active={tap ? "true" : "false"} />

          {capsule && (
            <DioramaLabel token="msg" dz={16} place={capsule.stop === "aDesk" ? "right" : capsule.stop === "bDesk" ? "left" : "above"}>
              <div
                role="img"
                data-capsule-state={capsule.state}
                aria-label={
                  capsule.state === "encrypted"
                    ? "共通鍵で暗号化されたメッセージ"
                    : capsule.state === "decrypted"
                      ? "復号されたメッセージ：会議は10時"
                      : "平文のメッセージ：会議は10時"
                }
              >
                <CipherCapsule state={capsule.state} />
              </div>
            </DioramaLabel>
          )}

          {eve && (
            <DioramaLabel at={{ ...EVE_AT, z: 124 }} place="above">
              <div className={cryptoStyles.eveCallout} data-tone={eve.reads ? "danger" : undefined} role="status" data-testid="ck-eve" data-reads={eve.reads ? "true" : "false"}>
                <span className={cryptoStyles.calloutTitle}>😈 盗聴者の手元</span>
                {eve.key && <span className={styles.eveKey}>🔑 鍵のコピー</span>}
                {eve.cipher && (
                  <CipherCapsule state={eve.reads ? "decrypted" : "failed"} body={eve.reads ?? undefined} tag={eve.reads ? "盗み読み" : undefined} label="盗聴者が取った暗号文" />
                )}
                {!eve.cipher && eve.key && <span className={styles.eveNote}>このあとの暗号文を待つ…</span>}
              </div>
            </DioramaLabel>
          )}

          {keys.map((k) => (
            <DioramaLabel key={k.owner} token={`key-${k.owner}`} dz={12} place={k.owner === "A" ? "left" : "right"}>
              <span
                className={cryptoStyles.keyLabel}
                role="img"
                aria-label={`${k.owner}が持つ共通鍵`}
                data-key="common"
                data-owner={k.owner}
                data-spot={k.spot}
                data-emphasis={k.emphasis ? "true" : "false"}
                data-stolen={k.owner === "盗聴者" ? "true" : "false"}
              >
                <span className={styles.keyTag}>COMMON</span>
                <span className={cryptoStyles.keyCaption} data-tone={k.owner === "盗聴者" ? "danger" : "own"}>
                  {k.owner === "盗聴者" ? "盗まれたコピー" : `${k.owner}の共通鍵`}
                </span>
              </span>
            </DioramaLabel>
          ))}

          {lanes.key !== "idle" && (
            <DioramaLabel at={laneTo("key", 0.3, 6, "toB").at(-1)} place="above" optional>
              <span data-state={lanes.key}>
                <Badge tone="warn">① 共通鍵 ▶</Badge>
              </span>
            </DioramaLabel>
          )}
          {lanes.data !== "idle" && (
            <DioramaLabel at={laneTo("data", 0.3, 6).at(-1)} place="below" optional>
              <span data-state={lanes.data}>
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
          {!eve && (
            <DioramaLabel at={{ ...EVE_AT, z: 118 }} place="above" optional>
              <NameChip name="盗聴者" sub="通信を盗み見" tone="muted" />
            </DioramaLabel>
          )}
        </>
      }
    />
  );
}
