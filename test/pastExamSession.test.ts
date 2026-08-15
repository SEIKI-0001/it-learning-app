// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  EXAM_MODE_DURATION_SECONDS,
  clearSession,
  createSession,
  formatRemaining,
  getResumableSnapshot,
  isTimeUp,
  loadSession,
  parseResumable,
  remainingSeconds,
  saveSession,
  sessionStorageKey,
  withAnswer,
  withAnswerExposure,
} from "@/lib/pastExam/session";
import {
  gradePastExam,
  incorrectResults,
  incorrectTopicIds,
  percentage,
  toGradableQuestion,
} from "@/lib/pastExam/scoring";
import { getPublishedOfficialQuestionsByYear } from "@/lib/questionBank/loader";
import type { PastExamAnswer } from "@/types/pastExam";

const QUESTIONS = getPublishedOfficialQuestionsByYear(2026).map(toGradableQuestion);

// このリポジトリの jsdom 環境は localStorage を持たないので、
// 既存テスト（floatingMochitPreferences.test.ts）と同じ差し替えを使う。
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
});
afterEach(() => {
  window.localStorage.clear();
});

describe("途中状態の保存キー", () => {
  it("fequest: プレフィクスなので、ログアウト時の一括削除で消える", () => {
    expect(sessionStorageKey("user-1", 2026, "practice")).toMatch(/^fequest:/);
  });

  it("ユーザー・年度・モードごとに別のキーになる", () => {
    const a = sessionStorageKey("user-1", 2026, "practice");
    const b = sessionStorageKey("user-2", 2026, "practice");
    const c = sessionStorageKey("user-1", 2026, "exam");
    const d = sessionStorageKey("user-1", 2025, "practice");
    expect(new Set([a, b, c, d]).size).toBe(4);
  });

  it("未ログインは anon 扱いで、ログイン済みユーザーと混ざらない", () => {
    expect(sessionStorageKey(null, 2026, "practice")).toContain(":anon:");
    expect(sessionStorageKey(null, 2026, "practice")).not.toBe(
      sessionStorageKey("user-1", 2026, "practice"),
    );
  });
});

describe("途中保存と再開", () => {
  it("保存した途中状態を読み戻せる", () => {
    const session = withAnswer(createSession(2026, "practice"), 1, "A", 12);
    saveSession("user-1", session);

    const restored = loadSession("user-1", 2026, "practice");
    expect(restored).not.toBeNull();
    expect(restored!.sessionId).toBe(session.sessionId);
    expect(restored!.answers[1].selected).toBe("A");
    expect(restored!.answers[1].timeSpentSeconds).toBe(12);
  });

  it("別ユーザーの途中状態は読めない", () => {
    saveSession("user-1", createSession(2026, "practice"));
    expect(loadSession("user-2", 2026, "practice")).toBeNull();
    expect(loadSession(null, 2026, "practice")).toBeNull();
  });

  it("別モードの途中状態は読めない", () => {
    saveSession("user-1", createSession(2026, "practice"));
    expect(loadSession("user-1", 2026, "exam")).toBeNull();
  });

  it("完了した演習は再開対象にならない", () => {
    const done = { ...createSession(2026, "practice"), completed: true };
    saveSession("user-1", done);
    expect(loadSession("user-1", 2026, "practice")).toBeNull();
  });

  it("壊れたデータは無視して null を返す（画面を止めない）", () => {
    window.localStorage.setItem(sessionStorageKey("user-1", 2026, "practice"), "{oops");
    expect(loadSession("user-1", 2026, "practice")).toBeNull();
  });

  it("clearSession で消える", () => {
    saveSession("user-1", createSession(2026, "practice"));
    clearSession("user-1", 2026, "practice");
    expect(loadSession("user-1", 2026, "practice")).toBeNull();
  });

  it("現在位置を保存して再開できる", () => {
    const session = { ...createSession(2026, "exam"), currentIndex: 42 };
    saveSession("user-1", session);
    expect(loadSession("user-1", 2026, "exam")!.currentIndex).toBe(42);
  });

  it("同じ問題に答え直すと所要時間が累計される", () => {
    let session = createSession(2026, "practice");
    session = withAnswer(session, 5, "A", 10);
    session = withAnswer(session, 5, "B", 7);
    expect(session.answers[5].selected).toBe("B");
    expect(session.answers[5].timeSpentSeconds).toBe(17);
  });

  it("withAnswer は元のセッションを書き換えない", () => {
    const original = createSession(2026, "practice");
    withAnswer(original, 1, "A", 5);
    expect(original.answers[1]).toBeUndefined();
  });

  it("サーバー判定を回答へ保存し、回答内容を変更しない", () => {
    const answered = withAnswer(createSession(2026, "practice"), 1, "A", 5);
    const classified = withAnswerExposure(answered, 1, "seen");

    expect(classified.answers[1]).toEqual({
      ...answered.answers[1],
      exposureState: "seen",
    });
    expect(answered.answers[1].exposureState).toBeUndefined();
  });

  it("旧形式の途中セッションは読み込めるが初見状態は未確定のまま", () => {
    const legacy = withAnswer(createSession(2026, "practice"), 1, "A", 5);
    saveSession("user-1", legacy);

    expect(loadSession("user-1", 2026, "practice")!.answers[1].exposureState)
      .toBeUndefined();
  });
});

