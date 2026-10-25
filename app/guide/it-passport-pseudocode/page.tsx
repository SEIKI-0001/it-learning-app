import Link from "next/link";
import GuideArticle from "@/components/guide/GuideArticle";
import { GuideTable } from "@/components/guide/GuideParts";
import { getGuide } from "@/lib/guide/guides";
import { buildGuideMetadata } from "@/lib/guide/seo";

const guide = getGuide("it-passport-pseudocode");
export const metadata = buildGuideMetadata(guide);

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lead={[
        "ITパスポートの擬似言語は、処理の手順を読み、変数の値がどう変わるかを追うことから始めます。プログラム全体を一度に理解しようとせず、初期値、条件、更新の順に表へ書き出すと整理できます。",
        "ここでは、代入・条件分岐・繰返しの解き方をオリジナル例題で確認します。実際の試験では、IPAの記述形式と各問題の注記に従って読んでください。",
      ]}
      points={[
        { id: "basics", label: "擬似言語とは？まず読む3つの処理" },
        { id: "assignment", label: "例題1：代入の順番を追う" },
        { id: "branch", label: "例題2：ifの条件が成り立つ側だけ実行する" },
        { id: "loop", label: "例題3：whileを表で追う" },
        { id: "mistakes", label: "配列・初期値・終了条件で間違えないために" },
        { id: "practice", label: "苦手な人の練習順序とよくある質問" },
      ]}
      sources={[
        { label: "IPA「試験要綱・シラバス」", url: "https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" },
        { label: "IPA「試験で使用する情報技術に関する用語・プログラム言語など Ver.5.1」", url: "https://www.ipa.go.jp/shiken/syllabus/doe3um0000002djj-att/shiken_yougo_ver5_1.pdf" },
        { label: "IPA「ITパスポート試験 擬似言語のサンプル問題」", url: "https://www.ipa.go.jp/shiken/syllabus/ps6vr7000000i9in-att/ip_programming_sample.pdf" },
      ]}
      service={<p>理解できたかを確かめるときは、<Link href="/kakomon">公開過去問</Link>を利用できます。日々の計画や復習を管理したくなったら、学習コーチの機能を確認してください。</p>}
    >
      <h2 id="basics">擬似言語とは？まず読む3つの処理</h2>
      <GuideTable caption="最初に押さえる読み方">
        <thead><tr><th scope="col">記述</th><th scope="col">意味</th><th scope="col">確認すること</th></tr></thead>
        <tbody>
          <tr><th scope="row">x ← 式</th><td>右側の計算結果をxに入れる</td><td>更新前の値で右側を計算する</td></tr>
          <tr><th scope="row">if … else … endif</th><td>条件によって処理を選ぶ</td><td>実行しない側の処理を混ぜない</td></tr>
          <tr><th scope="row">while … endwhile</th><td>条件が真である間、処理を繰り返す</td><td>条件を確かめる時点と終了条件</td></tr>
        </tbody>
      </GuideTable>
      <p>擬似言語は、特定のプログラミング言語の文法をそのまま覚えるものではありません。IPAはITパスポート用の記述形式を示しています。PythonやJavaの知識があっても、代入記号や添字の条件は問題文に合わせて読みましょう。</p>
      <p>「←」は等しいことの宣言ではなく、値を入れ直す操作です。たとえばxが3なら「x ← x ＋ 2」の後のxは5です。数学の方程式として読むと混乱するので、右側を計算してから左側を更新します。</p>

      <h2 id="assignment">例題1：代入の順番を追う</h2>
      <p>次の処理を順に実行した後、xとyはいくつになるでしょうか。ここでは変数はいずれも整数とします。</p>
      <pre><code>{"x ← 4\ny ← x ＋ 3\nx ← y × 2"}</code></pre>
      <GuideTable caption="代入のトレース表">
        <thead><tr><th scope="col">処理後</th><th scope="col">x</th><th scope="col">y</th></tr></thead>
        <tbody>
          <tr><th scope="row">x ← 4</th><td>4</td><td>未設定</td></tr>
          <tr><th scope="row">y ← x ＋ 3</th><td>4</td><td>7</td></tr>
          <tr><th scope="row">x ← y × 2</th><td>14</td><td>7</td></tr>
        </tbody>
      </GuideTable>
      <p>答えは<strong>x＝14、y＝7</strong>です。最後にxを14へ変えても、すでにyに入れた7は自動では変わりません。変数同士をずっと結び付ける式ではなく、各行を実行した時点で値を入れる処理だからです。</p>

      <h2 id="branch">例題2：ifの条件が成り立つ側だけ実行する</h2>
      <p>次の処理で、scoreが65のときresultには何が入るでしょうか。scoreとresultは整数とします。</p>
      <pre><code>{"if (score ≧ 60)\n  result ← 1\nelse\n  result ← 0\nendif"}</code></pre>
      <p>65は60以上なので条件は真です。実行するのは「result ← 1」であり、答えは<strong>1</strong>です。else側は実行しないため、最後に0で上書きされることはありません。</p>
      <p>境界も確認しましょう。scoreが60なら条件は真、59なら偽です。「以上」と「より大きい」を取り違えると境界値で答えが変わります。選択肢を見る前に、どちらの処理を通るか決めてください。</p>

      <h2 id="loop">例題3：whileを表で追う</h2>
      <p>次の処理が終わったとき、totalはいくつでしょうか。totalとiは整数です。</p>
      <pre><code>{"total ← 0\ni ← 1\nwhile (i ≦ 3)\n  total ← total ＋ i\n  i ← i ＋ 1\nendwhile"}</code></pre>
      <GuideTable caption="繰返しの条件確認と更新">
        <thead><tr><th scope="col">条件確認時のi</th><th scope="col">i ≦ 3</th><th scope="col">処理後のtotal</th><th scope="col">更新後のi</th></tr></thead>
        <tbody>
          <tr><th scope="row">1</th><td>真</td><td>1</td><td>2</td></tr>
          <tr><th scope="row">2</th><td>真</td><td>3</td><td>3</td></tr>
          <tr><th scope="row">3</th><td>真</td><td>6</td><td>4</td></tr>
          <tr><th scope="row">4</th><td>偽</td><td>6（変化なし）</td><td>4（変化なし）</td></tr>
        </tbody>
      </GuideTable>
      <p>答えは<strong>6</strong>です。最後の条件確認ではiが4になっているため繰返しを終えます。4回目の加算は行いません。条件を確認した回数と、中の処理を実行した回数が違う点に注意してください。</p>
      <p>また、加算した後にiを増やしています。もし順序を入れ替えれば、加算に使う値が変わります。「繰返しだから1＋2＋3」と即断せず、更新する順番も追いましょう。</p>

      <h2 id="mistakes">配列・初期値・終了条件で間違えないために</h2>
      <h3>配列の添字と値を分ける</h3>
      <p>要素番号が1から始まり、値が10、20、30と並ぶ配列なら、2番目の値は20です。「2」は位置、「20」は入っている値です。要素番号の開始位置は、普段使う言語の習慣ではなく問題の条件を確認してください。</p>
      <h3>繰返しの最初と最後を書く</h3>
      <p>何度も同じ処理が続く場合でも、最初の1回、最後の実行、終了する条件確認を省かないようにします。whileは最初に条件が偽なら中の処理を一度も実行しません。</p>
      <h3>出力する値を取り違えない</h3>
      <p>処理の意味が分かっても、最後に聞かれているのが合計値か、回数か、添字かで答えは変わります。例題3ならtotalは6ですが、終了時のiは4です。問題文の「何を答えるか」に戻って確認してください。</p>

      <h2 id="practice">苦手な人の練習順序とよくある質問</h2>
      <p>最初は短い代入だけ、次にif、最後に繰返しへ進みます。正解したら初期値や境界値を変え、同じ手順で説明できるか試してください。表を書かずに当たった問題も、一度は値の変化を確かめます。</p>
      <h3>実際にプログラムを書けないと解けませんか？</h3>
      <p>まず必要なのは、与えられた処理を読んで追う力です。開発環境を用意する前に、短い処理を紙でトレースしてみましょう。公式サンプル問題でも表記を確認できます。</p>
      <h3>アルゴリズム問題は捨ててもよいですか？</h3>
      <p>すべて避ける前に、代入や短い繰返しを試してください。本番で時間がかかる問題を後回しにする判断と、学習段階で基礎を飛ばす判断は別です。</p>
      <h3>暗算だけで解いたほうが速いですか？</h3>
      <p>値の更新を取り違えやすいなら、表を書いたほうが確認しやすくなります。速さを求める前に、初期値・条件・更新を漏らさず追える状態を目指します。</p>
    </GuideArticle>
  );
}
