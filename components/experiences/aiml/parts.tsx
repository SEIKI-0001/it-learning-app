import type { ReactNode } from "react";

// AI・機械学習の解説3案で共通して使う小さな部品。

export function Takeaway({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-bold leading-relaxed text-brand-900 ring-1 ring-brand-200">
      {children}
    </div>
  );
}

export function Term({ children }: { children: ReactNode }) {
  return <b className="whitespace-nowrap rounded bg-gray-900 px-1 py-px text-[0.92em] font-bold text-white">{children}</b>;
}

export function Chip({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "brand" | "ok" | "ng" }) {
  const cls = {
    plain: "bg-white text-gray-700 ring-gray-300",
    brand: "bg-brand-600 text-white ring-brand-600",
    ok: "bg-emerald-50 text-emerald-800 ring-emerald-300",
    ng: "bg-rose-50 text-rose-700 ring-rose-300",
  }[tone];
  return <span className={`inline-block rounded-md px-1.5 py-0.5 text-[12px] font-bold ring-1 ${cls}`}>{children}</span>;
}

/** 入れ子の枠。AI ⊃ 機械学習 ⊃ 深層学習 ⊃ 生成AI を、枠ごとに中身（例）を差し込んで描く */
export function NestBox({
  label,
  note,
  depth,
  children,
  testId,
}: {
  label: string;
  note?: string;
  depth: 0 | 1 | 2 | 3;
  children?: ReactNode;
  testId?: string;
}) {
  const tone = [
    "bg-white ring-gray-300",
    "bg-gray-50 ring-gray-400",
    "bg-brand-50 ring-brand-300",
    "bg-brand-100 ring-brand-400",
  ][depth];
  return (
    <div className={`rounded-xl p-2.5 ring-1 ${tone}`} data-testid={testId}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[13px] font-bold text-gray-900">{label}</span>
        {note && <span className="text-[11px] text-gray-500">{note}</span>}
      </div>
      {children && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );
}
