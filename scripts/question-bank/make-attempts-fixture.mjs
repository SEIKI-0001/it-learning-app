// 実測難易度の集計を Supabase なしで確かめるための回答履歴 fixture を生成する。
//
// 使い方:
//   node scripts/question-bank/make-attempts-fixture.mjs
//
// 生成するのは架空の回答履歴で、実在ユーザーのデータは一切含まない
// （user_id は "fixture-user-0001" のような連番）。
//
// 決定的に作る（乱数のシードを固定した簡易LCGを使う）。同じコマンドで同じファイルになる。
// これは集計側の「同じ入力なら同じ結果」を検証する前提そのものなので、
// Math.random() は使わない。

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "test/fixtures/questionAttempts.sample.json");

/** 線形合同法。シード固定なので毎回同じ列になる。 */
function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const BASE_TIME = Date.parse("2026-07-01T00:00:00.000Z");

/**
 * fixture の設計。「集計が正しいか」を見分けられる形にしてある。
 *   - reliable / provisional / insufficient の3段階が1つずつ以上出る
 *   - 反復回答を混ぜ、初回だけの正答率と全回答の正答率がはっきり食い違うようにする
 *   - 誰も選ばない誤答、正答より多く選ばれる誤答、未回答を含める
 */
const PLAN = [
  {
    questionId: "ipa-it-passport-2026-q001",
    version: 2,
    users: 120, // reliable
    correctChoice: "A",
    firstCorrectRatio: 0.62,
    // 復習で2回目以降を解くユーザー。全回答の正答率だけが上がる。
    repeatUsers: 60,
    repeatCorrect: true,
    wrongDistribution: { B: 0.6, C: 0.35, D: 0.05 },
    unansweredRatio: 0,
    timeRange: [20, 90],
  },
  {
    questionId: "ipa-it-passport-2026-q002",
    version: 2,
    users: 45, // provisional
    correctChoice: "A",
    firstCorrectRatio: 0.18, // too_hard
    repeatUsers: 0,
    repeatCorrect: false,
    wrongDistribution: { B: 0.75, C: 0.24, D: 0.01 }, // dominant_wrong_choice + non_functioning_distractor
    unansweredRatio: 0.2, // high_unanswered_rate
    timeRange: [150, 260], // unusually_slow
  },
  {
    questionId: "tech-security-cia-ex1",
    version: 1,
    users: 12, // insufficient
    correctChoice: "A",
    firstCorrectRatio: 0.99,
    repeatUsers: 4,
    repeatCorrect: true,
    wrongDistribution: { B: 1, C: 0, D: 0 },
    unansweredRatio: 0,
    timeRange: [3, 6],
  },
];

function pickWrong(distribution, r) {
  let cumulative = 0;
  for (const [key, weight] of Object.entries(distribution)) {
    cumulative += weight;
    if (r <= cumulative) return key;
  }
  return Object.keys(distribution)[0];
}

function main() {
  const random = makeRandom(20260801);
  const attempts = [];
  let sequence = 0;

  const nextAttempt = (fields) => {
    sequence += 1;
    return {
      attempt_id: `fixture-attempt-${String(sequence).padStart(5, "0")}`,
      ...fields,
    };
  };

  for (const plan of PLAN) {
    for (let i = 0; i < plan.users; i += 1) {
      const userId = `fixture-user-${plan.questionId}-${String(i).padStart(4, "0")}`;
      const unanswered = random() < plan.unansweredRatio;
      const correct = !unanswered && random() < plan.firstCorrectRatio;
      const selected = unanswered
        ? null
        : correct
          ? plan.correctChoice
          : pickWrong(plan.wrongDistribution, random());

      const [minTime, maxTime] = plan.timeRange;
      const seconds = Math.round(minTime + random() * (maxTime - minTime));

      attempts.push(
        nextAttempt({
          user_id: userId,
          question_id: plan.questionId,
          question_version: plan.version,
          selected_answer: selected,
          is_correct: correct,
          time_spent_seconds: seconds,
          answered_at: new Date(BASE_TIME + sequence * 60_000).toISOString(),
        }),
      );

      // 2回目以降（復習）。初回より必ず後の時刻にする。
      if (i < plan.repeatUsers) {
        attempts.push(
          nextAttempt({
            user_id: userId,
            question_id: plan.questionId,
            question_version: plan.version,
            selected_answer: plan.repeatCorrect ? plan.correctChoice : selected,
            is_correct: plan.repeatCorrect,
            time_spent_seconds: Math.max(1, Math.round(seconds / 2)),
            answered_at: new Date(BASE_TIME + 30 * 24 * 3600_000 + sequence * 60_000).toISOString(),
          }),
        );
      }
    }
  }

  writeFileSync(OUT, `${JSON.stringify({ attempts }, null, 2)}\n`, "utf8");
  console.log(`生成しました: ${attempts.length} 件`);
  console.log(`  出力: ${path.relative(ROOT, OUT)}`);
}

main();
