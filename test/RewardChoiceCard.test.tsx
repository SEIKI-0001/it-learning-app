// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PendingChoice } from "@/types/checkpoint";
import RewardChoiceCard from "@/components/rewards/RewardChoiceCard";
import RarityMark from "@/components/rewards/RarityMark";

// GF-P1-005 / GF-P1-006 の表示側。
//   - 3択がすべて「当たり」であることが読み取れる
//   - レアリティを色だけに頼らず識別できる

afterEach(cleanup);

const CHOICE: PendingChoice = {
  id: "2026-08-30T00:00:00.000Z",
  rarity: "rare",
  options: [
    {
      id: "opt-frag-rare",
      label: "レアのかけら ×2",
      rarity: "rare",
      emoji: "x",
      fragment: { fragmentId: "frag-rare", count: 2 },
    },
    {
      id: "opt-frag-common",
      label: "ノーマルのかけら ×3",
      rarity: "common",
      emoji: "x",
      fragment: { fragmentId: "frag-common", count: 3 },
    },
    { id: "opt-cosmetic", label: "称号フレーム（飾り）", rarity: "rare", emoji: "x" },
  ],
};

describe("all three options are wins", () => {
  it("says plainly that the choice does not affect learning", () => {
    const { container } = render(<RewardChoiceCard choice={CHOICE} onSelect={vi.fn()} />);

    expect(container.textContent).toContain("どれを選んでも学習の進みは変わりません");
  });

  it("offers every option as a selectable action", () => {
    render(<RewardChoiceCard choice={CHOICE} onSelect={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("describes what each option gives", () => {
    render(<RewardChoiceCard choice={CHOICE} onSelect={vi.fn()} />);

    expect(screen.getByText("レアのかけら ×2")).toBeInTheDocument();
    expect(screen.getByText("ノーマルのかけら ×3")).toBeInTheDocument();
    expect(screen.getByText("飾りとして手に入ります")).toBeInTheDocument();
  });

  it("reports the chosen option to the caller", () => {
    const onSelect = vi.fn();
    render(<RewardChoiceCard choice={CHOICE} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("ノーマルのかけら ×3").closest("button")!);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "opt-frag-common" }),
    );
  });

  it("never frames an option as a loss", () => {
    const { container } = render(<RewardChoiceCard choice={CHOICE} onSelect={vi.fn()} />);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/はずれ|失敗|残念|逃|損/);
  });
});

describe("rarity is readable without colour", () => {
  it("names the rarity in text", () => {
    render(<RarityMark rarity="epic" />);

    expect(screen.getByText("エピック")).toBeInTheDocument();
  });

  it("labels each rarity distinctly", () => {
    const { container: common } = render(<RarityMark rarity="common" />);
    const { container: rare } = render(<RarityMark rarity="rare" />);
    const { container: epic } = render(<RarityMark rarity="epic" />);
    const texts = [common, rare, epic].map((c) => c.textContent);

    expect(new Set(texts).size).toBe(3);
  });

  it("uses a different icon shape per rarity", () => {
    const iconOf = (rarity: "common" | "rare" | "epic") => {
      cleanup();
      const { container } = render(<RarityMark rarity={rarity} />);
      return container.querySelector("svg")?.outerHTML ?? "";
    };

    const shapes = [iconOf("common"), iconOf("rare"), iconOf("epic")];
    expect(new Set(shapes).size).toBe(3);
  });

  it("marks each option in the card with its own rarity", () => {
    render(<RewardChoiceCard choice={CHOICE} onSelect={vi.fn()} />);
    const commonOption = screen.getByText("ノーマルのかけら ×3").closest("button")!;

    expect(within(commonOption).getByText("ノーマル")).toBeInTheDocument();
  });
});
