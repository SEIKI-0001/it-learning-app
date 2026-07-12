// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Mochit from "@/components/mochit/Mochit";

describe("Mochit", () => {
  it("selects the requested state image and presents its message", () => {
    render(
      <Mochit
        state="happy"
        size="medium"
        message="いいね。知識がつながってきた！"
        animation="bounce"
        growthStage={3}
      />,
    );

    expect(screen.getByRole("img", { name: "よろこぶモチット" })).toHaveAttribute(
      "src",
      expect.stringContaining("%2Fcharacters%2Fmochit%2Fhappy.webp"),
    );
    expect(screen.getByText("いいね。知識がつながってきた！")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "よろこぶモチット" })).toHaveClass("mochit-growth-3");
  });
});
