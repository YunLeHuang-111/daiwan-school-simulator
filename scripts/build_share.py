"""Build the static, GitHub Pages compatible game. Python standard library only."""
import argparse,hashlib,json,re,shutil,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read_rows(name):return [s.split('|') for s in (ROOT/'data'/name).read_text().splitlines() if s and not s.startswith('#')]
def build(out):
 out=out.resolve()
 if out != (ROOT/'dist').resolve():raise ValueError('The share build writes only to the generated dist directory.')
 out.mkdir(parents=True,exist_ok=True)
 # Only generated outputs are removed; source data and user files are never touched.
 for name in ['index.html','app.js','style.css','runtime.js','runtime-data.json','catalog.json','songs.json','events.json','minigames.json','assets','.nojekyll','build-manifest.json']:
  p=out/name
  if p.is_dir():shutil.rmtree(p)
  elif p.is_file():p.unlink()
 for f in ['index.html','app.js','style.css','runtime.js','catalog.json','songs.json','events.json','minigames.json']:shutil.copy2(ROOT/'web'/f,out/f)
 shutil.copytree(ROOT/'web/assets',out/'assets')
 index=(out/'index.html').read_text().replace('<html lang="zh-Hant">','<html lang="zh-Hant" data-runtime="browser">').replace('href="/','href="./').replace('src="/','src="./')
 index=index.replace('<script src="./app.js"','<script src="./runtime.js" defer></script><script src="./app.js"')
 (out/'index.html').write_text(index)
 app=(out/'app.js').read_text().replace("'/assets/","'./assets/").replace('"/assets/','"./assets/').replace("['/catalog.json','/minigames.json','/songs.json','/events.json']","['./catalog.json','./minigames.json','./songs.json','./events.json']")
 app=app.replace("fetch('/api/'","fetch('./api/'")
 (out/'app.js').write_text(app)
 for name in ['catalog.json','events.json']:(out/name).write_text((out/name).read_text().replace('"/assets/','"./assets/'))
 questions=[]
 for p in read_rows('questions.tsv'):
  assert len(p)==10,p[0]
  questions.append(dict(id=p[0],subject=p[1],difficulty=int(p[2]),theme=p[3],type=p[4],text=p[5],left=[] if p[6]=='-' else p[6].split('~'),options=[] if p[7]=='-' else p[7].split('~'),key=p[8],explanation=p[9]))
 schools=[]
 for p in read_rows('schools.tsv'):schools.append(dict(id=p[0],name=p[1],type=p[2],area=p[3],base=list(map(int,p[4].split(','))),feature=p[5],gender=p[6],tier=int(p[7]),weight=int(p[8])))
 programs=json.loads((ROOT/'web/catalog.json').read_text())['programs']
 (out/'runtime-data.json').write_text(json.dumps(dict(questions=questions,schools=schools,programs=programs),ensure_ascii=False,separators=(',',':')))
 (out/'.nojekyll').write_text('')
 manifest={str(f.relative_to(out)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(out.rglob('*')) if f.is_file() and f.name!='build-manifest.json'}
 (out/'build-manifest.json').write_text(json.dumps({'files':manifest},indent=2)+'\n')
 print(f'Static game: {out}; {len(questions)} questions, {len(programs)} programs.')
 return out
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--output',default='dist');parser.add_argument('--zip',action='store_true');args=parser.parse_args();out=build(ROOT/args.output)
 if args.zip:
  release=ROOT/'release';release.mkdir(exist_ok=True)
  target=release/'daiwan-school-simulator-share.zip'
  with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
   for p in sorted(out.rglob('*')):
    if p.is_file():z.write(p,p.relative_to(out))
  print('Share archive:',target)
