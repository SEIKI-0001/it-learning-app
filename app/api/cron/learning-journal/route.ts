import {timingSafeEqual} from 'node:crypto';
import {journalJson} from '@/lib/journal/http';
import {getServiceSupabase} from '@/lib/supabaseServer';
import {ensureJournal,processJournalNarratives,type JournalSchedule} from '@/lib/journal/service';
import {assertDb} from '@/lib/journal/repository';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const secret=process.env.CRON_SECRET?.trim();if(!secret)return journalJson({error:'unconfigured'},503);
  const received=Buffer.from(request.headers.get('authorization')??''),expected=Buffer.from(`Bearer ${secret}`);
  if(received.length!==expected.length||!timingSafeEqual(received,expected))return journalJson({error:'unauthorized'},401);
  const db=getServiceSupabase();if(!db)return journalJson({error:'unavailable'},503);
  try {
    const claimed=await db.rpc('claim_journal_users',{p_limit:10});assertDb(claimed.error);
    const results=await Promise.allSettled((claimed.data as JournalSchedule[]).map(s=>ensureJournal(db,s.user_id,s.timezone,s)));
    await processJournalNarratives(db);
    const failed=results.filter(r=>r.status==='rejected').length;
    return journalJson({processed:results.length,failed},failed?503:200);
  }catch{return journalJson({error:'processing_failed'},503);}
}
