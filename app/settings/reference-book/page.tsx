"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  loadReferenceBook,
  parseTableOfContents,
  saveReferenceBook,
} from "@/lib/referenceBook";
import {
  loadReferenceBookFromDb,
  saveReferenceBookToDb,
} from "@/lib/referenceBookSync";
import { getUserId } from "@/lib/userSession";
import TopicPicker from "@/components/reference/TopicPicker";
import BottomNav from "@/components/BottomNav";

// /settings/reference-book = 参考書アウトラインの編集。
// 参考書名/出版社/版/使用中/章節の追加編集削除並び替え/メモ/キーワード/トピック紐づけ/
// 目次テキスト貼り付け変換。localStorage を主に、ログイン時は DB へも同期する。
// 参考書未登録でも学習は Topic.referenceHints にフォールバックするので、この設定は任意。

export default function ReferenceBookSettingsPage() {
  // undefined = 読み込み中 / ReferenceBook = 読み込み済み
  const [book, setBook] = useState<ReferenceBook | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const local = loadReferenceBook();
      if (local && !cancelled) setBook(local);
      const userId = getUserId();
      if (userId) {
        const db = await loadReferenceBookFromDb(userId);
        if (cancelled) return;
        if (db && !local) {
          saveReferenceBook(db);
          setBook(db);
          return;
        }
      }
      if (!local && !cancelled) setBook(createEmptyReferenceBook());
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  if (book === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
        読み込み中…
      </main>
    );
  }

  return <ReferenceBookEditor initial={book} />;
}

function ReferenceBookEditor({ initial }: { initial: ReferenceBook }) {
  const [book, setBook] = useState<ReferenceBook>(initial);
  const [toc, setToc] = useState("");
  const [saved, setSaved] = useState(false);
  const topics = getAllTopics();

  // localStorage には即時反映（安価）。DB は保存ボタン/トグル時にまとめて同期する。
  function update(next: ReferenceBook) {
    setBook(next);
    saveReferenceBook(next);
    setSaved(false);
  }

  function persistToDb(next: ReferenceBook) {
    const userId = getUserId();
    if (userId) saveReferenceBookToDb(userId, next);
  }

  function handleSave() {
    saveReferenceBook(book);
    persistToDb(book);
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
    <main className="min-h-screen bg-gray-50 pb-28">
      <div className="mx-auto w-full max-w-md px-4 py-8 md:max-w-2xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-indigo-500">参考書の設定</p>
          <Link
            href="/plan"
            className="text-sm font-medium text-gray-400 underline underline-offset-4"
          >
            もどる
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-gray-800">
          参考書アウトライン
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          お使いの参考書の章立てを登録すると、「今日読む場所」を案内できます。
          登録しなくても、各トピックの「探すキーワード」で学習できます。
        </p>

        {/* 参考書メタ情報 */}
        <section className="mt-6 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <Field label="参考書名">
            <input
              type="text"
              value={book.title}
              onChange={(e) => update({ ...book, title: e.target.value })}
              placeholder="例: いちばんやさしいITパスポート"
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="出版社">
              <input
                type="text"
                value={book.publisher ?? ""}
                onChange={(e) => update({ ...book, publisher: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-700"
              />
            </Field>
            <Field label="版">
              <input
                type="text"
                value={book.edition ?? ""}
                onChange={(e) => update({ ...book, edition: e.target.value })}
                placeholder="例: 令和6年度版"
                className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-700"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={book.active}
              onChange={(e) => {
                const next = { ...book, active: e.target.checked };
                update(next);
                persistToDb(next);
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
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-700"
            />
          </Field>
        </section>

        {/* 目次テキスト貼り付け */}
        <section className="mt-5 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
          <p className="text-sm font-bold text-indigo-700">
            📋 目次を貼り付けて章を作る
          </p>
          <p className="mt-1 text-xs text-indigo-600">
            「第○章」「1.1」「Chapter○」などを自動で章・節にします。あとから編集できます。
          </p>
          <textarea
            value={toc}
            onChange={(e) => setToc(e.target.value)}
            rows={4}
            placeholder={"第1章 コンピュータの基礎\n1.1 2進数\n1.2 論理演算\n第2章 ネットワーク"}
            className="mt-2 w-full rounded-xl border-2 border-indigo-200 bg-white px-3 py-2.5 text-sm text-gray-700"
          />
          <button
            type="button"
            onClick={importToc}
            disabled={!toc.trim()}
            className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            変換して章を追加
          </button>
        </section>

        {/* 章構成 */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-800">
              章構成（{book.chapters.length}章）
            </h2>
            <button
              type="button"
              onClick={addChapter}
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              ＋ 章を追加
            </button>
          </div>

          {book.chapters.length === 0 ? (
            <p className="rounded-2xl bg-white p-5 text-center text-sm text-gray-400 ring-1 ring-gray-100">
              まだ章がありません。「＋ 章を追加」または目次の貼り付けで作成できます。
            </p>
          ) : (
            <ul className="space-y-4">
              {book.chapters.map((chapter, index) => (
                <li
                  key={chapter.id}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => moveChapter(index, -1)}
                        disabled={index === 0}
                        aria-label="上へ"
                        className="text-gray-400 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveChapter(index, 1)}
                        disabled={index === book.chapters.length - 1}
                        aria-label="下へ"
                        className="text-gray-400 disabled:opacity-30"
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
                        className="w-full rounded-lg border-2 border-gray-200 px-2.5 py-2 text-sm font-bold text-gray-800"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                          <input
                            type="checkbox"
                            checked={chapter.done ?? false}
                            onChange={(e) => {
                              const next = {
                                ...book,
                                chapters: book.chapters.map((c) =>
                                  c.id === chapter.id
                                    ? { ...c, done: e.target.checked }
                                    : c,
                                ),
                              };
                              update(next);
                              persistToDb(next);
                            }}
                            className="h-4 w-4"
                          />
                          読んだ
                        </label>
                        <button
                          type="button"
                          onClick={() => removeChapter(chapter.id)}
                          className="text-xs font-semibold text-rose-500 underline underline-offset-2"
                        >
                          章を削除
                        </button>
                      </div>
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
                    className="mt-2 w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-600"
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
                      <p className="text-xs font-bold text-gray-500">
                        節（{chapter.sections?.length ?? 0}）
                      </p>
                      <button
                        type="button"
                        onClick={() => addSection(chapter.id)}
                        className="text-xs font-bold text-indigo-600"
                      >
                        ＋ 節を追加
                      </button>
                    </div>
                    <ul className="space-y-2.5">
                      {(chapter.sections ?? []).map((section) => (
                        <li
                          key={section.id}
                          className="rounded-xl bg-gray-50 p-2.5"
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
                              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                removeSection(chapter.id, section.id)
                              }
                              aria-label="節を削除"
                              className="shrink-0 text-xs font-semibold text-rose-400"
                            >
                              ✕
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
        </section>
      </div>

      {/* 保存バー（固定） */}
      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-3 text-base font-extrabold text-white shadow-lg transition active:scale-[0.98]"
          >
            {saved ? "✓ 保存しました" : "💾 参考書を保存"}
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
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
      <span className="mb-1 block text-xs font-bold text-gray-500">{label}</span>
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
      <span className="mb-1 block text-xs font-bold text-gray-500">{label}</span>
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
          className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600"
        >
          {t.title}
        </span>
      ))}
    </div>
  );
}
