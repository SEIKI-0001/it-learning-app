import type { Metadata } from 'next';
import Reveal from './Reveal';
import './lp.css';

// ============================================================================
// ランディングページ（未ログインでも閲覧可。proxy.ts の PUBLIC_PREFIXES に登録）。
// 購入検討ユーザーの疑問に順に答える構成:
//   誰向けか → 何をどう解決するか → 他の勉強法との違い → 料金 → FAQ → CTA
// スタイルは app/lp/lp.css（全セレクタ .lp スコープ）に閉じる。
// ============================================================================

export const metadata: Metadata = {
  title: 'ITパスポート学習コーチ — さわって理解する試験対策',
  description:
    '参考書が途中で止まってしまう人のためのITパスポート試験対策。全69トピックを操作しながら学び、試験日から逆算した「今日やること」が毎日届きます。7日間無料。',
};

const START_HREF = '/login';

export default function LandingPage() {
  return (
    <div className="lp">
      <Reveal />

      <header className="top">
        <div className="col top-in">
          <a className="logo" href="#top">
            ITパスポート学習コーチ
          </a>
          <nav className="top-nav" aria-label="ページ内">
            <a href="#pain">こんな人向け</a>
            <a href="#solve">できること</a>
            <a href="#diff">他との違い</a>
            <a href="#price">料金</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a className="btn small" href={START_HREF}>
            無料で始める
          </a>
        </div>
      </header>

      <main id="top">
        {/* ヒーロー */}
        <section className="hero">
          <div className="col">
            <div className="hero-txt">
              <p className="eyebrow">ITパスポート試験 学習アプリ</p>
              <h1>
                「読んで暗記」から、
                <br />
                <span className="marked">
                  「さわって理解」
                  <svg viewBox="0 0 100 40" aria-hidden="true" preserveAspectRatio="none">
                    <ellipse cx="50" cy="20" rx="48" ry="17" pathLength="100" />
                  </svg>
                </span>
                へ。
              </h1>
              <p className="hero-lead">
                参考書が途中で止まってしまう人のための試験対策。全69トピックを操作しながら学び、試験日から逆算した「今日やること」が毎日届きます。
              </p>
              <div className="hero-cta">
                <a className="btn" href={START_HREF}>
                  7日間無料で始める
                </a>
                <span className="hero-note">
                  クレジットカード不要
                  <br />
                  GoogleかLINEで登録
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 困りごと */}
        <section className="wash" id="pain">
          <div className="col reveal">
            <p className="eyebrow">こんな人のためのアプリです</p>
            <h2 className="sec-title">参考書で挫折したのは、あなたのせいではありません。</h2>
            <p className="sec-lead">
              ITパスポートは半分以上がカタカナ用語と抽象概念。文章を読むだけで理解するのは、IT未経験者にはそもそも難しい試験です。
            </p>
            <div className="pains">
              <div className="pain">
                <p className="q">
                  「参考書を買ったけど、<em>3章あたりで止まった</em>。カタカナ用語が右から左へ抜けていく」
                </p>
                <p className="who">― 文系の大学3年生。就活で資格欄を埋めたい</p>
              </div>
              <div className="pain">
                <p className="q">
                  「<em>何をどの順番で、どれだけ</em>やればいいのか分からない。計画を立てた時点で疲れる」
                </p>
                <p className="who">― 事務職2年目。会社に取得を勧められた</p>
              </div>
              <div className="pain">
                <p className="q">
                  「過去問サイトを開いてみたけど、<em>今の自分が合格に近いのか遠いのか</em>すら分からない」
                </p>
                <p className="who">― 転職準備中。IT業界に足がかりが欲しい</p>
              </div>
            </div>
          </div>
        </section>

        {/* 解決 */}
        <section id="solve">
          <div className="col reveal">
            <p className="eyebrow">アプリができること</p>
            <h2 className="sec-title">「理解する・続ける・合格に近づく」を、この1つで。</h2>

            <div className="solve">
              <div className="txt">
                <p className="k">理解する</p>
                <h3>全69トピックが、操作して学ぶ教材</h3>
                <p className="d">
                  スライダーを動かし、ボタンを押し、画面の変化で仕組みをつかみます。2進数・SQL・損益分岐点・公開鍵暗号——文章では入ってこなかった単元が、手を動かすと腑に落ちる。仕上げは
                  <b>過去問レベルの確認問題276問</b>（各トピック4問）と<b>英略語の単語帳103語</b>。
                </p>
              </div>
              <div className="mock" aria-hidden="true">
                <div className="mock-head">
                  体験でまなぶ「IPアドレスとDNS」<span className="date">10分</span>
                </div>
                <div className="chat" style={{ marginTop: 14 }}>
                  <div className="bubble user" style={{ maxWidth: '100%' }}>
                    example.com と入力すると……
                    <br />
                    ブラウザ → DNS「住所は？」→ <b>93.184.216.34</b>
                  </div>
                  <div className="bubble ai-b" style={{ maxWidth: '100%' }}>
                    <b>気づき:</b> ドメイン名は人間用のあだ名。機械は番号で会話している
                  </div>
                </div>
              </div>
            </div>

            <div className="solve">
              <div className="mock" aria-hidden="true">
                <div className="mock-head">
                  今日やること<span className="date">7月13日（月）・試験まで62日</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <div className="task done">
                    <span className="box">✓</span>
                    <span className="t">体験でまなぶ「損益分岐点」</span>
                    <span className="min">10分</span>
                  </div>
                  <div className="task">
                    <span className="box" />
                    <span className="t">確認問題 4問</span>
                    <span className="min">5分</span>
                  </div>
                  <div className="task">
                    <span className="box" />
                    <span className="t">英略語カード 5語（BCP、SLA…）</span>
                    <span className="min">3分</span>
                  </div>
                </div>
                <div className="mock-foot">
                  今週の進み具合: <b>順調</b>。この配分なら試験1週間前に総仕上げに入れます。
                </div>
              </div>
              <div className="txt">
                <p className="k">続ける</p>
                <h3>計画はアプリが立てて、LINEに届く</h3>
                <p className="d">
                  試験日を入れるだけで、あなたの1日の学習時間に合わせて「今日やること」を自動で組みます。毎日の合図はLINEに届くので、開く習慣づくりもアプリまかせ。遅れても責めません——
                  <b>現実的な立て直し案</b>を提案して計画を引き直します。
                </p>
              </div>
            </div>

            <div className="solve">
              <div className="txt">
                <p className="k">合格に近づく</p>
                <h3>「今の自分は受かるのか」に、数字で答える</h3>
                <p className="d">
                  確認問題・単語帳・過去問レベル演習・毎日の達成度を統合して、<b>合格準備度スコア</b>
                  を算出。弱い分野と今週の優先順位まで示します。さらにAI採点で「クラウドとは？」を自分の言葉で説明してみる——
                  <b>説明できれば、本番で選択肢に迷いません</b>。
                </p>
              </div>
              <div className="mock" aria-hidden="true">
                <div className="ringrow">
                  <div className="ring">
                    <div>
                      <span className="pct num">68%</span>
                      <span className="cap">合格準備度</span>
                    </div>
                  </div>
                  <p className="advice">
                    <b>ストラテジ系がのび悩み。</b>
                    今週は「経営のことば」を優先しましょう。テクノロジ系は仕上げ段階です。
                  </p>
                </div>
                <div className="chat" style={{ marginTop: 18 }}>
                  <div className="bubble user">
                    <span className="who">あなたの説明</span>
                    クラウドとは、自分でサーバーを持たずにネット経由で借りて使う仕組み……
                  </div>
                  <div className="bubble ai-b">
                    <span className="who">AI採点</span>
                    <span className="score">85点。</span>
                    「必要な分だけ使える（従量課金）」の観点が書ければ満点です。
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 比較 */}
        <section className="wash" id="diff">
          <div className="col reveal">
            <p className="eyebrow">ほかの勉強法との違い</p>
            <h2 className="sec-title">「教材」ではなく、計画と進捗まで持つ「コーチ」です。</h2>
            <p className="sec-lead">
              参考書にも過去問サイトにも良さがあります。違いは、理解のさせ方と、合格までの道のりを誰が管理するかです。
            </p>
            <div className="tbl-scroll">
              <table className="cmp">
                <thead>
                  <tr>
                    <th scope="col" />
                    <th scope="col" className="you">
                      このアプリ
                    </th>
                    <th scope="col">参考書</th>
                    <th scope="col">無料の過去問サイト</th>
                    <th scope="col">動画講座</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">理解のしかた</th>
                    <td className="you">
                      <span className="good">◎</span> さわって体験する
                    </td>
                    <td className="meh">読む</td>
                    <td className="meh">解くだけ</td>
                    <td className="meh">視聴する</td>
                  </tr>
                  <tr>
                    <th scope="row">学習計画</th>
                    <td className="you">
                      <span className="good">◎</span> 試験日から自動で毎日組む
                    </td>
                    <td className="meh">自分で立てる</td>
                    <td className="meh">なし</td>
                    <td className="meh">固定カリキュラム</td>
                  </tr>
                  <tr>
                    <th scope="row">合格ラインとの距離</th>
                    <td className="you">
                      <span className="good">◎</span> 合格準備度スコアで可視化
                    </td>
                    <td className="meh">分からない</td>
                    <td className="meh">正答率のみ</td>
                    <td className="meh">分からない</td>
                  </tr>
                  <tr>
                    <th scope="row">続ける仕組み</th>
                    <td className="you">
                      <span className="good">◎</span> LINE通知・遅れたら立て直し案
                    </td>
                    <td className="meh">意志力しだい</td>
                    <td className="meh">意志力しだい</td>
                    <td className="meh">意志力しだい</td>
                  </tr>
                  <tr>
                    <th scope="row">費用のめやす</th>
                    <td className="you">無料〜月¥980</td>
                    <td className="meh">1,500〜2,000円</td>
                    <td className="meh">無料</td>
                    <td className="meh">数千〜数万円</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="tbl-note">
              ※ 参考書・過去問サイト・動画講座は一般的なサービスの傾向です。併用ももちろん有効です。
            </p>
          </div>
        </section>

        {/* 料金 */}
        <section id="price">
          <div className="col reveal">
            <p className="eyebrow">料金</p>
            <h2 className="sec-title">まず7日間、全部無料で。合わなければそのままで大丈夫。</h2>

            <div className="free-banner">
              <p className="big">
                最初の<span>7日間は全機能無料</span>
              </p>
              <p>
                学習記録もAI採点もすべて使えます。クレジットカードの登録は不要。無料期間が終わっても、
                <b style={{ color: 'var(--ink)' }}>教材での学習は無料のまま</b>
                続けられます（学習記録とAI採点が停止します）。
              </p>
            </div>

            <div className="plans">
              <div className="plan">
                <p className="pname">買い切り 1ヶ月</p>
                <p className="pprice">¥980</p>
                <p className="pdesc">直前の追い込みに。自動更新なし・解約手続き不要。</p>
              </div>
              <div className="plan">
                <p className="pname">買い切り 3ヶ月</p>
                <p className="pprice">¥2,340</p>
                <p className="permo">月あたり¥780</p>
                <p className="pdesc">標準的な学習期間にあわせて。自動更新なし。</p>
              </div>
              <div className="plan reco">
                <span className="flag">いちばんお得</span>
                <p className="pname">買い切り 6ヶ月</p>
                <p className="pprice">¥3,480</p>
                <p className="permo">月あたり¥580</p>
                <p className="pdesc">じっくり確実に。自動更新なし・解約手続き不要。</p>
              </div>
              <div className="plan">
                <p className="pname">月額プラン</p>
                <p className="pprice">
                  ¥980<small>/月</small>
                </p>
                <p className="permo">初月20%オフ</p>
                <p className="pdesc">短期集中か迷っている人に。いつでも解約できます。</p>
              </div>
            </div>

            <p className="pay-note">
              <b>買い切りプランに自動更新はありません。</b>
              期間が終わると自動で無料の状態に戻るだけなので、解約を忘れる心配がありません。
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="wash" id="faq">
          <div className="narrow reveal">
            <p className="eyebrow">よくある質問</p>
            <h2 className="sec-title">はじめる前の疑問に答えます。</h2>
            <div className="faq">
              <details>
                <summary>ITの知識がゼロでも大丈夫ですか？</summary>
                <p className="a">
                  はい、<b>むしろゼロの人のために作られています</b>
                  。全トピックが「まず操作してみる→画面の変化で気づく」の順で進むので、前提知識なしで始められます。カタカナ用語は英略語の単語帳103語でフォローします。
                </p>
              </details>
              <details>
                <summary>1日どれくらい勉強すれば合格できますか？</summary>
                <p className="a">
                  1回の学習は<b>3分から</b>
                  設計されています。試験日と1日に使える時間を入れると、アプリが毎日の分量を自動で配分します。忙しい週があっても、立て直し案で計画を引き直せます。
                </p>
              </details>
              <details>
                <summary>スマホだけで使えますか？アプリのインストールは？</summary>
                <p className="a">
                  スマホのブラウザでそのまま動きます。<b>インストールは不要</b>
                  です。通勤・通学の空き時間で完結するように作られています。毎日の合図はLINEで受け取れます。
                </p>
              </details>
              <details>
                <summary>無料期間が終わったらどうなりますか？</summary>
                <p className="a">
                  教材（69トピックの体験・解説）は<b>無料のまま学習を続けられます</b>
                  。学習記録・合格準備度スコア・AI採点を使い続ける場合だけ、¥980からのプランを選んでください。
                </p>
              </details>
              <details>
                <summary>解約はかんたんにできますか？</summary>
                <p className="a">
                  買い切りプランは<b>そもそも解約が不要</b>
                  です（自動更新がありません）。月額プランは設定画面からいつでも解約でき、日割りの引き止めなどもありません。
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* 最後のCTA */}
        <section className="last">
          <div className="narrow reveal">
            <h2>今日の3分から、合格までの計画が始まります。</h2>
            <p>
              試験日を入れれば、今日やることはアプリが決めます。
              <br />
              あなたは開いて、さわるだけ。
            </p>
            <a className="btn" href={START_HREF}>
              7日間無料で始める
            </a>
            <span className="hero-note">
              クレジットカード不要・GoogleかLINEで登録・買い切りプランは自動更新なし
            </span>
          </div>
        </section>
      </main>

      <footer>
        ITパスポート学習コーチ
        <br />
        <a href={START_HREF}>ログイン / 無料登録</a>
      </footer>
    </div>
  );
}
