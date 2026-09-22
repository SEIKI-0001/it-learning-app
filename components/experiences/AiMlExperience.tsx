"use client";

import { useState, type ReactNode } from "react";
import {
  BOUNDARY_FINAL,
  BOUNDARY_ROUGH,
  LearningScene,
  UNKNOWNS,
  type LearningSceneProps,
} from "./aiml/LearningScene";
import { SceneTimeline } from "./scene/SceneTimeline";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useStepPlayer } from "./scene/useStepPlayer";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「AIと機械学習」専用の体験。
//   ① 包含図：AI ⊃ 機械学習 ⊃ 深層学習・生成AI
//   ② 機械学習の流れ（例を集める→学ぶ→モデル→予測）を1つの 2.5D ステージで実演。
//      犬/猫の学習データがモデルへ入り、判断の境界が形になり、未知の写真を「犬 92%」と判定する
//   ③ 学習の3タイプ（教師あり／教師なし／強化）の早見
// ============================================================================

function Nested() {
  return (
    <Panel>
      <SectionTitle step={1}>言葉の大きさを整理</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        AI・機械学習・生成AIは<b className="text-gray-800">大きさの違う入れ子</b>の関係です。
      </p>
      <div className="mt-4 rounded-xl bg-brand-50 p-3 ring-2 ring-brand-300">
        <div className="text-xs font-bold text-brand-700">🤖 AI（人工知能）</div>
        <div className="mt-0.5 text-[11px] text-brand-600/80">人の知的な判断に近い処理ぜんぶ</div>
        <div className="mt-2.5 rounded-xl bg-brand-50 p-3 ring-2 ring-brand-300">
          <div className="text-xs font-bold text-brand-700">📊 機械学習</div>
          <div className="mt-0.5 text-[11px] text-brand-600/80">データからパターンを学ぶ代表的な方法</div>
          <div className="mt-2.5 rounded-lg bg-sky-100 p-3 ring-2 ring-sky-300">
            <div className="text-xs font-bold text-sky-700">🧠 深層学習・生成AI</div>
            <div className="mt-0.5 text-[11px] text-sky-600/80">機械学習をさらに発展させた方法</div>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 一番大きいのが <b>AI</b>。その中の代表が <b>機械学習</b>。さらにその中に <b>生成AI</b> がいます。
      </div>
    </Panel>
  );
}

const PHASES = ["📥 データ", "🔁 学習", "📦 モデル", "🎯 予測"];

type MlStep = {
  phase: number;
  title: string;
  detail: ReactNode;
  scene: Omit<LearningSceneProps, "unknown" | "reducedMotion">;
};

const STEPS: MlStep[] = [
  {
    phase: 0,
    title: "例を集める",
    detail: (
      <>
        犬と猫の写真を<b>たくさん</b>用意し、1枚ずつ「犬」「猫」と<b>正解ラベル</b>を付けます。
        このときモデルは<b>まだ空っぽ</b>。AIは最初から答えを知っているわけではありません。
      </>
    ),
    scene: { learned: 0, boundary: null, score: null, complete: false, unknownIn: false, showResult: false },
  },
  {
    phase: 1,
    title: "学習する（最初の数枚）",
    detail: (
      <>
        写真がモデルに入ると、<b>特徴（鼻の長さ・耳のとがり）</b>の平面に点として並びます。
        まだ3枚だけなので、犬と猫を分ける<b>境界線はでたらめ</b>。1枚まちがえています。
      </>
    ),
    scene: { learned: 3, boundary: BOUNDARY_ROUGH, score: { ok: 2, total: 3 }, complete: false, unknownIn: false, showResult: false },
  },
  {
    phase: 1,
    title: "学習する（くり返し）",
    detail: (
      <>
        残りの写真も入れて、まちがいが減るように<b>境界線を少しずつ動かします</b>。
        データが増えるほど、犬と猫をきれいに分ける向きに落ち着きます。
      </>
    ),
    scene: { learned: 8, boundary: BOUNDARY_FINAL, score: { ok: 8, total: 8 }, complete: false, unknownIn: false, showResult: false },
  },
  {
    phase: 2,
    title: "モデル完成",
    detail: (
      <>
        学習で決まった「<b>ここから上は猫、下は犬</b>」という判断の型が<b>モデル</b>です。
        学習データのカードはもう使いません。残るのはこの型だけ。
      </>
    ),
    scene: { learned: 8, boundary: BOUNDARY_FINAL, score: null, complete: true, unknownIn: false, showResult: false },
  },
  {
    phase: 3,
    title: "はじめて見る写真を入れる",
    detail: (
      <>
        学習に使っていない<b>ラベルなしの写真</b>をモデルに入れます。特徴を測ると、平面のどこかに落ちます。
      </>
    ),
    scene: { learned: 8, boundary: BOUNDARY_FINAL, score: null, complete: true, unknownIn: true, showResult: false },
  },
  {
    phase: 3,
    title: "予測する",
    detail: (
      <>
        落ちた場所が<b>境界線のどちら側か</b>で犬／猫を、<b>境界からどれだけ離れているか</b>で自信（％）を出します。
        下のボタンで写真を変えてみよう。
      </>
    ),
    scene: { learned: 8, boundary: BOUNDARY_FINAL, score: null, complete: true, unknownIn: true, showResult: true },
  },
];

