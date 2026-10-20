import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/apiUser";
import { getAllTopics, getTopic } from "@/lib/content";
import { Explain3dError, generateExplainPlan } from "@/lib/ai/explain3d";
import { getLessonHref } from "@/lib/learningCatalog";
import { EXISTING_MODELS, matchExistingModel } from "@/lib/explain3d/catalog";
import { buildExplainSystemPrompt, buildExplainUserPrompt } from "@/lib/explain3d/prompt";
import { parseExplainOutput } from "@/lib/explain3d/sceneSpec";
import { EXPLAIN3D_LIMITS, type ExplainRequest, type ExplainResult } from "@/lib/explain3d/types";
import { countExplain3dSince, getExplain3dDailyLimit, logExplain3dEvent } from "@/lib/explain3d/usage";
import { resolveMochitClientDay } from "@/lib/mochitAi/clientDay";

export const runtime = "nodejs";

function fail(status: number, reason: string, error: string) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

const EXISTING_IDS = new Set(EXISTING_MODELS.map((m) => m.topicId));
const topicTitle = (id: string) => getTopic(id)?.title ?? id;

function existingResult(topicId: string, reason: string): ExplainResult {
  return { kind: "existing", topicId, topicTitle: topicTitle(topicId), lessonHref: getLessonHref(topicId), reason };
}

/**
 * POST /api/explain
 * 「〜の仕組みを解説して」に、3D模型での見せ方を返す。
 *   - 作り込んだ模型があるテーマ → { kind: "existing", topicId }（画面がその解説を開く）
 *   - 無ければ → { kind: "generated", scene }（決まった部品と動きだけの場面。画面が組み立てる）
 * AI が失敗したときは、質問のキーワードで既存の模型を探して返す。それも無ければ 502。
 *
 * 401 未ログイン / 400 入力不正・学習と無関係 / 429 1日の上限 / 502 AI 失敗 / 200 { ok, result, model }
 */
export async function POST(request: Request) {
  let body: ExplainRequest;
  try {
    body = (await request.json()) as ExplainRequest;
  } catch {
    return fail(400, "invalid", "リクエストの形式が正しくありません。");
  }

  const userId = await getRequestUserId({ userId: body.userId ?? undefined });
  if (!userId) return fail(401, "login_required", "ログインすると、3D模型での解説を使えます。");

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (question.length < 2 || question.length > EXPLAIN3D_LIMITS.questionMaxLength) {
    return fail(400, "invalid", `知りたい仕組みを${EXPLAIN3D_LIMITS.questionMaxLength}文字以内で入力してください。`);
  }

  const now = new Date();
  const day = resolveMochitClientDay(now, body.localDate, body.timezoneOffsetMinutes);
  const limit = getExplain3dDailyLimit();
  const [usedToday, usedLast24h] = await Promise.all([
    countExplain3dSince(userId, new Date(day.dayStartMs)),
    countExplain3dSince(userId, new Date(now.getTime() - 86_400_000)),
  ]);
  if (usedToday >= limit || usedLast24h >= limit * 2) {
    return fail(429, "rate_limited", `3D模型の解説は1日${limit}回までです。続きはまた明日どうぞ。`);
  }

  // AI を呼ぶ前に記録する。答えの後に記録すると、断られた質問・失敗・同時に送った分が上限に数えられない
  await logExplain3dEvent({ userId, event: "explain3d_requested" });

  const topics = getAllTopics().map((t) => ({ id: t.id, title: t.title }));
  const system = buildExplainSystemPrompt({
    models: EXISTING_MODELS.map((m) => ({ ...m, title: topicTitle(m.topicId) })),
    topics,
  });

  try {
    const { output, model } = await generateExplainPlan({ system, user: buildExplainUserPrompt(question), question });
    const parsed = parseExplainOutput(output, {
      existingTopicIds: EXISTING_IDS,
      knownTopicIds: new Set(topics.map((t) => t.id)),
    });
    if (!parsed) throw new Explain3dError("unusable explain output", "invalid_response");
    if (parsed.mode === "off_topic") {
      return fail(400, "off_topic", "ITパスポートの学習に関係する仕組みを入力してください（例：DNSの仕組み、VPNの仕組み）。");
    }
    const result: ExplainResult =
      parsed.mode === "existing"
        ? existingResult(parsed.topicId, parsed.reason)
        : {
            kind: "generated",
            scene: parsed.scene,
            relatedTopicId: parsed.relatedTopicId,
            relatedTopicTitle: parsed.relatedTopicId ? topicTitle(parsed.relatedTopicId) : null,
            relatedLessonHref: parsed.relatedTopicId ? getLessonHref(parsed.relatedTopicId) : null,
          };
    await logExplain3dEvent({ userId, event: "explain3d_answered", intent: result.kind });
    return NextResponse.json({ ok: true, result, model });
  } catch (error) {
    console.error("[explain3d] failed", error);
    // AI が使えなくても、キーワードが合う模型があればそれを開く
    const matched = matchExistingModel(question);
    if (matched) {
      await logExplain3dEvent({ userId, event: "explain3d_answered", intent: "existing_fallback" });
      return NextResponse.json({ ok: true, result: existingResult(matched.topicId, ""), model: "keyword" });
    }
    await logExplain3dEvent({ userId, event: "explain3d_error" });
    return fail(502, "failed", "今は模型を組み立てられませんでした。少し時間をおいて、もう一度試してください。");
  }
}
