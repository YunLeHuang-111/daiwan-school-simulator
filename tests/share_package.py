"""Validate the static release, without third party dependencies."""
from pathlib import Path
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'dist'
html=(OUT/'index.html').read_text();app=(OUT/'app.js').read_text()
assert 'data-runtime="browser"' in html
assert 'runtime.js' in html
assert not re.search(r'(?:src|href)="/(?!/)',html)
assert "'/assets/" not in app and '"/assets/' not in app
assert "fetch('/" not in app
manifest=json.loads((OUT/'build-manifest.json').read_text())['files']
for name,digest in manifest.items():assert hashlib.sha256((OUT/name).read_bytes()).hexdigest()==digest,name
c=json.loads((OUT/'catalog.json').read_text())
for u in c['universities']:assert (OUT/u['crest']).is_file()
assert all(p.get('verifiedOn') and p.get('source','').startswith('https://') for p in c['programs'])
m=json.loads((OUT/'minigames.json').read_text());assert all(g['type']!='lyric-fill' for g in m)
assert {g['type'] for g in m if g['id'] in ['lyrics','singer','lyric-artist']}=={'lyrics','singer','lyric-singer'}
assert "u.abbr+' / STUDENT ID'" not in app and '${u.abbr} / STUDENT ID' not in app
assert (OUT/'.nojekyll').is_file()
print('PASS: static release, relative paths, verified programs, music modes, student card, asset hashes.')
