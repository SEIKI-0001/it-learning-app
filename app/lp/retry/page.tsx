import type { Metadata } from 'next';
import Link from 'next/link';
import { GUIDE_FACTS } from '@/lib/guide/facts';
import { MOCK_EXAM_RULE } from '@/lib/mockExam';
import { EXAM_READINESS_CONFIG } from '@/lib/examReadiness/config';
import Reveal from '../Reveal';
import { ph } from '../ph';
import { AngleFooter, AngleHeader, Check, START_HREF, TRY_HREF } from '../_angles/Chrome';
import '../lp.css';
import '../_angles/angle.css';

// ============================================================================
// 切り口別LP②「一度不合格になった人へ」（検証用・noindex）。
// 軸は「全部やり直す」ではなく「落とした分野を埋める」。
// 合格基準（総合600点＋分野別300点）は公式の基準で、app/guide/it-passport-study-method と同じ表現。
// 合格準備度が弱い分野で頭打ちになる上限値は examReadiness の設定から読む。
// ============================================================================

const N = {
  topics: GUIDE_FACTS.topicCount,
  official: GUIDE_FACTS.officialQuestionCount,
  officialRange: GUIDE_FACTS.officialYearRange,
  mock: MOCK_EXAM_RULE.questionCount,
  capMid: EXAM_READINESS_CONFIG.fieldScoreCaps.from40Through59,
};

