// バリューチェーンの図解の型と並び（ValueChainExperience と ValueChainDiorama で共有）。

export type StationState = "idle" | "active" | "error" | "disabled";
export type StationId = "inbound" | "operations" | "outbound" | "sales" | "service";
export type SupportId = "infra" | "hr" | "tech" | "procurement";

export const STATIONS: StationId[] = ["inbound", "operations", "outbound", "sales", "service"];
export const SUPPORTS: SupportId[] = ["infra", "hr", "tech", "procurement"];

export type ValueChainDiagramProps = {
  stations: Record<StationId, StationState>;
  /** 製品がいる列（-1＝原材料が届く前） */
  product: { at: number; label: string; blocked: boolean };
  supports: Record<SupportId, "on" | "off">;
  /** 積み上がった価値（列ごとの増分）。final があればコスト＋マージンへ組み替える */
  value: { blocks: number[]; final: { cost: number; margin: number } | null };
  stationNotes: Partial<Record<StationId, string>>;
};
