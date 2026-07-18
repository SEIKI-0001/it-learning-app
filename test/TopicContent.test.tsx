import { describe, expect, it } from "vitest";
import { buildExplanationSlides } from "@/components/learn/TopicContent";
import { topics } from "@/data/topics";

describe("buildExplanationSlides", () => {
  it("uses the experience's own panels as its explanation slides", () => {
    const topicWithExperience = topics.find(
      (topic) => topic.id === "strat-enterprise-activities",
    );

    expect(topicWithExperience).toBeDefined();
    const slides = buildExplanationSlides(topicWithExperience!);

    expect(slides.map((slide) => slide.id)).toEqual(["experience"]);
  });
});
