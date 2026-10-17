import type { Metadata } from 'next';
import { EXAM_MONTH_PRESETS, PROVISIONAL_EXAM_MONTHS } from '@/lib/examDateChoice';
import Reveal from '../../Reveal';
import { ph } from '../../ph';
import { FifteenMinutes } from '../Choices';
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
  startHref,
  tryHref,
  yen,
} from '../Shared';
import '../../lp.css';
import '../lab.css';

// ============================================================================
// 切り口別LP①「仕事終わり・学校帰りの15分から」（noindex は lab/layout.tsx）。
// /lp 本体が「さわって理解」を軸にするのに対し、こちらは「始めるハードルの低さ」で引く。
// 15分は Today の学習量の選択肢（STUDY_AMOUNT_OPTIONS）にある実在の分量。
// 「15分で何週かかるか」は /guide/study-time と同じ見積もり式で出す（合格を保証する時間ではない）。
// ============================================================================

export const metadata: Metadata = {
  title: '仕事終わりも、学校帰りも。まずは15分。｜ITパスポート学習コーチ',
  description: `忙しい毎日に、ITパスポートの小さな学習習慣を。今日やることはアプリが決め、疲れた日は5分に減らせます。教材と公式過去問${N.official}問は無料。登録不要の教材体験つき。`,
};

const C = 'fifteen' as const;

// 平日/休日の時間ごとに、初心者の見積りを何週で消化できるか（/guide/study-time と同じ式）。
const PACES = [
  { weekday: 15, holiday: 30 },
  { weekday: 30, holiday: 60 },
].map((p) => {
  const perWeek = p.weekday * 5 + p.holiday * 2;
  const weeks = Math.ceil((N.requiredHours * 60) / perWeek);
  return { ...p, perWeek, weeks, months: Math.ceil((weeks / 4.3) * 2) / 2 };
});

const PAINS: { q: [string, string, string]; who: string }[] = [
  { q: ['帰ったら、', 'ついスマホを眺めて', '一日が終わる。勉強の気力はもう残っていない。'], who: '社会人1年目。会社に取得を勧められた' },
  { q: ['「休日にまとめて」と思っていたら、', '気づけば一週間', '。参考書はカバンの中のまま。'], who: '事務職。平日は残業が多い' },
  { q: ['開いても、', '何からやればいいか決めるだけで疲れる', '。結局その日は何もしない。'], who: '大学2年生。部活とバイトの合間に' },
];

const FAQS: { q: string; a: [string, string, string] }[] = [
  {
    q: '1日15分だけで|合格できますか？',
    a: [
      '15分は、始めるための目安です。このサービスの計画上、IT初心者が全範囲を学ぶ量は約',
      `${N.requiredHours}時間`,
      'で、平日15分・休日30分なら4か月以上かかる計算です。試験日を入れると、間に合わない分は「おまかせ」の量をアプリが増やします。合格を保証するものではありません。',
    ],
  },
  {
    q: '疲れていて、|15分もできない日は？',
    a: [
      `その日だけ学習量を${N.studyAmounts[0]}分に減らせます。選んだ量は当日限りで、`,
      '翌日は自動でいつもの量に戻ります',
      `。${N.comebackDays}日以上空いたときは、${N.comebackMinutes}分以内で終わる復帰メニューから再開できます。`,
    ],
  },
  {
    q: '試験日が|まだ決まって|いなくても|使えますか？',
    a: [
      `はい。試験日は「${EXAM_MONTH_PRESETS.join('・')}か月後」のようにおおまかに選ぶか、未定のままでも始められます。未定のときは`,
      `仮の試験日（${PROVISIONAL_EXAM_MONTHS}か月後）`,
      'で計画を組み、決まったら入れ直せば計画も引き直されます。',
    ],
  },
  {
    q: 'スマホだけで|使えますか？',
    a: [
      'はい。スマホのブラウザでそのまま動くので、',
      'インストールは不要',
      'です。教材体験は登録せずに始められます。LINEと連携すると、毎日の合図をLINEで受け取れます。',
    ],
  },
  {
    q: '無料期間が|終わったら|どうなりますか？',
    a: [
      `教材（${N.topics}トピックの体験・解説）と公式過去問は`,
      '無料のまま使い続けられます',
      `。止まるのは学習記録の保存だけです。記録を残して計画や合格準備度に反映させたい場合は、${yen(N.lowestPrice)}からのプランを選べます。`,
    ],
  },
];

