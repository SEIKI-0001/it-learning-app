import type { ChoiceKey } from "@/types";
import type { QuestionRecord } from "@/types/questionBank";
import type { QualityFinding } from "@/types/questionQuality";
import { ipaSyllabusItems } from "@/data/ipaSyllabus";
import { normalizeBase, normalizeChoiceText } from "@/lib/questionQuality/normalize";
import { textSimilarity } from "@/lib/questionQuality/similarity";
import { QUALITY_THRESHOLDS } from "@/lib/questionQuality/thresholds";

// ============================================================================
// 問題の品質ゲート（公開前の機械検査）。
// ----------------------------------------------------------------------------
// lib/questionBank/validate.ts が「データとして壊れていないか」を見るのに対して、
// ここは「問題として成立しているか」を見る。
//
// severity の付け方が一番大事な設計判断:
//   blocker … 機械的に「間違っている」と断定できるものだけ。
//             例) 選択肢の本文が完全に同一 / 解説が正答と違う記号を正解だと書いている
//   warning … 人が読めば妥当な場合がありうるもの。ほぼ全部こちら。
//             例) 正答だけ長い / 「必ず」を含む選択肢がある
//
// warning を blocker にしたくなったら、まず「反例が1つも作れないか」を考えること。
// 反例が作れるルールを blocker にすると、検証を無視する習慣が付いて全体が死ぬ。
// ============================================================================

const ALL_KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

/** 正答の位置を露骨に示す表現。問題文にあってはいけない。 */
const ANSWER_REVEAL_PATTERNS: RegExp[] = [
  /正解は/,
  /答えは/,
  /正答は/,
  /※\s*ヒント/,
];

/**
 * 「不自然なヒント」になりやすい断定語。
 * 作問の定石として、こういう語を含む選択肢は誤りであることが多く、
 * 1つの選択肢にだけ現れると内容を読まずに正誤が推測できてしまう。
 */
const ABSOLUTE_HINT_WORDS = ["常に", "必ず", "すべて", "全て", "一切", "決して", "絶対に", "例外なく"];

/** 否定を問う出題であることを示す語。 */
const NEGATION_MARKERS = ["誤っている", "適切でない", "適切ではない", "正しくない", "該当しない", "でないもの", "ないものはどれか"];

/**
 * 否定が明示されていると認める書き方。
 * 「誤っているもの」のように否定語＋「もの」で受けている、または強調記号で囲ってある。
 */
const CLEAR_NEGATION_PATTERNS: RegExp[] = [
  /誤っているもの/,
  /適切でないもの/,
  /適切ではないもの/,
  /正しくないもの/,
  /該当しないもの/,
  /【[^】]*(誤|適切でない|正しくない)[^】]*】/,
  /「[^」]*(誤|適切でない|正しくない)[^」]*」/,
];

/** 数値の単位として認めるもの。 */
const UNIT_SOURCE =
  "円|万円|億円|%|％|パーセント|秒|分|時間|日|週|か月|ヶ月|年|件|人|回|個|台|枚|本|冊|文字|バイト|ビット|kb|mb|gb|tb|bps|kbps|mbps|gbps|hz|khz|mhz|ghz|ms|kg|km|cm|mm|倍|点|問|通り";

/**
 * 問題文が単位を示しているとみなす形。
 *
 * 単位そのものを探すだけでは駄目で、"本文" の「本」、"3分の1" の「分」のように
 * 単位に使う漢字は日常語にも普通に出てくる。数量と結び付いている形だけを見る。
 */
const PROMPT_UNIT_PATTERN = new RegExp(`(?:[0-9]|何|幾つ|いくつ)\\s*(?:${UNIT_SOURCE})|単位`, "i");

/**
 * 選択肢が「単位も接尾語も無い裸の数値」1つか。
 *
 * カンマは桁区切りとしてだけ認める。"1, 2, 3, 4, 5"（配列の中身）を1つの数値と
 * 見なしてしまうと、並べ替えの結果を問う問題まで「単位が無い計算問題」になる。
 */
