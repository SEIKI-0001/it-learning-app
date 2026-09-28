import type { NodeState } from "../network/NetworkSceneBase";

// ファイアウォール・VPN の図解の型（FirewallExperience と各 3D 模型で共有）。

export type GateId = "fw" | "waf";

export type PacketStop = "src" | "fw" | "waf" | "app";

export type Inspect = "port" | "body" | null;

export type GateVerdict = { state: "pass" | "block"; text: string } | null;

export type GateSceneProps = {
  sender: string;
  packet: { stop: PacketStop; port: string; body: string; inspect: Inspect; blocked: boolean; kind: "normal" | "attack" };
  gates: Record<GateId, { state: NodeState; verdict: GateVerdict }>;
  appState: NodeState;
  roadState: "idle" | "active" | "blocked";
  reducedMotion: boolean;
};

export type VpnStop = "home" | "mid" | "office";

export type VpnSceneProps = {
  vpn: boolean;
  stop: VpnStop;
  sending: boolean;
  reducedMotion: boolean;
};