export default function FifteenPage() {
  return (
    <div className="lp lb">
      <Reveal />
      <LabHeader
        campaign={C}
        nav={[
          { href: '#how', label: '15分の使い方' },
          { href: '#keep', label: '続けられる理由' },
          { href: '#price', label: '料金' },
          { href: '#faq', label: 'FAQ' },
        ]}
      />

      <main id="top">
        <section className="hero">
          <div className="col hero-grid">
            <div className="hero-txt">
              <h1>
                <span className="eyebrow">仕事終わり・学校帰りのITパスポート</span>
                <span className="ph">仕事終わりも、</span>
                <span className="ph">学校帰りも。</span>
                <br />
                <span className="ph">
                  まずは、<Marked>15分</Marked>から。
                </span>
              </h1>
              <p className="hero-lead">
                今日も一日、がんばった。そのあと少しだけ、未来の自分のために。まとまった勉強時間はなくて大丈夫です。何をやるかはアプリが決めるので、あなたはスマホを開いて、さわるだけ。
              </p>
              <div className="hero-cta">
                <a className="btn" href={tryHref(C)}>
                  登録なしで教材を体験する
                </a>
                <a className="btn ghost" href={startHref(C)}>
                  無料登録して始める
                </a>
              </div>
              <ul className="hero-points">
                <li>
                  <Check />
                  インストール不要
                </li>
                <li>
                  <Check />
                  教材と公式過去問はずっと無料
                </li>
                <li>
                  <Check />
                  カード登録不要
                </li>
              </ul>
            </div>

            <div className="mock lb-hero-mock" aria-hidden="true">
              <div className="mock-head">
                今日やること<span className="date">火曜 19:30</span>
              </div>
              <div className="lb-chips">
                <span className="lb-chips-label">今日の学習量</span>
                {N.studyAmounts.map((m) => (
                  <span key={m} className={m === 15 ? 'lb-chip on' : 'lb-chip'}>
                    {m}分
                  </span>
                ))}
              </div>
              <div className="tasks">
                <div className="task done">
                  <span className="box">
                    <Check />
                  </span>
                  <span className="t">復習 前に迷った1問</span>
                  <span className="min">3分</span>
                </div>
                <div className="task">
                  <span className="box" />
                  <span className="t">体験でまなぶ「IPアドレスとDNS」</span>
                  <span className="min">8分</span>
                </div>
                <div className="task">
                  <span className="box" />
                  <span className="t">確認問題 3問</span>
                  <span className="min">4分</span>
                </div>
              </div>
              <div className="lb-meter">
                <span className="lb-meter-bar">
                  <span style={{ width: '20%' }} />
                </span>
                <span className="lb-meter-txt">あと12分で、今日の分はおしまい</span>
              </div>
            </div>
          </div>
          <Stats />
        </section>

        {/* 共感 */}
        <section className="wash" id="pain">
          <div className="col reveal">
            <p className="eyebrow">完璧な一日じゃなくていい</p>
            <h2 className="sec-title">{ph('「時間ができたら」を、|「今日、少しだけ」に。')}</h2>
            <p className="sec-lead">
              長くがんばろうとするほど、始めるのが重くなります。だから最初は、終わりが見える15分から。今日の分が終わったら、あとは自分の時間です。
            </p>
            <div className="pains">
              {PAINS.map(({ q: [a, em, b], who }) => (
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
            <p className="pain-note">※ よくある悩みを、利用者像ごとにまとめた例です。</p>
          </div>
        </section>

        {/* 15分の使い方 */}
        <section id="how">
          <div className="col lb-split reveal">
            <div>
              <p className="eyebrow">15分の使い方</p>
              <h2 className="sec-title">{ph('15分って、|意外とできる。')}</h2>
              <p className="sec-lead">
                復習して、ひとつ学んで、確かめる。小さく区切ると、今日も手が届きます。
              </p>
              <p className="sec-lead">
                順番を考える必要はありません。復習の期限が来た問題、苦手なところ、新しい単元の順に、アプリが「今日やること」へ並べます。
              </p>
            </div>
            <FifteenMinutes />
          </div>
        </section>

        {/* 続けられる理由 */}
        <section className="wash" id="keep">
          <div className="col">
            <div className="reveal">
              <p className="eyebrow">疲れている日でも、続けられる理由</p>
              <h2 className="sec-title">{ph('続けるために、|ひとりで|がんばりすぎない。')}</h2>
            </div>
            <div className="lb-points reveal">
              <div className="lb-point">
                <span className="no">01</span>
                <h3>{ph('「読む」だけで|終わらない')}</h3>
                <p>
                  全{N.topics}トピックが、図やスイッチを動かして仕組みを体験する教材です。カタカナの言葉にも、具体的なイメージがつきます。
                </p>
              </div>
              <div className="lb-point">
                <span className="no">02</span>
                <h3>{ph('今日やることが、|見える')}</h3>
                <p>
                  試験日と使える時間から、毎日の分量を自動で配分します。「今日は何をしよう」で迷う時間がなくなります。
                </p>
              </div>
              <div className="lb-point">
                <span className="no">03</span>
                <h3>{ph(`しんどい日は|${N.studyAmounts[0]}分にできる`)}</h3>
                <p>
                  学習量は{N.studyAmounts.join('・')}分から選べます。選んだ量はその日限りで、翌日は自動でいつもの量に戻ります。
                </p>
              </div>
              <div className="lb-point">
                <span className="no">04</span>
                <h3>{ph('休んでも、|責められない')}</h3>
                <p>
                  {N.comebackDays}日以上空いたら、{N.comebackMinutes}分以内で終わる復帰メニューから。遅れが目立つときは、試験日までの計画を引き直す立て直し案が出ます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 15分でどこまで */}
        <section id="pace">
          <div className="col reveal">
            <p className="eyebrow">15分を続けると、どこまで進むか</p>
            <h2 className="sec-title">{ph('正直に言うと、|15分だけでは|時間がかかります。')}</h2>
            <p className="sec-lead">
              このサービスの教材で全範囲を学ぶ場合、IT初心者の計画上の学習量は<b>約{N.requiredHours}時間</b>
              （インプット・確認問題の回し直し・過去問演習の合計）です。1日の時間が短いほど、必要な期間は長くなります。
            </p>
            <div className="lb-paces">
              {PACES.map((p) => (
                <div key={p.weekday} className={p.weekday === 15 ? 'lb-pace on' : 'lb-pace'}>
                  <p className="lb-pace-k">
                    平日{p.weekday}分・休日{p.holiday}分
                  </p>
                  <p className="lb-pace-v">
                    約<b>{p.months}</b>か月
                  </p>
                  <p className="lb-pace-s">
                    週{Math.round((p.perWeek / 60) * 10) / 10}時間 × {p.weeks}週
                  </p>
                </div>
              ))}
            </div>
            <p className="sec-lead">
              だから15分は、<b>習慣を始めるための入口</b>です。試験日を入れると、残りの量から今日の取り分を計算し、足りなければ「おまかせ」の量を増やします。基礎知識がある人や、すでに解けるテーマが多い人は、もっと短く済みます。
            </p>
            <p className="pain-note">
              ※ 計画上の見積もりで、合格を保証する時間ではありません。見積もりの内訳は
              <a href="/guide/study-time">ITパスポートの勉強時間の目安</a>で解説しています。
            </p>
          </div>
        </section>

        <PriceBrief title="教材と過去問は、|ずっと無料。" />

        <LabFaq items={FAQS} />

        <LastPanel
          campaign={C}
          title="今日の15分が、|明日の自分に|つながる。"
          lead="まとまった時間ができるのを|待たずに。|まずはひとつ、|さわってみよう。"
          tryLabel="登録なしで体験する"
        />
      </main>

      <LabFooter />
    </div>
  );
}
