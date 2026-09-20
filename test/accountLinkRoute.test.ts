import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({user:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/auth/currentUser',()=>({getInternalUserId:mocks.user}));
vi.mock('@/lib/supabaseServer',()=>({getServiceSupabase:()=>({rpc:mocks.rpc})}));
import { POST } from '@/app/api/account/link/route';
const request=(body:unknown,origin='https://app.test')=>POST(new Request('https://app.test/api/account/link',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
beforeEach(()=>{vi.clearAllMocks();mocks.user.mockResolvedValue('google');});
it('rejects cross-origin linking before resolving credentials',async()=>{
 expect((await request({action:'create'},'https://attacker.test')).status).toBe(403);
 expect(mocks.user).not.toHaveBeenCalled();
});
it('requires an authenticated account',async()=>{
 mocks.user.mockResolvedValue(null);
 expect((await request({action:'create'})).status).toBe(401);
 expect(mocks.rpc).not.toHaveBeenCalled();
});
it('stores only a hash of the short-lived code',async()=>{
 mocks.rpc.mockResolvedValue({error:null});
 const r=await request({action:'create'});const body=await r.json();
 expect(body.code).toMatch(/^[A-F0-9]{24}$/);
 expect(mocks.rpc).toHaveBeenCalledWith('create_account_link_code',{p_user_id:'google',p_hash:expect.stringMatching(/^[a-f0-9]{64}$/)});
 expect(r.headers.get('cache-control')).toBe('no-store');
});
it('binds redemption to the authenticated Google account, never a body user ID',async()=>{
 mocks.rpc.mockImplementation(async(name:string)=>name==='account_link_snapshot'?{data:{source:'line',target:'google',tables:{}},error:null}:{data:'google',error:null});
 const r=await request({action:'complete',code:'A'.repeat(24),userId:'attacker'});
 expect(r.status).toBe(200);
 expect(mocks.rpc).toHaveBeenCalledWith('complete_account_link',expect.objectContaining({p_target:'google'}));
});
it('does not commit when a code is expired or already consumed',async()=>{
 mocks.rpc.mockResolvedValue({error:{code:'22023'}});
 expect((await request({action:'complete',code:'A'.repeat(24)})).status).toBe(409);
 expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
