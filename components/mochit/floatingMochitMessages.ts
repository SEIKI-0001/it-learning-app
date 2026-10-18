import type { MochitGrowthStage, MochitPersonality } from "@/lib/mochit";
import type { MochitContext, MochitEvent, MochitEventSignal } from "./mochitEvents";

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
  correctStreak: {
    candidates: ["連続正解！いい流れ！", "連続正解！冴えてるね"],
    durationMs: 1_600,
  },
  focusComplete: {
    candidates: ["集中おつかれさま！休憩する？"],
    durationMs: 2_600,
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
    candidates: ["学習をひとつ達成したね！"],
    durationMs: 2_800,
  },
  checkpointClear: {
    candidates: ["チェックポイント突破！"],
    durationMs: 2_800,
  },
};

// ---------------------------------------------------------------------------
// 成長で増えるセリフ（既存の候補に混ぜる。置き換えない）
// ---------------------------------------------------------------------------
//
// 段階が上がるほど打ち解けた口調になり、個性が決まると得意分野にちなんだ一言が加わる。
// 学習の判定には使わない見た目だけの要素なので、事実の主張（何問正解など）は入れない。

export type MochitMessageGrowth = {
  stage: MochitGrowthStage;
  personality: MochitPersonality;
};

const STAGE_MESSAGE_ADDITIONS: Partial<
  Record<MochitEvent, ReadonlyArray<{ minStage: MochitGrowthStage; texts: readonly string[] }>>
> = {
  correct: [
    { minStage: 3, texts: ["わかってきたね！", "コアがあったかい！"] },
    { minStage: 5, texts: ["もう余裕だね", "さすが相棒！"] },
  ],
  incorrect: [
    { minStage: 3, texts: ["大丈夫、ここで育つよ"] },
    { minStage: 5, texts: ["ここは一緒に見直そう"] },
  ],
  correctStreak: [{ minStage: 4, texts: ["回路がつながってきた！"] }],
  taskComplete: [
    { minStage: 2, texts: ["芽がまたのびた気がする！"] },
    { minStage: 4, texts: ["つぼみがふくらんできたよ"] },
    { minStage: 5, texts: ["花がよろこんでる！"] },
  ],
};

const PERSONALITY_MESSAGES: Partial<Record<MochitPersonality, string>> = {
  strategy: "戦略家の勘がさえてる！",
  management: "段取りばっちり！",
  technology: "回路がビリっときた！",
  balanced: "どの分野もいい感じ！",
};

/** 個性の一言を混ぜるイベントと、混ぜ始める段階。 */
const PERSONALITY_EVENTS: ReadonlySet<MochitEvent> = new Set(["correct", "taskComplete"]);
const PERSONALITY_MIN_STAGE: MochitGrowthStage = 3;

export function getGrowthMessageCandidates(
  event: MochitEvent,
  growth: MochitMessageGrowth | undefined,
): string[] {
  if (!growth) return [];
  const texts: string[] = [];
  for (const addition of STAGE_MESSAGE_ADDITIONS[event] ?? []) {
    if (growth.stage >= addition.minStage) texts.push(...addition.texts);
  }
  const personalityText = PERSONALITY_MESSAGES[growth.personality];
  if (personalityText && growth.stage >= PERSONALITY_MIN_STAGE && PERSONALITY_EVENTS.has(event)) {
    texts.push(personalityText);
  }
  return texts;
}

export function getFloatingMochitMessage(
  event: MochitEvent,
  previousText: string | null,
  random: () => number = Math.random,
  growth?: MochitMessageGrowth,
): FloatingMochitMessage | null {
  const definition = FLOATING_MOCHIT_MESSAGE_DEFINITIONS[event];
  if (!definition) return null;

  const all = [...definition.candidates, ...getGrowthMessageCandidates(event, growth)];
  const candidates = all.length > 1 ? all.filter((text) => text !== previousText) : all;
  const index = Math.min(
    candidates.length - 1,
    Math.floor(Math.max(0, random()) * candidates.length),
  );

  return {
    text: candidates[index],
    durationMs: definition.durationMs,
  };
}

// ---------------------------------------------------------------------------
// 学習コンテキストにもとづく発言（GF-P0-004）
// ---------------------------------------------------------------------------
//
// 「汎用リアクション」から「状況を分かっている相棒」へ寄せる。ただし:
//   - 事実がある場合だけ具体的に言う。無い項目は黙る（推測しない）。
//   - 事実 + 次の一手を短く。ユーザーを責めない。
//   - バッジ獲得は Celebration が演出済みなので、モチットは重ねて言わない。
//   - LLM に依存しない固定テンプレート。

/** 具体発言を出してよいイベント。個別回答の正誤や励ましは汎用のままにする。 */
const CONTEXTUAL_EVENTS: ReadonlySet<MochitEvent> = new Set([
  "taskComplete",
  "allCorrect",
  "checkpointClear",
]);

const CONTEXTUAL_DURATION_MS = 2_600;

/**
 * コンテキストから具体的な発言を1つ選ぶ。該当する事実が無ければ null。
 * 優先順位は「学習成果 → 合格への意味 → 継続」の順（要件書 §9.2 に合わせる）。
 */
export function getContextualMochitMessage(
  event: MochitEvent,
  context: MochitContext | undefined,
): FloatingMochitMessage | null {
  if (!context || !CONTEXTUAL_EVENTS.has(event)) return null;

  const text = pickContextualText(context);
  return text ? { text, durationMs: CONTEXTUAL_DURATION_MS } : null;
}

function pickContextualText(context: MochitContext): string | null {
  // 1. 学習成果: 過去の自分に勝った事実がいちばん強い。
  if (typeof context.recoveredCount === "number" && context.recoveredCount > 0) {
    return `前にまちがえた${context.recoveredCount}問、今回は正解！この調子でいこう`;
  }

  if (context.reviewCleared) {
    return "復習を1つやりきったね。忘れかけを1つ取り戻せたよ";
  }

  // 2. 合格への意味: バッジ獲得時は Celebration が演出済みなので触れない。
  if (!context.badgeJustEarned) {
    if (context.finalExamUnlocked) {
      return "CP達成条件がそろったよ。突破試験に挑戦できる！";
    }
    if (context.remainingRequiredBadges === 1) {
      return "CP達成条件はあと1つ。ゴールが見えてきたね";
    }
    if (
      typeof context.remainingRequiredBadges === "number" &&
      context.remainingRequiredBadges > 1
    ) {
      return `CP達成条件はあと${context.remainingRequiredBadges}つ。一歩ずつ進もう`;
    }
  }

  // 3. 継続: 自己ベストと救済はどちらも「責めない」枠。
  if (typeof context.personalBestStreak === "number" && context.personalBestStreak > 0) {
    return `${context.personalBestStreak}日連続は自己ベスト！よく続いてるね`;
  }

  if (context.streakShieldUsed) {
    return "おまもりが連続を守ったよ。今日は短くても大丈夫";
  }

  return null;
}

/**
 * シグナルから実際に表示する発言を決める。
 * コンテキストで具体的に言えるならそれを、無ければ従来の汎用メッセージへ。
 */
export function buildMochitMessage(
  signal: MochitEventSignal,
  previousText: string | null,
  random: () => number = Math.random,
  growth?: MochitMessageGrowth,
): FloatingMochitMessage | null {
  const contextual = getContextualMochitMessage(signal.type, signal.context);
  if (contextual && contextual.text !== previousText) return contextual;
  return getFloatingMochitMessage(signal.type, previousText, random, growth);
}
