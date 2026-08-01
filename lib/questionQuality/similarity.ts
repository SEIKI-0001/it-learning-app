import type { QuestionRecord } from "@/types/questionBank";
import {
  normalizeChoiceText,
  normalizeForSimilarity,
  normalizeQuestionText,
} from "@/lib/questionQuality/normalize";
import {
  SIMILARITY_MIN_EXACT_LENGTH,
  SIMILARITY_MIN_PROMPT_LENGTH,
  SIMILARITY_NGRAM_SIZE,
  SIMILARITY_THRESHOLDS,
  type SimilarityBand,
} from "@/lib/questionQuality/thresholds";

// ============================================================================
// 問題どうしの類似度検査。
// ----------------------------------------------------------------------------
// 外部API・ベクトルDB・埋め込みモデルは使わない。理由は3つ:
//   1. 決定的であること（同じ入力なら常に同じ結果）を CI で保証したい
//   2. 検査結果を人が読んで納得できること（なぜ止まったかが説明できる）
//   3. 問題データを外部へ送らないこと
//
// 手法: 正規化テキストの文字 bi-gram を集合と見て Dice 係数を取る。
//   Dice(A,B) = 2|A∩B| / (|A|+|B|)
// Jaccard も同じ集合から出せるので併せて返す（帯の判定には Dice を使う）。
//
// 計算量は O(問題数^2)。246問なら約3万ペアで、bi-gram 集合を事前に作れば一瞬で終わる。
// 問題数が数千を超えたら、先頭 n-gram でのブロッキングを足すこと。
// ============================================================================

/** 文字 n-gram の集合を作る。n 未満の短い文字列は文字列そのものを1要素にする。 */
export function toNgrams(text: string, n: number = SIMILARITY_NGRAM_SIZE): Set<string> {
  const chars = [...text]; // サロゲートペアを1文字として扱う
  if (chars.length === 0) return new Set();
  if (chars.length < n) return new Set([chars.join("")]);

  const grams = new Set<string>();
  for (let i = 0; i <= chars.length - n; i += 1) {
    grams.add(chars.slice(i, i + n).join(""));
  }
  return grams;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let count = 0;
  for (const g of small) if (large.has(g)) count += 1;
  return count;
}

/** Dice 係数（0〜1）。両方空なら 1（完全一致扱い）。 */
export function diceCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  return (2 * intersectionSize(a, b)) / (a.size + b.size);
}

/** Jaccard 係数（0〜1）。報告用の副指標。 */
export function jaccardIndex(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const inter = intersectionSize(a, b);
  return inter / (a.size + b.size - inter);
}

/** 文字列どうしの Dice 係数（正規化は呼び出し側で済ませておくこと）。 */
export function textSimilarity(a: string, b: string): number {
  return diceCoefficient(toNgrams(a), toNgrams(b));
}

// ---------------------------------------------------------------------------
// 問題の比較単位
// ---------------------------------------------------------------------------

/** 比較のために前処理した問題1件。ペア比較のたびに正規化しないためのキャッシュ。 */
export type SimilarityProfile = {
  id: string;
  origin: QuestionRecord["origin"];
  status: QuestionRecord["status"];
  /** 改変元の問題ID（modified_official のみ）。 */
  derivedFromQuestionId?: string;
  normalizedPrompt: string;
  normalizedFull: string;
  normalizedCorrectChoice: string;
  promptGrams: Set<string>;
  fullGrams: Set<string>;
  correctChoiceGrams: Set<string>;
};

export function buildSimilarityProfile(q: QuestionRecord): SimilarityProfile {
  const normalizedPrompt = normalizeForSimilarity(q.prompt);
  const normalizedFull = normalizeQuestionText(q.prompt, q.choices);
  const correct = q.choices.find((c) => c.key === q.correctChoice);
  const normalizedCorrectChoice = correct ? normalizeChoiceText(correct.text) : "";

  return {
    id: q.id,
    origin: q.origin,
    status: q.status,
    derivedFromQuestionId: q.official?.derivedFromQuestionId,
    normalizedPrompt,
    normalizedFull,
    normalizedCorrectChoice,
    promptGrams: toNgrams(normalizedPrompt),
    fullGrams: toNgrams(normalizedFull),
    correctChoiceGrams: toNgrams(normalizedCorrectChoice),
  };
}

/** 1ペアぶんのスコア。どの軸で似ているのかを分けて持つ。 */
export type SimilarityPairScore = {
  /** 問題文どうし。 */
  promptScore: number;
  /** 問題文＋選択肢（問題全体）。 */
  fullScore: number;
  /** 正答選択肢の本文どうし。 */
  correctChoiceScore: number;
  /** 帯の判定に使う代表値（promptScore と fullScore の大きい方）。 */
  score: number;
  /** 副指標（問題全体の Jaccard）。 */
  fullJaccard: number;
  /** 正規化後の問題全体が完全一致したか。 */
  exact: boolean;
};

