import type { NodeState } from "../network/NetworkSceneBase";
import type { CapsuleState } from "./CipherCapsule";

// 公開鍵暗号の図解の型（PublicKeyExperience と PublicKeyDioramaScene で共有）。

export type CryptoNodeId = "a" | "b" | "eve";

export type CryptoLaneId = "key" | "data";

export type CryptoLaneState = "idle" | "active" | "done";

export type PublicKeySpot = "bHome" | "aHome" | "aUse";

export type PrivateKeySpot = "bHome" | "bUse";

export type CapsuleStop = "aDesk" | "bDesk";

export type CryptoSceneProps = {
  nodes: Record<CryptoNodeId, NodeState>;
  lanes: Record<CryptoLaneId, CryptoLaneState>;
  publicKey: PublicKeySpot;
  privateKey: PrivateKeySpot;
  capsule: { state: CapsuleState; stop: CapsuleStop } | null;
  trail: { id: string; lane: CryptoLaneId } | null;
  /** 第三者が暗号文のコピーを取った状態 */
  intercepted: boolean;
  reducedMotion: boolean;
};
