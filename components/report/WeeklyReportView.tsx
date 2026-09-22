"use client";

// 週間レポート本体。成績表ではなく「AI 学習コーチとの週次の振り返り」として読ませる。
// 読み順: 今週の意味 → 成長 → 数字 → AIの気づき → うまくいかなかったこと → 来週 → モチット。
// 文章を主、数字を従にする。カードを並べず、1本の読み物として区切り線でつなぐ。

import Link from "next/link";
import type { ReactNode } from "react";
import type { NextAction, WeeklyReportFacts } from "@/lib/weeklyReportFacts";
import type { NarrativeItem } from "@/lib/weeklyReportNarrative";
import { useWeeklyNarrative } from "@/lib/useWeeklyNarrative";
import { getLessonHref } from "@/lib/learningCatalog";
import { buttonClass } from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import Mochit from "@/components/mochit/Mochit";

export default function WeeklyReportView({ facts }: { facts: WeeklyReportFacts }) {
  const { narrative, status } = useWeeklyNarrative(facts);
  const loading = status === "loading";
  const zero = facts.volume === "none";

  return (
    <article className="space-y-9">
      {/* 1. 今週のあなた */}
      <section aria-labelledby="wr-you" className="animate-rise-in">
        <p id="wr-you" className="text-xs font-medium text-gray-500">
          今週のあなた
        </p>
        {loading ? (
          <TextSkeleton lines={3} large />
        ) : (
          <>
            <h2 className="mt-2 text-xl font-medium leading-snug tracking-[-0.02em] text-gray-900">
              {narrative.headline}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-700">{narrative.summary}</p>
          </>
        )}
        <WeekStrip facts={facts} />
      </section>

      {/* 2. 今週できるようになったこと */}
      {!zero && (
        <Section id="wr-growth" icon="sprout" iconClass="text-emerald-600" title="今週できるようになったこと">
          {loading ? <TextSkeleton lines={4} /> : <ItemList items={narrative.growth} />}
        </Section>
      )}

      {/* 3. 数字で見る今週 */}
      {!zero && <NumbersSection facts={facts} />}

      {/* 4. AIが見つけたこと */}
      {!zero && (
        <Section id="wr-insight" icon="lightbulb" iconClass="text-brand-600" title="AIが見つけたこと">
          {loading ? (
            <TextSkeleton lines={4} />
          ) : narrative.insights.length > 0 ? (
            <ItemList items={narrative.insights} />
          ) : (
            <p className="text-sm leading-relaxed text-gray-600">
              傾向を読み取るには、まだデータが少ない週でした。来週も解いていくと、得意・苦手のくせが見えてきます。
            </p>
          )}
        </Section>
      )}

      {/* 5. うまくいかなかったこと（課題がない週は出さない） */}
      {!zero && narrative.struggle && (
        <Section id="wr-struggle" icon="alert" iconClass="text-accent-600" title="うまくいかなかったこと">
          {loading ? <TextSkeleton lines={3} /> : <ItemList items={[narrative.struggle]} />}
        </Section>
      )}

      {/* 6. 来週はこれだけ */}
      <NextWeekSection facts={facts} note={loading ? null : narrative.nextActionNote} zero={zero} />

      {/* 7. モチットから一言 */}
      <section aria-labelledby="wr-mochit" className="flex items-end gap-3">
        <Mochit size="small" state={zero ? "normal" : "happy"} animation="idle" />
        <div className="min-w-0 flex-1">
          <p id="wr-mochit" className="text-xs font-medium text-gray-500">
            モチットから一言
          </p>
          <div className="mt-1.5 rounded-xl rounded-bl-sm bg-gray-100 px-4 py-3">
            {loading ? (
              <TextSkeleton lines={2} />
            ) : (
              <p className="text-sm leading-relaxed text-gray-800">{narrative.mochit}</p>
            )}
          </div>
        </div>
      </section>

      {!loading && (
        <p className="text-center text-[11px] leading-relaxed text-gray-500">
          {narrative.source === "ai"
            ? "文章はAIが今週の学習記録をもとに書いています。数値はアプリが集計したものです。"
            : "今週の学習記録から自動でまとめています。"}
        </p>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------

function Section({
  id,
  icon,
  iconClass,
  title,
  children,
}: {
  id: string;
  icon: IconName;
  iconClass: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="animate-rise-in border-t border-gray-200 pt-6">
      <h2 id={id} className="flex items-center gap-2 text-base font-medium text-gray-900">
        <Icon name={icon} className={`h-4 w-4 shrink-0 ${iconClass}`} />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ItemList({ items }: { items: NarrativeItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.signalId}>
          <p className="text-[15px] font-medium leading-snug text-gray-900">{item.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

function TextSkeleton({ lines, large = false }: { lines: number; large?: boolean }) {
  return (
    <div className="mt-2 animate-pulse space-y-2" aria-label="振り返りを書いています" role="status">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`rounded bg-gray-200 ${large && i === 0 ? "h-6 w-4/5" : "h-3.5"} ${
            i === lines - 1 && !(large && i === 0) ? "w-3/5" : large && i === 0 ? "" : "w-full"
          }`}
        />
      ))}
    </div>
  );
}

/** 7日間の学習有無。今日を右端に置く。 */
function WeekStrip({ facts }: { facts: WeeklyReportFacts }) {
  const days = facts.period.days;
  return (
    <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="この7日間の学習記録">
      {days.map((d, i) => {
        const studied = d.answered > 0;
        const today = i === days.length - 1;
        return (
          <li key={d.date} className="flex flex-col items-center gap-1">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] tabular-nums ${
                studied ? "bg-emerald-500 text-white" : "border border-dashed border-gray-300 text-gray-400"
              }`}
              aria-label={`${d.weekday}曜日 ${studied ? `${d.answered}問` : "記録なし"}`}
            >
              {studied ? d.answered : ""}
            </span>
            <span className={`text-[11px] ${today ? "font-medium text-gray-900" : "text-gray-500"}`}>
              {today ? "今日" : d.weekday}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// 数字で見る今週（重要な項目だけ・先週比は比較できるときだけ）
// ---------------------------------------------------------------------------

type Stat = { label: string; value: string; delta?: { text: string; up: boolean } | null };

function signed(n: number, unit: string): { text: string; up: boolean } | null {
  if (n === 0) return { text: `±0${unit}`, up: false };
  return { text: `${n > 0 ? "+" : "−"}${Math.abs(n)}${unit}`, up: n > 0 };
}

function NumbersSection({ facts }: { facts: WeeklyReportFacts }) {
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
      delta: lw && lw.accuracy !== null && t.accuracy !== null ? signed(t.accuracy - lw.accuracy, "pt") : null,
    },
    {
      label: "学習した日",
      value: `${t.daysStudied}/7日`,
      delta: lw ? signed(t.daysStudied - lw.daysStudied, "日") : null,
    },
  ];
  if (facts.firstTry.accuracy !== null) {
    stats.push({ label: "はじめての問題", value: `${facts.firstTry.accuracy}%`, delta: null });
  }
  if (facts.retry.accuracy !== null) {
    stats.push({ label: "解き直した問題", value: `${facts.retry.accuracy}%`, delta: null });
  }
  stats.push({ label: "復習待ち", value: `${facts.reviews.waiting}件`, delta: null });

  return (
    <section aria-labelledby="wr-numbers" className="animate-rise-in border-t border-gray-200 pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="wr-numbers" className="flex items-center gap-2 text-base font-medium text-gray-900">
          <Icon name="chart" className="h-4 w-4 shrink-0 text-gray-500" />
          数字で見る今週
        </h2>
        <span className="text-[11px] text-gray-500">{lw ? "右下は先週比" : "先週の記録なし"}</span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-y-4 border-y border-gray-200 py-4">
        {stats.slice(0, 6).map((s) => (
          <div key={s.label} className="px-1 text-center">
            <dt className="text-[11px] text-gray-600">{s.label}</dt>
            <dd className="mt-1 text-lg font-medium tabular-nums text-gray-900">{s.value}</dd>
            {s.delta && (
              <dd
                className={`text-[11px] tabular-nums ${s.delta.up ? "text-emerald-700" : "text-gray-500"}`}
              >
                {s.delta.text}
              </dd>
            )}
          </div>
        ))}
      </dl>
      {facts.volume === "low" && (
        <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
          今週は解いた数が少なめなので、正答率などは参考値です。
        </p>
      )}
    </section>
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

function NextWeekSection({
  facts,
  note,
  zero,
}: {
  facts: WeeklyReportFacts;
  note: string | null;
  zero: boolean;
}) {
  const [primary, secondary] = facts.nextActions;
  const primaryHref =
    primary?.kind === "comeback"
      ? getLessonHref(primary.topicId, { from: "today", activity: "review", anchor: "lesson-quiz" })
      : "/today";

  return (
    <section
      aria-labelledby="wr-next"
      className="animate-rise-in rounded-xl border border-brand-200 bg-brand-50 p-4"
    >
      <h2 id="wr-next" className="flex items-center gap-2 text-base font-medium text-gray-900">
        <Icon name="target" className="h-4 w-4 shrink-0 text-brand-600" />
        {zero ? "まずはここから" : "来週はこれだけ"}
      </h2>

      {primary ? (
        <>
          <p className="mt-3 text-xs text-brand-700">{ACTION_LABEL[primary.kind]}</p>
          <p className="mt-0.5 flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-[17px] font-medium leading-snug text-gray-900">
              {primary.title}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-gray-600">
              約{primary.estimatedMinutes}分
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{note ?? primary.reason}</p>
          {secondary && (
            <p className="mt-3 border-t border-brand-200 pt-3 text-xs leading-relaxed text-gray-600">
              余裕があれば：{ACTION_LABEL[secondary.kind]}「{secondary.title}」
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Link href={primaryHref} className={buttonClass("primary", "md", "w-full")}>
              {primary.kind === "comeback" ? "1問だけ解いてみる" : "今日のメニューへ"}
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
            {!zero && (
              <Link href="/plan" className="text-center text-xs text-gray-600 underline-offset-2 hover:underline">
                学習計画を見る
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            今日のメニューから、いつもどおり進めましょう。
          </p>
          <Link href="/today" className={buttonClass("primary", "md", "mt-4 w-full")}>
            今日のメニューへ
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
        </>
      )}
    </section>
  );
}
