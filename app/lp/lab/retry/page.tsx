import type { Metadata } from 'next';
import Link from 'next/link';
import { EXAM_READINESS_CONFIG } from '@/lib/examReadiness/config';
import Reveal from '../../Reveal';
import { ph } from '../../ph';
import { RetryChoices } from '../Choices';
import {
  Check,
  LabFaq,
  LabFooter,
  LabHeader,
  LastPanel,
  Marked,
  N,
  PriceBrief,
  Stats,
  tryHref,
  yen,
} from '../Shared';
import '../../lp.css';
import '../lab.css';

// ============================================================================
// 切り口別LP②「一度不合格になった人へ」（noindex は lab/layout.tsx）。
// 軸は「全部やり直す」ではなく「届かなかったところから埋める」。
// 合格基準（総合600点＋分野別300点）は IPA の基準で、/guide/it-passport-study-method と同じ表現。
// 合格準備度が弱い分野で頭打ちになる上限値は examReadiness の設定から読む。
// 残りの学習量の目安は /guide/study-time の「再受験・あと一歩」と同じ式。
// ============================================================================

export const metadata: Metadata = {
  title: '前回の勉強を、次の一歩に。ITパスポートの再挑戦｜ITパスポート学習コーチ',
  description: `一度不合格になったあなたへ。最初からやり直すのではなく、公式過去問${N.official}問と${N.mock}問模試で届かなかった分野を見つけ、仕組みから理解し直す。次の試験日から計画も立て直せます。`,
};

const C = 'retry' as const;
const CAP_MID = EXAM_READINESS_CONFIG.fieldScoreCaps.from40Through59;

// ヒーローの見本。マネジメントが40〜59の帯にあるため、総合は CAP_MID で頭打ちになる例。
const FIELDS: { label: string; score: number; weak?: boolean }[] = [
  { label: 'ストラテジ', score: 78 },
  { label: 'マネジメント', score: 48, weak: true },
  { label: 'テクノロジ', score: 81 },
];

const VOICES: { q: [string, string, string]; who: string }[] = [
  {
    q: ['用語は覚えたのに、', '言い回しが変わると解けなかった', '。結局、意味が分かっていなかった。'],
    who: '過去問サイトを中心に勉強',
  },
  {
    q: ['総合点は届いていたのに、', '1つの分野だけ基準に足りなかった', '。どこを勉強すればよかったのか。'],
    who: '1回目は参考書を1周して受験',
  },
  {
    q: ['仕事が忙しくなって、', '最後の2週間はほぼ手つかず', 'のまま本番を迎えてしまった。'],
    who: '社会人。会社の推奨で受験',
  },
];

const FAQS: { q: string; a: [string, string, string] }[] = [
  {
    q: '前回の勉強を、|最初から|やり直す必要は|ありますか？',
    a: [
      'すべてを同じ量でやり直す必要はありません。',
      '過去問で今の理解を確かめ、迷ったテーマから',
      '見直せます。解けるテーマは確認だけで済むので、残りの量は初めての人より小さくなります。',
    ],
  },
  {
    q: '前回使った|参考書は|使えますか？',
    a: [
      'もちろん使えます。参考書の目次を登録すると、',
      '参考書の章立てに沿った計画',
      'も組めます。読んでも分からなかった単元だけ、操作して学ぶ教材で補う使い方もできます。',
    ],
  },
  {
    q: '試験日が|まだ決まって|いなくても|始められますか？',
    a: [
      'はい。教材体験は登録なしで使えます。登録後も、試験日は',
      '未定のまま始められます',
      '（仮の試験日で計画を組み、決まったら入れ直せます）。',
    ],
  },
  {
    q: 'このアプリを|使えば、|次は合格|できますか？',
    a: [
      '',
      '合格を保証するものではありません',
      '。必要な時間は理解度や試験日によって変わります。理解の確認、復習、演習を重ねるための道具として使ってください。',
    ],
  },
  {
    q: '無料で|どこまで|使えますか？',
    a: [
      `教材（${N.topics}トピック）と公式過去問${N.official}問は`,
      'ずっと無料',
      `です。学習記録の保存は登録から${N.freeDays}日間無料で、その後も記録を残したい場合だけ${yen(N.lowestPrice)}からのプランを選べます。`,
    ],
  },
];

