import { parseBookOrderFlag, type BookOrderFlag } from "@/lib/studyContext";

/**
 * 参考書順（Book mode）の機能フラグ。サーバー・クライアントで同じ値を使うため NEXT_PUBLIC_。
 * 未設定・不明な値は off（全員アプリ順）。off にして deploy すれば即座に全員アプリ順へ戻る。
 * ビルド時に埋め込まれるので、process.env.NEXT_PUBLIC_BOOK_ORDER_MODE はこの形のまま参照する。
 */
export function bookOrderFlag(): BookOrderFlag {
  return parseBookOrderFlag(process.env.NEXT_PUBLIC_BOOK_ORDER_MODE);
}
