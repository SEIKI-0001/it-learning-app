"use client";

import type { ReactNode } from "react";
import { DogCatPlot, NEW_PET, predictPet } from "./aiml/DogCatPlot";
import { Takeaway, Term } from "./aiml/parts";
import { MlPractice, Phrases, TermMap } from "./aiml/TermSlides";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「AIと機械学習」専用の体験。全体 → 3分類 → 各分類の詳細 → 用語 の順に降りていく。
//   ① 用語の地図（AI ⊃ 機械学習 ⊃ ディープラーニング ⊃ 生成AI）
//   ② 機械学習の3分類を1ページで（何を渡すかで分かれる）
//   ③ 教師あり・④ 教師なし は同じ犬猫8枚で。違いは「正解が付いているか」だけ
//   ⑤ 強化学習（迷路のロボット） ⑥ 問題文の言い回し → 用語 ⑦ 確認6問
// ============================================================================

type TypeCard = {
  name: string;
  give: string;
  visual: ReactNode;
  can: string;
  ex: string;
};

const TYPES: TypeCard[] = [
  {
    name: "教師あり学習",
    give: "データ ＋ 正解",
    visual: (
      <>
        <span className="text-[10px] font-bold text-brand-700">● 犬</span> <span className="text-[10px] font-bold text-brand-700">▲ 猫</span>
      </>
    ),
    can: "分類・回帰（正解を当てる）",
    ex: "迷惑メールの判定、売上の予測",
  },
  {
    name: "教師なし学習",
    give: "データだけ",
    visual: (
      <>
        <span className="text-[12px]">● ●</span> <span className="text-gray-300">|</span> <span className="text-[12px]">▲ ▲</span>
      </>
    ),
    can: "クラスタリング（似たもの同士をまとめる）",
    ex: "買い方が似た顧客のグループ分け",
  },
  {
    name: "強化学習",
    give: "行動した結果の報酬",
    visual: (
      <>
        <span className="text-[11px] font-bold text-emerald-600">+10</span> <span className="text-[11px] font-bold text-rose-600">−1</span>
      </>
    ),
    can: "報酬が増える行動を覚える",
    ex: "ゲームAI、ロボットの制御",
  },
];