describe("再開可能なモードのスナップショット", () => {
  it("保存されているモードだけを返す", () => {
    saveSession("user-1", createSession(2026, "exam"));
    expect(parseResumable(getResumableSnapshot("user-1", 2026))).toEqual({
      practice: false,
      exam: true,
    });
  });

  it("何も無ければ両方 false", () => {
    expect(parseResumable(getResumableSnapshot("user-1", 2026))).toEqual({
      practice: false,
      exam: false,
    });
  });

  it("サーバ描画時（null）は両方 false として扱う", () => {
    expect(parseResumable(null)).toEqual({ practice: false, exam: false });
  });
});

describe("本番モードのタイマー", () => {
  const startedAt = new Date("2026-07-26T10:00:00.000Z");

  it("制限時間は120分", () => {
    expect(EXAM_MODE_DURATION_SECONDS).toBe(120 * 60);
  });

  it("開始直後は満了まで残っている", () => {
    const session = createSession(2026, "exam", startedAt);
    expect(remainingSeconds(session, startedAt)).toBe(EXAM_MODE_DURATION_SECONDS);
  });

  it("リロードしても開始時刻から計算されるので120分に戻らない", () => {
    const session = createSession(2026, "exam", startedAt);
    saveSession("user-1", session);

    // 30分経過した時点で読み直す（＝リロード相当）。
    const later = new Date(startedAt.getTime() + 30 * 60 * 1000);
    const restored = loadSession("user-1", 2026, "exam")!;

    expect(restored.startedAt).toBe(session.startedAt);
    expect(remainingSeconds(restored, later)).toBe(90 * 60);
    expect(remainingSeconds(restored, later)).not.toBe(EXAM_MODE_DURATION_SECONDS);
  });

  it("120分を過ぎたら残り0で時間切れになる", () => {
    const session = createSession(2026, "exam", startedAt);
    const after = new Date(startedAt.getTime() + 121 * 60 * 1000);
    expect(remainingSeconds(session, after)).toBe(0);
    expect(isTimeUp(session, after)).toBe(true);
  });

  it("残り時間が負にならない", () => {
    const session = createSession(2026, "exam", startedAt);
    const way = new Date(startedAt.getTime() + 10 * 60 * 60 * 1000);
    expect(remainingSeconds(session, way)).toBe(0);
  });

  it("残り時間の表記", () => {
    expect(formatRemaining(120 * 60)).toBe("2:00:00");
    expect(formatRemaining(59)).toBe("00:59");
    expect(formatRemaining(0)).toBe("00:00");
    expect(formatRemaining(-5)).toBe("00:00");
  });
});

