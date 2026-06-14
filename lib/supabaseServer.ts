import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * サーバー側専用の Supabase クライアント。
 *
 * - service role キーを使うため、このファイルは絶対にクライアント
 *   （"use client" コンポーネント）から import しないこと。
 * - service role キーは RLS をバイパスするので、API Route からの読み書きに使う。
 * - 環境変数が未設定の場合は null を返す。呼び出し側は null を見て
 *   「Supabase 未設定 → localStorage のみで動く」フォールバックに分岐する。
 */

let cached: SupabaseClient | null | undefined;

export function getServiceSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    cached = null;
    return cached;
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Supabase が設定されているか（API Route 側の早期分岐用）。 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}
