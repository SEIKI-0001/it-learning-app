import { getGuide, guidePath } from "@/lib/guide/guides";
import { buildGuideMetadata } from "@/lib/guide/seo";
import GuideArticle from "@/components/guide/GuideArticle";
import { GuideTable, IPA_SOURCES, type GuideSource } from "@/components/guide/GuideParts";

// 2027年度からの新試験制度の解説。事実は IPA の公表内容だけに基づく（2026年9月30日時点）。
// IPA が新しい情報（2027年1月以降の実施案内、シラバス確定版など）を出したら、
// 本文と lib/guide/guides.ts の dateModified を更新する。

const guide = getGuide("exam-changes-2027");
export const metadata = buildGuideMetadata(guide);

const SOURCES: GuideSource[] = [
  {
    label: "IPA「情報処理技術者試験及び情報処理安全確保支援士試験の見直しの検討状況について」（2026年3月31日）",
    url: "https://www.ipa.go.jp/shiken/syllabus/henkou/2025/20260331.html",
  },
  {
    label: "IPA プレス発表「情報処理技術者試験における試験区分体系などの見直し（案）について」",
    url: "https://www.ipa.go.jp/pressrelease/2025/press20260331.html",
  },
  {
    label: "IPA「新試験制度のシラバス案について」",
    url: "https://www.ipa.go.jp/shiken/syllabus/henkou/2026/20260630.html",
  },
  {
    label: "IPA「新試験制度のサンプル問題について」",
    url: "https://www.ipa.go.jp/shiken/syllabus/henkou/2026/20260622.html",
  },
  {
    label: "IPA「CBT方式で実施する…2026年5月以降の試験実施について」",
    url: "https://www.ipa.go.jp/shiken/2026/cbt-202605-jisshi.html",
  },
  ...IPA_SOURCES,
];

