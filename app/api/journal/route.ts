import {after} from 'next/server';
import {journalContext,journalJson} from '@/lib/journal/http';
import {validTimezone} from '@/lib/journal/dates';
import {listJournal} from '@/lib/journal/repository';
import {ensureJournal,processJournalNarratives} from '@/lib/journal/service';
import type {JournalType} from '@/lib/journal/model';
export const runtime='nodejs';
export async function GET(request:Request) {
  const ctx=await journalContext();if(ctx.error)return ctx.error;
  const query=new URL(request.url).searchParams,month=query.get('month'),type=query.get('type')??'all';
  if(!month||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!['all','daily','weekly','checkpoint'].includes(type))return journalJson({error:'invalid_filter'},400);
  try {return journalJson(await listJournal(ctx.db,ctx.userId,month,type as JournalType|'all'));}catch{return journalJson({error:'load_failed'},503);}
}
export async function POST(request:Request) {
  const ctx=await journalContext();if(ctx.error)return ctx.error;
  const body=await request.json().catch(()=>null);
  if(!validTimezone(body?.timezone))return journalJson({error:'invalid_timezone'},400);
  try {
    const result=await ensureJournal(ctx.db,ctx.userId,body.timezone);
    after(async()=>{try{await processJournalNarratives(ctx.db,ctx.userId);}catch{console.error('journal narrative retry deferred');}});
    return journalJson({ok:true,...result});
  }catch{return journalJson({error:'save_failed'},503);}
}
