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
