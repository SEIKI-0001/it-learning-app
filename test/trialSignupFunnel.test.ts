import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIRST_RUN_STEPS, FUNNEL_EVENTS, parseFunnelInput } from "@/lib/growth/funnel";
import {
  FIRST_RUN_KEY,
  FIRST_RUN_TTL_MS,
  claimFirstRunStep,
  isFirstRunActive,
  isFirstRunStepPending,
  isLessonPath,
} from "@/lib/growth/firstRunFunnel";
import {
  buildAttributionCookieValue,
  isAuthRedirectHost,
  parseAttributionCookie,
} from "@/lib/growth/attributionCookie";

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

describe("登録後の段階計測（firstRunFunnel）", () => {
  it("初回設定を開く前の段階は送らない", () => {
    const store = memoryStore();
    expect(claimFirstRunStep(store, "today_view", 0)).toBe(false);
    expect(isFirstRunActive(store, 0)).toBe(false);
  });

  it("onboarding_view から数え始め、各段階は1回だけ", () => {
    const store = memoryStore();
    expect(claimFirstRunStep(store, "onboarding_view", 0)).toBe(true);
    expect(claimFirstRunStep(store, "onboarding_view", 1)).toBe(false);
    expect(claimFirstRunStep(store, "today_view", 2)).toBe(true);
    expect(claimFirstRunStep(store, "today_view", 3)).toBe(false);
    expect(isFirstRunStepPending(store, "first_question_view", 4)).toBe(true);
  });

  it("初回解答まで進んだら以降は何も送らない", () => {
    const store = memoryStore();
    claimFirstRunStep(store, "onboarding_view", 0);
    expect(claimFirstRunStep(store, "first_answer", 1)).toBe(true);
    expect(isFirstRunActive(store, 2)).toBe(false);
    expect(claimFirstRunStep(store, "lesson_open", 3)).toBe(false);
  });

  it("期限を過ぎたら記録を消して数えない", () => {
    const store = memoryStore();
    claimFirstRunStep(store, "onboarding_view", 0);
    expect(claimFirstRunStep(store, "today_view", FIRST_RUN_TTL_MS + 1)).toBe(false);
    expect(store.map.has(FIRST_RUN_KEY)).toBe(false);
  });

  it("壊れた保存値は無視する", () => {
    const store = memoryStore();
    store.setItem(FIRST_RUN_KEY, "{oops");
    expect(isFirstRunActive(store, 0)).toBe(false);
  });

  it("レッスンのURLを見分ける", () => {
    expect(isLessonPath("/learn/system-development/development-lifecycle/mgmt-development-process")).toBe(true);
    expect(isLessonPath("/topics/tech-computer-core")).toBe(true);
    expect(isLessonPath("/learn")).toBe(false);
    expect(isLessonPath("/learn/system-development")).toBe(false);
    expect(isLessonPath("/today")).toBe(false);
  });
});

describe("新しい回遊イベント", () => {
  it("体験・登録・初回学習のイベントを受け付ける", () => {
    for (const event of ["trial_start", "trial_complete", "login_start", ...FIRST_RUN_STEPS]) {
      expect(parseFunnelInput({ event, path: "/lp/try", placement: "login_google" })).toMatchObject({
        event,
        targetPath: null,
      });
    }
  });

  it("DB の check 制約がコードのイベント一覧と一致する", () => {
    const sql = readFileSync("supabase/migrations/20261014090000_public_funnel_signup_steps.sql", "utf8");
    const body = sql.slice(sql.indexOf("check (event in ("));
    const listed = [...body.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(new Set(listed)).toEqual(new Set(FUNNEL_EVENTS));
  });
});

describe("流入元：ログインの往復を流入元にしない", () => {
  it("認証のホストを見分ける", () => {
    expect(isAuthRedirectHost("accounts.google.com")).toBe(true);
    expect(isAuthRedirectHost("abcd.supabase.co")).toBe(true);
    expect(isAuthRedirectHost("access.line.me")).toBe(true);
    expect(isAuthRedirectHost("www.google.com")).toBe(false);
    expect(isAuthRedirectHost("x.com")).toBe(false);
  });

  it("Google 認可から戻っただけなら Cookie を作らない", () => {
    expect(
      buildAttributionCookieValue({
        search: "",
        pathname: "/onboarding",
        referrer: "https://accounts.google.com/",
        currentHost: "shikaku-mochit.com",
        now: 0,
      }),
    ).toBeNull();
  });

  it("体験ページの utm は保持される", () => {
    const value = buildAttributionCookieValue({
      search: "?utm_source=x&utm_medium=social&utm_campaign=trial",
      pathname: "/lp/try",
      referrer: "https://t.co/abc",
      currentHost: "shikaku-mochit.com",
      now: 0,
    });
    expect(parseAttributionCookie(value)).toMatchObject({
      utmSource: "x",
      utmMedium: "social",
      utmCampaign: "trial",
      referrerHost: "t.co",
      landingPath: "/lp/try",
    });
  });
});
