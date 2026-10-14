"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { missions } from "./missions";
import { parseProgress, readProgress, saveProgress, serverProgress, subscribeProgress } from "./progress";
import MissionPlayer from "./MissionPlayer";
import QuestHeader from "./QuestHeader";
import styles from "./quest.module.css";

export default function NetworkQuest({ initialMissionId = "lan" }: { initialMissionId?: string }) {
  const [active, setActive] = useState(() => Math.max(0, missions.findIndex((mission) => mission.id === initialMissionId)));
  const [earned, setEarned] = useState<string[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const saved = useSyncExternalStore(subscribeProgress, readProgress, serverProgress);
  const completed = [...new Set([...parseProgress(saved), ...earned])];

  function selectMission(index: number) {
    setActive(index);
    requestAnimationFrame(() => {
      const mission = document.getElementById("mission");
      mission?.querySelector<HTMLHeadingElement>("h2")?.focus({ preventScroll: true });
      mission?.scrollIntoView({ behavior: "instant", block: "start" });
    });
  }
  function complete(id: string) {
    const next = [...new Set([...completed, id])];
    setEarned(next);
    setSaveFailed(!saveProgress(next));
  }

  return (
    <div className={styles.app}>
      <a className={styles.skip} href="#mission">ミッションにスキップ</a>
      <QuestHeader />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.courseLabel}><Icon name="compass" /> はじめてのネットワーク</div>
          <p className={styles.sideCaption}>あなたの冒険</p>
          <nav aria-label="ミッション一覧">{missions.map((mission, i) => <button key={mission.id} aria-current={active === i ? "step" : undefined} onClick={() => selectMission(i)}><span className={`${styles.sideNumber} ${completed.includes(mission.id) ? styles.doneNumber : ""}`}>{completed.includes(mission.id) ? <Icon name="check" /> : String(i + 1).padStart(2, "0")}</span><span><b>{mission.subtitle}</b><small>{mission.title}</small></span>{active === i && <Icon name="chevron-right" />}</button>)}</nav>
          <Link href="/netlab/quest/progress" className={styles.progressLink}><Icon name="chart" /><span><b>学習の記録を見る</b><small>クリア状況・経験値・バッジ</small></span><Icon name="arrow-right" /></Link>
          <Link href="/netlab" className={styles.sideLink}><Icon name="tool" /> 自由にネットワークを作る<Icon name="arrow-right" /></Link>
          <Link href="/learn" className={styles.sideLink}><Icon name="book-open" /> すべての学習テーマ</Link>
        </aside>
        <main className={styles.main}>
          <div className={styles.breadcrumb}>学びのラボ <span>/</span> ネットワークの基礎</div>
          <section className={styles.hero} aria-labelledby="quest-title">
            <div className={styles.heroCopy}><span className={styles.heroBadge}><span /> 登録なしで、今すぐ体験</span><h1 id="quest-title">つないで、わかる。<br />ネットワークの<span>冒険へ。</span></h1><p>いつものインターネットに、ちょっとした発見を。<br />触って、試して、ITパスポートの知識に変えよう。</p><a href="#mission" className={styles.primary}><Icon name="play" />{completed.length ? "冒険を続ける" : "最初のミッションへ"}<Icon name="arrow-right" /></a><div className={styles.heroMeta}><span><Icon name="clock" /> 1回 約3分</span><span><Icon name="sparkle" /> 体験＋確認クイズ</span></div></div>
            <div className={styles.heroArt} aria-hidden="true"><div className={styles.orbit} /><div className={styles.orbitInner} /><div className={styles.artGlobe}><Icon name="globe" /></div><div className={`${styles.artDevice} ${styles.artLaptop}`}><Icon name="laptop" /><small>YOU</small></div><div className={`${styles.artDevice} ${styles.artServer}`}><Icon name="server" /><small>WORLD</small></div><div className={`${styles.artDevice} ${styles.artLock}`}><Icon name="shield" /></div><div className={styles.artPacket}><Icon name="mail" /><span>Hello, network!</span></div><span className={styles.artDot1} /><span className={styles.artDot2} /><span className={styles.artCaption}>小さなパケットの、大きな旅。</span></div>
          </section>
          {saveFailed && <p className={styles.saveWarning} role="alert">このブラウザでは保存できません。今の画面では続けられますが、閉じると今回の進捗は失われます。</p>}
          <div className={`${styles.workArea} ${styles.learningWorkArea}`}>
            <MissionPlayer key={active} mission={missions[active]} index={active} onComplete={complete} onNext={() => { if (active < missions.length - 1) selectMission(active + 1); else { document.getElementById("map-title")?.focus({ preventScroll: true }); document.getElementById("adventure-map")?.scrollIntoView({ behavior: "instant" }); } }} />
            <aside className={styles.helpColumn}><section className={styles.guide}><span className={styles.guideIcon}><Icon name="lightbulb" /></span><h2>「わからない」からで大丈夫。</h2><p>まずは気になる選択肢をタップ。間違いにも、仕組みを知るヒントが隠れています。</p><ol><li><span>01</span>機器や仕組みを選んで体験</li><li><span>02</span>解説で「なるほど！」</li><li><span>03</span>2問のクイズで力だめし</li></ol></section><section className={styles.examCard}><Icon name="target" /><h2>その学びを、試験の力に。</h2><p>体験で覚えた言葉を、ネットワークのテーマ別演習で確かめよう。</p><Link href="/theme-exam/network">試験形式でチャレンジ<Icon name="arrow-right" /></Link><small>演習にはログインが必要です</small></section></aside>
          </div>
          <section className={styles.map} id="adventure-map" aria-labelledby="map-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>YOUR ADVENTURE</span><h2 id="map-title" tabIndex={-1}>5つの発見を、集めよう。</h2></div><span>好きなところから挑戦できます</span></div><div className={styles.mapGrid}>{missions.map((mission, i) => <button key={mission.id} onClick={() => selectMission(i)} aria-label={`${mission.subtitle}に挑戦`} className={completed.includes(mission.id) ? styles.mapCompleted : ""}><span className={styles.mapIndex}>MISSION 0{i + 1}{completed.includes(mission.id) && <Icon name="circle-check" />}</span><div className={styles.mapIcon}><Icon name={mission.icon} /></div><h3>{mission.subtitle}</h3><p>{mission.title}</p><span className={styles.mapBottom}>{completed.includes(mission.id) ? "クリア済み" : "体験する"}<Icon name="arrow-right" /></span></button>)}</div></section>
          {completed.length === 5 && <section className={styles.allDone}><Icon name="award" /><div><h2>5つの発見、コンプリート！</h2><p>ネットワークの基礎をつかめました。次はテーマ別演習や他分野にも挑戦しよう。</p></div><Link className={styles.primary} href="/learn">合格に向けて学習を続ける<Icon name="arrow-right" /></Link></section>}
          <footer className={styles.footer}><p><Icon name="save" /> 進捗はこのブラウザに保存されます。冒険ラボのXPはアプリ本編のXPとは別です。</p><p>ITパスポートのネットワーク分野の入門教材です。合格には他分野の学習も必要です。</p><a href="https://www.ipa.go.jp/shiken/syllabus/gaiyou.html" target="_blank" rel="noreferrer">出題範囲の参考：IPA ITパスポート試験シラバス ↗</a></footer>
        </main>
      </div>
    </div>
  );
}
