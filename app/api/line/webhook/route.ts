import { NextResponse } from "next/server";

/**
 * LINE Messaging API の Webhook 受け口（将来の連携用の土台）。
 *
 * 現時点では Web 単体での体験を優先しているため、署名検証や返信API送信は未実装です。
 * LINE 開発者コンソールで設定した Webhook URL（例: https://<your-domain>/api/line/webhook）から
 * POST されるイベントを受け取り、「今日」というテキストが来たらクエストURLを返す想定の
 * 簡易ロジックのみ入れています。
 *
 * TODO:
 * - LINE Channel Secret による署名検証（x-line-signature ヘッダの HMAC-SHA256 検証）
 * - LINE Channel Access Token による reply message 送信（POST https://api.line.me/v2/bot/message/reply）
 * - lineUserId と AppState の永続化（誰がどこまで進んだかを保存）
 * - 本番では localStorage ではなく DB（例: Supabase / RDB）に保存
 */

// このプロトタイプでは固定URL。実運用では環境変数（例: process.env.APP_BASE_URL）から組み立てる。
const QUEST_URL = "http://localhost:3000/quest/today";

type LineTextMessage = {
  type: "message";
  message?: { type: string; text?: string };
};

type LineWebhookBody = {
  events?: LineTextMessage[];
};

export async function POST(request: Request) {
  // TODO: ここで x-line-signature ヘッダを使った署名検証を行う（Channel Secret 必須）
  // const signature = request.headers.get("x-line-signature");

  let body: LineWebhookBody = {};
  try {
    body = (await request.json()) as LineWebhookBody;
  } catch {
    // LINE の疎通確認（空ボディ）でも 200 を返す
    return NextResponse.json({ ok: true });
  }

  const events = body.events ?? [];
  const replies: { to: "user"; text: string }[] = [];

  for (const ev of events) {
    if (ev.type === "message" && ev.message?.type === "text") {
      const text = (ev.message.text ?? "").trim();

      if (text === "今日" || text.includes("クエスト")) {
        // TODO: 実際は reply token を使って LINE に返信する。
        // ここでは「返す予定の内容」を組み立てるだけ（Web単体動作を妨げないため）。
        replies.push({
          to: "user",
          text: `今日のクエストはこちら！\n${QUEST_URL}`,
        });
      } else {
        replies.push({
          to: "user",
          text: "「今日」と送ると、今日のクエストURLをお届けします📩",
        });
      }
    }
  }

  // TODO: replies を LINE reply API へ送信する。今は確認用に JSON で返すだけ。
  return NextResponse.json({ ok: true, plannedReplies: replies });
}

// 動作確認用（ブラウザで開いて疎通チェックできるように）
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "FE Quest LINE webhook endpoint. Use POST for LINE events.",
  });
}
