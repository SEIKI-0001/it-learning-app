import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth/currentUser";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { planAccountMerge, type AccountSnapshot } from "@/lib/auth/accountMerge";

export const runtime = "nodejs";
const reply = (value: object, status = 200) => NextResponse.json(value, {
  status, headers: { "Cache-Control": "no-store" },
});
const hash = (code: string) => createHash("sha256").update(code).digest("hex");

export async function GET() {
  const userId = await getInternalUserId();
  if (!userId) return reply({ error: "ログインしてください。" }, 401);
  const db = getServiceSupabase();
  if (!db) return reply({ error: "接続を確認できません。" }, 503);
  const { data, error } = await db.from("line_users")
    .select("line_user_id, auth_user_id").eq("id", userId).single();
  if (error) return reply({ error: "アカウントを確認できません。" }, 503);
  return reply({ line: Boolean(data.line_user_id), google: Boolean(data.auth_user_id) });
}

export async function POST(request: Request) {
  // Session cookies are ambient credentials; require a same-origin browser POST.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ error: "この画面から操作し直してください。" }, 403);
  }
  const userId = await getInternalUserId();
  if (!userId) return reply({ error: "ログインしてください。" }, 401);
  const db = getServiceSupabase();
  if (!db) return reply({ error: "接続を確認できません。" }, 503);
  let body: { action?: string; code?: string };
  try { body = await request.json() as typeof body; }
  catch { return reply({ error: "入力を確認してください。" }, 400); }
  if (body?.action === "create") {
    const code = randomBytes(12).toString("hex").toUpperCase();
    const { error } = await db.rpc("create_account_link_code", { p_user_id: userId, p_hash: hash(code) });
    if (error) return reply({ error: "LINEの学習リンクから開き直してください。連携済みの場合は発行不要です。" }, 409);
    return reply({ code, expiresInMinutes: 10 });
  }
  if (body?.action !== "complete" || typeof body.code !== "string") {
    return reply({ error: "連携コードを入力してください。" }, 400);
  }
  const code = body.code.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-F0-9]{24}$/.test(code)) return reply({ error: "連携コードを確認してください。" }, 400);
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db.rpc("account_link_snapshot", { p_target: userId, p_hash: hash(code) });
    if (error) return reply({ error: "コードの期限が切れたか、このアカウントは連携済みです。Googleでログインし、LINE側で新しいコードを発行してください。" }, 409);
    try {
      const plan = planAccountMerge(data as AccountSnapshot);
      const result = await db.rpc("complete_account_link", {
        p_target: userId, p_hash: hash(code), p_snapshot: data, p_plan: plan,
      });
      if (!result.error) return reply({ ok: true });
      if (result.error.code === "40001") continue;
      if (result.error.message.includes("FINISH_ACTIVE_SESSION")) {
        return reply({ error: "両方の端末で実力診断を終了し、少し待ってからもう一度連携してください。" }, 409);
      }
      throw new Error("MERGE_FAILED");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      const message = reason.includes("BILLING_CONFLICT")
        ? "両方のアカウントに決済情報があります。記録を保護するため、サポートでの確認が必要です。"
        : reason.includes("REFERENCE_BOOK_CONFLICT")
          ? "参考書の設定が異なります。両方で同じ参考書に設定してから連携してください。"
          : "記録を安全に統合できませんでした。記録は変更していません。時間を置いて再度お試しください。";
      return reply({ error: message }, 409);
    }
  }
  return reply({ error: "学習記録が更新されました。両方の端末で学習を止めて、もう一度連携してください。" }, 409);
}
