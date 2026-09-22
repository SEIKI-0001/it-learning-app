import type { CSSProperties } from "react";
import styles from "./mgmt.module.css";

// 会社全体の流れを1枚の地図にし、選んだシステムの「管理範囲」が広がる。
//   SCM … 仕入先から顧客までの帯（モノの流れ）が光り、📦 が端から端まで運ばれる
//   CRM … 販売・サポート・顧客のかたまりが光り、💬 が顧客とのあいだを行き来する
//   ERP … 自社の枠全体が光り、各部門のデータが中央の統合DBへ集まる

export type SysKey = "crm" | "scm" | "erp";

const H = 196;
type Node = { key: string; label: string; icon: string; x: number; y: number };
const NODES: Node[] = [
  { key: "supplier", label: "仕入先", icon: "🏭", x: 8, y: 50 },
  { key: "procure", label: "調達", icon: "📝", x: 25, y: 50 },
  { key: "stock", label: "在庫", icon: "📦", x: 42, y: 50 },
  { key: "make", label: "製造", icon: "⚙️", x: 58.5, y: 50 },
  { key: "sales", label: "販売", icon: "🛒", x: 75, y: 50 },
  { key: "customer", label: "顧客", icon: "🙋", x: 92, y: 50 },
  { key: "acct", label: "会計", icon: "🧾", x: 30, y: 150 },
  { key: "hr", label: "人事", icon: "👥", x: 50, y: 150 },
  { key: "support", label: "サポート", icon: "📞", x: 75, y: 150 },
];

export const COVERS: Record<SysKey, string[]> = {
  scm: ["supplier", "procure", "stock", "make", "sales", "customer"],
  crm: ["sales", "support", "customer"],
  erp: ["procure", "stock", "make", "sales", "acct", "hr", "support"],
};

// 光る範囲（left/width は %、top/height は px）
const REGION: Record<SysKey, { left: number; width: number; top: number; height: number; label: string }> = {
  scm: { left: 1, width: 98, top: 22, height: 58, label: "モノの流れ" },
  crm: { left: 65, width: 34, top: 22, height: 160, label: "顧客との関係" },
  erp: { left: 15.5, width: 70, top: 8, height: 180, label: "社内の経営資源全体" },
};

const TONE: Record<SysKey, { fill: string; ring: string; chip: string; node: string }> = {
  scm: { fill: "rgba(14,165,233,0.13)", ring: "#38bdf8", chip: "bg-sky-600", node: "ring-sky-400 bg-sky-50" },
  crm: { fill: "rgba(244,63,94,0.11)", ring: "#fb7185", chip: "bg-rose-600", node: "ring-rose-400 bg-rose-50" },
  erp: { fill: "rgba(16,185,129,0.12)", ring: "#34d399", chip: "bg-emerald-600", node: "ring-emerald-400 bg-emerald-50" },
};

export function CompanyFlowMap({ sys, reducedMotion }: { sys: SysKey | null; reducedMotion: boolean }) {
  const region = sys ? REGION[sys] : null;
  const covered = new Set(sys ? COVERS[sys] : []);
  const regionStyle: CSSProperties = region
    ? { left: `${region.left}%`, width: `${region.width}%`, top: region.top, height: region.height, opacity: 1, background: TONE[sys!].fill, boxShadow: `inset 0 0 0 2px ${TONE[sys!].ring}` }
    : { left: "50%", width: "0%", top: 98, height: 0, opacity: 0 };

  return (
    <div
      className={`${styles.map} ${reducedMotion ? styles.reduced : ""} relative overflow-hidden rounded-xl ring-1 ring-gray-200`}
      style={{ height: H }}
      data-testid="mgmt-map"
      data-sys={sys ?? "none"}
    >
      {/* 自社の枠 */}
      <div className="absolute rounded-xl border border-dashed border-gray-300 bg-white/60" style={{ left: "16.5%", width: "68%", top: 12, height: 172 }} aria-hidden />
      <span className="absolute z-[1] rounded bg-white px-1 text-[10px] font-bold text-gray-500" style={{ left: "18%", top: 4 }}>
        🏢 自社
      </span>

      {/* モノの流れの矢印（仕入先 → 顧客） */}
      <div className="absolute h-0.5 bg-gray-300" style={{ left: "8%", width: "84%", top: 50 }} aria-hidden />

      {/* 管理範囲（選ぶたびに形を変えて広がる） */}
      <div className={`${styles.region} absolute z-[2] rounded-xl`} style={regionStyle} data-testid="mgmt-region">
        {region && (
          <span key={sys} className={`${styles.label} absolute -top-0 left-1/2 whitespace-nowrap rounded-b px-1.5 text-[10px] font-bold text-white ${TONE[sys!].chip}`}>
            {region.label}
          </span>
        )}
      </div>

      {NODES.map((n) => {
        const on = covered.has(n.key);
        return (
          <div
            key={n.key}
            className={`absolute z-[3] w-[44px] -translate-x-1/2 -translate-y-1/2 rounded-lg py-0.5 text-center ring-1 transition-colors duration-500 ${
              on && sys ? `${TONE[sys].node} ring-2` : "bg-white ring-gray-200"
            }`}
            style={{ left: `${n.x}%`, top: n.y }}
            data-testid={`mgmt-node-${n.key}`}
            data-on={on ? "true" : "false"}
          >
            <div className="text-sm leading-tight">{n.icon}</div>
            <div className="whitespace-nowrap text-[9px] font-bold leading-tight text-gray-700">{n.label}</div>
          </div>
        );
      })}

      {/* 一度だけ流れる動き：管理しているものが何かを見せる */}
      {!reducedMotion && sys === "scm" && (
        <span key="scm" className={`${styles.token} ${styles.scmToken} absolute z-[4] text-base`} aria-hidden>
          📦
        </span>
      )}
      {!reducedMotion && sys === "crm" && (
        <span key="crm" className={`${styles.token} ${styles.crmToken} absolute z-[4] text-base`} aria-hidden>
          💬
        </span>
      )}
      {sys === "erp" && (
        <>
          <span key="db" className={`${styles.db} absolute z-[4] -translate-x-1/2 -translate-y-1/2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white`} style={{ left: "50%", top: 100 }} data-testid="mgmt-db">
            🗄️ 統合DB
          </span>
          {!reducedMotion &&
            NODES.filter((n) => COVERS.erp.includes(n.key)).map((n, i) => (
              <span
                key={`dot-${n.key}`}
                className={`${styles.dot} absolute z-[4] h-2 w-2 rounded-full bg-emerald-500`}
                style={{ "--fx": `${n.x}%`, "--fy": `${n.y}px`, animationDelay: `${i * 90}ms` } as CSSProperties}
                aria-hidden
              />
            ))}
        </>
      )}
    </div>
  );
}
