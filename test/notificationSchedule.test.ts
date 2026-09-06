import { describe, expect, it } from "vitest";
import {
  COMEBACK_MIN_DAYS_AWAY,
  MAX_NOTIFICATIONS_PER_LOCAL_DAY,
  STREAK_RISK_HOUR,
  daysAwayInTimeZone,
  decideNotification,
  hasStudiedOnLocalDate,
  localDateInTimeZone,
  resolveTimeZone,
  type NotificationCandidate,
} from "@/lib/notifications/schedule";
import { buildNotificationText, notificationLink } from "@/lib/notifications/messages";
import { normalizeNotificationPreferenceInput } from "@/lib/notifications/preferences";
import {
  DEFAULT_NOTIFICATION_PREFERENCE,
  type NotificationPreference,
} from "@/types/notification";

const TOKYO = "Asia/Tokyo";

function preference(overrides: Partial<NotificationPreference> = {}): NotificationPreference {
  return { ...DEFAULT_NOTIFICATION_PREFERENCE, optIn: true, remindHour: 20, ...overrides };
}

function candidate(overrides: Partial<NotificationCandidate> = {}): NotificationCandidate {
  return {
    preference: preference(),
    lastPlayedAt: null,
    streakCount: 0,
    deliveredTypesToday: [],
    ...overrides,
  };
}

/** JST の指定時刻に対応する UTC の Date。 */
function jst(dateTime: string): Date {
  return new Date(`${dateTime}+09:00`);
}

describe("ローカル日付境界", () => {
  it("JST 23:50 は当日、翌 00:10 は翌日として数える", () => {
    expect(localDateInTimeZone(jst("2026-09-06T23:50:00"), TOKYO)).toBe("2026-09-06");
    expect(localDateInTimeZone(jst("2026-09-07T00:10:00"), TOKYO)).toBe("2026-09-07");
  });

  it("UTC 経過時間ではなくローカル日付で離脱日数を数える", () => {
    // 23:50 の学習から 12 時間後は「1日空いた」（24時間未満でも日付は変わる）。
    const lastPlayedAt = jst("2026-09-06T23:50:00").toISOString();
    expect(daysAwayInTimeZone(lastPlayedAt, jst("2026-09-07T11:50:00"), TOKYO)).toBe(1);
    expect(hasStudiedOnLocalDate(lastPlayedAt, jst("2026-09-06T23:59:00"), TOKYO)).toBe(true);
  });

  it("解釈できないタイムゾーンは既定へ落として判定を止めない", () => {
    expect(resolveTimeZone("Not/AZone")).toBe(DEFAULT_NOTIFICATION_PREFERENCE.timezone);
    expect(resolveTimeZone("America/New_York")).toBe("America/New_York");
  });

  it("タイムゾーンごとに送信時刻が変わる", () => {
    const nyPreference = preference({ timezone: "America/New_York", remindHour: 20 });
    // JST 2026-09-07 09:00 = NY 2026-09-06 20:00。
    const decision = decideNotification(
      candidate({ preference: nyPreference }),
      jst("2026-09-07T09:00:00"),
    );
    expect(decision?.type).toBe("daily_reminder");
    expect(decision?.localDate).toBe("2026-09-06");
  });
});

describe("送信可否の判定", () => {
  it("未オプトインには送らない", () => {
    const decision = decideNotification(
      candidate({ preference: preference({ optIn: false }) }),
      jst("2026-09-06T20:00:00"),
    );
    expect(decision).toBeNull();
  });

  it("設定時刻ちょうどのときだけ定時リマインドを出す", () => {
    expect(decideNotification(candidate(), jst("2026-09-06T20:00:00"))?.type).toBe(
      "daily_reminder",
    );
    expect(decideNotification(candidate(), jst("2026-09-06T19:00:00"))).toBeNull();
  });

  it("当日学習済みなら定時リマインドを送らない", () => {
    const decision = decideNotification(
      candidate({ lastPlayedAt: jst("2026-09-06T08:00:00").toISOString() }),
      jst("2026-09-06T20:00:00"),
    );
    expect(decision).toBeNull();
  });

  it("同一ローカル日にすでに1通送っていれば種別を問わず送らない", () => {
    expect(MAX_NOTIFICATIONS_PER_LOCAL_DAY).toBe(1);
    const decision = decideNotification(
      candidate({ streakCount: 5, deliveredTypesToday: ["daily_reminder"] }),
      jst("2026-09-06T20:00:00"),
    );
    expect(decision).toBeNull();
  });

  it("種別を停止していれば下位の種別へ落ちる", () => {
    const decision = decideNotification(
      candidate({
        preference: preference({ streakRisk: false }),
        streakCount: 5,
        lastPlayedAt: jst("2026-09-05T20:00:00").toISOString(),
      }),
      jst("2026-09-06T20:00:00"),
    );
    expect(decision?.type).toBe("daily_reminder");
  });

  it("すべての種別を停止すれば何も送らない", () => {
    const decision = decideNotification(
      candidate({
        preference: preference({
          dailyReminder: false,
          streakRisk: false,
          comeback: false,
        }),
        streakCount: 5,
      }),
      jst("2026-09-06T20:00:00"),
    );
    expect(decision).toBeNull();
  });
});

