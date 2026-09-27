import {it,expect} from 'vitest';
import {QuestionTimer} from '@/lib/questionTimer';
it('excludes hidden time and time after answering, bounding an unattended question',()=>{
 const t=new QuestionTimer();t.show('q',0);t.pause(10000);t.show('q',100000);expect(t.answer('q',120000)).toBe(30);t.pause(150000);expect(t.seconds('q')).toBe(30);
 t.show('q2',150000);expect(t.answer('q2',150000+3600000)).toBe(300);
});
