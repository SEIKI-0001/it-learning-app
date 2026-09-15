import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: mocks.getServiceSupabase,
  isSupabaseConfigured: () => true,
}));

import { runDueLineReminders } from "@/lib/notifications/service";
import { GET as cronRoute } from "@/app/api/cron/line-reminder/route";

const USER = "10000000-0000-0000-0000-000000000001";
const LINE_USER = "Uline0001";

type PreferenceRow = {
  user_id: string;
  opt_in: boolean;
  remind_hour: number;
  timezone: string;
  daily_reminder: boolean;
  streak_risk: boolean;
  comeback: boolean;
};

type DeliveryRow = {
  user_id: string;
  notification_type: string;
  local_date: string;
  status?: string;
  detail?: string | null;
};

type Db = {
  preferences: PreferenceRow[];
  lineUsers: { id: string; line_user_id: string | null }[];
  progress: { user_id: string; last_played_at: string | null; streak_count: number }[];
  deliveries: DeliveryRow[];
  /** 送信直前の再確認で返す last_played_at（未指定なら progress と同じ）。 */
  recheckLastPlayedAt?: Record<string, string | null>;
  /** 候補取得RPCで順に返すエラー（null は成功）。 */
  candidateErrors?: ({ code?: string; message?: string } | null)[];
  /** 予約RPCで順に返すエラー（null は成功）。 */
  reserveErrors?: ({ code?: string; message?: string } | null)[];
};

type Call = { fn: string; args: unknown[] };

/** 書き込みが行われたテーブルの記録。学習テーブルへの副作用検出に使う。 */
let writtenTables: string[] = [];
/** 一覧取得に使われたテーブル。RPC 1本にまとまっていることの確認に使う。 */
let listReadTables: string[] = [];
/** 候補取得RPCの呼び出し回数。 */
let rpcCalls: string[] = [];
let deliveryUpdates: { filters: Record<string, unknown>; patch: Record<string, unknown> }[] = [];

function filtersOf(calls: Call[]): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  for (const call of calls) {
    if (call.fn === "eq") filters[String(call.args[0])] = call.args[1];
  }
  return filters;
}

function inValuesOf(calls: Call[]): string[] {
  const call = calls.find((c) => c.fn === "in");
  return call ? (call.args[1] as string[]) : [];
}

