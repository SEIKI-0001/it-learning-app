import { getGuide, guidePath } from "@/lib/guide/guides";
import { buildGuideMetadata } from "@/lib/guide/seo";
import {
  CAPACITY_LABELS,
  GUIDE_FACTS as F,
  capacityExample,
  expectedPhaseSpans,
  toHours,
  type CapacityExample,
  type PhaseSpan,
} from "@/lib/guide/facts";
import GuideArticle from "@/components/guide/GuideArticle";
import { GuideTable, IPA_SOURCES } from "@/components/guide/GuideParts";

const guide = getGuide("study-plan");
export const metadata = buildGuideMetadata(guide);

const SPANS_60 = expectedPhaseSpans(60);
const SPANS_30 = expectedPhaseSpans(30);
const CAP_60 = [capacityExample(60, 30, 60), capacityExample(60, 45, 90)];
const CAP_30 = [capacityExample(30, 30, 60), capacityExample(30, 60, 120)];

function PhaseTable({ spans, days }: { spans: PhaseSpan[]; days: number }) {
  return (
    <GuideTable caption={`試験まで${days}日の標準配分（このサービスが予定との比較に使う区切り）`}>
      <thead>
        <tr>
          <th scope="col">期間</th>
          <th scope="col">段階</th>
          <th scope="col">やること</th>
        </tr>
      </thead>
      <tbody>
        {spans.map((s) => (
          <tr key={s.phaseId}>
            <td className="nw">
              {s.fromDay === s.toDay ? `${s.fromDay}日目` : `${s.fromDay}〜${s.toDay}日目`}（{s.days}日）
            </td>
            <th scope="row">{s.title}</th>
            <td>{s.summary}</td>
          </tr>
        ))}
      </tbody>
    </GuideTable>
  );
}

