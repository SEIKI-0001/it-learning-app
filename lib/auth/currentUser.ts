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
  // 1) Google（Supabase Auth）優先。
  const supabase = await getServerSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;
      if (authUser) {
        // LINE 起点ユーザーが Google ログインした場合は、その既存ユーザーへ紐づける。
        const lineLinkUserId = await readLineCookieUserId();
        const internalId = await resolveInternalUserIdForAuthUser({
          authUserId: authUser.id,
          email: authUser.email ?? null,
          lineLinkUserId,
        });
        if (internalId) return internalId;
      }
    } catch {
      // getUser 失敗時は LINE / 未ログインへフォールバック。
    }
  }

  // 2) LINE 署名 Cookie。
  const lineUid = await readLineCookieUserId();
  if (lineUid) return lineUid;

  return null;
}

async function readLineCookieUserId(): Promise<string | null> {
  try {
    const store = await cookies();
    return verifyLineSession(store.get(LINE_SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}
