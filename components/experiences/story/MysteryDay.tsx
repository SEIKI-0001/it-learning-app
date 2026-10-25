"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Choice } from "../calc/CalcParts";
import { placeAnswer } from "../calc/CalcParts";
import { useSlideVisible } from "../ui";
import Icon from "@/components/ui/Icon";
import { Face } from "./Faces";
import { readMs } from "./StoryDay";
import { CAST, type Beat, type StoryState } from "./cast";
import styles from "./story.module.css";
import mx from "./mystery.module.css";

// ストーリー解説の「謎解きゲーム」版の見せ方。台本（Beat[]）は StoryDay と同じものをそのまま使う。
//   用語（term）    → 「手がかり」カード。手に入れた手がかりは事件全体の手がかり帳に貯まる
//   選ぶ場面（ask） → 「推理せよ」。外すと理由が出て、正解するまで選び直せる。一発で当てると★
//   最後まで進む   → 「第n章 クリア」の判子と推理メモ（まとめ）
// 進み方（自動で次の行・選ぶまで止まる・見えている章だけ進む）は StoryDay と同じ。

const TYPING_MS = 700;

// ---------------------------------------------------------------------------------------------
// 事件全体の記録（手がかり帳と推理の成績）。体験の一番外側で MysteryCase で包む

type CaseRecord = {
  clues: string[];
  /** 推理のキー → 一発で当てたか */
  solved: Record<string, boolean>;
  totalClues: number;
  totalAsks: number;
  addClue: (name: string) => void;
  solve: (key: string, firstTry: boolean) => void;
};

const CaseContext = createContext<CaseRecord | null>(null);

export function MysteryCase({ chapters, children }: { chapters: Beat[][]; children: ReactNode }) {
  const [clues, setClues] = useState<string[]>([]);
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const all = chapters.flat();
  const totalClues = new Set(all.filter((b) => b.term).map((b) => b.term!.name)).size;
  const totalAsks = all.filter((b) => b.ask).length;
  const addClue = useCallback((name: string) => setClues((c) => (c.includes(name) ? c : [...c, name])), []);
  // 2回目以降（章をやり直したとき）は、最初の結果を残す
  const solve = useCallback((key: string, firstTry: boolean) => setSolved((s) => (key in s ? s : { ...s, [key]: firstTry })), []);
  const value = useMemo(
    () => ({ clues, solved, totalClues, totalAsks, addClue, solve }),
    [clues, solved, totalClues, totalAsks, addClue, solve],
  );
  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCaseRecord() {
  return useContext(CaseContext);
}

/** 推理の成績から探偵ランクを出す（一発で当てた割合） */
export function detectiveRank(firstTry: number, total: number): { rank: string; note: string } {
  const r = total === 0 ? 0 : firstTry / total;
  if (r >= 1) return { rank: "S", note: "すべて一発で見抜いた名探偵" };
  if (r >= 0.8) return { rank: "A", note: "ほとんど見抜いた敏腕探偵" };
  if (r >= 0.5) return { rank: "B", note: "半分以上を見抜いた見習い探偵" };
  return { rank: "C", note: "これから伸びる探偵の卵。外した手がかりを読み直そう" };
}

// ---------------------------------------------------------------------------------------------
// 見た目の部品

/** 謎解き版のパネルの中身。Panel の白地の上に、暗い事件ファイルを敷く */
export function CaseSheet({ children }: { children: ReactNode }) {
  return <div className="-m-5 rounded-xl bg-[#151a24] p-5 text-slate-100">{children}</div>;
}

/** 謎解き版のパネルの見出し（英字の小見出し＋題） */
export function CaseHeading({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] font-bold tracking-[0.25em] text-amber-400/80">{kicker}</div>
      <h3 className="mt-0.5 text-lg font-bold leading-snug text-white [word-break:auto-phrase]">{children}</h3>
    </div>
  );
}

