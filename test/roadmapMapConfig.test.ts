import { describe, expect, it } from "vitest";
import {
  ROADMAP_GOAL,
  ROADMAP_STAGES,
} from "@/components/roadmap-map/mapConfig";

describe("roadmap map configuration", () => {
  it("maps every phase and the goal to its configured artwork and coordinates", () => {
    expect(ROADMAP_STAGES).toHaveLength(7);
    expect(
      ROADMAP_STAGES.map((stage) => [
        stage.id,
        stage.place,
        stage.landmarkSrc,
        stage.x,
        stage.y,
      ]),
    ).toEqual([
      ["phase0", "旅立ちの村", "/maps/roadmap/landmarks/village.webp", 24, 107],
      ["phase1", "見晴らしの丘", "/maps/roadmap/landmarks/hill.webp", 62, 99],
      ["phase2", "賢者の森", "/maps/roadmap/landmarks/forest.webp", 28, 85],
      ["phase3", "修練の平原", "/maps/roadmap/landmarks/plains.webp", 69, 72],
      ["phase4", "霧の沼", "/maps/roadmap/landmarks/swamp.webp", 29, 59],
      ["phase5", "試練の峡谷", "/maps/roadmap/landmarks/canyon.webp", 68, 45],
      ["phase6", "最後の関所", "/maps/roadmap/landmarks/gate.webp", 35, 31],
    ]);
    expect(ROADMAP_GOAL).toMatchObject({
      place: "合格の城",
      landmarkSrc: "/maps/roadmap/landmarks/castle.webp",
      x: 57,
      y: 22,
    });
  });
});
