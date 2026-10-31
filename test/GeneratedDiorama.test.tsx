// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ExplainPlayer from "@/components/explain3d/ExplainPlayer";
import { parseGeneratedScene } from "@/lib/explain3d/sceneSpec";
import { DEV_STUB_OUTPUT } from "@/lib/ai/explain3d";

afterEach(cleanup);

describe("ExplainPlayer（WebGL が無い端末＝CSS の模型）", () => {
  it("コマを進めると、運ぶ物の札・画面・光る物が変わる", () => {
    const scene = parseGeneratedScene(DEV_STUB_OUTPUT.scene)!;
    render(<ExplainPlayer scene={scene} />);
    expect(screen.getByTestId("explain-scene")).toHaveAttribute("data-scene", "flat");
    expect(screen.getByTestId("explain-step-title")).toHaveTextContent("URLを入力");
    expect(screen.getByTestId("explain-screen")).toHaveTextContent("example.com");
    expect(screen.queryByTestId("explain-carry")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(screen.getByTestId("explain-step-title")).toHaveTextContent("Wi-Fiへ");
    expect(screen.getByTestId("explain-carry")).toHaveTextContent("GET /index.html");
    expect(document.querySelector('[data-actor="pc"]')).toHaveAttribute("data-state", "active");
  });
});
