import type { Metadata } from 'next';
import { GUIDE_FACTS } from '@/lib/guide/facts';
import { FREE_RECORDING_DAYS } from '@/lib/billing/constants';
import { STUDY_AMOUNT_OPTIONS } from '@/lib/studyAmount';
import Reveal from '../Reveal';
import { ph } from '../ph';
import { AngleFooter, AngleHeader, Check, START_HREF, TRY_HREF } from '../_angles/Chrome';
import '../lp.css';
import '../_angles/angle.css';

// ============================================================================
// 切り口別LP①「仕事終わり・学校終わりの15分から」（検証用・noindex）。
// /lp 本体が「さわって理解」を軸にするのに対し、こちらは「始めるハードルの低さ」で引く。
// 15分は Today の学習量の選択肢（STUDY_AMOUNT_OPTIONS）にある実在の分量。
// ============================================================================

const N = {
  topics: GUIDE_FACTS.topicCount,
  official: GUIDE_FACTS.officialQuestionCount,
  freeDays: FREE_RECORDING_DAYS,
};

const TITLE = '仕事終わりの15分から始める、ITパスポート｜ITパスポート学習コーチ';
const DESCRIPTION = `帰りの電車や寝る前の15分で進められるITパスポートの勉強アプリ。今日やることはアプリが決め、疲れた日は5分に減らせます。教材と公式過去問${N.official}問は無料。`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: true },
};

const MINUTE_CHOICES = STUDY_AMOUNT_OPTIONS;

const SCENES: { time: string; place: string; text: string }[] = [
  { time: '18:40', place: '帰りの電車で', text: '教材をひとつ開いて、スライダーを動かしながら仕組みをつかむ。' },
  { time: '18:50', place: '最寄り駅に着く前に', text: '確認問題を数問。間違えた問題は、アプリが復習に回しておく。' },
  { time: '23:30', place: '寝る前に、気が向いたら', text: '英略語カードを数枚。やらなくても、今日の分はもう終わっています。' },
];

