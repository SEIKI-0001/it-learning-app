// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GrowthCheckCard from "@/components/today/GrowthCheckCard";

// 出す・出さないの判定は lib/growthCheck が持つ。ここは受け取った可否に従うだけ。

afterEach(cleanup);

describe("GrowthCheckCard", () => {
  it("renders nothing when the gate is closed", () => {
    const { container } = render(<GrowthCheckCard available={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("links to the growth check when the gate is open", () => {
    render(<GrowthCheckCard available />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/growth-check");
    expect(screen.getByText("ここまでの成長をふりかえる")).toBeInTheDocument();
  });

  it("frames itself as looking back, not as new practice", () => {
    const { container } = render(<GrowthCheckCard available />);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/XP|宝箱|バッジ/);
    // 「問を解く」ではなく記録のふりかえりとして誘う。
    expect(text).toMatch(/以前 → 現在/);
  });
});
