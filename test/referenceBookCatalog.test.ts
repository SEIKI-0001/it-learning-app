import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  catalogKey,
  catalogStructureHash,
  isCatalogVisible,
  referenceBookFromCatalog,
  sanitizeCatalogChapters,
  sanitizeCatalogMeta,
  type CatalogEntry,
} from "@/lib/referenceBookCatalog";
import { referenceBookFromChoice } from "@/lib/referenceBookPresets";

const mocks = vi.hoisted(() => ({
  getRequestUserId: vi.fn(),
  getServiceSupabase: vi.fn(),
}));
vi.mock("@/lib/apiUser", () => ({
  getRequestUserId: mocks.getRequestUserId,
  getRequestUserIdFast: mocks.getRequestUserId,
}));
vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
  isSupabaseConfigured: () => true,
}));

import { POST as SUBMIT } from "@/app/api/reference-book/catalog/submit/route";
import { POST as SEARCH } from "@/app/api/reference-book/catalog/search/route";
import { POST as ADMIN_POST } from "@/app/api/admin/book-catalog/route";

// 目次の共有カタログ。共有するのは目次そのもの（章・節の名前と紐づけ）だけで、
// メモ・読了・提出者は共有しない。他の利用者に出すのは承認済みか、別々の2人以上の提出があるものだけ。

const USER_CHAPTERS = [
  {
    id: "ch-x",
    title: "  第1章   コンピュータ ",
    note: "自分用メモ：苦手",
    done: true,
    completedAt: "2026-10-01",
    keywords: ["CPU"],
    topicIds: ["tech-network-lan-wan", "no-such-topic"],
    sections: [
      { id: "s1", title: "1-1 2進数", done: true, startedAt: "2026-10-01", topicIds: ["tech-binary-data"] },
      { id: "s2", title: "   " },
    ],
  },
  { id: "ch-y", title: "", sections: [] },
  { id: "ch-z", title: "第2章 ネットワーク", topicIds: [] },
];

describe("sanitizeCatalogChapters", () => {
  it("keeps only the table of contents and drops personal data", () => {
    const clean = sanitizeCatalogChapters(USER_CHAPTERS);
    expect(clean).toEqual([
      {
        title: "第1章 コンピュータ",
        keywords: ["CPU"],
        topicIds: ["tech-lan-wan"],
        sections: [{ title: "1-1 2進数", keywords: [], topicIds: ["tech-binary-data"] }],
      },
      { title: "第2章 ネットワーク", keywords: [], topicIds: [], sections: [] },
    ]);
    const json = JSON.stringify(clean);
    for (const leaked of ["自分用メモ", "done", "completedAt", "startedAt", "ch-x", "s1", "no-such-topic"]) {
      expect(json).not.toContain(leaked);
    }
  });

  it("rejects garbage input", () => {
    expect(sanitizeCatalogChapters("x")).toEqual([]);
    expect(sanitizeCatalogChapters([null, 1, { title: 3 }])).toEqual([]);
    expect(sanitizeCatalogMeta({ title: "  " })).toBeNull();
    expect(sanitizeCatalogMeta({ title: "本", publisher: "", edition: "令和08年" })).toEqual({ title: "本", publisher: null, edition: "令和08年" });
  });
});

describe("keys and visibility", () => {
  it("normalizes titles and separates editions", () => {
    expect(catalogKey("ＩＴパスポート 教本", "令和08年")).toBe(catalogKey("itパスポート教本", "令和08年"));
    expect(catalogKey("教本", "令和08年")).not.toBe(catalogKey("教本", "令和09年"));
  });

  it("fingerprints the structure (same TOC = same hash)", () => {
    const a = sanitizeCatalogChapters(USER_CHAPTERS);
    const b = sanitizeCatalogChapters(JSON.parse(JSON.stringify(USER_CHAPTERS)).map((c: { note?: string }) => ({ ...c, note: "別のメモ" })));
    expect(catalogStructureHash(a)).toBe(catalogStructureHash(b));
    expect(catalogStructureHash(a)).not.toBe(catalogStructureHash(a.slice(0, 1)));
  });

  it("shows entries only when approved or submitted by two people, never when hidden", () => {
    expect(isCatalogVisible({ status: "pending", submit_count: 1 })).toBe(false);
    expect(isCatalogVisible({ status: "pending", submit_count: 2 })).toBe(true);
    expect(isCatalogVisible({ status: "approved", submit_count: 1 })).toBe(true);
    expect(isCatalogVisible({ status: "hidden", submit_count: 9 })).toBe(false);
  });

  it("copies a catalog entry into a personal book with fresh ids and the catalog source", () => {
    const entry: CatalogEntry = {
      id: "11111111-1111-1111-1111-111111111111",
      title: "教本",
      publisher: "出版社",
      edition: null,
      chapters: sanitizeCatalogChapters(USER_CHAPTERS),
      chapterCount: 2,
      sectionCount: 1,
    };
    const book = referenceBookFromChoice({ kind: "catalog", entry })!;
    expect(book.source).toEqual({ kind: "catalog", id: entry.id });
    expect(book.id).toBeTruthy();
    expect(book.chapters[0].sections?.[0].topicIds).toEqual(["tech-binary-data"]);
    expect(book.chapters[0].done).toBe(false);
    expect(referenceBookFromCatalog(entry).chapters[0].id).not.toBe(book.chapters[0].id);
  });
});

// --- API（Supabase をメモリで模擬）---------------------------------------------

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;

