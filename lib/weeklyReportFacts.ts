// 週間レポートの「事実」層（純関数・保存なし）。
//
// 設計上の境界:
//   - 数値計算・成長判定・次週の候補選びはすべてここで決定論的に行う。
//     AI は lib/weeklyReportNarrative.ts でここが確定した事実を文章にするだけで、
//     数値を計算したり、存在しない成長を作ったりしない。
//   - 「シグナル」は事実から拾った成長・気づき・課題の候補。AI はこの中から選び、
//     選ばなかったもの・書けなかったものはテンプレート文で表示する。
//   - 過去値が無い指標は比較しない（先週データが無ければ先週比は null）。
//   - 次週の最優先は既存の buildTodaysLearningQueue / buildComebackMission が選んだ
//     候補をそのまま使う。ここで新しい学習計画を作らない。
//
// 期間は「今日を含む直近7暦日（ローカル時刻）」。先週はその前の7暦日。

import type { AppState, UserAnswer } from "@/types";
import type { TopicField } from "@/types/content";
import { getAllTopics, getTopic } from "@/lib/content";
import { calculateTopicMastery } from "@/lib/mastery";
import { buildTodaysLearningQueue, getDueReviewTopics } from "@/lib/learningLoop";
import { buildComebackMission } from "@/lib/comebackMission";
import { buildCheckpointGate, getCheckpointProgress } from "@/lib/checkpoints";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** これ未満の解答数は「参考程度」として扱う。 */
export const LOW_DATA_ANSWERS = 10;
/** 比較（初見/解き直し・時間帯）に使う側ごとの最小件数。 */
const MIN_COMPARE_SAMPLE = 5;

export type Rate = { answered: number; correct: number; accuracy: number | null };

export type DayActivity = {
  date: string; // YYYY-MM-DD（ローカル）
  weekday: (typeof WEEKDAYS)[number];
  answered: number;
  correct: number;
};

export type TopicRef = { topicId: string; title: string };

export type SignalCategory = "growth" | "insight" | "struggle";

/**
 * 事実から拾った1件の候補。
 * `numbers` はこの候補に関係する数値で、AI 文章の数値検証にも使う。
 */
export type WeeklySignal = {
  id: string;
  category: SignalCategory;
  kind: string;
  /** 大きいほど優先して表示する。 */
  strength: number;
  /** データが少なく断定できない（文面に「参考程度」を添える）。 */
  tentative: boolean;
  /** AI に渡す事実の短い説明（数値入り・日本語）。 */
  fact: string;
  /** AI 障害時・未生成時にそのまま出すテンプレート文。 */
  title: string;
  body: string;
  numbers: number[];
};

export type NextAction = {
  kind: "review" | "weak" | "new_topic" | "comeback";
  topicId: string;
  title: string;
  estimatedMinutes: number;
  /** 既存ロジックの推奨理由（文言は既存のまま運ぶ）。 */
  reason: string;
};

export type WeeklyReportFacts = {
  period: { start: string; end: string; days: DayActivity[] };
  /** 今週より前に解答記録が1件も無い（＝はじめての週）。 */
  isFirstWeek: boolean;
  volume: "none" | "low" | "ok";
  totals: Rate & { daysStudied: number; topicsTouched: number };
  lastWeek: (Rate & { daysStudied: number }) | null;
  /** 今週はじめて解いた問題（今週より前に同じ問題の解答が無い）。 */
  firstTry: Rate;
  /** 以前にも解いたことのある問題の解き直し。 */
  retry: Rate;
  /** 今週より前にまちがえた問題のうち、今週正解できた問題。 */
  recovered: { questionCount: number; topics: (TopicRef & { count: number })[] };
  /** 今週触れたトピックの理解度（週初時点 → 現在）。上がった順。 */
  masteryChanges: (TopicRef & { before: number; after: number })[];
  /** 今週まちがいの多かったトピック。 */
  weakSpots: (TopicRef & { answered: number; misses: number })[];
  /** 2日以上空いたあとに学習を再開した記録（今週中の再開のみ）。 */
  comeback: { gapDays: number; resumedDate: string; resumedWeekday: string; studyDaysSince: number } | null;
  fieldShare: { field: TopicField; label: string; answered: number }[];
  reviews: { waiting: number; due: number };
  checkpoint: {
    label: string;
    earnedRequired: number;
    totalRequired: number;
    badgesEarnedThisWeek: number;
    finalExamPassedThisWeek: boolean;
  };
  cumulative: { completedTopics: number; totalAnswered: number };
  streakCount: number;
  signals: WeeklySignal[];
  nextActions: NextAction[];
};

