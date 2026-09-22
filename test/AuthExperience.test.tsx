// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthExperience from "@/components/experiences/AuthExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <AuthExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const runAll = () => {
  for (let i = 0; i < 4; i++) act(() => void vi.advanceTimersByTime(1600));
};
const flow = () => screen.getByTestId("auth-flow");

describe("AuthExperience", () => {
  it("a general employee passes authentication but is stopped at authorization for the admin screen", () => {
    renderDeck();
    click(/アクセスしてみる/);
    runAll();
    expect(screen.getByTestId("auth-gate-authn")).toHaveAttribute("data-state", "ok");
    expect(screen.getByTestId("auth-gate-authz")).toHaveAttribute("data-state", "ng");
    expect(flow()).toHaveAttribute("data-at", "2");
    expect(screen.getByTestId("auth-badge")).toHaveTextContent("田中さん");
    expect(screen.getByTestId("auth-result")).toHaveTextContent("認可で止まる");
  });

  it("the same employee reaches their own payslip; an admin reaches the admin screen", () => {
    renderDeck();
    click(/自分の給与明細/);
    click(/アクセスしてみる/);
    runAll();
    expect(flow()).toHaveAttribute("data-at", "3");
    click(/佐藤さん/);
    click(/管理画面/);
    click(/アクセスしてみる/);
    runAll();
    expect(flow()).toHaveAttribute("data-at", "3");
    expect(screen.getByTestId("auth-result")).toHaveTextContent("認証→認可の両方を通過");
  });

  it("a wrong password is stopped at authentication", () => {
    renderDeck();
    click(/パスワード違い/);
    click(/アクセスしてみる/);
    runAll();
    expect(screen.getByTestId("auth-gate-authn")).toHaveAttribute("data-state", "ng");
    expect(flow()).toHaveAttribute("data-at", "1");
  });

  it("MFA opens the door only with two different kinds of factors", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByTestId("mfa-door")).toHaveAttribute("data-open", "true");
    click(/スマホ認証アプリ/);
    click(/PIN/);
    expect(screen.getByTestId("mfa-slot-知識（記憶）")).toHaveAttribute("data-count", "2");
    expect(screen.getByTestId("mfa-door")).toHaveAttribute("data-open", "false");
    expect(screen.getByText(/単要素です/)).toBeInTheDocument();
    click(/指紋/);
    expect(screen.getByTestId("mfa-door")).toHaveAttribute("data-open", "true");
  });

  it("keeps the authentication / authorization quiz", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByText("どっち？（認証 or 認可）")).toBeInTheDocument();
  });
});