function createSupabase(db: Db) {
  function run(table: string, calls: Call[], single: boolean) {
    const isInsert = calls.some((c) => c.fn === "insert");
    const isUpdate = calls.some((c) => c.fn === "update");
    if (isInsert || isUpdate) writtenTables.push(table);

    if (!isInsert && !isUpdate && !single) listReadTables.push(table);



    if (table === "line_users") {
      const ids = inValuesOf(calls);
      return Promise.resolve({
        data: db.lineUsers.filter((u) => ids.includes(u.id)),
        error: null,
      });
    }

    if (table === "user_progress") {
      if (single) {
        const userId = String(filtersOf(calls).user_id);
        const override = db.recheckLastPlayedAt?.[userId];
        const row = db.progress.find((p) => p.user_id === userId) ?? null;
        return Promise.resolve({
          data:
            override !== undefined
              ? { last_played_at: override }
              : row
                ? { last_played_at: row.last_played_at }
                : null,
          error: null,
        });
      }
      const ids = inValuesOf(calls);
      return Promise.resolve({
        data: db.progress.filter((p) => ids.includes(p.user_id)),
        error: null,
      });
    }

    if (table === "notification_deliveries") {
      if (isUpdate) {
        const patch = calls.find((c) => c.fn === "update")!.args[0] as Record<string, unknown>;
        const filters = filtersOf(calls);
        deliveryUpdates.push({ filters, patch });
        for (const row of db.deliveries) {
          if (
            row.user_id === filters.user_id &&
            row.notification_type === filters.notification_type &&
            row.local_date === filters.local_date
          ) {
            Object.assign(row, patch);
          }
        }
        return Promise.resolve({ data: null, error: null });
      }
      const ids = inValuesOf(calls);
      return Promise.resolve({
        data: db.deliveries.filter((d) => ids.includes(d.user_id)),
        error: null,
      });
    }

    if (table === "line_sessions") {
      return Promise.resolve({ data: null, error: null });
    }

    return Promise.resolve({ data: null, error: null });
  }

  return {
    rpc(name: string, params: Record<string, string | number>) {
      rpcCalls.push(name);

      if (name === "reserve_notification_delivery") {
        const failure = db.reserveErrors?.shift();
        if (failure) return Promise.resolve({ data: null, error: failure });
        writtenTables.push("notification_deliveries");
        const row = {
          user_id: String(params.p_user_id),
          notification_type: String(params.p_notification_type),
          local_date: String(params.p_local_date),
          status: "pending",
        };
        const existing = db.deliveries.find(
          (d) =>
            d.user_id === row.user_id &&
            d.notification_type === row.notification_type &&
            d.local_date === row.local_date,
        );
        // 実装と同じ判定: 新規なら予約成立、既存が pending なら引き継ぐ。
        if (!existing) {
          db.deliveries.push(row);
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: existing.status === "pending", error: null });
      }

      const queued = db.candidateErrors?.shift();
      if (queued) return Promise.resolve({ data: null, error: queued });
      const from = String(params.p_delivery_window_start);
      const to = String(params.p_delivery_window_end);
      const rows = db.preferences
        .filter((p) => p.opt_in)
        .map((p) => ({
          user_id: p.user_id,
          line_user_id:
            db.lineUsers.find((u) => u.id === p.user_id)?.line_user_id ?? null,
          opt_in: p.opt_in,
          remind_hour: p.remind_hour,
          timezone: p.timezone,
          daily_reminder: p.daily_reminder,
          streak_risk: p.streak_risk,
          comeback: p.comeback,
          last_played_at:
            db.progress.find((x) => x.user_id === p.user_id)?.last_played_at ?? null,
          streak_count:
            db.progress.find((x) => x.user_id === p.user_id)?.streak_count ?? 0,
          deliveries: db.deliveries
            .filter(
              (d) => d.user_id === p.user_id && d.local_date >= from && d.local_date <= to,
            )
            .map((d) => ({
              notification_type: d.notification_type,
              local_date: d.local_date,
            })),
        }));
      return Promise.resolve({ data: rows, error: null });
    },
    from(table: string) {
      const calls: Call[] = [];
      const chain: Record<string, unknown> = {};
      for (const fn of ["select", "eq", "in", "gte", "lte", "limit", "order", "insert", "update", "upsert"]) {
        chain[fn] = (...args: unknown[]) => {
          calls.push({ fn, args });
          return chain;
        };
      }
      chain.maybeSingle = () => run(table, calls, true);
      chain.single = () => run(table, calls, true);
      chain.then = (
        onFulfilled: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => run(table, calls, false).then(onFulfilled, onRejected);
      return chain;
    },
  };
}

function preferenceRow(overrides: Partial<PreferenceRow> = {}): PreferenceRow {
  return {
    user_id: USER,
    opt_in: true,
    remind_hour: 20,
    timezone: "Asia/Tokyo",
    daily_reminder: true,
    streak_risk: true,
    comeback: true,
    ...overrides,
  };
}

function makeDb(overrides: Partial<Db> = {}): Db {
  return {
    preferences: [preferenceRow()],
    lineUsers: [{ id: USER, line_user_id: LINE_USER }],
    progress: [{ user_id: USER, last_played_at: null, streak_count: 0 }],
    deliveries: [],
    ...overrides,
  };
}

/** JST 2026-09-06 20:00（既定の設定時刻ちょうど）。 */
const AT_REMIND_HOUR = new Date("2026-09-06T20:00:00+09:00");

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writtenTables = [];
  listReadTables = [];
  rpcCalls = [];
  deliveryUpdates = [];
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "line-token";
  process.env.APP_BASE_URL = "https://example.com";
  process.env.CRON_SECRET = "cron-secret";
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "" });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  delete process.env.APP_BASE_URL;
  delete process.env.CRON_SECRET;
});

