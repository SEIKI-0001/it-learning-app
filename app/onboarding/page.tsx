"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { AppState, StudyStyle, UserProfile } from "@/types";
import { STUDY_STYLE_LABELS } from "@/types";
import type { TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import { buildInitialAppState, initializeAppState } from "@/lib/storage";
import { getUserId, saveProfileToDb, saveProgressToDb } from "@/lib/userSession";
import { useAppState } from "@/lib/useAppState";
import { reachFirstRunStep } from "@/lib/growth/funnelClient";
import Icon from "@/components/ui/Icon";
import ReferenceBookPicker from "@/components/reference/ReferenceBookPicker";
import { bookOrderFlag } from "@/lib/bookOrderFlag";
import { shareReferenceBookChoice } from "@/lib/referenceBookCatalogClient";
import { getAllTopics, getTopic } from "@/lib/content";
import { generateLearningPlan } from "@/lib/studyPlanner";
import { projectStudyTime, type StudyTimeProjection } from "@/lib/onboardingProjection";
import CoachBubble from "@/components/onboarding/CoachBubble";
import ProjectionMeter from "@/components/onboarding/ProjectionMeter";
import PlanReveal, { type PlanSummary } from "@/components/onboarding/PlanReveal";
import "@/components/onboarding/onboarding.css";
import { buildBookStudyOrder } from "@/lib/bookStudyOrder";
import { assessBookQuality } from "@/lib/bookQuality";
import {
  referenceBookFromChoice,
  referenceBookType,
  type ReferenceBookChoice,
} from "@/lib/referenceBookPresets";
import { loadReferenceBook, switchReferenceBook } from "@/lib/referenceBook";
import { persistReferenceBook } from "@/lib/referenceBookSync";
import { FIRST_RUN_GUIDE_HREF } from "@/lib/firstRunGuide";
import { resolveExamDateChoice, type ExamDateChoice } from "@/lib/examDateChoice";
import ExamDateField from "@/components/settings/ExamDateField";

// 初回設定。試験予定日・学習可能時間・理解度・苦手分野・学習スタイル・使用する参考書を取得し、
// AIプランナー(lib/aiPlanner.ts)が使えるプロフィールとして保存する。
// 1画面1問のステップ形式。どの問いも既定値があるので「残りはおまかせで始める」で途中からでも完了できる。
// 演出は他サービスの定番に倣う: モチットが質問して選ぶとひと言返す（Duolingo）、選んでいる間に
// 試験日までの見通しが動く・最後に「プランを作っています」→「あなたのプラン」（Noom）。
// 保存は「プランを作る」の時点で済ませ、結果画面のボタンで今日の学習へ進む。
// 参考書は UserProfile に持たず、既存の ReferenceBook（localStorage＋user_reference_books）を正とする。
// 「あとで設定する」でも完了できる（未設定でも referenceHints のキーワード案内で学習できる）。

const WEEKDAY_OPTIONS = [10, 20, 30, 60];
const HOLIDAY_OPTIONS = [15, 30, 60, 120];
const FIELDS: TopicField[] = ["strategy", "management", "technology"];
const STYLES: StudyStyle[] = ["balanced", "weakness", "rush"];

export default function OnboardingPage() {
  const router = useRouter();
  // 既定は「未定」（3か月後を仮の試験日に）。選ばなくても逆算できる状態で始める。
  const [examChoice, setExamChoice] = useState<ExamDateChoice | null>({ kind: "undecided" });
  const [weekdayMinutes, setWeekdayMinutes] = useState<number>(20);
  const [holidayMinutes, setHolidayMinutes] = useState<number>(60);
  const [confidence, setConfidence] = useState<number>(2);
  const [weakFields, setWeakFields] = useState<TopicField[]>([]);
  const [studyStyle, setStudyStyle] = useState<StudyStyle>("balanced");
  const [bookChoice, setBookChoice] = useState<ReferenceBookChoice>({ kind: "later" });
  // 参考書の順で進めるか（機能フラグが on で、順番の背骨に使える本のときだけ聞く。既定は OFF）。
  const [followBook, setFollowBook] = useState(false);
  const bookOrderOffered = (() => {
    if (bookOrderFlag() !== "optin") return false;
    const candidate = referenceBookFromChoice(bookChoice);
    if (!candidate) return false;
    return assessBookQuality(buildBookStudyOrder(candidate, getAllTopics()), getAllTopics(), {
      bookType: referenceBookType(candidate),
    }).eligible;
  })();

  // 設定済みのユーザーはダッシュボードへ（LINE 経由の ?t=トークンも useAppState が解決する）。
  // ログイン済みの人が体験ページの「登録」から来ても、既存のプランを作り直させない。
  const [appState] = useAppState();
  const startingRef = useRef(false);
  // ?preview=1 は設定済みの人が画面を確かめるための表示専用モード（何も保存しない・計測しない）。
  const preview = useSyncExternalStore(noopSubscribe, isPreviewMode, () => false);
  useEffect(() => {
    if (startingRef.current || preview) return;
    if (appState?.profile) router.replace("/today");
    // 設定がまだ無い人にフォームを出した時点から、最初の学習問題までを数える。
    else if (appState === null) reachFirstRunStep("onboarding_view");
  }, [router, appState, preview]);

  function toggleField(field: TopicField) {
    setWeakFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }

  function buildProfile(): UserProfile {
    const exam = resolveExamDateChoice(examChoice);
    return {
      // 新フィールド
      examDate: exam.examDate,
      planStartDate: new Date().toISOString().slice(0, 10), // ロードマップの経過日数の基点
      weekdayMinutes,
      holidayMinutes,
      confidence,
      weakFields,
      studyStyle,
      // 旧フィールド(互換)
      itExperience: "none",
      dailyMinutes: String(weekdayMinutes),
      examPlan: exam.examPlan,
      ...(bookOrderOffered && followBook ? { studyOrderPreference: "book" as const } : {}),
    };
  }

  // 選んでいる最中の見通し（試験日までに使える時間と合格の目安）。
  const draftExam = resolveExamDateChoice(examChoice);
  const projection = projectStudyTime({
    examDate: draftExam.examDate,
    weekdayMinutes,
    holidayMinutes,
  });

  // 保存は「プランを作る」を押した時点で済ませ、演出の途中で離脱しても設定は残す。
  const [summary, setSummary] = useState<PlanSummary | null>(null);
  function handleStart() {
    startingRef.current = true;
    const full = buildProfile();
    // 確認用の表示では、既存のプラン・進捗を上書きしない（再設定で進捗が初期化される事故があった）。
    const previewOnly = isPreviewMode();
    const initial = previewOnly ? buildInitialAppState(full) : initializeAppState(full);

    if (!previewOnly) {
      const userId = getUserId();
      if (userId) {
        void saveProfileToDb(userId, full);
        saveProgressToDb(userId, initial.progress);
      }

      // 参考書は既存の保存経路（端末＋ログイン時は DB）へ。「あとで」なら何もしない。
      const book = referenceBookFromChoice(bookChoice);
      if (book) {
        const saved = persistReferenceBook(
          switchReferenceBook(loadReferenceBook(), book, { keepHistory: true }),
        );
        // 目次を読み取って登録した章立ては共有カタログへ（ログイン中のみ）。カタログを使ったら利用回数を数える。
        shareReferenceBookChoice(bookChoice, saved);
      }
      reachFirstRunStep("onboarding_complete");
    }

    setSummary({
      examDate: full.examDate ?? null,
      provisional: full.examPlan === "provisional",
      weekdayMinutes,
      holidayMinutes,
      projection: projectStudyTime(full),
      firstTopicTitle: firstTopicTitle(initial),
    });
    window.scrollTo({ top: 0 });
  }

  function openToday() {
    // 設定直後の Today で、実画面の上に初回操作ガイドを重ねる。
    router.push(FIRST_RUN_GUIDE_HREF);
  }

  // 1画面1問で進める。どの問いも既定値が入っているので「次へ」は常に押せる。
  const [step, setStep] = useState(0);
  const last = ONBOARDING_STEPS.length - 1;
  const current = ONBOARDING_STEPS[step];
  function go(next: number) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  if (summary) {
    return (
      <main className="flex min-h-screen flex-col bg-white">
        <PlanReveal summary={summary} onStart={openToday} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-xl items-center gap-3 px-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              aria-label="前の質問へ"
              className="-ml-1.5 rounded p-1.5 text-gray-500 hover:text-gray-900"
            >
              <Icon name="chevron-left" className="h-5 w-5" />
            </button>
          ) : (
            <span className="text-sm font-semibold text-gray-900">初回設定</span>
          )}
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-label="初回設定の進み具合"
            aria-valuemin={1}
            aria-valuemax={ONBOARDING_STEPS.length}
            aria-valuenow={step + 1}
          >
            <div
              className="h-full rounded-full bg-gray-900 transition-[width] duration-300"
              style={{ width: `${((step + 1) / ONBOARDING_STEPS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-gray-500">
            {step + 1}/{ONBOARDING_STEPS.length}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl flex-1 px-4 pb-8 pt-6">
        {preview && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            確認用の表示です。ここで選んだ内容は保存されず、今のプランはそのままです。
          </p>
        )}
        <CoachBubble
          question={current.title}
          reaction={reactionFor(current.id, {
            projection,
            examUndecided: examChoice?.kind === "undecided",
            confidence,
            weakFields,
            studyStyle,
            hasBook: bookChoice.kind !== "later",
          })}
        />

        <div className="mt-5">
          {current.id === "exam" && (
            <ExamDateField choice={examChoice} onChange={setExamChoice} />
          )}

          {current.id === "time" && (
            <div className="space-y-5">
              {/* 選ぶたびに伸び縮みする見通しを、選択肢より先に見せる */}
              <ProjectionMeter projection={projection} />
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">平日</p>
                <div className="grid grid-cols-4 gap-2">
                  {WEEKDAY_OPTIONS.map((m) => (
                    <MinuteButton
                      key={m}
                      active={weekdayMinutes === m}
                      onClick={() => setWeekdayMinutes(m)}
                      label={`${m}分`}
                      name={WEEKDAY_NAMES[m]}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">休日</p>
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
              </div>
            </div>
          )}

          {current.id === "level" && (
            <div className="grid grid-cols-1 gap-2">
              {CONFIDENCE_OPTIONS.map((option) => (
                <ChoiceRow
                  key={option.value}
                  active={confidence === option.value}
                  onClick={() => setConfidence(option.value)}
                  label={option.label}
                />
              ))}
            </div>
          )}

          {current.id === "focus" && (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  苦手・不安な分野
                  <span className="ml-1.5 font-normal text-gray-500">複数可・なくてもOK</span>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {FIELDS.map((field) => (
                    <ChoiceRow
                      key={field}
                      active={weakFields.includes(field)}
                      onClick={() => toggleField(field)}
                      label={FIELD_LABELS[field]}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">進め方</p>
                <div className="grid grid-cols-1 gap-2">
                  {STYLES.map((style) => (
                    <ChoiceRow
                      key={style}
                      active={studyStyle === style}
                      onClick={() => setStudyStyle(style)}
                      label={STUDY_STYLE_LABELS[style]}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {current.id === "book" && (
            <>
              <ReferenceBookPicker value={bookChoice} onChange={setBookChoice} allowLater />
              {bookOrderOffered && (
                <label className="mt-3 flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900">
                  <input
                    type="checkbox"
                    checked={followBook}
                    onChange={(e) => setFollowBook(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span>
                    この参考書の章・節の順に学ぶ（おすすめ）
                    <span className="mt-0.5 block text-xs text-gray-600">
                      新しく学ぶテーマを本の順に出します。復習や本に無い試験範囲の補足はアプリが組み込みます。あとで設定から変えられます。
                    </span>
                  </span>
                </label>
              )}
            </>
          )}
        </div>
      </div>

      {/* 操作ボタンは画面下に固定し、長い選択肢（参考書）でも探さずに押せるようにする */}
      <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-xl px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => (step === last ? handleStart() : go(step + 1))}
            className="w-full rounded-lg bg-gray-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-black active:scale-[0.99]"
          >
            {step === last ? "この内容でプランを作る" : "次へ"}
          </button>
          {step < last && (
            <button
              type="button"
              onClick={handleStart}
              className="mt-1 w-full py-2 text-center text-sm text-gray-500 underline-offset-4 hover:text-gray-800 hover:underline"
            >
              残りはおまかせで始める
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

const noopSubscribe = () => () => {};

function isPreviewMode(): boolean {
  return new URLSearchParams(window.location.search).get("preview") === "1";
}

const ONBOARDING_STEPS = [
  { id: "exam", title: "試験はいつ受けますか？" },
  { id: "time", title: "1日にどれくらい勉強できますか？" },
  { id: "level", title: "今のITの知識はどのくらいですか？" },
  { id: "focus", title: "どう進めたいですか？" },
  { id: "book", title: "使っている参考書はありますか？" },
] as const;

type StepId = (typeof ONBOARDING_STEPS)[number]["id"];

// Duolingo の目標設定のように、時間に名前をつけて選びやすくする。
const WEEKDAY_NAMES: Record<number, string> = {
  10: "さくっと",
  20: "ふつう",
  30: "しっかり",
  60: "本気で",
};

// 選ぶたびにモチットが返すひと言。約束できない効果は言わない（苦手分野は出題の比重に実際に効く）。
function reactionFor(
  id: StepId,
  ctx: {
    projection: StudyTimeProjection;
    examUndecided: boolean;
    confidence: number;
    weakFields: TopicField[];
    studyStyle: StudyStyle;
    hasBook: boolean;
  },
): string {
  const { projection } = ctx;
  switch (id) {
    case "exam":
      if (ctx.examUndecided) return "未定でも大丈夫。3か月後を仮の試験日にして組んでおくね。";
      if (projection.days === null) return "決まっていなくても大丈夫だよ。";
      if (projection.days <= 45) return `あと${projection.days}日。短期集中でいこう！`;
      if (projection.days <= 75) return `あと${projection.days}日。ちょうどいい期間だね。`;
      return `あと${projection.days}日。じっくり進められるよ。`;
    case "time":
      if (projection.level === "comfortable") return "このペースなら、余裕をもって間に合うよ！";
      if (projection.level === "tight") return "このペースで、ちょうど間に合う計算だよ。";
      if (projection.level === "sprint") return "少し足りないかも。時間はあとから増やせるよ。";
      return "毎日の学習量をこの時間に合わせるね。";
    case "level":
      if (ctx.confidence <= 1) return "大丈夫！図解とやさしい言葉で、基礎からいっしょに進めよう。";
      if (ctx.confidence <= 3) return "いいね。分かるところはテンポよく進めよう。";
      return "頼もしい！確認問題と過去問で仕上げていこう。";
    case "focus":
      if (ctx.weakFields.length > 0) {
        return `${ctx.weakFields.map((f) => FIELD_LABELS[f]).join("・")}を多めに出すね。`;
      }
      if (ctx.studyStyle === "weakness") return "苦手なところから攻めよう。";
      if (ctx.studyStyle === "rush") return "試験日まで一気に駆け抜けよう！";
      return "3分野をバランスよく進めよう。";
    case "book":
      return ctx.hasBook
        ? "毎日「この本のどこを読むか」も案内するね。"
        : "参考書がなくても、アプリだけで全範囲を学べるよ。";
  }
}

function firstTopicTitle(state: AppState): string | null {
  try {
    const plan = generateLearningPlan(state);
    const first = plan.todayMenu.items.find((i) => i.kind === "learn") ?? plan.todayMenu.items[0];
    return first ? (getTopic(first.topicId)?.title ?? first.title) : null;
  } catch {
    return null;
  }
}

// 理解度は 0〜5 で保存する（UserProfile.confidence）。数字だけでは選びにくいので言葉で聞く。
const CONFIDENCE_OPTIONS = [
  { value: 0, label: "ITの用語はほとんど知らない" },
  { value: 1, label: "聞いたことがある用語が少しある" },
  { value: 2, label: "基本的な用語ならなんとなく分かる" },
  { value: 3, label: "半分くらいは説明できる" },
  { value: 4, label: "過去問をそこそこ解ける" },
  { value: 5, label: "合格ラインに近い" },
] as const;

function ChoiceRow({
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
      className={`flex items-center justify-between rounded-lg border px-4 py-3.5 text-left text-[15px] transition active:scale-[0.99] ${
        active
          ? "border-brand-600 bg-brand-50 font-semibold text-brand-800"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
      {active && <Icon name="check" className="h-4 w-4 shrink-0 text-brand-700" strokeWidth={2.2} />}
    </button>
  );
}

function MinuteButton({
  active,
  onClick,
  label,
  name,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  /** 「さくっと」など時間の呼び名（平日だけ） */
  name?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center justify-center rounded-lg border text-sm tabular-nums transition active:scale-[0.98] ${name ? "h-16" : "h-12"} ${
        active
          ? "border-brand-600 bg-brand-50 font-semibold text-brand-800"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {name && <span className="text-[11px] font-normal opacity-80">{name}</span>}
      {label}
    </button>
  );
}
