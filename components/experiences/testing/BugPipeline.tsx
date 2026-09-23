import type { CSSProperties } from "react";
import styles from "./testing.module.css";

// バグの落下パイプライン。列＝バグの種類（4列）、行＝テストの関所（上から単体→結合→システム→受入）＋最下段の本番。
// リリースすると4匹のバグが上から落ちてくる。自分に対応する関所が「やる」なら、その行で止まって捕まる（✅）。
// 省いていると、ほかの関所では捕まらずに素通りして本番まで落ち、利用者のところで💥になる。
// 捕まった位置が下の行ほど「直す範囲」と「修正コスト」が大きい。本番まで落ちると最大。

export type Stage = {
  id: string;
  name: string;
  emoji: string;
  food: string;
  bug: string;
  bugIcon: string;
  bugKind: string;
  scope: string;
  cost: number;
  catchNote: string;
  missNote: string;
};

export const PROD_COST = 100;
export const ROW_H = 54;
const TOP_H = 40;
export const FALL_MS_PER_ROW = 380;
export const STAGGER_MS = 260;

export function arrivalMs(i: number, caught: boolean, count: number) {
  const rows = caught ? i + 1 : count + 1;
  return i * STAGGER_MS + rows * FALL_MS_PER_ROW;
}

export function BugPipeline({
  stages,
  on,
  released,
  runKey,
  reducedMotion,
  onToggle,
}: {
  stages: readonly Stage[];
  on: Record<string, boolean>;
  released: boolean;
  runKey: number;
  reducedMotion: boolean;
  onToggle: (id: string) => void;
}) {
  const n = stages.length;
  const lane = (i: number) => `${((i + 0.5) / n) * 100}%`;

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl ring-1 ring-gray-200" data-testid="bug-pipeline" data-released={released ? "true" : "false"}>
      {/* 上段：開発中のシステム（潜んでいるバグ） */}
      <div className="flex items-center bg-gray-50" style={{ height: TOP_H }}>
        <div className="relative h-full w-[92px] flex-none border-r border-gray-200">
          {stages.map((s, i) => (
            <span key={s.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-gray-300" style={{ left: lane(i) }}>
              {released ? "" : "🐛"}
            </span>
          ))}
        </div>
        <div className="px-3 text-xs font-bold text-gray-500">🧑‍💻 作ったシステム（バグ4匹が潜伏中）</div>
      </div>

      {/* 関所（テスト）の行 */}
      {stages.map((s, row) => {
        const active = on[s.id];
        return (
          <div key={s.id} className={`flex items-center border-t border-gray-200 ${active ? "bg-white" : "bg-gray-50"}`} style={{ height: ROW_H }} data-testid={`gate-${s.id}`}>
            <div className="relative h-full w-[92px] flex-none border-r border-gray-200">
              {/* 関所の網：自分の列だけ張られている。省くと点線で開きっぱなし */}
              <div
                className={`absolute top-1/2 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${active ? "bg-brand-500" : "border border-dashed border-gray-300 bg-transparent"}`}
                style={{ left: lane(row), width: `${100 / n - 4}%` }}
              />
            </div>
            <span className="ml-2 text-lg">{s.emoji}</span>
            <div className="ml-1.5 min-w-0 flex-1">
              <div className={`text-sm font-bold leading-tight ${active ? "text-gray-800" : "text-gray-400"}`}>{s.name}</div>
              <div className="text-[10px] leading-tight text-gray-500">
                直す範囲：{s.scope}
                <span className="ml-1 font-bold text-amber-700">×{s.cost}</span>
              </div>
            </div>
            <button
              onClick={() => onToggle(s.id)}
              aria-pressed={active}
              aria-label={`${s.name}を${active ? "省く" : "やる"}`}
              className={`mr-2 flex-none rounded-lg px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                active ? "bg-brand-600 text-white" : "bg-white text-gray-500 ring-1 ring-gray-300"
              }`}
            >
              {active ? "✓ やる" : "省く"}
            </button>
          </div>
        );
      })}

      {/* 本番 */}
      <div className="flex items-center border-t-2 border-rose-200 bg-rose-50" style={{ height: ROW_H }}>
        <div className="h-full w-[92px] flex-none border-r border-rose-200" />
        <span className="ml-2 text-lg">🌐</span>
        <div className="ml-1.5">
          <div className="text-sm font-bold leading-tight text-rose-800">本番（利用者）</div>
          <div className="text-[10px] leading-tight text-rose-600">
            直す範囲：原因探し＋全部やり直し＋おわび<span className="ml-1 font-bold">×{PROD_COST}</span>
          </div>
        </div>
      </div>

      {/* 落ちてくるバグ */}
      {released &&
        stages.map((s, i) => {
          const caught = on[s.id];
          const rowIndex = caught ? i : n; // n = 本番
          const targetY = TOP_H + rowIndex * ROW_H + ROW_H / 2;
          const dur = (rowIndex + 1) * FALL_MS_PER_ROW;
          const style = {
            left: `calc(92px * ${(i + 0.5) / n})`,
            "--ty": `${targetY}px`,
            animationDuration: `${dur}ms`,
            animationDelay: `${i * STAGGER_MS}ms`,
            transform: reducedMotion ? `translate(-50%, ${targetY}px) translateY(-50%)` : undefined,
          } as CSSProperties;
          return (
            <span
              key={`${runKey}-${s.id}`}
              className={`absolute top-0 z-10 grid h-6 w-6 place-items-center rounded-full text-sm ring-2 ${caught ? "bg-emerald-50 ring-emerald-400" : "bg-rose-100 ring-rose-400"} ${reducedMotion ? "" : styles.fall}`}
              style={style}
              data-testid={`bug-${s.id}`}
              data-caught={caught ? "true" : "false"}
              title={s.bugKind}
            >
              {s.bugIcon}
              <span
                className={`absolute -right-2 -top-2 text-[11px] ${reducedMotion ? "" : styles.pop}`}
                style={reducedMotion ? undefined : { animationDelay: `${i * STAGGER_MS + dur}ms` }}
                aria-hidden
              >
                {caught ? "✅" : "💥"}
              </span>
            </span>
          );
        })}
    </div>
  );
}

export function BugLegend({ stages }: { stages: readonly Stage[] }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-bold text-gray-500">
      {stages.map((s) => (
        <span key={s.id}>
          {s.bugIcon} {s.bugKind}
        </span>
      ))}
    </div>
  );
}
