"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ブラウザ側の Supabase Auth クライアント（Google ログイン用）。
 *
 * - anon キーのみ使用（公開可）。service role は絶対に使わない。
 * - 認証セッションは @supabase/ssr が Cookie で管理する（proxy がリフレッシュ）。
 * - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 未設定なら null。
 *   呼び出し側（ログインボタン）は null を見て「Google ログイン無効」を表示する。
 */
let cached: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    cached = null;
    return cached;
  }
  cached = createBrowserClient(url, anon);
  return cached;
}
