import { PGlite } from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
import {beforeAll,afterAll,it,expect} from 'vitest';
let db:PGlite;
const uid='30000000-0000-4000-8000-000000000001';
beforeAll(async()=>{db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');for(const f of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync(`supabase/migrations/${f}`,'utf8'));await db.exec('set search_path=public;');await db.query('insert into line_users(id) values($1)',[uid]);},60000);
afterAll(async()=>db?.close());
it('freezes facts while allowing template to become AI exactly once',async()=>{
 const {rows}=await db.query<{id:string}>(`insert into learning_journal_records(user_id,record_type,record_key,period_start,period_end,occurred_at,timezone,snapshot,narrative,finalized_at) values($1,'weekly','w1','2026-09-20','2026-09-26',now(),'Asia/Tokyo','{"version":1}','{"source":"template"}',now()) returning id`,[uid]);
 const id=rows[0].id;
 await expect(db.query(`update learning_journal_records set snapshot='{"version":2}' where id=$1`,[id])).rejects.toThrow();
 await db.query(`update learning_journal_records set narrative='{"source":"ai"}',narrative_status='ready' where id=$1`,[id]);
 await expect(db.query(`update learning_journal_records set narrative='{"source":"template"}' where id=$1`,[id])).rejects.toThrow();
 await db.query(`update learning_journal_records set first_viewed_at='2026-09-26T13:00Z' where id=$1`,[id]);
 await expect(db.query(`update learning_journal_records set first_viewed_at=now() where id=$1`,[id])).rejects.toThrow();
});
it('leases one AI job and prevents simultaneous generation',async()=>{
 await db.query(`insert into learning_journal_records(user_id,record_type,record_key,period_start,period_end,occurred_at,timezone,snapshot,finalized_at) values($1,'daily','d1','2026-09-25','2026-09-25',now(),'Asia/Tokyo','{}',now())`,[uid]);
 const first=await db.query('select * from claim_journal_narratives($1,1)',[uid]); const second=await db.query('select * from claim_journal_narratives($1,1)',[uid]);
 expect(first.rows).toHaveLength(1); expect(second.rows).toHaveLength(0);
});
it('captures the first CP pass in the progress transaction only once',async()=>{
 const cp={finalExamAttempts:[{checkpointId:'cp1',passed:true,correct:8,total:10,attemptedAt:new Date().toISOString()}]};
 await db.query(`insert into user_progress(user_id,completed_topics,checkpoint_progress) values($1,array['one','two'],$2)`,[uid,cp]);
 await db.query(`update user_progress set completed_topics=array['one','two','three'] where user_id=$1`,[uid]);
 const {rows}=await db.query<{snapshot:{metrics:{completedTopics:number}}}>(`select snapshot from learning_journal_records where user_id=$1 and record_type='checkpoint'`,[uid]);
 expect(rows).toHaveLength(1);expect(rows[0].snapshot.metrics.completedTopics).toBe(2);
});
it('has no direct client read/write permission and uses RLS',async()=>{
 expect((await db.query<{relrowsecurity:boolean}>(`select relrowsecurity from pg_class where oid='learning_journal_records'::regclass`)).rows[0].relrowsecurity).toBe(true);
 await db.exec('set role anon'); await expect(db.query('select * from learning_journal_records')).rejects.toThrow();await db.exec('reset role');
 await db.exec('set role authenticated'); await expect(db.query('select * from claim_journal_narratives(null,1)')).rejects.toThrow();await db.exec('reset role');
});
