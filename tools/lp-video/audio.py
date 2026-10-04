"""Generate original ambient score and time-aligned Japanese VOICEVOX narration."""
import json, math, os, pathlib, subprocess, wave
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'assets'
RATE = 48000
STORY = json.loads((ROOT / 'story.json').read_text())
ENGINE = pathlib.Path(os.environ.get('VOICEVOX_CORE_DIR','/private/tmp/lp-voicevox'))
runtime = Onnxruntime.load_once(filename=str(next((ENGINE/'onnxruntime/lib').glob('*.dylib'))))
synth = Synthesizer(runtime, OpenJtalk(str(ENGINE/'dict/open_jtalk_dic_utf_8-1.11')), acceleration_mode='CPU', cpu_num_threads=4)
with VoiceModelFile.open(str(ENGINE/'models/vvms/0.vvm')) as model:
    synth.load_voice_model(model)
mix = np.zeros((90 * RATE, 2), dtype=np.float32)

def add_tone(start, duration, midi, amplitude, pan=0.0, bell=False):
    count = int(duration * RATE)
    tt = np.arange(count, dtype=np.float32) / RATE
    freq = 440 * 2 ** ((midi-69)/12)
    env = (1-np.exp(-tt/(0.014 if bell else 0.6))) * np.exp(-tt/(0.9 if bell else duration*0.6))
    env *= np.minimum(1,(duration-tt)/0.6)
    tone = (np.sin(2*np.pi*freq*tt) + 0.18*np.sin(2*np.pi*freq*2*tt)) * env * amplitude
    first = int(start*RATE); last = min(len(mix),first+count)
    if last <= first: return
    mix[first:last,0] += tone[:last-first]*math.sqrt((1-pan)/2)
    mix[first:last,1] += tone[:last-first]*math.sqrt((1+pan)/2)

# Original D-major/B-minor ambient progression; no sampled commercial music.
chords = [[47,54,62,66],[43,50,59,62],[50,57,62,66],[45,52,61,64]]
for bar,start in enumerate(np.arange(0,90,4.0)):
    chord = chords[bar % 4]
    for index,note in enumerate(chord):
        add_tone(float(start),5,note,0.018 if start < 42 else 0.022,(index-1.5)*0.3)
    if start >= 42:
        for beat in range(4):
            add_tone(float(start)+beat,2.4,chord[beat]+12,0.018,(-1)**beat*0.3,True)
mix *= np.minimum(1,np.arange(len(mix))/RATE/2)[:,None]
mix *= np.minimum(1,(len(mix)-np.arange(len(mix)))/RATE/3)[:,None]

for i,segment in enumerate(STORY):
    raw=OUT/f'voice-source-{i:02}.wav'; wav=OUT/f'voice-{i:02}.wav'
    query=synth.create_audio_query(segment.get('voice',segment['text']),8)
    query.speed_scale=1.08; query.intonation_scale=0.9; query.pitch_scale=-0.02
    query.output_sampling_rate=RATE
    raw.write_bytes(synth.synthesis(query,8))
    length=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(raw)]))
    speed=max(0.92,min(1.65,length/(segment['end']-segment['start'])))
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',f'atempo={speed},highpass=f=90,alimiter=limit=0.95','-ar',str(RATE),'-ac','1',str(wav)],check=True)
    with wave.open(str(wav)) as wf:
        a=np.frombuffer(wf.readframes(wf.getnframes()),dtype=np.int16).astype(np.float32)/32768
    if len(a) > (segment['end']-segment['start']+0.05)*RATE:
        raise RuntimeError(f'Narration overruns segment {i}')
    peak=max(np.max(np.abs(a)),0.01); a *= 0.62/peak
    at=int(segment['start']*RATE)
    mix[at:at+len(a)] += a[:,None]
    print(i,round(length,2),'->',round(len(a)/RATE,2),flush=True)
mix=np.clip(mix,-0.98,0.98)
with wave.open(str(OUT/'soundtrack.wav'),'wb') as wf:
    wf.setparams((2,2,RATE,0,'NONE','not compressed'))
    wf.writeframes((mix*32767).astype(np.int16).tobytes())
def stamp(t):
    ms=round(t*1000); return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
vtt='WEBVTT\n\n'+'\n\n'.join(f'{stamp(s["start"])} --> {stamp(s["end"])}\n{s["text"]}' for s in STORY)+'\n'
(ROOT/'../../public/lp/story').mkdir(parents=True,exist_ok=True)
(ROOT/'../../public/lp/story/captions.ja.vtt').write_text(vtt)
