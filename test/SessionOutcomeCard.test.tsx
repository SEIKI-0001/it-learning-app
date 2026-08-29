// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SessionOutcome } from "@/types/gameful";
import SessionOutcomeCard from "@/components/learn/SessionOutcomeCard";

// GF-P0-005 のうち画面でしか確かめられないもの。
// 「学習成果 → 合格への意味 → 進行」の並びは lib/sessionOutcome が保証するので、
// ここでは渡された順に崩さず出すこと・件数ゼロで何も出さないことを見る。

afterEach(cleanup);

const OUTCOMES: SessionOutcome[] = [
  { kind: "revenge", label: "前回まちがえた問題に正解", detail: "2問" },
  { kind: "mastery", label: "このトピックの理解度", detail: "58 → 66" },
  { kind: "readiness", label: "合格準備度", detail: "58% → 66%" },
];

describe("rendering", () => {
  it("shows each outcome with its measured detail", () => {
    render(<SessionOutcomeCard outcomes={OUTCOMES} />);

    expect(screen.getByText("前回まちがえた問題に正解")).toBeInTheDocument();
    expect(screen.getByText("2問")).toBeInTheDocument();
    expect(screen.getByText("58 → 66")).toBeInTheDocument();
    expect(screen.getByText("58% → 66%")).toBeInTheDocument();
  });

  it("keeps the order it was given", () => {
    const { container } = render(<SessionOutcomeCard outcomes={OUTCOMES} />);
    const text = container.textContent ?? "";

    expect(text.indexOf("前回まちがえた問題に正解")).toBeLessThan(
      text.indexOf("このトピックの理解度"),
    );
    expect(text.indexOf("このトピックの理解度")).toBeLessThan(text.indexOf("合格準備度"));
  });

  it("renders an outcome that has no measured detail", () => {
    render(
      <SessionOutcomeCard
        outcomes={[{ kind: "review_cleared", label: "復習キューから外れました", detail: null }]}
      />,
    );

    expect(screen.getByText("復習キューから外れました")).toBeInTheDocument();
  });

  it("renders nothing when there is no outcome", () => {
    const { container } = render(<SessionOutcomeCard outcomes={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("never shows a fabricated percentage of its own", () => {
    const { container } = render(
      <SessionOutcomeCard
        outcomes={[{ kind: "measurement", label: "理解度の測定データを更新しました", detail: null }]}
      />,
    );

    expect(container.textContent).not.toMatch(/%/);
  });
});
