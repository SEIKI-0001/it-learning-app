import { expect,it,vi } from 'vitest';
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/supabaseServer',()=>({getServiceSupabase:()=>({rpc})}));
import { canonicalAccountId } from '@/lib/auth/canonicalAccount';
it('resolves an old LINE cookie or Stripe metadata identity to its shared account',async()=>{
 rpc.mockResolvedValue({data:'shared',error:null});
 expect(await canonicalAccountId('old-line')).toBe('shared');
 expect(rpc).toHaveBeenCalledWith('canonical_account_id',{p_id:'old-line'});
});
it('fails closed on database outages instead of writing back into the alias',async()=>{
 rpc.mockResolvedValue({data:null,error:{code:'08006'}});
 await expect(canonicalAccountId('old-line')).rejects.toThrow();
});
