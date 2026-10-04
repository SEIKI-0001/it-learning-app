import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { POST as SAVE } from "@/app/api/reference-book/save/route";
import { POST as GET } from "@/app/api/reference-book/get/route";

// 参考書の保存 API。本の永続 id は DB 側で揃え、migration 適用前の環境でも従来どおり保存できること。

const USER = "10000000-0000-0000-0000-000000000001";
const NEW_COLUMNS = ["book_id", "source", "study_plan", "archived_books"];

let stored: Record<string, unknown> | null = null;
let migrated = true;
const upserts: Record<string, unknown>[] = [];
const updates: Record<string, unknown>[] = [];

function createSupabase() {
  return {
    from() {
      const chain: Record<string, unknown> = {};
      let pendingUpsert: Record<string, unknown> | null = null;
      for (const fn of ["select", "eq"]) chain[fn] = () => chain;
      chain.upsert = (row: Record<string, unknown>) => {
        pendingUpsert = row;
        return chain;
      };
      chain.update = (row: Record<string, unknown>) => {
        updates.push(row);
        const done: Record<string, unknown> = {};
        done.eq = () => Promise.resolve({ data: null, error: null });
        return done;
      };
      chain.maybeSingle = () => Promise.resolve({ data: stored, error: null });
      chain.then = (onFulfilled: (v: unknown) => unknown) => {
        const row = pendingUpsert!;
        upserts.push(row);
        if (!migrated && NEW_COLUMNS.some((c) => c in row)) {
          return Promise.resolve({
            data: null,
            error: { code: "PGRST204", message: "Could not find the 'book_id' column of 'user_reference_books'" },
          }).then(onFulfilled);
        }
        stored = { ...(stored ?? {}), ...row, ...(migrated && !row.book_id ? { book_id: stored?.book_id ?? "db-default" } : {}) };
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      };
      return chain;
    },
  };
}

function req(body: unknown) {
  return new Request("http://localhost/api/reference-book/save", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const book = (over: Record<string, unknown> = {}) => ({
  title: "教本",
  edition: "令和08年",
  active: true,
  chapters: [],
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

beforeEach(() => {
  stored = null;
  migrated = true;
  upserts.length = 0;
  updates.length = 0;
  mocks.getRequestUserId.mockResolvedValue(USER);
  mocks.getServiceSupabase.mockReturnValue(createSupabase());
});

describe("POST /api/reference-book/save", () => {
  it("keeps the DB book_id when the same book is saved from a device with another id", async () => {
    stored = { user_id: USER, book_id: "db-id", title: "教本", edition: "令和08年", chapters: [] };
    const res = await SAVE(req({ book: book({ id: "device-id" }) }));
    expect(await res.json()).toEqual({ ok: true, bookId: "db-id" });
    expect(upserts[0].book_id).toBe("db-id");
  });

  it("uses a new id when the user switched to a different book", async () => {
    stored = { user_id: USER, book_id: "db-id", title: "教本", edition: "令和08年", chapters: [] };
    const res = await SAVE(req({ book: book({ id: "new-id", title: "別の本" }) }));
    expect((await res.json()).bookId).toBe("new-id");
  });

  it("returns the DB default id for a first save without an id", async () => {
    const res = await SAVE(req({ book: book() }));
    expect((await res.json()).bookId).toBe("db-default");
    expect("book_id" in upserts[0]).toBe(false);
  });

  it("stores the archive and study plan only when sent", async () => {
    await SAVE(req({ book: book({ id: "a" }) }));
    expect("archived_books" in upserts[0]).toBe(false);
    expect("study_plan" in upserts[0]).toBe(false);
    await SAVE(req({ book: book({ id: "a" }), archive: [], studyPlan: null }));
    expect(upserts[1].archived_books).toEqual([]);
    expect(upserts[1].study_plan).toBeNull();
  });

  it("rejects malformed archives and plans", async () => {
    expect((await SAVE(req({ book: book(), archive: "x" }))).status).toBe(400);
    expect((await SAVE(req({ book: book(), studyPlan: { bookId: 1 } }))).status).toBe(400);
    expect(upserts).toHaveLength(0);
  });

  it("falls back to the legacy columns before the migration is applied", async () => {
    migrated = false;
    stored = { user_id: USER, title: "教本", edition: "令和08年", chapters: [] };
    const res = await SAVE(req({ book: book({ id: "device-id", source: { kind: "preset", id: "p" } }), archive: [] }));
    expect(await res.json()).toEqual({ ok: true });
    expect(upserts).toHaveLength(2);
    expect(NEW_COLUMNS.some((c) => c in upserts[1])).toBe(false);
    expect(upserts[1].title).toBe("教本");
  });
});

describe("POST /api/reference-book/save (plan only)", () => {
  const plan = {
    bookId: "db-id",
    structureHash: "h",
    revision: 2,
    revisedAt: "2026-10-04T00:00:00.000Z",
    startDate: "2026-10-04",
    inputEndDate: "2026-11-30",
    units: [{ unitId: "sec:s1", plannedDate: "2026-10-05" }],
  };

  it("updates only the study plan of the book in use", async () => {
    stored = { user_id: USER, book_id: "db-id", title: "教本", chapters: [] };
    const res = await SAVE(req({ studyPlan: plan }));
    expect(await res.json()).toEqual({ ok: true, bookId: "db-id" });
    expect(updates).toEqual([{ study_plan: plan }]);
    expect(upserts).toHaveLength(0);
  });

  it("refuses a plan for another book (e.g. right after switching)", async () => {
    stored = { user_id: USER, book_id: "other", title: "別", chapters: [] };
    expect((await SAVE(req({ studyPlan: plan }))).status).toBe(409);
    stored = null;
    expect((await SAVE(req({ studyPlan: plan }))).status).toBe(409);
    expect(updates).toHaveLength(0);
  });
});

describe("POST /api/reference-book/get", () => {
  it("returns the book with its id, archive and plan, tolerating rows without the new columns", async () => {
    stored = { user_id: USER, title: "教本", edition: "", active: true, chapters: [], updated_at: "2026-10-01" };
    let body = await (await GET(req({}))).json();
    expect(body).toMatchObject({ ok: true, archive: [], studyPlan: null });
    expect(body.book.id).toBeUndefined();

    stored = { ...stored, book_id: "db-id", archived_books: [book({ id: "old" })], study_plan: { bad: true } };
    body = await (await GET(req({}))).json();
    expect(body.book.id).toBe("db-id");
    expect(body.archive).toHaveLength(1);
    expect(body.studyPlan).toBeNull();
  });
});
