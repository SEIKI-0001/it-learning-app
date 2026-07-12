import type { StudyPhaseId } from "@/types/plan";

export const MAP_VIEWBOX = { width: 100, height: 130 } as const;

export type MapLabelOffset = "left" | "right" | "center";

export type MapStageConfig = {
  id: StudyPhaseId;
  place: string;
  landmarkSrc: string;
  landmarkSize: number;
  x: number;
  y: number;
  labelOffset: MapLabelOffset;
};

export type MapGoalConfig = Omit<MapStageConfig, "id"> & {
  id: "goal";
};

export const ROADMAP_STAGES: readonly MapStageConfig[] = [
  {
    id: "phase0",
    place: "旅立ちの村",
    landmarkSrc: "/maps/roadmap/landmarks/village.webp",
    landmarkSize: 512,
    x: 24,
    y: 107,
    labelOffset: "left",
  },
  {
    id: "phase1",
    place: "見晴らしの丘",
    landmarkSrc: "/maps/roadmap/landmarks/hill.webp",
    landmarkSize: 512,
    x: 62,
    y: 99,
    labelOffset: "right",
  },
  {
    id: "phase2",
    place: "賢者の森",
    landmarkSrc: "/maps/roadmap/landmarks/forest.webp",
    landmarkSize: 512,
    x: 28,
    y: 85,
    labelOffset: "left",
  },
  {
    id: "phase3",
    place: "修練の平原",
    landmarkSrc: "/maps/roadmap/landmarks/plains.webp",
    landmarkSize: 512,
    x: 69,
    y: 72,
    labelOffset: "right",
  },
  {
    id: "phase4",
    place: "霧の沼",
    landmarkSrc: "/maps/roadmap/landmarks/swamp.webp",
    landmarkSize: 512,
    x: 29,
    y: 59,
    labelOffset: "left",
  },
  {
    id: "phase5",
    place: "試練の峡谷",
    landmarkSrc: "/maps/roadmap/landmarks/canyon.webp",
    landmarkSize: 512,
    x: 68,
    y: 45,
    labelOffset: "right",
  },
  {
    id: "phase6",
    place: "最後の関所",
    landmarkSrc: "/maps/roadmap/landmarks/gate.webp",
    landmarkSize: 512,
    x: 35,
    y: 31,
    labelOffset: "left",
  },
] as const;

export const ROADMAP_GOAL: MapGoalConfig = {
  id: "goal",
  place: "合格の城",
  landmarkSrc: "/maps/roadmap/landmarks/castle.webp",
  landmarkSize: 512,
  x: 57,
  y: 22,
  labelOffset: "right",
};

export const ROADMAP_STATUS_LABEL = {
  done: "クリア済み",
  current: "いまここ",
  upcoming: "これから",
  goal: "ゴール",
} as const;
