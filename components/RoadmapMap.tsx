"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PhaseProgress, StudyPhaseId } from "@/types/plan";
import { STUDY_PHASES } from "@/lib/studyPlanner";
import MapBackground from "./roadmap-map/MapBackground";
import MapDetailSheet from "./roadmap-map/MapDetailSheet";
import MapFog from "./roadmap-map/MapFog";
import MapNodes from "./roadmap-map/MapNodes";
import MapRoute from "./roadmap-map/MapRoute";
import {
  MAP_VIEWBOX,
  ROADMAP_GOAL,
  ROADMAP_STAGES,
  type RoadmapNode,
} from "./roadmap-map/mapConfig";

const SEEN_REVEALED_KEY = "fequest:seenRevealedPhases";

function readSeenRevealed(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_REVEALED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function buildNodes(phases: PhaseProgress[]): RoadmapNode[] {
  const phaseNodes = phases.flatMap((phase) => {
    const definition = STUDY_PHASES.find((item) => item.id === phase.id);
    const config = ROADMAP_STAGES.find((item) => item.id === phase.id);
    if (!definition || !config) return [];

    return [{
      key: phase.id,
      kind: "phase" as const,
      emoji: definition.emoji,
      title: definition.title,
      summary: definition.summary,
      detail: definition.detail,
      checkpoints: definition.checkpoints,
      completionGoal: definition.completionGoal,
      status: phase.status,
      progress: phase.progress,
      hint: phase.hint,
      stage: definition.order + 1,
      ...config,
    }];
  });
  const allDone = phases.length > 0 && phases.every((phase) => phase.status === "done");

  const goal: RoadmapNode = {
    key: "goal",
    kind: "goal",
    emoji: "🎓",
    title: "合格",
    summary: "ここまで来たら本番。積み上げてきた力を落ち着いて発揮しましょう。",
    detail:
      "ロードマップの最後は、学んだ知識を本番で使う段階です。取れる問題を確実に進め、迷う問題には印をつけて最後に戻り、全体の時間を守ります。",
    checkpoints: [
      "最初から完璧に解こうとせず、解ける問題を先に進める",
      "迷った問題には印をつけ、最後に戻る",
      "頻出テーマと自分の誤答パターンを思い出す",
    ],
    completionGoal: "これまで積み上げた学習を、試験時間内で落ち着いて発揮することがゴールです。",
    status: "goal",
    progress: allDone ? 100 : 0,
    hint: "",
    stage: 0,
    ...ROADMAP_GOAL,
  };

  return [...phaseNodes, goal];
}

/**
 * 合格までの進み具合を、チェックポイント進捗に連動する冒険地図として表示する。
 * `phases` は buildCheckpointRoadmap の結果を受け取るため、進捗判定はこの表示層で行わない。
 */
export default function RoadmapMap({
  phases,
  expectedPhaseId = null,
}: {
  phases: PhaseProgress[];
  expectedPhaseId?: StudyPhaseId | null;
}) {
  const [selected, setSelected] = useState<RoadmapNode | null>(null);
  const [clearingKeys, setClearingKeys] = useState<string[]>([]);
  const nodes = useMemo(() => buildNodes(phases), [phases]);
  const revealedSignature = phases
    .filter((phase) => phase.status !== "upcoming")
    .map((phase) => phase.id)
    .join(",");

  useEffect(() => {
    const seen = readSeenRevealed();
    const revealed = revealedSignature ? revealedSignature.split(",") : [];
    const newlyRevealed = revealed.filter((id) => !seen.includes(id));
    try {
      localStorage.setItem(SEEN_REVEALED_KEY, JSON.stringify(revealed));
    } catch {
      // ストレージが使えない環境では演出だけを省略し、地図の操作は継続する。
    }
    if (seen.length > 0 && newlyRevealed.length > 0) {
      setClearingKeys(newlyRevealed);
    }
  }, [revealedSignature]);

  const closeSheet = useCallback(() => setSelected(null), []);

  return (
    <div>
      <div
        className="relative mx-auto aspect-[100/130] w-full max-w-md overflow-hidden rounded-[2rem] bg-sky-700 shadow-[0_18px_40px_rgba(15,23,42,0.22)] ring-2 ring-slate-900/20 md:max-w-lg"
        style={{ aspectRatio: `${MAP_VIEWBOX.width} / ${MAP_VIEWBOX.height}` }}
      >
        <MapBackground />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/5" aria-hidden />
        <MapRoute nodes={nodes} clearingKeys={clearingKeys} />
        <MapFog nodes={nodes} clearingKeys={clearingKeys} />
        <div className="pointer-events-none absolute left-4 top-4 z-30 rounded-full bg-white/88 px-3 py-1 text-[11px] font-black tracking-wide text-slate-800 shadow ring-1 ring-white/70 backdrop-blur-sm" aria-hidden>
          合格への冒険地図
        </div>
        <MapNodes nodes={nodes} expectedPhaseId={expectedPhaseId} onSelect={setSelected} />
      </div>

      <p className="mt-3 text-center text-xs font-medium text-slate-500">
        地図のステージをタップすると詳細が見られます
      </p>

      {selected && <MapDetailSheet node={selected} onClose={closeSheet} />}
    </div>
  );
}
