import { mergeProgress } from '@/lib/mergeAppState';
import { progressRowToProgress, progressToRow, type ProgressRow } from '@/lib/dbMappers';
export type AccountRow = Record<string, unknown>;
export type AccountSnapshot = { source: string; target: string; tables: Record<string, AccountRow[]> };
// These projections can be recalculated; their original rows stay in the merge archive.
export const DERIVED_ACCOUNT_TABLES = ['exam_readiness_current','exam_readiness_evidence_events','exam_readiness_evidence_state','exam_readiness_recalculation_jobs','exam_readiness_snapshots','integrated_learning_status','plan_adjustment_proposals'];
const NATURAL_KEYS: Record<string,string[]> = {
 user_profiles:[],user_progress:[],user_reference_books:[],notification_preferences:[],
 user_word_progress:['word_id'],topic_progress:['topic_id'],daily_progress_reports:['date'],
 daily_study_tasks:['date','task_type','topic_id','title'],notification_deliveries:['notification_type','local_date'],
 progress_readiness_completions:['trigger_type','trigger_id'],assessment_session_answers:['idempotency_key'],
 assessment_attempt_receipts:['session_id','question_id'],
};
const PRIMARY:Record<string,string[]>={user_profiles:['user_id'],user_progress:['user_id'],user_reference_books:['user_id'],notification_preferences:['user_id'],user_word_progress:['user_id','word_id'],topic_progress:['id'],daily_progress_reports:['report_id'],daily_study_tasks:['task_id'],notification_deliveries:['user_id','notification_type','local_date'],progress_readiness_completions:['user_id','trigger_type','trigger_id'],assessment_session_answers:['answer_id'],assessment_attempt_receipts:['user_id','session_id','question_id']};
function latest(a:AccountRow,b:AccountRow){return String(a.updated_at??a.created_at??'')>String(b.updated_at??b.created_at??'')?a:b;}
function mergeDuplicate(table:string,a:AccountRow,b:AccountRow,target:string):AccountRow {
 let result:AccountRow={...a,...latest(a,b)};
 if(table==='user_progress') result={...b,...progressToRow(target,mergeProgress(progressRowToProgress(a as ProgressRow),progressRowToProgress(b as ProgressRow)))};
 else if(table==='user_profiles') {
   if(a.stripe_customer_id && b.stripe_customer_id && a.stripe_customer_id!==b.stripe_customer_id) throw new Error('BILLING_CONFLICT');
   result={...a,...Object.fromEntries(Object.entries(b).filter(([,v])=>v!==null && v!==''))};
   result.created_at=[a.created_at,b.created_at].filter(Boolean).sort()[0];
   result.stripe_customer_id=b.stripe_customer_id||a.stripe_customer_id||null;
   result.pro_until=[a.pro_until,b.pro_until].filter(Boolean).sort().pop()??null;
   result.plan=a.plan==='pro'||b.plan==='pro'?'pro':b.plan;
 } else if(table==='daily_study_tasks') {
   result.status=a.status==='completed'||b.status==='completed'?'completed':latest(a,b).status;
   result.estimated_completion_rate=Math.max(Number(a.estimated_completion_rate??0),Number(b.estimated_completion_rate??0));
 } else if(table==='user_reference_books') {
   // A single active-book slot cannot represent two different user-authored books.
   if(JSON.stringify(a.chapters)!==JSON.stringify(b.chapters) || a.title!==b.title) throw new Error('REFERENCE_BOOK_CONFLICT');
 } else if(table==='topic_progress'||table==='user_word_progress') {
   for(const key of Object.keys(a)) if(key.endsWith('_count')) result[key]=Math.max(Number(a[key]??0),Number(b[key]??0));
   result.next_review_at=[a.next_review_at,b.next_review_at].filter(Boolean).sort()[0]??null;
 } else if(table==='notification_deliveries') {
   if(a.status==='sent'||b.status==='sent') result={...(a.status==='sent'?a:b)};
 } else if(table==='assessment_session_answers'||table==='assessment_attempt_receipts'||table==='progress_readiness_completions') {
   const omit=(r:AccountRow)=>Object.fromEntries(Object.entries(r).filter(([k])=>!['user_id','created_at','answer_id'].includes(k)));
   if(JSON.stringify(omit(a))!==JSON.stringify(omit(b))) throw new Error('HISTORY_CONFLICT');
 }
 for(const key of PRIMARY[table]??[]) result[key]=b[key];
 result.user_id=target;
 return result;
}
/** Pure, server-only plan. SQL compares the entire snapshot again under locks. */
export function planAccountMerge(snapshot:AccountSnapshot):Record<string,AccountRow[]> {
 const plan:Record<string,AccountRow[]>={};
 const taskIds=new Map<unknown,unknown>();
 for(const [table,rows] of Object.entries(snapshot.tables)) {
   if(DERIVED_ACCOUNT_TABLES.includes(table)){plan[table]=[];continue;}
   const keys=NATURAL_KEYS[table];
   if(!keys){plan[table]=rows.map(row=>({...row,user_id:snapshot.target}));continue;}
   const grouped=new Map<string,AccountRow>();
   // Source first, then Google. Preserve Google's stable row IDs on collision.
   const ordered=[...rows.filter(r=>r.user_id===snapshot.source),...rows.filter(r=>r.user_id===snapshot.target)];
   for(const row of ordered){
     const key=JSON.stringify(keys.map(k=>row[k]??null));
     const prev=grouped.get(key);
     if(prev && table==='daily_study_tasks') taskIds.set(prev.task_id,row.task_id);
     grouped.set(key,prev?mergeDuplicate(table,prev,row,snapshot.target):{...row,user_id:snapshot.target});
   }
   plan[table]=[...grouped.values()];
 }
 // Preserve attempt IDs/receipts, but only the earliest combined exposure can be first.
 const seen=new Map<string,string>();
 for(const row of plan.user_answers??[]) {
   const q=String(row.question_id), at=String(row.answered_at);
   if(!seen.has(q)||at<seen.get(q)!) seen.set(q,at);
 }
 const attempts=[...(plan.question_attempts??[])].sort((a,b)=>String(a.answered_at).localeCompare(String(b.answered_at))||String(a.attempt_id).localeCompare(String(b.attempt_id)));
 for(const row of attempts){
   const q=String(row.question_id), at=String(row.answered_at);
   row.is_first_attempt=Boolean(row.is_first_attempt)&&(!seen.has(q)||at<seen.get(q)!);
   if(!seen.has(q)||at<seen.get(q)!)seen.set(q,at);
   if(taskIds.has(row.source_task_id))row.source_task_id=taskIds.get(row.source_task_id);
 }
 // Keep authoritative session evidence consistent with the combined attempt history.
 for (const answer of plan.assessment_session_answers ?? []) {
   const matching = attempts.find(a => a.attempt_group_id === answer.session_id
     && a.question_id === answer.canonical_question_id
     && a.answered_at === answer.answered_at);
   if (matching && answer.first_attempt_state === 'first' && !matching.is_first_attempt)
     answer.first_attempt_state = 'seen';
 }
 for (const session of plan.assessment_sessions ?? []) {
   const answers = (plan.assessment_session_answers ?? []).filter(a => a.session_id === session.session_id);
   if (answers.length) {
     session.first_count = answers.filter(a => a.first_attempt_state === 'first').length;
     session.seen_count = answers.filter(a => a.first_attempt_state === 'seen').length;
     session.unknown_count = answers.filter(a => a.first_attempt_state === 'unknown').length;
   }
 }
 return plan;
}
