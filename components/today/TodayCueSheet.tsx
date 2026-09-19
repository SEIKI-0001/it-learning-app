"use client";

// /today の進行表。上から順に「開始からの経過時間・所要時間・新規/復習」を並べ、
// いまやる1件だけを開いて、その理由をモチットが話す。
// 行の完了は実際の解答（lib/questRoute の isTaskDoneToday）で決まり、ここでは操作させない。

import { useState } from "react";
import Link from "next/link";
import Mochit from "@/components/mochit/Mochit";
import ThemeAppIcon from "@/components/ui/ThemeAppIcon";
import { getTopic } from "@/lib/content";
import type { TodayPrimaryAction } from "@/types/gameful";
import { formatOffset, type TodaySlot } from "./todaySlots";
import s from "./todayView.module.css";

const KIND_LABEL: Record<TodaySlot["kind"], string> = { new: "新規", review: "復習" };

// 推奨理由の一部は内部向けの短いラベル（lib/todayPrimary の FALLBACK_REASON 等）なので、
// モチットの吹き出しで読める文に言い換える。理由の中身は変えない。
const SPOKEN_REASON: Record<string, string> = {
  "次の新規Topic": "計画の順番で、次に学ぶレッスンです。",
  "理解度が低い重要Topic": "理解度がまだ低い、大事なトピックです。",
  "復習予定日です。": "今日が復習予定日です。忘れかける前に確認しよう。",
};

function spokenReason(reason: string): string {
  return SPOKEN_REASON[reason] ?? reason;
}

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden>
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

function StartArrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden>
      <path d="M7.5 4.5l5.5 5.5-5.5 5.5" />
    </svg>
  );
}

