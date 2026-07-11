import { getServiceSupabase } from "@/lib/supabaseServer";

// auth_user_id → line_users.id のインメモリキャッシュ。
// 一度確立した紐づけは変化しない（auth_user_id は unique・付け替えなし）ため、
// ウォームなサーバーインスタンスでは毎リクエストの line_users 照会を省略できる。
// TTL は保険（アカウント削除などの運用時に自然回復させる）。
const MAPPING_TTL_MS = 10 * 60_000;
const MAPPING_CACHE_MAX = 500;
const mappingCache = new Map<string, { id: string; expiresAt: number }>();

function readCachedMapping(authUserId: string): string | null {
  const hit = mappingCache.get(authUserId);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    mappingCache.delete(authUserId);
    return null;
  }
  return hit.id;
}

function writeCachedMapping(authUserId: string, id: string): void {
  if (mappingCache.size >= MAPPING_CACHE_MAX) {
    const oldest = mappingCache.keys().next().value;
    if (oldest !== undefined) mappingCache.delete(oldest);
  }
  mappingCache.set(authUserId, { id, expiresAt: Date.now() + MAPPING_TTL_MS });
}

/**
 * Supabase Auth（Google）の auth.users.id を、内部ユーザー（line_users.id）へ解決する。
 * service role 専用。サーバー側からのみ使用する。
 *
 * 優先順位:
 *   1. 既に Google 紐づけ済み（auth_user_id 一致）→ そのユーザーを復元。
 *   2. LINE 起点ユーザーへ紐づけ（lineLinkUserId が指す行が未紐づけのときだけ）。
 *   3. どちらも無ければ新規ユーザーを作成（line_user_id NULL ＝ Google 単独）。
 */
export async function resolveInternalUserIdForAuthUser(params: {
  authUserId: string;
  email?: string | null;
  lineLinkUserId?: string | null;
}): Promise<string | null> {
  const { authUserId, email, lineLinkUserId } = params;

  const cached = readCachedMapping(authUserId);
  if (cached) return cached;

  const supabase = getServiceSupabase();
  if (!supabase) return null;

  // 1) 既存の Google 紐づけ。
  const existing = await supabase
    .from("line_users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (existing.data?.id) {
    writeCachedMapping(authUserId, existing.data.id as string);
    return existing.data.id as string;
  }

  // 2) LINE 起点ユーザーへ後付けで紐づけ（auth_user_id が NULL の行のみ＝乗っ取り防止）。
  if (lineLinkUserId) {
    const linked = await supabase
      .from("line_users")
      .update({ auth_user_id: authUserId, email: email ?? null })
      .eq("id", lineLinkUserId)
      .is("auth_user_id", null)
      .select("id")
      .maybeSingle();
    if (linked.data?.id) {
      writeCachedMapping(authUserId, linked.data.id as string);
      return linked.data.id as string;
    }
  }

  // 3) 新規作成。
  const created = await supabase
    .from("line_users")
    .insert({ auth_user_id: authUserId, email: email ?? null })
    .select("id")
    .single();
  if (created.data?.id) {
    writeCachedMapping(authUserId, created.data.id as string);
    return created.data.id as string;
  }

  // 競合（同時ログインで unique 衝突）時は再取得でリカバリ。
  const retry = await supabase
    .from("line_users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (retry.data?.id) {
    writeCachedMapping(authUserId, retry.data.id as string);
    return retry.data.id as string;
  }

  console.error("resolveInternalUserIdForAuthUser failed", created.error);
  return null;
}
