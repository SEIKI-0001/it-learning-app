import { describe, expect, it } from "vitest";
import type { WordProgress, WordProgressMap } from "@/lib/wordProgressModel";
import {
  TODAY_VOCAB_MAX_WORDS,
  buildVocabActivity,
  relatedWordIdsForTopic,
  selectVocabSpec,
  vocabMinutes,
} from "@/lib/todayVocab";
import { TODAY_ACTIVITY_PRIORITY } from "@/lib/learningLoop";
import { getTopic } from "@/lib/content";
import { getAllWords } from "@/lib/wordlist";

const now = new Date(2026, 8, 26, 12, 0, 0);
const DAY = 86_400_000;
const NETWORK = "tech-network-address"; // 関連語: nat / dns / dhcp
const HTTP = "tech-http-https"; // 関連語: http / https / tcp
const LAN = "tech-lan-wan"; // 関連語: lan / wan / vpn
const CLOUD = "tech-cloud-models"; // 関連語: saas / paas / iaas

function word(id: string, patch: Partial<WordProgress> = {}): WordProgress {
  return {
    acronymId: id,
    status: "learning",
    correctCount: 1,
    wrongCount: 0,
    reviewCount: 1,
    lastReviewedAt: now.getTime() - DAY,
    nextReviewAt: now.getTime() + 3 * DAY,
    lastSelfRating: null,
    ...patch,
  };
}

function input(input: {
  cp: number | null;
  words?: WordProgressMap;
  stages?: Record<string, "terms_stabilizing" | "basic_understood">;
  upcoming?: string[];
}) {
  return {
    checkpointOrder: input.cp,
    wordProgress: input.words ?? {},
    topicStages: input.stages ?? {},
    upcomingTopicIds: input.upcoming ?? [],
    now,
  };
}

const build = (i: Parameters<typeof input>[0]) => buildVocabActivity(input(i));
const idsOf = (i: Parameters<typeof input>[0]) => selectVocabSpec(input(i))?.wordIds ?? [];

/** 単語帳の先頭から n 語を、期限前の weak にする。 */
function weakWords(n: number, offset = 0): WordProgressMap {
  const map: WordProgressMap = {};
  for (const { id } of getAllWords().slice(offset, offset + n)) {
    map[id] = word(id, { status: "weak", correctCount: 0, wrongCount: 1 });
  }
  return map;
}

describe("Today の単語タスク: 1語15秒の時間計算", () => {
  it.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [8, 2],
    [12, 3],
    [16, 4],
    [20, 5],
  ])("%i語 → %i分", (count, minutes) => {
    expect(vocabMinutes(count)).toBe(minutes);
  });

  it("タスクの目安時間も同じ計算（1語でも1分と表示）", () => {
    const task = build({ cp: 2, upcoming: ["tech-raid"] }); // RAID の1語だけ
    expect(task).toMatchObject({ countLabel: "1語", estimatedMinutes: 1 });
  });
});

describe("Today の単語タスク: 4択で確認する", () => {
  it("Today の CTA は4択（/glossary/quiz?mode=task）へ遷移する。カード学習へは行かない", () => {
    const task = build({ cp: 2, upcoming: [NETWORK] })!;
    const url = new URL(task.href, "https://example.test");
    expect(url.pathname).toBe("/glossary/quiz");
    expect(url.searchParams.get("mode")).toBe("task");
    expect(url.searchParams.get("ids")).toBe("nat,dns,dhcp");
    expect(url.searchParams.get("from")).toBe("today");
    expect(url.searchParams.get("task")).toBe("act:vocab");
    expect(url.searchParams.get("topicId")).toBe(NETWORK);
    expect(task.ctaLabel).toBe("4択で確認する");
  });

  it("自己申告の暗記を思わせる文言（覚える・覚えた・固める）を使わない", () => {
    const tasks = [
      build({ cp: 2, upcoming: [NETWORK] }),
      build({ cp: 2, upcoming: [NETWORK, HTTP] }),
      build({ cp: 3, stages: { [NETWORK]: "terms_stabilizing" } }),
      build({ cp: 3, stages: { [NETWORK]: "terms_stabilizing" }, words: weakWords(3, 50) }),
      build({ cp: 4, words: { dns: word("dns", { nextReviewAt: now.getTime() - DAY }) } }),
      build({ cp: 4, words: weakWords(3) }),
    ];
    for (const task of tasks) {
      expect(task).not.toBeNull();
      for (const text of [task!.title, task!.ctaLabel, task!.reason, task!.countLabel]) {
        expect(text).not.toMatch(/覚え|固める/);
      }
    }
  });
});

