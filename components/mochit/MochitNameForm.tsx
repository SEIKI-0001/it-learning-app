"use client";

// モチットの命名・改名（GF-P1-007）。
//
// 任意。名前を付けなくても全機能が使え、未設定なら既定名で呼ぶ。
// 不正な入力（空・長すぎ・制御文字）は保存せず、理由を静かに伝える。

import { useState } from "react";
import type { AppState } from "@/types";
import {
  clearMochitName,
  getMochitDisplayName,
  hasCustomMochitName,
  setMochitName,
  validateMochitName,
  DEFAULT_MOCHIT_NAME,
  MOCHIT_NAME_MAX_LENGTH,
} from "@/lib/mochitName";
import { buttonClass } from "@/components/ui/Button";

const REASON_MESSAGES = {
  empty: "名前を入力してください。",
  too_long: `名前は${MOCHIT_NAME_MAX_LENGTH}文字までです。`,
  invalid_characters: "改行や特殊な文字は使えません。",
} as const;

export default function MochitNameForm({
  state,
  onChange,
}: {
  state: AppState;
  onChange: (next: AppState) => void;
}) {
  const displayName = getMochitDisplayName(state);
  const named = hasCustomMochitName(state);
  const [draft, setDraft] = useState(named ? displayName : "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateMochitName(draft);
    if (!result.ok) {
      setError(REASON_MESSAGES[result.reason]);
      return;
    }
    setError(null);
    setDraft(result.value);
    onChange(setMochitName(state, result.value));
  }

  return (
    <section
      aria-labelledby="mochit-name-heading"
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <h2 id="mochit-name-heading" className="text-sm font-semibold text-gray-900">
        名前をつける（任意）
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        いまの呼び名は「{displayName}」です。付けなくても、いつ変えても大丈夫です。
      </p>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-start gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">モチットの名前</span>
          <input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
            maxLength={MOCHIT_NAME_MAX_LENGTH * 2}
            placeholder={DEFAULT_MOCHIT_NAME}
            aria-invalid={error !== null}
            aria-describedby={error ? "mochit-name-error" : undefined}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <button type="submit" className={buttonClass("primary", "md")}>
          {named ? "変更する" : "つける"}
        </button>
      </form>

      {error && (
        <p id="mochit-name-error" role="alert" className="mt-1.5 text-xs text-accent-700">
          {error}
        </p>
      )}

      {named && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            setError(null);
            onChange(clearMochitName(state));
          }}
          className="mt-2 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
        >
          「{DEFAULT_MOCHIT_NAME}」に戻す
        </button>
      )}
    </section>
  );
}
