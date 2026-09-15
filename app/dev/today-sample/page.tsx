"use client";

// /today 改善デザインのサンプル「進行表（Cue sheet）」。テスト環境専用。
//
// このページが答えるのは3つだけ:
//   1. 今日なにをするか（順番つきの進行表）
//   2. どれくらいかかるか（分の定規と、各行の開始時刻）
//   3. どこまで終わったか（定規の塗りと、今日のミッション）
// 試験日・合格準備度・ストリーク・CP などの進捗情報は /progress に任せ、ここには置かない。

import Link from "next/link";
import { notFound } from "next/navigation";
import { useMemo, useState } from "react";
import Mochit from "@/components/mochit/Mochit";
import type { MochitEventSignal } from "@/components/mochit/mochitEvents";
import {
  BUDGET_OPTIONS,
  DEFAULT_BUDGET,
  KIND_LABEL,
  MISSION_REWARD_XP,
  buildRoute,
  type Task,
} from "./data";
import AppNav from "./nav";
import { PaletteBar, usePalette } from "./palette";
import s from "./today.module.css";

type Slot = Task & { start: number; state: "done" | "now" | "next" };

function formatOffset(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export default function TodaySamplePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <TodaySample />;
}

function TodaySample() {
  // null = おまかせ
  const [budget, setBudget] = useState<number | null>(null);
  const [doneIds, setDoneIds] = useState<ReadonlySet<string>>(
    () => new Set(["lan-wan"]),
  );
  const [claimed, setClaimed] = useState(false);
  const [palette, setPalette] = usePalette();
  // モチット版: 完了にしたとき、次の行で迎えるモチットにリアクションさせる
  const [mochitSignal, setMochitSignal] = useState<MochitEventSignal | null>(
    null,
  );
  const withMochit = palette === "mochit";

  const route = useMemo(() => buildRoute(budget ?? DEFAULT_BUDGET), [budget]);

  const slots: Slot[] = [];
  let cursor = 0;
  let nowAssigned = false;
  for (const task of route) {
    const isDone = doneIds.has(task.id);
    const state = isDone ? "done" : nowAssigned ? "next" : "now";
    if (state === "now") nowAssigned = true;
    slots.push({ ...task, start: cursor, state });
    cursor += task.minutes;
  }

  const total = cursor;
  const doneSlots = slots.filter((slot) => slot.state === "done");
  const doneMinutes = doneSlots.reduce((sum, slot) => sum + slot.minutes, 0);
  const remaining = total - doneMinutes;
  const current = slots.find((slot) => slot.state === "now") ?? null;
  const allDone = slots.length > 0 && current === null;

  const missions = [
    {
      label: "確認問題を1トピック完了する",
      progress: Math.min(1, doneSlots.length),
      goal: 1,
    },
    {
      label: "合計8問正解する",
      progress: Math.min(
        8,
        doneSlots.reduce((sum, slot) => sum + slot.questions, 0),
      ),
      goal: 8,
    },
    {
      label: "復習を1件消化する",
      progress: Math.min(
        1,
        doneSlots.filter((slot) => slot.kind === "review").length,
      ),
      goal: 1,
    },
  ];
  const missionsDone = missions.filter((m) => m.progress >= m.goal).length;
  const rewardState = claimed
    ? "claimed"
    : missionsDone === missions.length
      ? "claimable"
      : "locked";

  const toggleDone = (id: string) => {
    if (!doneIds.has(id)) {
      setMochitSignal((prev) => ({
        type: "taskComplete",
        id: (prev?.id ?? 0) + 1,
      }));
    }
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setClaimed(false);
  };

  // 定規の目盛りラベル: 5分おき＋終点。終点と近すぎる目盛りは省く。
  const tickLabels: number[] = [];
  for (let m = 0; m < total; m += 5) {
    if (m === 0 || total - m >= 3) tickLabels.push(m);
  }
  tickLabels.push(total);

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日（${"日月火水木金土"[now.getDay()]}）`;

  return (
    <div className={s.shell} data-palette={palette}>
      <AppNav active="today" />
      <PaletteBar palette={palette} onChange={setPalette} />
      <main className={s.page}>
        <header className={s.inner}>
          <div className={s.hero}>
            <p className={s.eyebrow}>
              <span className={s.eyebrowTitle}>今日の学習</span>
              <span className={s.eyebrowDate}>{dateLabel}</span>
              <span className={s.sampleTag}>
                サンプル：丸をタップで完了を試せます
              </span>
            </p>

            <h1 className={s.headline} aria-live="polite">
              {allDone ? (
                <>今日のぶんは、ぜんぶ終わりました。</>
              ) : (
                <>
                  あと<span className={s.headlineNum}>{remaining}</span>分で、
                  <br className={s.mobileBreak} />
                  今日のぶんが終わります。
                </>
              )}
            </h1>
            <p className={s.subline}>
              <span className={s.mono}>{slots.length}</span>件のうち
              <span className={s.mono}>{doneSlots.length}</span>件完了
              <span className={s.dot} aria-hidden>
                ・
              </span>
              予定 <span className={s.mono}>{total}</span>分
            </p>

            {/* 署名要素: 分の定規。区間の長さ＝所要時間、塗り＝完了。 */}
            <figure
              className={s.ruler}
              aria-label={`予定${total}分のうち${doneMinutes}分完了`}
            >
              <div className={s.track} style={{ ["--total" as string]: total }}>
                {slots.map((slot, i) => (
                  <div
                    key={slot.id}
                    className={s.segment}
                    data-kind={slot.kind}
                    data-state={slot.state}
                    style={{
                      left: `${(slot.start / total) * 100}%`,
                      width: `${(slot.minutes / total) * 100}%`,
                      ["--i" as string]: i,
                    }}
                    title={`${slot.title}（${slot.minutes}分）`}
                  >
                    <span className={s.segmentFill} />
                    <span className={s.segmentLabel}>{slot.title}</span>
                  </div>
                ))}
                {current && (
                  <span
                    className={s.caret}
                    style={{ left: `${(current.start / total) * 100}%` }}
                    aria-hidden
                  >
                    いまここ
                  </span>
                )}
              </div>
              <div className={s.ticks} aria-hidden>
                {tickLabels.map((m) => (
                  <span
                    key={m}
                    className={s.tickLabel}
                    style={{ left: `${(m / total) * 100}%` }}
                    data-edge={
                      m === 0 ? "start" : m === total ? "end" : undefined
                    }
                  >
                    {m}
                  </span>
                ))}
              </div>
              <figcaption className={s.legend}>
                <span className={s.legendItem} data-kind="new">
                  新規
                </span>
                <span className={s.legendItem} data-kind="review">
                  復習
                </span>
              </figcaption>
            </figure>

            <div className={s.budget} role="group" aria-label="今日の学習量">
              <span className={s.budgetLabel}>学習量</span>
              <span className={s.budgetTrack}>
                <button
                  type="button"
                  className={s.chip}
                  aria-pressed={budget === null}
                  onClick={() => setBudget(null)}
                >
                  おまかせ <span className={s.mono}>{DEFAULT_BUDGET}</span>分
                </button>
                {BUDGET_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    className={s.chip}
                    aria-pressed={budget === minutes}
                    onClick={() => setBudget(minutes)}
                  >
                    <span className={s.mono}>{minutes}</span>分
                  </button>
                ))}
              </span>
            </div>
          </div>
        </header>

        <div className={`${s.inner} ${s.body}`}>
          {/* 進行表: 開始時刻つきで、上から順にやる */}
          <section className={s.sheet} aria-labelledby="cue-heading">
            <div className={s.sheetHead}>
              <h2 id="cue-heading" className={s.sectionTitle}>
                今日の順番
              </h2>
              <span className={s.sectionMeta}>開始からの経過時間</span>
            </div>

            <ol className={s.cues}>
              {slots.map((slot) => (
                <li
                  key={slot.id}
                  className={s.cue}
                  data-state={slot.state}
                  data-kind={slot.kind}
                >
                  <span className={s.offset}>{formatOffset(slot.start)}</span>

                  <button
                    type="button"
                    className={s.mark}
                    onClick={() => toggleDone(slot.id)}
                    aria-pressed={slot.state === "done"}
                    aria-label={`${slot.title}を${slot.state === "done" ? "未完了に戻す" : "完了にする"}`}
                  >
                    <svg viewBox="0 0 20 20" aria-hidden>
                      <path d="M5.5 10.5l3 3 6-7" />
                    </svg>
                  </button>

                  <div className={s.cueBody}>
                    <div className={s.cueLine}>
                      <p className={s.cueTitle}>{slot.title}</p>
                      <span className={s.cueMinutes}>
                        <span className={s.mono}>{slot.minutes}</span>分
                      </span>
                    </div>
                    <p className={s.cueMeta}>
                      <span className={s.kind} data-kind={slot.kind}>
                        {KIND_LABEL[slot.kind]}
                      </span>
                      <span>{slot.field}</span>
                      {slot.state === "done" && (
                        <span className={s.doneText}>完了</span>
                      )}
                    </p>

                    {slot.state === "now" && (
                      <div className={s.nowPanel}>
                        {withMochit ? (
                          <div className={s.mochitSay}>
                            <Mochit
                              size="small"
                              screenContext="today"
                              event={mochitSignal}
                              className={s.mochitFigure}
                            />
                            <p className={s.bubble}>{slot.reason}</p>
                          </div>
                        ) : (
                          <p className={s.reason}>{slot.reason}</p>
                        )}
                        <div className={s.nowActions}>
                          <Link
                            href="/learn"
                            className={s.start}
                            data-kind={slot.kind}
                          >
                            {slot.kind === "review"
                              ? "復習を始める"
                              : "レッスンを始める"}
                            <svg viewBox="0 0 20 20" aria-hidden>
                              <path d="M7.5 4.5l5.5 5.5-5.5 5.5" />
                            </svg>
                          </Link>
                          <span className={s.nowHint}>
                            解説と確認問題{" "}
                            <span className={s.mono}>{slot.questions}</span>問
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}

              <li
                className={s.cue}
                data-state={allDone ? "finish-done" : "finish"}
              >
                <span className={s.offset}>{formatOffset(total)}</span>
                <span className={s.finishMark} aria-hidden />
                <div className={s.cueBody}>
                  <p className={s.finishTitle}>
                    {allDone ? "今日のぶん、完了" : "おわり"}
                  </p>
                  {allDone && withMochit && (
                    <div className={s.mochitSay}>
                      <Mochit
                        size="small"
                        state="happy"
                        screenContext="today"
                        event={mochitSignal}
                        className={s.mochitFigure}
                      />
                      <p className={s.bubble}>
                        今日のぶん、おつかれさま。この調子で明日も続けよう。
                      </p>
                    </div>
                  )}
                  {allDone && (
                    <div className={s.finishActions}>
                      <Link href="/review" className={s.textLink}>
                        復習をもう少しやる
                      </Link>
                      <Link href="/learn" className={s.textLink}>
                        テーマから選ぶ
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            </ol>
          </section>

          {/* 今日の達成状況: 今日だけで完結するもの */}
          <section className={s.missions} aria-labelledby="mission-heading">
            <div className={s.sheetHead}>
              <h2 id="mission-heading" className={s.sectionTitle}>
                今日のミッション
              </h2>
              <span className={s.sectionMeta}>
                <span className={s.mono}>{missionsDone}</span> /{" "}
                {missions.length} 達成
              </span>
            </div>

            <ul className={s.missionList}>
              {missions.map((mission) => {
                const complete = mission.progress >= mission.goal;
                return (
                  <li
                    key={mission.label}
                    className={s.mission}
                    data-complete={complete}
                  >
                    <span className={s.missionLabel}>{mission.label}</span>
                    <span className={s.missionCount}>
                      {mission.progress}/{mission.goal}
                    </span>
                    <span className={s.missionBar} aria-hidden>
                      <span
                        className={s.missionBarFill}
                        style={{
                          width: `${(mission.progress / mission.goal) * 100}%`,
                        }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className={s.reward} data-state={rewardState}>
              {rewardState === "claimed" ? (
                <p>
                  <span className={s.mono}>+{MISSION_REWARD_XP}</span> XP
                  を受け取りました
                </p>
              ) : rewardState === "claimable" ? (
                <>
                  <p>3つそろいました</p>
                  <button
                    type="button"
                    className={s.claim}
                    onClick={() => setClaimed(true)}
                  >
                    <span className={s.mono}>+{MISSION_REWARD_XP}</span> XP
                    を受け取る
                  </button>
                </>
              ) : (
                <p>
                  3つそろうと{" "}
                  <span className={s.mono}>+{MISSION_REWARD_XP}</span> XP
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
