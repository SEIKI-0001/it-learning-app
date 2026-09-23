"use client";

import { useState } from "react";
import { CriticalStage, LineStage, ParallelStage, PertPractice, PertSolveStage, TotalStage } from "./pert/PertStages";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle } from "./ui";
import styles from "./wbs/wbs.module.css";

// ============================================================================
// 「WBSとガントチャート」専用の体験。
//   ① WBS = タップした作業が下の小さな作業に分かれていくツリー（大→中→小。日付はまだない）
//   ② ガントチャート = 「買い出しが2日遅れたら？」で、依存している作業の棒が順に右へずれ、
//      全体の完了日が本番を越える。同じ2日でも余裕のある看板づくりは響かない（クリティカルパス）
//   ③ これはどっち？ 仕分けクイズ（分解 or 日程）
//   ④〜⑨ PERT・クリティカルパスの計算（pert/PertStages）：一本道 → 並行作業 → 全体日数 → 最長経路 → 解き方 → 確認3問
// ============================================================================

// ① WBS：タップした作業だけが、下の小さな作業に分かれていく ----------------------
const WBS_TREE = [
  { t: "看板づくり", subs: ["デザイン", "色ぬり"] },
  { t: "買い出し", subs: ["材料リスト", "購入"] },
  { t: "当日係", subs: ["受付", "片づけ"] },
];

