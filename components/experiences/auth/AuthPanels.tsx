"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// 認証の解説で、過去問の出題に合わせて足した4枚。
// 文言は公式過去問（令和4〜8年度）の問題文・正答の言い回しにそろえている。
//   ④ 認証の3要素で仕分ける（知識情報・所持情報・生体情報）と、二要素認証になる組合せ
//   ⑤ バイオメトリクス認証：照合の厳しさで、他人受入率と本人拒否率が逆に動く
//   ⑥ 認証のしくみの言葉：リスクベース認証・チャレンジレスポンス認証・CAPTCHA など
//   ⑦ どれ？ クイズ

function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-gray-600 [&_b]:font-bold [&_b]:text-gray-800">{children}</p>;
}

function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
  );
}

// ④ 3要素で仕分ける ---------------------------------------------------------------------
type Factor = "知識" | "所持" | "生体";
const FACTOR_TONE: Record<Factor, string> = {
  知識: "bg-amber-100 text-amber-900",
  所持: "bg-sky-100 text-sky-900",
  生体: "bg-emerald-100 text-emerald-900",
};
const EXAMPLES: { t: string; f: Factor }[] = [
  { t: "パスワード・PIN（暗証番号）", f: "知識" },
  { t: "本人しか知らない秘密の質問の答え", f: "知識" },
  { t: "決められた順に点をなぞるパターン", f: "知識" },
  { t: "社員証のICカード", f: "所持" },
  { t: "スマホに届くSMSのコード", f: "所持" },
  { t: "指紋・静脈・顔・虹彩", f: "生体" },
  { t: "筆跡・筆圧・キー入力のタイミング", f: "生体" },
];

