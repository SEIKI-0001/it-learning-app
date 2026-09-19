// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/types";
import type { ReferenceBook } from "@/types/referenceBook";
import { getAllTopics, getTopic } from "@/lib/content";
import { initializeAppState } from "@/lib/storage";
import { generateLearningPlan } from "@/lib/studyPlanner";
import { buildCheckpointGate, getCheckpointProgress } from "@/lib/checkpoints";
import { referenceBookFromPreset } from "@/lib/referenceBookPresets";
import { referenceBookProgress } from "@/lib/referenceBook";
import ReadingCheck from "@/components/today/ReadingCheck";
import TodayReferenceGuide from "@/components/learn/TodayReferenceGuide";
import OnboardingPage from "@/app/onboarding/page";

// /today の参考書カード（今日読む場所＋「どこまで読んだか」）とオンボーディングの参考書選択。
// 参考書は「サービスが決めたトピック → 参考書の章・節」の変換だけを担い、学習順序には関与しない。

const push = vi.hoisted(() => vi.fn());
const reportDailyProgress = vi.hoisted(() => vi.fn(async () => true));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push }),
  usePathname: () => "/today",
}));

vi.mock("@/lib/useBillingStatus", () => ({
  useBillingStatus: () => ({ status: null, loading: false, refresh: vi.fn() }),
}));

// 未ログイン（端末保存のみ）で動かす。DB 同期は getUserId がある時だけ走る。
vi.mock("@/lib/userSession", () => ({
  getUserId: () => null,
  reportDailyProgress,
  readTokenFromUrl: () => null,
  resolveToken: vi.fn(),
  saveProfileToDb: vi.fn(),
  saveProgressToDb: vi.fn(),
  setUserId: vi.fn(),
}));

const BOOK_KEY = "fequest:referenceBook";
const KITAMI = "gihyo-kitami-itpass-r08";
const NETWORK = getTopic("tech-network-address")!;

function storeBook(book: ReferenceBook | null) {
  if (book) window.localStorage.setItem(BOOK_KEY, JSON.stringify(book));
}

function storedBook(): ReferenceBook | null {
  const raw = window.localStorage.getItem(BOOK_KEY);
  return raw ? (JSON.parse(raw) as ReferenceBook) : null;
}

function networkSection(book: ReferenceBook | null) {
  const chapter = book?.chapters.find((c) => c.id === "kitami-r08-ch06");
  return chapter?.sections?.find((s) => s.id === "kitami-r08-ch06-s01");
}

// Node の組み込み localStorage が jsdom の実装を隠すため、Map ベースのスタブを入れる（既存テストと同じ方式）。
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
  window.localStorage.clear();
  push.mockReset();
  reportDailyProgress.mockClear();
});

afterEach(cleanup);

describe("Today の参考書カード", () => {
  it("登録した参考書の章・節を、今日のトピックに対して表示する", async () => {
    storeBook(referenceBookFromPreset(KITAMI));
    render(<ReadingCheck date="2026-09-19" topics={[NETWORK]} />);

    expect(await screen.findByText("Chapter 6 ネットワーク")).toBeInTheDocument();
    expect(screen.getByText("LAN・WAN・IPアドレス・DNS")).toBeInTheDocument();
    expect(
      screen.getByText("先にここを読んでから、アプリの解説・図解で確認しましょう。"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("reference-book-nudge")).not.toBeInTheDocument();
  });

  it("参考書が未登録なら referenceHints のキーワードに戻し、設定導線を出す", async () => {
    render(<ReadingCheck date="2026-09-19" topics={[NETWORK]} />);

    const keyword = NETWORK.referenceHints[0].keywords[0];
    expect(await screen.findByText(keyword)).toBeInTheDocument();
    expect(screen.getByText("参考書で探す")).toBeInTheDocument();
    expect(await screen.findByTestId("reference-book-nudge")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "参考書を設定する" })).toHaveAttribute(
      "href",
      "/settings/reference-book",
    );
  });

  it("設定導線は「あとで」で閉じ、しばらく出さない", async () => {
    const first = render(<ReadingCheck date="2026-09-19" topics={[NETWORK]} />);
    fireEvent.click(await screen.findByRole("button", { name: "あとで" }));
    expect(screen.queryByTestId("reference-book-nudge")).not.toBeInTheDocument();
    first.unmount();

    render(<ReadingCheck date="2026-09-20" topics={[NETWORK]} />);
    await screen.findByText("参考書で探す");
    expect(screen.queryByTestId("reference-book-nudge")).not.toBeInTheDocument();
  });

  it("「全部」で対象の節が読了になり、日次の記録も従来どおり送る", async () => {
    storeBook(referenceBookFromPreset(KITAMI));
    const before = referenceBookProgress(storedBook())!;
    render(<ReadingCheck date="2026-09-19" topics={[NETWORK]} />);
    await screen.findByText("Chapter 6 ネットワーク");

    fireEvent.click(screen.getByRole("radio", { name: "全部" }));

    expect(networkSection(storedBook())?.done).toBe(true);
    // /plan・/progress が読む進捗（同じ referenceBookProgress）も進む
    const after = referenceBookProgress(storedBook())!;
    expect(after.done).toBe(before.done + 1);
    expect(after.doneChapters).toBe(before.doneChapters + 1);
    expect(screen.getByText(/参考書の該当箇所を読了にしました/)).toBeInTheDocument();
    const daily = JSON.parse(window.localStorage.getItem("fequest:dailyReport:2026-09-19")!);
    expect(daily.level).toBe("all");
    expect(daily.readTargets).toEqual(["kitami-r08-ch06/kitami-r08-ch06-s01"]);
  });

  it("「半分」「少し」では読了にならない", async () => {
    storeBook(referenceBookFromPreset(KITAMI));
    render(<ReadingCheck date="2026-09-19" topics={[NETWORK]} />);
    await screen.findByText("Chapter 6 ネットワーク");

    fireEvent.click(screen.getByRole("radio", { name: "半分" }));
    expect(networkSection(storedBook())?.done).toBeUndefined();
    fireEvent.click(screen.getByRole("radio", { name: "少し" }));
    expect(networkSection(storedBook())?.done).toBeUndefined();
    expect(networkSection(storedBook())?.startedAt).toBeTruthy();
  });

  it("一度読了になった節は、回答を「半分」「まだ」に変えても未読に戻らない", async () => {
    storeBook(referenceBookFromPreset(KITAMI));
    render(<ReadingCheck date="2026-09-19" topics={[NETWORK]} />);
    await screen.findByText("Chapter 6 ネットワーク");

    fireEvent.click(screen.getByRole("radio", { name: "全部" }));
    fireEvent.click(screen.getByRole("radio", { name: "半分" }));
    fireEvent.click(screen.getByRole("radio", { name: "まだ" }));

    expect(networkSection(storedBook())?.done).toBe(true);
    expect(reportDailyProgress).not.toHaveBeenCalled(); // 未ログインなので DB 記録は無し
  });
});

