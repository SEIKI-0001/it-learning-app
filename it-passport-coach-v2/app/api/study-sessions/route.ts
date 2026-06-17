import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getRepository } from "@/lib/storage";
import { WEB_USER_ID } from "@/lib/session";

type StudySessionPayload = {
  userId?: string;
  topicId: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as StudySessionPayload;
  if (!payload.topicId) {
    return NextResponse.json({ error: "topicId is required" }, { status: 400 });
  }

  const session = await getRepository().recordStudySession({
    id: randomUUID(),
    userId: payload.userId || WEB_USER_ID,
    topicId: payload.topicId,
    startedAt: new Date().toISOString()
  });

  return NextResponse.json({ ok: true, session });
}
