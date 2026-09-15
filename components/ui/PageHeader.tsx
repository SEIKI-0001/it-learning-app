// 共通ページヘッダー。/today・/progress と同じ「白地に淡い青のパネル」で、
// 見出しは太字にせず大きさと字詰めで立てる。tone は互換のために残す（見た目は同じ）。

import type { ReactNode } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

type PageHeaderProps = {
  tone?: "brand" | "plain";
  eyebrow?: string;
  title: string;
  description?: string;
  /** ページ本文と同じ幅に合わせるための max-width クラス */
  widthClass?: string;
  /** タイトル行の右側に置く補助表示（タグ等） */
  accessory?: ReactNode;
  /** 前の画面へ戻る導線。タイトルの上に小さく置く */
  back?: { href: string; label: string };
  children?: ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  widthClass = "max-w-3xl",
  accessory,
  back,
  children,
}: PageHeaderProps) {
  return (
    <header className="pt-3 md:pt-6 lg:pt-8">
      <div className={`mx-auto w-full ${widthClass} px-3 md:px-4`}>
        <div className="rounded-[14px] bg-brand-50 px-[18px] py-5 md:rounded-2xl md:px-7 md:py-6">
          {back && (
            <Link
              href={back.href}
              className="-ml-1 mb-2 inline-flex items-center gap-0.5 text-xs text-gray-600 transition hover:text-gray-900"
            >
              <Icon name="chevron-left" className="h-3.5 w-3.5" />
              {back.label}
            </Link>
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-xs font-medium text-gray-900">{eyebrow}</p>
              )}
              <h1
                className={`${eyebrow ? "mt-2" : ""} text-2xl font-medium leading-snug tracking-[-0.04em] text-gray-900 md:text-[30px]`}
              >
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
      </div>
    </header>
  );
}
