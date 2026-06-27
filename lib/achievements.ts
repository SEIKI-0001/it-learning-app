// 実績バッジ。既存データ(progress / answers)から表示時に獲得判定する方式。
// DBには保存しない。ストリークだけに偏らせず、復帰・再挑戦・苦手克服も評価する。

import type { AppState } from "@/types";
import { getTopic } from "@/lib/content";

export type Achievement = {
  id: string;
  emoji: string;
  label: string;
  description: string; // 獲得条件(常に表示できる短い説明)
  earned: boolean;
};

/** answeredAt を暦日(YYYY-M-D)の昇順ユニーク配列(ミリ秒)にする。 */
function studyDayMs(answers: AppState["answers"]): number[] {
  const set = new Set<number>();
  for (const a of answers) {
    const d = new Date(a.answeredAt);
    if (Number.isNaN(d.getTime())) continue;
    set.add(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  }
  return [...set].sort((x, y) => x - y);
}

/** 学習日の並びに minGapDays 以上の空白→再開があったか(休んでも戻ってきた証)。 */
function hasComeback(answers: AppState["answers"], minGapDays = 3): boolean {
  const days = studyDayMs(answers);
  for (let i = 1; i < days.length; i++) {
    if ((days[i] - days[i - 1]) / 86_400_000 >= minGapDays) return true;
  }
  return false;
}

/** AppState から実績バッジ一覧(獲得済み判定つき)を作る。 */
export function evaluateAchievements(state: AppState): Achievement[] {
  const { progress, answers } = state;
  const totalAnswers = answers.length;
  const totalCorrect = answers.filter((a) => a.isCorrect).length;
  const completed = progress.completedTopics ?? [];
  const completedCount = completed.length;
  const reviewCount = (progress.reviewQueue ?? []).length;

  // 完了トピックから「着手済みの分野」を集める。
  const fields = new Set<string>();
  for (const id of completed) {
    const t = getTopic(id);
    if (t) fields.add(t.field);
  }

  return [
    {
      id: "first-answer",
      emoji: "✍️",
      label: "はじめての1問",
      description: "確認問題に1問こたえる",
      earned: totalAnswers >= 1,
    },
    {
      id: "first-topic",
      emoji: "📘",
      label: "初トピック完了",
      description: "トピックを1つ完了する",
      earned: completedCount >= 1,
    },
    {
      id: "five-topics",
      emoji: "📚",
      label: "5トピック突破",
      description: "トピックを5つ完了する",
      earned: completedCount >= 5,
    },
    {
      id: "ten-answers",
      emoji: "🔟",
      label: "10問解答",
      description: "確認問題に合計10問こたえる",
      earned: totalAnswers >= 10,
    },
    {
      id: "ten-correct",
      emoji: "✅",
      label: "正解10問",
      description: "合計10問を正解する",
      earned: totalCorrect >= 10,
    },
    {
      id: "review-zero",
      emoji: "🧹",
      label: "復習対象ゼロ",
      description: "学習を始めて復習待ちを0件にする",
      earned: completedCount >= 1 && reviewCount === 0,
    },
    {
      id: "comeback",
      emoji: "🌅",
      label: "3日ぶりに復帰",
      description: "間が空いても学習に戻ってくる",
      earned: hasComeback(answers, 3),
    },
    {
      id: "has-revenge",
      emoji: "🔁",
      label: "リベンジ対象あり",
      description: "復習待ちができる(挑戦した証)",
      earned: reviewCount >= 1,
    },
    {
      id: "level-2",
      emoji: "⬆️",
      label: "Lv.2 到達",
      description: "レベル2になる",
      earned: (progress.level ?? 1) >= 2,
    },
    {
      id: "three-fields",
      emoji: "🌈",
      label: "3分野に着手",
      description: "3分野すべてに手をつける",
      earned: fields.size >= 3,
    },
    {
      id: "field-tech",
      emoji: "💻",
      label: "テクノロジ着手",
      description: "テクノロジ系を1つ完了する",
      earned: fields.has("technology"),
    },
    {
      id: "field-mgmt",
      emoji: "📋",
      label: "マネジメント着手",
      description: "マネジメント系を1つ完了する",
      earned: fields.has("management"),
    },
    {
      id: "field-strat",
      emoji: "📈",
      label: "ストラテジ着手",
      description: "ストラテジ系を1つ完了する",
      earned: fields.has("strategy"),
    },
  ];
}
