"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { RoadmapNode } from "./mapConfig";
import { ROADMAP_STATUS_LABEL } from "./mapConfig";

const statusStyle = {
  done: "bg-emerald-100 text-emerald-800",
  current: "bg-indigo-100 text-indigo-800",
  upcoming: "bg-stone-100 text-stone-700",
  goal: "bg-amber-100 text-amber-900",
} as const;

export default function MapDetailSheet({
  node,
  onClose,
}: {
  node: RoadmapNode;
  onClose: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showsProgress = node.status === "current" || node.status === "done";
  const progressStyle =
    node.status === "done"
      ? {
          card: "bg-emerald-50 ring-emerald-100",
          text: "text-emerald-900",
          value: "text-emerald-800",
          bar: "bg-emerald-600",
        }
      : {
          card: "bg-indigo-50 ring-indigo-100",
          text: "text-indigo-900",
          value: "text-indigo-800",
          bar: "bg-indigo-600",
        };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 md:items-center md:p-6"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${node.place}の詳細`}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl md:max-h-[82vh] md:rounded-3xl md:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1.5 w-11 rounded-full bg-slate-200 md:hidden" />
        <div className="flex items-start gap-3">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-amber-50 ring-1 ring-amber-100">
            {!imageFailed ? (
              <Image
                src={node.landmarkSrc}
                alt=""
                fill
                sizes="96px"
                className="object-contain p-1"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="grid h-full place-items-center text-4xl" aria-hidden>
                {node.emoji}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-lg font-black text-slate-900">{node.place}</p>
            <p className="text-xs font-bold text-slate-500">
              {node.kind === "goal" ? "最終目的地" : `ステージ${node.stage}`}・{node.title}
            </p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${statusStyle[node.status]}`}>
              {ROADMAP_STATUS_LABEL[node.status]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg text-slate-500 transition hover:bg-slate-100 active:scale-95"
            aria-label="詳細を閉じる"
          >
            ×
          </button>
        </div>

        <p className="mt-5 text-sm font-semibold leading-relaxed text-slate-700">{node.summary}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{node.detail}</p>

        {showsProgress && (
          <div className={`mt-5 rounded-2xl p-4 ring-1 ${progressStyle.card}`}>
            <div className="flex items-center justify-between gap-3">
              <p className={`text-sm font-extrabold ${progressStyle.text}`}>現在ステージの達成度</p>
              <span className={`text-sm font-black ${progressStyle.value}`}>{node.progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div className={`h-full rounded-full ${progressStyle.bar}`} style={{ width: `${node.progress}%` }} />
            </div>
            {node.status === "current" && node.hint && (
              <p className={`mt-2 text-xs font-semibold ${progressStyle.value}`}>{node.hint}</p>
            )}
          </div>
        )}

        <section className="mt-5">
          <h3 className="text-sm font-black text-slate-900">このステージのチェックポイント</h3>
          <ul className="mt-2 space-y-2">
            {node.checkpoints.map((checkpoint) => (
              <li key={checkpoint} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                <span className="mt-0.5 text-emerald-600" aria-hidden>✓</span>
                <span>{checkpoint}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
          <h3 className="text-sm font-black text-amber-950">次へ進む目安</h3>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">{node.completionGoal}</p>
        </section>
      </section>
    </div>
  );
}
