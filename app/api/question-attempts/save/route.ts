import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  canRecordStudyForUser,
  recordingLockedResponse,
} from "@/lib/billing/recordingGate";
import {
  type QuestionAttemptInput,
  type QuestionType,
} from "@/lib/dbMappers";
import {
  recordAssessmentQuestionAttemptsWithExposure,
  recordQuestionAttemptsWithExposure,
} from "@/lib/questionExposureServer";
import { getQuestionById } from "@/lib/questionBank";
import {
  sanitizeAnsweredAt,
  sanitizeTimeSpentSeconds,
} from "@/lib/questionAttemptSanitize";

export const runtime = "nodejs";

// 問題（確認問題 / 過去問レベル / ミニ模試 / 公式過去問）の回答ログを
// question_attempts に保存する。既存の user_answers は壊さない。
// - Supabase 未設定: 503 / userId なし: 401 / body 不正: 400
// - 完了イベントの呼び出し元は保存結果を await する。通常の履歴記録は結果を無視してよい。
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
  "theme_exam",
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
function toAttemptInput(
  a: AttemptInput,
  questionId: string,
  questionType: QuestionType,
  validatedGroupId: string | null,
) {
  return questionType === "official_past"
    ? toOfficialAttempt(a, questionId, validatedGroupId)
    : toLegacyAttempt(a, questionId, questionType, validatedGroupId);
}

/**
 * 公式過去問。クライアントが送ってよいのは「どの問題に何を答えたか」と演習の文脈だけで、
 * 正誤・トピック・出所・版・年度・公式区分はすべて問題バンクから決める。
 */
function toOfficialAttempt(
  a: AttemptInput,
  questionId: string,
  validatedGroupId: string | null,
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
    attemptGroupId: validatedGroupId,
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
  validatedGroupId: string | null,
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
    // モードは公式過去問だけが持つ。グループIDは認証済み評価セッションだけを保持する。
    attemptMode: null,
    attemptGroupId: validatedGroupId,
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
  const candidates = attempts
    .map((a): { attempt: AttemptInput; questionId: string; questionType: QuestionType } | null => {
      if (typeof a?.questionId !== "string" || a.questionId.length === 0) return null;
      const questionType = a.questionType as QuestionType;
      if (!VALID_TYPES.has(questionType)) return null;
      return { attempt: a, questionId: a.questionId, questionType };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);

  if (candidates.length === 0) {
    return NextResponse.json({ ok: false, error: "no valid attempts" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  try {
    const groupIds = candidates.map((candidate) => attemptGroupId(candidate.attempt));
    const grouped = groupIds.some((groupId) => groupId !== null);
    let assessmentSessionId: string | null = null;

    if (grouped) {
      assessmentSessionId = groupIds[0];
      const expectedSource = assessmentSourceForQuestionType(candidates[0].questionType);
      const expectedOfficialMode = candidates[0].questionType === "official_past"
        ? attemptMode(candidates[0].attempt)
        : null;
      const mismatched = candidates.length !== attempts.length
        || assessmentSessionId === null
        || expectedSource === null
        || (candidates[0].questionType === "official_past" && expectedOfficialMode === null)
        || candidates.some((candidate, index) =>
          groupIds[index] !== assessmentSessionId
          || assessmentSourceForQuestionType(candidate.questionType) !== expectedSource
          || (
            candidate.questionType === "official_past"
            && attemptMode(candidate.attempt) !== expectedOfficialMode
          )
        );
      if (mismatched) {
        return NextResponse.json(
          { ok: false, error: "invalid assessment batch" },
          { status: 400 },
        );
      }
    }

    const inputs = candidates.map((candidate) =>
      toAttemptInput(
        candidate.attempt,
        candidate.questionId,
        candidate.questionType,
        assessmentSessionId,
      )
    ).filter((input): input is QuestionAttemptInput => input !== null);
    if (inputs.length === 0) {
      return NextResponse.json({ ok: false, error: "no valid attempts" }, { status: 400 });
    }
    if (assessmentSessionId !== null && inputs.length !== candidates.length) {
      return NextResponse.json(
        { ok: false, error: "invalid assessment batch" },
        { status: 400 },
      );
    }
    const result = assessmentSessionId === null
      ? await recordQuestionAttemptsWithExposure(supabase, userId, inputs)
      : await recordAssessmentQuestionAttemptsWithExposure(
        supabase,
        userId,
        assessmentSessionId,
        inputs,
      );
    return NextResponse.json({ ok: true, userId, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }
}

function assessmentSourceForQuestionType(
  questionType: QuestionType,
): "checkpoint" | "summary" | "mock" | "official_past" | null {
  switch (questionType) {
    case "mini_exam": return "checkpoint";
    case "theme_exam": return "summary";
    case "mock_exam": return "mock";
    case "official_past": return "official_past";
    default: return null;
  }
}
