"use client";

import { useState } from "react";
import styles from "./calc/calc.module.css";
import { Note, Replay } from "./calc/CalcParts";
import { useBeats } from "./calc/useBeats";
import { Caption, Lead, PointsPanel, Seg } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「バックアップと復旧手順」。日ごとに積み上がる形と、復元の順番は動きで見せる。
//   ① 取り方：日曜フル → 月・火・水。方式を切り替えると、各日のバックアップに「何が入るか」が1日ずつ積み上がる
//      フル＝毎回ぜんぶ／差分＝日曜以降の変更をまとめて（だんだん増える）／増分＝前回以降の変更だけ（毎回小さい）
//   ② 戻し方：水曜の夜に故障。方式ごとに「使うバックアップ」と「順番」が 1 → 2 → … と点灯し、データが元に戻る
//   ③ RPO と RTO：故障の時点から「過去へ何時間分失ってよいか」と「未来へ何時間で戻すか」（静的）
//   ④ 世代管理：誤削除に気付くのが遅れても、古い世代から戻せる（静的）
//   ⑤ 試験ポイント

export default function BackupExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        💾 バックアップは<b>「何を保存するか」</b>で3種類。保存が軽い方式ほど、<b>戻すときに手間がかかる</b>――この裏表を、日ごとの図で見ます。
      </Lead>
      <TakePanel />
      <RestorePanel />
      <RpoRtoPanel />
      <GenerationPanel />
      <PointsPanel
        step={5}
        points={[
          <>フル＝全部、差分＝<b>直近のフル以降</b>の変更、増分＝<b>直前のバックアップ以降</b>の変更</>,
          <>復元：差分は<b>フル＋最新の差分</b>、増分は<b>フル＋すべての増分を古い順に</b></>,
          <>RPO＝どの時点まで戻れればよいか（失ってよいデータ量）、RTO＝何時間で復旧するか</>,
        ]}
        traps={[
          ["差分と増分の基準を逆に覚える", "差分の基準＝フル、増分の基準＝前回のバックアップ（フルでも増分でも）"],
          ["増分は新しいものから戻す", "フルを戻したあと、増分を古い順（月→火→水）に重ねる"],
          ["RPO と RTO を逆に覚える", "P＝Point（時点・データ）、T＝Time（時間）"],
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 共通のモデル
// ---------------------------------------------------------------------------

type Mode = "full" | "diff" | "incr";
const DAYS = ["日", "月", "火", "水"];
// その日に増えた・変わったデータ。日曜の「元」が土台
const CHANGES = ["元", "月", "火", "水"];
const CHIP_TONE = ["bg-gray-500 text-white", "bg-brand-300 text-brand-950", "bg-brand-500 text-white", "bg-brand-700 text-white"];

/** day 日目のバックアップに入るデータ（CHANGES の添字） */
export function contents(mode: Mode, day: number): number[] {
  if (day === 0 || mode === "full") return Array.from({ length: day + 1 }, (_, i) => i);
  if (mode === "diff") return Array.from({ length: day }, (_, i) => i + 1);
  return [day];
}

/** 水曜の夜に戻すとき、使うバックアップ（日の添字）を順番どおりに */
export function restoreOrder(mode: Mode): number[] {
  if (mode === "full") return [3];
  if (mode === "diff") return [0, 3];
  return [0, 1, 2, 3];
}

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "full", label: "毎日フル" },
  { value: "diff", label: "差分" },
  { value: "incr", label: "増分" },
];

function Chip({ i, className = "" }: { i: number; className?: string }) {
  return <span className={`grid h-6 place-items-center rounded text-[11px] font-bold ${CHIP_TONE[i]} ${className}`}>{CHANGES[i]}</span>;
}

// ---------------------------------------------------------------------------
// ① 取り方
// ---------------------------------------------------------------------------

const TAKE_DELAYS = [700, 900, 900, 900];

