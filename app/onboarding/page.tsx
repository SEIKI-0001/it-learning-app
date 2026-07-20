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
import Icon from "@/components/ui/Icon";

// 初回設定。試験予定日・学習可能時間・理解度・苦手分野・学習スタイルを取得し、
// AIプランナー(lib/aiPlanner.ts)が使えるプロフィールとして保存する。
// 保存後はすぐ今日の学習へ進む。

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
        <p className="text-xs font-medium text-gray-500">初回設定 1/2</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
          あなたに合わせて学習プランを作ります
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          あとから変更できます。気軽に選んでください。
        </p>

        <div className="mt-8 space-y-8">
          {/* 試験予定日 */}
          <fieldset>
            <legend className="mb-2 text-[15px] font-semibold text-gray-900">
              試験予定日
            </legend>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              まだ決まっていなければ空のままでOK。決めると残り日数から逆算します。
            </p>
          </fieldset>

          {/* 学習可能時間 */}
          <fieldset>
            <legend className="mb-3 text-[15px] font-semibold text-gray-900">
              1日の学習可能時間
            </legend>
            <p className="mb-1.5 text-sm text-gray-600">平日</p>
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
            <p className="mb-1.5 mt-3 text-sm text-gray-600">休日</p>
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
            <legend className="mb-3 text-[15px] font-semibold text-gray-900">
              今の理解度は？（0〜5）
            </legend>
            <div className="flex justify-between gap-2">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setConfidence(n)}
                  className={`h-12 flex-1 rounded-lg border text-base tabular-nums transition active:scale-[0.98] ${
                    confidence === n
                      ? "border-brand-600 bg-brand-50 font-semibold text-brand-800"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          {/* 苦手分野 */}
          <fieldset>
            <legend className="mb-1 text-[15px] font-semibold text-gray-900">
              苦手・不安な分野は？
            </legend>
            <p className="mb-3 text-xs text-gray-500">複数選べます（なくてもOK）</p>
            <div className="grid grid-cols-1 gap-2.5">
              {FIELDS.map((field) => {
                const active = weakFields.includes(field);
                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => toggleField(field)}
                    aria-pressed={active}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3.5 text-left text-[15px] transition active:scale-[0.99] ${
                      active
                        ? "border-brand-600 bg-brand-50 font-semibold text-brand-800"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {FIELD_LABELS[field]}
                    {active && (
                      <Icon name="check" className="h-4 w-4 text-brand-700" strokeWidth={2.2} />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* 学習スタイル */}
          <fieldset>
            <legend className="mb-3 text-[15px] font-semibold text-gray-900">
              学習スタイルの希望
            </legend>
            <div className="grid grid-cols-1 gap-2.5">
              {STYLES.map((style) => {
                const active = studyStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setStudyStyle(style)}
                    aria-pressed={active}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3.5 text-left text-[15px] transition active:scale-[0.99] ${
                      active
                        ? "border-brand-600 bg-brand-50 font-semibold text-brand-800"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {STUDY_STYLE_LABELS[style]}
                    {active && (
                      <Icon name="check" className="h-4 w-4 text-brand-700" strokeWidth={2.2} />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="mt-9 w-full rounded-lg bg-brand-600 px-6 py-4 text-base font-semibold text-white transition hover:bg-brand-700 active:scale-[0.99]"
        >
          この内容でプランを作る
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
      aria-pressed={active}
      className={`h-12 rounded-lg border text-sm tabular-nums transition active:scale-[0.98] ${
        active
          ? "border-brand-600 bg-brand-50 font-semibold text-brand-800"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
