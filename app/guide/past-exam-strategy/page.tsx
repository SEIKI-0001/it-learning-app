import { getGuide, guidePath } from "@/lib/guide/guides";
import { buildGuideMetadata } from "@/lib/guide/seo";
import { GUIDE_FACTS as F } from "@/lib/guide/facts";
import { formatJapaneseExamYear } from "@/lib/pastExam/yearLabel";
import GuideArticle from "@/components/guide/GuideArticle";
import { GuideTable, IPA_SOURCES, type GuideSource } from "@/components/guide/GuideParts";

const guide = getGuide("past-exam-strategy");
export const metadata = buildGuideMetadata(guide);

const SOURCES: GuideSource[] = [
  ...IPA_SOURCES,
  {
    label: "IPA「ITパスポート試験 公開問題」",
    url: "https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html",
  },
];

export default function PastExamGuide() {
  return (
    <GuideArticle
      guide={guide}
      lead={[
        <>
          ITパスポートの過去問は、
          <strong>基礎を一通り学んでから分野別に始め、慣れてきたら分野を混ぜ、最後に本番と同じ100問形式で解く</strong>
          のが基本です。
        </>,
        <>
          何年分かより、「3分野すべてを分野別に一通り解いたか」「間違えた問題を解き直したか」「100問を時間内に通して解けたか」で判断します。
        </>,
      ]}
      points={[
        { id: "purpose", label: "過去問を解く4つの目的" },
        { id: "when", label: "過去問はいつから始めるか" },
        { id: "order", label: "分野別→ランダム→100問の進め方" },
        { id: "years", label: "何年分解けばいいか" },
        { id: "review", label: "間違えた問題の復習方法" },
      ]}
      service={<Service />}
      sources={SOURCES}
    >
      <h2 id="purpose">過去問を解く4つの目的</h2>
      <p>「とにかく何周も解く」だけだと、答えの番号を覚えて正答率が上がったように見えることがあります。何のために解くのかを段階ごとに分けます。</p>
      <GuideTable>
        <thead>
          <tr>
            <th scope="col">目的</th>
            <th scope="col">見るポイント</th>
            <th scope="col">主な時期</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">出題形式に慣れる</th>
            <td>問題文の長さ、問われ方（「適切なもの」「適切でないもの」）、選択肢の作られ方</td>
            <td>基礎が一通り済んだ直後</td>
          </tr>
          <tr>
            <th scope="row">理解不足を発見する</th>
            <td>正解しても根拠を説明できない問題、知らない用語</td>
            <td>分野別演習の時期</td>
          </tr>
          <tr>
            <th scope="row">分野別の弱点を見つける</th>
            <td>3分野それぞれの正答率。合格には3分野すべてに基準がある</td>
            <td>分野別〜ランダム演習の時期</td>
          </tr>
          <tr>
            <th scope="row">本番形式へ移る</th>
            <td>100問・120分の時間配分、見直しの流れ、集中が切れる所</td>
            <td>試験の直前期</td>
          </tr>
        </tbody>
      </GuideTable>

      <h2 id="when">過去問はいつから始めるか</h2>
      <p>
        基本は、<strong>3分野の主要テーマを一通り学び、テーマごとの確認問題で根拠を持って選べるようになってから</strong>
        です。早すぎると知らない用語ばかりで「解く」より「答えを見て覚える」作業になり、弱点を見つける役に立ちません。
      </p>
      <p>ただし、次の場合は前倒しで始めて構いません。</p>
      <ul>
        <li>試験日が近く、全範囲を学び終えるのを待つ時間がない</li>
        <li>学習がある程度進んでいて、確認問題の正答率が高い</li>
      </ul>
      <p>
        このサービスでは、基本は道のりの「過去問実戦」の段階から公式過去問を出し、試験{F.kakomonEarlyRule.examNearDays}
        日前の時点で全体の{F.kakomonEarlyRule.examNearCompletedRatio * 100}%以上を学んでいる場合や、全体の
        {F.kakomonEarlyRule.completedRatio * 100}%以上を学んだ場合などに前倒しで出します。逆に、全体像や基礎理解の段階では前倒ししません。
      </p>

      <h2 id="order">分野別→ランダム→100問の進め方</h2>
      <ol className="g-steps">
        <li>
          <h3>分野別に解く</h3>
          <p>
            ストラテジ系・マネジメント系・テクノロジ系を分けて解き、分野ごとの正答率を見ます。目安として、各分野{F.fieldDrillTarget}
            問ずつ解くと、どの分野が弱いかが見えてきます。
          </p>
        </li>
        <li>
          <h3>分野を混ぜて解く</h3>
          <p>本番では3分野の問題が混ざって出ます。分野の手がかりがない状態でも判断できるかを確かめます。</p>
        </li>
        <li>
          <h3>年度ごとの100問を時間を計って解く</h3>
          <p>本番と同じ100問・120分で通して解き、時間配分と3分野それぞれの得点を確認します。</p>
        </li>
        <li>
          <h3>間違えた問題だけを解き直す</h3>
          <p>最後に、これまで間違えた問題だけを集めて解き直します。ここで正解できるようになった数が、仕上がりの目安になります。</p>
        </li>
      </ol>

      <h2 id="years">何年分解けばいいか</h2>
      <p>
        IPAは過去の試験問題の一部を「公開問題」として公表しています。何年分を解くかは、年数そのものより
        <strong>次の3つを満たせる量</strong>で考えます。
      </p>
      <ul>
        <li>3分野すべてを、分野別に一通り解いている</li>
        <li>100問形式を、時間を計って通しで解いたことがある</li>
        <li>間違えた問題を解き直し、同じ間違いをしなくなっている</li>
      </ul>
      <p>
        同じ年度を何周もするより、新しい年度の問題に触れるほうが、答えの暗記ではなく理解で解けているかを確かめやすくなります。
        ITパスポートはAIやセキュリティなど新しい内容も出題されるため、新しい年度から優先して解くのがおすすめです。
      </p>
      <p className="g-note">
        このサービスに収録している公式過去問は{F.officialYearRange}の{F.officialYears.length}年度分・計
        {F.officialQuestionCount}問です（{F.officialYears.map((y) => formatJapaneseExamYear(y)).join("・")}、各
        {F.officialExamQuestionCount}問）。
      </p>

      <h2 id="review">間違えた問題の復習方法</h2>
      <p>過去問の価値は、間違えた問題をどれだけ回収できるかで決まります。</p>
      <ul>
        <li>間違えた理由を「用語を知らなかった」「読み違えた」「考え方が分かっていなかった」に分ける</li>
        <li>「考え方が分かっていなかった」問題は、過去問の解説だけで済ませず、そのテーマの基礎に戻る</li>
        <li>解き直しは同じ日ではなく、翌日以降に行う（答えを覚えているだけかどうかを区別するため）</li>
        <li>正解した問題も、他の選択肢がなぜ違うのかを説明できるか確認する</li>
      </ul>
      <p>
        過去問を含めた学習全体のスケジュールは<a href={guidePath("study-plan")}>試験日から逆算する学習計画</a>で解説しています。
      </p>
    </GuideArticle>
  );
}

function Service() {
  return (
    <>
      <p>
        ITパスポート学習コーチには、IPAの公式過去問{F.officialQuestionCount}問（{F.officialYearRange}）を収録しています。問題文と選択肢は公式のまま、解説はサービスが独自に作成しています。
      </p>
      <ul>
        <li>道のりが過去問の段階に入ると、「今日やること」に分野別→ランダム→年度別100問→間違えた問題の再演習の順で出題されます</li>
        <li>年度ごとの100問を、本番と同じ並びで解くこともできます</li>
        <li>過去問で間違えた問題は、関連するテーマの復習にも回ります</li>
        <li>3分野のバランスを保って100問を組む、本番形式の模試も使えます</li>
      </ul>
      <p className="g-note">過去問の演習と解説の閲覧は、無料期間の終了後も無料で使えます。</p>
    </>
  );
}
