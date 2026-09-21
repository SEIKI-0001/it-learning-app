"use client";

import { useState, type ReactNode } from "react";
import { ApiScene, type ApiSceneProps } from "./api/ApiScene";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「API」専用の体験。
//   ① レストランのたとえ（客＝アプリ / 注文口＝API / 厨房＝サービス内部）
//   ② API連携の流れ（リクエスト→処理→レスポンス→表示）を 2.5D 模型で再生
//      App → API → サービス。直接アクセスを試すとガラスケースに阻まれる＝決められた入口
//   ③ これはAPI？ 仕分けクイズ
// ============================================================================

function Restaurant() {
  return (
    <Panel>
      <SectionTitle step={1}>レストランでたとえる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        APIは<b className="text-gray-800">レストランの注文口</b>のようなもの。客は厨房に入らず、決まった方法で頼みます。
      </p>

      <div className="mt-4 flex items-stretch justify-center gap-1.5">
        <div className="flex-1 rounded-xl border-2 border-brand-300 bg-brand-50 px-1 py-3 text-center">
          <div className="text-2xl">🙋</div>
          <div className="mt-1 text-xs font-bold text-brand-700">客</div>
          <div className="text-[10px] text-gray-500">あなたのアプリ</div>
        </div>
        <span className="self-center text-lg text-gray-300">→</span>
        <div className="flex-1 rounded-xl border-2 border-emerald-400 bg-emerald-50 px-1 py-3 text-center">
          <div className="text-2xl">🧑‍🍳</div>
          <div className="mt-1 text-xs font-bold text-emerald-700">注文口＝API</div>
          <div className="text-[10px] text-gray-500">決まった頼み方</div>
        </div>
        <span className="self-center text-lg text-gray-300">→</span>
        <div className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-100 px-1 py-3 text-center">
          <div className="text-2xl">🍳</div>
          <div className="mt-1 text-xs font-bold text-gray-700">厨房</div>
          <div className="text-[10px] text-gray-500">サービス内部</div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm leading-relaxed text-gray-600">
        <p>🙋 客（アプリ）は<b className="text-gray-800">厨房の中を知らなくてもいい</b>。注文口に頼むだけ。</p>
        <p>🧑‍🍳 注文口（API）が<b className="text-gray-800">決まった形式</b>で受け付け、厨房に伝える。</p>
        <p>🍳 厨房（サービス内部）は<b className="text-gray-800">外から見えない</b>。中身を変えても注文口が同じなら客は困らない。</p>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 だからAPIは「<b>機能を使うための決まった入口</b>」。内部を全部公開するわけではありません。
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        次の解説では、この3者を <b>App → API → サービス</b> の模型に置き換えて、実際の頼みごとの流れを追います。
      </p>
    </Panel>
  );
}

type FlowStep = {
  title: string;
  route: string;
  nodes: ApiSceneProps["nodes"];
  lanes: ApiSceneProps["lanes"];
  capsule: ApiSceneProps["capsule"];
  screen: string | null;
  detail: ReactNode;
};

const REQUEST = { kind: "request" as const, tag: "リクエスト", payload: "GET /weather" };
const RESPONSE = { kind: "response" as const, tag: "レスポンス", payload: "{ temperature: 25 }" };

const FLOW_STEPS: FlowStep[] = [
  {
    title: "アプリが天気を知りたい",
    route: "天気アプリの中",
    nodes: { app: "active", api: "idle", svc: "idle" },
    lanes: {},
    capsule: { stop: "app", ...REQUEST },
    screen: "東京 --℃",
    detail: <>天気アプリは気温を表示したい。でも天気データは<b>自分では持っていません</b>。決まった形式の頼みごと（リクエスト）を用意します。</>,
  },
  {
    title: "APIへリクエスト",
    route: "App → API：GET /weather",
    nodes: { app: "sending", api: "active", svc: "idle" },
    lanes: { req1: "active" },
    capsule: { stop: "apiIn", ...REQUEST },
    screen: null,
    detail: <>アプリは天気APIの窓口に<b>リクエスト</b>「GET /weather」を送る。サービスの中には入らず、<b>決められた入口</b>に頼むだけ。</>,
  },
  {
    title: "サービスが処理",
    route: "API → サービス内部",
    nodes: { app: "idle", api: "sending", svc: "active" },
    lanes: { req2: "active" },
    capsule: { stop: "svc", ...REQUEST },
    screen: null,
    detail: <>APIが中の天気サービスへ取り次ぎ、サーバとDBで処理。<b>内部のしくみはアプリから見えません</b>。</>,
  },
  {
    title: "レスポンスを返す",
    route: "サービス → API：結果",
    nodes: { app: "idle", api: "active", svc: "sending" },
    lanes: { res1: "active" },
    capsule: { stop: "apiOut", ...RESPONSE },
    screen: null,
    detail: <>結果を<b>レスポンス</b>「{"{ temperature: 25 }"}」として返す。形式（JSON）が決まっているので扱いやすい。</>,
  },
  {
    title: "アプリが表示",
    route: "API → App：表示",
    nodes: { app: "active", api: "idle", svc: "idle" },
    lanes: { res2: "active" },
    capsule: { stop: "appBack", ...RESPONSE },
    screen: "東京 ☀ 25℃",
    detail: <>アプリが受け取った気温を<b>画面に表示</b>。天気機能を自分で作らずに使えた！</>,
  },
];

