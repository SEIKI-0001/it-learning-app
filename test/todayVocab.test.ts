import { describe, expect, it } from "vitest";
import type { WordProgress, WordProgressMap } from "@/lib/wordProgressModel";
import { buildVocabActivity, relatedWordIdsForTopic } from "@/lib/todayVocab";
import { TODAY_ACTIVITY_PRIORITY } from "@/lib/learningLoop";
import { getTopic } from "@/lib/content";

const now = new Date(2026, 8, 26, 12, 0, 0);
const DAY = 86_400_000;
const NETWORK = "tech-network-address"; // 関連語: nat / dns / dhcp
const HTTP = "tech-http-https"; // 関連語: http / https / tcp

function word(id: string, patch: Partial<WordProgress> = {}): WordProgress {
  return {
    acronymId: id,
    status: "learning",
    correctCount: 1,
    wrongCount: 0,
    reviewCount: 1,
    lastReviewedAt: now.getTime() - DAY,
    nextReviewAt: now.getTime() + 3 * DAY,
    lastSelfRating: "remembered",
    ...patch,
  };
}

function build(input: {
  cp: number | null;
  words?: WordProgressMap;
  stages?: Record<string, "terms_stabilizing" | "basic_understood">;
  upcoming?: string[];
}) {
  return buildVocabActivity({
    checkpointOrder: input.cp,
    wordProgress: input.words ?? {},
    topicStages: input.stages ?? {},
    upcomingTopicIds: input.upcoming ?? [],
    now,
  });
}

describe("Today の単語タスク", () => {
  it("トピックと単語の関連付けは data/topicWordLinks（確認パックの有無とは独立）", () => {
    expect(relatedWordIdsForTopic(NETWORK)).toEqual(["nat", "dns", "dhcp"]);
    expect(relatedWordIdsForTopic("tech-raid")).toEqual(["raid"]); // 確認パックの無いトピック
    expect(relatedWordIdsForTopic("tech-file-system")).toEqual([]); // 扱うべき略語が無いトピック
  });

  it("確認パックの無いトピックでも、関連語があれば Today に出る", () => {
    const task = build({ cp: 2, upcoming: ["strat-system-planning-rfp"] });
    expect(task).toMatchObject({ detail: "RFP / RFI / RFQ", anchorTopicId: "strat-system-planning-rfp" });
  });

  it("CP1 では（期限切れ・苦手があっても）出さない", () => {
    expect(build({
      cp: 1,
      words: { nat: word("nat", { status: "weak", nextReviewAt: now.getTime() - DAY }) },
      stages: { [NETWORK]: "terms_stabilizing" },
      upcoming: [NETWORK],
    })).toBeNull();
    expect(build({ cp: null, upcoming: [NETWORK] })).toBeNull();
  });

  it("CP2 で今日のトピックに未学習の関連語があれば、そのトピックの後に出す", () => {
    const task = build({ cp: 2, upcoming: [NETWORK] });
    expect(task).toMatchObject({
      kind: "vocab",
      title: `${getTopic(NETWORK)!.title}の関連用語を確認`,
      detail: "NAT / DNS / DHCP",
      countLabel: "3語",
      anchorTopicId: NETWORK,
      primaryEligible: false,
      priority: TODAY_ACTIVITY_PRIORITY.wordsRelated,
    });
    expect(task!.href).toContain("mode=task");
    expect(task!.href).toContain("ids=nat%2Cdns%2Cdhcp");
    expect(task!.href).toContain(`topicId=${NETWORK}`);
    expect(task!.estimatedMinutes).toBeLessThanOrEqual(5);
  });

  it("関連語をすべて学んだトピックでは関連語タスクを出さない", () => {
    const learned = { nat: word("nat"), dns: word("dns"), dhcp: word("dhcp") };
    expect(build({ cp: 2, words: learned, upcoming: [NETWORK] })).toBeNull();
  });

  it("terms_stabilizing のトピックの関連語を最優先にし、Primary 候補にする", () => {
    const task = build({
      cp: 3,
      words: {
        nat: word("nat", { status: "mastered", nextReviewAt: now.getTime() + 7 * DAY }),
        tcp: word("tcp", { status: "weak", nextReviewAt: now.getTime() - DAY }),
      },
      stages: { [NETWORK]: "terms_stabilizing" },
      upcoming: [HTTP],
    });
    expect(task).toMatchObject({
      title: `${getTopic(NETWORK)!.title}の関連用語を固める`,
      detail: "DNS / DHCP", // 定着済み（期限前）の NAT は除く
      primaryEligible: true,
      priority: TODAY_ACTIVITY_PRIORITY.termsStabilizing,
    });
  });

  it("復習期限が来た単語を出す", () => {
    const task = build({
      cp: 4,
      words: {
        dns: word("dns", { nextReviewAt: now.getTime() - DAY }),
        vpn: word("vpn", { nextReviewAt: now.getTime() + 2 * DAY }),
      },
    });
    expect(task).toMatchObject({
      title: "今日の単語復習",
      detail: "DNS",
      countLabel: "期限が来た1語",
      primaryEligible: false,
      priority: TODAY_ACTIVITY_PRIORITY.wordsReview,
    });
  });

  it("weak の単語を出す（期限前でも）", () => {
    const task = build({
      cp: 4,
      words: { waf: word("waf", { status: "weak", nextReviewAt: now.getTime() + 2 * DAY }) },
    });
    expect(task).toMatchObject({ title: "苦手な用語を固める", detail: "WAF", countLabel: "苦手な1語" });
  });

  it("CP4 以降は新しい単語を増やさない（関連未学習語は出さない）", () => {
    expect(build({ cp: 4, upcoming: [NETWORK] })).toBeNull();
    expect(build({ cp: 5, upcoming: [NETWORK] })).toBeNull();
  });

  it("CP5 以降の復習語は、公式過去問の後・新規学習の前の優先度", () => {
    const task = build({ cp: 5, words: { dns: word("dns", { status: "weak" }) } });
    expect(task!.priority).toBe(TODAY_ACTIVITY_PRIORITY.wordsReviewLate);
    expect(task!.priority).toBeLessThan(TODAY_ACTIVITY_PRIORITY.pastExamDrill);
  });

  it("対象が何も無ければ単語タスクを出さない（毎日必ず、にはしない）", () => {
    expect(build({ cp: 3 })).toBeNull();
    expect(build({ cp: 3, words: { dns: word("dns") } })).toBeNull();
  });

  it("復習語は1セッション8語まで", () => {
    const words: WordProgressMap = {};
    for (const id of ["nat", "dns", "dhcp", "http", "https", "tcp", "vpn", "waf", "isms", "mfa"]) {
      words[id] = word(id, { status: "weak" });
    }
    expect(build({ cp: 4, words })!.countLabel).toBe("苦手な8語");
  });
});
