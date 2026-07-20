"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { fetchTopicStage, getUserId } from "@/lib/userSession";
import { hasCheckPack } from "@/lib/checkPack";

// /today の「今日のメニュー」に、対象トピックの状態に応じた確認パック導線を出す。
// パックが無いトピックでは何も表示しない。
// ステージが取れないとき（未ログイン・未設定・未記録）は、力試しとして汎用導線を出す。
// 色は段階で塗り分けず、「注意が要る状態(復習・苦手)」だけ柿色で示す。

type Cta = { title: string; body: string; attention?: boolean } | null;

function ctaForStage(stage: string | null): Cta {
  switch (stage) {
    case "basic_understood":
      return {
        title: "関連用語を固めよう",
        body: "基礎はOK。確認パックで用語まで定着させよう。",
      };
    case "terms_stabilizing":
      return {
        title: "確認パックで仕上げ",
        body: "用語の定着チェックへ。次は過去問レベルで本番対応を確かめよう。",
      };
    case "exam_check_pending":
      return {
        title: "過去問レベルに挑戦",
        body: "基礎・用語はOK。過去問レベル問題で「本番対応OK」を取りにいこう。",
      };
    case "review_needed":
      return {
        title: "復習して再チャレンジ",
        body: "確認パックをもう一度受けて、到達度を上げ直そう。",
        attention: true,
      };
    case "weak":
      return {
        title: "苦手を集中復習",
        body: "解説に戻ってから、確認パックで確かめ直そう。",
        attention: true,
      };
    case "exam_ready":
      return {
        title: "本番対応OK",
        body: "仕上がっています。直前期にもう一度確認パックで再確認を。",
      };
    default:
      // not_started / input_guided / check_pending / 未取得
      return {
        title: "確認パックで力試し",
        body: "基礎確認 → 関連用語 → 過去問レベルで、いまの到達度を確かめよう。",
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
      className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition active:scale-[0.99] ${
        cta.attention
          ? "border-accent-200 bg-accent-50 hover:bg-accent-100"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <span className="min-w-0">
        <span
          className={`block text-sm font-semibold ${
            cta.attention ? "text-accent-800" : "text-gray-900"
          }`}
        >
          {cta.title}
        </span>
        <span
          className={`mt-0.5 block text-xs ${
            cta.attention ? "text-accent-700" : "text-gray-500"
          }`}
        >
          {cta.body}
        </span>
      </span>
      <Icon
        name="chevron-right"
        className={`h-4 w-4 shrink-0 ${cta.attention ? "text-accent-600" : "text-gray-300"}`}
      />
    </Link>
  );
}
