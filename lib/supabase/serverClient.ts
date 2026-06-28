import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * サーバー側（Server Component / Route Handler）の Supabase Auth クライアント。
 *
 * - anon キーのみ使用。認証セッションは next/headers の Cookie 経由で読み書きする。
 * - Server Component からは Cookie を書けない（set は no-op）。トークンのリフレッシュは
 *   proxy.ts が担う（@supabase/ssr の推奨構成）。
 * - service role の読み書きは従来どおり lib/supabaseServer.ts を使う（役割分離）。
 */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component から呼ばれた場合は set 不可。proxy がリフレッシュを担うため無視してよい。
        }
      },
    },
  });
}
