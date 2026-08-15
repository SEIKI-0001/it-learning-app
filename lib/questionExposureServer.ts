import {
  questionAttemptToRowV2,
  type QuestionAttemptInput,
} from "@/lib/dbMappers";
import type { QuestionExposure, QuestionExposureState } from "@/types";

type RpcClient = {
  rpc: (
    functionName: string,
    params: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

type RpcExposureRow = {
  question_id: string;
  state: QuestionExposureState;
  attempted_before: boolean;
  first_attempt_at: string | null;
  attempt_count: number;
  saved: boolean;
};

export class QuestionExposurePersistenceError extends Error {
  constructor(message = "question exposure persistence failed") {
    super(message);
    this.name = "QuestionExposurePersistenceError";
  }
}

function isExposureState(value: unknown): value is QuestionExposureState {
  return value === "first" || value === "seen" || value === "unknown";
}

function parseRpcRow(value: unknown): RpcExposureRow {
  if (!value || typeof value !== "object") {
    throw new QuestionExposurePersistenceError("invalid exposure row");
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.question_id !== "string"
    || row.question_id.length === 0
    || !isExposureState(row.state)
    || typeof row.attempted_before !== "boolean"
    || (row.first_attempt_at !== null && typeof row.first_attempt_at !== "string")
    || typeof row.attempt_count !== "number"
    || !Number.isInteger(row.attempt_count)
    || row.attempt_count < 0
    || typeof row.saved !== "boolean"
  ) {
    throw new QuestionExposurePersistenceError("invalid exposure row");
  }
  return row as RpcExposureRow;
}

function toRpcAttempt(input: QuestionAttemptInput): Record<string, unknown> {
  const row: Record<string, unknown> = {
    ...questionAttemptToRowV2("unused", input),
  };
  delete row.user_id;
  return row;
}

/** Server-only adapter for the transaction-safe batch recorder. */
export async function recordQuestionAttemptsWithExposure(
  supabase: RpcClient,
  userId: string,
  inputs: QuestionAttemptInput[],
): Promise<{ saved: number; exposures: QuestionExposure[] }> {
  const { data, error } = await supabase.rpc(
    "record_question_attempts_with_exposure",
    {
      p_user_id: userId,
      p_attempts: inputs.map(toRpcAttempt),
    },
  );
  if (error || !Array.isArray(data)) {
    throw new QuestionExposurePersistenceError();
  }

  const rows = data.map(parseRpcRow);
  if (rows.length !== new Set(inputs.map((input) => input.questionId)).size) {
    throw new QuestionExposurePersistenceError("incomplete exposure response");
  }

  return {
    saved: rows.filter((row) => row.saved).length,
    exposures: rows.map((row) => ({
      questionId: row.question_id,
      state: row.state,
      attemptedBefore: row.attempted_before,
      firstAttemptAt: row.first_attempt_at,
      attemptCount: row.attempt_count,
    })),
  };
}
