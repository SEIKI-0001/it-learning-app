import { describe, expect, it } from "vitest";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import explanationFile from "@/data/question-bank/explanations/official/ipa/it-passport-2026.json";
import pr2aSnapshot from "@/test/fixtures/ipa-it-passport-2026-pr2a-snapshot.json";
import { topicCheckPacks } from "@/data/topicCheckPacks";
import { resolvePackExamQuestions } from "@/lib/checkPack";
import {
  getAllQuestions,
  getPlayableOfficialExamYears,
  getPublishedOfficialQuestionsByYear,
  getPublishedQuestions,
  getQuestionsByOrigin,
  getQuestionsByTopic,
  isPlayableOfficialExamYear,
} from "@/lib/questionBank/loader";
import { computeContentHash } from "@/lib/questionBank/contentHash";
import { getOfficialExamField } from "@/lib/questionBank/officialExamField";
import {
  formatIssues,
  validateQuestion,
  validateQuestions,
} from "@/lib/questionBank/validate";
import type { QuestionRecord } from "@/types/questionBank";

// ============================================================================
// PR2-B: 令和8年度 公式過去問の独自解説と公開状態の検証。
// ----------------------------------------------------------------------------
// ここで守りたいこと:
//   1. 100問すべてが version 2 / published / 独自解説つきであること
//   2. 独自解説が未完成・使い回しでないこと
//   3. 公式原文（official.original）と表示本文・図表・分類が PR2-A から不変であること
//   4. 年度別演習が「問1〜100の順」「公式区分 34/20/46」で取れること
// ============================================================================

const IPA_2026 = getPublishedOfficialQuestionsByYear(2026);
const SNAPSHOT_BY_ID = new Map(pr2aSnapshot.questions.map((q) => [q.id, q]));
const EXPLANATIONS = explanationFile.explanations as Record<string, string>;

const FIGURE_DIR = path.join(
  process.cwd(),
  "public/question-bank/official/ipa/it-passport/2026",
);

describe("令和8年度 公式過去問の公開状態", () => {
  it("公開済みの令和8年度問題がちょうど100問ある", () => {
    expect(IPA_2026).toHaveLength(100);
  });

  it("100問すべてが version 2 / status published", () => {
    for (const q of IPA_2026) {
      expect(q.version, `${q.id} の version`).toBe(2);
      expect(q.status, `${q.id} の status`).toBe("published");
    }
  });

  it("100問すべてにレビュー情報が入っている", () => {
    for (const q of IPA_2026) {
      expect(q.reviewedBy, `${q.id} の reviewedBy`).toBe(
        "claude-code:two-pass-explanation-review",
      );
      expect(q.reviewedAt, `${q.id} の reviewedAt`).toBeTruthy();
      expect(Number.isNaN(Date.parse(q.reviewedAt!))).toBe(false);
    }
  });

  it("reviewedAt は固定値（再生成で日時が動かない）", () => {
    const distinct = new Set(IPA_2026.map((q) => q.reviewedAt));
    expect(distinct.size).toBe(1);
    expect([...distinct][0]).toBe(explanationFile.reviewedAt);
  });
});

