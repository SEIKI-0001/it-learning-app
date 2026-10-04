import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch();
try {
 for(const [width,height] of [[1440,1000],[390,844]]){
  const page=await b.newPage({viewport:{width,height}});
  await page.goto('http://localhost:3107/lp',{waitUntil:'domcontentloaded'});
  const video=page.locator('.story-video');
  await video.scrollIntoViewIfNeeded();
  assert.equal(await video.getAttribute('preload'),'none');
  assert.equal(await video.getAttribute('autoplay'),null);
  const meta=await video.evaluate(async v=>{
   v.load();await new Promise((resolve,reject)=>{v.onloadedmetadata=resolve;v.onerror=()=>reject(new Error(v.error?.message));});
   v.muted=true;await v.play();await new Promise(resolve=>setTimeout(resolve,300));v.pause();
   v.currentTime=46;await new Promise(resolve=>v.onseeked=resolve);
   v.textTracks[0].mode='hidden';
   return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,time:v.currentTime,ready:v.readyState};
  });
  assert.equal(meta.duration,90);assert.equal(meta.width,1920);assert.equal(meta.height,1080);assert.ok(meta.ready>=2);
  await page.waitForFunction(()=>document.querySelector('video').textTracks[0].cues?.length===14);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log(width,meta,'14 captions loaded; no horizontal overflow');
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.screenshot({path:`/private/tmp/lp-story-${width}.png`});await page.close();
 }
}finally{await b.close();}
