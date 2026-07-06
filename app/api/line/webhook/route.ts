import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { loadAppStateForUser } from "@/lib/serverAppState";
import type { UserAnswer, UserProfile, UserProgress } from "@/types";
import { FIELD_LABELS } from "@/types/content";
import { getAllTopics, getReviewItemsForUser, getTopic } from "@/lib/content";
import { daysUntilExam, generateTodayMenu } from "@/lib/aiPlanner";
import { generateLearningPlan } from "@/lib/studyPlanner";
import { getCheckpoint, phaseToCheckpointId } from "@/lib/checkpoints";
import { fieldMastery } from "@/lib/study";
import { computeProgressSummary } from "@/lib/progressSummary";
import { getLatestOrRefreshIntegratedStatus } from "@/lib/progressBootstrap";
import {
  overallStatusLabel,
  type IntegratedLearningStatus,
} from "@/types/integratedStatus";

/**
 * LINE Messaging API の Webhook 受け口（ITパスポート学習コーチ）。
 *
 * 「はじめる」「今日」「進捗」「復習」「ヘルプ」のテキストに応答します。
 * LINE 上では学習本文(問題・解説)は出さず、要約 + Web(/today 等)への導線を返します。
 * Supabase が設定されていれば LINE userId を内部ユーザーに紐づけ、進捗から
 * 個別の要約を生成します。未設定時は従来通りリンクのみで応答します(フォールバック)。
 *
 * 必要な環境変数:
 * - LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN : 署名検証・返信送信
 * - APP_BASE_URL / NEXT_PUBLIC_APP_URL : 返信に載せる本番URLの基点
 * - NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY : ユーザー紐づけ・進捗参照(任意)
 */

export const runtime = "nodejs";

const LINE_SESSION_TOKEN_TTL_MS = 15 * 60 * 1000;

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type?: string; userId?: string };
  message?: { type: string; text?: string };
};

