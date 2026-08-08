import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  canRecordStudyForUser,
  recordingLockedResponse,
} from "@/lib/billing/recordingGate";
import {
  isMissingColumnError,
  isUniqueViolationError,
  questionAttemptToRow,
  questionAttemptToRowV2,
  type QuestionAttemptInput,
  type QuestionType,
} from "@/lib/dbMappers";
import { getQuestionById } from "@/lib/questionBank";
import {
  sanitizeAnsweredAt,
  sanitizeTimeSpentSeconds,
} from "@/lib/questionAttemptSanitize";

export const runtime = "nodejs";

// 問題（確認問題 / 過去問レベル / ミニ模試 / 公式過去問）の回答ログを
// question_attempts に保存する。既存の user_answers は壊さない。
// - Supabase 未設定: 503 / userId なし: 401 / body 不正: 400
// - fire-and-forget で呼ばれる想定。保存失敗でも学習画面は止めない。
//
// 公式過去問（official_past）は、付加情報（出所・版・年度・公式区分）だけでなく
// 正誤（isCorrect）とトピックもクライアントの申告を信用せず、問題IDから問題バンクを
// 引いて求める。回答履歴は後から成績や弱点分析の根拠になるため、改ざん可能な値を
// 入れない。問題バンクに無いID・公式でない問題・A〜D以外の回答は保存しない。

const VALID_TYPES = new Set<QuestionType>([
  "topic_quiz",
  "exam_level",
  "mini_exam",
  "mock_exam",
  "official_past",
]);

const VALID_MODES = new Set(["practice", "exam"]);

/** 公式過去問で受け付ける選択肢。これ以外（未回答は null）は保存しない。 */
const VALID_CHOICES = new Set(["A", "B", "C", "D"]);

type AttemptInput = {
  questionId?: string;
  questionType?: string;
  topicId?: string;
  selectedAnswer?: string | null;
  isCorrect?: boolean;
  mistakeReason?: string | null;
  timeSpentSeconds?: number | null;
  sourceTaskId?: string | null;
  answeredAt?: string | null;
  /** 公式過去問の年度別演習でだけ送られる。ここ以外はサーバ側で解決する。 */
  attemptMode?: string | null;
  attemptGroupId?: string | null;
};

/** 演習の文脈（モード・グループID）は問題IDから導けないので受け取るが、値は検証する。 */
function attemptMode(a: AttemptInput): string | null {
  return typeof a.attemptMode === "string" && VALID_MODES.has(a.attemptMode)
    ? a.attemptMode
    : null;
}

function attemptGroupId(a: AttemptInput): string | null {
  return typeof a.attemptGroupId === "string" && a.attemptGroupId.length > 0
    ? a.attemptGroupId.slice(0, 100)
    : null;
}

/**
 * 保存する1件へ正規化する。受け付けられない attempt は null（＝捨てる）。
 * questionId と questionType はここへ来る前に検証済み。
 */
function toAttemptInput(a: AttemptInput, questionId: string, questionType: QuestionType) {
  return questionType === "official_past"
    ? toOfficialAttempt(a, questionId)
    : toLegacyAttempt(a, questionId, questionType);
}

/**
 * 公式過去問。クライアントが送ってよいのは「どの問題に何を答えたか」と演習の文脈だけで、
 * 正誤・トピック・出所・版・年度・公式区分はすべて問題バンクから決める。
 */
function toOfficialAttempt(
  a: AttemptInput,
  questionId: string,
): QuestionAttemptInput | null {
  const record = getQuestionById(questionId);
  // 問題バンクに無いIDは、正誤を判定する根拠が無いので保存しない。
  if (!record) return null;
  // 公式過去問でない問題を official_past として送られても受け付けない
  // （年度・公式区分の集計に、公式でない問題が混ざる）。
  if (record.origin !== "official_past") return null;

  const selectedAnswer = a.selectedAnswer ?? null;
  if (selectedAnswer !== null && !VALID_CHOICES.has(selectedAnswer)) return null;

  return {
    questionId,
    questionType: "official_past",
    topicId: record.primaryTopicId,
    selectedAnswer,
    // 正誤はサーバ側で判定する。クライアントの isCorrect は読まない。
    // 未回答（null）は不正解として残す。
    isCorrect: selectedAnswer !== null && selectedAnswer === record.correctChoice,
    mistakeReason: a.mistakeReason ?? null,
    // 実測難易度の入力になる値。壊れた値・あり得ない値は保存しない。
    timeSpentSeconds: sanitizeTimeSpentSeconds(a.timeSpentSeconds),
    sourceTaskId: a.sourceTaskId ?? null,
    answeredAt: sanitizeAnsweredAt(a.answeredAt),
    questionOrigin: record.origin,
    questionVersion: record.version,
    examYear: record.official?.year ?? null,
    officialExamField: record.official?.examField ?? null,
    attemptMode: attemptMode(a),
    attemptGroupId: attemptGroupId(a),
  };
}

