// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import InternetProtocolExperience from "@/components/experiences/InternetProtocolExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderPackets() {
  render(
    <ExperienceSlideDeck>
      <InternetProtocolExperience />
    </ExperienceSlideDeck>,
  );
  fireEvent.click(screen.getByRole("button", { name: "解説3" }));
}

const next = () => fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
const packet = (n: number) => screen.getByTestId(`packet-${n}`);

describe("InternetProtocolExperience", () => {
  it("keeps the matching/mismatching protocol comparison and the protocol table", () => {
    render(
      <ExperienceSlideDeck>
        <InternetProtocolExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("❌ 言葉がちがう → 通じない…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "🇯🇵 日本語" }));
    expect(screen.getByText("⭕ 同じ言葉どうし → 通じる！")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByText("TCP / IP")).toBeInTheDocument();
  });

  it("splits HELLO WORLD into numbered packets with a destination and data", () => {
    renderPackets();
    expect(screen.getByTestId("packet-whole")).toHaveTextContent("HELLO WORLD");
    next();
    expect(screen.queryByTestId("packet-whole")).toBeNull();
    expect(packet(1)).toHaveTextContent("#1");
    expect(packet(1)).toHaveTextContent("→B");
    expect(packet(1)).toHaveTextContent("HEL");
    expect(packet(4)).toHaveTextContent("LD");
  });

  it("packets take different routes, arrive 1→3→2→4, and are re-sorted and rebuilt", () => {
    renderPackets();
    next();
    next();
    for (const n of [1, 2, 3, 4]) expect(packet(n)).toHaveAttribute("data-spot", "road");
    next();
    expect(screen.getByTestId("tray-head")).toHaveTextContent("届いた順");
    expect(packet(1)).toHaveAttribute("data-slot", "0");
    expect(packet(3)).toHaveAttribute("data-slot", "1");
    expect(packet(2)).toHaveAttribute("data-slot", "2");
    expect(packet(4)).toHaveAttribute("data-slot", "3");
    next();
    expect(screen.getByTestId("tray-head")).toHaveTextContent("番号順");
    for (const n of [1, 2, 3, 4]) expect(packet(n)).toHaveAttribute("data-slot", String(n - 1));
    next();
    expect(screen.getByTestId("packet-restored")).toHaveTextContent("HELLO WORLD");
  });

  it("still lets the learner split their own text", () => {
    renderPackets();
    fireEvent.change(screen.getByRole("textbox", { name: "送るデータ" }), { target: { value: "ABCDEFG" } });
    expect(screen.getByText("No.3/3")).toBeInTheDocument();
  });
});
