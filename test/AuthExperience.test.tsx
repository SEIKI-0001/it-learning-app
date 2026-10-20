// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

describe("過去問の出題に合わせた4枚（解説4〜7）", () => {
  it("sorts examples into knowledge / possession / biometrics and judges two-factor additions", () => {
    renderDeck();
    expect(screen.getByText("1 / 7")).toBeInTheDocument();
    click("解説4");
    const ex = screen.getByTestId("factor-examples");
    expect(within(ex).getByText("スマホに届くSMSのコード").closest("li")).toHaveAttribute("data-factor", "所持");
    expect(within(ex).getByText("筆跡・筆圧・キー入力のタイミング").closest("li")).toHaveAttribute("data-factor", "生体");
    const two = screen.getByTestId("two-factor");
    expect(within(two).getByText("秘密の質問に答える").closest("li")).toHaveAttribute("data-ok", "false");
    expect(within(two).getByText("ICカードを読み取る").closest("li")).toHaveAttribute("data-ok", "true");
  });

  it("stricter matching lowers false acceptance but raises false rejection", () => {
    renderDeck();
    click("解説5");
    const far = () => Number(screen.getByTestId("bio-far").getAttribute("data-value"));
    const frr = () => Number(screen.getByTestId("bio-frr").getAttribute("data-value"));
    click("厳しく照合");
    expect(far()).toBeLessThan(frr());
    expect(screen.getByTestId("bio-focus")).toHaveTextContent("安全性を重視");
    click("ゆるく照合");
    expect(far()).toBeGreaterThan(frr());
    expect(screen.getByTestId("bio-focus")).toHaveTextContent("利便性を重視");
    expect(screen.getByTestId("bio-rule")).toHaveTextContent("本人拒否率を低く抑える利便性を重視");
  });

  it("names risk-based and challenge-response authentication and their look-alikes", () => {
    renderDeck();
    click("解説6");
    const terms = screen.getByTestId("auth-terms");
    expect(terms.querySelector('[data-term="リスクベース認証"]')).toHaveTextContent("危険が高いときだけ");
    expect(terms.querySelector('[data-term="CAPTCHA"]')).toHaveTextContent("バイオメトリクス認証ではない");
    expect(screen.getByTestId("riskbased-not")).toHaveTextContent("アカウントロック");
  });

  it("checks with three choices per question", () => {
    renderDeck();
    click("解説7");
    const quiz = screen.getByTestId("auth-quiz");
    fireEvent.click(within(quiz).getByRole("button", { name: "利便性" }));
    expect(quiz).toHaveTextContent("正解！");
    fireEvent.click(within(quiz).getAllByRole("button", { name: "知識" })[0]);
    expect(quiz).toHaveTextContent("正解は「所持」");
  });
});