describe("独自解説", () => {
  it("100問すべてに独自解説がある", () => {
    for (const q of IPA_2026) {
      expect(q.explanation.trim(), `${q.id} の解説が空`).not.toBe("");
    }
    expect(Object.keys(EXPLANATIONS)).toHaveLength(100);
  });

  it("問1〜100のキーが漏れなくそろっている", () => {
    for (let n = 1; n <= 100; n += 1) {
      expect(EXPLANATIONS[String(n)], `問${n} の解説が無い`).toBeTruthy();
    }
  });

  it("TODO・仮文・書きかけの痕跡がない", () => {
    // 日常語の部分一致では誤検知するので、書きかけ特有の言い回しだけを見る
    // （例: 問10 の「発想を出し切った後で行う」は正当な本文）。
    const placeholders = [
      /TODO/i,
      /FIXME/i,
      /\bWIP\b/i,
      /後で(書く|埋める|追記)/,
      /(仮|ダミー|サンプル|暫定)の?(解説|文|テキスト)/,
      /未(作成|記入|定)/,
      /あとで/,
    ];
    for (const [number, text] of Object.entries(EXPLANATIONS)) {
      for (const pattern of placeholders) {
        expect(pattern.test(text), `問${number} に書きかけの痕跡: ${pattern}`).toBe(
          false,
        );
      }
    }
  });

  it("解説本文の使い回しがない（完全一致の重複ゼロ）", () => {
    const seen = new Map<string, string>();
    for (const [number, text] of Object.entries(EXPLANATIONS)) {
      const duplicatedAt = seen.get(text);
      expect(duplicatedAt, `問${number} は問${duplicatedAt} と同一の解説`).toBeUndefined();
      seen.set(text, number);
    }
  });

  it("解説が正答の言い換えだけになっていない（十分な長さと文の数がある）", () => {
    for (const [number, text] of Object.entries(EXPLANATIONS)) {
      const sentences = (text.match(/。/g) ?? []).length;
      expect(sentences, `問${number} の文の数`).toBeGreaterThanOrEqual(3);
      expect(sentences, `問${number} の文の数`).toBeLessThanOrEqual(6);
      expect(text.length, `問${number} の解説が短すぎる`).toBeGreaterThanOrEqual(120);
    }
  });

  it("「公式解説」だと誤認させる表現を使っていない", () => {
    for (const [number, text] of Object.entries(EXPLANATIONS)) {
      expect(/公式解説|公式の解説|IPAの解説/.test(text), `問${number}`).toBe(false);
    }
  });

  it("解説ファイルが独自著作物であることを明記している", () => {
    expect(explanationFile.note).toMatch(/公式解説ではなく|独自/);
  });
});

describe("公式原文と分類が PR2-A から不変", () => {
  it("スナップショットが100問ぶんある", () => {
    expect(SNAPSHOT_BY_ID.size).toBe(100);
  });

  it("official（original を含む）が完全一致", () => {
    for (const q of IPA_2026) {
      const before = SNAPSHOT_BY_ID.get(q.id);
      expect(before, `${q.id} がスナップショットに無い`).toBeDefined();
      expect(q.official, `${q.id} の official が変化`).toEqual(before!.official);
    }
  });

  it("問題文・選択肢・正答が完全一致（表示用テキストも変えていない）", () => {
    for (const q of IPA_2026) {
      const before = SNAPSHOT_BY_ID.get(q.id)!;
      expect(q.prompt, `${q.id} の prompt`).toBe(before.prompt);
      expect(q.choices, `${q.id} の choices`).toEqual(before.choices);
      expect(q.correctChoice, `${q.id} の correctChoice`).toBe(before.correctChoice);
    }
  });

  it("図表が完全一致", () => {
    for (const q of IPA_2026) {
      const before = SNAPSHOT_BY_ID.get(q.id)!;
      expect(q.figures, `${q.id} の figures`).toEqual(before.figures);
    }
  });

  it("primaryTopicId / syllabusNode / 難易度 / タグが完全一致", () => {
    for (const q of IPA_2026) {
      const before = SNAPSHOT_BY_ID.get(q.id)!;
      expect(q.primaryTopicId, `${q.id} の primaryTopicId`).toBe(before.primaryTopicId);
      expect(q.syllabusNode, `${q.id} の syllabusNode`).toEqual(before.syllabusNode);
      expect(q.questionPattern, `${q.id} の questionPattern`).toBe(before.questionPattern);
      expect(q.estimatedDifficulty, `${q.id}`).toBe(before.estimatedDifficulty);
      expect(q.tags, `${q.id} の tags`).toEqual(before.tags);
    }
  });

  it("表示用本文と official.original が引き続き一致している", () => {
    for (const q of IPA_2026) {
      expect(q.prompt).toBe(q.official!.original!.prompt);
      expect(q.choices).toEqual(q.official!.original!.choices);
      expect(q.correctChoice).toBe(q.official!.original!.correctChoice);
    }
  });
});

