'use client';
import {useEffect,useState,useCallback} from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import Icon from '@/components/ui/Icon';
import JournalTimeline from '@/components/journal/JournalTimeline';
import type {JournalRecord,JournalType} from '@/lib/journal/model';
import styles from '@/components/journal/journal.module.css';
type Listing={records:JournalRecord[];months:string[];unread:{id:string;month:string}|null};
const filters:[JournalType|'all',string][]=[['all','すべて'],['daily','日次の記録'],['weekly','週次の振り返り'],['checkpoint','節目']];
function monthNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
export default function JournalPage(){
  const [month,setMonth]=useState(monthNow),[type,setType]=useState<JournalType|'all'>('all');
  const [listing,setListing]=useState<Listing|null>(null),[error,setError]=useState(''),[syncError,setSyncError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  const sync=useCallback(async(signal?:AbortSignal)=>{
    return fetch('/api/journal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}),signal}).then(async response=>{
      if(!response.ok)throw new Error(response.status===401?'記録を見るにはログインしてください。':'新しい記録の保存を完了できませんでした。保存済みの記録は引き続き閲覧できます。');
      const result=await response.json();setSyncError(result.pending?'過去の記録を整理しています。しばらくして更新すると続きが表示されます。':'');setRevision(n=>n+1);
    }).catch(e=>{if(!signal?.aborted)setSyncError(e instanceof Error?e.message:'記録の保存に失敗しました。');});
  },[]);
  useEffect(()=>{const controller=new AbortController();void sync(controller.signal);return()=>controller.abort();},[sync]);
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/journal?month=${month}&type=${type}`,{signal:controller.signal}).then(async res=>{if(!res.ok)throw new Error(res.status===401?'記録を見るにはログインしてください。':'記録を読み込めませんでした。時間をおいて再試行してください。');return res.json();}).then((data:Listing)=>{setListing(data);setError('');setLoading(false);}).catch(e=>{if(!controller.signal.aborted){setError(e.message);setLoading(false);}});
    return()=>controller.abort();
  },[month,type,revision]);
  const changeMonth=(value:string)=>{setMonth(value);setLoading(true);};
  return <main className={styles.page}><div className={styles.frame}>
    <header className={styles.header}><Icon name="compass" className={styles.compass}/><div className={styles.headingRow}><h1>学習の記録</h1><p className={styles.english}>LEARNING<br/>JOURNAL</p></div><div className={styles.flourish} aria-hidden>◇ ✧ ◇</div><p className={styles.subtitle}>積み重ねた学びを、あとから何度でも振り返れます。</p></header>
    <div className={styles.controls}><label className={styles.month}><span className="sr-only">表示する月</span><select value={month} onChange={e=>changeMonth(e.target.value)}>{(listing?.months??[month]).map(m=><option key={m} value={m}>{Number(m.slice(0,4))}年{Number(m.slice(5))}月</option>)}</select></label><div className={styles.filters} role="group" aria-label="記録の種類">{filters.map(([value,label])=><button key={value} aria-pressed={type===value} onClick={()=>{setType(value);setLoading(true);}}>{label}</button>)}</div></div>
    {listing?.unread&&listing.unread.month!==month&&<p className={styles.notice}>新しい振り返りが届いています。<br/><Link className={styles.textLink} href={`/journal/${listing.unread.id}`}>レポートを見る →</Link></p>}
    {syncError&&<p className={styles.notice} role="status">{syncError} <button className={styles.textLink} onClick={()=>void sync()}>更新する</button></p>}
    {error?<p role="alert" className={styles.notice}>{error} <button className={styles.textLink} onClick={()=>setRevision(n=>n+1)}>再試行</button> <Link href="/login" className={styles.textLink}>ログイン</Link></p>:loading?<p className={styles.empty} role="status">記録をひらいています…</p>:listing?.records.length?<JournalTimeline records={listing.records}/>:<div className={styles.empty}><Icon name="book-open"/><p>この月には、まだ記録がありません。</p><p>学んだ日々の歩みを、ここに残していきます。</p><Link href="/today" className={styles.textLink}>今日の学習へ</Link></div>}
    <p className={styles.bottomNote}>一日、一問。その積み重ねが、あなたの学習史に。</p><p className="mt-5 text-center text-xs"><Link className={styles.textLink} href="/progress">現在の進捗を見る →</Link></p>
  </div><BottomNav/></main>;
}
