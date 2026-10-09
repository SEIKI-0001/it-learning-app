"use client";

import { Lead } from "./diagram/DiagramParts";
import { BsChart, CAFE, INDICATORS, NET_TONE, PL, PlLadder, RatioLine, TOTAL_ASSETS, Takeaway } from "./finance/cafe";
import { FinancePractice } from "./finance/FinancePractice";
import { Panel, SectionTitle } from "./ui";

// ============================================================================
// 「財務諸表（貸借対照表BS・損益計算書PL）」専用の体験。1軒のカフェの同じ1年を通して読む。
//   ① PLもBSも決算書の1つ（BS＝決算日時点の集め方と使い道／PL＝1年間の成績）
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
      <SectionTitle step={1}>PLもBSも、決算書の中の1つ</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        会社は1年に1回、その年のお金の状況を<b className="text-gray-800">決算書</b>にまとめます。決算書にはいくつか種類がありますが、
        いちばん大事なのが<b className="text-gray-800">PL</b>と<b className="text-gray-800">BS</b>の2つです。名前は難しそうですが、知ってしまえば意外とシンプルです。
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        ここからは{CAFE.name}の1年目を例に、最後まで同じ数字で見ていきます。1年目を終えたオーナーが知りたいことは、次の2つです。
      </p>
      <Timeline />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-3 ring-1 ring-gray-300">
          <div className="text-[12px] font-bold text-gray-500">問い①</div>
          <p className="mt-0.5 text-[15px] font-bold leading-snug text-gray-900">「いま、何を持っていて、そのお金はどこから来た？」</p>
          <p className="mt-1.5 text-sm text-gray-700">
            → <b>BS（貸借対照表）</b>で分かります。決算日という<b>1日</b>の時点の状態
          </p>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-brand-300">
          <div className="text-[12px] font-bold text-brand-700">問い②</div>
          <p className="mt-0.5 text-[15px] font-bold leading-snug text-gray-900">「この1年で、いくら稼いで、いくら残った？」</p>
          <p className="mt-1.5 text-sm text-gray-700">
            → <b>PL（損益計算書）</b>で分かります。<b>1年間</b>の成績
          </p>
        </div>
      </div>
      <Takeaway>見分け方はかんたん。問題文に「○月○日時点」とあれば BS、「○年間の」とあれば PL です。</Takeaway>
    </Panel>
  );
}

function BsSlide() {
  return (
    <Panel>
      <SectionTitle step={2}>BS（貸借対照表）とは：お金の「集め方」と「使い道」の表</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        正直、BSは分かりにくいと感じる人が多い表です。でも、見るところは左と右の2つだけです。
      </p>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed text-gray-600">
        <li>
          ・<b className="text-gray-800">右側</b>：お金をどうやって<b className="text-gray-800">集めたか</b>（銀行から借りた／自分で出した）
        </li>
        <li>
          ・<b className="text-gray-800">左側</b>：集めたお金を<b className="text-gray-800">何に使っているか</b>（現金のまま／お店の設備）
        </li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        同じお金を「集め方」と「使い道」の両方から見ているので、左右の合計は必ず同じになります。
      </p>
      <div className="mt-3">
        <BsChart />
      </div>
      <ul className="mt-3 space-y-1 text-[13px] leading-relaxed text-gray-700">
        <li>
          ・上の段＝<b>流動</b>（1年以内にお金になる／払う）、下の段＝<b>固定</b>（1年より先）。これを<b>1年ルール</b>といいます
        </li>
        <li>
          ・<b>負債</b>はいつか返すお金、<b>純資産</b>は返さなくてよいお金（自分で出したお金と、これまでのもうけ）
        </li>
        <li className="text-gray-500">
          ・簿記の言葉では左側を「借方」、右側を「貸方」といいますが、ITパスポートではまず覚えなくても大丈夫です
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
      <SectionTitle step={3}>PL（損益計算書）とは：1年間の成績表</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        1年間の売上・費用・利益をまとめた表です。黒字か赤字かは、PLを見ればすぐ分かります。
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        いちばん上に売上があり、そこから<b className="text-gray-800">上から順に</b>費用を引いていくだけです。途中に利益が5つ出てきて、名前が似ているので混乱しがちですが、
        「何を引いたあとか」が違うだけです。
      </p>
      <div className="mt-3">
        <PlLadder />
      </div>
      <Takeaway>
        売上 {CAFE.pl.sales.toLocaleString()} のうち、最後に残ったのは {PL.net}。売上がそのまま利益になるわけではありません。
      </Takeaway>
    </Panel>
  );
}

function LinkSlide() {
  return (
    <Panel>
      <SectionTitle step={4}>PLは1年ごと、BSはこれまでの積み重ね</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        PLは毎年ゼロから数え直しますが、BSには開業してからの経営の結果が積み重なっていきます。つなぎ目は<b className="text-gray-800">純資産</b>です。
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        4/1の純資産は開業資金の {CAFE.openingEquity}。1年で稼いだ当期純利益 {PL.net} がそこに加わって、3/31には {CAFE.bs.eq} になりました。
      </p>
      <div className="mt-3 flex items-center justify-center gap-2 text-center text-[13px] font-bold tabular-nums" data-testid="story-link">
        <div className="rounded-lg bg-lime-100 px-2.5 py-1.5 text-lime-950 ring-1 ring-lime-400">
          <div className="text-[11px] text-lime-900/80">4/1 の純資産</div>
          {CAFE.openingEquity}
        </div>
        <span className="text-gray-400">＋</span>
        <div className={`rounded-lg px-2.5 py-1.5 ${NET_TONE}`}>
          <div className="text-[11px] opacity-80">PLの当期純利益</div>
          {PL.net}
        </div>
        <span className="text-gray-400">＝</span>
        <div className="rounded-lg bg-lime-700 px-2.5 py-1.5 text-white">
          <div className="text-[11px] text-white/80">3/31 の純資産</div>
          {CAFE.bs.eq}
        </div>
      </div>
      <div className="mx-auto mt-3 max-w-sm">
        <BsChart height={180} detail={false} equitySplit highlight={["eq"]} testId="story-bs" />
      </div>

      <h4 className="mt-5 text-sm font-bold text-gray-900">では、銀行から100借りたら「もうかった」ことになる？</h4>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">なりません。借りたお金は、現金（左）と借入金（右）が同じだけ増えるだけです。</p>
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
      <Takeaway>資産が増えても、もうかったとは限りません。純資産が増えるのは、もうけたときです。</Takeaway>
    </Panel>
  );
}

function CheckupSlide() {
  return (
    <Panel>
      <SectionTitle step={5}>BSとPLを見ると、会社の体質が分かる</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        BSを見ると、借金に頼りすぎていないか、支払いのお金は足りているかが分かります。PLと組み合わせると、どれだけ効率よく稼げているかも分かります。
        難しそうな名前の指標も、ここまでの表から2つの数字を取り出して割るだけです。数字はすべて上のBS・PLと同じです。
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
      <Takeaway>「安全か」はBSどうしで、「もうかるか」はPLの数字を使って割ります。</Takeaway>
    </Panel>
  );
}

export default function FinancialStatementsExperience() {
  return (
    <div className="space-y-5">
      <Lead>
        財務諸表、とくに<b>PL</b>と<b>BS</b>は「何を見ればいいか分からない」という人が多い分野です。ざっくりいうと、
        <b>PL＝1年間の成績</b>、<b>BS＝決算日時点のお金の集め方と使い道</b>。1軒のカフェの同じ1年を、最後まで同じ数字で見ていきます。
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
