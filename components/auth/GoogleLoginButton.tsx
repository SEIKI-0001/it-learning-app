"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browserClient";

/**
 * Google ログインボタン。Supabase Auth の signInWithOAuth で Google 認可へ遷移する。
 * 認可後は /auth/callback に戻り、内部ユーザーへ写像される。
 * Supabase 未設定（NEXT_PUBLIC_* 無し）の環境では無効表示にする。
 */
export default function GoogleLoginButton({ next = "/" }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Google ログインは現在利用できません。");
      return;
    }
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next,
    )}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) {
      console.error("signInWithOAuth error:", oauthError.message);
      setError("ログインを開始できませんでした。時間をおいて再度お試しください。");
      setLoading(false);
    }
    // 成功時は Google へリダイレクトするのでここには戻らない。
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-center text-base font-bold text-gray-700 shadow-lg transition active:scale-[0.98] disabled:opacity-60"
      >
        <GoogleMark />
        {loading ? "Google に移動中…" : "Google でログイン"}
      </button>
      {error && (
        <p className="mt-2 text-center text-sm font-semibold text-rose-200">{error}</p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
