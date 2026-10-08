"use client";

import type { ReactNode } from "react";
import { LeveledPractice, type LeveledQuestion } from "../calc/CalcParts";
import { Panel, SectionTitle } from "../ui";
import { NeuralNet } from "./NeuralNet";
import { NestBox, Takeaway } from "./parts";

// 最初の「用語の地図」、後半の「言い回し → 用語」、最後の確認問題。

function Def({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-white px-2 py-1.5 text-[12px] leading-snug ring-1 ring-gray-200">
      <b className="text-gray-900">{term}</b>
      <span className="text-gray-600"> … {children}</span>
    </div>
  );
}

export function TermMap({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>AIの用語は、この1枚に全部入る</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        外側ほど広い言葉、内側ほど新しく具体的な言葉です。まず<b className="text-gray-800">どの枠に入るか</b>を覚えます。
      </p>
      <div className="mt-3" data-testid="ml-map">
        <NestBox depth={0} label="AI（人工知能）" note="人の知的な判断をコンピュータで行う技術の総称">
          <Def term="ルールベース・エキスパートシステム">人が書いたルールや専門家の知識どおりに判断する。学習はしない</Def>
          <NestBox depth={1} label="機械学習" note="データからパターンを学ぶ">
            <div className="grid gap-1.5 sm:grid-cols-3">
              <Def term="教師あり学習">正解付きデータで学ぶ（分類・回帰）</Def>
              <Def term="教師なし学習">正解なしで仲間分け（クラスタリング）</Def>
              <Def term="強化学習">試行錯誤し、報酬が増える行動を学ぶ</Def>
            </div>
            <NestBox depth={2} label="ディープラーニング（深層学習）" note="多層のニューラルネットワーク。特徴も自分で見つける">
              <NestBox depth={3} label="生成AI" note="学んだモデルで文章・画像を新しく作る" />
            </NestBox>
          </NestBox>
        </NestBox>
      </div>
      <Takeaway>AI ⊃ 機械学習 ⊃ ディープラーニング ⊃ 生成AI。ルールどおりに動くだけのAIは機械学習の外</Takeaway>
    </Panel>
  );
}

const PHRASES: { phrase: string; term: string }[] = [
  { phrase: "脳の神経回路の仕組みをまねた計算モデル", term: "ニューラルネットワーク" },
  { phrase: "多層のニューラルネットワークで、特徴を自動的に抽出して学ぶ", term: "ディープラーニング" },
  { phrase: "1つのニューロンで、入力から次へ渡す値を計算する", term: "活性化関数" },
  { phrase: "出力と正解の誤差を小さくするよう、重みを調整する", term: "バックプロパゲーション" },
  { phrase: "学習データに、正解の情報を付ける作業", term: "アノテーション" },
  { phrase: "大量のデータで訓練され、追加学習で様々な用途に使える", term: "基盤モデル" },
  { phrase: "事前に学習したデータを基に、新しいコンテンツを作る", term: "生成AI" },
  { phrase: "もっともらしいが、事実と異なる内容を出力する", term: "ハルシネーション" },
  { phrase: "意図した回答が出るよう、指示や出力形式を工夫する", term: "プロンプトエンジニアリング" },
  { phrase: "学習データの偏りで、結果が偏る", term: "バイアス" },
];

