import type { NodeState } from "../network/NetworkSceneBase";

// トランザクションの図解の型（TransactionExperience と TransactionDioramaScene で共有）。

export type TxNodeId = "a" | "engine" | "b";

export type TxLaneId = "debit" | "credit";

export type MoneySpot = "a" | "engine" | "b";

export type MoneyState = "pending" | "settled" | "returning" | "crashed";

export type AccountView = {
  balance: number;
  /** 開始前から変わったが、まだ確定していない */
  pending: boolean;
  locked: boolean;
  settled: boolean;
};

export type TransactionSceneProps = {
  nodes: Record<TxNodeId, NodeState>;
  accounts: { a: AccountView; b: AccountView };
  lanes: Record<TxLaneId, "idle" | "active">;
  /** 巻き戻し中はレールの向きを逆に見せる */
  reverse: boolean;
  money: { spot: MoneySpot; state: MoneyState } | null;
  alert: { tone: "warn" | "crash" | "ok"; title: string } | null;
  reducedMotion: boolean;
};
