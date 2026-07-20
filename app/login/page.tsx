import { redirect } from "next/navigation";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import Mochit from "@/components/mochit/Mochit";
import { getInternalUserId } from "@/lib/auth/currentUser";

// 初回登録・ログインページ。未ログインで Web を開くと proxy がここへ誘導する。
// - 初回は LINE 公式アカウント登録を推奨（初回導線・通知チャネル）。
// - 2回目以降は Google ログインで同じ学習履歴・Pro 権限・単語帳進捗を復元できる。
// 認証セッションは Cookie 管理のため、このページは常に動的に評価する。
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // 既にログイン済みならアプリへ。
  const userId = await getInternalUserId();
  if (userId) redirect("/");

  const sp = await searchParams;
  // オープンリダイレクト防止: アプリ内パスのみ許可。
  const next =
    sp?.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";

  const googleEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const lineUrl = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL?.trim() || "";

  return (
    <main className="min-h-screen bg-brand-800 px-5 py-10 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <span className="mb-6 inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-wide">
          ITパスポート合格支援
        </span>
        <div className="mb-3 flex justify-center" aria-hidden>
          <Mochit size="medium" animation="idle" className="justify-center" />
        </div>
        <h1 className="text-3xl font-bold leading-tight">ITパスポート学習コーチ</h1>
        <p className="mt-3 text-sm leading-relaxed text-brand-100">
          試験日から逆算した学習プランで、ストラテジ・マネジメント・テクノロジの3分野を、
          やさしい言葉と図解・体験で少しずつ進められます。AI採点で「説明できる理解」も確認できます。
        </p>

        {/* ログイン手段 */}
        <div className="mt-8 w-full space-y-3">
          {googleEnabled ? (
            <GoogleLoginButton next={next} />
          ) : (
            <div className="rounded-xl bg-white/12 px-4 py-3 text-sm font-semibold text-brand-100">
              Google ログインは現在準備中です。LINE から始めてください。
            </div>
          )}

          {lineUrl ? (
            <a
              href={lineUrl}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-6 py-4 text-center text-base font-semibold text-white transition active:scale-[0.99]"
            >
              LINE公式アカウントから始める
            </a>
          ) : (
            <div className="rounded-xl bg-white/12 px-4 py-3 text-sm font-semibold text-brand-100">
              LINE公式アカウントのURLが未設定です（NEXT_PUBLIC_LINE_ADD_FRIEND_URL）。
            </div>
          )}
        </div>

        {/* 使い分けの説明 */}
        <div className="mt-7 w-full rounded-xl bg-white/10 px-4 py-4 text-left text-sm leading-relaxed text-brand-50">
          <p className="font-bold text-white">はじめての方へ</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              ① <span className="font-semibold">初回は LINE 登録がおすすめ</span>
              。学習リマインドや今日の案内が LINE に届きます。
            </li>
            <li>
              ② <span className="font-semibold">2回目以降は Google ログイン</span>
              で、Webを直接開いても同じ続きから使えます（学習履歴・復習・単語帳・AI採点 Pro を引き継ぎ）。
            </li>
            <li>
              ③ LINEで始めた方も、あとから Google ログインすれば同じアカウントに紐づきます。
            </li>
          </ul>
        </div>

        <p className="mt-6 text-xs text-brand-200">
          ログインすると学習履歴がアカウントに保存され、機種変更や再アクセスでも続けられます。
        </p>
      </div>
    </main>
  );
}
