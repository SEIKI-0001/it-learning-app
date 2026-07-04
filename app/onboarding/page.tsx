"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudyStyle, UserProfile } from "@/types";
import { STUDY_STYLE_LABELS } from "@/types";
import type { TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import { initializeAppState, saveAppState } from "@/lib/storage";
import {
  getUserId,
  readTokenFromUrl,
  resolveToken,
  saveProfileToDb,
  saveProgressToDb,
  setUserId,
} from "@/lib/userSession";

// 初回設定。試験予定日・学習可能時間・理解度・苦手分野・学習スタイルを取得し、
// AIプランナー(lib/aiPlanner.ts)が使えるプロフィールとして保存する。

const WEEKDAY_OPTIONS = [10, 20, 30, 60];
const HOLIDAY_OPTIONS = [15, 30, 60, 120];
const FIELDS: TopicField[] = ["strategy", "management", "technology"];
const STYLES: StudyStyle[] = ["balanced", "weakness", "rush"];

export default function OnboardingPage() {
  const router = useRouter();
  const [examDate, setExamDate] = useState<string>("");
  const [weekdayMinutes, setWeekdayMinutes] = useState<number>(20);
  const [holidayMinutes, setHolidayMinutes] = useState<number>(60);
  const [confidence, setConfidence] = useState<number>(2);
  const [weakFields, setWeakFields] = useState<TopicField[]>([]);
  const [studyStyle, setStudyStyle] = useState<StudyStyle>("balanced");

  // LINE 経由(?t=トークン)ならユーザーを解決。設定済みならダッシュボードへ。
  useEffect(() => {
    const token = readTokenFromUrl();
    if (!token) return;
    void resolveToken(token).then((resolved) => {
      if (!resolved?.userId) return;
      setUserId(resolved.userId);
      if (resolved.appState?.profile) {
        saveAppState(resolved.appState);
        router.replace("/");
      }
    });
  }, [router]);

  function toggleField(field: TopicField) {
    setWeakFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }

  function handleStart() {
    const full: UserProfile = {
      // 新フィールド
      examDate: examDate || undefined,
      planStartDate: new Date().toISOString().slice(0, 10), // ロードマップの経過日数の基点
      weekdayMinutes,
      holidayMinutes,
      confidence,
      weakFields,
      studyStyle,
      // 旧フィールド(互換)
      itExperience: "none",
      dailyMinutes: String(weekdayMinutes),
      examPlan: examDate ? "decided" : "undecided",
    };
    const initial = initializeAppState(full);

    const userId = getUserId();
    if (userId) {
      saveProfileToDb(userId, full);
      saveProgressToDb(userId, initial.progress);
    }

    router.push("/today");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8">
      <div className="mx-auto w-full max-w-md md:max-w-xl">
        <p className="text-sm font-semibold text-indigo-500">初回設定</p>
        <h1 className="mt-1 text-2xl font-extrabold text-gray-800">
          あなたに合わせて学習プランを作ります
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          あとから変更できます。気軽に選んでください。
        </p>

        <div className="mt-8 space-y-7">
          {/* 試験予定日 */}
          <fieldset>
            <legend className="mb-2 flex items-center gap-2 text-base font-bold text-gray-800">
              <span aria-hidden>📅</span>試験予定日
            </legend>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5 text-base font-semibold text-gray-700"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              まだ決まっていなければ空のままでOK。決めると残り日数から逆算します。
            </p>
          </fieldset>

          {/* 学習可能時間 */}
          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
              <span aria-hidden>⏱️</span>1日の学習可能時間
            </legend>
            <p className="mb-1.5 text-sm font-semibold text-gray-600">平日</p>
            <div className="grid grid-cols-4 gap-2">
              {WEEKDAY_OPTIONS.map((m) => (
                <MinuteButton
                  key={m}
                  active={weekdayMinutes === m}
                  onClick={() => setWeekdayMinutes(m)}
                  label={`${m}分`}
                />
              ))}
            </div>
            <p className="mb-1.5 mt-3 text-sm font-semibold text-gray-600">休日</p>
            <div className="grid grid-cols-4 gap-2">
              {HOLIDAY_OPTIONS.map((m) => (
                <MinuteButton
                  key={m}
                  active={holidayMinutes === m}
                  onClick={() => setHolidayMinutes(m)}
                  label={`${m}分`}
                />
              ))}
            </div>
          </fieldset>

          {/* 現在の理解度 */}
          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
              <span aria-hidden>🌟</span>今の理解度は？（0〜5）
            </legend>
            <div className="flex justify-between gap-2">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setConfidence(n)}
                  className={`h-12 flex-1 rounded-xl border-2 text-base font-extrabold transition active:scale-[0.97] ${
                    confidence === n
                      ? "border-amber-400 bg-amber-100 text-amber-700"
                      : "border-gray-200 bg-white text-gray-500"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          {/* 苦手分野 */}
          <fieldset>
            <legend className="mb-1 flex items-center gap-2 text-base font-bold text-gray-800">
              <span aria-hidden>🧩</span>苦手・不安な分野は？
            </legend>
            <p className="mb-3 text-xs text-gray-400">複数選べます（なくてもOK）</p>
            <div className="grid grid-cols-1 gap-2.5">
              {FIELDS.map((field) => {
                const active = weakFields.includes(field);
                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => toggleField(field)}
                    className={`rounded-2xl border-2 px-4 py-3.5 text-left text-base font-semibold transition active:scale-[0.99] ${
                      active
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {active ? "☑ " : "　"}
                    {FIELD_LABELS[field]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* 学習スタイル */}
          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
              <span aria-hidden>🎯</span>学習スタイルの希望
            </legend>
            <div className="grid grid-cols-1 gap-2.5">
              {STYLES.map((style) => {
                const active = studyStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setStudyStyle(style)}
                    className={`rounded-2xl border-2 px-4 py-3.5 text-left text-base font-semibold transition active:scale-[0.99] ${
                      active
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {STUDY_STYLE_LABELS[style]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="mt-9 w-full rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.98]"
        >
          📖 今日の学習へ進む
        </button>
      </div>
    </main>
  );
}

function MinuteButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded-xl border-2 text-sm font-bold transition active:scale-[0.97] ${
        active
          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
          : "border-gray-200 bg-white text-gray-500"
      }`}
    >
      {label}
    </button>
  );
}
