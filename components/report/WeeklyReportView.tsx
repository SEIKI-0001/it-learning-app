"use client";

// 週間レポート本体。成績表ではなく、罫線ノートに書かれた「1週間の日記」として読ませる。
// 読み順: 今週の意味 → 成長 → 数字 → 気づき → うまくいかなかったこと → 来週 → モチットより。
// 文章を主、数字を従にする。紙・手書き書体・マーカー・付箋などの表現は
// weeklyDiary.module.css に閉じ込め、アプリ共通の UI 規約には持ち出さない。

import Link from "next/link";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { NextAction, WeeklyReportFacts } from "@/lib/weeklyReportFacts";
import type { NarrativeItem } from "@/lib/weeklyReportNarrative";
import { useWeeklyNarrative } from "@/lib/useWeeklyNarrative";
import { getLessonHref } from "@/lib/learningCatalog";
import { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Mochit from "@/components/mochit/Mochit";
import styles from "./weeklyDiary.module.css";

export default function WeeklyReportView({
  facts,
}: {
  facts: WeeklyReportFacts;
}) {
  const { narrative, status } = useWeeklyNarrative(facts);
  const loading = status === "loading";
  const zero = facts.volume === "none";

  return (
    <article className={styles.sheet} aria-label="今週のふりかえり日記">
      <time className={styles.date} dateTime={facts.period.end}>
        {formatPeriod(facts)}
      </time>

      {/* 1. 今週のあなた */}
      <section aria-labelledby="wr-you" className="animate-rise-in">
        <p id="wr-you" className={styles.eyebrow}>
          今週のあなた
        </p>
        {loading ? (
          <Writing />
        ) : (
          <>
            <h2 className={styles.headline}>
              <span className={styles.marker}>{narrative.headline}</span>
            </h2>
            <p className={`${styles.body} mt-[32px]`}>{narrative.summary}</p>
          </>
        )}
        <WeekStamps facts={facts} />
      </section>

      {/* 2. 今週できるようになったこと */}
      {!zero && (
        <DiarySection id="wr-growth" title="今週できるようになったこと">
          {loading ? (
            <Writing />
          ) : (
            <ItemList items={narrative.growth} mark="check" />
          )}
        </DiarySection>
      )}

      {/* 3. 数字で見る今週（付箋） */}
      {!zero && <NumbersNote facts={facts} />}

      {/* 4. 気づいたこと（AI） */}
      {!zero && (
        <DiarySection id="wr-insight" title="気づいたこと">
          {loading ? (
            <Writing />
          ) : narrative.insights.length > 0 ? (
            <ItemList items={narrative.insights} mark="arrow" />
          ) : (
            <p className={styles.soft}>
              傾向を読み取るには、まだデータが少ない週でした。来週も解いていくと、得意・苦手のくせが見えてきます。
            </p>
          )}
        </DiarySection>
      )}

      {/* 5. うまくいかなかったこと（課題がない週は書かない） */}
      {!zero && narrative.struggle && (
        <DiarySection id="wr-struggle" title="うまくいかなかったこと" pencil>
          {loading ? (
            <Writing />
          ) : (
            <ItemList items={[narrative.struggle]} mark="dash" />
          )}
        </DiarySection>
      )}

      {/* 6. 来週はこれだけ */}
      <NextWeek
        facts={facts}
        note={loading ? null : narrative.nextActionNote}
        zero={zero}
      />

      {/* 7. モチットより */}
      <section aria-labelledby="wr-mochit" className="mt-[32px]">
        <p id="wr-mochit" className={styles.eyebrow}>
          モチットからひとこと
        </p>
        <SnapToLines>
          <div className="flex items-start gap-2">
            <p className={`${styles.body} min-w-0 flex-1 text-brand-700`}>
              {loading ? (
                <span className={styles.writing}>……</span>
              ) : (
                narrative.mochit
              )}
            </p>
            <div className="-mr-1 shrink-0 pt-1">
              <Mochit
                size="small"
                state={zero ? "normal" : "happy"}
                animation="idle"
              />
            </div>
          </div>
        </SnapToLines>
        <p className={styles.signature}>── モチットより</p>
      </section>

      {!loading && (
        <p className="mt-[32px] text-[12px] leading-[16px] text-[#7b7784]">
          {narrative.source === "ai"
            ? "文章はAIが今週の学習記録をもとに書いています。数字はアプリが集計したものです。"
            : "今週の学習記録から自動でまとめています。"}
        </p>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------

const WEEKDAY_FULL = ["日", "月", "火", "水", "木", "金", "土"];

function formatPeriod(facts: WeeklyReportFacts): string {
  const parse = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return { y, m, d, w: WEEKDAY_FULL[new Date(y, m - 1, d).getDay()] };
  };
  const a = parse(facts.period.start);
  const b = parse(facts.period.end);
  const end = a.m === b.m ? `${b.d}日（${b.w}）` : `${b.m}月${b.d}日（${b.w}）`;
  return `${a.y}年${a.m}月${a.d}日（${a.w}）〜 ${end}`;
}

const LINE = 32;

/**
 * 高さが罫線の間隔にそろわないブロック（付箋・枠・モチット）を包み、
 * 高さを 1 行ぶんの倍数に切り上げる。これで下に続く文字が罫線からずれない。
 */
function SnapToLines({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const snap = () => {
      o.style.height = `${Math.ceil(i.offsetHeight / LINE) * LINE}px`;
    };
    snap();
    const ro = new ResizeObserver(snap);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className={className}>
      <div ref={inner}>{children}</div>
    </div>
  );
}

/** 生成を待つ間の表示。灰色の棒ではなく「書いている途中」として見せる。 */
function Writing() {
  return (
    <p className={styles.writing} role="status">
      モチットが日記を書いています……
    </p>
  );
}

function DiarySection({
  id,
  title,
  pencil = false,
  children,
}: {
  id: string;
  title: string;
  pencil?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="animate-rise-in mt-[32px]">
      <h2
        id={id}
        className={`${styles.sectionTitle} ${pencil ? styles.pencil : ""}`}
      >
        {title}
        <Squiggle className={styles.squiggle} />
      </h2>
      <div className={pencil ? styles.soft : undefined}>{children}</div>
    </section>
  );
}

function ItemList({
  items,
  mark,
}: {
  items: NarrativeItem[];
  mark: "check" | "arrow" | "dash";
}) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.signalId} className="relative pl-6">
          <span aria-hidden className="absolute left-0 top-[7px]">
            {mark === "check" ? (
              <HandCheck />
            ) : mark === "arrow" ? (
              <span className="text-brand-700">→</span>
            ) : (
              <span className={styles.pencil}>―</span>
            )}
          </span>
          <p className={styles.itemTitle}>{item.title}</p>
          <p className={styles.soft}>{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

// ---- 手描きの線 --------------------------------------------------------------

function Squiggle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 10"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M2 6 C 22 2, 42 9, 62 5 S 102 2, 122 6 S 162 9, 198 4"
        fill="none"
        stroke="#e08a34"
        strokeWidth="2.2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function HandCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3.5 13.5 C5.6 15.2 7.6 17.4 9.3 20.2 C12.2 13.1 16.4 7.2 21.2 3.2"
        fill="none"
        stroke="#287a55"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 手で丸をつけたような円（始点と終点を少しずらして重ねる）。 */
function HandCircle({ seed }: { seed: number }) {
  const r = seed % 3;
  const d = [
    "M19 3.6c8.8-.6 15.8 5.9 16.2 14.6.4 9-6.4 16.4-15.4 16.8C11 35.4 3.9 28.8 3.6 20 3.3 11.6 9.2 4.8 17.4 3.9c3.1-.3 6.2.5 8.7 2.1",
    "M21.5 4.2c8.2.4 14.3 7.3 13.8 15.8-.5 8.9-7.7 15.3-16.4 14.7C10.6 34.1 4.3 27.3 4.7 18.9 5.1 10.6 11.8 4.1 20.2 3.9c2.7 0 5.2.7 7.4 1.9",
    "M17.8 4.4c9.1-1.1 16.6 5.1 17.4 13.7.8 9.1-5.7 16.8-14.7 17.4-8.6.6-16-5.8-16.6-14.3C3.3 12.8 9 5.9 16.8 4.7c3.4-.5 6.8.2 9.6 1.7",
  ][r];
  return (
    <svg className={styles.stampCircle} viewBox="0 0 40 40" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke="#e08a34"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 7日間。学習した日に手描きの丸をつける。今日を右端に置く。 */
function WeekStamps({ facts }: { facts: WeeklyReportFacts }) {
  const days = facts.period.days;
  return (
    <ol className="mt-[12px] grid grid-cols-7" aria-label="この7日間の学習記録">
      {days.map((d, i) => {
        const studied = d.answered > 0;
        const today = i === days.length - 1;
        return (
          <li
            key={d.date}
            className="flex flex-col items-center"
            aria-label={`${d.weekday}曜日 ${studied ? `${d.answered}問` : "記録なし"}`}
          >
            <span className={`${styles.stamp} ${studied ? "" : styles.pencil}`}>
              {studied && <HandCircle seed={i} />}
              <span className={today ? "font-semibold" : undefined}>
                {today ? "今日" : d.weekday}
              </span>
            </span>
            <span
              className={`text-[12px] leading-[16px] tabular-nums ${styles.pencil}`}
            >
              {studied ? `${d.answered}問` : "・"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// 数字のメモ（付箋）。重要な項目だけ・先週比は比較できるときだけ
// ---------------------------------------------------------------------------

type Stat = { label: string; value: string; delta?: string | null };

function signed(n: number, unit: string): string {
  if (n === 0) return `±0${unit}`;
  return `${n > 0 ? "+" : "−"}${Math.abs(n)}${unit}`;
}

function NumbersNote({ facts }: { facts: WeeklyReportFacts }) {
  const t = facts.totals;
  const lw = facts.lastWeek;
  const stats: Stat[] = [
    {
      label: "解いた問題",
      value: `${t.answered}問`,
      delta: lw ? signed(t.answered - lw.answered, "問") : null,
    },
    {
      label: "正答率",
      value: t.accuracy === null ? "—" : `${t.accuracy}%`,
      delta:
        lw && lw.accuracy !== null && t.accuracy !== null
          ? signed(t.accuracy - lw.accuracy, "pt")
          : null,
    },
    {
      label: "学習した日",
      value: `${t.daysStudied}/7日`,
      delta: lw ? signed(t.daysStudied - lw.daysStudied, "日") : null,
    },
  ];
  if (facts.firstTry.accuracy !== null)
    stats.push({
      label: "はじめての問題",
      value: `${facts.firstTry.accuracy}%`,
    });
  if (facts.retry.accuracy !== null)
    stats.push({ label: "解き直した問題", value: `${facts.retry.accuracy}%` });
  stats.push({ label: "復習待ち", value: `${facts.reviews.waiting}件` });

  return (
    <SnapToLines className="animate-rise-in mt-[32px]">
      <section aria-labelledby="wr-numbers" className="pt-[16px]">
        <div className={styles.note}>
          <span className={styles.tape} aria-hidden />
          <h2 id="wr-numbers" className="text-[15px] font-semibold">
            数字のメモ
            <span className={`ml-2 text-[12px] font-normal ${styles.pencil}`}>
              {lw ? "（ ）は先週との差" : "先週の記録はまだありません"}
            </span>
          </h2>
          <dl className="mt-2 grid grid-cols-3 gap-y-3">
            {stats.slice(0, 6).map((s) => (
              <div key={s.label} className="text-center">
                <dt className={`text-[12px] ${styles.soft}`}>{s.label}</dt>
                <dd className="text-[20px] tabular-nums">{s.value}</dd>
                {s.delta && (
                  <dd className={`text-[12px] tabular-nums ${styles.soft}`}>
                    （{s.delta}）
                  </dd>
                )}
              </div>
            ))}
          </dl>
          {facts.volume === "low" && (
            <p className={`mt-2 text-[12px] ${styles.pencil}`}>
              ※ 今週は数が少なめなので、正答率などは参考値。
            </p>
          )}
        </div>
      </section>
    </SnapToLines>
  );
}

// ---------------------------------------------------------------------------
// 来週はこれだけ（既存ロジックが選んだ候補だけを出す）
// ---------------------------------------------------------------------------

const ACTION_LABEL: Record<NextAction["kind"], string> = {
  review: "復習",
  weak: "苦手の解き直し",
  new_topic: "次のレッスン",
  comeback: "軽い復習",
};

function NextWeek({
  facts,
  note,
  zero,
}: {
  facts: WeeklyReportFacts;
  note: string | null;
  zero: boolean;
}) {
  const [primary, secondary] = facts.nextActions;
  const href =
    primary?.kind === "comeback"
      ? getLessonHref(primary.topicId, {
          from: "today",
          activity: "review",
          anchor: "lesson-quiz",
        })
      : "/today";

  return (
    <section aria-labelledby="wr-next" className="animate-rise-in mt-[32px]">
      <h2 id="wr-next" className={styles.sectionTitle}>
        {zero ? "まずはここから" : "来週はこれだけ"}
        <Squiggle className={styles.squiggle} />
      </h2>
      <SnapToLines>
        <div className={`${styles.roughBox} mt-[8px]`}>
          {primary ? (
            <>
              <p className={`text-[13px] leading-[20px] ${styles.soft}`}>
                {ACTION_LABEL[primary.kind]}
              </p>
              <p className="flex items-baseline justify-between gap-3 leading-[28px]">
                <span className="min-w-0 text-[19px] font-semibold">
                  <span className={styles.marker}>{primary.title}</span>
                </span>
                <span
                  className={`shrink-0 text-[13px] tabular-nums ${styles.soft}`}
                >
                  約{primary.estimatedMinutes}分
                </span>
              </p>
              <p className={`mt-1 leading-[28px] ${styles.soft}`}>
                {note ?? primary.reason}
              </p>
              {secondary && (
                <p
                  className={`mt-1 text-[14px] leading-[24px] ${styles.pencil}`}
                >
                  余裕があれば：{ACTION_LABEL[secondary.kind]}「
                  {secondary.title}」
                </p>
              )}
            </>
          ) : (
            <p className={`leading-[28px] ${styles.soft}`}>
              今日のメニューから、いつもどおり進めましょう。
            </p>
          )}
          <Link
            href={primary ? href : "/today"}
            className={buttonClass("primary", "md", "mt-3 w-full font-sans")}
          >
            {primary?.kind === "comeback"
              ? "1問だけ解いてみる"
              : "今日のメニューへ"}
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
          {!zero && primary && (
            <Link
              href="/plan"
              className={`mt-1 block text-center text-[13px] leading-[28px] underline decoration-dotted underline-offset-4 ${styles.soft}`}
            >
              学習計画を見る
            </Link>
          )}
        </div>
      </SnapToLines>
    </section>
  );
}
