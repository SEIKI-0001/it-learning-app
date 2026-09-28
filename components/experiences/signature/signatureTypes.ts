import type { NodeState } from "../network/NetworkSceneBase";

// ディジタル署名・CA の図解の型（DigitalSignatureExperience と各 3D 模型で共有）。

export type SigNodeId = "sender" | "receiver" | "attacker";

export type SigKeySpot = "senderHome" | "senderSign" | "receiverHome" | "receiverVerify";

export type EnvelopeStop = "sender" | "mid" | "attacker" | "receiver";

export type Envelope = {
  stop: EnvelopeStop;
  text: string;
  tampered: boolean;
  /** 署名がまだ付いていない（作成直後） */
  signed: boolean;
  /** 署名に封じた指紋 */
  sealHash: string;
  forged: boolean;
  /** 第三者による書き換え：grab＝横取りした（まだ元の文面）/ done＝書き換えた */
  rewrite?: { from: string; phase: "grab" | "done" };
};

/** 検証は3段階：①署名を公開鍵で開く → ②届いた文書から指紋を計算 → ③比べる。まだの段階は null */
export type Verify = {
  sigHash: string | null;
  docHash: string | null;
  verdict: "ok" | "tamper" | "fake" | null;
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

export type CaStation = "owner" | "ca" | "cert" | "user";

export const CA_STATIONS: CaStation[] = ["owner", "ca", "cert", "user"];

export type CaFlowView = {
  /** トークンが今いる駅 */
  at: CaStation;
  applicant: "real" | "fake";
  /** CA の判定（null=まだ） */
  check: "pass" | "reject" | null;
  certified: boolean;
  /** 利用者の判断（null=まだ） */
  userVerdict: "trust" | "reject" | null;
  active: CaStation[];
};
