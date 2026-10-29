from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,wave,subprocess,math,textwrap,shutil
R=Path(__file__).resolve().parents[2];W=R/'work/writing-release';OUT=R/'public/writing/media'
stories=json.loads((Path(__file__).parent/'video-stories.json').read_text(encoding='utf-8'))
ff=shutil.which('ffmpeg') or next((R/'work/portfolio-tools/imageio_ffmpeg/binaries').glob('ffmpeg*.exe'),None)
if not ff:raise RuntimeError('Install FFmpeg and add it to PATH before rendering.')
fontpath=Path(r'C:\Windows\Fonts')
def font(n,b=False):return ImageFont.truetype(str(fontpath/('arialbd.ttf' if b else 'arial.ttf')),n)
def txt(d,xy,text,n=24,fill='#eaece3',width=75,b=False):
 x,y=xy
 for line in textwrap.wrap(text,width):d.text((x,y),line,font=font(n,b),fill=fill);y+=n*1.4
 return y
def timestamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
result={}
for id,story in stories.items():
 out=OUT/id;out.mkdir(parents=True,exist_ok=True);waves=[];chapters=[];captions=[];elapsed=0
 for i,scene in enumerate(story['scenes']):
  wav=W/f'audio/{id}-{i}.wav'
  with wave.open(str(wav),'rb') as a: params=a.getparams();frames=a.readframes(a.getnframes());dur=a.getnframes()/a.getframerate()
  waves.append((params,frames,dur));chapters.append({'title':scene['title'],'start':round(elapsed,3),'text':scene['text']})
  marks=json.loads((W/f'audio/{id}-{i}.json').read_text(encoding='utf-8-sig'))
  for j in range(0,len(marks),11):
   m=marks[j];end=marks[j+11] if j+11<len(marks) else None
   text=scene['text'][m['character']:end['character'] if end else len(scene['text'])].strip()
   captions.append((elapsed+m['time'],elapsed+(end['time'] if end else dur),text))
  elapsed+=dur+.25
 combined=W/f'{id}-narration.wav'
 with wave.open(str(combined),'wb') as a:
  a.setparams(waves[0][0]);
  for params,frames,dur in waves:a.writeframes(frames);a.writeframes(bytes(round(params.framerate*.25)*params.sampwidth*params.nchannels))
 (out/'captions.en.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{timestamp(s)} --> {timestamp(e)}\n'+ '\n'.join(textwrap.wrap(t,45)) for s,e,t in captions)+'\n',encoding='utf-8')
 (out/'transcript.txt').write_text(story['title']+'\n\nEnglish synthetic narration: Microsoft Zira Desktop\nActual interface captures and labelled teaching diagrams.\n\n'+'\n\n'.join(c['title']+'\n'+c['text'] for c in chapters),encoding='utf-8')
 metadata={'duration':round(elapsed,3),'voice':'Microsoft Zira Desktop','chapters':chapters};result[id]=metadata
 (out/'story.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
 print(id,'duration',round(elapsed,2),flush=True)
 # Each scene is composed once. A moving timeline and gentle image reveal supply motion without distracting from the explanation.
 bases=[]
 for i,scene in enumerate(story['scenes']):
  im=Image.new('RGB',(1280,720),'#101814');d=ImageDraw.Draw(im);accent=story['accent']
  d.line((55,60,1225,60),fill='#415044',width=1);txt(d,(55,30),'SOHAIB IJAZ / BEHIND THE BUILD',14,accent);txt(d,(960,30),f'{i+1:02} / 06',14,accent)
  txt(d,(55,94),scene['label'],13,accent);y=txt(d,(55,130),scene['title'],45,width=43,b=True)
  if scene['kind']=='interface':
   shot=Image.open(R/f"public/previews/{scene['image']}.webp").convert('RGB');shot.thumbnail((1120,390));im.paste(shot,((1280-shot.width)//2,245));d=ImageDraw.Draw(im)
  else:
   cards=[]
   if id=='trustmart' and scene['kind']=='prices':cards=[('Rs 8,000','Eligible / low tail'),('Rs 8,400','Included'),('Rs 8,600','Included'),('Rs 9,000','Included'),('Rs 9,500','Eligible / high tail')];bottom='Five eligible offers → trim one per tail → mean Rs 8,667'
   elif id=='travel' and scene['kind']=='budget':cards=[('USD 700','Illustrative quote'),('PKR 280','Assumed FX / USD'),('Rs 196,000','Whole-group flight cost')];bottom='Per-person basis for two people doubles the flight line.'
   elif id=='careindex':cards=[('REQUEST A','Begin write transaction'),('ONE SLOT','Reserve + issue invoice'),('REQUEST B','Recheck → unavailable')];bottom='Commit both records, or roll back both. Teaching simulation.'
   elif id=='word-search':cards=[('SEED 2024','Reproducible input'),('PLACE TARGETS','Accept valid paths'),('FILL GAPS','Expose only placed words')];bottom='Same inputs → same board. Seeded randomness is not encryption.'
   else:cards=[('01 / INPUT','Describe the request'),('02 / SERVER','Validate current data'),('03 / RESULT','Show evidence and limits')];bottom='A workflow diagram, not a recording of a live request.'
   n=len(cards);gap=16;cw=(1170-(n-1)*gap)//n
   for j,(title,sub) in enumerate(cards):
    x=55+j*(cw+gap);d.rounded_rectangle((x,285,x+cw,480),radius=10,fill='#203026',outline='#4c6252',width=1);txt(d,(x+20,315),title,22 if n<5 else 19,accent,width=18,b=True);txt(d,(x+20,378),sub,18,width=17)
   txt(d,(55,530),bottom,24,width=80)
  txt(d,(55,650),story['title'],15,'#aebdaf');txt(d,(960,650),'ENGLISH / CAPTIONED',12,accent)
  bases.append(im)
 bases[0].save(out/'poster.webp',quality=88)
 proc=subprocess.Popen([str(ff),'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r','12','-i','-','-i',str(combined),'-c:v','libx264','-preset','veryfast','-crf','23','-r','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',str(out/'explainer.mp4')],stdin=subprocess.PIPE)
 for frame in range(math.ceil(elapsed*12)):
  t=frame/12;i=max(k for k,c in enumerate(chapters) if c['start']<=t);im=bases[i].copy();d=ImageDraw.Draw(im);d.rectangle((55,695,1225,699),fill='#304136');d.rectangle((55,695,55+1170*t/elapsed,699),fill=story['accent']);local=t-chapters[i]['start']
  if local<.35:im=Image.blend(Image.new('RGB',im.size,'#101814'),im,min(1,local/.35))
  proc.stdin.write(im.tobytes())
 proc.stdin.close();code=proc.wait()
 if code:raise RuntimeError(f'Encoder failed {id}: {code}')
 print('Encoded',out/'explainer.mp4',flush=True)
(R/'src/data/writing-stories.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print('All four captioned explainers complete.',flush=True)
