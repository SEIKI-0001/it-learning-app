"use client";

import { Lead } from "./diagram/DiagramParts";
import { BsChart, CAFE, INDICATORS, PL, PlLadder, RatioLine, TOTAL_ASSETS, Takeaway } from "./finance/cafe";
import { FinancePractice } from "./finance/FinancePractice";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「財務諸表（貸借対照表BS・損益計算書PL）」専用の体験。1軒のカフェの同じ1年を通して読む。
//   ① 2つの表は答える問いが違う（BS＝ある1日の写真／PL＝1年間の成績表）
//   ② BS（左右のつり合い・1年ルール） ③ PL（5つの利益）
//   ④ PLの当期純利益がBSの純資産に積もる／借入れは資産を増やすが、もうけではない
//   ⑤ 同じ数字で指標（流動比率・自己資本比率・売上高営業利益率・ROE） ⑥ 確認5問
//   数字は最後まで変えない（節ごとに例が変わると、BS・PL・指標が1つの会社の話としてつながらない）。
// ============================================================================

function Timeline() {
  return (
    <div className="mt-4 px-1" data-testid="story-timeline" aria-hidden>
      <div className="relative h-[92px]">
        {/* 期間の線 */}
        <div className="absolute inset-x-6 top-[30px] h-[3px] rounded-full bg-gray-300" />
        {/* 両端の「写真」 */}
        {[
          { at: "left-0", date: "4/1" },
          { at: "right-0", date: "3/31" },
        ].map((pin) => (
          <div key={pin.date} className={`absolute top-0 ${pin.at} flex w-12 flex-col items-center`}>
            <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold text-white">BS</span>
            <span className="mt-1 h-3 w-3 rounded-full border-[3px] border-gray-900 bg-white" />
            <span className="mt-0.5 text-[11px] font-bold tabular-nums text-gray-700">{pin.date}</span>
          </div>
        ))}
        {/* PL＝あいだ全体 */}
        <div className="absolute inset-x-6 top-[58px]">
          <div className="h-2 rounded-b-md border-x-2 border-b-2 border-brand-600" />
          <div className="mt-1 text-center text-[12px] font-bold text-brand-700">PL ＝ 4/1〜3/31 の1年間ぜんぶ</div>
        </div>
      </div>
    </div>
  );
}

function QuestionsSlide() {
  return (
    <Panel>
      <SectionTitle step={1}>2つの表は、答える「問い」が違う</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {CAFE.name}の1年目が終わりました。オーナーが知りたいことは2つあります。
      </p>
      <Timeline />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-3 ring-1 ring-gray-300">
          <div className="text-[12px] font-bold text-gray-500">問い①</div>
          <p className="mt-0.5 text-[15px] font-bold leading-snug text-gray-900">「いま、何を持っていて、そのお金はどこから来た？」</p>
          <p className="mt-1.5 text-sm text-gray-700">
            → <b>貸借対照表（BS）</b>。ある<b>1日</b>を撮った写真
          </p>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-brand-300">
          <div className="text-[12px] font-bold text-brand-700">問い②</div>
          <p className="mt-0.5 text-[15px] font-bold leading-snug text-gray-900">「この1年で、いくら稼いで、いくら残った？」</p>
          <p className="mt-1.5 text-sm text-gray-700">
            → <b>損益計算書（PL）</b>。<b>1年間</b>の成績表
          </p>
        </div>
      </div>
      <Takeaway>問題文に「○月○日時点」→ BS、「○年間の」→ PL。</Takeaway>
    </Panel>
  );
}

function BsSlide() {
  return (
    <Panel>
      <SectionTitle step={2}>3/31の写真 ＝ 貸借対照表（BS）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        右は<b className="text-gray-800">お金をどこから集めたか</b>、左はそのお金が<b className="text-gray-800">いま何に姿を変えているか</b>。
        同じお金を2つの向きから見ているので、左右の合計は必ず同じです。
      </p>
      <div className="mt-3">
        <BsChart />
      </div>
      <ul className="mt-3 space-y-1 text-[13px] leading-relaxed text-gray-700">
        <li>
          ・上の段＝<b>流動</b>（1年以内にお金になる／払う）、下の段＝<b>固定</b>（1年より先）。これを<b>1年ルール</b>といいます
        </li>
        <li>
          ・<b>負債</b>はいつか返すお金、<b>純資産</b>は返さなくてよいお金
        </li>
      </ul>
      <Takeaway>
        資産 {TOTAL_ASSETS.toLocaleString()} ＝ 負債 {CAFE.bs.cl + CAFE.bs.fl} ＋ 純資産 {CAFE.bs.eq}
      </Takeaway>
    </Panel>
  );
}

