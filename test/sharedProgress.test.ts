import { expect,it,vi } from 'vitest';
import { saveSharedProgress } from '@/lib/auth/sharedProgress';
import { progressToRow } from '@/lib/dbMappers';
const base={currentDay:1,completedDays:[],level:1,exp:10,streakCount:0,weakTags:[],completedTopics:['phone'],topicMastery:{},reviewQueue:[]};
it('merges server completions with incoming old-device state and retries snapshot conflicts',async()=>{
 const payloads:Record<string,unknown>[]=[];
 const rpc=vi.fn(async(_name:string,p:Record<string,unknown>)=>{payloads.push(p);return payloads.length===1?{data:null,error:{code:'40001'}}:{data:{trigger_registered:false},error:null};});
 const from=vi.fn(()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:progressToRow('u',{...base,completedTopics:payloads.length?['phone','third']:['phone']}),error:null})})})}));
 await saveSharedProgress({from,rpc} as never,'u',{...base,completedTopics:['pc']});
 expect(payloads).toHaveLength(2);expect((payloads[1].p_merged as Record<string,unknown>).completed_topics).toEqual(['phone','third','pc']);
});

it('does not restore fragments spent on a title when the server still has the old balance',async()=>{
 const { INITIAL_CHECKPOINT_PROGRESS } = await import('@/types/checkpoint');
 const cp={...INITIAL_CHECKPOINT_PROGRESS,badgeFragments:[{fragmentId:'frag-common',count:5}]};
 const old={...base,checkpointProgress:cp};
 const incoming={...base,checkpointProgress:{...cp,badgeFragments:[],gameful:{rewards:{unlockedCosmetics:['title-steady']}}}};
 const rpc=vi.fn().mockResolvedValue({data:{trigger_registered:false},error:null});
 const from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:progressToRow('u',old),error:null})})})});
 await saveSharedProgress({from,rpc} as never,'u',incoming);
 const saved=rpc.mock.calls[0][1].p_merged.checkpoint_progress;
 expect(saved.badgeFragments).toEqual([]);
 expect(saved.gameful.rewards.unlockedCosmetics).toContain('title-steady');
});
