// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SqlExperience from "@/components/experiences/SqlExperience";
import { likeMatch } from "@/components/experiences/sql/SqlExamPanels";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <SqlExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");
const table = () => screen.getByTestId("sql-table");

describe("SqlExperience", () => {
  it("keeps the SQL shape, the mini SQL sandbox and the command recap as slides", () => {
    renderDeck();
    expect(screen.getByRole("heading", { name: "1SQLの形（取り出す命令）" })).toBeInTheDocument();
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByRole("heading", { name: "3ミニSQL：選ぶと結果が変わる" })).toBeInTheDocument();
    click("解説4");
    expect(screen.getByText("INSERT")).toBeInTheDocument();
  });

  it("SELECT shrinks away the unselected column while its clause lights up", () => {
    renderDeck();
    click("解説2");
    expect(table()).toHaveAttribute("data-cols", "name,klass,score");
    next();
    expect(screen.getByTestId("sql-token-SELECT")).toHaveAttribute("data-on", "true");
    next();
    expect(table()).toHaveAttribute("data-cols", "name,score");
  });

  it("WHERE greys out non-matching rows, then removes them", () => {
    renderDeck();
    click("解説2");
    click(/^WHERE$/);
    next();
    expect(screen.getByTestId("sql-row-鈴木")).toHaveAttribute("data-state", "miss");
    expect(screen.getByTestId("sql-row-佐藤")).toHaveAttribute("data-state", "hit");
    next();
    expect(screen.getByTestId("sql-row-鈴木")).toHaveAttribute("data-state", "gone");
    expect(table()).toHaveAttribute("data-rows", "3");
  });

  it("ORDER BY actually moves rows into score order", () => {
    renderDeck();
    click("解説2");
    click(/^ORDER BY$/);
    expect(screen.getByTestId("sql-row-佐藤")).toHaveAttribute("data-pos", "2");
    next();
    next();
    expect(screen.getByTestId("sql-row-佐藤")).toHaveAttribute("data-pos", "0");
    expect(screen.getByTestId("sql-row-鈴木")).toHaveAttribute("data-pos", "4");
  });

  it("combined query: filter rows first, then keep only the name column", () => {
    renderDeck();
    click("解説2");
    click("組み合わせ");
    for (let i = 0; i < 4; i++) next();
    expect(table()).toHaveAttribute("data-rows", "3");
    expect(table()).toHaveAttribute("data-cols", "name");
  });
});

describe("過去問の出題に合わせた4枚（解説5〜8）", () => {
  it("shows table ⊃ record ⊃ field and the three operations: selection, projection, join", () => {
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("rdb-parts")).toHaveTextContent("表 ⊃ レコード（行）⊃ フィールド（列）");
    const ops = screen.getByTestId("rdb-ops");
    expect(ops.querySelector('[data-op="選択"]')).toHaveTextContent("行を抜き出す");
    expect(ops.querySelector('[data-op="射影"]')).toHaveTextContent("列だけを抜き出す");
    expect(ops.querySelector('[data-op="結合"]')).toHaveTextContent("関連付けて");
  });

  it("primary keys may span several fields and need not be numbers; replication syncs copies", () => {
    renderDeck();
    click("解説6");
    const rules = within(screen.getByTestId("pk-rules")).getAllByRole("listitem");
    expect(rules.map((li) => li.getAttribute("data-ok"))).toEqual(["true", "true", "false", "false"]);
    const terms = screen.getByTestId("dbms-terms");
    expect(terms.querySelector('[data-term="インデックス"]')).toHaveTextContent("検索を高速に");
    expect(terms.querySelector('[data-term="レプリケーション"]')).toHaveTextContent("同期");
  });

  it("matches % as zero or more characters and _ as exactly one", () => {
    expect(likeMatch("田中", "%田_")).toBe(true);
    expect(likeMatch("山田花", "%田_")).toBe(true);
    expect(likeMatch("山田", "%田_")).toBe(false);
    expect(likeMatch("田代美", "%田_")).toBe(false);
    expect(likeMatch("青木花子", "_木%")).toBe(true);
    expect(likeMatch("佐々木", "_木%")).toBe(false);
    renderDeck();
    click("解説7");
    expect(screen.getByTestId("like-names")).toHaveAttribute("data-hits", "2");
    click("'%田'");
    expect(screen.getByTestId("like-count")).toHaveTextContent("2 名");
    click("'田_'");
    expect(screen.getByTestId("like-names")).toHaveAttribute("data-hits", "1");
  });

  it("checks with three choices per question", () => {
    renderDeck();
    click("解説8");
    const quiz = screen.getByTestId("sql-quiz");
    fireEvent.click(within(quiz).getByRole("button", { name: "射影" }));
    expect(quiz).toHaveTextContent("正解！");
    fireEvent.click(within(quiz).getByRole("button", { name: "木村" }));
    expect(quiz).toHaveTextContent("正解は「青木花子」");
  });
});
