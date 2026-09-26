import { expect, it } from 'vitest';
import { planAccountMerge } from '@/lib/auth/accountMerge';
import { progressToRow } from '@/lib/dbMappers';
import type { UserProgress } from '@/types';
const progress=(completedTopics:string[]):UserProgress=>({currentDay:1,completedDays:[],level:1,exp:10,streakCount:0,weakTags:[],completedTopics,topicMastery:{},reviewQueue:[]});
it('unions independently completed topics under the Google account',()=>{
 const result=planAccountMerge({source:'line',target:'google',tables:{user_progress:[progressToRow('line',progress(['a'])),progressToRow('google',progress(['b']))]}});
 expect(result.user_progress).toHaveLength(1);expect(result.user_progress[0].user_id).toBe('google');
 expect(result.user_progress[0].completed_topics).toEqual(['a','b']);
});
it('preserves both history IDs and first-answer uniqueness',()=>{
 const result=planAccountMerge({source:'line',target:'google',tables:{question_attempts:[{attempt_id:'a',user_id:'line',question_id:'q',is_first_attempt:true,answered_at:'2026-09-01'},{attempt_id:'b',user_id:'google',question_id:'q',is_first_attempt:true,answered_at:'2026-09-02'}]}});
 expect(result.question_attempts.map(r=>[r.attempt_id,r.user_id,r.is_first_attempt])).toEqual([['a','google',true],['b','google',false]]);
});
it('keeps completed tasks when the other account has an unfinished duplicate',()=>{
 const common={date:'2026-09-19',task_type:'topic_quiz',topic_id:'a',title:'test'};
 const result=planAccountMerge({source:'line',target:'google',tables:{daily_study_tasks:[{...common,task_id:'l',user_id:'line',status:'completed'},{...common,task_id:'g',user_id:'google',status:'pending'}]}});
 expect(result.daily_study_tasks).toHaveLength(1);expect(result.daily_study_tasks[0]).toMatchObject({task_id:'g',status:'completed',user_id:'google'});
});
it('refuses two billing customer identities rather than disconnecting payments',()=>{
 expect(()=>planAccountMerge({source:'line',target:'google',tables:{user_profiles:[{user_id:'line',stripe_customer_id:'cus_a'},{user_id:'google',stripe_customer_id:'cus_b'}]}})).toThrow('BILLING_CONFLICT');
});

it('uses actual answer time, not UUID order, and demotes prior legacy exposure',()=>{
 const result=planAccountMerge({source:'line',target:'google',tables:{
 user_answers:[{user_id:'google',question_id:'legacy',answered_at:'2026-08-01'}],
 question_attempts:[
 {attempt_id:'a',user_id:'google',question_id:'q',is_first_attempt:true,answered_at:'2026-09-02'},
 {attempt_id:'z',user_id:'line',question_id:'q',is_first_attempt:true,answered_at:'2026-09-01'},
 {attempt_id:'b',user_id:'line',question_id:'legacy',is_first_attempt:true,answered_at:'2026-09-01'},
 ]}});
 expect(result.question_attempts.map(r=>[r.attempt_id,r.is_first_attempt])).toEqual([['a',false],['z',true],['b',false]]);
});

it('keeps one Today activity per date/activity_key, preferring the actually completed one', () => {
  const row = (user: string, id: string, title: string, status: string, source: string) => ({
    task_id: id, user_id: user, date: '2026-09-26', task_type: 'flashcard', topic_id: '', title,
    status, completion_source: source, activity_key: 'act:vocab', activity_payload: { v: 1 }, updated_at: '2026-09-26T01:00:00Z',
  });
  const topic = (user: string, id: string) => ({
    task_id: id, user_id: user, date: '2026-09-26', task_type: 'topic_quiz', topic_id: 't', title: 'T',
    status: 'pending', completion_source: 'self_report', activity_key: null, updated_at: '2026-09-26T00:00:00Z',
  });
  const result = planAccountMerge({ source: 'line', target: 'google', tables: { daily_study_tasks: [
    row('line', 'l1', '今日の単語復習', 'completed', 'app_actual'),
    row('google', 'g1', '苦手な用語を固める', 'pending', 'self_report'),
    topic('line', 'l2'), topic('google', 'g2'),
  ] } });
  const tasks = result.daily_study_tasks;
  expect(tasks).toHaveLength(2);
  const vocab = tasks.find((t) => t.activity_key === 'act:vocab')!;
  expect(vocab).toMatchObject({ user_id: 'google', task_id: 'g1', status: 'completed', completion_source: 'app_actual', title: '今日の単語復習' });
  expect(tasks.find((t) => t.activity_key === null)).toMatchObject({ task_id: 'g2', user_id: 'google' });
});
