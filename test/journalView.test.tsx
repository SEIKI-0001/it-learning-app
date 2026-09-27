// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import JournalTimeline from '@/components/journal/JournalTimeline';
import type {JournalRecord} from '@/lib/journal/model';
afterEach(cleanup);
const record={id:'r1',record_type:'weekly',period_start:'2026-09-20',period_end:'2026-09-26',occurred_at:'2026-09-26T12:00Z',finalized_at:'2026-09-26T12:00Z',first_viewed_at:null,narrative_status:'retry',snapshot:{version:1,metrics:{answered:12,correct:9,accuracy:75,seconds:null,unmeasured:12,daysStudied:3,completedTopics:2},facts:null,comment:'前回間違えた問題に正解しました。',comparison:null,historical:false}} as JournalRecord;
it('invites an unread weekly report explicitly, with a real detail link',()=>{render(<JournalTimeline records={[record]}/>);expect(screen.getByText('今週の振り返りが届いています')).toBeInTheDocument();expect(screen.getByText('NEW')).toBeInTheDocument();expect(screen.getByRole('link')).toHaveAttribute('href','/journal/r1');expect(screen.getByText('未計測')).toBeInTheDocument();});
it('does not repeat the unread invitation for read reports',()=>{render(<JournalTimeline records={[{...record,first_viewed_at:'2026-09-27'}]}/>);expect(screen.queryByText('NEW')).not.toBeInTheDocument();expect(screen.getByText('詳細を見る')).toBeInTheDocument();});
it('does not reorder a past unread report above newer daily activity',()=>{render(<JournalTimeline records={[{...record,id:'new',record_type:'daily',period_end:'2026-09-27'},record]}/>);expect(screen.getAllByRole('link').map(a=>a.getAttribute('href'))).toEqual(['/journal/new','/journal/r1']);});
