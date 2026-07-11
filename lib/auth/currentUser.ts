import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/serverClient";
import {
  LINE_SESSION_COOKIE,
  verifyLineSession,
} from "@/lib/auth/lineSession";
import { resolveInternalUserIdForAuthUser } from "@/lib/auth/userMapping";

/**
 * 現在のリクエストの内部ユーザーID（line_users.id）を解決する共通処理。
 * Server Component / Route Handler の双方から使える（next/headers の Cookie を読む）。
 *
 * 解決順:
 *   1. Google（Supabase Auth）セッション → auth.users.id を line_users へ写像（無ければ作成/紐づけ）。
 *   2. LINE 署名 Cookie（fq_line）。
 *   3. どちらも無ければ null（＝未ログイン）。
 *
 * 各画面/APIはこの 1 箇所だけを呼ぶ（ユーザー解決を散らさない）。
 */
export async function getInternalUserId(): Promise<string | null> {
  return resolveCurrentUser({ fast: false });
}

/**
 * getInternalUserId の高速版。読み取り中心のブートストラップ API 用。
 *
 * getUser()（毎回 Auth サーバーへ往復）の代わりに getClaims() を使う。
 * Supabase が非対称鍵ならローカル署名検証で完結し、往復が丸ごと消える
 * （HS256 のプロジェクトでは supabase-js がサーバー検証へフォールバックするため
 * 従来と同等＝悪化はしない）。トークン失効の反映が最大でトークン寿命ぶん遅れる
 * 可能性があるため、保存系・課金・AI採点など厳格な本人確認が要る API では
 * 使わず getInternalUserId() を使うこと。
 */
export async function getInternalUserIdFast(): Promise<string | null> {
  return resolveCurrentUser({ fast: true });
}

async function resolveCurrentUser(options: { fast: boolean }): Promise<string | null> {
  // 1) Google（Supabase Auth）優先。
  const supabase = await getServerSupabase();
  if (supabase) {
    try {
      const authUser = options.fast
        ? await readAuthUserFromClaims(supabase)
        : await readAuthUserFromServer(supabase);
      if (authUser) {
        // LINE 起点ユーザーが Google ログインした場合は、その既存ユーザーへ紐づける。
        const lineLinkUserId = await readLineCookieUserId();
        const internalId = await resolveInternalUserIdForAuthUser({
          authUserId: authUser.id,
          email: authUser.email,
          lineLinkUserId,
        });
        if (internalId) return internalId;
      }
    } catch {
      // 検証失敗時は LINE / 未ログインへフォールバック。
    }
  }

  // 2) LINE 署名 Cookie。
  const lineUid = await readLineCookieUserId();
  if (lineUid) return lineUid;

  return null;
}

type ResolvedAuthUser = { id: string; email: string | null };

async function readAuthUserFromServer(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>,
): Promise<ResolvedAuthUser | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  return user ? { id: user.id, email: user.email ?? null } : null;
}

async function readAuthUserFromClaims(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>,
): Promise<ResolvedAuthUser | null> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const sub = typeof claims?.sub === "string" ? claims.sub : null;
  if (!sub) return null;
  const email = typeof claims?.email === "string" ? claims.email : null;
  return { id: sub, email };
}

async function readLineCookieUserId(): Promise<string | null> {
  try {
    const store = await cookies();
    return verifyLineSession(store.get(LINE_SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}
