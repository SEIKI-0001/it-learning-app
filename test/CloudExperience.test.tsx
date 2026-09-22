// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CloudExperience from "@/components/experiences/CloudExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <CloudExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const owners = () => [0, 1, 2, 3, 4].map((i) => screen.getByTestId(`cloud-layer-${i}`).getAttribute("data-owner"));

describe("CloudExperience responsibility stack", () => {
  it("the ownership boundary climbs from on-premise to SaaS", () => {
    renderDeck();
    click("解説2");
    expect(owners()).toEqual(["you", "you", "you", "you", "you"]);
    expect(screen.queryByTestId("cloud-boundary")).not.toBeInTheDocument();

    click(/^IaaS$/);
    expect(owners()).toEqual(["you", "you", "you", "you", "provider"]);
    expect(screen.getByTestId("cloud-boundary")).toBeInTheDocument();

    click(/^PaaS$/);
    // PaaS：OSや開発・実行環境まで事業者、アプリとデータは自分
    expect(owners()).toEqual(["you", "you", "provider", "provider", "provider"]);
    expect(screen.getByText(/あなたが管理するのは/)).toHaveTextContent("2層");

    click(/^SaaS$/);
    expect(owners()).toEqual(["provider", "provider", "provider", "provider", "provider"]);
    expect(screen.getByText(/あとは使うだけ/)).toBeInTheDocument();
  });

  it("IaaS leaves the OS to the user", () => {
    renderDeck();
    click("解説2");
    click(/^IaaS$/);
    expect(screen.getByTestId("cloud-layer-3")).toHaveTextContent("OS");
    expect(screen.getByTestId("cloud-layer-3")).toHaveAttribute("data-owner", "you");
  });

  it("mentions pay-per-use and keeps the quiz", () => {
    renderDeck();
    expect(screen.getByText("従量課金")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByRole("heading", { name: /これはどれ？/ })).toBeInTheDocument();
  });
});
