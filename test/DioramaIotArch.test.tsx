// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import IotExperience from "@/components/experiences/IotExperience";
import ProcessingArchitectureExperience from "@/components/experiences/ProcessingArchitectureExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

// IoT（家とクラウド）と処理形態（コンビニチェーン）の3D模型。選ぶ・次へで模型の状態が変わることを確かめる。

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderDeck(Experience: () => React.ReactElement) {
  render(
    <ExperienceSlideDeck>
      <Experience />
    </ExperienceSlideDeck>,
  );
}

describe("IoT の一周（家とクラウドの模型）", () => {
  it("measures, sends, decides in the cloud, then the air conditioner cools the room", () => {
    vi.useFakeTimers();
    renderDeck(IotExperience);
    const scene = screen.getByTestId("iot-scene");
    const next = () => fireEvent.click(screen.getByRole("button", { name: /次へ →|自動で完結/ }));
    expect(scene).toHaveAttribute("data-phase", "0");
    expect(scene).toHaveTextContent("室温 32℃");
    next();
    next();
    expect(screen.getByTestId("iot-decision")).toHaveTextContent("28℃まで冷やす");
    next();
    // 指示を運んでいる間はまだ冷えない。エアコンに着いてから冷房が動く
    expect(scene).toHaveAttribute("data-cooled", "false");
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(scene).toHaveAttribute("data-cooled", "true");
    expect(scene).toHaveTextContent("自動で冷房");
  });
});

describe("処理形態（コンビニチェーンの模型）", () => {
  it("switches between central / distributed / client-server / three-tier / P2P", () => {
    renderDeck(ProcessingArchitectureExperience);
    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    const scene = screen.getByTestId("arch-scene");
    fireEvent.click(screen.getByRole("button", { name: "集中処理" }));
    expect(scene).toHaveAttribute("data-mode", "central");
    expect(screen.getByTestId("arch-hq-servers")).toHaveAttribute("data-on", "true");
    fireEvent.click(screen.getByRole("button", { name: "P2P" }));
    expect(screen.getByTestId("arch-hq-servers")).toHaveAttribute("data-on", "false");
    expect(screen.getByTestId("arch-peer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "三層" }));
    expect(screen.getByTestId("arch-result")).toHaveTextContent("3つの層");
    expect(scene).toHaveTextContent("③データ（DB）");
  });
});
