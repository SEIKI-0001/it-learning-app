import { describe, expect, it } from "vitest";
import { topicCheckPacks } from "@/data/topicCheckPacks";
import { getTopic } from "@/lib/content";
import {
  resolvePackExamQuestions,
  resolvePackFlashcards,
  resolvePackQuizQuestions,
} from "@/lib/checkPack";
import { decidePackStage, judgeRates } from "@/lib/checkPackJudge";

// 確認パックの中身の精度を守るテスト（2026-10-12 監査で見つかった欠陥の再発防止）。
//   - 同じパックの中で、ほぼ同じ問いが2回出ていた（共通鍵・稼働率・XOR・署名の鍵 など）
//   - 第1段階と第3段階で同じ問いが出ていた（純資産・人月・デファクトスタンダード など）
//   - 用語の無いパックは、全問正解でも「本番対応OK」に届かなかった

/**
 * 答えが同じでも、別の論点を問うので重複ではないと確認済みの組（packId → 答え）。
 * 知的財産権: 「申請なしで発生する権利」と「産業財産権に含まれない権利」はどちらも著作権。
 */
const SAME_ANSWER_OK: Record<string, string[]> = {
  "pack-strat-intellectual-property": ["著作権"],
};

/** 括弧の補足と空白を除いて、答えの言い回しの違いを吸収する。 */
function normalize(text: string): string {
  return text.replace(/[（(][^）)]*[）)]/g, "").replace(/\s/g, "").toLowerCase();
}

describe("確認パックの中身", () => {
  it("指定した確認問題がすべて実在する（先頭4問への黙ったフォールバックを起こさない）", () => {
    for (const pack of topicCheckPacks) {
      const topic = getTopic(pack.topicId)!;
      const ids = topic.checkQuestions.map((q) => q.id);
      for (const id of pack.quizQuestionIds) expect(ids, `${pack.packId}:${id}`).toContain(id);
      expect(resolvePackQuizQuestions(topic, pack)).toHaveLength(pack.quizQuestionIds.length);
    }
  });

  it("同じパックの確認問題で、同じ問い・同じ答えが重ならない", () => {
    for (const pack of topicCheckPacks) {
      const questions = resolvePackQuizQuestions(getTopic(pack.topicId)!, pack);
      const prompts = questions.map((q) => q.prompt);
      expect(new Set(prompts).size, `${pack.packId} prompts`).toBe(prompts.length);
      const allowed = new Set((SAME_ANSWER_OK[pack.packId] ?? []).map(normalize));
      const answers = questions
        .map((q) => normalize(q.choices.find((c) => c.key === q.correctChoice)!.text))
        .filter((a) => !allowed.has(a));
      expect(new Set(answers).size, `${pack.packId} answers: ${answers.join(" / ")}`).toBe(
        answers.length,
      );
    }
  });

  it("確認問題と過去問レベル問題で、同じ問いを出さない", () => {
    for (const pack of topicCheckPacks) {
      const quiz = resolvePackQuizQuestions(getTopic(pack.topicId)!, pack).map((q) => q.prompt);
      for (const ex of resolvePackExamQuestions(pack)) {
        expect(quiz, `${pack.packId}:${ex.id}`).not.toContain(ex.prompt);
      }
    }
  });

  it("関連用語はトピックに合わせて選んだものだけ（無関係だった語を戻さない）", () => {
    const words = (topicId: string) =>
      resolvePackFlashcards(topicCheckPacks.find((p) => p.topicId === topicId)!).map(
        (w) => w.acronym,
      );
    expect(words("tech-email-protocol")).toEqual(["SMTP", "POP", "IMAP"]);
    expect(words("tech-encryption-hash")).not.toContain("MFA");
    // 目標管理の文脈の MBO（Management by Objectives）と、収録語の MBO（経営陣買収）は別物
    expect(words("strat-goal-evaluation")).not.toContain("MBO");
    expect(words("strat-corporate-strategy")).toContain("MBO");
  });
});

describe("用語の無いパックの判定", () => {
  const perfect = { quizRate: 100, flashcardRate: null, examLevelRate: 100 };

  it("用語が無いパックは、確認問題と過去問レベルの結果だけで本番対応OKになる", () => {
    const decision = decidePackStage(judgeRates(perfect, { hasTerms: false }), 0);
    expect(decision.stage).toBe("exam_ready");
    expect(decision.resultStatus).toBe("passed");
  });

  it("用語があるパックで用語を解かなければ、従来どおり本番対応OKにしない", () => {
    const decision = decidePackStage(judgeRates(perfect), 0);
    expect(decision.stage).toBe("terms_stabilizing");
    expect(decision.resultStatus).toBe("incomplete");
  });

  it("用語の無いパックでも、本番対応OKは過去問レベルの結果でしか与えない", () => {
    const decision = decidePackStage(
      judgeRates({ quizRate: 100, flashcardRate: null, examLevelRate: 50 }, { hasTerms: false }),
      0,
    );
    expect(decision.stage).toBe("exam_check_pending");
  });

  it("実データで用語の無いパックが存在し、その画面と判定がこの経路を通る", () => {
    const empty = topicCheckPacks.filter((p) => resolvePackFlashcards(p).length === 0);
    expect(empty.map((p) => p.topicId)).toContain("tech-binary-data");
  });
});
