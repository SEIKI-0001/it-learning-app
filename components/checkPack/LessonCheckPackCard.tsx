"use client";

import Link from "next/link";
import {
  CheckPackHistoryLine,
  useCheckPackHistory,
} from "@/components/checkPack/CheckPackHistory";

// レッスン末尾の「仕上げ」導線。受けたことがあれば前回の日付と結果も出す。
export default function LessonCheckPackCard({ topicId }: { topicId: string }) {
  const history = useCheckPackHistory(topicId);
  return (
    <Link
      href={`/check-pack/${topicId}`}
      className="block rounded-xl bg-brand-50 p-4 transition hover:bg-brand-100 active:scale-[0.99]"
    >
      <p className="text-xs font-semibold text-brand-700">仕上げ</p>
      <p className="mt-1 text-[15px] font-semibold leading-snug text-gray-900">
        {history ? "確認パックをもう一度受ける" : "確認パックを受ける"}
      </p>
      <p className="mt-1 text-sm text-gray-600">基礎確認から過去問レベルまで解いて、本番対応OKを目指します。</p>
      <CheckPackHistoryLine entry={history} className="mt-2" />
    </Link>
  );
}
