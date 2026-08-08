"use client";

// 公式問題の出典表記。
//
// 「どこまでが IPA の公開物で、どこからが本サービスの著作物か」を問題ごとに明示する。
// 年度別演習と確認パックの両方から使う。公式問題を出題する画面はどこでもこれを出し、
// 表示を省略しないこと。
//
// 出典表記（attribution）自体に年度と問番号が入っている
// （例: "出典：令和8年度 ITパスポート試験 公開問題 問1"）。
// 年度・問番号を別で持っているのは、attribution が空だった場合でも
// 最低限の出典を組み立てられるようにするため。

import type { QuestionOfficialView } from "@/types/content";

/** attribution が空のときに年度・問番号から組み立てる代替表記。 */
function fallbackAttribution(official: QuestionOfficialView): string {
  return `出典：${official.year}年度 公開問題 問${official.questionNumber}`;
}

export default function OfficialQuestionSource({
  official,
}: {
  official: QuestionOfficialView;
}) {
  const attribution = official.attribution.trim() || fallbackAttribution(official);

  return (
    <footer className="border-t border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs text-gray-600">{attribution}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        問題文・選択肢はIPA公開問題です。解説は本サービス独自のものです。
      </p>
      {official.sourceUrl && (
        <a
          href={official.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          IPA公式PDF（問題）を開く
        </a>
      )}
    </footer>
  );
}
