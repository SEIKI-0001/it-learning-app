import type { Metadata } from "next";
import { Header, Footer, TrialLink, StartSection, Faq } from "../Shared";
import { FifteenMinutes } from "../Choices";
import s from "../experiment.module.css";

export const metadata: Metadata = {
  title: "仕事終わりも、学校帰りも。まずは15分。｜資格もちっと",
  description:
    "忙しい毎日に、ITパスポートの小さな学習習慣を。仕事や学校のあと、まずは15分から。登録不要の教材体験。",
};

function EveningScene() {
  return (
    <div
      className={s.eveningScene}
      role="img"
      aria-label="夕暮れの窓辺で、スマホを使って15分だけ学ぶイメージ"
    >
      <div className={s.sceneWindow}>
        <div className={s.sun} />
        <div className={s.skyline}>
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <span className={s.sceneCaption}>A MOMENT FOR YOURSELF.</span>
      <div className={s.desk} />
      <div className={s.book}>
        <span>
          little steps,
          <br />
          every day.
        </span>
      </div>
      <div className={s.cup}>
        <i />
      </div>
      <div className={s.phone}>
        <div className={s.phoneTop}>
          <span>19:30</span>
          <span>● ● ▰</span>
        </div>
        <p className={s.phoneHello}>今日も、おつかれさま。</p>
        <h3>
          ひとつ、
          <br />
          わかるを増やそう。
        </h3>
        <div className={s.phoneLesson}>
          <span>今日のテーマ</span>
          <strong>ANDとOR</strong>
          <div className={s.circuit}>
            <i>1</i>
            <b>＋</b>
            <i>0</i>
            <b>→</b>
            <em>1</em>
          </div>
          <p>スイッチを動かして理解する</p>
        </div>
        <div className={s.phoneProgress}>
          <span>今日の小さな一歩</span>
          <strong>15 min</strong>
          <i />
        </div>
        <div className={s.phoneButton}>さあ、はじめよう ↗</div>
        <small>学習イメージ</small>
      </div>
      <div className={s.timeStamp}>
        <strong>15</strong>
        <span>
          MINUTES
          <br />
          JUST FOR YOU
        </span>
      </div>
    </div>
  );
}

export default function FifteenPage() {
  return (
    <div className={`${s.page} ${s.fifteen}`}>
      <a className={s.skip} href="#content">
        本文へスキップ
      </a>
      <Header />
      <main id="content">
        <section className={s.hero} aria-labelledby="hero-heading">
          <div className={s.heroCopy}>
            <p className={s.eyebrow}>
              <span className={s.dot} /> 忙しい毎日に、ITパスポートという一歩。
            </p>
            <h1 id="hero-heading">
              仕事終わりも、
              <br />
              学校帰りも。
              <br />
              <span>
                まずは、<em>15</em>分。
              </span>
            </h1>
            <p className={s.lead}>
              今日も一日、がんばった。
              <br />
              そのあと少しだけ、未来の自分のために。
              <br />
              スマホひとつで「わかった」を増やしていこう。
            </p>
            <TrialLink />
            <p className={s.micro}>登録不要でお試し · スマホでそのまま</p>
          </div>
          <EveningScene />
        </section>
        <div className={s.promiseStrip}>
          <span>インストール不要</span>
          <span>操作して学べる教材</span>
          <span>教材・公式過去問は無料</span>
        </div>
        <section className={s.empathy}>
          <p className={s.eyebrow}>YOU DON’T NEED A PERFECT DAY.</p>
          <h2>
            「時間ができたら」を、
            <br />
            <span>「今日、少しだけ」に。</span>
          </h2>
          <p>
            帰ったら、ついスマホを眺めてしまう。
            <br />
            休日にまとめて、と思っていたら一週間。
            <br />
            だから、長くがんばる前に。
            <br />
            終わりが見える15分から始めませんか。
          </p>
          <div className={s.handNote}>がんばった一日の、ちいさなプラス。</div>
        </section>
        <section id="how" className={s.how}>
          <div className={s.sectionIntro}>
            <p className={s.eyebrow}>YOUR 15-MINUTE ROUTINE</p>
            <h2>
              15分って、
              <br />
              意外とできる。
            </h2>
            <p>
              復習して、ひとつ学んで、確かめる。
              <br />
              小さく区切ると、今日も手が届く。
            </p>
            <div className={s.bigNumber}>
              15<span>min / day</span>
            </div>
          </div>
          <FifteenMinutes />
        </section>
        <section className={s.features}>
          <p className={s.eyebrow}>LESS PRESSURE. MORE PROGRESS.</p>
          <h2>
            続けるために、
            <br />
            ひとりでがんばりすぎない。
          </h2>
          <div className={s.featureGrid}>
            <article>
              <span>01</span>
              <h3>「読む」だけで終わらない。</h3>
              <p>
                図やスイッチを動かす教材で、仕組みを体験。カタカナの言葉にも、具体的なイメージを。
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>今日やることが、見える。</h3>
              <p>
                試験日と使える時間から学習計画を作成。「今日は何をしよう」で迷う時間を減らします。
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>できない日からも、戻れる。</h3>
              <p>
                忙しい日は学習時間を短く。遅れたら計画を立て直して、また今日から始められます。
              </p>
            </article>
          </div>
        </section>
        <Faq />
        <StartSection />
      </main>
      <Footer />
    </div>
  );
}
