import type { NodeState } from "../network/NetworkSceneBase";
import type { CapsuleState } from "../crypto/CipherCapsule";

// 共通鍵暗号の図解の型（CommonKeyExperience と CommonKeyDioramaScene で共有）。

export type CkNodeId = "a" | "b" | "eve";

export type KeySpot = "aHome" | "transit" | "eveGrab" | "bHome" | "eveHome" | "aUse" | "bUse" | "eveUse";

export type CapsuleStop = "aDesk" | "mid" | "bDesk";

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
