// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NetworkQuestProgress from "@/components/network-quest/NetworkQuestProgress";
import NetworkQuest from "@/components/network-quest/NetworkQuest";
import { missions } from "@/components/network-quest/missions";
import { getLessonHref } from "@/lib/learningCatalog";

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); Reflect.deleteProperty(Element.prototype, "scrollIntoView"); });

function expectXP(xp: number) {
  const progress = render(<NetworkQuestProgress />);
  expect(screen.getByLabelText("獲得経験値")).toHaveTextContent(`${xp} XP`);
  progress.unmount();
}

function solveFirstMission() {
  fireEvent.click(screen.getByRole("button", { name: /スイッチングハブ/ }));
  fireEvent.click(screen.getByRole("button", { name: /確認問題へ/ }));
  fireEvent.click(screen.getByRole("button", { name: /同じ建物などの限られた範囲/ }));
  fireEvent.click(screen.getByRole("button", { name: /次の問題へ/ }));
  fireEvent.click(screen.getByRole("button", { name: /離れた拠点のLAN同士/ }));
  fireEvent.click(screen.getByRole("button", { name: /結果を見る/ }));
}

describe("NetworkQuest learning journey", () => {
  it("opens the mission selected from the separate progress page", () => {
    render(<NetworkQuest initialMissionId="dns" />);
    expect(screen.getByRole("heading", { name: "名前から住所を探せ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "DNS" })).toBeEnabled();
    expect(screen.queryByLabelText("獲得経験値")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /学習の記録/ }).every((link) => link.getAttribute("href") === "/netlab/quest/progress")).toBe(true);
  });

  it("links every mission to its existing lesson", () => {
    const ids = ["tech-lan-wan", "tech-network-devices", "tech-network-address", "tech-http-https", "tech-email-protocol"];
    missions.forEach((mission, i) => expect(mission.lessonHref).toBe(getLessonHref(ids[i])));
  });

  it("moves keyboard focus to the selected mission and resets the previous attempt", async () => {
    render(<NetworkQuest />);
    fireEvent.click(screen.getByRole("button", { name: /スイッチングハブ/ }));
    fireEvent.click(screen.getByRole("button", { name: "ドメイン名とDNSに挑戦" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "名前から住所を探せ" })).toHaveFocus());
    expect(screen.queryByRole("button", { name: /確認問題へ/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "LANとWANに挑戦" }));
    expect(screen.getByRole("button", { name: /スイッチングハブ/ })).toBeEnabled();
  });

  it("completes all five missions and offers onward exam learning", () => {
    render(<NetworkQuest />);
    const solutions = [
      ["LANとWANに挑戦", "スイッチングハブ", "同じ建物などの限られた範囲を結ぶネットワーク", "離れた拠点のLAN同士を結ぶWAN"],
      ["IPアドレスとルータに挑戦", "ルータ", "異なるネットワーク間でパケットを転送する", "32ビット"],
      ["ドメイン名とDNSに挑戦", "DNS", "ドメイン名に対応するIPアドレスを調べる", "DHCP"],
      ["HTTP・HTTPSに挑戦", "HTTPS", "ブラウザとWebサーバ間の通信", "URLや運営者も確認してから情報を入力する"],
      ["通信プロトコルに挑戦", "SMTP", "SMTP", "IMAP"],
    ];
    for (const [name, tool, first, second] of solutions) {
      fireEvent.click(screen.getByRole("button", { name }));
      fireEvent.click(screen.getByRole("button", { name: tool }));
      fireEvent.click(screen.getByRole("button", { name: /確認問題へ/ }));
      fireEvent.click(screen.getByRole("button", { name: new RegExp(first) }));
      fireEvent.click(screen.getByRole("button", { name: /次の問題へ/ }));
      fireEvent.click(screen.getByRole("button", { name: new RegExp(second) }));
      fireEvent.click(screen.getByRole("button", { name: /結果を見る/ }));
    }
    expectXP(500);
    expect(screen.getByRole("link", { name: /合格に向けて学習を続ける/ })).toHaveAttribute("href", "/learn");
  });
  it("explains an incorrect equipment choice and only unlocks the quiz after success", () => {
    render(<NetworkQuest />);
    fireEvent.click(screen.getByRole("button", { name: /DNSサーバ/ }));
    expect(screen.getByRole("status")).toHaveTextContent("名前からIPアドレス");
    expect(screen.queryByRole("button", { name: /確認問題へ/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /スイッチングハブ/ }));
    expect(screen.getByRole("button", { name: /確認問題へ/ })).toBeEnabled();
  });

  it("awards completion once, restores it on reload, and prevents changing a graded answer", () => {
    const first = render(<NetworkQuest />);
    solveFirstMission();
    expectXP(100);
    first.unmount();
    render(<NetworkQuest />);
    expectXP(100);
    solveFirstMission();
    expectXP(100);
  });

  it("keeps wrong answers locked, awards no mastery, and allows retry", () => {
    render(<NetworkQuest />);
    fireEvent.click(screen.getByRole("button", { name: /スイッチングハブ/ }));
    fireEvent.click(screen.getByRole("button", { name: /確認問題へ/ }));
    fireEvent.click(screen.getByRole("button", { name: /世界中を結ぶ一つの無線/ }));
    expect(screen.getByRole("button", { name: /同じ建物などの限られた範囲/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /次の問題へ/ }));
    fireEvent.click(screen.getByRole("button", { name: /離れた拠点のLAN同士/ }));
    fireEvent.click(screen.getByRole("button", { name: /結果を見る/ }));
    expectXP(0);
    fireEvent.click(screen.getByRole("button", { name: /もう一度挑戦/ }));
    expect(screen.getByRole("button", { name: /スイッチングハブ/ })).toBeEnabled();
  });

  it("survives malformed storage and reports a save failure without blocking play", () => {
    window.localStorage.setItem("network-quest:v1", '{"completed":["fake","lan","lan",12]}');
    render(<NetworkQuest />);
    expectXP(100);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    solveFirstMission();
    expect(screen.getByText(/このブラウザでは保存できません/)).toBeInTheDocument();
  });
});
