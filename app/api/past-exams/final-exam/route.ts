import { NextResponse } from "next/server";
import type { Difficulty } from "@/types/content";
import { getQuestionForDelivery, questionRecordToCheckQuestion } from "@/lib/questionBank";
import { buildOfficialDrillIndex } from "@/lib/pastExam/officialIndex";
import {
  parseOfficialFinalExamRequest,
  selectOfficialFinalExamIds,
  type OfficialFinalExamQuestion,
} from "@/lib/pastExam/finalExamSelection";

// CP5（過去問実戦）の突破試験に出す公式過去問を選んで返す。
// 問題バンク本体をクライアントへ載せないため、選ぶ処理と本文の取り出しはサーバで行う。
// 公式過去問は公開ページ（/past-exams）でも読める情報なので、ログインは問わない。

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const parsed = parseOfficialFinalExamRequest(body);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const questions = selectOfficialFinalExamIds(buildOfficialDrillIndex(), parsed)
    .map((id) => getQuestionForDelivery(id, "official_past_exam"))
    .filter((record) => record !== undefined)
    .map((record): OfficialFinalExamQuestion => {
      const question = questionRecordToCheckQuestion(record);
      return {
        // 公式過去問の推定難易度は 4〜5 を含むが、突破試験（CheckQuestion）は 1〜3 で扱う。
        question: { ...question, difficulty: Math.min(3, question.difficulty) as Difficulty },
        topicId: record.primaryTopicId,
      };
    });

  return NextResponse.json({ ok: true, questions });
}
