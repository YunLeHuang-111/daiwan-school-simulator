"""Run with Java server: python3 tests/smoke.py [URL]. Standard library only."""
import json
from collections import Counter
from pathlib import Path
import sys
import urllib.request, urllib.parse, urllib.error
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8080'
ROOT=Path(__file__).resolve().parents[1]
rows=[s.split('|') for s in (ROOT/'data/questions.tsv').read_text().splitlines() if s and not s.startswith('#')]
BANK={p[0]:p for p in rows}
assert len(BANK)==len(rows)==851
for row in rows:
 assert len(row)==10
 assert not(row[1]=='英文' and row[4]=='fill')
 if row[4]=='choice':assert len(set(row[7].split('~')))==4,row[0]
 if row[4]=='match':assert sorted(map(int,row[8].split(',')))==list(range(len(row[6].split('~')))),row[0]
def req(path,data=None,expected=200):
 body=urllib.parse.urlencode(data).encode() if data is not None else None
 try:
  with urllib.request.urlopen(urllib.request.Request(BASE+path,data=body),timeout=10) as r:
   assert r.status==expected
   return json.load(r)
 except urllib.error.HTTPError as e:
  payload=e.read();assert e.code==expected,(e.code,payload.decode())
  return json.loads(payload)
def grade(paper,subjects='',round=0,wrong=False):
 qs=paper['questions'];d={'mode':paper['mode'],'subjects':subjects,'round':round,'ids':','.join(q['id'] for q in qs)}
 for i,q in enumerate(qs):
  key=BANK[q['id']][8];a=key.split('/')[0] if q['type']=='fill' else key
  if wrong:a=str((int(a)+1)%4) if q['type']=='choice' else ','.join(str((int(k)+1)%len(q['options'])) for k in key.split(',')) if q['type']=='match' else '錯誤答案'
  d['label'+str(i)]=q['examSubject'];d['a'+str(i)]=a
 return d
for asset in ['/','/app.js','/style.css','/assets/campus-summer-v4.png','/assets/avatar-default.svg']:
 with urllib.request.urlopen(BASE+asset) as r:assert r.status==200 and len(r.read())>100
req('/api/paper',{'mode':'cap'},400)
req('/api/enroll',{'seed':1.5},400)
schools=set();samples=[]
for gender in ['male','female']:
 for school_type in ['公立','私立']:
  for seed in range(400):
   data={'seed':(seed*2654435761)%4294967296,'gender':gender,'schoolType':school_type}
   d=req('/api/enroll',data)
   if seed<3:assert d==req('/api/enroll',data)
   assert d['school']['type']==school_type and d['school']['gender'] in ['all',gender]
   assert len(d['attrs'])==len(d['aptitude'])==5 and all(0<=n<=100 for n in d['attrs'])
   assert '高職' not in str(d);schools.add(d['school']['name']);samples.append(d['school'])
assert len(schools)==50,len(schools)
assert sum(x['tier']==5 for x in samples)<sum(x['tier']==2 for x in samples)/3
req('/api/enroll',{'seed':4},400)
req('/api/enroll',{'seed':4,'gender':'female','schoolType':'高職'},400)
req('/api/paper',{'mode':'split','subjects':'歷史'},400)
used=[]
for round in range(6):
 paper=req('/api/paper',{'mode':'term','round':round,'attrs':'50,50,50,50,50','seed':42,'used':','.join(used)})
 qs=paper['questions'];assert len(qs)==2 and all(q['type']=='choice' for q in qs)
 assert not set(q['id'] for q in qs)&set(used);used.extend(q['id'] for q in qs)
 assert all('key' not in q and 'answer' not in q and 'explanation' not in q for q in qs)
 assert all(q['difficulty']<=2 for q in qs if q['subject'] in ['英文','數學'])
 assert req('/api/grade',grade(paper,round=round))['exam']==100
 assert req('/api/grade',grade(paper,round=round,wrong=True))['exam']==0
for mode,subjects in [('gsat',['國文','英文','數學A','數學B','自然','社會']),('split',['數學甲','數學乙','物理','化學','生物','歷史','地理','公民與社會'])]:
 for selected in [[s] for s in subjects]+[subjects]:
  joined=','.join(selected);paper=req('/api/paper',{'mode':mode,'subjects':joined,'attrs':'60,60,60,60,60','seed':42,'previousRoute':'apply'})
  qs=paper['questions'];assert len(qs)==len({q['id'] for q in qs})==len(selected)*3
  assert Counter(q['examSubject'] for q in qs)==Counter({s:3 for s in selected})
  for subject in selected:
   if subject=='英文':
    assert {q['theme'] for q in qs if q['examSubject']==subject}<={'Movie clues','Grammar practice','Screen matching','Grammar matching'}
    assert all(q['difficulty']<=2 for q in qs if q['examSubject']==subject)
   if subject.startswith('數學'):
    assert all(q['difficulty']<=2 for q in qs if q['examSubject']==subject)
    assert not any(q['theme'] in ['數學史與解謎','數學史','典籍考古'] for q in qs if q['examSubject']==subject)
   expected={'choice','match'} if subject=='英文' else {'choice','match','fill'}
   assert {q['type'] for q in qs if q['examSubject']==subject}==expected
   for q in qs:
    if q['type']=='match':assert len(q['left'])==len(q['options'])==4
  full=req('/api/grade',grade(paper,joined));assert set(full['scores'])==set(selected)
  assert all(s==(15 if mode=='gsat' else 60) for s in full['scores'].values())
  assert all(s==0 for s in req('/api/grade',grade(paper,joined,wrong=True))['scores'].values())
 form=grade(paper,joined);index=next(i for i,q in enumerate(qs) if q['type']=='match');a=form['a'+str(index)].split(',');a[0],a[1]=a[1],a[0];form['a'+str(index)]=','.join(a)
 assert 0<req('/api/grade',form)['review'][index]['fraction']<1
 form['a'+str(index)]=','.join(['0']*4);req('/api/grade',form,400)
 empty=grade(paper,joined);empty['a0']='';req('/api/grade',empty,400)
 forged=grade(paper,joined);forged['label0']='藝術';req('/api/grade',forged,400)