function TakePanel() {
  const [mode, setMode] = useState<Mode>("diff");
  const { ref, beat, done, reducedMotion, replay } = useBeats(5, TAKE_DELAYS);
  const pick = (m: Mode) => {
    setMode(m);
    replay();
  };
  const sizes = DAYS.map((_, d) => contents(mode, d).length);
  return (
    <Panel>
      <SectionTitle step={1}>取り方 ― 毎日、何を保存する？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        日曜に<b className="text-gray-800">フル</b>を取り、月〜水は毎日データが少しずつ増えます。四角1つ＝その日に増えた分です。
      </p>
      <div className="mt-3">
        <Seg testId="backup-take-mode" value={mode} onChange={pick} options={MODE_OPTIONS} />
      </div>
      <div ref={ref} className="mt-3" data-testid="backup-take" data-mode={mode} data-beat={beat}>
        <div className="grid grid-cols-4 gap-1.5">
          {DAYS.map((d, day) => {
            const shown = beat > day;
            const items = contents(mode, day);
            return (
              <div key={d} className="flex flex-col">
                <div className="flex h-[7.5rem] flex-col-reverse gap-0.5 rounded-lg bg-gray-50 p-1 ring-1 ring-gray-200" data-testid={`backup-day-${day}`} data-count={shown ? items.length : 0}>
                  {shown &&
                    items.map((c, k) => (
                      <span key={`${mode}-${c}`} className={styles.pop} style={{ animationDelay: `${k * 90}ms` }}>
                        <Chip i={c} />
                      </span>
                    ))}
                </div>
                <div className="mt-1 text-center text-[12px] font-bold text-gray-700">{d}曜</div>
                <div className={`text-center text-[11px] font-bold ${day === 0 || mode === "full" ? "text-gray-600" : "text-brand-700"}`}>
                  {day === 0 || mode === "full" ? "フル" : mode === "diff" ? "差分" : "増分"}
                </div>
              </div>
            );
          })}
        </div>
        {done && (
          <Note>
            {mode === "full" ? (
              <>
                💡 毎日<b>ぜんぶ</b>を保存。取るたびに大きく、時間もかかるが、戻すときは<b>1つで済む</b>。
              </>
            ) : mode === "diff" ? (
              <>
                💡 差分は<b>日曜のフル以降の変更をまとめて</b>保存。日がたつほど大きくなる（{sizes.slice(1).join("→")}個）。
              </>
            ) : (
              <>
                💡 増分は<b>前の日のバックアップ以降の変更だけ</b>。毎日小さい（{sizes.slice(1).join("・")}個）が、ばらばらに分かれる。
              </>
            )}
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ② 戻し方
// ---------------------------------------------------------------------------

const RESTORE_DELAYS = [800, 1000, 1000, 1000, 1000];

function RestorePanel() {
  const [mode, setMode] = useState<Mode>("incr");
  const order = restoreOrder(mode);
  const { ref, beat, done, reducedMotion, replay } = useBeats(order.length + 2, RESTORE_DELAYS);
  const pick = (m: Mode) => {
    setMode(m);
    replay();
  };
  const applied = Math.min(beat, order.length);
  // ここまでに戻ったデータ
  const restored = new Set(order.slice(0, applied).flatMap((d) => contents(mode, d)));
  return (
    <Panel>
      <SectionTitle step={2}>戻し方 ― 水曜の夜に故障！</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">水曜の終わりの状態に戻します。方式ごとに、<b className="text-gray-800">使うバックアップと順番</b>が変わります。</p>
      <div className="mt-3">
        <Seg testId="backup-restore-mode" value={mode} onChange={pick} options={MODE_OPTIONS} />
      </div>
      <div ref={ref} className="mt-3" data-testid="backup-restore" data-mode={mode} data-beat={beat}>
        <Caption className="mb-1">取ってあるバックアップ（番号＝戻す順）</Caption>
        <div className="grid grid-cols-4 gap-1.5">
          {DAYS.map((d, day) => {
            const pos = order.indexOf(day);
            const used = pos >= 0;
            const lit = used && pos < applied;
            return (
              <div
                key={d}
                className={`relative rounded-lg p-1 transition-all duration-300 ${used ? (lit ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white ring-1 ring-gray-300") : "bg-gray-50 opacity-40 ring-1 ring-gray-200"}`}
                data-testid={`backup-src-${day}`}
                data-used={used ? "true" : "false"}
              >
                {used && (
                  <span
                    className={`absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${lit ? `bg-brand-600 text-white ${styles.pop}` : "bg-gray-200 text-gray-500"}`}
                  >
                    {pos + 1}
                  </span>
                )}
                <div className="space-y-0.5">
                  {contents(mode, day).map((c) => (
                    <Chip key={c} i={c} className="!h-5" />
                  ))}
                </div>
                <div className="mt-0.5 text-center text-[11px] font-bold text-gray-600">
                  {d}
                  {day === 0 || mode === "full" ? "フル" : mode === "diff" ? "差分" : "増分"}
                </div>
                {!used && <div className="text-center text-[11px] font-bold text-gray-500">使わない</div>}
              </div>
            );
          })}
        </div>

        <div className="mt-2 text-center text-lg font-bold leading-none text-gray-300" aria-hidden>
          ↓
        </div>
        <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
          <Caption>戻ったデータ</Caption>
          <div className="mt-1 grid grid-cols-4 gap-1" data-testid="backup-restored" data-count={restored.size}>
            {CHANGES.map((c, i) =>
              restored.has(i) ? (
                <span key={c} className={styles.pop}>
                  <Chip i={i} />
                </span>
              ) : (
                <span key={c} className="grid h-6 place-items-center rounded border border-dashed border-gray-300 text-[11px] text-gray-400">
                  {c}
                </span>
              ),
            )}
          </div>
        </div>
        {done && (
          <Note tone="emerald">
            {mode === "full" ? (
              <>✅ 水曜のフル<b>1つだけ</b>で元どおり。</>
            ) : mode === "diff" ? (
              <>
                ✅ <b>日曜フル → 水曜の差分</b>の2つだけ。水曜の差分に月・火の変更も入っているので、途中の差分はいらない。
              </>
            ) : (
              <>
                ✅ <b>日曜フル → 月 → 火 → 水</b>の順に<b>全部</b>重ねる。1つでも抜けたり順番を逆にすると、その日の変更が戻らない。
              </>
            )}
          </Note>
        )}
        <Replay onClick={replay} hidden={reducedMotion} />
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ③ RPO と RTO
// ---------------------------------------------------------------------------

function RpoRtoPanel() {
  return (
    <Panel>
      <SectionTitle step={3}>RPO と RTO ― 過去向きと未来向き</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">故障した瞬間を真ん中に置くと、2つの目標は<b className="text-gray-800">逆向き</b>です。</p>
      <svg viewBox="0 0 300 128" className="mt-3 w-full mx-auto max-w-md" role="img" aria-label="故障の時点から左へ、最後のバックアップまでがRPO。右へ、復旧までがRTO" data-testid="backup-rpo">
        <line x1="10" x2="290" y1="64" y2="64" className="stroke-gray-400" strokeWidth="2" />
        {/* 最後のバックアップ */}
        <circle cx="60" cy="64" r="6" className="fill-brand-600" />
        <text x="60" y="92" textAnchor="middle" fontSize="11" className="fill-brand-800 font-bold">最後の</text>
        <text x="60" y="105" textAnchor="middle" fontSize="11" className="fill-brand-800 font-bold">バックアップ</text>
        {/* 故障 */}
        <text x="150" y="70" textAnchor="middle" fontSize="18">💥</text>
        <text x="150" y="92" textAnchor="middle" fontSize="11" className="fill-rose-700 font-bold">故障</text>
        {/* 復旧 */}
        <circle cx="240" cy="64" r="6" className="fill-emerald-500" />
        <text x="240" y="92" textAnchor="middle" fontSize="11" className="fill-emerald-800 font-bold">復旧</text>
        {/* RPO */}
        <rect x="60" y="30" width="80" height="22" rx="4" className="fill-rose-100" />
        <text x="100" y="45" textAnchor="middle" fontSize="12" className="fill-rose-800 font-bold">← RPO</text>
        <text x="100" y="22" textAnchor="middle" fontSize="11" className="fill-gray-600">失うデータ</text>
        {/* RTO */}
        <rect x="160" y="30" width="80" height="22" rx="4" className="fill-emerald-100" />
        <text x="200" y="45" textAnchor="middle" fontSize="12" className="fill-emerald-800 font-bold">RTO →</text>
        <text x="200" y="22" textAnchor="middle" fontSize="11" className="fill-gray-600">止まっている時間</text>
        <text x="290" y="122" textAnchor="end" fontSize="11" className="fill-gray-400">時間 →</text>
      </svg>
      <div className="mt-1 grid grid-cols-2 gap-1.5 text-[12px]">
        <div className="rounded-lg bg-rose-50 px-2 py-1.5 ring-1 ring-rose-200">
          <b className="text-rose-800">RPO（目標復旧時点）</b>
          <div className="text-rose-900">「最大15分前まで戻れればよい」＝失ってよいデータ量。短くしたければ、こまめに取る</div>
        </div>
        <div className="rounded-lg bg-emerald-50 px-2 py-1.5 ring-1 ring-emerald-200">
          <b className="text-emerald-800">RTO（目標復旧時間）</b>
          <div className="text-emerald-900">「2時間以内に再開」＝止まってよい時間。短くしたければ、戻しやすい方式に</div>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// ④ 世代管理
// ---------------------------------------------------------------------------

function GenerationPanel() {
  const days = ["月", "火", "水", "木"];
  return (
    <Panel>
      <SectionTitle step={4}>世代管理 ― 古い時点にも戻れるように</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        火曜に大事なファイルを<b className="text-gray-800">誤って削除</b>。気付いたのは木曜です。
      </p>
      <div className="mt-3 space-y-2" data-testid="backup-generations">
        <div>
          <Caption className="mb-1">1世代だけ（毎回上書き）</Caption>
          <div className="grid grid-cols-4 gap-1">
            {days.map((d, i) => (
              <div key={d} className={`rounded-md py-1 text-center text-[12px] font-bold ${i === 3 ? "bg-rose-100 text-rose-800 ring-1 ring-rose-300" : "bg-gray-50 text-gray-300 line-through"}`}>
                {d}
                {i === 3 && <div className="text-[11px] no-underline">削除後のみ</div>}
              </div>
            ))}
          </div>
          <p className="mt-1 text-[12px] font-bold text-rose-700">❌ 残っているのは削除後の状態だけ。戻せない</p>
        </div>
        <div>
          <Caption className="mb-1">4世代を残す</Caption>
          <div className="grid grid-cols-4 gap-1">
            {days.map((d, i) => (
              <div key={d} className={`rounded-md py-1 text-center text-[12px] font-bold ${i === 0 ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}>
                {d}
                <div className="text-[11px] font-normal">{i === 0 ? "削除前 ✓" : "削除後"}</div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[12px] font-bold text-emerald-700">✅ 月曜の世代を選んで、削除前に戻せる</p>
        </div>
      </div>
    </Panel>
  );
}
