"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「トランザクションとコミット・ロールバック」専用の体験。
//   ① 銀行振込（Aから引く→Bに足す）を1歩ずつ進め、
//      コミット（確定）かロールバック（取り消し）を選ぶ。
//      片方だけ成功の状態を、コミットで確定／ロールバックで巻き戻すのを体感。
//   ② 排他制御（ロック）＋ ACID のひとこと
// ============================================================================

const START_A = 1000;
const START_B = 0;
const AMOUNT = 500;

type Phase = "idle" | "step1" | "step2" | "done";

function TransferDemo() {
  const [a, setA] = useState(START_A);
  const [b, setB] = useState(START_B);
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("「振込を始める」を押してね。");

  const begin = () => {
    setPhase("step1");
    setMsg("トランザクション開始：Aの口座から500円を引きます…");
  };
  const step1 = () => {
    setA(START_A - AMOUNT);
    setPhase("step2");
    setMsg("① A −500 完了。まだ確定していません。次にBへ足します。");
  };
  const step2 = () => {
    setB(START_B + AMOUNT);
    setPhase("done");
    setMsg("② B +500 完了。確定（コミット）か、取り消し（ロールバック）を選んでください。");
  };
  const commit = () => {
    setPhase("idle");
    setMsg("✅ コミット：両方の変更を確定しました。振込成立！");
  };
  const rollback = () => {
    setA(START_A);
    setB(START_B);
    setPhase("idle");
    setMsg("↩️ ロールバック：開始前の状態に巻き戻しました。お金は消えも増えもしません。");
  };

  const inProgress = phase !== "idle";

  return (
    <Panel>
      <SectionTitle step={1}>振込を1歩ずつ動かす</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「Aから500引く→Bに500足す」を実行。<b className="text-gray-800">片方だけ成功</b>は困るので、
        最後にまとめて確定／取り消しします。
      </p>

      {/* 口座 */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Account name="口座A" v={a} highlight={phase === "step1"} />
        <Account name="口座B" v={b} highlight={phase === "step2"} />
      </div>

      {/* 状態メッセージ */}
      <div className="mt-3 min-h-[3em] rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-200">
        {msg}
      </div>

      {/* 操作 */}
      <div className="mt-3 space-y-2">
        {phase === "idle" && (
          <button onClick={begin} className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white active:scale-95">
            ▶ 振込を始める
          </button>
        )}
        {phase === "step1" && (
          <button onClick={step1} className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white active:scale-95">
            ① Aから 500 引く →
          </button>
        )}
        {phase === "step2" && (
          <button onClick={step2} className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white active:scale-95">
            ② Bに 500 足す →
          </button>
        )}
        {phase === "done" && (
          <div className="flex gap-2">
            <button onClick={commit} className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white active:scale-95">
              ✅ コミット（確定）
            </button>
            <button onClick={rollback} className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-bold text-white active:scale-95">
              ↩️ ロールバック（取消）
            </button>
          </div>
        )}
      </div>

      {inProgress && (
        <p className="mt-2 text-center text-[11px] font-bold text-amber-600">
          🔒 処理中：このデータはロックされ、他の人は同時に更新できません（排他制御）
        </p>
      )}

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 トランザクションは<b>「全部成功」か「全部なし」</b>。確定が<b>コミット</b>、巻き戻しが<b>ロールバック</b>です。
      </div>
    </Panel>
  );
}

function Account({ name, v, highlight }: { name: string; v: number; highlight: boolean }) {
  return (
    <div
      className={`rounded-xl p-3 text-center ring-2 transition ${
        highlight ? "bg-indigo-50 ring-indigo-400" : "bg-gray-50 ring-gray-200"
      }`}
    >
      <div className="text-xs font-bold text-gray-500">{name}</div>
      <div className="mt-1 text-2xl font-extrabold text-gray-800">{v}円</div>
    </div>
  );
}

function Acid() {
  const items = [
    { k: "A", t: "原子性", d: "全部成功か全部なし（中途半端にしない）" },
    { k: "C", t: "一貫性", d: "ルールを保ち、矛盾した状態にしない" },
    { k: "I", t: "独立性", d: "同時に動く処理が互いに邪魔しない" },
    { k: "D", t: "永続性", d: "確定した結果は障害が起きても消えない" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>信頼できる処理＝ACID特性</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {items.map((it) => (
          <div key={it.k} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5">
              <span className="grid h-6 w-6 place-items-center rounded bg-indigo-100 font-mono text-xs font-extrabold text-indigo-700">
                {it.k}
              </span>
              <span className="text-sm font-extrabold text-gray-800">{it.t}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{it.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-200">
        📌 頭文字 <b>A・C・I・D</b>。トランザクションが守るべき4つの性質です。
      </div>
    </Panel>
  );
}

export default function TransactionExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💳 <b>トランザクション</b>は分けられない一連の処理。全部成功で確定する<b>コミット</b>、
        失敗時に開始前へ戻す<b>ロールバック</b>がカギです。
      </div>

      <TransferDemo />
      <Acid />
    </div>
  );
}
