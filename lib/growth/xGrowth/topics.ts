import acronyms from "@/data/wordlist/itpassAcronyms.json";

/**
 * Approved educational facts for experiments. Every string here is copied verbatim from the
 * reviewed glossary (data/wordlist/itpassAcronyms.json); styles may only rearrange them.
 */
export type TopicFact = {
  topicId: string; // "acronym:<id>"
  id: string;
  acronym: string;
  japanese: string;
  oneLine: string;
  category: string;
  evidence: string;
  /** Approved confusable acronyms that exist in the glossary, with their approved trap text. */
  confusions: { acronym: string; japanese: string; trap: string }[];
  differenceAxis: string | null;
};

type Raw = { id: string; acronym: string; japanese: string; oneLine: string; category: string; confusedWith?: string[]; trapExplanations?: Record<string, string>; differenceAxis?: string };

let cache: TopicFact[] | null = null;
export function acronymFacts(): TopicFact[] {
  if (cache) return cache;
  const list = acronyms as unknown as Raw[];
  const byAcronym = new Map(list.map(a => [a.acronym, a]));
  cache = list.filter(a => a.acronym && a.japanese && a.oneLine).map(a => ({
    topicId: `acronym:${a.id}`,
    id: a.id,
    acronym: a.acronym,
    japanese: a.japanese,
    oneLine: a.oneLine,
    category: a.category,
    evidence: `data/wordlist/itpassAcronyms.json#${a.id}`,
    confusions: (a.confusedWith ?? []).flatMap(c => {
      const other = byAcronym.get(c);
      const trap = a.trapExplanations?.[c];
      return other && trap && other.japanese !== a.japanese ? [{ acronym: other.acronym, japanese: other.japanese, trap }] : [];
    }),
    differenceAxis: a.differenceAxis ?? null,
  }));
  return cache;
}

export function factById(topicId: string): TopicFact | undefined {
  return acronymFacts().find(f => f.topicId === topicId);
}

/** The exact block the current "terms" posts use, so the control variant matches production. */
export function factBlock(f: Pick<TopicFact, "acronym" | "japanese" | "oneLine">): string {
  return `${f.acronym}（${f.japanese}）\n${f.oneLine}`;
}

/** A topic counts as used when any earlier post contains its heading (any style). */
export function topicUsed(f: TopicFact, history: string[]): boolean {
  const heading = `${f.acronym}（${f.japanese}）`;
  return history.some(t => t.includes(heading) || t.includes(`「${f.japanese}」`));
}

/** Stable 32-bit FNV-1a hash for deterministic choices. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
