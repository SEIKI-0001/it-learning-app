import type { QuestResult } from "@/types";
import LevelBadge from "@/components/LevelBadge";

// 今日のひとことメッセージ（正答率でやさしく出し分け）
function buildMessage(r: QuestResult): string {
  const rate = r.totalCount > 0 ? r.correctCount / r.totalCount : 0;
  if (r.allDaysCleared) {
    return "7日間、本当によくがんばりました。気づけばIT用語が少し身近になっているはずです。";
  }
  if (rate === 1) return "全問正解！この調子なら、明日のステージもきっと楽しめます。";
  if (rate >= 0.5) return "いい感じです。間違えたところは、明日また少しずつ思い出せば大丈夫。";
  return "今日はここまでで十分。1問でも触れたことが、ちゃんと前進です。";
}

export default function ResultSummary({ result }: { result: QuestResult }) {
  return (
    <div className="space-y-4">
      {/* 見出し */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-center text-white shadow-md">
        <p className="text-sm font-medium text-indigo-100">
          Day {result.dayNo}・{result.stageName}
        </p>
        <p className="mt-1 text-2xl font-extrabold">
          {result.isBoss ? "ボス城クリア！" : "クエスト達成！"}
        </p>
        {result.allDaysCleared && (
          <p className="animate-pop-in mt-3 inline-block rounded-full bg-amber-300 px-4 py-1.5 text-sm font-extrabold text-amber-900">
            🏆 7日間体験クリア！
          </p>
        )}
      </div>

      {/* スコア */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-xs font-semibold text-gray-400">正解数</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-800">
            {result.correctCount}
            <span className="text-base font-bold text-gray-400">
              {" "}/ {result.totalCount}
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-xs font-semibold text-gray-400">獲得EXP</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-500">
            +{result.expGained}
          </p>
        </div>
      </div>

      {/* レベル */}
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <span className="text-sm font-semibold text-gray-500">現在のレベル</span>
        <div className="flex items-center gap-2">
          {result.leveledUp && (
            <span className="animate-pop-in rounded-full bg-amber-100 px-2 py-0.5 text-xs font-extrabold text-amber-700">
              ⬆ レベルアップ！
            </span>
          )}
          <LevelBadge level={result.level} />
        </div>
      </div>

      {/* 苦手タグ */}
      {result.weakTagsThisRound.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-gray-500">
            今回ちょっと苦手だったテーマ
          </p>
          <div className="flex flex-wrap gap-2">
            {result.weakTagsThisRound.map((t) => (
              <span
                key={t}
                className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600"
              >
                {t}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            苦手は誰にでもあります。明日また少し触れれば自然と慣れていきます。
          </p>
        </div>
      )}

      {/* 今日のひとこと */}
      <div className="rounded-2xl bg-indigo-50 p-4">
        <p className="text-sm font-bold text-indigo-700">今日のひとこと</p>
        <p className="mt-1 text-sm leading-relaxed text-indigo-900/80">
          {buildMessage(result)}
        </p>
      </div>
    </div>
  );
}
