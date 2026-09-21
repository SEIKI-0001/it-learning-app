"use client";

import { useState } from "react";
import type { NodeState } from "./network/NetworkSceneBase";
import { useReducedMotion } from "./scene/useReducedMotion";
import { TransactionScene, type TransactionSceneProps } from "./transaction/TransactionScene";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「トランザクションとコミット・ロールバック」専用の体験。
//   ① 銀行振込（Aから引く→Bに足す）を1歩ずつ進め、
//      コミット（確定）かロールバック（取り消し）を選ぶ。
//      片方だけ成功の状態を、コミットで確定／ロールバックで巻き戻すのを体感。
//      2.5D の銀行模型（口座A → Transaction Engine → 口座B）で500円が移動し、
//      途中の「障害発生」で自動ロールバック＝原子性を体験する。
//   ② 排他制御（ロック）＋ ACID のひとこと
// ============================================================================

const START_A = 1000;
const START_B = 0;
const AMOUNT = 500;

type Phase = "idle" | "begun" | "debited" | "credited" | "committed" | "rolledBack" | "crashed" | "recovered";

type View = {
  a: number;
  b: number;
  msg: string;
  money: TransactionSceneProps["money"];
  lanes: TransactionSceneProps["lanes"];
  reverse: boolean;
  nodes: TransactionSceneProps["nodes"];
  alert: TransactionSceneProps["alert"];
};

const n = (a: NodeState, engine: NodeState, b: NodeState) => ({ a, engine, b });
const IDLE_LANES = { debit: "idle", credit: "idle" } as const;

function viewOf(phase: Phase, crashedFrom: "debited" | "credited" | null): View {
  switch (phase) {
    case "idle":
      return { a: START_A, b: START_B, msg: "「振込を始める」を押してね。", money: null, lanes: IDLE_LANES, reverse: false, nodes: n("idle", "idle", "idle"), alert: null };
    case "begun":
      return {
        a: START_A, b: START_B,
        msg: "トランザクション開始：AとBの口座をロック。Aの口座から500円を引きます…",
        money: null, lanes: IDLE_LANES, reverse: false, nodes: n("active", "active", "idle"), alert: null,
      };
    case "debited":
      return {
        a: START_A - AMOUNT, b: START_B,
        msg: "① A −500 完了。まだ確定していません。次にBへ足します。",
        money: { spot: "engine", state: "pending" },
        lanes: { debit: "active", credit: "idle" }, reverse: false, nodes: n("idle", "active", "idle"),
        alert: { tone: "warn", title: "⚠ 片方だけ更新された状態", body: "A=500 / B=0。合計が500円減っている" },
      };
    case "credited":
      return {
        a: START_A - AMOUNT, b: START_B + AMOUNT,
        msg: "② B +500 完了。確定（コミット）か、取り消し（ロールバック）を選んでください。",
        money: { spot: "b", state: "pending" },
        lanes: { debit: "idle", credit: "active" }, reverse: false, nodes: n("idle", "active", "active"),
        alert: { tone: "warn", title: "両方更新・まだ未確定", body: "コミットするまで仮の状態" },
      };
    case "committed":
      return {
        a: START_A - AMOUNT, b: START_B + AMOUNT,
        msg: "✅ コミット：両方の変更を確定しました。振込成立！",
        money: { spot: "b", state: "settled" }, lanes: IDLE_LANES, reverse: false, nodes: n("idle", "idle", "idle"),
        alert: { tone: "ok", title: "✅ COMMIT", body: "A=500 / B=500 を確定" },
      };
    case "rolledBack":
      return {
        a: START_A, b: START_B,
        msg: "↩️ ロールバック：開始前の状態に巻き戻しました。お金は消えも増えもしません。",
        money: { spot: "a", state: "returning" },
        lanes: { debit: "active", credit: "active" }, reverse: true, nodes: n("active", "idle", "idle"),
        alert: { tone: "ok", title: "↩ ROLLBACK", body: "A=1000 / B=0 に戻した" },
      };
    case "crashed":
      return {
        a: START_A - AMOUNT, b: crashedFrom === "credited" ? START_B + AMOUNT : START_B,
        msg:
          crashedFrom === "debited"
            ? "⚡ Aから引いた直後にシステム障害！Bにはまだ届いていません。このまま止まると500円が消えてしまいます。"
            : "⚡ コミット前にシステム障害！変更はまだ確定していません。",
        money: { spot: "engine", state: "crashed" }, lanes: IDLE_LANES, reverse: false, nodes: n("idle", "error", "idle"),
        alert: { tone: "crash", title: "⚡ 障害発生：処理が途中で停止", body: "確定前の変更が残ったまま" },
      };
    case "recovered":
      return {
        a: START_A, b: START_B,
        msg: "🔄 再起動時に、確定していなかった変更を自動でロールバック。A=1000 / B=0 に戻り、お金は消えませんでした。",
        money: { spot: "a", state: "returning" },
        lanes: { debit: "active", credit: "idle" }, reverse: true, nodes: n("active", "idle", "idle"),
        alert: { tone: "ok", title: "🔄 自動ロールバック", body: "全部なし＝開始前に戻った" },
      };
  }
}

const LOG_LINES: Record<Phase, string | null> = {
  idle: null,
  begun: "BEGIN（A・Bをロック）",
  debited: "UPDATE 口座A −500",
  credited: "UPDATE 口座B +500",
  committed: "COMMIT → 確定・ロック解除",
  rolledBack: "ROLLBACK → 開始前へ",
  crashed: "⚡ 障害で停止（未確定）",
  recovered: "再起動 → ROLLBACK",
};

