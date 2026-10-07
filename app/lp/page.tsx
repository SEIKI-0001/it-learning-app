import type { Metadata } from 'next';
import Link from 'next/link';
import { GUIDE_FACTS } from '@/lib/guide/facts';
import { getWordlistCount } from '@/lib/wordlist';
import { themeExams } from '@/data/themeExams';
import { MOCK_EXAM_RULE } from '@/lib/mockExam';
import {
  BILLING_PLANS,
  DAILY_LIMITS,
  FREE_RECORDING_DAYS,
  type BillingPlanKey,
} from '@/lib/billing/constants';
import Reveal from './Reveal';
import './lp.css';

// ============================================================================
// ランディングページ（未ログインでも閲覧可。proxy.ts の PUBLIC_PREFIXES に登録）。
// 購入検討ユーザーの疑問に順に答える構成:
//   誰向けか → 何をどう解決するか → 他の勉強法との違い → 料金 → FAQ → CTA
// スタイルは app/lp/lp.css（全セレクタ .lp スコープ）に閉じる。
// 収録数・料金・回数はベタ書きせず、教材データと課金定数から読む（数字だけ古くなるのを防ぐ）。
// ============================================================================

const SITE_URL = 'https://shikaku-mochit.com';

const N = {
  topics: GUIDE_FACTS.topicCount,
  checkQuestions: GUIDE_FACTS.checkQuestionCount,
  official: GUIDE_FACTS.officialQuestionCount,
  officialRange: GUIDE_FACTS.officialYearRange,
  words: getWordlistCount(),
  mock: MOCK_EXAM_RULE.questionCount,
  themeExamQuestions: themeExams.reduce((s, e) => s + e.questionIds.length, 0),
  freeDays: FREE_RECORDING_DAYS,
  freeGrading: DAILY_LIMITS.free,
  proGrading: DAILY_LIMITS.pro,
};

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;
const plan = (key: BillingPlanKey) => BILLING_PLANS.find((p) => p.key === key)!;
const MONTHLY = plan('sub_monthly');
const LOWEST_PRICE = Math.min(...BILLING_PLANS.map((p) => p.totalJpy));

const LP_TITLE = 'ITパスポート学習コーチ — さわって理解する試験対策アプリ';
const LP_DESCRIPTION = `参考書が途中で止まってしまう人のためのITパスポート試験対策。全${N.topics}トピックを操作しながら学び、公式過去問${N.official}問で本番に慣れる。試験日から逆算した「今日やること」をアプリが毎日組み立てます。${N.freeDays}日間無料。`;

// 検索結果・SNS共有（X/LINE/Facebook）のカード表示用。OG画像は public/og/lp.png（1200x630）。
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: LP_TITLE,
  description: LP_DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: '/lp' },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: '/lp',
    siteName: 'ITパスポート学習コーチ',
    title: LP_TITLE,
    description: LP_DESCRIPTION,
    images: [{ url: '/og/lp.png', width: 1200, height: 630, alt: '「読んで暗記」から「さわって理解」へ。ITパスポート学習コーチ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: LP_TITLE,
    description: LP_DESCRIPTION,
    images: ['/og/lp.png'],
  },
};

