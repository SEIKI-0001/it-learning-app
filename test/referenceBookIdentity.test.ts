// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ReferenceBook, ReferenceBookArchiveEntry } from "@/types/referenceBook";
import type { UserProfile } from "@/types";
import {
  createEmptyReferenceBook,
  isSameReferenceBook,
  loadReferenceBookArchive,
  mergeReferenceBookArchives,
  normalizeReferenceBook,
  resolveSavedReferenceBookId,
  saveReferenceBookArchive,
  switchReferenceBook,
} from "@/lib/referenceBook";
import { referenceBookFromChoice, referenceBookFromPreset, refreshPresetMappings } from "@/lib/referenceBookPresets";
import {
  profileRowToProfile,
  profileToRow,
  referenceBookRowToBook,
  referenceBookToRow,
  type ProfileRow,
} from "@/lib/dbMappers";
import { parseArchivePayload, parseStudyPlanPayload, isMissingColumnError } from "@/lib/referenceBookPayload";
import { planAccountMerge } from "@/lib/auth/accountMerge";

// 本そのものの identity（永続 id）と、切替履歴の DB 同期の土台。挙動（学習順）は変えない。

function book(partial: Partial<ReferenceBook>): ReferenceBook {
  return normalizeReferenceBook({
    title: "テスト本",
    active: true,
    updatedAt: "2026-10-01T00:00:00.000Z",
    chapters: [{ id: "c1", title: "第1章", sections: [{ id: "s1", title: "1-1", done: true }] }],
    ...partial,
  } as ReferenceBook);
}

const PLAN = {
  bookId: "b-1",
  structureHash: "h",
  revision: 1,
  revisedAt: "2026-10-01T00:00:00.000Z",
  startDate: "2026-10-01",
  inputEndDate: "2026-11-30",
  units: [{ unitId: "sec:s1", plannedDate: "2026-10-02" }],
};

// Node の組み込み localStorage が jsdom の実装を隠すため、Map ベースのスタブを入れる（既存テストと同じ方式）。
const storageValues = new Map<string, string>();
const localStorageStub: Storage = {
  get length() {
    return storageValues.size;
  },
  clear: () => storageValues.clear(),
  getItem: (key) => storageValues.get(key) ?? null,
  key: (index) => [...storageValues.keys()][index] ?? null,
  removeItem: (key) => void storageValues.delete(key),
  setItem: (key, value) => void storageValues.set(key, String(value)),
};

