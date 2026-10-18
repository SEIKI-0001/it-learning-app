"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";
import Icon, { type IconName } from "@/components/ui/Icon";
import { InlineIcon } from "@/components/ui/Pictogram";
import { DeskAutomation, ItilProcesses, ItilQuiz, ReductionRate, ServiceDesk } from "./itil/ItilPanels";

// ============================================================================
// 「ITIL」専用の体験。
//   ① ITサービスマネジメントの定義と、ITIL＝ベストプラクティス集
//   ② 障害対応シミュレータ：選択によって結末が分岐し、
//      インシデント管理(まず復旧)/問題管理(原因を断つ)/変更管理(安全に変える)の
//      役割の違いを体感する
//   ③〜⑦ 過去問の出題に合わせた図（itil/ItilPanels）：サービスデスクとKPI、
//      FAQ・チャットボット・支援AIの効果、削減率の計算、管理プロセスの見分け方、どの管理？クイズ
// ============================================================================

function WhatIs() {
  return (
    <Panel>
      <SectionTitle step={1}>ITサービスマネジメントとITIL</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">ITサービスマネジメント</b>は、提供しているITサービスが事業のニーズを満たし続けるように、
        <b className="text-gray-800">人材・プロセス・技術</b>を組み合わせ、<b className="text-gray-800">継続的に改善</b>して管理する活動です。
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="rounded-xl bg-gray-50 px-3 py-3 text-center ring-1 ring-gray-200">
          <Icon name="book-open" className="mx-auto h-7 w-7 text-gray-600" />
          <div className="mt-1 text-[11px] font-bold text-gray-700">ITIL</div>
          <div className="text-[10px] text-gray-500">成功事例の知識集</div>
        </div>
        <span className="text-lg text-gray-300">→</span>
        <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center ring-1 ring-emerald-200">
          <Icon name="building" className="mx-auto h-7 w-7 text-emerald-600" />
          <div className="mt-1 text-[11px] font-bold text-emerald-700">自社の運用</div>
          <div className="text-[10px] text-gray-500">参考にして改善</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        <InlineIcon name="lightbulb" /><b>ITIL</b>は、ITサービスマネジメントで広く使われている成功事例（ベストプラクティス）を集めたもの。
        障害対応・変更・窓口の運営などの進め方がまとまっています。
      </div>
    </Panel>
  );
}

// 障害対応シミュレータ：選択で結末が分岐する小さな物語
type Stage = "down" | "slowStart" | "restored" | "recur" | "cause" | "risky" | "stable";

const STORY: Record<
  Stage,
  { text: string; tone: "rose" | "amber" | "sky" | "emerald"; choices: { label: string; next: Stage; log: string }[] }
> = {
  down: {
    text: "月曜12:00、メールサーバが停止！「メールが使えない！」と問い合わせが殺到中。あなたが最初にやることは？",
    tone: "rose",
    choices: [
      { label: "まず原因をじっくり調査する", next: "slowStart", log: "原因調査を開始…" },
      { label: "まず予備サーバに切り替えて復旧", next: "restored", log: "予備に切り替え → 15分で復旧！" },
    ],
  },
  slowStart: {
    text: "調査に3時間…その間サービスは止まりっぱなしで、利用者は大迷惑！ 障害のときは原因究明より先に「まず戻す」＝インシデント管理が先です。",
    tone: "rose",
    choices: [{ label: "予備サーバに切り替えて復旧", next: "restored", log: "予備に切り替え → やっと復旧" }],
  },
  restored: {
    text: "サービス復旧！これが「まず早く元に戻す」インシデント管理。…でも、なぜ落ちたのかは分からないまま。次はどうする？",
    tone: "emerald",
    choices: [
      { label: "直ったからヨシ！様子を見る", next: "recur", log: "原因はそのまま様子見…" },
      { label: "根本原因を調べる（問題管理）", next: "cause", log: "根本原因の調査を開始" },
    ],
  },
  recur: {
    text: "3日後、また同じ障害で停止！原因を断たない限り、何度でもくり返します。再発を防ぐのが問題管理の仕事。",
    tone: "rose",
    choices: [{ label: "今度こそ根本原因を調べる（問題管理）", next: "cause", log: "再発！ → 調査開始" }],
  },
  cause: {
    text: "原因が判明：古い設定のせいでメモリ不足になっていた。対策にはサーバの設定変更が必要。どう変える？",
    tone: "sky",
    choices: [
      { label: "今すぐ本番サーバをいじる", next: "risky", log: "ぶっつけで本番を変更…" },
      { label: "影響を審査して計画的に変更（変更管理）", next: "stable", log: "影響を審査 → 計画的に変更" },
    ],
  },
  risky: {
    text: "ぶっつけ変更が別のシステムに影響して、今度はそっちが停止！変更は影響範囲を確認してから安全に行う＝変更管理が必要です。",
    tone: "rose",
    choices: [{ label: "影響を審査して計画的に変更（変更管理）", next: "stable", log: "やり直し → 審査して安全に変更" }],
  },
  stable: {
    text: "対策完了！その後、同じ障害は二度と起きませんでした。まず戻す・原因を断つ・安全に変える、と目的の違う管理が連携して働きます。",
    tone: "emerald",
    choices: [],
  },
};