describe("contentHash", () => {
  it("解説を含めて再計算した値と一致する", () => {
    for (const q of IPA_2026) {
      expect(q.contentHash, `${q.id} の contentHash`).toBe(computeContentHash(q));
    }
  });

  it("解説追加によって PR2-A 時点のハッシュから変わっている", () => {
    // explanation はハッシュ対象なので、解説を入れたら必ず動くはず。
    // 動いていない＝解説が本文に反映されていない、という取りこぼしを検出する。
    for (const q of IPA_2026) {
      const before = SNAPSHOT_BY_ID.get(q.id)!;
      const beforeHash = computeContentHash({
        prompt: before.prompt,
        choices: before.choices as QuestionRecord["choices"],
        correctChoice: before.correctChoice as QuestionRecord["correctChoice"],
        explanation: "",
      });
      expect(q.contentHash, `${q.id} のハッシュが解説追加後も同じ`).not.toBe(beforeHash);
    }
  });
});

describe("年度別の取得", () => {
  it("問1〜100の順に並ぶ", () => {
    expect(IPA_2026.map((q) => q.official!.questionNumber)).toEqual(
      Array.from({ length: 100 }, (_, i) => i + 1),
    );
  });

  it("公式出題区分が 34 / 20 / 46 問", () => {
    const count = (field: string) =>
      IPA_2026.filter((q) => q.official!.examField === field).length;
    expect(count("strategy")).toBe(34);
    expect(count("management")).toBe(20);
    expect(count("technology")).toBe(46);
  });

  it("公式出題区分が問番号から決まる値と一致する", () => {
    for (const q of IPA_2026) {
      expect(q.official!.examField, `${q.id}`).toBe(
        getOfficialExamField(q.official!.questionNumber),
      );
    }
  });

  it("official_past 以外や未公開の問題が混ざらない", () => {
    for (const q of IPA_2026) {
      expect(q.origin).toBe("official_past");
      expect(q.status).toBe("published");
      expect(q.official!.year).toBe(2026);
    }
  });

  it("収録していない年度は空で、演習を開始できない", () => {
    expect(getPublishedOfficialQuestionsByYear(2025)).toEqual([]);
    expect(isPlayableOfficialExamYear(2025)).toBe(false);
  });

  it("令和8年度は演習を開始できる年度として一覧に出る", () => {
    expect(isPlayableOfficialExamYear(2026)).toBe(true);
    expect(getPlayableOfficialExamYears()).toEqual([2026]);
  });
});

describe("図表", () => {
  it("11点の図表がすべて実ファイルとして存在する", () => {
    const referenced: string[] = [];
    for (const q of IPA_2026) {
      for (const figure of q.figures ?? []) {
        expect(figure.alt.trim(), `${figure.id} の alt が空`).not.toBe("");
        expect(figure.src, `${figure.id} の src`).toBeTruthy();
        referenced.push(path.basename(figure.src!));
      }
    }
    expect(referenced).toHaveLength(11);

    const onDisk = readdirSync(FIGURE_DIR).filter((f) => f.endsWith(".png"));
    expect(onDisk.sort()).toEqual([...referenced].sort());
  });

  it("図表を持つのは 7 問（問3・26・44・50・57・72・74）", () => {
    const withFigures = IPA_2026.filter((q) => (q.figures?.length ?? 0) > 0);
    expect(withFigures.map((q) => q.official!.questionNumber)).toEqual([
      3, 26, 44, 50, 57, 72, 74,
    ]);
  });

  it("図表ファイルが有効な PNG である（実寸を読めるので next/image に渡せる）", () => {
    for (const q of IPA_2026) {
      for (const figure of q.figures ?? []) {
        const buffer = readFileSync(path.join(process.cwd(), "public", figure.src!));
        expect(buffer.toString("hex", 0, 8), `${figure.id}`).toBe("89504e470d0a1a0a");
        expect(buffer.readUInt32BE(16)).toBeGreaterThan(0);
        expect(buffer.readUInt32BE(20)).toBeGreaterThan(0);
      }
    }
  });
});

