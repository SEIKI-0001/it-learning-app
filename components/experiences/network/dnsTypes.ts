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

/** DNSが対応表を引いている途中か、IPアドレスを見つけたか */
export type DnsLookup = "searching" | "found";

/** 模型の中に出す一言と、それが指す物 */
export type DnsCaption = { id: string; text: import("react").ReactNode; tone?: "info" | "ok" | "danger"; focus: NetworkNodeId };

/** 模型（2.5D／動く3D）に渡すもの。NetworkAddressExperience の DnsJourney が場面ごとに作る */
export type DnsSceneProps = {
  nodes: Record<NetworkNodeId, import("./NetworkSceneBase").NodeState>;
  lanes: Record<LaneId, LaneState>;
  capsule: { kind: CapsuleKind; tag: string; payload: string; stop: CapsuleStop } | null;
  showBrowser?: boolean;
  outage: boolean;
  reducedMotion: boolean;
  inspectOpen: boolean;
  onInspect: () => void;
  /** 前へ進んだ直後か（戻る・飛ばすときは小包を瞬間移動させる） */
  forward: boolean;
  caption?: DnsCaption | null;
  /** DNSの横に対応表を出す（名前 → IPアドレスの変換を見せる場面） */
  lookup?: DnsLookup | null;
};
