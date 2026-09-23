// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dismissMochitBreakOffer,
  endMochitFocus,
  getFocusSessionServerSnapshot,
  getFocusSessionSnapshot,
  loadFocusSessionLog,
  MOCHIT_FOCUS_SESSION_STORAGE_KEY,
  pauseMochitFocus,
  resetFocusSessionStoreForTest,
  resumeMochitFocus,
  startMochitBreak,
  startMochitFocus,
  subscribeFocusSession,
  subscribeFocusSessionEvents,
} from "@/components/mochit/mochitFocusSessionStore";
import { createIdleFocusSession, type FocusSessionEvent } from "@/components/mochit/mochitFocusSession";

const MIN = 60_000;
const T0 = 1_700_000_000_000;

// jsdom はこの環境では window.localStorage を用意しないため、他のテスト（例:
// pendingAssessmentFinalization.test.ts）と同じ Map ベースのスタブを与える。
const storageValues = new Map<string, string>();
const localStorageStub: Storage = {
  get length() {
    return storageValues.size;
  },
  clear() {
    storageValues.clear();
  },
  getItem(key) {
    return storageValues.get(key) ?? null;
  },
  key(index) {
    return [...storageValues.keys()][index] ?? null;
  },
  removeItem(key) {
    storageValues.delete(key);
  },
  setItem(key, value) {
    storageValues.set(key, String(value));
  },
};

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageStub,
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  resetFocusSessionStoreForTest();
  window.localStorage.clear();
});

afterEach(() => {
  resetFocusSessionStoreForTest();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("mochitFocusSessionStore: 基本の保存・購読なし取得", () => {
  it("サーバースナップショットは idle", () => {
    expect(getFocusSessionServerSnapshot().phase).toBe("idle");
  });

  it("startMochitFocus は localStorage へ保存し、snapshot が focus になる", () => {
    startMochitFocus();
    const raw = window.localStorage.getItem(MOCHIT_FOCUS_SESSION_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.phase).toBe("focus");
    expect(getFocusSessionSnapshot().phase).toBe("focus");
    expect(getFocusSessionSnapshot().endsAt).toBe(T0 + 25 * MIN);
  });

  it("何も変わっていなければ snapshot の参照は同じまま", () => {
    startMochitFocus();
    const a = getFocusSessionSnapshot();
    const b = getFocusSessionSnapshot();
    expect(a).toBe(b);
  });
});

describe("mochitFocusSessionStore: ページ遷移・リロード相当", () => {
  it("resetFocusSessionStoreForTest 後も localStorage が残っていれば同じ endsAt で復元される", () => {
    startMochitFocus();
    const before = getFocusSessionSnapshot();
    expect(before.phase).toBe("focus");
    resetFocusSessionStoreForTest();
    const after = getFocusSessionSnapshot();
    expect(after.phase).toBe("focus");
    expect(after.endsAt).toBe(before.endsAt);
  });
});

describe("mochitFocusSessionStore: 購読者ありでの完了検知", () => {
  it("25分進めると focusCompleted が1回だけ届き、記録が1件書かれる", () => {
    const listener = vi.fn();
    const events: FocusSessionEvent[] = [];
    const unsubscribe = subscribeFocusSession(listener);
    const unsubscribeEvents = subscribeFocusSessionEvents((event) => events.push(event));

    startMochitFocus();
    const endsAt = getFocusSessionSnapshot().endsAt as number;

    vi.advanceTimersByTime(25 * MIN + 200);

    const completions = events.filter((e) => e.type === "focusCompleted");
    expect(completions).toHaveLength(1);
    expect(completions[0]).toMatchObject({ type: "focusCompleted", at: endsAt });

    const log = loadFocusSessionLog();
    expect(log).toHaveLength(1);
    expect(log[0].completed).toBe(true);

    unsubscribe();
    unsubscribeEvents();
  });

  it("購読者が居ないとタイマーは張られない（無購読中は境界を跨いでも自動では完了しない）", () => {
    startMochitFocus();
    vi.advanceTimersByTime(25 * MIN + 200);
    // 誰も見ていない間はタイマーが無いので状態は focus のまま保存されている
    const raw = JSON.parse(window.localStorage.getItem(MOCHIT_FOCUS_SESSION_STORAGE_KEY) as string);
    expect(raw.phase).toBe("focus");
    // 購読すると、その場で advance が走り完了する
    const events: FocusSessionEvent[] = [];
    const unsubscribeEvents = subscribeFocusSessionEvents((event) => events.push(event));
    const unsubscribe = subscribeFocusSession(() => {});
    expect(events.some((e) => e.type === "focusCompleted")).toBe(true);
    unsubscribe();
    unsubscribeEvents();
  });
});

describe("mochitFocusSessionStore: タブ非表示からの復帰", () => {
  it("タイマーを進めずに時計だけ進め、visibilitychange で復帰すると event.at は本来の endsAt", () => {
    const events: FocusSessionEvent[] = [];
    const unsubscribe = subscribeFocusSession(() => {});
    const unsubscribeEvents = subscribeFocusSessionEvents((event) => events.push(event));

    startMochitFocus();
    const endsAt = getFocusSessionSnapshot().endsAt as number;

    // タイマーを走らせず時計だけ+27分進める（非表示タブで間引かれた想定）
    vi.setSystemTime(T0 + 27 * MIN);

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const completions = events.filter((e) => e.type === "focusCompleted");
    expect(completions).toHaveLength(1);
    expect(completions[0]).toMatchObject({ type: "focusCompleted", at: endsAt });
    expect(getFocusSessionSnapshot().phase).toBe("idle");

    unsubscribe();
    unsubscribeEvents();
  });
});

describe("mochitFocusSessionStore: 各操作でスナップショット更新・購読者へ通知", () => {
  it("pause/resume/end/startBreak/dismissBreakOffer", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFocusSession(listener);
    listener.mockClear();

    startMochitFocus();
    expect(listener).toHaveBeenCalled();
    listener.mockClear();

    vi.advanceTimersByTime(5 * MIN);
    pauseMochitFocus();
    expect(getFocusSessionSnapshot().phase).toBe("paused");
    expect(listener).toHaveBeenCalled();
    listener.mockClear();

    vi.advanceTimersByTime(MIN);
    resumeMochitFocus();
    expect(getFocusSessionSnapshot().phase).toBe("focus");
    expect(listener).toHaveBeenCalled();
    listener.mockClear();

    endMochitFocus();
    expect(getFocusSessionSnapshot().phase).toBe("idle");
    expect(listener).toHaveBeenCalled();
    listener.mockClear();

    // 集中完了直後の休憩提案がある状態を作ってから startBreak / dismiss を確認する
    resetFocusSessionStoreForTest();
    window.localStorage.clear();
    const unsubscribe2 = subscribeFocusSession(listener);
    listener.mockClear();
    startMochitFocus();
    vi.advanceTimersByTime(25 * MIN + 200);
    listener.mockClear();
    expect(getFocusSessionSnapshot().phase).toBe("idle");

    startMochitBreak();
    expect(getFocusSessionSnapshot().phase).toBe("break");
    expect(listener).toHaveBeenCalled();
    listener.mockClear();

    endMochitFocus();
    expect(getFocusSessionSnapshot().phase).toBe("idle");

    unsubscribe();
    unsubscribe2();
  });

  it("dismissMochitBreakOffer は休憩提案だけを消す", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFocusSession(listener);
    startMochitFocus();
    vi.advanceTimersByTime(25 * MIN + 200);
    expect(getFocusSessionSnapshot().breakOfferUntil).not.toBeNull();
    listener.mockClear();

    dismissMochitBreakOffer();
    expect(getFocusSessionSnapshot().breakOfferUntil).toBeNull();
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });
});

