"use client";

import { useState, type ReactNode } from "react";
import { Panel, SectionTitle } from "../ui";

// サイバー攻撃の解説で、過去問の出題に合わせて足したパネル群。
// 試験は「説明文 → 攻撃名」で十数語を問うので、狙われる所ごとにまとめて、問題文の言い回しで書く。

const Takeaway = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">{children}</p>
);

type Term = { name: string; d: string; fix?: string };
type Group = { target: string; terms: Term[] };

function GroupList({ groups, testId }: { groups: Group[]; testId: string }) {
  return (
    <div className="mt-3 space-y-3" data-testid={testId}>
      {groups.map((g) => (
        <section key={g.target} data-target={g.target}>
          <p className="text-[13px] font-bold text-brand-800">{g.target}</p>
          <dl className="mt-1 space-y-1">
            {g.terms.map((t) => (
              <div key={t.name} className="rounded-lg px-2.5 py-1.5 ring-1 ring-gray-200" data-term={t.name}>
                <dt className="text-[14px] font-bold text-gray-900">{t.name}</dt>
                <dd className="text-[12.5px] leading-snug text-gray-700">
                  {t.d}
                  {t.fix && <span className="mt-0.5 block text-[12px] text-emerald-800">対策：{t.fix}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

// ② パスワードとソフトの弱点を狙う ---------------------------------------------------------
const PASSWORD_AND_BUGS: Group[] = [
  {
    target: "パスワードを破る",
    terms: [
      { name: "ブルートフォース攻撃（総当たり攻撃）", d: "あり得るパスワードのパターンを、順番に全部試す" },
      { name: "パスワードリスト攻撃", d: "別のサイトから盗んだIDとパスワードの一覧を流用して、ログインを試す", fix: "サイトごとに別のパスワードにする" },
    ],
  },
  {
    target: "ソフトウェアの弱点（脆弱性）を突く",
    terms: [
      { name: "バッファオーバーフロー", d: "用意された記憶領域より長いデータを入力してあふれさせ、不正にプログラムを動かす", fix: "セキュリティパッチを当てる" },
      { name: "ゼロデイ攻撃", d: "脆弱性が見つかってから、修正プログラムが出るまでのすきを突く" },
    ],
  },
];

export function PasswordAndBugAttacks({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>パスワードとソフトの弱点を狙う攻撃</SectionTitle>
      <GroupList groups={PASSWORD_AND_BUGS} testId="cyber-terms-1" />
      <Takeaway>
        「全パターンを順に」→総当たり、「よそで盗んだ一覧を流用」→パスワードリスト。「修正プログラムの<b>前</b>」→ゼロデイです。
      </Takeaway>
    </Panel>
  );
}

// ③ Webの閲覧・DNS・侵入後・組織を狙う --------------------------------------------------------
const WEB_AND_AFTER: Group[] = [
  {
    target: "Webサイト・閲覧する人を狙う",
    terms: [
      { name: "ドライブバイダウンロード", d: "サイトを見ただけで、気づかないうちにブラウザの脆弱性を突いてマルウェアを送り込む" },
      { name: "SQLインジェクション", d: "入力欄からデータベースへの不正な命令を送り込む", fix: "サニタイジング（入力の有害な文字列を無害な文字列に置き換える）" },
    ],
  },
  {
    target: "名前とIPアドレスの対応を狙う",
    terms: [{ name: "DNSキャッシュポイズニング", d: "DNSサーバの対応情報を書き換え、正しいURLを入れた人を偽サイトへ連れて行く" }],
  },
  {
    target: "侵入したあと・組織を狙う",
    terms: [
      { name: "バックドア", d: "侵入した攻撃者が、次にまた入りやすいように仕掛ける裏口" },
      { name: "APT攻撃", d: "特定の組織を、複数の手口を使って長期間にわたり攻撃し続ける" },
    ],
  },
];

export function WebAndAfterAttacks({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>Web・DNS・侵入後を狙う攻撃</SectionTitle>
      <GroupList groups={WEB_AND_AFTER} testId="cyber-terms-2" />
    </Panel>
  );
}

// ④ 人をだます手口と、攻撃の全体像 -----------------------------------------------------------
const SOCIAL = [
  "肩越しにパスワードを盗み見る（ショルダーハッキング）",
  "社員になりすまして電話でパスワードを聞き出す",
  "くずかごから機密書類を拾う（トラッシング）",
];

export function PeopleAndBigPicture({ step }: { step: number }) {
  return (
    <Panel>
      <SectionTitle step={step}>人をだます手口と、攻撃の全体像</SectionTitle>
      <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-950 ring-1 ring-amber-200" data-testid="cyber-social">
        <p className="font-bold">ソーシャルエンジニアリング＝技術を使わず、人のすきを突く</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {SOCIAL.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-1.5">
          対策の例：機器を捨てるときは記憶装置を<b>物理的に破壊</b>して、ごみから情報を拾われないようにする。
          暗号化やパッチは「技術」への対策なので、これには当たりません。
        </p>
      </div>
      <dl className="mt-3 space-y-1.5" data-testid="cyber-big-picture">
        <div className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200">
          <dt className="text-[14px] font-bold text-gray-900">サイバーキルチェーン</dt>
          <dd className="text-[12.5px] leading-snug text-gray-700">攻撃の段階を、偵察 → 攻撃 → 目的の実行 などのフェーズに分けて表したモデル</dd>
        </div>
        <div className="rounded-lg px-2.5 py-2 ring-1 ring-gray-200">
          <dt className="text-[14px] font-bold text-gray-900">ダークウェブ</dt>
          <dd className="text-[12.5px] leading-snug text-gray-700">ふつうの検索エンジンでは見つからず匿名性が高い、ネット上のコンテンツ。攻撃や違法な取引に使われることがある</dd>
        </div>
      </dl>
    </Panel>
  );
}

// ⑤ これはどの攻撃？（過去問の場面） -----------------------------------------------------------
const QUIZ: { t: string; ans: string; opts: string[]; why: string }[] = [
  {
    t: "別のサイトから盗まれたIDとパスワードの一覧を使って、自社サイトへのログインが大量に試された。",
    ans: "パスワードリスト攻撃",
    opts: ["パスワードリスト攻撃", "ブルートフォース攻撃", "DoS攻撃"],
    why: "よそで盗んだ認証情報の流用＝パスワードリスト攻撃。",
  },
  {
    t: "ソフトの脆弱性が公表されたが、修正プログラムが出る前にその脆弱性を突かれた。",
    ans: "ゼロデイ攻撃",
    opts: ["ゼロデイ攻撃", "バッファオーバーフロー", "APT攻撃"],
    why: "修正プログラムの提供前に突く＝ゼロデイ攻撃。",
  },
  {
    t: "正しいURLを入力したのに偽サイトにつながった。DNSサーバの対応情報が書き換えられていた。",
    ans: "DNSキャッシュポイズニング",
    opts: ["DNSキャッシュポイズニング", "ドライブバイダウンロード", "フィッシング"],
    why: "ドメイン名とIPアドレスの対応を書き換える＝DNSキャッシュポイズニング。",
  },
  {
    t: "Webサイトを見ただけで、気づかないうちにマルウェアが送り込まれた。",
    ans: "ドライブバイダウンロード",
    opts: ["ドライブバイダウンロード", "SQLインジェクション", "DDoS攻撃"],
    why: "閲覧しただけで感染＝ドライブバイダウンロード。",
  },
  {
    t: "侵入した攻撃者が、次にまた入れるように設定を書き換えていた。",
    ans: "バックドア",
    opts: ["バックドア", "ポートスキャン", "盗聴"],
    why: "再侵入のための裏口＝バックドア。",
  },
];

export function AttackQuiz({ step }: { step: number }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  return (
    <Panel>
      <SectionTitle step={step}>これはどの攻撃？</SectionTitle>
      <ul className="mt-3 space-y-2" data-testid="cyber-quiz">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const correct = chosen === q.ans;
          return (
            <li key={q.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
              <div className="text-sm font-bold text-gray-800">{q.t}</div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
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
                      className={`rounded-lg px-1 py-1.5 text-[11px] font-bold leading-tight transition active:scale-95 ${tone}`}
                    >
                      {opt}
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
