import { getGuide, guidePath } from "@/lib/guide/guides";
import { buildGuideMetadata } from "@/lib/guide/seo";
import { GUIDE_FACTS as F } from "@/lib/guide/facts";
import GuideArticle from "@/components/guide/GuideArticle";
import { GuideTable } from "@/components/guide/GuideParts";

const guide = getGuide("cant-continue-studying");
export const metadata = buildGuideMetadata(guide);

const CAUSES = [
  { id: "not-understand", cause: "内容が分からない", sign: "同じページを何度も読んでいる／用語の意味が頭に残らない", first: "そのテーマを飛ばして先に問題を1問解く" },
  { id: "cant-decide", cause: "何をやるか決められない", sign: "机に向かっても、どこから手をつけるか迷って終わる", first: "今日やることを前日のうちに1つだけ決めておく" },
  { id: "too-much", cause: "量が多すぎる", sign: "参考書の残りページを見て気が重くなる", first: "1回の単位を5〜15分に切る" },
  { id: "keep-missing", cause: "間違いが続く", sign: "問題を解くたびに不正解で、自信がなくなる", first: "間違いの種類を3つに分ける" },
  { id: "gap", cause: "学習が途切れた", sign: "数日空いてしまい、再開のきっかけがない", first: "5分で終わる復習から戻る" },
];

export default function CantContinueGuide() {
  return (
    <GuideArticle
      guide={guide}
      lead={[
        <>
          ITパスポートの勉強が止まる原因は、やる気や根性よりも、
          <strong>「内容が分からない」「何をやるか決められない」「量が多すぎる」「間違いが続く」「一度途切れた」</strong>
          といった具体的な詰まりであることがほとんどです。
        </>,
        <>自分がどれに当てはまるかを見分け、その詰まりだけを外せば、今日から再開できます。</>,
      ]}
      points={[
        { id: "causes", label: "勉強が止まる5つの原因の見分け方" },
        ...CAUSES.map((c) => ({ id: c.id, label: `「${c.cause}」ときの再開方法` })),
        { id: "book", label: "参考書で挫折した場合の使い方の変え方" },
      ]}
      service={<Service />}
    >
      <h2 id="causes">勉強が止まる5つの原因の見分け方</h2>
      <p>止まっている理由を「やる気がない」でまとめず、次のどれに近いかを確認します。複数当てはまる場合は、表の上から順に対処します。</p>
      <GuideTable>
        <thead>
          <tr>
            <th scope="col">原因</th>
            <th scope="col">よくあるサイン</th>
            <th scope="col">最初の一手</th>
          </tr>
        </thead>
        <tbody>
          {CAUSES.map((c) => (
            <tr key={c.id}>
              <th scope="row">
                <a href={`#${c.id}`}>{c.cause}</a>
              </th>
              <td>{c.sign}</td>
              <td>{c.first}</td>
            </tr>
          ))}
        </tbody>
      </GuideTable>

      <h2 id="not-understand">「内容が分からない」ときの再開方法</h2>
      <p>ITパスポートは、カタカナ用語や目に見えない仕組み（ネットワーク・暗号など）が多く、文章だけで理解しにくい範囲があります。</p>
      <ul>
        <li>
          <strong>分からないテーマで止まらない</strong>：いったん飛ばして、分かりそうなテーマを先に進める。3分野は独立した内容が多く、順番どおりでなくても進められる
        </li>
        <li>
          <strong>先に問題を見る</strong>：何が問われるかを知ってから解説に戻ると、読むべき所が絞れる
        </li>
        <li>
          <strong>具体例と図で理解する</strong>：定義の文章より、「どんな場面で使うか」の例や、データの流れの図を先に見る
        </li>
      </ul>

      <h2 id="cant-decide">「何をやるか決められない」ときの再開方法</h2>
      <p>毎回「今日は何をしよう」と考えるところから始めると、それだけで疲れてしまいます。決める作業と勉強を切り離します。</p>
      <ul>
        <li>前日の終わりに、翌日やることを1つだけ決めておく</li>
        <li>迷ったら「前回間違えた問題の解き直し」から始めると決めておく</li>
        <li>
          試験日から逆算した計画を一度作り、毎日はそれに従う（<a href={guidePath("study-plan")}>学習計画の立て方</a>）
        </li>
      </ul>

      <h2 id="too-much">「量が多すぎる」ときの再開方法</h2>
      <p>「今日は1章」のように大きな単位で決めると、終わらなかった日に止まりやすくなります。</p>
      <ul>
        <li>1回の単位を5〜15分に小さくする。1テーマ＋確認問題数問で1回と数える</li>
        <li>残りページ数ではなく「今日終えた数」を数える</li>
        <li>
          全範囲を同じ深さで覚えようとしない。問題で問われる深さに合わせる（
          <a href={guidePath("study-time")}>ムダな学習時間を減らす方法</a>）
        </li>
      </ul>

      <h2 id="keep-missing">「間違いが続く」ときの再開方法</h2>
      <p>間違いが続くのは、弱点が見つかっているということです。ただし、同じやり方で解き続けても正答率は上がりにくいので、間違いを分類します。</p>
      <GuideTable>
        <thead>
          <tr>
            <th scope="col">間違いの種類</th>
            <th scope="col">対処</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">用語を知らなかった</th>
            <td>用語の意味を1行で確認し、翌日にもう一度同じ問題を解く</td>
          </tr>
          <tr>
            <th scope="row">問題文を読み違えた</th>
            <td>「適切なもの／適切でないもの」など、問われ方に印をつけて解く</td>
          </tr>
          <tr>
            <th scope="row">考え方が分かっていなかった</th>
            <td>問題を解くのをやめ、そのテーマの解説や具体例に戻ってから解き直す</td>
          </tr>
        </tbody>
      </GuideTable>
      <p>過去問で間違いが続く場合は、過去問に進むのが早すぎた可能性もあります。テーマごとの確認問題に一度戻ると、どこが抜けているかを特定しやすくなります。</p>

      <h2 id="gap">「学習が途切れた」ときの再開方法</h2>
      <p>数日空いた後に、止まった所から通常の量で再開しようとすると、負担が大きく感じられます。</p>
      <ul>
        <li>再開初日は5分で終わる内容だけにする（前に解いた問題の復習がちょうどよい）</li>
        <li>空いた日の分を取り戻そうとしない。遅れは翌日以降の計画で吸収する</li>
        <li>試験日までの時間が足りなくなったら、頻出・苦手・過去問を優先する計画に組み替えるか、試験日をずらすことも検討する</li>
      </ul>

      <h2 id="book">参考書で挫折した場合の使い方の変え方</h2>
      <p>参考書が悪いのではなく、「最初から順に読み切る」使い方が合っていない場合があります。</p>
      <ul>
        <li>参考書を「最初から読む本」から「分からない所を調べる本」に変える</li>
        <li>問題を先に解き、間違えたテーマの章・節だけを読む</li>
        <li>章の順番どおりでなく、試験日までの計画に沿って必要な所から読む</li>
      </ul>
      <p>
        勉強全体の回し方は<a href={guidePath("it-passport-study-method")}>ITパスポートの勉強法</a>で解説しています。
      </p>
    </GuideArticle>
  );
}