describe("validator が未完成・使い回しの解説を弾く", () => {
  /** 実データの1問をひな形にして、解説だけ差し替えた検証用レコードを作る。 */
  function withExplanation(explanation: string): QuestionRecord {
    const base = IPA_2026[0];
    const next = { ...base, explanation };
    return { ...next, contentHash: computeContentHash(next) };
  }

  it("本物の100問は検証を通る", () => {
    expect(formatIssues(validateQuestions(IPA_2026))).toBe("");
  });

  it("TODO を含む解説を published にできない", () => {
    const issues = validateQuestion(withExplanation("TODO: あとで書く"));
    expect(issues.map((i) => i.rule)).toContain("explanation-placeholder");
  });

  it("仮文・書きかけの解説を published にできない", () => {
    for (const text of ["仮の解説です。", "未作成", "後で書く予定。"]) {
      const issues = validateQuestion(withExplanation(text));
      expect(issues.map((i) => i.rule), text).toContain("explanation-placeholder");
    }
  });

  it("解説が空の published を弾く", () => {
    const issues = validateQuestion(withExplanation(""));
    expect(issues.map((i) => i.rule)).toContain("explanation-empty");
  });

  it("公式解説だと誤認させる表現を弾く", () => {
    const issues = validateQuestion(
      withExplanation("公式解説によれば、これが正答である。理由は次のとおり。以上。"),
    );
    expect(issues.map((i) => i.rule)).toContain("explanation-claims-official");
  });

  it("同一文章の使い回しを弾く", () => {
    const shared = "まったく同じ解説文をふたつの問題に使い回した場合の検証用テキスト。";
    const a = { ...withExplanation(shared), id: "dup-a" };
    const b = { ...withExplanation(shared), id: "dup-b" };
    const rules = validateQuestions([a, b]).map((i) => i.rule);
    expect(rules).toContain("explanation-duplicate");
  });

  it("正当な日本語（「〜した後で行う」など）は誤検知しない", () => {
    // 問10 の実際の解説にある言い回し。部分一致で弾いてしまわないこと。
    const issues = validateQuestion(
      withExplanation(
        "アイディアの評価は発想を出し切った後で行うのが基本です。まず量を出します。批判はしません。最後に選びます。",
      ),
    );
    expect(issues.map((i) => i.rule)).not.toContain("explanation-placeholder");
  });
});

describe("既存機能への影響", () => {
  it("published は令和8年度の100問だけ（既存146問は draft のまま）", () => {
    const published = getPublishedQuestions();
    expect(published).toHaveLength(100);
    expect(published.every((q) => q.origin === "official_past")).toBe(true);

    const appOriginal = getQuestionsByOrigin("app_original");
    expect(appOriginal).toHaveLength(146);
    expect(appOriginal.every((q) => q.status === "draft")).toBe(true);
    expect(appOriginal.every((q) => q.version === 1)).toBe(true);
  });

  it("問題の総数が 246 問（146 + 100）で増減していない", () => {
    expect(getAllQuestions()).toHaveLength(246);
  });

  it("確認パックは67個のままで、公式過去問を1問も取り込んでいない", () => {
    expect(topicCheckPacks).toHaveLength(67);

    const officialIds = new Set(IPA_2026.map((q) => q.id));
    for (const pack of topicCheckPacks) {
      for (const id of pack.examLevelQuestionIds) {
        expect(officialIds.has(id), `${pack.packId} が公式過去問 ${id} を参照`).toBe(false);
      }
      // パックが解決する問題は、これまでどおり app_original だけ。
      for (const question of resolvePackExamQuestions(pack)) {
        expect(officialIds.has(question.id), `${pack.packId}`).toBe(false);
      }
    }
  });

  it("公式過去問はトピック経由でも既存機能に混ざらない導線になっている", () => {
    // 公式過去問は primaryTopicId を持つので getQuestionsByTopic では引ける。
    // 既存機能（確認パック）はID指定で解決しているため混入しないが、
    // 将来トピック経由の出題を足すときに気づけるよう、状態をここに固定しておく。
    const topicId = IPA_2026[0].primaryTopicId;
    const inTopic = getQuestionsByTopic(topicId);
    expect(inTopic.some((q) => q.origin === "official_past")).toBe(true);
    expect(inTopic.some((q) => q.origin === "app_original")).toBe(true);
  });

  it("100問模試の出題元（app_original）が公式過去問の公開で変わっていない", () => {
    // 模試は data/examLevelQuestions 由来の app_original 問題だけで構成される。
    const examLevel = getQuestionsByOrigin("app_original");
    expect(examLevel.every((q) => q.official === undefined)).toBe(true);
    expect(examLevel.every((q) => q.status === "draft")).toBe(true);
  });
});
