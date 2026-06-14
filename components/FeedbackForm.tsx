"use client";

import { useState } from "react";
import { saveFeedbackToDb, type FeedbackAnswers } from "@/lib/userSession";

// Day1 / Day7 完了後に表示する簡易フィードバック。
// user_id がある場合のみ Supabase に保存する（直接アクセス時は表示のみ）。

type Props = {
  userId: string;
  dayNo: number;
};

const FREE_QUESTIONS: { key: keyof FeedbackAnswers; label: string }[] = [
  { key: "q1_service", label: "① 最初に見て、何のサービスだと思いましたか？" },
  { key: "q2_tedious", label: "② 面倒だと感じたところはありましたか？" },
  { key: "q3_unclear", label: "③ 分かりにくい言葉はありましたか？" },
];

const YESNO_QUESTIONS: { key: keyof FeedbackAnswers; label: string }[] = [
  { key: "q4_onemore", label: "④ もう1日分やってもいいと思いましたか？" },
  { key: "q5_easier", label: "⑤ 普通の資格アプリより楽そうに感じましたか？" },
];

export default function FeedbackForm({ userId, dayNo }: Props) {
  const [answers, setAnswers] = useState<FeedbackAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function update(key: keyof FeedbackAnswers, value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    await saveFeedbackToDb(userId, dayNo, answers);
    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-8 rounded-2xl bg-emerald-50 px-5 py-6 text-center">
        <p className="text-2xl">🙌</p>
        <p className="mt-1 text-sm font-bold text-emerald-700">
          フィードバックありがとう！とても助かります。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-extrabold text-gray-800">
        🗣️ ひとことアンケート（30秒）
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        もっと良くするために、感じたことを教えてください。
      </p>

      <div className="mt-5 space-y-5">
        {FREE_QUESTIONS.map((q) => (
          <div key={q.key}>
            <label className="block text-sm font-semibold text-gray-700">
              {q.label}
            </label>
            <textarea
              value={answers[q.key] ?? ""}
              onChange={(e) => update(q.key, e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none"
              placeholder="自由に入力（任意）"
            />
          </div>
        ))}

        {YESNO_QUESTIONS.map((q) => (
          <div key={q.key}>
            <p className="text-sm font-semibold text-gray-700">{q.label}</p>
            <div className="mt-2 flex gap-2">
              {["はい", "どちらとも", "いいえ"].map((opt) => {
                const active = answers[q.key] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => update(q.key, opt)}
                    className={`flex-1 rounded-xl border-2 px-2 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                      active
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 w-full rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-extrabold text-white shadow transition active:scale-[0.98] disabled:bg-gray-300"
      >
        {submitting ? "送信中…" : "送信する"}
      </button>
    </div>
  );
}
