"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "./ui";
import Icon from "@/components/ui/Icon";
import { InlineIcon } from "@/components/ui/Pictogram";

// ============================================================================
// 「生成AIとDX」専用の体験。
//   ① AIに聞いてみたラボ … 頼み方を変える→回答の質が変わる＋ハルシネーションを暴く
//   ② DXの3段階 … 操作なしの比較図。変える対象が 情報→業務→ビジネスそのもの と広がる入れ子＋例
//   ③ 生成AIの使い方 適切/不適切クイズ
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

// ② DXの3段階 ― 操作なしで「変える対象が 情報 → 業務 → ビジネスそのもの と広がる」ことを見せる
const DX_LEVELS: { name: string; target: string; def: string; ex: [string, string]; bakery: string }[] = [
  {
    name: "デジタイゼーション",
    target: "情報",
    def: "アナログの情報をデジタルにする",
    ex: ["紙の書類", "PDF"],
    bakery: "紙の売上ノートを Excel に置き換えた",
  },
  {
    name: "デジタライゼーション",
    target: "業務",
    def: "業務プロセスをデジタル技術で改善する",
    ex: ["紙で回していた申請", "Web申請"],
    bakery: "注文〜支払いをアプリで完結できるようにした",
  },
  {
    name: "DX（デジタルトランスフォーメーション）",
    target: "ビジネスそのもの",
    def: "デジタル技術で、ビジネス・組織・顧客価値そのものを変革する",
    ex: ["業務の効率化", "新しいサービス・ビジネスモデル"],
    bakery: "購入データで好みを分析し、パン定期便という新事業を始めた",
  },
];

function DxLevels() {
  return (
    <Panel>
      <SectionTitle step={2}>デジタイゼーション・デジタライゼーション・DX</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        3つの違いは<b className="text-gray-800">「何を変えるか」</b>。変える対象が
        <b className="text-gray-800">情報 → 業務 → ビジネスそのもの</b>へと広がります。
      </p>

      {/* 入れ子の図：内側ほど狭い対象、外側ほど広い対象 */}
      <div className="mt-4 rounded-xl p-2.5 ring-2 ring-brand-600" data-testid="dx-scope">
        <div className="px-1 pb-2 text-sm font-bold text-brand-800">
          DX<span className="font-normal text-gray-600">｜変える対象＝</span>ビジネス・組織・顧客価値
        </div>
        <div className="rounded-lg bg-white p-2.5 ring-1 ring-gray-500">
          <div className="px-1 pb-2 text-sm font-bold text-gray-900">
            デジタライゼーション<span className="font-normal text-gray-600">｜変える対象＝</span>業務プロセス
          </div>
          <div className="rounded-md bg-gray-900 px-3 py-2.5 text-sm font-bold text-white">
            デジタイゼーション<span className="font-normal text-gray-300">｜変える対象＝</span>情報
          </div>
        </div>
      </div>

      <ol className="mt-4 space-y-2.5" data-testid="dx-levels">
        {DX_LEVELS.map((l, i) => (
          <li key={l.name} className={`rounded-xl p-3 ring-1 ${i === 2 ? "ring-brand-300" : "ring-gray-200"}`}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-base font-bold text-gray-900">{l.name}</span>
              <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${i === 2 ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                対象：{l.target}
              </span>
            </div>
            <p className="mt-1 text-[15px] font-bold leading-snug text-gray-900">{l.def}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-gray-700">
              <span className="text-xs font-bold text-gray-500">例</span>
              <span className="rounded bg-gray-50 px-1.5 py-0.5 ring-1 ring-gray-200">{l.ex[0]}</span>
              <span aria-hidden className="font-bold text-gray-900">→</span>
              <span className="sr-only">から</span>
              <span className="rounded bg-gray-50 px-1.5 py-0.5 font-bold text-gray-900 ring-1 ring-gray-200">{l.ex[1]}</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">パン屋なら：{l.bakery}</p>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        DXは単なる効率化ではなく、<b className="text-gray-900">新しいサービスやビジネスモデルを生む</b>こと。
        「紙をPDFにしただけ」をDXと呼ぶのは定番のひっかけです。
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
    why: "電子化だけではDXとは言えない（しくみの変革が伴っていない）。",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={3}>その使い方、適切？　不適切？</SectionTitle>
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
        DXは<b>電子化だけでなく、しくみごと変えて新しい価値を生む</b>こと。
      </div>

      <AiLab />
      <DxLevels />
      <Quiz />
    </div>
  );
}
