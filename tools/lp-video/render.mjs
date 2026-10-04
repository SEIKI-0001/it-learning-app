import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import sharp from 'sharp';
const root=new URL('./',import.meta.url).pathname;
const out=path.resolve(root,'../../public/lp/story');
await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root)){res.writeHead(403).end();return;}
 const mime={'.html':'text/html','.json':'application/json','.png':'image/png','.webp':'image/webp'};
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.writeHead(404).end();}
});
server.listen(3118,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
page.on('pageerror',e=>console.error(e));
await page.goto('http://127.0.0.1:3118/film.html');await page.evaluate(()=>window.ready);
const samples=[2,6,12,19,25,32,39,46,54,59,65,74,82,87];
const thumbs=[];
for(const t of samples){await page.evaluate(t=>window.render(t),t);const b=await page.screenshot({type:'png'});await fs.writeFile(path.join(root,`assets/preview-${t}.png`),b);thumbs.push({input:await sharp(b).resize(480,270).toBuffer(),left:(thumbs.length%2)*480,top:Math.floor(thumbs.length/2)*270});}
await sharp({create:{width:960,height:Math.ceil(samples.length/2)*270,channels:3,background:'#fff'}}).composite(thumbs).png().toFile(path.join(root,'contact-sheet.png'));
await page.evaluate(()=>{window.render(82);});
await sharp(await page.screenshot({type:'png'})).resize(1600,900).webp({quality:85}).toFile(path.join(out,'poster.webp'));
if(process.argv.includes('--preview')){await browser.close();server.close();process.exit(0);}
const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','warning','-f','image2pipe','-framerate','24','-vcodec','mjpeg','-i','pipe:0','-i',path.join(root,'assets/soundtrack.wav'),'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-t','90','-movflags','+faststart',path.join(out,'it-learning-story.mp4')],{stdio:['pipe','inherit','inherit']});
let failed=false;ff.on('error',()=>failed=true);
const complete=once(ff,'close');
for(let f=0;f<2160;f++){
 const jpeg=await page.evaluate(t=>{window.render(t);return document.querySelector('canvas').toDataURL('image/jpeg',.94).split(',')[1]},f/24);
 if(failed)throw new Error('ffmpeg failed');
 if(!ff.stdin.write(Buffer.from(jpeg,'base64')))await once(ff.stdin,'drain');
 if(f%240===0)console.log(`${f/24}/90 seconds rendered`);
}
ff.stdin.end();const [code]=await complete;if(code!==0)throw new Error(`ffmpeg exit ${code}`);
await browser.close();server.close();console.log('Exported',path.join(out,'it-learning-story.mp4'));
