import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * LINE Messaging API の Webhook 受け口。
 *
 * 「はじめる」「今日」「進捗」「ヘルプ」のテキストを受け取ると、
 * Vercel 上の該当ページ URL や案内文を LINE に返信します。
 *
 * 必要な環境変数（Vercel のプロジェクト設定 → Environment Variables に登録）:
 * - LINE_CHANNEL_SECRET        : 署名検証用（x-line-signature の HMAC-SHA256 検証）
 * - LINE_CHANNEL_ACCESS_TOKEN  : reply message 送信用（長期トークン）
 * - APP_BASE_URL               : 返信に載せる本番 URL の基点（例: https://it-learning-app.vercel.app）
 *                                未設定時はリクエストのホストから自動推定します。
 *
 * いずれの環境変数も未設定の場合は「検証スキップ＋実送信せず planedReplies を JSON で返す」
 * という挙動になるため、ローカルや疎通確認では設定なしでも 200 を返します。
 */

// crypto / fetch を使うため Node ランタイムを明示。
export const runtime = "nodejs";

type LineMessageEvent = {
  type: string;
  replyToken?: string;
  message?: { type: string; text?: string };
};

type LineWebhookBody = {
  events?: LineMessageEvent[];
};

/** リクエストから本番 URL の基点を決定する。env を優先し、無ければホストから推定。 */
function resolveBaseUrl(request: Request): string {
  const fromEnv = process.env.APP_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host");
  if (host) return `${proto}://${host}`;

  // 最終フォールバック（ローカル開発）
  return "http://localhost:3000";
}

/** 受け取ったテキストから返信文を組み立てる。 */
function buildReplyText(rawText: string, baseUrl: string): string {
  const text = rawText.trim();

  // 表記ゆれを少しだけ許容する（前後の語を含んでいても拾う）。
  if (text === "はじめる" || text.includes("はじめ") || text.includes("始め")) {
    return `ようこそ！まずは初期設定から始めましょう✨\n${baseUrl}/onboarding`;
  }
  if (text === "今日" || text.includes("今日") || text.includes("クエスト")) {
    return `今日のクエストはこちら！1日3分でレベルアップ⚔️\n${baseUrl}/quest/today`;
  }
  if (text === "進捗" || text.includes("進捗") || text.includes("マップ")) {
    return `あなたの冒険の進み具合はこちら🗺️\n${baseUrl}/map`;
  }
  if (text === "ヘルプ" || text.includes("ヘルプ") || text === "help") {
    return helpText();
  }

  // どれにも当てはまらない場合は使い方を案内。
  return helpText();
}

function helpText(): string {
  return [
    "FE Quest の使い方📖",
    "次のことばを送ってみてね！",
    "・はじめる … 最初の設定をする",
    "・今日 … 今日のクエストに挑戦",
    "・進捗 … 冒険マップで進み具合を確認",
    "・ヘルプ … この案内をもう一度表示",
  ].join("\n");
}

/** x-line-signature を Channel Secret で検証する。 */
function verifySignature(rawBody: string, signature: string | null, channelSecret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** LINE の reply API へ返信を送る。 */
async function sendReply(replyToken: string, text: string, accessToken: string): Promise<void> {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`LINE reply API error: ${res.status} ${detail}`);
  }
}

export async function POST(request: Request) {
  // 署名検証のため生のボディ文字列が必要。
  const rawBody = await request.text();

  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  // Channel Secret が設定されている場合のみ署名検証を行う（未設定なら疎通確認向けにスキップ）。
  if (channelSecret) {
    const signature = request.headers.get("x-line-signature");
    if (!verifySignature(rawBody, signature, channelSecret)) {
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }
  }

  let body: LineWebhookBody = {};
  try {
    body = rawBody ? (JSON.parse(rawBody) as LineWebhookBody) : {};
  } catch {
    // LINE の検証（空ボディ）でも 200 を返す。
    return NextResponse.json({ ok: true });
  }

  const baseUrl = resolveBaseUrl(request);
  const events = body.events ?? [];
  const plannedReplies: { replyToken?: string; text: string }[] = [];

  for (const ev of events) {
    if (ev.type !== "message" || ev.message?.type !== "text") continue;

    const text = buildReplyText(ev.message.text ?? "", baseUrl);
    plannedReplies.push({ replyToken: ev.replyToken, text });

    // アクセストークンと replyToken が揃っていれば実際に返信する。
    if (accessToken && ev.replyToken) {
      await sendReply(ev.replyToken, text, accessToken);
    }
  }

  // 実送信したかどうかに関わらず 200 を返す（LINE は 200 以外をエラー扱いするため）。
  return NextResponse.json({ ok: true, replied: Boolean(accessToken), plannedReplies });
}

// 動作確認用（ブラウザで開いて疎通チェックできるように）。
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "FE Quest LINE webhook endpoint. Use POST for LINE events.",
    commands: ["はじめる", "今日", "進捗", "ヘルプ"],
  });
}
