import {journalContext,journalJson,validRecordId} from '@/lib/journal/http';
import {readJournal,markJournalViewed} from '@/lib/journal/repository';
export const runtime='nodejs';
export async function POST(_request:Request,{params}:{params:Promise<{recordId:string}>}) {
  const ctx=await journalContext();if(ctx.error)return ctx.error;
  const {recordId}=await params;if(!validRecordId(recordId))return journalJson({error:'invalid_id'},400);
  try {if(!await readJournal(ctx.db,ctx.userId,recordId))return journalJson({error:'not_found'},404);await markJournalViewed(ctx.db,ctx.userId,recordId);return journalJson({ok:true});}catch{return journalJson({error:'save_failed'},503);}
}