const SUMMARY: { icon: IconName; name: string; desc: string }[] = [
  { icon: "ambulance", name: "インシデント管理", desc: "まず早く復旧" },
  { icon: "microscope", name: "問題管理", desc: "原因を断ち再発防止" },
  { icon: "tool", name: "変更管理", desc: "影響を審査し安全に変更" },
];

const TONE_BOX: Record<string, string> = {
  rose: "bg-rose-50 text-rose-900 ring-rose-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  sky: "bg-sky-50 text-sky-900 ring-sky-200",
  emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200",
};

function IncidentSim() {
  const [stage, setStage] = useState<Stage>("down");
  const [log, setLog] = useState<string[]>(["メールサーバが停止"]);
  const cur = STORY[stage];
  const serviceDown = stage === "down" || stage === "slowStart" || stage === "recur" || stage === "risky";

  const pick = (c: { label: string; next: Stage; log: string }) => {
    setStage(c.next);
    setLog((p) => [...p, c.log]);
  };
  const reset = () => {
    setStage("down");
    setLog(["メールサーバが停止"]);
  };

  return (
    <Panel>
      <SectionTitle step={2}>障害発生！あなたが運用担当なら？</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        選択によって結末が変わります。ITILの3つの管理が<b className="text-gray-800">どの場面で効くのか</b>を体感しよう。
      </p>

      {/* サービス状態 */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5 ring-1 ring-gray-200">
        <span className="text-xs font-bold text-gray-500">メールサービス</span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            serviceDown ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
          }`}
        >
          {serviceDown ? "停止中" : "稼働中"}
        </span>
      </div>

      {/* 物語と選択肢 */}
      <div className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed ring-1 ${TONE_BOX[cur.tone]}`}>{cur.text}</div>

      {cur.choices.length > 0 ? (
        <div className="mt-3 space-y-2">
          {cur.choices.map((c) => (
            <button
              key={c.label}
              onClick={() => pick(c)}
              className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-left text-sm font-bold text-white transition active:scale-95"
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <div className="grid grid-cols-3 gap-1.5">
            {SUMMARY.map((s) => (
              <div key={s.name} className="rounded-xl bg-emerald-50 p-2 text-center ring-1 ring-emerald-200">
                <Icon name={s.icon} className="mx-auto h-5 w-5 text-brand-600" />
                <div className="mt-1 text-[10px] font-bold leading-tight text-emerald-800">{s.name}</div>
                <div className="mt-0.5 text-[9px] leading-tight text-gray-500">{s.desc}</div>
              </div>
            ))}
          </div>
          <button
            onClick={reset}
            className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-bold text-gray-600 ring-1 ring-gray-300 transition active:scale-95"
          >
            ↺ 別の選択も試してみる
          </button>
        </div>
      )}

      {/* これまでの対応ログ */}
      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
        <div className="text-[10px] font-bold text-gray-400">対応の記録</div>
        <ol className="mt-1 space-y-0.5">
          {log.map((l, i) => (
            <li key={i} className="text-xs font-medium text-gray-600">
              {i + 1}. {l}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        <InlineIcon name="alert" /><b>インシデント管理＝早く復旧</b>、<b>問題管理＝原因を断つ</b>。ここが混同されやすい！
      </div>
    </Panel>
  );
}

export default function ItilExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <b>ITIL</b>は、ITサービスマネジメントの<b>ベストプラクティス（成功事例）をまとめた知識体系</b>。
        障害対応・変更・利用者の窓口などの進め方が整理されています。
      </div>

      <WhatIs />
      <IncidentSim />
      <ServiceDesk step={3} />
      <DeskAutomation step={4} />
      <ReductionRate step={5} />
      <ItilProcesses step={6} />
      <ItilQuiz step={7} />
    </div>
  );
}