beforeAll(() => {
  Object.defineProperty(window, "localStorage", { configurable: true, value: localStorageStub });
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("book identity", () => {
  it("gives new books a permanent id and keeps it through normalize", () => {
    const empty = createEmptyReferenceBook();
    expect(empty.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(normalizeReferenceBook(empty).id).toBe(empty.id);
    const other = referenceBookFromChoice({ kind: "other", title: "自分の本" })!;
    expect(other.id).toBeTruthy();
    expect(other.id).not.toBe(empty.id);
  });

  it("records the preset as the source and refreshes mappings by source id", () => {
    const preset = referenceBookFromPreset("gihyo-kitami-itpass-r08")!;
    expect(preset.source).toEqual({ kind: "preset", id: "gihyo-kitami-itpass-r08" });
    expect(preset.id).toBeTruthy();
    // 書名を変えても作成元のプリセットで紐づけを取り込める
    const renamed = { ...preset, title: "キタミ式（自分用）", chapters: preset.chapters.map((c) => ({ ...c, topicIds: [] })) };
    const refreshed = refreshPresetMappings(renamed);
    expect(refreshed).not.toBe(renamed);
    expect(refreshed.title).toBe("キタミ式（自分用）");
  });

  it("treats the same title with different editions as different books, and ids win when both exist", () => {
    expect(isSameReferenceBook({ title: "ITパスポート 教本", edition: "令和08年" }, { title: "ITパスポート教本", edition: "令和08年" })).toBe(true);
    expect(isSameReferenceBook({ title: "教本", edition: "令和08年" }, { title: "教本", edition: "令和09年" })).toBe(false);
    expect(isSameReferenceBook({ title: "教本", edition: "" }, { title: "教本", edition: "令和09年" })).toBe(true);
    expect(isSameReferenceBook({ id: "a", title: "教本", edition: "" }, { id: "b", title: "教本", edition: "" })).toBe(false);
    expect(isSameReferenceBook({ id: "a", title: "教本", edition: "" }, { id: "a", title: "改名", edition: "" })).toBe(true);
    const preset = (id: string) => ({ kind: "preset" as const, id });
    expect(isSameReferenceBook({ title: "教本", edition: "", source: preset("p1") }, { title: "教本", edition: "", source: preset("p2") })).toBe(false);
  });
});

describe("switchReferenceBook", () => {
  it("restores the archived reading state by id, not a different edition of the same title", () => {
    const r08 = book({ id: "r08", title: "教本", edition: "令和08年" });
    const r09 = book({ id: "r09", title: "教本", edition: "令和09年", chapters: [{ id: "x", title: "新章" }] });
    const other = book({ id: "other", title: "別の本", chapters: [] });
    // r08 → 別の本（r08 を履歴に残す）
    const switched = switchReferenceBook(r08, other, { keepHistory: true });
    expect(switched.id).toBe("other");
    expect(loadReferenceBookArchive().map((b) => b.id)).toEqual(["r08"]);
    // 同じ書名の別の版へ切り替えても、r08 の読了状態は復元しない
    const toR09 = switchReferenceBook(switched, r09, { keepHistory: false });
    expect(toR09.id).toBe("r09");
    expect(toR09.chapters[0].title).toBe("新章");
    // r08 そのものへ戻すと復元する
    const back = switchReferenceBook(toR09, { ...r08, chapters: [] }, { keepHistory: false });
    expect(back.chapters[0].sections?.[0].done).toBe(true);
  });

  it("restores the archive when the same preset is chosen again (fresh candidate id)", () => {
    const first = referenceBookFromPreset("gihyo-kitami-itpass-r08")!;
    const read = { ...first, chapters: first.chapters.map((c) => ({ ...c, done: true })) };
    const other = switchReferenceBook(read, book({ id: "other", title: "別の本" }), { keepHistory: true });
    const again = switchReferenceBook(other, referenceBookFromPreset("gihyo-kitami-itpass-r08")!, { keepHistory: false });
    expect(again.id).toBe(first.id);
    expect(again.chapters.every((c) => c.done)).toBe(true);
  });

  it("keeps the current book when the same book is chosen again", () => {
    const current = book({ id: "a" });
    const again = switchReferenceBook(current, book({ id: "a", chapters: [] }), { keepHistory: true });
    expect(again.chapters[0].sections?.[0].done).toBe(true);
  });

  it("gives an id to a switched-to book that has none (legacy)", () => {
    const next = switchReferenceBook(null, { ...book({}), id: undefined }, { keepHistory: false });
    expect(next.id).toBeTruthy();
  });

  it("keeps archived study plans in storage", () => {
    const entry: ReferenceBookArchiveEntry = { ...book({ id: "a" }), studyPlan: PLAN };
    saveReferenceBookArchive([entry]);
    expect(loadReferenceBookArchive()[0].studyPlan).toEqual(PLAN);
  });
});

describe("mergeReferenceBookArchives", () => {
  it("unions by book, keeping the newer copy, newest first, max 5", () => {
    const older = book({ id: "a", updatedAt: "2026-09-01T00:00:00.000Z" });
    const newer = { ...book({ id: "a", updatedAt: "2026-09-05T00:00:00.000Z" }), note: "new" };
    const others = ["b", "c", "d", "e", "f"].map((id, i) =>
      book({ id, title: `本${id}`, updatedAt: `2026-08-0${i + 1}T00:00:00.000Z` }),
    );
    const merged = mergeReferenceBookArchives([older, ...others.slice(0, 2)], [newer, ...others.slice(2)]);
    expect(merged).toHaveLength(5);
    expect(merged[0]).toMatchObject({ id: "a", note: "new" });
    expect(merged.map((b) => b.id)).not.toContain("b"); // いちばん古いものから落ちる
  });
});

describe("resolveSavedReferenceBookId (server)", () => {
  it("keeps the stored id for the same book and issues a new one for a different book", () => {
    const existing = { book_id: "db-id", title: "教本", edition: "令和08年" };
    expect(resolveSavedReferenceBookId(existing, { id: "device-id", title: "教本", edition: "令和08年" })).toBe("db-id");
    expect(resolveSavedReferenceBookId(existing, { title: "教本", edition: "" })).toBe("db-id");
    expect(resolveSavedReferenceBookId(existing, { id: "new-book", title: "別の本", edition: "" })).toBe("new-book");
    const generated = resolveSavedReferenceBookId(existing, { title: "教本", edition: "令和09年" });
    expect(generated).toBeTruthy();
    expect(generated).not.toBe("db-id");
  });

  it("defers to the client id or DB default when there is no stored id", () => {
    expect(resolveSavedReferenceBookId(null, { id: "x", title: "t", edition: "" })).toBe("x");
    expect(resolveSavedReferenceBookId(null, { title: "t", edition: "" })).toBeUndefined();
    // migration 適用前（book_id 列が無い）
    expect(resolveSavedReferenceBookId({ title: "t", edition: "" }, { id: "x", title: "t", edition: "" })).toBe("x");
  });
});

describe("db mappers", () => {
  it("round-trips id and source, and omits them when absent", () => {
    const b = referenceBookFromPreset("gihyo-kitami-itpass-r08")!;
    const row = referenceBookToRow("u", b);
    expect(row.book_id).toBe(b.id);
    expect(row.source).toEqual(b.source);
    const back = referenceBookRowToBook(row);
    expect(back.id).toBe(b.id);
    expect(back.source).toEqual(b.source);
    const legacy = referenceBookToRow("u", { ...b, id: undefined, source: undefined });
    expect("book_id" in legacy).toBe(false);
    expect("source" in legacy).toBe(false);
    expect(referenceBookRowToBook({ ...legacy, source: { kind: "bogus", id: "" } as never }).source).toBeUndefined();
  });

  it("writes the order preference only when set (safe before the migration)", () => {
    const profile: UserProfile = { itExperience: "", dailyMinutes: "", examPlan: "", confidence: 0 };
    expect("study_order_preference" in profileToRow("u", profile)).toBe(false);
    const row = profileToRow("u", { ...profile, studyOrderPreference: "book" });
    expect(row.study_order_preference).toBe("book");
    expect(profileRowToProfile(row as ProfileRow).studyOrderPreference).toBe("book");
    expect(profileRowToProfile({ ...(row as ProfileRow), study_order_preference: "weird" }).studyOrderPreference).toBeUndefined();
  });
});

describe("save payload validation", () => {
  it("accepts well-formed archives and plans and rejects broken ones", () => {
    expect(parseArchivePayload([])).toEqual([]);
    expect(parseArchivePayload([{ ...book({ id: "a" }), studyPlan: PLAN }])).not.toBeNull();
    expect(parseArchivePayload("x")).toBeNull();
    expect(parseArchivePayload(new Array(6).fill(book({})))).toBeNull();
    expect(parseArchivePayload([{ title: "t" }])).toBeNull();
    expect(parseStudyPlanPayload(PLAN)).toEqual(PLAN);
    expect(parseStudyPlanPayload({ ...PLAN, startDate: "10/1" })).toBeNull();
    expect(parseStudyPlanPayload({ ...PLAN, units: [{ unitId: "x" }] })).toBeNull();
    expect(parseStudyPlanPayload({ ...PLAN, revision: -1 })).toBeNull();
  });

  it("recognizes missing-column errors from PostgREST", () => {
    expect(isMissingColumnError({ code: "PGRST204", message: "Could not find the 'book_id' column" })).toBe(true);
    expect(isMissingColumnError({ code: "42703" })).toBe(true);
    expect(isMissingColumnError({ code: "23505" })).toBe(false);
    expect(isMissingColumnError(null)).toBe(false);
  });
});

describe("account merge", () => {
  it("does not treat a differing book_id / plan as a conflict for the same book, and unions archives", () => {
    const base = { title: "教本", chapters: [{ id: "c1", title: "第1章" }] };
    const result = planAccountMerge({
      source: "line",
      target: "google",
      tables: {
        user_reference_books: [
          { ...base, user_id: "line", book_id: "x", updated_at: "2026-10-01", archived_books: [book({ id: "old1", title: "旧1" })] },
          { ...base, user_id: "google", book_id: "y", updated_at: "2026-10-02", study_plan: PLAN, archived_books: [book({ id: "old2", title: "旧2" })] },
        ],
      },
    });
    expect(result.user_reference_books).toHaveLength(1);
    const row = result.user_reference_books[0];
    expect(row.user_id).toBe("google");
    expect(row.book_id).toBe("y");
    expect(row.study_plan).toEqual(PLAN);
    expect((row.archived_books as ReferenceBook[]).map((b) => b.id).sort()).toEqual(["old1", "old2"]);
  });

  it("still refuses two different books", () => {
    expect(() =>
      planAccountMerge({
        source: "line",
        target: "google",
        tables: {
          user_reference_books: [
            { user_id: "line", title: "A", chapters: [] },
            { user_id: "google", title: "B", chapters: [] },
          ],
        },
      }),
    ).toThrow("REFERENCE_BOOK_CONFLICT");
  });
});
