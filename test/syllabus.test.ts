import { describe, expect, it } from "vitest";
import { SYLLABUS, validateSyllabus } from "@/app/syllabus/page";
import { getAllTopics } from "@/lib/content";

describe("syllabus coverage", () => {
  it("links every syllabus item to complete learning content", () => {
    expect(validateSyllabus(SYLLABUS, getAllTopics())).toEqual([]);
  });
});