export function FactorSortPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>認証の3要素で仕分ける</SectionTitle>
      <Lead>
        認証要素は<b>知識情報・所持情報・生体情報</b>の3種類（知識・所有物・バイオメトリクスとも呼ぶ）。
        「個人情報」は認証要素の分類に入りません。
      </Lead>
      <ul className="mt-3 space-y-1" data-testid="factor-examples">
        {EXAMPLES.map((e) => (
          <li key={e.t} className="flex items-center gap-2 text-[13px] text-gray-800" data-factor={e.f}>
            <span className={`w-10 flex-none rounded px-1 text-center text-[11px] font-bold ${FACTOR_TONE[e.f]}`}>{e.f}</span>
            {e.t}
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200" data-testid="two-factor">
        <p className="text-[13.5px] font-bold text-gray-900">ID＋パスワード（知識）に1つ足すと、二要素認証になる？</p>
        <ul className="mt-1.5 space-y-1 text-[12.5px] leading-snug">
          {[
            { add: "ICカードを読み取る", f: "所持" as Factor, ok: true },
            { add: "秘密の質問に答える", f: "知識" as Factor, ok: false },
            { add: "カメラで顔を照合する", f: "生体" as Factor, ok: true },
          ].map((r) => (
            <li key={r.add} className="flex items-center gap-2" data-ok={r.ok}>
              <span className={`w-10 flex-none rounded px-1 text-center text-[11px] font-bold ${FACTOR_TONE[r.f]}`}>{r.f}</span>
              <span className="flex-1 text-gray-800">{r.add}</span>
              <b className={r.ok ? "text-emerald-700" : "text-rose-600"}>{r.ok ? "なる" : "ならない"}</b>
            </li>
          ))}
        </ul>
      </div>
      <Takeaway>
        パスワードと秘密の質問は、どちらも<b>知識</b>。数を増やしても<b>同じ種類なら一要素のまま</b>です。
      </Takeaway>
    </Panel>
  );
}

// ⑤ 他人受入率と本人拒否率 ------------------------------------------------------------------
const LEVELS = [
  { id: "loose", label: "ゆるく照合", far: 80, frr: 15, focus: "利便性を重視", note: "本人はすぐ通れるが、似た他人も通りやすい" },
  { id: "mid", label: "ふつう", far: 45, frr: 45, focus: "バランス", note: "目的に合わせて、どこに合わせるかを決める" },
  { id: "strict", label: "厳しく照合", far: 15, frr: 80, focus: "安全性を重視", note: "他人はまず通れないが、本人も弾かれやすい" },
] as const;

export function BiometricRatePanel({ step }: { step: number }) {
  const [level, setLevel] = useState<(typeof LEVELS)[number]["id"]>("mid");
  const lv = LEVELS.find((l) => l.id === level)!;
  const bars = [
    { name: "他人受入率", sub: "他人を本人と誤って受け入れる割合", v: lv.far, tone: "bg-rose-500", testId: "far" },
    { name: "本人拒否率", sub: "本人なのに拒否してしまう割合", v: lv.frr, tone: "bg-amber-500", testId: "frr" },
  ];
  return (
    <Panel>
      <SectionTitle step={step}>バイオメトリクス認証：2つの誤りはシーソー</SectionTitle>
      <Lead>
        体の特徴は毎回少しずつ違うので、照合には<b>どこまで似ていれば本人とみなすか</b>の設定があります。厳しさを変えてみよう。
      </Lead>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={level === l.id}
            onClick={() => setLevel(l.id)}
            className={`rounded-lg py-1.5 text-[12px] font-bold transition active:scale-95 ${level === l.id ? "bg-gray-900 text-white" : "text-gray-700 ring-1 ring-gray-300"}`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2.5" data-testid="bio-rates" data-level={level}>
        {bars.map((b) => (
          <div key={b.name} data-testid={`bio-${b.testId}`} data-value={b.v}>
            <p className="flex items-baseline justify-between text-[13px] font-bold text-gray-900">
              {b.name}
              <span className="text-[11px] font-medium text-gray-500">{b.sub}</span>
            </p>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full transition-all duration-500 ${b.tone}`} style={{ width: `${b.v}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-center text-[13px] leading-snug text-brand-900 ring-1 ring-brand-200" data-testid="bio-focus">
        <b>{lv.focus}</b>：{lv.note}
      </p>
      <p className="mt-1 text-[11px] text-gray-500">※ 棒の長さは考え方を示すための例です</p>

      <table className="mt-3 w-full table-fixed border-collapse text-[12px] leading-snug" data-testid="bio-rule">
        <tbody className="text-gray-800">
          <tr className="border-t border-gray-100">
            <td className="px-1 py-1">他人受入率を<b>低く</b>抑える</td>
            <td className="px-1 py-1 font-bold">安全性を重視</td>
          </tr>
          <tr className="border-t border-gray-100">
            <td className="px-1 py-1">本人拒否率を<b>低く</b>抑える</td>
            <td className="px-1 py-1 font-bold">利便性を重視</td>
          </tr>
        </tbody>
      </table>
      <Takeaway>
        バイオメトリクス認証でも<b>他人を誤って認証するリスクはゼロではない</b>。スマホにも載っていて、のぞき見で盗まれることもありません。
      </Takeaway>
    </Panel>
  );
}

// ⑥ 認証のしくみの言葉 -------------------------------------------------------------------
const TERMS: { t: string; d: ReactNode }[] = [
  { t: "リスクベース認証", d: <>いつもと違うPCや場所からのログインなど、<b>危険が高いときだけ</b>秘密の質問などで追加の認証をする</> },
  { t: "チャレンジ​レスポンス認証", d: <>サーバが毎回違う値（チャレンジ）を送り、利用者はパスワードと組み合わせて計算した値を返す。<b>パスワードそのものは流さない</b></> },
  { t: "シングルサインオン", d: "1回の認証で、複数のサーバやアプリケーションにログインできる" },
  { t: "CAPTCHA", d: <>ゆがんだ文字の画像などを読ませ、<b>人間かプログラムか</b>を見分ける。バイオメトリクス認証ではない</> },
  { t: "マトリクス認証", d: "表の中の位置を覚えておき、その位置に並ぶ数字や文字を入力する" },
  { t: "PIN", d: "本人確認に使う、数字だけの暗証番号" },
];

export function AuthTermsPanel({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>認証のしくみの言葉</SectionTitle>
      <dl className="mt-3 space-y-1.5" data-testid="auth-terms">
        {TERMS.map((x) => (
          <div key={x.t} className="grid grid-cols-[8.25rem_1fr] items-baseline gap-2 text-[12.5px] leading-snug" data-term={x.t}>
            <dt className="font-bold text-gray-900">{x.t}</dt>
            <dd className="text-gray-700">{x.d}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200" data-testid="riskbased-not">
        <p className="text-[13px] font-bold text-gray-900">リスクベース認証と取り違えやすい対策</p>
        <ul className="mt-1 space-y-0.5 text-[12px] leading-snug text-gray-700">
          <li>・操作がないので自動でログアウト → <b className="text-gray-900">セッションの時間切れ</b></li>
          <li>・パスワードを何回も間違えたのでロック → <b className="text-gray-900">アカウントロック</b></li>
          <li>・長く変えていないパスワードの変更を促す → <b className="text-gray-900">パスワードの管理</b></li>
        </ul>
      </div>
      <Takeaway>
        IoT機器も同じ。ネットワークカメラへの<b>不正侵入</b>を防ぐには、<b>初期パスワードのまま使わない</b>ことが基本です。
      </Takeaway>
    </Panel>
  );
}

// ⑦ どれ？ ------------------------------------------------------------------------------
const QUIZ = [
  {
    t: "SMSで届いたコードを入力する認証は、どの要素？",
    ans: "所持",
    opts: ["知識", "所持", "生体"],
    why: "SMSを受け取れるスマホを持っている＝所持（所有物）。",
  },
  {
    t: "キーボードを打つ速度やタイミングで本人を確かめる。これは？",
    ans: "バイオメトリクス",
    opts: ["CAPTCHA", "バイオメトリクス", "マトリクス認証"],
    why: "打鍵のくせは行動的特徴＝バイオメトリクス認証。",
  },
  {
    t: "本人拒否率を低く抑える設定にすると、何を重視した認証になる？",
    ans: "利便性",
    opts: ["安全性", "利便性", "機密性"],
    why: "本人が弾かれにくい＝利便性重視。その代わり他人受入率は上がりやすい。",
  },
  {
    t: "いつもと違う国からのログインだったので、追加で秘密の質問を出した。",
    ans: "リスクベース認証",
    opts: ["リスクベース認証", "シングルサインオン", "アカウントロック"],
    why: "危険が高いときだけ追加の認証＝リスクベース認証。",
  },
];

export function AuthQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>どれ？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="auth-quiz">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={q.t} className="rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200">
              <div className="text-[13px] font-bold leading-snug text-gray-800">{q.t}</div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {q.opts.map((opt) => {
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
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition [word-break:auto-phrase] active:scale-95 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {chosen && (
                <p className={`mt-1.5 text-xs font-medium ${correct ? "text-emerald-700" : "text-rose-600"}`}>
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
