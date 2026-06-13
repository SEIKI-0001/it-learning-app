import type { AppState, Question, UserAnswer } from "@/types";
import { questions } from "@/data/questions";
import { LAST_DAY } from "@/data/stages";

// レベルしきい値（下限EXP）とレベル名
const LEVELS: { level: number; minExp: number; name: string }[] = [
  { level: 1, minExp: 0, name: "IT見習い" },
  { level: 2, minExp: 50, name: "新人エンジニア" },
  { level: 3, minExp: 120, name: "ネットワーク探索者" },
  { level: 4, minExp: 200, name: "セキュリティ守護者" },
  { level: 5, minExp: 300, name: "アルゴリズム冒険者" },
];

/** 指定した Day の問題を取得（出題順は data の定義順） */
export function getQuestionsByDay(dayNo: number): Question[] {
  return questions.filter((q) => q.dayNo === dayNo);
}

/**
 * クエスト1回ぶんの獲得EXPを計算する。
 * - 正解1問につき +10
 * - 全問正解で +10（ボーナス）
 * - クエスト完了で +10（参加報酬）
 * - ボス戦（Day7）クリアで追加 +30
 */
export function calculateExp(params: {
  correctCount: number;
  totalCount: number;
  isBoss: boolean;
}): number {
  const { correctCount, totalCount, isBoss } = params;
  let exp = correctCount * 10;
  if (totalCount > 0 && correctCount === totalCount) exp += 10; // 全問正解ボーナス
  exp += 10; // クエスト完了報酬
  if (isBoss) exp += 30; // ボス城クリア報酬
  return exp;
}

/** 累計EXPから現在のレベル（1〜5）を求める */
export function calculateLevel(exp: number): number {
  let level = 1;
  for (const l of LEVELS) {
    if (exp >= l.minExp) level = l.level;
  }
  return level;
}

/** レベル番号からレベル名を返す */
export function getLevelName(level: number): string {
  return LEVELS.find((l) => l.level === level)?.name ?? "IT見習い";
}

/** EXPバー表示用：現在レベルの下限・次レベルの下限を返す（Lv5は上限=下限+1で満タン表示） */
export function getLevelRange(level: number): { min: number; next: number } {
  const idx = LEVELS.findIndex((l) => l.level === level);
  const current = LEVELS[idx] ?? LEVELS[0];
  const upper = LEVELS[idx + 1];
  return { min: current.minExp, next: upper ? upper.minExp : current.minExp + 1 };
}

/** 不正解があったタグの一覧（重複なし）を「苦手タグ」として返す */
export function getWeakTags(answers: UserAnswer[]): string[] {
  const tags = answers.filter((a) => !a.isCorrect).map((a) => a.tag);
  return Array.from(new Set(tags));
}

/**
 * クエスト完了処理。回答を取り込み、EXP・レベル・進捗を更新した
 * 新しい AppState を返す（元の state は変更しない / イミュータブル）。
 */
export function completeQuest(state: AppState, newAnswers: UserAnswer[]): AppState {
  const dayNo = state.progress.currentDay;
  const isBoss = dayNo === LAST_DAY;

  const correctCount = newAnswers.filter((a) => a.isCorrect).length;
  const totalCount = newAnswers.length;
  const gainedExp = calculateExp({ correctCount, totalCount, isBoss });

  const allAnswers = [...state.answers, ...newAnswers];
  const newExp = state.progress.exp + gainedExp;
  const newLevel = calculateLevel(newExp);

  const completedDays = state.progress.completedDays.includes(dayNo)
    ? state.progress.completedDays
    : [...state.progress.completedDays, dayNo].sort((a, b) => a - b);

  // 次の Day へ。最終日を越えたら LAST_DAY + 1（= 全クリア状態の番兵）
  const nextDay = Math.min(dayNo + 1, LAST_DAY + 1);

  return {
    profile: state.profile,
    answers: allAnswers,
    progress: {
      level: newLevel,
      exp: newExp,
      currentDay: nextDay,
      completedDays,
      streakCount: state.progress.streakCount + 1,
      weakTags: getWeakTags(allAnswers),
      lastPlayedAt: new Date().toISOString(),
    },
  };
}

/** 全7日をクリアしたか */
export function isAllDaysCleared(completedDays: number[]): boolean {
  for (let d = 1; d <= LAST_DAY; d++) {
    if (!completedDays.includes(d)) return false;
  }
  return true;
}
