import type {SupabaseClient} from '@supabase/supabase-js';
import type {JournalRecord,JournalType} from './model';
export function assertDb(error:unknown):void { if(error) throw new Error('journal database operation failed',{cause:error}); }
/** Deterministic paging prevents the REST API's default row limit from losing history. */
export async function allRows<T>(db:SupabaseClient, table:string, columns:string, userId:string, order:string):Promise<T[]> {
  const rows:T[]=[];
  for(let offset=0;;offset+=500) {
    const result=await db.from(table).select(columns).eq('user_id',userId).order(order).range(offset,offset+499);
    assertDb(result.error); const page=result.data as unknown as T[]; rows.push(...page); if(page.length<500) return rows;
  }
}
export async function listJournal(db:SupabaseClient,userId:string,month:string,type:JournalType|'all') {
  const all=await allRows<JournalRecord>(db,'learning_journal_records','*',userId,'id');
  const records=all.filter(r=>r.period_end.startsWith(month)&&(type==='all'||r.record_type===type)).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at)||b.id.localeCompare(a.id));
  const months=[...new Set([month,...all.map(r=>r.period_end.slice(0,7))])].sort().reverse();
  const unread=all.filter(r=>r.record_type==='weekly'&&!r.first_viewed_at).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at))[0]??null;
  return {records,months,unread:unread?{id:unread.id,month:unread.period_end.slice(0,7)}:null};
}
export async function readJournal(db:SupabaseClient,userId:string,id:string):Promise<JournalRecord|null> {
  const result=await db.from('learning_journal_records').select('*').eq('user_id',userId).eq('id',id).maybeSingle();assertDb(result.error);return result.data;
}
export async function markJournalViewed(db:SupabaseClient,userId:string,id:string):Promise<void> {
  const result=await db.from('learning_journal_records').update({first_viewed_at:new Date().toISOString()}).eq('user_id',userId).eq('id',id).is('first_viewed_at',null);assertDb(result.error);
}
