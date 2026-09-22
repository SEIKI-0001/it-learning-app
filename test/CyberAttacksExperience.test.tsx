// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CyberAttacksExperience from "@/components/experiences/CyberAttacksExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <CyberAttacksExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const toEnd = () => {
  for (let i = 0; i < 4; i++) {
    const next = screen.getByRole("button", { name: "1ステップ進む" });
    if (!(next as HTMLButtonElement).disabled) fireEvent.click(next);
  }
};
const scene = () => screen.getByTestId("cyber-scene");
const lane = (id: string) => scene().querySelector(`[data-lane="${id}"]`);
const payload = () => screen.getByTestId("cyber-payload");

describe("CyberAttacksExperience", () => {
  it("keeps the lab, the quiz and the summary", () => {
    renderDeck();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    for (const id of ["attacker", "internet", "web", "db", "user", "staff"]) {
      expect(scene().querySelector(`[data-node="${id}"]`)).not.toBeNull();
    }
    click("解説2");
    expect(screen.getByText("これはどの攻撃？")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("まとめ")).toBeInTheDocument();
  });

  it("DDoS floods Internet → Web server; the server goes down and users cannot connect", () => {
    renderDeck();
    click(/DDoS/);
    expect(screen.getByTestId("cyber-target")).toHaveTextContent("機械");
    toEnd();
    expect(scene().querySelectorAll('[data-flood="iw"]').length).toBeGreaterThan(0);
    expect(screen.getByTestId("damage-web")).toHaveTextContent("ダウン");
    expect(lane("ui")).toHaveAttribute("data-state", "blocked");
  });

  it("SQL injection travels input → Web → DB and data leaks back to the attacker", () => {
    renderDeck();
    click(/SQLインジェクション/);
    click("1ステップ進む");
    expect(payload()).toHaveAttribute("data-stop", "web");
    click("1ステップ進む");
    expect(payload()).toHaveAttribute("data-stop", "db");
    click("1ステップ進む");
    expect(payload()).toHaveAttribute("data-stop", "attacker");
    expect(payload()).toHaveTextContent("会員データ");
    expect(screen.getByTestId("damage-db")).toBeInTheDocument();
  });

  it("XSS plants a trap on the Web server and it runs in the user's browser", () => {
    renderDeck();
    click(/XSS/);
    expect(payload()).toHaveAttribute("data-stop", "web");
    click("1ステップ進む");
    click("1ステップ進む");
    expect(payload()).toHaveAttribute("data-stop", "user");
    click("1ステップ進む");
    expect(screen.getByTestId("damage-user")).toBeInTheDocument();
  });

  it("targeted mail and social engineering hit the employee (people), not the server first", () => {
    renderDeck();
    click(/標的型攻撃/);
    expect(screen.getByTestId("cyber-target")).toHaveTextContent("人");
    expect(payload()).toHaveAttribute("data-stop", "staff");
    toEnd();
    expect(screen.getByTestId("damage-staff")).toHaveTextContent("感染");

    click(/ソーシャルエンジニアリング/);
    expect(lane("as")).toHaveAttribute("data-state", "active");
    toEnd();
    expect(payload()).toHaveTextContent("パスワード");
    expect(screen.getByTestId("damage-staff")).toHaveTextContent("パスワード流出");
  });

  it("shows the machine/people insight after all five attacks reach their damage", () => {
    renderDeck();
    for (const name of [/DDoS/, /SQLインジェクション/, /XSS/, /標的型攻撃/, /ソーシャルエンジニアリング/]) {
      click(name);
      toEnd();
    }
    expect(screen.getByTestId("cyber-insight")).toHaveTextContent("機械");
  });
});