describe("runDueLineReminders", () => {
  it("設定時刻の未学習ユーザーへ push し、送信記録を sent にする", async () => {
    const db = makeDb();
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    const result = await runDueLineReminders(AT_REMIND_HOUR);

    expect(result).toMatchObject({ ok: true, scanned: 1, sent: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.line.me/v2/bot/message/push");
    const body = JSON.parse((init as { body: string }).body);
    expect(body.to).toBe(LINE_USER);
    expect(body.messages[0].text).toContain("https://example.com/today?");
    // アクセストークンはサーバー側の Authorization ヘッダーにだけ載る。
    expect((init as { headers: Record<string, string> }).headers.Authorization).toBe(
      "Bearer line-token",
    );
    expect(body.messages[0].text).not.toContain("line-token");
    expect(db.deliveries).toEqual([
      expect.objectContaining({
        user_id: USER,
        notification_type: "daily_reminder",
        local_date: "2026-09-06",
        status: "sent",
      }),
    ]);
  });

  it("判定材料の取得が一時的に失敗しても1回だけ引き直して送信する", async () => {
    // 定時リマインドは1日1時間しか評価されない。その1回を一時障害で落とすと
    // その日の通知が丸ごと失われるため、1度だけ引き直す。
    const db = makeDb({
      candidateErrors: [{ code: "504", message: "Gateway Timeout" }],
    });
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    vi.useFakeTimers();
    const pending = runDueLineReminders(AT_REMIND_HOUR);
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await pending;
    vi.useRealTimers();

    expect(result).toMatchObject({ ok: true, sent: 1, failed: 0 });
    expect(db.deliveries[0]).toMatchObject({ status: "sent" });
  });

  it("引き直しても失敗したら理由に中身を載せ、何も送らない", async () => {
    // "preference query failed" とだけ返していた頃は、権限・スキーマ・タイムアウトの
    // どれが起きているのか外から判別できなかった。
    const db = makeDb({
      candidateErrors: [
        { code: "504", message: "Gateway Timeout" },
        { code: "504", message: "Gateway Timeout" },
      ],
    });
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    vi.useFakeTimers();
    const pending = runDueLineReminders(AT_REMIND_HOUR);
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await pending;
    vi.useRealTimers();

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("candidate query failed");
    expect(result.reason).toContain("504");
    expect(result.reason).toContain("Gateway Timeout");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.deliveries).toHaveLength(0);
    // 失敗しても学習データには触れない。
    expect(writtenTables).toEqual([]);
  });

  it("判定材料を1本の RPC でまとめて取る", async () => {
    // REST を4本引いていた頃は、本番の PostgREST が返す 504 に当たるたびに
    // その回の通知が失われていた。往復を増やす変更が入らないよう固定する。
    const db = makeDb();
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    await runDueLineReminders(AT_REMIND_HOUR);

    expect(rpcCalls.filter((name) => name === "list_due_notification_candidates")).toHaveLength(
      1,
    );
    // 設定・LINE連携・配信記録を個別に一覧取得しない（送信直前の再確認だけは残る）。
    expect(listReadTables).not.toContain("notification_preferences");
    expect(listReadTables).not.toContain("line_users");
    expect(listReadTables).not.toContain("notification_deliveries");
  });

  it("通知OFFのユーザーは対象にしない", async () => {
    const db = makeDb({ preferences: [preferenceRow({ opt_in: false })] });
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    const result = await runDueLineReminders(AT_REMIND_HOUR);

    expect(result).toMatchObject({ ok: true, scanned: 0, sent: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("当日学習済みのユーザーへは送らない", async () => {
    const db = makeDb({
      progress: [
        {
          user_id: USER,
          last_played_at: new Date("2026-09-06T09:00:00+09:00").toISOString(),
          streak_count: 3,
        },
      ],
    });
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    const result = await runDueLineReminders(AT_REMIND_HOUR);

    expect(result).toMatchObject({ sent: 0, skipped: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.deliveries).toHaveLength(0);
  });

  it("送信直前の再確認で当日学習済みになっていたら送らない", async () => {
    const db = makeDb({
      // 一覧取得の時点では未学習だが、その後に学習を終えたケース。
      recheckLastPlayedAt: {
        [USER]: new Date("2026-09-06T19:59:00+09:00").toISOString(),
      },
    });
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    const result = await runDueLineReminders(AT_REMIND_HOUR);

    expect(result).toMatchObject({ sent: 0, skipped: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
    // 予約もしないので枠を消費しない。
    expect(db.deliveries).toHaveLength(0);
  });

  it("予約が一時的に失敗しても引き直して送信する", async () => {
    // 判定も送信直前の再確認も通ったのに、予約の書き込みだけが 504 で落ちて
    // 通知が出せない事象が本番で起きた（2026-09-14 18:00 JST）。
    const db = makeDb({ reserveErrors: [{ message: "Gateway Timeout" }] });
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    vi.useFakeTimers();
    const pending = runDueLineReminders(AT_REMIND_HOUR);
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await pending;
    vi.useRealTimers();

    expect(result).toMatchObject({ ok: true, sent: 1, failed: 0 });
    expect(db.deliveries[0]).toMatchObject({ status: "sent" });
  });

  it("予約が2回とも失敗したら送らない", async () => {
    const db = makeDb({
      reserveErrors: [{ message: "Gateway Timeout" }, { message: "Gateway Timeout" }],
    });
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    vi.useFakeTimers();
    const pending = runDueLineReminders(AT_REMIND_HOUR);
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await pending;
    vi.useRealTimers();

    expect(result).toMatchObject({ ok: true, sent: 0, skipped: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.deliveries).toHaveLength(0);
  });

  it("同一ユーザー・同一種別・同一日の重複送信を防ぐ", async () => {
    const db = makeDb({
      deliveries: [
        {
          user_id: USER,
          notification_type: "daily_reminder",
          local_date: "2026-09-06",
          status: "sent",
        },
      ],
    });
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    const result = await runDueLineReminders(AT_REMIND_HOUR);

    expect(result).toMatchObject({ sent: 0, skipped: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.deliveries).toHaveLength(1);
  });

  it("同じ日にすでに別種別を送っていれば上限で送らない", async () => {
    const db = makeDb({
      progress: [
        {
          user_id: USER,
          last_played_at: new Date("2026-09-05T20:00:00+09:00").toISOString(),
          streak_count: 5,
        },
      ],
      deliveries: [
        {
          user_id: USER,
          notification_type: "comeback",
          local_date: "2026-09-06",
          status: "sent",
        },
      ],
    });
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    const result = await runDueLineReminders(AT_REMIND_HOUR);

    expect(result).toMatchObject({ sent: 0, skipped: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("push 失敗を failed として記録し、学習テーブルには一切書き込まない", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" });
    const db = makeDb();
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    const result = await runDueLineReminders(AT_REMIND_HOUR);

    expect(result).toMatchObject({ ok: true, sent: 0, failed: 1 });
    expect(db.deliveries[0]).toMatchObject({ status: "failed" });
    expect(deliveryUpdates).toHaveLength(1);
    // 書き込み先は通知用テーブルだけ。進捗・回答・ストリークには触れない。
    expect(new Set(writtenTables)).toEqual(
      new Set(["notification_deliveries", "line_sessions"]),
    );
  });

  it("LINE 未連携のユーザーには push しない", async () => {
    const db = makeDb({ lineUsers: [{ id: USER, line_user_id: null }] });
    mocks.getServiceSupabase.mockReturnValue(createSupabase(db));

    const result = await runDueLineReminders(AT_REMIND_HOUR);

    expect(result).toMatchObject({ sent: 0, skipped: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("アクセストークン未設定なら何も送らない", async () => {
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    mocks.getServiceSupabase.mockReturnValue(createSupabase(makeDb()));

    const result = await runDueLineReminders(AT_REMIND_HOUR);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("line access token not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Supabase 未設定なら実行しない", async () => {
    mocks.getServiceSupabase.mockReturnValue(null);

    const result = await runDueLineReminders(AT_REMIND_HOUR);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("supabase not configured");
  });
});

describe("GET /api/cron/line-reminder", () => {
  function request(headers: Record<string, string> = {}) {
    return new Request("https://example.com/api/cron/line-reminder", { headers });
  }

  it("CRON_SECRET 未設定では実行せず 503", async () => {
    delete process.env.CRON_SECRET;
    const res = await cronRoute(request({ authorization: "Bearer cron-secret" }));
    expect(res.status).toBe(503);
  });

  it("秘密情報が一致しなければ 401", async () => {
    mocks.getServiceSupabase.mockReturnValue(createSupabase(makeDb()));
    expect((await cronRoute(request())).status).toBe(401);
    expect((await cronRoute(request({ authorization: "Bearer wrong" }))).status).toBe(401);
    expect((await cronRoute(request({ authorization: "cron-secret" }))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("正しい秘密情報なら実行結果を返す", async () => {
    mocks.getServiceSupabase.mockReturnValue(createSupabase(makeDb()));
    const res = await cronRoute(request({ authorization: "Bearer cron-secret" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, scanned: 1 });
  });
});
