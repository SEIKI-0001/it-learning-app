"use client";

import { useState, useSyncExternalStore } from "react";
import type { CheckQuestion } from "@/types/content";
import TopicQuiz from "@/components/learn/TopicQuiz";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

// 公開解説（/kaisetsu、未ログイン）の確認問題。
// 出題・正誤・解説はアプリのレッスンと同じ TopicQuiz をそのまま使い、
// 解き終えたあとの処理だけを差し替える: 進捗・解答履歴・XP・報酬は保存せず、
// その場で結果を見せて「記録するなら登録」と案内する（アプリ側は TopicCompletionQuiz）。
// ここから保存・認証が要る API を呼ばないこと（未ログインの人が開くページ）。

// TopicQuiz は選択肢を描画時に乱数で並べ替えるので、サーバ描画すると表示がずれる
// （アプリ側は進捗の読み込み後に出すので起きない）。ブラウザで描画されてから出す。
const noopSubscribe = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const MEMBER_FEATURES = [
  "学習履歴と、テーマごとの習熟度の記録",
  "苦手分野の分析と、復習のタイミングの提案",
  "試験日から逆算した学習計画",
  "合格準備度の見える化",
] as const;

export default function PublicTopicQuiz({
  topicId,
  questions,
  lessonHref,
}: {
  topicId: string;
  questions: CheckQuestion[];
  /** ログイン後に同じテーマを続きから学べるアプリ内レッスンのURL */
  lessonHref: string;
}) {
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  // もう一度解くときは TopicQuiz を作り直して最初の問題から（選択肢も並べ直される）。
  const [round, setRound] = useState(0);
  const mounted = useMounted();

  if (questions.length === 0) return null;

  if (!mounted) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-500">
        確認問題を読み込んでいます...
      </div>
    );
  }

  if (!result) {
    return (
      <TopicQuiz
        key={round}
        topicId={topicId}
        questions={questions}
        askMochit={false}
        completeLabel="結果を見る"
        onComplete={(answers) =>
          setResult({
            correct: answers.filter((a) => a.isCorrect).length,
            total: answers.length,
          })
        }
      />
    );
  }

  const perfect = result.correct === result.total;
  const loginHref = `/login?next=${encodeURIComponent(lessonHref)}`;

  return (
    <div className="animate-pop-in space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <Icon
          name={perfect ? "award" : "circle-check"}
          className="mx-auto h-6 w-6 text-emerald-600"
        />
        <p className="mt-2 text-base font-semibold text-emerald-800">
          {perfect ? "全問正解！おつかれさまでした" : "おつかれさまでした"}
        </p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-700">
          {result.total}問中 {result.correct}問正解
        </p>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setRound((n) => n + 1);
          }}
          className="mt-3 text-sm font-bold text-emerald-700 underline underline-offset-4"
        >
          もう一度解く
        </button>
      </div>

      <div className="rounded-xl border border-brand-200 bg-white p-5">
        <p className="text-base font-bold leading-snug text-gray-900">
          この学習結果を記録して、合格までの学習を最適化しませんか？
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
          いまの結果はこのページを閉じると残りません。無料登録すると、続きをアプリで記録できます。
        </p>
        <ul className="mt-3 space-y-1.5">
          {MEMBER_FEATURES.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm text-gray-700">
              <Icon name="circle-check" className="mt-0.5 h-4 w-4 flex-none text-brand-600" />
              {feature}
            </li>
          ))}
        </ul>
        <a href={loginHref} className={buttonClass("primary", "lg", "mt-4 w-full")}>
          無料で登録して記録する
        </a>
        <p className="mt-2 text-center text-xs text-gray-500">
          ログイン後は、アプリのこのテーマのレッスンから続けられます。
        </p>
      </div>
    </div>
  );
}
