import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getQuestionById } from "@/data/questions";
import { getRepository } from "@/lib/storage";
import { WEB_USER_ID } from "@/lib/session";
import { updateReviewAfterAnswer } from "@/lib/review";
import type { AnswerHistory } from "@/types/user";

type AnswerPayload = {
  userId?: string;
  questionId: string;
  selectedChoiceId: AnswerHistory["selectedChoiceId"];
};

export async function POST(request: Request) {
  const payload = (await request.json()) as AnswerPayload;
  const question = getQuestionById(payload.questionId);

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const answer: AnswerHistory = {
    id: randomUUID(),
    userId: payload.userId || WEB_USER_ID,
    questionId: question.id,
    topicId: question.topicId,
    domain: question.domain,
    selectedChoiceId: payload.selectedChoiceId,
    isCorrect: payload.selectedChoiceId === question.correctChoiceId,
    answeredAt: new Date().toISOString()
  };

  const repository = getRepository();
  await repository.recordAnswer(answer);
  await updateReviewAfterAnswer(repository, answer, question);

  return NextResponse.json({
    ok: true,
    answer,
    correctChoiceId: question.correctChoiceId,
    explanation: question.explanation,
    trap: question.trap
  });
}
