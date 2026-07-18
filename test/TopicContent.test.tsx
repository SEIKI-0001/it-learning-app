import { describe, expect, it } from "vitest";
import { buildExplanationSlides } from "@/components/learn/TopicContent";
import { topics } from "@/data/topics";

describe("buildExplanationSlides", () => {
  it("keeps the common explanation slides after a topic experience", () => {
    const topicWithExperience = topics.find(
      (topic) => topic.id === "strat-enterprise-activities",
    );

    expect(topicWithExperience).toBeDefined();
    const slides = buildExplanationSlides(topicWithExperience!);

    expect(slides.map((slide) => slide.id)).toEqual([
      "experience",
      "concept",
      "exam-points",
    ]);
  });
});
