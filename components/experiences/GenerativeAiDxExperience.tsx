"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";
import Icon from "@/components/ui/Icon";
import { InlineIcon } from "@/components/ui/Pictogram";

// ============================================================================
// 「生成AIとDX」専用の体験。
//   ① AIに聞いてみたラボ … 頼み方を変える→回答の質が変わる＋ハルシネーションを暴く
//   ② DXとは … 定義を「使うもの/変えるもの/めざすこと」に分解＋パン屋の定期便の例
//   ③ DXと似ている2つの違い … 用語を行に並べた比較。売り物・稼ぎ方が変わるのはDXだけ
//   ④ 生成AIの使い方 適切/不適切クイズ
// ============================================================================

type Prompt = {
  id: string;
  label: string;
  q: string;
  a: string;
  tone: "amber" | "emerald" | "rose";
  verdict: string;
  note: string;
  factCheck?: string;
};

const PROMPTS: Prompt[] = [
  {
    id: "vague",
    label: "あいまいに頼む",
    q: "なんかいい感じの文章書いて",
    a: "「いつもお世話になっております。皆様のご健勝をお祈り申し上げます…」",
    tone: "amber",
    verdict: "△ 当たりさわりのない回答",
    note: "指示があいまいだと、AIも何を書けばいいか分からない。この指示文のことをプロンプトと呼びます。",
  },
  {
    id: "specific",
    label: "具体的に頼む",
    q: "中学生向けに、遠足の持ち物リストを5つ、理由つきで",
    a: "「①水筒（熱中症対策）②雨がっぱ（急な雨でも両手が空く）③タオル…」",
    tone: "emerald",
    verdict: "ねらいどおりの回答",
    note: "プロンプトが具体的なほど、ねらった答えが返りやすい。相手・目的・形式を伝えるのがコツ。",
  },
  {
    id: "fact",
    label: "事実をたずねる",
    q: "みどり市の花火大会は今年いつ開催？",
    a: "「みどり市花火大会は毎年8月15日、みどり川河川敷で開催されています！」（自信満々）",
    tone: "rose",
    verdict: "もっともらしいけど…？",
    note: "",
    factCheck:
      "実際に調べると…そんな花火大会は存在しませんでした。これがハルシネーション——AIが事実と違う内容を自信ありげに作ってしまう現象。学習データにない・古いことは特に危険。",
  },
];

const TONE = {
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  rose: "bg-rose-50 text-rose-900 ring-rose-200",
} as const;

