import { describe, expect, it } from 'vitest';
import { buildJournalSnapshot, mergeJournalAnswers } from '@/lib/journal/facts';
import { dateInZone, shiftDate } from '@/lib/journal/dates';
import type { AppState } from '@/types';
const progress: AppState['progress'] = {level:1,exp:0,currentDay:1,completedDays:[],streakCount:0,weakTags:[],completedTopics:[],topicMastery:{},reviewQueue:[]};
const a = (at:string, correct=true) => ({questionId:'q1',topicId:'t1',answeredAt:at,isCorrect:correct,tag:'',selectedChoice:'A' as const,timeSpentSeconds:null});
const snapshot = (answers = [a('2026-09-26T12:00:00Z')], type:'daily'|'weekly'='daily', activities:string[]=[]) => buildJournalSnapshot({state:{answers,progress},answers,type,date:'2026-09-26',timezone:'Asia/Tokyo',now:new Date('2026-09-26T14:00:00Z'),activityDates:activities});
describe('journal facts',()=>{
 it('never produces an empty daily entry',()=>{expect(snapshot([])).toBeNull(); expect(snapshot([],'daily',['2026-09-26'])).not.toBeNull();});
 it('preserves the rolling seven calendar days, not Monday to Sunday',()=>{expect(snapshot(undefined,'weekly')?.facts?.period).toMatchObject({start:'2026-09-20',end:'2026-09-26'});});
 it('uses the captured local calendar and handles month boundaries',()=>{expect(dateInZone(new Date('2026-09-30T16:00Z'),'Asia/Tokyo')).toBe('2026-10-01'); expect(shiftDate('2026-10-01',-6)).toBe('2026-09-25');});
 it('does not present missing duration as zero',()=>{expect(snapshot()?.metrics).toMatchObject({seconds:null,unmeasured:1,answered:1});});
 it('counts repeat answers while reconciling dual writes',()=>{
 const old=[{question_id:'q1',answered_at:'2026-09-26T12:00:00Z',is_correct:true,selected_choice:'A'}];
 const attempts=[{question_id:'q1',answered_at:'2026-09-26T12:00:00+00:00',is_correct:true,selected_answer:'A',time_spent_seconds:30},{question_id:'q1',answered_at:'2026-09-26T12:01:00Z',is_correct:true,selected_answer:'A'}];
 const result=mergeJournalAnswers(old,attempts); expect(result).toHaveLength(2); expect(result[0].timeSpentSeconds).toBe(30);
 });
 it('records prior mistakes recovered without declaring permanent mastery',()=>{const s=snapshot([a('2026-09-10T12:00Z',false),a('2026-09-26T12:00Z')]); expect(s?.facts?.recovered.questionCount).toBe(1); expect(s?.comment).toContain('1問'); expect(s?.comment).not.toContain('安定');});
 it('excludes tomorrow from today even if it is already UTC today',()=>{expect(snapshot([a('2026-09-26T15:01:00Z')])).toBeNull();});
});
