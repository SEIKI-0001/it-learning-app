import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  canRecordStudyForUser,
  recordingLockedResponse,
} from "@/lib/billing/recordingGate";
import {
  isMissingColumnError,
  questionAttemptToRow,
  questionAttemptToRowV2,
  type QuestionAttemptInput,
  type QuestionType,
} from "@/lib/dbMappers";
import { getQuestionById } from "@/lib/questionBank";

export const runtime = "nodejs";

// 問題（確認問題 / 過去問レベル / ミニ模試 / 公式過去問）の回答ログを
// question_attempts に保存する。既存の user_answers は壊さない。
// - Supabase 未設定: 503 / userId なし: 401 / body 不正: 400
// - fire-and-forget で呼ばれる想定。保存失敗でも学習画面は止めない。
//
// 公式過去問（official_past）の付加情報（出所・版・年度・公式区分）は、
// クライアントの申告を信用せず、必ず問題IDから問題バンクを引いて求める。
// 回答履歴は後から成績や弱点分析の根拠になるため、改ざん可能な値を入れない。

const VALID_TYPES = new Set<QuestionType>([
  "topic_quiz",
  "exam_level",
  "mini_exam",
  "mock_exam",
  "official_past",
]);

const VALID_MODES = new Set(["practice", "exam"]);

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

/**
 * クライアントが送ってよいのは「どの問題に何を答えたか」と、
 * 問題IDからは分からない演習の文脈（モード・グループID）だけ。
 * 出所・版・年度・公式区分は問題バンクから引き直す。
 */
function toAttemptInput(a: AttemptInput): QuestionAttemptInput {
  const questionType = a.questionType as QuestionType;
  const record = getQuestionById(a.questionId!);

  const isOfficialPast = questionType === "official_past";
  const mode =
    typeof a.attemptMode === "string" && VALID_MODES.has(a.attemptMode)
      ? a.attemptMode
      : null;

  return {
    questionId: a.questionId!,
    questionType,
    // 復習導線に使う値なので、問題バンクに実体があればそちらを正とする。
    topicId: record?.primaryTopicId ?? a.topicId!,
    selectedAnswer: a.selectedAnswer ?? null,
    isCorrect: a.isCorrect!,
    mistakeReason: a.mistakeReason ?? null,
    timeSpentSeconds: typeof a.timeSpentSeconds === "number" ? a.timeSpentSeconds : null,
    sourceTaskId: a.sourceTaskId ?? null,
    answeredAt: a.answeredAt ?? null,
    // --- 以下はサーバ側で解決する（クライアント値は使わない） ---
    questionOrigin: record?.origin ?? null,
    questionVersion: record?.version ?? null,
    examYear: record?.official?.year ?? null,
    officialExamField: record?.official?.examField ?? null,
    // モードとグループIDは問題IDから導けないので受け取るが、値は検証する。
    attemptMode: isOfficialPast ? mode : null,
    attemptGroupId:
      isOfficialPast && typeof a.attemptGroupId === "string" && a.attemptGroupId.length > 0
        ? a.attemptGroupId.slice(0, 100)
        : null,
  };
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
    .filter(
      (a): a is AttemptInput =>
        typeof a?.questionId === "string" &&
        a.questionId.length > 0 &&
        typeof a?.topicId === "string" &&
        a.topicId.length > 0 &&
        typeof a?.isCorrect === "boolean" &&
        VALID_TYPES.has(a.questionType as QuestionType),
    )
    .map(toAttemptInput);

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
  const { error } = await supabase
    .from("question_attempts")
    .insert(inputs.map((a) => questionAttemptToRowV2(userId, a)));

  if (!error) {
    return NextResponse.json({ ok: true, saved: inputs.length });
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
