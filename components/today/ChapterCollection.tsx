"use client";

// 「章のコレクション」（/today の右列）。18章のアイコンをホーム画面のように並べ、
// 学び始めた章から色がつき、習得した章にはチェックが付く。今日の学習がどの章を
// 埋めていくのかを見せて、次の1レッスンへの動機にする。
// 状態の判定は /learn と同じ lib/lessonState を使い、ここで新しい基準は作らない。

import { useMemo } from "react";
import Link from "next/link";
import type { UserProgress } from "@/types";
import { getAllThemes } from "@/lib/learningCatalog";
import { getThemeMasterState } from "@/lib/lessonState";
import ThemeAppIcon, { getThemeAppIconMeta } from "@/components/ui/ThemeAppIcon";
import s from "./todayView.module.css";

export default function ChapterCollection({
  progress,
  todayChapterNumbers,
}: {
  progress: UserProgress;
  /** 今日の順番に入っている章。アイコンに輪をかけて示す。 */
  todayChapterNumbers: number[];
}) {
  const themes = useMemo(() => getAllThemes(), []);
  const today = new Set(todayChapterNumbers);
  const items = themes.map((theme) => ({ theme, state: getThemeMasterState(theme, progress) }));
  const startedCount = items.filter((item) => item.state !== "not_started").length;
  const masteredCount = items.filter(
    (item) => item.state === "mastered" || item.state === "fully_mastered",
  ).length;

  return (
    <section className={s.collection} aria-labelledby="collection-heading">
      <div className={s.sheetHead}>
        <h2 id="collection-heading" className={s.sectionTitle}>
          章のコレクション
        </h2>
        <span className={s.sectionMeta}>
          <span className={s.mono}>{startedCount}</span> / {themes.length} 章
        </span>
      </div>
      <p className={s.collectionNote}>
        学び始めた章から色がつきます。
        {masteredCount > 0 && (
          <>
            習得 <span className={s.mono}>{masteredCount}</span> 章。
          </>
        )}
      </p>

      <ul className={s.collectionGrid}>
        {items.map(({ theme, state }) => {
          const muted = state === "not_started";
          const isToday = today.has(theme.chapterNumber);
          const stateLabel =
            state === "not_started"
              ? "未着手"
              : state === "mastered" || state === "fully_mastered"
                ? "習得済み"
                : state === "review_due"
                  ? "復習待ち"
                  : "学習中";
          return (
            <li key={theme.id}>
              <Link
                href={`/learn/${theme.slug}`}
                className={s.collectionItem}
                data-today={isToday || undefined}
                aria-label={`第${theme.chapterNumber}章 ${theme.title}（${stateLabel}${isToday ? "・今日の学習" : ""}）`}
                title={theme.title}
              >
                <ThemeAppIcon
                  theme={theme}
                  size={36}
                  muted={muted && !isToday}
                  badge={
                    state === "fully_mastered"
                      ? { kind: "fully_mastered" }
                      : state === "mastered"
                        ? { kind: "mastered" }
                        : undefined
                  }
                />
                <span className={s.collectionLabel}>{getThemeAppIconMeta(theme).shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