describe("Today の単語タスク: 選び方", () => {
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
      title: `${getTopic(NETWORK)!.title}の関連用語を4択で確認`,
      detail: "NAT / DNS / DHCP",
      countLabel: "3語",
      estimatedMinutes: 1,
      anchorTopicId: NETWORK,
      primaryEligible: false,
      priority: TODAY_ACTIVITY_PRIORITY.wordsRelated,
    });
  });

  it("複数の今日のトピックから関連語を集める（upcomingTopicIds の順・重複なし）", () => {
    // NETWORK: nat/dns/dhcp, HTTP: http/https/tcp, LAN: lan/wan/vpn, CLOUD: saas/paas/iaas
    // tech-web-internet-basics（tcp/udp/http）は tcp・http が HTTP と重複する
    const task = build({ cp: 2, upcoming: [NETWORK, HTTP, "tech-web-internet-basics", LAN, CLOUD] })!;
    expect(task.spec).toEqual({
      kind: "vocab",
      variant: "related",
      wordIds: ["nat", "dns", "dhcp", "http", "https", "tcp", "udp", "lan", "wan", "vpn", "saas", "paas", "iaas"],
      topicId: NETWORK,
    });
    expect(task).toMatchObject({
      title: "関連用語を4択で確認", // 1トピックだけの語ではないので「○○の関連用語」にしない
      countLabel: "13語",
      estimatedMinutes: 4,
      anchorTopicId: NETWORK,
    });
    expect(task.detail).toBe("NAT / DNS / DHCP / HTTP / HTTPS / TCP ほか7語");
  });

  it("学習済みの語は除き、最初に未学習語を持つトピックを元トピックにする", () => {
    const learned = { nat: word("nat"), dns: word("dns"), dhcp: word("dhcp"), https: word("https") };
    expect(selectVocabSpec(input({ cp: 3, words: learned, upcoming: [NETWORK, HTTP] }))).toEqual({
      kind: "vocab", variant: "related", wordIds: ["http", "tcp"], topicId: HTTP,
    });
  });

  it("候補が少なければ少ないまま（無関係な単語で20語に水増ししない）", () => {
    expect(idsOf({ cp: 2, upcoming: [NETWORK] })).toEqual(["nat", "dns", "dhcp"]);
    expect(idsOf({ cp: 2, upcoming: ["tech-raid", "tech-file-system"] })).toEqual(["raid"]);
  });

  it("関連語をすべて学んだトピックでは関連語タスクを出さない", () => {
    const learned = { nat: word("nat"), dns: word("dns"), dhcp: word("dhcp") };
    expect(build({ cp: 2, words: learned, upcoming: [NETWORK] })).toBeNull();
  });

  it("CP4 以降は新しい単語を増やさない（関連未学習語は出さない）", () => {
    expect(build({ cp: 4, upcoming: [NETWORK] })).toBeNull();
    expect(build({ cp: 5, upcoming: [NETWORK] })).toBeNull();
  });

  it("対象が何も無ければ単語タスクを出さない（毎日必ず、にはしない）", () => {
    expect(build({ cp: 3 })).toBeNull();
    expect(build({ cp: 3, words: { dns: word("dns") } })).toBeNull();
  });
});