function Flow() {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(FLOW_STEPS.length, reducedMotion);
  const [bypass, setBypass] = useState(false);
  const step = FLOW_STEPS[player.index];

  function move(next: number) {
    setBypass(false);
    player.move(next);
  }

  return (
    <Panel>
      <SectionTitle step={2}>API連携の流れ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        レストランの「客・注文口・厨房」を、システムに置き換えると <b className="text-gray-800">App → API → サービス</b>。
        天気アプリが<b className="text-gray-800">天気API</b>を使う様子を再生しよう。
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold" aria-label="たとえとの対応">
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700 ring-1 ring-brand-200">🙋 客 ＝ App</span>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">🧑‍🍳 注文口 ＝ API</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 ring-1 ring-gray-200">🍳 厨房 ＝ サービス内部</span>
      </div>

      <div className="mt-3 min-w-0">
        <p className={`text-[11px] font-bold ${bypass ? "text-rose-700" : "text-brand-700"}`}>
          {bypass ? "実験：APIを通さずに入ろうとすると？" : `STEP ${player.index + 1} / ${FLOW_STEPS.length}`}
        </p>
        <p className="mt-0.5 text-sm font-bold text-gray-900" data-testid="api-step-title">
          {bypass ? "内部へ直接アクセス → 入れない" : step.title}
        </p>
        <p className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700" data-testid="api-route">
          {bypass ? "App → サービス内部（APIを通さない）" : step.route}
        </p>
      </div>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <ApiScene
          nodes={bypass ? { app: "sending", api: "idle", svc: "error" } : step.nodes}
          lanes={bypass ? { direct: "blocked" } : step.lanes}
          capsule={bypass ? { stop: "wall", kind: "blocked", tag: "直接アクセス", payload: "SELECT * FROM 天気DB" } : step.capsule}
          screen={bypass ? null : step.screen}
          bypass={bypass}
          reducedMotion={reducedMotion}
        />
      </div>

      <div
        className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 [&_b]:text-gray-900 ${bypass ? "bg-rose-50 ring-rose-200" : "bg-emerald-50 ring-emerald-200"}`}
        aria-live="polite"
      >
        {bypass ? (
          <>
            アプリがサービスの<b>中（DB）に直接</b>入ろうとしても、外からは届きません。
            使えるのは<b>APIという決められた入口</b>だけ。だから内部の作りを変えても、入口が同じならアプリは困りません。
          </>
        ) : (
          step.detail
        )}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={FLOW_STEPS}
          playing={player.playing && !bypass}
          reducedMotion={reducedMotion}
          onMove={move}
          onTogglePlay={() => {
            setBypass(false);
            player.togglePlay();
          }}
          playLabel="API連携を再生"
          timelineLabel="API連携のタイムライン"
          startCaption="リクエスト"
          endCaption="表示"
        />
      </div>

      <button
        type="button"
        onClick={() => setBypass((v) => !v)}
        aria-pressed={bypass}
        className={`mt-3 w-full rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 ${
          bypass ? "bg-white text-gray-700 ring-1 ring-gray-300" : "bg-white text-rose-700 ring-1 ring-rose-300"
        }`}
      >
        {bypass ? "↩ 正しいルート（API経由）に戻す" : "🚫 APIを通さず、内部に直接アクセスしてみる"}
      </button>

      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-2.5 text-xs leading-relaxed text-gray-500 ring-1 ring-gray-200">
        頼む側＝<b>リクエスト</b>、返す側＝<b>レスポンス</b>。Webで使うAPIは <b>Web API</b> と呼ばれ、データは <b>JSON</b> などの形式でやり取りされます。
      </div>
    </Panel>
  );
}

const ITEMS: { t: string; ok: boolean; why: string }[] = [
  { t: "天気サービスの天気データを、自分のアプリから呼び出して表示する", ok: true, why: "外部サービスの機能を決まった入口で使う＝APIの典型。" },
  { t: "決済サービスと連携して、自分のサイトで支払いを処理する", ok: true, why: "サービス連携の代表例。決済APIを使う。" },
  { t: "アプリのボタンの色を変える", ok: false, why: "これは画面デザインの話。APIとは別物。" },
  { t: "サービスの内部処理をすべて外に公開すること", ok: false, why: "APIは決まった入口を出すだけ。内部を全公開はしない。" },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <Panel>
      <SectionTitle step={3}>これはAPIの考え方に合う？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((it, i) => {
          const chosen = answers[i];
          const has = chosen !== undefined;
          const correct = chosen === it.ok;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <p className="text-sm font-bold text-gray-800">{it.t}</p>
              <div className="mt-2 flex gap-1.5">
                {[
                  { v: true, label: "⭕ 合う" },
                  { v: false, label: "❌ ちがう" },
                ].map((o) => {
                  const picked = chosen === o.v;
                  const tone = !has
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? o.v === it.ok
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : o.v === it.ok
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
                  {correct ? "⭕ 正解！ " : "❌ 残念。 "}
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

export default function ApiExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🔌 <b>API</b> は、あるソフトの機能やデータを別のソフトから使うための<b>決まった入口</b>。
        レストランの注文口のように、客（アプリ）は厨房に入らず、決まった頼み方で料理（機能）を受け取ります。
      </div>

      <Restaurant />
      <Flow />
      <Quiz />
    </div>
  );
}
