import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";

/**
 * LINE Messaging API の Webhook 受け口。
 *
 * 「はじめる」「今日」「進捗」「ヘルプ」のテキストを受け取ると、
 * Vercel 上の該当ページ URL や案内文を LINE に返信します。
 * Supabase が設定されている場合は、LINE userId を内部ユーザーに紐づけ、
 * 返信URLに一時トークン（?t=...）を付与して Web 側でユーザーを特定できるようにします。
 *
 * 必要な環境変数（Vercel のプロジェクト設定 → Environment Variables に登録）:
 * - LINE_CHANNEL_SECRET        : 署名検証用（x-line-signature の HMAC-SHA256 検証）
 * - LINE_CHANNEL_ACCESS_TOKEN  : reply message 送信用（長期トークン）
 * - APP_BASE_URL               : 返信に載せる本番 URL の基点（例: https://it-learning-app.vercel.app）
 *                                未設定時はリクエストのホストから自動推定します。
 * - NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY : ユーザー紐づけ用（任意）。
 *                                未設定なら従来通りトークン無しURLで返信します（既存挙動を維持）。
 *
 * LINE 環境変数が未設定の場合は「検証スキップ＋実送信せず plannedReplies を JSON で返す」
 * という挙動になるため、ローカルや疎通確認では設定なしでも 200 を返します。
 */

// crypto / fetch を使うため Node ランタイムを明示。
export const runtime = "nodejs";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type?: string; userId?: string };
  message?: { type: string; text?: string };
};

type LineWebhookBody = {
  events?: LineEvent[];
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

/** baseUrl + path に、トークンがあれば ?t=... を付ける。 */
function withToken(baseUrl: string, path: string, token: string | null): string {
  const url = `${baseUrl}${path}`;
  return token ? `${url}?t=${encodeURIComponent(token)}` : url;
}

/** 受け取ったテキストから返信文を組み立てる。token があればURLに付与する。 */
function buildReplyText(rawText: string, baseUrl: string, token: string | null): string {
  const text = rawText.trim();

  // 表記ゆれを少しだけ許容する（前後の語を含んでいても拾う）。
  if (text === "はじめる" || text.includes("はじめ") || text.includes("始め")) {
    return `ようこそ！まずは初期設定から始めましょう✨\n${withToken(baseUrl, "/onboarding", token)}`;
  }
  if (text === "今日" || text.includes("今日") || text.includes("クエスト")) {
    return `今日のクエストはこちら！1日3分でレベルアップ⚔️\n${withToken(baseUrl, "/quest/today", token)}`;
  }
  if (text === "進捗" || text.includes("進捗") || text.includes("マップ")) {
    return `あなたの冒険の進み具合はこちら🗺️\n${withToken(baseUrl, "/map", token)}`;
  }
  if (text === "ヘルプ" || text.includes("ヘルプ") || text === "help") {
    return helpText();
  }

  // どれにも当てはまらない場合は使い方を案内。
  return helpText();
}

/** follow（友だち追加）時のあいさつ。 */
function buildFollowText(baseUrl: string, token: string | null): string {
  return `はじめまして！基本情報クエストへようこそ🗺️\nまずは下のリンクから初期設定をしてね✨\n${withToken(baseUrl, "/onboarding", token)}`;
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

/**
 * LINE userId を内部ユーザー(line_users)に紐づけ、一時セッショントークンを発行する。
 * Supabase 未設定や失敗時は null を返し、呼び出し側はトークン無しで処理を続ける（既存挙動を維持）。
 */
async function linkUserAndCreateToken(lineUserId: string | undefined): Promise<string | null> {
  if (!lineUserId) return null;
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  try {
    // line_users を UPSERT して内部 user_id を得る。
    const { data: user, error: userErr } = await supabase
      .from("line_users")
      .upsert({ line_user_id: lineUserId }, { onConflict: "line_user_id" })
      .select("id")
      .single();
    if (userErr || !user) {
      console.error("line_users upsert failed", userErr);
      return null;
    }

    // 一時トークンを発行（line_sessions）。
    const token = randomUUID();
    const { error: sessErr } = await supabase
      .from("line_sessions")
      .insert({ token, user_id: user.id });
    if (sessErr) {
      console.error("line_sessions insert failed", sessErr);
      return null;
    }
    return token;
  } catch (e) {
    console.error("linkUserAndCreateToken error", e);
    return null;
  }
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
    // follow（友だち追加）: あいさつ＋オンボーディング案内
    if (ev.type === "follow") {
      const token = await linkUserAndCreateToken(ev.source?.userId);
      const text = buildFollowText(baseUrl, token);
      plannedReplies.push({ replyToken: ev.replyToken, text });
      if (accessToken && ev.replyToken) await sendReply(ev.replyToken, text, accessToken);
      continue;
    }

    // message（テキスト）: コマンドに応じたURL/案内を返信
    if (ev.type === "message" && ev.message?.type === "text") {
      const token = await linkUserAndCreateToken(ev.source?.userId);
      const text = buildReplyText(ev.message.text ?? "", baseUrl, token);
      plannedReplies.push({ replyToken: ev.replyToken, text });
      if (accessToken && ev.replyToken) await sendReply(ev.replyToken, text, accessToken);
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
