import { getGuide, guidePath } from "@/lib/guide/guides";
import { buildGuideMetadata } from "@/lib/guide/seo";
import { GUIDE_FACTS as F } from "@/lib/guide/facts";
import GuideArticle from "@/components/guide/GuideArticle";
import { GuideTable, IPA_SOURCES, type GuideSource } from "@/components/guide/GuideParts";

// 合格率の解説。数字は IPA の公表値だけを使う（2026年10月17日時点で確認できた令和7年度まで）。
// 令和8年度の年間値が公表されたら、RATES に1行足して本文と lib/guide/guides.ts の dateModified を更新する。

const guide = getGuide("pass-rate");
export const metadata = buildGuideMetadata(guide);

const SOURCES: GuideSource[] = [
  {
    label: "IPA「令和7年度「iパス（ITパスポート試験）」の年間応募者数等について」",
    url: "https://www.ipa.go.jp/shiken/reports/ip-oubo2025.html",
  },
  {
    label: "IPA「令和6年度「iパス（ITパスポート試験）」の年間応募者数等について」",
    url: "https://www.ipa.go.jp/shiken/reports/ip-oubo2024.html",
  },
  {
    label: "IPA「統計情報（全試験区分）」",
    url: "https://www.ipa.go.jp/shiken/reports/toukei_all.html",
  },
  {
    label: "IPA ITパスポート試験「統計情報」（月別の試験結果・社会人/学生別）",
    url: "https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/statistics.html",
  },
  ...IPA_SOURCES,
];

/** 年度別の受験者数・合格者数（IPA 公表値）。合格率はここから計算する。 */
const RATES = [
  { year: "令和3年度", examinees: 211_145, passers: 111_241 },
  { year: "令和4年度", examinees: 231_526, passers: 119_495 },
  { year: "令和5年度", examinees: 265_040, passers: 133_292 },
  { year: "令和6年度", examinees: 273_905, passers: 134_617 },
  { year: "令和7年度", examinees: 271_352, passers: 132_012 },
].map((r) => ({ ...r, rate: Math.round((r.passers / r.examinees) * 1000) / 10 }));

const LATEST = RATES[RATES.length - 1];

const n = (v: number) => v.toLocaleString("ja-JP");

