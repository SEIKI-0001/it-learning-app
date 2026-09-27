"use client";

import type { ReactNode } from "react";
import { Lead, PointsPanel } from "./diagram/DiagramParts";
import { Panel, SectionTitle } from "./ui";

// 「マルチコアと並列処理」。どれも動かない図（時間を横軸にした作業の帯）。
//   ① シングルコア：A→B→C→D を順番に（4）／マルチコア：コア1 と コア2 で分担（2）
//      帯の外枠を「CPU」にして、コアは CPU の中の処理担当だと分かるようにする
//   ② マルチコア（CPU1個にコア複数）とマルチプロセッサ（CPU複数）の構造
//   ③ 並列（同じ時間に実際に進む）と並行（1コアで切り替え）
//   ④ 分けられない処理はコアを増やしても速くならない
//   ⑤ 試験ポイント

type Block = { from: number; to: number; label: string; idle?: boolean };
type Lane = { name: string; blocks: Block[] };

/** 時間の帯。time＝横軸の長さ（単位時間）。done を渡すとその位置に「完了」の縦線を引く */
function Lanes({
  cpus,
  time,
  done,
  testId,
}: {
  /** CPU ごとのコアの帯 */
  cpus: { label: string; lanes: Lane[] }[];
  time: number;
  done?: number;
  testId?: string;
}) {
  const pct = (t: number) => `${(t / time) * 100}%`;
  return (
    <div data-testid={testId} data-done={done}>
      <div className="space-y-2">
        {cpus.map((cpu) => (
          <div key={cpu.label} className="rounded-lg border-2 border-gray-800 px-2 pb-2 pt-1">
            <p className="text-[11px] font-bold text-gray-800">{cpu.label}</p>
            <div className="mt-1 space-y-1.5">
              {cpu.lanes.map((lane) => (
                <div key={lane.name} className="flex items-center gap-2">
                  <span className="w-10 flex-none text-[11px] font-bold text-gray-600">{lane.name}</span>
                  <div className="relative h-7 flex-1 rounded bg-gray-100">
                    {lane.blocks.map((b, i) => (
                      <span
                        key={i}
                        className={`absolute inset-y-0 grid place-items-center overflow-hidden rounded text-[12px] font-bold ${
                          b.idle ? "border border-dashed border-gray-300 bg-white text-gray-400" : "border border-white bg-gray-700 text-white"
                        }`}
                        style={{ left: pct(b.from), width: pct(b.to - b.from) }}
                      >
                        {b.label}
                      </span>
                    ))}
                    {done !== undefined && (
                      <span className="absolute -inset-y-1 w-0.5 bg-amber-500" style={{ left: pct(done) }} aria-hidden />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* 目盛り：CPU枠（枠線2px＋余白8px）とコア名（40px＋隙間8px）の分だけずらして帯にそろえる */}
      <div className="px-[10px]">
        <div className="relative ml-12 mt-1 h-3.5 text-[10px] text-gray-500" aria-hidden>
          {Array.from({ length: time + 1 }, (_, t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: pct(t) }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <p className="text-right text-[10px] text-gray-500">時間 →</p>
    </div>
  );
}

function Result({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[15px] font-bold text-gray-900 [&_b]:text-amber-700">{children}</p>;
}

const unit = (labels: string[], start = 0, len = 1): Block[] => labels.map((label, i) => ({ from: start + i * len, to: start + (i + 1) * len, label }));

function CompareCorePanel() {
  return (
    <Panel>
      <SectionTitle step={1}>1つのコアで順番に vs 複数のコアで同時に</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">
        仕事 A・B・C・D（どれも1時間）を片づけます。<b className="text-gray-900">コア</b>は、CPUの中で命令を実行する<b className="text-gray-900">処理担当</b>です。
      </p>
      <div className="mt-4 space-y-5">
        <div>
          <p className="text-sm font-bold text-gray-900">シングルコア：1人の担当が順番に</p>
          <div className="mt-1.5">
            <Lanes testId="lanes-single" time={4} done={4} cpus={[{ label: "CPU（コア1つ）", lanes: [{ name: "コア1", blocks: unit(["A", "B", "C", "D"]) }] }]} />
          </div>
          <Result>
            終わるまで <b>4時間</b>
          </Result>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">マルチコア：2人の担当で分けて同時に</p>
          <div className="mt-1.5">
            <Lanes
              testId="lanes-multi"
              time={4}
              done={2}
              cpus={[
                {
                  label: "CPU（コア2つ）",
                  lanes: [
                    { name: "コア1", blocks: unit(["A", "B"]) },
                    { name: "コア2", blocks: unit(["C", "D"]) },
                  ],
                },
              ]}
            />
          </div>
          <Result>
            終わるまで <b>2時間</b>（同じ時間に2つずつ進む）
          </Result>
        </div>
      </div>
    </Panel>
  );
}

function Chip({ cores, label }: { cores: number; label: string }) {
  return (
    <div className="rounded-lg border-2 border-gray-800 bg-white px-2 pb-2 pt-1">
      <p className="text-[11px] font-bold text-gray-800">{label}</p>
      <div className="mt-1 flex gap-1">
        {Array.from({ length: cores }, (_, i) => (
          <span key={i} className="grid h-8 w-10 place-items-center rounded bg-gray-700 text-[10px] font-bold text-white">
            コア
          </span>
        ))}
      </div>
    </div>
  );
}

function StructurePanel() {
  return (
    <Panel>
      <SectionTitle step={2}>「コアが複数」と「CPUが複数」は別のもの</SectionTitle>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="core-vs-cpu">
        <div className="rounded-xl p-3 ring-1 ring-gray-200">
          <p className="text-base font-bold text-gray-900">マルチコア</p>
          <p className="text-[13px] font-bold text-gray-700">1つのCPUの中に、コアが複数</p>
          <div className="mt-2 flex justify-center">
            <Chip cores={2} label="CPU ×1" />
          </div>
        </div>
        <div className="rounded-xl p-3 ring-1 ring-gray-200">
          <p className="text-base font-bold text-gray-900">マルチプロセッサ</p>
          <p className="text-[13px] font-bold text-gray-700">1つのシステムに、CPUが複数</p>
          <div className="mt-2 flex justify-center gap-2">
            <Chip cores={1} label="CPU ①" />
            <Chip cores={1} label="CPU ②" />
          </div>
        </div>
      </div>
      <p className="mt-4 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700">
        「クアッドコアCPU」は<b className="text-gray-900">CPUが1個・コアが4個</b>。コアの数とCPUの数は、同じ数え方ではありません。
      </p>
    </Panel>
  );
}

function ConcurrentPanel() {
  const slices = Array.from({ length: 6 }, (_, i) => ({ from: i * 0.5, to: (i + 1) * 0.5, label: i % 2 ? "B" : "A" }));
  return (
    <Panel>
      <SectionTitle step={3}>並列処理 と 並行処理</SectionTitle>
      <div className="mt-4 space-y-5">
        <div>
          <p className="text-base font-bold text-gray-900">並行処理：1つのコアが切り替えながら進める</p>
          <p className="text-[13px] text-gray-600">短い時間ずつ交代するので、どちらも進んでいるように見える（コア1つでもできる）</p>
          <div className="mt-1.5">
            <Lanes testId="lanes-concurrent" time={3} cpus={[{ label: "CPU（コア1つ）", lanes: [{ name: "コア1", blocks: slices }] }]} />
          </div>
        </div>
        <div>
          <p className="text-base font-bold text-gray-900">並列処理：複数のコアで、同じ時間に実際に進める</p>
          <div className="mt-1.5">
            <Lanes
              testId="lanes-parallel"
              time={3}
              cpus={[
                {
                  label: "CPU（コア2つ）",
                  lanes: [
                    { name: "コア1", blocks: [{ from: 0, to: 1.5, label: "A" }] },
                    { name: "コア2", blocks: [{ from: 0, to: 1.5, label: "B" }] },
                  ],
                },
              ]}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function LimitPanel() {
  return (
    <Panel>
      <SectionTitle step={4}>分けられない仕事は、コアを増やしても速くならない</SectionTitle>
      <div className="mt-4 space-y-5">
        <div>
          <p className="text-base font-bold text-gray-900">分けられる：4店舗の売上を店ごとに集計</p>
          <p className="text-[13px] text-gray-600">店どうしは関係ないので、同時に計算してよい</p>
          <div className="mt-1.5">
            <Lanes
              testId="lanes-split"
              time={4}
              done={2}
              cpus={[
                {
                  label: "CPU（コア2つ）",
                  lanes: [
                    { name: "コア1", blocks: unit(["店1", "店2"]) },
                    { name: "コア2", blocks: unit(["店3", "店4"]) },
                  ],
                },
              ]}
            />
          </div>
          <Result>
            <b>2時間</b>で終わる
          </Result>
        </div>
        <div>
          <p className="text-base font-bold text-gray-900">分けられない：前の月の残高を使って次の月を計算</p>
          <p className="text-[13px] text-gray-600">2月は1月の結果を待たないと始められない → コア2は空いたまま</p>
          <div className="mt-1.5">
            <Lanes
              testId="lanes-chain"
              time={4}
              done={4}
              cpus={[
                {
                  label: "CPU（コア2つ）",
                  lanes: [
                    { name: "コア1", blocks: unit(["1月", "2月", "3月", "4月"]) },
                    { name: "コア2", blocks: [{ from: 0, to: 4, label: "待つだけ", idle: true }] },
                  ],
                },
              ]}
            />
          </div>
          <Result>
            コアが2つでも <b>4時間</b>
          </Result>
        </div>
      </div>
    </Panel>
  );
}

export default function ParallelSystemsExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        <b>コア</b>は、CPUの中で命令を実行する処理担当。コアが複数あれば、<b>別々の仕事を同じ時間に進められます</b>（並列処理）。
      </Lead>
      <CompareCorePanel />
      <StructurePanel />
      <ConcurrentPanel />
      <LimitPanel />
      <PointsPanel
        step={5}
        points={[
          <>マルチコア＝<b>1つのCPUの中に複数のコア</b>、マルチプロセッサ＝<b>複数のCPU</b></>,
          <>並列処理＝同じ時間に実際に進む、並行処理＝<b>切り替えながら</b>進める（1コアでも可）</>,
          <>速くなるのは<b>独立した部分に分けられる</b>仕事だけ</>,
        ]}
        traps={[
          ["コアの数＝CPUの数", "クアッドコアCPUは CPU1個・コア4個"],
          ["コアを2倍にすれば、どんな処理も2倍速くなる", "前の結果を待つ処理は分けられず、速くならない部分が残る"],
        ]}
      />
    </div>
  );
}
