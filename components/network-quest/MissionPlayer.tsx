"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import type { Mission } from "./missions";
import styles from "./quest.module.css";

export default function MissionPlayer({ mission, index, onComplete, onNext }: {
  mission: Mission; index: number; onComplete: (id: string) => void; onNext: () => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [phase, setPhase] = useState<"build" | "quiz" | "result">("build");
  const [answers, setAnswers] = useState<number[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const connected = choice === mission.answer;
  const question = mission.questions[questionIndex];
  const answered = answers[questionIndex] !== undefined;
  const correct = answered && answers[questionIndex] === question.answer;
  const score = answers.filter((answer, i) => answer === mission.questions[i].answer).length;

  function focusHeading() { requestAnimationFrame(() => heading.current?.focus()); }
  function finish() {
    if (score === mission.questions.length) onComplete(mission.id);
    setPhase("result");
    focusHeading();
  }
  function retry() {
    setChoice(null); setAnswers([]); setQuestionIndex(0); setPhase("build"); focusHeading();
  }

  return (
    <section className={styles.player} id="mission" aria-label="ミッション体験">
      <div className={styles.playerTop}>
        <span className={styles.eyebrow}>MISSION {String(index + 1).padStart(2, "0")} <span> / 05</span></span>
        <span className={styles.smallTag}><Icon name="clock" /> 約3分</span>
      </div>
      <div className={styles.steps} aria-label="学習の流れ">
        {["体験する", "確認問題", "ふりかえり"].map((label, i) => <span key={label} aria-current={i === ["build", "quiz", "result"].indexOf(phase) ? "step" : undefined}><b>{i + 1}</b>{label}</span>)}
      </div>
      <h2 ref={heading} tabIndex={-1} className={styles.missionTitle}>{phase === "build" ? mission.title : phase === "quiz" ? "わかった！を、得点力に。" : score === 2 ? "ミッションクリア！" : "もう少しで、マスター。"}</h2>
      {phase === "build" && <>
        <p className={styles.story}>{mission.story}</p>
        <div className={`${styles.scene} ${connected ? styles.connected : ""}`} aria-label={`${mission.source}から${mission.target}への通信${connected ? "：成功" : "：接続待ち"}`}>
          <span className={styles.sceneLabel}>{mission.tag}</span>
          <div className={styles.sceneNodes}>
            <div className={styles.node}><div className={styles.device}><Icon name={mission.id === "mail" ? "mail" : "laptop"} /></div><b>{mission.source}</b><small>FROM</small></div>
            <div className={styles.wire}><span /></div>
            <div className={`${styles.node} ${styles.bridge}`}><div className={styles.device}><Icon name={connected ? mission.choices[mission.answer].icon : "plus"} /></div><b>{connected ? mission.bridge : "ここに必要なものは？"}</b><small>{connected ? "CONNECTED" : "SELECT BELOW"}</small></div>
            <div className={styles.wire}><span /></div>
            <div className={styles.node}><div className={styles.device}><Icon name={mission.id === "lan" ? "monitor" : "server"} /></div><b>{mission.target}</b><small>TO</small></div>
          </div>
          <div className={styles.connectionState}><i />{connected ? "通信成功！ データが届きました" : "必要な機器や仕組みを選んで、つなげよう"}</div>
        </div>
        <h3 className={styles.task}>{mission.task}</h3>
        <div className={styles.choices}>
          {mission.choices.map((option, i) => <button key={option.label} type="button" aria-pressed={choice === i} disabled={connected} className={choice === i ? i === mission.answer ? styles.rightChoice : styles.wrongChoice : ""} onClick={() => setChoice(i)}><Icon name={option.icon} /><span>{option.label}</span><Icon name={choice === i ? i === mission.answer ? "check" : "rotate" : "plus"} /></button>)}
        </div>
        <div role="status" className={choice === null ? styles.quietFeedback : connected ? styles.goodFeedback : styles.feedback}>
          {choice === null ? "間違えても大丈夫。選んで、試して、覚えよう。" : mission.choices[choice].feedback}
        </div>
        {connected && <div className={styles.afterBuild}><p><Icon name="lightbulb" />{mission.takeaway}</p><button className={styles.primary} onClick={() => { setPhase("quiz"); focusHeading(); }}>確認問題へ <Icon name="arrow-right" /></button></div>}
      </>}
      {phase === "quiz" && <div className={styles.quiz}>
        <p className={styles.quizCount}>オリジナル確認問題 {questionIndex + 1} / {mission.questions.length}</p>
        <h3>{question.prompt}</h3>
        <div className={styles.answers}>{question.options.map((option, i) => <button key={option} disabled={answered} className={answered && i === question.answer ? styles.rightChoice : answered && i === answers[questionIndex] ? styles.wrongChoice : ""} onClick={() => setAnswers((previous) => [...previous, i])}><span>{["ア", "イ", "ウ", "エ"][i]}</span>{option}{answered && i === question.answer && <Icon name="check" />}</button>)}</div>
        {answered && <div role="status" className={correct ? styles.goodFeedback : styles.feedback}><strong>{correct ? "正解！" : `正解は「${["ア", "イ", "ウ", "エ"][question.answer]}」`}</strong><p>{question.explanation}</p></div>}
        {answered && <button className={styles.primary} onClick={() => { if (questionIndex === mission.questions.length - 1) finish(); else { setQuestionIndex((previous) => previous + 1); focusHeading(); } }}>{questionIndex === mission.questions.length - 1 ? "結果を見る" : "次の問題へ"}<Icon name="arrow-right" /></button>}
      </div>}
      {phase === "result" && <div className={styles.result}>
        <div className={styles.resultMedal}><Icon name={score === 2 ? "award" : "sprout"} /></div>
        <p className={styles.score}>{score}<span> / {mission.questions.length} 問正解</span></p>
        <p>{score === 2 ? "このミッションのバッジと100 XPを獲得！" : "解説を読んで再挑戦しよう。全問正解で100 XP！"}</p>
        <p className={styles.resultNote}>経験値は各ミッションの初回クリア時に獲得します。</p>
        <div className={styles.takeaway}><strong>覚えておこう</strong><p>{mission.takeaway}</p></div>
        <div className={styles.resultActions}><button className={styles.primary} onClick={score === 2 ? onNext : retry}>{score === 2 ? index === 4 ? "冒険マップへ" : "次のミッションへ" : "もう一度挑戦"}<Icon name="arrow-right" /></button>{score === 2 && <button className={styles.secondary} onClick={retry}>もう一度挑戦</button>}</div>
        <Link className={styles.textLink} href="/netlab/quest/progress">学習の記録を見る <Icon name="chart" /></Link><br />
        <Link className={styles.textLink} href={mission.lessonHref}>このテーマを詳しく学ぶ <Icon name="book-open" /></Link>
      </div>}
    </section>
  );
}
