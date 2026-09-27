import type { UserAnswer } from '@/types';
import type { WeeklyReportFacts } from '@/lib/weeklyReportFacts';
import type { WeeklyNarrative } from '@/lib/weeklyReportNarrative';
export type JournalType = 'daily' | 'weekly' | 'checkpoint';
export type JournalAnswer = UserAnswer & {timeSpentSeconds: number | null};
export type JournalSnapshot = {
  version: 1;
  metrics: {answered:number; correct:number; accuracy:number|null; seconds:number|null; unmeasured:number; daysStudied:number; completedTopics:number|null};
  facts: WeeklyReportFacts | null;
  comment: string;
  comparison: {before:number; after:number; label:string} | null;
  historical: boolean;
  checkpoint?: {id:string; label:string; next:string|null; skills:string[]};
};
export type JournalRecord = {
  id:string; user_id:string; record_type:JournalType; record_key:string;
  period_start:string; period_end:string; occurred_at:string; timezone:string;
  snapshot:JournalSnapshot; narrative:WeeklyNarrative | null;
  narrative_status:'pending'|'retry'|'ready'|'not_needed'; narrative_attempts:number;
  next_retry_at:string; lease_until:string|null; created_at:string; finalized_at:string|null; first_viewed_at:string|null;
};
