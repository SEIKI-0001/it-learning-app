"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTopicStage, getUserId } from "@/lib/userSession";
import { hasCheckPack } from "@/lib/checkPack";

// /today の「今日のメニュー」に、対象トピックの状態に応じた確認パック導線を出す。
// パックが無いトピックでは何も表示しない。
// ステージが取れないとき（未ログイン・未設定・未記録）は、力試しとして汎用導線を出す。

type Cta = { emoji: string; title: string; body: string; tone: string } | null;

function ctaForStage(stage: string | null): Cta {
  switch (stage) {
    case "basic_understood":
      return {
        emoji: "🗂️",
        title: "関連用語を固めよう",
        body: "基礎はOK。確認パックで用語まで定着させよう。",
        tone: "from-sky-500 to-indigo-600",
      };
    case "terms_stabilizing":
      return {
        emoji: "✅",
        title: "確認パックで仕上げ",
        body: "用語の定着チェックへ。次は過去問レベルで本番対応を確かめよう。",
        tone: "from-indigo-500 to-violet-600",
      };
    case "exam_check_pending":
      return {
        emoji: "🎯",
        title: "過去問レベルに挑戦",
        body: "基礎・用語はOK。過去問レベル問題で「本番対応OK」を取りにいこう。",
        tone: "from-violet-500 to-fuchsia-600",
      };
    case "review_needed":
      return {
        emoji: "🔁",
        title: "復習して再チャレンジ",
        body: "確認パックをもう一度受けて、到達度を上げ直そう。",
        tone: "from-amber-500 to-orange-600",
      };
    case "weak":
      return {
        emoji: "💪",
        title: "苦手を集中復習",
        body: "解説に戻ってから、確認パックで確かめ直そう。",
        tone: "from-rose-500 to-red-600",
      };
    case "exam_ready":
      return {
        emoji: "🏆",
        title: "本番対応OK！",
        body: "仕上がっています。直前期にもう一度確認パックで再確認を。",
        tone: "from-emerald-500 to-teal-600",
      };
    default:
      // not_started / input_guided / check_pending / 未取得
      return {
        emoji: "✅",
        title: "確認パックで力試し",
        body: "基礎確認 → 関連用語 → 過去問レベルで、いまの到達度を確かめよう。",
        tone: "from-indigo-500 to-violet-600",
      };
  }
}

export default function TodayCheckPackCta({ topicId }: { topicId: string }) {
  const [stage, setStage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const userId = getUserId();
    if (!userId) return;
    void fetchTopicStage(userId, topicId).then((s) => {
      if (alive) setStage(s);
    });
    return () => {
      alive = false;
    };
  }, [topicId]);

  if (!hasCheckPack(topicId)) return null;

  const cta = ctaForStage(stage);
  if (!cta) return null;

  return (
    <Link
      href={`/check-pack/${topicId}`}
      className={`block rounded-2xl bg-gradient-to-r ${cta.tone} p-4 text-white shadow-sm transition active:scale-[0.99]`}
    >
      <p className="text-sm font-extrabold">
        {cta.emoji} {cta.title}
      </p>
      <p className="mt-0.5 text-xs text-white/90">{cta.body}</p>
    </Link>
  );
}
