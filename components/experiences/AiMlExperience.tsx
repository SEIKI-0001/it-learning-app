"use client";

import type { ReactNode } from "react";
import { ReinforcementAnim } from "./aiml/ReinforcementAnim";
import { SupervisedAnim } from "./aiml/SupervisedAnim";
import { UnsupervisedAnim } from "./aiml/UnsupervisedAnim";
import { BigPicture, ExampleDivider } from "./aiml/BigPicture";
import { Takeaway, Term } from "./aiml/parts";
import { MlPractice, Phrases, TermMap } from "./aiml/TermSlides";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「AIと機械学習」専用の体験。全体 → 3分類 → 各分類の詳細 → 用語 の順に降りていく。
//   ① 用語の地図（AI ⊃ 機械学習 ⊃ ディープラーニング ⊃ 生成AI）
//   ② 機械学習の3分類を1ページで（何を渡すかで分かれる）
//   ③ 教師あり・④ 教師なし は同じ犬猫8枚で。違いは「正解が付いているか」だけ
//   ⑤ 強化学習（迷路のロボット） ⑥ 問題文の言い回し → 用語 ⑦ 確認6問
// ③〜⑤は見えたら動き出すアニメ（aiml/*Anim.tsx）。学び方の「手順」を動きで見せる。
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
      <SectionTitle step={3}>教師あり学習：正解付きのデータで学ぶ</SectionTitle>
      <BigPicture
        testId="ml-supervised-big"
        image={<>「<b>答え付きの問題集</b>」で練習するイメージ。問題と正解のセットをたくさん渡して、答え方を覚えさせます。</>}
        flow={[
          <>人が、データに<b>正解</b>を付けて用意する（この作業が <Term>アノテーション</Term>）</>,
          <>AIが答えを<b>予想</b>して、正解と<b>くらべる</b></>,
          <>まちがいが減るように、少しずつ<b>直す</b>（くり返す ＝ 学習）</>,
          <>学んだ答え方（<b>モデル</b>）で、<b>新しいデータ</b>に答える</>,
        ]}
        uses={<><b>分類</b>（犬か猫か・迷惑メールか）と<b>回帰</b>（売上や株価など、数を予測）</>}
      />
      <ExampleDivider>
        犬と猫の写真8枚で見てみます。AIが見るのは<b>鼻の長さ</b>と<b>耳のとがり</b>だけ。答え方は、犬と猫の<b>境目の線</b>のどちら側か、です。
      </ExampleDivider>
      <SupervisedAnim />
      <Takeaway>正解付きのデータで学び、新しいデータの正解を当てる ＝ 教師あり学習</Takeaway>
    </Panel>
  );
}

function Unsupervised() {
  return (
    <Panel>
      <SectionTitle step={4}>教師なし学習：正解なしで仲間分け</SectionTitle>
      <BigPicture
        testId="ml-unsupervised-big"
        image={<>「<b>答えのない仕分け</b>」のイメージ。正解は教えず、AIが自分でデータの<b>似ている・似ていない</b>を見つけます。</>}
        flow={[
          <><b>正解なし</b>のデータを渡す</>,
          <>AIが、<b>近いもの（似たもの）同士</b>をまとめる（<Term>クラスタリング</Term>）</>,
          <>それが何のグループかは、<b>人が見て</b>決める</>,
        ]}
        uses={<>買い方が似た顧客のグループ分け、似た商品のまとまりを見つける など</>}
      />
      <ExampleDivider>③と同じ8枚を、今度は<b>正解なし</b>で渡してみます。</ExampleDivider>
      <UnsupervisedAnim />
      <Takeaway>③との違いは「正解を付けたか」だけ。正解なしで、似たもの同士をまとめる ＝ 教師なし学習</Takeaway>
    </Panel>
  );
}

function Reinforcement() {
  return (
    <Panel>
      <SectionTitle step={5}>強化学習：やってみて、報酬で上達</SectionTitle>
      <BigPicture
        testId="ml-rl-big"
        image={<>「<b>できたらごほうび</b>」をくり返して覚えるイメージ。正解は教えず、行動の結果に点数（<b>報酬</b>）だけ返します。</>}
        flow={[
          <>AIが、とにかく<b>やってみる</b>（行動する）</>,
          <>結果に応じて<b>報酬</b>（プラス／マイナスの点数）をもらう</>,
          <>報酬が<b>多くなる</b>ように、次の行動を変える（くり返す）</>,
        ]}
        uses={<>ゲームAI、ロボットの制御、自動運転の判断 など</>}
      />
      <ExampleDivider>
        迷路のロボットで見てみます。道順（正解）は教えず、<b>1歩ごとに −1</b>、<b>ゴールで +20</b> の報酬だけ返します。
      </ExampleDivider>
      <ReinforcementAnim />
      <Takeaway>正解ではなく、報酬が増える行動を試行錯誤で覚える ＝ 強化学習</Takeaway>
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