function AiLab() {
  const [sel, setSel] = useState<string | null>(null);
  const [tried, setTried] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);
  const p = PROMPTS.find((x) => x.id === sel) ?? null;

  const pick = (id: string) => {
    setSel(id === sel ? null : id);
    setChecked(false);
    setTried((prev) => new Set(prev).add(id));
  };
  const done = tried.size === PROMPTS.length && checked;

  return (
    <Panel>
      <SectionTitle step={1}>AIに聞いてみたラボ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        生成AIは文章・画像などを<b className="text-gray-800">新しく作り出す</b>AI。
        頼み方を変えると答えがどう変わるか、3パターン試してみましょう。
      </p>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {PROMPTS.map((x) => (
          <button
            key={x.id}
            onClick={() => pick(x.id)}
            className={`rounded-lg px-1 py-2 text-[11px] font-bold leading-tight transition active:scale-95 ${
              sel === x.id ? "bg-brand-600 text-white" : "bg-gray-50 text-gray-600 ring-1 ring-gray-300"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {p ? (
        <div className="mt-3 space-y-2">
          {/* あなたの発言 */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-brand-600 px-3.5 py-2 text-[13px] leading-relaxed text-white">
              {p.q}
            </div>
          </div>
          {/* AIの回答 */}
          <div className="flex items-start gap-1.5">
            <Icon name="bot" className="mt-0.5 h-5 w-5 text-gray-600" />
            <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-gray-100 px-3.5 py-2 text-[13px] leading-relaxed text-gray-800">
              {p.a}
            </div>
          </div>

          {/* 判定 */}
          <div className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ring-1 ${TONE[p.tone]}`}>
            <b>{p.verdict}</b>
            {p.note && <span> ── {p.note}</span>}
          </div>

          {/* ハルシネーションの暴き */}
          {p.factCheck &&
            (checked ? (
              <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm leading-relaxed text-rose-900 ring-2 ring-rose-300">
                <InlineIcon name="alert" />{p.factCheck}
              </div>
            ) : (
              <button
                onClick={() => setChecked(true)}
                className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white transition active:scale-95"
              >
                本当か、事実を確認してみる
              </button>
            ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-400 ring-1 ring-gray-200">
          上の頼み方をタップすると、AIとのやり取りが表示されます。
        </div>
      )}

      {done && (
        <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-200">
          <InlineIcon name="lightbulb" />分かったこと：<b>①プロンプト次第で答えの質が変わる</b>／<b>②AIは平気で間違える（ハルシネーション）</b>。
          だから、そのまま使わず<b>人が事実を確認する</b>のが鉄則です。
        </div>
      )}
    </Panel>
  );
}

// ② DXとは ― 定義だけを分解して見せる（他との比較は ③ に分ける）
const DX_PARTS: { label: string; body: string }[] = [
  { label: "使うもの", body: "デジタル技術とデータ" },
  { label: "変えるもの", body: "製品・サービスや稼ぎ方（ビジネスモデル）。あわせて業務・組織・企業文化も" },
  { label: "めざすこと", body: "お客さんに新しい価値を届け、競争で優位に立つ" },
];

const DX_STORY: string[] = [
  "店頭でパンを売るだけのパン屋が",
  "購入データからお客さんの好みを分析し",
  "好みに合わせて毎月届く「パン定期便」を始めた",
  "店の稼ぎ方が「その日の来店」から「毎月の定額」に変わった",
];

function DxDefinition() {
  return (
    <Panel>
      <SectionTitle step={2}>DXとは</SectionTitle>
      <p className="mt-2 text-[15px] font-bold leading-relaxed text-gray-900">
        DX（デジタルトランスフォーメーション）＝デジタル技術とデータを使って、
        <span className="text-brand-700">ビジネスのあり方そのものを変える</span>こと。
      </p>

      <dl className="mt-3 space-y-1.5" data-testid="dx-definition">
        {DX_PARTS.map((x) => (
          <div key={x.label} className="flex gap-2 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-200">
            <dt className="w-[5.5em] shrink-0 text-xs font-bold leading-6 text-gray-500">{x.label}</dt>
            <dd className="text-sm leading-6 text-gray-900">{x.body}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 text-xs font-bold text-gray-500">パン屋でいうと</div>
      <ol className="mt-1.5 space-y-1">
        {DX_STORY.map((t, i) => (
          <li key={t} className="flex gap-2 text-sm leading-relaxed text-gray-800">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <span className={i === DX_STORY.length - 1 ? "font-bold text-gray-900" : ""}>{t}</span>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        ポイントは最後の一歩。データやアプリを使うだけでなく、
        <b className="text-gray-900">売り物や稼ぎ方まで変わっている</b>からDXと呼べます。
      </p>
    </Panel>
  );
}

// ③ DXと似ている2つの比較 ― 用語を行に並べ、右端「売り物・稼ぎ方」で DX だけが変わる
const COMPARE: { term: string; scope: string; ex: string; bakery: string; money: string }[] = [
  { term: "デジタイゼーション", scope: "情報", ex: "紙の書類→PDF", bakery: "売上ノートをExcelに", money: "変わらない" },
  {
    term: "デジタライゼーション",
    scope: "業務の流れ",
    ex: "紙の申請→Web申請",
    bakery: "注文〜支払いをアプリで完結",
    money: "変わらない",
  },
  { term: "DX", scope: "ビジネスのあり方", ex: "店頭販売→データを使った定期便", bakery: "パン定期便を始めた", money: "変わる" },
];

// 窮屈にならないよう列は3つに絞る：用語（＋範囲）｜例（一般の例＋パン屋）｜売り物・稼ぎ方
const COMPARE_GRID = "grid grid-cols-[minmax(7.5rem,10rem)_1fr_5rem] gap-x-2 sm:grid-cols-[11rem_1fr_7rem]";

function DxCompare() {
  return (
    <Panel>
      <SectionTitle step={3}>DXと、似ている2つの違い</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        デジタイゼーションとデジタライゼーションは、今の仕事をデジタルに置き換えるところまで。
        違いは表の<b className="text-gray-800">いちばん右の列</b>に出ます。
      </p>

      <div className="mt-3" data-testid="dx-compare">
        <div className={`${COMPARE_GRID} px-1 pb-1.5 text-xs font-bold text-gray-500`}>
          <span>用語・範囲</span>
          <span>例</span>
          <span className="text-center text-brand-700">売り物・稼ぎ方</span>
        </div>
        <ul className="space-y-2">
          {COMPARE.map((c) => {
            const dx = c.term === "DX";
            return (
              <li
                key={c.term}
                className={`${COMPARE_GRID} items-center rounded-xl p-2 ${
                  dx ? "bg-brand-50 ring-2 ring-brand-300" : "ring-1 ring-gray-200"
                }`}
              >
                <div className="px-1">
                  <div className={`text-sm font-bold leading-snug ${dx ? "text-brand-800" : "text-gray-900"}`}>{c.term}</div>
                  <div className="mt-0.5 text-xs text-gray-600">範囲：{c.scope}</div>
                </div>
                <div className="px-1">
                  <div className={`text-sm leading-snug ${dx ? "font-bold text-gray-900" : "text-gray-800"}`}>{c.ex}</div>
                  <div className="mt-0.5 text-xs leading-snug text-gray-600">パン屋：{c.bakery}</div>
                </div>
                <div
                  className={`flex h-full items-center justify-center rounded-lg px-1 text-center text-sm font-bold ${
                    dx ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {c.money}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-gray-700">
        PDF化やアプリ化はDXの<b className="text-gray-900">土台</b>にはなりますが、それだけではDXではありません。
        「紙をPDFにしただけ」「業務を効率化しただけ」をDXと呼ぶのは定番のひっかけです。
      </p>
    </Panel>
  );
}

const QUIZ: { t: string; ans: "適切" | "不適切"; why: string }[] = [
  {
    t: "生成AIが書いた説明文を、内容を確認せずそのまま公式資料として公開した。",
    ans: "不適切",
    why: "ハルシネーション（誤り）の可能性があるため、人の確認が必要。",
  },
  {
    t: "生成AIに下書きを作らせ、事実関係を自分で確かめてから仕上げた。",
    ans: "適切",
    why: "下書きに使い、人が確認するのは正しい使い方。",
  },
  {
    t: "会社の機密情報や顧客の個人情報を、外部の生成AIにそのまま入力した。",
    ans: "不適切",
    why: "機密・個人情報の入力は情報漏えいのリスクがあり避けるべき。",
  },
  {
    t: "「紙の申請書をPDFにしただけ」を、会社のDX達成と発表した。",
    ans: "不適切",
    why: "紙→PDFは情報をデータにしただけ（デジタイゼーション）。売り物や稼ぎ方は変わっていないのでDXではない。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={4}>その使い方、適切？　不適切？</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 flex gap-1.5">
                {(["適切", "不適切"] as const).map((opt) => {
                  const picked = chosen === opt;
                  const tone = !chosen
                    ? "text-gray-600 ring-1 ring-gray-300"
                    : picked
                      ? opt === q.ans
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                      : opt === q.ans
                        ? "ring-2 ring-emerald-400 text-emerald-700"
                        : "text-gray-400 ring-1 ring-gray-200";
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((p) => ({ ...p, [i]: opt }))}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition active:scale-95 ${tone}`}
                    >
                      {opt === "適切" ? "適切" : "不適切"}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-2 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
                  {correct ? "正解！ " : `正解は「${q.ans}」。 `}
                  {q.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function GenerativeAiDxExperience() {
  return (
    <div className="space-y-5">
      <div className="border-l-[3px] border-gray-900 py-0.5 pl-4 text-[15px] leading-[1.8] text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        生成AIは<b>便利だが誤る（ハルシネーション）</b>ので人の確認が必須。
        DXは<b>デジタルで売り物や稼ぎ方そのものを変える</b>こと。
      </div>

      <AiLab />
      <DxDefinition />
      <DxCompare />
      <Quiz />
    </div>
  );
}
