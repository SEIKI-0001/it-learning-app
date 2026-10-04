"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import {
  OPINION_BODY_MAX,
  OPINION_CATEGORIES,
  OPINION_CATEGORY_LABELS,
  OPINION_CONTEXT_MAX,
  type OpinionCategory,
} from "@/lib/opinions";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

const PLACEHOLDERS: Record<OpinionCategory, string> = {
  improvement: "例: 復習の画面で、間違えた問題だけを続けて解けるようにしてほしい",
  mistake: "例: 解説では正解がイとなっているが、選択肢の説明と食い違っている気がする",
  bug: "例: 模試の50問目で「次へ」を押しても進まない",
  other: "思ったことを、そのまま書いてください",
};

function errorMessage(status: number): string {
  if (status === 401) return "送信するにはログインが必要です。";
  if (status === 429) return "短い時間に続けて送られています。少し時間をおいてからお試しください。";
  if (status === 400) return "入力内容を確認してください。";
  return "送信できませんでした。時間をおいてもう一度お試しください。";
}

export default function OpinionBox() {
  const [category, setCategory] = useState<OpinionCategory>("improvement");
  const [body, setBody] = useState("");
  const [context, setContext] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const trimmedLength = body.trim().length;
  const canSubmit = trimmedLength > 0 && body.length <= OPINION_BODY_MAX && status.kind !== "sending";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/opinions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, body, context: context || null }),
      });
      if (!res.ok) {
        setStatus({ kind: "error", message: errorMessage(res.status) });
        return;
      }
      setBody("");
      setContext("");
      setStatus({ kind: "sent" });
    } catch {
      setStatus({ kind: "error", message: errorMessage(0) });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4" role="status">
        <p className="text-sm font-semibold text-gray-900">ありがとうございます。届きました。</p>
        <p className="mt-1 text-xs text-gray-600">
          いただいた声はすべて読んで、アプリの改善に使います。
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => setStatus({ kind: "idle" })}
        >
          もう1件送る
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-4"
      aria-label="意見箱"
    >
      <p className="text-xs text-gray-600">
        「ここを改善してほしい」「この解説は間違っている」など、気づいたことを気軽に送ってください。
      </p>

      <fieldset className="mt-3">
        <legend className="sr-only">種類</legend>
        <div className="flex flex-wrap gap-2">
          {OPINION_CATEGORIES.map((value) => {
            const selected = value === category;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setCategory(value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {OPINION_CATEGORY_LABELS[value]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-3 block">
        <span className="sr-only">内容</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={OPINION_BODY_MAX}
          rows={5}
          placeholder={PLACEHOLDERS[category]}
          className="block w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
        />
      </label>
      <p className="mt-1 text-right text-[11px] text-gray-500">
        {body.length} / {OPINION_BODY_MAX}
      </p>

      <label className="mt-2 block">
        <span className="block text-xs font-medium text-gray-700">
          どの画面・どの問題か（任意）
        </span>
        <input
          type="text"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          maxLength={OPINION_CONTEXT_MAX}
          placeholder="例: 令和5年度 問12 / 単語帳"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
        />
      </label>

      {status.kind === "error" && (
        <p className="mt-3 text-xs text-red-600" role="alert">
          {status.message}
        </p>
      )}

      <Button type="submit" size="sm" className="mt-3 w-full" disabled={!canSubmit}>
        {status.kind === "sending" ? "送信中…" : "送信する"}
      </Button>
    </form>
  );
}
