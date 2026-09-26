import { getGuide, guidePath } from "@/lib/guide/guides";
import { buildGuideMetadata } from "@/lib/guide/seo";
import { GUIDE_FACTS as F, toHours } from "@/lib/guide/facts";
import GuideArticle from "@/components/guide/GuideArticle";
import { GuideTable, IPA_SOURCES } from "@/components/guide/GuideParts";

const guide = getGuide("study-time");
export const metadata = buildGuideMetadata(guide);

const technology = F.byField.find((f) => f.field === "technology")!;
const REQUIRED = F.plannerRequiredMinutes;

/** ケース別の学習量（分）。計画エンジンの見積り式から、学習済みのインプットを差し引く。 */
const CASES = [
  {
    name: "IT初心者",
    who: "ITの用語や仕組みにほぼ触れたことがない",
    minutes: REQUIRED,
    note: "全トピックを新しく学ぶ前提",
  },
  {
    name: "基礎知識あり",
    who: "仕事や授業でITに触れていて、テクノロジ系の基本は分かる",
    minutes: REQUIRED - technology.inputMinutes,
    note: `テクノロジ系のインプット（約${toHours(technology.inputMinutes)}時間）が短くなる場合`,
  },
  {
    name: "再受験・あと一歩",
    who: "一通り学んだが本番で基準に届かなかった／模試で合格ライン付近",
    minutes: F.reviewMinutes + F.kakomonMinutes,
    note: "インプットは済んでいて、確認問題の回し直しと過去問だけが残る場合の上限",
  },
];

/** 平日/休日の時間ごとに、初心者の見積りを何週で消化できるか。 */
const PACES = [
  { weekday: 15, holiday: 30 },
  { weekday: 30, holiday: 60 },
  { weekday: 60, holiday: 120 },
].map((p) => {
  const perWeek = p.weekday * 5 + p.holiday * 2;
  const weeks = Math.ceil(REQUIRED / perWeek);
  return { ...p, perWeek, weeks, months: Math.ceil((weeks / 4.3) * 2) / 2 };
});

