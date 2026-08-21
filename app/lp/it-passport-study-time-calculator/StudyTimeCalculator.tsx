"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Level = "beginner" | "started" | "practice";

const levelHours: Record<Level, number> = {
  beginner: 100,
  started: 70,
  practice: 40,
};

const levelLabels: Record<Level, string> = {
  beginner: "IT未経験・これから始める",
  started: "参考書を読み始めている",
  practice: "過去問・問題演習を始めている",
};

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function StudyTimeCalculator() {
  const initialExamDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 60);
    return formatDateInput(date);
  }, []);

  const [examDate, setExamDate] = useState(initialExamDate);
  const [weekdayMinutes, setWeekdayMinutes] = useState(45);
  const [weekendMinutes, setWeekendMinutes] = useState(120);
  const [level, setLevel] = useState<Level>("beginner");

  const result = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${examDate}T00:00:00`);
    const days = Math.max(1, Math.ceil((target.getTime() - today.getTime()) / 86400000));
    const weeks = Math.max(1, days / 7);
    const weeklyMinutes = weekdayMinutes * 5 + weekendMinutes * 2;
    const availableHours = (weeklyMinutes * weeks) / 60;
    const targetHours = levelHours[level];
    const coverage = Math.round((availableHours / targetHours) * 100);
    const dailyNeeded = Math.ceil((targetHours * 60) / days);

    let status = "余裕を持って進められる計画です";
    let advice = "確認問題と復習日を入れながら、週単位で進捗を確認しましょう。";
    if (coverage < 75) {
      status = "学習時間の追加か試験日の見直しが必要です";
      advice = "平日15分の追加、休日の演習時間確保、または試験日の調整を検討してください。";
    } else if (coverage < 100) {
      status = "合格圏を目指せますが、学習の優先順位が重要です";
      advice = "重要分野を先に学び、理解度確認の結果に応じて復習量を調整しましょう。";
    }

    return {
      days,
      weeks: Math.ceil(weeks),
      availableHours: Math.round(availableHours),
      targetHours,
      coverage,
      dailyNeeded,
      status,
      advice,
    };
  }, [examDate, weekdayMinutes, weekendMinutes, level]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rounded-[26px] border border-[#cfe5f2] bg-white p-6 shadow-[0_18px_44px_rgba(22,94,131,0.10)] sm:p-8">
        <h2 className="text-2xl font-black text-[#12384d]">3項目を入力してください</h2>
        <div className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-black text-[#12384d]">
            試験予定日
            <input type="date" value={examDate} min={formatDateInput(new Date())} onChange={(event) => setExamDate(event.target.value)} className="rounded-xl border border-[#b8d8e8] bg-white px-4 py-3 text-base font-medium text-slate-800" />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#12384d]">
            現在の学習状況
            <select value={level} onChange={(event) => setLevel(event.target.value as Level)} className="rounded-xl border border-[#b8d8e8] bg-white px-4 py-3 text-base font-medium text-slate-800">
              {Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-[#12384d]">
              平日1日の学習時間
              <select value={weekdayMinutes} onChange={(event) => setWeekdayMinutes(Number(event.target.value))} className="rounded-xl border border-[#b8d8e8] bg-white px-4 py-3 text-base font-medium text-slate-800">
                {[15, 30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes}分</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black text-[#12384d]">
              休日1日の学習時間
              <select value={weekendMinutes} onChange={(event) => setWeekendMinutes(Number(event.target.value))} className="rounded-xl border border-[#b8d8e8] bg-white px-4 py-3 text-base font-medium text-slate-800">
                {[30, 60, 90, 120, 180, 240].map((minutes) => <option key={minutes} value={minutes}>{minutes}分</option>)}
              </select>
            </label>
          </div>
        </div>
        <p className="mt-5 text-xs leading-6 text-slate-500">表示される時間は学習計画を考えるための目安です。実際の必要時間は、知識量・教材・理解度によって異なります。</p>
      </div>

      <aside className="rounded-[26px] bg-[#12384d] p-6 text-white shadow-[0_18px_44px_rgba(18,56,77,0.22)] sm:p-8">
        <p className="text-sm font-black text-[#9edbf2]">無料シミュレーション結果</p>
        <h2 className="mt-3 text-3xl font-black leading-tight">{result.status}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-[#cceaf5]">試験まで</p><p className="mt-1 text-2xl font-black">{result.days}日</p></div>
          <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-[#cceaf5]">確保できる時間</p><p className="mt-1 text-2xl font-black">約{result.availableHours}時間</p></div>
          <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-[#cceaf5]">目安学習時間</p><p className="mt-1 text-2xl font-black">約{result.targetHours}時間</p></div>
          <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-[#cceaf5]">1日あたりの目安</p><p className="mt-1 text-2xl font-black">{result.dailyNeeded}分</p></div>
        </div>
        <div className="mt-5 rounded-2xl bg-[#e8f5fb] p-5 text-[#12384d]">
          <p className="text-sm font-black">次にやること</p>
          <p className="mt-2 text-sm leading-7">{result.advice}</p>
        </div>
        <Link href="/onboarding" className="mt-6 inline-flex w-full justify-center rounded-full bg-[#f7a600] px-6 py-4 text-sm font-black text-white transition hover:bg-[#d98f00]">この条件で無料学習計画を作る</Link>
        <p className="mt-3 text-center text-xs text-[#cceaf5]">試験日と学習時間を引き継ぎ、今日やることを具体化します。</p>
      </aside>
    </div>
  );
}
