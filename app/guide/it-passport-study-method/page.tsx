import { getGuide, guidePath } from "@/lib/guide/guides";
import { buildGuideMetadata } from "@/lib/guide/seo";
import { GUIDE_FACTS as F } from "@/lib/guide/facts";
import GuideArticle from "@/components/guide/GuideArticle";
import { GuideTable, IPA_SOURCES } from "@/components/guide/GuideParts";

const guide = getGuide("it-passport-study-method");
export const metadata = buildGuideMetadata(guide);

export default function StudyMethodGuide() {
  return (
    <GuideArticle
      guide={guide}
      lead={[
        <>
          ITパスポートの勉強は、参考書を1ページ目から完璧に覚えてから過去問へ進むより、
          <strong>「全体像をつかむ→理解する→確認問題→過去問→苦手を復習→本番形式」を小さく何度も回す</strong>
          ほうが進めやすくなります。
        </>,
        <>
          IT未経験なら、最初の数日は細かい暗記をせずに3分野を一通り眺め、1テーマ学ぶごとにすぐ問題を解いて「分かったつもり」を早めに見つけるのがコツです。
        </>,
      ]}
      points={[
        { id: "exam", label: "最初に知っておきたい試験の形" },
        { id: "why-loop", label: "「参考書を完璧に→過去問」が止まりやすい理由" },
        { id: "steps", label: "6ステップの勉強の回し方" },
        { id: "beginner", label: "IT未経験者がつまずきやすい所と対策" },
      ]}
      service={<Service />}
      sources={IPA_SOURCES}
    >
      <h2 id="exam">最初に知っておきたい試験の形</h2>
      <p>勉強の順番を決める前に、何を目指すのかを押さえておきます。IPAが公表している試験の形式は次のとおりです。</p>
      <GuideTable caption="出典: IPA（本ページ末尾の出典を参照）">
        <tbody>
          <tr>
            <th scope="row">試験時間</th>
            <td>120分</td>
          </tr>
          <tr>
            <th scope="row">出題数・形式</th>
            <td>100問・多肢選択式（四肢択一）</td>
          </tr>
          <tr>
            <th scope="row">分野と出題数</th>
            <td>ストラテジ系 35問程度／マネジメント系 20問程度／テクノロジ系 45問程度</td>
          </tr>
          <tr>
            <th scope="row">合格基準</th>
            <td>総合評価点600点以上（1,000点満点）かつ、3分野それぞれの分野別評価点が300点以上（各1,000点満点）</td>
          </tr>
        </tbody>
      </GuideTable>
      <p>
        ポイントは、<strong>総合点だけでなく3分野すべてに基準がある</strong>ことです。得意分野だけ伸ばす勉強では足りず、苦手分野を「足切りにかからない」水準まで上げる必要があります。
      </p>

      <h2 id="why-loop">「参考書を完璧に→過去問」が止まりやすい理由</h2>
      <p>参考書を最初から順に読み、全部覚えてから過去問を解く一本道の進め方は、IT未経験者ほど途中で止まりやすくなります。</p>
      <ul>
        <li>
          <strong>範囲が広い</strong>：経営・法務・プロジェクト管理・ネットワーク・セキュリティなど、性質の違う内容が続く
        </li>
        <li>
          <strong>理解できたかが分からない</strong>：読むだけでは、覚えたつもりの箇所と本当に解ける箇所の区別がつかない
        </li>
        <li>
          <strong>問題に触れるのが遅い</strong>：最後に過去問を解いた時点で弱点が見つかっても、直す時間が残っていない
        </li>
      </ul>
      <p>そこで、1テーマ学んだらすぐ問題で確かめ、間違えた所だけを戻る「ループ型」にします。</p>

      <h2 id="steps">6ステップの勉強の回し方</h2>
      <p>
        各ステップは一度で終わらせるものではありません。テーマごとに2〜4を回し、全体が進んだら5と6の比重を増やしていきます。
      </p>
      <ol className="g-steps">
        <li>
          <h3>全体像をつかむ</h3>
          <p>
            3分野（ストラテジ系・マネジメント系・テクノロジ系）で何を扱うのかをざっと眺めます。知らない用語は深追いせず、「どの分野の言葉か」だけ分かれば十分です。
          </p>
          <p className="g-note">次へ進む目安: 3分野の違いを自分の言葉でざっくり説明できる。</p>
        </li>
        <li>
          <h3>テーマ別に理解する</h3>
          <p>
            1テーマずつ、定義と具体例をセットで押さえます。似た用語（例: 著作権と特許権、DNSとDHCP）は違いを比べると覚えやすくなります。
          </p>
          <p className="g-note">次へ進む目安: 定義だけでなく「どんな場面で使われるか」まで説明できる。</p>
        </li>
        <li>
          <h3>確認問題で固める</h3>
          <p>
            学んだ直後にそのテーマの問題を解きます。正解・不正解だけで終わらせず、「なぜ他の選択肢が違うのか」まで確認します。
          </p>
          <p className="g-note">次へ進む目安: 主要テーマで根拠を持って選べる問題が増えてきた。</p>
        </li>
        <li>
          <h3>過去問に触れる</h3>
          <p>
            基礎が一通りそろったら、IPAが公開している過去問を分野別に解きます。本番の言い回しや、知識をどう問われるかに慣れる段階です。
          </p>
          <p className="g-note">
            詳しくは<a href={guidePath("past-exam-strategy")}>過去問はいつから・何年分解くべきか</a>で解説しています。
          </p>
        </li>
        <li>
          <h3>苦手を復習する</h3>
          <p>
            間違えた問題を「用語を知らなかった」「読み違えた」「考え方が分かっていなかった」に分け、理解が足りない所は解説に戻ってから解き直します。新しい範囲を広げるより、同じ間違いを減らす段階です。
          </p>
        </li>
        <li>
          <h3>本番形式で仕上げる</h3>
          <p>
            100問・120分の形式で通して解き、時間配分と3分野それぞれの得点を確認します。基準に届かない分野があれば、ステップ5に戻ります。
          </p>
        </li>
      </ol>

      <h2 id="beginner">IT未経験者がつまずきやすい所と対策</h2>
      <GuideTable>
        <thead>
          <tr>
            <th scope="col">つまずき</th>
            <th scope="col">対策</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>カタカナ用語・英略語が覚えられない</td>
            <td>文章で読むより、略語の元の英語と「何をするものか」を1行で結びつける。単語カードで短く何度も触れる</td>
          </tr>
          <tr>
            <td>仕組みの話（ネットワーク・暗号など）が頭に入らない</td>
            <td>図や具体例で、データや情報がどう流れるかを追う。読むだけで分からなければ、先に問題を解いて何を問われるかを知る</td>
          </tr>
          <tr>
            <td>計算問題（損益分岐点・稼働率など）が苦手</td>
            <td>公式を暗記する前に、具体的な数字で1回計算してみる。その後に公式を見ると意味が分かりやすい</td>
          </tr>
          <tr>
            <td>どこまで覚えればいいか分からない</td>
            <td>確認問題や過去問で問われている深さを基準にする。問題で問われない細部は後回しでよい</td>
          </tr>
        </tbody>
      </GuideTable>
      <p>
        どれくらいの時間がかかるかは人によって大きく違います。見積もり方は
        <a href={guidePath("study-time")}>勉強時間のガイド</a>を参考にしてください。
      </p>
    </GuideArticle>
  );
}

function Service() {
  return (
    <>
      <p>ITパスポート学習コーチは、上の6ステップをそのまま学習の道のりにしています。</p>
      <ul>
        <li>
          教材は3分野・全{F.topicCount}トピック（
          {F.byField.map((f) => `${f.label}${f.topicCount}`).join("・")}
          ）。各トピックは操作しながら仕組みをつかむ体験と解説で構成されています
        </li>
        <li>トピックごとの確認問題（計{F.checkQuestionCount}問）で、学んだ直後に「解けるか」を確かめます</li>
        <li>
          間違えたトピックは翌日の復習に入り、正解するたびに{F.reviewIntervalDays.join("・")}日後…と間隔を広げて再確認されます
        </li>
        <li>
          基礎が進んだら、IPAの公式過去問（{F.officialYearRange}・{F.officialQuestionCount}問、解説は独自作成）を分野別→ランダム→年度別100問の順で解きます
        </li>
      </ul>
      <p>
        参考書を使っている場合は、初回設定で登録すると、毎日「参考書のどこを読むか」を案内します。学習の順番はアプリが決めるので、参考書を最初から順に読む必要はありません。
      </p>
    </>
  );
}
