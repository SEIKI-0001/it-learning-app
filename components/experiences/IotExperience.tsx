"use client";

import { useState } from "react";
import { IotDioramaScene, type IotPhase } from "./iot/IotDioramaScene";
import { useReducedMotion } from "./scene/useReducedMotion";
import { Panel, SectionTitle, StepNav } from "./ui";
import Icon, { type IconName } from "@/components/ui/Icon";

// ============================================================================
// 「IoT」専用の体験。
//   ① IoTの一周（センサーで測る→ネットで送る→クラウドで判断→機器を制御）を、家とクラウドの3D模型でStep実演
//   ② 活用例カード
//   ③ 便利さの裏のセキュリティ（安全／あやしい 仕分けクイズ）
// ============================================================================

const STEPS: { html: string }[] = [
  { html: "エアコンの<b>センサー</b>が室温を測る。「いま32℃」とデータを取得。" },
  { html: "測ったデータを<b>インターネット経由</b>でクラウドへ送る。" },
  { html: "<b>クラウド</b>が判断：「32℃は暑い → 28℃まで冷やそう」。" },
  { html: "指示が機器に戻り、エアコンが<b>自動で動く</b>。人が触らなくても完結！" },
];

function Loop() {
  const [idx, setIdx] = useState(0);
  const [forward, setForward] = useState(true);
  const reducedMotion = useReducedMotion();
  const step = STEPS[idx];
  const go = (next: number) => {
    setForward(next > idx);
    setIdx(next);
  };
  return (
    <Panel>
      <SectionTitle step={1}>IoTの一周を見る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        <b className="text-gray-800">モノがネットにつながる</b>と、測る→送る→判断→動く、が自動で回ります。
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <IotDioramaScene phase={idx as IotPhase} forward={forward} reducedMotion={reducedMotion} />
      </div>

      <p
        className="mt-4 min-h-[3.5em] rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-emerald-200 [&_b]:text-gray-900"
        dangerouslySetInnerHTML={{ __html: step.html }}
      />

      <StepNav
        index={idx}
        total={STEPS.length}
        onPrev={() => go(Math.max(0, idx - 1))}
        onNext={() => go(Math.min(STEPS.length - 1, idx + 1))}
        onReset={() => go(0)}
        doneLabel="自動で完結"
      />
    </Panel>
  );
}

const USES: { icon: IconName; t: string; d: string }[] = [
  { icon: "factory", t: "工場", d: "機械にセンサーを付け、稼働状況や故障の予兆を遠隔で把握。" },
  { icon: "home", t: "家", d: "スマート家電を外出先からスマホで操作・確認。" },
  { icon: "sprout", t: "農業", d: "畑の温度・湿度を測り、自動で水やり。" },
  { icon: "heart-pulse", t: "健康", d: "腕時計が心拍を測り、データを記録・通知。" },
];

function Uses() {
  return (
    <Panel>
      <SectionTitle step={2}>身近な活用例</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {USES.map((u) => (
          <div key={u.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <div className="flex items-center gap-1.5">
              <Icon name={u.icon} className="h-5 w-5 text-brand-600" />
              <span className="text-sm font-bold text-gray-800">{u.t}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">{u.d}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; safe: boolean; why: string }[] = [
  { t: "買ったIoTカメラの初期パスワードを変えずに使う", safe: false, why: "初期パスワードは狙われやすく、乗っ取りの原因に。必ず変更を。" },
  { t: "機器のソフトを最新に更新しておく", safe: true, why: "更新で弱点（脆弱性）がふさがれ、安全になる。" },
  { t: "使っていない通信機能や接続を切っておく", safe: true, why: "入口を減らすほど狙われにくい。" },
  { t: "ネットにつなげばセキュリティ対策は不要と考える", safe: false, why: "つながる機器ほど対策が必要。便利さと対策はセット。" },
];

function SecurityQuiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>便利さの裏のセキュリティ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        IoTは便利だけど、ネットにつながる＝<b className="text-gray-800">狙われる入口が増える</b>こと。安全な行動はどっち？
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const has = chosen !== undefined;
          const correct = chosen === it.safe;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {[
                  { v: true, label: "安全" },
                  { v: false, label: "あやしい" },
                ].map((o) => {
                  const picked = chosen === o.v;
                  const tone = !has
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? o.v === it.safe
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : o.v === it.safe
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={String(o.v)}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: o.v }))}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {has && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : "逆だよ。 "}
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

export default function IotExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <b>IoT</b>（Internet of Things）は、家電・車・工場の機械などの<b>モノがインターネットにつながる</b>仕組み。
        温度計が自分で室温を知らせ、必要ならエアコンを調整してもらう——そんなイメージです。
      </div>

      <Loop />
      <Uses />
      <SecurityQuiz />
    </div>
  );
}
