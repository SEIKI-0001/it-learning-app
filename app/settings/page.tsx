"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppState, StudyStyle, UserProfile } from "@/types";
import { STUDY_STYLE_LABELS } from "@/types";
import type { TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import { saveAppState } from "@/lib/storage";
import { useAppState } from "@/lib/useAppState";
import {
  getUserId,
  invalidateProgressBootstrapCache,
  saveProfileToDb,
  saveProgressToDb,
} from "@/lib/userSession";
import {
  havePlanningInputsChanged,
  planningInputsFromProfile,
} from "@/lib/planningInputs";
import { rebuildWeeklyPlanForPlanningChange } from "@/lib/studyPlanner";
import LoadingScreen from "@/components/LoadingScreen";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import AccountLinkSettings from "@/components/settings/AccountLinkSettings";
import FloatingMochitVisibilityControl from "@/components/mochit/FloatingMochitVisibilityControl";
import NotificationSettings from "@/components/settings/NotificationSettings";
import ReferenceBookSummary from "@/components/settings/ReferenceBookSummary";

// 設定変更。オンボーディングで入力した試験予定日・学習可能時間・理解度・苦手分野・
// 学習スタイルを、あとから何度でも変更できるようにする。現在値をプリセットして編集し保存する。
//
// 試験予定日・平日/休日の学習可能時間（planning inputs）の変更は学習計画の再計算イベント。
// DB保存とサーバー側の再計算（統合進捗・立て直し案）の完了を待ち、今週の計画も
// 新しい条件で作り直してから画面遷移する。失敗時は遷移せずエラーを出す。

const WEEKDAY_OPTIONS = [10, 20, 30, 60];
const HOLIDAY_OPTIONS = [15, 30, 60, 120];
const FIELDS: TopicField[] = ["strategy", "management", "technology"];
const STYLES: StudyStyle[] = ["balanced", "weakness", "rush"];
const SAVE_ERROR_MESSAGE =
  "保存できませんでした。通信状況を確認して、もう一度お試しください。";

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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function toggleField(field: TopicField) {
    setWeakFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }

  async function handleSave() {
    if (saving || saved) return;
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
    const planningChanged = havePlanningInputsChanged(
      planningInputsFromProfile(profile),
      planningInputsFromProfile(updated),
    );

    setSaving(true);
    setSaveError(null);

    const userId = getUserId();
    let replanned = planningChanged;
    if (userId) {
      const result = await saveProfileToDb(userId, updated, {
        replan: planningChanged,
      });
      if (!result.ok) {
        setSaving(false);
        setSaveError(SAVE_ERROR_MESSAGE);
        return;
      }
      replanned = planningChanged || result.planningInputsChanged;
    }

    let next: AppState = { ...state, profile: updated };
    if (replanned) {
      // 同じ週でも旧条件の週次計画は維持せず、新しい条件で引き直す。
      next = {
        ...next,
        progress: {
          ...next.progress,
          weeklyPlan: rebuildWeeklyPlanForPlanningChange(next),
        },
      };
      invalidateProgressBootstrapCache();
      if (userId && !(await saveProgressToDb(userId, next.progress))) {
        setSaving(false);
        setSaveError(SAVE_ERROR_MESSAGE);
        return;
      }
    }

    saveAppState(next);
    setSaving(false);
    setSaved(true);
    onSaved(next);
  }

  return (
    <main className="min-h-screen">
      <PageHeader
        back={{ href: "/more", label: "その他" }}
        title="学習プランの設定"
        description="試験日や学習時間はいつでも変更できます。"
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="space-y-7">
          <AccountLinkSettings />
          {/* 試験予定日 */}
          <fieldset>
            <legend className="mb-2 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Icon name="calendar" className="h-4 w-4 text-gray-500" />試験予定日
            </legend>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                まだ決まっていなければ空のままでOK。決めると残り日数から逆算します。
              </p>
              {examDate && (
                <button
                  type="button"
                  onClick={() => setExamDate("")}
                  className="shrink-0 text-xs font-semibold text-gray-500 underline underline-offset-2"
                >
                  クリア
                </button>
              )}
            </div>
          </fieldset>

          {/* 学習可能時間 */}
          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Icon name="clock" className="h-4 w-4 text-gray-500" />1日の学習可能時間
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
            <legend className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Icon name="star" className="h-4 w-4 text-gray-500" />今の理解度は？（0〜5）
            </legend>
            <div className="flex justify-between gap-2">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setConfidence(n)}
                  className={`h-12 flex-1 rounded-lg border text-base font-semibold transition active:scale-[0.97] ${
                    confidence === n
                      ? "border-brand-500 bg-brand-50 text-brand-700"
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
            <legend className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Icon name="puzzle" className="h-4 w-4 text-gray-500" />苦手・不安な分野は？
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
                    className={`rounded-lg border px-4 py-3.5 text-left text-base font-semibold transition active:scale-[0.99] ${
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon
                        name={active ? "circle-check" : "circle"}
                        className={active ? "h-4 w-4 text-brand-600" : "h-4 w-4 text-gray-400"}
                      />
                      {FIELD_LABELS[field]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* 使用参考書（変更・読了の修正は /settings/reference-book） */}
          <ReferenceBookSummary />

          {/* 学習リマインダー（GF-P0-006） */}
          <NotificationSettings />

          <FloatingMochitVisibilityControl />

          {/* 学習スタイル */}
          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Icon name="target" className="h-4 w-4 text-gray-500" />学習スタイルの希望
            </legend>
            <div className="grid grid-cols-1 gap-2.5">
              {STYLES.map((style) => {
                const active = studyStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setStudyStyle(style)}
                    className={`rounded-lg border px-4 py-3.5 text-left text-base font-semibold transition active:scale-[0.99] ${
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {STUDY_STYLE_LABELS[style]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {saveError && (
          <p role="alert" className="mt-9 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {saveError}
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saved || saving}
          className={buttonClass(
            "primary",
            "lg",
            `${saveError ? "mt-3" : "mt-9"} w-full disabled:opacity-60`,
          )}
        >
          {saved ? (
            "保存しました"
          ) : saving ? (
            "保存中…"
          ) : (
            <>
              <Icon name="save" className="h-5 w-5" />
              変更を保存
            </>
          )}
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
      className={`h-12 rounded-lg border text-sm font-semibold transition active:scale-[0.97] ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
