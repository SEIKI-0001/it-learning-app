import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/serverClient";
import { getInternalUserId } from "@/lib/auth/currentUser";
import { isAuthEnabled } from "@/lib/auth/lineSession";

export const runtime = "nodejs";

/**
 * GET /api/auth/me
 * 現在のログイン状態を返す（クライアントの表示判定用）。
 * userId は本人の内部IDなので返してよい。
 */
export async function GET() {
  const userId = await getInternalUserId();

  let email: string | null = null;
  let provider: "google" | "line" | null = null;
  if (userId) {
    provider = "line";
    const supabase = await getServerSupabase();
    if (supabase) {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          email = data.user.email ?? null;
          provider = "google";
        }
      } catch {
        /* ignore */
      }
    }
  }

  return NextResponse.json({
    ok: true,
    loggedIn: Boolean(userId),
    userId,
    email,
    provider,
    authEnabled: isAuthEnabled(),
  });
}
