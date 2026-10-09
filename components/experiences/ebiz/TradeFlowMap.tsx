import type { IconName } from "@/components/ui/Icon";

// 取引マップのデータ：4つの登場人物（企業／取引先企業／個人／個人）と、必要なときだけ現れる中継役
// （スマホ・仲介プラットフォーム）。用語ごとに「誰から誰へ・何が」流れるかを①②③の順で持つ。
// 流れるものは モノ（橙）・お金（緑）・情報（青）で色を分ける。模型は TradeTownScene。

export type TermKey = "ec" | "edi" | "fintech" | "sharing";
export type Kind = "goods" | "money" | "info";
export type NodeKey = "compA" | "compB" | "persA" | "persB" | "phone" | "platform";

// 用語ごとの呼び名（同じ箱でも役割が変わる）
export const ROLE: Record<TermKey, Partial<Record<NodeKey, string>>> = {
  ec: { compA: "ネットショップ", persA: "顧客" },
  edi: { compA: "企業A", compB: "企業B" },
  fintech: { compA: "金融サービス", persA: "利用者" },
  sharing: { persA: "借りる人", persB: "貸す人" },
};

export type FlowStep = { path: NodeKey[]; kind: Kind; icon: IconName; label: string; text: string };

export const FLOWS: Record<TermKey, FlowStep[]> = {
  ec: [
    { path: ["persA", "compA"], kind: "info", icon: "file-text", label: "注文", text: "顧客 → ショップ：注文を送る" },
    { path: ["persA", "compA"], kind: "money", icon: "yen", label: "代金", text: "顧客 → ショップ：代金を払う" },
    { path: ["compA", "persA"], kind: "goods", icon: "package", label: "商品", text: "ショップ → 顧客：商品が届く" },
  ],
  edi: [
    { path: ["compA", "compB"], kind: "info", icon: "file-text", label: "発注", text: "企業A → 企業B：発注データ" },
    { path: ["compB", "compA"], kind: "info", icon: "file-text", label: "納品", text: "企業B → 企業A：納品（出荷）データ" },
    { path: ["compB", "compA"], kind: "info", icon: "file-text", label: "請求", text: "企業B → 企業A：請求データ" },
  ],
  fintech: [
    { path: ["persA", "phone"], kind: "info", icon: "arrow-right", label: "指示", text: "利用者 → スマホ：送金・支払いを操作" },
    { path: ["phone", "compA"], kind: "money", icon: "yen", label: "送金", text: "スマホ → 金融サービス：お金が動く" },
    { path: ["compA", "phone", "persA"], kind: "info", icon: "file-text", label: "完了", text: "金融サービス → 利用者：完了・残高が届く" },
  ],
  sharing: [
    { path: ["persB", "platform"], kind: "info", icon: "file-text", label: "空き", text: "貸す人 → 仲介：空いている車を登録" },
    { path: ["persA", "platform", "persB"], kind: "money", icon: "yen", label: "利用料", text: "借りる人 → 仲介 → 貸す人：利用料" },
    { path: ["persB", "persA"], kind: "goods", icon: "car", label: "車", text: "貸す人 → 借りる人：車そのものを貸す" },
  ],
};

export const STEP_MS = 1500;
const KIND_TONE: Record<Kind, { stroke: string; fill: string; name: string }> = {
  goods: { stroke: "#f59e0b", fill: "#fffbeb", name: "モノ" },
  money: { stroke: "#16a34a", fill: "#f0fdf4", name: "お金" },
  info: { stroke: "#2563eb", fill: "#eff6ff", name: "情報" },
};

export function KindLegend() {
  return (
    <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-gray-600">
      {(Object.keys(KIND_TONE) as Kind[]).map((k) => (
        <span key={k} className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: KIND_TONE[k].stroke }} />
          {KIND_TONE[k].name}
        </span>
      ))}
    </div>
  );
}

export function kindName(kind: Kind) {
  return KIND_TONE[kind].name;
}
export function kindColor(kind: Kind) {
  return KIND_TONE[kind].stroke;
}
