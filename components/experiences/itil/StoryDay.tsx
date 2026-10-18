"use client";

import { useState, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";
import { Choices, placeAnswer, type Choice } from "../calc/CalcParts";
import { CAST, WEEK, type Beat, type Who } from "./week";

// ITIL のストーリー解説の部品。
//   WeekStrip : 月〜金の帯。いまの曜日と、通り過ぎた曜日が分かる（物語の現在地）
//   StoryDay  : 1日の出来事を1行ずつ「続き」で進める。用語は出来事のあとに1枚のカードで出す
//   DiskGauge : 共有ディスクの使用量（火曜・水曜の出来事と連動）
// 1回の「続き」で増えるのは1行だけ。選ぶ場面では、答えるまで先へ進めない。

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

function Avatar({ who }: { who: Who }) {
  const c = CAST[who];
  return (
    <span
      aria-hidden
      className={`grid h-8 w-8 flex-none place-items-center rounded-full text-[13px] font-bold ${c.tone}`}
    >
      {c.mark ?? <Icon name="user" className="h-4 w-4" />}
    </span>
  );
}

export function TermCard({ name, def }: { name: string; def: ReactNode }) {
  return (
    <div className="mt-2 rounded-xl bg-white px-3 py-2.5 ring-2 ring-gray-900" data-testid="itil-term">
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
        <div className={`h-full rounded-full transition-all duration-700 ${tone}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function BeatLine({ beat, latest }: { beat: Beat; latest: boolean }) {
  const body = (
    <>
      {beat.text && <p className="text-[14px] leading-relaxed text-gray-800">{beat.text}</p>}
    </>
  );
  return (
    <li className={`transition-opacity ${latest ? "" : "opacity-60"}`}>
      {beat.time && <div className="mb-1 font-mono text-[11px] font-bold text-gray-400">{beat.time}</div>}
      {beat.who ? (
        <div className="flex items-start gap-2">
          <Avatar who={beat.who} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-gray-500">{CAST[beat.who].name}</div>
            <div className="mt-0.5 rounded-xl rounded-tl-sm bg-gray-50 px-3 py-2 ring-1 ring-gray-200">{body}</div>
          </div>
        </div>
      ) : (
        <div className="border-l-2 border-gray-300 pl-3">{body}</div>
      )}
      {beat.term && latest && <TermCard name={beat.term.name} def={beat.term.def} />}
      {beat.term && !latest && (
        <p className="mt-1 text-[12px] font-bold text-gray-500">
          用語：<span className="text-gray-800">{beat.term.name}</span>
        </p>
      )}
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
    <li>
      {beat.time && <div className="mb-1 font-mono text-[11px] font-bold text-gray-400">{beat.time}</div>}
      <div className="rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-200">
        <p className="text-[14px] font-bold leading-relaxed text-gray-900">
          <span className="mr-1.5 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">あなたなら</span>
          {ask.q}
        </p>
        <div className="mt-2">
          <Choices choices={choices} cols={1} onAnswer={onAnswered} testId="itil-ask" />
        </div>
      </div>
      {answered && ask.then && <p className="mt-2 border-l-2 border-gray-300 pl-3 text-[14px] leading-relaxed text-gray-800">{ask.then}</p>}
      {answered && beat.term && latest && <TermCard name={beat.term.name} def={beat.term.def} />}
      {answered && beat.term && !latest && (
        <p className="mt-1 text-[12px] font-bold text-gray-500">
          用語：<span className="text-gray-800">{beat.term.name}</span>
        </p>
      )}
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
  const [shown, setShown] = useState(1);
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const [run, setRun] = useState(0);
  const visible = beats.slice(0, shown);
  const last = visible.length - 1;
  const waiting = Boolean(beats[last]?.ask) && !answered[last];
  const done = shown >= beats.length && !waiting;
  // 選ぶ場面のメーターは、答えたあとに動かす（答えより先に結果を見せない）
  const gauge = visible.reduce<number | undefined>(
    (g, b, i) => (b.ask && !answered[i] ? g : (b.gauge ?? g)),
    gaugeFrom,
  );

  return (
    <div key={run}>
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
      </ol>
      {!done ? (
        <button
          type="button"
          onClick={() => setShown((n) => Math.min(n + 1, beats.length))}
          disabled={waiting}
          className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400"
        >
          {waiting ? "選ぶと続きが読めます" : `続き（${shown} / ${beats.length}）`}
        </button>
      ) : (
        <>
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-950 ring-1 ring-amber-200 [&_b]:font-bold" data-testid="itil-summary">
            <div className="mb-1 text-[11px] font-bold text-amber-700">この日のまとめ</div>
            {summary}
          </div>
          <button
            type="button"
            onClick={() => {
              setShown(1);
              setAnswered({});
              setRun((r) => r + 1);
            }}
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-brand-700"
          >
            ↺ この日を最初から
          </button>
        </>
      )}
    </div>
  );
}
