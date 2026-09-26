"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./datastructure.module.css";

// スタック／キューを「物」として動かす小さな 2.5D ステージ。
//   スタック：push＝新しい箱が上から落ちて積まれる／pop＝一番上だけが持ち上がって横のトレーへ出る
//   キュー  ：enqueue＝後ろから歩いて列に入る／dequeue＝先頭がレジから抜け、残りが前へ詰める
// 位置は left / bottom で持ち、並び順が変わると遷移で「詰める」動きになる。

export type Thing = { id: number; icon: string; label: string };

const STACK_ICONS = ["📕", "📗", "📘", "📙", "📓", "📔"];
const QUEUE_ICONS = ["🧑", "👩", "👨‍🦱", "👧", "🧓", "👦"];
export const MAX_ITEMS = 5;
const LEAVE_MS = 1300;

/** 取り出した物を、アニメーションの間だけ画面に残す */
function useLeaving(reducedMotion: boolean) {
  const [leaving, setLeaving] = useState<Thing | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function leave(t: Thing, keep: boolean) {
    window.clearTimeout(timer.current);
    setLeaving(t);
    if (!keep) timer.current = window.setTimeout(() => setLeaving(null), reducedMotion ? 0 : LEAVE_MS);
  }
  return { leaving, leave };
}

function useThings(icons: string[], initial: number) {
  const next = useRef(initial + 1);
  const [items, setItems] = useState<Thing[]>(() =>
    Array.from({ length: initial }, (_, i) => ({ id: i + 1, icon: icons[i % icons.length], label: String(i + 1) })),
  );
  const make = (): Thing => {
    const n = next.current++;
    return { id: n, icon: icons[(n - 1) % icons.length], label: String(n) };
  };
  return { items, setItems, make };
}

type LogProps = { ins: string[]; outs: string[]; testId: string };

function OrderLog({ ins, outs, testId }: LogProps) {
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 rounded-xl bg-gray-50 px-3 py-2 text-xs ring-1 ring-gray-200" data-testid={testId}>
      <dt className="font-bold text-gray-500">入れた順</dt>
      <dd className="font-mono font-bold text-gray-700">{ins.join(" → ") || "—"}</dd>
      <dt className="font-bold text-gray-500">出た順</dt>
      <dd className="font-mono font-bold text-rose-700" data-testid={`${testId}-outs`}>
        {outs.join(" → ") || "—"}
      </dd>
    </dl>
  );
}

