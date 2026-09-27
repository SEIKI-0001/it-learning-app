import {journalContext,journalJson,validRecordId} from '@/lib/journal/http';
import {readJournal} from '@/lib/journal/repository';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{recordId:string}>}) {
  const ctx=await journalContext();if(ctx.error)return ctx.error;
  const {recordId}=await params;if(!validRecordId(recordId))return journalJson({error:'invalid_id'},400);
  try {const record=await readJournal(ctx.db,ctx.userId,recordId);return record?journalJson({record}):journalJson({error:'not_found'},404);}catch{return journalJson({error:'load_failed'},503);}
}
