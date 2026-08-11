// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LearnHome from "@/components/learn/LearnHome";

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [null],
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/learn",
}));

afterEach(cleanup);

describe("LearnHome", () => {
  it("opens a theme inline to show its sections and lessons", () => {
    render(<LearnHome />);

    fireEvent.click(screen.getByRole("button", { name: "企業活動を開く" }));

    expect(screen.getByRole("button", { name: "企業活動を閉じる" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("heading", { name: "1. 企業のしくみ" })).toBeInTheDocument();
    expect(screen.getByText("企業活動とステークホルダ")).toBeInTheDocument();
  });

  it("links to the theme exam from the page and from the opened chapter", () => {
    render(
      <LearnHome
        themeExams={[
          { themeSlug: "enterprise-activities", questionCount: 10, passRate: 60 },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /章を選んで解く/ })).toHaveAttribute(
      "href",
      "/theme-exam",
    );

    fireEvent.click(screen.getByRole("button", { name: "企業活動を開く" }));
    expect(screen.getByRole("link", { name: /総まとめ試験/ })).toHaveAttribute(
      "href",
      "/theme-exam/enterprise-activities",
    );
  });

  it("opens and closes only the currently visible themes in bulk", () => {
    render(<LearnHome />);

    fireEvent.click(screen.getByRole("button", { name: "ストラテジ" }));
    fireEvent.click(screen.getByRole("button", { name: "すべて開く" }));

    expect(screen.getByRole("button", { name: "企業活動を閉じる" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "マネジメント" }));
    expect(screen.getByRole("button", { name: "システム開発を開く" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "ストラテジ" }));
    fireEvent.click(screen.getByRole("button", { name: "すべて閉じる" }));
    expect(screen.getByRole("button", { name: "企業活動を開く" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
