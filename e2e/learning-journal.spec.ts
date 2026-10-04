import {test,expect} from '@playwright/test';
import {buildJournalSnapshot} from '../lib/journal/facts';
import {buildTemplateNarrative} from '../lib/weeklyReportNarrative';
import {getAllTopics} from '../lib/content';
import type {JournalRecord} from '../lib/journal/model';
const progress={level:1,exp:0,currentDay:1,completedDays:[],streakCount:3,weakTags:[],completedTopics:[],topicMastery:{},reviewQueue:[]};
const topic=getAllTopics()[0];
const answers=Array.from({length:12},(_,i)=>({questionId:`q${i}`,topicId:topic.id,answeredAt:'2026-09-26T10:00:00Z',isCorrect:i<9,tag:'',selectedChoice:'A' as const,timeSpentSeconds:90}));
function record(id:string,type:'daily'|'weekly',date:string):JournalRecord {
 const snapshot=buildJournalSnapshot({state:{progress,answers},answers,type,date:'2026-09-26',timezone:'Asia/Tokyo',now:new Date('2026-09-26T12:00Z')})!;
 snapshot.comment='ネットワークの問題に取り組み、前回間違えたIPアドレスの問題にも正解できました。少しずつ理解を確かめています。';
 return {id,user_id:'fixture',record_type:type,record_key:id,period_start:type==='weekly'?'2026-09-19':date,period_end:date,occurred_at:`${date}T12:00:00Z`,timezone:'Asia/Tokyo',snapshot,narrative:type==='weekly'?{...buildTemplateNarrative(snapshot.facts!),source:'ai',summary:'今週はネットワーク分野に取り組みました。以前間違えた問題にも正解が増え、復習の積み重ねが見えてきています。'}:null,narrative_status:'ready',narrative_attempts:1,next_retry_at:'',lease_until:null,created_at:`${date}T12:00:00Z`,finalized_at:`${date}T12:00:00Z`,first_viewed_at:null};
}
test('journal months, filters, unread CTA, stored detail and mobile layout',async({page})=>{
 const daily=record('10000000-0000-4000-8000-000000000001','daily','2026-09-26');
 const weekly=record('10000000-0000-4000-8000-000000000002','weekly','2026-09-25');
 const cp={...record('10000000-0000-4000-8000-000000000003','daily','2026-09-18'),record_type:'checkpoint' as const};cp.snapshot={...cp.snapshot,facts:null,checkpoint:{id:'cp2',label:'CHECKPOINT 2',next:'CHECKPOINT 3',skills:['突破試験 10問中8問正解']},comment:'14セクションを学習し、128問に回答。データベース分野で、以前間違えた問題に正解した記録が残りました。'};
 const records=[daily,weekly,cp,record('10000000-0000-4000-8000-000000000004','daily','2026-09-14'),record('10000000-0000-4000-8000-000000000005','daily','2026-08-31')];
 let viewed=0; const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/journal**',async route=>{
  const url=new URL(route.request().url()),method=route.request().method();
  if(url.pathname.endsWith('/view')){viewed++;const r=records.find(r=>url.pathname.includes(r.id));if(r)r.first_viewed_at='2026-09-27T00:00Z';return route.fulfill({json:{ok:true}});}
  if(url.pathname==='/api/journal'&&method==='POST')return route.fulfill({json:{ok:true,pending:false}});
  if(url.pathname==='/api/journal'){const m=url.searchParams.get('month'),t=url.searchParams.get('type');return route.fulfill({json:{records:records.filter(r=>r.period_end.startsWith(m!)&&(t==='all'||r.record_type===t)),months:['2026-09','2026-08'],unread:weekly.first_viewed_at?null:{id:weekly.id,month:'2026-09'}}});}
  const r=records.find(r=>url.pathname.endsWith(r.id));return route.fulfill({json:{record:r}});
 });
 // 画面は「今月」を初期表示する。フィクスチャの月（2026年9月）に時計を固定し、実行日に左右されないようにする。
 await page.clock.setFixedTime(new Date('2026-09-27T09:00:00+09:00'));
 await page.setViewportSize({width:390,height:844});await page.goto('/journal');
 await expect(page.getByText('今週の振り返りが届いています')).toBeVisible();
 await expect(page.getByRole('link',{name:'進捗',exact:true})).toBeVisible();
 expect(viewed).toBe(0);
 await page.getByRole('button',{name:'すべて',exact:true}).click();
 await expect(page.getByText('今週の振り返りが届いています')).toBeVisible();
 await page.screenshot({path:'/tmp/learning-journal-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'節目',exact:true}).click();await expect(page.getByLabel('学習の歩み').getByRole('link')).toHaveCount(1);
 await page.getByRole('button',{name:'すべて',exact:true}).click();
 await page.getByLabel('表示する月').selectOption('2026-08');await expect(page.getByLabel('学習の歩み').getByRole('link')).toHaveCount(1);
 await page.getByRole('link',{name:'レポートを見る →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'週次の振り返り',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'分野別の取り組み'})).toBeVisible();
 await expect.poll(()=>viewed).toBe(1);
 await page.getByRole('link',{name:'← 学習の記録'}).click();await expect(page.getByText('NEW',{exact:true})).toHaveCount(0);
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'/tmp/learning-journal-desktop.png',fullPage:true});
 expect(errors).toEqual([]);
});