describe("TodayReferenceGuide", () => {
  it("同じ節に紐づく複数トピックは1行にまとめる", () => {
    const book = referenceBookFromPreset(KITAMI);
    const lan = getTopic("tech-lan-wan")!;
    render(<TodayReferenceGuide topics={[NETWORK, lan]} book={book} />);
    expect(screen.getAllByText("Chapter 6 ネットワーク")).toHaveLength(1);
    expect(screen.getByText(`${NETWORK.title}、${lan.title}`)).toBeInTheDocument();
  });
});

describe("オンボーディングの参考書選択", () => {
  it("「あとで設定する」のままでも完了でき、参考書は保存しない", () => {
    render(<OnboardingPage />);
    expect(screen.getByRole("radio", { name: "あとで設定する" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "この内容でプランを作る" }));

    expect(push).toHaveBeenCalledWith("/today");
    expect(storedBook()).toBeNull();
  });

  it("プリセットを選ぶと章・節構成つきで保存する（プロフィールには持たない）", () => {
    const preset = referenceBookFromPreset(KITAMI)!;
    render(<OnboardingPage />);

    fireEvent.click(screen.getByRole("radio", { name: new RegExp(preset.title.slice(0, 10)) }));
    fireEvent.click(screen.getByRole("button", { name: "この内容でプランを作る" }));

    const saved = storedBook();
    expect(saved?.title).toBe(preset.title);
    expect(saved?.chapters.length).toBe(preset.chapters.length);
    const appState = JSON.parse(window.localStorage.getItem("fequest:appstate") ?? "{}");
    expect(JSON.stringify(appState.profile ?? {})).not.toContain(preset.title);
  });
});

describe("参考書は学習順序に関与しない", () => {
  it("参考書の有無で、今日のトピック・チェックポイント・過去問開始条件が変わらない", () => {
    const profile: UserProfile = {
      examDate: "2026-12-20",
      planStartDate: "2026-09-01",
      weekdayMinutes: 30,
      holidayMinutes: 60,
      confidence: 2,
      weakFields: ["technology"],
      studyStyle: "balanced",
      itExperience: "none",
      dailyMinutes: "30",
      examPlan: "decided",
    };
    const state = initializeAppState(profile);
    const topics = getAllTopics();
    const now = new Date("2026-09-19T09:00:00+09:00");
    const snapshot = () => {
      const plan = generateLearningPlan(state, topics, now);
      return JSON.stringify({
        today: plan.todayMenu,
        kakomonReady: plan.kakomonReady,
        kakomonStartDate: plan.kakomonStartDate,
        gate: buildCheckpointGate(state, getCheckpointProgress(state).currentCheckpointId),
      });
    };

    const without = snapshot();
    storeBook(referenceBookFromPreset(KITAMI));
    const withBook = snapshot();

    expect(withBook).toBe(without);
  });
});