export default function RetryPage() {
  return (
    <div className="lp lb">
      <Reveal />
      <LabHeader
        campaign={C}
        nav={[
          { href: '#rule', label: '合格基準' },
          { href: '#how', label: '再挑戦の進め方' },
          { href: '#price', label: '料金' },
          { href: '#faq', label: 'FAQ' },
        ]}
      />

      <main id="top">
        <section className="hero">
          <div className="col hero-grid">
            <div className="hero-txt">
              <h1>
                <span className="eyebrow">ITパスポートに、もう一度挑むあなたへ</span>
                <span className="ph">前回の勉強を、</span>
                <br />
                <span className="ph">
                  <Marked>次の一歩</Marked>に。
                </span>
              </h1>
              <p className="hero-lead">
                悔しかった。それだけ、向き合った。あの時間を、ゼロにしなくていい。参考書を1ページ目から読み直すより、届かなかったところを見つけて、そこから埋めていく。次は「がんばり方」を、少し変えてみませんか。
              </p>
              <div className="hero-cta">
                <a className="btn" href={tryHref(C)}>
                  登録なしで教材を体験する
                </a>
                <Link className="btn ghost" href="/kakomon">
                  過去問で今の力を確かめる
                </Link>
              </div>
              <ul className="hero-points">
                <li>
                  <Check />
                  公式過去問{N.official}問は無料
                </li>
                <li>
                  <Check />
                  分野ごとの弱点が数字で分かる
                </li>
                <li>
                  <Check />
                  次の試験日から計画を逆算
                </li>
              </ul>
            </div>

            <div className="mock lb-fields" aria-hidden="true">
              <div className="mock-head">
                分野ごとの合格準備度<span className="date">表示例</span>
              </div>
              <ul className="lb-bars">
                {FIELDS.map((f) => (
                  <li key={f.label} className={f.weak ? 'weak' : undefined}>
                    <span className="lb-bar-label">{f.label}</span>
                    <span className="lb-bar">
                      <span style={{ width: `${f.score}%` }} />
                    </span>
                    <span className="lb-bar-num">{f.score}</span>
                  </li>
                ))}
              </ul>
              <div className="mock-foot">
                <b>マネジメントが足を引っぱっています。</b>
                {ph(`この分野を上げるまで、|総合は${CAP_MID}で頭打ちです。`)}
              </div>
            </div>
          </div>
          <Stats />
        </section>

        {/* 手紙 */}
        <section className="wash" id="letter">
          <div className="col reveal">
            <p className="eyebrow">ゼロに戻るわけじゃない</p>
            <h2 className="sec-title">{ph('足りなかったのは、|努力だけでしょうか。')}</h2>
            <p className="sec-lead">
              一度目で届かなかった理由は、勉強量より「どこを・どう」のずれであることが少なくありません。思い当たることがあるなら、次はそこから変えていけばいい。<b>前回の経験は、次の学び方を見つけるヒントです。</b>
            </p>
            <div className="pains">
              {VOICES.map(({ q: [a, em, b], who }) => (
                <figure key={who} className="pain">
                  <blockquote className="q">
                    {a}
                    <em>{em}</em>
                    {b}
                  </blockquote>
                  <figcaption className="who">{who}</figcaption>
                </figure>
              ))}
            </div>
            <p className="pain-note">※ 再受験でよく聞かれる悩みを、パターンごとにまとめた例です。</p>
          </div>
        </section>

        {/* 合格基準 */}
        <section id="rule">
          <div className="col reveal">
            <p className="eyebrow">見落としやすい、もう1つの合格基準</p>
            <h2 className="sec-title">{ph('総合点が足りても、|1分野が届かなければ|不合格です。')}</h2>
            <p className="sec-lead">
              ITパスポートの合格には、2つの条件があります。総合で足りていても、ストラテジ系・マネジメント系・テクノロジ系のうち1つでも基準に届かないと不合格になります。
            </p>
            <div className="lb-rule">
              <div>
                <p className="lb-rule-k">条件 1</p>
                <p className="lb-rule-v">
                  総合評価点 <b>600点以上</b>
                </p>
                <p className="lb-rule-s">1,000点満点</p>
              </div>
              <span className="lb-rule-and" aria-hidden="true">
                かつ
              </span>
              <div>
                <p className="lb-rule-k">条件 2</p>
                <p className="lb-rule-v">
                  3分野それぞれ <b>300点以上</b>
                </p>
                <p className="lb-rule-s">各1,000点満点</p>
              </div>
            </div>
            <div className="lb-check">
              <p className="lb-check-h">前回の結果で、まず見てほしいこと</p>
              <ol>
                <li>
                  <b>総合と、3分野それぞれの点数</b>
                  <span>足りなかったのが総合点なのか、特定の分野なのかで、次にやることが変わります。</span>
                </li>
                <li>
                  <b>いちばん低かった分野</b>
                  <span>その分野の過去問から解き直すと、残りの量を小さく見積もれます。</span>
                </li>
                <li>
                  <b>時間切れや見直し不足はなかったか</b>
                  <span>知識より時間配分が原因なら、本番形式の{N.mock}問模試で慣れるのが近道です。</span>
                </li>
              </ol>
            </div>
            <p className="pain-note">※ 合格基準はIPA（情報処理推進機構）の公表内容によります。</p>
          </div>
        </section>

        {/* つまずき別 */}
        <section className="wash" id="how">
          <div className="col reveal">
            <p className="eyebrow">つまずき方で、次の始め方が変わる</p>
            <h2 className="sec-title">{ph('前回、どこで|つまずきましたか。')}</h2>
            <p className="sec-lead">近いものを選んで、次の始め方を見つけましょう。</p>
            <RetryChoices topics={N.topics} intervals={N.reviewIntervals} tryHref={tryHref(C)} />
          </div>
        </section>

        {/* 3つの進め方 */}
        <section id="steps">
          <div className="col">
            <div className="reveal">
              <p className="eyebrow">二度目の進め方</p>
              <h2 className="sec-title">{ph('すべてを最初から、|ではなく。|この3つから。')}</h2>
            </div>
            <div className="lb-points three reveal">
              <div className="lb-point">
                <span className="no">01</span>
                <h3>{ph('今の「わかる」を|確かめる')}</h3>
                <p>
                  {N.officialRange}の公式過去問{N.official}問を、分野別にも本番の並びでも解けます。まずは各分野{N.fieldDrill}問を目安に。正解した問題も、理由を説明できるか考えてみます。
                </p>
              </div>
              <div className="lb-point">
                <span className="no">02</span>
                <h3>{ph('苦手を、|仕組みから|理解し直す')}</h3>
                <p>
                  言葉だけで覚えていたテーマは、操作して学ぶ教材へ。間違えた問題は復習に自動で戻り、{N.reviewIntervals.join('・')}日後と間隔を広げて確かめ直します。
                </p>
              </div>
              <div className="lb-point">
                <span className="no">03</span>
                <h3>{ph('次の試験日に|間に合わせる')}</h3>
                <p>
                  合格準備度は、弱い分野が残ると総合が上がりきらない作りです。本番の分野別基準と同じ考え方で、毎日の計画には苦手なトピックが優先して入ります。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 残りの量 */}
        <section className="wash" id="amount">
          <div className="col reveal">
            <p className="eyebrow">二度目なら、残りはどれくらいか</p>
            <h2 className="sec-title">{ph('一度学んだ分、|残りの量は|小さくなります。')}</h2>
            <div className="lb-paces">
              <div className="lb-pace">
                <p className="lb-pace-k">はじめて全範囲を学ぶ場合</p>
                <p className="lb-pace-v">
                  約<b>{N.requiredHours}</b>時間
                </p>
                <p className="lb-pace-s">インプット＋確認問題の回し直し＋過去問</p>
              </div>
              <div className="lb-pace on">
                <p className="lb-pace-k">再受験・あと一歩の場合</p>
                <p className="lb-pace-v">
                  約<b>{N.retryHours}</b>時間まで
                </p>
                <p className="lb-pace-s">確認問題の回し直し＋過去問だけが残る場合の上限</p>
              </div>
            </div>
            <p className="sec-lead">
              さらに、すでに解けるテーマは確認だけで済みます。過去問で今の力を測ってから試験日を入れると、残りの量から毎日の分量をアプリが配分します。
            </p>
            <p className="pain-note">
              ※ このサービスの教材で学ぶ場合の計画上の見積もりで、合格を保証する時間ではありません。詳しくは
              <a href="/guide/study-time">ITパスポートの勉強時間の目安</a>で解説しています。
            </p>
          </div>
        </section>

        <div className="col reveal">
          <figure className="lb-quote">
            <blockquote>
              もう一度やってみよう、と思えた。
              <br />
              <b>それも、前進だ。</b>
            </blockquote>
            <figcaption>今日の1問を、次の自信へ。</figcaption>
          </figure>
        </div>

        <PriceBrief title="測るための過去問は、|ずっと無料。" />

        <LabFaq items={FAQS} />

        <LastPanel
          campaign={C}
          title="次の一歩は、|小さくていい。"
          lead="前回の結果は|いったん置いて。|今日はひとつ、|わかるを増やそう。"
          tryLabel="登録なしで体験する"
        />
      </main>

      <LabFooter />
    </div>
  );
}
