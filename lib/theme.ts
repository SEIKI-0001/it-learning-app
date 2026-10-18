// 画面の配色テーマ。端末ごとに localStorage へ保存する（既定=アイス）。
//   - ice:     氷色の地に白いカード、主ボタンは青（/progress の配色を全画面へ）
//   - classic: 白地に淡い面、主ボタンは墨（2026-09 の配色）
//   - dark:    いまは /progress とナビだけ。他の画面はアイスで表示する
// <html data-theme> に ice / classic を付け、globals.css がそれで色の変数を切り替える。
// 公開ページ（LP・ガイド・解説など）は常に classic（別にデザインしているため）。
// ダークは /progress が表示中だけ <html data-surface="dark"> を付ける（lib/useTheme の useDarkSurface）。
// このファイルはサーバーからも読む（layout の themeBootScript）ので React に依存させない。
// 最初の描画前に付けるため、同じ判定を themeBootScript でも行う（app/layout.tsx）。

import { PUBLIC_PREFIXES } from "@/lib/auth/publicRoutes";

export type ThemePreference = "ice" | "classic" | "dark";
export type DocumentTheme = "ice" | "classic";

export const THEME_STORAGE_KEY = "fequest:theme";
/** 旧版（/progress のライト・ダーク切り替え）の保存先。ダークを選んでいた人は引き継ぐ */
const LEGACY_SCHEME_KEY = "fequest:colorScheme";
const CHANGE_EVENT = "fequest:themeChange";
/** 確認用ページ（テスト環境）は /lp 配下だがアプリ画面として扱う */
const APP_PREVIEW_PREFIX = "/lp/preview";

export const THEME_OPTIONS: { value: ThemePreference; label: string; note: string }[] = [
  { value: "ice", label: "アイス", note: "氷色の地に白いカード" },
  { value: "classic", label: "クラシック", note: "白地に淡い青の面" },
  { value: "dark", label: "ダーク", note: "いまは進捗画面だけ" },
];

function parsePreference(stored: string | null, legacy: string | null): ThemePreference {
  if (stored === "ice" || stored === "classic" || stored === "dark") return stored;
  return legacy === "dark" ? "dark" : "ice";
}

export function readThemePreference(): ThemePreference {
  try {
    return parsePreference(
      window.localStorage.getItem(THEME_STORAGE_KEY),
      window.localStorage.getItem(LEGACY_SCHEME_KEY),
    );
  } catch {
    return "ice";
  }
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    window.localStorage.removeItem(LEGACY_SCHEME_KEY);
  } catch {
    /* 保存できなくても、この表示中は切り替わる */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function isPublicThemePath(pathname: string): boolean {
  if (pathname === APP_PREVIEW_PREFIX || pathname.startsWith(`${APP_PREVIEW_PREFIX}/`)) return false;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** <html data-theme> に付ける値。 */
export function documentThemeFor(preference: ThemePreference, pathname: string): DocumentTheme {
  if (isPublicThemePath(pathname)) return "classic";
  return preference === "classic" ? "classic" : "ice";
}

/** 配色の変更（この画面での保存・他のタブでの保存）を購読する。 */
export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * 最初の描画前に <html data-theme> を付けるスクリプト（app/layout.tsx の <head> に置く）。
 * 判定は documentThemeFor と同じ。読めないときはアイス（公開ページはクラシック）。
 */
export function themeBootScript(): string {
  const prefixes = JSON.stringify(PUBLIC_PREFIXES);
  return `(function(){var d=document.documentElement,p=location.pathname,pre=${prefixes},pv=${JSON.stringify(APP_PREVIEW_PREFIX)};var pub=!(p===pv||p.indexOf(pv+"/")===0)&&pre.some(function(x){return p===x||p.indexOf(x+"/")===0});var t="ice";try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(s==="classic")t="classic";}catch(e){}d.setAttribute("data-theme",pub?"classic":t);})();`;
}
