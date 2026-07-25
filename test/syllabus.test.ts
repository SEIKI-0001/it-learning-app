import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SyllabusPage, { SYLLABUS, validateSyllabus } from "@/app/syllabus/page";
import { getAllTopics } from "@/lib/content";

vi.mock("next/navigation", () => ({
  usePathname: () => "/syllabus",
}));

describe("syllabus coverage", () => {
  it("links every syllabus item to complete learning content", () => {
    expect(validateSyllabus(SYLLABUS, getAllTopics())).toEqual([]);
  });

  it("guides beginners through the CBT exam and scoring conditions", () => {
    const page = renderToStaticMarkup(SyllabusPage());

    expect(page).toContain("CBT方式");
    expect(page).toContain("総合評価点600点以上");
    expect(page).toContain("各分野別評価点300点以上");
    expect(page).toContain('href="/learn"');
  });
});