export default function FifteenMinutesPage() {
  return (
    <div className="lp ag">
      <Reveal />
      <AngleHeader />

      <main id="top">
        <section className="hero">
          <div className="col hero-grid">
            <div className="hero-txt">
              <h1>
                <span className="eyebrow">仕事終わり・学校終わりのITパスポート</span>
                <span className="ph">まずは、帰り道の</span>
                <br />
                <span className="ph">
                  <span className="marked">
                    15分
                    <svg viewBox="0 0 100 40" aria-hidden="true" preserveAspectRatio="none">
                      <ellipse cx="50" cy="20" rx="48" ry="17" pathLength="100" />
                    </svg>
                  </span>
                  から。
                </span>
              </h1>
              <p className="hero-lead">
                まとまった勉強時間は、なくて大丈夫です。電車の中や寝る前の15分で、今日の分が終わるように。何をやるかはアプリが決めるので、あなたは開いて、さわるだけです。
              </p>
              <div className="hero-cta">
                <a className="btn" href={TRY_HREF}>
                  登録なしで1つ体験する
                </a>
                <a className="btn ghost" href={START_HREF}>
                  無料登録して始める
                </a>
              </div>
              <ul className="hero-points">
                <li>
                  <Check />
                  スマホのブラウザで完結
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

            <div className="mock ag-today" aria-hidden="true">
              <div className="mock-head">
                今日やること<span className="date">火曜 18:40</span>
              </div>
              <div className="ag-chips">
                <span className="ag-chips-label">今日の学習量</span>
                {MINUTE_CHOICES.map((m) => (
                  <span key={m} className={m === 15 ? 'ag-chip on' : 'ag-chip'}>
                    {m}分
                  </span>
                ))}
              </div>
              <div className="tasks">
                <div className="task done">
                  <span className="box">
                    <Check />
                  </span>
                  <span className="t">体験でまなぶ「IPアドレスとDNS」</span>
                  <span className="min">10分</span>
                </div>
                <div className="task">
                  <span className="box" />
                  <span className="t">確認問題 4問</span>
                  <span className="min">5分</span>
                </div>
              </div>
              <div className="ag-meter">
                <span className="ag-meter-bar">
                  <span style={{ width: '66%' }} />
                </span>
                <span className="ag-meter-txt">あと5分で今日の分はおしまい</span>
              </div>
            </div>
          </div>
        </section>

        {/* 15分の使い方 */}
        <section className="wash" id="scene">
          <div className="col reveal">
            <p className="eyebrow">15分で、何が進むのか</p>
            <h2 className="sec-title">{ph('教材1つと、|確認問題すこし。|それで今日は合格です。')}</h2>
            <p className="sec-lead">
              全{N.topics}トピックの教材は、1つずつが短く区切られています。「今日はここまで」がはっきりしているので、ダラダラ続けたり、どこまでやったか分からなくなったりしません。
            </p>
            <ol className="ag-scenes">
              {SCENES.map((s) => (
                <li key={s.time}>
                  <span className="ag-time">{s.time}</span>
                  <div>
                    <p className="ag-place">{s.place}</p>
                    <p className="ag-scene-txt">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="pain-note">※ 1日の流れは一例です。時間帯は自由に使えます。</p>
          </div>
        </section>

        {/* 続けられる理由 */}
        <section id="keep">
          <div className="col">
            <div className="reveal">
              <p className="eyebrow">疲れている日でも、続けられる理由</p>
              <h2 className="sec-title">{ph('考えることは、|ぜんぶアプリに|任せてください。')}</h2>
            </div>
            <div className="ag-points reveal">
              <div className="ag-point">
                <span className="no">01</span>
                <h3>{ph('「何をやるか」を|決めなくていい')}</h3>
                <p>
                  試験日と平日に使える時間を入れると、「今日やること」を毎日組み立てます。復習が必要な問題、苦手なところ、新しい単元の順に、アプリが優先順位をつけます。
                </p>
              </div>
              <div className="ag-point">
                <span className="no">02</span>
                <h3>{ph('しんどい日は|5分にできる')}</h3>
                <p>
                  残業の日や課題が重なった日は、その日だけ学習量を5分に。翌日は自動でいつもの分量に戻るので、設定を元に戻す手間もありません。
                </p>
              </div>
              <div className="ag-point">
                <span className="no">03</span>
                <h3>{ph('休んでも、|責められない')}</h3>
                <p>
                  何日か空いてしまっても、試験日までの計画を現実的に引き直す「立て直し案」を出します。最初からやり直す必要はありません。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 体験への導線 */}
        <section className="wash" id="try">
          <div className="narrow reveal ag-try">
            <p className="eyebrow">いま、15分ありますか</p>
            <h2 className="sec-title">{ph('登録の前に、|教材を1つ|さわってみてください。')}</h2>
            <p className="sec-lead">
              スイッチを押してANDとORの違いを確かめる教材を、登録なしで試せます。数分で終わります。
            </p>
            <a className="btn" href={TRY_HREF}>
              登録なしで体験する
            </a>
          </div>
        </section>

        <section className="last">
          <div className="col">
            <div className="last-panel reveal">
              <h2>{ph('今日の帰り道から、|始めてみませんか。')}</h2>
              <p>
                {ph('教材と公式過去問は|ずっと無料。|学習記録の保存も|最初の')}
                {N.freeDays}日間は無料です。
              </p>
              <div className="last-cta">
                <a className="btn on-dark" href={START_HREF}>
                  無料で始める
                </a>
                <a className="btn line" href="/lp">
                  サービスの全体を見る
                </a>
              </div>
              <span className="last-note">{ph('クレジットカード不要・|GoogleかLINEで登録')}</span>
            </div>
          </div>
        </section>
      </main>

      <AngleFooter />
    </div>
  );
}
