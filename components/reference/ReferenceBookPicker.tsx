"use client";

import {
  BOOK_TYPE_LABELS,
  listReferenceBookPresets,
  suggestPresetForText,
  type ReferenceBookChoice,
  type ReferenceBookPresetSummary,
} from "@/lib/referenceBookPresets";
import Icon from "@/components/ui/Icon";
import TocImageImport from "@/components/reference/TocImageImport";
import { chaptersFromToc } from "@/lib/referenceToc";

// 使用する参考書の選択（オンボーディングと参考書設定で共用）。
// 登録済みプリセット → その他の参考書（書名＋目次のスクショ読み取り）→ あとで設定する、の順に並べる。
// ここは選ぶだけ。保存は呼び出し側が referenceBookFromChoice で作って行う。

const OPTION_BASE =
  "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition active:scale-[0.99]";
const OPTION_ON = "border-brand-600 bg-brand-50";
const OPTION_OFF = "border-gray-300 bg-white hover:bg-gray-50";

export default function ReferenceBookPicker({
  value,
  onChange,
  allowLater = false,
  currentTitle,
}: {
  value: ReferenceBookChoice;
  onChange: (next: ReferenceBookChoice) => void;
  /** 「あとで設定する」を出すか（オンボーディング用） */
  allowLater?: boolean;
  /** 使用中の参考書名（同じプリセットに「使用中」を付ける） */
  currentTitle?: string;
}) {
  const presets = listReferenceBookPresets();
  const groups = presets.reduce<Record<string, ReferenceBookPresetSummary[]>>(
    (acc, p) => {
      (acc[p.bookType] ??= []).push(p);
      return acc;
    },
    {},
  );
  const otherTitle = value.kind === "other" ? value.title : "";
  const otherChapters = value.kind === "other" ? value.chapters : undefined;
  // 「その他」に打った書名が登録済みの本なら、そちらを選べるように提案する。
  const suggestion =
    value.kind === "other" ? suggestPresetForText(otherTitle) : null;

  return (
    <div className="space-y-4" role="radiogroup" aria-label="使用する参考書">
      {Object.entries(groups).map(([type, items]) => (
        <div key={type}>
          <p className="mb-1.5 text-xs text-gray-500">
            {BOOK_TYPE_LABELS[type as keyof typeof BOOK_TYPE_LABELS] ?? type}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {items.map((p) => {
              const active = value.kind === "preset" && value.presetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ kind: "preset", presetId: p.id })}
                  className={`${OPTION_BASE} ${active ? OPTION_ON : OPTION_OFF}`}
                >
                  <span className="min-w-0">
                    <span
                      className={`block text-sm leading-snug ${active ? "font-semibold text-brand-800" : "text-gray-800"}`}
                    >
                      {p.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {[p.publisher, `${p.chapterCount}章`].filter(Boolean).join("・")}
                      {currentTitle === p.title && "・使用中"}
                    </span>
                  </span>
                  {active && (
                    <Icon name="check" className="h-4 w-4 shrink-0 text-brand-700" strokeWidth={2.2} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={value.kind === "other"}
          onClick={() => onChange({ kind: "other", title: otherTitle, chapters: otherChapters })}
          className={`${OPTION_BASE} ${value.kind === "other" ? OPTION_ON : OPTION_OFF}`}
        >
          <span className={`text-sm ${value.kind === "other" ? "font-semibold text-brand-800" : "text-gray-800"}`}>
            その他の参考書
          </span>
          {value.kind === "other" && (
            <Icon name="check" className="h-4 w-4 shrink-0 text-brand-700" strokeWidth={2.2} />
          )}
        </button>
        {value.kind === "other" && (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <label className="block">
              <span className="mb-1 block text-xs text-gray-600">参考書名</span>
              <input
                type="text"
                value={otherTitle}
                onChange={(e) =>
                  onChange({ kind: "other", title: e.target.value, chapters: otherChapters })
                }
                placeholder="例: いちばんやさしいITパスポート"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            {suggestion && (
              <button
                type="button"
                onClick={() => onChange({ kind: "preset", presetId: suggestion.id })}
                className="mt-2 text-left text-xs text-brand-700 underline underline-offset-2"
              >
                「{suggestion.title}」なら章立てが登録済みです。こちらを選ぶ
              </button>
            )}
            <div className="mt-3">
              {otherChapters && otherChapters.length > 0 ? (
                <div className="flex items-start justify-between gap-2 rounded-lg bg-brand-50 px-3 py-2.5">
                  <p className="text-xs text-brand-800">
                    目次から{otherChapters.length}章の章立てを読み取りました。
                    {!otherTitle.trim() && "参考書名を入れると登録できます。"}
                  </p>
                  <button
                    type="button"
                    onClick={() => onChange({ kind: "other", title: otherTitle })}
                    className="shrink-0 text-xs text-gray-600 underline underline-offset-2"
                  >
                    取り消す
                  </button>
                </div>
              ) : (
                <>
                  <TocImageImport
                    onUse={(toc) =>
                      onChange({
                        kind: "other",
                        title: otherTitle.trim() || toc.bookTitle || "",
                        chapters: chaptersFromToc(toc),
                      })
                    }
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    読み取らなくても登録できます。章立てはあとから設定画面でも登録でき、それまでは各レッスンの「探すキーワード」で案内します。
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {allowLater && (
          <button
            type="button"
            role="radio"
            aria-checked={value.kind === "later"}
            onClick={() => onChange({ kind: "later" })}
            className={`${OPTION_BASE} ${value.kind === "later" ? OPTION_ON : OPTION_OFF}`}
          >
            <span className={`text-sm ${value.kind === "later" ? "font-semibold text-brand-800" : "text-gray-800"}`}>
              あとで設定する
            </span>
            {value.kind === "later" && (
              <Icon name="check" className="h-4 w-4 shrink-0 text-brand-700" strokeWidth={2.2} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