// FAQ は本文表示と構造化データ（FAQPage）の両方に使う。a は [前半, 太字, 後半] で持つ。
// q の「|」は表示時の折り返し位置（ph）で、構造化データでは取り除く。
const FAQS: { q: string; a: [string, string, string] }[] = [
  {
    q: 'ITの知識が|ゼロでも|大丈夫ですか？',
    a: [
      'はい、',
      'むしろゼロの人のために作られています',
      `。全トピックが「まず操作してみる→画面の変化で気づく」の順で進むので、前提知識なしで始められます。カタカナ用語は英略語の単語帳${N.words}語でフォローします。`,
    ],
  },
  {
    q: '1日どれくらい|勉強すれば|合格できますか？',
    a: [
      '試験日と1日に使える時間を入れると、アプリが毎日の分量を自動で配分します。平日は',
      '1日10分から',
      '計画でき、余裕がない日はその日だけ「5分」に減らすこともできます。忙しい週が続いても、立て直し案で計画を引き直せます。',
    ],
  },
  {
    q: 'スマホだけで|使えますか？|アプリの|インストールは？',
    a: [
      'スマホのブラウザでそのまま動きます。',
      'インストールは不要',
      'です。通勤・通学の空き時間で完結するように作られています。LINEと連携すると、毎日の合図をLINEで受け取れます。',
    ],
  },
  {
    q: '過去問は|入っていますか？',
    a: [
      'はい。IPAが公開している',
      `${N.officialRange}の公式過去問${N.official}問`,
      `を、年度ごとに本番の並びのまま解けます。解説はアプリが独自に作成したものです。仕上げには本番形式の${N.mock}問模試も使えます。`,
    ],
  },
  {
    q: '無料期間が|終わったら|どうなりますか？',
    a: [
      `教材（${N.topics}トピックの体験・解説）と公式過去問は`,
      '無料のまま学習を続けられます',
      `。AI採点も1日${N.freeGrading}回まで無料です。解答結果や進捗を記録し続け、合格準備度や計画に反映させたい場合だけ、${yen(LOWEST_PRICE)}からのプランを選んでください。`,
    ],
  },
  {
    q: '解約は|かんたんに|できますか？',
    a: [
      '買い切りプランは',
      'そもそも解約が不要',
      'です（自動更新がありません）。月額プランは設定画面からいつでも解約でき、解約しても期間の終わりまではそのまま使えます。',
    ],
  },
];

// Google 検索のリッチリザルト用（FAQ・アプリ情報）。本文と同じデータから生成する。
const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ITパスポート学習コーチ',
    url: `${SITE_URL}/lp`,
    description: LP_DESCRIPTION,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    inLanguage: 'ja',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY', description: `${N.freeDays}日間無料。以降も教材と公式過去問は無料` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q.replaceAll('|', ''),
      acceptedAnswer: { '@type': 'Answer', text: a.join('') },
    })),
  },
];

const START_HREF = '/login';
const TRY_HREF = '/lp/try';

const STATS: { value: number; unit: string; label: string }[] = [
  { value: N.topics, unit: 'トピック', label: '操作して学ぶ教材' },
  { value: N.official, unit: '問', label: `公式過去問|（${N.officialRange}）` },
  { value: N.checkQuestions, unit: '問', label: 'トピックごとの|確認問題' },
  { value: N.words, unit: '語', label: '英略語の単語帳' },
];

const PLANS: { key: BillingPlanKey; name: string; desc: string; reco?: boolean }[] = [
  { key: 'one_1m', name: '買い切り 1ヶ月', desc: '直前の|追い込みに。|自動更新なし・|解約手続き不要。' },
  { key: 'one_3m', name: '買い切り 3ヶ月', desc: '標準的な|学習期間に|あわせて。|自動更新なし。' },
  { key: 'one_6m', name: '買い切り 6ヶ月', desc: 'じっくり確実に。|自動更新なし・|解約手続き不要。', reco: true },
  { key: 'sub_monthly', name: '月額プラン', desc: '期間を|決めかねている|人に。|いつでも|解約できます。' },
];

// 見出しなどを文節で折り返す。Safari は word-break: auto-phrase に未対応で、スマホ幅だと
// 「あなたのせいで|はありません」のように語の途中で改行されるため、「|」で区切った文節を
// inline-block にして文節の切れ目でだけ折り返させる。
function ph(text: string) {
  return text.split('|').map((s, i) => (
    <span key={i} className="ph">
      {s}
    </span>
  ));
}