/**
 * 確認問題 / 過去問レベル / ミニ模試 / 模試。従来どおりクライアントの正誤を使う
 * （これらは問題バンクに正答を持たない出題経路を含むため、挙動を変えない）。
 */
function toLegacyAttempt(
  a: AttemptInput,
  questionId: string,
  questionType: QuestionType,
): QuestionAttemptInput | null {
  if (typeof a.topicId !== "string" || a.topicId.length === 0) return null;
  if (typeof a.isCorrect !== "boolean") return null;

  const record = getQuestionById(questionId);

  return {
    questionId,
    questionType,
    // 復習導線に使う値なので、問題バンクに実体があればそちらを正とする。
    topicId: record?.primaryTopicId ?? a.topicId,
    selectedAnswer: a.selectedAnswer ?? null,
    isCorrect: a.isCorrect,
    mistakeReason: a.mistakeReason ?? null,
    // 公式過去問と同じ正規化をかける。所要時間・回答日時はどの出題経路でも
    // クライアント由来なので、扱いを分ける理由がない。
    timeSpentSeconds: sanitizeTimeSpentSeconds(a.timeSpentSeconds),
    answeredAt: sanitizeAnsweredAt(a.answeredAt),
    sourceTaskId: a.sourceTaskId ?? null,
    // --- 以下はサーバ側で解決する（クライアント値は使わない） ---
    questionOrigin: record?.origin ?? null,
    questionVersion: record?.version ?? null,
    examYear: record?.official?.year ?? null,
    officialExamField: record?.official?.examField ?? null,
    // モード・グループIDは公式過去問の年度別演習だけが持つ文脈。
    attemptMode: null,
    attemptGroupId: null,
  };
}

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSupabase>>;

/**
 * 1件ずつ insert し、一意制約違反だけ無視して保存できた件数を返す。
 * それ以外のエラーは無視しない（保存できていない行を成功と数えないため）。
 */
async function insertIgnoringDuplicates(
  supabase: ServiceSupabase,
  rows: Record<string, unknown>[],
): Promise<number> {
  let saved = 0;
  for (const row of rows) {
    const { error } = await supabase.from("question_attempts").insert([row]);
    if (!error) saved += 1;
    else if (!isUniqueViolationError(error)) break;
  }
  return saved;
}

export async function POST(request: Request) {
  let body: { userId?: string; attempts?: AttemptInput[] } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  if (!(await canRecordStudyForUser(userId))) {
    return recordingLockedResponse();
  }

  const attempts = Array.isArray(body.attempts) ? body.attempts : [];
  const inputs = attempts
    .map((a): QuestionAttemptInput | null => {
      if (typeof a?.questionId !== "string" || a.questionId.length === 0) return null;
      const questionType = a.questionType as QuestionType;
      if (!VALID_TYPES.has(questionType)) return null;
      return toAttemptInput(a, a.questionId, questionType);
    })
    .filter((a): a is QuestionAttemptInput => a !== null);

  if (inputs.length === 0) {
    return NextResponse.json({ ok: false, error: "no valid attempts" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  // まず新列を含めて保存する。
  const rows = inputs.map((a) => questionAttemptToRowV2(userId, a));
  const { error } = await supabase.from("question_attempts").insert(rows);

  if (!error) {
    return NextResponse.json({ ok: true, saved: inputs.length });
  }

  // 既に保存済みの回答をもう一度送った場合（採点の再送・API再送）。
  // 一意制約が弾いた＝目的の行は既にあるので、成功として返す。
  //
  // まとめて insert すると1件でも重複があれば全件入らないため、
  // 「一部だけ重複」を取りこぼさないよう1件ずつ入れ直す。
  // ここへ来るのは再送のときだけなので、通常の保存経路は従来どおり1回の insert で済む。
  if (isUniqueViolationError(error)) {
    const saved = await insertIgnoringDuplicates(supabase, rows);
    return NextResponse.json({ ok: true, saved, duplicatesIgnored: rows.length - saved });
  }

  // 20260726 のマイグレーションが本番へ未適用だと、新列が無くて insert が落ちる。
  // その場合だけ旧形式で入れ直し、既存の学習記録が止まらないようにする。
  // （付加情報は落ちるが、回答そのものを残す方を優先する）
  if (!isMissingColumnError(error)) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  const { error: legacyError } = await supabase
    .from("question_attempts")
    .insert(inputs.map((a) => questionAttemptToRow(userId, a)));

  if (legacyError) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    saved: inputs.length,
    degraded: "legacy_columns",
  });
}