function Wbs() {
  const reducedMotion = useReducedMotion();
  const [root, setRoot] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const leaves = open.size * 2;
  const done = open.size === WBS_TREE.length;
  const msg = !root
    ? "「文化祭の出し物」…大きすぎて、何から手をつければいいか分からない。タップして分解！"
    : open.size === 0
      ? "3つに分かれた。でも「看板づくり」などはまだ大きい。それぞれタップして、さらに分解！"
      : done
        ? "ここまで小さくなれば「誰が・何をやるか」を決められる。これで漏れなく洗い出せた！"
        : `小さな作業が ${leaves} 個出てきた。残りの作業もタップしよう。`;

  return (
    <Panel>
      <SectionTitle step={1}>WBS ＝ 作業を分解する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        大きな仕事を<b className="text-gray-800">小さな作業に分けて一覧</b>にしたもの。
        図をタップして、実際に分解してみよう。
      </p>

      <div className={`mt-4 grid grid-cols-[1.75rem_1fr] gap-x-1.5 ${reducedMotion ? styles.reduced : ""}`} data-testid="wbs-tree">
        <div className="grid place-items-center text-[10px] font-bold text-gray-500">大</div>
        <div>
          <button
            type="button"
            onClick={() => setRoot(true)}
            disabled={root}
            aria-expanded={root}
            className={`mx-auto block w-fit rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-bold text-white transition active:scale-95 ${
              root ? "" : "ring-4 ring-brand-200"
            }`}
          >
            文化祭の出し物 {!root && "👆"}
          </button>
        </div>

        {root && (
          <>
            <div className="flex flex-col items-center pt-6 text-[10px] font-bold text-gray-500">
              <span className="leading-[28px]">中</span>
              {open.size > 0 && <span className="mt-1 leading-[52px]">小</span>}
            </div>
            <div className="relative pt-3">
              {/* 親から子へ伸びる枝 */}
              <div className="absolute left-1/2 top-0 h-3 w-0.5 -translate-x-1/2 bg-gray-300" aria-hidden />
              <div className="absolute left-[16.6%] right-[16.6%] top-3 h-0.5 bg-gray-300" aria-hidden />
              <div className="grid grid-cols-3 gap-2 pt-2">
                {WBS_TREE.map((c, i) => {
                  const isOpen = open.has(c.t);
                  return (
                    <div key={c.t} className={styles.split} style={{ animationDelay: `${i * 90}ms` }}>
                      <button
                        type="button"
                        onClick={() => setOpen(new Set(open).add(c.t))}
                        disabled={isOpen}
                        aria-expanded={isOpen}
                        className={`block w-full rounded-lg bg-brand-100 px-1 py-1.5 text-center text-[11px] font-bold text-brand-700 transition active:scale-95 ${
                          isOpen ? "" : "ring-2 ring-brand-300"
                        }`}
                      >
                        {c.t} {!isOpen && "👆"}
                      </button>
                      {isOpen && (
                        <div className="mt-1 space-y-1" data-testid={`wbs-subs-${c.t}`}>
                          {c.subs.map((s, j) => (
                            <div
                              key={s}
                              className={`${styles.split} rounded-md bg-emerald-50 px-1 py-1 text-center text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200`}
                              style={{ animationDelay: `${j * 110}ms` }}
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div
        className={`mt-3 min-h-[3.5em] rounded-xl px-4 py-3 text-sm font-medium leading-relaxed ring-1 ${
          done ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-gray-50 text-gray-600 ring-gray-200"
        }`}
        aria-live="polite"
      >
        {msg}
      </div>
      {done && (
        <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-bold leading-relaxed text-brand-800 ring-1 ring-brand-200" data-testid="wbs-next">
          📋 WBSは「何をやるか」の一覧。まだ<b>日付はない</b>。→ 次のガントチャートで「いつやるか」を決める。
        </p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-500">大→中→小へ分解（Work Breakdown Structure）</p>
        {root && (
          <button
            onClick={() => {
              setRoot(false);
              setOpen(new Set());
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-gray-600 ring-1 ring-gray-300 active:scale-95"
            aria-label="最初から"
          >
            ↺
          </button>
        )}
      </div>
    </Panel>
  );
}

// ② ガント：遅れが依存関係をたどって連鎖し、全体の完了がずれる ------------------------
// start/len は日数（0始まり）。after＝この作業が終わってから始める（依存関係）。
type Task = { t: string; start: number; len: number; color: string; after?: string };
const TASKS: Task[] = [
  { t: "看板づくり", start: 0, len: 3, color: "bg-brand-400" },
  { t: "買い出し", start: 1, len: 2, color: "bg-emerald-400" },
  { t: "飾りつけ", start: 3, len: 2, color: "bg-amber-400", after: "買い出し" },
  { t: "リハーサル", start: 5, len: 2, color: "bg-rose-400", after: "飾りつけ" },
];
const DAYS = 9;
const DEADLINE = 7; // 7日目の終わりが文化祭本番
const ROW = 30; // 1行の高さ(px)
const CRITICAL = ["買い出し", "飾りつけ", "リハーサル"];

const CASES = [
  { id: "plan", label: "📅 予定どおり", task: null, days: 0 },
  { id: "shop", label: "⚡ 買い出し +2日", task: "買い出し", days: 2 },
  { id: "sign", label: "⚡ 看板 +2日", task: "看板づくり", days: 2 },
] as const;

/** 遅れた作業から、依存している後続作業へ遅れを伝える */
function schedule(delayTask: string | null, days: number) {
  const out = new Map<string, { start: number; hop: number }>();
  for (const t of TASKS) {
    let start = t.start + (t.t === delayTask ? days : 0);
    let hop = t.t === delayTask ? 0 : -1;
    if (t.after) {
      const pre = TASKS.find((x) => x.t === t.after)!;
      const p = out.get(pre.t)!;
      const preEnd = p.start + pre.len;
      if (preEnd > start) {
        start = preEnd;
        hop = p.hop + 1;
      }
    }
    out.set(t.t, { start, hop });
  }
  const finish = Math.max(...TASKS.map((t) => out.get(t.t)!.start + t.len));
  return { out, finish };
}

function Gantt() {
  const reducedMotion = useReducedMotion();
  const [cid, setCid] = useState<(typeof CASES)[number]["id"]>("plan");
  const c = CASES.find((x) => x.id === cid)!;
  const { out, finish } = schedule(c.task, c.days);
  const late = finish - DEADLINE;
  const maxHop = Math.max(0, ...[...out.values()].map((v) => v.hop));
  const pct = (d: number) => `${(d / DAYS) * 100}%`;
  const delay = (hop: number) => (hop < 0 ? "0ms" : `${hop * 420}ms`);
  const sign = out.get("看板づくり")!;
  const signSlack = DEADLINE - (sign.start + 3);

  return (
    <Panel>
      <SectionTitle step={2}>ガントチャート ＝ いつやるか</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        WBSで洗い出した作業を<b className="text-gray-800">横棒</b>で見える化。
        棒の<b className="text-gray-800">位置＝時期</b>、<b className="text-gray-800">長さ＝期間</b>です。
      </p>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
        {CASES.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={x.id === cid}
            onClick={() => setCid(x.id)}
            className={`rounded-lg px-1 py-2 text-[11px] font-bold leading-tight transition active:scale-95 ${
              x.id === cid ? (x.id === "plan" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") : "text-gray-600"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className={reducedMotion ? styles.reduced : ""}>
        {/* 日付ヘッダ */}
        <div className="mt-3 flex items-center gap-1">
          <div className="w-16 flex-none" />
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }}>
            {Array.from({ length: DAYS }, (_, i) => (
              <div key={i} className={`text-center text-[10px] ${i + 1 === DEADLINE ? "font-bold text-rose-500" : "text-gray-500"}`}>
                {i + 1 === DEADLINE ? "🎪" : `${i + 1}`}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-1 flex gap-1">
          <div className="w-16 flex-none">
            {TASKS.map((t) => (
              <div key={t.t} className="flex items-center text-[11px] font-bold text-gray-600" style={{ height: ROW }}>
                {t.t}
              </div>
            ))}
          </div>
          <div className="relative flex-1" style={{ height: ROW * TASKS.length }} data-testid="gantt-area">
            {/* 日の区切り */}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${DAYS}, 1fr)` }} aria-hidden>
              {Array.from({ length: DAYS }, (_, i) => (
                <div key={i} className="border-r border-gray-100" />
              ))}
            </div>
            {/* 本番の線 */}
            <div className="absolute inset-y-0 z-10 border-l-2 border-dashed border-rose-400" style={{ left: pct(DEADLINE) }} aria-hidden />

            {/* 看板づくりの余裕（遅れても本番に響かない幅） */}
            <div
              className={`${styles.slack} absolute z-0 flex items-center justify-center rounded border border-dashed border-brand-300 bg-brand-50/60 text-[10px] font-bold text-brand-700`}
              style={{ top: 5, height: ROW - 10, left: pct(sign.start + 3), width: pct(Math.max(signSlack, 0)) }}
              data-testid="gantt-slack"
            >
              余裕{signSlack}日
            </div>

            {/* 依存関係の線（前の作業の終わり → 次の作業の始まり） */}
            {TASKS.map((t, i) => {
              if (!t.after) return null;
              const pi = TASKS.findIndex((x) => x.t === t.after);
              const pre = TASKS[pi];
              const pEnd = out.get(pre.t)!.start + pre.len;
              return (
                <div
                  key={`link-${t.t}`}
                  className={`${styles.link} absolute z-10 w-0.5 bg-rose-500`}
                  style={{ left: pct(pEnd), top: pi * ROW + ROW / 2, height: (i - pi) * ROW, transitionDelay: delay(out.get(pre.t)!.hop) }}
                  aria-hidden
                />
              );
            })}

            {TASKS.map((t, i) => {
              const s = out.get(t.t)!;
              const moved = s.start !== t.start;
              const over = s.start + t.len > DEADLINE;
              return (
                <div
                  key={t.t}
                  className={`${styles.bar} absolute z-20 rounded ${t.color} ${over ? "ring-2 ring-rose-600" : CRITICAL.includes(t.t) ? "ring-1 ring-rose-300" : ""}`}
                  style={{ top: i * ROW + 6, height: ROW - 12, left: pct(s.start), width: pct(t.len), transitionDelay: delay(s.hop) }}
                  data-testid={`gantt-bar-${t.t}`}
                  data-start={s.start}
                >
                  {moved && <span className="absolute -top-0.5 right-0.5 text-[9px] font-bold text-white">+{s.start - t.start}日</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* 全体の完了日 */}
        <div className="mt-1 flex gap-1">
          <div className="w-16 flex-none text-[10px] font-bold text-gray-600">全体の完了</div>
          <div className="relative h-5 flex-1">
            <span
              className={`${styles.finish} absolute top-0 -translate-x-full whitespace-nowrap rounded px-1 text-[10px] font-bold ${late > 0 ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}
              style={{ left: pct(finish), transitionDelay: delay(maxHop) }}
              data-testid="gantt-finish"
              data-day={finish}
            >
              {finish}日目 {late > 0 ? `（${late}日オーバー）` : "✓"}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-1 text-right text-[10px] text-gray-500">🎪＝7日目の文化祭本番　赤い縦線＝「終わってから始める」つながり</p>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium leading-relaxed ring-1 ${
          late > 0 ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"
        }`}
        aria-live="polite"
        data-testid="gantt-verdict"
      >
        {cid === "plan" && <>✅ すべての棒が🎪より左＝全作業が本番に間に合う予定。</>}
        {cid === "shop" && (
          <>
            ❌ 材料がないと飾りつけも、その後のリハーサルもできない…。<b>買い出しの遅れが後ろの作業に連鎖</b>して、
            本番🎪に<b>2日</b>間に合わない！ この「連鎖」が一目で見えるのがガントチャートの強み。
          </>
        )}
        {cid === "sign" && (
          <>
            ✅ 看板づくりは同じ2日遅れでも、後ろにつながる作業がなく<b>余裕</b>があるので本番に間に合う。
            買い出し→飾りつけ→リハーサルのように、<b>1日も遅れが許されない経路</b>を<b>クリティカルパス</b>といいます。
          </>
        )}
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ans: "WBS" | "ガント"; why: string }[] = [
  { t: "やる作業を漏れなく細かく分けて一覧にする", ans: "WBS", why: "作業の分解＝WBS。" },
  { t: "各作業の開始日・終了日を横棒で表す", ans: "ガント", why: "日程の見える化＝ガントチャート。" },
  { t: "「何をやるか」を洗い出す", ans: "WBS", why: "やること（作業）の整理＝WBS。" },
  { t: "「いつやるか」をカレンダー上に表す", ans: "ガント", why: "時期の管理＝ガントチャート。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, "WBS" | "ガント">>({});
  return (
    <Panel>
      <SectionTitle step={3}>これはどっち？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">WBS＝作業の分解</b>、<b className="text-gray-800">ガント＝日程</b>。混同しやすいので練習しよう。
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const correct = chosen === it.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {(["WBS", "ガント"] as const).map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === it.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === it.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "⭕ 正解！ " : `❌ 正解は ${it.ans}。 `}
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function WbsGanttExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🗂️ <b>WBS＝作業を分解した一覧（何をやる）</b>、<b>ガントチャート＝横棒のスケジュール（いつやる）</b>。
        セットでプロジェクトの計画と進捗管理に使います。
        後半（④〜）では、作業の順番から<b>全体で何日かかるか（PERT・クリティカルパス）</b>を計算できるようにします。
      </div>

      <Wbs />
      <Gantt />
      <Quiz />
      <LineStage />
      <ParallelStage />
      <TotalStage />
      <CriticalStage />
      <PertSolveStage />
      <PertPractice />
    </div>
  );
}
