import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import QuizDeck from "@/components/wordlist/QuizDeck";
import FlashcardDeck from "@/components/wordlist/FlashcardDeck";
import WordlistQuizPage from "@/app/glossary/quiz/page";
import WordlistStudyPage from "@/app/glossary/study/page";

type AnyElement = ReactElement<{ children?: ReactNode } & Record<string, unknown>>;

/** サーバコンポーネントが返した要素ツリーから、指定コンポーネントの props を探す。 */
function findProps(node: ReactNode, type: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProps(child, type);
      if (found) return found;
    }
    return null;
  }
  const el = node as AnyElement;
  if (el.type === type) return el.props;
  return findProps(el.props?.children, type);
}

describe("/glossary/quiz?mode=task（Today の単語タスク）", () => {
  it("指定された ids（実在・重複なし）と Today のタスク id を QuizDeck へ渡す", async () => {
    const page = await WordlistQuizPage({
      searchParams: Promise.resolve({
        mode: "task", ids: "nat,dns,unknown-word,dns,dhcp", from: "today", task: "act:vocab",
        topicId: "tech-network-address",
      }),
    });
    expect(findProps(page, QuizDeck)).toEqual({
      mode: "task",
      ids: ["nat", "dns", "dhcp"],
      todayTaskId: "act:vocab",
      topicId: "tech-network-address",
    });
  });

  it("20語でも切らずに渡す", async () => {
    const ids = ["nat", "dns", "dhcp", "http", "https", "tcp", "udp", "lan", "wan", "vpn",
      "saas", "paas", "iaas", "sla", "slo", "sli", "kpi", "kgi", "roi", "waf"];
    const page = await WordlistQuizPage({
      searchParams: Promise.resolve({ mode: "task", ids: ids.join(","), from: "today", task: "act:vocab" }),
    });
    expect(findProps(page, QuizDeck)?.ids).toEqual(ids);
  });

  it("自由学習のモードでは Today のタスクと結びつけない", async () => {
    const page = await WordlistQuizPage({
      searchParams: Promise.resolve({ mode: "weak", from: "today", task: "act:vocab" }),
    });
    expect(findProps(page, QuizDeck)).toMatchObject({ mode: "weak", ids: [], todayTaskId: null });
  });
});

describe("/glossary/study（カード学習）", () => {
  it("自由学習のカード学習は残す", async () => {
    const page = await WordlistStudyPage({ searchParams: Promise.resolve({ mode: "weak" }) });
    expect(findProps(page, FlashcardDeck)).toEqual({ mode: "weak" });
  });

  it("以前の Today のリンク（?mode=task）は4択へ送る", async () => {
    await expect(WordlistStudyPage({
      searchParams: Promise.resolve({ mode: "task", ids: "nat,dns", from: "today", task: "act:vocab", topicId: "tech-network-address" }),
    })).rejects.toThrow("REDIRECT /glossary/quiz?mode=task&ids=nat%2Cdns&from=today&task=act%3Avocab&topicId=tech-network-address");
  });
});
