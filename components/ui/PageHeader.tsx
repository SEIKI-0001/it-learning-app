// 共通ページヘッダー。全ページ白背景 + 下罫線で統一する(グラデーションは使わない)。
// tone="brand" は互換のために残し、eyebrow の色だけをブランド色にする。

import type { ReactNode } from "react";

type PageHeaderProps = {
  tone?: "brand" | "plain";
  eyebrow?: string;
  title: string;
  description?: string;
  /** ページ本文と同じ幅に合わせるための max-width クラス */
  widthClass?: string;
  /** タイトル行の右側に置く補助表示（タグ等） */
  accessory?: ReactNode;
  children?: ReactNode;
};

export default function PageHeader({
  tone = "plain",
  eyebrow,
  title,
  description,
  widthClass = "max-w-3xl",
  accessory,
  children,
}: PageHeaderProps) {
  const isBrand = tone === "brand";
  return (
    <header className="border-b border-gray-200 bg-white px-4 py-5">
      <div className={`mx-auto w-full ${widthClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p
                className={`text-xs font-medium ${
                  isBrand ? "text-brand-600" : "text-gray-500"
                }`}
              >
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
              {title}
            </h1>
          </div>
          {accessory && <div className="shrink-0 pt-1">{accessory}</div>}
        </div>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {description}
          </p>
        )}
        {children}
      </div>
    </header>
  );
}