// 比較表。スマホ幅では行ごとのカードに組み替えるため、他の勉強法のセルに列名（短縮形）を data-label で持たせる。
// セルの「|」は ph の折り返し位置。
const CMP_OTHERS = [
  { name: '参考書', short: '参考書' },
  { name: '無料の過去問サイト', short: '過去問サイト' },
  { name: '動画講座', short: '動画講座' },
];
const CMP_ROWS: { label: string; you: string; plain?: boolean; others: [string, string, string] }[] = [
  { label: '理解のしかた', you: 'さわって|体験する', others: ['読む', '解くだけ', '視聴する'] },
  { label: '学習計画', you: '試験日から|自動で毎日組む', others: ['自分で|立てる', 'なし', '固定|カリキュラム'] },
  {
    label: '本番形式の演習',
    you: `公式過去問${N.official}問＋|${N.mock}問模試`,
    others: ['巻末の|模擬問題', '過去問を|解ける', '講座に|よる'],
  },
  { label: '合格ラインとの距離', you: '合格準備度スコアで|可視化', others: ['分から|ない', '正答率|のみ', '分から|ない'] },
  { label: '続ける仕組み', you: 'LINEの合図・|遅れたら|立て直し案', others: ['意志力|しだい', '意志力|しだい', '意志力|しだい'] },
  {
    label: '費用のめやす',
    you: `無料〜月${yen(MONTHLY.perMonthJpy)}`,
    plain: true,
    others: ['1,500〜|2,000円', '無料', '数千〜|数万円'],
  },
];

