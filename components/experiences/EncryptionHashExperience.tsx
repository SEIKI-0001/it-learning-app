"use client";

import { useState, type ReactNode } from "react";
import { TwoRouteScene, type TwoRouteSceneProps } from "./encryption/TwoRouteScene";
import { diffCount, hashHex, toyCipher } from "./encryption/toyCrypto";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「暗号化とハッシュ化」専用の体験。
//   ① 2つのルート … 同じ平文を暗号化ベルトとハッシュベルトへ流し、
//      「鍵の門を2回くぐると元に戻る／ハッシュ関数の門は逆向きに通れない」を現象として見る。
//      最後に入力を1文字変えて、ハッシュ値がまるごと変わることを確かめる
//   ② 暗号化 … 鍵で読めなくする → 鍵で元に戻せる（可逆）
//   ③ ハッシュ化 … データをミキサーにかけ固定長のスムージー(値)に → 元に戻せない（一方向）
//   ④ くらべて整理
// 学習用の簡易変換（本物の暗号ではない）で、可逆／不可逆の感覚をつかむ。
// ============================================================================

function encryptHex(text: string, key: number): string {
  return [...text]
    .map((c) => ((c.charCodeAt(0) + key) & 0xffff).toString(16).padStart(4, "0"))
    .join(" ");
}

const PLAIN = "HELLO";
const ROUTE_KEY = 3;
const VARIANTS = ["HELLo", "HeLLO", "HELLO"] as const;

type RouteStep = { title: string; detail: ReactNode; scene: Pick<TwoRouteSceneProps, "enc" | "hash" | "focus"> };

const ROUTE_STEPS: RouteStep[] = [
  {
    title: "同じ平文を2つのルートへ",
    detail: <>同じデータ「<b>HELLO</b>」を、上の<b>暗号化ルート</b>と下の<b>ハッシュルート</b>に1枚ずつ置きました。</>,
    scene: { enc: { pos: "start", state: "plain", gate: null }, hash: { pos: "start", state: "plain", gate: false }, focus: "both" },
  },
  {
    title: "鍵の門をくぐる → 暗号文",
    detail: <>🔑<b>鍵で暗号化</b>。門をくぐった瞬間、HELLO は読めない記号の列（暗号文）に変わります。</>,
    scene: { enc: { pos: "mid", state: "cipher", gate: "gate1" }, hash: { pos: "start", state: "plain", gate: false }, focus: "enc" },
  },
  {
    title: "同じ鍵でもう一度 → 元に戻る",
    detail: <>同じ🔑<b>鍵で復号</b>。暗号文が門をくぐると <b>HELLO がそのまま戻ってきました</b>。鍵があれば戻せる＝<b>可逆</b>。</>,
    scene: { enc: { pos: "end", state: "restored", gate: "gate2" }, hash: { pos: "start", state: "plain", gate: false }, focus: "enc" },
  },
  {
    title: "ハッシュ関数の門をくぐる → ハッシュ値",
    detail: <>今度は下のルート。<b>ハッシュ関数</b>に通すと、決まった長さ（ここでは16桁）の<b>ハッシュ値</b>になります。鍵は使いません。</>,
    scene: { enc: { pos: "end", state: "restored", gate: null }, hash: { pos: "digest", state: "digest", gate: true }, focus: "hash" },
  },
  {
    title: "逆向きに戻そうとすると…通れない",
    detail: (
      <>
        ハッシュ値を門へ押し戻しても<b>通れません</b>。ハッシュ関数は<b>一方向の門</b>で、ハッシュ値から HELLO を作り直す方法はない＝<b>不可逆</b>。
        上のルートは戻れたのに、下のルートは戻れない。これが決定的な違いです。
      </>
    ),
    scene: { enc: { pos: "end", state: "restored", gate: null }, hash: { pos: "back", state: "blocked", gate: false }, focus: "both" },
  },
  {
    title: "入力を1文字だけ変える",
    detail: <>入力を<b>1文字だけ</b>変えて、もう一度ハッシュ関数に流します。下のボタンで入力を切り替えて比べてみよう。</>,
    scene: { enc: { pos: "end", state: "restored", gate: null }, hash: { pos: "digest", state: "digest", gate: true, rerun: true }, focus: "hash" },
  },
];

