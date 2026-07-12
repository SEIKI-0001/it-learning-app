// 共通ページヘッダー。
// tone="brand": ホーム系（今日・進捗）のグラデーションヘッダー
// tone="plain": 一覧・参照系（学ぶ・復習・その他）の白ヘッダー
// ページごとに書式がばらけていた eyebrow/タイトル/説明 の構造をここで統一する。

import type { ReactNode } from "react";

type PageHeaderProps = {
  tone?: "brand" | "plain";
  eyebrow?: string;
  title: string;
  description?: string;
  /** ページ本文と同じ幅に合わせるための max-width クラス */
  widthClass?: string;
  /** タイトル行の右側に置く補助表示（ピル等） */
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
    <header
      className={
        isBrand
          ? "bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-5 pt-5 text-white"
          : "border-b border-gray-200 bg-white px-4 py-6"
      }
    >
      <div className={`mx-auto w-full ${widthClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p
                className={`text-xs font-bold ${
                  isBrand ? "text-white/80" : "text-indigo-600"
                }`}
              >
                {eyebrow}
              </p>
            )}
            <h1
              className={`mt-1 text-2xl font-extrabold tracking-tight ${
                isBrand ? "" : "text-gray-900"
              }`}
            >
              {title}
            </h1>
          </div>
          {accessory && <div className="shrink-0 pt-1">{accessory}</div>}
        </div>
        {description && (
          <p
            className={`mt-2 text-sm leading-relaxed ${
              isBrand ? "text-white/90" : "text-gray-600"
            }`}
          >
            {description}
          </p>
        )}
        {children}
      </div>
    </header>
  );
}