// ---------------------------------------------------------------------------
// 日付ユーティリティ（ローカル暦日）
// ---------------------------------------------------------------------------

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** 暦日の差（DST をまたいでも日単位で数える）。 */
function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfLocalDay(b).getTime() - startOfLocalDay(a).getTime()) / 86_400_000);
}

function parseTime(a: UserAnswer): number | null {
  const t = Date.parse(a.answeredAt);
  return Number.isFinite(t) ? t : null;
}

function rate(items: { isCorrect: boolean }[]): Rate {
  const answered = items.length;
  const correct = items.filter((a) => a.isCorrect).length;
  return { answered, correct, accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null };
}

function topicRef(topicId: string): TopicRef | null {
  const topic = getTopic(topicId);
  return topic ? { topicId, title: topic.title } : null;
}

const FIELD_LABEL: Record<TopicField, string> = {
  strategy: "ストラテジ系",
  management: "マネジメント系",
  technology: "テクノロジ系",
};

// ---------------------------------------------------------------------------
// 本体
// ---------------------------------------------------------------------------

export function buildWeeklyReportFacts(state: AppState, now: Date = new Date()): WeeklyReportFacts {
  const today = startOfLocalDay(now);
  const weekStart = addDays(today, -6);
  const lastWeekStart = addDays(today, -13);
  const weekStartMs = weekStart.getTime();
  const lastWeekStartMs = lastWeekStart.getTime();
  const nowMs = now.getTime();

  const timed = (state.answers ?? [])
    .map((a) => ({ a, t: parseTime(a) }))
    .filter((x): x is { a: UserAnswer; t: number } => x.t !== null && x.t <= nowMs)
    .sort((x, y) => x.t - y.t);

  const before = timed.filter((x) => x.t < weekStartMs);
  const thisWeek = timed.filter((x) => x.t >= weekStartMs);
  const lastWeekItems = before.filter((x) => x.t >= lastWeekStartMs);

  // --- 日別 ---
  const days: DayActivity[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const key = localDateKey(d);
    const items = thisWeek.filter((x) => localDateKey(new Date(x.t)) === key);
    days.push({
      date: key,
      weekday: WEEKDAYS[d.getDay()],
      answered: items.length,
      correct: items.filter((x) => x.a.isCorrect).length,
    });
  }

  const totalsRate = rate(thisWeek.map((x) => x.a));
  const topicsTouched = new Set(thisWeek.flatMap((x) => (x.a.topicId ? [x.a.topicId] : [])));
  const totals = {
    ...totalsRate,
    daysStudied: days.filter((d) => d.answered > 0).length,
    topicsTouched: topicsTouched.size,
  };

  const lastWeek =
    lastWeekItems.length > 0
      ? {
          ...rate(lastWeekItems.map((x) => x.a)),
          daysStudied: new Set(lastWeekItems.map((x) => localDateKey(new Date(x.t)))).size,
        }
      : null;

  // --- 初見 / 解き直し・克服 ---
  const seenBefore = new Set(before.map((x) => x.a.questionId));
  const missedBefore = new Set(before.filter((x) => !x.a.isCorrect).map((x) => x.a.questionId));
  const seenSoFar = new Set(seenBefore);
  const firstTryItems: UserAnswer[] = [];
  const retryItems: UserAnswer[] = [];
  const recoveredByTopic = new Map<string, Set<string>>();
  const recoveredQuestions = new Set<string>();
  for (const { a } of thisWeek) {
    if (seenSoFar.has(a.questionId)) retryItems.push(a);
    else firstTryItems.push(a);
    seenSoFar.add(a.questionId);
    if (a.isCorrect && missedBefore.has(a.questionId)) {
      recoveredQuestions.add(a.questionId);
      if (a.topicId) {
        const set = recoveredByTopic.get(a.topicId) ?? new Set<string>();
        set.add(a.questionId);
        recoveredByTopic.set(a.topicId, set);
      }
    }
  }
  const recovered = {
    questionCount: recoveredQuestions.size,
    topics: [...recoveredByTopic.entries()]
      .flatMap(([topicId, set]) => {
        const ref = topicRef(topicId);
        return ref ? [{ ...ref, count: set.size }] : [];
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3),
  };

  // --- 理解度の変化（同じ算出式で週初時点と現在を比べる） ---
  const masteryChanges = [...topicsTouched]
    .flatMap((topicId) => {
      const ref = topicRef(topicId);
      if (!ref) return [];
      const all = timed.filter((x) => x.a.topicId === topicId).map((x) => x.a);
      const prior = before.filter((x) => x.a.topicId === topicId).map((x) => x.a);
      return [
        {
          ...ref,
          before: calculateTopicMastery(prior, weekStart),
          after: calculateTopicMastery(all, now),
        },
      ];
    })
    .sort((a, b) => b.after - b.before - (a.after - a.before));

  // --- 苦手 ---
  const byTopic = new Map<string, UserAnswer[]>();
  for (const { a } of thisWeek) {
    if (!a.topicId) continue;
    byTopic.set(a.topicId, [...(byTopic.get(a.topicId) ?? []), a]);
  }
  const weakSpots = [...byTopic.entries()]
    .flatMap(([topicId, items]) => {
      const ref = topicRef(topicId);
      const misses = items.filter((a) => !a.isCorrect).length;
      return ref && misses > 0 ? [{ ...ref, answered: items.length, misses }] : [];
    })
    .sort((a, b) => b.misses - a.misses || a.answered - b.answered)
    .slice(0, 3);

  // --- 再開（2日以上空いたあと、今週中に戻ってきた） ---
  const studyDates = [...new Set(timed.map((x) => localDateKey(new Date(x.t))))].sort();
  let comeback: WeeklyReportFacts["comeback"] = null;
  for (let i = 1; i < studyDates.length; i++) {
    const prev = new Date(`${studyDates[i - 1]}T00:00:00`);
    const cur = new Date(`${studyDates[i]}T00:00:00`);
    const gapDays = dayDiff(prev, cur) - 1; // 間にはさまった学習なしの日数
    if (gapDays >= 2 && cur.getTime() >= weekStartMs) {
      comeback = {
        gapDays,
        resumedDate: studyDates[i],
        resumedWeekday: WEEKDAYS[cur.getDay()],
        studyDaysSince: studyDates.slice(i).length,
      };
    }
  }

  // --- 分野 ---
  const fieldCount = new Map<TopicField, number>();
  for (const { a } of thisWeek) {
    const field = a.topicId ? getTopic(a.topicId)?.field : undefined;
    if (field) fieldCount.set(field, (fieldCount.get(field) ?? 0) + 1);
  }
  const fieldShare = (["strategy", "management", "technology"] as const).map((field) => ({
    field,
    label: FIELD_LABEL[field],
    answered: fieldCount.get(field) ?? 0,
  }));

  // --- 復習・CP ---
  const reviewQueue = state.progress.reviewQueue ?? [];
  const reviews = { waiting: reviewQueue.length, due: getDueReviewTopics(reviewQueue, now).length };

  const cp = getCheckpointProgress(state);
  const gate = buildCheckpointGate(state, cp.currentCheckpointId);
  const inWeek = (iso: string) => {
    const t = Date.parse(iso);
    return Number.isFinite(t) && t >= weekStartMs && t <= nowMs;
  };
  const checkpoint = {
    label: `CP${gate.checkpoint.order}「${gate.checkpoint.title}」`,
    earnedRequired: gate.earnedRequiredCount,
    totalRequired: gate.totalRequiredCount,
    badgesEarnedThisWeek: cp.earnedBadges.filter((b) => inWeek(b.earnedAt)).length,
    finalExamPassedThisWeek: cp.finalExamAttempts.some((f) => f.passed && inWeek(f.attemptedAt)),
  };

  const volume: WeeklyReportFacts["volume"] =
    totals.answered === 0 ? "none" : totals.answered < LOW_DATA_ANSWERS ? "low" : "ok";

  const base = {
    period: { start: localDateKey(weekStart), end: localDateKey(today), days },
    isFirstWeek: before.length === 0,
    volume,
    totals,
    lastWeek,
    firstTry: rate(firstTryItems),
    retry: rate(retryItems),
    recovered,
    masteryChanges: masteryChanges.slice(0, 5),
    weakSpots,
    comeback,
    fieldShare,
    reviews,
    checkpoint,
    cumulative: {
      completedTopics: (state.progress.completedTopics ?? []).length,
      totalAnswered: timed.length,
    },
    streakCount: state.progress.streakCount ?? 0,
  };

  return {
    ...base,
    signals: buildSignals(base, thisWeek.map((x) => x.a)),
    nextActions: buildNextActions(state, now, volume),
  };
}

// ---------------------------------------------------------------------------
// シグナル（成長・気づき・課題の候補）
// ---------------------------------------------------------------------------

type FactsBase = Omit<WeeklyReportFacts, "signals" | "nextActions">;

function hedge(tentative: boolean): string {
  return tentative ? "まだ数が少ないので参考程度ですが、" : "";
}

function buildSignals(f: FactsBase, weekAnswers: UserAnswer[]): WeeklySignal[] {
  const signals: WeeklySignal[] = [];
  if (f.volume === "none") return signals;
  const low = f.volume === "low";

  // ---- 成長 ----
  if (f.recovered.questionCount > 0) {
    const n = f.recovered.questionCount;
    const top = f.recovered.topics[0];
    signals.push({
      id: "recovered",
      category: "growth",
      kind: "recovered",
      strength: 90 + Math.min(n, 8),
      tentative: n < 2,
      fact: `以前まちがえた問題のうち${n}問に、今週は正解した${top ? `（最多は「${top.title}」で${top.count}問）` : ""}`,
      title: "前にまちがえた問題が解けるようになっています",
      body: `以前つまずいた問題のうち${n}問に、今週は正解できました。${top ? `「${top.title}」` : "一度間違えたところ"}の理解が、あいまいな記憶から使える知識に変わってきています。`,
      numbers: [n, ...(top ? [top.count] : [])],
    });
  }

  for (const m of f.masteryChanges.filter((x) => x.after - x.before >= 8).slice(0, 2)) {
    const gain = m.after - m.before;
    signals.push({
      id: `mastery:${m.topicId}`,
      category: "growth",
      kind: "mastery_gain",
      // 既に学んでいたトピックの伸び（定着）を、はじめて触れたトピックより上に置く。
      strength: m.before === 0 ? 50 + Math.min(gain, 20) : 60 + Math.min(gain, 25),
      tentative: false,
      fact: `「${m.title}」の理解度が週初の${m.before}から${m.after}に上がった（+${gain}）`,
      title: `「${m.title}」の理解度が上がりました`,
      body:
        m.before === 0
          ? `今週はじめて取り組み、理解度${m.after}まで来ています。新しい範囲を1つ、自分の知識に加えられた週です。`
          : `理解度が${m.before}から${m.after}になりました。くり返し取り組んだぶんが、数字にもはっきり表れています。`,
      numbers: [m.before, m.after, gain],
    });
  }

  if (f.comeback) {
    const c = f.comeback;
    signals.push({
      id: "comeback",
      category: "growth",
      kind: "comeback",
      strength: 88,
      tentative: false,
      fact: `${c.gapDays}日間学習が空いたあと、${c.resumedWeekday}曜日に再開し、その後${c.studyDaysSince}日学習した`,
      title: `${c.gapDays}日空いても戻ってこられました`,
      body: `${c.gapDays}日あいたあと、${c.resumedWeekday}曜日に学習を再開しています。毎日続けることより、止まったあとに戻れることの方が、長い試験勉強では大きな力になります。`,
      numbers: [c.gapDays, c.studyDaysSince],
    });
  }

  if (f.checkpoint.finalExamPassedThisWeek) {
    signals.push({
      id: "checkpoint",
      category: "growth",
      kind: "checkpoint_pass",
      strength: 100,
      tentative: false,
      fact: "今週、チェックポイントの突破試験に合格した",
      title: "チェックポイントを突破しました",
      body: "突破試験に合格し、ロードマップを1つ先へ進めました。ここまでの範囲を、まとめて解ける状態になっています。",
      numbers: [],
    });
  } else if (f.checkpoint.badgesEarnedThisWeek > 0) {
    const n = f.checkpoint.badgesEarnedThisWeek;
    signals.push({
      id: "badges",
      category: "growth",
      kind: "badges",
      strength: 55 + n,
      tentative: false,
      fact: `今週バッジを${n}個獲得。${f.checkpoint.label}の必須バッジは${f.checkpoint.earnedRequired}/${f.checkpoint.totalRequired}`,
      title: `バッジを${n}個獲得しました`,
      body: `${f.checkpoint.label}の必須バッジは${f.checkpoint.earnedRequired}/${f.checkpoint.totalRequired}です。突破までの道のりが、今週また短くなりました。`,
      numbers: [n, f.checkpoint.earnedRequired, f.checkpoint.totalRequired],
    });
  }

  const lw = f.lastWeek;
  if (lw && lw.accuracy !== null && f.totals.accuracy !== null && lw.answered >= 5 && !low) {
    const d = f.totals.accuracy - lw.accuracy;
    if (d >= 5) {
      signals.push({
        id: "accuracy_up",
        category: "growth",
        kind: "accuracy_up",
        strength: 60 + d,
        tentative: false,
        fact: `正答率が先週の${lw.accuracy}%から今週${f.totals.accuracy}%に上がった（+${d}pt）`,
        title: `正答率が先週より${d}pt上がりました`,
        body:
          f.totals.answered < lw.answered
            ? `解いた数は先週より少なめでしたが、正答率は${lw.accuracy}%から${f.totals.accuracy}%に上がっています。量より「確かさ」が進んだ週です。`
            : `正答率が${lw.accuracy}%から${f.totals.accuracy}%に上がりました。同じように解いても、取れる問題が増えています。`,
        numbers: [lw.accuracy, f.totals.accuracy, d],
      });
    }
  }

  if (f.totals.daysStudied >= 4) {
    const n = f.totals.daysStudied;
    signals.push({
      id: "consistency",
      category: "growth",
      kind: "consistency",
      strength: 40 + n * 3,
      tentative: false,
      fact: `7日のうち${n}日学習した`,
      title: `7日のうち${n}日、問題に触れています`,
      body: "日を分けて少しずつ触れることは、一度にまとめて解くより記憶に残りやすい学び方です。その形が今週はできています。",
      numbers: [n],
    });
  }

  // ---- 気づき ----
  const ft = f.firstTry;
  const rt = f.retry;
  if (ft.accuracy !== null && rt.accuracy !== null && ft.answered >= 3 && rt.answered >= 3) {
    const diff = rt.accuracy - ft.accuracy;
    const tentative = ft.answered < MIN_COMPARE_SAMPLE || rt.answered < MIN_COMPARE_SAMPLE;
    if (Math.abs(diff) >= 10) {
      const retryStronger = diff > 0;
      signals.push({
        id: "retry_vs_first",
        category: "insight",
        kind: retryStronger ? "retry_stronger" : "first_stronger",
        strength: 80 + Math.min(Math.abs(diff), 20) - (tentative ? 20 : 0),
        tentative,
        fact: `はじめて解いた問題の正答率${ft.accuracy}%（${ft.answered}問）、解き直した問題の正答率${rt.accuracy}%（${rt.answered}問）`,
        title: retryStronger ? "解き直した問題で伸びています" : "はじめての問題に強い週でした",
        body: retryStronger
          ? `${hedge(tentative)}はじめて解いた問題は${ft.accuracy}%、解き直した問題は${rt.accuracy}%でした。一度学んだ内容が定着してきている状態で、いまは復習を重ねるほど得点につながりやすい時期です。`
          : `${hedge(tentative)}はじめて解いた問題は${ft.accuracy}%、解き直した問題は${rt.accuracy}%でした。初見の問題には対応できている一方、前に出た問題で取りこぼしがあります。解き直しのときに解説まで読み返すと、ここが伸びます。`,
        numbers: [ft.accuracy, ft.answered, rt.accuracy, rt.answered],
      });
    }
  }

  // 時間帯（朝5-11/昼11-17/夜17-5）ごとの正答率差。十分な件数があるときだけ。
  const bands = [
    { key: "朝", test: (h: number) => h >= 5 && h < 11 },
    { key: "昼", test: (h: number) => h >= 11 && h < 17 },
    { key: "夜", test: (h: number) => h >= 17 || h < 5 },
  ].map((b) => ({
    key: b.key,
    ...rate(weekAnswers.filter((a) => b.test(new Date(a.answeredAt).getHours()))),
  }));
  const comparable = bands.filter((b) => b.answered >= MIN_COMPARE_SAMPLE && b.accuracy !== null);
  if (comparable.length >= 2) {
    const sorted = [...comparable].sort((a, b) => b.accuracy! - a.accuracy!);
    const hi = sorted[0];
    const lo = sorted[sorted.length - 1];
    const diff = hi.accuracy! - lo.accuracy!;
    if (diff >= 15) {
      signals.push({
        id: "time_of_day",
        category: "insight",
        kind: "time_of_day",
        strength: 60 + Math.min(diff, 20),
        tentative: true,
        fact: `${hi.key}に解いた問題の正答率${hi.accuracy}%（${hi.answered}問）、${lo.key}は${lo.accuracy}%（${lo.answered}問）`,
        title: `${hi.key}の方が正答率が高めでした`,
        body: `${hi.key}に解いた問題は${hi.accuracy}%、${lo.key}は${lo.accuracy}%でした。理由までは分かりませんが、新しい範囲は${hi.key}に回すと取り組みやすいかもしれません。`,
        numbers: [hi.accuracy!, hi.answered, lo.accuracy!, lo.answered],
      });
    }
  }

  const fieldTotal = f.fieldShare.reduce((s, x) => s + x.answered, 0);
  const topField = [...f.fieldShare].sort((a, b) => b.answered - a.answered)[0];
  if (fieldTotal >= 8 && topField && topField.answered / fieldTotal >= 0.8) {
    const untouched = f.fieldShare.filter((x) => x.answered === 0).map((x) => x.label);
    const pct = Math.round((topField.answered / fieldTotal) * 100);
    signals.push({
      id: "field_focus",
      category: "insight",
      kind: "field_focus",
      strength: 50,
      tentative: false,
      fact: `今週の解答の${pct}%が${topField.label}${untouched.length > 0 ? `。${untouched.join("・")}は0問` : ""}`,
      title: `今週は${topField.label}に集中していました`,
      body: `解いた問題の${pct}%が${topField.label}でした。1つの分野を固める週としては良い形です。${untouched.length > 0 ? `本番は3分野から出るので、来週どこかで${untouched[0]}にも少し触れておくと安心です。` : ""}`,
      numbers: [pct],
    });
  }

  if (lw && lw.answered > 0 && f.totals.answered < lw.answered && f.totals.accuracy !== null && lw.accuracy !== null && f.totals.accuracy >= lw.accuracy) {
    signals.push({
      id: "less_but_steady",
      category: "insight",
      kind: "less_but_steady",
      strength: 45,
      tentative: low,
      fact: `解答数は先週${lw.answered}問→今週${f.totals.answered}問に減ったが、正答率は${lw.accuracy}%→${f.totals.accuracy}%で下がっていない`,
      title: "量は減っても、理解は落ちていません",
      body: `解いた数は先週の${lw.answered}問から${f.totals.answered}問に減りましたが、正答率は${lw.accuracy}%から${f.totals.accuracy}%と保てています。忙しい週でも、積み上げは崩れていません。`,
      numbers: [lw.answered, f.totals.answered, lw.accuracy, f.totals.accuracy],
    });
  }

  // ---- 課題 ----
  const weak = f.weakSpots[0];
  if (weak && weak.misses >= 3 && weak.misses / weak.answered >= 0.4) {
    const acc = Math.round(((weak.answered - weak.misses) / weak.answered) * 100);
    signals.push({
      id: `weak:${weak.topicId}`,
      category: "struggle",
      kind: "weak_spot",
      strength: 70 + weak.misses,
      tentative: false,
      fact: `「${weak.title}」で${weak.answered}問中${weak.misses}問まちがえた（正答率${acc}%）`,
      title: `「${weak.title}」でつまずきが残っています`,
      body: `「${weak.title}」は${weak.answered}問中${weak.misses}問が不正解でした。まちがえた問題がはっきりしたので、次はそこだけを解き直せば効率よく埋められます。`,
      numbers: [weak.answered, weak.misses, acc],
    });
  }

  if (lw && lw.accuracy !== null && f.totals.accuracy !== null && lw.answered >= 5 && !low) {
    const d = lw.accuracy - f.totals.accuracy;
    if (d >= 10) {
      signals.push({
        id: "accuracy_down",
        category: "struggle",
        kind: "accuracy_down",
        strength: 60 + d,
        tentative: false,
        fact: `正答率が先週${lw.accuracy}%→今週${f.totals.accuracy}%（-${d}pt）`,
        title: "正答率は先週より下がりました",
        body: `正答率は${lw.accuracy}%から${f.totals.accuracy}%になりました。新しい範囲に進んだ週は一時的に下がるのが普通です。まちがえた問題を解き直すと、ここは戻せます。`,
        numbers: [lw.accuracy, f.totals.accuracy, d],
      });
    }
  }

  if (f.reviews.due >= 5) {
    signals.push({
      id: "review_backlog",
      category: "struggle",
      kind: "review_backlog",
      strength: 50 + Math.min(f.reviews.due, 20),
      tentative: false,
      fact: `復習予定日を過ぎたトピックが${f.reviews.due}件ある`,
      title: `復習が${f.reviews.due}件たまっています`,
      body: `復習予定日を過ぎたトピックが${f.reviews.due}件あります。新しい範囲を増やす前にここを減らすと、覚えた内容を取りこぼさずに済みます。`,
      numbers: [f.reviews.due],
    });
  }

  return signals.sort((a, b) => b.strength - a.strength);
}

// ---------------------------------------------------------------------------
// 次週の最優先（既存ロジックの候補をそのまま使う）
// ---------------------------------------------------------------------------

function buildNextActions(
  state: AppState,
  now: Date,
  volume: WeeklyReportFacts["volume"],
): NextAction[] {
  const actions: NextAction[] = [];

  // 学習が止まっている人には、既存の復帰ミッション（3〜5分）を最優先で出す。
  if (volume === "none") {
    const mission = buildComebackMission({ state, now });
    const first = mission?.items[0];
    if (first) {
      actions.push({
        kind: "comeback",
        topicId: first.topicId,
        title: first.title,
        estimatedMinutes: first.estimatedMinutes,
        reason: "前に学んだところを、軽く思い出すところから",
      });
      return actions;
    }
  }

  const queue = buildTodaysLearningQueue({ progress: state.progress, topics: getAllTopics(), now });
  const kindOf = (k: string): NextAction["kind"] | null =>
    k === "overdue_review"
      ? "review"
      : k === "summary_weak" || k === "low_mastery"
        ? "weak"
        : k === "new_topic"
          ? "new_topic"
          : null;
  const seenKinds = new Set<string>();
  for (const item of queue) {
    const kind = kindOf(item.kind);
    if (!kind || !item.topicId || seenKinds.has(kind)) continue;
    const topic = getTopic(item.topicId);
    if (!topic) continue;
    seenKinds.add(kind);
    actions.push({
      kind,
      topicId: item.topicId,
      title: topic.title,
      estimatedMinutes: item.estimatedMinutes,
      reason: item.reason,
    });
    if (actions.length >= (volume === "none" ? 1 : 2)) break;
  }
  return actions;
}
