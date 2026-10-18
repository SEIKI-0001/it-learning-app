"use client";

import { useState } from "react";
import { Panel, SectionTitle } from "../ui";
import { Choices, placeAnswer, ThinkFirst, type Choice } from "../calc/CalcParts";
import { StoryDay, WeekStrip } from "./StoryDay";
import { Face } from "./Faces";
import { FRIDAY_KPI, FRIDAY_TOOLS, MONDAY, THURSDAY, TUESDAY, WEDNESDAY, WEEK } from "./week";

// 「ITIL」をストーリーで学ぶ体験。
//   ① 大枠：ITサービスマネジメントとITIL、1週間で出てくる管理の順番
//   ②〜⑦ 新人・森さんの月〜金。前の日の出来事が次の日の理由になる1本の話
//   ⑧ 削減率の計算（金曜の続き） ⑨ 1週間のふりかえりと仕分け
// 公式過去問16問（サービスデスク7問・各管理プロセス・SLAとの対応・削減率）で
// 問われた知識を、出来事の順に1つずつ出す。

function Intro() {
  return (
    <Panel>
      <SectionTitle step={1}>ITILは、ITサービスを守って良くし続ける「やり方集」</SectionTitle>
      <div className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
        <p className="text-sm">
          <span className="mr-1.5 rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold text-white">ひとことで</span>
          社員やお客さんが使うITサービスを、<b>止まらないように守り、良くし続ける活動</b>を
          <b>ITサービスマネジメント</b>といいます。人・手順・技術を組み合わせて、続けて改善します。
          そのうまいやり方（ベストプラクティス）をまとめたものが<b>ITIL</b>です。
        </p>
        <ol className="space-y-1 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200">
          {[
            <>窓口で受ける（<b>サービスデスク</b>）</>,
            <>止まったら、まず戻す（<b>インシデント管理</b>）</>,
            <>原因を断つ（<b>問題管理</b>）</>,
            <>安全に変えて記録する（<b>変更管理</b>・<b>リリース及び展開管理</b>・<b>構成管理</b>）</>,
            <>約束を守り、窓口を良くする（<b>SLA</b>・<b>KPI</b>）</>,
          ].map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-4 border-t border-dashed border-gray-300 pt-3 text-[13px] leading-relaxed text-gray-700">
        <span className="mr-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200">
          お話で見る
        </span>
        社内IT部のサービスデスクに配属された新人・<b className="text-gray-900">森さんの1週間</b>で、この順番を追いかけます。
        火曜に起きた1つの障害が、金曜まで続いていきます。
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="itil-cast">
        {[
          { who: "mori" as const, name: "森さん", role: "サービスデスクの新人" },
          { who: "takagi" as const, name: "高木さん", role: "運用10年目の先輩" },
        ].map((c) => (
          <div key={c.who} className="flex items-center gap-2 rounded-xl bg-gray-50 px-2.5 py-2 ring-1 ring-gray-200">
            <Face who={c.who} mood="smile" size={44} />
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-gray-900">{c.name}</div>
              <div className="text-[11px] text-gray-500">{c.role}</div>
            </div>
          </div>
        ))}
      </div>
      <WeekStrip day={-1} />
      <ul className="mt-2 space-y-1 text-[12px] text-gray-600">
        {WEEK.map((d) => (
          <li key={d.key}>
            <b className="text-gray-800">{d.label}曜</b>　{d.title}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function DayPanel({
  step,
  day,
  title,
  children,
}: {
  step: number;
  day: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <SectionTitle step={step}>{title}</SectionTitle>
      <WeekStrip day={day} />
      {children}
    </Panel>
  );
}

// 金曜夕方：自動割当てツールの効果を削減率で確かめる（令和8年度 問44 と同じ考え方・数字は別）
const BEFORE = { count: 500, min: 3 };
const AFTER = [
  { label: "自動で割当て（80%）", count: 400, min: 0, tone: "bg-emerald-500" },
  { label: "うち割当てミスの手直し（10%）", count: 40, min: 5, tone: "bg-amber-500" },
  { label: "自動でできず人が割当て（20%）", count: 100, min: 3, tone: "bg-rose-400" },
];
const BEFORE_TOTAL = BEFORE.count * BEFORE.min; // 1,500分
const AFTER_TOTAL = AFTER.reduce((s, r) => s + r.count * r.min, 0); // 500分
const RATE = Math.round(((BEFORE_TOTAL - AFTER_TOTAL) / BEFORE_TOTAL) * 100); // 67%

const RATE_CHOICES: Choice[] = [
  { label: `${RATE}%`, ok: true },
  { label: "80%", why: "ミスを直す時間（40件 × 5分）を足し忘れています。自動でできた分の中にも、手直しの時間が残ります。" },
  { label: "63%", why: "ミスは自動でできた400件の10%（40件）です。全体500件の10%ではありません。" },
  { label: "33%", why: "それは導入後の時間が、導入前の何%かです。削減率は「減った分 ÷ 導入前」。" },
];

const SHARE_CHOICES: Choice[] = [
  { label: "30%", ok: true },
  { label: "50%", why: "半分になったのは、全体の6割の部分だけです。0.6 × 0.5 ＝ 0.3 が減った分。" },
  { label: "60%", why: "その部分が全体に占める割合です。その部分が半分になったので、減ったのは0.3。" },
  { label: "20%", why: "変わらない4割の半分を計算しています。半分になったのは6割の部分です。" },
];

function n(v: number) {
  return v.toLocaleString("ja-JP");
}

function ReductionPanel() {
  const [ok, setOk] = useState(false);
  return (
    <DayPanel step={8} day={4} title="金曜の夕方：効果を数字で確かめる">
      <p className="mt-3 border-l-2 border-gray-300 pl-3 text-[14px] leading-relaxed text-gray-800">
        メールの問い合わせを担当者に割り当てる作業に、<b>自動割当てツール</b>を入れて半年。
        割当ての時間は、何%減ったでしょう？
      </p>
      <table className="mt-3 w-full text-left text-[12px] tabular-nums">
        <tbody className="divide-y divide-gray-100">
          <tr>
            <th className="py-1.5 pr-2 font-bold text-gray-500">導入前</th>
            <td className="py-1.5 text-gray-800">1日{n(BEFORE.count)}件 × 1件{BEFORE.min}分</td>
          </tr>
          {AFTER.map((r) => (
            <tr key={r.label}>
              <th className="py-1.5 pr-2 font-bold text-gray-500">導入後</th>
              <td className="py-1.5 text-gray-800">
                {r.label}：{n(r.count)}件 × {r.min}分
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3">
        <Choices choices={placeAnswer(RATE_CHOICES, 1)} cols={2} onAnswer={(v) => v && setOk(true)} testId="itil-rate" />
      </div>
      <ThinkFirst hint="選んでから、解き方を見てみよう。" testId="itil-rate-think">
        <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-gray-700 [&_b]:font-bold [&_b]:text-gray-900">
          <li>
            <b>① 導入前の時間</b>：{n(BEFORE.count)} × {BEFORE.min} ＝ <b>{n(BEFORE_TOTAL)}分</b>
          </li>
          <li>
            <b>② 導入後の時間</b>：自動でできた分は0分。<b>ミスを直す時間を足す</b>のが落とし穴。
            <br />
            {AFTER.filter((r) => r.min > 0)
              .map((r) => `${n(r.count)} × ${r.min} ＝ ${n(r.count * r.min)}`)
              .join("、")}
            → 合計 <b>{n(AFTER_TOTAL)}分</b>
          </li>
          <li>
            <b>③ 削減率</b>：（{n(BEFORE_TOTAL)} − {n(AFTER_TOTAL)}）÷ {n(BEFORE_TOTAL)} ≒ <b>{RATE}%</b>
          </li>
        </ol>
        <div className="mt-3 space-y-1" aria-hidden>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="w-10 flex-none">導入前</span>
            <div className="h-3 flex-1 rounded bg-gray-400" />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="w-10 flex-none">導入後</span>
            <div className="flex h-3 flex-1">
              {AFTER.filter((r) => r.min > 0).map((r) => (
                <div key={r.label} className={`h-full first:rounded-l last:rounded-r ${r.tone}`} style={{ width: `${((r.count * r.min) / BEFORE_TOTAL) * 100}%` }} />
              ))}
            </div>
          </div>
        </div>
      </ThinkFirst>
      {ok && (
        <div className="mt-4 rounded-xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200">
          <p className="text-[13px] font-bold leading-relaxed text-gray-900">
            もう1問：電話対応の時間のうち、6割を占める「操作の質問」が、AIの支援で半分の時間になった。残りの4割は変わらない。全体で何%短くなった？
          </p>
          <div className="mt-2">
            <Choices choices={placeAnswer(SHARE_CHOICES, 2)} cols={2} testId="itil-share" />
          </div>
          <p className="mt-2 text-[12px] text-gray-500">件数ではなく「時間の割合」で考えるのがコツ（全体を1とおく）。</p>
        </div>
      )}
    </DayPanel>
  );
}

// 1週間のふりかえり：出来事 → 管理の名前
const RECAP: { day: string; what: string; name: string }[] = [
  { day: "月", what: "稼働後の問い合わせを1つの窓口で受ける", name: "サービスデスク" },
  { day: "火", what: "使っていないファイルを移して、まず保存できるように戻す", name: "インシデント管理" },
  { day: "火", what: "なぜ満杯になったのか、根本原因を突き止める", name: "問題管理" },
  { day: "火", what: "使用量の兆しを早く知らせる仕組みにする", name: "サービスマネジメントシステムの改善" },
  { day: "水", what: "影響を確かめて、変更を承認する", name: "変更管理" },
  { day: "水", what: "承認された変更を本番に入れる", name: "リリース及び展開管理" },
  { day: "水", what: "台帳を直し、IT資産の情報を最新にする", name: "構成管理" },
  { day: "木", what: "動いている時間／容量／不正アクセスの約束", name: "可用性・容量・能力・情報セキュリティ管理" },
  { day: "金", what: "FAQ・チャットボット・待ち時間などのKPI", name: "サービスデスクの改善" },
];

const SORT: { t: string; choices: Choice[] }[] = [
  {
    t: "メールサーバが止まった。予備のサーバに切り替えて、急いで使えるようにする",
    choices: [
      { label: "インシデント管理", ok: true },
      { label: "問題管理", why: "原因を断つのではなく、まず戻す場面です（火曜の午前）。" },
      { label: "変更管理", why: "変更の審査ではなく、止まったサービスを戻す場面です。" },
      { label: "構成管理", why: "台帳の話ではありません。まず戻す場面です。" },
    ],
  },
  {
    t: "同じ障害がくり返さないよう、根本の原因を調べて解決策を出す",
    choices: [
      { label: "問題管理", ok: true },
      { label: "インシデント管理", why: "インシデント管理は「まず戻す」。根本原因を断つのは問題管理です（火曜の午後）。" },
      { label: "リリース及び展開管理", why: "本番に入れる前の、原因を調べる段階です。" },
      { label: "構成管理", why: "台帳の話ではなく、原因を調べる場面です。" },
    ],
  },
  {
    t: "サーバの設定を変える前に、影響とリスクを評価して承認する",
    choices: [
      { label: "変更管理", ok: true },
      { label: "リリース及び展開管理", why: "本番に入れるのは承認のあと。審査して承認するのは変更管理です（水曜の11時）。" },
      { label: "問題管理", why: "原因はもう分かっています。変えてよいかを審査する場面です。" },
      { label: "インシデント管理", why: "急いで戻す場面ではなく、計画的に変える場面です。" },
    ],
  },
  {
    t: "承認された修正プログラムを、本番の環境に入れる",
    choices: [
      { label: "リリース及び展開管理", ok: true },
      { label: "変更管理", why: "承認はもう済んでいます。実際に入れるのはリリース及び展開管理です（水曜の22時）。" },
      { label: "構成管理", why: "入れたあとに台帳を直すのが構成管理です。" },
      { label: "問題管理", why: "原因を調べる段階は終わっています。" },
    ],
  },
  {
    t: "会社が持つPCやソフトウェアの情報を、最新で正確な状態に保つ",
    choices: [
      { label: "構成管理", ok: true },
      { label: "変更管理", why: "変更の審査ではなく、IT資産の台帳の話です（水曜の22時半）。" },
      { label: "容量・能力管理", why: "容量が足りるかではなく、何を持っているかの記録です。" },
      { label: "問題管理", why: "原因調査ではなく、台帳の話です。" },
    ],
  },
  {
    t: "ディスクの使用量を見張り、足りなくなる前に増やす計画を立てる",
    choices: [
      { label: "容量・能力管理", ok: true },
      { label: "サービス可用性管理", why: "動いている時間ではなく、容量が足りるかの話です（木曜の会議）。" },
      { label: "構成管理", why: "持っている物の記録ではなく、足りるかどうかの話です。" },
      { label: "インシデント管理", why: "止まってから戻すのではなく、止まる前に備える話です。" },
    ],
  },
];

function RecapPanel() {
  return (
    <Panel>
      <SectionTitle step={9}>1週間のふりかえり：出来事と管理の名前</SectionTitle>
      <ul className="mt-3 divide-y divide-gray-100 text-[12px]" data-testid="itil-recap">
        {RECAP.map((r) => (
          <li key={r.what} className="flex items-start gap-2 py-1.5">
            <span className="grid h-5 w-5 flex-none place-items-center rounded bg-gray-100 text-[11px] font-bold text-gray-600">
              {r.day}
            </span>
            <span className="min-w-0 flex-1 text-gray-600">{r.what}</span>
            <b className="w-[42%] flex-none text-right text-gray-900">{r.name}</b>
          </li>
        ))}
      </ul>
      <h4 className="mt-5 text-sm font-bold text-gray-900">どの管理？（森さんの1週間を思い出して）</h4>
      <ul className="mt-2 space-y-3">
        {SORT.map((s, i) => (
          <li key={s.t} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200">
            <p className="text-[13px] font-bold leading-relaxed text-gray-800">{s.t}</p>
            <div className="mt-2">
              <Choices choices={placeAnswer(s.choices, i)} cols={2} testId={`itil-sort-${i}`} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function ItilStoryExperience() {
  return (
    <div className="space-y-5">
      <Intro />
      <DayPanel step={2} day={0} title={`月曜：${WEEK[0].title}`}>
        <StoryDay
          beats={MONDAY}
          summary={
            <>
              <b>サービスデスク＝システム稼働後の、問い合わせの窓口。</b>
              <br />
              試験で誤りになる言い方：受付順に答える／窓口を種類ごとに細かく分ける／回避策を出さず原因調査に専念する。
            </>
          }
        />
      </DayPanel>
      <DayPanel step={3} day={1} title={`火曜：${WEEK[1].title}`}>
        <StoryDay
          beats={TUESDAY}
          gaugeFrom={95}
          summary={
            <>
              同じ出来事でも、<b>何をするかで管理の名前が変わります。</b>
              <br />
              一時的にファイルを移す＝<b>インシデント管理</b>／原因を特定し再発を防ぐ＝<b>問題管理</b>／兆しを早く知る仕組み＝
              <b>サービスマネジメントシステムの改善</b>
            </>
          }
        />
      </DayPanel>
      <DayPanel step={4} day={2} title={`水曜：${WEEK[2].title}`}>
        <StoryDay
          beats={WEDNESDAY}
          gaugeFrom={88}
          summary={
            <>
              決める＝<b>変更管理</b> → 入れる＝<b>リリース及び展開管理</b> → 記録する＝<b>構成管理</b>
            </>
          }
        />
      </DayPanel>
      <DayPanel step={5} day={3} title={`木曜：${WEEK[3].title}`}>
        <StoryDay
          beats={THURSDAY}
          summary={
            <>
              動いている時間＝<b>サービス可用性管理</b>／容量のしきい値＝<b>容量・能力管理</b>／不正アクセス＝
              <b>情報セキュリティ管理</b>
            </>
          }
        />
      </DayPanel>
      <DayPanel step={6} day={4} title={`金曜：${WEEK[4].title}`}>
        <StoryDay
          beats={FRIDAY_TOOLS}
          summary={
            <>
              FAQ＝<b>一次回答率が上がる</b>／チャットボット＝<b>自動で答え、受付時間を広げる</b>／回答候補を出すAI＝
              <b>ばらつきと対応時間が減る</b>（24時間にはならない）
              <br />
              効果ではないもの：オペレーターのスキルが上がる／FAQの中身が増える
            </>
          }
        />
      </DayPanel>
      <DayPanel step={7} day={4} title="金曜の午後：窓口の成績表（KPI）">
        <StoryDay
          beats={FRIDAY_KPI}
          summary={
            <>
              <b>小さいほど良い</b>：つながるまでの待ち時間・二次担当に回した割合
              <br />
              <b>大きいほど良い</b>：1回で解決できた割合・SLAの目標時間内に終わった割合
            </>
          }
        />
      </DayPanel>
      <ReductionPanel />
      <RecapPanel />
    </div>
  );
}
