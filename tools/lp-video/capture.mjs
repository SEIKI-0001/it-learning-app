import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const dir = new URL('./assets/', import.meta.url).pathname;
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1000}, deviceScaleFactor:1});
const state = {profile:{itExperience:'beginner',dailyMinutes:'30',examPlan:'decided',examDate:'2026-10-28',confidence:1,weekdayMinutes:30,holidayMinutes:45,studyStyle:'balanced'},progress:{level:3,exp:260,streakCount:7,weakTags:[],completedTopics:['tech-lan-wan','tech-network-devices'],topicMastery:{'tech-lan-wan':100,'tech-network-devices':100},reviewQueue:[],weeklyPlan:null,currentDay:8,completedDays:[]},answers:[]};
await page.addInitScript(s=>localStorage.setItem('fequest:appstate',JSON.stringify(s)),state);
await page.addInitScript(()=>{
 const examReadiness={score:68,band:'approaching',confidence:{score:80,level:'medium',reasons:[]},fields:[{fieldId:'strategy',label:'ストラテジ',score:72},{fieldId:'management',label:'マネジメント',score:70},{fieldId:'technology',label:'テクノロジ',score:62}],components:{},calculation:{appliedCaps:[]},evidence:{uniqueQuestionCount:120},weakTopics:[],primaryImprovement:null};
 localStorage.setItem('fequest:progressBootstrapCache',JSON.stringify({userId:null,savedAt:Date.now(),data:{integratedStatus:null,examReadiness,planAdjustmentProposal:null}}));
});
page.on('pageerror',e=>console.log('PAGE ERROR:',e.stack));
for(const [name,url] of [['today','/today'],['progress','/progress']]){
 await page.goto('http://localhost:3107'+url,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForTimeout(3500);
 await page.addStyleTag({content:'nextjs-portal {display:none!important}'});
 await page.screenshot({path:dir+name+'.png'});
 await fs.writeFile(dir+name+'.txt', await page.locator('body').innerText());
 console.log(name, await page.title(), (await page.locator('body').innerText()).slice(0,350));
}
await browser.close();
