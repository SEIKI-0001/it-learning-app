import Link from "next/link";
import type { WordlistEntry } from "@/types/wordlist";
import { getWordByAcronym } from "@/lib/wordlist";

// 英略語1語の詳細表示（表示のみ）。
// 「一言意味」「試験キーワード」「似た語との違い」を特に目立つUIにする。
// confusedWith のうち wordlist に存在する語は詳細ページへの内部リンクにする。

export default function WordDetail({ entry }: { entry: WordlistEntry }) {
  return (
    <div className="space-y-5">
      {/* 英単語分解 */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-bold text-gray-800">英単語の分解</h2>
        <p className="mt-1 text-sm text-gray-500">{entry.fullName}</p>
        <ul className="mt-3 space-y-1.5">
          {entry.words.map((w, i) => (
            <li key={`${w.word}-${i}`} className="flex items-baseline gap-2">
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-sm font-bold text-brand-700">
                {w.word}
              </span>
              <span className="text-sm text-gray-600">{w.meaning}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 一言意味（最も目立たせる） */}
      <section className="rounded-xl bg-brand-600 p-5 text-white shadow-sm">
        <h2 className="text-xs font-bold text-brand-200">一言でいうと</h2>
        <p className="mt-1 text-lg font-bold leading-snug">
          {entry.oneLine}
        </p>
      </section>

      {/* 試験キーワード */}
      {entry.examKeywords.length > 0 && (
        <section className="rounded-xl bg-amber-50 p-4">
          <h2 className="text-sm font-bold text-amber-700">試験キーワード</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {entry.examKeywords.map((k) => (
              <span
                key={k}
                className="rounded-full bg-white px-3 py-1 text-sm font-bold text-amber-700 ring-1 ring-amber-200"
              >
                {k}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 似た語との違い */}
      {entry.confusedWith.length > 0 && (
        <section className="rounded-xl bg-rose-50 p-4">
          <h2 className="text-sm font-bold text-rose-600">似た語との違い</h2>
          <p className="mt-1 text-sm font-bold text-rose-700">
            見分けるポイント：{entry.differenceAxis}
          </p>
          <ul className="mt-3 space-y-2.5">
            {entry.confusedWith.map((name) => {
              const linked = getWordByAcronym(name);
              return (
                <li
                  key={name}
                  className="rounded-xl bg-white p-3 ring-1 ring-rose-100"
                >
                  {linked ? (
                    <Link
                      href={`/glossary/${linked.id}`}
                      className="text-sm font-bold text-rose-600 underline underline-offset-2"
                    >
                      {name} →
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-rose-600">
                      {name}
                    </span>
                  )}
                  {entry.trapExplanations[name] && (
                    <p className="mt-1 text-sm leading-relaxed text-gray-700">
                      {entry.trapExplanations[name]}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
