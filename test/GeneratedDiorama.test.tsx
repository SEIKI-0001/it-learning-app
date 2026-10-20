// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GeneratedDiorama from "@/components/explain3d/GeneratedDiorama";
import { parseGeneratedScene } from "@/lib/explain3d/sceneSpec";
import { DEV_STUB_OUTPUT } from "@/lib/ai/explain3d";

afterEach(cleanup);

describe("GeneratedDiorama", () => {
  it("コマを進めると、運ぶ物の札と光る物が変わる", () => {
    const scene = parseGeneratedScene(DEV_STUB_OUTPUT.scene)!;
    render(<GeneratedDiorama scene={scene} />);
    expect(screen.getByTestId("explain-step-title")).toHaveTextContent("URLを入力");
    expect(screen.queryByTestId("explain-carry")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(screen.getByTestId("explain-step-title")).toHaveTextContent("リクエスト");
    expect(screen.getByTestId("explain-carry")).toHaveTextContent("GET /index.html");
    const pc = document.querySelector('[data-actor="pc"]');
    expect(pc).toHaveAttribute("data-state", "active");
  });
});
