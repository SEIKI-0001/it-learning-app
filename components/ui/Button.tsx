// 共通ボタン規約。ページごとに手書きされていたCTAスタイルをここに一本化する。
// <Link> にも同じ見た目を使えるよう、クラス生成関数 buttonClass を公開する。

import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant =
  | "primary" // 画面の主CTA（1画面1つが原則）。墨色の塗り
  | "secondary" // 主CTAの隣に置く同格未満の行動
  | "soft" // カード内の補助行動（薄い塗り）
  | "warn"; // 復習・リベンジ系の行動（淡い琥珀）

export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-gray-900 text-white hover:bg-black",
  secondary:
    "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  // 塗りの主CTAは墨色だけにするため、復習系は淡い琥珀の面にとどめる
  warn: "bg-accent-50 text-accent-700 hover:bg-accent-100",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return [BASE, VARIANTS[variant], SIZES[size], extra].filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props} />
  );
}
