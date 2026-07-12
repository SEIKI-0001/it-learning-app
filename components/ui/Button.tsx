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
  "inline-flex items-center justify-center gap-1 font-extrabold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "rounded-2xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700",
  secondary:
    "rounded-2xl bg-white text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50",
  soft: "rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
  warn: "rounded-2xl bg-amber-500 text-white shadow-sm hover:bg-amber-600",
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
