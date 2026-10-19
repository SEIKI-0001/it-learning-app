"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const questions = [
  "試験日、または受験する時期を決めている",
  "試験日から逆算した学習計画がある",
  "参考書や教材で出題範囲を一通り確認した",
  "章やテーマごとに確認問題を解いている",
  "ストラテジ・マネジメント・テクノロジの苦手分野を把握している",
  "重要用語を繰り返し復習している",
  "過去問または過去問レベルの問題を解いている",
  "間違えた問題を、理由まで確認して解き直している",
  "進捗に合わせて学習計画を修正している",
  "今日やる学習内容が具体的に決まっている",
];

function getResult(score: number) {
  if (score >= 9) {
    return {
      label: "仕上げ段階",
      title: "合格に向けた準備はかなり整っています",
      description:
        "新しい教材を増やすより、苦手分野と誤答の復習に時間を集中させましょう。試験日までの残り日数に合わせて、仕上げの優先順位を明確にする段階です。",
    };
  }

  if (score >= 6) {
    return {
      label: "合格圏を目指せる段階",
      title: "不足している項目を埋めれば、学習効率を上げられます",
      description:
        "全体をやり直す必要はありません。チェックが付かなかった項目を優先し、確認問題・用語復習・過去問演習を一つの計画につなげましょう。",
    };
  }

  return {
    label: "学習設計の見直し段階",
    title: "教材を増やす前に、学習の順番を整理しましょう",
    description:
      "今の状態は能力不足ではなく、計画・理解確認・復習の流れが分断されている可能性があります。まずは試験日と使える時間から、今日やることを決めるのが効果的です。",
  };
}

export default function PassReadinessCheck() {
  const [checked, setChecked] = useState<boolean[]>(() =>
    questions.map(() => false),
  );
  const [showResult, setShowResult] = useState(false);

  const score = useMemo(
    () => checked.filter(Boolean).length,
    [checked],
  );
  const result = getResult(score);

  const toggle = (index: number) => {
    setChecked((current) =>
      current.map((value, itemIndex) =>
        itemIndex === index ? !value : value,
      ),
    );
    setShowResult(false);
  };

  return (
    <section className="rounded-[28px] border border-[#cfe5f2] bg-white p-5 shadow-[0_18px_44px_rgba(22,94,131,0.10)] sm:p-8">
      <div className="flex flex-col gap-3 border-b border-[#d7edf7] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#1b75a6]">無料・登録不要</p>
          <h2 className="mt-2 text-3xl font-black text-[#12384d]">
            10項目の合格準備度チェック
          </h2>
        </div>
        <p className="text-sm font-bold text-slate-600">
          現在のチェック数：{score} / {questions.length}
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {questions.map((question, index) => (
          <label
            key={question}
            className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition sm:p-5 ${
              checked[index]
                ? "border-[#1b75a6] bg-[#e8f5fb]"
                : "border-[#d7edf7] bg-[#fafdff] hover:border-[#89c8e8]"
            }`}
          >
            <input
              type="checkbox"
              checked={checked[index]}
              onChange={() => toggle(index)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#1b75a6]"
            />
            <span className="leading-7 text-slate-800">
              <span className="mr-2 font-black text-[#1b75a6]">
                {String(index + 1).padStart(2, "0")}
              </span>
              {question}
            </span>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowResult(true)}
        className="mt-7 w-full rounded-full bg-[#f7a600] px-6 py-4 text-base font-black text-white transition hover:bg-[#d98f00]"
      >
        診断結果を見る
      </button>

      {showResult && (
        <div className="mt-7 rounded-[24px] bg-[#12384d] p-6 text-white sm:p-8" aria-live="polite">
          <p className="text-sm font-black text-[#ffd36b]">
            {score}点：{result.label}
          </p>
          <h3 className="mt-3 text-2xl font-black leading-snug sm:text-3xl">
            {result.title}
          </h3>
          <p className="mt-4 leading-8 text-[#e6f6fc]">
            {result.description}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/onboarding?source=pass-readiness-check&score=${score}`}
              className="inline-flex justify-center rounded-full bg-[#f7a600] px-7 py-4 font-black text-white transition hover:bg-[#d98f00]"
            >
              この結果から無料学習計画を作る
            </Link>
            <button
              type="button"
              onClick={() => {
                setChecked(questions.map(() => false));
                setShowResult(false);
              }}
              className="inline-flex justify-center rounded-full border border-[#8fc9e6] px-7 py-4 font-black text-white"
            >
              もう一度診断する
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