export function scorePair(a: SimilarityProfile, b: SimilarityProfile): SimilarityPairScore {
  const promptScore = diceCoefficient(a.promptGrams, b.promptGrams);
  const fullScore = diceCoefficient(a.fullGrams, b.fullGrams);
  const correctChoiceScore = diceCoefficient(a.correctChoiceGrams, b.correctChoiceGrams);

  // 代表値は「問題文だけ似ている」「選択肢まで含めて似ている」のどちらでも拾えるよう
  // 大きい方を取る。平均にすると、選択肢を総入れ替えした問題文丸写しが埋もれる。
  const score = Math.max(promptScore, fullScore);

  const exact =
    a.normalizedFull === b.normalizedFull &&
    [...a.normalizedFull].length >= SIMILARITY_MIN_EXACT_LENGTH;

  return {
    promptScore,
    fullScore,
    correctChoiceScore,
    score,
    fullJaccard: jaccardIndex(a.fullGrams, b.fullGrams),
    exact,
  };
}

/**
 * スコアを帯に変換する。
 *
 * 短い問題（正規化後の問題文が SIMILARITY_MIN_PROMPT_LENGTH 未満）は、偶然の一致で
 * スコアが跳ねるため notice までに丸める。定型句は正規化の段階で落としてある。
 */
export function classifyScore(
  pair: SimilarityPairScore,
  a: SimilarityProfile,
  b: SimilarityProfile,
): SimilarityBand {
  if (pair.exact) return "exact_duplicate";

  const shortest = Math.min([...a.normalizedPrompt].length, [...b.normalizedPrompt].length);
  const tooShortToJudge = shortest < SIMILARITY_MIN_PROMPT_LENGTH;

  if (pair.score >= SIMILARITY_THRESHOLDS.block) {
    return tooShortToJudge ? "notice" : "block";
  }
  if (pair.score >= SIMILARITY_THRESHOLDS.reviewRequired) {
    return tooShortToJudge ? "notice" : "review_required";
  }
  if (pair.score >= SIMILARITY_THRESHOLDS.notice) return "notice";
  return "ok";
}

// ---------------------------------------------------------------------------
// 全問突き合わせ
// ---------------------------------------------------------------------------

/** 1問について「最も似ている相手」1件ぶんの検出結果。 */
export type SimilarityMatch = {
  questionId: string;
  /** 最も似ていた相手の問題ID。 */
  matchedQuestionId: string;
  matchedOrigin: QuestionRecord["origin"];
  band: SimilarityBand;
  scores: SimilarityPairScore;
  /** modified_official が自分の改変元と比較された結果か（block を免除する根拠）。 */
  isDerivedPair: boolean;
};

/** 1問ぶんの検出結果。 */
export type SimilarityResult = {
  /** バンク内で最も似ていた相手（"ok" 帯しか無ければ undefined）。 */
  best?: SimilarityMatch;
  /**
   * 公式過去問のうち最も似ていた相手。
   *
   * best とは別に持つ理由: 独自問題どうしが 0.85 で似ていて、公式問題とは 0.93 似ている、
   * という状況で best だけを見ると、公開を止めるべき「公式との酷似」を見落とす。
   * 自身が official_past の場合は求めない。
   */
  bestOfficial?: SimilarityMatch;
};

const compareByScore = (a: SimilarityMatch, b: SimilarityMatch) =>
  b.scores.score - a.scores.score || (a.matchedQuestionId < b.matchedQuestionId ? -1 : 1);

/**
 * 問題バンク全体を総当たりし、各問題の最類似相手を返す。
 *
 * band が "ok" のペアは結果に含めない。全ペアを返すと数万件のレポートになる。
 */
export function analyzeSimilarity(questions: QuestionRecord[]): Map<string, SimilarityResult> {
  const profiles = questions.map(buildSimilarityProfile);
  const results = new Map<string, SimilarityResult>();
  for (const p of profiles) results.set(p.id, {});

  const consider = (self: SimilarityProfile, other: SimilarityProfile, pair: SimilarityPairScore) => {
    const band = classifyScore(pair, self, other);
    if (band === "ok") return;

    const match: SimilarityMatch = {
      questionId: self.id,
      matchedQuestionId: other.id,
      matchedOrigin: other.origin,
      band,
      scores: pair,
      isDerivedPair:
        self.derivedFromQuestionId === other.id || other.derivedFromQuestionId === self.id,
    };

    const result = results.get(self.id)!;
    // 同点のときは相手IDの昇順で決める（総当たりの順序に結果を依存させない）。
    if (!result.best || compareByScore(match, result.best) < 0) {
      result.best = match;
    }
    if (
      self.origin !== "official_past" &&
      other.origin === "official_past" &&
      (!result.bestOfficial || compareByScore(match, result.bestOfficial) < 0)
    ) {
      result.bestOfficial = match;
    }
  };

  for (let i = 0; i < profiles.length; i += 1) {
    for (let j = i + 1; j < profiles.length; j += 1) {
      const pair = scorePair(profiles[i], profiles[j]);
      if (pair.score < SIMILARITY_THRESHOLDS.notice && !pair.exact) continue;
      consider(profiles[i], profiles[j], pair);
      consider(profiles[j], profiles[i], pair);
    }
  }

  return results;
}

/**
 * 検出結果を1本のリストにする（レポート・テスト用）。
 * 並び順は questionId の昇順で固定する（レポートの差分を安定させるため）。
 */
export function flattenSimilarityResults(results: Map<string, SimilarityResult>): SimilarityMatch[] {
  const out: SimilarityMatch[] = [];
  for (const [, result] of [...results.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (result.best) out.push(result.best);
    if (result.bestOfficial && result.bestOfficial.matchedQuestionId !== result.best?.matchedQuestionId) {
      out.push(result.bestOfficial);
    }
  }
  return out;
}