function PlSlide() {
  return (
    <Panel>
      <SectionTitle step={3}>1年間の成績 ＝ 損益計算書（PL）</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        売上から、<b className="text-gray-800">上から順に</b>費用を引いていきます。途中で出てくる利益にはそれぞれ名前があります。
      </p>
      <div className="mt-3">
        <PlLadder />
      </div>
      <Takeaway>
        売上 {CAFE.pl.sales.toLocaleString()} のうち、最後に残ったのは {PL.net}。売上は利益ではない。
      </Takeaway>
    </Panel>
  );
}

function LinkSlide() {
  return (
    <Panel>
      <SectionTitle step={4}>PLのもうけは、BSの純資産に積もる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        4/1の純資産は開業資金の {CAFE.openingEquity}。1年で稼いだ当期純利益 {PL.net} がそこに加わり、3/31には {CAFE.bs.eq} になりました。
      </p>
      <div className="mt-3 flex items-center justify-center gap-2 text-center text-[13px] font-bold tabular-nums" data-testid="story-link">
        <div className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-gray-900">
          <div className="text-[11px] text-gray-500">4/1 の純資産</div>
          {CAFE.openingEquity}
        </div>
        <span className="text-gray-400">＋</span>
        <div className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-white">
          <div className="text-[11px] text-white/80">PLの当期純利益</div>
          {PL.net}
        </div>
        <span className="text-gray-400">＝</span>
        <div className="rounded-lg bg-gray-700 px-2.5 py-1.5 text-white">
          <div className="text-[11px] text-white/80">3/31 の純資産</div>
          {CAFE.bs.eq}
        </div>
      </div>
      <div className="mx-auto mt-3 max-w-sm">
        <BsChart height={180} detail={false} equitySplit highlight={["eq"]} testId="story-bs" />
      </div>

      <h4 className="mt-5 text-sm font-bold text-gray-900">では、銀行から100借りたら「もうかった」？</h4>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] leading-relaxed" data-testid="story-borrow">
        <div className="rounded-xl p-3 ring-1 ring-gray-300">
          <div className="font-bold text-gray-900">100借りる</div>
          <div className="mt-1 text-gray-700">
            資産 <b>+100</b>（現金）
            <br />
            負債 <b>+100</b>
            <br />
            純資産 <b>±0</b>
            <br />
            PL <b>変化なし</b>
          </div>
        </div>
        <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-300">
          <div className="font-bold text-brand-900">1年で70稼ぐ</div>
          <div className="mt-1 text-gray-700">
            資産 <b>+70</b>
            <br />
            負債 <b>±0</b>
            <br />
            純資産 <b>+70</b>
            <br />
            PL 当期純利益 <b>70</b>
          </div>
        </div>
      </div>
      <Takeaway>資産が増えても、もうかったとは限らない。もうけたときだけ純資産が増える。</Takeaway>
    </Panel>
  );
}

function CheckupSlide() {
  return (
    <Panel>
      <SectionTitle step={5}>同じカフェを「健康診断」する</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        指標は、ここまでの表から2つの数字を取り出して割るだけ。数字はすべて上のBS・PLと同じです。
      </p>
      <ul className="mt-3 space-y-2" data-testid="story-indicators">
        {INDICATORS.map((ind) => (
          <li key={ind.key} className="rounded-xl p-3 ring-1 ring-gray-200" data-testid={`story-ind-${ind.key}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-[15px] font-bold text-gray-900">{ind.name}</span>
              <span className="text-[12px] font-bold text-gray-500">{ind.ask}</span>
            </div>
            <div className="mt-1.5">
              <RatioLine ind={ind} />
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-600">→ {ind.read}</p>
          </li>
        ))}
      </ul>
      <Takeaway>「安全？」はBSどうし、「もうかる？」はPLが入る。</Takeaway>
    </Panel>
  );
}

export default function FinancialStatementsExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        1軒のカフェの<b>同じ1年</b>を、最後まで同じ数字で追いかけます。<b>BS＝ある1日の写真</b>、<b>PL＝1年間の成績表</b>。
        この2つがどうつながり、指標がどこから出てくるかを見ていきます。
      </Lead>
      <QuestionsSlide />
      <BsSlide />
      <PlSlide />
      <LinkSlide />
      <CheckupSlide />
      <FinancePractice step={6} />
    </div>
  );
}
