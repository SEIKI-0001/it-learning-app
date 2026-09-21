// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TransactionExperience from "@/components/experiences/TransactionExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <TransactionExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const balance = (id: "a" | "b") => screen.getByTestId(`balance-${id}`);
const money = () => screen.queryByTestId("money");

describe("TransactionExperience", () => {
  it("keeps the transfer demo and the ACID slide", () => {
    renderDeck();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    click("解説2");
    for (const t of ["原子性", "一貫性", "独立性", "永続性"]) expect(screen.getByText(t)).toBeInTheDocument();
  });

  it("shows the dangerous half-updated state, then commits A=500 / B=500", () => {
    renderDeck();
    expect(screen.getByTestId("tx-scene").querySelector('[data-illustration="tx-engine"]')).not.toBeNull();
    click("▶ 振込を始める");
    expect(screen.getByTestId("lock-a")).toBeInTheDocument();
    expect(screen.getByTestId("lock-b")).toBeInTheDocument();

    click("① Aから 500 引く →");
    expect(balance("a")).toHaveTextContent("500円");
    expect(balance("a")).toHaveAttribute("data-pending", "true");
    expect(balance("b")).toHaveTextContent("0円");
    expect(screen.getByTestId("tx-alert")).toHaveTextContent("片方だけ更新");
    expect(money()).toHaveAttribute("data-spot", "engine");

    click("② Bに 500 足す →");
    expect(money()).toHaveAttribute("data-spot", "b");
    click("✅ コミット（確定）");
    expect(balance("a")).toHaveTextContent("500円");
    expect(balance("b")).toHaveTextContent("500円");
    expect(balance("b")).toHaveAttribute("data-settled", "true");
    expect(money()).toHaveAttribute("data-money-state", "settled");
    expect(screen.queryByTestId("lock-a")).toBeNull();
    expect(screen.getByTestId("tx-log")).toHaveTextContent("COMMIT");
  });

  it("rolls back to A=1000 / B=0 and the money returns to A", () => {
    renderDeck();
    click("▶ 振込を始める");
    click("① Aから 500 引く →");
    click("② Bに 500 足す →");
    click("↩️ ロールバック（取消）");
    expect(balance("a")).toHaveTextContent("1,000円");
    expect(balance("b")).toHaveTextContent("0円");
    expect(money()).toHaveAttribute("data-spot", "a");
    expect(screen.getByTestId("tx-message")).toHaveTextContent("巻き戻しました");
  });

  it("a crash in the middle is undone on restart (atomicity)", () => {
    renderDeck();
    click("▶ 振込を始める");
    click("① Aから 500 引く →");
    click("⚡ 障害発生");
    expect(screen.getByTestId("tx-alert")).toHaveTextContent("障害発生");
    expect(money()).toHaveAttribute("data-money-state", "crashed");
    expect(balance("a")).toHaveTextContent("500円");

    click("🔄 再起動する");
    expect(balance("a")).toHaveTextContent("1,000円");
    expect(balance("b")).toHaveTextContent("0円");
    expect(screen.getByTestId("tx-without")).toHaveTextContent("500円が消えてしまいます");
    expect(screen.getByTestId("tx-log")).toHaveTextContent("再起動 → ROLLBACK");
  });
});
