// 共通カード面。白背景 + ring-gray-100 + shadow-sm の「標準の面」をここで固定する。

import type { HTMLAttributes } from "react";

export function cardClass(extra?: string): string {
  return ["rounded-2xl bg-white shadow-sm ring-1 ring-gray-100", extra]
    .filter(Boolean)
    .join(" ");
}

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article";
};

export default function Card({ as: Tag = "div", className, ...props }: CardProps) {
  return <Tag className={cardClass(className ?? "p-4")} {...props} />;
}