describe("採点", () => {
  function answersFor(correctCount: number): Record<number, PastExamAnswer> {
    const answers: Record<number, PastExamAnswer> = {};
    QUESTIONS.forEach((q, i) => {
      answers[q.questionNumber] = {
        selected: i < correctCount ? q.correctChoice : wrongChoice(q.correctChoice),
        answeredAt: "2026-07-26T10:00:00.000Z",
        timeSpentSeconds: 10,
      };
    });
    return answers;
  }

  function wrongChoice(correct: string): "A" | "B" | "C" | "D" {
    return (["A", "B", "C", "D"] as const).find((k) => k !== correct)!;
  }

  it("全問正解で100点", () => {
    const result = gradePastExam({
      sessionId: "s1",
      year: 2026,
      mode: "practice",
      questions: QUESTIONS,
      answers: answersFor(100),
    });
    expect(result.correct).toBe(100);
    expect(result.total).toBe(100);
    expect(result.rate).toBe(100);
    expect(result.unanswered).toBe(0);
  });

  it("未回答は不正解として数え、未回答数も別に出す", () => {
    const result = gradePastExam({
      sessionId: "s1",
      year: 2026,
      mode: "exam",
      questions: QUESTIONS,
      answers: {},
    });
    expect(result.correct).toBe(0);
    expect(result.unanswered).toBe(100);
    expect(result.rate).toBe(0);
    expect(result.questions.every((q) => q.isUnanswered)).toBe(true);
  });

  it("公式区分別に 34 / 20 / 46 問で集計する", () => {
    const result = gradePastExam({
      sessionId: "s1",
      year: 2026,
      mode: "practice",
      questions: QUESTIONS,
      answers: answersFor(100),
    });
    const byField = Object.fromEntries(result.byField.map((f) => [f.field, f]));
    expect(byField.strategy.total).toBe(34);
    expect(byField.management.total).toBe(20);
    expect(byField.technology.total).toBe(46);
    expect(byField.strategy.correct).toBe(34);
    expect(byField.strategy.rate).toBe(100);
  });

  it("区分別の合計が全体と一致する", () => {
    const result = gradePastExam({
      sessionId: "s1",
      year: 2026,
      mode: "practice",
      questions: QUESTIONS,
      answers: answersFor(57),
    });
    const sum = result.byField.reduce((acc, f) => acc + f.correct, 0);
    expect(sum).toBe(result.correct);
    expect(result.byField.reduce((acc, f) => acc + f.total, 0)).toBe(100);
    expect(result.byTopic.reduce((acc, topic) => acc + topic.total, 0)).toBe(100);
    expect(result.byTopic.every((topic) => topic.rate >= 0 && topic.rate <= 100)).toBe(true);
  });

  it("区分の集計に使うのは official.examField（内容分類ではない）", () => {
    // 問16 は公式区分 strategy だが内容は technology 寄り。
    // 公式区分で数えているなら、問16 は strategy 側に入る。
    const q16 = QUESTIONS.find((q) => q.questionNumber === 16)!;
    expect(q16.examField).toBe("strategy");
    expect(q16.topicId).toBe("tech-ai-ml");

    const result = gradePastExam({
      sessionId: "s1",
      year: 2026,
      mode: "practice",
      questions: QUESTIONS,
      answers: { 16: { selected: q16.correctChoice, answeredAt: "", timeSpentSeconds: 1 } },
    });
    const strategy = result.byField.find((f) => f.field === "strategy")!;
    expect(strategy.correct).toBe(1);
  });

  it("誤答フィルターが誤答と未回答だけを返す", () => {
    const result = gradePastExam({
      sessionId: "s1",
      year: 2026,
      mode: "practice",
      questions: QUESTIONS,
      answers: answersFor(90),
    });
    const wrong = incorrectResults(result);
    expect(wrong).toHaveLength(10);
    expect(wrong.every((r) => !r.isCorrect)).toBe(true);
  });

  it("誤答トピックを重複なしで取り出せる（復習キュー投入用）", () => {
    const result = gradePastExam({
      sessionId: "s1",
      year: 2026,
      mode: "practice",
      questions: QUESTIONS,
      answers: answersFor(0),
    });
    const topics = incorrectTopicIds(result);
    expect(topics.length).toBeGreaterThan(0);
    expect(new Set(topics).size).toBe(topics.length);
  });

  it("正答率は小数第1位を四捨五入する", () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(2, 3)).toBe(67);
    expect(percentage(0, 0)).toBe(0);
  });

  it("採点結果にモードと年度が残る", () => {
    const result = gradePastExam({
      sessionId: "abc",
      year: 2026,
      mode: "exam",
      questions: QUESTIONS,
      answers: {},
    });
    expect(result.sessionId).toBe("abc");
    expect(result.year).toBe(2026);
    expect(result.mode).toBe("exam");
  });
});
