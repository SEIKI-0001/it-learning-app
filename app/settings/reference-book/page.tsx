"use client";

import { useState } from "react";
import type { Topic } from "@/types/content";
import type {
  ReferenceBook,
  ReferenceChapter,
  ReferenceSection,
} from "@/types/referenceBook";
import { getAllTopics, getTopic } from "@/lib/content";
import {
  createEmptyReferenceBook,
  genRefId,
  hasReadingHistory,
  isChapterRead,
  isSectionRead,
  parseTableOfContents,
  referenceBookProgress,
  saveReferenceBook,
  setChapterRead,
  setSectionRead,
  switchReferenceBook,
} from "@/lib/referenceBook";
import { persistReferenceBook } from "@/lib/referenceBookSync";
import {
  listReferenceBookPresets,
  referenceBookFromChoice,
  type ReferenceBookChoice,
} from "@/lib/referenceBookPresets";
import { useReferenceBook } from "@/lib/useReferenceBook";
import TopicPicker from "@/components/reference/TopicPicker";
import ReferenceBookPicker from "@/components/reference/ReferenceBookPicker";
import BottomNav from "@/components/BottomNav";
import LoadingScreen from "@/components/LoadingScreen";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";

// /settings/reference-book = 使用参考書の設定。
// ふだんの読了記録は /today の「全部」で自動的に進むので、ここは次のときだけ使う:
//   1. 使用中の参考書を確認する
//   2. 別の参考書（登録済みプリセット／その他）へ変更する
//   3. 読了状況を修正する（読了の取り消しはここでだけ行う）
// 章立ての手動編集・トピックの紐づけなどの詳細設定は、折りたたんだ奥に置く。
// 保存は端末（localStorage）を主に、ログイン時は DB（user_reference_books）へも同期する。
// 参考書未登録でも学習は Topic.referenceHints にフォールバックするので、この設定は任意。

export default function ReferenceBookSettingsPage() {
  const { book } = useReferenceBook();
  if (book === undefined) return <LoadingScreen />;
  return <ReferenceBookSettings initial={book ?? createEmptyReferenceBook()} />;
}

function choiceForBook(book: ReferenceBook): ReferenceBookChoice {
  const preset = listReferenceBookPresets().find((p) => p.title === book.title);
  if (preset) return { kind: "preset", presetId: preset.id };
  return { kind: "other", title: book.title };
}