type LineWebhookBody = {
  events?: LineEvent[];
};

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** リクエストから本番 URL の基点を決定する。production では env を必須にする。 */
function resolveBaseUrl(request: Request): string | null {
  const fromEnv = (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (isProduction()) return null;

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host");
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

/** baseUrl + path に、トークンがあれば ?t=... を付ける。 */
function withToken(baseUrl: string, path: string, token: string | null): string {
  const url = `${baseUrl}${path}`;
  return token ? `${url}?t=${encodeURIComponent(token)}` : url;
}

/** 紐づけ済みユーザーの内部 user_id とセッション token。 */
type LinkedUser = { userId: string | null; token: string | null };

/**
 * LINE userId を内部ユーザー(line_users)に紐づけ、一時セッショントークンを発行する。
 * Supabase 未設定や失敗時は null を返し、呼び出し側はトークン無しで処理を続ける。
 */
async function linkUser(
  supabase: SupabaseClient | null,
  lineUserId: string | undefined,
): Promise<LinkedUser> {
  if (!lineUserId || !supabase) return { userId: null, token: null };
  try {
    const { data: user, error: userErr } = await supabase
      .from("line_users")
      .upsert({ line_user_id: lineUserId }, { onConflict: "line_user_id" })
      .select("id")
      .single();
    if (userErr || !user) {
      console.error("line_users upsert failed", userErr);
      return { userId: null, token: null };
    }
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + LINE_SESSION_TOKEN_TTL_MS).toISOString();
    const { error: sessErr } = await supabase
      .from("line_sessions")
      .insert({ token, user_id: user.id, expires_at: expiresAt });
    if (sessErr) {
      console.error("line_sessions insert failed", sessErr);
      return { userId: user.id as string, token: null };
    }
    return { userId: user.id as string, token };
  } catch (e) {
    console.error("linkUser error", e);
    return { userId: null, token: null };
  }
}

/**
 * 内部ユーザーの profile / progress / answers を取得（無ければ undefined / 空配列）。
 * Web のセッション復元と同じ loadAppStateForUser を使い、回答履歴も含めて読む。
 * 回答履歴が無いと計画エンジンの正答率ベースの判定（フェーズ・過去問開始）が
 * Web の /plan と食い違うため、必ず実データで計算する。
 */
async function fetchUserState(
  supabase: SupabaseClient | null,
  userId: string | null,
): Promise<{ profile?: UserProfile; progress?: UserProgress; answers: UserAnswer[] }> {
  if (!supabase || !userId) return { answers: [] };
  try {
    const state = await loadAppStateForUser(userId);
    if (!state) return { answers: [] };
    return { profile: state.profile, progress: state.progress, answers: state.answers };
  } catch (e) {
    console.error("fetchUserState error", e);
    return { answers: [] };
  }
}

function helpText(): string {
  return [
    "ITパスポート学習コーチの使い方📖",
    "次のことばを送ってください！",
    "・はじめる … 試験日や学習設定をする",
    "・今日 … 今日の学習メニューを見る",
    "・計画 … 合格までのロードマップを見る",
    "・今週 … 今週のゴールを見る",
    "・進捗 … 学習の進み具合を見る",
    "・復習 … 復習対象をまとめて確認",
    "・ヘルプ … この案内をもう一度表示",
  ].join("\n");
}

/** 「計画」「ロードマップ」「今週」: 全体ロードマップ・現在フェーズ・今週のゴールを要約して返す。 */
function planText(
  baseUrl: string,
  token: string | null,
  profile?: UserProfile,
  progress?: UserProgress,
  answers: UserAnswer[] = [],
): string {
  if (!profile || !progress) {
    return [
      "学習ロードマップ📅",
      "(初回設定がまだの場合は『はじめる』を送ってください)",
      withToken(baseUrl, "/plan", token),
    ].join("\n");
  }
  const plan = generateLearningPlan(
    { profile, progress, answers },
    getAllTopics(),
  );
  // 現在地は Web と同じ CP（チェックポイント）語彙で伝える。
  const cp = getCheckpoint(
    progress.checkpointProgress?.currentCheckpointId ??
      phaseToCheckpointId(plan.currentPhase),
  );
  const lines = ["学習ロードマップ📅"];
  lines.push(
    plan.daysUntilExam === null
      ? "試験日は未設定です（設定すると逆算します）。"
      : `試験まであと${plan.daysUntilExam}日。`,
  );
  lines.push(`現在は ${cp.emoji} CP${cp.order}「${cp.title}」です。`);
  lines.push(`今週のゴール：${plan.weeklyGoal.headline}。`);
  lines.push(`今日やること：${plan.todayMenu.theme}`);
  lines.push("詳しく見る👇", withToken(baseUrl, "/plan", token));
  return lines.join("\n");
}

function startText(baseUrl: string, token: string | null): string {
  return [
    "学習をはじめましょう✨",
    "まずは試験予定日や1日の学習時間を設定します。",
    withToken(baseUrl, "/onboarding", token),
  ].join("\n");
}

function followText(baseUrl: string, token: string | null): string {
  return [
    "はじめまして！ITパスポート学習コーチです🎓",
    "試験日から逆算して、毎日やることをご案内します。",
    "まずは初回設定から👇",
    withToken(baseUrl, "/onboarding", token),
  ].join("\n");
}

/** 「今日」: 今日の学習メニューを要約して返す。 */
function todayText(
  baseUrl: string,
  token: string | null,
  profile?: UserProfile,
  progress?: UserProgress,
  answers: UserAnswer[] = [],
): string {
  if (!profile || !progress) {
    return [
      "今日の学習メニューはこちら📖",
      "(初回設定がまだの場合は『はじめる』を送ってください)",
      withToken(baseUrl, "/today", token),
    ].join("\n");
  }
  const menu = generateTodayMenu(profile, progress, getAllTopics(), answers);
  const lines = [`📖 今日のテーマ：${menu.theme}`, `⏱️ 目安 ${menu.totalMinutes}分`];
  const learn = menu.items.filter((i) => i.kind === "learn");
  if (learn.length > 0) {
    lines.push("やること：" + learn.map((i) => i.title).join("、"));
  }
  if (menu.reviewItems.length > 0) {
    lines.push(`🔁 復習 ${menu.reviewItems.length}件あり`);
  }
  lines.push("Webで続ける👇", withToken(baseUrl, "/today", token));
  return lines.join("\n");
}

/** 「進捗」: 合格準備度・連続日数・XP・3分野の弱点を返す。 */
function progressText(
  baseUrl: string,
  token: string | null,
  profile?: UserProfile,
  progress?: UserProgress,
  integrated: IntegratedLearningStatus | null = null,
): string {
  if (!progress) {
    return ["あなたの進捗はこちら📈", withToken(baseUrl, "/progress", token)].join("\n");
  }
  const topics = getAllTopics();
  const summary = computeProgressSummary(topics, progress);
  const remaining = daysUntilExam(profile);
  const mastery = fieldMastery(progress, topics);
  const weakest = (Object.keys(mastery) as (keyof typeof mastery)[]).sort(
    (a, b) => mastery[a] - mastery[b],
  )[0];

  // 合格準備度は Web と同じ統合進捗(readinessScore)を正とする。
  // 取得できないとき（Supabase未設定など）のみローカル推定にフォールバック。
  const readinessLine = integrated
    ? `📈 合格準備度 ${integrated.readinessScore}%（${overallStatusLabel(integrated.overallStatus)}）`
    : `📈 合格準備度 ${summary.readinessPct}%`;

  const lines = [
    readinessLine,
    `学習済み ${summary.completedCount}/${summary.totalCount}`,
    remaining === null ? "試験日：未設定" : `試験まであと${remaining}日`,
    `🔥 連続学習 ${progress.streakCount}日 / Lv.${progress.level}・${progress.exp}XP`,
  ];
  if (weakest) lines.push(`いま弱いのは「${FIELD_LABELS[weakest]}」`);
  lines.push("詳しくはWebで👇", withToken(baseUrl, "/progress", token));
  return lines.join("\n");
}

/** 「復習」: 復習対象を要約して返す。 */
function reviewText(
  baseUrl: string,
  token: string | null,
  profile?: UserProfile,
  progress?: UserProgress,
): string {
  if (!progress) {
    return ["復習対象はこちら🔁", withToken(baseUrl, "/review", token)].join("\n");
  }
  const items = getReviewItemsForUser({
    progress,
    weakFields: profile?.weakFields,
  });
  if (items.length === 0) {
    return [
      "🔁 いまは復習対象がありません。",
      "新しいトピックを学ぶと自動で追加されます。",
      withToken(baseUrl, "/today", token),
    ].join("\n");
  }
  const titles = items
    .slice(0, 3)
    .map((r) => `・${getTopic(r.topicId)?.title ?? r.topicId}`);
  return [
    `🔁 復習対象が${items.length}件あります`,
    ...titles,
    "まとめて解く👇",
    withToken(baseUrl, "/review", token),
  ].join("\n");
}

/** 受け取ったテキストからコマンドを判定し、返信文を組み立てる。 */
async function buildReplyText(
  rawText: string,
  baseUrl: string,
  token: string | null,
  supabase: SupabaseClient | null,
  userId: string | null,
  profile?: UserProfile,
  progress?: UserProgress,
  answers: UserAnswer[] = [],
): Promise<string> {
  const text = rawText.trim();

  if (text.includes("はじめ") || text.includes("始め") || text.includes("設定")) {
    return startText(baseUrl, token);
  }
  if (
    text.includes("計画") ||
    text.includes("ロードマップ") ||
    text.includes("今週")
  ) {
    return planText(baseUrl, token, profile, progress, answers);
  }
  if (text.includes("今日") || text.includes("学習") || text.includes("メニュー")) {
    return todayText(baseUrl, token, profile, progress, answers);
  }
  if (text.includes("進捗") || text.includes("状況")) {
    // Web の /progress と同じ統合進捗を参照する（HTTP自己呼び出しはせず共有ヘルパーを直接使う）。
    // 失敗しても従来のローカル推定文面で返す。
    let integrated: IntegratedLearningStatus | null = null;
    if (supabase && userId) {
      try {
        integrated = (await getLatestOrRefreshIntegratedStatus(supabase, userId))
          .status;
      } catch {
        integrated = null;
      }
    }
    return progressText(baseUrl, token, profile, progress, integrated);
  }
  if (text.includes("復習")) {
    return reviewText(baseUrl, token, profile, progress);
  }
  if (text.includes("ヘルプ") || text.toLowerCase() === "help") {
    return helpText();
  }
  return helpText();
}

/** x-line-signature を Channel Secret で検証する。 */
function verifySignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** LINE の reply API へ返信を送る。 */
async function sendReply(
  replyToken: string,
  text: string,
  accessToken: string,
): Promise<void> {
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
  const rawBody = await request.text();

  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  if (isProduction() && !channelSecret) {
    return NextResponse.json(
      { ok: false, error: "line webhook not configured" },
      { status: 503 },
    );
  }

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
    return NextResponse.json({ ok: true });
  }

  const baseUrl = resolveBaseUrl(request);
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "app url not configured" },
      { status: 503 },
    );
  }

  const supabase = getServiceSupabase();
  const events = body.events ?? [];
  const plannedReplies: { replyToken?: string; text: string }[] = [];

  for (const ev of events) {
    if (ev.type === "follow") {
      const { token } = await linkUser(supabase, ev.source?.userId);
      const text = followText(baseUrl, token);
      plannedReplies.push({ replyToken: ev.replyToken, text });
      if (accessToken && ev.replyToken) await sendReply(ev.replyToken, text, accessToken);
      continue;
    }

    if (ev.type === "message" && ev.message?.type === "text") {
      const { userId, token } = await linkUser(supabase, ev.source?.userId);
      const { profile, progress, answers } = await fetchUserState(supabase, userId);
      const text = await buildReplyText(
        ev.message.text ?? "",
        baseUrl,
        token,
        supabase,
        userId,
        profile,
        progress,
        answers,
      );
      plannedReplies.push({ replyToken: ev.replyToken, text });
      if (accessToken && ev.replyToken) await sendReply(ev.replyToken, text, accessToken);
    }
  }

  const response: {
    ok: true;
    replied: boolean;
    plannedReplies?: { replyToken?: string; text: string }[];
  } = { ok: true, replied: Boolean(accessToken) };

  if (!isProduction()) response.plannedReplies = plannedReplies;

  return NextResponse.json(response);
}

// 動作確認用（ブラウザで開いて疎通チェックできるように）。
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "ITパスポート学習コーチ LINE webhook endpoint. Use POST for LINE events.",
    commands: ["はじめる", "今日", "計画", "ロードマップ", "今週", "進捗", "復習", "ヘルプ"],
  });
}
