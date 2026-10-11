// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CyberAttacksExperience from "@/components/experiences/CyberAttacksExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import { PHASE_MS } from "@/components/experiences/scene/usePhasePlayer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <CyberAttacksExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
/** 今の STEP の場面を最後まで流す */
const playPhases = () =>
  act(() => {
    vi.advanceTimersByTime(PHASE_MS * 4);
  });
const next = () => {
  playPhases();
  click("次のSTEPへ");
};
/** 最後の STEP の最後の場面まで進める */
const toEnd = () => {
  for (let i = 0; i < 4; i++) {
    playPhases();
    const btn = screen.getByRole("button", { name: "次のSTEPへ" }) as HTMLButtonElement;
    if (btn.disabled) break;
    fireEvent.click(btn);
  }
  playPhases();
};
const scene = () => screen.getByTestId("cyber-scene");
const lane = (id: string) => scene().querySelector(`[data-lane="${id}"]`);
const payload = () => screen.getByTestId("cyber-payload");
const bubble = () => screen.getByTestId("cyber-bubble");

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

  it("plays the scenes of a STEP automatically and waits for the user before the next STEP", () => {
    renderDeck();
    click(/SQLインジェクション/);
    expect(bubble()).toHaveTextContent("命令文");
    expect(bubble()).toHaveAttribute("data-target", "attacker");
    const nextBtn = screen.getByRole("button", { name: "次のSTEPへ" });
    expect(nextBtn).toBeDisabled();
    playPhases();
    expect(bubble()).toHaveAttribute("data-target", "web");
    expect(payload()).toHaveAttribute("data-stop", "web");
    // 最後の場面で止まり、STEP は勝手に進まない
    playPhases();
    expect(screen.getByTestId("cyber-step-title")).toHaveTextContent("入力欄に命令文を混ぜる");
    expect(nextBtn).toBeEnabled();
    expect(screen.getByTestId("cyber-play")).toHaveAttribute("data-state", "done");
  });

  it("keeps every bubble short (35 characters or less)", () => {
    renderDeck();
    for (const name of [/DDoS/, /SQLインジェクション/, /クロスサイト/, /標的型攻撃/, /ソーシャルエンジニアリング/]) {
      click(name);
      for (let i = 0; i < 4; i++) {
        expect(bubble().textContent!.length).toBeLessThanOrEqual(35);
        act(() => {
          vi.advanceTimersByTime(PHASE_MS);
        });
        expect(bubble().textContent!.length).toBeLessThanOrEqual(35);
        const btn = screen.getByRole("button", { name: "次のSTEPへ" }) as HTMLButtonElement;
        if (!btn.disabled) fireEvent.click(btn);
      }
    }
  });

  it("pauses the scenes while the detail is open", () => {
    renderDeck();
    click(/DDoS/);
    const details = screen.getByTestId("cyber-detail").closest("details")!;
    act(() => {
      details.open = true;
      details.dispatchEvent(new Event("toggle"));
    });
    playPhases();
    expect(bubble()).toHaveAttribute("data-target", "attacker");
    expect(screen.getByTestId("cyber-detail")).toHaveTextContent("踏み台");
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
    next();
    playPhases();
    expect(payload()).toHaveAttribute("data-stop", "db");
    next();
    playPhases();
    expect(payload()).toHaveAttribute("data-stop", "attacker");
    expect(payload()).toHaveTextContent("会員データ");
    expect(screen.getByTestId("damage-db")).toBeInTheDocument();
    expect(screen.getByTestId("cyber-result")).toBeInTheDocument();
  });

  it("XSS plants a trap on the Web server and it runs in the user's browser", () => {
    renderDeck();
    click(/クロスサイト/);
    playPhases();
    expect(payload()).toHaveAttribute("data-stop", "web");
    next();
    playPhases();
    expect(payload()).toHaveAttribute("data-stop", "user");
    toEnd();
    expect(screen.getByTestId("damage-user")).toBeInTheDocument();
  });

  it("targeted mail and social engineering hit the employee (people), not the server first", () => {
    renderDeck();
    click(/標的型攻撃/);
    expect(screen.getByTestId("cyber-target")).toHaveTextContent("人");
    playPhases();
    expect(payload()).toHaveAttribute("data-stop", "staff");
    toEnd();
    expect(screen.getByTestId("damage-staff")).toHaveTextContent("感染");

    click(/ソーシャルエンジニアリング/);
    playPhases();
    expect(lane("as")).toHaveAttribute("data-state", "active");
    toEnd();
    expect(payload()).toHaveTextContent("パスワード");
    expect(screen.getByTestId("damage-staff")).toHaveTextContent("パスワード流出");
  });

  it("shows the machine/people insight after all five attacks reach their damage", () => {
    renderDeck();
    for (const name of [/DDoS/, /SQLインジェクション/, /クロスサイト/, /標的型攻撃/, /ソーシャルエンジニアリング/]) {
      click(name);
      toEnd();
    }
    expect(screen.getByTestId("cyber-insight")).toHaveTextContent("機械");
  });
});
