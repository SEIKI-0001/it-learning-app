import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProgress } from '@/types';
import { mergeProgress } from '@/lib/mergeAppState';
import { progressRowToProgress,progressToRow,type ProgressRow } from '@/lib/dbMappers';
function payload(userId:string,progress:UserProgress) {
 const row:Record<string,unknown>={...progressToRow(userId,progress)};
 delete row.user_id;delete row.updated_at;return row;
}
export async function saveSharedProgress(db:SupabaseClient,userId:string,progress:UserProgress,trigger?:{triggerType:string;triggerId:string}) {
 for(let attempt=0;attempt<3;attempt++) {
  const existing=await db.from('user_progress').select('*').eq('user_id',userId).maybeSingle();
  if(existing.error)return {data:null,error:existing.error};
  const merged=existing.data?mergeProgress(progressRowToProgress(existing.data as ProgressRow),progress):progress;
  // Cosmetic selection and pity resets are intentional replacements, not facts
  // to union. Keep the caller's selection while merging earned learning records.
  if (merged.checkpointProgress && progress.checkpointProgress) {
    merged.checkpointProgress.rarePityCount = progress.checkpointProgress.rarePityCount;
    const rewards = merged.checkpointProgress.gameful?.rewards;
    if (rewards) {
      const equipped = progress.checkpointProgress.gameful?.rewards?.equippedTitleId;
      if (equipped) rewards.equippedTitleId = equipped;
      else delete rewards.equippedTitleId;
    }
  }
  const result=await db.rpc('save_shared_user_progress',{
   p_user_id:userId,p_original:payload(userId,progress),p_expected:existing.data??null,p_merged:payload(userId,merged),
   p_trigger_type:trigger?.triggerType??null,p_trigger_id:trigger?.triggerId??null,
  });
  // Rolling deployment: old databases have no aliases yet, so preserve their existing RPC.
  if(result.error?.code==='PGRST202')return db.rpc('save_user_progress_with_readiness_evidence',{p_user_id:userId,p_progress:payload(userId,progress),p_trigger_type:trigger?.triggerType??null,p_trigger_id:trigger?.triggerId??null});
  if(result.error?.code!=='40001')return result;
 }
 return {data:null,error:{code:'40001',message:'progress changed; retry'}};
}