/** 事件解決の画面に出す探偵ランク。全部の推理を終えるまでは残りの数を出す */
export function CaseVerdict() {
  const record = useCaseRecord();
  const answered = record ? Object.keys(record.solved).length : 0;
  const stars = record ? Object.values(record.solved).filter(Boolean).length : 0;
  const total = record?.totalAsks ?? 0;
  if (answered < total)
    return (
      <div className="mt-3 rounded-lg bg-white/5 px-3 py-2.5 text-[12.5px] leading-relaxed text-slate-300 ring-1 ring-white/10" data-testid="mystery-rank">
        まだ推理していない場面が {total - answered} 個あります（{answered}/{total}）。全部の章を終えると、探偵ランクが決まります。
      </div>
    );
  const { rank, note } = detectiveRank(stars, total);
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg bg-amber-400/10 px-3 py-3 ring-1 ring-amber-400/50" data-testid="mystery-rank" data-rank={rank}>
      <span className="grid h-14 w-14 flex-none place-items-center rounded-full border-4 border-amber-400 font-mono text-3xl font-black text-amber-300">
        {rank}
      </span>
      <div className="min-w-0 text-[12.5px] leading-relaxed text-slate-200">
        <div className="text-[10.5px] font-black tracking-[0.2em] text-amber-300">探偵ランク</div>
        {note}
        <div className="text-slate-400">
          一発正解 {stars}/{total}・手がかり {record?.clues.length}/{record?.totalClues}
        </div>
      </div>
    </div>
  );
}

export function Stamp({ children, tone = "rose" }: { children: ReactNode; tone?: "rose" | "emerald" | "amber" }) {
  const c =
    tone === "emerald"
      ? "border-emerald-400 text-emerald-300"
      : tone === "amber"
        ? "border-amber-400 text-amber-300"
        : "border-rose-400 text-rose-300";
  return (
    <span className={`inline-block rounded border-2 px-1.5 py-0.5 text-[11px] font-black tracking-widest ${c} ${mx.stamp}`}>
      {children}
    </span>
  );
}

