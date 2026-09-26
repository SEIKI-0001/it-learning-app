// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordProgress, WordProgressMap } from "@/lib/wordProgressModel";
import { isValidWordProgress, mergeWordProgressMaps } from "@/lib/wordProgressModel";
import {
  getWordProgress,
  getWordProgressMap,
  recordSelfRating,
  syncWordProgress,
} from "@/lib/wordlistProgress";
import { setUserId } from "@/lib/userSession";

const STORAGE_KEY = "fequest:wordlistProgress";

/** この Node では jsdom の localStorage が使えないので、Map で差し替える（他テストと同じ方式）。 */
function installMemoryStorage(): void {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
      clear: () => values.clear(),
      key: (i: number) => [...values.keys()][i] ?? null,
      get length() {
        return values.size;
      },
    },
  });
}

function p(id: string, lastReviewedAt: number | null, patch: Partial<WordProgress> = {}): WordProgress {
  return {
    acronymId: id,
    status: "learning",
    correctCount: 1,
    wrongCount: 0,
    reviewCount: 1,
    lastReviewedAt,
    nextReviewAt: lastReviewedAt === null ? null : lastReviewedAt + 86_400_000,
    lastSelfRating: "remembered",
    ...patch,
  };
}

describe("単語進捗のマージ（純粋関数）", () => {
  it("新しい方を採用し、端末の方が新しい・端末にしか無い進捗を DB へ送る", () => {
    const local: WordProgressMap = { dns: p("dns", 300), nat: p("nat", 100), vpn: p("vpn", 50) };
    const remote: WordProgressMap = { dns: p("dns", 200), nat: p("nat", 400), waf: p("waf", 10) };
    const { merged, toUpload } = mergeWordProgressMaps(local, remote);
    expect(merged.dns.lastReviewedAt).toBe(300);
    expect(merged.nat.lastReviewedAt).toBe(400);
    expect(Object.keys(merged).sort()).toEqual(["dns", "nat", "vpn", "waf"]);
    expect(toUpload.map((w) => w.acronymId).sort()).toEqual(["dns", "vpn"]);
  });

  it("同時刻は DB を正とし、壊れた端末データは送らない", () => {
    const broken = { acronymId: "tcp", status: "???", correctCount: 1 } as unknown as WordProgress;
    const { merged, toUpload } = mergeWordProgressMaps(
      { dns: p("dns", 100, { status: "weak" }), tcp: broken },
      { dns: p("dns", 100, { status: "mastered" }) },
    );
    expect(merged.dns.status).toBe("mastered");
    expect(merged.tcp).toBeUndefined();
    expect(toUpload).toEqual([]);
    expect(isValidWordProgress(broken)).toBe(false);
  });
});

describe("単語進捗の保存と同期", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  /** DB（user_word_progress）の代わり。 */
  let db: WordProgressMap;

  beforeEach(() => {
    installMemoryStorage();
    db = {};
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        progress?: WordProgress;
        progresses?: WordProgress[];
      };
      if (url === "/api/word-progress/list") {
        return new Response(JSON.stringify({ ok: true, progress: db }), { status: 200 });
      }
      if (url === "/api/word-progress/save") {
        for (const w of body.progresses ?? (body.progress ? [body.progress] : [])) db[w.acronymId] = w;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("学習した進捗は再読み込み後も保持される（localStorage）", () => {
    recordSelfRating("dns", "forgot");
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as WordProgressMap;
    expect(raw.dns.status).toBe("weak");
    expect(getWordProgress("dns").status).toBe("weak");
  });

  it("ログインユーザーの学習は DB にも保存される", async () => {
    setUserId("user-a");
    recordSelfRating("dns", "remembered");
    await vi.waitFor(() => expect(db.dns?.status).toBe("learning"));
  });

  it("ログイン前に端末にだけ残っていた進捗を、同期で DB へ引き継ぐ（既存ユーザー互換）", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nat: p("nat", 1000, { status: "weak" }) }));
    setUserId("user-a");
    await expect(syncWordProgress()).resolves.toBe(true);
    expect(db.nat?.status).toBe("weak");
    // localStorage は消さない
    expect(getWordProgressMap().nat.status).toBe("weak");
  });

  it("別端末で学んだ進捗を取り込む（端末間同期）", async () => {
    // 端末A で学習 → DB へ
    setUserId("user-a");
    recordSelfRating("vpn", "remembered");
    recordSelfRating("vpn", "remembered");
    await vi.waitFor(() => expect(db.vpn?.status).toBe("mastered"));

    // 端末B（localStorage 空）で同期
    window.localStorage.clear();
    setUserId("user-a");
    await syncWordProgress();
    expect(getWordProgressMap().vpn.status).toBe("mastered");
  });

  it("未ログイン・通信失敗でも端末の進捗はそのまま（同期は false）", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nat: p("nat", 1000) }));
    await expect(syncWordProgress()).resolves.toBe(false); // userId なし
    setUserId("user-a");
    fetchMock.mockImplementationOnce(async () => new Response("{}", { status: 503 }));
    await expect(syncWordProgress()).resolves.toBe(false);
    expect(getWordProgressMap().nat.lastReviewedAt).toBe(1000);
  });
});
