"use client";

import { useState } from "react";
import { HttpsCafeScene } from "./https/HttpsCafeScene";
import type { HttpsMode } from "./https/HttpsScene";
import { FLOW_STEPS, scramble } from "./https/httpsFlow";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「HTTPとHTTPS」専用の体験。
//   ① 盗み見くらべ … 同じ送信内容を HTTP/HTTPS で切替、盗聴者に何が見えるか
//      フリーWi-Fi のカフェの 3D 模型（あなたの席 →（電波）→ フリーWi-Fi → インターネット → Webサーバ、
//      隣の席に盗聴者）でデータを送り、盗聴者に何が見えるかを比べる
//   ② 比較表
//   ③ おさらい（S=Secure / HTTPSでも詐欺はありうる）
// ============================================================================

function Eavesdrop() {
  const [text, setText] = useState("password: himitsu123");
  const [mode, setMode] = useState<HttpsMode>("http");
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(FLOW_STEPS.length, reducedMotion);
  const step = FLOW_STEPS[player.index];
  const https = mode === "https";
  const shown = text || "（空）";
  const cipher = scramble(text);
  const seen = https ? cipher : text;

  return (
    <Panel>
      <SectionTitle step={1}>盗み見くらべ：HTTP と HTTPS</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じ内容を送っても、<b className="text-gray-800">途中で盗み見する人に見える内容</b>がまるで違います。
        再生して送り、途中で方式を切り替えてみよう。
      </p>

      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="https-payload" className="flex-none text-sm text-gray-500">送る内容：</label>
        <input
          id="https-payload"
          value={text}
          maxLength={28}
          onChange={(e) => setText(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="通信方式">
        <button
          type="button"
          onClick={() => setMode("http")}
          aria-pressed={!https}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            !https ? "bg-rose-500 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          HTTP（暗号化なし）
        </button>
        <button
          type="button"
          onClick={() => setMode("https")}
          aria-pressed={https}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            https ? "bg-emerald-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          HTTPS 🔒（暗号化）
        </button>
      </div>

      <div className="mt-3 min-w-0">
        <p className="text-[11px] font-bold text-brand-700">
          STEP {player.index + 1} / {FLOW_STEPS.length}
        </p>
        <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="https-step-title">
          {step.title}
        </p>
      </div>

      <div className="-mx-2 mt-2 sm:mx-auto sm:max-w-xl">
        <HttpsCafeScene
          mode={mode}
          index={player.index}
          step={step}
          plain={shown}
          cipher={cipher}
          forward={player.forward}
          reducedMotion={reducedMotion}
        />
      </div>

      <div
        className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900"
        aria-live="polite"
      >
        {step.detail[mode]}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={FLOW_STEPS}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="通信を再生"
          timelineLabel="通信のタイムライン"
          startCaption="入力"
          endCaption="サーバに届く"
        />
      </div>

      {/* 同じデータが、立場によってどう見えるか */}
      <div
        className={`mt-4 rounded-xl px-4 py-3 ring-1 ${
          https ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"
        }`}
        data-testid="https-compare"
      >
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs font-bold text-gray-500">🧑 あなたが送った内容</dt>
            <dd className="mt-0.5 break-all font-mono text-gray-800">{shown}</dd>
          </div>
          <div>
            <dt className={`text-xs font-bold ${https ? "text-emerald-700" : "text-rose-700"}`}>😈 盗聴者に見える内容：</dt>
            <dd className="mt-0.5 break-all font-mono text-gray-800" data-testid="eve-sees">
              {seen || "（空）"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-gray-500">🗄️ 正規のWebサーバが受け取る内容</dt>
            <dd className="mt-0.5 break-all font-mono text-gray-800">{shown}</dd>
          </div>
        </dl>
        <div className={`mt-2 text-sm font-bold ${https ? "text-emerald-700" : "text-rose-700"}`}>
          {https
            ? "🔒 ぐちゃぐちゃで読めない！ → 盗まれても中身は分からない（安全）"
            : "⚠️ 丸見え！ → パスワードがそのまま盗まれる危険"}
        </div>
      </div>
    </Panel>
  );
}

function CompareTable() {
  const rows = [
    { k: "暗号化", http: "なし", https: "あり（SSL/TLS）" },
    { k: "盗み見", http: "中身が読める", https: "読めない" },
    { k: "URL", http: "http://", https: "https:// 🔒" },
    { k: "使う場面", http: "公開情報の閲覧など", https: "ログイン・買い物・個人情報" },
  ];
  return (
    <Panel>
      <SectionTitle step={2}>くらべて整理</SectionTitle>
      <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="px-3 py-2 text-left font-bold"> </th>
              <th className="px-3 py-2 text-center font-bold text-rose-700">HTTP</th>
              <th className="px-3 py-2 text-center font-bold text-emerald-700">HTTPS 🔒</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                <td className="px-3 py-2 text-center text-gray-700">{r.http}</td>
                <td className="px-3 py-2 text-center text-gray-700">{r.https}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function HttpsExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        たとえると——<b>HTTP＝ハガキ</b>（運ぶ人に中身が見える）、
        <b>HTTPS＝封筒に入れた手紙</b>（中身が見えない＝暗号化）。鍵マーク🔒が付いていれば HTTPS です。
      </div>

      <Eavesdrop />
      <CompareTable />

      <Panel>
        <SectionTitle step={3}>おさらい・注意</SectionTitle>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            <b>HTTPS ＝ HTTP ＋ 暗号化（SSL/TLS）</b>。S は <b>Secure（安全）</b> の S（速度のSではない）。
          </li>
          <li className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
            ログイン・買い物・個人情報の入力では、URLが <b className="text-emerald-700">https:// 🔒</b> かを確認。
          </li>
          <li className="rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200 text-amber-900">
            ⚠️ ただし「HTTPSだから絶対に安全なサイト」とは限りません。HTTPSが守るのは<b>通信の中身</b>で、
            <b>サイト自体が詐欺でない保証ではない</b>点に注意。
          </li>
        </ul>
      </Panel>
    </div>
  );
}
