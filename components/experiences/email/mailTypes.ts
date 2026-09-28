import type { NodeState } from "../network/NetworkSceneBase";

// 電子メールの図解の型（EmailProtocolExperience と MailDioramaScenes で共有）。

export type MailTone = "draft" | "smtp" | "recv" | "read" | "missing";

export type RouteNodeId = "you" | "smtp" | "mailbox" | "friend";

export type RouteSeg = "send" | "relay" | "fetch";

export type MailStop = "you" | "smtp" | "mailbox" | "friend";

export type SyncNodeId = "server" | "phone" | "pc";

export type Inbox = { mail: boolean; read?: boolean; note?: string };

export type RouteSceneProps = {
  nodes: Record<RouteNodeId, NodeState>;
  segments: Record<RouteSeg, "idle" | "active" | "done">;
  mail: { stop: MailStop; tone: MailTone; label: string };
  reducedMotion: boolean;
};

export type SyncSceneProps = {
  proto: "POP" | "IMAP";
  nodes: Record<SyncNodeId, NodeState>;
  lanes: Partial<Record<"phone" | "pc", "active" | "blocked">>;
  boxes: Record<SyncNodeId, Inbox>;
  mail: { at: SyncNodeId; tone: MailTone; label: string } | null;
  reducedMotion: boolean;
};
