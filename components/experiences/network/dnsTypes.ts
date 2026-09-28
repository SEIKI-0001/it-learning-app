// IPアドレス・DNS の図解の型（NetworkAddressExperience と DnsDioramaScene で共有）。

export type NetworkNodeId = "user" | "dns" | "web";

export type LaneId = "query" | "response" | "web" | "page";

export type LaneState = "idle" | "active" | "blocked";

export type CapsuleStop =
  | "input"
  | "userOut"
  | "dnsIn"
  | "dnsOut"
  | "userIn"
  | "webOut"
  | "webIn"
  | "pageOut"
  | "pageIn"
  | "dnsBlocked";

export type CapsuleKind = "input" | "query" | "response" | "connect" | "connected" | "page" | "timeout";
