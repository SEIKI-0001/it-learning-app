import { createHmac, timingSafeEqual } from "node:crypto";
import { buildTodayRecommendation } from "@/lib/study-planner";
import { getProgressSummary } from "@/lib/progress";
import { getRepository } from "@/lib/storage";
import { lineUserIdToAppUserId } from "@/lib/session";
import { getQuestionsByTopic } from "@/data/questions";
import { getTopicById } from "@/data/topics";
import { todayISO } from "@/lib/date";
import type { UserProfile } from "@/types/user";

type LineTextMessage = {
  type: "text";
  text: string;
};

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: {
    userId?: string;
  };
  message?: {
    type: string;
    text?: string;
  };
};

export function verifyLineSignature(body: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    return true;
  }
  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(body).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function replyLine(replyToken: string, messages: LineTextMessage[]): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.info("LINE_CHANNEL_ACCESS_TOKEN is not set. Reply preview:", messages);
    return;
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      replyToken,
      messages: messages.slice(0, 5)
    })
  });

  if (!response.ok) {
    throw new Error(`LINE reply failed: ${response.status} ${await response.text()}`);
  }
}

export async function buildLineReply(event: LineEvent): Promise<LineTextMessage[]> {
  const text = event.message?.text?.trim() ?? "";
  const lineUserId = event.source?.userId ?? "unknown";
  const userId = lineUserIdToAppUserId(lineUserId);
  const repository = getRepository();
  const profile = await repository.getUserProfile(userId);
  const command = normalizeCommand(text);

  if (command === "start") {
    if (!profile) {
      return [
        textMessage("はじめまして。ITパスポート合格まで、今日やることを一緒に絞ります。"),
        textMessage(
          `まずWebで初回設定をしてください。\n${appUrl(
            `/onboarding?lineUserId=${encodeURIComponent(lineUserId)}`
          )}`
        ),
        textMessage("設定後はLINEで「今日」と送るだけで、その日の学習メニューを返します。")
      ];
    }
    return [
      textMessage("設定はできています。"),
      textMessage("次は「今日」と送って、今日の学習テーマを確認しましょう。")
    ];
  }

  if (!profile) {
    return [
      textMessage("先に初回設定が必要です。"),
      textMessage(
        `試験日・使える時間・苦手分野を登録してください。\n${appUrl(
          `/onboarding?lineUserId=${encodeURIComponent(lineUserId)}`
        )}`
      )
    ];
  }

  if (command === "today") {
    return buildTodayMessages(repository, profile);
  }

  if (command === "review") {
    return buildReviewMessages(profile.id);
  }

  if (command === "progress") {
    const progress = await getProgressSummary(repository, profile, profile.id);
    return [
      textMessage(
        `進捗: ${progress.completedTopics}/${progress.totalTopics}テーマ完了\n試験日まで: ${
          progress.daysUntilExam ?? "-"
        }日\n復習待ち: ${progress.pendingReviewTopics.length}テーマ`
      ),
      textMessage(
        progress.nextRecommendedTopic
          ? `次は「${progress.nextRecommendedTopic.title}」がおすすめです。\n${appUrl(
              `/topics/${progress.nextRecommendedTopic.id}`
            )}`
          : "次は「今日」と送って学習メニューを確認しましょう。"
      )
    ];
  }

  if (command === "help") {
    return [
      textMessage("使えるメッセージ: はじめる / 今日 / 復習 / 進捗 / ヘルプ"),
      textMessage("迷ったら「今日」と送ればOKです。長文より、次の1アクションを返します。")
    ];
  }

  return [
    textMessage("受け取れました。学習を進めるなら「今日」、苦手を戻すなら「復習」と送ってください。")
  ];
}

export function parseLineEvents(payload: unknown): LineEvent[] {
  if (!payload || typeof payload !== "object" || !("events" in payload)) {
    return [];
  }
  const events = (payload as { events: unknown }).events;
  return Array.isArray(events) ? (events as LineEvent[]) : [];
}

async function buildTodayMessages(
  repository: ReturnType<typeof getRepository>,
  profile: UserProfile
): Promise<LineTextMessage[]> {
  const recommendation = await buildTodayRecommendation(repository, profile);
  return [
    textMessage(
      `今日のテーマ: ${recommendation.topic.title}\n目安: ${recommendation.estimatedMinutes}分\n理由: ${recommendation.reason}`
    ),
    textMessage(`参考書: ${recommendation.bookRange}\nまず読むところだけ絞りましょう。`),
    textMessage(
      `${recommendation.topic.summary}\n\n確認問題へ: ${appUrl(`/practice?topic=${recommendation.topic.id}`)}`
    )
  ];
}

async function buildReviewMessages(userId: string): Promise<LineTextMessage[]> {
  const repository = getRepository();
  const reviewItems = await repository.getReviewItems(userId);
  const dueItem = reviewItems
    .filter((item) => item.dueDate <= todayISO())
    .sort((a, b) => b.priority - a.priority)[0];

  if (!dueItem) {
    return [
      textMessage("今すぐ期限の来ている復習はありません。"),
      textMessage("余裕があれば「今日」の確認問題を1問だけ進めましょう。")
    ];
  }

  const topic = getTopicById(dueItem.topicId);
  const question = getQuestionsByTopic(dueItem.topicId)[0];
  return [
    textMessage(`復習テーマ: ${topic?.title ?? dueItem.topicId}\n優先度: ${dueItem.priority}/10`),
    textMessage(
      question
        ? `まず1問だけ戻します。\n${appUrl(`/practice?topic=${dueItem.topicId}`)}`
        : `テーマ解説を確認しましょう。\n${appUrl(`/topics/${dueItem.topicId}`)}`
    )
  ];
}

function normalizeCommand(text: string): "start" | "today" | "review" | "progress" | "help" | "unknown" {
  if (["はじめる", "始める", "start"].includes(text.toLowerCase())) return "start";
  if (["今日", "きょう", "today"].includes(text.toLowerCase())) return "today";
  if (["復習", "review"].includes(text.toLowerCase())) return "review";
  if (["進捗", "progress"].includes(text.toLowerCase())) return "progress";
  if (["ヘルプ", "help", "?"].includes(text.toLowerCase())) return "help";
  return "unknown";
}

function textMessage(text: string): LineTextMessage {
  return {
    type: "text",
    text: text.slice(0, 480)
  };
}

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}${path}`;
}