const TITLE = 'ITパスポートに一度落ちた人の、再挑戦の進め方｜ITパスポート学習コーチ';
const DESCRIPTION = `ITパスポートに再挑戦する人向け。最初からやり直すのではなく、公式過去問${N.official}問と${N.mock}問模試で落とした分野を見つけ、その穴から埋めていく勉強アプリです。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: true },
};

// ヒーローの見本。マネジメントが40〜59の帯にあるため、総合は capMid で頭打ちになる例。
const FIELDS: { label: string; score: number; weak?: boolean }[] = [
  { label: 'ストラテジ', score: 78 },
  { label: 'マネジメント', score: 48, weak: true },
  { label: 'テクノロジ', score: 81 },
];

const VOICES: { q: [string, string, string]; who: string }[] = [
  {
    q: ['総合点は届いていたのに、', 'マネジメントだけ基準に足りなかった', '。どこを勉強すればよかったのか。'],
    who: '1回目は参考書を1周して受験',
  },
  {
    q: ['過去問の答えは覚えたのに、', '言い回しが変わると解けなかった', '。結局、意味が分かっていなかった。'],
    who: '過去問サイトを中心に勉強',
  },
  {
    q: ['仕事が忙しくなって、', '最後の2週間はほぼ手つかず', 'のまま本番を迎えてしまった。'],
    who: '社会人。会社の推奨で受験',
  },
];

export default function RetryPage() {
  return (
    <div className="lp ag">
      <Reveal />
      <AngleHeader />

      <main id="top">
        <section className="hero">
          <div className="col hero-grid">
            <div className="hero-txt">
              <h1>
                <span className="eyebrow">ITパスポートに、もう一度挑戦する人へ</span>
                <span className="ph">二度目は、</span>
                <span className="ph">やり直しではなく</span>
                <br />
                <span className="ph">
                  <span className="marked">
                    「穴埋め」
                    <svg viewBox="0 0 100 40" aria-hidden="true" preserveAspectRatio="none">
                      <ellipse cx="50" cy="20" rx="48" ry="17" pathLength="100" />
                    </svg>
                  </span>
                  から。
                </span>
              </h1>
              <p className="hero-lead">
                前回勉強したことは、消えていません。参考書を1ページ目から読み直すより、落とした分野を見つけて、そこから埋めていく方が近道です。どこが穴なのかは、公式過去問を解けばアプリが示します。
              </p>
              <div className="hero-cta">
                <a className="btn" href={START_HREF}>
                  無料で現在地を測る
                </a>
                <Link className="btn ghost" href="/kakomon">
                  過去問の解説を見る
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

            <div className="mock ag-fields" aria-hidden="true">
              <div className="mock-head">
                分野ごとの合格準備度<span className="date">表示例</span>
              </div>
              <ul className="ag-bars">
                {FIELDS.map((f) => (
                  <li key={f.label} className={f.weak ? 'weak' : undefined}>
                    <span className="ag-bar-label">{f.label}</span>
                    <span className="ag-bar">
                      <span style={{ width: `${f.score}%` }} />
                    </span>
                    <span className="ag-bar-num">{f.score}</span>
                  </li>
                ))}
              </ul>
              <div className="mock-foot">
                <b>マネジメントが足を引っぱっています。</b>
                {ph(`この分野を上げるまで、|総合は${N.capMid}で頭打ちです。`)}
              </div>
            </div>
          </div>
        </section>

        {/* 合格基準 */}
        <section className="wash" id="rule">
          <div className="col reveal">
            <p className="eyebrow">見落としやすい、もう1つの合格基準</p>
            <h2 className="sec-title">{ph('総合点が足りても、|1分野が届かなければ|不合格です。')}</h2>
            <p className="sec-lead">
              ITパスポートの合格には、2つの条件があります。総合で足りていても、ストラテジ・マネジメント・テクノロジのうち1つでも基準に届かないと不合格になります。
            </p>
            <div className="ag-rule">
              <div>
                <p className="ag-rule-k">条件 1</p>
                <p className="ag-rule-v">
                  総合評価点 <b>600点以上</b>
                </p>
                <p className="ag-rule-s">1,000点満点</p>
              </div>
              <span className="ag-rule-and" aria-hidden="true">
                かつ
              </span>
              <div>
                <p className="ag-rule-k">条件 2</p>
                <p className="ag-rule-v">
                  3分野それぞれ <b>300点以上</b>
                </p>
                <p className="ag-rule-s">各1,000点満点</p>
              </div>
            </div>
            <p className="sec-lead">
              まずは前回の試験結果で、分野ごとの点数を見返してみてください。足りなかったのが総合点なのか、特定の分野なのかで、次にやることが変わります。
            </p>
          </div>
        </section>

        {/* 声 */}
        <section id="voices">
          <div className="col reveal">
            <p className="eyebrow">一度目で届かなかった理由</p>
            <h2 className="sec-title">{ph('勉強量より、|「どこを・どう」が|ずれていただけ|かもしれません。')}</h2>
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

        {/* 進め方 */}
        <section className="wash" id="how">
          <div className="col">
            <div className="reveal">
              <p className="eyebrow">二度目の進め方</p>
              <h2 className="sec-title">{ph('測る、埋める、|間に合わせる。')}</h2>
            </div>
            <div className="ag-points reveal">
              <div className="ag-point">
                <span className="no">01</span>
                <h3>{ph('現在地を|測る')}</h3>
                <p>
                  IPAが公開している{N.officialRange}の公式過去問{N.official}問を、分野別にも、本番と同じ並びでも解けます。仕上げの{N.mock}問模試は、結果を分野ごとに見直せます。
                </p>
              </div>
              <div className="ag-point">
                <span className="no">02</span>
                <h3>{ph('落とした分野を、|仕組みから埋める')}</h3>
                <p>
                  丸暗記で通らなかった単元は、全{N.topics}トピックの「操作して学ぶ教材」で意味から理解し直します。間違えた問題は復習に自動で戻るので、同じところで二度つまずきません。
                </p>
              </div>
              <div className="ag-point">
                <span className="no">03</span>
                <h3>{ph('次の試験日に|間に合わせる')}</h3>
                <p>
                  合格準備度は、弱い分野が残っていると総合が上がりきらない作りです。本番の分野別基準と同じ考え方で、試験日から逆算した毎日の計画には、間違えた問題と苦手なトピックが優先して入ります。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="last">
          <div className="col">
            <div className="last-panel reveal">
              <h2>{ph('前回の勉強を、|ムダにしない|二度目にしましょう。')}</h2>
              <p>{ph('まずは過去問を解いて、|今の自分の穴を|見つけるところから。')}</p>
              <div className="last-cta">
                <a className="btn on-dark" href={START_HREF}>
                  無料で始める
                </a>
                <a className="btn line" href={TRY_HREF}>
                  先に教材を体験する
                </a>
              </div>
              <span className="last-note">
                {ph('教材と公式過去問は無料・|クレジットカード不要・|GoogleかLINEで登録')}
              </span>
            </div>
          </div>
        </section>
      </main>

      <AngleFooter />
    </div>
  );
}