function ThreeTypes() {
  return (
    <Panel>
      <SectionTitle step={2}>機械学習の3分類を1ページで</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        3つの違いは、学ぶときに<b className="text-gray-800">何を渡すか</b>だけです。
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3" data-testid="ml-types">
        {TYPES.map((t) => (
          <div key={t.name} className="rounded-xl p-3 ring-1 ring-gray-200">
            <div className="text-[15px] font-bold text-gray-900">{t.name}</div>
            <div className="mt-1.5 rounded-lg bg-brand-50 px-2 py-1 text-[13px] font-bold text-brand-800 ring-1 ring-brand-200">渡す：{t.give}</div>
            <div className="mt-2 text-center text-xl leading-none" aria-hidden>
              {t.visual}
            </div>
            <dl className="mt-2 space-y-0.5 text-[12px] leading-relaxed text-gray-600">
              <div>
                <dt className="inline font-bold text-gray-700">できる：</dt>
                <dd className="inline">{t.can}</dd>
              </div>
              <div>
                <dt className="inline font-bold text-gray-700">例：</dt>
                <dd className="inline">{t.ex}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <h4 className="mt-4 text-sm font-bold text-gray-900">過去問の選択肢に当てはめると</h4>
      <ul className="mt-2 space-y-1.5 text-[12px] leading-snug" data-testid="ml-examples">
        {[
          { ex: "乳児の泣き声と「泣いている原因」の組を集めて、原因を推測する", ans: "正解付き → 教師あり" },
          { ex: "送られた服の画像の特徴から、利用者の好みの傾向をつかむ", ans: "正解なし → 教師なし" },
          { ex: "盛り付けの動作を何度も繰り返し、上手になるロボット", ans: "試行錯誤 → 強化学習" },
          { ex: "気温や積雪から、用意したルールでゲレンデの状態を判断する", ans: "学んでいない → ルールベース" },
        ].map((r) => (
          <li key={r.ex} className="rounded-lg px-2.5 py-1.5 ring-1 ring-gray-200">
            <span className="text-gray-700">{r.ex}</span>
            <span className="ml-1 font-bold text-brand-700">→ {r.ans}</span>
          </li>
        ))}
      </ul>
      <Takeaway>正解を渡す → 教師あり／データだけ → 教師なし／報酬を渡す → 強化学習</Takeaway>
    </Panel>
  );
}

function Supervised() {
  return (
    <Panel>
      <SectionTitle step={3}>教師あり学習：正解付きの写真で学ぶ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        犬と猫の写真8枚に、人が<b className="text-gray-800">「犬」「猫」の正解</b>を付けて渡します。
        写真を「鼻の長さ」と「耳のとがり」で並べると、こうなります。
      </p>
      <div className="mx-auto mt-3 max-w-sm rounded-xl p-2 ring-1 ring-gray-200">
        <DogCatPlot mode="labeled" boundary showNew testId="ml-supervised" />
        <p className="mt-1 text-center text-[12px] font-bold text-brand-700" data-testid="ml-supervised-result">
          <span className="mr-1 inline-grid h-4 w-4 place-items-center rounded-full ring-2 ring-brand-600">?</span>
          正解の付いていない新しい写真 → 犬の側 → 「犬」（{predictPet(NEW_PET).pct}%）
        </p>
      </div>
      <ol className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-gray-700">
        <li>
          <b className="text-gray-900">① 正解を付ける</b>：写真1枚ずつに「犬」「猫」の印。この作業が <Term>アノテーション</Term>
        </li>
        <li>
          <b className="text-gray-900">② 学ぶ</b>：犬と猫を分ける線（点線）を引く。この線が<b>モデル（判断の型）</b>
        </li>
        <li>
          <b className="text-gray-900">③ 予測する</b>：正解の付いていない新しい写真が、線の犬の側に落ちた → 「犬」
        </li>
      </ol>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] leading-relaxed">
        <div className="rounded-xl p-2.5 ring-1 ring-gray-200">
          <div className="font-bold text-gray-900">分類</div>
          <div className="text-gray-600">答えが<b>種類</b>。「この写真は犬？猫？」</div>
        </div>
        <div className="rounded-xl p-2.5 ring-1 ring-gray-200">
          <div className="font-bold text-gray-900">回帰</div>
          <div className="text-gray-600">答えが<b>数</b>。「この犬の体重は何kg？」</div>
        </div>
      </div>
      <Takeaway>正解付きのデータで学び、新しいデータの正解を当てる ＝ 教師あり学習</Takeaway>
    </Panel>
  );
}

function Unsupervised() {
  return (
    <Panel>
      <SectionTitle step={4}>教師なし学習：正解なしで仲間分け</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じ8枚を、今度は<b className="text-gray-800">正解を付けずに</b>渡します。AIに見えているのは、鼻の長さと耳のとがりだけです。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl p-1.5 ring-1 ring-gray-200">
          <div className="text-center text-[12px] font-bold text-gray-500">渡すデータ（正解なし）</div>
          <DogCatPlot mode="raw" testId="ml-unsupervised-raw" />
        </div>
        <div className="rounded-xl p-1.5 ring-1 ring-brand-200">
          <div className="text-center text-[12px] font-bold text-brand-700">AIが見つけたまとまり</div>
          <DogCatPlot mode="grouped" testId="ml-unsupervised-grouped" />
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-gray-700">
        近い点同士をまとめると、2つのグループに分かれました。でもAIは、それが<b>犬と猫だとは知りません</b>。
        「グループAは犬だね」と<b>名前を付けるのは人</b>です。この仲間分けを <Term>クラスタリング</Term> といいます。
      </p>
      <div className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-[12px] leading-relaxed text-gray-600 ring-1 ring-gray-200">
        ③と同じ写真なのに、最初から「犬」「猫」の名前（正解）が付いていたか（教師あり）、付いていないか（教師なし）だけが違います。
      </div>
      <Takeaway>正解なしで、似たもの同士をまとめる ＝ 教師なし学習</Takeaway>
    </Panel>
  );
}

function Reinforcement() {
  const tries = [
    { n: "1回目", act: "でたらめに進む", result: "20歩のうち壁に5回ぶつかり、ゴールできず", reward: "−7" },
    { n: "2回目", act: "壁は避けたが遠回り", result: "30歩でゴール", reward: "+7" },
    { n: "50回目", act: "報酬の多かった道を選ぶ", result: "8歩でゴール", reward: "+9.2" },
  ];
  return (
    <Panel>
      <SectionTitle step={5}>強化学習：やってみて、報酬で上達</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        迷路のゴールを目指すロボット。「正しい道順」という正解は渡しません。
        代わりに、<b className="text-gray-800">行動した結果に点数（報酬）</b>を返します。
      </p>
      <div className="mt-3 rounded-lg bg-gray-100 px-3 py-1.5 text-[12px] font-bold text-gray-700">
        報酬のルール：ゴール <span className="text-emerald-700">+10</span>／壁にぶつかる <span className="text-rose-600">−1</span>／1歩ごとに <span className="text-rose-600">−0.1</span>
      </div>
      <table className="mt-2 w-full border-collapse text-[12px]" data-testid="ml-rl">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-1.5 py-1 font-bold">回</th>
            <th className="px-1.5 py-1 font-bold">行動</th>
            <th className="px-1.5 py-1 font-bold">結果</th>
            <th className="px-1.5 py-1 text-right font-bold">報酬</th>
          </tr>
        </thead>
        <tbody>
          {tries.map((t) => (
            <tr key={t.n} className="border-b border-gray-100 align-top">
              <td className="whitespace-nowrap px-1.5 py-1 font-bold text-gray-700">{t.n}</td>
              <td className="px-1.5 py-1 text-gray-800">{t.act}</td>
              <td className="px-1.5 py-1 text-gray-600">{t.result}</td>
              <td className={`px-1.5 py-1 text-right font-bold tabular-nums ${t.reward.startsWith("+") ? "text-emerald-700" : "text-rose-600"}`}>{t.reward}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1 text-center text-[12px] font-bold text-gray-700" aria-hidden>
        {["行動する", "結果を見る", "報酬をもらう", "次の行動を変える"].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded-lg bg-gray-100 px-2 py-1">{s}</span>
            {i < arr.length - 1 && <span className="text-gray-400">→</span>}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-gray-600">使われる場面：ゲームAI、ロボットの制御、自動運転の判断など。</p>
      <Takeaway>正解ではなく、試した結果の「報酬」が増える行動を覚える ＝ 強化学習</Takeaway>
    </Panel>
  );
}

export default function AiMlExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        まず<b>AIの用語の全体地図</b>を見て、次に<b>機械学習の3つの学び方</b>を1つずつ見ていきます。
      </div>
      <TermMap step={1} />
      <ThreeTypes />
      <Supervised />
      <Unsupervised />
      <Reinforcement />
      <Phrases step={6} />
      <MlPractice step={7} />
    </div>
  );
}