describe("種別の優先順位", () => {
  it("3日以上空いたユーザーには復帰通知を優先する", () => {
    const lastPlayedAt = jst("2026-09-03T20:00:00").toISOString();
    const decision = decideNotification(
      candidate({ lastPlayedAt, streakCount: 4 }),
      jst("2026-09-06T20:00:00"),
    );
    expect(decision?.type).toBe("comeback");
    expect(decision?.daysAway).toBe(COMEBACK_MIN_DAYS_AWAY);
  });

  it("連続学習中の未学習日はストリーク危機を優先する", () => {
    const decision = decideNotification(
      candidate({
        lastPlayedAt: jst("2026-09-05T20:00:00").toISOString(),
        streakCount: 4,
      }),
      jst("2026-09-06T20:00:00"),
    );
    expect(decision?.type).toBe("streak_risk");
  });

  it("連続1日ではストリーク危機にせず通常リマインドにする", () => {
    const decision = decideNotification(
      candidate({
        lastPlayedAt: jst("2026-09-05T20:00:00").toISOString(),
        streakCount: 1,
      }),
      jst("2026-09-06T20:00:00"),
    );
    expect(decision?.type).toBe("daily_reminder");
  });

  it("設定時刻が早いユーザーには 21 時の保険としてストリーク危機だけ出す", () => {
    const early = preference({ remindHour: 8 });
    const at21 = jst(`2026-09-06T${String(STREAK_RISK_HOUR).padStart(2, "0")}:00:00`);
    expect(
      decideNotification(
        candidate({
          preference: early,
          streakCount: 3,
          lastPlayedAt: jst("2026-09-05T20:00:00").toISOString(),
        }),
        at21,
      )?.type,
    ).toBe("streak_risk");
    // ストリークが無ければ 21 時には何も出さない（定時リマインドを二重に出さない）。
    expect(
      decideNotification(candidate({ preference: early, streakCount: 0 }), at21),
    ).toBeNull();
  });
});

describe("通知文とリンク", () => {
  it("復帰通知は責めず、次の具体行動を示す", () => {
    const text = buildNotificationText(
      { type: "comeback", localDate: "2026-09-06", daysAway: 5, streakCount: 0 },
      "https://example.com/today",
    );
    expect(text).toContain("おかえりなさい");
    expect(text).toContain("5日ぶり");
    expect(text).toContain("https://example.com/today");
    expect(text).not.toMatch(/サボ|遅れ|失敗|できていません/);
  });

  it("ストリーク危機は「失う」ではなく「短時間で守れる」を主文にする", () => {
    const text = buildNotificationText(
      { type: "streak_risk", localDate: "2026-09-06", daysAway: 1, streakCount: 7 },
      "https://example.com/today",
    );
    expect(text).toContain("3分あれば");
    expect(text).not.toContain("失われ");
    expect(text).not.toContain("失います");
  });

  it("通知文に根拠のない保証表現を含めない", () => {
    for (const type of ["daily_reminder", "streak_risk", "comeback"] as const) {
      const text = buildNotificationText(
        { type, localDate: "2026-09-06", daysAway: 3, streakCount: 3 },
        "https://example.com/today",
      );
      expect(text).not.toMatch(/必ず合格|合格率が/);
    }
  });

  it("リンクは /today へ着地し、トークンと送信元を持つ", () => {
    const link = notificationLink("https://example.com/", "tok-1", "streak_risk");
    expect(link).toContain("https://example.com/today?");
    expect(link).toContain("t=tok-1");
    expect(link).toContain("from=line_streak_risk");
  });
});

describe("設定の正規化", () => {
  it("範囲外の時刻・不正なタイムゾーンを既定へ落とす", () => {
    const normalized = normalizeNotificationPreferenceInput({
      optIn: true,
      remindHour: 99,
      timezone: "Not/AZone",
    });
    expect(normalized.remindHour).toBe(DEFAULT_NOTIFICATION_PREFERENCE.remindHour);
    expect(normalized.timezone).toBe(DEFAULT_NOTIFICATION_PREFERENCE.timezone);
    expect(normalized.optIn).toBe(true);
  });

  it("欠けた項目は現在値を引き継ぐ（部分更新）", () => {
    const current = preference({ remindHour: 7, timezone: "America/New_York" });
    const normalized = normalizeNotificationPreferenceInput({ optIn: false }, current);
    expect(normalized).toEqual({ ...current, optIn: false });
  });
});
