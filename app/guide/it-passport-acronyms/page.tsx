import Link from "next/link";
import GuideArticle from "@/components/guide/GuideArticle";
import { GuideTable } from "@/components/guide/GuideParts";
import { getGuide } from "@/lib/guide/guides";
import { buildGuideMetadata } from "@/lib/guide/seo";

const guide = getGuide("it-passport-acronyms");
export const metadata = buildGuideMetadata(guide);

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lead={[
        "ITパスポートの英略語は、文字だけを繰り返すより「何をするものか」「何と違うか」を一緒に覚えると整理しやすくなります。正式名称は意味をつかむ手がかりに使い、具体的な場面でどの用語を選ぶかを確認しましょう。",
        "まずは似た略語を小さな組に分けます。以下は理解の練習に使う例で、出題頻度のランキングや、これだけで試験範囲を網羅できる一覧ではありません。",
      ]}
      points={[
        { id: "method", label: "英略語は「意味・具体例・似た語との違い」で覚える" },
        { id: "business", label: "似ている経営系の略語を区別する" },
        { id: "cloud", label: "SaaS・PaaS・IaaSは提供される範囲で覚える" },
        { id: "review", label: "10分でできる復習の回し方" },
        { id: "quiz", label: "意味で選べるか試す3つの確認問題" },
        { id: "faq", label: "よくある質問" },
      ]}
      sources={[
        { label: "IPA「試験要綱・シラバス」", url: "https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" },
        { label: "NIST「クラウドコンピューティングの定義（SP 800-145）」", url: "https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-145.pdf" },
      ]}
      service={<p>理解できたかを確かめるときは、<Link href="/kakomon">公開過去問</Link>を利用できます。日々の計画や復習を管理したくなったら、学習コーチの機能を確認してください。</p>}
    >
      <h2 id="method">英略語は「意味・具体例・似た語との違い」で覚える</h2>
      <p>カードに「CRM＝Customer Relationship Management」だけを書いても、場面問題で使えるとは限りません。「顧客との関係を管理・改善する」「購入履歴に応じて対応する」のように、目的と例を付け足します。</p>
      <p>覚える順番は、日本語で役割を理解する、具体例を考える、正式名称の単語と結び付ける、の順でも構いません。英語が得意でなくても、何をする仕組みなのかを説明する練習はできます。</p>
      <GuideTable caption="1語を覚えるカードの例">
        <thead><tr><th scope="col">項目</th><th scope="col">CRMの例</th></tr></thead>
        <tbody>
          <tr><th scope="row">略語</th><td>CRM</td></tr>
          <tr><th scope="row">正式名称</th><td>Customer Relationship Management</td></tr>
          <tr><th scope="row">日本語での役割</th><td>顧客との関係を管理し、継続的な取引につなげる</td></tr>
          <tr><th scope="row">具体例</th><td>顧客の購入・問い合わせ履歴を踏まえた対応</td></tr>
          <tr><th scope="row">混同しやすい語</th><td>SCMは調達から供給までの流れを管理する考え方</td></tr>
        </tbody>
      </GuideTable>

      <h2 id="business">似ている経営系の略語を区別する</h2>
      <GuideTable caption="経営・業務で使う略語の整理例">
        <thead><tr><th scope="col">略語・正式名称</th><th scope="col">意味の中心</th><th scope="col">見分ける場面</th></tr></thead>
        <tbody>
          <tr><th scope="row">KGI：Key Goal Indicator</th><td>最終目標の達成を測る指標</td><td>売上など、最終的に目指す結果</td></tr>
          <tr><th scope="row">KPI：Key Performance Indicator</th><td>目標に向かう活動や成果を測る指標</td><td>目標達成までの進捗を点検する</td></tr>
          <tr><th scope="row">CRM：Customer Relationship Management</th><td>顧客との関係の管理</td><td>顧客ごとの履歴や対応を活用する</td></tr>
          <tr><th scope="row">SCM：Supply Chain Management</th><td>供給の連鎖全体の管理</td><td>調達・生産・物流などの流れを最適化する</td></tr>
          <tr><th scope="row">ERP：Enterprise Resource Planning</th><td>企業全体の経営資源の統合的な計画・管理</td><td>会計・販売・在庫などの情報をまとめて扱う</td></tr>
        </tbody>
      </GuideTable>
      <p>KPIとKGIは、指標の名前だけで決まるわけではありません。同じ売上でも、どの目標をどの階層で管理するかによって位置づけが変わることがあります。問題文で「最終的な目標」なのか「途中の進捗」なのかを確認しましょう。</p>
      <p>CRM・SCM・ERPはどれも企業活動に関わりますが、顧客との関係、供給の流れ、企業全体の資源という対象の違いがあります。「会社のシステム」という大きなくくりのまま覚えないことがポイントです。</p>

      <h2 id="cloud">SaaS・PaaS・IaaSは提供される範囲で覚える</h2>
      <GuideTable caption="クラウドのサービスモデル">
        <thead><tr><th scope="col">略語・正式名称</th><th scope="col">利用するもの</th><th scope="col">理解のための例</th></tr></thead>
        <tbody>
          <tr><th scope="row">SaaS：Software as a Service</th><td>提供済みのアプリケーション</td><td>ブラウザなどから業務アプリを利用する</td></tr>
          <tr><th scope="row">PaaS：Platform as a Service</th><td>アプリを開発・実行するための基盤</td><td>実行環境を利用して自分のアプリを動かす</td></tr>
          <tr><th scope="row">IaaS：Infrastructure as a Service</th><td>仮想サーバーなどの基盤資源</td><td>サーバー資源を利用してOSやアプリを構成する</td></tr>
        </tbody>
      </GuideTable>
      <p>3つとも「クラウド」とだけ覚えると区別できません。完成したアプリを使いたいのか、アプリを動かす場所が欲しいのか、サーバーなどの資源から組み立てたいのか、という利用者の目的で整理します。</p>
      <p>実際の製品は複数の機能を提供することがあります。特定の製品名だけで暗記せず、問題文で何をサービスとして受け取るかを読み取ってください。</p>

      <h2 id="review">10分でできる復習の回し方</h2>
      <ol><li>似た語を3〜5個選び、まず意味の違いを読む。</li><li>説明を隠し、略語を見て日本語の役割を答える。</li><li>逆に具体例を見て、どの略語が合うか答える。</li><li>迷った2語だけ並べ直し、違いを一文で書く。</li><li>次の学習時に、答えを見ずにもう一度確認する。</li></ol>
      <p>10分は取り組みやすい区切りの例です。語数をこなすことより、説明できない語を見つけることを目的にします。英単語の綴りに時間を使いすぎる場合は、一度日本語の意味と場面の説明へ戻ってください。</p>
      <p>一覧を読み終えただけでは、思い出せるかは分かりません。<Link href="/words">英略語・用語一覧</Link>で確認した後は、説明を閉じて役割を言う、公開問題の文章で判断する、と段階を分けます。</p>

      <h2 id="quiz">意味で選べるか試す3つの確認問題</h2>
      <p>以下は記事の理解を確認するオリジナル問題です。答えを読む前に、用語だけでなく理由も考えてみてください。</p>
      <h3>問1：顧客の購入履歴を使い、顧客ごとの対応を改善したい</h3>
      <p>CRMとSCMのどちらが目的に近いでしょうか。答えは<strong>CRM</strong>です。中心となる対象が顧客との関係だからです。SCMなら調達・生産・物流などの供給の流れに着目します。</p>
      <h3>問2：完成した業務アプリを、サービスとして利用したい</h3>
      <p>SaaS・PaaS・IaaSのうち、最も直接的に当てはまるのは<strong>SaaS</strong>です。自分でアプリを開発する基盤ではなく、提供済みのアプリを使う場面だからです。</p>
      <h3>問3：最終目標を受注額とし、その達成に向けた商談数を毎週確認する</h3>
      <p>この設定で商談数は<strong>KPI</strong>の例です。最終目標へ向かう途中の進捗を測る指標として設定しています。数字の名前ではなく、目標との関係で判断します。</p>

      <h2 id="faq">よくある質問</h2>
      <h3>正式名称を全部書けるようにすべきですか？</h3>
      <p>まず意味と利用場面を説明できることを優先します。正式名称は理解の手がかりになりますが、綴りを写すだけで勉強を終えないようにしましょう。</p>
      <h3>語呂合わせは使ってもよいですか？</h3>
      <p>思い出すきっかけとして使えます。ただし語呂だけ覚えて意味が分からなければ場面問題に対応しづらいため、日本語の役割とセットにします。</p>
      <h3>何語覚えれば合格できますか？</h3>
      <p>決まった語数だけで合格は保証できません。最新シラバスで範囲を確認し、用語の理解に加えて計算や文章の読み取りも練習してください。</p>
    </GuideArticle>
  );
}
