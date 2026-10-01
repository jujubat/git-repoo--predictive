const VERSION='ksn-v390';
const SHELL=VERSION+'-shell';
const DATA=VERSION+'-data';
const MEDIA=VERSION+'-media';
const SHELL_URLS=['/'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>Promise.allSettled(SHELL_URLS.map(u=>c.add(u)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ksn-')&&!k.startsWith(VERSION)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const isAPI=u=>u.origin===location.origin && (/^\/(sports|api|fixtures|live|predictions|teams|players|standings|results|news|highlights|transfers)(\/|\?|$)/i.test(u.pathname));
const isMedia=req=>req.destination==='image'||req.destination==='video';
async function safePut(cache,req,res){try{if(res&&res.ok){const cc=res.headers.get('cache-control')||'';if(!/no-store/i.test(cc))await cache.put(req,res.clone())}}catch(_){}}
async function apiSWR(req){const c=await caches.open(DATA);const cached=await c.match(req,{ignoreVary:true});const network=fetch(req).then(async r=>{if(r.ok){const ct=(r.headers.get('content-type')||'').toLowerCase();if(ct.includes('json'))await safePut(c,req,r)}return r});if(cached){network.catch(()=>{});return cached}try{return await network}catch(_){return new Response(JSON.stringify({offline:true,cached:false,error:'offline'}),{status:503,headers:{'Content-Type':'application/json','X-KSN-Offline':'1'}})}}
async function mediaCache(req){const c=await caches.open(MEDIA);const cached=await c.match(req,{ignoreVary:true});if(cached)return cached;try{const r=await fetch(req);if(r.ok)await safePut(c,req,r);return r}catch(_){return new Response('',{status:504,statusText:'Offline media unavailable'})}}
async function navigation(req){const c=await caches.open(SHELL);try{const r=await fetch(req);if(r.ok)await safePut(c,req,r);return r}catch(_){return (await c.match(req,{ignoreSearch:true}))||(await c.match('/'))||new Response('<!doctype html><title>Kasi Sports News</title><body style="background:#05080b;color:#fff;font-family:Arial;padding:24px"><h2>Kasi Sports News</h2><p>Offline. Reconnect once so the latest dashboard can be saved for offline use.</p></body>',{headers:{'Content-Type':'text/html'}})}}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(req.mode==='navigate'){e.respondWith(navigation(req));return}if(isAPI(u)){e.respondWith(apiSWR(req));return}if(isMedia(req)){e.respondWith(mediaCache(req));return}});