req('/api/paper',{'mode':'gsat','subjects':''},400)
req('/api/paper',{'mode':'split','subjects':'國文'},400)
req('/api/paper',{'mode':'term','round':6},400)
req('/api/paper',{'mode':'term','round':0,'attrs':'1,2,3,4,5,6'},400)
req('/api/paper',{'mode':'term','round':0,'attrs':'NaN,1,2,3,4'},400)
catalog=json.loads((ROOT/'web/catalog.json').read_text());ps=catalog['programs']
assert len(catalog['universities'])==100 and len(ps)==827
assert len({p['id'] for p in ps})==827
by_id={p['id']:p for p in ps}
levels=['medical','pharmacy','top','midTech','midOther','public','privateTech','private']
for harder,easier in zip(levels,levels[1:]):
 for field in ['threshold','examFloor','talentFloor']:
  assert min(p[field] for p in ps if p['selectivity']==harder)>max(p[field] for p in ps if p['selectivity']==easier)
assert {u['id'] for u in catalog['universities']} >= {'ntpu','ntust','ntut','nkust','ndhu','dyu','fgu','cnu'}
assert len({p['id'] for p in ps if p.get('admissionReference',{}).get('scope')=='program'})>750
for row in (ROOT/'data/programs.tsv').read_text().splitlines():
 if not row or row.startswith('#'):continue
 fields=row.split('|');p=by_id[fields[0]]
 assert fields[1]==p['university'] and int(fields[2])==p['group'] and float(fields[3])==p['threshold'] and int(fields[4])==p['maxRank']
 assert float(fields[8])==p['examFloor'] and float(fields[9])==p['talentFloor'] and fields[10]==p['selectivity']
 assert fields[5].split(',')==p['subjects'] and fields[6].split(',')==p['split'] and list(map(float,fields[7].split(',')))==p['weights']
for u in catalog['universities']:assert (ROOT/'web'/u['crest'].lstrip('/')).is_file()
assert len({u['crest'] for u in catalog['universities']})==100
assert not any(p['name']=='音樂學系' and p['university'] in ['ntu','nycu','nccu'] for p in ps)
assert all(len(p['weights'])==5 and abs(sum(p['weights'])-1)<.001 for p in ps)
assert len(json.loads((ROOT/'web/songs.json').read_text()))==54
for song in json.loads((ROOT/'web/songs.json').read_text()):assert song['group'] and len(song['excerpt'])<=20
assert any(p[3]=='文言小紙條' for p in rows)
assert any('臣妾做不到' in p[5] for p in rows)
assert any('常住人口' in p[5] for p in rows)
assert len(json.loads((ROOT/'web/minigames.json').read_text()))==19
for u in catalog['universities']:assert '<text' not in (ROOT/'web'/u['crest'].lstrip('/')).read_text()
for g in json.loads((ROOT/'web/minigames.json').read_text()):
 if g['type'] in ['match','swatch']:assert len(g['pairs'])>=4
nccu=[p for p in ps if p['university']=='nccu']
assert sum(p.get('college')=='商學院' for p in nccu)==8
assert sum(p.get('college')=='外國語文學院' for p in nccu)==8
assert sum(p.get('college')=='傳播學院' for p in nccu)==5
assert len(json.loads((ROOT/'web/events.json').read_text()))==12
p=ps[0]
a={'route':'apply','program':p['id'],'preferences':p['id'],'attrs':'70,70,70,70,70','aptitude':'70,70,70,70,70','portfolio':80,'rank':10,'seed':42,**{'s.'+s:14 for s in ['國文','英文','數學A','數學B','自然','社會']}}
r=req('/api/admission',a);assert r==req('/api/admission',a)
assert req('/api/admission',dict(a,attrs='90,90,90,90,90',aptitude='90,90,90,90,90'))['chance']>r['chance']
for route,limit in [('star',3),('apply',3),('distribution',10)]:
 req('/api/admission',dict(a,route=route,preferences=','.join(x['id'] for x in ps[:limit+1])),400)
req('/api/admission',dict(a,route='star',preferences=','.join([p['id'],next(x['id'] for x in ps if x['university']!=p['university'])])),400)
req('/api/admission',dict(a,route='star',preferences=','.join([p['id'],next(x['id'] for x in ps if x['university']==p['university'] and x['group']!=p['group'])])),400)
req('/api/admission',dict(a,preferences=p['id']+','+p['id']),400)
req('/api/admission',dict(a,program='fake'),400)
med=next(x for x in ps if x['group']==8)
low=dict(a,program=med['id'],preferences=med['id'],**{'s.'+s:12 for s in ['國文','英文','數學A','數學B','自然','社會']})
assert req('/api/admission',low)['chance']==0
strong=dict(low,attrs='100,100,100,100,100',aptitude='100,100,100,100,100',**{'s.'+s:15 for s in ['國文','英文','數學A','數學B','自然','社會']})
assert req('/api/admission',strong)['chance']<=18
assert req('/api/admission',dict(a,attrs='100,100,100,100,100',aptitude='100,100,100,100,100'))['chance']<=35
print('PASS: 851 questions; weighted/gender-restricted 50 high schools; 6 x 2 questions; GSAT/split 3 per selected subject; grading/validation; 100 universities / 827 programs; four-pair questions, no English fill, elite/medical gates.')
