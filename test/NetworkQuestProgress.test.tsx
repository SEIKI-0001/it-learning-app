// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import NetworkQuestProgress from "@/components/network-quest/NetworkQuestProgress";

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe("NetworkQuest progress page", () => {
  it("offers a first mission for a new learner without invented progress", () => {
    render(<NetworkQuestProgress />);
    expect(screen.getByLabelText("獲得経験値")).toHaveTextContent("0 XP");
    expect(screen.getByLabelText("冒険の達成率")).toHaveTextContent("0%");
    expect(screen.getByRole("link", { name: /次のミッションに挑戦/ })).toHaveAttribute("href", "/netlab/quest?mission=lan#mission");
    expect(screen.getAllByText("未クリア")).toHaveLength(5);
  });

  it("shows saved completion and links to the next unfinished mission", () => {
    window.localStorage.setItem("network-quest:v1", JSON.stringify({ completed: ["lan", "dns", "lan", "unknown"] }));
    render(<NetworkQuestProgress />);
    expect(screen.getByLabelText("獲得経験値")).toHaveTextContent("200 XP");
    expect(screen.getByLabelText("冒険の達成率")).toHaveTextContent("40%");
    expect(screen.getAllByText("クリア済み")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /次のミッションに挑戦/ })).toHaveAttribute("href", "/netlab/quest?mission=router#mission");
  });

  it("celebrates completion and offers further study", () => {
    window.localStorage.setItem("network-quest:v1", JSON.stringify({ completed: ["lan", "router", "dns", "https", "mail"] }));
    render(<NetworkQuestProgress />);
    expect(screen.getByLabelText("冒険の達成率")).toHaveTextContent("100%");
    expect(screen.getByLabelText("獲得経験値")).toHaveTextContent("500 XP");
    expect(screen.getByRole("link", { name: /試験形式でチャレンジ/ })).toHaveAttribute("href", "/theme-exam/network");
    expect(screen.queryByRole("link", { name: /次のミッションに挑戦/ })).not.toBeInTheDocument();
  });
});
