import {chromium} from 'playwright';
const dir=new URL('./assets/',import.meta.url).pathname;
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});
p.on('pageerror',e=>console.log('ERROR',e.message));
await p.goto('http://localhost:3107/learn/network/internet-web/tech-web-internet-basics');
await p.waitForTimeout(1500);
await p.evaluate(()=>localStorage.setItem('fequest:appstate',JSON.stringify({profile:{itExperience:'beginner',dailyMinutes:'30',examPlan:'undecided',confidence:1,weekdayMinutes:30,holidayMinutes:30,studyStyle:'balanced'},progress:{level:1,exp:0,streakCount:0,weakTags:[],completedTopics:[],topicMastery:{},reviewQueue:[],weeklyPlan:null,currentDay:1,completedDays:[]},answers:[]})));

await p.reload();await p.waitForTimeout(2500);await p.getByRole('button',{name:'次の解説へ'}).waitFor();
await p.addStyleTag({content:'nextjs-portal{display:none!important} *{scroll-behavior:auto!important}'});
await p.getByRole('button',{name:'次の解説へ'}).click();await p.waitForTimeout(400);
await p.getByRole('button',{name:'次の解説へ'}).click();await p.waitForTimeout(500);
console.log('CURRENT',await p.locator('[aria-label="解説の進み具合"]').innerText());
await p.getByTestId('packet-step-title').scrollIntoViewIfNeeded();await p.evaluate(()=>scrollBy(0,-140));await p.waitForTimeout(400);
await p.getByTestId('packet-scene').screenshot({path:dir+'packet.png'});
for(let i=0;i<6;i++){
 if(i>0)await p.getByRole('button',{name:'1ステップ進む',exact:true}).evaluate(el=>el.click());
 await p.waitForTimeout(850);await p.getByTestId('packet-scene').screenshot({path:dir+'packet-'+i+'.png'});
}
await p.locator('#lesson-quiz').scrollIntoViewIfNeeded();await p.evaluate(()=>scrollBy(0,-80));
await p.locator('#lesson-quiz').screenshot({path:dir+'quiz.png'});
console.log(await p.locator('#lesson-quiz').innerText());
await p.getByRole('button',{name:/プロトコル/}).evaluate(el=>el.click());await p.waitForTimeout(800);
await p.locator('#lesson-quiz').screenshot({path:dir+'quiz-answer.png'});await b.close();
