'use client';
import {use,useEffect,useState} from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import WeeklyReportView from '@/components/report/WeeklyReportView';
import {JournalMetrics,formatJournalDate} from '@/components/journal/JournalTimeline';
import type {JournalRecord} from '@/lib/journal/model';
import styles from '@/components/journal/journal.module.css';
export default function JournalDetailPage({params}:{params:Promise<{recordId:string}>}) {
  const {recordId}=use(params);
  const [record,setRecord]=useState<JournalRecord|null>(null),[error,setError]=useState(''),[readError,setReadError]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();fetch(`/api/journal/${recordId}`,{signal:controller.signal}).then(async res=>{if(!res.ok)throw new Error(res.status===404?'この記録は見つかりませんでした。':'記録を読み込めませんでした。');return res.json();}).then(data=>{setRecord(data.record);setError('');}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[recordId,revision]);
  // Runs after the fetched record has rendered. Prefetching a link never reaches this effect.
  useEffect(()=>{if(!record||record.first_viewed_at)return;let active=true;fetch(`/api/journal/${record.id}/view`,{method:'POST'}).then(res=>{if(active)setReadError(!res.ok);}).catch(()=>{if(active)setReadError(true);});return()=>{active=false;};},[record]);
  const f=record?.snapshot.facts;
  return <main className={styles.page}><div className={styles.detail}>
    <Link href="/journal" className={styles.textLink}>← 学習の記録</Link>
    {error?<p className={styles.notice} role="alert">{error} <button className={styles.textLink} onClick={()=>setRevision(n=>n+1)}>再試行</button></p>:!record?<p className={styles.empty} role="status">記録をひらいています…</p>:<>
      <h1>{record.record_type==='weekly'?'週次の振り返り':record.record_type==='daily'?'日次の記録':`${record.snapshot.checkpoint?.label} 突破`}</h1>
      <p className="mb-5 text-sm">{formatJournalDate(record.period_start)}{record.period_end!==record.period_start?` – ${formatJournalDate(record.period_end)}`:''}</p>
      {readError&&<p className={styles.notice}>既読状態を保存できませんでした。<button className={styles.textLink} onClick={()=>setRevision(n=>n+1)}>再試行</button></p>}
      <div className={record.record_type==='weekly'?styles.weekly:undefined}><JournalMetrics metrics={record.snapshot.metrics} weekly={record.record_type==='weekly'}/></div>
      {!record.finalized_at&&<p className={styles.meta}>今日の記録は集計中です。追加の学習が反映されます。</p>}
      {record.snapshot.historical&&<p className={styles.notice}>残っている履歴からまとめた記録です。当時のCP進捗・復習待ち・完了セクション数など、復元できない情報は表示していません。</p>}
      {record.record_type==='weekly'&&f&&record.narrative?<WeeklyReportView facts={f} savedNarrative={record.narrative} historical={record.snapshot.historical}/>:<section className={styles.detailSection}><h2>この日の歩み</h2><p className={styles.comment}>{record.narrative?.summary??record.snapshot.comment}</p>{record.snapshot.checkpoint&&<><ul>{record.snapshot.checkpoint.skills.map(s=><li key={s}>{s}</li>)}</ul><p className={styles.comment}>{record.snapshot.metrics.completedTopics!==null?`${record.snapshot.metrics.completedTopics}セクションを学習しました。`:''}{record.snapshot.checkpoint.next?`次は${record.snapshot.checkpoint.next}へ。ここまでの学びを次の範囲につなげていきましょう。`:'ここまでの学びを振り返りながら、理解を確かめていきましょう。'}</p></>}</section>}
      {f&&<>
        <section className={styles.detailSection}><h2>分野別の取り組み</h2><div className={styles.detailGrid}>{f.fieldShare.map(field=><div key={field.field}>{field.label}<br/><strong>{field.answered}問</strong></div>)}</div></section>
        <section className={styles.detailSection}><h2>理解の変化・強み</h2>{f.masteryChanges.length?<ul>{f.masteryChanges.map(m=><li key={m.topicId}>{m.title}：理解度 {m.before} → {m.after}</li>)}</ul>:<p className={styles.comment}>比較できるトピックの記録がまだありません。</p>}<p className={styles.comment}>以前間違えた問題のうち、{f.recovered.questionCount}問に正解できました。</p></section>
        {f.weakSpots.length>0&&<section className={styles.detailSection}><h2>次に確かめたいところ</h2><ul>{f.weakSpots.map(w=><li key={w.topicId}>{w.title}：{w.answered}問中{w.misses}問でつまずきました。解説を確認し、時間をあけてもう一度確かめてみましょう。</li>)}</ul></section>}
        {record.snapshot.comparison&&<section className={styles.detailSection}><h2>過去の自分との比較</h2><p className={styles.comment}>{record.snapshot.comparison.label}：正答率 {record.snapshot.comparison.before}% → {record.snapshot.comparison.after}%</p></section>}
        {!record.snapshot.historical&&<section className={styles.detailSection}><h2>この時点の学習進捗</h2><div className={styles.detailGrid}><div>学習済み<br/><strong>{f.cumulative.completedTopics}セクション</strong></div><div>累計回答<br/><strong>{f.cumulative.totalAnswered}問</strong></div><div>{f.checkpoint.label}<br/>CP達成条件 {f.checkpoint.earnedRequired} / {f.checkpoint.totalRequired}<br/>あと{Math.max(0,f.checkpoint.totalRequired-f.checkpoint.earnedRequired)}件</div><div>復習待ち {f.reviews.waiting}件<br/>この時点で期限到来 {f.reviews.due}件</div></div></section>}
      </>}
      {['pending','retry'].includes(record.narrative_status)&&record.finalized_at&&<p className={`${styles.meta} mt-6`}>学習データからの振り返りを表示しています。AIの文章は同じ記録をもとに準備中です。</p>}
    </>}
  </div><BottomNav/></main>;
}
