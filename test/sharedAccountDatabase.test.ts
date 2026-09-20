import { PGlite } from '@electric-sql/pglite';
import { readFileSync,readdirSync } from 'node:fs';
import { beforeAll,afterAll,expect,it } from 'vitest';
import { planAccountMerge,type AccountSnapshot } from '@/lib/auth/accountMerge';
let db:PGlite;
const l='10000000-0000-4000-8000-000000000001',g='10000000-0000-4000-8000-000000000002';
beforeAll(async()=>{db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');for(const f of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync(`supabase/migrations/${f}`,'utf8'));await db.exec('set search_path=public;');},60000);
afterAll(async()=>{await db?.close();});
it('atomically links both identities and moves both histories while retaining an alias',async()=>{
 await db.query(`insert into line_users(id,line_user_id,auth_user_id) values ($1,'line-test',null),($2,null,'20000000-0000-4000-8000-000000000001')`,[l,g]);
 await db.query(`insert into user_progress(user_id,completed_topics) values ($1,array['a']),($2,array['b'])`,[l,g]);
 await db.query(`insert into user_profiles(user_id) values ($1),($2)`,[l,g]);
 await db.query(`insert into user_answers(user_id,question_id,is_correct) values ($1,'a',true),($2,'b',true)`,[l,g]);
 await db.query('select create_account_link_code($1,$2)',[l,'a'.repeat(64)]);
 const snapshot=(await db.query<{s:AccountSnapshot}>('select account_link_snapshot($1,$2) s',[g,'a'.repeat(64)])).rows[0].s;
 const plan=planAccountMerge(snapshot);
 await db.query('select complete_account_link($1,$2,$3,$4)',[g,'a'.repeat(64),snapshot,plan]);
 expect((await db.query('select canonical_account_id($1) id',[l])).rows[0]).toEqual({id:g});
 expect((await db.query('select completed_topics from user_progress where user_id=$1',[g])).rows[0]).toEqual({completed_topics:['a','b']});
 expect((await db.query('select question_id from user_answers where user_id=$1',[g])).rows).toHaveLength(2);
 expect((await db.query('select line_user_id from line_users where id=$1',[g])).rows[0]).toEqual({line_user_id:'line-test'});
 await expect(db.query('select complete_account_link($1,$2,$3,$4)',[g,'a'.repeat(64),snapshot,plan])).rejects.toThrow();
});
it('detects a concurrent write before committing the merge snapshot',async()=>{
 const l2='10000000-0000-4000-8000-000000000003',g2='10000000-0000-4000-8000-000000000004';
 await db.query(`insert into line_users(id,line_user_id,auth_user_id) values ($1,'line-two',null),($2,null,'20000000-0000-4000-8000-000000000002')`,[l2,g2]);
 await db.query('select create_account_link_code($1,$2)',[l2,'b'.repeat(64)]);
 const s=(await db.query<{s:AccountSnapshot}>('select account_link_snapshot($1,$2) s',[g2,'b'.repeat(64)])).rows[0].s;
 await db.query(`insert into user_progress(user_id,completed_topics) values ($1,array['new'])`,[l2]);
 await expect(db.query('select complete_account_link($1,$2,$3,$4)',[g2,'b'.repeat(64),s,planAccountMerge(s)])).rejects.toThrow('ACCOUNT_CHANGED_RETRY');
 expect((await db.query('select merged_into from line_users where id=$1',[l2])).rows[0]).toEqual({merged_into:null});
});
it('does not allow public clients to redeem pairing codes',async()=>{
 await db.exec('set role authenticated');
 try{await expect(db.query('select account_link_snapshot($1,$2)',[g,'a'.repeat(64)])).rejects.toThrow('permission denied');}finally{await db.exec('reset role');}
});

it('rejects writes from requests that resolved the old identity before linking',async()=>{
 await expect(db.query(`insert into user_answers(user_id,question_id,is_correct) values ($1,'late',true)`,[l])).rejects.toThrow('ACCOUNT_LINKED_RELOAD');
 expect((await db.query('select count(*)::int n from user_answers where user_id=$1',[l])).rows[0]).toEqual({n:0});
});
it('moves grouped assessment history without breaking composite ownership or first counts',async()=>{
 const l3='10000000-0000-4000-8000-000000000005',g3='10000000-0000-4000-8000-000000000006';
 const session='30000000-0000-4000-8000-000000000001';
 await db.query(`insert into line_users(id,line_user_id,auth_user_id) values ($1,'line-three',null),($2,null,'20000000-0000-4000-8000-000000000003')`,[l3,g3]);
 await db.query(`insert into assessment_sessions(session_id,user_id,source,mode,status,started_at,completed_at,question_count,answered_count,correct_count,first_count) values($1,$2,'mock','exam','completed','2026-09-01','2026-09-01',1,1,1,1)`,[session,l3]);
 await db.query(`insert into user_answers(user_id,question_id,is_correct,answered_at) values($1,'shared-question',true,'2026-08-01')`,[g3]);
 const attempt=(await db.query<{attempt_id:string}>(`insert into question_attempts(user_id,question_id,question_type,topic_id,is_correct,is_first_attempt,answered_at,attempt_group_id) values($1,'shared-question','mock_exam','topic',true,true,'2026-09-01',$2) returning attempt_id`,[l3,session])).rows[0].attempt_id;
 await db.query(`insert into assessment_session_answers(user_id,session_id,idempotency_key,canonical_question_id,topic_id,field_id,is_correct,first_attempt_state,answered_at) values($1,$2,'test-key','shared-question','topic','technology',true,'first','2026-09-01')`,[l3,session]);
 await db.query(`insert into assessment_attempt_receipts(user_id,session_id,question_id,attempt_id,payload,attempt_count) values($1,$2,'shared-question',$3,'{}',1)`,[l3,session,attempt]);
 await db.query('select create_account_link_code($1,$2)',[l3,'c'.repeat(64)]);
 const snapshot=(await db.query<{s:AccountSnapshot}>('select account_link_snapshot($1,$2) s',[g3,'c'.repeat(64)])).rows[0].s;
 await db.query('select complete_account_link($1,$2,$3,$4)',[g3,'c'.repeat(64),snapshot,planAccountMerge(snapshot)]);
 expect((await db.query('select user_id,first_count,seen_count from assessment_sessions where session_id=$1',[session])).rows[0]).toEqual({user_id:g3,first_count:0,seen_count:1});
 expect((await db.query('select user_id,attempt_id from assessment_attempt_receipts where session_id=$1',[session])).rows[0]).toEqual({user_id:g3,attempt_id:attempt});
});
