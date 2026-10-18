"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Choices, placeAnswer, type Choice } from "../calc/CalcParts";
import { Face } from "./Faces";
import { CAST, WEEK, type Beat } from "./week";
import styles from "./story.module.css";

// ITIL のストーリー解説の部品。
//   WeekStrip : 月〜金の帯。いまの曜日と、通り過ぎた曜日が分かる（物語の現在地）
//   StoryDay  : 1日の出来事を、読む時間に合わせて1行ずつ自動で出す。
//               スライドが表示されている間だけ進み、選ぶ場面では答えるまで止まる。
//               次に話す人の「…」を少し先に出して、会話が続いていることを見せる。
//   DiskGauge : 共有ディスクの使用量（火曜・水曜の出来事と連動）

/** 1行を読み終えるまでの目安（ms）。文字数に比例させ、用語カードがあればその分も足す。 */
export function readMs(beat: Beat, afterAnswer = false): number {
  const text = afterAnswer ? (beat.ask?.then ?? "") : (beat.text ?? "");
  const term = beat.term ? beat.term.name.length + beat.term.def.length : 0;
  return Math.min(1000 + text.length * 80 + (term ? 800 + term * 55 : 0), 9000);
}

const TYPING_MS = 700;

/** このスライドが表示中か（ExperienceSlideDeck の非表示パネルは aria-hidden="true"）。デッキの外では常に true。 */
function useSlideActive<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(true);
  useEffect(() => {
    const section = ref.current?.closest("section[data-experience-slide-id]");
    if (!section) return;
    const update = () => setActive(section.getAttribute("aria-hidden") !== "true");
    update();
    const mo = new MutationObserver(update);
    mo.observe(section, { attributes: true, attributeFilter: ["aria-hidden"] });
    return () => mo.disconnect();
  }, []);
  return [ref, active] as const;
}

export function WeekStrip({ day }: { day: number }) {
  return (
    <ol className="mt-3 grid grid-cols-5 gap-1" aria-label="森さんの1週間">
      {WEEK.map((d, i) => (
        <li
          key={d.key}
          aria-current={i === day ? "step" : undefined}
          className={`rounded-lg px-1 py-1.5 text-center ${
            i === day
              ? "bg-gray-900 text-white"
              : i < day
                ? "bg-gray-100 text-gray-500"
                : "bg-white text-gray-400 ring-1 ring-gray-200"
          }`}
        >
          <div className="text-[13px] font-bold leading-none">{d.label}</div>
          <div className="mt-1 truncate text-[10px] leading-none">{d.short}</div>
        </li>
      ))}
    </ol>
  );
}

export function TermCard({ name, def }: { name: string; def: ReactNode }) {
  return (
    <div className={`mt-2 rounded-xl bg-white px-3 py-2.5 ring-2 ring-gray-900 ${styles.enter}`} data-testid="itil-term">
      <div className="flex items-center gap-2">
        <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold text-white">用語</span>
        <b className="text-[15px] text-gray-900">{name}</b>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-gray-700">{def}</p>
    </div>
  );
}

