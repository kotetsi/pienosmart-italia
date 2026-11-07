#!/usr/bin/env python3
"""MIMIT CSV -> compact public snapshot. Standard library only; fails closed."""
import csv, io, json, os, re, sys, tempfile, urllib.parse, urllib.request, hashlib
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

SOURCE='https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti'
ROOT=Path(__file__).resolve().parents[1]

class Links(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]; self.href=None; self.label=[]
    def handle_starttag(self,tag,attrs):
        if tag=='a': self.href=dict(attrs).get('href'); self.label=[]
    def handle_data(self,data):
        if self.href is not None:self.label.append(data)
    def handle_endtag(self,tag):
        if tag=='a' and self.href:
            self.links.append((' '.join(self.label).strip(),self.href));self.href=None

def download(url):
    print('Downloading '+url,flush=True)
    req=urllib.request.Request(url,headers={'User-Agent':'PienoSmart/1.0 (public open-data importer)'})
    with urllib.request.urlopen(req,timeout=45) as response:
        data=response.read(30_000_001)
        if len(data)>30_000_000:raise ValueError('File too large')
        return data

def find_urls(html):
    parser=Links();parser.feed(html)
    found={}
    for label,href in parser.links:
        u=urllib.parse.urljoin(SOURCE,href)
        if not u.startswith('https://www.mimit.gov.it/'):continue
        text=(label+' '+href).lower()
        if 'prezzo_alle_8.csv' in text or ('prezzo alle 8' in text and '.csv' in text):found['prices']=u
        if 'anagrafica_impianti_attivi.csv' in text or ('anagrafica degli impianti attivi' in text and '.csv' in text):found['stations']=u
    return found

def parse(raw):
    text=raw.decode('utf-8-sig'); lines=text.splitlines()
    idx=next((i for i,line in enumerate(lines[:12]) if re.search(r'(?i)\bidimpianto\b',line)),None)
    if idx is None:raise ValueError('Missing idImpianto header')
    sep='|' if '|' in lines[idx] else ';' if ';' in lines[idx] else ','
    date=re.search(r'\d{4}-\d{2}-\d{2}', '\n'.join(lines[:idx]))
    reader=csv.DictReader(io.StringIO('\n'.join(lines[idx:])),delimiter=sep)
    if not date:
        alternate=re.search(r'\b(\d{2})/(\d{2})/(\d{4})\b', '\n'.join(lines[:idx]))
        date_value='-'.join(reversed(alternate.groups())) if alternate else None
    else:date_value=date.group(0)
    return date_value,list(reader)

def convert(stations,prices):
    registry={}
    for s in stations:
        key=s.get('idImpianto') or s.get('idimpianto')
        if not key:continue
        try:lat=float(s.get('Latitudine') or 0);lng=float(s.get('Longitudine') or 0)
        except ValueError:lat=lng=0
        if not (35<=lat<=48 and 6<=lng<=20):lat=lng=0
        registry[key]={'idImpianto':key,'Nome Impianto':s.get('Nome Impianto',''),'Bandiera':s.get('Bandiera',''),'Comune':s.get('Comune',''),'Provincia':s.get('Provincia',''),'Indirizzo':s.get('Indirizzo',''),'Latitudine':lat,'Longitudine':lng}
    output=[]
    for p in prices:
        key=p.get('idImpianto') or p.get('idimpianto')
        if key not in registry:continue
        try:price=float((p.get('prezzo') or '').replace(',','.'))
        except ValueError:continue
        if not 0.2<=price<=5:continue
        output.append({'idImpianto':key,'descCarburante':p.get('descCarburante',''),'prezzo':price,'isSelf':p.get('isSelf',''),'dtComu':p.get('dtComu','')})
    if len(registry)<1000 or len(output)<1000:raise ValueError('Unusually small dataset; refusing to publish')
    return list(registry.values()),output

def main():
    station_path=os.getenv('MIMIT_STATIONS_FILE');price_path=os.getenv('MIMIT_PRICES_FILE')
    if station_path and price_path:
        station_raw=Path(station_path).read_bytes();price_raw=Path(price_path).read_bytes();urls={'stations':'local','prices':'local'}
    else:
        # Public official export endpoints: do not depend on the CMS landing page.
        urls={'stations':'https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv','prices':'https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv'}
        try:
            station_raw=download(urls['stations']);price_raw=download(urls['prices'])
        except Exception as direct_error:
            print('Direct export failed: '+str(direct_error),flush=True)
            urls=find_urls(download(SOURCE).decode('utf-8','replace'))
            if set(urls)!={'stations','prices'}:raise RuntimeError('Could not discover both official CSV links; no update published')
            station_raw=download(urls['stations']);price_raw=download(urls['prices'])
    date_a,stations=parse(station_raw);date_p,prices=parse(price_raw)
    stations,prices=convert(stations,prices)
    if date_a and date_p and date_a!=date_p:raise ValueError('Station and price extraction dates differ')
    if not date_a or not date_p:raise ValueError('Missing extraction date; refusing undated publication')
    age=(datetime.now(timezone.utc).date()-datetime.fromisoformat(date_p).date()).days
    if not 0<=age<=2:raise ValueError('Extraction is stale or in the future; previous snapshot preserved')
    out={'source':'MIMIT – Osservaprezzi Carburanti','sourceUrl':SOURCE,'license':'IODL 2.0','extractionDate':date_p or date_a,'generatedAt':datetime.now(timezone.utc).isoformat(),'stations':stations,'prices':prices}
    out['provenance']={'urls':urls,'sha256':{'stations':hashlib.sha256(station_raw).hexdigest(),'prices':hashlib.sha256(price_raw).hexdigest()},'downloadVerified':urls['stations']!='local'}
    target=ROOT/'data'/'latest.json';target.parent.mkdir(exist_ok=True)
    with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=target.parent,delete=False) as f:
        json.dump(out,f,ensure_ascii=False,separators=(',',':'));tmp=f.name
    os.replace(tmp,target)
    print(f'Published {len(stations)} stations, {len(prices)} prices; extraction {out["extractionDate"]}; {target.stat().st_size} bytes')

if __name__=='__main__':
    try:main()
    except Exception as exc:print('UPDATE FAILED:',exc,file=sys.stderr);sys.exit(1)

