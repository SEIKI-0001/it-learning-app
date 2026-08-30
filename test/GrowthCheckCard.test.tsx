// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GrowthCheckCard from "@/components/today/GrowthCheckCard";

// AC「過去比較材料がないユーザーには表示しない」の表示側。

afterEach(cleanup);

describe("GrowthCheckCard", () => {
  it("renders nothing when there is no material", () => {
    const { container } = render(<GrowthCheckCard questionCount={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a negative count", () => {
    const { container } = render(<GrowthCheckCard questionCount={-1} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("links to the growth check with the question count", () => {
    render(<GrowthCheckCard questionCount={3} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/growth-check");
    expect(screen.getByText(/以前つまずいた3問/)).toBeInTheDocument();
  });

  it("does not frame itself as a game reward", () => {
    const { container } = render(<GrowthCheckCard questionCount={3} />);

    expect(container.textContent).not.toMatch(/XP|宝箱|バッジ/);
  });
});
