"use client";

import { clearLocalUserData } from "@/lib/userSession";

/**
 * ログアウトリンク。サーバー側の Cookie 破棄（/api/auth/logout）の前に、
 * この端末に残る fequest:* のローカルデータを消去する。
 * 共有端末で次に別アカウントがログインしたとき、前のユーザーの学習状態が
 * 表示されたり DB に書き込まれたりするのを防ぐ。
 */
export default function LogoutLink({ className }: { className?: string }) {
  return (
    <a
      href="/api/auth/logout"
      className={className}
      onClick={() => {
        clearLocalUserData();
      }}
    >
      ログアウト
    </a>
  );
}
