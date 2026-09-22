// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DataStructureExperience from "@/components/experiences/DataStructureExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <DataStructureExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const labels = (listName: string) =>
  within(screen.getByRole("list", { name: listName }))
    .getAllByRole("listitem")
    .map((li) => li.getAttribute("aria-label"));

describe("DataStructureExperience", () => {
  it("names LIFO only after the learner has actually popped something", () => {
    renderDeck();
    expect(screen.queryByTestId("stack-insight")).toBeNull();
    click("push（積む）");
    expect(labels("スタックの中身（下から順）")).toEqual(["1の箱", "2の箱", "3の箱（一番上）"]);
    click("pop（取り出す）");
    // 一番上（最後に入れた3）だけが出て、下はそのまま
    expect(screen.getByTestId("stack-out")).toHaveAccessibleName("取り出した 3");
    expect(labels("スタックの中身（下から順）")).toEqual(["1の箱", "2の箱（一番上）"]);
    expect(screen.getByTestId("stack-insight")).toHaveTextContent("LIFO");
    click("pop（取り出す）");
    expect(screen.getByTestId("stack-log-outs")).toHaveTextContent("3 → 2");
  });

  it("queue: enqueue joins at the back, dequeue removes the front and the rest move up", () => {
    renderDeck();
    click("解説2");
    expect(screen.queryByTestId("queue-insight")).toBeNull();
    click("enqueue（並ぶ）");
    expect(labels("キューの中身（先頭から順）")).toEqual(["1番の人（先頭）", "2番の人", "3番の人"]);
    click("dequeue（取り出す）");
    expect(labels("キューの中身（先頭から順）")).toEqual(["2番の人（先頭）", "3番の人"]);
    const people = within(screen.getByRole("list", { name: "キューの中身（先頭から順）" })).getAllByRole("listitem");
    expect(people[0].style.left).toBe("76px");
    expect(screen.getByTestId("queue-insight")).toHaveTextContent("FIFO");
    click("dequeue（取り出す）");
    expect(screen.getByTestId("queue-log-outs")).toHaveTextContent("1 → 2");
  });

  it("keeps the other data structures slide", () => {
    renderDeck();
    click("解説3");
    for (const t of ["配列", "リスト", "木構造"]) expect(screen.getByText(t)).toBeInTheDocument();
  });
});
