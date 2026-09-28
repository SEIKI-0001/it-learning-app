// 3C分析の図解の型と3つの調べる場所（ThreeCExperience と ThreeCDioramaScene で共有）。

export type Spot = "customer" | "competitor" | "company";

export const SPOT_META: Record<Spot, { label: string; en: string; short: string; tone: string; action: string }> = {
  customer: { label: "顧客", en: "Customer", short: "安くて写真映え", tone: "#0EA5E9", action: "顧客を調べる" },
  competitor: { label: "競合", en: "Competitor", short: "高い・提供が遅い", tone: "#F43F5E", action: "競合を調べる" },
  company: { label: "自社", en: "Company", short: "安い・早い・トッピング豊富", tone: "#10B981", action: "自社を調べる" },
};

export const SPOTS: Spot[] = ["customer", "competitor", "company"];

export type VennSceneProps = {
  researched: Record<Spot, boolean>;
  focus: Spot | null;
  costTries: number;
  strategy: string;
  onResearch: (spot: Spot) => void;
};