function CapacityTable({ rows }: { rows: CapacityExample[] }) {
  return (
    <GuideTable compact caption={`必要量は、初めて全範囲を学ぶ場合の見積もり（約${toHours(F.plannerRequiredMinutes)}時間）`}>
      <thead>
        <tr>
          <th scope="col">平日／休日</th>
          <th scope="col">使える総時間</th>
          <th scope="col">必要量に対して</th>
          <th scope="col">判定</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.weekdayMinutes}-${r.holidayMinutes}`}>
            <td>
              {r.weekdayMinutes}分／{r.holidayMinutes}分
            </td>
            <td>約{toHours(r.availableMinutes)}時間</td>
            <td>{Math.round(r.ratio * 100)}%</td>
            <td>{CAPACITY_LABELS[r.level]}</td>
          </tr>
        ))}
      </tbody>
    </GuideTable>
  );
}

export default function StudyPlanGuide() {
  return (
    <GuideArticle
      guide={guide}
      lead={[
        <>
          ITパスポートの学習計画は、
          <strong>「残り日数 × 1日に使える時間」で使える総時間を出し、必要な学習量と比べてから段階ごとに配分する</strong>
          のが基本です。
        </>,
        <>
          期間の前半で理解と確認問題、後半で弱点復習と過去問に比重を移し、最後の数日は総復習にあてます。時間が足りないと分かったら、全部を後ろにずらすのではなく、頻出・苦手・過去問を優先して組み替えます。
        </>,
      ]}
      points={[
        { id: "steps", label: "試験日から逆算する5つの手順" },
        { id: "ratio", label: "期間をどの段階に何割配分するか" },
        { id: "day60", label: "例: 試験まで60日の計画" },
        { id: "day30", label: "例: 試験まで30日の計画" },
        { id: "weak", label: "苦手分野と復習の入れ方" },
        { id: "delay", label: "計画から遅れたときの立て直し方" },
      ]}
      service={<Service />}
      sources={IPA_SOURCES}
    >
      <h2 id="steps">試験日から逆算する5つの手順</h2>
      <ol className="g-steps">
        <li>
          <h3>残り日数と1日に使える時間を決める</h3>
          <p>平日と休日で使える時間は違うことが多いので、分けて決めます。「毎日1時間」より「平日30分・休日60分」のほうが続けやすい計画になります。</p>
        </li>
        <li>
          <h3>現在地を確かめる</h3>
          <p>すでに理解しているテーマ、苦手だと感じる分野を把握します。数テーマ分の問題を解いてみると、感覚ではなく結果で判断できます。</p>
        </li>
        <li>
          <h3>必要な学習量と比べる</h3>
          <p>
            使える総時間が必要量の1.5倍以上なら余裕あり、1倍以上なら詰め込み気味、1倍未満なら短期集中の配分が必要です。必要量の見積もり方は
            <a href={guidePath("study-time")}>勉強時間のガイド</a>で解説しています。
          </p>
        </li>
        <li>
          <h3>期間を段階ごとに配分する</h3>
          <p>理解→確認問題→弱点復習→過去問→総復習の順に、期間を区切ります（次の章）。</p>
        </li>
        <li>
          <h3>「今日やること」に落とす</h3>
          <p>毎日の中身は、復習期限が来たもの → 苦手なテーマ → 新しいテーマの順で埋めます。新しい範囲を優先して復習を後回しにすると、前に覚えた所から抜けていきます。</p>
        </li>
      </ol>

      <h2 id="ratio">期間をどの段階に何割配分するか</h2>
      <p>このサービスが標準としている配分は次のとおりです。学習開始日から試験日までの経過割合で区切ります。</p>
      <GuideTable compact>
        <thead>
          <tr>
            <th scope="col">経過割合</th>
            <th scope="col">段階</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>〜10%</td>
            <th scope="row">全体像をつかむ</th>
          </tr>
          <tr>
            <td>10〜45%</td>
            <th scope="row">テーマ別に理解する</th>
          </tr>
          <tr>
            <td>45〜65%</td>
            <th scope="row">確認問題で固める</th>
          </tr>
          <tr>
            <td>65〜80%</td>
            <th scope="row">弱点復習</th>
          </tr>
          <tr>
            <td>80〜95%</td>
            <th scope="row">過去問実戦</th>
          </tr>
          <tr>
            <td>95%〜</td>
            <th scope="row">直前総復習</th>
          </tr>
        </tbody>
      </GuideTable>
      <p>
        これは「本来この時期にいたい位置」の目安です。段階ははっきり切り替わるわけではなく、理解の期間中もテーマごとに確認問題を解き、間違えた所は復習に回します。
      </p>

      <h2 id="day60">例: 試験まで60日の計画</h2>
      <PhaseTable spans={SPANS_60} days={60} />
      <p>1日に使える時間によって、この期間で全範囲を回せるかが変わります。</p>
      <CapacityTable rows={CAP_60} />
      <p>
        平日30分・休日60分だと必要量ぎりぎりなので、復習を削らずに済むよう、分かっているテーマは確認問題で確かめて先へ進むのがポイントです。
      </p>

      <h2 id="day30">例: 試験まで30日の計画</h2>
      <PhaseTable spans={SPANS_30} days={30} />
      <CapacityTable rows={CAP_30} />
      <p>30日で初めて全範囲を学ぶ場合、1日30分前後では必要量に届きません。次のように優先順位をはっきりさせます。</p>
      <ul>
        <li>3分野すべてに合格基準があるので、どの分野もゼロにしない</li>
        <li>重要度・出題頻度の高いテーマから理解し、低いテーマは後回しにする</li>
        <li>
          過去問は後半まで待たずに始める（このサービスでは、試験{F.kakomonEarlyRule.examNearDays}日前の時点で全体の
          {F.kakomonEarlyRule.examNearCompletedRatio * 100}%以上を学んでいれば、過去問演習を前倒しで出します）
        </li>
        <li>間違えた問題の解き直しは削らない</li>
      </ul>

      <h2 id="weak">苦手分野と復習の入れ方</h2>
      <h3>苦手分野は「多めに、でも毎日少しずつ」</h3>
      <p>
        苦手な分野は、まとめて1週間かけるより、毎日の学習に少し多めに混ぜるほうが止まりにくくなります。このサービスでは、苦手として登録した分野のテーマを優先して「今日やること」に入れ、今週のゴールもその分野を中心に組みます。
      </p>
      <h3>復習は間隔を広げながら繰り返す</h3>
      <p>
        間違えたテーマは翌日にもう一度解き、正解できたら{F.reviewIntervalDays.join("日後・")}日後と間隔を広げて確認します。直前期に復習がたまらないよう、計画の段階から復習の時間を残しておきます。
      </p>

      <h2 id="delay">計画から遅れたときの立て直し方</h2>
      <p>遅れたときに全部を後ろへずらすと、最後に過去問と総復習の時間がなくなります。遅れの大きさで対応を変えます。</p>
      <GuideTable>
        <thead>
          <tr>
            <th scope="col">残り時間 ÷ 必要量</th>
            <th scope="col">対応</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>120%以上</td>
            <td>計画どおり。毎日の学習を続け、復習は削らない</td>
          </tr>
          <tr>
            <td>100〜120%</td>
            <td>少し前倒しする。新しい範囲の量を少し減らし、数日で吸収する</td>
          </tr>
          <tr>
            <td>70〜100%</td>
            <td>重要度の低いテーマを後回しにし、頻出・苦手・過去問を優先する。復習は残す</td>
          </tr>
          <tr>
            <td>70%未満</td>
            <td>頻出テーマ・過去問・間違えた問題の復習に絞った短期集中に切り替える</td>
          </tr>
        </tbody>
      </GuideTable>
      <p>
        CBT方式のITパスポート試験は受験日を自分で選べるため、弱点復習と過去問の時間を確保するために試験日を後ろにずらすのも現実的な選択肢です。止まってしまったときの再開方法は
        <a href={guidePath("cant-continue-studying")}>勉強が続かないときの立て直し方</a>で解説しています。
      </p>
    </GuideArticle>
  );
}

function Service() {
  return (
    <>
      <p>この記事の手順は、ITパスポート学習コーチの計画機能がそのまま行っている処理です。</p>
      <ul>
        <li>初回設定で試験日・平日と休日の学習時間・苦手分野・使っている参考書を登録すると、試験日までの道のりと今週のゴールを出します</li>
        <li>毎日の「今日やること」は、復習期限 → 苦手 → 新しいテーマの優先順で組まれます</li>
        <li>予定の位置と実際の進み具合を比べ、遅れや弱点が目立つときは、バランス回復・弱点集中・本番対応優先・短期集中・試験日を遅らせる、といった立て直し案を提示します。計画が変わるのは、提案を承認したときだけです</li>
        <li>
          過去問は{F.officialYearRange}のIPA公式過去問{F.officialQuestionCount}問から、段階に合わせて出題されます（
          <a href={guidePath("past-exam-strategy")}>過去問の使い方</a>）
        </li>
      </ul>
    </>
  );
}
