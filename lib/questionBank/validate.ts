import type { ChoiceKey } from "@/types";
import type { QuestionRecord, QuestionStatus } from "@/types/questionBank";
import { CONTENT_HASH_PATTERN, computeContentHash } from "@/lib/questionBank/contentHash";
import {
  OFFICIAL_EXAM_FIELDS,
  OFFICIAL_EXAM_FIELD_SCOPE,
  getOfficialExamField,
  isOfficialExamField,
} from "@/lib/questionBank/officialExamField";

// ============================================================================
// 問題バンクの整合性検証。
// ----------------------------------------------------------------------------
// npm run validate:questions（test/questionBank.test.ts）から呼ばれる。
// 「壊れた問題データが本番に出る」のを CI で止めるのが目的なので、
// 例外ではなく違反の一覧を返し、まとめて直せるようにする。
// ============================================================================

export type QuestionBankIssue = {
  /** 対象の問題ID（全体に関わる違反は null）。 */
  questionId: string | null;
  rule: string;
  message: string;
};

const EXPECTED_CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

/** 解説が必須になる status（これ以外は空の解説を許可する）。 */
export const EXPLANATION_REQUIRED_STATUSES: QuestionStatus[] = [
  "explanation_verified",
  "published",
];

/** 問題1件を検証する。 */
export function validateQuestion(q: QuestionRecord): QuestionBankIssue[] {
  const issues: QuestionBankIssue[] = [];
  const add = (rule: string, message: string) =>
    issues.push({ questionId: q.id, rule, message });

  // --- 選択肢 -------------------------------------------------------------
  if (q.choices.length !== 4) {
    add("choices-count", `選択肢は4件必要ですが ${q.choices.length} 件です。`);
  }

  const keys = q.choices.map((c) => c.key);
  const uniqueKeys = new Set(keys);
  if (uniqueKeys.size !== keys.length) {
    add("choices-key-duplicate", `選択肢キーが重複しています: ${keys.join(", ")}`);
  }
  for (const key of uniqueKeys) {
    if (!EXPECTED_CHOICE_KEYS.includes(key)) {
      add("choices-key-range", `選択肢キーは A〜D のみ許可されます: "${key}"`);
    }
  }
  for (const choice of q.choices) {
    if (choice.text.trim() === "") {
      add("choices-empty-text", `選択肢 "${choice.key}" の本文が空です。`);
    }
  }

  // --- 正答 ---------------------------------------------------------------
  if (!keys.includes(q.correctChoice)) {
    add(
      "correct-choice-exists",
      `正答 "${q.correctChoice}" が選択肢（${keys.join(", ")}）に存在しません。`,
    );
  }

  // --- 本文 ---------------------------------------------------------------
  if (q.prompt.trim() === "") {
    add("prompt-empty", "問題文が空です。");
  }
  // 解説の要否は status で決まる。
  //   draft / content_verified      … 空でよい
  //     問題文・選択肢・正答の監査と、解説を書く作業は別工程。公式過去問を原文のまま
  //     収録した直後は解説がない状態が正しく、ここで空を弾くと「埋めるためだけの解説」を
  //     書かせることになる。
  //   explanation_verified / published … 空は不可（解説を監査した、と主張する状態のため）
  //   retired                        … 出題停止。内容を問わない。
  if (EXPLANATION_REQUIRED_STATUSES.includes(q.status) && q.explanation.trim() === "") {
    add("explanation-empty", `status "${q.status}" の問題には解説が必要です。`);
  }
  if (q.version < 1 || !Number.isInteger(q.version)) {
    add("version-positive-integer", `version は1以上の整数である必要があります: ${q.version}`);
  }

  // --- 公式問題の出典 -----------------------------------------------------
  // 出典を持つ問題（official_past / modified_official）は examField も必須。
  // official_past      … 出典必須 / isModified: false
  // modified_official  … 出典必須 / isModified: true（改変でも出典は必要。非公式扱いにしない）
  // app_original       … 出典を持たない
  // ai_generated       … 出典を持たない（参考にした公式問題IDはこのフィールドに入れない）
  const needsSource = q.origin === "official_past" || q.origin === "modified_official";
  if (needsSource && !q.official) {
    add("official-source-required", `origin "${q.origin}" には official（出典情報）が必要です。`);
  }
  if (!needsSource && q.official) {
    add(
      "official-source-unexpected",
      `origin "${q.origin}" に official（出典情報）を付けることはできません。`,
    );
  }

  if (q.official) {
    const s = q.official;
    if (s.sourceUrl.trim() === "") add("official-source-url", "sourceUrl が空です。");
    if (s.answerSourceUrl.trim() === "")
      add("official-answer-source-url", "answerSourceUrl が空です。");
    if (s.attribution.trim() === "") add("official-attribution", "attribution が空です。");
    if (!Number.isInteger(s.questionNumber) || s.questionNumber < 1) {
      add("official-question-number", `questionNumber が不正です: ${s.questionNumber}`);
    }

    // --- 公式出題区分 -----------------------------------------------------
    // examField は「公式問題冊子でどの区分の問だったか」。出典表示と年度別・区分別
    // 演習がこの値に乗るため、公式問題では欠けていることを許さない。
    // syllabusNode.field（内容分類）とは別物なので、ここで両者の一致は検査しない。
    if (!s.examField) {
      add(
        "official-exam-field-required",
        `origin "${q.origin}" には official.examField（公式問題冊子上の出題区分）が必要です。`,
      );
    } else if (!isOfficialExamField(s.examField)) {
      add(
        "official-exam-field-value",
        `official.examField は ${OFFICIAL_EXAM_FIELDS.join(" / ")} のみ許可されます: "${s.examField}"`,
      );
    } else if (
      s.examType === OFFICIAL_EXAM_FIELD_SCOPE.examType &&
      s.year === OFFICIAL_EXAM_FIELD_SCOPE.year &&
      Number.isInteger(s.questionNumber) &&
      s.questionNumber >= 1 &&
      s.questionNumber <= 100
    ) {
      // 令和8年度 ITパスポートは公式冊子の並びが分かっているので、問番号と突き合わせる。
      const expected = getOfficialExamField(s.questionNumber);
      if (s.examField !== expected) {
        add(
          "official-exam-field-question-number",
          `問${s.questionNumber} の公式出題区分は "${expected}" のはずですが "${s.examField}" です。`,
        );
      }
    }

    if (q.origin === "official_past" && s.isModified) {
      add(
        "official-past-not-modified",
        'origin "official_past" は原文出題のため isModified: false である必要があります。',
      );
    }
    if (q.origin === "modified_official" && !s.isModified) {
      add(
        "modified-official-is-modified",
        'origin "modified_official" は isModified: true である必要があります。',
      );
    }

    // 改変元の明示。類似度検査で「元問題と似ているのは当然」として block を免除する
    // 根拠になる値なので、改変問題を名乗るなら必ず持たせる。
    if (q.origin === "modified_official" && !s.derivedFromQuestionId?.trim()) {
      add(
        "modified-official-derived-from",
        'origin "modified_official" には official.derivedFromQuestionId（改変元の問題ID）が必要です。',
      );
    }
    if (q.origin !== "modified_official" && s.derivedFromQuestionId) {
      add(
        "derived-from-unexpected",
        `origin "${q.origin}" に official.derivedFromQuestionId を付けることはできません。`,
      );
    }
  }

  // --- AI生成のメタデータ -------------------------------------------------
  // 生成はオフラインで行い、来歴を必ず残す。「どのモデルのどの版で作ったか」が
  // 分からない問題を出題に混ぜない。
  if (q.origin === "ai_generated" && !q.generation) {
    add("generation-required", 'origin "ai_generated" には generation（生成メタデータ）が必要です。');
  }
  if (q.origin !== "ai_generated" && q.generation) {
    add(
      "generation-unexpected",
      `origin "${q.origin}" に generation（生成メタデータ）を付けることはできません。`,
    );
  }
  if (q.generation) {
    const g = q.generation;
    for (const [field, value] of [
      ["provider", g.provider],
      ["model", g.model],
      ["promptVersion", g.promptVersion],
      ["generatedAt", g.generatedAt],
    ] as const) {
      if (typeof value !== "string" || value.trim() === "") {
        add("generation-field-required", `generation.${field} が空です。`);
      }
    }
    if (g.generatedAt && Number.isNaN(Date.parse(g.generatedAt))) {
      add("generation-generated-at", `generation.generatedAt が日時として解釈できません: "${g.generatedAt}"`);
    }
    if (g.referenceQuestionIds) {
      if (g.referenceQuestionIds.includes(q.id)) {
        add("generation-reference-self", "generation.referenceQuestionIds に自分自身のIDは入れられません。");
      }
      const seenRefs = new Set<string>();
      for (const ref of g.referenceQuestionIds) {
        if (seenRefs.has(ref)) {
          add("generation-reference-duplicate", `generation.referenceQuestionIds が重複しています: "${ref}"`);
        }
        seenRefs.add(ref);
      }
    }
  }

  // AI生成問題の status は draft に固定しない。
  //
  // 固定すると「公開するには別の origin へ移す」しかなくなり、そのとき generation を
  // 捨てることになる（generation は ai_generated 以外に付けられないため）。
  // 来歴を消さないと公開できない仕組みは、来歴を残す目的そのものと矛盾する。
  // AI生成と分かったまま公開できること自体が、後から分析・撤回できる条件でもある。
  //
  // 代わりに、公開の条件を人手のレビュー側で満たさせる。ai_generated が published に
  // なるために必要なものは、この関数の中と外に分かれている:
  //
  //   ここ（QuestionRecord 1件だけで判定できるもの）
  //     - generation が存在し、provider / model / promptVersion / generatedAt が埋まっている
  //       … generation-required / generation-field-required
  //     - contentHash が本文と一致する … content-hash-match
  //     - reviewedAt / reviewedBy が埋まっている … published-reviewed-at / published-reviewed-by
  //
  //   lib/questionQuality/（レビュー記録・類似度・全問の突き合わせが要るもの）
  //     - approve のレビュー記録があり、contentReviewedBy / explanationReviewedBy /
  //       similarityReviewedBy が埋まっている … reviews.ts checkReviewGate
  //     - レビュー記録の questionId / version が問題側と一致する … 同上
  //     - 類似度が block 帯に該当しない … gate.ts checkSimilarityGate
  //     - blocker が1件も無い … report.ts buildQualityReport
  //
  // status を自動で書き換える処理はどこにも作らない。published にするのは、
  // Git 管理された問題データを人が明示的に編集する操作だけ。

  // --- 図表 ---------------------------------------------------------------
  // 図表は「問題が成立するために必要な情報」なので、参照切れ・alt 欠落を本文の欠落と
  // 同じ重さで弾く。実ファイルの存在確認は fs を使うテスト側で行う。
  const figures = q.figures ?? [];
  const figureIds = figures.map((f) => f.id);
  if (new Set(figureIds).size !== figureIds.length) {
    add("figure-id-unique", `図表IDが重複しています: ${figureIds.join(", ")}`);
  }
  for (const figure of figures) {
    if (figure.id.trim() === "") add("figure-id-empty", "図表IDが空です。");
    if (figure.alt.trim() === "") {
      add("figure-alt-empty", `図表 "${figure.id}" の alt が空です。`);
    }
    if (figure.kind === "image") {
      if (!figure.src || figure.src.trim() === "") {
        add("figure-src-required", `図表 "${figure.id}" は kind "image" なので src が必要です。`);
      }
    } else if (!figure.body || figure.body.trim() === "") {
      add("figure-body-required", `図表 "${figure.id}" は kind "${figure.kind}" なので body が必要です。`);
    }
  }

  // 原文が参照する図表IDと、実際に持っている図表が一致すること（順序も含む）。
  // 問題文の参照順と配列順がずれると「図1」と実物が食い違うため、順序まで見る。
  const referencedIds = q.official?.original?.figureIds;
  if (referencedIds) {
    if (referencedIds.join("") !== figureIds.join("")) {
      add(
        "figure-reference-match",
        `official.original.figureIds（${referencedIds.join(", ")}）と figures（${figureIds.join(", ")}）が一致しません。`,
      );
    }
  } else if (figures.length > 0 && q.official) {
    add(
      "figure-reference-required",
      `図表を持つ公式問題には official.original.figureIds が必要です（${figureIds.join(", ")}）。`,
    );
  }

  // --- contentHash / レビュー情報 -----------------------------------------
  // 形式を先に見る。旧形式（fnv1a64:…）が残っているとここで落ちる。
  if (!CONTENT_HASH_PATTERN.test(q.contentHash)) {
    add(
      "content-hash-format",
      `contentHash の形式が不正です（"sha256:" + 64文字の小文字hex が必要）: "${q.contentHash}"`,
    );
  }

  const expectedHash = computeContentHash(q);
  if (q.contentHash !== expectedHash) {
    add(
      "content-hash-match",
      `contentHash が本文と一致しません（保存値: ${q.contentHash} / 期待値: ${expectedHash}）。本文を変えたら version を上げて再生成してください。`,
    );
  }

  if (q.status === "published") {
    if (q.contentHash.trim() === "") {
      add("published-content-hash", "published の問題には contentHash が必要です。");
    }
    if (!q.reviewedAt) {
      add("published-reviewed-at", "published の問題には reviewedAt が必要です。");
    }
    if (!q.reviewedBy) {
      add("published-reviewed-by", "published の問題には reviewedBy が必要です。");
    }

    // 「解説を監査した」と主張する状態なので、書きかけの痕跡を残さない。
    for (const pattern of EXPLANATION_PLACEHOLDER_PATTERNS) {
      if (pattern.test(q.explanation)) {
        add(
          "explanation-placeholder",
          `解説が未完成のように見えます（${pattern} に一致）。published にする前に仕上げてください。`,
        );
      }
    }
    // 独自解説を「公式の解説」と誤認させない（出典表示の正確さに関わる）。
    for (const pattern of EXPLANATION_CLAIMS_OFFICIAL_PATTERNS) {
      if (pattern.test(q.explanation)) {
        add(
          "explanation-claims-official",
          `解説が公式解説だと誤認させる表現を含みます（${pattern} に一致）。`,
        );
      }
    }
  }

  return issues;
}

