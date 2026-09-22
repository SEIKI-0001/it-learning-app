// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import KeysExperience from "@/components/experiences/KeysExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <KeysExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("KeysExperience", () => {
  it("the DBMS accepts a new key but rejects a duplicate or empty primary key", () => {
    renderDeck();
    click(/S04 鈴木/);
    expect(screen.getByTestId("pk-row-S04")).toBeInTheDocument();
    expect(screen.getByTestId("pk-verdict")).toHaveTextContent("登録OK");
    click(/S02 山田/);
    expect(screen.queryByTestId("pk-row-S04")).toBeNull();
    expect(screen.getByTestId("pk-rejected")).toBeInTheDocument();
    expect(screen.getByTestId("pk-verdict")).toHaveTextContent("主キーの重複");
    click(/番号なし/);
    expect(screen.getByTestId("pk-verdict")).toHaveTextContent("空っぽにはできない");
  });

  it("a foreign key links to the matching roster row; an unknown number is rejected (referential integrity)", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("fk-pk-S01")).toHaveAttribute("data-linked", "true");
    fireEvent.click(screen.getByTestId("fk-row-S03-数学"));
    expect(screen.getByTestId("fk-pk-S03")).toHaveAttribute("data-linked", "true");
    expect(screen.getByTestId("fk-result")).toHaveTextContent("「佐藤」さん（1組）");
    click(/S02 の理科/);
    expect(screen.getByTestId("fk-pk-S02")).toHaveAttribute("data-linked", "true");
    click(/S09 の社会/);
    expect(screen.getByTestId("fk-result")).toHaveTextContent("参照整合性");
    expect(screen.getByTestId("fk-pk-S01")).toHaveAttribute("data-linked", "false");
  });

  it("joining roster and grades adds who each grade belongs to; recap keeps the three words and adds composite keys", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByTestId("join-table")).not.toHaveTextContent("佐藤");
    click(/名簿とつなぐ/);
    expect(screen.getByTestId("join-table")).toHaveTextContent("佐藤");
    expect(screen.getByTestId("join-note")).toBeInTheDocument();
    click("解説4");
    expect(screen.getByText("DBMS")).toBeInTheDocument();
    expect(screen.getByText("複合キー")).toBeInTheDocument();
  });
});
