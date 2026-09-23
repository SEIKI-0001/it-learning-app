"use client";

import styles from "../calc/calc.module.css";

// RAID の解説で共通の「4台のディスク」。1台＝4マス（1マス＝0.25TB）で、マスの色がそのまま使い道。
//   data＝データ / copy＝RAID1 のコピー / p・q＝RAID5・6 のパリティ
// placed 本目のストライプ（横1列）まで書き込まれた状態を描く。broken のディスクは故障中。

export type RaidMode = "raid0" | "raid1" | "raid5" | "raid6";
export type CellKind = "data" | "copy" | "p" | "q";
export type Cell = { label: string; kind: CellKind };

export const DISKS = 4;
export const SLOTS = 4;
const LETTERS = "ABCDEFGHIJKLMNOP";

/** [ストライプ][ディスク] の並び。RAID5・6 はパリティの置き場所をストライプごとにずらす（分散パリティ）。 */
export function raidLayout(mode: RaidMode): Cell[][] {
  let next = 0;
  const data = (): Cell => ({ label: LETTERS[next++], kind: "data" });
  return Array.from({ length: SLOTS }, (_, s) => {
    if (mode === "raid0") return Array.from({ length: DISKS }, data);
    if (mode === "raid1") {
      const x = data();
      const y = data();
      return [x, { label: x.label, kind: "copy" }, y, { label: y.label, kind: "copy" }];
    }
    const p = DISKS - 1 - s;
    const q = mode === "raid6" ? (DISKS - s) % DISKS : -1;
    return Array.from({ length: DISKS }, (_, d) =>
      d === p ? { label: "P", kind: "p" } : d === q ? { label: "Q", kind: "q" } : data(),
    );
  });
}

/** 使える容量（台数）。データのマス数 ÷ 1台のマス数。 */
export function usableDisks(mode: RaidMode) {
  return raidLayout(mode).flat().filter((c) => c.kind === "data").length / SLOTS;
}

/** 故障したディスクがあっても、データを全部取り戻せるか */
export function survives(mode: RaidMode, broken: ReadonlySet<number>) {
  if (broken.size === 0) return true;
  if (mode === "raid0") return false;
  if (mode === "raid1") return !(broken.has(0) && broken.has(1)) && !(broken.has(2) && broken.has(3));
  return broken.size <= (mode === "raid5" ? 1 : 2);
}

const TONE: Record<CellKind, string> = {
  data: "bg-brand-500 text-white",
  copy: "bg-sky-400 text-white",
  p: "bg-amber-400 text-amber-950",
  q: "bg-amber-600 text-white",
};

export function DiskArray({
  mode,
  placed,
  broken,
  onToggleDisk,
  highlight,
  testId,
}: {
  mode: RaidMode;
  placed: number;
  broken: ReadonlySet<number>;
  /** 渡すとディスクの見出しが「故障させる」ボタンになる */
  onToggleDisk?: (d: number) => void;
  /** 強調するマスの種類（それ以外は薄くする） */
  highlight?: CellKind[];
  testId?: string;
}) {
  const layout = raidLayout(mode);
  const ok = survives(mode, broken);
  return (
    <div className="grid grid-cols-4 gap-1.5" data-testid={testId} data-placed={placed} data-broken={broken.size}>
      {Array.from({ length: DISKS }, (_, d) => {
        const down = broken.has(d);
        const head = (
          <>
            <span aria-hidden>{down ? "💥" : "💽"}</span> {d + 1}
          </>
        );
        return (
          <div
            key={d}
            className={`rounded-lg p-1 ring-1 transition-colors ${down ? "bg-rose-50 ring-2 ring-rose-400" : "bg-gray-50 ring-gray-200"}`}
            data-testid={testId ? `${testId}-disk-${d + 1}` : undefined}
            data-down={down ? "true" : undefined}
          >
            {onToggleDisk ? (
              <button
                type="button"
                onClick={() => onToggleDisk(d)}
                aria-pressed={down}
                aria-label={`ディスク${d + 1}を${down ? "直す" : "故障させる"}`}
                className={`w-full rounded-md py-0.5 text-[11px] font-bold active:scale-95 ${down ? "bg-rose-500 text-white" : "bg-white text-gray-600 ring-1 ring-gray-300"}`}
              >
                {head}
              </button>
            ) : (
              <div className="py-0.5 text-center text-[11px] font-bold text-gray-500">{head}</div>
            )}
            <div className="mt-1 space-y-1">
              {layout.map((stripe, s) => {
                const cell = stripe[d];
                if (s >= placed) return <div key={s} className="h-6 rounded border border-dashed border-gray-300" />;
                const dim = highlight && !highlight.includes(cell.kind);
                return (
                  <div
                    key={s}
                    className={`relative grid h-6 place-items-center rounded text-[11px] font-bold ${TONE[cell.kind]} ${styles.pop} ${dim ? "opacity-25" : ""} ${down ? "opacity-30" : ""}`}
                    style={{ animationDelay: `${d * 90}ms` }}
                    data-kind={cell.kind}
                  >
                    {cell.label}
                    {cell.kind === "copy" && <span className="sr-only">のコピー</span>}
                  </div>
                );
              })}
            </div>
            {down && placed >= SLOTS && (
              <div className={`mt-1 text-center text-[10px] font-bold leading-tight ${ok ? "text-emerald-700" : "text-rose-600"}`}>
                {ok ? "♻️ 復元できる" : "✕ 失われる"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Legend({ kinds }: { kinds: CellKind[] }) {
  const name: Record<CellKind, string> = { data: "データ", copy: "コピー", p: "パリティ", q: "パリティ2" };
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-gray-600">
      {kinds.map((k) => (
        <span key={k} className="flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded-sm ${TONE[k]}`} />
          {name[k]}
        </span>
      ))}
      <span className="text-gray-400">1マス＝0.25TB（1台＝1TB）</span>
    </div>
  );
}