/**
 * 未完成の解説を published に通さないための検出パターン。
 * 日常語の部分一致は使わない（「発想を出し切った後で行う」のような正当な本文を
 * 誤検知すると、検証を無視する習慣がついてしまう）。
 */
export const EXPLANATION_PLACEHOLDER_PATTERNS: RegExp[] = [
  /TODO/i,
  /FIXME/i,
  /\bWIP\b/i,
  /後で(書く|埋める|追記)/,
  /(仮|ダミー|サンプル|暫定)の?(解説|文|テキスト)/,
  /未(作成|記入|定)/,
  /あとで/,
];

/** 独自解説を公式解説だと誤認させる表現。 */
export const EXPLANATION_CLAIMS_OFFICIAL_PATTERNS: RegExp[] = [
  /公式解説/,
  /公式の解説/,
  /IPAの解説/,
];

/** 問題集合全体を検証する（重複IDを含む）。 */
export function validateQuestions(questions: QuestionRecord[]): QuestionBankIssue[] {
  const issues: QuestionBankIssue[] = [];

  const seen = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) {
      issues.push({
        questionId: q.id,
        rule: "id-unique",
        message: `問題IDが重複しています: "${q.id}"`,
      });
    }
    seen.add(q.id);
  }

  // 同一文章の大量流用の検出。
  // 1問ずつ見ても分からないので、集合全体で突き合わせる。
  // 対象は published のみ（draft の空解説どうしを重複扱いしない）。
  const explanationOwner = new Map<string, string>();
  for (const q of questions) {
    if (q.status !== "published") continue;
    const text = q.explanation.trim();
    if (text === "") continue;

    const firstOwner = explanationOwner.get(text);
    if (firstOwner !== undefined) {
      issues.push({
        questionId: q.id,
        rule: "explanation-duplicate",
        message: `解説の本文が "${firstOwner}" と完全に同一です。問題ごとに書き分けてください。`,
      });
    } else {
      explanationOwner.set(text, q.id);
    }
  }

  // 参照切れの検出。問題1件だけでは判定できないので集合全体で見る。
  // 参照先が消えると「何をもとに作ったか」を後から追えなくなり、
  // 類似度検査の除外根拠（改変元）も宙に浮く。
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const q of questions) {
    for (const ref of q.generation?.referenceQuestionIds ?? []) {
      if (!byId.has(ref)) {
        issues.push({
          questionId: q.id,
          rule: "generation-reference-resolvable",
          message: `generation.referenceQuestionIds が存在しない問題ID "${ref}" を参照しています。`,
        });
      }
    }

    const derivedFrom = q.official?.derivedFromQuestionId;
    if (derivedFrom) {
      const parent = byId.get(derivedFrom);
      if (!parent) {
        issues.push({
          questionId: q.id,
          rule: "derived-from-resolvable",
          message: `official.derivedFromQuestionId が存在しない問題ID "${derivedFrom}" を参照しています。`,
        });
      } else if (parent.origin !== "official_past") {
        issues.push({
          questionId: q.id,
          rule: "derived-from-official-past",
          message: `official.derivedFromQuestionId は origin "official_past" の問題を指す必要があります（"${derivedFrom}" は "${parent.origin}"）。`,
        });
      } else if (derivedFrom === q.id) {
        issues.push({
          questionId: q.id,
          rule: "derived-from-self",
          message: "official.derivedFromQuestionId に自分自身のIDは指定できません。",
        });
      }
    }
  }

  for (const q of questions) {
    issues.push(...validateQuestion(q));
  }

  return issues;
}

/**
 * 確認パックが参照する問題IDがすべて解決できるかを検証する。
 * 現行の解決処理は見つからないIDを黙って捨てるため、
 * 「出題数が知らないうちに減る」事故をここで止める。
 */
export function validatePackReferences(
  packs: { packId: string; examLevelQuestionIds: string[] }[],
  questions: QuestionRecord[],
): QuestionBankIssue[] {
  const ids = new Set(questions.map((q) => q.id));
  const issues: QuestionBankIssue[] = [];

  for (const pack of packs) {
    for (const questionId of pack.examLevelQuestionIds) {
      if (!ids.has(questionId)) {
        issues.push({
          questionId,
          rule: "pack-reference-resolvable",
          message: `確認パック "${pack.packId}" が存在しない問題ID "${questionId}" を参照しています。`,
        });
      }
    }
  }

  return issues;
}

/** 違反一覧を読みやすい1つの文字列にする（テスト失敗時の表示用）。 */
export function formatIssues(issues: QuestionBankIssue[]): string {
  return issues
    .map((i) => `- [${i.rule}] ${i.questionId ?? "(全体)"}: ${i.message}`)
    .join("\n");
}
