"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AppState, StudyStyle, UserProfile } from "@/types";
import { STUDY_STYLE_LABELS } from "@/types";
import type { TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import { saveAppState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";
import { getUserId, saveProfileToDb } from "@/lib/userSession";
import LoadingScreen from "@/components/LoadingScreen";

// 設定変更。オンボーディングで入力した試験予定日・学習可能時間・理解度・苦手分野・
// 学習スタイルを、あとから何度でも変更できるようにする。現在値をプリセットして編集し保存する。

const WEEKDAY_OPTIONS = [10, 20, 30, 60];
const HOLIDAY_OPTIONS = [15, 30, 60, 120];
const FIELDS: TopicField[] = ["strategy", "management", "technology"];
const STYLES: StudyStyle[] = ["balanced", "weakness", "rush"];

export default function SettingsPage() {
  const router = useRouter();
  const [state, setState] = useAppState();

  // 未設定(未オンボーディング)なら設定画面ではなくオンボーディングへ。
  useEffect(() => {
    if (state === null) router.replace("/onboarding");
  }, [state, router]);

  if (state === undefined) {
    return <LoadingScreen />;
  }
  if (state === null || !state.profile) return null;

  // プロフィール読込後にフォームをマウントし、現在値を useState 初期値に反映する
  // （effect 内での setState を避けるためキー付き子コンポーネントに分離）。
  return (
    <SettingsForm
      state={state}
      onSaved={(next) => {
        setState(next);
        router.push("/");
      }}
    />
  );
}

function SettingsForm({
  state,
  onSaved,
}: {
  state: AppState;
  onSaved: (next: AppState) => void;
}) {
  const profile = state.profile!;
  const [examDate, setExamDate] = useState<string>(profile.examDate ?? "");
  const [weekdayMinutes, setWeekdayMinutes] = useState<number>(
    profile.weekdayMinutes ?? 20,
  );
  const [holidayMinutes, setHolidayMinutes] = useState<number>(
    profile.holidayMinutes ?? 60,
  );
  const [confidence, setConfidence] = useState<number>(profile.confidence ?? 2);
  const [weakFields, setWeakFields] = useState<TopicField[]>(
    profile.weakFields ?? [],
  );
  const [studyStyle, setStudyStyle] = useState<StudyStyle>(
    profile.studyStyle ?? "balanced",
  );
  const [saved, setSaved] = useState(false);

  function toggleField(field: TopicField) {
    setWeakFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }

  function handleSave() {
    const updated: UserProfile = {
      ...profile,
      examDate: examDate || undefined,
      weekdayMinutes,
      holidayMinutes,
      confidence,
      weakFields,
      studyStyle,
      // 旧フィールド(互換)も現在値に追従させる。
      dailyMinutes: String(weekdayMinutes),
      examPlan: examDate ? "decided" : "undecided",
    };
    const next = { ...state, profile: updated };
    saveAppState(next);

    const userId = getUserId();
    if (userId) saveProfileToDb(userId, updated);

    setSaved(true);
    onSaved(next);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8">
      <div className="mx-auto w-full max-w-md md:max-w-xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-500">設定の変更</p>
          <Link
            href="/"
            className="text-sm font-medium text-gray-400 underline underline-offset-4"
          >
            もどる
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-gray-800">
          学習プランの設定
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          試験日や学習時間はいつでも変更できます。
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
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-base font-semibold text-gray-700"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                まだ決まっていなければ空のままでOK。決めると残り日数から逆算します。
              </p>
              {examDate && (
                <button
                  type="button"
                  onClick={() => setExamDate("")}
                  className="shrink-0 text-xs font-semibold text-gray-400 underline underline-offset-2"
                >
                  クリア
                </button>
              )}
            </div>
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
                  className={`h-12 flex-1 rounded-xl border-2 text-base font-bold transition active:scale-[0.97] ${
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
                    className={`rounded-xl border-2 px-4 py-3.5 text-left text-base font-semibold transition active:scale-[0.99] ${
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-700"
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
                    className={`rounded-xl border-2 px-4 py-3.5 text-left text-base font-semibold transition active:scale-[0.99] ${
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-700"
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
          onClick={handleSave}
          disabled={saved}
          className="mt-9 w-full rounded-xl bg-brand-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
        >
          {saved ? "保存しました" : "💾 変更を保存"}
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
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-gray-200 bg-white text-gray-500"
      }`}
    >
      {label}
    </button>
  );
}