export function StackStage({ reducedMotion, onOut }: { reducedMotion: boolean; onOut?: (t: Thing) => void }) {
  const { items, setItems, make } = useThings(STACK_ICONS, 2);
  const { leaving, leave } = useLeaving(reducedMotion);
  const [ins, setIns] = useState<string[]>(["1", "2"]);
  const [outs, setOuts] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const push = () => {
    if (items.length >= MAX_ITEMS) return;
    const t = make();
    setItems((p) => [...p, t]);
    setIns((p) => [...p, t.label]);
    setMessage(`push ${t.label}：上から落ちて一番上に積まれた`);
  };
  const pop = () => {
    const top = items.at(-1);
    if (!top) return;
    setItems((p) => p.slice(0, -1));
    leave(top, true);
    setOuts((p) => [...p, top.label]);
    setMessage(`pop：一番上の ${top.label} だけが持ち上がって出た（下の箱はそのまま）`);
    onOut?.(top);
  };

  return (
    <div>
      <div className={styles.stackStage} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="stack-stage" data-count={items.length}>
        <span className={styles.stackMouth}>⬇ 出入り口は上だけ ⬆</span>
        <div className={styles.stackWell} aria-hidden />
        <div className={styles.tray}>
          <span className={styles.trayLabel}>取り出した</span>
        </div>
        <ul className={styles.stackList} aria-label="スタックの中身（下から順）">
          {items.map((t, i) => (
            <li
              key={t.id}
              className={styles.book}
              data-top={i === items.length - 1 ? "true" : "false"}
              data-fresh={t.id > 2 ? "true" : "false"}
              style={{ left: 64, bottom: 14 + i * 30 }}
              aria-label={`${t.label}の箱${i === items.length - 1 ? "（一番上）" : ""}`}
            >
              <span aria-hidden>{t.icon}</span>
              <span className={styles.bookNo}>{t.label}</span>
            </li>
          ))}
        </ul>
        {leaving && (
          <span
            key={leaving.id}
            className={`${styles.book} ${styles.bookOut}`}
            style={{ "--from": `${14 + items.length * 30}px` } as CSSProperties}
            data-testid="stack-out" aria-label={`取り出した ${leaving.label}`} role="img">
            <span aria-hidden>{leaving.icon}</span>
            <span className={styles.bookNo}>{leaving.label}</span>
          </span>
        )}
        {items.length === 0 && <span className={styles.empty}>空っぽ</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={push} disabled={items.length >= MAX_ITEMS} className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-40">
          push（積む）
        </button>
        <button type="button" onClick={pop} disabled={items.length === 0} className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-40">
          pop（取り出す）
        </button>
      </div>
      <p className="mt-2 min-h-[1.2em] text-center text-xs font-bold text-gray-600" aria-live="polite">
        {message}
      </p>
      <OrderLog ins={ins} outs={outs} testId="stack-log" />
    </div>
  );
}

const QUEUE_X = (i: number) => 76 + i * 46;

export function QueueStage({ reducedMotion, onOut }: { reducedMotion: boolean; onOut?: (t: Thing) => void }) {
  const { items, setItems, make } = useThings(QUEUE_ICONS, 2);
  const { leaving, leave } = useLeaving(reducedMotion);
  const [ins, setIns] = useState<string[]>(["1", "2"]);
  const [outs, setOuts] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const enqueue = () => {
    if (items.length >= MAX_ITEMS) return;
    const t = make();
    setItems((p) => [...p, t]);
    setIns((p) => [...p, t.label]);
    setMessage(`enqueue ${t.label}：列の一番うしろに並んだ`);
  };
  const dequeue = () => {
    const front = items[0];
    if (!front) return;
    setItems((p) => p.slice(1));
    leave(front, false);
    setOuts((p) => [...p, front.label]);
    setMessage(`dequeue：先頭の ${front.label} が抜けて、残りが1つずつ前へ詰めた`);
    onOut?.(front);
  };

  return (
    <div>
      <div className={styles.queueStage} data-reduced-motion={reducedMotion ? "true" : "false"} data-testid="queue-stage" data-count={items.length}>
        <div className={styles.queueFloor} aria-hidden />
        <div className={styles.register} aria-hidden>
          <span>🛒</span>
          <span className={styles.registerLabel}>レジ</span>
        </div>
        <span className={`${styles.queueEnd} ${styles.queueFront}`}>先頭（ここから出る）</span>
        <span className={`${styles.queueEnd} ${styles.queueBack}`}>末尾（ここに並ぶ）</span>
        <ul className={styles.queueList} aria-label="キューの中身（先頭から順）">
          {items.map((t, i) => (
            <li
              key={t.id}
              className={styles.person}
              data-front={i === 0 ? "true" : "false"}
              data-fresh={t.id > 2 ? "true" : "false"}
              style={{ left: QUEUE_X(i) }}
              aria-label={`${t.label}番の人${i === 0 ? "（先頭）" : ""}`}
            >
              <span className={styles.personIcon} aria-hidden>
                {t.icon}
              </span>
              <span className={styles.personNo}>{t.label}</span>
            </li>
          ))}
        </ul>
        {leaving && (
          <span key={leaving.id} className={`${styles.person} ${styles.personOut}`} style={{ left: QUEUE_X(0) }} data-testid="queue-out" role="img" aria-label={`列から出た ${leaving.label}`}>
            <span className={styles.personIcon} aria-hidden>
              {leaving.icon}
            </span>
            <span className={styles.personNo}>{leaving.label}</span>
          </span>
        )}
        {items.length === 0 && <span className={styles.empty}>だれも並んでいない</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={enqueue} disabled={items.length >= MAX_ITEMS} className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-40">
          enqueue（並ぶ）
        </button>
        <button type="button" onClick={dequeue} disabled={items.length === 0} className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-40">
          dequeue（取り出す）
        </button>
      </div>
      <p className="mt-2 min-h-[1.2em] text-center text-xs font-bold text-gray-600" aria-live="polite">
        {message}
      </p>
      <OrderLog ins={ins} outs={outs} testId="queue-log" />
    </div>
  );
}