describe("mochitFocusSessionStore: クロスタブ", () => {
  it("別タブが書いた state を storage イベントで取り込み、通知する", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeFocusSession(listener);
    listener.mockClear();

    const otherStart = T0 + MIN;
    const otherState = {
      version: 1,
      phase: "focus",
      segment: "focus",
      endsAt: otherStart + 25 * MIN,
      remainingMs: null,
      segmentMs: 25 * MIN,
      focusStartedAt: otherStart,
      breakOfferUntil: null,
      config: { focusMs: 25 * MIN, breakMs: 5 * MIN },
    };
    window.localStorage.setItem(MOCHIT_FOCUS_SESSION_STORAGE_KEY, JSON.stringify(otherState));
    window.dispatchEvent(
      new StorageEvent("storage", { key: MOCHIT_FOCUS_SESSION_STORAGE_KEY, newValue: JSON.stringify(otherState) }),
    );

    expect(getFocusSessionSnapshot().phase).toBe("focus");
    expect(getFocusSessionSnapshot().endsAt).toBe(otherStart + 25 * MIN);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it("他タブが先に完了させていた場合、自タブのタイマー発火は二重に完了イベントを出さない", () => {
    const events: FocusSessionEvent[] = [];
    const unsubscribe = subscribeFocusSession(() => {});
    const unsubscribeEvents = subscribeFocusSessionEvents((event) => events.push(event));

    startMochitFocus();

    // 他タブが先に完了処理をして idle（提案の期限も無し）を書き込んだ、という想定
    const idleAfterOtherTabCompleted = createIdleFocusSession();
    window.localStorage.setItem(MOCHIT_FOCUS_SESSION_STORAGE_KEY, JSON.stringify(idleAfterOtherTabCompleted));

    // 自タブの元々のタイマー（25分後）がそのまま発火する
    vi.advanceTimersByTime(25 * MIN + 200);

    expect(events.filter((e) => e.type === "focusCompleted")).toHaveLength(0);
    expect(getFocusSessionSnapshot().phase).toBe("idle");

    unsubscribe();
    unsubscribeEvents();
  });
});

describe("mochitFocusSessionStore: 壊れた保存データ", () => {
  it("不正な JSON でも例外を投げず idle を返す", () => {
    window.localStorage.setItem(MOCHIT_FOCUS_SESSION_STORAGE_KEY, "{not json");
    expect(() => getFocusSessionSnapshot()).not.toThrow();
    expect(getFocusSessionSnapshot().phase).toBe("idle");
  });
});