function isBareNumber(text: string): boolean {
  const t = normalizeBase(text).replace(/\s/g, "");
  const plain = /^[-−]?[0-9]+(?:\.[0-9]+)?$/;
  const grouped = /^[-−]?[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?$/;
  return plain.test(t) || grouped.test(t);
}

/** 公式の選択肢記号 → 内部キー。取り込みスクリプトと同じ対応。 */
const KANA_TO_KEY: Record<string, ChoiceKey> = { ア: "A", イ: "B", ウ: "C", エ: "D" };

/**
 * 解説の中で「正解の記号」を名指ししている箇所を拾う。
 *
 * 誤検出を避けるのが最優先。「正解はアクセス制御である」の "ア" を選択肢アと
 * 読み違えると、正しい解説を blocker で止めてしまう。そのため記号の直後が
 * 語の続きでないこと（(?![語を作る文字])）を必ず要求する。
 */
function findClaimedCorrectKeys(text: string): ChoiceKey[] {
  const normalized = normalizeBase(text);
  const found = new Set<ChoiceKey>();

  // 記号の直後に語が続いていたら、それは選択肢記号ではなく単語の一部。
  //   "正解はアクセス制御" … ア の後がカタカナ → 単語なので拾わない
  //   "正解はイです"       … イ の後がひらがな → 記号なので拾う
  // ひらがなを許すのが要点。日本語で記号を指すときは必ず助詞・助動詞が続くため、
  // ひらがなまで弾くと最も自然な言い回しを取りこぼす。
  const notWordChar = "(?![\\u30a0-\\u30ff\\u4e00-\\u9fff0-9a-z])";
  const patterns: RegExp[] = [
    // 「正解はア」「正答は B」「答えが エ」
    new RegExp(`(?:正解|正答|答え)\\s*(?:は|が)?\\s*[「"']?\\s*([アイウエa-d])${notWordChar}`, "g"),
    // 「選択肢ウが正しい」「イ が正解」
    new RegExp(
      `(?:選択肢)?\\s*[「"']?([アイウエa-d])${notWordChar}[」"']?\\s*(?:が|は)\\s*(?:正しい|正解|正答|適切)`,
      "g",
    ),
  ];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const raw = match[1];
      const key = KANA_TO_KEY[raw] ?? (raw.toUpperCase() as ChoiceKey);
      if (ALL_KEYS.includes(key)) found.add(key);
    }
  }

  return [...found].sort();
}

type SyllabusItem = (typeof ipaSyllabusItems)[number];

/** itemId -> シラバス項目。分類の突き合わせに使う。 */
const SYLLABUS_BY_ITEM_ID = new Map<string, SyllabusItem>(
  ipaSyllabusItems.map((item) => [item.id, item]),
);

/** topicId -> その topic を含むシラバス項目（複数ありうる）。 */
const SYLLABUS_BY_TOPIC_ID = (() => {
  const map = new Map<string, SyllabusItem[]>();
  for (const item of ipaSyllabusItems) {
    for (const topicId of item.topicIds) {
      const list = map.get(topicId);
      if (list) list.push(item);
      else map.set(topicId, [item]);
    }
  }
  return map;
})();

/**
 * 分類3軸（primaryTopicId / syllabusNode / questionPattern）の食い違い候補。
 *
 * すべて warning。3軸は「一致していないといけない」ものではなく、
 * ずれてよい場面が実在する（公式出題区分と内容分類のずれなど）。
 * ここで検出したいのは「取り違えた結果としてのずれ」であって、機械には区別できない。
 */
