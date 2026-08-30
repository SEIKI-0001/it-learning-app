"use client";

// 成長確認チャレンジ（GF-P0-003）。
//
// 過去に間違えた／習熟度が低いままの既出問題だけを短く出し直し、
// 「前回 → 今回」で過去の自分と比べる。学習評価の器ではないので:
//   - 出題はすべて既出。question exposure は既存の保存経路が `seen` を維持する
//     （このページは exposure 判定を自前で持たない）。
//   - completeStudySession は呼ばない。XP・バッジ・宝箱・ストリーク・
//     デイリーミッションを一切動かさず、CP 進行にも影響させない。
//   - 記録するのは question_attempts（測定証拠）だけで、既存の分類・重複排除
//     ルールにそのまま乗る。

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserAnswer } from "@/types";
import { useAppState } from "@/lib/useAppState";
import {
  buildGrowthChallenge,
  buildGrowthComparison,
  type GrowthComparison,
} from "@/lib/growthChallenge";
import {
  saveQuestionAttemptsForCurrentSession,
  type QuestionAttemptInput,
} from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";
import GrowthComparisonResult from "@/components/growth/GrowthComparisonResult";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

export default function GrowthCheckPage() {
  const router = useRouter();
  const [state] = useAppState();
  const [comparison, setComparison] = useState<GrowthComparison | null>(null);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  // 出題はマウント時に一度だけ確定させる（解答中に候補が入れ替わらないように）。
  const [challenge] = useState(() => (state ? buildGrowthChallenge({ state }) : []));

  const questions = useMemo(() => challenge.map((item) => item.question), [challenge]);
  const topicByQuestionId = useMemo(
    () => new Map(challenge.map((item) => [item.questionId, item.topicId])),
    [challenge],
  );

  if (state === undefined) return <LoadingScreen />;
  if (state === null) return <LoadingScreen />;

  async function handleComplete(answers: UserAnswer[]) {
    const tagged: UserAnswer[] = answers.map((answer) => ({
      ...answer,
      topicId: topicByQuestionId.get(answer.questionId) ?? answer.topicId,
    }));

    // 比較結果は保存の成否に依らず先に見せる（体験を止めない）。
    setComparison(buildGrowthComparison(challenge, tagged));

    const attempts: QuestionAttemptInput[] = tagged.map((answer) => ({
      questionId: answer.questionId,
      questionType: "topic_quiz",
      topicId: topicByQuestionId.get(answer.questionId) ?? answer.topicId ?? "",
      selectedAnswer: answer.selectedChoice ?? null,
      isCorrect: answer.isCorrect,
      answeredAt: answer.answeredAt,
    }));
    // 既存の保存経路をそのまま通す。初見判定(is_first_attempt)は
    // サーバー側で原子的に決まるため、既出問題がここで初見に戻ることはない。
    try {
      await saveQuestionAttemptsForCurrentSession(attempts, state!.answers);
    } catch {
      // 記録に失敗しても成長確認の体験自体は成立させる。
    }
  }

  // 比較材料が無いユーザーには機能ごと見せない。
  if (challenge.length === 0 && comparison === null) {
    return (
      <main className="min-h-screen pb-24">
        <PageHeader
          back={{ href: "/today", label: "今日の学習へ" }}
          title="成長確認"
          description="過去に解いた問題から、いま解き直せるものを出します。"
        />
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <Icon name="clock" className="mx-auto h-7 w-7 text-gray-400" />
            <p className="mt-3 text-base font-semibold text-gray-900">
              まだ比べられる記録がありません
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              確認問題を解いてしばらく経つと、当時むずかしかった問題を出し直します。
            </p>
            <Link href="/today" className={buttonClass("primary", "lg", "mt-4")}>
              今日の学習へ
            </Link>
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <PageHeader
        back={{ href: "/today", label: "今日の学習へ" }}
        title="成長確認"
        description={
          comparison
            ? "前回の結果と今回の結果をくらべます。"
            : "以前つまずいた問題です。いまならどうでしょう。"
        }
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {comparison ? (
          <>
            <GrowthComparisonResult comparison={comparison} />
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/today" className={buttonClass("primary", "lg")}>
                今日の学習に戻る
              </Link>
              <Link href="/review" className={buttonClass("secondary", "lg")}>
                復習リストを見る
              </Link>
            </div>
            <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
              成長確認の結果は測定データに記録されます。
              バッジやチェックポイントの条件は通常の学習で進みます。
            </p>
          </>
        ) : (
          <TopicQuiz
            topicId={challenge[0].topicId}
            topicIdForQuestion={(question) =>
              topicByQuestionId.get(question.id) ?? challenge[0].topicId
            }
            questions={questions}
            onComplete={handleComplete}
            completeLabel="結果をみる"
          />
        )}
      </div>
      <BottomNav />
    </main>
  );
}