function createSupabase() {
  return {
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      let op: "select" | "insert" | "upsert" | "update" = "select";
      let payload: Row | null = null;
      let limit = Infinity;
      const chain: Record<string, unknown> = {};
      const rows = () => (tables[table] ??= []);
      const matched = () => rows().filter((r) => filters.every((f) => f(r)));
      chain.select = () => chain;
      chain.eq = (k: string, v: unknown) => (filters.push((r) => r[k] === v), chain);
      chain.neq = (k: string, v: unknown) => (filters.push((r) => r[k] !== v), chain);
      chain.in = (k: string, v: unknown[]) => (filters.push((r) => v.includes(r[k])), chain);
      chain.ilike = (k: string, pattern: string) => {
        const needle = pattern.replace(/%/g, "");
        filters.push((r) => String(r[k]).includes(needle));
        return chain;
      };
      chain.order = () => chain;
      chain.limit = (n: number) => ((limit = n), chain);
      chain.insert = (row: Row) => ((op = "insert"), (payload = row), chain);
      chain.upsert = (row: Row) => ((op = "upsert"), (payload = row), chain);
      chain.update = (row: Row) => ((op = "update"), (payload = row), chain);
      const run = () => {
        if (op === "insert") {
          const row = { id: `00000000-0000-0000-0000-00000000000${rows().length + 1}`, status: "pending", submit_count: 0, use_count: 0, ...payload };
          rows().push(row);
          return { data: row, error: null };
        }
        if (op === "upsert") {
          if (!rows().some((r) => r.catalog_id === payload!.catalog_id && r.user_id === payload!.user_id)) rows().push(payload!);
          return { data: null, error: null };
        }
        if (op === "update") {
          for (const r of matched()) Object.assign(r, payload);
          return { data: null, error: null };
        }
        return { data: matched().slice(0, limit), error: null };
      };
      chain.maybeSingle = async () => {
        const result = run();
        return { data: Array.isArray(result.data) ? result.data[0] ?? null : result.data, error: null };
      };
      chain.single = async () => run();
      chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(run()).then(resolve);
      return chain;
    },
  };
}

const req = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, { method: "POST", body: JSON.stringify(body), headers });

beforeEach(() => {
  tables = {
    line_users: [
      { id: "u1", merged_into: null },
      { id: "u2", merged_into: null },
      { id: "u1-old", merged_into: "u1" },
    ],
  };
  mocks.getServiceSupabase.mockReturnValue(createSupabase());
});

const book = { title: "いちばんやさしいITパスポート", edition: "", chapters: USER_CHAPTERS };

describe("catalog submit / search", () => {
  it("requires login to submit and skips tiny tables of contents", async () => {
    mocks.getRequestUserId.mockResolvedValue(null);
    expect((await SUBMIT(req("/api/reference-book/catalog/submit", { book }))).status).toBe(401);
    mocks.getRequestUserId.mockResolvedValue("u1");
    const res = await SUBMIT(req("/api/reference-book/catalog/submit", { book: { ...book, chapters: USER_CHAPTERS.slice(0, 1) } }));
    expect(await res.json()).toEqual({ ok: true, skipped: true });
  });

  it("stores only the sanitized TOC and stays hidden until a second person submits the same one", async () => {
    mocks.getRequestUserId.mockResolvedValue("u1");
    await SUBMIT(req("/api/reference-book/catalog/submit", { book }));
    const row = tables.reference_book_catalog[0];
    expect(JSON.stringify(row.chapters)).not.toContain("自分用メモ");
    expect(row.submit_count).toBe(1);
    let found = await (await SEARCH(req("/api/reference-book/catalog/search", { q: "いちばんやさしい" }))).json();
    expect(found.entries).toEqual([]);

    // 同じ人の別アカウント（統合済み）では2人にならない
    mocks.getRequestUserId.mockResolvedValue("u1-old");
    await SUBMIT(req("/api/reference-book/catalog/submit", { book }));
    expect(tables.reference_book_catalog[0].submit_count).toBe(1);

    mocks.getRequestUserId.mockResolvedValue("u2");
    await SUBMIT(req("/api/reference-book/catalog/submit", { book }));
    expect(tables.reference_book_catalog).toHaveLength(1);
    expect(tables.reference_book_catalog[0].submit_count).toBe(2);
    found = await (await SEARCH(req("/api/reference-book/catalog/search", { q: "いちばん やさしい" }))).json();
    expect(found.entries).toHaveLength(1);
    expect(found.entries[0]).toMatchObject({ title: book.title, chapterCount: 2, sectionCount: 1 });
    expect(JSON.stringify(found.entries)).not.toMatch(/u1|u2|submit/);
  });

  it("returns nothing for very short queries", async () => {
    const found = await (await SEARCH(req("/api/reference-book/catalog/search", { q: "い" }))).json();
    expect(found.entries).toEqual([]);
  });
});

describe("admin catalog moderation", () => {
  it("rejects cross-origin status changes even with credentials", async () => {
    process.env.ADMIN_PASSWORD = "pw";
    const auth = `Basic ${btoa("admin:pw")}`;
    const res = await ADMIN_POST(
      req("/api/admin/book-catalog", { id: "x", status: "approved" }, { authorization: auth, origin: "https://evil.example" }),
    );
    expect(res.status).toBe(403);
    const ok = await ADMIN_POST(
      req("/api/admin/book-catalog", { id: "x", status: "approved" }, { authorization: auth, origin: "http://localhost" }),
    );
    expect(ok.status).toBe(200);
  });
});