function ReferenceBookSettings({ initial }: { initial: ReferenceBook }) {
  const [book, setBook] = useState<ReferenceBook>(initial);
  const hasBook = book.title.trim().length > 0 || book.chapters.length > 0;
  const [choice, setChoice] = useState<ReferenceBookChoice>(() =>
    hasBook ? choiceForBook(book) : { kind: "other", title: "" },
  );
  const [pendingSwitch, setPendingSwitch] = useState<ReferenceBook | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const progress = referenceBookProgress(book);

  /** 端末と DB（ログイン時）へ保存して表示にも反映する。 */
  function commit(next: ReferenceBook) {
    setBook(persistReferenceBook(next));
  }

  // --- 参考書の変更 ---
  const chosen = referenceBookFromChoice(choice);
  const isSameAsCurrent =
    chosen !== null && hasBook && chosen.title.trim() === book.title.trim();

  function applyChoice() {
    if (!chosen || isSameAsCurrent) return;
    // 読了履歴がある本から切り替えるときは、履歴をどうするか確かめる。
    if (hasBook && hasReadingHistory(book)) {
      setPendingSwitch(chosen);
      return;
    }
    finishSwitch(chosen, false);
  }

  function finishSwitch(next: ReferenceBook, keepHistory: boolean) {
    const switched = switchReferenceBook(hasBook ? book : null, next, { keepHistory });
    commit(switched);
    setChoice(choiceForBook(switched));
    setPendingSwitch(null);
    setNotice(`「${switched.title}」に切り替えました`);
  }

  return (
    <main className="min-h-screen pb-28">
      <PageHeader
        back={{ href: "/settings", label: "設定" }}
        eyebrow="設定"
        title="使用参考書"
        description="毎日の「参考書のどこを読むか」の案内に使います。読んだ記録は今日のページで「全部」を選ぶと自動で進みます。"
      />

      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6">
        {/* 1. 使用中の参考書 */}
        <section aria-labelledby="current-book-heading">
          <h2 id="current-book-heading" className="mb-2 text-base font-semibold text-gray-900">
            使用中の参考書
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            {hasBook ? (
              <>
                <p className="text-sm font-medium text-gray-900">{book.title || "（書名未入力）"}</p>
                {progress ? (
                  <>
                    <p className="mt-1 text-xs text-gray-600">
                      参考書進捗{" "}
                      <span className="tabular-nums">{Math.round(progress.ratio * 100)}%</span>
                      ・
                      <span className="tabular-nums">
                        {progress.doneChapters} / {progress.totalChapters}
                      </span>
                      章読了
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-gray-600">
                    章立てが未登録です。下の「詳細設定」で目次を貼り付けると登録できます。
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-600">
                まだ設定されていません。登録しなくても、各レッスンの「探すキーワード」で学習できます。
              </p>
            )}
          </div>
          {notice && (
            <p className="mt-2 text-xs text-emerald-700" aria-live="polite">
              {notice}
            </p>
          )}
        </section>

        {/* 2. 参考書を変更（プリセット／その他） */}
        <section aria-labelledby="change-book-heading">
          <h2 id="change-book-heading" className="mb-1 text-base font-semibold text-gray-900">
            {hasBook ? "参考書を変更" : "参考書を選ぶ"}
          </h2>
          <p className="mb-3 text-xs text-gray-600">
            登録済みの参考書は章立てと各レッスンとの対応が入っています。学習の順番はアプリが決めます。
          </p>
          <ReferenceBookPicker value={choice} onChange={setChoice} currentTitle={book.title} />

          {pendingSwitch ? (
            <div
              role="alertdialog"
              aria-labelledby="switch-confirm-heading"
              className="mt-4 rounded-lg border border-gray-300 bg-white p-4"
            >
              <p id="switch-confirm-heading" className="text-sm text-gray-900">
                参考書を変更すると、新しい参考書の章構成に切り替わります。現在の参考書の読了履歴は保持しますか？
              </p>
              <p className="mt-1 text-xs text-gray-600">
                保持すると、あとで「{book.title}」に戻したときに読了状況が復元されます（この端末に保存）。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => finishSwitch(pendingSwitch, true)}
                  className={buttonClass("primary", "sm")}
                >
                  保持して切り替える
                </button>
                <button
                  type="button"
                  onClick={() => finishSwitch(pendingSwitch, false)}
                  className={buttonClass("secondary", "sm")}
                >
                  保持せずに切り替える
                </button>
                <button
                  type="button"
                  onClick={() => setPendingSwitch(null)}
                  className="px-2 text-sm text-gray-600 underline underline-offset-2"
                >
                  やめる
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={applyChoice}
              disabled={!chosen || isSameAsCurrent}
              className={buttonClass("primary", "md", "mt-4 w-full")}
            >
              {isSameAsCurrent ? "使用中の参考書です" : "この参考書を使う"}
            </button>
          )}
        </section>

        {/* 3. 読了状況の修正 */}
        {book.chapters.length > 0 && (
          <ReadingStatusEditor
            book={book}
            onChapter={(chapterId, read) => commit(setChapterRead(book, chapterId, read))}
            onSection={(chapterId, sectionId, read) =>
              commit(setSectionRead(book, chapterId, sectionId, read))
            }
          />
        )}

        {/* 4. 詳細設定（章立ての編集・トピック紐づけ） */}
        <details className="rounded-lg border border-gray-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm text-gray-700">
            詳細設定（章立ての編集・レッスンとの紐づけ）
          </summary>
          <div className="border-t border-gray-200 px-4 py-4">
            <AdvancedEditor book={book} onChange={setBook} onSave={commit} />
          </div>
        </details>
      </div>

      <BottomNav />
    </main>
  );
}

function ReadingStatusEditor({
  book,
  onChapter,
  onSection,
}: {
  book: ReferenceBook;
  onChapter: (chapterId: string, read: boolean) => void;
  onSection: (chapterId: string, sectionId: string, read: boolean) => void;
}) {
  return (
    <section aria-labelledby="reading-status-heading">
      <h2 id="reading-status-heading" className="mb-1 text-base font-semibold text-gray-900">
        読了状況の修正
      </h2>
      <p className="mb-3 text-xs text-gray-600">
        ふだんは今日のページの「全部」で自動的に読了になります。まちがいを直すとき、先に読み進めた分をまとめて付けるときに使います。
      </p>
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {book.chapters.map((chapter) => (
          <li key={chapter.id} className="px-4 py-3">
            <label className="flex items-start gap-2.5 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={isChapterRead(chapter)}
                onChange={(e) => onChapter(chapter.id, e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>{chapter.title || "（無題の章）"}</span>
            </label>
            {(chapter.sections ?? []).length > 0 && (
              <ul className="mt-2 space-y-1.5 pl-6">
                {(chapter.sections ?? []).map((section) => (
                  <li key={section.id}>
                    <label className="flex items-start gap-2.5 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={isSectionRead(chapter, section)}
                        onChange={(e) => onSection(chapter.id, section.id, e.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      />
                      <span>{section.title || "（無題の節）"}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdvancedEditor({
  book,
  onChange,
  onSave,
}: {
  book: ReferenceBook;
  onChange: (next: ReferenceBook) => void;
  onSave: (next: ReferenceBook) => void;
}) {
  const [toc, setToc] = useState("");
  const [saved, setSaved] = useState(false);
  const topics = getAllTopics();

  // 入力中は端末にだけ即時反映し、DB へは「保存」でまとめて送る。
  function update(next: ReferenceBook) {
    onChange(next);
    saveReferenceBook(next);
    setSaved(false);
  }

  function handleSave() {
    onSave(book);
    setSaved(true);
  }

  // --- 章操作 ---
  function addChapter() {
    update({
      ...book,
      chapters: [
        ...book.chapters,
        {
          id: genRefId("ch"),
          title: `第${book.chapters.length + 1}章`,
          keywords: [],
          topicIds: [],
          done: false,
          sections: [],
        },
      ],
    });
  }

  function updateChapter(id: string, patch: Partial<ReferenceChapter>) {
    update({
      ...book,
      chapters: book.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  }

  function removeChapter(id: string) {
    update({ ...book, chapters: book.chapters.filter((c) => c.id !== id) });
  }

  function moveChapter(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= book.chapters.length) return;
    const chapters = [...book.chapters];
    [chapters[index], chapters[target]] = [chapters[target], chapters[index]];
    update({ ...book, chapters });
  }

  // --- 節操作 ---
  function addSection(chapterId: string) {
    updateChapter(chapterId, {
      sections: [
        ...(book.chapters.find((c) => c.id === chapterId)?.sections ?? []),
        { id: genRefId("sec"), title: "", keywords: [], topicIds: [] },
      ],
    });
  }

  function updateSection(
    chapterId: string,
    sectionId: string,
    patch: Partial<ReferenceSection>,
  ) {
    const chapter = book.chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    updateChapter(chapterId, {
      sections: (chapter.sections ?? []).map((s) =>
        s.id === sectionId ? { ...s, ...patch } : s,
      ),
    });
  }

  function removeSection(chapterId: string, sectionId: string) {
    const chapter = book.chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    updateChapter(chapterId, {
      sections: (chapter.sections ?? []).filter((s) => s.id !== sectionId),
    });
  }

  // --- 目次テキスト貼り付け ---
  function importToc() {
    const parsed = parseTableOfContents(toc);
    if (parsed.length === 0) return;
    update({ ...book, chapters: [...book.chapters, ...parsed] });
    setToc("");
  }

  return (
    <div className="space-y-6">
      {/* 参考書メタ情報 */}
      <div className="space-y-3">
        <Field label="参考書名">
          <input
            type="text"
            value={book.title}
            onChange={(e) => update({ ...book, title: e.target.value })}
            placeholder="例: いちばんやさしいITパスポート"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="出版社">
            <input
              type="text"
              value={book.publisher ?? ""}
              onChange={(e) => update({ ...book, publisher: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800"
            />
          </Field>
          <Field label="版">
            <input
              type="text"
              value={book.edition ?? ""}
              onChange={(e) => update({ ...book, edition: e.target.value })}
              placeholder="例: 令和6年度版"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800"
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={book.active}
            onChange={(e) => {
              const next = { ...book, active: e.target.checked };
              onSave(next);
            }}
            className="h-4 w-4"
          />
          この参考書を使用中にする
        </label>
        <Field label="メモ（全体）">
          <textarea
            value={book.note ?? ""}
            onChange={(e) => update({ ...book, note: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800"
          />
        </Field>
      </div>

      {/* 目次テキスト貼り付け */}
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-900">目次を貼り付けて章を作る</p>
        <p className="mt-1 text-xs text-gray-600">
          「第○章」「1.1」「Chapter○」などを自動で章・節にします。あとから編集できます。
        </p>
        <textarea
          value={toc}
          onChange={(e) => setToc(e.target.value)}
          rows={4}
          placeholder={"第1章 コンピュータの基礎\n1.1 2進数\n1.2 論理演算\n第2章 ネットワーク"}
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800"
        />
        <button
          type="button"
          onClick={importToc}
          disabled={!toc.trim()}
          className={buttonClass("secondary", "sm", "mt-2")}
        >
          変換して章を追加
        </button>
      </div>

      {/* 章構成 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">
            章構成（{book.chapters.length}章）
          </p>
          <button
            type="button"
            onClick={addChapter}
            className={buttonClass("secondary", "sm")}
          >
            章を追加
          </button>
        </div>

        {book.chapters.length === 0 ? (
          <p className="rounded-lg border border-gray-200 p-5 text-center text-sm text-gray-600">
            まだ章がありません。「章を追加」または目次の貼り付けで作成できます。
          </p>
        ) : (
          <ul className="space-y-4">
            {book.chapters.map((chapter, index) => (
              <li
                key={chapter.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => moveChapter(index, -1)}
                      disabled={index === 0}
                      aria-label="上へ"
                      className="text-gray-500 disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveChapter(index, 1)}
                      disabled={index === book.chapters.length - 1}
                      aria-label="下へ"
                      className="text-gray-500 disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={chapter.title}
                      onChange={(e) =>
                        updateChapter(chapter.id, { title: e.target.value })
                      }
                      placeholder="章タイトル"
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm font-medium text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => removeChapter(chapter.id)}
                      className="mt-2 text-xs text-rose-700 underline underline-offset-2"
                    >
                      章を削除
                    </button>
                  </div>
                </div>

                {/* キーワード（章） */}
                <div className="mt-3">
                  <KeywordsInput
                    label="関連キーワード（カンマ区切り）"
                    value={chapter.keywords ?? []}
                    onChange={(kw) =>
                      updateChapter(chapter.id, { keywords: kw })
                    }
                  />
                </div>

                {/* メモ（章） */}
                <input
                  type="text"
                  value={chapter.note ?? ""}
                  onChange={(e) =>
                    updateChapter(chapter.id, { note: e.target.value })
                  }
                  placeholder="メモ（任意）"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-700"
                />

                {/* トピック紐づけ（章） */}
                <div className="mt-2">
                  <TopicPicker
                    topics={topics}
                    selected={chapter.topicIds ?? []}
                    onChange={(ids) =>
                      updateChapter(chapter.id, { topicIds: ids })
                    }
                  />
                  <LinkedTopicList ids={chapter.topicIds ?? []} />
                </div>

                {/* 節 */}
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-gray-600">
                      節（{chapter.sections?.length ?? 0}）
                    </p>
                    <button
                      type="button"
                      onClick={() => addSection(chapter.id)}
                      className="text-xs text-brand-700 underline underline-offset-2"
                    >
                      節を追加
                    </button>
                  </div>
                  <ul className="space-y-2.5">
                    {(chapter.sections ?? []).map((section) => (
                      <li
                        key={section.id}
                        className="rounded-lg bg-gray-50 p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) =>
                              updateSection(chapter.id, section.id, {
                                title: e.target.value,
                              })
                            }
                            placeholder="節タイトル"
                            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              removeSection(chapter.id, section.id)
                            }
                            aria-label="節を削除"
                            className="shrink-0 text-xs text-rose-700"
                          >
                            削除
                          </button>
                        </div>
                        <div className="mt-2">
                          <TopicPicker
                            topics={topics}
                            selected={section.topicIds ?? []}
                            onChange={(ids) =>
                              updateSection(chapter.id, section.id, {
                                topicIds: ids,
                              })
                            }
                          />
                          <LinkedTopicList ids={section.topicIds ?? []} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        className={buttonClass("primary", "md", "w-full")}
      >
        {saved ? "保存しました" : "詳細設定を保存"}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function KeywordsInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (kw: string[]) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-gray-600">{label}</span>
      <input
        type="text"
        value={value.join("、")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(/[,、\s]+/)
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        placeholder="例: データベース、SQL、主キー"
        className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-700"
      />
    </label>
  );
}

function LinkedTopicList({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  const titles = ids
    .map((id) => getTopic(id))
    .filter((t): t is Topic => Boolean(t));
  if (titles.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {titles.map((t) => (
        <span
          key={t.id}
          className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700"
        >
          {t.title}
        </span>
      ))}
    </div>
  );
}
