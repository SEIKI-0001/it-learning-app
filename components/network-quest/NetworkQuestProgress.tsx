"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import QuestHeader from "./QuestHeader";
import { missions } from "./missions";
import { parseProgress, readProgress, serverProgress, subscribeProgress } from "./progress";
import styles from "./quest.module.css";

export default function NetworkQuestProgress() {
  const saved = useSyncExternalStore(subscribeProgress, readProgress, serverProgress);
  const completed = parseProgress(saved);
  const next = missions.find((mission) => !completed.includes(mission.id));
  const percent = completed.length * 20;
  return <div className={styles.app}>
    <QuestHeader progress />
    <main className={styles.progressMain}>
      <div className={styles.breadcrumb}><Link href="/netlab/quest">冒険ラボ</Link><span>/</span>学習の記録</div>
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>YOUR LEARNING JOURNEY</span><h1>ここまでの冒険を、見てみよう。</h1><p>集めた「わかった」が、あなたの力になっていく。</p></div><Link href="/netlab/quest" className={styles.secondary}>学習画面に戻る <span aria-hidden="true">↗</span></Link></div>
      <section className={styles.progressOverview} aria-label="学習の進捗">
        <div className={styles.progressRing} style={{ "--progress": `${percent}%` } as CSSProperties}><span aria-label="冒険の達成率"><strong>{percent}<small>%</small></strong><span>ミッション達成率</span></span></div>
        <div className={styles.progressSummary}><span className={styles.heroBadge}>NETWORK ADVENTURE</span><h2>{completed.length === 5 ? "すべてのミッションをクリア！" : completed.length ? `${completed.length}つの発見を、手に入れました。` : "あなたの冒険は、ここから。"}</h2><p>{completed.length === 5 ? "ネットワークの基礎を学んだら、試験形式の問題にも挑戦してみよう。" : "体験と2問の確認クイズをクリアすると、バッジと100 XPを獲得できます。"}</p><div className={styles.progressNumbers}><div><small>クリアしたミッション</small><strong>{completed.length}<span> / 5</span></strong></div><div><small>獲得した経験値</small><strong aria-label="獲得経験値">{completed.length * 100}<span> XP</span></strong></div><div><small>獲得したバッジ</small><strong>{completed.length}<span> 個</span></strong></div></div></div>
      </section>
      <section className={styles.nextMission}><span className={styles.statIcon}><Icon name={next ? "compass" : "award"} /></span><div><span className={styles.eyebrow}>{next ? "NEXT ADVENTURE" : "NEXT CHALLENGE"}</span><h2>{next ? next.title : "称号「ネットワーク探検家」を獲得"}</h2><p>{next ? `${next.subtitle}・約3分` : "次は試験形式で力だめし。演習にはログインが必要です。"}</p></div><Link className={styles.primary} href={next ? `/netlab/quest?mission=${next.id}#mission` : "/theme-exam/network"}>{next ? "次のミッションに挑戦" : "試験形式でチャレンジ"}<Icon name="arrow-right" /></Link></section>
      <section className={styles.badgeSection} aria-labelledby="badges-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>BADGE COLLECTION</span><h2 id="badges-title">5つの発見の記録</h2></div><span>全問正解したミッションがクリアになります</span></div><div className={styles.progressMissionList}>{missions.map((mission, index) => {
        const done = completed.includes(mission.id);
        return <article key={mission.id} className={done ? styles.earnedBadge : ""}><span className={styles.badgeMedallion}><Icon name={mission.icon} />{done && <span><Icon name="check" /></span>}</span><div className={styles.badgeText}><span className={styles.eyebrow}>MISSION 0{index + 1}</span><h3>{mission.subtitle}</h3><p>{mission.title}</p></div><span className={styles.badgeState}>{done ? "クリア済み" : "未クリア"}<small>{done ? "100 XP 獲得" : "クリアで100 XP"}</small></span><Link className={styles.badgeAction} aria-label={`${mission.subtitle}${done ? "を復習" : "に挑戦"}`} href={`/netlab/quest?mission=${mission.id}#mission`}>{done ? "復習する" : "挑戦する"}<Icon name={done ? "rotate" : "arrow-right"} /></Link></article>;
      })}</div></section>
      <section className={styles.progressNote}><Icon name="lightbulb" /><div><h2>この記録について</h2><p>進捗はこのブラウザに保存されます。別の端末やブラウザには引き継がれません。冒険ラボのXPはアプリ本編とは別の記録です。</p><p>ここでの達成率は5つの入門ミッションのクリア率です。ITパスポートの合格可能性や、試験範囲全体の習得率を示すものではありません。</p></div></section>
      <footer className={styles.footer}><Link href="/learn/network">ネットワークの教材を詳しく読む →</Link></footer>
    </main>
  </div>;
}
