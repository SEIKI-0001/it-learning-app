'use client';
import Link from 'next/link';
import {useEffect,useRef} from 'react';
import Icon,{type IconName} from '@/components/ui/Icon';
import type {JournalRecord,JournalSnapshot} from '@/lib/journal/model';
import styles from './journal.module.css';
export function formatJournalDate(date:string):string { const [y,m,d]=date.split('-').map(Number);return `${y}.${m}.${d}`; }
export function JournalMetrics({metrics,weekly=false}:{metrics:JournalSnapshot['metrics'];weekly?:boolean}) {
  const m=metrics;
  const minutes=m.seconds===null?null:Math.floor(m.seconds/60);
  const time=minutes===null?'未計測':minutes<1?'1分未満':minutes>=60?`${Math.floor(minutes/60)}時間${minutes%60}分`:`${minutes}分`;
  const values:{label:string;icon:IconName;value:string|number;unit?:string}[]=[{label:'学習時間',icon:'clock',value:time},{label:'回答数',icon:'file-text',value:m.answered,unit:'問'},{label:'正答率',icon:'chart',value:m.accuracy??'—',unit:m.accuracy===null?'':'%'}];
  if(weekly)values.push({label:'学習日数',icon:'calendar',value:m.daysStudied,unit:'日'});
  return <><dl className={styles.metrics}>{values.map(v=><div className={styles.metric} key={v.label}><dt><Icon name={v.icon}/>{v.label}</dt><dd><span className={typeof v.value==='string'&&v.value.length>4?styles.smallValue:undefined}>{v.value}</span>{v.unit&&<span className={styles.unit}>{v.unit}</span>}</dd></div>)}</dl>{m.unmeasured>0&&m.seconds!==null&&<p className={styles.meta}>時間は記録された分のみ（一部未計測）</p>}</>;
}
function JournalCard({record:r}:{record:JournalRecord}) {
  const weekly=r.record_type==='weekly',cp=r.record_type==='checkpoint',unread=weekly&&!r.first_viewed_at;
  const card=useRef<HTMLLIElement>(null);
  useEffect(()=>{
    if(!cp||Date.now()-Date.parse(r.created_at)>86400000)return;
    try {const key=`journal-cp-seen:${r.id}`;if(!sessionStorage.getItem(key)){card.current?.classList.add(styles.reveal);sessionStorage.setItem(key,'1');}}catch{/* Animation is optional. */}
  },[cp,r.id,r.created_at]);
  const text=r.narrative?.summary??r.snapshot.comment;
  return <li ref={card} className={`${styles.entry} ${weekly?styles.weekly:cp?styles.checkpoint:''} ${unread?styles.unread:''}`}>
    <span aria-hidden className={styles.marker}>{cp?'✧':null}</span>
    <Link href={`/journal/${r.id}`} className={styles.card}>
      <div className={styles.cardHeading}><time dateTime={r.period_end}>{weekly?`${formatJournalDate(r.period_start)} – ${formatJournalDate(r.period_end).slice(5)}`:formatJournalDate(r.period_end)}</time><span className={styles.badge}>{weekly?'今週の振り返り':cp?`${r.snapshot.checkpoint?.label??'CHECKPOINT'} 突破`:'今日の記録'}</span>{unread&&<span className={styles.new}>NEW</span>}</div>
      {unread&&<p className={styles.invitation}>今週の振り返りが届いています</p>}
      {!cp&&<JournalMetrics metrics={r.snapshot.metrics} weekly={weekly}/>}
      {cp&&<span className={styles.seal} aria-hidden><Icon name="award"/></span>}
      <div className={weekly?styles.reflection:undefined}>
        {weekly&&<p className={styles.reflectionTitle}><Icon name="star"/>{r.narrative?.source==='ai'?'AIによる振り返り':'学習の振り返り'}</p>}
        <p className={styles.comment}>{text}</p>
        {r.snapshot.comparison&&<p className={styles.comparison}><small>{r.snapshot.comparison.label}</small>{r.snapshot.comparison.before}% <span aria-hidden>→</span> {r.snapshot.comparison.after}%</p>}
      </div>
      {!r.finalized_at&&<p className={styles.meta}>集計中 · 今日の学習が加わります</p>}
      <span className={styles.cardFooter}>{unread?'レポートを見る →':'詳細を見る'}<Icon name="chevron-right"/></span>
    </Link>
  </li>;
}
export default function JournalTimeline({records}:{records:JournalRecord[]}) {return <ol className={styles.timeline} aria-label="学習の歩み">{records.map(r=><JournalCard key={r.id} record={r}/>)}</ol>;}