function Service() {
  return (
    <>
      <p>ITパスポート学習コーチは、上の詰まりを仕組みで減らすように作られています。</p>
      <GuideTable>
        <thead>
          <tr>
            <th scope="col">詰まり</th>
            <th scope="col">アプリの仕組み</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">内容が分からない</th>
            <td>全{F.topicCount}トピックを、操作しながら仕組みをつかむ体験と解説で学ぶ</td>
          </tr>
          <tr>
            <th scope="row">何をやるか決められない</th>
            <td>試験日から逆算した「今日やること」をアプリが毎日決める。合図はLINEでも受け取れる</td>
          </tr>
          <tr>
            <th scope="row">量が多すぎる</th>
            <td>忙しい日はその日の学習量を{F.studyAmountOptions.join("・")}分から選べる</td>
          </tr>
          <tr>
            <th scope="row">間違いが続く</th>
            <td>間違えたテーマは復習に自動で回り、翌日から間隔を広げて再確認する</td>
          </tr>
          <tr>
            <th scope="row">学習が途切れた</th>
            <td>
              {F.comebackDaysAway}日以上空いたときは{F.comebackMinutes}分以内で終わる復帰ルートを出す。遅れや弱点が目立つときは立て直し案を提示し、承認したときだけ計画を引き直す
            </td>
          </tr>
        </tbody>
      </GuideTable>
      <p>使っている参考書を登録すると、その日の学習に対応する参考書の章・節も案内します。</p>
    </>
  );
}
