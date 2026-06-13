"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/types";
import { initializeAppState } from "@/lib/storage";

type OptionGroup = {
  key: keyof Omit<UserProfile, "confidence">;
  label: string;
  emoji: string;
  options: { value: string; label: string }[];
};

const GROUPS: OptionGroup[] = [
  {
    key: "itExperience",
    label: "ITの経験はどれくらい？",
    emoji: "💡",
    options: [
      { value: "none", label: "まったくない" },
      { value: "a-little", label: "少しだけある" },
      { value: "school", label: "学校や授業で触れた" },
    ],
  },
  {
    key: "dailyMinutes",
    label: "1日どれくらい取り組めそう？",
    emoji: "⏱️",
    options: [
      { value: "3", label: "3分" },
      { value: "10", label: "10分" },
      { value: "30", label: "30分" },
    ],
  },
  {
    key: "examPlan",
    label: "基本情報の受験予定は？",
    emoji: "📅",
    options: [
      { value: "decided", label: "決まっている" },
      { value: "undecided", label: "まだ決めていない" },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    confidence: 2,
  });

  const ready =
    profile.itExperience && profile.dailyMinutes && profile.examPlan;

  function select(key: OptionGroup["key"], value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function handleStart() {
    const full: UserProfile = {
      itExperience: profile.itExperience ?? "none",
      dailyMinutes: profile.dailyMinutes ?? "3",
      examPlan: profile.examPlan ?? "undecided",
      confidence: profile.confidence ?? 2,
    };
    initializeAppState(full);
    router.push("/map");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-semibold text-indigo-500">はじめに少しだけ質問</p>
        <h1 className="mt-1 text-2xl font-extrabold text-gray-800">
          あなたに合わせて冒険を準備します
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          正解・不正解はありません。気軽に選んでください。
        </p>

        <div className="mt-8 space-y-7">
          {GROUPS.map((g) => (
            <fieldset key={g.key}>
              <legend className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
                <span aria-hidden>{g.emoji}</span>
                {g.label}
              </legend>
              <div className="grid grid-cols-1 gap-2.5">
                {g.options.map((o) => {
                  const active = profile[g.key] === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => select(g.key, o.value)}
                      className={`rounded-2xl border-2 px-4 py-3.5 text-left text-base font-semibold transition active:scale-[0.99] ${
                        active
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {/* 自信 0〜5 */}
          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
              <span aria-hidden>🌟</span>
              今の自信は？（0〜5）
            </legend>
            <div className="flex justify-between gap-2">
              {[0, 1, 2, 3, 4, 5].map((n) => {
                const active = profile.confidence === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, confidence: n }))}
                    className={`h-12 flex-1 rounded-xl border-2 text-base font-extrabold transition active:scale-[0.97] ${
                      active
                        ? "border-amber-400 bg-amber-100 text-amber-700"
                        : "border-gray-200 bg-white text-gray-500"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={!ready}
          className="mt-9 w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {ready ? "🗺️ マップへ進む" : "すべて選ぶと進めます"}
        </button>
      </div>
    </main>
  );
}
