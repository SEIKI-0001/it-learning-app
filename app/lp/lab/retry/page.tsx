import type { Metadata } from "next";
import { Header, Footer, TrialLink, StartSection, Faq } from "../Shared";
import { RetryChoices } from "../Choices";
import s from "../experiment.module.css";

export const metadata: Metadata = {
  title: "前回の勉強を、次の一歩に。ITパスポートの再挑戦｜資格もちっと",
  description:
    "一度不合格になったあなたへ。苦手の確認、理解し直す学習、計画の立て直し。前回の経験を活かして、1問から再スタート。",
};

function NextChapter() {
  return (
    <div
      className={s.chapterArt}
      role="img"
      aria-label="前回の経験から、理解を確かめて次の挑戦へ進む道のり"
    >
      <span className={s.chapterLabel}>YOUR STORY CONTINUES.</span>
      <svg className={s.routeArt} viewBox="0 0 500 500" aria-hidden="true">
        <path
          d="M35 437 C60 310 260 435 224 278 S364 247 340 139 S444 129 458 42"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="5 8"
        />
        <circle cx="35" cy="437" r="7" fill="currentColor" />
        <circle cx="224" cy="278" r="9" fill="currentColor" />
        <circle cx="458" cy="42" r="9" fill="currentColor" />
      </svg>
      <div className={s.chapterPast}>
        <small>CHAPTER 01</small>
        <strong>がんばった、前回。</strong>
        <p>
          身につけた知識は、
          <br />
          ここからの土台になる。
        </p>
      </div>
      <div className={s.chapterNext}>
        <div>
          <span>CHAPTER</span>
          <strong>02</strong>
          <span className={s.chapterArrow}>↗</span>
        </div>
        <h3>
          今度は、
          <br />
          わかるところから。
        </h3>
        <ul>
          <li>迷うテーマを見つける</li>
          <li>仕組みから理解し直す</li>
          <li>小さく、続けていく</li>
        </ul>
        <span className={s.chapterTag}>NEXT STEP · まずは1問</span>
      </div>
      <p className={s.chapterFoot}>ここから、続きを書こう。</p>
    </div>
  );
}

export default function RetryPage() {
  return (
    <div className={`${s.page} ${s.retry}`}>
      <a className={s.skip} href="#content">
        本文へスキップ
      </a>
      <Header retry />
      <main id="content">
        <section className={s.hero} aria-labelledby="hero-heading">
          <div className={s.heroCopy}>
            <p className={s.eyebrow}>
              <span className={s.dot} /> ITパスポートに、もう一度挑むあなたへ。
            </p>
            <h1 id="hero-heading">
              前回の勉強を、
              <br />
              <span>次の一歩に。</span>
            </h1>
            <p className={s.lead}>
              悔しかった。それだけ、向き合った。
              <br />
              あの時間を、ゼロにしなくていい。
              <br />
              次は「がんばり方」を、少し変えてみよう。
            </p>
            <TrialLink retry />
            <p className={s.micro}>
              登録不要の教材体験 · まずはひとつの理解から
            </p>
          </div>
          <NextChapter />
        </section>
        <section className={s.retryLetter}>
          <p className={s.eyebrow}>NOT BACK TO ZERO.</p>
          <h2>
            足りなかったのは、
            <br />
            努力だけでしょうか。
          </h2>
          <div>
            <p>
              用語は覚えたのに、問題になると迷う。
              <br />
              得意なところばかり解いて、苦手が残る。
              <br />
              計画どおりに進まず、試験日が来てしまう。
            </p>
            <p>
              思い当たることがあるなら、
              <br />
              次は、そこから変えていけばいい。
              <br />
              <strong>前回の経験は、次の学び方を見つけるヒントです。</strong>
            </p>
          </div>
        </section>
        <section id="how" className={s.hurdleSection}>
          <p className={s.eyebrow}>CHANGE THE APPROACH</p>
          <h2>
            前回、どこで
            <br />
            つまずきましたか。
          </h2>
          <p className={s.sectionLead}>
            近いものを選んで、次の始め方を見つけましょう。
          </p>
          <RetryChoices />
        </section>
        <section className={s.retrySteps}>
          <div>
            <p className={s.eyebrow}>A DIFFERENT WAY FORWARD</p>
            <h2>
              次の勉強は、
              <br />
              この3つから。
            </h2>
            <p>
              すべてを最初から、ではなく。
              <br />
              今の自分に必要なことを、ひとつずつ。
            </p>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <h3>今の「わかる」を確かめる。</h3>
                <p>
                  公式過去問で、解けるところと迷うところを確認。正解した問題も、理由を説明できるか考えてみる。
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>苦手を、仕組みから理解する。</h3>
                <p>
                  言葉だけで覚えていたテーマは、動かせる教材へ。操作と解説をつなげて、自分の言葉にしていく。
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>続けられる計画に組み直す。</h3>
                <p>
                  次の試験日と使える時間から、日々の学習を計画。無理が出たら、立て直しながら進める。
                </p>
              </div>
            </li>
          </ol>
        </section>
        <div className={s.retryQuote}>
          <span aria-hidden="true">“</span>
          <p>
            もう一度やってみよう、と思えた。
            <br />
            <strong>それも、前進だ。</strong>
          </p>
          <small>今日の1問を、次の自信へ。</small>
        </div>
        <Faq retry />
        <StartSection retry />
      </main>
      <Footer />
    </div>
  );
}
