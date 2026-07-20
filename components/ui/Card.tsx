// 共通カード面。白背景 + border の「標準の面」をここで固定する。
// 影は使わない(浮遊要素・モーダル以外は境界線と背景差で区切る)。

import type { HTMLAttributes } from "react";

export function cardClass(extra?: string): string {
  return ["rounded-xl border border-gray-200 bg-white", extra]
    .filter(Boolean)
    .join(" ");
}

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article";
};

export default function Card({ as: Tag = "div", className, ...props }: CardProps) {
  return <Tag className={cardClass(className ?? "p-4")} {...props} />;
}
