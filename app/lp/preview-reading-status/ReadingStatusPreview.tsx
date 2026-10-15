"use client";

import { ReadingStatusCard } from "@/components/progress/ProgressDetailCards";
import { applyReadingLevel, referenceReadingOverview } from "@/lib/referenceBook";
import { listReferenceBookPresets, referenceBookFromPreset } from "@/lib/referenceBookPresets";
import type { ReferenceBook, ReferenceReadTarget } from "@/types/referenceBook";
import t from "@/components/today/todayView.module.css";
import p from "@/components/progress/progressDashboard.module.css";

// 前から順に読み進めた想定: 最初の2章は読了、3章目は途中まで＋1節だけ読み始め。
function sampleBook(): ReferenceBook | null {
  const preset = listReferenceBookPresets()[0];
  const base = preset ? referenceBookFromPreset(preset.id) : null;
  if (!base) return null;
  const targets = (from: number, to: number): ReferenceReadTarget[] =>
    base.chapters.slice(from, to).flatMap((c) =>
      (c.sections ?? []).length > 0
        ? (c.sections ?? []).map((s) => ({ chapterId: c.id, sectionId: s.id }))
        : [{ chapterId: c.id }],
    );
  let book = applyReadingLevel(base, targets(0, 2), "all", "2026-10-10T12:00:00.000Z");
  const third = base.chapters[2];
  const sections = third?.sections ?? [];
  if (third && sections.length > 0) {
    const half = Math.max(1, Math.floor(sections.length / 2));
    book = applyReadingLevel(
      book,
      sections.slice(0, half).map((s) => ({ chapterId: third.id, sectionId: s.id })),
      "all",
      "2026-10-14T12:00:00.000Z",
    );
    if (sections[half]) {
      book = applyReadingLevel(
        book,
        [{ chapterId: third.id, sectionId: sections[half].id }],
        "little",
        "2026-10-15T12:00:00.000Z",
      );
    }
  }
  return book;
}

export default function ReadingStatusPreview() {
  const book = sampleBook();
  const overview = referenceReadingOverview(book);
  return (
    <main className={t.view}>
      <div className={`${t.inner} ${p.dashboard}`}>
        <p className={p.spanFull} style={{ margin: 0, fontSize: 12, color: "var(--ink-3)" }}>
          確認用ページ：/progress に追加する「参考書の読了状況」カードを、サンプルの読了データで表示しています。
        </p>
        {book && overview ? (
          <ReadingStatusCard bookTitle={book.title} overview={overview} className={p.spanFull} />
        ) : (
          <p>プリセットの参考書が見つかりません。</p>
        )}
      </div>
    </main>
  );
}
