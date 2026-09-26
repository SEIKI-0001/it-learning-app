import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/apiUser";
import { getTopic } from "@/lib/content";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { DEFAULT_MOCHIT_NAME } from "@/lib/mochitName";
import { generateMochitReply } from "@/lib/ai/mochitChat";
import { sanitizeQuestionContext } from "@/lib/mochitAi/facts";
import { inferMochitIntent } from "@/lib/mochitAi/intent";
import { buildMochitLearningContext } from "@/lib/mochitAi/learningContext";
import {
  buildMochitSystemPrompt,
  buildMochitUserPrompt,
  guardMochitReply,
  MOCHIT_FALLBACK_REPLY,
} from "@/lib/mochitAi/prompt";
import {
  MOCHIT_CHAT_LIMITS as LIMITS,
  type MochitChatMessage,
  type MochitChatRequest,
  type MochitIntent,
  type MochitPageKind,
  type MochitTodaySnapshot,
} from "@/lib/mochitAi/types";
import { countTodayMochitMessages, getMochitDailyLimit, logMochitEvent } from "@/lib/mochitAi/usage";

export const runtime = "nodejs";

const PAGES = new Set<MochitPageKind>(["today", "learn", "progress", "question", "general"]);
const INTENTS = new Set<MochitIntent>(["status", "today", "plan", "question", "learn", "reflection", "general"]);
const SOURCES = new Set(["quick_action", "free_input", "reflection"]);
const TASK_KINDS = new Set(["new", "review", "vocab", "exam"]);
const TASK_STATES = new Set(["done", "now", "next"]);

function fail(status: number, reason: string, error: string) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

function sanitizeHistory(value: unknown): MochitChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((m): m is MochitChatMessage =>
      Boolean(m) && (m.role === "user" || m.role === "mochit") && typeof m.text === "string",
    )
    .slice(-LIMITS.historyMaxMessages)
    .map((m) => ({ role: m.role, text: m.text.slice(0, LIMITS.historyMessageMaxLength) }));
}

function sanitizeToday(value: unknown): MochitTodaySnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as MochitTodaySnapshot;
  if (typeof v.date !== "string" || !Array.isArray(v.tasks)) return null;
  const tasks = v.tasks
    .slice(0, LIMITS.todayTasksMax)
    .filter((t) => t && typeof t.title === "string" && TASK_KINDS.has(t.kind) && TASK_STATES.has(t.state))
    .map((t) => ({
      title: t.title.slice(0, 80),
      kind: t.kind,
      minutes: Math.max(0, Math.min(600, Math.round(Number(t.minutes) || 0))),
      state: t.state,
    }));
  const primary =
    v.primary && typeof v.primary.title === "string" && typeof v.primary.reason === "string"
      ? { title: v.primary.title.slice(0, 80), reason: v.primary.reason.slice(0, 120) }
      : undefined;
  return { date: v.date.slice(0, 10), tasks, ...(primary ? { primary } : {}) };
}

function sanitizeDisplayName(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_MOCHIT_NAME;
  const name = value.replace(/[\r\n"`<>]/g, "").trim().slice(0, 12);
  return name || DEFAULT_MOCHIT_NAME;
}

function clientLocalDate(body: MochitChatRequest, offset: number, now: Date): string {
  if (typeof body.localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.localDate)) return body.localDate;
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/**
 * POST /api/mochit/chat
 * 常駐モチットへの相談1往復。
 *
 * - 学習状況は毎回サーバーで最新を読み直す（Learning Context 層）。会話履歴は文脈だけに使う。
 * - LLM にはアプリが計算した事実だけを渡す。実力・計画・正誤は LLM に判定させない。
 * - 失敗しても学習は止めない：UI は定型文と再試行ボタンを出す。
 *
 * 401 未ログイン / 400 入力不正 / 429 1日の上限 / 502 AI 失敗 / 200 { ok, reply, intent }
 */
export async function POST(request: Request) {
  let body: MochitChatRequest;
  try {
    body = (await request.json()) as MochitChatRequest;
  } catch {
    return fail(400, "invalid", "リクエストの形式が正しくありません。");
  }

  const userId = await getRequestUserId({ userId: body.userId ?? undefined });
  if (!userId) {
    return fail(401, "login_required", "ログインすると、モチットに学習の相談ができるよ。");
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > LIMITS.messageMaxLength) {
    return fail(400, "invalid", `相談は${LIMITS.messageMaxLength}文字以内で入力してね。`);
  }

  const page: MochitPageKind = PAGES.has(body.page) ? body.page : "general";
  const source = SOURCES.has(body.source) ? body.source : "free_input";
  const question = sanitizeQuestionContext(body.question, {
    text: LIMITS.questionTextMaxLength,
    choice: LIMITS.choiceTextMaxLength,
  });
  const learnTopicId =
    body.learn && typeof body.learn.topicId === "string" && getTopic(body.learn.topicId)
      ? body.learn.topicId
      : null;
  const intent: MochitIntent =
    body.intent && INTENTS.has(body.intent)
      ? body.intent
      : inferMochitIntent({ message, page, hasQuestion: question !== null, hasLearnTopic: learnTopicId !== null });

  const limit = getMochitDailyLimit();
  const used = await countTodayMochitMessages(userId);
  if (used >= limit) {
    return fail(429, "rate_limited", "今日はたくさん相談したね。続きはまた明日にしよう。学習はそのまま続けられるよ。");
  }

  const now = new Date();
  const offset = Math.max(-840, Math.min(840, Math.round(Number(body.timezoneOffsetMinutes) || 0)));
  const localDate = clientLocalDate(body, offset, now);
  const supabase = getServiceSupabase();

  try {
    const context = supabase
      ? await buildMochitLearningContext({
          supabase,
          userId,
          now,
          intent,
          page,
          localDate,
          timezoneOffsetMinutes: offset,
          question,
          learnTopicId,
          today: sanitizeToday(body.today),
        })
      : { facts: { page, note: "学習データを読み込めない（判断材料不足）" }, band: null };

    const history = sanitizeHistory(body.history);
    const { text } = await generateMochitReply({
      system: buildMochitSystemPrompt(sanitizeDisplayName(body.displayName)),
      user: buildMochitUserPrompt({ intent, facts: context.facts, history, message }),
    });
    // 学習者が自分で書いた数字（「80点取りたい」等）への言及は落とさない
    const reply = guardMochitReply(text, context.facts, { band: context.band, context: message }) ?? MOCHIT_FALLBACK_REPLY;

    await logMochitEvent({ userId, event: "mochit_message_sent", page, source, intent });
    return NextResponse.json({ ok: true, reply, intent });
  } catch (error) {
    console.error("[mochit-ai] chat failed", error);
    await logMochitEvent({ userId, event: "mochit_error", page, source, intent });
    return fail(502, "failed", "モチットが今うまく答えられないみたい。学習はそのまま続けられるよ。");
  }
}
