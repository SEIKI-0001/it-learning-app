import { describe,it,expect,vi } from 'vitest';
import { completeNarrative } from '@/lib/journal/narrative';
import {buildJournalSnapshot} from '@/lib/journal/facts';
import type {JournalRecord} from '@/lib/journal/model';
const progress={level:1,exp:0,currentDay:1,completedDays:[],streakCount:0,weakTags:[],completedTopics:[],topicMastery:{},reviewQueue:[]};
const answers=[{questionId:'q',answeredAt:'2026-09-26T12:00Z',isCorrect:true,tag:'',selectedChoice:'A' as const,timeSpentSeconds:null}];
const snapshot=buildJournalSnapshot({state:{progress,answers},answers,type:'weekly',date:'2026-09-26',timezone:'Asia/Tokyo',now:new Date('2026-09-26T13:00Z')})!;
const record={snapshot,narrative_status:'pending',narrative_attempts:1,record_type:'weekly'} as JournalRecord;
describe('saved facts narrative',()=>{
 it('keeps failed generation retryable without mutating facts',async()=>{const old=JSON.stringify(snapshot);const result=await completeNarrative(record,vi.fn().mockRejectedValue(new Error('timeout')));expect(result.narrative_status).toBe('retry');expect(JSON.stringify(snapshot)).toBe(old);expect(result.narrative?.source).toBe('template');});
 it('uses only saved facts, and refuses invalid/empty AI',async()=>{const generate=vi.fn().mockResolvedValue({part:{},model:'test'});const result=await completeNarrative(record,generate);expect(result.narrative_status).toBe('retry');expect(generate.mock.calls[0][0].totals.answered).toBe(1);});
 it('freezes a successful narrative and never calls AI again',async()=>{const generate=vi.fn().mockResolvedValue({part:{headline:'学びの記録',summary:'1問に取り組みました。'},model:'test'});const result=await completeNarrative(record,generate);expect(result.narrative_status).toBe('ready');generate.mockClear();await completeNarrative({...record,...result} as JournalRecord,generate);expect(generate).not.toHaveBeenCalled();});
});
