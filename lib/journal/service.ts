import type {SupabaseClient} from '@supabase/supabase-js';
import {progressRowToProgress,type ProgressRow} from '@/lib/dbMappers';
import {getCheckpoint, getNextCheckpointId} from '@/lib/checkpoints';
import {mergeJournalAnswers,buildJournalSnapshot} from './facts';
import {dateInZone,shiftDate,startInZone,validTimezone} from './dates';
import {allRows,assertDb} from './repository';
import {completeNarrative,templateFor} from './narrative';
import type {JournalRecord,JournalSnapshot} from './model';
export type JournalSchedule={user_id:string;timezone:string;next_weekly_date:string|null;lease_until:string};
type LegacyRow=Parameters<typeof mergeJournalAnswers>[0][number];

export async function ensureJournal(db:SupabaseClient,userId:string,timezone:string,claimed?:JournalSchedule,now=new Date()):Promise<{pending:boolean}> {
  if(!validTimezone(timezone)) throw new Error('invalid timezone');
  const lease=claimed?{data:[claimed],error:null}:await db.rpc('claim_journal_user',{p_user_id:userId,p_timezone:timezone});assertDb(lease.error);
  const schedule=(lease.data as JournalSchedule[])[0];if(!schedule) return {pending:true};
  timezone=schedule.timezone;
  const today=dateInZone(now,timezone);
  try {
    const [progressResult,legacy,attempts,tasks,existing]=await Promise.all([
      db.from('user_progress').select('*').eq('user_id',userId).maybeSingle(),
      allRows<LegacyRow>(db,'user_answers','question_id,answered_at,is_correct,topic_id,tag,selected_choice',userId,'id'),
      allRows<LegacyRow>(db,'question_attempts','question_id,answered_at,is_correct,topic_id,selected_answer,time_spent_seconds',userId,'attempt_id'),
      allRows<{date:string;status:string;completion_source:string}>(db,'daily_study_tasks','date,status,completion_source',userId,'task_id'),
      allRows<JournalRecord>(db,'learning_journal_records','*',userId,'id'),
    ]);assertDb(progressResult.error);
    if(!progressResult.data) { await release(db,schedule);return {pending:false}; }
    const answers=mergeJournalAnswers(legacy,attempts).filter(a=>Date.parse(a.answeredAt)<=now.getTime());
    const state={answers,progress:progressRowToProgress(progressResult.data as ProgressRow)};
    const activityDates=tasks.filter(t=>t.status==='completed'&&t.completion_source==='app_actual').map(t=>t.date).filter(d=>d<=today);
    const dates=[...new Set([...answers.map(a=>dateInZone(new Date(a.answeredAt),timezone)),...activityDates])].sort();
    const saved=new Map(existing.filter(r=>r.record_type==='daily').map(r=>[r.period_end,r]));
    const needed=dates.filter(d=>!saved.get(d)?.finalized_at);
    // Prefer today's visible entry, then backfill a bounded batch of historical days.
    const selected=[...needed.filter(d=>d===today),...needed.filter(d=>d!==today)].slice(0,40);
    for(const date of selected) {
      const previous=saved.get(date);
      const snapshot=buildJournalSnapshot({state,answers,type:'daily',date,timezone,now,activityDates,historical:date!==today});
      if(!snapshot) continue;
      const finalized=date<today?now.toISOString():null;
      const values={snapshot,narrative:templateFor({snapshot,record_type:'daily'}),finalized_at:finalized,narrative_status:snapshot.metrics.answered?'pending':'not_needed'};
      if(previous) {const result=await db.from('learning_journal_records').update(values).eq('id',previous.id).eq('user_id',userId).is('finalized_at',null);assertDb(result.error);}
      else {
        const last=answers.filter(a=>dateInZone(new Date(a.answeredAt),timezone)===date).at(-1)?.answeredAt;
        const result=await db.from('learning_journal_records').upsert({...values,user_id:userId,record_type:'daily',record_key:`${userId}:daily:${date}`,period_start:date,period_end:date,occurred_at:last??startInZone(date,timezone).toISOString(),timezone},{onConflict:'user_id,record_type,record_key',ignoreDuplicates:true});assertDb(result.error);
      }
    }
    let nextWeekly=schedule.next_weekly_date;
    if(dates.length) {
      nextWeekly??=today;
      for(let i=0;i<4&&nextWeekly<=today;i++) {
        const date=nextWeekly;
        const snapshot=buildJournalSnapshot({state,answers,type:'weekly',date,timezone,now,activityDates,historical:date<today})!;
        const result=await db.from('learning_journal_records').upsert({user_id:userId,record_type:'weekly',record_key:`${userId}:weekly:${date}`,period_start:shiftDate(date,-6),period_end:date,occurred_at:date===today?now.toISOString():new Date(startInZone(shiftDate(date,1),timezone).getTime()-1).toISOString(),timezone,snapshot,narrative:templateFor({snapshot,record_type:'weekly'}),narrative_status:snapshot.metrics.answered?'pending':'not_needed',finalized_at:now.toISOString()},{onConflict:'user_id,record_type,record_key',ignoreDuplicates:true});assertDb(result.error);
        nextWeekly=shiftDate(nextWeekly,7);
      }
    }
    // Legacy milestone backfill: only actual dated passes; never today's progress as old evidence.
    for(const attempt of state.progress.checkpointProgress?.finalExamAttempts??[]) {
      if(!attempt.passed||!/^cp[0-6]$/.test(attempt.checkpointId)||!Number.isFinite(Date.parse(attempt.attemptedAt))||Date.parse(attempt.attemptedAt)>now.getTime())continue;
      if(existing.some(r=>r.record_type==='checkpoint'&&r.snapshot.checkpoint?.id===attempt.checkpointId))continue;
      const cp=getCheckpoint(attempt.checkpointId),next=getNextCheckpointId(attempt.checkpointId);
      const through=answers.filter(a=>Date.parse(a.answeredAt)<=Date.parse(attempt.attemptedAt));
      const snapshot:JournalSnapshot={version:1,historical:true,facts:null,comparison:null,metrics:{answered:through.length,correct:through.filter(a=>a.isCorrect).length,accuracy:null,seconds:null,unmeasured:through.length,daysStudied:0,completedTopics:null},comment:`${cp.title}の突破試験に合格した記録です。当時の学習量の一部は保存されていないため、分かる記録だけを残しています。`,checkpoint:{id:cp.id,label:`CHECKPOINT ${cp.order}`,next:next?`CHECKPOINT ${getCheckpoint(next).order}`:null,skills:[`${attempt.total}問中${attempt.correct}問正解`]}};
      const date=dateInZone(new Date(attempt.attemptedAt),timezone);
      const result=await db.from('learning_journal_records').upsert({user_id:userId,record_type:'checkpoint',record_key:`${userId}:cp:${cp.id}`,period_start:date,period_end:date,occurred_at:attempt.attemptedAt,timezone,snapshot,narrative_status:'not_needed',finalized_at:now.toISOString()},{onConflict:'user_id,record_type,record_key',ignoreDuplicates:true});assertDb(result.error);
    }
    await release(db,schedule,nextWeekly);
    return {pending:needed.length>selected.length || (nextWeekly!==null&&nextWeekly<=today)};
  } catch(error) {await release(db,schedule,undefined,false);throw error;}
}
async function release(db:SupabaseClient,schedule:JournalSchedule,nextWeekly?:string|null,success=true) {
  const result=await db.from('learning_journal_schedule').update({lease_until:null,...(success?{last_checked_at:new Date().toISOString()}:{}),...(nextWeekly!==undefined?{next_weekly_date:nextWeekly}:{})}).eq('user_id',schedule.user_id).eq('lease_until',schedule.lease_until);assertDb(result.error);
}
export async function processJournalNarratives(db:SupabaseClient,userId?:string) {
  const result=await db.rpc('claim_journal_narratives',{p_user_id:userId??null,p_limit:5});assertDb(result.error);
  await Promise.all((result.data as JournalRecord[]).map(async record=>{
    const update=await completeNarrative(record);
    const saved=await db.from('learning_journal_records').update(update).eq('id',record.id).eq('user_id',record.user_id).eq('lease_until',record.lease_until).neq('narrative_status','ready');assertDb(saved.error);
  }));
}
