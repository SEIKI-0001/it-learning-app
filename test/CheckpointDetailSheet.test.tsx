// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import type { CheckpointId, CheckpointProgress } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { CHECKPOINTS, getCheckpointStage } from "@/lib/checkpoints";
import { buildCheckpointDetail } from "@/lib/checkpointDetail";
import { getRequiredBadges } from "@/lib/badges";
import CheckpointDetailSheet from "@/components/progress/CheckpointDetailSheet";

const now = new Date("2026-09-24T09:00:00.000Z");

function makeState(cp: Partial<CheckpointProgress>): AppState {
  return {
    profile: { examDate: "2026-12-01" } as AppState["profile"],
    progress: {
      level: 1, exp: 0, streakCount: 0, weakTags: [],
      completedTopics: [], topicMastery: {}, topicMasteryStats: {}, reviewQueue: [],
      currentDay: 1, completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, ...cp },
    },
    answers: [],
  };
}

const state = makeState({
  currentCheckpointId: "cp2",
  clearedCheckpointIds: ["cp1"],
  earnedBadges: getRequiredBadges("cp1").map((b) => ({ badgeId: b.id, earnedAt: "2026-09-01T00:00:00.000Z" })),
  finalExamAttempts: [
    { checkpointId: "cp1", passed: true, correct: 5, total: 6, attemptedAt: "2026-09-03T00:00:00.000Z", wrongTopicIds: [] },
  ],
});

/** /progress と同じ配線：CP ボタンで開き、シート内で前後に切り替える。 */
function Harness() {
  const [openId, setOpenId] = useState<CheckpointId | null>(null);
  const progress = state.progress.checkpointProgress!;
  const index = openId ? CHECKPOINTS.findIndex((cp) => cp.id === openId) : -1;
  return (
    <>
      {CHECKPOINTS.map((cp) => (
        <button key={cp.id} type="button" onClick={() => setOpenId(cp.id)}>
          open {cp.id} {getCheckpointStage(progress, cp.id)}
        </button>
      ))}
      {openId && (
        <CheckpointDetailSheet
          detail={buildCheckpointDetail(state, openId, undefined, now)}
          onClose={() => setOpenId(null)}
          onPrev={index > 0 ? () => setOpenId(CHECKPOINTS[index - 1].id) : null}
          onNext={index < CHECKPOINTS.length - 1 ? () => setOpenId(CHECKPOINTS[index + 1].id) : null}
        />
      )}
    </>
  );
}

const open = (id: CheckpointId) => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^open ${id} `) }));
  return screen.getByRole("dialog");
};

afterEach(cleanup);

describe("CheckpointDetailSheet", () => {
  it("opens the current CP with its remaining conditions and one next step", () => {
    render(<Harness />);
    const dialog = open("cp2");
    expect(within(dialog).getByRole("heading", { level: 2 }).textContent).toBe("基礎理解");
    expect(within(dialog).getByText("挑戦中")).toBeTruthy();
    expect(within(dialog).getByText("あと必要なこと")).toBeTruthy();
    expect(within(dialog).getByText("CP達成条件をあと4件満たす")).toBeTruthy();
    const links = within(dialog).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/today");
  });

  it("opens a cleared CP with its passing record and no learning CTA", () => {
    render(<Harness />);
    const dialog = open("cp1");
    expect(within(dialog).getByText("突破済み")).toBeTruthy();
    expect(within(dialog).getByText("このチェックポイントを突破しました")).toBeTruthy();
    expect(dialog.textContent).toContain("2026年9月3日に突破試験に合格");
    expect(dialog.textContent).toContain("5/6");
    expect(within(dialog).queryAllByRole("link")).toHaveLength(0);
  });

  it("tells the next CP is not needed yet and the locked CP how it unlocks", () => {
    render(<Harness />);
    let dialog = open("cp3");
    expect(within(dialog).getByText("現在はまだ取り組む必要はありません。")).toBeTruthy();
    expect(dialog.textContent).toContain("CP2「基礎理解」を突破すると");
    expect(within(dialog).queryByText("あと必要なこと")).toBeNull();
    expect(within(dialog).getByText("このチェックポイントの完了条件")).toBeTruthy();
    expect(within(dialog).queryAllByRole("link")).toHaveLength(0);

    fireEvent.keyDown(window, { key: "Escape" });
    dialog = open("cp5");
    expect(within(dialog).getByText("未解放")).toBeTruthy();
    expect(dialog.textContent).toContain("解放条件：CP4「弱点克服」を突破");
    expect(within(dialog).getByText("突破試験に合格する")).toBeTruthy();
  });

  it("switches content with the pager and disables it at the ends", () => {
    render(<Harness />);
    const dialog = open("cp6");
    expect(within(dialog).getByRole("button", { name: /次のCP/ }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(within(dialog).getByRole("button", { name: /前のCP/ }));
    expect(within(screen.getByRole("dialog")).getByRole("heading", { level: 2 }).textContent).toBe("過去問実戦");
  });

  it("closes with Escape, the close button and the backdrop, returning focus to the opener", () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: /^open cp2 / });
    opener.focus();
    fireEvent.click(opener);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("詳細を閉じる");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);

    open("cp2");
    fireEvent.click(screen.getByRole("button", { name: "詳細を閉じる" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    open("cp2");
    fireEvent.mouseDown(screen.getByTestId("cp-detail-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps Tab focus inside the sheet", () => {
    render(<Harness />);
    const dialog = open("cp2");
    const focusable = within(dialog).getAllByRole("button").filter((b) => !b.hasAttribute("disabled"));
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("詳細を閉じる");
  });
});