export default function StudyTimeGuide() {
  return (
    <GuideArticle
      guide={guide}
      lead={[
        <>
          ITパスポートの勉強時間は<strong>一律には決まりません</strong>。
          前提知識、今どこまで理解しているか、1日に使える時間の3つで大きく変わります。
        </>,
        <>
          目安として、このサービスの教材で全範囲を学ぶ場合、IT初心者の計画上の学習量は約{toHours(REQUIRED)}時間です（インプット・確認問題の回し直し・過去問演習の合計）。
          基礎知識があれば減り、理解に時間がかかるテーマや参考書の併読があれば増えます。
        </>,
      ]}
      points={[
        { id: "factors", label: "勉強時間を決める3つの要素" },
        { id: "cases", label: "ケース別の学習量の目安" },
        { id: "breakdown", label: "見積もりの内訳" },
        { id: "months", label: "何ヶ月かかるかの計算方法" },
        { id: "reduce", label: "ムダな学習時間を減らす方法" },
      ]}
      service={<Service />}
      sources={IPA_SOURCES}
    >
      <h2 id="factors">勉強時間を決める3つの要素</h2>
      <p>
        IPAの試験情報では試験時間（120分）や出題数（100問）は示されていますが、合格までに必要な勉強時間の目安は示されていません。
        同じ試験でも、次の3つで必要な時間が変わります。
      </p>
      <GuideTable>
        <thead>
          <tr>
            <th scope="col">要素</th>
            <th scope="col">何が変わるか</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">前提知識</th>
            <td>用語や仕組みをゼロから理解する時間。ITに触れた経験があれば、テクノロジ系の理解が早くなる</td>
          </tr>
          <tr>
            <th scope="row">現在地</th>
            <td>すでに解けるテーマは、確認するだけで済む。今どこまで解けるかで残りの量が決まる</td>
          </tr>
          <tr>
            <th scope="row">1日に使える時間</th>
            <td>総時間は同じでも、1日の時間が短いほど必要な日数（期間）が長くなる</td>
          </tr>
        </tbody>
      </GuideTable>
      <p>「何時間やれば合格」という数字を探すより、自分の場合に残っている量を見積もるほうが計画に使えます。</p>

      <h2 id="cases">ケース別の学習量の目安</h2>
      <p>
        このサービスの計画エンジンが使う見積もり式（下の内訳を参照）に当てはめると、ケースごとの学習量は次のようになります。
      </p>
      <GuideTable caption="このサービスの教材で学ぶ場合の計画上の見積もり。合格を保証する時間ではありません。">
        <thead>
          <tr>
            <th scope="col">ケース</th>
            <th scope="col">こんな人</th>
            <th scope="col">学習量の目安</th>
            <th scope="col">前提</th>
          </tr>
        </thead>
        <tbody>
          {CASES.map((c) => (
            <tr key={c.name}>
              <th scope="row">{c.name}</th>
              <td>{c.who}</td>
              <td>約{toHours(c.minutes)}時間</td>
              <td>{c.note}</td>
            </tr>
          ))}
        </tbody>
      </GuideTable>
      <p>次のような場合は、この目安より時間が増えます。</p>
      <ul>
        <li>参考書や動画講座を並行して読む・見る時間</li>
        <li>計算問題や仕組みの理解に何度も戻るテーマがある</li>
        <li>確認問題や過去問で間違いが多く、復習の回数が増える</li>
      </ul>
      <p>
        再受験の場合は、前回の結果で基準に届かなかった分野を先に確認すると、残りの量を小さく見積もれます。
      </p>

      <h2 id="breakdown">見積もりの内訳</h2>
      <p>初心者の約{toHours(REQUIRED)}時間は、次の3つを足したものです。</p>
      <GuideTable>
        <thead>
          <tr>
            <th scope="col">項目</th>
            <th scope="col">時間</th>
            <th scope="col">中身</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">インプット</th>
            <td>約{toHours(F.inputMinutes)}時間</td>
            <td>
              全{F.topicCount}トピックの体験・解説（
              {F.byField.map((f) => `${f.label} 約${toHours(f.inputMinutes)}時間`).join("／")}）
            </td>
          </tr>
          <tr>
            <th scope="row">確認問題の回し直し</th>
            <td>約{toHours(F.reviewMinutes)}時間</td>
            <td>全トピックの確認問題を、1トピック5分として2周</td>
          </tr>
          <tr>
            <th scope="row">過去問演習</th>
            <td>約{toHours(F.kakomonMinutes)}時間</td>
            <td>20分の演習を30回分</td>
          </tr>
        </tbody>
      </GuideTable>
      <p className="g-note">
        インプットは各トピックに設定した所要時間の合計です。理解できたトピックは必要量から外れるため、学習が進むほど残りの見積もりは小さくなります。
      </p>

      <h2 id="months">何ヶ月かかるかの計算方法</h2>
      <p>期間は「必要な学習量 ÷ 1週間に使える時間」で出せます。平日5日と休日2日の時間を分けて考えると現実に近くなります。</p>
      <GuideTable compact caption={`IT初心者の目安（約${toHours(REQUIRED)}時間）を消化する場合`}>
        <thead>
          <tr>
            <th scope="col">平日</th>
            <th scope="col">休日</th>
            <th scope="col">1週間</th>
            <th scope="col">期間の目安</th>
          </tr>
        </thead>
        <tbody>
          {PACES.map((p) => (
            <tr key={p.weekday}>
              <td>{p.weekday}分</td>
              <td>{p.holiday}分</td>
              <td>{p.perWeek}分</td>
              <td>
                約{p.weeks}週（約{p.months}ヶ月）
              </td>
            </tr>
          ))}
        </tbody>
      </GuideTable>
      <p>
        試験日が先に決まっている場合は逆に、「残り日数 × 1日の時間」が必要量に足りるかを確かめます。足りない場合の配分は
        <a href={guidePath("study-plan")}>試験日から逆算する学習計画</a>で解説しています。
      </p>

      <h2 id="reduce">ムダな学習時間を減らす方法</h2>
      <p>勉強時間を増やすより、必要のない学習を減らすほうが効果が出やすい場面があります。</p>
      <ul>
        <li>
          <strong>分かっているテーマは問題で確かめて先へ進む</strong>：解説を全部読み直さず、確認問題に正解できれば次へ
        </li>
        <li>
          <strong>問われる深さに合わせる</strong>：確認問題や過去問で問われない細部の暗記は後回しにする
        </li>
        <li>
          <strong>間違えたテーマだけ戻る</strong>：範囲全体を2周目から読み直すより、誤答したテーマの解説に戻る
        </li>
        <li>
          <strong>復習は間隔をあける</strong>：同じ日に何度も解くより、数日あけて解き直すほうが定着を確かめやすい
        </li>
      </ul>
      <p>
        時間が取れずに止まってしまった場合は、<a href={guidePath("cant-continue-studying")}>勉強が続かないときの立て直し方</a>
        も参考にしてください。
      </p>
    </GuideArticle>
  );
}

function Service() {
  return (
    <>
      <p>ITパスポート学習コーチでは、上の見積もりを自分で計算する必要はありません。</p>
      <ul>
        <li>初回設定で試験日と平日・休日に使える時間を入れると、試験日までに使える時間と必要な学習量を比べて計画を組みます</li>
        <li>学習が済んだトピックは必要量から外れ、残りの量に合わせて「今日やること」の中身が変わります</li>
        <li>時間が足りないときは、全部を後ろ倒しにせず、頻出・苦手・過去問を優先する配分にします</li>
        <li>忙しい日は、その日の学習量を{F.studyAmountOptions.join("・")}分から選べます（選ばなければ設定した時間で組みます）</li>
      </ul>
    </>
  );
}
