// 設計図（QuestionBlueprint）ベースの作問フロー。
//
// 使い方:
//   npm run questions:blueprint -- references --topic=<topicId> [--pattern=…] [--difficulty=2] [--limit=3]
//   npm run questions:blueprint -- template   --id=<blueprintId> --topic=<topicId> [--pattern=…] [--difficulty=2] [--prompt-version=ip-v1]
//   npm run questions:blueprint -- validate   [--blueprint=<id>]
//   npm run questions:blueprint -- to-candidate --blueprint=<id>
//
// AI は呼ばない。
//   このスクリプトは外部AIのSDK・APIキー・ネットワークを一切使わない。
//   作問そのもの（本文を書く工程）は、出力したテンプレートとプロンプトを使って
//   手元で行う。ここが担うのは、その前後の「参照の抽出」「設計図の検証」
//   「取り込み形式への変換」だけなので、APIキーの無い環境でも全部動く。
//
// 入出力:
//   設計図       data/question-bank/blueprints/<id>.json
//   プロンプト   data/question-bank/prompts/<promptVersion>.md
//   候補         data/question-bank/candidates/ai-generated/<id>.json

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registerTsAlias } from "../lib/ts-alias.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
registerTsAlias(ROOT);

const { getAllQuestions } = await import("../../lib/questionBank/loader.ts");
const { formatIssues } = await import("../../lib/questionBank/validate.ts");
const {
  blueprintToCandidateFields,
  buildBlueprintTemplate,
  selectReferenceQuestions,
  validateBlueprint,
  validateBlueprintAgainstCandidate,
  validateBlueprintReferences,
} = await import("../../lib/questionBank/blueprint.ts");

const BLUEPRINT_DIR = path.join(ROOT, "data/question-bank/blueprints");
const PROMPT_DIR = path.join(ROOT, "data/question-bank/prompts");
const CANDIDATE_DIR = path.join(ROOT, "data/question-bank/candidates/ai-generated");

const DEFAULT_PROMPT_VERSION = "ip-v1";

// ---------------------------------------------------------------------------
// 引数
// ---------------------------------------------------------------------------

