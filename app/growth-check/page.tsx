"use client";

// 成長確認（踊り場・GF-P0-003）。
//
// 主役は「ここまでの成長」の可視化で、既存の学習・復習履歴から導出する。
// 新しく問題を出すのは、比較材料が足りないときの任意ミニチャレンジだけ。
//
// 守る境界:
//   - 復習を常に優先する。復習キュー・期限切れ・高severity弱点のトピックは
//     ミニチャレンジから除外される（lib/growthChallenge が母集団から外す）。
//   - completeStudySession は呼ばない。XP・バッジ・宝箱・ストリーク・
//     デイリーミッション・CP進行を一切動かさない。
//   - ミニチャレンジの記録は既存の保存経路のみ。初見判定は自前で持たない。
//   - CPごとに1回だけ表示する（表示できた時点で記録する）。

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserAnswer } from "@/types";
import { useAppState } from "@/lib/useAppState";
import { saveAppState } from "@/lib/storage";
import { buildCheckpointGate, getCheckpointProgress } from "@/lib/checkpoints";
import {
  buildGrowthEvidence,
  hasSufficientEvidence,
  markGrowthCheckShown,
  type GrowthEvidence,
} from "@/lib/growthCheck";
import {
  buildGrowthChallenge,
  buildGrowthComparison,
  type GrowthChallengeItem,
  type GrowthComparison,
} from "@/lib/growthChallenge";
import {
  getUserId,
  saveProgressToDb,
  saveQuestionAttemptsForCurrentSession,
  type QuestionAttemptInput,
} from "@/lib/userSession";
import TopicQuiz from "@/components/learn/TopicQuiz";
import GrowthEvidenceList from "@/components/growth/GrowthEvidenceList";
import GrowthComparisonResult from "@/components/growth/GrowthComparisonResult";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

export default function GrowthCheckPage() {
  const router = useRouter();
  const [state, setState] = useAppState();
  const [comparison, setComparison] = useState<GrowthComparison | null>(null);
  const [challengeStarted, setChallengeStarted] = useState(false);
  const shownRecordedRef = useRef(false);

  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [router, state]);

  // 表示内容はマウント時に一度だけ確定させる（閲覧中に入れ替わらないように）。
  const [view] = useState<{
    evidence: GrowthEvidence[];
    challenge: GrowthChallengeItem[];
  } | null>(() => {
    if (!state) return null;
    const gate = buildCheckpointGate(state, getCheckpointProgress(state).currentCheckpointId);
    const evidence = buildGrowthEvidence({ state, gate });
    // 材料が十分なら出題しない。足りないときだけ任意ミニチャレンジを添える。
    const challenge = hasSufficientEvidence(evidence)
      ? []
      : buildGrowthChallenge({ state });
    return { evidence, challenge };
  });

  // 実際に成長確認を見せられたCPだけを「表示済み」にする
  // （/today にカードが出ただけでは消費させない）。
  useEffect(() => {
    if (!state || !view || shownRecordedRef.current) return;
    if (view.evidence.length === 0 && view.challenge.length === 0) return;
    shownRecordedRef.current = true;

    const checkpointId = getCheckpointProgress(state).currentCheckpointId;
    const next = markGrowthCheckShown(state, checkpointId);
    if (next === state) return;
    saveAppState(next);
    setState(next);
    const userId = getUserId();
    if (userId) saveProgressToDb(userId, next.progress);
  }, [setState, state, view]);

  if (state === undefined || state === null || view === null) return <LoadingScreen />;

  const { evidence, challenge } = view;

  async function handleComplete(answers: UserAnswer[]) {
    const topicByQuestionId = new Map(challenge.map((item) => [item.questionId, item.topicId]));
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
    // 既存の保存経路をそのまま通す。初見判定(is_first_attempt)はサーバー側で
    // 原子的に決まるため、既出問題がここで初見に戻ることはない。
    try {
      await saveQuestionAttemptsForCurrentSession(attempts, state!.answers);
    } catch {
      // 記録に失敗しても成長確認の体験自体は成立させる。
    }
  }

  // 比較材料が何も無い場合。
  if (evidence.length === 0 && challenge.length === 0) {
    return (
      <main className="min-h-screen pb-24">
        <PageHeader
          back={{ href: "/today", label: "今日の学習へ" }}
          title="ここまでの成長"
          description="これまでの学習記録から、以前と現在をくらべます。"
        />
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <Icon name="clock" className="mx-auto h-7 w-7 text-gray-400" />
            <p className="mt-3 text-base font-semibold text-gray-900">
              まだ比べられる記録がありません
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              学習と復習を続けると、当時との違いをここに出せるようになります。
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
        title="ここまでの成長"
        description="これまでの学習記録から、以前と現在をくらべます。"
      />
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <GrowthEvidenceList evidence={evidence} />

        {comparison && <GrowthComparisonResult comparison={comparison} />}

        {/* 材料が足りないときだけの任意ミニチャレンジ。スキップを同格に置く。 */}
        {challenge.length > 0 && !comparison && (
          <section aria-labelledby="growth-challenge-heading">
            <h2 id="growth-challenge-heading" className="text-base font-semibold text-gray-900">
              もう少し確かめる
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              以前つまずいた{challenge.length}問です。任意なので、スキップしても構いません。
            </p>
            {challengeStarted ? (
              <div className="mt-4">
                <TopicQuiz
                  topicId={challenge[0].topicId}
                  topicIdForQuestion={(question) =>
                    challenge.find((item) => item.questionId === question.id)?.topicId ??
                    challenge[0].topicId
                  }
                  questions={challenge.map((item) => item.question)}
                  onComplete={handleComplete}
                  completeLabel="結果をみる"
                />
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setChallengeStarted(true)}
                  className={buttonClass("primary", "lg")}
                >
                  {challenge.length}問を解いてみる
                </button>
                <Link href="/today" className={buttonClass("secondary", "lg")}>
                  スキップして今日の学習へ
                </Link>
              </div>
            )}
          </section>
        )}

        {(comparison || challenge.length === 0) && (
          <div className="flex flex-col gap-2">
            <Link href="/today" className={buttonClass("primary", "lg")}>
              今日の学習に戻る
            </Link>
            <Link href="/review" className={buttonClass("secondary", "lg")}>
              復習リストを見る
            </Link>
          </div>
        )}

        <p className="text-center text-xs leading-relaxed text-gray-500">
          成長確認は記録をふりかえる機能です。
          バッジやチェックポイントの条件は、通常の学習と復習で進みます。
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
