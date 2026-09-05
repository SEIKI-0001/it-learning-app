// 評価（試験）の実行モード。認証の有無をここ1か所で明示的に扱う。
//
// 方針:
//   - 認証はサーバー永続化・端末間同期・verified evidence を可能にするためのもので、
//     学習や試験の完遂条件ではない。未ログインでも試験は開始・回答・採点・
//     結果表示・ローカル進行まで完遂できる。
//   - ただし匿名の結果を、ログイン済み・サーバー保存済みの verified evidence と
//     同一には扱わない。匿名では以下を満たさないことを型と受け渡し値で明示する:
//       * サーバーの assessment session（開始/完了の受領証）を持たない
//       * 原子的な初見判定（is_first_attempt）を持たない。exposure はローカル
//         回答履歴からの推定にとどまる
//       * サーバー保存済みとして表示しない
//   - 各画面で `if (401)` を書き散らさない。モードの解決も、モード別の
//     確定処理も、この層に閉じる。

import type { QuestionExposureMap } from "@/types";
import type { UserAnswer } from "@/types";
import {
  AssessmentSessionClientError,
  startAssessmentSessionForCurrentSession,
  type AuthenticatedQuestionExposureResult,
  type CompleteAssessmentSessionInput,
  type QuestionAttemptInput,
  type StartAssessmentSessionInput,
} from "@/lib/userSession";
import { getAnonymousQuestionExposureStates } from "@/lib/questionExposure";

/**
 * 評価の実行モード。
 * - `authenticated`: 既存の strict assessment session をそのまま使う。
 * - `anonymous`: サーバー永続化なしのローカル評価として完遂する。
 */
export type AssessmentMode = "authenticated" | "anonymous";

/**
 * 匿名の exposure。原子的なサーバー判定ではなくローカル履歴からの推定なので、
 * `authState` で authenticated と取り違えられないようにする。
 */
export type AnonymousQuestionExposureResult = {
  authState: "anonymous";
  userId: null;
  exposures: QuestionExposureMap;
};

export type AssessmentExposureResult =
  | AuthenticatedQuestionExposureResult
  | AnonymousQuestionExposureResult;

/** サーバーの原子的判定に基づく exposure か（＝verified 扱いにしてよいか）。 */
export function isAuthenticatedAssessmentExposure(
  value: AssessmentExposureResult,
): value is AuthenticatedQuestionExposureResult {
  return value.authState === "authenticated";
}

/**
 * 匿名時の exposure をローカルの回答履歴から組み立てる。
 * サーバーの is_first_attempt と違い「この端末で見たことがあるか」しか分からない。
 */
export function anonymousAssessmentExposures(
  attempts: QuestionAttemptInput[],
  answers: Pick<UserAnswer, "questionId" | "answeredAt">[],
): AnonymousQuestionExposureResult {
  return {
    authState: "anonymous",
    userId: null,
    exposures: getAnonymousQuestionExposureStates(
      answers,
      attempts.map((attempt) => attempt.questionId),
    ),
  };
}

/**
 * 試験を開始し、実行モードを返す。
 *
 * 未ログイン（401）は失敗ではない。サーバーセッションを持たない匿名モードとして
 * 続行する。それ以外の失敗（ネットワーク・5xx・不正応答）は従来どおり throw し、
 * 呼び出し側が「開始できませんでした」を出せるようにする。
 */
export async function beginAssessmentSession(
  input: StartAssessmentSessionInput,
  start: (
    value: StartAssessmentSessionInput,
  ) => Promise<unknown> = startAssessmentSessionForCurrentSession,
): Promise<AssessmentMode> {
  try {
    await start(input);
    return "authenticated";
  } catch (error) {
    if (isAssessmentAuthenticationError(error)) return "anonymous";
    throw error;
  }
}

/** 未ログインが理由の失敗か（＝匿名で続行してよいか）。 */
export function isAssessmentAuthenticationError(error: unknown): boolean {
  return (
    error instanceof AssessmentSessionClientError && error.code === "authentication"
  );
}

/**
 * 匿名モードでの確定処理。
 *
 * サーバーへ届く受領証が存在しないため、strict 版のような再開（pending
 * finalization）は持たない。ここで行うのは「決定的な結果の再導出」と
 * 「ローカル AppState の更新値の導出」だけで、どちらも純粋な計算。
 * 完了受領・進捗保存の acknowledge は付けない（サーバー保存済みと偽らない）。
 */
export function finalizeAnonymousAssessment<TBase, TNext, TResult>(
  frame: {
    sessionId: string;
    baseState: TBase;
    attempts: QuestionAttemptInput[];
    completion: CompleteAssessmentSessionInput;
    result: TResult;
    /** exposure 推定に使うローカル回答履歴（この試験の解答を含める前のもの）。 */
    answers: Pick<UserAnswer, "questionId" | "answeredAt">[];
  },
  stages: {
    rederiveResult?: (params: {
      baseState: TBase;
      attempts: QuestionAttemptInput[];
      completion: CompleteAssessmentSessionInput;
      result: TResult;
      sessionId: string;
    }) => TResult;
    deriveNextState: (params: {
      baseState: TBase;
      result: TResult;
      exposureResult: AssessmentExposureResult;
      completion: CompleteAssessmentSessionInput;
    }) => TNext;
  },
): {
  mode: "anonymous";
  result: TResult;
  nextState: TNext;
  exposureResult: AnonymousQuestionExposureResult;
} {
  // ローカル結果を権威にしない点は strict 版と同じ。再導出できるなら再導出する。
  const result = stages.rederiveResult?.({
    baseState: frame.baseState,
    attempts: frame.attempts,
    completion: frame.completion,
    result: frame.result,
    sessionId: frame.sessionId,
  }) ?? frame.result;

  const exposureResult = anonymousAssessmentExposures(frame.attempts, frame.answers);
  const nextState = stages.deriveNextState({
    baseState: frame.baseState,
    result,
    exposureResult,
    completion: frame.completion,
  });

  return { mode: "anonymous", result, nextState, exposureResult };
}