function arg(name, fallback = undefined) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function die(message) {
  console.error(message);
  process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// 読み書き
// ---------------------------------------------------------------------------

function listBlueprintIds() {
  if (!existsSync(BLUEPRINT_DIR)) return [];
  return readdirSync(BLUEPRINT_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => name.replace(/\.json$/, ""));
}

function readBlueprint(id) {
  const file = path.join(BLUEPRINT_DIR, `${id}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function readCandidate(id) {
  const file = path.join(CANDIDATE_DIR, `${id}.json`);
  if (!existsSync(file)) return null;
  const body = JSON.parse(readFileSync(file, "utf8"));
  return (body.questions ?? []).find((q) => q.id === id) ?? null;
}

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** プロンプトテンプレートが Git 上に存在するか。 */
function promptExists(promptVersion) {
  return existsSync(path.join(PROMPT_DIR, `${promptVersion}.md`));
}

// ---------------------------------------------------------------------------
// references: 参照用の公式問題を抽出する
// ---------------------------------------------------------------------------

function commandReferences() {
  const topic = arg("topic");
  if (!topic) return die("--topic=<topicId> が必要です。");

  const references = selectReferenceQuestions(getAllQuestions(), {
    primaryTopicId: topic,
    syllabusNode: arg("syllabus"),
    questionPattern: arg("pattern"),
    targetDifficulty: arg("difficulty") ? Number(arg("difficulty")) : undefined,
    limit: arg("limit") ? Number(arg("limit")) : undefined,
  });

  if (references.length === 0) {
    return die(
      "条件に合う公式問題が2問未満でした。1問だけを見て作ると引き写しになりやすいので、条件を広げてください。",
    );
  }

  console.log(`参照用の公式問題 ${references.length} 件:\n`);
  for (const q of references) {
    const official = q.official;
    console.log(`- ${q.id}`);
    console.log(`  ${official ? `${official.year}年度 問${official.questionNumber}` : ""} / ${q.questionPattern} / 難易度${q.estimatedDifficulty}`);
    console.log(`  ${q.prompt.slice(0, 60).replace(/\n/g, " ")}…`);
  }
  console.log(`\n設計図に貼る形式:\n  "referenceQuestionIds": ${JSON.stringify(references.map((q) => q.id))}`);
}

// ---------------------------------------------------------------------------
// template: 設計図のひな形を出力する
// ---------------------------------------------------------------------------

function commandTemplate() {
  const id = arg("id");
  const topic = arg("topic");
  if (!id) return die("--id=<blueprintId> が必要です。");
  if (!topic) return die("--topic=<topicId> が必要です。");

  const promptVersion = arg("prompt-version", DEFAULT_PROMPT_VERSION);
  if (!promptExists(promptVersion)) {
    return die(
      `プロンプトテンプレートがありません: data/question-bank/prompts/${promptVersion}.md\n` +
        "作問方針を変えたら、新しい promptVersion のテンプレートを先に作ってください。",
    );
  }

  const pattern = arg("pattern", "application");
  const difficulty = Number(arg("difficulty", "2"));

  const references = selectReferenceQuestions(getAllQuestions(), {
    primaryTopicId: topic,
    syllabusNode: arg("syllabus"),
    questionPattern: pattern,
    targetDifficulty: difficulty,
    limit: arg("limit") ? Number(arg("limit")) : undefined,
  });

  if (references.length === 0) {
    return die("条件に合う公式問題が2問未満でした。--limit や条件を見直してください。");
  }

  const blueprint = buildBlueprintTemplate({
    id,
    primaryTopicId: topic,
    questionPattern: pattern,
    targetDifficulty: difficulty,
    promptVersion,
    syllabusNode: arg("syllabus"),
    references,
  });

  const file = path.join(BLUEPRINT_DIR, `${id}.json`);
  if (existsSync(file) && !process.argv.includes("--force")) {
    return die(`既に存在します: ${path.relative(ROOT, file)}（上書きするなら --force）`);
  }

  writeJson(file, blueprint);
  console.log(`設計図のひな形を書き出しました: ${path.relative(ROOT, file)}`);
  console.log(
    "\n空欄（learningObjective / requiredReasoningSteps / distractorStrategies / prohibitedCopyElements）を埋めてから、",
  );
  console.log(`data/question-bank/prompts/${promptVersion}.md の手順で作問してください。`);
  console.log("埋め終わったら: npm run questions:blueprint -- validate");
}

// ---------------------------------------------------------------------------
// validate: 設計図・参照・完成候補の整合を検証する
// ---------------------------------------------------------------------------

function commandValidate() {
  const only = arg("blueprint");
  const ids = only ? [only] : listBlueprintIds();

  if (ids.length === 0) {
    console.log("設計図がありません（data/question-bank/blueprints/*.json）。");
    return;
  }

  const questions = getAllQuestions();
  const issues = [];

  for (const id of ids) {
    const blueprint = readBlueprint(id);
    if (!blueprint) {
      issues.push({
        questionId: id,
        rule: "blueprint-missing",
        message: `設計図が見つかりません: data/question-bank/blueprints/${id}.json`,
      });
      continue;
    }

    issues.push(...validateBlueprint(blueprint));
    issues.push(...validateBlueprintReferences(blueprint, questions));

    // プロンプトの版とテンプレートの対応。
    if (blueprint.promptVersion && !promptExists(blueprint.promptVersion)) {
      issues.push({
        questionId: id,
        rule: "blueprint-prompt-template-missing",
        message: `promptVersion "${blueprint.promptVersion}" に対応するテンプレートがありません: data/question-bank/prompts/${blueprint.promptVersion}.md`,
      });
    }

    // 完成した候補があれば、設計図どおりかを見る（無い段階では検証しない）。
    const candidate = readCandidate(id);
    if (candidate) {
      issues.push(...validateBlueprintAgainstCandidate(blueprint, candidate));
    }
  }

  console.log(`検証した設計図: ${ids.length} 件`);

  if (issues.length === 0) {
    console.log("設計図に問題はありません。");
    return;
  }

  console.error(`\n${issues.length} 件の違反があります:\n`);
  console.error(formatIssues(issues));
  process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// to-candidate: 候補JSONのひな形へ変換する
// ---------------------------------------------------------------------------

function commandToCandidate() {
  const id = arg("blueprint");
  if (!id) return die("--blueprint=<id> が必要です。");

  const blueprint = readBlueprint(id);
  if (!blueprint) return die(`設計図が見つかりません: ${id}`);

  const blueprintIssues = [
    ...validateBlueprint(blueprint),
    ...validateBlueprintReferences(blueprint, getAllQuestions()),
  ];
  if (blueprintIssues.length > 0) {
    console.error("設計図に違反があるため変換しません:\n");
    console.error(formatIssues(blueprintIssues));
    process.exitCode = 1;
    return;
  }

  const fields = blueprintToCandidateFields(blueprint);
  const file = path.join(CANDIDATE_DIR, `${id}.json`);

  if (existsSync(file)) {
    return die(
      `既に候補があります: ${path.relative(ROOT, file)}\n本文を直すときはこのファイルを編集してください。`,
    );
  }

  // 本文は設計図には無いので空欄で出す。ここを埋めるのが作問の工程。
  writeJson(file, {
    schemaVersion: 1,
    generation: {
      provider: "",
      model: "",
      promptVersion: blueprint.promptVersion,
      generatedAt: "",
    },
    questions: [
      {
        ...fields,
        prompt: "",
        choices: [
          { key: "A", text: "" },
          { key: "B", text: "" },
          { key: "C", text: "" },
          { key: "D", text: "" },
        ],
        correctChoice: "A",
        explanation: "",
        tags: [],
      },
    ],
  });

  console.log(`候補JSONのひな形を書き出しました: ${path.relative(ROOT, file)}`);
  console.log("\n本文・選択肢・解説と generation（provider / model / generatedAt）を埋めてから:");
  console.log("  npm run questions:blueprint -- validate");
  console.log("  npm run questions:import:candidates");
  console.log("  npm run questions:quality-report   # 類似度検査とレビューゲート");
}

// ---------------------------------------------------------------------------

const COMMANDS = {
  references: commandReferences,
  template: commandTemplate,
  validate: commandValidate,
  "to-candidate": commandToCandidate,
};

const command = process.argv[2];
const run = COMMANDS[command];

if (!run) {
  console.error(`使い方: npm run questions:blueprint -- <${Object.keys(COMMANDS).join(" | ")}> [オプション]`);
  process.exitCode = 1;
} else {
  run();
}
