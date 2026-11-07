"""Store the latest successfully downloaded official snapshot for each UTC day.

This is our observation history, not the ministry's historical price-change log.
"""
import gzip,hashlib,json,os,tempfile
from pathlib import Path
from datetime import datetime,timezone,timedelta
ROOT=Path(__file__).resolve().parents[1]

def atomic(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile('wb',dir=path.parent,delete=False) as f:f.write(data);tmp=f.name
    os.replace(tmp,path)

def archive(root=ROOT):
    feed=json.loads((root/'data/latest.json').read_text(encoding='utf-8'))
    if feed.get('sourceType')!='official-api' or feed.get('provenance',{}).get('downloadVerified') is not True:raise ValueError('Only verified official API downloads may be archived')
    stamp=datetime.fromisoformat(feed['generatedAt']);now=datetime.now(timezone.utc)
    if stamp.tzinfo is None or not 0<=(now-stamp).total_seconds()<=172800:raise ValueError('Missing, future or stale download timestamp')
    day=stamp.astimezone(timezone.utc).date().isoformat();station_ids={s['idImpianto'] for s in feed['stations']};data={}
    for row in feed['prices']:
        key=row['idImpianto'];fuel=row['descCarburante'];mode=row['isSelf'];price=row['prezzo']
        if key not in station_ids or mode not in ('0','1') or type(price) not in (int,float) or not .2<=price<=5 or not fuel:raise ValueError('Invalid price row')
        data.setdefault(key,[]).append([fuel,mode,price])
    if len(data)<1000:raise ValueError('Unexpectedly small historical snapshot')
    snapshot={'schemaVersion':1,'date':day,'generatedAt':feed['generatedAt'],'sourceUrl':feed['sourceUrl'],'stations':data,'meaning':'Last successful observation per UTC day, not the timestamp of a price change.'}
    raw=json.dumps(snapshot,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode();compressed=gzip.compress(raw,mtime=0)
    directory=root/'data/history';target=directory/(day+'.json.gz');atomic(target,compressed)
    index_path=directory/'index.json'
    index=json.loads(index_path.read_text(encoding='utf-8')) if index_path.exists() else {'schemaVersion':1,'days':[]}
    cutoff=(now.date()-timedelta(days=89)).isoformat()
    days=[entry for entry in index['days'] if entry['date']!=day and entry['date']>=cutoff]
    days.append({'date':day,'file':day+'.json.gz','generatedAt':feed['generatedAt'],'sha256':hashlib.sha256(compressed).hexdigest(),'stationCount':len(data),'priceCount':len(feed['prices'])})
    index={'schemaVersion':1,'startedOn':min(index.get('startedOn',day),day),'timezone':'UTC','retentionDays':90,'updatedAt':now.isoformat(),'days':sorted(days,key=lambda x:x['date'])}
    atomic(index_path,json.dumps(index,separators=(',',':')).encode())
    for file in directory.glob('????-??-??.json.gz'):
        if file.name[:10]<cutoff:file.unlink()
    print(f'Archived {day}: {len(data)} stations, {len(feed["prices"])} prices; {len(compressed)} bytes; {len(days)} observed days')
    return index

if __name__=='__main__':archive()