function DiffDigest({ value, base }: { value: string; base: string }) {
  return (
    <span className="font-mono">
      {[...value].map((c, i) => (
        <span key={i} className={c !== base[i] ? "rounded-sm bg-rose-100 text-rose-700" : undefined}>
          {c}
        </span>
      ))}
    </span>
  );
}

function TwoRoutes() {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(ROUTE_STEPS.length, reducedMotion);
  const step = ROUTE_STEPS[player.index];
  const last = player.index === player.lastIndex;
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>(VARIANTS[0]);
  const hashInput = last ? variant : PLAIN;
  const baseDigest = hashHex(PLAIN);
  const digest = hashHex(hashInput);
  const changed = diffCount(digest, baseDigest);

  return (
    <Panel>
      <SectionTitle step={1}>同じデータを2つのルートに流す</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「戻せる／戻せない」を、言葉ではなく<b className="text-gray-800">データの動き</b>で確かめます。
      </p>

      <p className="mt-3 text-sm font-bold text-gray-900" data-testid="route-step-title">
        STEP {player.index + 1}：{step.title}
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <TwoRouteScene input={PLAIN} hashInput={hashInput} cipher={toyCipher(PLAIN, ROUTE_KEY)} digest={digest} {...step.scene} reducedMotion={reducedMotion} />
      </div>

      {last && (
        <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200" data-testid="hash-compare">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-gray-500">入力：</span>
            {VARIANTS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={variant === v}
                onClick={() => setVariant(v)}
                className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition active:scale-95 ${
                  variant === v ? "bg-teal-700 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <dl className="mt-2.5 space-y-1 text-[11px] leading-relaxed">
            <div className="flex gap-2">
              <dt className="w-16 flex-none font-mono font-bold text-gray-500">{PLAIN}</dt>
              <dd className="break-all font-mono text-gray-700">{baseDigest}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 flex-none font-mono font-bold text-teal-700">{variant}</dt>
              <dd className="break-all text-gray-900" data-testid="hash-compare-digest">
                <DiffDigest value={digest} base={baseDigest} />
              </dd>
            </div>
          </dl>
          <p
            className={`mt-2 rounded-lg px-3 py-2 text-center text-xs font-bold ${changed ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}
            data-testid="hash-compare-result"
          >
            {changed
              ? `入力は1文字の違いなのに、ハッシュ値は16桁中${changed}桁が変わった（似てさえいない）`
              : "同じ入力なら、何度流しても完全に同じハッシュ値"}
          </p>
        </div>
      )}

      <div className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900" aria-live="polite">
        {step.detail}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={ROUTE_STEPS}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="2つのルートを再生"
          timelineLabel="2つのルートのタイムライン"
          startCaption="同じ平文"
          endCaption="1文字変える"
          stepTone={(i) => (i >= 1 && i <= 2 ? "bg-indigo-600" : i >= 3 ? "bg-teal-700" : "bg-brand-600")}
        />
      </div>
    </Panel>
  );
}

function Encryption() {
  const [text, setText] = useState("ひみつのメモ");
  const [key, setKey] = useState(3);
  const [mode, setMode] = useState<"plain" | "cipher">("plain");
  const shown = mode === "cipher" ? encryptHex(text, key) : text;

  return (
    <Panel>
      <SectionTitle step={2}>暗号化（鍵で戻せる＝可逆）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        暗号化は<b className="text-gray-800">鍵</b>を使って読めなくする処理。
        <b className="text-gray-800">同じ鍵で元に戻せます（復号）</b>。鍵付きの箱のイメージ。
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-gray-500">文章：</span>
        <input
          value={text}
          maxLength={16}
          onChange={(e) => {
            setText(e.target.value);
            setMode("plain");
          }}
          className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-gray-500">🔑 鍵：</span>
        {[1, 3, 5].map((k) => (
          <button
            key={k}
            onClick={() => setKey(k)}
            className={`h-8 w-8 rounded-lg font-mono font-bold active:scale-95 ${
              key === k ? "bg-brand-600 text-white" : "text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("cipher")}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            mode === "cipher" ? "bg-brand-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          🔒 鍵で暗号化
        </button>
        <button
          onClick={() => setMode("plain")}
          className={`rounded-lg py-2 text-sm font-bold transition active:scale-95 ${
            mode === "plain" ? "bg-emerald-600 text-white" : "text-gray-500 ring-1 ring-gray-300"
          }`}
        >
          🔑 鍵で復号
        </button>
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 ring-1 ${
          mode === "cipher" ? "bg-brand-50 ring-brand-200" : "bg-emerald-50 ring-emerald-200"
        }`}
      >
        <div className="text-xs font-bold text-gray-500">{mode === "cipher" ? "暗号文（読めない）" : "平文（元に戻った）"}</div>
        <div className="mt-1 break-all font-mono text-sm text-gray-800">{shown || "（空）"}</div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        🔒↔🔑 を押すと行き来できます。<b>鍵があれば必ず元に戻せる</b>のが暗号化（＝可逆）。通信(HTTPS)やデータ保存の秘匿に使います。
      </p>
    </Panel>
  );
}

function Hashing() {
  const [a, setA] = useState("password");
  const [b, setB] = useState("password");
  const same = a === b;
  const fields = [
    { label: "入力①", value: a, set: setA },
    { label: "入力②", value: b, set: setB },
  ];

  return (
    <Panel>
      <SectionTitle step={3}>ハッシュ化（戻せない＝一方向）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ハッシュ化の大事な性質は、<b className="text-gray-800">同じ入力なら、いつ・何回やっても、必ず同じ値</b>になること。
        2つの欄に<b className="text-gray-800">同じ文章</b>を入れて、値がそろうか確かめよう。
      </p>

      <div className="mt-3 space-y-3">
        {fields.map((f) => {
          const h = hashHex(f.value);
          return (
            <div key={f.label}>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs font-bold text-gray-500">{f.label}</span>
                <input
                  value={f.value}
                  maxLength={20}
                  onChange={(e) => f.set(e.target.value)}
                  className="flex-1 rounded-lg border-2 border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div
                className={`mt-1 ml-12 rounded-lg px-3 py-2 ring-1 ${
                  same ? "bg-emerald-50 ring-emerald-300" : "bg-gray-900 ring-gray-700"
                }`}
              >
                <div className={`break-all font-mono text-xs ${same ? "text-emerald-700" : "text-emerald-300"}`}>
                  {h}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-center text-sm font-bold ring-1 ${
          same ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
        }`}
      >
        {same
          ? "✅ 入力が同じ → ハッシュ値も完全に一致！（同じ材料なら必ず同じ味）"
          : "❌ 入力が1文字でも違うと → まったく別の値（似てさえいない）"}
      </div>

      <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
        <li>・<b>同じ入力なら同じ値</b>：何回やっても結果は変わらない。だから<b>パスワード照合</b>に使える（保存したハッシュと、入力のハッシュが一致すれば本人）。</li>
        <li>・<b>1文字で激変</b>：少しの違いでまるで別の値に → <b>改ざん検知</b>に使える。</li>
        <li>・<b>戻せない・固定長</b>：値から元の文章は復元できず、長さはいつも同じ（コップ1杯ぶん）。</li>
      </ul>
    </Panel>
  );
}

export default function EncryptionHashExperience() {
  const rows = [
    { k: "元に戻せる？", e: "戻せる（鍵で復号）", h: "戻せない（一方向）" },
    { k: "鍵", e: "使う", h: "使わない" },
    { k: "出力の長さ", e: "元の長さしだい", h: "いつも固定長" },
    { k: "主な用途", e: "通信・保存の秘匿", h: "パスワード保存・改ざん検知" },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔐 ふたつは似て非なるもの。<b>暗号化＝鍵付きの箱</b>（鍵で開けて中身を読める＝戻せる）、
        <b>ハッシュ化＝ミキサー</b>（材料を入れて回すとスムージーに。スムージーから元の果物には戻せない＝戻せない）。
      </div>

      <TwoRoutes />
      <Encryption />
      <Hashing />

      <Panel>
        <SectionTitle step={4}>くらべて整理</SectionTitle>
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-gray-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-3 py-2 text-left font-bold"> </th>
                <th className="px-3 py-2 text-center font-bold text-brand-700">🔒 暗号化</th>
                <th className="px-3 py-2 text-center font-bold text-emerald-700">🥤 ハッシュ化</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.k} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-3 py-2 font-bold text-gray-700">{r.k}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.e}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          ※ よくある勘違い：「ハッシュ化も復号できる」は誤り。戻せないのがハッシュ化です。また暗号化と圧縮（容量を小さくする）も別物。
        </p>
      </Panel>
    </div>
  );
}
