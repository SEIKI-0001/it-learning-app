import Link from "next/link";
import type { WordlistEntry } from "@/types/wordlist";
import { getWordByAcronym } from "@/lib/wordlist";
import Icon from "@/components/ui/Icon";

// 英略語1語の詳細表示（表示のみ）。
// 「一言意味」「試験キーワード」「似た語との違い」を特に目立つUIにする。
// confusedWith のうち wordlist に存在する語は詳細ページへの内部リンクにする。

export default function WordDetail({ entry }: { entry: WordlistEntry }) {
  return (
    <div className="space-y-5">
      {/* 英単語分解 */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">英単語の分解</h2>
        <p className="mt-1 text-sm text-gray-500">{entry.fullName}</p>
        <ul className="mt-3 space-y-1.5">
          {entry.words.map((w, i) => (
            <li key={`${w.word}-${i}`} className="flex items-baseline gap-2">
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-sm font-semibold text-brand-700">
                {w.word}
              </span>
              <span className="text-sm text-gray-600">{w.meaning}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 一言意味＝この画面で唯一の強調ブロック */}
      <section className="rounded-lg border border-brand-200 border-l-4 border-l-brand-500 bg-brand-50 p-4">
        <h2 className="text-xs font-semibold text-brand-700">一言でいうと</h2>
        <p className="mt-1 text-[15px] font-semibold leading-snug text-gray-900">
          {entry.oneLine}
        </p>
      </section>

      {/* 試験キーワード */}
      {entry.examKeywords.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">試験キーワード</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {entry.examKeywords.map((k) => (
              <span
                key={k}
                className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700"
              >
                {k}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 似た語との違い＝取り違えやすい注意ポイント */}
      {entry.confusedWith.length > 0 && (
        <section className="rounded-xl border border-accent-200 bg-accent-50 p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-accent-800">
            <Icon name="alert" className="h-4 w-4" />
            似た語との違い
          </h2>
          <p className="mt-1 text-sm text-accent-800">
            見分けるポイント：{entry.differenceAxis}
          </p>
          <ul className="mt-3 space-y-2.5">
            {entry.confusedWith.map((name) => {
              const linked = getWordByAcronym(name);
              return (
                <li
                  key={name}
                  className="rounded-lg border border-accent-200 bg-white p-3"
                >
                  {linked ? (
                    <Link
                      href={`/glossary/${linked.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                    >
                      {name}
                      <Icon name="arrow-right" className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-gray-900">
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
