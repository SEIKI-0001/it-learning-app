"use client";

import type { CSSProperties } from "react";
import type { Camera, Vec3 } from "../scene/Diorama3D";
import { KeyGlyph, Paper } from "../scene/DioramaParts";
import { DioramaLabel, DioramaStage, DioramaToken, NameChip } from "../scene/DioramaStage";
import { KeyTag } from "../crypto/KeyToken";
import { A_DESK, B_DESK, EVE_AT, SPOT, TwoOfficesWorld, laneTo } from "../crypto/TwoOfficesWorld";
import cryptoStyles from "../crypto/cryptodiorama.module.css";
import type { EnvelopeStop, SigKeySpot, SignatureSceneProps } from "./signatureTypes";
import styles from "./signature.module.css";

// ディジタル署名の図解（電子契約）：手前の取引先のオフィス（送信者）⇄ 公衆回線 ⇄ 奥のあなたのオフィス（受信者）。
// 送信者は契約書から指紋（ハッシュ）を作り、自分の秘密鍵で署名して一緒に送る。
// 途中で第三者が横取りして書き換えたり、別人がなりすましたりすると、
// 受信者が公開鍵で署名を開いた指紋と、届いた文書から計算した指紋が一致しない。

const DOC_AT: Record<EnvelopeStop, Vec3> = {
  sender: { x: A_DESK.x + 2, y: A_DESK.y + 18, z: 58 },
  mid: laneTo("data", 0.46, 22).at(-1) as Vec3,
  attacker: { ...SPOT.eveHand, z: 60 },
  receiver: { x: B_DESK.x + 2, y: B_DESK.y + 18, z: 58 },
};
const KEY_AT: Record<SigKeySpot, Vec3> = {
  senderHome: SPOT.aLeft,
  senderSign: { x: A_DESK.x + 34, y: A_DESK.y + 18, z: 80 },
  receiverHome: SPOT.bRight,
  receiverVerify: { x: B_DESK.x - 34, y: B_DESK.y + 18, z: 80 },
};

function docPath(stop: EnvelopeStop): Vec3[] | undefined {
  if (stop === "mid") return laneTo("data", 0.46, 22);
  if (stop === "attacker") return [DOC_AT.attacker];
  if (stop === "receiver") return [...laneTo("data", 1, 22), DOC_AT.receiver];
  return undefined;
}

const VERDICT = {
  ok: { stamp: "VERIFY OK", sub: "本人が書いた・改ざんなし" },
  tamper: { stamp: "改ざん検出", sub: "途中で文書が変わっている" },
  fake: { stamp: "なりすまし検出", sub: "山田さんの鍵で署名されていない" },
} as const;

const SHOT_SENDER: Camera = { yaw: -14, pitch: 50, zoom: 1.3, fx: 170, fy: 320, fz: 60 };
const SHOT_WIDE: Camera = { yaw: -20, pitch: 54, zoom: 0.84, fx: 410, fy: 250, fz: 40 };
const SHOT_EVE: Camera = { yaw: -18, pitch: 52, zoom: 1.05, fx: 400, fy: 300, fz: 50 };
const SHOT_RECEIVER: Camera = { yaw: -16, pitch: 48, zoom: 1.25, fx: 640, fy: 150, fz: 70 };