export default function PassRateGuide() {
  return (
    <GuideArticle
      guide={guide}
      lead={[
        <>
          ITパスポートの合格率は、<strong>ここ数年ずっと50%前後</strong>です。最新の{LATEST.year}は
          <strong>{LATEST.rate}%</strong>（受験者{n(LATEST.examinees)}人・合格者{n(LATEST.passers)}人）でした。
        </>,
        <>
          ただし「2人に1人が落ちるほど難しい試験」と読むのは早計です。受験者には十分に準備しないまま受ける人も含まれます。落ちる人に多いのは、
          <strong>1つの分野が基準点に届かない</strong>、<strong>本番形式の練習が足りない</strong>といった、対策で避けやすいパターンです。
        </>,
      ]}
      points={[
        { id: "rate", label: "年度別の合格率の推移" },
        { id: "read", label: "合格率50%をどう読むか" },
        { id: "criteria", label: "合格基準と「分野別の足切り」" },
        { id: "fail", label: "落ちる人に多い5つのパターン" },
        { id: "check", label: "受験前に合格ラインを確かめる方法" },
      ]}
      service={<Service />}
      sources={SOURCES}
    >
      <h2 id="rate">年度別の合格率の推移</h2>
      <p>IPAが公表している直近5年度の結果です。合格率は受験者数に対する合格者数の割合です。</p>
      <GuideTable compact caption="ITパスポート試験の年度別の結果（IPA公表値）">
        <thead>
          <tr>
            <th scope="col">年度</th>
            <th scope="col">受験者数</th>
            <th scope="col">合格者数</th>
            <th scope="col">合格率</th>
          </tr>
        </thead>
        <tbody>
          {RATES.map((r) => (
            <tr key={r.year}>
              <th scope="row" className="nw">
                {r.year}
              </th>
              <td>{n(r.examinees)}人</td>
              <td>{n(r.passers)}人</td>
              <td>{r.rate}%</td>
            </tr>
          ))}
        </tbody>
      </GuideTable>
      <p>
        受験者数は5年で約{Math.round((LATEST.examinees / RATES[0].examinees) * 10) / 10}倍に増え、合格率は
        {RATES[0].rate}%から{LATEST.rate}%へと少しずつ下がっています。{LATEST.year}の応募者数は307,266人で、2年連続で30万人を超えました。
      </p>
      <p>
        つまり、<strong>受ける人が増えても合格率は大きく崩れず、毎年おおむね半分が合格している</strong>試験です。
      </p>

      <h2 id="read">合格率50%をどう読むか</h2>
      <p>合格率は「試験の難しさ」だけで決まる数字ではありません。誰が、どれだけ準備して受けたかも反映されます。</p>
      <h3>受験者の多くはIT以外の仕事をしている社会人</h3>
      <p>
        IPAの公表では、{LATEST.year}の応募者のうち社会人の勤務先は<strong>非IT系企業（179,995人）がIT系企業（40,715人）の4倍以上</strong>
        です。会社の推奨や研修の一環で受ける人も多く、IT用語にほとんど触れたことがない状態から始める人が受験者の中心です。
      </p>
      <h3>社会人のほうが学生より合格率が高い</h3>
      <p>
        IPAの月別の統計では、社会人の合格率が学生より10ポイント前後高い傾向があります（例：2025年4月度は社会人53.7%・学生41.5%）。
        社会人は仕事で触れる経営・法務・プロジェクト管理の内容に土地勘があり、ストラテジ系・マネジメント系で点を取りやすいことが一因と考えられます。
      </p>
      <h3>いつでも受けられるので、準備不足のまま受ける人もいる</h3>
      <p>
        ITパスポートはCBT方式で、全国の会場で随時受験できます。申し込みやすい反面、「とりあえず受けてみる」「研修の期限に合わせて受ける」といった、
        準備が十分でない受験も合格率に含まれます。
      </p>
      <p>
        このため、合格率50%は<strong>「きちんと準備した人の半分が落ちる」という意味ではありません</strong>。
        自分が受かるかどうかは、合格率よりも「本番形式の問題でどれだけ取れるか」で判断するほうが確実です。
      </p>

      <h2 id="criteria">合格基準と「分野別の足切り」</h2>
      <p>
        ITパスポートの合否は、正答数ではなく<strong>評価点</strong>で決まります。合格には、総合評価点と分野別評価点の
        <strong>両方</strong>が基準を満たす必要があります。
      </p>
      <GuideTable caption="ITパスポート試験の合格基準（IPA公表内容）">
        <thead>
          <tr>
            <th scope="col">評価</th>
            <th scope="col">基準</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">総合評価点</th>
            <td>1,000点満点中600点以上</td>
          </tr>
          <tr>
            <th scope="row">分野別評価点</th>
            <td>ストラテジ系・マネジメント系・テクノロジ系の3分野それぞれで、1,000点満点中300点以上</td>
          </tr>
        </tbody>
      </GuideTable>
      <p>
        つまり、<strong>総合点が600点を超えていても、1分野でも300点に届かなければ不合格</strong>です。
        得意分野で稼いで苦手分野を捨てる作戦は、この「分野別の足切り」に引っかかるおそれがあります。
      </p>
      <ul>
        <li>出題は100問ですが、総合評価は92問で行い、残りの8問は今後の出題のための評価用です（どの問題かは分かりません）</li>
        <li>評価点はIRT（項目応答理論）にもとづいて計算されるため、正答数がそのまま点数になるわけではありません</li>
        <li>
          2027年度からの新試験でも合格基準は変わらない予定です（詳しくは
          <a href={guidePath("exam-changes-2027")}>2027年度からの変更点</a>）
        </li>
      </ul>

      <h2 id="fail">落ちる人に多い5つのパターン</h2>
      <p>合格基準の仕組みを踏まえると、落ちる原因はある程度パターン化できます。</p>
      <GuideTable>
        <thead>
          <tr>
            <th scope="col">パターン</th>
            <th scope="col">何が起きるか</th>
            <th scope="col">避け方</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">苦手分野を後回しにしたまま受ける</th>
            <td>総合点は足りても、テクノロジ系（文系の人）やストラテジ系の法務・会計（IT職の人）が300点に届かない</td>
            <td>分野別に正答率を出し、極端に低い分野を先に引き上げる</td>
          </tr>
          <tr>
            <th scope="row">参考書を読むだけで終わる</th>
            <td>用語を見たことはあるが、選択肢から正解を選べない</td>
            <td>1テーマ読んだら確認問題を解き、解けたら次へ進む</td>
          </tr>
          <tr>
            <th scope="row">過去問の答えを覚えてしまう</th>
            <td>同じ問題は解けるが、聞き方が変わると崩れる</td>
            <td>正解の理由と、他の選択肢が違う理由を説明できるか確かめる</td>
          </tr>
          <tr>
            <th scope="row">100問を通して解いたことがない</th>
            <td>120分の時間配分が分からず、後半で集中が切れる</td>
            <td>受験前に最低1回は100問を120分で通して解く</td>
          </tr>
          <tr>
            <th scope="row">試験日を決めずに勉強する</th>
            <td>だらだら長引いて前半の内容を忘れる、または慌てて受けて準備が間に合わない</td>
            <td>先に試験日を決め、残り日数から逆算して計画する</td>
          </tr>
        </tbody>
      </GuideTable>
      <p>
        どれも能力の問題ではなく、<strong>勉強の進め方で防げる</strong>ものです。何から始めるかは
        <a href={guidePath("it-passport-study-method")}>未経験者向けの勉強法</a>、
        試験日からの逆算は<a href={guidePath("study-plan")}>試験日から逆算する学習計画</a>で解説しています。
      </p>

      <h2 id="check">受験前に合格ラインを確かめる方法</h2>
      <p>「合格率50%の試験に自分が受かるか」は、公開されている過去問で確かめられます。受験の1〜2週間前に、次の点を確認してください。</p>
      <ul>
        <li>
          <strong>100問通しの正答率が、6割を安定して超えている</strong>
          ：1回だけでなく、別の年度の問題でも同じくらい取れるか。本番の緊張を考えると、7割前後あると安心です
        </li>
        <li>
          <strong>3分野とも、極端に低い分野がない</strong>：総合では足りていても、1分野だけ4割を切っているなら足切りのおそれがあります
        </li>
        <li>
          <strong>間違えた問題を、解説を見ずに説明できる</strong>：答えを覚えたのではなく理解できているか
        </li>
        <li>
          <strong>120分で100問を解き終えられる</strong>：見直しの時間が残るペースか
        </li>
      </ul>
      <p className="g-note">
        過去問の正答率は、本番の評価点（IRTによる採点）とは一致しません。あくまで「合格ラインに近いかどうか」の目安として使ってください。
      </p>
      <p>
        過去問をいつから・何年分解くかは<a href={guidePath("past-exam-strategy")}>過去問の使い方</a>、
        合格までに必要な時間の見積もりは<a href={guidePath("study-time")}>勉強時間の目安</a>を参考にしてください。
      </p>
    </GuideArticle>
  );
}

function Service() {
  return (
    <>
      <p>
        ITパスポート学習コーチでは、上のチェックをアプリの中でそのまま行えます。IPAの公式過去問{F.officialQuestionCount}問（
        {F.officialYearRange}）を収録しています。
      </p>
      <ul>
        <li>年度別の100問演習では、全体の正答率に加えて3分野それぞれの正答率が出るので、足切りのおそれがある分野をすぐ確認できます</li>
        <li>合格準備度の画面では、分野ごとの内訳と「いちばん伸ばせるところ」が分かります</li>
        <li>間違えた問題は自動で復習リストに戻り、時間をあけて解き直せます</li>
        <li>試験日と1日に使える時間を入れると、苦手分野を優先した「今日やること」を毎日組みます</li>
      </ul>
    </>
  );
}