describe("Today の単語タスク: 期限・苦手の復習", () => {
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
      ctaLabel: "4択で復習する",
      primaryEligible: false,
      priority: TODAY_ACTIVITY_PRIORITY.wordsReview,
    });
    expect(task!.href).toMatch(/^\/glossary\/quiz\?mode=task&ids=dns&/);
  });

  it("weak の単語を出す（期限前でも）", () => {
    const task = build({
      cp: 4,
      words: { waf: word("waf", { status: "weak", nextReviewAt: now.getTime() + 2 * DAY }) },
    });
    expect(task).toMatchObject({
      title: "苦手な用語を4択で復習",
      detail: "WAF",
      countLabel: "苦手な1語",
      ctaLabel: "4択で復習する",
    });
  });

  it("候補が20語以上なら20語（約5分）まで", () => {
    const task = build({ cp: 4, words: weakWords(30) })!;
    expect(TODAY_VOCAB_MAX_WORDS).toBe(20);
    expect(task.spec.kind === "vocab" && task.spec.wordIds).toHaveLength(20);
    expect(task).toMatchObject({ countLabel: "苦手な20語", estimatedMinutes: 5 });
  });

  it("候補が12語なら12語（約3分）", () => {
    const task = build({ cp: 4, words: weakWords(12) })!;
    expect(task.spec.kind === "vocab" && task.spec.wordIds).toHaveLength(12);
    expect(task.estimatedMinutes).toBe(3);
  });

  it("期限到来 → weak の順で選び、重複しない", () => {
    const weak = weakWords(25, 10);
    // 期限が来ている weak 語（期限側に1回だけ数える）と、期限が来ている learning 語
    const dueIds = getAllWords().slice(0, 12).map((w) => w.id);
    const words: WordProgressMap = { ...weak };
    for (const id of dueIds) words[id] = word(id, { nextReviewAt: now.getTime() - DAY });
    const dueWeak = getAllWords()[20].id; // weak だが期限も来ている
    words[dueWeak] = word(dueWeak, { status: "weak", nextReviewAt: now.getTime() - DAY });

    const spec = selectVocabSpec(input({ cp: 4, words }))!;
    expect(spec.variant).toBe("review");
    expect(spec.wordIds).toHaveLength(20);
    expect(new Set(spec.wordIds).size).toBe(20);
    // 先頭13語が期限到来（全単語の並び順）、残り7語が weak
    expect(spec.dueCount).toBe(13);
    expect(spec.wordIds.slice(0, 13)).toEqual([...dueIds, dueWeak]);
    expect(spec.wordIds.slice(13).every((id) => words[id].status === "weak")).toBe(true);
    expect(build({ cp: 4, words })!).toMatchObject({ title: "今日の単語復習", countLabel: "20語" });
  });

  it("CP5 以降の復習語は、公式過去問の後・新規学習の前の優先度", () => {
    const task = build({ cp: 5, words: { dns: word("dns", { status: "weak" }) } });
    expect(task!.priority).toBe(TODAY_ACTIVITY_PRIORITY.wordsReviewLate);
    expect(task!.priority).toBeLessThan(TODAY_ACTIVITY_PRIORITY.pastExamDrill);
  });
});

describe("Today の単語タスク: terms_stabilizing", () => {
  it("対象トピックの関連語だけなら「○○の関連用語を4択で確認」で Primary 候補にする", () => {
    const task = build({
      cp: 3,
      words: { nat: word("nat", { status: "mastered", nextReviewAt: now.getTime() + 7 * DAY }) },
      stages: { [NETWORK]: "terms_stabilizing" },
      upcoming: [],
    });
    expect(task).toMatchObject({
      title: `${getTopic(NETWORK)!.title}の関連用語を4択で確認`,
      detail: "DNS / DHCP", // 定着済み（期限前）の NAT は除く
      ctaLabel: "4択で確認する",
      primaryEligible: true,
      priority: TODAY_ACTIVITY_PRIORITY.termsStabilizing,
    });
  });

  it("対象トピックの語を先頭に全部入れ、余った枠を 期限 → 苦手 → 他の今日のトピックの関連語 で埋める", () => {
    const words: WordProgressMap = {
      nat: word("nat", { status: "mastered", nextReviewAt: now.getTime() + 7 * DAY }),
      waf: word("waf", { status: "weak" }),
      sla: word("sla", { nextReviewAt: now.getTime() - DAY }),
      tcp: word("tcp", { status: "weak", nextReviewAt: now.getTime() - DAY }),
    };
    const spec = selectVocabSpec(input({
      cp: 3, words, stages: { [NETWORK]: "terms_stabilizing" }, upcoming: [HTTP, NETWORK, LAN],
    }))!;
    const allIds = getAllWords().map((w) => w.id);
    const byOrder = (ids: string[]) => [...ids].sort((a, b) => allIds.indexOf(a) - allIds.indexOf(b));
    expect(spec).toMatchObject({ variant: "stabilizing", topicId: NETWORK });
    expect(spec.wordIds).toEqual([
      "dns", "dhcp", // 対象トピック（定着済みの NAT は除く）
      ...byOrder(["sla", "tcp"]), // 期限
      "waf", // 苦手
      "http", "https", "lan", "wan", "vpn", // 他の今日のトピックの未学習語（tcp は重複・NETWORK は既出）
    ]);
    const task = build({ cp: 3, words, stages: { [NETWORK]: "terms_stabilizing" }, upcoming: [HTTP, NETWORK, LAN] })!;
    // 他の語が混ざるので「○○の関連用語」とは名乗らない
    expect(task).toMatchObject({ title: "今日の重要用語を4択で確認", primaryEligible: true });
  });

  it("枠の上限は20語で、対象トピックの語は必ず入る", () => {
    const spec = selectVocabSpec(input({
      cp: 4, words: weakWords(40, 20), stages: { [NETWORK]: "terms_stabilizing" },
    }))!;
    expect(spec.wordIds).toHaveLength(20);
    expect(spec.wordIds.slice(0, 3)).toEqual(["nat", "dns", "dhcp"]);
  });
});
