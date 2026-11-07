#!/usr/bin/env python3
"""Import the public API used by the official Osservaprezzi website.

Queries every region once, sequentially. Never substitutes sample prices.
insertDate is a station update timestamp, not an individual price timestamp.
"""
import hashlib,json,math,os,tempfile,time,urllib.request
from datetime import datetime,timezone
from pathlib import Path

BASE='https://carburanti.mise.gov.it/ospzApi'
ROOT=Path(__file__).resolve().parents[1]

def request(path,payload=None):
    body=None if payload is None else json.dumps(payload).encode()
    headers={'Accept':'application/json','User-Agent':'PienoSmart/1.0 (public fuel price comparison)'}
    if body is not None:headers['Content-Type']='application/json'
    url=BASE+path
    for attempt in range(2):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,data=body,headers=headers),timeout=35) as r:
                if not r.url.startswith(BASE+'/'):raise ValueError('Unexpected source redirect')
                raw=r.read(15_000_001)
                if len(raw)>15_000_000:raise ValueError('Oversized response')
                data=json.loads(raw)
                if not isinstance(data,dict) or data.get('success') is False or not isinstance(data.get('results'),list):raise ValueError('Invalid official response')
                return data['results'],hashlib.sha256(raw).hexdigest()
        except Exception:
            if attempt:raise
            time.sleep(2)

def main():
    started=datetime.now(timezone.utc).isoformat()
    regions,registry_hash=request('/registry/region')
    if len(regions)!=20 or len({r['id'] for r in regions})!=20:raise ValueError('Unexpected region registry')
    stations={};prices={};audit=[];rejected=0
    for region in regions:
        payload={'region':int(region['id']),'province':None,'town':None,'fuelType':None,'priceOrder':'asc','service':None}
        rows,digest=request('/search/area',payload)
        if not rows:raise ValueError('Empty region: '+region['description'])
        audit.append({'region':region['description'],'request':payload,'returnedStations':len(rows),'sha256':digest})
        for row in rows:
            key=str(row['id']);loc=row.get('location') or {};lat=loc.get('lat');lng=loc.get('lng')
            coords=isinstance(lat,(int,float)) and isinstance(lng,(int,float)) and 35<=lat<=48 and 6<=lng<=20
            updated=row.get('insertDate')
            if updated:
                stamp=datetime.fromisoformat(updated)
                if stamp.tzinfo is None:raise ValueError('Missing timezone')
                if (stamp-datetime.now(timezone.utc)).total_seconds()>300:raise ValueError('Future station timestamp')
            stations[key]={'idImpianto':key,'Nome Impianto':row.get('name',''),'Bandiera':row.get('brand',''),'Comune':'','Provincia':'','Indirizzo':row.get('address',''),'Regione':region['description'],'Latitudine':lat if coords else 0,'Longitudine':lng if coords else 0,'stationUpdatedAt':updated}
            for fuel in row.get('fuels',[]):
                price=fuel.get('price');mode=fuel.get('isSelf');name=fuel.get('name')
                if type(price) not in (int,float) or not math.isfinite(price) or not 0.2<=price<=5 or type(mode) is not bool or not name:
                    rejected+=1;continue
                prices[(key,name,mode)]={'idImpianto':key,'descCarburante':name,'prezzo':price,'isSelf':'1' if mode else '0','dtComu':'','stationUpdatedAt':updated}
        print(region['description']+': '+str(len(rows))+' stations',flush=True)
        time.sleep(0.5)
    if len(stations)<1000 or len(prices)<1000:raise ValueError('Dataset unexpectedly small')
    fetched=datetime.now(timezone.utc).isoformat()
    output={'source':'MIMIT – Osservaprezzi Carburanti','sourceUrl':'https://carburanti.mise.gov.it/ospzSearch/home','sourceType':'official-api','extractionDate':None,'generatedAt':fetched,'fetchStartedAt':started,'stations':list(stations.values()),'prices':list(prices.values()),'coverage':{'regionsQueried':20,'completeness':'Returned results from all regional queries; national registry completeness is not independently certified.'},'provenance':{'apiBase':BASE,'downloadVerified':True,'regionRegistrySha256':registry_hash,'requests':audit,'rejectedPrices':rejected,'timestampMeaning':'insertDate is the station update timestamp; individual price timestamps are not supplied.'}}
    target=ROOT/'data'/'latest.json';target.parent.mkdir(exist_ok=True)
    with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=target.parent,delete=False) as f:
        json.dump(output,f,ensure_ascii=False,separators=(',',':'),allow_nan=False);temp=f.name
    os.replace(temp,target)
    print(f'Published {len(stations)} stations and {len(prices)} prices; {rejected} prices rejected; fetched {fetched}',flush=True)

if __name__=='__main__':main()
