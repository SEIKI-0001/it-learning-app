import { parseBookOrderFlag, type BookOrderFlag } from "@/lib/studyContext";

/**
 * 参考書順（Book mode）を公開しているか。opt-in = 利用者が設定で選んだときだけ参考書順になる。
 * 既存の利用者が自動で切り替わることはない（希望が未設定ならアプリ順のまま）。
 */
const RELEASED_BOOK_ORDER_MODE: BookOrderFlag = "optin";

/**
 * 参考書順（Book mode）の機能フラグ。サーバー・クライアントで同じ値を使う。
 *
 * 値はビルド時に埋め込まれる（vinext は process.env / .env* の NEXT_PUBLIC_* だけを読む。
 * wrangler.jsonc の vars は実行時の値で、ここには効かない）。そのため公開状態はコードの
 * RELEASED_BOOK_ORDER_MODE で決め、ビルド時の環境変数で上書きできるようにしている。
 *   - 緊急に全員をアプリ順へ戻す: NEXT_PUBLIC_BOOK_ORDER_MODE=off でビルドして deploy
 *   - 恒久的に止める: RELEASED_BOOK_ORDER_MODE を "off" にする
 * process.env.NEXT_PUBLIC_BOOK_ORDER_MODE はビルド時の置換のため、この形のまま参照する。
 */
export function bookOrderFlag(): BookOrderFlag {
  const override = process.env.NEXT_PUBLIC_BOOK_ORDER_MODE;
  return override?.trim() ? parseBookOrderFlag(override) : RELEASED_BOOK_ORDER_MODE;
}
