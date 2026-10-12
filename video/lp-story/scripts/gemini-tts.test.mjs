import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildSpeechRequest,decodeSpeechAudio} from './gemini-tts.mjs';
test('directions stay out of the verbatim transcript',()=>{
 const req=buildSpeechRequest('過去問を解いた。',{voice:'Kore',style:'warm Japanese narration'});
 assert.equal(req.contents[0].parts[0].text,'過去問を解いた。');
 assert.equal(req.contents[0].parts[0].speech_metadata.style,'warm Japanese narration');
 assert.equal(req.generationConfig.speechConfig.voiceConfig.voice,'Kore');
});
test('WAV response keeps its container and PCM response gets a WAV header',()=>{
 const wav=Buffer.alloc(48);wav.write('RIFF');wav.write('WAVE',8);
 const response=(data,mimeType)=>({candidates:[{content:{parts:[{inlineData:{data:data.toString('base64'),mimeType}}]}}]});
 assert.deepEqual(decodeSpeechAudio(response(wav,'audio/wav')),wav);
 const pcm=Buffer.alloc(48000);
 const decoded=decodeSpeechAudio(response(pcm,'audio/L16;codec=pcm;rate=24000'));
 assert.equal(decoded.readUInt32LE(24),24000);
 assert.equal(decoded.readUInt32LE(40),48000);
 assert.deepEqual(decoded.subarray(44),pcm);
 assert.throws(()=>decodeSpeechAudio(response(pcm,'audio/mpeg')),/Unsupported/);
 assert.throws(()=>decodeSpeechAudio({candidates:[]}),/No audio/);
});
