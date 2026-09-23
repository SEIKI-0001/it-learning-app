"use client";

import { Panel, SectionTitle } from "../ui";
import { DiskArray, Legend, SLOTS, usableDisks, type RaidMode } from "./DiskArray";

// 4方式を1枚に並べる（静的）。同じ「1TB × 4台」で、マスの色（データ／コピー／パリティ）の置き方と
// 使える容量・何台まで壊れてよいかを横並びで比べる。①〜④で1つずつ見たものの総まとめ。

const NO_BROKEN: ReadonlySet<number> = new Set();

const MODES: { mode: RaidMode; name: string; how: string; tolerate: string }[] = [
  { mode: "raid0", name: "RAID0", how: "分けて書く", tolerate: "0台（1台で全滅）" },
  { mode: "raid1", name: "RAID1", how: "2台に同じものを", tolerate: "組の片方なら1台" },
  { mode: "raid5", name: "RAID5", how: "パリティ1台分", tolerate: "どれか1台まで" },
  { mode: "raid6", name: "RAID6", how: "パリティ2台分", tolerate: "どれか2台まで" },
];

export function RaidCompareStage({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>4つを並べて比べる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        どれも<b className="text-gray-800">1TB × 4台</b>。色の付き方と、使える容量を見比べます。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="raid-compare">
        {MODES.map((m) => (
          <div key={m.mode} className="rounded-xl bg-gray-50 p-1.5 ring-1 ring-gray-200" data-testid={`raid-compare-${m.mode}`}>
            <div className="flex items-baseline justify-between px-0.5">
              <span className="text-[13px] font-bold text-gray-800">{m.name}</span>
              <span className="text-[11px] font-bold text-gray-500">{m.how}</span>
            </div>
            <div className="mt-1">
              <DiskArray mode={m.mode} placed={SLOTS} broken={NO_BROKEN} compact />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between px-0.5">
              <span className="text-[11px] font-bold text-gray-500">使える容量</span>
              <span className="text-sm font-bold text-brand-700">{usableDisks(m.mode)}TB</span>
            </div>
            <div className="flex items-baseline justify-between px-0.5">
              <span className="text-[11px] font-bold text-gray-500">壊れてOK</span>
              <span className="text-[11px] font-bold text-gray-700">{m.tolerate}</span>
            </div>
          </div>
        ))}
      </div>
      <Legend kinds={["data", "copy", "p", "q"]} />
      <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
        💡 <b className="text-gray-800">青（データ）が多いほど容量は大きく、青以外が多いほど故障に強い</b>。容量と安全はトレードオフです。
      </p>
    </Panel>
  );
}
