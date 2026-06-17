"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Save } from "lucide-react";
import { books } from "@/data/books";
import { domainLabels } from "@/data/topics";
import { weekdayLabels, weekdayOrder } from "@/lib/date";
import type { StudyDomain } from "@/types/content";
import type { ItExperience, Weekday } from "@/types/user";

const experienceOptions: Array<{ value: ItExperience; label: string }> = [
  { value: "none", label: "ほぼ未経験" },
  { value: "little", label: "少しだけ触ったことがある" },
  { value: "student", label: "授業で学んだことがある" },
  { value: "work", label: "仕事で少し使っている" }
];

export function OnboardingForm({ lineUserId }: { lineUserId?: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [restWeekdays, setRestWeekdays] = useState<Weekday[]>(["sunday"]);
  const [weakDomains, setWeakDomains] = useState<StudyDomain[]>(["technology"]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);

    const form = new FormData(event.currentTarget);
    const payload = {
      lineUserId,
      examDate: String(form.get("examDate")),
      weekdayMinutes: Number(form.get("weekdayMinutes")),
      weekendMinutes: Number(form.get("weekendMinutes")),
      restWeekdays,
      selectedBookId: String(form.get("selectedBookId")),
      itExperience: String(form.get("itExperience")) as ItExperience,
      weakDomains
    };

    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setSaving(false);
    if (!response.ok) {
      alert("保存できませんでした。入力内容を確認してください。");
      return;
    }

    setSaved(true);
    router.refresh();
    router.push("/today");
  }

  return (
    <form className="form card card-pad" onSubmit={handleSubmit}>
      {lineUserId ? <span className="pill">LINE連携設定として保存</span> : <span className="pill">Web体験用設定</span>}

      <div className="grid grid-2">
        <div className="form-field">
          <label htmlFor="examDate">試験予定日</label>
          <input id="examDate" name="examDate" type="date" required />
        </div>
        <div className="form-field">
          <label htmlFor="selectedBookId">使用している参考書</label>
          <select id="selectedBookId" name="selectedBookId" defaultValue="generic">
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="form-field">
          <label htmlFor="weekdayMinutes">平日に使える学習時間</label>
          <select id="weekdayMinutes" name="weekdayMinutes" defaultValue="30">
            {[15, 30, 45, 60, 90].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes}分
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="weekendMinutes">休日に使える学習時間</label>
          <select id="weekendMinutes" name="weekendMinutes" defaultValue="60">
            {[15, 30, 45, 60, 90, 120].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes}分
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="form-field">
        <legend className="fieldset-label">休みたい曜日</legend>
        <div className="check-grid">
          {weekdayOrder.map((weekday) => (
            <label className="check-chip" key={weekday}>
              <input
                checked={restWeekdays.includes(weekday)}
                type="checkbox"
                onChange={(event) => {
                  setRestWeekdays((current) =>
                    event.target.checked ? [...current, weekday] : current.filter((item) => item !== weekday)
                  );
                }}
              />
              {weekdayLabels[weekday]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-field">
        <label htmlFor="itExperience">IT経験</label>
        <select id="itExperience" name="itExperience" defaultValue="none">
          {experienceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="form-field">
        <legend className="fieldset-label">苦手意識のある分野</legend>
        <div className="check-grid">
          {(Object.keys(domainLabels) as StudyDomain[]).map((domain) => (
            <label className="check-chip" key={domain}>
              <input
                checked={weakDomains.includes(domain)}
                type="checkbox"
                onChange={(event) => {
                  setWeakDomains((current) =>
                    event.target.checked ? [...current, domain] : current.filter((item) => item !== domain)
                  );
                }}
              />
              {domainLabels[domain]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="button-row">
        <button className="button button-primary" disabled={saving} type="submit">
          {saved ? <Check size={18} aria-hidden /> : <Save size={18} aria-hidden />}
          {saving ? "保存中..." : saved ? "保存しました" : "設定して今日の学習へ"}
        </button>
      </div>
    </form>
  );
}
