"use client";

// 無料記録期間（登録から7日）終了の通知バナー。
// 「学習は続けられるが結果は記録されない」ことを伝え、Proプラン購入へ誘導する。
// エンタイトルメントが取得できたときだけ表示する（取得失敗時に誤ロックしない）。

import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { useBillingStatus } from "@/lib/useBillingStatus";

type Props = {
  /** compact: クイズ・単語帳の開始画面向けの小型表示。 */
  variant?: "card" | "compact";
  className?: string;
};

export default function RecordingLockNotice({ variant = "card", className }: Props) {
  const { status } = useBillingStatus();
  const entitlements = status?.entitlements;
  if (!entitlements || entitlements.canRecordStudy) return null;

  if (variant === "compact") {
    return (
      <div
        className={[
          "flex items-center gap-2 rounded-lg border border-accent-200 bg-accent-50 px-3 py-2",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Icon name="lock" className="h-4 w-4 shrink-0 text-accent-700" />
        <p className="min-w-0 flex-1 text-xs font-semibold text-accent-800">
          無料の記録期間が終了しています。結果は記録されません。
        </p>
        <Link
          href="/more#billing"
          className="shrink-0 text-xs font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
        >
          Proで再開
        </Link>
      </div>
    );
  }

  return (
    <section
      className={[
        "rounded-xl border border-accent-200 bg-white p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start gap-3">
        <Icon name="lock" className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900">
            無料の記録期間（7日間）が終了しました
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            学習はこれまでどおり続けられますが、達成度や問題の結果が記録されず、
            進捗管理・合格準備度に反映されません。Proプランで記録を再開できます。
          </p>
          <Link href="/more#billing" className={buttonClass("primary", "sm", "mt-3")}>
            Proプランを見る
          </Link>
        </div>
      </div>
    </section>
  );
}
