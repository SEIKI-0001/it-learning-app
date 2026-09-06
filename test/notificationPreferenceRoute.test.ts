import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { GET, POST } from "@/app/api/notifications/preference/route";
import { DEFAULT_NOTIFICATION_PREFERENCE } from "@/types/notification";

const USER = "10000000-0000-0000-0000-000000000001";

type Row = {
  opt_in: boolean;
  remind_hour: number;
  timezone: string;
  daily_reminder: boolean;
  streak_risk: boolean;
  comeback: boolean;
};

let stored: Row | null = null;
let upserted: Record<string, unknown> | null = null;

function createSupabase() {
  return {
    from() {
      const chain: Record<string, unknown> = {};
      let pendingUpsert: Record<string, unknown> | null = null;
      for (const fn of ["select", "eq"]) {
        chain[fn] = () => chain;
      }
      chain.upsert = (row: Record<string, unknown>) => {
        pendingUpsert = row;
        return chain;
      };
      chain.maybeSingle = () => Promise.resolve({ data: stored, error: null });
      chain.then = (
        onFulfilled: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => {
        if (pendingUpsert) {
          upserted = pendingUpsert;
          stored = {
            opt_in: Boolean(pendingUpsert.opt_in),
            remind_hour: Number(pendingUpsert.remind_hour),
            timezone: String(pendingUpsert.timezone),
            daily_reminder: Boolean(pendingUpsert.daily_reminder),
            streak_risk: Boolean(pendingUpsert.streak_risk),
            comeback: Boolean(pendingUpsert.comeback),
          };
        }
        return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);
      };
      return chain;
    },
  };
}

function postRequest(body: unknown) {
  return new Request("https://example.com/api/notifications/preference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  stored = null;
  upserted = null;
  mocks.getRequestUserId.mockResolvedValue(USER);
  mocks.getServiceSupabase.mockReturnValue(createSupabase());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/notifications/preference", () => {
  it("未設定なら既定値（オプトイン OFF）を返す", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      preference: DEFAULT_NOTIFICATION_PREFERENCE,
    });
  });

  it("未ログインでは 401", async () => {
    mocks.getRequestUserId.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
});

describe("POST /api/notifications/preference", () => {
  it("オプトインと時刻を保存できる", async () => {
    const res = await POST(postRequest({ optIn: true, remindHour: 7 }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { preference: { optIn: boolean; remindHour: number } };
    expect(data.preference).toMatchObject({ optIn: true, remindHour: 7 });
    expect(upserted).toMatchObject({ user_id: USER, opt_in: true, remind_hour: 7 });
  });

  it("停止（optIn: false）を保存できる", async () => {
    stored = {
      opt_in: true,
      remind_hour: 7,
      timezone: "Asia/Tokyo",
      daily_reminder: true,
      streak_risk: true,
      comeback: true,
    };
    const res = await POST(postRequest({ optIn: false }));
    expect(res.status).toBe(200);
    // 停止しても時刻など他の設定は保持する（再開時に選び直させない）。
    expect(upserted).toMatchObject({ opt_in: false, remind_hour: 7 });
  });

  it("不正な時刻・タイムゾーンは既定へ正規化して保存する", async () => {
    await POST(postRequest({ optIn: true, remindHour: 99, timezone: "Not/AZone" }));
    expect(upserted).toMatchObject({
      remind_hour: DEFAULT_NOTIFICATION_PREFERENCE.remindHour,
      timezone: DEFAULT_NOTIFICATION_PREFERENCE.timezone,
    });
  });

  it("未ログインでは保存しない", async () => {
    mocks.getRequestUserId.mockResolvedValue(null);
    const res = await POST(postRequest({ optIn: true }));
    expect(res.status).toBe(401);
    expect(upserted).toBeNull();
  });
});