export function SignatureDioramaScene({
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
  forward = true,
}: SignatureSceneProps & { forward?: boolean }) {
  const shot =
    envelope.stop === "sender" ? SHOT_SENDER : envelope.stop === "attacker" ? SHOT_EVE : envelope.stop === "mid" ? SHOT_WIDE : SHOT_RECEIVER;
  const attacking = nodes.attacker === "error";

  return (
    <DioramaStage
      testId="signature-scene"
      ariaLabel="手前に取引先のオフィス（送信者）、奥にあなたのオフィス（受信者）。2つのオフィスは公衆回線で結ばれ、回線の途中に文書の書き換えを狙う第三者がいる"
      shot={shot}
      shotKey={`${envelope.stop}-${envelope.signed ? "s" : ""}-${privateKey}-${publicKey}-${verify?.verdict ?? (verify ? "v" : "")}`}
      forward={forward}
      reducedMotion={reducedMotion}
      tokens={{
        doc: { at: DOC_AT[envelope.stop], path: docPath(envelope.stop) },
        priv: { at: KEY_AT[privateKey] },
        pub: { at: KEY_AT[publicKey] },
      }}
      world={
        <>
          <TwoOfficesWorld
            nodes={{ a: nodes.sender, b: nodes.receiver, eve: nodes.attacker }}
            lanes={{ key: "idle", data: laneActive ? "active" : "idle" }}
            tap={attacking ? "data" : null}
            eveVisible={attacking}
            aPerson={forgedSender ? { shirt: "#374151", pose: "attacker" } : { shirt: "#4f86e8" }}
          />
          <DioramaToken id="doc">
            <Paper count={2} stamp={envelope.signed ? (envelope.forged ? "danger" : "ok") : undefined} tone={envelope.tampered ? "warn" : "plain"} />
          </DioramaToken>
          <DioramaToken id="priv">
            <KeyGlyph kind="private" size={1.05} />
          </DioramaToken>
          <DioramaToken id="pub">
            <KeyGlyph kind="public" size={1.05} />
          </DioramaToken>
        </>
      }
      labels={
        <>
          <DioramaLabel token="doc" dz={14} place={envelope.stop === "sender" ? "right" : envelope.stop === "receiver" ? "left" : "above"}>
            <div
              className={styles.sigDoc}
              data-stop={envelope.stop}
              data-tampered={envelope.tampered ? "true" : "false"}
              data-signed={envelope.signed ? "true" : "false"}
              data-testid="signed-envelope"
              role="img"
              aria-label={`文書「${envelope.text}」${envelope.signed ? "＋署名" : ""}${envelope.tampered ? "（途中で書き換えられた）" : ""}`}
            >
              <span className={styles.envelope}>
                <span className={styles.docPart}>
                  <span className={styles.docTag}>📄 契約書</span>
                  {envelope.rewrite?.phase === "done" && (
                    <span className={styles.oldText} data-testid="rewritten-from">
                      {envelope.rewrite.from}
                    </span>
                  )}
                  <span key={envelope.text} className={styles.docText}>
                    {envelope.text}
                  </span>
                  {envelope.rewrite && (
                    <span className={styles.rewriteNote} data-phase={envelope.rewrite.phase} data-testid="rewrite-note">
                      {envelope.rewrite.phase === "grab" ? "😈 横取り！" : "😈✏️ 書き換えた"}
                    </span>
                  )}
                  {senderHash && (
                    <span className={styles.hashNote} data-testid="sender-hash">
                      指紋 {senderHash}
                    </span>
                  )}
                  {envelope.tampered && !envelope.rewrite && <span className={styles.tamperMark}>書換</span>}
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
                    {envelope.rewrite?.phase === "done" && <span className={styles.sealKeep}>署名はそのまま</span>}
                  </span>
                )}
              </span>
            </div>
          </DioramaLabel>

          {verify && (
            <DioramaLabel at={{ x: B_DESK.x, y: B_DESK.y - 10, z: 104 }} place="above">
              <div className={`${styles.verify} ${styles.verifyInline}`} data-verdict={verify.verdict ?? "pending"} role="status" data-testid="verify-panel">
                <div className={styles.verifyRow}>
                  <span className={styles.hashChip} data-kind="sig" data-ready={verify.sigHash ? "true" : "false"} data-testid="verify-sig">
                    <span>① 署名を公開鍵で開く</span>
                    <b>{verify.sigHash ?? "？"}</b>
                  </span>
                  <span className={styles.verifyEq} aria-label={verify.verdict === null ? "比べる前" : verify.verdict === "ok" ? "一致" : "不一致"}>
                    {verify.verdict === null ? "?" : verify.verdict === "ok" ? "＝" : "≠"}
                  </span>
                  <span className={styles.hashChip} data-kind="doc" data-ready={verify.docHash ? "true" : "false"} data-testid="verify-doc">
                    <span>② 届いた文書から計算</span>
                    <b>{verify.docHash ?? "？"}</b>
                  </span>
                </div>
                {verify.verdict ? (
                  <span className={styles.stamp} style={{ "--stamp": verify.verdict === "ok" ? "#059669" : "#E11D48" } as CSSProperties}>
                    {verify.verdict === "ok" ? "✅" : "❌"} {VERDICT[verify.verdict].stamp}
                    <span>{VERDICT[verify.verdict].sub}</span>
                  </span>
                ) : (
                  <span className={styles.verifyPending}>③ 2つの指紋を比べる…</span>
                )}
              </div>
            </DioramaLabel>
          )}

          <DioramaLabel token="priv" dz={12} place={privateKey === "senderSign" ? "above" : "left"}>
            <span
              className={cryptoStyles.keyLabel}
              role="img"
              aria-label={forgedSender ? "偽者の秘密鍵" : "山田さんの秘密鍵"}
              data-key="private"
              data-spot={privateKey}
              data-emphasis={privateKey === "senderSign" ? "true" : "false"}
              data-forged={forgedSender ? "true" : "false"}
            >
              <KeyTag kind="private" />
              <span className={cryptoStyles.keyCaption} data-tone="private">
                {forgedSender ? "偽者の秘密鍵" : "山田さんの秘密鍵"}
              </span>
            </span>
          </DioramaLabel>
          <DioramaLabel token="pub" dz={12} place={publicKey === "receiverVerify" ? "above" : "right"}>
            <span
              className={cryptoStyles.keyLabel}
              role="img"
              aria-label="山田さんの公開鍵"
              data-key="public"
              data-spot={publicKey}
              data-emphasis={publicKey === "receiverVerify" ? "true" : "false"}
            >
              <KeyTag kind="public" />
              <span className={cryptoStyles.keyCaption} data-tone="public">
                山田さんの公開鍵
              </span>
            </span>
          </DioramaLabel>

          <DioramaLabel at={{ x: A_DESK.x, y: A_DESK.y + 86, z: 0 }} place="below" optional>
            <div data-node-label="sender" data-forged={forgedSender ? "true" : "false"}>
              <NameChip name={senderName} tone={forgedSender ? "danger" : "info"} />
            </div>
          </DioramaLabel>
          <DioramaLabel at={{ x: B_DESK.x, y: B_DESK.y + 86, z: 0 }} place="below" optional>
            <div data-node-label="receiver">
              <NameChip name="あなた" tone="info" />
            </div>
          </DioramaLabel>
          {attacking && (
            <DioramaLabel at={{ ...EVE_AT, z: 118 }} place="right" optional>
              <div data-node-label="attacker" data-state={nodes.attacker}>
                <NameChip name="第三者" tone="danger" />
              </div>
            </DioramaLabel>
          )}
        </>
      }
    />
  );
}