function checkClassification(q: QuestionRecord): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const add = (rule: string, message: string) =>
    findings.push({ questionId: q.id, severity: "warning" as const, rule, message });

  const node = q.syllabusNode;
  if (!node) return findings;

  if (node.itemId) {
    const item = SYLLABUS_BY_ITEM_ID.get(node.itemId);
    if (!item) {
      add("syllabus-item-unknown", `syllabusNode.itemId "${node.itemId}" が data/ipaSyllabus.ts に存在しません。`);
      return findings;
    }
    // topicIds は as const で literal 型になっているので、比較のために string へ広げる。
    if (!(item.topicIds as readonly string[]).includes(q.primaryTopicId)) {
      add(
        "syllabus-topic-mismatch",
        `syllabusNode.itemId "${node.itemId}" の topicIds に primaryTopicId "${q.primaryTopicId}" が含まれていません。どちらかの取り違えの可能性があります。`,
      );
    }
    if (node.field && node.field !== item.field) {
      add(
        "syllabus-field-mismatch",
        `syllabusNode.field "${node.field}" がシラバス項目 "${node.itemId}" の field "${item.field}" と一致しません。`,
      );
    }
    if (node.majorCategory && node.majorCategory !== item.majorCategory) {
      add(
        "syllabus-major-category-mismatch",
        `syllabusNode.majorCategory "${node.majorCategory}" がシラバス項目の "${item.majorCategory}" と一致しません。`,
      );
    }
    if (node.middleCategory && node.middleCategory !== item.middleCategory) {
      add(
        "syllabus-middle-category-mismatch",
        `syllabusNode.middleCategory "${node.middleCategory}" がシラバス項目の "${item.middleCategory}" と一致しません。`,
      );
    }
    return findings;
  }

  // itemId が無いときは topicId 側から引いて field だけ突き合わせる。
  const items = SYLLABUS_BY_TOPIC_ID.get(q.primaryTopicId);
  if (node.field && items && items.length > 0) {
    const fields = new Set(items.map((i) => i.field as string));
    if (!fields.has(node.field)) {
      add(
        "syllabus-field-mismatch",
        `syllabusNode.field "${node.field}" が primaryTopicId "${q.primaryTopicId}" のシラバス上の field（${[...fields].join(" / ")}）と一致しません。`,
      );
    }
  }

  return findings;
}

/**
 * 問題1件の品質検査。
 * 集合全体が必要な検査（類似度・レビュー記録）は含めない。
 */