function Check() {
  return (
    <svg className="ck" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="lp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
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
          <div className="col hero-grid">
            <div className="hero-txt">
              <p className="eyebrow">ITパスポート試験の学習アプリ</p>
              <h1>
                <span className="ph">「読んで暗記」から、</span>
                <br />
                <span className="ph">
                  <span className="marked">
                    「さわって理解」
                    <svg viewBox="0 0 100 40" aria-hidden="true" preserveAspectRatio="none">
                      <ellipse cx="50" cy="20" rx="48" ry="17" pathLength="100" />
                    </svg>
                  </span>
                  へ。
                </span>
              </h1>
              <p className="hero-lead">
                参考書が途中で止まってしまう人のための試験対策。全{N.topics}トピックを操作しながら学び、公式過去問{N.official}問で本番に慣れる。試験日から逆算した「今日やること」を、アプリが毎日組み立てます。
              </p>
              <div className="hero-cta">
                <a className="btn" href={TRY_HREF}>
                  登録なしで教材を体験する
                </a>
                <a className="btn ghost" href={START_HREF}>
                  無料登録して始める
                </a>
              </div>
              <ul className="hero-points">
                <li>
                  <Check />
                  教材と公式過去問はずっと無料
                </li>
                <li>
                  <Check />
                  学習記録も最初の{N.freeDays}日間無料
                </li>
                <li>
                  <Check />
                  インストール不要・カード登録不要
                </li>
              </ul>
            </div>

            <figure className="hero-media">
              <video
                className="story-video"
                controls
                playsInline
                preload="none"
                poster="/lp/story/story-v2-poster.webp"
                width={1920}
                height={1080}
                aria-label="理解する・測る・次を決める：約75秒のサービス紹介動画"
                aria-describedby="story-note"
              >
                <source src="/lp/story/story-v2.mp4" type="video/mp4" />
                <track
                  kind="captions"
                  src="/lp/story/story-v2.ja.vtt"
                  srcLang="ja"
                  label="日本語"
                />
                <a href="/lp/story/story-v2.mp4">紹介動画を再生する</a>
              </video>
              <figcaption>
                <span className="cap-title">約75秒でわかる、新しい勉強の進め方</span>
                <span id="story-note" className="story-note">
                  {ph('日本語音声・字幕付き|（音声：VOICEVOX:春日部つむぎ）。|画面内の学習データは|撮影用の一例です。')}
                </span>
              </figcaption>
            </figure>
          </div>

          <div className="col">
            <dl className="stats" aria-label="収録内容">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt>{ph(s.label)}</dt>
                  <dd>
                    {s.value.toLocaleString('ja-JP')}
                    <small>{s.unit}</small>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* 困りごと */}
        <section className="wash" id="pain">
          <div className="col reveal">
            <p className="eyebrow">こんな人のためのアプリです</p>
            <h2 className="sec-title">{ph('参考書で|挫折したのは、|あなたのせいでは|ありません。')}</h2>
            <p className="sec-lead">
              ITパスポートは半分以上がカタカナ用語と抽象概念。文章を読むだけで理解するのは、IT未経験者にはそもそも難しい試験です。
            </p>
            <div className="pains">
              <figure className="pain">
                <blockquote className="q">
                  参考書を買ったけど、<em>3章あたりで止まった</em>。カタカナ用語が右から左へ抜けていく。
                </blockquote>
                <figcaption className="who">文系の大学3年生。就活で資格欄を埋めたい</figcaption>
              </figure>
              <figure className="pain">
                <blockquote className="q">
                  <em>何をどの順番で、どれだけ</em>やればいいのか分からない。計画を立てた時点で疲れる。
                </blockquote>
                <figcaption className="who">事務職2年目。会社に取得を勧められた</figcaption>
              </figure>
              <figure className="pain">
                <blockquote className="q">
                  過去問サイトを開いてみたけど、<em>今の自分が合格に近いのか遠いのか</em>すら分からない。
                </blockquote>
                <figcaption className="who">転職準備中。IT業界に足がかりが欲しい</figcaption>
              </figure>
            </div>
            <p className="pain-note">※ よくある悩みを、利用者像ごとにまとめた例です。</p>
          </div>
        </section>

        {/* 解決 */}
        <section id="solve">
          <div className="col">
            <div className="reveal">
              <p className="eyebrow">アプリができること</p>
              <h2 className="sec-title">{ph('「理解する」から|「本番で解ける」まで、|この1つで。')}</h2>
            </div>

            <div className="solve reveal">
              <div className="txt">
                <p className="k">
                  <span className="no">01</span>理解する
                </p>
                <h3>{ph(`全${N.topics}トピックが、|操作して学ぶ教材`)}</h3>
                <p className="d">
                  スライダーを動かし、ボタンを押し、画面の変化で仕組みをつかみます。2進数・SQL・損益分岐点・公開鍵暗号——文章では入ってこなかった単元が、手を動かすと腑に落ちる。仕上げは
                  <b>トピックごとの確認問題（計{N.checkQuestions}問）</b>と<b>英略語の単語帳{N.words}語</b>。
                </p>
                <a className="more" href={TRY_HREF}>
                  教材をひとつ体験してみる
                </a>
              </div>
              <div className="mock" aria-hidden="true">
                <div className="mock-head">
                  体験でまなぶ「IPアドレスとDNS」<span className="date">10分</span>
                </div>
                <div className="dns">
                  <span className="node">example.com</span>
                  <span className="arrow">DNSに問い合わせ</span>
                  <span className="node ip">93.184.216.34</span>
                </div>
                <div className="insight">
                  <b>気づき</b>
                  ドメイン名は人間用のあだ名。機械は番号で会話している
                </div>
              </div>
            </div>

            <div className="solve flip reveal">
              <div className="txt">
                <p className="k">
                  <span className="no">02</span>続ける
                </p>
                <h3>{ph('毎日の計画は、|アプリが立てる')}</h3>
                <p className="d">
                  試験日を入れるだけで、あなたの1日の学習時間に合わせて「今日やること」を自動で組みます。LINEと連携すれば毎日の合図も届くので、開く習慣づくりもアプリまかせ。間違えた問題は復習リストに自動で戻り、遅れても責めません——
                  <b>現実的な立て直し案</b>を提案して計画を引き直します。チェックポイントを越えるたびにバッジが増え、相棒のモチットも育ちます。
                </p>
              </div>
              <div className="mock" aria-hidden="true">
                <div className="mock-head">
                  今日やること<span className="date">試験まで62日</span>
                </div>
                <div className="tasks">
                  <div className="task done">
                    <span className="box">
                      <Check />
                    </span>
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
                    <span className="t">{ph('英略語カード 5語|（BCP、SLA…）')}</span>
                    <span className="min">3分</span>
                  </div>
                </div>
                <div className="mock-foot">
                  今週の進み具合: <b>順調</b>。{ph('この配分なら|試験1週間前に|総仕上げに入れます。')}
                </div>
              </div>
            </div>

            <div className="solve reveal">
              <div className="txt">
                <p className="k">
                  <span className="no">03</span>本番で解ける
                </p>
                <h3>{ph(`公式過去問${N.official}問と|${N.mock}問模試で、|本番に慣れる`)}</h3>
                <p className="d">
                  IPAが公開している<b>{N.officialRange}の公式過去問{N.official}問</b>を、本番の並びのまま解けます。解説はすべてアプリ独自の書き下ろし。さらに3分野をバランスよく出す<b>本番形式の{N.mock}問模試</b>と、章の内容を横断して解く<b>総まとめ試験{N.themeExamQuestions}問</b>で、「分かる」を「本番で解ける」に変えます。
                </p>
                <Link className="more" href="/kakomon">
                  過去問の解説を見てみる
                </Link>
              </div>
              <div className="mock" aria-hidden="true">
                <div className="mock-head">
                  本番形式で解く<span className="date">公式問題・独自解説付き</span>
                </div>
                <div className="tasks">
                  <div className="task done">
                    <span className="box">
                      <Check />
                    </span>
                    <span className="t">公式過去問 令和7年度</span>
                    <span className="min">100問</span>
                  </div>
                  <div className="task">
                    <span className="box" />
                    <span className="t">本番形式 {N.mock}問模試</span>
                    <span className="min">3分野</span>
                  </div>
                  <div className="task">
                    <span className="box" />
                    <span className="t">総まとめ試験「ネットワーク」</span>
                    <span className="min">10問</span>
                  </div>
                </div>
                <div className="mock-foot">
                  模試の結果から、<b>強化が必要なトピック</b>と次にやることを示します。
                </div>
              </div>
            </div>

            <div className="solve flip reveal">
              <div className="txt">
                <p className="k">
                  <span className="no">04</span>合格に近づく
                </p>
                <h3>{ph('「今の自分は|受かるのか」に、|数字で答える')}</h3>
                <p className="d">
                  実際の問題への回答と定着から判定する<b>合格準備度スコア</b>
                  で、弱い分野と次の一歩まで示します。さらにAI採点で「クラウドとは？」を自分の言葉で説明してみる——
                  <b>説明できれば、本番で選択肢に迷いません</b>。
                </p>
              </div>
              <div className="mock" aria-hidden="true">
                <div className="gaugerow">
                  <div className="gauge">
                    <div>
                      <span className="pct">68/100</span>
                      <span className="cap">合格準備度</span>
                      <span className="cap">あと一歩</span>
                    </div>
                  </div>
                  <p className="advice">
                    <b>次の一歩：「経営のことば」を優先しましょう。</b>
                    {ph('テクノロジ系は|仕上げ段階です。')}
                  </p>
                </div>
                <div className="chat">
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
            <h2 className="sec-title">{ph('「教材」ではなく、|計画と進捗まで持つ|「コーチ」です。')}</h2>
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
                    {CMP_OTHERS.map(({ name }) => (
                      <th key={name} scope="col">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CMP_ROWS.map(({ label, you, plain, others }) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td className={plain ? 'you plain' : 'you'}>{ph(you)}</td>
                      {others.map((v, i) => (
                        <td key={CMP_OTHERS[i].name} data-label={CMP_OTHERS[i].short}>
                          {ph(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
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
            <h2 className="sec-title">{ph(`まず${N.freeDays}日間、|全部無料で。|合わなければ|そのままで大丈夫。`)}</h2>

            <div className="tiers">
              <div className="tier">
                <p className="tier-name">無料のまま使えるもの</p>
                <p className="tier-price">
                  ¥0<small>・カード登録不要</small>
                </p>
                <ul>
                  <li>
                    <Check />
                    <span>{ph(`全${N.topics}トピックの|体験教材と解説`)}</span>
                  </li>
                  <li>
                    <Check />
                    <span>{ph(`公式過去問${N.official}問|（独自解説付き）`)}</span>
                  </li>
                  <li>
                    <Check />
                    AI採点 1日{N.freeGrading}回
                  </li>
                  <li>
                    <Check />
                    <span>
                      <span className="ph">学習記録の保存は</span>
                      <b className="ph">登録から{N.freeDays}日間</b>
                    </span>
                  </li>
                </ul>
              </div>
              <div className="tier pro">
                <p className="tier-name">Proで増えること</p>
                <p className="tier-price">
                  {yen(LOWEST_PRICE)}
                  <small>から</small>
                </p>
                <ul>
                  <li>
                    <Check />
                    学習記録を期間中ずっと保存
                  </li>
                  <li>
                    <Check />
                    <span>{ph('記録が合格準備度と|毎日の計画に|反映され続ける')}</span>
                  </li>
                  <li>
                    <Check />
                    <span>{ph(`AI採点が高精度の|Pro採点に|（1日${N.proGrading}回）`)}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="plans">
              {PLANS.map(({ key, name, desc, reco }) => {
                const p = plan(key);
                const sub = p.kind === 'subscription';
                return (
                  <div key={key} className={reco ? 'plan reco' : 'plan'}>
                    {reco && <span className="flag">いちばんお得</span>}
                    <p className="pname">{name}</p>
                    <p className="pprice">
                      {yen(p.totalJpy)}
                      {sub && <small>/月</small>}
                    </p>
                    {sub ? (
                      <p className="permo">{ph(`初月20%オフ|（${yen(Math.round(p.totalJpy * 0.8))}）`)}</p>
                    ) : p.months > 1 ? (
                      <p className="permo">月あたり{yen(p.perMonthJpy)}</p>
                    ) : null}
                    <p className="pdesc">{ph(desc)}</p>
                  </div>
                );
              })}
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
            <h2 className="sec-title">{ph('はじめる前の|疑問に答えます。')}</h2>
            <div className="faq">
              {FAQS.map(({ q, a: [before, bold, after] }) => (
                <details key={q}>
                  <summary>
                    <span>{ph(q)}</span>
                  </summary>
                  <p className="a">
                    {before}
                    <b>{bold}</b>
                    {after}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 最後のCTA */}
        <section className="last">
          <div className="col">
            <div className="last-panel reveal">
              <h2>{ph('今日の10分から、|合格までの計画が|始まります。')}</h2>
              <p>
                {ph('試験日を入れれば、|今日やることは|アプリが決めます。')}
                <br />
                {ph('あなたは開いて、|さわるだけ。')}
              </p>
              <div className="last-cta">
                <a className="btn on-dark" href={START_HREF}>
                  {N.freeDays}日間無料で始める
                </a>
                <a className="btn line" href={TRY_HREF}>
                  先に教材を体験する
                </a>
              </div>
              <span className="last-note">
                {ph('クレジットカード不要・|GoogleかLINEで登録・|買い切りプランは自動更新なし')}
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="col foot-in">
          <div className="foot-brand">
            <p className="logo">ITパスポート学習コーチ</p>
            <p>さわって理解する、ITパスポート試験の学習アプリ。</p>
          </div>
          <nav className="foot-nav" aria-label="無料で読める解説">
            <p className="foot-h">無料で読める解説</p>
            <a href="/guide">ITパスポート学習ガイド</a>
            <Link href="/kaisetsu">テーマ別解説</Link>
            <Link href="/kakomon">過去問解説</Link>
            <Link href="/words">英略語一覧</Link>
          </nav>
          <nav className="foot-nav" aria-label="サービス">
            <p className="foot-h">サービス</p>
            <a href={START_HREF}>ログイン / 無料登録</a>
            <a href="/legal/tokusho">{ph('特定商取引法に|基づく表示')}</a>
            <a href="/privacy">プライバシーポリシー</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
