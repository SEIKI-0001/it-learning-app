import {NextResponse} from 'next/server';
import {getInternalUserId} from '@/lib/auth/currentUser';
import {getServiceSupabase} from '@/lib/supabaseServer';
export const journalJson=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export async function journalContext() {
  const userId=await getInternalUserId();if(!userId)return {error:journalJson({error:'unauthenticated'},401)} as const;
  const db=getServiceSupabase();if(!db)return {error:journalJson({error:'unavailable'},503)} as const;
  return {db,userId} as const;
}
export const validRecordId=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
