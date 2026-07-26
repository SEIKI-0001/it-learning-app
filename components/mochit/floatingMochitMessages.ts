import type { MochitEvent } from "./mochitEvents";

export type FloatingMochitMessage = {
  text: string;
  durationMs: number;
};

type FloatingMochitMessageDefinition = {
  candidates: readonly string[];
  durationMs: number;
};

const FLOATING_MOCHIT_MESSAGE_DEFINITIONS: Partial<
  Record<MochitEvent, FloatingMochitMessageDefinition>
> = {
  correct: {
    candidates: ["ナイス！", "正解！", "その調子！", "いいね！"],
    durationMs: 1_400,
  },
  incorrect: {
    candidates: [
      "ここで覚えればOK！",
      "解説を確認しよう",
      "次に活かそう！",
    ],
    durationMs: 1_400,
  },
  encourage: {
    candidates: [
      "落ち着いていこう！",
      "一歩ずついこう！",
      "焦らなくて大丈夫！",
    ],
    durationMs: 1_800,
  },
  allCorrect: {
    candidates: ["全問正解！完璧！"],
    durationMs: 2_200,
  },
  taskComplete: {
    candidates: ["学習完了！おつかれさま！"],
    durationMs: 2_200,
  },
  badgeEarned: {
    candidates: ["新しいバッジを獲得！"],
    durationMs: 2_800,
  },
  checkpointClear: {
    candidates: ["チェックポイント突破！"],
    durationMs: 2_800,
  },
};

export function getFloatingMochitMessage(
  event: MochitEvent,
  previousText: string | null,
  random: () => number = Math.random,
): FloatingMochitMessage | null {
  const definition = FLOATING_MOCHIT_MESSAGE_DEFINITIONS[event];
  if (!definition) return null;

  const candidates =
    definition.candidates.length > 1
      ? definition.candidates.filter((text) => text !== previousText)
      : definition.candidates;
  const index = Math.min(
    candidates.length - 1,
    Math.floor(Math.max(0, random()) * candidates.length),
  );

  return {
    text: candidates[index],
    durationMs: definition.durationMs,
  };
}