export default function TodayCueSheet({
  slots,
  primary,
  hrefFor,
  aiGradingHrefFor,
}: {
  slots: TodaySlot[];
  /** 今日の最優先。突破試験のときは進行表の先頭に1行足す。 */
  primary: TodayPrimaryAction | null;
  hrefFor: (slot: TodaySlot) => string;
  aiGradingHrefFor: (slot: TodaySlot) => string | null;
}) {
  const doneCount = slots.filter((slot) => slot.state === "done").length;
  // 画面を開いた時点の完了数。これより増えたときだけモチットに完了を喜ばせる。
  const [baselineDone] = useState(doneCount);
  const mochitEvent =
    doneCount > baselineDone ? { type: "taskComplete" as const, id: doneCount } : null;

  const total = slots.reduce((sum, slot) => sum + slot.minutes, 0);
  const allDone = slots.length > 0 && doneCount === slots.length;
  const finalExam = primary?.kind === "final_exam" ? primary : null;

  return (
    <section className={s.sheet} aria-labelledby="cue-heading">
      <div className={s.sheetHead}>
        <h2 id="cue-heading" className={s.sectionTitle}>
          今日の順番
        </h2>
        {slots.length > 0 && <span className={s.sectionMeta}>開始からの経過時間</span>}
      </div>

      <ol className={s.cues}>
        {finalExam && (
          <li className={s.cue} data-state="now" data-kind="new">
            <span className={s.offset}>先に</span>
            <span className={s.mark} aria-hidden />
            <div className={s.cueBody}>
              <div className={s.cueLine}>
                <p className={s.cueTitle}>{finalExam.title}</p>
                {finalExam.questionCount !== null && (
                  <span className={s.cueMinutes}>
                    <span className={s.mono}>{finalExam.questionCount}</span>問
                  </span>
                )}
              </div>
              <p className={s.cueMeta}>
                <span className={s.kind} data-kind="new">
                  突破試験
                </span>
              </p>
              <div className={s.nowPanel}>
                <div className={s.mochitSay}>
                  <Mochit
                    size="small"
                    state="cheering"
                    screenContext="today"
                    className={s.mochitFigure}
                  />
                  <p className={s.bubble}>{finalExam.reasonLabel}。いまなら挑戦できます。</p>
                </div>
                <div className={s.nowActions}>
                  <Link href={finalExam.href} className={s.start}>
                    突破試験に挑戦する
                    <StartArrow />
                  </Link>
                </div>
              </div>
            </div>
          </li>
        )}

        {slots.map((slot) => {
          // 突破試験を先頭に出しているときは、ルート側の現在地は開かない。
          const state = finalExam && slot.state === "now" ? "next" : slot.state;
          const questionCount = getTopic(slot.topicId)?.checkQuestions.length ?? 0;
          const reason =
            primary && primary.topicId === slot.topicId
              ? primary.reasonLabel
              : slot.kind === "review"
                ? "復習予定日です。"
                : "今日の学習の続きです。";
          const aiGradingHref = aiGradingHrefFor(slot);
          return (
            <li key={slot.id} className={s.cue} data-state={state} data-kind={slot.kind}>
              <span className={s.offset}>{formatOffset(slot.start)}</span>
              <span className={s.mark} aria-hidden>
                <CheckMark />
              </span>
              <div className={s.cueBody}>
                <div className={s.cueLine} data-with-icon={slot.chapterNumber !== null || undefined}>
                  <span className={s.cueTitleGroup}>
                    {slot.chapterNumber !== null && (
                      <ThemeAppIcon
                        theme={{ chapterNumber: slot.chapterNumber }}
                        size={state === "now" ? 40 : 28}
                        className={s.cueIcon}
                      />
                    )}
                    {state === "now" ? (
                      <p className={s.cueTitle}>{slot.title}</p>
                    ) : (
                      <Link href={hrefFor(slot)} className={`${s.cueTitle} ${s.cueTitleLink}`}>
                        {slot.title}
                      </Link>
                    )}
                  </span>
                  <span className={s.cueMinutes}>
                    <span className={s.mono}>{slot.minutes}</span>分
                  </span>
                </div>
                <p className={s.cueMeta}>
                  <span className={s.kind} data-kind={slot.kind}>
                    {KIND_LABEL[slot.kind]}
                  </span>
                  {slot.field && <span>{slot.field}</span>}
                  {state === "done" && <span className={s.doneText}>完了</span>}
                </p>

                {state === "now" && (
                  <div className={s.nowPanel}>
                    <div className={s.mochitSay}>
                      <Mochit
                        size="small"
                        screenContext="today"
                        event={mochitEvent}
                        className={s.mochitFigure}
                      />
                      <p className={s.bubble}>{spokenReason(reason)}</p>
                    </div>
                    <div className={s.nowActions}>
                      <Link href={hrefFor(slot)} className={s.start} data-kind={slot.kind}>
                        {slot.kind === "review" ? "復習を始める" : "レッスンを始める"}
                        <StartArrow />
                      </Link>
                      <span className={s.nowHint}>
                        {questionCount > 0 ? (
                          <>
                            解説と確認問題 <span className={s.mono}>{questionCount}</span>問
                          </>
                        ) : (
                          "解説を読む"
                        )}
                      </span>
                      {aiGradingHref && (
                        <Link href={aiGradingHref} className={s.nowSubLink}>
                          AI採点で説明してみる
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}

        <li className={s.cue} data-state={allDone || slots.length === 0 ? "finish-done" : "finish"}>
          <span className={s.offset}>{formatOffset(total)}</span>
          <span className={s.finishMark} aria-hidden />
          <div className={s.cueBody}>
            <p className={s.finishTitle}>
              {slots.length === 0
                ? "今日の新しい学習はひと段落"
                : allDone
                  ? "今日のぶん、完了"
                  : "おわり"}
            </p>
            {(allDone || slots.length === 0) && (
              <>
                {allDone && (
                  <div className={s.mochitSay}>
                    <Mochit
                      size="small"
                      state="happy"
                      screenContext="today"
                      event={mochitEvent}
                      className={s.mochitFigure}
                    />
                    <p className={s.bubble}>今日のぶん、おつかれさま。この調子で明日も続けよう。</p>
                  </div>
                )}
                <div className={s.finishActions}>
                  <Link href="/review" className={s.textLink}>
                    復習をもう少しやる
                  </Link>
                  <Link href="/learn" className={s.textLink}>
                    テーマから選ぶ
                  </Link>
                </div>
              </>
            )}
          </div>
        </li>
      </ol>
    </section>
  );
}
