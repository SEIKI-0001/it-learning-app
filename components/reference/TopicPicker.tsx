"use client";

import { useMemo, useState } from "react";
import type { Topic, TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";

// 参考書の章・節にアプリ内トピックを紐づけるためのピッカー。
// 検索でしぼり込み、チップのトグルで選択する。<details> で開閉できる。
const FIELD_ORDER: TopicField[] = ["technology", "management", "strategy"];

export default function TopicPicker({
  topics,
  selected,
  onChange,
}: {
  topics: Topic[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const selectedSet = new Set(selected);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return topics.filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [topics, query]);

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <details className="rounded-xl border border-gray-200 bg-white">
      <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-indigo-600">
        アプリ内トピックと紐づける
        {selected.length > 0 && (
          <span className="ml-1 text-gray-500">（{selected.length}件）</span>
        )}
      </summary>
      <div className="border-t border-gray-100 p-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="テーマ名で検索"
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {FIELD_ORDER.map((field) => {
            const inField = filtered.filter((t) => t.field === field);
            if (inField.length === 0) return null;
            return (
              <div key={field}>
                <p className="mb-1.5 text-xs font-bold text-gray-400">
                  {FIELD_LABELS[field]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {inField.map((t) => {
                    const on = selectedSet.has(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggle(t.id)}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                          on
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {on ? "✓ " : ""}
                        {t.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400">一致するトピックがありません。</p>
          )}
        </div>
      </div>
    </details>
  );
}
