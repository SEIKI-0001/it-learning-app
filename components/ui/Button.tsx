// 共通ボタン規約。ページごとに手書きされていたCTAスタイルをここに一本化する。
// <Link> にも同じ見た目を使えるよう、クラス生成関数 buttonClass を公開する。

import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant =
  | "primary" // 画面の主CTA（1画面1つが原則）
  | "secondary" // 主CTAの隣に置く同格未満の行動
  | "soft" // カード内の補助行動（薄い塗り）
  | "warn"; // 復習・リベンジ系の行動（amber）

export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary:
    "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  warn: "bg-accent-600 text-white hover:bg-accent-700",
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
