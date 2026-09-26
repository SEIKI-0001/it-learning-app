import { describe, expect, it } from "vitest";
import { TOPIC_WORD_LINKS, topicWordIds } from "@/data/topicWordLinks";
import { topicCheckPacks } from "@/data/topicCheckPacks";
import { getAllTopics } from "@/lib/content";
import { buildQuizQuestion, getAllWords, getWord } from "@/lib/wordlist";
import { resolvePackFlashcards } from "@/lib/checkPack";
import { relatedWordIdsForTopic } from "@/lib/todayVocab";

const topicIds = new Set(getAllTopics().map((t) => t.id));

describe("トピック ↔ 関連単語（Single Source of Truth）", () => {
  it("対応表のトピック・単語はすべて実在する（存在しない ID を参照しない）", () => {
    for (const [topicId, wordIds] of Object.entries(TOPIC_WORD_LINKS)) {
      expect(topicIds.has(topicId), topicId).toBe(true);
      expect(wordIds.length).toBeGreaterThan(0);
      expect(new Set(wordIds).size).toBe(wordIds.length);
      for (const id of wordIds) expect(getWord(id), `${topicId}:${id}`).toBeDefined();
    }
  });

  it("確認パックの用語は対応表そのもの（従来と同じ関連語・同じ出題順）", () => {
    for (const pack of topicCheckPacks) {
      expect(pack.flashcardIds).toEqual(topicWordIds(pack.topicId));
      expect(resolvePackFlashcards(pack).map((w) => w.id)).toEqual(pack.flashcardIds);
    }
    // 移行前の値の抜き取り確認
    const byTopic = new Map(topicCheckPacks.map((p) => [p.topicId, p.flashcardIds]));
    expect(byTopic.get("tech-security-cia")).toEqual(["isms", "mfa", "sso"]);
    expect(byTopic.get("tech-network-address")).toEqual(["nat", "dns", "dhcp"]);
    expect(byTopic.get("tech-firewall-vpn-zero-trust")).toEqual(["vpn", "waf", "zerotrust"]);
  });

  it("確認パックの無いトピックでも、関連語を定義していれば取得できる", () => {
    const withPack = new Set(topicCheckPacks.map((p) => p.topicId));
    expect(withPack.has("tech-raid")).toBe(false);
    expect(relatedWordIdsForTopic("tech-raid")).toEqual(["raid"]);
    expect(relatedWordIdsForTopic("strat-business-systems")).toEqual(["pos", "gps"]);
    expect(relatedWordIdsForTopic("strat-system-planning-rfp")).toEqual(["rfp", "rfi", "rfq"]);
    expect(relatedWordIdsForTopic("tech-ui-ux")).toEqual(["ui", "ux"]);
  });

  it("関連語を持たないトピックは空配列（無理に割り当てない）", () => {
    for (const id of ["tech-file-system", "tech-computer-types", "strat-corporation-management-organization"]) {
      expect(topicWordIds(id)).toEqual([]);
      expect(relatedWordIdsForTopic(id)).toEqual([]);
    }
    expect(topicWordIds("no-such-topic")).toEqual([]);
  });

  it("追加収録した略語も単語帳の4択（全形式）を作れる", () => {
    const added = ["raid", "pos", "rfq", "pmbok", "csr", "mrp", "rpo", "rto", "nfc", "ar", "vr"];
    const all = new Set(getAllWords().map((w) => w.id));
    for (const id of added) {
      expect(all.has(id), id).toBe(true);
      const entry = getWord(id)!;
      for (const type of entry.questionTypes) {
        const q = buildQuizQuestion(entry, type, () => 0.3);
        expect(q, `${id}:${type}`).toBeTruthy();
      }
    }
  });
});
