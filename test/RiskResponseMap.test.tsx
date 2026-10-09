// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RiskResponseMap } from "@/components/experiences/risk/RiskResponseMap";

afterEach(cleanup);

describe("RiskResponseMap", () => {
  it("lays out the four responses as a 2x2 picture map in risk-matrix order, all visible at once", () => {
    render(<RiskResponseMap />);
    const cells = Array.from(screen.getByTestId("risk-resp-map").querySelectorAll<HTMLElement>("[data-resp]"));
    // 左上→右上→左下→右下 ＝ 移転・回避・受容・低減
    expect(cells.map((c) => c.dataset.resp)).toEqual(["transfer", "avoid", "accept", "mitigate"]);
    for (const c of cells) expect(c.querySelector("svg")).not.toBeNull();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(cells[3]).toHaveTextContent("リスク低減");
    expect(cells[3]).toHaveTextContent("軽減ともいう");
    expect(cells[3]).toHaveTextContent("バックアップ");
  });
});
