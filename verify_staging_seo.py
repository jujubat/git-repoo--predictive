#!/usr/bin/env python3
"""Read-only, low-volume V663 SEO acceptance checks against an isolated staging host.

Never sends POST/PUT/PATCH/DELETE requests, never contacts the API-Football provider,
and never reads credentials. Run against a staging URL that the operator controls.
"""
import argparse
import json
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlparse
from xml.etree import ElementTree
import httpx

class Tags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals=[]; self.robots=[]; self.jsonld=[]; self._json=False; self._chunks=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='link' and a.get('rel','').lower()=='canonical':self.canonicals.append(a.get('href',''))
        if tag=='meta' and a.get('name','').lower()=='robots':self.robots.append(a.get('content',''))
        if tag=='script' and a.get('type')=='application/ld+json':self._json=True; self._chunks=[]
    def handle_data(self,data):
        if self._json:self._chunks.append(data)
    def handle_endtag(self,tag):
        if tag=='script' and self._json:
            self.jsonld.append(''.join(self._chunks));self._json=False

def audit(base, team, player, match, timeout=15):
    base=base.rstrip('/')
    parsed=urlparse(base)
    if parsed.scheme!='https' or not parsed.hostname:
        raise ValueError('Use an HTTPS staging base URL')
    if parsed.hostname in ('kasilivescore.com','www.kasilivescore.com'):
        raise ValueError('Refusing production URL; staging only')
    paths=['/robots.txt','/sitemap.xml','/seo/sitemap.xml',f'/teams/{team}',f'/players/{player}',f'/matches/{match}/stats',f'/team/{team}']
    results=[]; sitemap_urls=[]
    with httpx.Client(timeout=timeout,follow_redirects=False,headers={'User-Agent':'KasiScore-V663-SEO-ReadOnly-Acceptance/1.0'}) as c:
        for path in paths:
            try:
                r=c.get(base+path)
                status=r.status_code
                result={'path':path,'http':status,'location':r.headers.get('location',''),'x_robots':r.headers.get('x-robots-tag',''),'cache_control':r.headers.get('cache-control','')}
                if path.endswith('.xml') and status==200:
                    root=ElementTree.fromstring(r.text)
                    urls=[e.text or '' for e in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
                    result.update({'urls':len(urls),'duplicates':len(urls)-len(set(urls)),'placeholders':sum(('${' in u or '%24%7b' in u.lower()) for u in urls),'retired_sports':sum(bool(re.search(r'/(?:rugby|cricket|tennis)(?:/|$)',urlparse(u).path,re.I)) for u in urls)})
                    sitemap_urls.append((path,urls))
                if path.startswith(('/teams/','/players/','/matches/')) and status==200:
                    tags=Tags();tags.feed(r.text)
                    result.update({'canonical':tags.canonicals,'meta_robots':tags.robots,'jsonld_count':len(tags.jsonld),'has_ssr_heading':bool(re.search(r'<h1\b[^>]*>[^<]{3,}',r.text,re.I)),'ssr_marker':'ksn-v663-trial05-ssr' in r.text})
                    for item in tags.jsonld:
                        try:json.loads(item)
                        except json.JSONDecodeError:result['invalid_jsonld']=True
                results.append(result)
            except (httpx.HTTPError,ElementTree.ParseError) as exc:
                results.append({'path':path,'error':type(exc).__name__})
    failures=[]
    for row in results:
        p=row['path']
        if 'error' in row: failures.append(p+': request/XML error');continue
        if row['http'] >= 500: failures.append(f"{p}: server error HTTP {row['http']}")
        if p.endswith('.xml') and row['http'] != 200: failures.append(f"{p}: sitemap returned HTTP {row['http']}")
        if p.endswith('.xml') and row['http']==200:
            for k in ('duplicates','placeholders','retired_sports'):
                if row.get(k,0):failures.append(f'{p}: {k}={row[k]}')
        if p.startswith(('/teams/','/players/','/matches/')) and row['http'] != 200:
            failures.append(f"{p}: expected verified test page HTTP 200, received {row['http']}")
        if p.startswith(('/teams/','/players/','/matches/')) and row['http']==200:
            if len(row.get('canonical',[])) != 1: failures.append(p+': expected exactly one canonical')
            if len(row.get('meta_robots',[]))>1: failures.append(p+': duplicate robots meta')
            if row.get('invalid_jsonld'):failures.append(p+': malformed JSON-LD')
            if len(row.get('canonical',[]))==1 and '${' in row['canonical'][0]:failures.append(p+': placeholder canonical')
        if p=='/team/'+str(team) and row['http'] in (301,302,307,308):
            target=row['location']
            if '${' in target:failures.append(p+': placeholder redirect')
    return {'scope':'read-only staging GETs','base':base,'requests':len(paths),'results':results,'checks_failed':failures,'limitations':['Does not verify Google indexing, provider balance, DB isolation or complete football regressions','HTTP 200 alone does not prove meaningful content or correct indexing','Use real known valid team/player/match IDs and inspect results']}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('base',help='HTTPS staging URL, never production')
    p.add_argument('--team',type=int,required=True)
    p.add_argument('--player',type=int,required=True)
    p.add_argument('--match',type=int,required=True)
    p.add_argument('--output',default='trial08_staging_results.json')
    args=p.parse_args()
    if min(args.team,args.player,args.match)<=0:p.error('IDs must be positive')
    try:report=audit(args.base,args.team,args.player,args.match)
    except ValueError as exc:p.error(str(exc))
    with open(args.output,'w',encoding='utf-8') as out:json.dump(report,out,indent=2)
    print(json.dumps({'requests':report['requests'],'failures':report['checks_failed'],'report':args.output},indent=2))
    return 1 if report['checks_failed'] else 0
if __name__=='__main__':sys.exit(main())