/** 推理の選択肢。外すと理由を出して選び直せる。正解したら onSolved（一発かどうか） */
export function Deduce({
  choices,
  onSolved,
  testId,
}: {
  choices: Choice[];
  onSolved?: (firstTry: boolean) => void;
  testId?: string;
}) {
  const [wrong, setWrong] = useState<number[]>([]);
  const [ok, setOk] = useState<number | null>(null);
  const lastWrong = wrong.length ? choices[wrong[wrong.length - 1]] : null;
  return (
    <div data-testid={testId} data-result={ok !== null ? "ok" : wrong.length ? "ng" : "none"}>
      <div className="grid gap-1.5">
        {choices.map((c, i) => {
          const isWrong = wrong.includes(i);
          const isOk = ok === i;
          return (
            <button
              key={c.label}
              type="button"
              disabled={ok !== null || isWrong}
              onClick={() => {
                if (c.ok) {
                  setOk(i);
                  onSolved?.(wrong.length === 0);
                } else setWrong((w) => [...w, i]);
              }}
              className={`rounded-lg px-3 py-2 text-left text-[13px] font-bold leading-snug transition active:scale-[0.98] ${
                isOk
                  ? "bg-emerald-500 text-white"
                  : isWrong
                    ? `bg-rose-500/15 text-rose-300/80 line-through ring-1 ring-rose-400/40 ${mx.shake}`
                    : ok !== null
                      ? "bg-white/5 text-slate-500 ring-1 ring-white/10"
                      : "bg-white/5 text-slate-100 ring-1 ring-white/20 hover:bg-white/10"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {ok === null && lastWrong && (
        <p className="mt-2 text-[12px] font-bold leading-relaxed text-rose-300" aria-live="polite">
          推理ミス：{lastWrong.why ?? "もう一度考えてみよう。"}
        </p>
      )}
      {ok !== null && (
        <p className="mt-2 flex items-center gap-2 text-[12px] font-bold text-emerald-300" aria-live="polite">
          <Stamp tone="emerald">推理成功</Stamp>
          {wrong.length === 0 && (
            <span className="flex items-center gap-1 text-amber-300">
              <Icon name="star" className="h-3.5 w-3.5" />
              一発で見抜いた
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function Time({ children }: { children: ReactNode }) {
  return <div className="mb-1 font-mono text-[11px] font-bold tracking-wider text-amber-400/70">◆ {children}</div>;
}

function Speech({ who, mood, children }: { who: NonNullable<Beat["who"]>; mood?: Beat["mood"]; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="rounded-full ring-2 ring-white/15">
        <Face who={who} mood={mood} size={42} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="inline-block rounded-t bg-amber-400/90 px-2 py-0.5 text-[10.5px] font-bold text-[#151a24]">{CAST[who].name}</div>
        <div className="rounded-b-lg rounded-tr-lg bg-white/[0.07] px-3 py-2 ring-1 ring-white/10">{children}</div>
      </div>
    </div>
  );
}

/** 手がかりカード。見えている章で出たときに、事件の手がかり帳へ入れる */
function Clue({ name, def, latest }: { name: string; def: string; latest: boolean }) {
  const record = useCaseRecord();
  const active = useSlideVisible();
  const addClue = record?.addClue;
  // 最初の描画では、まだデッキに登録されていない章も「見えている」と扱われる。
  // 少し待ってから入れることで、見ていない章の手がかりを数えないようにする
  useEffect(() => {
    if (!active || !addClue) return;
    const t = window.setTimeout(() => addClue(name), 300);
    return () => window.clearTimeout(t);
  }, [active, addClue, name]);
  const no = (record?.clues.indexOf(name) ?? -1) + 1;
  if (!latest)
    return (
      <p className="mt-1 flex items-center gap-1 text-[11.5px] font-bold text-slate-400">
        <Icon name="search" className="h-3 w-3" />
        手がかり{no > 0 ? ` No.${no}` : ""}：<span className="text-slate-200">{name}</span>
      </p>
    );
  return (
    <div className={`relative mt-3 rounded-md bg-[#f3ead6] px-3 pb-2.5 pt-3 text-stone-900 shadow-lg shadow-black/30 ${mx.drop}`} data-testid="mystery-clue">
      <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-rose-500 ring-2 ring-[#151a24]" aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[10.5px] font-black tracking-wider text-stone-500">
          <Icon name="search" className="h-3.5 w-3.5" />
          手がかり{no > 0 ? ` No.${no}` : ""} 入手
        </span>
      </div>
      <b className="mt-0.5 block text-[15px]">{name}</b>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-stone-700">{def}</p>
    </div>
  );
}

function LineBeat({ beat, latest }: { beat: Beat; latest: boolean }) {
  const text = beat.text && <p className="text-[14px] leading-relaxed text-slate-100">{beat.text}</p>;
  return (
    <li className={`${styles.enter} transition-opacity duration-500 ${latest ? "" : "opacity-55"}`}>
      {beat.time && <Time>{beat.time}</Time>}
      {beat.who ? (
        <Speech who={beat.who} mood={beat.mood}>
          {text}
        </Speech>
      ) : (
        <div className="border-l-2 border-amber-400/40 pl-3 italic [&_p]:text-slate-300">{text}</div>
      )}
      {beat.term && <Clue name={beat.term.name} def={beat.term.def} latest={latest} />}
    </li>
  );
}

function DeduceBeat({
  beat,
  askKey,
  answered,
  latest,
  onAnswered,
}: {
  beat: Beat;
  askKey: string;
  answered: boolean;
  latest: boolean;
  onAnswered: () => void;
}) {
  const ask = beat.ask!;
  const record = useCaseRecord();
  const [choices] = useState<Choice[]>(() => placeAnswer(ask.choices, ask.at ?? 0));
  return (
    <li className={styles.enter}>
      {beat.time && <Time>{beat.time}</Time>}
      <div className={`rounded-xl bg-amber-400/[0.08] px-3 py-3 ring-1 ring-amber-400/50 ${answered ? "" : mx.glow}`}>
        <div className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.2em] text-amber-300">
          <Icon name="search" className="h-4 w-4" />
          推理せよ
        </div>
        <p className="mt-1.5 whitespace-pre-line text-[14px] font-bold leading-relaxed text-white">{ask.q}</p>
        <div className="mt-2.5">
          <Deduce
            choices={choices}
            testId="story-ask"
            onSolved={(firstTry) => {
              record?.solve(askKey, firstTry);
              onAnswered();
            }}
          />
        </div>
      </div>
      {answered && ask.then && (
        <p className={`mt-2 border-l-2 border-amber-400/40 pl-3 text-[14px] leading-relaxed text-slate-200 ${styles.enter}`}>{ask.then}</p>
      )}
      {answered && beat.term && <Clue name={beat.term.name} def={beat.term.def} latest={latest} />}
    </li>
  );
}

function Typing({ who }: { who: NonNullable<Beat["who"]> }) {
  return (
    <li className={`flex items-center gap-2.5 ${styles.enter}`} aria-hidden data-testid="story-typing">
      <div className="rounded-full ring-2 ring-white/15">
        <Face who={who} size={42} />
      </div>
      <span className="flex gap-1 rounded-lg bg-white/[0.07] px-3 py-3 ring-1 ring-white/10">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 w-1.5 rounded-full bg-amber-300/80 ${styles.dot}`} style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </span>
    </li>
  );
}

/** 章ごとの進み具合（クリアした章に判子）。StoryTimeline の謎解き版 */
export function ChapterTrack({
  items,
  current,
  label,
}: {
  items: readonly { key: string; label: string }[];
  current: number;
  label: string;
}) {
  return (
    <ol
      className="mt-3 grid gap-1"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      aria-label={label}
      data-testid="story-timeline"
    >
      {items.map((d, i) => (
        <li
          key={d.key}
          aria-current={i === current ? "step" : undefined}
          className={`rounded-md px-0.5 py-1.5 text-center ${
            i === current
              ? "bg-amber-400 text-[#151a24]"
              : i < current
                ? "bg-white/10 text-slate-400"
                : "text-slate-500 ring-1 ring-white/10"
          }`}
        >
          <div className="text-[9.5px] font-bold leading-none opacity-80">{i + 1}章</div>
          <div className="mt-1 truncate text-[11px] font-bold leading-none">{d.label}</div>
        </li>
      ))}
    </ol>
  );
}

/** 手がかり・推理の数（章の上に出す小さなメーター） */
export function CaseMeter() {
  const record = useCaseRecord();
  if (!record) return null;
  const stars = Object.values(record.solved).filter(Boolean).length;
  return (
    <div className="mt-3 flex items-center gap-3 text-[11.5px] font-bold text-slate-300" data-testid="mystery-meter">
      <span className="flex items-center gap-1">
        <Icon name="search" className="h-3.5 w-3.5 text-amber-300" />
        手がかり {record.clues.length}/{record.totalClues}
      </span>
      <span className="flex items-center gap-1">
        <Icon name="star" className="h-3.5 w-3.5 text-amber-300" />
        一発正解 {stars}/{record.totalAsks}
      </span>
    </div>
  );
}

export function MysteryDay({
  beats,
  chapter,
  summary,
  initialState,
  renderState,
}: {
  beats: Beat[];
  /** 章の番号（1から）。推理のキーと「クリア」の判子に使う */
  chapter: number;
  /** 最後の1行まで進んだら出す「推理メモ」 */
  summary: ReactNode;
  initialState?: StoryState;
  renderState?: (state: StoryState) => ReactNode;
}) {
  const active = useSlideVisible();
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
  const state = visible.reduce<StoryState>(
    (acc, b, i) => (b.ask && !answered[i] ? acc : { ...acc, ...b.state }),
    initialState ?? {},
  );

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
    <div key={run}>
      {renderState?.(state)}
      <ol className="mt-4 space-y-3.5" aria-live="polite" data-testid="story-story">
        {visible.map((b, i) =>
          b.ask ? (
            <DeduceBeat
              key={i}
              beat={b}
              askKey={`${chapter}-${i}`}
              answered={Boolean(answered[i])}
              latest={i === last}
              onAnswered={() => setAnswered((a) => ({ ...a, [i]: true }))}
            />
          ) : (
            <LineBeat key={i} beat={b} latest={i === last} />
          ),
        )}
        {typing && playing && nextWho && <Typing who={nextWho} />}
      </ol>
      <div ref={latestRef}>
        {done ? (
          <>
            <div className={`mt-5 flex justify-center ${styles.enter}`}>
              <Stamp tone="amber">第{chapter}章 クリア</Stamp>
            </div>
            <div
              className={`mt-3 rounded-md bg-[#f3ead6] px-4 py-3 text-[13px] leading-relaxed text-stone-800 shadow-lg shadow-black/30 [&_b]:font-bold [&_b]:text-stone-950 ${styles.enter}`}
              data-testid="story-summary"
            >
              <div className="mb-1 flex items-center gap-1 text-[11px] font-black tracking-wider text-stone-500">
                <Icon name="pen" className="h-3.5 w-3.5" />
                推理メモ
              </div>
              {summary}
            </div>
            <button
              type="button"
              onClick={restart}
              className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-amber-300"
            >
              ↺ この章を最初から
            </button>
          </>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-2 text-[12px] font-bold text-slate-500">
            <span aria-live="polite">{waiting ? "推理すると続きが始まります" : `${shown} / ${beats.length}`}</span>
            {!waiting && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="rounded-full px-3 py-1 text-slate-300 ring-1 ring-white/20 hover:text-amber-300"
                data-testid="story-pause"
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