export default function ExamChanges2027Guide() {
  return (
    <GuideArticle
      guide={guide}
      lead={[
        <>
          ITパスポート試験は<strong>2027年度春頃から新しい試験制度に移行する予定</strong>
          です。出題分野が「ストラテジ系・マネジメント系・テクノロジ系」から
          <strong>「ビジネス」「テクノロジ」「セキュリティ・倫理」</strong>の3つに再編されます。
        </>,
        <>
          一方で、<strong>試験時間120分・出題数100問・合格基準は変わらない</strong>
          とされています。現行制度の試験は2026年度の実施をもって終了する予定です（2026年9月30日時点のIPAの公表内容）。
        </>,
      ]}
      points={[
        { id: "compare", label: "現行試験と新試験の違い（比較表）" },
        { id: "added", label: "新しく加わる・強化される内容" },
        { id: "schedule", label: "現行試験はいつまで受けられるか" },
        { id: "decide", label: "今受けるか、新試験を待つか" },
        { id: "study", label: "新試験に向けて今からできる勉強" },
      ]}
      service={<Service />}
      sources={SOURCES}
    >
      <h2 id="compare">現行試験と新試験の違い（比較表）</h2>
      <p>IPAが公表している見直し内容を、現行試験と並べて整理します。新試験の内容は検討段階の「案」で、今後変わる可能性があります。</p>
      <GuideTable caption="ITパスポート試験の現行制度と新制度（予定）">
        <thead>
          <tr>
            <th scope="col">項目</th>
            <th scope="col">現行試験</th>
            <th scope="col">新試験（2027年度〜予定）</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">出題分野</th>
            <td>ストラテジ系・マネジメント系・テクノロジ系</td>
            <td>ビジネス・テクノロジ・セキュリティ・倫理</td>
          </tr>
          <tr>
            <th scope="row">新たに加わる内容</th>
            <td>—</td>
            <td>DXで求められるマインド・スタンス、データマネジメントの基礎</td>
          </tr>
          <tr>
            <th scope="row">強化される内容</th>
            <td>—</td>
            <td>AI時代に対応したセキュリティ・倫理</td>
          </tr>
          <tr>
            <th scope="row">試験時間・出題数</th>
            <td>120分・100問</td>
            <td>変更なし（120分・100問）</td>
          </tr>
          <tr>
            <th scope="row">合格基準</th>
            <td>総合評価点と分野別評価点の両方に基準あり</td>
            <td>変更なし</td>
          </tr>
          <tr>
            <th scope="row">実施方式</th>
            <td>CBT方式（随時実施）</td>
            <td>CBT方式・通年実施の予定</td>
          </tr>
        </tbody>
      </GuideTable>
      <p>
        つまり、<strong>試験の形式や難しさの基準はそのままで、何が出題されるか（分野の区切りと中身）が変わる</strong>
        見直しです。
      </p>

      <h2 id="added">新しく加わる・強化される内容</h2>
      <p>IPAは見直しの主な点として、次の2つを挙げています。</p>
      <ul>
        <li>
          <strong>DXのマインド・スタンスとデータマネジメントの基礎を新たに追加</strong>
          ：デジタル技術で業務を変える考え方や、データを整えて活用するための基本が出題範囲に入ります。
        </li>
        <li>
          <strong>AI時代に対応したセキュリティ・倫理の出題を強化</strong>
          ：セキュリティと倫理が独立した分野になり、生成AIの利用などを前提にした内容が重視されます。
        </li>
      </ul>
      <p>
        新制度のシラバス案（Ver.0.1）とサンプル問題は、2026年8月31日にIPAのウェブページで公開されています。いずれも
        <strong>検討状況に基づく案で、変更の可能性がある</strong>と明記されているため、細かい出題項目は確定版の公表を待つ必要があります。
      </p>

      <h2 id="schedule">現行試験はいつまで受けられるか</h2>
      <p>2026年9月30日時点でIPAが公表しているスケジュールは次のとおりです。</p>
      <GuideTable caption="新試験への移行スケジュール（IPA公表内容）" compact>
        <thead>
          <tr>
            <th scope="col">時期</th>
            <th scope="col">内容</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="nw">2026年度中</th>
            <td>現行制度の試験を実施。2026年度の実施をもって終了予定</td>
          </tr>
          <tr>
            <th scope="row" className="nw">2027年1月以降</th>
            <td>CBT試験の一時休止を予定（当初の2026年4月27日以降から延期）。1月以降の実施はIPAが2026年秋頃に案内予定</td>
          </tr>
          <tr>
            <th scope="row" className="nw">2027年度春頃</th>
            <td>新制度のITパスポート試験を開始予定</td>
          </tr>
        </tbody>
      </GuideTable>
      <p>
        <strong>現行の出題範囲で確実に受けたいなら、2026年12月までの受験を目安に計画する</strong>
        のが安全です。2027年1月以降に現行試験を受けられるかどうかは、IPAの秋頃の案内で確認してください。
      </p>

      <h2 id="decide">今受けるか、新試験を待つか</h2>
      <p>どちらが良いかは、試験までに使える時間と、今の学習の進み具合で決まります。</p>
      <GuideTable>
        <thead>
          <tr>
            <th scope="col">あなたの状況</th>
            <th scope="col">おすすめ</th>
            <th scope="col">理由</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">すでに勉強を始めている</th>
            <td>現行試験で年内に受ける</td>
            <td>今の参考書・過去問がそのまま使え、学んだ内容が直接得点につながる</td>
          </tr>
          <tr>
            <th scope="row">これから始めるが、12月までに学習時間を取れる</th>
            <td>現行試験を目指す</td>
            <td>教材と公開過去問が豊富で、対策の方針を立てやすい</td>
          </tr>
          <tr>
            <th scope="row">年内は時間が取れない</th>
            <td>新試験を前提に準備する</td>
            <td>無理に年内受験を狙うより、新しい出題範囲で計画するほうが無駄が少ない</td>
          </tr>
          <tr>
            <th scope="row">DX・データ活用・AIの知識を仕事で使いたい</th>
            <td>どちらでも可。新試験の追加内容も学ぶ</td>
            <td>新試験で追加される内容は、実務でも役立つ領域</td>
          </tr>
        </tbody>
      </GuideTable>
      <p>
        年内受験を目指す場合は、試験日を先に決めてから逆算するのが近道です。何日前から何をやるかは
        <a href={guidePath("study-plan")}>試験日から逆算する学習計画</a>、必要な時間の見積もりは
        <a href={guidePath("study-time")}>勉強時間の目安</a>で解説しています。
      </p>

      <h2 id="study">新試験に向けて今からできる勉強</h2>
      <p>分野の名前は変わりますが、新試験にも「テクノロジ」「セキュリティ」の分野は残ります。今の学習がすべて無駄になるわけではありません。</p>
      <ul>
        <li>コンピュータ・ネットワーク・データベースなどテクノロジの基礎は、そのまま土台になる</li>
        <li>情報セキュリティは独立した分野になるため、現行試験以上にしっかり理解しておく</li>
        <li>経営・法務・プロジェクト管理などの内容は「ビジネス」分野として再整理される見込み</li>
        <li>DX・データマネジメント・AIの倫理は新しく重視されるので、シラバス案とサンプル問題で出題のイメージをつかむ</li>
      </ul>
      <p className="g-note">
        新試験の出題範囲は確定前の案です。IPAが確定版のシラバスや2027年1月以降の実施案内を公表したら、この記事も更新します。
      </p>
    </GuideArticle>
  );
}

function Service() {
  return (
    <>
      <p>
        ITパスポート学習コーチは、現行試験（ストラテジ系・マネジメント系・テクノロジ系）の出題範囲に沿った教材と、IPAの公式過去問を収録しています。年内に現行試験で受ける人は、そのまま使えます。
      </p>
      <ul>
        <li>試験日と1日に使える時間を入れると、残りの日数から「今日やること」を毎日組みます</li>
        <li>予定より遅れても、立て直し案で試験日までの計画を引き直せます</li>
        <li>間違えた問題は、自動で復習リストに戻ります</li>
      </ul>
    </>
  );
}
