import { generateWeeklyNarrative } from '@/lib/ai/weeklyReportCoach';
import { buildAiPayload, buildTemplateNarrative, mergeNarrative, validateAiNarrative, type WeeklyNarrative } from '@/lib/weeklyReportNarrative';
import { dailyWords } from './facts';
import type { JournalRecord } from './model';
export function templateFor(record:Pick<JournalRecord,'snapshot'|'record_type'>):WeeklyNarrative|null {
  if(!record.snapshot.facts) return null;
  const template=buildTemplateNarrative(record.snapshot.facts);
  if(record.snapshot.facts.totals.answered===0 && record.snapshot.facts.totals.daysStudied>0) {
    template.headline='学習の歩みが残りました';
    template.summary=record.snapshot.comment;
  }
  if(record.record_type==='daily') {
    return JSON.parse(dailyWords(JSON.stringify({...template,summary:record.snapshot.comment}))) as WeeklyNarrative;
  }
  return template;
}
/** Only this immutable record is input. Never load current progress during retry. */
export async function completeNarrative(record:JournalRecord, generate=generateWeeklyNarrative):Promise<Pick<JournalRecord,'narrative'|'narrative_status'|'next_retry_at'|'lease_until'>> {
  if(record.narrative_status==='ready') return {narrative:record.narrative,narrative_status:'ready',next_retry_at:record.next_retry_at,lease_until:null};
  const template=templateFor(record);
  if(!record.snapshot.facts || record.snapshot.facts.totals.answered===0) return {narrative:template,narrative_status:'not_needed',next_retry_at:record.next_retry_at,lease_until:null};
  try {
    const payload=buildAiPayload(record.snapshot.facts);
    const {part}=await generate(payload,record.record_type==='daily'?'daily':'weekly');
    const validated=validateAiNarrative(part,payload);
    if(!validated.headline || !validated.summary) throw new Error('incomplete narrative');
    let narrative=mergeNarrative(template!,validated);
    if(record.record_type==='daily') narrative=JSON.parse(dailyWords(JSON.stringify(narrative))) as WeeklyNarrative;
    return {narrative,narrative_status:'ready',next_retry_at:record.next_retry_at,lease_until:null};
  } catch {
    return {narrative:template,narrative_status:'retry',next_retry_at:new Date(Date.now()+Math.min(86400,300*2**Math.min(record.narrative_attempts,9))*1000).toISOString(),lease_until:null};
  }
}