function MlFlow() {
  const reducedMotion = useReducedMotion();
  const player = useStepPlayer(STEPS.length, reducedMotion);
  const step = STEPS[player.index];
  const [unknownId, setUnknownId] = useState(UNKNOWNS[0].id);
  const unknown = UNKNOWNS.find((u) => u.id === unknownId) ?? UNKNOWNS[0];
  const last = player.index === player.lastIndex;
  return (
    <Panel>
      <SectionTitle step={2}>機械学習の流れ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        「<b className="text-gray-800">犬と猫を見分けるAI</b>」を例に、データからモデルができて、そのモデルで新しい写真を判断するまでを追いかけよう。
      </p>

      <div className="mt-3 flex gap-1.5" data-testid="ml-phase" data-phase={step.phase}>
        {PHASES.map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-lg px-1 py-1.5 text-center text-[10px] font-bold transition ${
              i === step.phase ? "bg-brand-600 text-white" : i < step.phase ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-400"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm font-bold text-gray-900" data-testid="ml-step-title">
        STEP {player.index + 1}：{step.title}
      </p>

      <div className="-mx-2 mt-3 sm:mx-auto sm:max-w-xl">
        <LearningScene {...step.scene} unknown={unknown} reducedMotion={reducedMotion} />
      </div>

      {last && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs" data-testid="ml-unknown-picker">
          <span className="font-bold text-gray-500">入れる写真：</span>
          {UNKNOWNS.map((u) => (
            <button
              key={u.id}
              type="button"
              aria-pressed={unknownId === u.id}
              onClick={() => setUnknownId(u.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition active:scale-95 ${
                unknownId === u.id ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300"
              }`}
            >
              {u.emoji} {u.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 min-h-[3.5em] rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-sky-200 [&_b]:text-gray-900" aria-live="polite">
        {step.detail}
      </div>

      <div className="mt-3">
        <SceneTimeline
          index={player.index}
          steps={STEPS}
          playing={player.playing}
          reducedMotion={reducedMotion}
          onMove={player.move}
          onTogglePlay={player.togglePlay}
          playLabel="機械学習の流れを再生"
          timelineLabel="機械学習の流れのタイムライン"
          startCaption="データを集める"
          endCaption="新しい写真を判断"
        />
      </div>

      {last && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200" data-testid="ml-insight">
          💡 AIは答えを最初から知っているのではなく、<b>データからモデル（判断の型）を作り</b>、
          <b>そのモデルで新しいデータを判断</b>します。だから学習データが偏っていれば、判断も偏ります。
        </div>
      )}
    </Panel>
  );
}

// 教師あり／教師なしは「正解ラベルがあるか」で対比できる、いちばん大事なペア。
function DataLearning() {
  return (
    <Panel>
      <SectionTitle step={3}>データから学ぶ2タイプ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        いちばんよく出るのがこの2つ。ちがいは<b className="text-gray-800">「正解（ラベル）が付いているか」</b>だけです。
      </p>

      {/* 教師あり */}
      <div className="mt-4 rounded-xl bg-brand-50 p-3.5 ring-1 ring-brand-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏷️</span>
          <span className="text-sm font-bold text-brand-800">教師あり学習</span>
          <span className="rounded-full bg-brand-200 px-2 py-0.5 text-[10px] font-bold text-brand-800">正解あり</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
          <b>答え付きの問題集</b>で練習するイメージ。「この写真は猫」「このメールは迷惑」と
          <b>正解をセットで</b>大量に見せ、当てられるようにします。
        </p>
        <dl className="mt-2.5 space-y-1 text-xs leading-relaxed text-gray-600">
          <div><dt className="inline font-bold text-brand-700">学び方：</dt> 入力と正解のペアから、対応のルールを覚える</div>
          <div><dt className="inline font-bold text-brand-700">できること：</dt> 分類（迷惑メールか否か）・予測（来月の売上）</div>
          <div><dt className="inline font-bold text-brand-700">見分け方：</dt> 学習データに「正解ラベル」が付いている</div>
        </dl>
      </div>

      {/* 教師なし */}
      <div className="mt-3 rounded-xl bg-emerald-50 p-3.5 ring-1 ring-emerald-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧩</span>
          <span className="text-sm font-bold text-emerald-800">教師なし学習</span>
          <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">正解なし</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
          正解は教えず、<b>似たもの同士を自分でグループ分け</b>するイメージ。
          バラバラのお客さんを、買い物の傾向が近い人ごとにまとめます。
        </p>
        <dl className="mt-2.5 space-y-1 text-xs leading-relaxed text-gray-600">
          <div><dt className="inline font-bold text-emerald-700">学び方：</dt> 正解なしで、データの似ている／離れているを見る</div>
          <div><dt className="inline font-bold text-emerald-700">できること：</dt> グループ分け（顧客の分類）・傾向の発見</div>
          <div><dt className="inline font-bold text-emerald-700">見分け方：</dt> 学習データに「正解ラベル」がない</div>
        </dl>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        💡 ひとことで：<b>正解を教える＝教師あり</b>、<b>教えず仲間分け＝教師なし</b>。
      </div>
    </Panel>
  );
}

// 強化学習はデータを見るのではなく「やってみて学ぶ」別タイプなので項目を分ける。
function Reinforcement() {
  return (
    <Panel>
      <SectionTitle step={4}>やってみて学ぶタイプ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        上の2つは用意したデータから学びました。<b className="text-gray-800">強化学習</b>は、
        実際に<b className="text-gray-800">行動してみて、その結果から学ぶ</b>のがちがいです。
      </p>

      <div className="mt-4 rounded-xl bg-brand-50 p-3.5 ring-1 ring-brand-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎮</span>
          <span className="text-sm font-bold text-brand-800">強化学習</span>
          <span className="rounded-full bg-brand-200 px-2 py-0.5 text-[10px] font-bold text-brand-800">ごほうびで上達</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
          ゲームで<b>上手な手にはスコア（報酬）</b>、まずい手には減点。
          試行錯誤をくり返し、<b>報酬が増える行動</b>を自分で見つけて上達します。
        </p>
      </div>

      {/* 試行錯誤のループ */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-center">
        {[
          { e: "🤖", t: "行動する" },
          { e: "🌍", t: "結果が出る" },
          { e: "🍬", t: "報酬／減点" },
          { e: "📈", t: "次に活かす" },
        ].map((s, i, arr) => (
          <div key={i} className="flex items-center">
            <div className="w-[64px] rounded-lg bg-gray-50 px-1 py-2 ring-1 ring-gray-200">
              <div className="text-xl leading-none">{s.e}</div>
              <div className="mt-1 text-[10px] font-bold text-gray-600">{s.t}</div>
            </div>
            {i < arr.length - 1 && <span className="px-0.5 text-gray-300">→</span>}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-400">このループをくり返して、だんだん賢くなる</p>

      <dl className="mt-3 space-y-1 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600 ring-1 ring-gray-200">
        <div><dt className="inline font-bold text-brand-700">できること：</dt> ゲームAI・ロボットの制御・自動運転の判断</div>
        <div><dt className="inline font-bold text-brand-700">見分け方：</dt> 正解データではなく「報酬」で良し悪しを教える</div>
      </dl>

      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        ⚠️ AIは<b>魔法ではない</b>。どのタイプも、学ぶデータや報酬の決め方に偏り・誤りがあれば結果も間違えます。
      </div>
    </Panel>
  );
}

export default function AiMlExperience() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200">
        🤖 <b>AI</b> は知的な処理の総称。その代表が、データからパターンを学ぶ <b>機械学習</b>。
        問題集をたくさん解いて傾向をつかむ学習者のように、<b>データを見て判断のコツを覚えます</b>。
      </div>

      <Nested />
      <MlFlow />
      <DataLearning />
      <Reinforcement />
    </div>
  );
}