export function DiskGauge({ value }: { value: number }) {
  const tone = value >= 100 ? "bg-rose-500" : value >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-gray-200" data-testid="itil-disk">
      <div className="flex items-baseline justify-between text-[11px] font-bold text-gray-500">
        <span>共有ディスクの使用量</span>
        <span className={`tabular-nums ${value >= 100 ? "text-rose-600" : "text-gray-700"}`}>
          {value}%{value >= 100 && "（満杯）"}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-[width] duration-700 ${tone}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function PastTerm({ name }: { name: string }) {
  return (
    <p className="mt-1 text-[12px] font-bold text-gray-500">
      用語：<span className="text-gray-800">{name}</span>
    </p>
  );
}

function Time({ children }: { children: ReactNode }) {
  return <div className="mb-1 font-mono text-[11px] font-bold text-gray-400">{children}</div>;
}

function Speech({ who, mood, children }: { who: NonNullable<Beat["who"]>; mood?: Beat["mood"]; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Face who={who} mood={mood} size={44} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-gray-500">{CAST[who].name}</div>
        <div className="mt-0.5 rounded-xl rounded-tl-sm bg-gray-50 px-3 py-2 ring-1 ring-gray-200">{children}</div>
      </div>
    </div>
  );
}

function BeatLine({ beat, latest }: { beat: Beat; latest: boolean }) {
  const text = beat.text && <p className="text-[14px] leading-relaxed text-gray-800">{beat.text}</p>;
  return (
    <li className={`${styles.enter} transition-opacity duration-500 ${latest ? "" : "opacity-60"}`}>
      {beat.time && <Time>{beat.time}</Time>}
      {beat.who ? (
        <Speech who={beat.who} mood={beat.mood}>
          {text}
        </Speech>
      ) : (
        <div className="border-l-2 border-gray-300 pl-3">{text}</div>
      )}
      {beat.term && (latest ? <TermCard name={beat.term.name} def={beat.term.def} /> : <PastTerm name={beat.term.name} />)}
    </li>
  );
}

function ChoiceBeat({
  beat,
  onAnswered,
  answered,
  latest,
}: {
  beat: Beat;
  onAnswered: () => void;
  answered: boolean;
  latest: boolean;
}) {
  const ask = beat.ask!;
  const [choices] = useState<Choice[]>(() => placeAnswer(ask.choices, ask.at ?? 0));
  return (
    <li className={styles.enter}>
      {beat.time && <Time>{beat.time}</Time>}
      <div className="rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-200">
        <div className="flex items-start gap-2.5">
          <Face who="mori" mood={answered ? "normal" : "worried"} size={36} />
          <p className="min-w-0 flex-1 text-[14px] font-bold leading-relaxed text-gray-900">
            <span className="mr-1.5 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">あなたなら</span>
            {ask.q}
          </p>
        </div>
        <div className="mt-2">
          <Choices choices={choices} cols={1} onAnswer={onAnswered} testId="itil-ask" />
        </div>
      </div>
      {answered && ask.then && (
        <p className={`mt-2 border-l-2 border-gray-300 pl-3 text-[14px] leading-relaxed text-gray-800 ${styles.enter}`}>{ask.then}</p>
      )}
      {answered && beat.term && (latest ? <TermCard name={beat.term.name} def={beat.term.def} /> : <PastTerm name={beat.term.name} />)}
    </li>
  );
}

function Typing({ who }: { who: NonNullable<Beat["who"]> }) {
  return (
    <li className={`flex items-center gap-2.5 ${styles.enter}`} aria-hidden data-testid="itil-typing">
      <Face who={who} size={44} />
      <span className="flex gap-1 rounded-xl rounded-tl-sm bg-gray-50 px-3 py-3 ring-1 ring-gray-200">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 w-1.5 rounded-full bg-gray-400 ${styles.dot}`} style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </span>
    </li>
  );
}

export function StoryDay({
  beats,
  summary,
  gaugeFrom,
}: {
  beats: Beat[];
  /** 最後の1行まで進んだら出す「この日のまとめ」 */
  summary: ReactNode;
  /** 使用量メーターの最初の値（出さない日は省略） */
  gaugeFrom?: number;
}) {
  const [rootRef, active] = useSlideActive<HTMLDivElement>();
  const [shown, setShown] = useState(1);
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const [paused, setPaused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [run, setRun] = useState(0);
  const latestRef = useRef<HTMLDivElement>(null);
  const visible = beats.slice(0, shown);
  const last = visible.length - 1;
  const lastBeat = beats[last];
  const waiting = Boolean(lastBeat?.ask) && !answered[last];
  const done = shown >= beats.length && !waiting;
  const playing = active && !paused && !waiting && !done;
  const nextWho = beats[shown]?.who;
  // 選ぶ場面のメーターは、答えたあとに動かす（答えより先に結果を見せない）
  const gauge = visible.reduce<number | undefined>(
    (g, b, i) => (b.ask && !answered[i] ? g : (b.gauge ?? g)),
    gaugeFrom,
  );

  // 読む時間が経ったら次の行へ。次が会話なら、少し前から「…」を出す
  useEffect(() => {
    if (!playing) return;
    const wait = readMs(lastBeat, Boolean(lastBeat.ask));
    const timers = [
      window.setTimeout(() => {
        setTyping(false);
        setShown((n) => Math.min(n + 1, beats.length));
      }, wait),
    ];
    if (nextWho) timers.push(window.setTimeout(() => setTyping(true), Math.max(wait - TYPING_MS, 0)));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [playing, lastBeat, nextWho, beats.length, shown]);

  // 新しい行が画面の下にはみ出したら、そこまで送る（読んでいる行を追いかける）
  useEffect(() => {
    if (!active || shown <= 1) return;
    const el = latestRef.current;
    if (!el || typeof el.scrollIntoView !== "function") return;
    if (el.getBoundingClientRect().bottom > window.innerHeight - 24) {
      el.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [shown, answered, done, active]);

  const restart = () => {
    setShown(1);
    setAnswered({});
    setTyping(false);
    setPaused(false);
    setRun((r) => r + 1);
  };

  return (
    <div ref={rootRef} key={run}>
      {gauge !== undefined && <DiskGauge value={gauge} />}
      <ol className="mt-3 space-y-3" aria-live="polite" data-testid="itil-story">
        {visible.map((b, i) =>
          b.ask ? (
            <ChoiceBeat
              key={i}
              beat={b}
              answered={Boolean(answered[i])}
              latest={i === last}
              onAnswered={() => setAnswered((a) => ({ ...a, [i]: true }))}
            />
          ) : (
            <BeatLine key={i} beat={b} latest={i === last} />
          ),
        )}
        {typing && playing && nextWho && <Typing who={nextWho} />}
      </ol>
      <div ref={latestRef}>
        {done ? (
          <>
            <div
              className={`mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-950 ring-1 ring-amber-200 [&_b]:font-bold ${styles.enter}`}
              data-testid="itil-summary"
            >
              <div className="mb-1 text-[11px] font-bold text-amber-700">この日のまとめ</div>
              {summary}
            </div>
            <button
              type="button"
              onClick={restart}
              className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-brand-700"
            >
              ↺ この日を最初から
            </button>
          </>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-2 text-[12px] font-bold text-gray-400">
            <span aria-live="polite">{waiting ? "選ぶと続きが始まります" : `${shown} / ${beats.length}`}</span>
            {!waiting && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="rounded-full px-3 py-1 text-gray-600 ring-1 ring-gray-300 hover:text-brand-700"
                data-testid="itil-pause"
              >
                {paused ? "▶ 再開" : "❚❚ 一時停止"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