export function Phrases({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>問題文の「言い回し → 用語」</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ディープラーニングや生成AIの問題は、説明文から用語を選ぶ形がほとんどです。問題文に出る言い回しで覚えます。
      </p>
      <div className="mt-3">
        <NeuralNet />
      </div>
      <table className="mt-3 w-full border-collapse text-[12px]" data-testid="ml-phrases">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-1.5 py-1 font-bold">問題文にこう書いてあれば</th>
            <th className="px-1.5 py-1 font-bold">答え</th>
          </tr>
        </thead>
        <tbody>
          {PHRASES.map((p) => (
            <tr key={p.term} className="border-b border-gray-100 align-top">
              <td className="px-1.5 py-1.5 text-gray-700">{p.phrase}</td>
              <td className="whitespace-nowrap px-1.5 py-1.5 font-bold text-brand-800">{p.term}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Takeaway>「特徴を自動で抽出」→ ディープラーニング。「もっともらしいが事実と違う」→ ハルシネーション</Takeaway>
    </Panel>
  );
}

export const ML_QUESTIONS: LeveledQuestion[] = [
  {
    level: "Lv.1 教師あり",
    prompt: "過去の住宅の「広さ・駅からの距離」と「実際に売れた価格」の組を学習し、別の住宅の価格を予測する。この学習方法はどれか。",
    choices: [
      { label: "教師あり学習", ok: true },
      { label: "教師なし学習", why: "「実際に売れた価格」という正解が付いています。" },
      { label: "強化学習", why: "試行錯誤や報酬は出てきません。" },
      { label: "ルールベース", why: "人がルールを書かず、データから学んでいます。" },
    ],
    solution: "正解（売れた価格）が付いている → 教師あり。答えが数なので「回帰」。",
  },
  {
    level: "Lv.2 教師なし",
    prompt: "購買履歴だけを与え、正解は与えずに、買い方の似た顧客同士をグループに分ける。この学習方法はどれか。",
    choices: [
      { label: "教師なし学習", ok: true },
      { label: "教師あり学習", why: "「正解は与えずに」とあります。正解が付いていれば教師あり。" },
      { label: "強化学習", why: "報酬は出てきません。" },
      { label: "エキスパートシステム", why: "専門家の知識をルールにする方法で、データから学びません。" },
    ],
    solution: "正解なし・報酬なしで仲間分け → 教師なし（クラスタリング）。",
  },
  {
    level: "Lv.3 強化学習",
    prompt: "ロボットが歩き方を何度も試し、転ばずに進めた距離に応じた点数が大きくなるように動きを覚える。この学習方法はどれか。",
    choices: [
      { label: "強化学習", ok: true },
      { label: "教師あり学習", why: "「正しい歩き方」の正解データは渡していません。" },
      { label: "教師なし学習", why: "点数（報酬）で良し悪しを教えているのが決め手です。" },
      { label: "ルールベース", why: "動きを人がルールで決めていません。" },
    ],
    solution: "行動の結果に点数（報酬）が返ってくる → 強化学習。",
  },
  {
    level: "Lv.4 用語",
    prompt: "教師あり学習の学習データに、「この画像は猫」のような正解の情報を付ける作業を何というか。",
    choices: [
      { label: "アノテーション", ok: true },
      { label: "データクレンジング", why: "誤りや表記ゆれを取り除いてデータを整える作業です。" },
      { label: "プロンプトエンジニアリング", why: "生成AIへの指示の書き方を工夫することです。" },
      { label: "ファインチューニング", why: "学習済みのモデルを追加のデータで調整することです。" },
    ],
    solution: "正解ラベルを付ける ＝ アノテーション。まちがった印は、そのままモデルの誤りになる。",
  },
  {
    level: "Lv.5 ディープラーニング",
    prompt: "大量の画像から、見分けるための特徴を人が指定しなくても自動的に抽出して学習する技術はどれか。",
    choices: [
      { label: "ディープラーニング", ok: true },
      { label: "エキスパートシステム", why: "専門家の知識をルールとして蓄えるしくみで、特徴を自動抽出しません。" },
      { label: "RPA", why: "定型的なPC操作を自動化するしくみです。" },
      { label: "アダプティブラーニング", why: "学習者に合わせて教材を変える、人の学習の仕組みです。" },
    ],
    solution: "「特徴を自動的に抽出」→ 多層のニューラルネットワークを使うディープラーニング。",
  },
  {
    level: "Lv.6 本試験レベル（生成AI）",
    prompt: "生成AIに調べものを頼んだところ、実在しない論文を、著者名や発行年まで付けてもっともらしく示した。この現象を表す用語はどれか。",
    choices: [
      { label: "ハルシネーション", ok: true },
      { label: "バイアス", why: "学習データの偏りで結果が偏ることです。実在しないものを作るのとは別。" },
      { label: "アノテーション", why: "学習データに正解を付ける作業です。" },
      { label: "ディープフェイク", why: "実在の人物の偽の映像・音声を作る技術や、その偽物のことです。" },
    ],
    solution: "もっともらしいが事実と異なる出力 ＝ ハルシネーション。生成AIの答えは人が確かめる。",
  },
];

export function MlPractice({ step }: { step: number }) {
  return (
    <LeveledPractice
      step={step}
      title="確認問題：6段階で本試験レベルへ"
      questions={ML_QUESTIONS}
      testId="ml-practice"
      done={
        <>
          ここまで解ければ、本試験のAIの問題に対応できます。<b>枠を決める → 何を渡すかで見分ける</b>。
        </>
      }
    />
  );
}
