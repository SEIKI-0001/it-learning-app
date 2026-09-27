import type { AppState, ChoiceKey } from '@/types';
import { buildWeeklyReportFacts } from '@/lib/weeklyReportFacts';
import { buildTemplateNarrative } from '@/lib/weeklyReportNarrative';
import { dateInZone, shiftDate, startInZone } from './dates';
import type { JournalAnswer, JournalSnapshot } from './model';

type AnswerRow = { question_id:string; answered_at:string; is_correct:boolean; topic_id?:string|null; tag?:string|null; selected_choice?:string|null; selected_answer?:string|null; time_spent_seconds?:number|null };
/** Pair identical dual writes one-for-one; keep genuine subsequent attempts. */
export function mergeJournalAnswers(legacy: AnswerRow[], attempts: AnswerRow[]): JournalAnswer[] {
  const convert = (r:AnswerRow):JournalAnswer => ({questionId:r.question_id,answeredAt:new Date(r.answered_at).toISOString(),isCorrect:r.is_correct,topicId:r.topic_id??undefined,tag:r.tag??'',selectedChoice:(r.selected_choice??r.selected_answer??'A') as ChoiceKey,timeSpentSeconds: typeof r.time_spent_seconds==='number' && r.time_spent_seconds>=0 ? r.time_spent_seconds : null});
  const key = (a:JournalAnswer) => `${a.questionId}|${a.answeredAt}|${a.isCorrect}`;
  const result = attempts.map(convert); const remaining = new Map<string,number>();
  result.forEach(a=>remaining.set(key(a),(remaining.get(key(a))??0)+1));
  for(const a of legacy.map(convert)) { const k=key(a), n=remaining.get(k)??0; if(n>0) remaining.set(k,n-1); else result.push(a); }
  return result.sort((a,b)=>a.answeredAt.localeCompare(b.answeredAt));
}
export function buildJournalSnapshot(input:{state:AppState; answers:JournalAnswer[]; type:'daily'|'weekly'; date:string; timezone:string; now:Date; activityDates?:string[]; historical?:boolean}):JournalSnapshot|null {
  const {date,timezone,type}=input;
  const end = new Date(Math.min(input.now.getTime(),startInZone(shiftDate(date,1),timezone).getTime()-1));
  const facts=buildWeeklyReportFacts({...input.state,answers:input.answers},end,{timeZone:timezone,days:type==='daily'?1:7});
  const selected=input.answers.filter(a=>dateInZone(new Date(a.answeredAt),timezone)>=facts.period.start && dateInZone(new Date(a.answeredAt),timezone)<=date && Date.parse(a.answeredAt)<=end.getTime());
  const activityDays = new Set([...(input.activityDates??[]).filter(d=>d>=facts.period.start&&d<=date),...selected.map(a=>dateInZone(new Date(a.answeredAt),timezone))]);
  if(type==='daily' && activityDays.size===0) return null;
  facts.totals.daysStudied=activityDays.size;
  if(input.historical) {
    // These values cannot be reconstructed from today's progress. Never assert them as historical facts.
    facts.reviews={waiting:0,due:0}; facts.cumulative.completedTopics=0; facts.streakCount=0;
    facts.checkpoint={label:'当時のCP進捗は未記録',earnedRequired:0,totalRequired:0,badgesEarnedThisWeek:0,finalExamPassedThisWeek:false}; facts.nextActions=[];
    facts.signals=facts.signals.filter(s=>!['checkpoint_pass','badges','review_due','review_waiting','review_backlog','streak'].includes(s.kind));
  }
  if(type==='daily') {
    facts.signals=facts.signals.map(s=>({...s, fact:dailyWords(s.fact),title:dailyWords(s.title),body:dailyWords(s.body)}));
  }
  const template=buildTemplateNarrative(facts);
  const strongest=facts.signals.find(s=>s.category==='growth')??facts.signals[0];
  const comment = selected.length===0 ? '学習に取り組んだ記録が残りました。回答がないため、正答率は集計していません。' : strongest?.body ?? template.summary;
  const measured=selected.filter(a=>a.timeSpentSeconds!==null);
  const previous=facts.lastWeek;
  return {version:1,metrics:{...facts.totals,seconds:measured.length?measured.reduce((n,a)=>n+a.timeSpentSeconds!,0):null,unmeasured:selected.length-measured.length,completedTopics:input.historical?null:facts.cumulative.completedTopics},facts,comment:type==='daily'?dailyWords(comment):comment,comparison:previous?.accuracy!==null&&previous&&facts.totals.accuracy!==null&&previous.answered>=5&&facts.totals.answered>=5?{before:previous.accuracy,after:facts.totals.accuracy,label:type==='daily'?'前日との比較':'前の7日との比較'}:null,historical:input.historical??false};
}
export function dailyWords(value:string):string { return value.replaceAll('今週','今日').replaceAll('先週','前日').replaceAll('来週','次回').replaceAll('1週間','1日').replaceAll('週初','一日のはじめ').replaceAll('週です','日です').replaceAll('週でした','日でした'); }