export function checkQuestionQuality(q: QuestionRecord): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const add = (
    severity: QualityFinding["severity"],
    rule: string,
    message: string,
  ) => findings.push({ questionId: q.id, severity, rule, message });

  const choices = q.choices;
  const correct = choices.find((c) => c.key === q.correctChoice);
  const distractors = choices.filter((c) => c.key !== q.correctChoice);
  const normalizedPrompt = normalizeBase(q.prompt);

  // --- 正答の露呈 ---------------------------------------------------------
  for (const pattern of ANSWER_REVEAL_PATTERNS) {
    if (pattern.test(q.prompt)) {
      add("warning", "prompt-reveals-answer", `問題文が正答を示す表現を含みます（${pattern} に一致）。`);
    }
  }

  // 問題文が正答の本文をそのまま含んでいると、選択肢を読み比べる意味が無くなる。
  // 短い語（「表」「dns」など）は本文中に出て当然なので下限を設ける。
  if (correct) {
    const normalizedCorrect = normalizeChoiceText(correct.text);
    if (
      [...normalizedCorrect].length >= QUALITY_THRESHOLDS.answerLeakMinChars &&
      normalizeChoiceText(q.prompt).includes(normalizedCorrect)
    ) {
      // 誤答も同じように含まれているなら、単なる用語の再掲であって漏洩ではない。
      const leakedDistractors = distractors.filter((d) => {
        const nd = normalizeChoiceText(d.text);
        return (
          [...nd].length >= QUALITY_THRESHOLDS.answerLeakMinChars &&
          normalizeChoiceText(q.prompt).includes(nd)
        );
      });
      if (leakedDistractors.length === 0) {
        add(
          "warning",
          "answer-text-in-prompt",
          `問題文が正答（${correct.key}）の本文をそのまま含んでいます。誤答は含まれていないため、読まずに正解できる可能性があります。`,
        );
      }
    }
  }

  // --- 選択肢の重複・近似 -------------------------------------------------
  const normalizedChoices = choices.map((c) => ({ key: c.key, text: normalizeChoiceText(c.text) }));
  for (let i = 0; i < normalizedChoices.length; i += 1) {
    for (let j = i + 1; j < normalizedChoices.length; j += 1) {
      const a = normalizedChoices[i];
      const b = normalizedChoices[j];
      if (a.text === "" || b.text === "") continue;

      if (a.text === b.text) {
        // 同じ本文が2つある時点で、正答が一意に決まらない。断定できるので blocker。
        add(
          "blocker",
          "choice-text-duplicate",
          `選択肢 ${a.key} と ${b.key} の本文が（表記ゆれを除いて）完全に同一です。正答が一意に定まりません。`,
        );
        continue;
      }

      // 順序を問う出題は、選択肢が同じ要素の並べ替えになるのが正しい形なので対象外。
      // ここで拾いたいのは「言い換えただけで実質同じことを言っている選択肢」。
      if (q.questionPattern === "ordering") continue;

      const score = textSimilarity(a.text, b.text);
      if (score >= QUALITY_THRESHOLDS.choiceNearDuplicate) {
        add(
          "warning",
          "choice-near-duplicate",
          `選択肢 ${a.key} と ${b.key} の本文がほとんど同じです（類似度 ${score.toFixed(3)}）。言い換えただけで実質同じことを述べていないか確認してください。`,
        );
      }
    }
  }

  // --- 正答だけ浮いていないか ---------------------------------------------
  if (correct && distractors.length > 0) {
    const correctLen = [...correct.text].length;
    const distractorLens = distractors.map((d) => [...d.text].length);
    const maxDistractor = Math.max(...distractorLens);
    const minDistractor = Math.min(...distractorLens);

    // 倍率だけで判定すると、"意匠権"(3) と "パブリシティ権"(7) のような
    // 短い用語の並びが必ず引っかかる。実際に「長い方を選べば当たる」と言えるだけの
    // 絶対差も同時に要求する。
    if (
      correctLen >= QUALITY_THRESHOLDS.choiceLengthMinChars &&
      maxDistractor > 0 &&
      correctLen > maxDistractor * QUALITY_THRESHOLDS.correctChoiceLongRatio &&
      correctLen - maxDistractor >= QUALITY_THRESHOLDS.correctChoiceLongMinDiff
    ) {
      add(
        "warning",
        "correct-choice-longest",
        `正答（${correct.key}, ${correctLen}文字）が最長の誤答（${maxDistractor}文字）より極端に長く、長さだけで正解が推測できます。`,
      );
    }
    if (
      minDistractor >= QUALITY_THRESHOLDS.choiceLengthMinChars &&
      correctLen < minDistractor * QUALITY_THRESHOLDS.correctChoiceShortRatio
    ) {
      add(
        "warning",
        "correct-choice-shortest",
        `正答（${correct.key}, ${correctLen}文字）が最短の誤答（${minDistractor}文字）より極端に短く、長さだけで正解が推測できます。`,
      );
    }

    // 具体性の偏り: 正答だけが数値・単位を持つ（あるいは持たない）と、内容を読まずに選べる。
    const hasNumber = (t: string) => /[0-9]/.test(normalizeBase(t));
    if (hasNumber(correct.text) && distractors.every((d) => !hasNumber(d.text))) {
      add(
        "warning",
        "correct-choice-specificity",
        `正答（${correct.key}）だけが数値を含み、誤答はいずれも含みません。具体性の差で正解が推測できます。`,
      );
    }
  }

  // --- 断定語による不自然なヒント -----------------------------------------
  for (const word of ABSOLUTE_HINT_WORDS) {
    const hits = choices.filter((c) => normalizeBase(c.text).includes(normalizeBase(word)));
    if (hits.length === 1) {
      add(
        "warning",
        "absolute-word-hint",
        `「${word}」を含む選択肢が ${hits[0].key} だけです。断定語のある選択肢は誤答だと推測されやすく、内容を読まずに絞り込めます。`,
      );
    }
  }

  // --- 否定問題の明示 -----------------------------------------------------
  const negationMarker = NEGATION_MARKERS.find((m) => q.prompt.includes(m));
  if (negationMarker) {
    const isClear = CLEAR_NEGATION_PATTERNS.some((p) => p.test(q.prompt));
    if (!isClear) {
      add(
        "warning",
        "negative-question-unclear",
        `否定を問う出題（「${negationMarker}」）ですが、否定であることが明示されていません。「〜でないものはどれか」のように受けるか、強調してください。`,
      );
    }
  }

  // --- 数値問題の単位 -----------------------------------------------------
  if (q.questionPattern === "calculation") {
    const bare = choices.filter((c) => isBareNumber(c.text));
    if (bare.length === choices.length && choices.length > 0) {
      // 問題文が単位を明示していれば選択肢は裸の数値でよい。
      if (!PROMPT_UNIT_PATTERN.test(normalizedPrompt)) {
        add(
          "warning",
          "calculation-missing-unit",
          "計算問題ですが、選択肢がすべて単位のない数値で、問題文にも単位が見当たりません。何を答えるのかが曖昧です。",
        );
      }
    }
  } else if (choices.every((c) => isBareNumber(c.text)) && choices.length > 0) {
    add(
      "warning",
      "pattern-calculation-candidate",
      `選択肢がすべて数値ですが questionPattern が "${q.questionPattern}" です。"calculation" が適切ではないか確認してください。`,
    );
  }

  // --- 解説の整合性 -------------------------------------------------------
  if (q.explanation.trim() !== "") {
    const claimed = findClaimedCorrectKeys(q.explanation);
    const wrong = claimed.filter((k) => k !== q.correctChoice);
    if (wrong.length > 0) {
      // 解説が正答と違う記号を「正解」と書いている。どちらかが必ず間違いなので blocker。
      add(
        "blocker",
        "explanation-contradicts-answer",
        `解説が ${wrong.join(", ")} を正解として説明していますが、correctChoice は ${q.correctChoice} です。`,
      );
    }
  }

  // --- 選択肢別解説 -------------------------------------------------------
  const choiceExplanations = q.choiceExplanations ?? {};
  const choiceKeys = new Set(choices.map((c) => c.key));
  for (const key of Object.keys(choiceExplanations) as ChoiceKey[]) {
    const body = choiceExplanations[key];
    if (!choiceKeys.has(key)) {
      add(
        "blocker",
        "choice-explanation-unknown-key",
        `choiceExplanations に選択肢に存在しないキー "${key}" があります。`,
      );
      continue;
    }
    if (!body || body.trim() === "") {
      add("warning", "choice-explanation-empty", `choiceExplanations["${key}"] が空です。`);
      continue;
    }

    // 「Bは〜」と書いてあるのに choiceExplanations["A"] に入っている、という取り違え。
    const claimed = findClaimedCorrectKeys(body);
    if (key === q.correctChoice) {
      if (claimed.length > 0 && !claimed.includes(key)) {
        add(
          "blocker",
          "choice-explanation-mismatch",
          `choiceExplanations["${key}"]（正答）が ${claimed.join(", ")} を正解として説明しています。別の選択肢の解説が入っていませんか。`,
        );
      }
    } else if (claimed.includes(key)) {
      // 誤答の解説が自分を「正しい」と書いている。
      // 「Bは正しい記述だが問われている内容ではない」という正当な書き方もありうるので、
      // 断定はせず人に見てもらう。
      add(
        "warning",
        "choice-explanation-mismatch",
        `choiceExplanations["${key}"] は誤答の解説ですが、"${key}" を正解として説明しているように読めます。`,
      );
    }
  }

  findings.push(...checkClassification(q));

  return findings;
}
