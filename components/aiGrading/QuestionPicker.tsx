"use client";

import { useMemo } from "react";
import Icon from "@/components/ui/Icon";
import { getAllThemes } from "@/lib/learningCatalog";
import {
  FIELD_LABEL,
  filterWrittenQuestionEntries,
  getWrittenQuestionEntries,
  type WrittenQuestionFilter,
} from "@/lib/writtenQuestionCatalog";
import type { TopicField } from "@/types/content";
import type { WrittenGrade } from "@/types/aiGrading";

// AI採点の問題一覧。分野・章・回答状況・キーワードで絞り込み、1問を選ぶ。
// 一覧には題名と章・Topicだけを出し、問題文の全文は選んだ後の回答画面で見せる。

export type QuestionPickerFilter = Required<WrittenQuestionFilter>;

export const INITIAL_PICKER_FILTER: QuestionPickerFilter = {
  field: "all",
  themeSlug: "all",
  status: "all",
  query: "",
};

const FIELDS: (TopicField | "all")[] = ["all", "strategy", "management", "technology"];
const STATUSES: { value: QuestionPickerFilter["status"]; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "unanswered", label: "未回答" },
  { value: "answered", label: "回答済み" },
];

type Props = {
  filter: QuestionPickerFilter;
  onFilterChange: (next: QuestionPickerFilter) => void;
  answeredIds: ReadonlySet<string>;
  /** 問題ごとの最新のグレード（回答済みの目印に使う）。 */
  latestGrades: ReadonlyMap<string, WrittenGrade>;
  currentQuestionId: string;
  onSelect: (questionId: string) => void;
  onClose: () => void;
};

export default function QuestionPicker({
  filter,
  onFilterChange,
  answeredIds,
  latestGrades,
  currentQuestionId,
  onSelect,
  onClose,
}: Props) {
  const entries = getWrittenQuestionEntries();
  const themes = useMemo(() => {
    const withQuestions = new Set(entries.flatMap((e) => e.placements.map((p) => p.themeSlug)));
    return getAllThemes().filter(
      (theme) => withQuestions.has(theme.slug) && (filter.field === "all" || theme.field === filter.field),
    );
  }, [entries, filter.field]);
  const visible = useMemo(
    () => filterWrittenQuestionEntries(entries, filter, answeredIds),
    [entries, filter, answeredIds],
  );
  const set = (patch: Partial<QuestionPickerFilter>) => onFilterChange({ ...filter, ...patch });
  const isFiltered =
    filter.field !== "all" || filter.themeSlug !== "all" || filter.status !== "all" || filter.query.trim() !== "";

  return (
    <section aria-labelledby="question-picker-title" className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 id="question-picker-title" className="text-sm font-bold text-gray-900">
          問題を選ぶ
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-800"
        >
          <Icon name="x" className="h-3.5 w-3.5" />
          閉じる
        </button>
      </div>

      <div className="space-y-3 px-4 py-3">
        <label className="relative block">
          <span className="sr-only">キーワードで探す</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={filter.query}
            onChange={(event) => set({ query: event.target.value })}
            placeholder="キーワード（例：暗号、稼働率、KPI）"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-base text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:text-sm"
          />
        </label>

        <div role="group" aria-label="分野" className="flex flex-wrap gap-1.5">
          {FIELDS.map((field) => (
            <Chip
              key={field}
              active={filter.field === field}
              onClick={() => set({ field, themeSlug: "all" })}
            >
              {field === "all" ? "全分野" : FIELD_LABEL[field]}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">章</span>
            <select
              value={filter.themeSlug}
              onChange={(event) => set({ themeSlug: event.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:text-sm"
            >
              <option value="all">すべての章</option>
              {themes.map((theme) => (
                <option key={theme.slug} value={theme.slug}>
                  第{theme.chapterNumber}章 {theme.title}
                </option>
              ))}
            </select>
          </label>
          <div role="group" aria-label="回答状況" className="flex gap-1 rounded-lg bg-gray-900/[0.06] p-[3px]">
            {STATUSES.map((status) => (
              <button
                key={status.value}
                type="button"
                aria-pressed={filter.status === status.value}
                onClick={() => set({ status: status.value })}
                className={`rounded-md px-2.5 py-1 text-xs transition ${
                  filter.status === status.value
                    ? "bg-white font-semibold text-gray-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span aria-live="polite">{visible.length}問</span>
          {isFiltered && (
            <button
              type="button"
              onClick={() => onFilterChange(INITIAL_PICKER_FILTER)}
              className="font-semibold text-brand-700 hover:underline"
            >
              絞り込みを解除
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="border-t border-gray-100 px-4 py-8 text-center text-sm text-gray-500">
          条件に合う問題がありません。
        </p>
      ) : (
        <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto border-t border-gray-100">
          {visible.map(({ question, placements }) => {
            const place = placements[0];
            const grade = latestGrades.get(question.id);
            const current = question.id === currentQuestionId;
            return (
              <li key={question.id}>
                <button
                  type="button"
                  onClick={() => onSelect(question.id)}
                  aria-current={current ? "true" : undefined}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                    current ? "bg-brand-50/60" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug text-gray-900">{question.title}</p>
                    {place && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        第{place.chapterNumber}章 {place.themeTitle}・{place.topicTitle}
                      </p>
                    )}
                  </div>
                  {grade ? (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                      回答済み {grade}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      未回答
                    </span>
                  )}
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-gray-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}