function TransferDemo() {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [crashedFrom, setCrashedFrom] = useState<"debited" | "credited" | null>(null);
  const [log, setLog] = useState<Phase[]>([]);
  const [seenCrash, setSeenCrash] = useState(false);

  const go = (next: Phase) => {
    setPhase(next);
    setLog((current) => (next === "begun" ? ["begun"] : [...current, next]));
  };
  const crash = () => {
    setCrashedFrom(phase === "credited" ? "credited" : "debited");
    setSeenCrash(true);
    go("crashed");
  };

  const view = viewOf(phase, crashedFrom);
  const inProgress = phase === "begun" || phase === "debited" || phase === "credited" || phase === "crashed";
  const pendingA = inProgress && view.a !== START_A;
  const pendingB = inProgress && view.b !== START_B;

  return (
    <Panel>
      <SectionTitle step={1}>振込を1歩ずつ動かす</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「Aから500引く→Bに500足す」を実行。<b className="text-gray-800">片方だけ成功</b>は困るので、
        最後にまとめて確定／取り消しします。途中で<b className="text-gray-800">障害</b>も起こしてみよう。
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <TransactionScene
          nodes={view.nodes}
          accounts={{
            a: { balance: view.a, pending: pendingA, locked: inProgress, settled: phase === "committed" },
            b: { balance: view.b, pending: pendingB, locked: inProgress, settled: phase === "committed" },
          }}
          lanes={view.lanes}
          reverse={view.reverse}
          money={view.money}
          alert={view.alert}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* 状態メッセージ */}
      <div
        className="mt-3 min-h-[3em] rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-gray-200"
        aria-live="polite"
        data-testid="tx-message"
      >
        {view.msg}
      </div>

      {/* 操作 */}
      <div className="mt-3 space-y-2">
        {(phase === "idle" || phase === "committed" || phase === "rolledBack" || phase === "recovered") && (
          <button type="button" onClick={() => go("begun")} className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white active:scale-95">
            {phase === "idle" ? "▶ 振込を始める" : "▶ もう一度振込を始める"}
          </button>
        )}
        {phase === "begun" && (
          <button type="button" onClick={() => go("debited")} className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white active:scale-95">
            ① Aから 500 引く →
          </button>
        )}
        {phase === "debited" && (
          <div className="flex gap-2">
            <button type="button" onClick={() => go("credited")} className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white active:scale-95">
              ② Bに 500 足す →
            </button>
            <button type="button" onClick={crash} className="flex-none rounded-lg bg-white px-3 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-300 active:scale-95">
              ⚡ 障害発生
            </button>
          </div>
        )}
        {phase === "credited" && (
          <>
            <div className="flex gap-2">
              <button type="button" onClick={() => go("committed")} className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white active:scale-95">
                ✅ コミット（確定）
              </button>
              <button type="button" onClick={() => go("rolledBack")} className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-bold text-white active:scale-95">
                ↩️ ロールバック（取消）
              </button>
            </div>
            <button type="button" onClick={crash} className="w-full rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-300 active:scale-95">
              ⚡ コミット前に障害発生
            </button>
          </>
        )}
        {phase === "crashed" && (
          <button type="button" onClick={() => go("recovered")} className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white active:scale-95">
            🔄 再起動する
          </button>
        )}
      </div>

      {inProgress && (
        <p className="mt-2 text-center text-[11px] font-bold text-amber-600">
          🔒 処理中：このデータはロックされ、他の人は同時に更新できません（排他制御）
        </p>
      )}

      {log.length > 0 && (
        <div className="mt-3 rounded-xl bg-slate-900 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-200" data-testid="tx-log">
          <p className="text-[10px] font-bold text-slate-400">トランザクションログ</p>
          <ol>
            {log.map((p, i) => (
              <li key={`${i}-${p}`} className={p === "crashed" ? "text-rose-300" : p === "committed" ? "text-emerald-300" : undefined}>
                {LOG_LINES[p]}
              </li>
            ))}
          </ol>
        </div>
      )}

      {phase === "recovered" && (
        <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900 ring-1 ring-rose-200" data-testid="tx-without">
          もし<b>トランザクションで囲んでいなかったら</b>… 障害の時点の
          <b> A=500 / B={crashedFrom === "credited" ? 500 : 0}</b> がそのまま残り、
          {crashedFrom === "credited" ? "確定の手続きが無いまま中途半端な記録が残ります。" : "500円が消えてしまいます。"}
        </div>
      )}

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 トランザクションは<b>「全部成功」か「全部なし」</b>（原子性＝Atomicity）。確定が<b>コミット</b>、巻き戻しが<b>ロールバック</b>です。
        {seenCrash && <> 障害が起きても、確定前の変更は<b>全部なし</b>に戻ります。</>}
      </div>
    </Panel>
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
              <span className="grid h-6 w-6 place-items-center rounded bg-brand-100 font-mono text-xs font-bold text-brand-700">
                {it.k}
              </span>
              <span className="text-sm font-bold text-gray-800">{it.t}</span>
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
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💳 <b>トランザクション</b>は分けられない一連の処理。全部成功で確定する<b>コミット</b>、
        失敗時に開始前へ戻す<b>ロールバック</b>がカギです。
      </div>

      <TransferDemo />
      <Acid />
    </div>
  );
}
