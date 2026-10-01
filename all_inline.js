
(function(){
 const p=location.pathname.replace(/\/+$/,'');
 if(/^\/players?\/[^/]+(?:\/|$)/i.test(p))document.body.classList.add('kc-player-route');
 if(/^\/teams?\/[^/]+(?:\/|$)/i.test(p))document.body.classList.add('kc-team-route');
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // Define kcNewsImageUrl early so renderKasiNewsGrid can use it safely
 if(typeof window.kcNewsImageUrl !== 'function'){
   window.kcNewsImageUrl=function(n){
     const candidates=[n?.image,n?.ogImage,n?.publisherImage].filter(Boolean);
     for(const raw of candidates){
       const u=String(raw);
       if(/news\.google\.com|(?:gstatic|googleusercontent)\.com\/(?:images\/branding|news)|google_news|favicon/i.test(u))continue;
       if(/^https?:\/\//i.test(u))return u;
     }
     return '';
   };
 }
 window.renderKasiNewsGrid=function(items,target){
  const el=typeof target==='string'?document.getElementById(target):target;if(!el)return;
  el.classList.add('ks204-news-grid');
  el.innerHTML=(items||[]).map((n,i)=>{
    const im=kcNewsImageUrl(n),desc=n.description||n.summary||n.snippet||'';
    const url=n.articlePath||n.publisherUrl||n.resolvedUrl||n.link||'';
    return `<article class="ks204-news-card" role="link" tabindex="0"
      onclick="openKasiNewsArticle&&openKasiNewsArticle(${JSON.stringify(url)},${JSON.stringify(n.title||'Sports News')})"
      onkeydown="if(event.key==='Enter')openKasiNewsArticle&&openKasiNewsArticle(${JSON.stringify(url)})">
      <div class="ks204-news-media">${im?`<img src="${E(im)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="" fetchpriority="low">`:'<div class="kc-news-fallback" style="width:100%;height:100%">KASI SPORTS NEWS</div>'}</div>
      <div class="ks204-news-body"><div class="ks204-news-cat">${E(n.sport||n.category||'Sports')}</div>
      <div class="ks204-news-title"><b>${E(n.title||'Sports headline')}</b></div>
      ${desc?`<div class="ks204-news-desc">${E(desc)}</div>`:''}
      <div class="ks204-news-meta">${E(n.publisher||n.source||'Sports News')} · ${E(n.published||'')}</div>
      <div class="ks204-read">Read More →</div></div></article>`;
  }).join('')||'<div class="empty">No current sports news returned.</div>';
 };
})();

window.KASI_PUBLIC_ORIGIN="https://kasilivescore.com";

(function(){
  const BUILD='2026-09-26-v274-stability';
  try{
    if(localStorage.getItem('kasi:active-build')!==BUILD){
      for(let i=localStorage.length-1;i>=0;i--){
        const k=localStorage.key(i)||'';
        if(k.startsWith('kasi:v273:')||k.startsWith('kasi:json:v1:')||k.startsWith('ks:v254:')) localStorage.removeItem(k);
      }
      for(let i=sessionStorage.length-1;i>=0;i--){
        const k=sessionStorage.key(i)||'';
        if(k.startsWith('kasi:')||k.startsWith('ks:v254:')) sessionStorage.removeItem(k);
      }
      const api=(localStorage.getItem('ksApiBase')||'').trim();
      if(api && !/^https:\/\/kasilivescore\.com$/i.test(api)) localStorage.removeItem('ksApiBase');
      localStorage.setItem('kasi:active-build',BUILD);
    }
  }catch(_){}
})();


(function(){
  // Stability build: persistent API-response interception is disabled.
  // The backend/CDN and widget-level caches remain authoritative, preventing normal
  // browser sessions from replaying stale JSON that Incognito does not have.
  window.KasiCachePolicy={homeTTL:0,liveTTL:0,clear:function(){
    try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i)||'';if(k.startsWith('kasi:v273:')||k.startsWith('kasi:json:v1:'))localStorage.removeItem(k)}}catch(_){}
  }};
})();


(function(){
  'use strict';

  function cleanDedicatedState(){
    document.body.classList.remove(
      'kc-entity-mode','kc-team-route','kc-player-route',
      'ks-standalone-page','ks-match-centre-mode','ks-dedicated-stats'
    );
    const entity=document.getElementById('kasiscoreEntityPageRoot');
    if(entity) entity.remove();
    const app=document.querySelector('.app');
    if(app) app.style.removeProperty('display');
  }

  window.kasiDashboardBack=function(){
    cleanDedicatedState();
    window.MATCH_STATS_FIXTURE_ID=null;
    window.MATCH_STATS_SPORT=null;
    window.MATCH_STATS_LEAGUE='';
    try{
      if(typeof window.showTab==='function') window.showTab('overview');
      else{
        document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));
        const home=document.getElementById('overview');
        if(home){home.classList.remove('hidden');home.style.removeProperty('display');}
      }
    }catch(_){}
    try{history.pushState({kasiView:'home'},'', '/');}catch(_){}
    window.scrollTo({top:0,behavior:'smooth'});
    return false;
  };

  window.kasiLiveBack=function(){
    cleanDedicatedState();
    window.MATCH_STATS_FIXTURE_ID=null;
    window.MATCH_STATS_SPORT=null;
    window.MATCH_STATS_LEAGUE='';
    try{if(typeof window.showTab==='function')window.showTab('live');}catch(_){}
    try{history.pushState({kasiView:'live'},'', '/');}catch(_){}
    window.scrollTo({top:0,behavior:'smooth'});
    return false;
  };
})();

document.write(Math.random().toString(36).substr(2,6).toUpperCase())

  (function(){

  const M = [
    { h:'Pirates',  a:'Chiefs'   },
    { h:'Sundowns', a:'Chippa'   },
    { h:'Durban',   a:'Swallows' },
    { h:'CT City',  a:'Marumo'   },
  ];

  // Every scoreline <= 2:2, ordered as: 0-0, 1-0, 2-0, 2-1, 0-1, 1-1, 0-2, 1-2, 2-2
  const SCORES = [
    { h:0, a:0, lbl:'0 – 0', res:'draw', odds:1.75, col:'var(--muted)', mkt:'0-0'  },
    { h:1, a:0, lbl:'1 – 0', res:'home', odds:2.40, col:'var(--accent)', mkt:'1-0'  },
    { h:2, a:0, lbl:'2 – 0', res:'home', odds:3.20, col:'var(--accent)', mkt:'2-0'  },
    { h:2, a:1, lbl:'2 – 1', res:'home', odds:4.00, col:'var(--accent)', mkt:'2-1'  },
    { h:0, a:1, lbl:'0 – 1', res:'away', odds:2.60, col:'var(--red)', mkt:'0-1'  },
    { h:1, a:1, lbl:'1 – 1', res:'draw', odds:2.90, col:'var(--purple)', mkt:'1-1'  },
    { h:0, a:2, lbl:'0 – 2', res:'away', odds:3.50, col:'var(--red)', mkt:'0-2'  },
    { h:1, a:2, lbl:'1 – 2', res:'away', odds:4.50, col:'var(--red)', mkt:'1-2'  },
    { h:2, a:2, lbl:'2 – 2', res:'draw', odds:5.50, col:'var(--yellow)', mkt:'2-2'  },
  ];

  // Generate all 9^4 = 6561 combinations
  const ALL = [];
  for (let a=0;a<9;a++) for (let b=0;b<9;b++) for (let c=0;c<9;c++) for (let d=0;d<9;d++) {
    ALL.push([a,b,c,d]);
  }

  let PAGE = 0;
  const PER_PAGE = 81;
  let F = [-1,-1,-1,-1]; // filter per match
  window.pslSelected = new Set();

  function filtered() {
    return ALL.filter(c => F.every((f,i) => f < 0 || c[i] === f));
  }
  function key(c){ return c.join(','); }
  function odds(c){ return c.reduce((a,i)=>a*SCORES[i].odds,1); }

  function render() {
    const wrap = document.getElementById('pslCouponWrap');
    if (!wrap) return;
    const rows = filtered();
    const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    if (PAGE >= totalPages) PAGE = totalPages - 1;
    const pageRows = rows.slice(PAGE*PER_PAGE, (PAGE+1)*PER_PAGE);
    const sel = window.pslSelected.size;

    let html = `<div style="background:linear-gradient(160deg,#060e18,#0a1628 80%);border:2px solid var(--accent);border-radius:16px;overflow:hidden;box-shadow:0 0 36px rgba(34,211,238,.12),0 16px 40px rgba(0,0,0,.7)">

<!-- TITLE -->
<div style="padding:13px 16px 11px;background:linear-gradient(90deg,rgba(34,211,238,.10),rgba(52,211,153,.07));border-bottom:1px solid rgba(34,211,238,.22);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
  <div>
    <div style="font-size:15px;font-weight:800;color:#fff"> All Possible Score Combinations — 4 PSL Matches</div>
    <div style="font-size:10px;color:var(--muted);margin-top:2px">Every score &lt;= 2:2 &nbsp;·&nbsp; <b style="color:var(--accent)">6 561 total combinations</b> &nbsp;·&nbsp; ${rows.length} showing &nbsp;·&nbsp; <b style="color:var(--green)">${sel} selected</b></div>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap">
    <button onclick="pslCopySelected()" style="padding:7px 12px;border-radius:8px;border:none;background:#00a651;color:#fff;font-weight:700;font-size:11px;cursor:pointer"> Copy Selected (${sel})</button>
    <button onclick="pslCopyAll()" style="padding:7px 12px;border-radius:8px;border:1px solid rgba(34,211,238,.4);background:rgba(34,211,238,.08);color:var(--accent);font-weight:700;font-size:11px;cursor:pointer"> Copy Shown (${rows.length})</button>
  </div>
</div>

<!-- FILTER DROPDOWNS -->
<div style="display:grid;grid-template-columns:repeat(4,1fr);background:rgba(0,0,0,.45);border-bottom:2px solid rgba(34,211,238,.15)">
${M.map((m,i)=>`<div style="padding:8px 8px;border-right:1px solid rgba(255,255,255,.06);${i===3?'border-right:none':''}">
  <div style="font-size:10px;font-weight:800;color:var(--accent);margin-bottom:4px">${m.h} vs ${m.a}</div>
  <select onchange="pslFilt(${i},this.value)" style="width:100%;background:#0d1f35;color:var(--text);border:1px solid rgba(34,211,238,.25);border-radius:6px;padding:4px 5px;font-size:11px;cursor:pointer">
    <option value="-1" ${F[i]===-1?'selected':''}>All scores</option>
    ${SCORES.map((s,si)=>`<option value="${si}" ${F[i]===si?'selected':''}>${s.lbl}</option>`).join('')}
  </select>
</div>`).join('')}
</div>

<!-- COLUMN HEADERS -->
<div style="display:grid;grid-template-columns:38px repeat(4,1fr) 80px 60px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(255,255,255,.08)">
  <div style="padding:6px 4px;text-align:center;font-size:9px;color:var(--line)">#</div>
  ${M.map(m=>`<div style="padding:6px 4px;text-align:center;font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:.05em;border-right:1px solid rgba(255,255,255,.05)">${m.h}<br><span style="color:var(--line)">vs</span><br>${m.a}</div>`).join('')}
  <div style="padding:6px 4px;text-align:center;font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:.05em;border-right:1px solid rgba(255,255,255,.05)">Odds</div>
  <div style="padding:6px 4px;text-align:center;font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:.05em">Mix</div>
</div>

<!-- ROWS -->
<div style="max-height:65vh;overflow-y:auto">`;

    let lastS0 = -1;
    pageRows.forEach((c, ri) => {
      const k = key(c);
      const isSel = window.pslSelected.has(k);
      const o = odds(c).toFixed(2);
      const s = c.map(i => SCORES[i]);

      // section break on match-0 score change
      if (c[0] !== lastS0) {
        lastS0 = c[0];
        html += `<div style="position:sticky;top:0;z-index:3;padding:5px 14px;background:#1f1f1f;border-bottom:1px solid rgba(34,211,238,.12);border-top:2px solid rgba(34,211,238,.18);display:flex;gap:12px;align-items:center">
          <span style="font-size:11px;font-weight:800;color:${s[0].col}">${M[0].h} ${s[0].lbl} ${M[0].a}</span>
          <span style="font-size:9px;color:#475569">· other 3 matches cycle all 729 combinations below</span>
        </div>`;
      }

      const rowNum = PAGE*PER_PAGE + ri + 1;
      html += `<div onclick="pslToggle('${k}')" style="display:grid;grid-template-columns:38px repeat(4,1fr) 80px 60px;align-items:center;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;background:${isSel?'rgba(56,189,248,.07)':'transparent'};transition:background .1s">

  <!-- tick + number -->
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px;background:rgba(0,0,0,.2);border-right:1px solid rgba(255,255,255,.05);height:100%">
    <div style="width:12px;height:12px;border-radius:3px;border:1.5px solid var(--accent);background:${isSel?'var(--accent)':'transparent'};display:grid;place-items:center">
      ${isSel?'<svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#000" stroke-width="2" stroke-linecap="round"/></svg>':''}
    </div>
    <span style="font-size:8px;color:var(--line)">${rowNum}</span>
  </div>

  <!-- 4 score cells -->
  ${s.map(sc=>`<div style="padding:8px 3px;text-align:center;border-right:1px solid rgba(255,255,255,.04)">
    <div style="font-size:14px;font-weight:900;color:${sc.col};letter-spacing:.5px">${sc.lbl}</div>
    <div style="font-size:8px;color:var(--line)">${sc.mkt}</div>
  </div>`).join('')}

  <!-- odds -->
  <div style="text-align:center;padding:6px 4px;border-right:1px solid rgba(255,255,255,.04)">
    <div style="font-size:14px;font-weight:900;color:var(--yellow)">${o}</div>
  </div>

  <!-- mix badge -->
  <div style="text-align:center;padding:4px 2px">
    <span style="font-size:8px;padding:2px 5px;border-radius:4px;font-weight:700;
      background:${s.every(x=>x.res==='draw')?'rgba(167,139,250,.15)':s.filter(x=>x.res==='home').length>s.filter(x=>x.res==='away').length?'rgba(34,211,238,.10)':'rgba(251,113,133,.10)'};
      color:${s.every(x=>x.res==='draw')?'var(--purple)':s.filter(x=>x.res==='home').length>s.filter(x=>x.res==='away').length?'var(--accent)':'var(--red)'}">
      ${s.filter(x=>x.res==='home').length}H ${s.filter(x=>x.res==='away').length}A ${s.filter(x=>x.res==='draw').length}D
    </span>
  </div>
</div>`;
    });

    html += `</div><!-- end scroll -->

<!-- PAGINATION -->
<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:rgba(0,0,0,.4);border-top:2px solid rgba(34,211,238,.14);flex-wrap:wrap;gap:8px">
  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
    <button onclick="pslPage(-1)" ${PAGE===0?'disabled':''} style="padding:6px 14px;border-radius:7px;border:1px solid rgba(34,211,238,.3);background:rgba(34,211,238,.08);color:var(--accent);font-weight:700;font-size:12px;cursor:pointer;opacity:${PAGE===0?.4:1}">← Prev</button>
    <span style="font-size:12px;color:var(--muted)">Page <b style="color:var(--text)">${PAGE+1}</b> of <b style="color:var(--text)">${totalPages}</b></span>
    <button onclick="pslPage(1)" ${PAGE>=totalPages-1?'disabled':''} style="padding:6px 14px;border-radius:7px;border:1px solid rgba(34,211,238,.3);background:rgba(34,211,238,.08);color:var(--accent);font-weight:700;font-size:12px;cursor:pointer;opacity:${PAGE>=totalPages-1?.4:1}">Next →</button>
    <button onclick="pslJump()" style="padding:6px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:var(--muted);font-size:11px;cursor:pointer">Jump to…</button>
  </div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <span style="font-size:10px;color:var(--muted)">⬜ 0-0</span>
    <span style="font-size:10px;color:var(--accent)"> Home win</span>
    <span style="font-size:10px;color:var(--red)"> Away win</span>
    <span style="font-size:10px;color:var(--purple)"> Score draw</span>
    <span style="font-size:10px;color:var(--yellow)"> 2-2</span>
  </div>
</div>

</div>`;

    wrap.innerHTML = html;
  }

  window.pslFilt  = function(i,v){ F[i]=parseInt(v); PAGE=0; render(); };
  window.pslPage  = function(d){ PAGE+=d; render(); };
  window.pslJump  = function(){
    const rows=filtered(), tp=Math.max(1,Math.ceil(rows.length/PER_PAGE));
    const p=parseInt(prompt('Go to page (1 – '+tp+'):'));
    if(!isNaN(p)&&p>=1&&p<=tp){PAGE=p-1;render();}
  };
  window.pslToggle= function(k){
    if(window.pslSelected.has(k)) window.pslSelected.delete(k);
    else window.pslSelected.add(k);
    render();
  };

  function buildText(keys){
    const now=new Date().toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short'});
    const lines=[' PSL SCORELINE COMBINATIONS','━'.repeat(44),
      'Generated: '+now,
      'Matches: '+M.map(m=>m.h+' vs '+m.a).join(' · '),
      'All scores capped at 2:2',''];
    keys.forEach((k,i)=>{
      const c=k.split(',').map(Number);
      const o=odds(c).toFixed(2);
      lines.push('#'+(i+1)+'  Combined odds: '+o);
      c.forEach((si,mi)=>{
        const sc=SCORES[si];
        lines.push('   '+M[mi].h+' '+sc.lbl+' '+M[mi].a+'  ('+sc.mkt+')');
      });
      lines.push('');
    });
    lines.push('━'.repeat(44));

    return lines.join('\n');
  }

  window.pslCopySelected=function(){
    const s=[...window.pslSelected];
    if(!s.length){alert('No combinations selected!');return;}
    const txt=buildText(s);
    navigator.clipboard.writeText(txt)
      .then(()=>{if(typeof bwToast==='function')bwToast(' '+s.length+' combo(s) copied!');})
      .catch(()=>{const ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);});
  };
  window.pslCopyAll=function(){
    const keys=filtered().map(c=>key(c));
    const txt=buildText(keys);
    navigator.clipboard.writeText(txt)
      .then(()=>{if(typeof bwToast==='function')bwToast(' '+keys.length+' combos copied!');})
      .catch(()=>{const ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);});
  };

  const _orig=window.showTab;
  window.showTab=function(id,btn){
    if(typeof _orig==='function')_orig(id,btn);
    if(id==='lowscoring')render();
  };

  if(!document.getElementById('lowscoring').classList.contains('hidden'))render();

  })();
  

// ── Low Scoring Predictions Module ───────────────────────────

// ── Extended team database with goals-per-game averages ───────
const LS_TEAM_DB = [
  // ── PREMIER LEAGUE ──────────────────────────────────────────
  { name:'Wolves',           league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', gpg:1.87, u15:41, u25:62, risk:'low',    style:'Low block, counter only',            note:'Compactest shape in EPL — fewest goals/game for years' },
  { name:'Nottm Forest',     league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', gpg:2.05, u15:35, u25:58, risk:'low',    style:'Deep defensive block',               note:'Historically under 2.5 at home and away' },
  { name:'Ipswich',          league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', gpg:2.10, u15:33, u25:55, risk:'low',    style:'Organised mid-block',                note:'Newly promoted side; cautious tactical approach' },
  { name:'Brentford',        league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', gpg:2.28, u15:29, u25:51, risk:'low',    style:'Set-piece & direct ball',            note:'Long-ball style often produces fewer open goals' },
  { name:'Bournemouth',      league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', gpg:2.35, u15:27, u25:49, risk:'mid',    style:'Mid-block, quick transition',        note:'Variable — home/away splits significant' },
  // ── LA LIGA ─────────────────────────────────────────────────
  { name:'Getafe',           league:'La Liga',        flag:'', gpg:1.72, u15:45, u25:68, risk:'low',    style:'Physical, anti-football',            note:'Consistently the lowest-scoring La Liga team' },
  { name:'Osasuna',          league:'La Liga',        flag:'', gpg:1.91, u15:38, u25:61, risk:'low',    style:'Direct, defensive press',            note:'Low-volume attacking side; away games especially tight' },
  { name:'Atlético Madrid',  league:'La Liga',        flag:'', gpg:2.08, u15:33, u25:56, risk:'low',    style:'Simeone\'s 4-4-2 block',             note:'Home fortress under 2.5 extremely reliable' },
  { name:'Celta Vigo',       league:'La Liga',        flag:'', gpg:2.19, u15:30, u25:53, risk:'mid',    style:'Pragmatic, mixed approach',          note:'Away from home tends toward under 2.5' },
  { name:'Rayo Vallecano',   league:'La Liga',        flag:'', gpg:2.15, u15:32, u25:54, risk:'low',    style:'Low-line, reactive',                 note:'One of La Liga\'s most consistent low-scoring sides' },
  // ── BUNDESLIGA ──────────────────────────────────────────────
  { name:'Union Berlin',     league:'Bundesliga',     flag:'', gpg:2.21, u15:31, u25:52, risk:'low',    style:'Physical counter-attack',            note:'Bundesliga outlier — significantly lower than league avg' },
  { name:'Heidenheim',       league:'Bundesliga',     flag:'', gpg:2.18, u15:32, u25:54, risk:'low',    style:'Compact block, long ball',           note:'Promoted side maintaining defensive identity' },
  { name:'Bochum',           league:'Bundesliga',     flag:'', gpg:2.31, u15:28, u25:50, risk:'low',    style:'Survival-first tactical setup',      note:'Usually bottom half — grinds out low-score results' },
  // ── SERIE A ─────────────────────────────────────────────────
  { name:'Torino',           league:'Serie A',        flag:'', gpg:1.95, u15:38, u25:62, risk:'low',    style:'Italian defensive pragmatism',       note:'Lowest goals-per-game in Italian top-half' },
  { name:'Lecce',            league:'Serie A',        flag:'', gpg:1.88, u15:40, u25:64, risk:'low',    style:'Defensive survival',                 note:'Serie A\'s most reliably low-scoring side' },
  { name:'Cagliari',         league:'Serie A',        flag:'', gpg:1.93, u15:38, u25:61, risk:'low',    style:'Compact block',                      note:'Bottom-half Italian side; under 2.5 hits >60%' },
  { name:'Juventus',         league:'Serie A',        flag:'', gpg:2.14, u15:32, u25:55, risk:'low',    style:'Organised shape, controlled tempo',  note:'Historical under 2.5 reliability regardless of era' },
  { name:'Lazio',            league:'Serie A',        flag:'', gpg:2.22, u15:30, u25:52, risk:'low',    style:'Structured defensive block',         note:'Away from home very strong under 2.5 record' },
  { name:'Udinese',          league:'Serie A',        flag:'', gpg:2.01, u15:36, u25:60, risk:'low',    style:'Low defensive line, physical',       note:'Typically one of Italy\'s quietest attacking sides' },
  { name:'Empoli',           league:'Serie A',        flag:'', gpg:2.07, u15:34, u25:57, risk:'low',    style:'Compact 4-3-1-2',                    note:'Consistent under 2.5 at home' },
  // ── LIGUE 1 ─────────────────────────────────────────────────
  { name:'Le Havre',         league:'Ligue 1',        flag:'', gpg:1.82, u15:43, u25:65, risk:'low',    style:'Direct, compact',                    note:'France\'s lowest-scoring side outside bottom 3' },
  { name:'Montpellier',      league:'Ligue 1',        flag:'', gpg:1.95, u15:38, u25:62, risk:'low',    style:'Mid-block counter',                  note:'Under 2.5 hits in majority of home games' },
  { name:'Stade Brestois',   league:'Ligue 1',        flag:'', gpg:2.11, u15:33, u25:55, risk:'low',    style:'Pragmatic pressing block',           note:'Often tight regardless of opponent quality' },
  { name:'Strasbourg',       league:'Ligue 1',        flag:'', gpg:2.05, u15:35, u25:57, risk:'low',    style:'Cautious away setup',                note:'Away fixtures especially low-scoring' },
  // ── AFRICAN & CAF ───────────────────────────────────────────
  { name:'South Africa',     league:'AFCON / PSL',    flag:'', gpg:1.60, u15:52, u25:73, risk:'low',    style:'Defensive national setup',           note:'Historically one of AFCON\'s lowest goal averages' },
  { name:'Bafana Bafana',    league:'AFCON / PSL',    flag:'', gpg:1.60, u15:52, u25:73, risk:'low',    style:'Low scoring across all competitions', note:'See South Africa entry' },
  { name:'Egypt',            league:'AFCON',          flag:'', gpg:1.55, u15:54, u25:75, risk:'low',    style:'Defensive/controlling style',        note:'CAF\'s most reliably low-scoring major nation' },
  { name:'Tunisia',          league:'AFCON',          flag:'', gpg:1.68, u15:49, u25:70, risk:'low',    style:'Disciplined 4-4-2 block',            note:'Under 1.5 hits nearly 50% of tournament games' },
  { name:'Morocco',          league:'AFCON',          flag:'', gpg:1.71, u15:48, u25:69, risk:'low',    style:'Regragui\'s disciplined defensive system', note:'Extremely low goals conceded; tight scoring matches' },
  { name:'Algeria',          league:'AFCON',          flag:'', gpg:1.79, u15:45, u25:67, risk:'low',    style:'Counter-attack with solid block',    note:'AFCON qualifiers regularly under 2.5' },
  { name:'Nigeria',          league:'AFCON',          flag:'', gpg:1.84, u15:43, u25:65, risk:'low',    style:'Counter-attacking national side',    note:'Super Eagles games typically stay under 2.5' },
  { name:'Senegal',          league:'AFCON',          flag:'', gpg:1.77, u15:46, u25:68, risk:'low',    style:'Disciplined defensive structure',    note:'AFCON champions with strong defensive record' },
  { name:'Cameroon',         league:'AFCON',          flag:'', gpg:1.92, u15:39, u25:62, risk:'low',    style:'Physical, direct',                   note:'Low-scoring tendency in major tournaments' },
  { name:'Orlando Pirates',  league:'PSL',            flag:'', gpg:1.65, u15:51, u25:72, risk:'low',    style:'Counter-attack',                     note:'PSL fixture — under 2.5 very high hit rate' },
  { name:'Kaizer Chiefs',    league:'PSL',            flag:'', gpg:1.72, u15:49, u25:70, risk:'low',    style:'Variable but low-tempo',             note:'PSL games rarely produce 3+ goals' },
  { name:'Mamelodi Sundowns',league:'PSL',            flag:'', gpg:1.58, u15:53, u25:74, risk:'low',    style:'Controlled, patient',                note:'Most CAF Champions League shutouts; very tight games' },
  { name:'Al Ahly',          league:'CAF CL',         flag:'', gpg:1.50, u15:56, u25:77, risk:'low',    style:'Defensive mastery in CAF',           note:'All-time CAF Champions League records; super tight' },
  { name:'Zamalek',          league:'CAF CL',         flag:'', gpg:1.63, u15:51, u25:72, risk:'low',    style:'Egyptian defensive tradition',       note:'Under 1.5 hits over 50% of CAF games' },
  { name:'Wydad',            league:'CAF CL',         flag:'', gpg:1.70, u15:48, u25:69, risk:'low',    style:'Counter and defend',                 note:'CAF games almost always low-scoring affairs' },
  { name:'Raja Casablanca',  league:'CAF CL',         flag:'', gpg:1.74, u15:47, u25:68, risk:'low',    style:'Defensive counter',                  note:'One of CAF\'s most defensively organised clubs' },
  { name:'Esperance',        league:'CAF CL',         flag:'', gpg:1.67, u15:50, u25:71, risk:'low',    style:'Structured Tunisian style',          note:'CAF competition specialist — games stay tight' },
  { name:'TP Mazembe',       league:'CAF CL',         flag:'', gpg:1.60, u15:52, u25:73, risk:'low',    style:'Physical African game',              note:'Congolese clubs produce very low-scoring games' },
  { name:'Simba SC',         league:'CAF CL',         flag:'', gpg:1.73, u15:48, u25:69, risk:'low',    style:'East African defensive style',       note:'CAF qualifier games almost always under 2.5' },
  // ── SCOTTISH ────────────────────────────────────────────────
  { name:'Livingston',       league:'Scottish Prem.', flag:'󠁧󠁢󠁳󠁣󠁴󠁿', gpg:1.98, u15:37, u25:60, risk:'low',    style:'Long ball, direct',                  note:'Among Scotland\'s lowest-scoring sides' },
  { name:'Ross County',      league:'Scottish Prem.', flag:'󠁧󠁢󠁳󠁣󠁴󠁿', gpg:2.04, u15:35, u25:58, risk:'low',    style:'Physical, compact',                  note:'Scottish Premiership bottom-half tight games' },
  // ── TURKISH ─────────────────────────────────────────────────
  { name:'Sivasspor',        league:'Süper Lig',      flag:'', gpg:2.02, u15:36, u25:59, risk:'low',    style:'Counter-attack focused',             note:'Consistently one of Turkey\'s lower-scoring sides' },
  { name:'Başakşehir',       league:'Süper Lig',      flag:'', gpg:2.09, u15:34, u25:56, risk:'low',    style:'Organised defensive press',          note:'Away games in particular produce low scores' },
  // ── EREDIVISIE ──────────────────────────────────────────────
  { name:'Go Ahead Eagles',  league:'Eredivisie',     flag:'', gpg:2.25, u15:30, u25:51, risk:'mid',    style:'Mid-block, reactive',                note:'Below Dutch average; can produce tight games' },
  // ── BELGIAN ─────────────────────────────────────────────────
  { name:'RWDM',             league:'Belgian Pro',    flag:'', gpg:2.00, u15:36, u25:60, risk:'low',    style:'Bottom-half survival',               note:'Belgian Pro League bottom half produces tight games' },
  { name:'Westerlo',         league:'Belgian Pro',    flag:'', gpg:2.08, u15:34, u25:57, risk:'low',    style:'Compact, defensive',                 note:'Under 2.5 reliable especially away from home' },
];

// ── League-level averages (goals per game) ────────────────────
const LS_LEAGUE_DB = [
  { name:'AFCON/CAF',         flag:'', gpg:1.78, u25:68, u15:47, note:'All CAF competitions — consistently the tightest football globally' },
  { name:'PSL South Africa',  flag:'', gpg:1.70, u25:71, u15:50, note:'Premier Soccer League: lowest avg goals of major African leagues' },
  { name:'CAF Champions Lg',  flag:'', gpg:1.62, u25:74, u15:54, note:'CAF CL games — knockout format = ultra-cautious play' },
  { name:'Serie A',           flag:'', gpg:2.51, u25:44, u15:21, note:'Lowest Big-5 European goals average; Italian defensive culture' },
  { name:'Ligue 1',           flag:'', gpg:2.61, u25:41, u15:19, note:'Strip PSG and the league avg drops near 2.4; many tight games' },
  { name:'La Liga',           flag:'', gpg:2.65, u25:40, u15:18, note:'Lower-half La Liga games very often under 2.5; Getafe effect' },
  { name:'Scottish Prem.',    flag:'󠁧󠁢󠁳󠁣󠁴󠁿', gpg:2.68, u25:39, u15:17, note:'Outside Celtic/Rangers games, fixtures tend to be low-scoring' },
  { name:'Turkish Süper Lig', flag:'', gpg:2.71, u25:38, u15:16, note:'Mid-table and lower Turkish games regularly under 2.5' },
  { name:'Belgian Pro League',flag:'', gpg:2.75, u25:37, u15:15, note:'Bottom half Belgian fixtures especially tight' },
  { name:'Premier League',    flag:'󠁧󠁢󠁥󠁮󠁧󠁿', gpg:2.81, u25:36, u15:14, note:'Lower-half EPL fixtures (Wolves, Forest) often under 2.5' },
  { name:'Bundesliga',        flag:'', gpg:3.20, u25:28, u15:10, note:'Highest-scoring Big-5 league; under 2.5 much harder to hit' },
  { name:'Eredivisie',        flag:'', gpg:3.15, u25:29, u15:11, note:'High-scoring Dutch style; under 2.5 only in bottom fixtures' },
];

// Simple lookup: is a team in the DB?
function lsTeamLookup(name) {
  const n = (name||'').toLowerCase();
  return LS_TEAM_DB.find(t => n.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(n));
}

const LS_TEAMS = [
  { name: 'South Africa', country: 'ZA' },
  { name: 'Bafana Bafana', country: 'ZA' },
  { name: 'Egypt', country: 'EG' },
  { name: 'Morocco', country: 'MA' },
  { name: 'Tunisia', country: 'TN' },
  { name: 'Algeria', country: 'DZ' },
  { name: 'Nigeria', country: 'NG' },
  { name: 'Senegal', country: 'SN' },
  { name: 'Cameroon', country: 'CM' },
  { name: 'Orlando Pirates', country: 'ZA' },
  { name: 'Kaizer Chiefs', country: 'ZA' },
  { name: 'Mamelodi Sundowns', country: 'ZA' },
  { name: 'Al Ahly', country: 'EG' },
  { name: 'Zamalek', country: 'EG' },
  { name: 'Wydad', country: 'MA' },
  { name: 'Raja Casablanca', country: 'MA' },
  { name: 'Esperance', country: 'TN' },
  { name: 'TP Mazembe', country: 'CD' },
  { name: 'Simba SC', country: 'TZ' },
  // Extended from DB
  ...LS_TEAM_DB.map(t=>({ name: t.name, country: '' }))
];

function lsScore(m) {
  const home = (m.home || m.homeTeam || '').toLowerCase();
  const away = (m.away || m.awayTeam || '').toLowerCase();
  const league = (m.league || '').toLowerCase();
  let score = 0, reasons = [];

  LS_TEAMS.forEach(t => {
    if (home.includes(t.name.toLowerCase()) || away.includes(t.name.toLowerCase())) {
      score += 30;
      reasons.push(`${t.name} — typically defensive low-scoring side`);
    }
  });
  if (/south africa|psl|premier soccer league|egypt|premier league egypt|caf|afcon|africa cup|chan|morocc|tunisia|nigeria|senegal|cameroon|algeri|zimbabwe|zambia|ghana|ivory coast|cote d/i.test(league)) {
    score += 20;
    reasons.push('African/CAF competition — avg 1.8–2.1 goals per game historically');
  }

  const o = odds(m);
  const d = Number(o.draw || 0);
  const hw = Number(o.homeWin || 0);
  const aw = Number(o.awayWin || 0);

  if (d > 2.8 && d < 4.5) { score += 10; reasons.push(`Draw odds ${d.toFixed(2)} — competitive & tight`); }
  if (hw > 1.8 && hw < 2.6 && aw > 1.8 && aw < 2.6) { score += 15; reasons.push('Evenly matched — low scoring expected'); }
  const c = conf(m), w = winner(m);
  if (/draw/i.test(w)) { score += 20; reasons.push(`AI pick: Draw (${c.toFixed(1)}% conf) — typically 0-0 or 1-1`); }
  if (hw && aw && Math.abs(hw - aw) < 0.4) { score += 10; reasons.push('Very tight 1v2 spread — close match, few goals'); }

  return { score, reasons };
}

function lsMarkets(m) {
  const o = odds(m);
  const c = conf(m);
  const w = winner(m);
  const isDraw = /draw/i.test(w);
  const hw = Number(o.homeWin || 0);
  const aw = Number(o.awayWin || 0);

  let u15 = 40, u25 = 55, bttsNo = 50;
  if (isDraw) { u15 += 20; u25 += 15; bttsNo += 15; }
  if (c > 65) u15 += 10;
  u15  = Math.min(u15  + c * 0.20, 88);
  u25  = Math.min(u25  + c * 0.15, 85);
  bttsNo = Math.min(bttsNo + c * 0.10, 80);

  const pick = isDraw ? 'Draw' : (hw < aw ? 'Home Win' : 'Away Win');
  const drawConf = isDraw ? c : Math.max(30, 60 - Math.abs(hw - aw) * 10);

  // Compute likely scoreline
  let likelyScore = '0 – 0';
  if (u15 < 60 && u25 > 60) likelyScore = '1 – 0';
  else if (drawConf > 65) likelyScore = '0 – 0';
  else if (u15 > 70) likelyScore = '0 – 0';
  else likelyScore = '1 – 0';

  // Best market for ticket: pick the highest-confidence market
  let bestMkt = 'Under 2.5', bestConf = u25, bestOdds = 1.55;
  if (u15 > bestConf) { bestMkt = 'Under 1.5'; bestConf = u15; bestOdds = 2.10; }
  if (bttsNo > bestConf) { bestMkt = 'BTTS: No'; bestConf = bttsNo; bestOdds = 1.72; }

  // Try to use real draw odds if draw is best pick
  if (isDraw && drawConf > bestConf) {
    const dOdds = Number(o.draw || 0);
    bestMkt = 'Draw'; bestConf = drawConf; bestOdds = dOdds > 1 ? dOdds : 3.00;
  }

  return { u15, u25, bttsNo, pick, drawConf, likelyScore, bestMkt, bestConf, bestOdds };
}

// ── Build the combined ticket ──────────────────────────────
function lsBuildTicket(scoredList) {
  if (!scoredList.length) {
    $('lsTicketWrap').innerHTML = '';
    return;
  }

  const legs = scoredList.map(({m, lsData}, idx) => {
    const mk = lsMarkets(m);
    return { m, lsData, mk, idx: idx + 1 };
  });

  const combinedOdds = legs.reduce((acc, l) => acc * l.mk.bestOdds, 1);
  const avgConf = legs.reduce((acc, l) => acc + l.mk.bestConf, 0) / legs.length;
  const topMkt = legs.reduce((best, l) => l.mk.bestConf > best.conf ? {name: l.mk.bestMkt, conf: l.mk.bestConf} : best, {name:'—', conf:0});

  // Update KPI cards
  $('lsU15Count').textContent = legs.length;
  $('lsU25Count').textContent = combinedOdds.toFixed(2);
  $('lsBTTSCount').textContent = avgConf.toFixed(0) + '%';
  $('lsDrawCount').textContent = topMkt.name;

  const legsHtml = legs.map(({m, mk, idx}) => {
    const home = esc(m.home || m.homeTeam || 'Home');
    const away = esc(m.away || m.awayTeam || 'Away');
    const league = esc(m.league || '');
    const ko = esc(kickoff(m).slice(11,16) || kickoff(m).slice(0,10) || '');
    return `
    <div class="lt-leg">
      <div class="lt-leg-num">${idx}</div>
      <div class="lt-leg-match">
        <div class="lt-leg-teams">${home} vs ${away}</div>
        <div class="lt-leg-meta">${league}${ko ? ' · ' + ko : ''} · <span style="color:var(--accent)">${mk.bestConf.toFixed(0)}% conf</span></div>
      </div>
      <div class="lt-leg-score">
        <div class="lt-score-lbl">Score</div>
        <div class="lt-score-val">${mk.likelyScore}</div>
      </div>
      <div class="lt-leg-odds">
        <div class="lt-odds-mkt">${mk.bestMkt}</div>
        <div class="lt-odds-val">${mk.bestOdds.toFixed(2)}</div>
      </div>
    </div>`;
  }).join('');

  // Slip text for copy
  const now = new Date().toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short'});
  const slipText = [
    ' LOW SCORING COMBO TICKET',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `Generated: ${now}`,
    '',
    ...legs.map((l,i) => {
      const home = l.m.home || l.m.homeTeam || 'Home';
      const away = l.m.away || l.m.awayTeam || 'Away';
      return `LEG ${i+1}: ${home} vs ${away}\n  Score: ${l.mk.likelyScore}  |  Bet: ${l.mk.bestMkt} @ ${l.mk.bestOdds.toFixed(2)}  |  Conf: ${l.mk.bestConf.toFixed(0)}%`;
    }),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `LEGS: ${legs.length}`,
    `COMBINED ODDS: ${combinedOdds.toFixed(2)}`,
    `AVG CONFIDENCE: ${avgConf.toFixed(0)}%`,
    '',


  ].join('\n');

  $('lsTicketWrap').innerHTML = `
  <div id="lsTicket">
    <div class="lt-head">
      <div class="lt-head-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
        Combined Low-Score Ticket
      </div>
      <span class="lt-head-badge" style="background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.4);color:var(--accent)">
        ${legs.length} LEG${legs.length!==1?'S':''} · ACCA
      </span>
    </div>

    <div class="lt-body">${legsHtml}</div>

    <div class="lt-footer">
      <div class="lt-footer-cell">
        <div class="lt-footer-label">Legs</div>
        <div class="lt-footer-value" style="color:var(--accent)">${legs.length}</div>
      </div>
      <div class="lt-footer-cell">
        <div class="lt-footer-label">Combined Odds</div>
        <div class="lt-footer-value" style="color:var(--yellow)">${combinedOdds.toFixed(2)}</div>
      </div>
      <div class="lt-footer-cell">
        <div class="lt-footer-label">Avg Confidence</div>
        <div class="lt-footer-value" style="color:var(--green)">${avgConf.toFixed(0)}%</div>
      </div>
    </div>

    <div class="lt-actions">
      <button class="lt-copy-btn" onclick="lsCopyTicket()">
         Copy Full Ticket
      </button>


      </button>
    </div>
  </div>`;

  // Store slip text globally for copy
  window._lsSlipText = slipText;
}

function lsCopyTicket() {
  const txt = window._lsSlipText || 'No ticket generated yet.';
  navigator.clipboard.writeText(txt)
    .then(() => { if(typeof bwToast==='function') bwToast(' Ticket copied!'); else alert('Copied!'); })
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = txt; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      if(typeof bwToast==='function') bwToast(' Ticket copied!');
    });
}

function lsRenderCard(m, lsData) {
  const { score, reasons } = lsData;
  const mk = lsMarkets(m);
  const home = esc(m.home || m.homeTeam || 'Home');
  const away = esc(m.away || m.awayTeam || 'Away');
  const league = esc(m.league || 'Unknown League');
  const ko = esc(kickoff(m).slice(0,16) || '');
  const hasO = hasOdds(m);
  const o = odds(m);

  return `<div class="ls-card" style="border-color:${score>=70?'#0891b2':score>=50?'#ffffff':'var(--line)'}">
    <div class="ls-header">
      <div>
        <div class="ls-teams">${home} <span style="color:var(--muted);font-weight:400">vs</span> ${away}</div>
        <div class="ls-league">${league}${ko ? ' · ' + ko : ''}</div>
      </div>
      <div style="text-align:right">
        <span class="badge ${score>=70?'ok':score>=50?'warn':'noodds'}" style="font-size:11px;padding:4px 10px">
          Score: <b>${score}</b>/100
        </span>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">
          Predicted: <b style="color:var(--yellow)">${mk.likelyScore}</b>
          &nbsp;·&nbsp; Ticket bet: <b style="color:var(--accent)">${mk.bestMkt} @ ${mk.bestOdds.toFixed(2)}</b>
        </div>
      </div>
    </div>

    <div class="ls-markets">
      <div class="ls-market" style="background:rgba(8,145,178,.09);border:1px solid #0891b2">
        <div class="ls-market-label">Under 1.5 Goals</div>
        <div class="ls-market-value" style="color:var(--accent)">${mk.u15.toFixed(0)}%</div>
        <div class="ls-conf-bar"><i style="width:${mk.u15}%;background:var(--accent)"></i></div>
      </div>
      <div class="ls-market" style="background:rgba(250,204,21,.07);border:1px solid #ffffff">
        <div class="ls-market-label">Under 2.5 Goals</div>
        <div class="ls-market-value" style="color:var(--yellow)">${mk.u25.toFixed(0)}%</div>
        <div class="ls-conf-bar"><i style="width:${mk.u25}%;background:var(--yellow)"></i></div>
      </div>
      <div class="ls-market" style="background:rgba(52,211,153,.07);border:1px solid #ffffff">
        <div class="ls-market-label">BTTS: No</div>
        <div class="ls-market-value" style="color:var(--green)">${mk.bttsNo.toFixed(0)}%</div>
        <div class="ls-conf-bar"><i style="width:${mk.bttsNo}%;background:var(--green)"></i></div>
      </div>
    </div>

    ${hasO ? `<div style="display:flex;gap:7px;margin-top:9px">
      ${['homeWin','draw','awayWin'].map((k,i)=>`<div class="odd" style="flex:1;text-align:center"><small style="display:block;color:var(--muted);font-size:9px">${['1','X','2'][i]}</small>${Number(o[k]).toFixed(2)}</div>`).join('')}
    </div>` : '<div style="color:var(--muted);font-size:11px;margin-top:8px">No bookmaker odds — estimated market odds used</div>'}

    <div style="font-size:11px;color:var(--muted);margin-top:9px;padding:8px 10px;background:rgba(255,255,255,.03);border-left:2px solid var(--accent);border-radius:4px">
      <b style="color:var(--accent);font-size:10px;text-transform:uppercase;letter-spacing:.06em">Why low-scoring?</b><br>
      ${reasons.length ? reasons.map(r=>`· ${r}`).join('<br>') : '· Tight odds spread; defensive formation expected'}
    </div>
  </div>`;
}

function lsRefresh() {
  const all = [...(S.fixtures||[]), ...(S.predictions||[])].filter((m,i,arr)=>
    arr.findIndex(x=>kickoff(x)===kickoff(m)&&(x.home||x.homeTeam)===(m.home||m.homeTeam))===i
  );

  let scored = all.map(m=>({m, lsData:lsScore(m)}))
    .filter(x=>x.lsData.score>=30)
    .sort((a,b)=>b.lsData.score-a.lsData.score);

  if (scored.length === 0) scored = lsFallbackFixtures();

  lsBuildTicket(scored);

  $('lsPredList').innerHTML = scored.length
    ? scored.map(({m,lsData})=>lsRenderCard(m,lsData)).join('')
    : '<div class="empty">No qualifying low-scoring fixtures found. Connect your server for live data.</div>';
}

function lsFallbackFixtures() {
  const demo = [
    { home:'South Africa', away:'Egypt', league:'AFCON Qualifier', datetime:'2026-08-24T15:00',
      prediction:{bestPick:'Draw',confidence:0.68}, odds:{homeWin:2.90,draw:3.10,awayWin:2.45} },
    { home:'Morocco', away:'Tunisia', league:'AFCON Qualifier', datetime:'2026-08-24T17:00',
      prediction:{bestPick:'Home Win',confidence:0.62}, odds:{homeWin:1.95,draw:3.20,awayWin:3.90} },
    { home:'Algeria', away:'Nigeria', league:'AFCON Qualifier', datetime:'2026-08-24T19:00',
      prediction:{bestPick:'Draw',confidence:0.55}, odds:{homeWin:2.60,draw:3.00,awayWin:2.80} },
    { home:'Mamelodi Sundowns', away:'Al Ahly', league:'CAF Champions League', datetime:'2026-08-24T16:00',
      prediction:{bestPick:'Home Win',confidence:0.58}, odds:{homeWin:2.10,draw:3.30,awayWin:3.50} },
    { home:'Zamalek', away:'Wydad', league:'CAF Champions League', datetime:'2026-08-24T18:00',
      prediction:{bestPick:'Draw',confidence:0.70}, odds:{homeWin:2.75,draw:3.05,awayWin:2.65} },
  ];
  return demo.map(m=>({m, lsData:lsScore(m)})).sort((a,b)=>b.lsData.score-a.lsData.score);
}

// ── Sub-tab switcher ──────────────────────────────────────────
window.lsSubTabSwitch = function(tab, btn) {
  ['live','teams','leagues','guide'].forEach(t => {
    const p = document.getElementById('lsPanel-'+t);
    const b = document.getElementById('lsSubTab-'+t);
    if (p) p.classList.toggle('hidden', t !== tab);
    if (b) b.classList.toggle('active', t === tab);
  });
  if (tab === 'teams')   lsRenderTeamDB();
  if (tab === 'leagues') lsRenderLeagueDB();
  if (tab === 'guide')   lsRenderGuide();
};

// ── Team Database renderer ────────────────────────────────────
window.lsRenderTeamDB = function() {
  const league = document.getElementById('lsTeamLeagueFilter')?.value || 'ALL';
  const sort   = document.getElementById('lsTeamSort')?.value || 'gpg';
  let data = [...LS_TEAM_DB];
  if (league !== 'ALL') data = data.filter(t => t.league.includes(league) || league.includes(t.league));
  if (sort === 'gpg') data.sort((a,b) => a.gpg - b.gpg);
  else if (sort === 'u25') data.sort((a,b) => b.u25 - a.u25);
  else data.sort((a,b) => b.u15 - a.u15);

  document.getElementById('lsTeamDBStatus').textContent = `${data.length} team(s) · sorted by ${sort==='gpg'?'goals per game ↑':sort==='u25'?'Under 2.5% ↓':'Under 1.5% ↓'}`;

  const gpgColor = g => g < 1.8 ? 'var(--green)' : g < 2.1 ? 'var(--accent)' : g < 2.4 ? 'var(--yellow)' : 'var(--red)';
  const rows = data.map(t => {
    const gc = gpgColor(t.gpg);
    const bw25 = Math.min(100, t.u25).toFixed(0);
    const bw15 = Math.min(100, t.u15).toFixed(0);
    return `<tr>
      <td><span style="font-size:14px">${t.flag}</span></td>
      <td><b>${t.name}</b><br><span style="font-size:10px;color:var(--muted)">${t.league}</span></td>
      <td>
        <span style="font-weight:800;font-size:15px;color:${gc}">${t.gpg.toFixed(2)}</span>
        <div style="font-size:10px;color:var(--muted)">goals/game</div>
      </td>
      <td>
        <span style="font-weight:700;color:${t.u25>=60?'var(--green)':t.u25>=45?'var(--yellow)':'var(--red)'}">${t.u25}%</span>
        <div style="height:4px;background:var(--line);border-radius:10px;width:70px;margin-top:4px;overflow:hidden"><i style="display:block;height:100%;width:${bw25}%;background:${t.u25>=60?'var(--green)':t.u25>=45?'var(--yellow)':'var(--red)'};border-radius:10px"></i></div>
      </td>
      <td>
        <span style="font-weight:700;color:${t.u15>=45?'var(--green)':t.u15>=32?'var(--yellow)':'var(--red)'}">${t.u15}%</span>
        <div style="height:4px;background:var(--line);border-radius:10px;width:70px;margin-top:4px;overflow:hidden"><i style="display:block;height:100%;width:${bw15}%;background:${t.u15>=45?'var(--green)':t.u15>=32?'var(--yellow)':'var(--red)'};border-radius:10px"></i></div>
      </td>
      <td style="font-size:11px;color:var(--muted)">${t.style}</td>
      <td style="font-size:11px;color:var(--muted);max-width:180px">${t.note}</td>
    </tr>`;
  }).join('');

  document.getElementById('lsTeamDBWrap').innerHTML = `
    <table class="table" style="min-width:820px">
      <thead><tr>
        <th></th><th>Team</th><th>Goals/Game</th><th>Under 2.5%</th><th>Under 1.5%</th><th>Style</th><th>Context</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">No teams match the filter</td></tr>'}</tbody>
    </table>`;
};

// ── Quick match checker ───────────────────────────────────────
window.lsRunChecker = function() {
  const h = document.getElementById('lsCheckHome')?.value.trim() || '';
  const a = document.getElementById('lsCheckAway')?.value.trim() || '';
  const el = document.getElementById('lsCheckerResult');
  if (!h || !a) { el.innerHTML = '<span style="color:var(--muted)">Enter both team names to check.</span>'; return; }

  const th = lsTeamLookup(h);
  const ta = lsTeamLookup(a);

  const gpgColor = g => !g ? 'var(--muted)' : g < 1.8 ? 'var(--green)' : g < 2.1 ? 'var(--accent)' : g < 2.4 ? 'var(--yellow)' : 'var(--red)';

  const teamCard = (label, t, name) => `
    <div style="flex:1;min-width:200px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:10px;padding:12px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.07em">${label}</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:4px">${name}</div>
      ${t ? `
        <div style="font-size:22px;font-weight:800;color:${gpgColor(t.gpg)}">${t.gpg.toFixed(2)} <span style="font-size:12px;font-weight:400">goals/game</span></div>
        <div style="display:flex;gap:10px;margin-top:8px;font-size:12px">
          <span>U2.5: <b style="color:${t.u25>=60?'var(--green)':t.u25>=45?'var(--yellow)':'var(--red)'}">${t.u25}%</b></span>
          <span>U1.5: <b style="color:${t.u15>=45?'var(--green)':t.u15>=32?'var(--yellow)':'var(--red)'}">${t.u15}%</b></span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">${t.note}</div>
      ` : `<div style="color:var(--muted);font-size:12px;margin-top:6px">Not found in database — neutral assumption</div>`}
    </div>`;

  // Combined estimate
  const bothGpg  = th && ta ? ((th.gpg + ta.gpg) / 2) : null;
  const bothU25  = th && ta ? Math.round((th.u25 + ta.u25) / 2) : null;
  const bothU15  = th && ta ? Math.round((th.u15 + ta.u15) / 2) : null;

  const combinedHtml = bothGpg !== null ? `
    <div style="background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.3);border-radius:10px;padding:14px;margin-top:12px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.07em">Combined Matchup Estimate</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div><div style="font-size:11px;color:var(--muted)">Expected Goals Total</div><div style="font-size:22px;font-weight:800;color:${gpgColor(bothGpg)}">${bothGpg.toFixed(2)}</div></div>
        <div><div style="font-size:11px;color:var(--muted)">Under 2.5 Probability</div><div style="font-size:22px;font-weight:800;color:${bothU25>=60?'var(--green)':bothU25>=45?'var(--yellow)':'var(--red)'}">${bothU25}%</div></div>
        <div><div style="font-size:11px;color:var(--muted)">Under 1.5 Probability</div><div style="font-size:22px;font-weight:800;color:${bothU15>=45?'var(--green)':bothU15>=32?'var(--yellow)':'var(--red)'}">${bothU15}%</div></div>
        <div><div style="font-size:11px;color:var(--muted)">Verdict</div>
          <div style="font-size:14px;font-weight:800;margin-top:4px;color:${bothU25>=60?'var(--green)':bothU25>=45?'var(--yellow)':'var(--red)'}">
            ${bothU25>=60?' Strong Under 2.5 lean':bothU25>=45?' Moderate Under 2.5 lean':bothU25>=35?' Neutral — check odds':' Avoid Under 2.5'}
          </div>
        </div>
      </div>
    </div>` : '';

  el.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap">${teamCard('Home',th,h)}${teamCard('Away',ta,a)}</div>${combinedHtml}`;
};

// ── League averages renderer ──────────────────────────────────
window.lsRenderLeagueDB = function() {
  const gpgColor = g => g < 2.0 ? 'var(--green)' : g < 2.6 ? 'var(--accent)' : g < 2.9 ? 'var(--yellow)' : 'var(--red)';
  const rows = LS_LEAGUE_DB.map(l => {
    const gc = gpgColor(l.gpg);
    return `<tr>
      <td><span style="font-size:15px">${l.flag}</span></td>
      <td><b>${l.name}</b></td>
      <td><span style="font-weight:800;font-size:15px;color:${gc}">${l.gpg.toFixed(2)}</span>
          <div style="height:4px;background:var(--line);border-radius:10px;width:120px;margin-top:4px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100,(l.gpg/4)*100).toFixed(0)}%;background:${gc};border-radius:10px"></i></div></td>
      <td><span style="font-weight:700;color:${l.u25>=60?'var(--green)':l.u25>=40?'var(--yellow)':'var(--red)'}">${l.u25}%</span></td>
      <td><span style="font-weight:700;color:${l.u15>=45?'var(--green)':l.u15>=30?'var(--yellow)':'var(--red)'}">${l.u15}%</span></td>
      <td style="font-size:12px;color:var(--muted);max-width:260px">${l.note}</td>
    </tr>`;
  }).join('');

  document.getElementById('lsLeagueDBWrap').innerHTML = `
    <table class="table" style="min-width:680px">
      <thead><tr><th></th><th>League</th><th>Goals/Game</th><th>U2.5 Hit Rate</th><th>U1.5 Hit Rate</th><th>Context</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  document.getElementById('lsLeagueInsights').innerHTML = `
    <div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px">
      <div style="font-size:22px;font-weight:800;color:var(--green)">1.62</div>
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin:4px 0 6px;text-transform:uppercase;letter-spacing:.06em">CAF CL — tightest football</div>
      <p style="font-size:12px;margin:0;line-height:1.5">CAF Champions League games average just 1.62 goals — lower than any major European league. Under 1.5 hits over 54% of all CAF CL fixtures.</p>
    </div>
    <div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px">
      <div style="font-size:22px;font-weight:800;color:var(--accent)">Serie A</div>
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin:4px 0 6px;text-transform:uppercase;letter-spacing:.06em">Lowest Big-5 goals/game</div>
      <p style="font-size:12px;margin:0;line-height:1.5">At 2.51 goals/game, Serie A is the tightest major European league. Matches involving Torino, Lecce, Cagliari, or Juventus away are among the most reliable Under 2.5 bets in Europe.</p>
    </div>
    <div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px">
      <div style="font-size:22px;font-weight:800;color:var(--yellow)">PSL SA</div>
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin:4px 0 6px;text-transform:uppercase;letter-spacing:.06em">1.70 goals/game avg</div>
      <p style="font-size:12px;margin:0;line-height:1.5">South African Premier Soccer League is globally one of the lowest-scoring professional leagues. Under 2.5 hits in over 71% of PSL fixtures — among the most reliable Under markets worldwide.</p>
    </div>`;
};

// ── Betting guide ─────────────────────────────────────────────
window.lsRenderGuide = function() {
  const ic = (big, col, title, body) => `
    <div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px">
      <div style="font-size:22px;font-weight:800;color:${col};margin-bottom:4px">${big}</div>
      <h3 style="font-size:12px;font-weight:700;color:var(--muted);margin:0 0 6px;text-transform:uppercase;letter-spacing:.06em">${title}</h3>
      <p style="font-size:12px;margin:0;line-height:1.5">${body}</p>
    </div>`;
  document.getElementById('lsGuideGrid').innerHTML = [
    ic('Rule 1','var(--accent)','Check Both Teams First','The most reliable under 2.5 bets come when BOTH teams are individually known low-scorers. One attacking team can blow the total even if the other is defensive.'),
    ic('Rule 2','var(--green)','League Context is Everything','A team averaging 2.1 goals/game in Bundesliga (avg 3.2) is actually defensive. The same average in Serie A (avg 2.5) is normal. Always compare to the league baseline.'),
    ic('Rule 3','var(--yellow)','African Football — Default Under','Any AFCON qualifier, PSL, or CAF Champions League game should be treated as an Under 2.5 lean by default. These are statistically the tightest football environments globally.'),
    ic('Under 1.5','var(--purple)','When to back Under 1.5','Back Under 1.5 only when: (1) both teams have U1.5 rate above 40%, (2) it\'s an African/CAF match, or (3) it\'s a must-not-lose game (second leg, relegation playoff). At odds below 2.0 it\'s often value.'),
    ic('BTTS: No','var(--orange)','BTTS No vs Under 2.5','BTTS: No and Under 2.5 often overlap but are not the same. A 2-0 is Under 2.5 but not BTTS: No. Use BTTS: No when one team has a strong defensive record and the other has a weak attack — not just when the game might be low-scoring.'),
    ic('Draw','var(--red)','Draws in Low-Scoring Contexts','African international football produces draws in ~35% of games — far above the global average of 25%. When backing low-scoring in AFCON or PSL, consider combining Under 2.5 with a Draw or 1X (Home/Draw) for enhanced value.'),
    ic('Avoid','var(--red)','When NOT to back Under 2.5','Avoid Under 2.5 when: (1) either team is in a high-press, wide-play style; (2) it\'s Bundesliga and neither team is Union Berlin or Heidenheim; (3) a team NEEDS to score (losing first leg, relegated); (4) odds are below 1.40 — the value has gone.'),
    ic('Home/Away','var(--accent)','Home vs Away Matters','Nearly every defensive team is MORE defensive away from home. Torino away, Atlético away, Wolves away — these are elite Under 2.5 plays. Home games can see a team push higher and open the game.'),
    ic('Stacking','var(--green)','Building the Accumulator','The database suggests building accas using 3-5 legs of: (1) CAF/PSL games, (2) Serie A bottom-half, (3) Ligue 1 non-PSG games. Avoid mixing with Bundesliga or Eredivisie fixtures which inflate goals totals.'),
  ].join('');
};

// ── Also enhance the lsScore function to use the full DB ──────
const _origLsScore = lsScore;
// (lsScore already runs before this block and will pick up LS_TEAMS which now includes LS_TEAM_DB entries)

const _origShowTab = window.showTab || function(){};
window.showTab = function(id, btn) {
  _origShowTab(id, btn);
  if (id === 'lowscoring') lsRefresh();
};

const _origRefreshAll2 = window.refreshAll;
if (typeof _origRefreshAll2 === 'function') {
  window.refreshAll = async function(...args) {
    await _origRefreshAll2(...args);
    if (!document.getElementById('lowscoring').classList.contains('hidden')) lsRefresh();
  };
}


const S={
  fixtures:[],live:[],predictions:[],live75:[],learning:null,diag:null,qualification:null,oddsMeta:null,
  auto:false,timer:null,sort:'confidence',
  // Local FastAPI server (localhost / 127.0.0.1 / file:// / LAN IP) → direct to port 8000.
  // Render production → same-origin FastAPI routes.
  // Override anytime via localStorage key 'ksApiBase' or window.KASISCORE_API_BASE.
  server:(function(){
    var stored=(localStorage.getItem('ksApiBase')||'').trim().replace(/\/+$/,'');
    if(stored) return stored;
    var h=window.location.hostname, proto=window.location.protocol;
    // Local development always targets FastAPI on :8000.
    if(proto==='file:'||h==='localhost'||h==='127.0.0.1') return 'http://127.0.0.1:8000';
    if(/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return proto+'//'+h+':8000';
    // Render serves the UI and API from the same origin. No Netlify /api proxy.
    return '';
  })()
};
const $=id=>document.getElementById(id);

const COMPETITIONS_CACHE=[];
async function loadCompetitionRegistry(){
  try{
    const d=await get('/competitions');
    COMPETITIONS_CACHE.length=0; (d.competitions||[]).forEach(x=>COMPETITIONS_CACHE.push(x));
    renderCompetitionRegistry();
    const c=document.getElementById('competitionCount'); if(c)c.textContent=`${COMPETITIONS_CACHE.length} competitions`;
  }catch(e){
    const el=document.getElementById('competitionRegistry'); if(el)el.innerHTML=`<div class="empty">Competition registry unavailable: ${esc(e.message)}</div>`;
  }
}
function renderCompetitionRegistry(){
  const sport=document.getElementById('competitionSportFilter')?.value||'';
  const q=(document.getElementById('competitionSearch')?.value||'').toLowerCase().trim();
  let rows=COMPETITIONS_CACHE.filter(x=>(!sport||x.sport===sport)&&(!q||`${x.name} ${x.country} ${x.continent}`.toLowerCase().includes(q)));
  rows.sort((a,b)=>Number(b.featured||false)-Number(a.featured||false)||String(a.sport).localeCompare(String(b.sport))||Number(a.priority)-Number(b.priority));
  const el=document.getElementById('competitionRegistry'); if(!el)return;
  el.innerHTML=rows.map(x=>`<div class="sport-tile ${x.featured?'featured':''}" onclick="selectLeagueAndOpen(${JSON.stringify(x.name)})"><div class="sport-icon">${x.sport==='rugby'?'':''}</div><b>${esc(x.name)}</b><span>${esc(x.country)} · ${esc(x.continent)}</span><em>${x.featured?'FEATURED · ':''}${x.live?'Live':''}${x.predictions?' · AI':''}${x.odds?' · Odds':''}</em></div>`).join('')||'<div class="empty">No competitions match the filter.</div>';
}
function selectLeagueAndOpen(name){
  const sel=document.getElementById('league'); if(sel){let opt=[...sel.options].find(o=>o.textContent.trim()===name); if(!opt){opt=document.createElement('option');opt.textContent=name;opt.value=name;sel.appendChild(opt)} sel.value=name;}
  const btn=document.querySelector('[data-primary="fixtures"]'); showTab('fixtures',btn); if(typeof refreshAll==='function')refreshAll(true);
}
function openCompetitionGroup(country){
  const f=document.getElementById('competitionSearch'); if(f){f.value=country==='South Africa'?'South Africa':country==='International'?'International':'';}
  const sf=document.getElementById('competitionSportFilter'); if(sf)sf.value='';
  renderCompetitionRegistry();
}

// ── Color mode ──────────────────────────────────────────────────────────────
function setColorMode(mode){
  // Dark Blue is the only supported colour mode.
  const root=document.documentElement; root.setAttribute('data-theme','black');
  try{ localStorage.setItem('fai_color_mode','black'); }catch(e){}
}
setColorMode('black');

function log(x){$('log').textContent+=`[${new Date().toLocaleTimeString()}] ${x}\n`; $('log').scrollTop=$('log').scrollHeight}
function base(){
  // Always return a valid absolute origin so fetch() and new URL() never receive
  // an empty string. On public HTTP/HTTPS hosts the API is same-origin (FastAPI
  // serves both the HTML and the API), so window.location.origin is correct.
  const proto=window.location.protocol;
  const h=window.location.hostname;
  const isLocal = proto==='file:' || h==='localhost' || h==='127.0.0.1' || /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);

  // 1. Explicit runtime override always wins
  const win=(window.KASISCORE_API_BASE||'').trim().replace(/\/+$/,'');
  if(win) return win;

  // 2. On localhost/LAN, try stored override then default local port
  if(isLocal){
    const stored=(localStorage.getItem('ksApiBase')||'').trim().replace(/\/+$/,'');
    if(stored) return stored;
    const svr=String(S&&S.server||'').replace(/\/+$/,'');
    if(svr) return svr;
    return proto==='file:' ? 'http://127.0.0.1:8000' : (proto+'//'+h+':8000');
  }

  // 3. Public host — API is same-origin (FastAPI serves everything)
  return window.location.origin;
}
// Allow runtime override from the browser console: setApiBase('http://192.168.1.5:8000')
window.setApiBase=function(url){
  if(!url){localStorage.removeItem('ksApiBase');S.server=(function(){var h=window.location.hostname;if(window.location.protocol==='file:'||h==='localhost'||h==='127.0.0.1')return 'http://127.0.0.1:8000';if(/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h))return window.location.protocol+'//'+h+':8000';return '';})(); }
  else{localStorage.setItem('ksApiBase',url.trim().replace(/\/+$/,''));S.server=url.trim().replace(/\/+$/,'');}
  console.info('[KasiScore] API base set to:',base());
};
async function get(path,params={}){
  const b=base()+path;
  const u=new URL(b.startsWith('http')?b:window.location.origin+b); Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,v)});
  const r=await fetch(u,{cache:'no-store'}); const text=await r.text();
  let d={}; try{d=text?JSON.parse(text):{}}catch{d={};}
  if(!r.ok){
    console.warn('KasiScore request failed', {status:r.status, path:u.pathname, response:text.slice(0,500)});
    throw new Error(`Service request failed (${r.status}). Please try again.`);
  }
  return d;
}
// ── Admin & subscriber gate ─────────────────────────────────
const IS_ADMIN      = localStorage.getItem('faiAdmin') === 'true';
const IS_SUBSCRIBER = true; // v347: prediction and match-intelligence features are public

(function applyAdminGate(){
  // Admin tabs are always visible on the dashboard under the "Admin Only" divider
  // Non-admins see the tabs but are blocked from accessing content (gate applied in showTab)
  document.querySelectorAll('[data-admin="true"]').forEach(btn => {
    btn.style.display = ''; // Always show admin tab buttons
  });
  // Show server URL input only to admins
  const srv = document.getElementById('serverUrl');
  if (srv) srv.style.display = IS_ADMIN ? '' : 'none';
})();

function showTab(id,btn){
  if(id==='intelligence_hub' && window._serverAdmin!==true) return;
  // Block non-admins from admin tabs
  const adminTabs = ['diagnostics','learning','lottery','monetise'];
  if(id==='pastresults') { /* allowed for all */ }
  if (adminTabs.includes(id) && !IS_ADMIN) return;
  // Fix #16: suppress smooth scroll before any position reset so tab switches are instant
  document.documentElement.classList.add('no-smooth-scroll');
  document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));
  const tabEl = $(id);
  if (!tabEl) { document.documentElement.classList.remove('no-smooth-scroll'); return; }
  tabEl.classList.remove('hidden');
  window.scrollTo(0, 0);
  // Restore smooth scroll in next frame after the synchronous scroll has settled
  requestAnimationFrame(()=>document.documentElement.classList.remove('no-smooth-scroll'));
  // Fix #9: show a tab-level loading shimmer while async data fetches
  const TAB_SHIMMER_IDS = {fixtures:'fixtureList',live:'liveMatchGrid',predictions:'predictionList'};
  const shimmerTarget = TAB_SHIMMER_IDS[id] ? document.getElementById(TAB_SHIMMER_IDS[id]) : null;
  if (shimmerTarget && !shimmerTarget.children.length) {
    shimmerTarget.innerHTML = '<div class="totd-skeleton" style="padding:16px"><div class="sk-line sk-wide"></div><div class="sk-line sk-mid"></div><div class="sk-line sk-narrow"></div><div class="sk-line sk-wide" style="margin-top:18px"></div><div class="sk-line sk-mid"></div></div>';
  }
  const liveWidget = document.getElementById('liveScoresWidget');
  if (liveWidget) liveWidget.style.display = (id === 'overview' || id === 'live') ? '' : 'none';
  document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));
  btn?.classList.add('active');
  if(id==='playerstats') psLoad();
  if(id==='matchstats' && window.MATCH_STATS_FIXTURE_ID) (window.MATCH_STATS_SPORT && window.MATCH_STATS_SPORT!=='football' ? loadUnifiedMatchPage(window.MATCH_STATS_SPORT,window.MATCH_STATS_FIXTURE_ID,window.MATCH_STATS_LEAGUE||'') : loadMatchStatsPage(Number(window.MATCH_STATS_FIXTURE_ID)));
  if(id==='learning') loadRecentResults();
  if(id==='competitions' && !COMPETITIONS_CACHE.length) loadCompetitionRegistry();
}

// ── Subscriber paywall helper ───────────────────────────────
function requireSubscriber(featureName, callback) { callback(); } // v347: public prediction access
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function pct(v){let n=Number(v||0);if(n<=1)n*=100;return Math.max(0,Math.min(100,n))}
function conf(m){return pct(m?.prediction?.confidence??m?.confidence??0)}
function winner(m){return m?.prediction?.bestPick||m?.prediction?.winner||m?.bestOutcome||'—'}
function odds(m){return m?.odds||m?.liveBookmakerOdds||{}}
function hasOdds(m){let o=odds(m);return Number(o.homeWin)>0&&Number(o.draw)>0&&Number(o.awayWin)>0}
function minute(m){return Number(m?.liveStatus?.elapsed??m?.prediction?.fixtureMinute??m?.minute??m?.fixture?.status?.elapsed??0)}
function kickoff(m){return m.datetime||m.kickoff||m.date||''}
function kcTeamLogo(m,side){return side==='home'?(m.homeLogo||m.homeTeamLogo||m.fixture?.teams?.home?.logo||''):(m.awayLogo||m.awayTeamLogo||m.fixture?.teams?.away?.logo||'')}
function kcLeagueMark(m){const src=m.leagueFlag||m.flag||m.leagueLogo||m.fixture?.league?.flag||m.fixture?.league?.logo||'';return src?`<img src="${esc(src)}" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:5px" onerror="this.style.display='none'" loading="lazy" decoding="async" fetchpriority="low">`:''}

function jsEsc(s){ return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function row(m,live=false){
  const o=odds(m), c=conf(m), ok=hasOdds(m), min=minute(m);
  const hName=m.home||m.homeTeam||'Home', aName=m.away||m.awayTeam||'Away';
  const insightsClick = live?'':` onclick="openFixtureInsightsById(${kcFixtureId(m)})"`;
  return `<div class="fixture ${live?'livebox':''}"${insightsClick}${live?'':' style="cursor:pointer"'}>
    <div>${live?`<span class="minute">${min?min+"'":'LIVE'}</span>`:esc(kickoff(m).slice(11,16)||kickoff(m))}<br><span class="sub">${kcLeagueMark(m)}${esc(m.league||'Worldwide')}</span></div>
    <div class="teams"><strong>${teamCell(kcTeamLogo(m,'home'),hName,'xs',m.homeId||m.homeTeamId||m.fixture?.teams?.home?.id||0)} ${live&&m.score?`<span class="live-score">${esc(m.score)}</span>`:'vs'} ${teamCell(kcTeamLogo(m,'away'),aName,'xs',m.awayId||m.awayTeamId||m.fixture?.teams?.away?.id||0)}</strong><span>${esc(m.venue||'')}</span></div>
    <div class="odds">${['homeWin','draw','awayWin'].map((k,i)=>`<div class="odd"><small>${['1','X','2'][i]}</small>${Number(o[k]||0)?Number(o[k]).toFixed(2):'—'}</div>`).join('')}</div>
    <div><span class="badge ${ok?'ok':'noodds'}">${ok?'Bookmaker odds':'Waiting for odds'}</span>${m.oddsUpdated?'<span class="badge warn" style="margin-left:5px">Odds updated</span>':''}<div class="bar"><i style="width:${c}%"></i></div><small>${c.toFixed(1)}% · ${esc(winner(m))}</small></div>
    <div style="display:flex;gap:6px;align-items:center;justify-content:flex-end">
      <span class="badge ${live?'live':'ok'}">${live?'LIVE':'PREDICTED'}</span>
      <button class="match-stats-btn" onclick="event.stopPropagation();openLiveMatchPage(${kcFixtureId(m)},'football',${JSON.stringify(m.league||'')})">Stats</button>
    </div>
  </div>`
}
function renderFixtures(){
  const q=S.qualification||{};
  const all=S.fixtures||[];
  const now=Date.now();
  const twoDaysMs=2*24*60*60*1000;

  // Split: active (not finished) vs finished
  const finished=all.filter(m=>m.isFinished||(m.status||'').toUpperCase()==='FT');
  // Active = not finished, and kickoff within next 2 days (or already started/live)
  const active=all.filter(m=>{
    if(m.isFinished||(m.status||'').toUpperCase()==='FT') return false;
    const ko=kickoff(m);
    if(!ko) return true;
    const koMs=new Date(ko).getTime();
    return koMs<=now+twoDaysMs; // show up to 2 days ahead
  });

  const withOdds=active.filter(hasOdds);
  const withoutOdds=active.filter(m=>!hasOdds(m));
  const head=`<div class="sub" style="padding:8px 0">
    ${active.length} upcoming fixture(s) (next 48 hrs) ·
    Valid bookmaker 1X2: <b style="color:var(--green)">${withOdds.length}</b> ·
    Waiting for odds: <b>${withoutOdds.length}</b> ·
    Qualified: <b>${q.qualified??S.predictions.length??withOdds.length}</b>
  </div>`;
  const fixtureEl=$('fixtureList');
  if(fixtureEl){
    fixtureEl.innerHTML=active.length
      ? head+active.map(m=>row(m)).join('')
      : '<div class="empty">No upcoming fixtures in the next 48 hours.</div>';
  }
  const noEl=$('noOddsFixtureList'), noCount=$('noOddsCount');
  if(noEl) noEl.innerHTML=withoutOdds.length
    ? withoutOdds.map(m=>{
        const min=minute(m);
        return `<div class="fixture" onclick="openFixtureInsightsById(${kcFixtureId(m)})" style="cursor:pointer">
          <div>${min?`<span class="minute">${min}'</span>`:esc(kickoff(m).slice(11,16)||kickoff(m))}<br><span class="sub">${kcLeagueMark(m)}${esc(m.league||'Worldwide')}</span></div>
          <div class="teams"><strong>${teamCell(kcTeamLogo(m,'home'),m.home||m.homeTeam||'Home','xs',m.homeId||m.homeTeamId||0)} vs ${teamCell(kcTeamLogo(m,'away'),m.away||m.awayTeam||'Away','xs',m.awayId||m.awayTeamId||0)}</strong><span>${esc(m.venue||'')}</span></div>
          <div><span class="badge noodds">No odds available</span></div><div>—</div><div>—</div>
        </div>`;
      }).join('')
    : '<div class="empty">No fixtures without odds — all returned games have bookmaker data.</div>';
  if(noCount) noCount.textContent=withoutOdds.length+' matches';
  const badge=$('fixtureSourceBadge');
  if(badge) badge.textContent=`${active.length} upcoming · ${finished.length} finished`;

  // Sync finished games into state and render the finished section
  S._finishedFixtures=finished;
  renderFinishedGames();
}

/* ── Finished Games Section ──────────────────────────────────── */
function legacyRenderFinishedGames_v327(statsMap){
  statsMap=statsMap||S._finishedStatsMap||{};
  S._finishedStatsMap=statsMap;
  const list=$('finishedGamesList');
  const countEl=$('finishedGamesCount');
  const updEl=$('finishedGamesUpdated');
  const games=S._finishedFixtures||[];
  if(countEl) countEl.textContent=games.length+' games';
  if(updEl) updEl.textContent=games.length?'Updated '+new Date().toLocaleTimeString():'';
  if(!list) return;
  if(!games.length){list.innerHTML='<div class="empty">No finished games today.</div>';return;}
  list.innerHTML=games.map((m,i)=>{
    const fid=kcFixtureId(m);
    const st=statsMap[fid];
    const statsHtml=st?renderFinishedStats(st):'';
    const isExpanded=list.querySelector(`[data-fid="${fid}"]`)?.classList.contains('fg-expanded');
    return `<div class="fixture fg-row" data-fid="${fid}" style="flex-direction:column;gap:0;padding:0;border-radius:10px;overflow:hidden;margin-bottom:6px;cursor:pointer" onclick="toggleFinishedGame(${fid},this)">
      <div style="display:grid;grid-template-columns:90px 1fr auto auto;gap:10px;align-items:center;padding:11px 14px">
        <div><span class="badge" style="background:#1e293b;color:#94a3b8">FT</span><div class="sub" style="font-size:10px;margin-top:3px">${kcLeagueMark(m)}${esc(m.league||'Worldwide')}</div></div>
        <div class="teams"><strong>${teamCell(kcTeamLogo(m,'home'),m.home||'Home','xs',m.homeId||0)} <span style="font-size:18px;font-weight:900;color:var(--text);padding:0 6px">${esc(m.score||'vs')}</span> ${teamCell(kcTeamLogo(m,'away'),m.away||'Away','xs',m.awayId||0)}</strong><span class="sub" style="font-size:10px">${esc(m.venue||'')}</span></div>
        <div style="text-align:right"><span class="sub" style="font-size:10px">${esc(kickoff(m).slice(11,16)||'')}</span></div>
        <div><span style="color:var(--accent);font-size:16px;transition:.2s" class="fg-chevron">${st?'▴':'▾'}</span></div>
      </div>
      <div class="fg-stats" style="display:${st?'block':'none'};border-top:1px solid var(--line);padding:12px 14px;background:rgba(255,255,255,.02)">${st?statsHtml:'<div class="empty" style="padding:12px">Loading stats…</div>'}</div>
    </div>`;
  }).join('');
}

function renderFinishedStats(st){
  const rows=st.statistics||[];
  if(!rows.length) return '<div class="sub" style="padding:8px 0">No match statistics available.</div>';
  const home=rows[0]||{}, away=rows[1]||{};
  const hName=home.team?.name||'Home', aName=away.team?.name||'Away';
  const hStats={}, aStats={};
  (home.statistics||[]).forEach(s=>{hStats[s.type]=s.value});
  (away.statistics||[]).forEach(s=>{aStats[s.type]=s.value});
  const statRow=(label,key)=>{
    const h=hStats[key]??'—', a=aStats[key]??'—';
    const hNum=parseFloat(h)||0, aNum=parseFloat(a)||0, tot=hNum+aNum||1;
    const hPct=tot>0?(hNum/tot*100).toFixed(0):50;
    return `<div style="display:grid;grid-template-columns:60px 1fr 60px;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">
      <span style="text-align:right;font-weight:700;font-size:13px">${h}</span>
      <div>
        <div style="font-size:10px;color:var(--muted);text-align:center;margin-bottom:4px">${label}</div>
        <div style="height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;display:flex">
          <div style="width:${hPct}%;background:var(--accent);transition:width .4s"></div>
        </div>
      </div>
      <span style="font-weight:700;font-size:13px">${a}</span>
    </div>`;
  };
  const statKeys=[
    ['Shots on Goal','Shots on Goal'],['Total Shots','Total Shots'],
    ['Ball Possession','Ball Possession'],['Total Passes','Total passes'],
    ['Corner Kicks','Corner Kicks'],['Fouls','Fouls'],
    ['Yellow Cards','Yellow Cards'],['Red Cards','Red Cards'],
    ['Offsides','Offsides'],['Blocked Shots','Blocked Shots'],
  ];
  return `<div>
    <div style="display:grid;grid-template-columns:60px 1fr 60px;gap:8px;margin-bottom:6px">
      <span style="text-align:right;font-size:11px;color:var(--accent);font-weight:800">${esc(hName)}</span>
      <span style="text-align:center;font-size:11px;color:var(--muted)">STAT</span>
      <span style="font-size:11px;color:var(--accent);font-weight:800">${esc(aName)}</span>
    </div>
    ${statKeys.map(([l,k])=>statRow(l,k)).join('')}
  </div>`;
}

window.toggleFinishedGame=async function(fid,el){
  const statsEl=el.querySelector('.fg-stats');
  const chevron=el.querySelector('.fg-chevron');
  const isOpen=statsEl.style.display!=='none';
  if(isOpen){statsEl.style.display='none';if(chevron)chevron.textContent='▾';return;}
  statsEl.style.display='block';
  if(chevron)chevron.textContent='▴';
  if((S._finishedStatsMap||{})[fid]) return; // already loaded
  statsEl.innerHTML='<div class="empty" style="padding:12px">Loading match statistics…</div>';
  try{
    const d=await get('/fixtures/'+fid+'/stats');
    S._finishedStatsMap=S._finishedStatsMap||{};
    S._finishedStatsMap[fid]=d;
    statsEl.innerHTML=renderFinishedStats(d);
  }catch(e){
    statsEl.innerHTML=`<div class="empty" style="padding:12px">Stats unavailable: ${esc(e.message||'Unable to load data')}</div>`;
  }
};

window.loadFinishedGames=async function(force=false){
  const list=$('finishedGamesList');
  if(!list) return;
  const lg=$('league')?.value||'ALL', r=$('range')?.value||'today';
  const today=new Date();const iso=d=>d.toISOString().slice(0,10);
  const d0=iso(today);
  if(list) list.innerHTML='<div class="empty">Refreshing finished games…</div>';
  try{
    const fx=await get('/fixtures/with-odds',{league:lg,type:'today',date_from:d0,date_to:d0,refresh:force?1:0});
    const all=fx.matches||fx.fixtures||[];
    S._finishedFixtures=all.filter(m=>m.isFinished||(m.status||'').toUpperCase()==='FT');
    // Eagerly fetch stats for all finished games (throttled)
    const sm=S._finishedStatsMap||{};
    await Promise.allSettled(S._finishedFixtures.slice(0,20).map(async m=>{
      const fid=kcFixtureId(m);
      if(!sm[fid]){
        try{sm[fid]=await get('/fixtures/'+fid+'/stats');}catch(_){}
      }
    }));
    S._finishedStatsMap=sm;
    renderFinishedGames(sm);
    const updEl=$('finishedGamesUpdated');
    if(updEl) updEl.textContent='Updated '+new Date().toLocaleTimeString();
  }catch(e){
    if(list) list.innerHTML=`<div class="empty">Could not load finished games: ${esc(e.message||'server error')}</div>`;
  }
};
function renderLive(){
  if(!S.live.length){ $('liveList').innerHTML='<div class="empty">No live matches currently returned.</div>'; return; }
  // Show ALL live matches — odds not required for display (only needed for prediction qualification)
  $('liveList').innerHTML = S.live.map(m => {
    const o = odds(m), ok = hasOdds(m), c = conf(m), min = minute(m);
    const score = m.score || (m.homeScore != null ? `${m.homeScore} - ${m.awayScore}` : null);
    return `<div class="fixture livebox" onclick="openLiveMatchPage(${kcFixtureId(m)})" style="cursor:pointer">
      <div>
        <span class="minute">${min ? min+"'" : 'LIVE'}</span><br>
        <span class="sub">${esc(m.league||'Worldwide')}</span>
      </div>
      <div class="teams">
        <strong>${teamCell(m.homeLogo||m.homeTeamLogo||m.fixture?.teams?.home?.logo||'',m.home||m.homeTeam||'Home','xs',m.homeId||m.homeTeamId||m.fixture?.teams?.home?.id||0)} ${score ? `<span class="live-score">${esc(score)}</span>` : 'vs'} ${teamCell(m.awayLogo||m.awayTeamLogo||m.fixture?.teams?.away?.logo||'',m.away||m.awayTeam||'Away','xs',m.awayId||m.awayTeamId||m.fixture?.teams?.away?.id||0)}</strong>
        <span>${esc(m.venue||'')}</span>
      </div>
      <div class="odds">${['homeWin','draw','awayWin'].map((k,i)=>`<div class="odd"><small>${['1','X','2'][i]}</small>${Number(o[k]||0)?Number(o[k]).toFixed(2):'—'}</div>`).join('')}</div>
      <div>
        <span class="badge ${ok?'ok':'noodds'}">${ok?'Bookmaker odds':'Waiting for odds'}</span>
        ${ok ? `<div class="bar"><i style="width:${c}%"></i></div><small>${c.toFixed(1)}% · ${esc(winner(m))}</small>` : '<small style="color:var(--muted);font-size:10px">Display only · not prediction-qualified</small>'}
      </div>
      <div style="display:flex;gap:5px;align-items:center">
        <span class="badge live">LIVE</span>
        <button class="lr-stats-btn" onclick="event.stopPropagation();openLiveMatchPage(${kcFixtureId(m)})">Stats</button>
      </div>
    </div>`;
  }).join('');
}
function live75Score(m){
  // Weighted scoring formula for Live 75 Winner
  // Weights: corners 15%, each goal +10%, attacking 10%, AI model 20%, possession 10%, defence 5%, distribution 5%
  // Note: intentionally <100% to allow stacking (e.g. multiple goals)
  const p = m?.prediction?.probabilities || m?.probabilities || {};
  const stats = m?.liveStats || m?.statistics || m?.stats || {};
  const homeStats = stats?.home || stats?.[0] || {};
  const awayStats = stats?.away || stats?.[1] || {};

  // Helper: extract a numeric stat value (handles objects with value field)
  function sv(v){ if(v==null) return 0; if(typeof v==='object') v=v?.value??v?.total??0; return Number(v)||0; }

  // --- Corners (15%) ---
  const homeCorners = sv(homeStats.corners ?? homeStats.cornerKicks ?? homeStats['Corner Kicks']);
  const awayCorners = sv(awayStats.corners ?? awayStats.cornerKicks ?? awayStats['Corner Kicks']);
  const totalCorners = homeCorners + awayCorners || 1;
  const homeCornPct = (homeCorners / totalCorners) * 15;
  const awayCornPct = (awayCorners / totalCorners) * 15;

  // --- Goals scored: each goal adds 10% ---
  let homeScore = 0, awayScore = 0;
  if(m.score){
    const parts = String(m.score).split('-').map(x=>parseInt(x.trim())||0);
    homeScore = parts[0]||0; awayScore = parts[1]||0;
  }
  const homeGoalBonus = homeScore * 10;
  const awayGoalBonus = awayScore * 10;

  // --- Attacking (10%): shots on target ratio ---
  const homeShotsOn = sv(homeStats.shotsOnTarget ?? homeStats['Shots on Goal'] ?? homeStats.shotsOnGoal);
  const awayShotsOn = sv(awayStats.shotsOnTarget ?? awayStats['Shots on Goal'] ?? awayStats.shotsOnGoal);
  const totalShots = homeShotsOn + awayShotsOn || 1;
  const homeAtkPct = (homeShotsOn / totalShots) * 10;
  const awayAtkPct = (awayShotsOn / totalShots) * 10;

  // --- AI Model (20%): use server confidence & winner prediction ---
  const aiConf = conf(m); // 0–100
  const w = winner(m);
  const homeTeamName = m.home || m.homeTeam || '';
  const awayTeamName = m.away || m.awayTeam || '';
  let homeAI = 0, awayAI = 0;
  if(w && homeTeamName && w.toLowerCase().includes(homeTeamName.toLowerCase().split(' ')[0].toLowerCase())){
    homeAI = (aiConf / 100) * 20;
  } else if(w && awayTeamName && w.toLowerCase().includes(awayTeamName.toLowerCase().split(' ')[0].toLowerCase())){
    awayAI = (aiConf / 100) * 20;
  } else {
    // Draw or unclear — split equally
    homeAI = (aiConf / 100) * 10;
    awayAI = (aiConf / 100) * 10;
  }

  // --- Possession (10%) ---
  const homePoss = sv(homeStats.ballPossession ?? homeStats['Ball Possession'] ?? homeStats.possession);
  const awayPoss = sv(awayStats.ballPossession ?? awayStats['Ball Possession'] ?? awayStats.possession);
  const totalPoss = homePoss + awayPoss || 100;
  const homePossPct = (homePoss / totalPoss) * 10;
  const awayPossPct = (awayPoss / totalPoss) * 10;

  // --- Defence (5%): tackles + interceptions ---
  const homeTackles = sv(homeStats.tackles ?? homeStats['Total Tackles'] ?? homeStats.interceptions);
  const awayTackles = sv(awayStats.tackles ?? awayStats['Total Tackles'] ?? awayStats.interceptions);
  const totalTackles = homeTackles + awayTackles || 1;
  const homeDefPct = (homeTackles / totalTackles) * 5;
  const awayDefPct = (awayTackles / totalTackles) * 5;

  // --- Distribution (5%): long balls + passes ---
  const homeLong = sv(homeStats.longBalls ?? homeStats['Long Balls'] ?? homeStats.totalPasses ?? homeStats['Total passes']);
  const awayLong = sv(awayStats.longBalls ?? awayStats['Long Balls'] ?? awayStats.totalPasses ?? awayStats['Total passes']);
  const totalLong = homeLong + awayLong || 1;
  const homeDistPct = (homeLong / totalLong) * 5;
  const awayDistPct = (awayLong / totalLong) * 5;

  // --- Total scores ---
  const homeTotal = homeCornPct + homeGoalBonus + homeAtkPct + homeAI + homePossPct + homeDefPct + homeDistPct;
  const awayTotal = awayCornPct + awayGoalBonus + awayAtkPct + awayAI + awayPossPct + awayDefPct + awayDistPct;

  return {
    homeTotal, awayTotal,
    breakdown: {
      corners:    { home: homeCornPct,  away: awayCornPct,  weight: 15 },
      goals:      { home: homeGoalBonus,away: awayGoalBonus,weight: '10 per goal' },
      attacking:  { home: homeAtkPct,   away: awayAtkPct,   weight: 10 },
      ai:         { home: homeAI,        away: awayAI,        weight: 20 },
      possession: { home: homePossPct,  away: awayPossPct,  weight: 10 },
      defence:    { home: homeDefPct,   away: awayDefPct,   weight: 5  },
      distribution:{ home: homeDistPct, away: awayDistPct,  weight: 5  },
    }
  };
}

function renderLive75(){
  const a=S.live.filter(m=>minute(m)>=75&&!/FT|AET|PEN|FIN/i.test(m?.liveStatus?.short||''));
  // Sort by highest combined weighted score
  a.sort((x,y)=>{
    const sx=live75Score(x), sy=live75Score(y);
    return Math.max(sy.homeTotal,sy.awayTotal)-Math.max(sx.homeTotal,sx.awayTotal);
  });
  $('live75List').innerHTML=a.length?a.map(m=>{
    const sc=live75Score(m);
    const hT=sc.homeTotal.toFixed(1), aT=sc.awayTotal.toFixed(1);
    const homeName=esc(m.home||m.homeTeam||'Home');
    const awayName=esc(m.away||m.awayTeam||'Away');
    const pick=sc.homeTotal>sc.awayTotal?homeName:sc.awayTotal>sc.homeTotal?awayName:'Draw';
    const bk=sc.breakdown;
    const scoreBarRow=(label,hV,aV,weight)=>{
      const total=hV+aV||0.001;
      const hPct=(hV/total*100).toFixed(0), aPct=(aV/total*100).toFixed(0);
      return `<div style="display:grid;grid-template-columns:90px 1fr 60px 1fr 90px;align-items:center;gap:6px;padding:3px 0;font-size:11px">
        <span style="color:var(--muted);text-align:right">${hV.toFixed(1)}pts</span>
        <div style="background:var(--panel2);border-radius:4px;height:5px;overflow:hidden"><div style="width:${hPct}%;height:100%;background:var(--accent)"></div></div>
        <span style="color:var(--muted);text-align:center;font-size:10px">${label}<br><span style="color:var(--muted)">${typeof weight==='number'?weight+'%':weight}</span></span>
        <div style="background:var(--panel2);border-radius:4px;height:5px;overflow:hidden"><div style="width:${aPct}%;height:100%;background:var(--red)"></div></div>
        <span style="color:var(--muted)">${aV.toFixed(1)}pts</span>
      </div>`;
    };
    return `<div class="card livebox" style="margin:8px 0">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
        <b>${homeName} ${esc(m.score||'')} ${awayName}</b>
        <span class="minute">${minute(m)}'</span>
      </div>
      <!-- Score totals -->
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;margin:10px 0;align-items:center">
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:800;color:${sc.homeTotal>=sc.awayTotal?'var(--accent)':'var(--muted)'}">${hT}<span style="font-size:12px;font-weight:400">pts</span></div>
          <div style="font-size:10px;color:var(--muted)">${homeName}</div>
        </div>
        <div style="text-align:center;padding:6px 10px;border:1px solid var(--line);border-radius:8px">
          <div class="pick" style="font-size:12px">PICK</div>
          <div style="font-weight:800;color:var(--yellow);font-size:13px">${pick}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:800;color:${sc.awayTotal>sc.homeTotal?'var(--red)':'var(--muted)'}">${aT}<span style="font-size:12px;font-weight:400">pts</span></div>
          <div style="font-size:10px;color:var(--muted)">${awayName}</div>
        </div>
      </div>
      <!-- Breakdown header -->
      <div style="display:grid;grid-template-columns:90px 1fr 60px 1fr 90px;gap:6px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;padding:2px 0 4px">
        <span style="text-align:right">${homeName}</span><span></span><span style="text-align:center">Factor</span><span></span><span>${awayName}</span>
      </div>
      ${scoreBarRow('Corners',bk.corners.home,bk.corners.away,15)}
      ${scoreBarRow('Goals',bk.goals.home,bk.goals.away,'10/goal')}
      ${scoreBarRow('Attacking',bk.attacking.home,bk.attacking.away,10)}
      ${scoreBarRow('AI Model',bk.ai.home,bk.ai.away,20)}
      ${scoreBarRow('Possession',bk.possession.home,bk.possession.away,10)}
      ${scoreBarRow('Defence',bk.defence.home,bk.defence.away,5)}
      ${scoreBarRow('Distribution',bk.distribution.home,bk.distribution.away,5)}
      <!-- Quick stats strip -->
      <div class="marketgrid" style="margin-top:9px">
        <div class="market"><span>Server Winner</span><b class="pick">${esc(winner(m))}</b></div>
        <div class="market"><span>Server Confidence</span><b>${conf(m).toFixed(1)}%</b></div>
        <div class="market"><span>Bookmaker 1X2</span><b>${hasOdds(m)?'Available':'Unavailable'}</b></div>
      </div>
    </div>`;
  }).join(''):'<div class="empty">No matches at or beyond 75 minutes right now.</div>'
}
function sortPred(k,btn){
  S.sort=k;
  // Mark the active sort button (fix #11)
  document.querySelectorAll('.pred-sort-btns button').forEach(b=>{
    b.classList.toggle('active',b===btn);
    b.setAttribute('aria-pressed',b===btn?'true':'false');
  });
  renderPredictions();
}
function mktPct(v){if(v==null||v===undefined)return'—';let n=Number(v);if(n<=1&&n>0)n=n*100;return n.toFixed(1)+'%';}
function htWinner(m){
  const p=m?.probabilities||m?.prediction?.probabilities||{};
  const h=Number(p.halfTimeHome||p.htHome||0),d=Number(p.halfTimeDraw||p.htDraw||0),a=Number(p.halfTimeAway||p.htAway||0);
  if(!h&&!d&&!a)return'—';
  const best=Math.max(h,d,a);
  return best===h?`H ${h.toFixed(1)}%`:best===d?`D ${d.toFixed(1)}%`:`A ${a.toFixed(1)}%`;
}
function doubleChance(m){
  const p=m?.probabilities||m?.prediction?.probabilities||{};
  const h=Number(p.homeWin||0),d=Number(p.draw||0),a=Number(p.awayWin||0);
  if(!h&&!d&&!a)return'—';
  const dc1=h+d,dc2=h+a,dc3=d+a;
  const best=Math.max(dc1,dc2,dc3);
  return best===dc1?`1X ${dc1.toFixed(1)}%`:best===dc2?`12 ${dc2.toFixed(1)}%`:`X2 ${dc3.toFixed(1)}%`;
}
function probs(m){return m?.probabilities||m?.prediction?.probabilities||m?.markets||{}}
function kcFixtureId(m){ return Number(m?.fixture?.id || m?.id || m?.fixtureId || m?._afootFixtureId || 0); }
function kcTeamId(m,side){ const t=m?.teams?.[side]||m?.fixture?.teams?.[side]||{}; return Number(t?.id || m?.[side+'Id'] || m?.[side+'TeamId'] || 0); }
function renderTipOfDay(){
  const totdBody = $('totdBody'), totdConf = $('totdConf');
  if (!totdBody) return;
  const allPreds=(S.predictions||[]);
  const qualified = allPreds.filter(hasOdds);
  const tipPool = qualified.length ? qualified : allPreds;
  if (!tipPool.length) {
    totdBody.innerHTML = '<div class="empty" style="padding:16px">Loading fixture → odds → prediction pipeline…</div>';
    if (totdConf) totdConf.textContent = 'Unavailable';
    return;
  }
  // Show top 2 picks by confidence (was [0] — one pick only)
  const TOP_N = 2;
  const picks = tipPool.slice().sort((a,b)=>conf(b)-conf(a)).slice(0, TOP_N);
  const topPick = picks[0];
  if (totdConf) totdConf.textContent = conf(topPick).toFixed(1)+'% confidence';
  // Store on a window registry so onclick never interpolates unsafe team-name strings
  window._totdPicks = picks;
  totdBody.innerHTML = picks.map((pick, idx) => {
    const hName = pick.home||pick.homeTeam||'Home', aName = pick.away||pick.awayTeam||'Away';
    const w = winner(pick), o = odds(pick);
    const pickOdds = w==='Home Win'?o.homeWin : w==='Away Win'?o.awayWin : o.draw;
    const mktKey = w==='Home Win'?'homeWin':w==='Away Win'?'awayWin':'draw';
    const pp=probs(pick)||{};
    let expectedWin=Number(pp[mktKey]??0);
    if(expectedWin>0 && expectedWin<=1) expectedWin*=100;
    if(!(expectedWin>0)){
      const ih=Number(o.homeWin)>0?1/Number(o.homeWin):0, id=Number(o.draw)>0?1/Number(o.draw):0, ia=Number(o.awayWin)>0?1/Number(o.awayWin):0, sum=ih+id+ia;
      const raw=mktKey==='homeWin'?ih:mktKey==='awayWin'?ia:id; expectedWin=sum>0?(raw/sum*100):conf(pick);
    }
    return `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px${idx>0?';margin-top:14px;padding-top:14px;border-top:1px solid var(--line)':''}">
      <div>
        <div style="font-size:15px;font-weight:800">${esc(hName)} vs ${esc(aName)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(pick.league||'Worldwide')} · ${esc(kickoff(pick).slice(0,16)||'')}</div>
        <div style="margin-top:8px"><span class="pick" style="font-size:14px">${esc(w)}</span> ${!hasOdds(pick)?'<span class="badge">Kasi model · odds pending</span>':''} <span style="color:var(--yellow);font-weight:700;margin-left:6px">Expected win ${Number(expectedWin).toFixed(1)}%</span></div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">

        <button data-totd-idx="${idx}" onclick="(function(b){const p=window._totdPicks[+b.dataset.totdIdx];if(p)openLiveMatchPage(kcFixtureId(p),'football',p.league||'');})(this)" style="font-size:12px">Stats</button>
      </div>
    </div>`;
  }).join('');
}
function renderPredictions(){
  // Filter out finished games and matches with a kickoff in the past
  const now = Date.now();
  let a=(S.predictions||[]).filter(m=>{
    if(m.isFinished) return false;
    const st=(m.fixture?.status?.short||m.status||'').toUpperCase();
    if(st==='FT'||st==='AET'||st==='PEN'||st==='AWD'||st==='WO') return false;
    const ko=kickoff(m);
    if(ko && new Date(ko).getTime() < now - 120*60*1000) return false; // >2h past KO
    return true;
  });
  if(S.sort==='confidence')a.sort((x,y)=>conf(y)-conf(x));
  else if(S.sort==='kickoff')a.sort((x,y)=>kickoff(x).localeCompare(kickoff(y)));
  else a.sort((x,y)=>Number(hasOdds(y))-Number(hasOdds(x))||conf(y)-conf(x));
  if(!a.length){ $('predictionList').innerHTML='<div class="empty">No predictions returned.</div>'; return; }

  // v347: Predictions are public. Every qualifying row is available to every visitor.
  const makeRow = (m,i) => {
    const o=odds(m), p=probs(m);
    const o05=p.over05??p['over0.5'], o15=p.over15??p['over1.5'], o25=p.over25??p['over2.5'], o35=p.over35??p['over3.5'];
    const btts=p.btts??p.bothTeamsToScore;
    const hwr = m.homeWinRate != null ? (m.homeWinRate*100).toFixed(0)+'%' : '—';
    const awr = m.awayWinRate != null ? (m.awayWinRate*100).toFixed(0)+'%' : '—';
    const hgp = m.homeGamesPlayed || 0, agp = m.awayGamesPlayed || 0;
    const wrBadge = (m.homeWinRate != null && m.awayWinRate != null)
      ? `<span style="font-size:9px;color:var(--green);margin-top:2px;display:block"> WR: ${hwr}(${hgp}g) / ${awr}(${agp}g)</span>`
      : '';
    return `<tr>
      <td>${i+1}</td>
      <td><b class="kc-click-team" onclick="openKasiTeamPage(${Number(m.homeId||m.homeTeamId||0)},${JSON.stringify(m.home||m.homeTeam||'Home')})">${esc(m.home||m.homeTeam)}</b> vs <b class="kc-click-team" onclick="openKasiTeamPage(${Number(m.awayId||m.awayTeamId||0)},${JSON.stringify(m.away||m.awayTeam||'Away')})">${esc(m.away||m.awayTeam)}</b><br><span class="sub">${esc(kickoff(m))}</span>${wrBadge}</td>
      <td>${esc(m.league||'Worldwide')}</td>
      <td class="pick">${esc(winner(m))}</td>
      <td><b class="confidence">${conf(m).toFixed(1)}%</b><div class="bar"><i style="width:${conf(m)}%"></i></div></td>
      <td style="color:var(--accent)">${htWinner(m)}</td>
      <td style="color:var(--purple)">${doubleChance(m)}</td>
      <td style="color:${Number(p.btts??0)>=50?'var(--green)':'var(--muted)'}">${mktPct(btts)}</td>
      <td style="color:${Number(o05??0)>=80?'var(--green)':'var(--muted)'}">${mktPct(o05)}</td>
      <td style="color:${Number(o15??0)>=60?'var(--green)':'var(--muted)'}">${mktPct(o15)}</td>
      <td style="color:${Number(o25??0)>=50?'var(--green)':'var(--yellow)'}">${mktPct(o25)}</td>
      <td style="color:${Number(o35??0)>=40?'var(--yellow)':'var(--muted)'}">${mktPct(o35)}</td>
      <td>${hasOdds(m)?`${Number(o.homeWin).toFixed(2)} / ${Number(o.draw).toFixed(2)} / ${Number(o.awayWin).toFixed(2)}`:'—'}</td>
      <td><span class="badge ${hasOdds(m)?'ok':'noodds'}">${hasOdds(m)?'Odds':'Model only'}</span></td>
      <td><button class="match-stats-btn" onclick="event.stopPropagation();openLiveMatchPage(${kcFixtureId(m)},'football',${JSON.stringify(m.league||'')})">Stats</button></td>
    </tr>`;
  };

  const thead = `<div class="tablewrap"><table class="table pred-table" style="min-width:700px"><thead><tr>
    <th>#</th><th>Match</th><th class="pred-col-league">League</th>
    <th>FT Winner</th><th>Confidence</th>
    <th class="pred-col-secondary">HT Winner</th><th class="pred-col-secondary">Double Chance</th><th class="pred-col-secondary">BTTS</th>
    <th class="pred-col-secondary">Over 0.5</th><th class="pred-col-secondary">Over 1.5</th><th class="pred-col-secondary">Over 2.5</th><th class="pred-col-secondary">Over 3.5</th>
    <th class="pred-col-odds">1X2 Odds</th><th>Status</th><th>Stats</th>
  </tr></thead><tbody>`;

  // v347: no subscription/paywall branch for Predictions.
  $('predictionList').innerHTML = thead + a.map(makeRow).join('') + '</tbody></table></div>';
}
function renderOverview(){
  // Fix #13: animate KPI values when they populate from the initial '—' placeholder
  function kpiSet(id, val) {
    const el = $(id); if (!el) return;
    const prev = el.textContent;
    el.textContent = val;
    if (prev === '—' || prev === '') {
      el.classList.remove('kpi-pop');
      // Force reflow so removing+re-adding the class restarts the animation
      void el.offsetWidth;
      el.classList.add('kpi-pop');
    }
  }
  const actualOddsCount=S.fixtures.filter(hasOdds).length;
  kpiSet('kFixtures', S.fixtures.length);
  kpiSet('kOdds', actualOddsCount);
  kpiSet('kPred', S.predictions.filter(hasOdds).length);
  kpiSet('kLive', S.live.length);
  kpiSet('kCurrentOdds', actualOddsCount);
  kpiSet('kSportLive', S.sportLiveCount ?? S.live.filter(m=>m.sport && m.sport!=='football').length);
  {const b=S.sportLiveBreakdown||{};const el=$('kSportLiveBreakdown');if(el)el.textContent=`Football ${Number(b.football||0)} · Rugby ${Number(b.rugby||0)} · Cricket ${Number(b.cricket||0)}`;}
  const op=S.fixtures.filter(hasOdds).length, total=S.fixtures.length;
  kpiSet('kOddsPct', S.oddsMeta?Number(S.oddsMeta.coverage).toFixed(1)+'%':(total?((op/total)*100).toFixed(1)+'%':'—'));
  {const el=$('kOddsCoverageDetail');if(el)el.textContent=`${op} of ${total} visible fixtures have bookmaker odds`;}
  kpiSet('kNoOdds', S.qualification?.waitingForOdds ?? Math.max(0,total-op));
  const topTwo=[...S.predictions].sort((a,b)=>conf(b)-conf(a)).slice(0,2);
  kpiSet('kTop', topTwo.length?topTwo.map(x=>conf(x).toFixed(1)+'%').join(' · '):'—');
  { const el=$('kTopName'); if(el) el.innerHTML=topTwo.length?topTwo.map((x,i)=>{const o=odds(x),p=probs(x)||{},kw=winner(x),k=kw==='Home Win'?'homeWin':kw==='Away Win'?'awayWin':'draw';let book='Odds pending';if(hasOdds(x)){const inv={homeWin:1/Number(o.homeWin),draw:1/Number(o.draw),awayWin:1/Number(o.awayWin)},sum=inv.homeWin+inv.draw+inv.awayWin;const bk=Object.keys(inv).sort((a,b)=>inv[b]-inv[a])[0];const bn=bk==='homeWin'?(x.home||x.homeTeam):bk==='awayWin'?(x.away||x.awayTeam):'Draw';book=`Bookmaker: ${esc(bn)} ${(inv[bk]/sum*100).toFixed(1)}%`;}const hn=x.home||x.homeTeam||'Home',an=x.away||x.awayTeam||'Away',hid=Number(x.homeId||x.homeTeamId||0),aid=Number(x.awayId||x.awayTeamId||0);return `${i+1}. <b><span class="kc-click-team" onclick="event.stopPropagation();openKasiTeamPage(${hid},${JSON.stringify(hn)})">${esc(hn)}</span> vs <span class="kc-click-team" onclick="event.stopPropagation();openKasiTeamPage(${aid},${JSON.stringify(an)})">${esc(an)}</span></b><br>Kasi: ${esc(kw)} ${conf(x).toFixed(1)}% · ${book}`}).join('<br><br>'):'Predictions loading'; }
  if(typeof renderHomeOdds==='function') renderHomeOdds();
  { const el=$('topPred'); if(el) el.innerHTML=S.predictions.length?S.predictions.slice().sort((a,b)=>conf(b)-conf(a)).slice(0,10).map(row).join(''):'<div class="empty">No predictions.</div>'; }
  // Live scores (8 matches) only shown in dedicated Live Scores widget — removed from overview
}
async function refreshAll(){
  log('Loading Kasi Sports News…');
  const lg=$('league')?.value||'ALL';
  const safeRender=(...fns)=>fns.forEach(fn=>{try{fn()}catch(e){console.warn('KasiScore render warning',fn?.name,e)}});

  // v231: Live remains independent.
  const liveP=get('/live',{league:lg,refresh:0}).then(v=>{
    S.live=v?.matches||[];
    S.sportLiveBreakdown=Object.assign({},S.sportLiveBreakdown||{},{football:S.live.length});
    S.sportLiveCount=Number(S.live.length)+Number(S.sportLiveBreakdown.rugby||0)+Number(S.sportLiveBreakdown.cricket||0);
    safeRender(renderLive,renderOverview);
    return v;
  }).catch(e=>{log('Live error: '+e.message);safeRender(renderLive,renderOverview);return null});

  // v231: Load fixtures/odds FIRST. Do not compete with ai-predictions for the same backend pipeline.
  let fv=null;
  try{
    fv=await get('/fixtures/with-odds',{league:lg,type:'upcoming',refresh:0});
    let rows=fv?.matches||fv?.fixtures||[];
    if(!rows.length){
      log('Initial fixture response empty; retrying once…');
      await new Promise(r=>setTimeout(r,900));
      fv=await get('/fixtures/with-odds',{league:lg,type:'upcoming',refresh:0});
      rows=fv?.matches||fv?.fixtures||[];
    }
    if(rows.length || !S.fixtures?.length) S.fixtures=rows;
    S.qualification=fv||{};
    const complete=Number(fv?.oddsComplete??fv?.oddsBookmaker??S.fixtures.filter(hasOdds).length);
    S.oddsMeta={complete,total:S.fixtures.length,coverage:S.fixtures.length?complete/S.fixtures.length*100:0};
    safeRender(renderFixtures,renderOverview);
  }catch(e){
    log('Fixtures error: '+e.message);
    if(!S.fixtures?.length){S.fixtures=[];S.qualification={error:'Football data temporarily unavailable'};S.oddsMeta={complete:0,total:0,coverage:0};}
    safeRender(renderFixtures,renderOverview);
  }

  // v231: Predictions start only after fixture/odds loading has finished and warmed the server cache.
  try{
    const pv=await get('/ai-predictions',{league:lg,type:'upcoming',limit:100,refresh:0});
    S.predictions=pv?.predictions||pv?.matches||[];
    if(typeof window.ks211SyncPredictionsToFixtures==='function')window.ks211SyncPredictionsToFixtures();
    safeRender(renderPredictions,renderTipOfDay,renderOverview);
  }catch(e){
    S.predictions=[];
    log('Prediction error: '+e.message);
    safeRender(renderPredictions,renderTipOfDay,renderOverview);
  }

  await Promise.allSettled([liveP]);
  safeRender(renderAll);

  // Do not claim football is unavailable when fixtures/odds loaded but predictions did not.
  if((S.fixtures||[]).length && !(S.predictions||[]).length){
    const tb=$('totdBody'), tc=$('totdConf');
    if(tb) tb.innerHTML='<div class="empty" style="padding:16px">Fixtures and bookmaker odds are available. Predictions are still loading or temporarily unavailable.</div>';
    if(tc) tc.textContent='Predictions pending';
  }
  if(!(S.fixtures||[]).length){
    const og=$('homeOddsGrid'), ob=$('homeOddsBadge');
    if(og) og.innerHTML='<div class="empty">Football data temporarily unavailable. Bookmaker odds will appear when the football data service is available.</div>';
    if(ob) ob.textContent='Unavailable';
  }

  if(typeof loadFinishedGames==='function') setTimeout(()=>loadFinishedGames(false),500);
  if(typeof loadRecentResults==='function') setTimeout(()=>loadRecentResults(),0);
  if($('statusDot')) $('statusDot').style.background='var(--green)';
  setTimeout(()=>get('/learning/missed-today').then(v=>{S.learning=v;safeRender(renderAll)}).catch(()=>{}),5000);
  setTimeout(()=>get('/odds/diagnostics').then(v=>{S.diag=v;safeRender(renderAll)}).catch(()=>{}),6000);
}

function renderAll(){
  const _txt=(id,v)=>{const e=$(id);if(e)e.textContent=v}; const _html=(id,v)=>{const e=$(id);if(e)e.innerHTML=v};
  if($('poolSize')) _txt('poolSize','ALL');
  [renderOverview,renderFixtures,renderLive,renderLive75,renderPredictions,renderTipOfDay].forEach(fn=>{try{fn()}catch(e){console.warn('KasiScore render warning:',fn?.name||'widget',e)}});
  if(S.learning){
    const L=S.learning;
    const lc=L.learningCycle||{};
    // --- KPI counts ---
    const total=L.totalPredictions??L.count??0;
    const resolved=L.resolvedPredictions??L.resolved??0;
    const pending=L.pendingPredictions??L.pending??0;
    _txt('lSaved',total);
    _txt('lResolved',resolved);
    // Games Learned = resolved (finished games the model has been trained on)
    _txt('lGamesLearned',resolved>0?resolved:'0 — run cycle to resolve');
    // Games Predicted = pending future games
    _txt('lPredicted',pending);
    // --- Accuracy ---
    const acc=L.accuracy;
    const accTxt=acc!=null?Number(acc).toFixed(1)+'% (target: 99%)':'Run cycle to compute';
    _txt('lAccuracy',accTxt);
    _txt('lPredAccuracy',accTxt);
    // --- Home Win % from bestPredictions ---
    const bp=L.bestPredictions||[];
    if(bp.length){
      const homeWinCount=bp.filter(x=>(x.bestOutcome||x.predictedWinner)==='homeWin').length;
      _txt('lHomeWin',(homeWinCount/bp.length*100).toFixed(1)+'%');
    } else { _txt('lHomeWin','—'); }
    // --- Model version label ---
    const dbVersions=L.modelVersionsInDB||[];
    const oldVersions=dbVersions.filter(v=>v!==L.modelVersion&&v!=='Football AI Model'&&v!=='Football AI Model');
    _txt('lModel',L.modelVersion||'Football AI Model');
    // Warn if old model versions exist (will be renamed on next cycle)
    if(oldVersions.length&&$('lModelNote')){
      _txt('lModelNote',' Old version names in DB: '+oldVersions.join(', ')+' — run cycle to migrate');
      $('lModelNote').style.color='var(--yellow)';
    } else if($('lModelNote')){
      _txt('lModelNote','All DB rows on current model name');
      $('lModelNote').style.color='var(--green)';
    }
    // --- Improvements: from server cycle data (accurate) ---
    const improvNeeded=lc.lastCycleImproved??L.improvementsNeeded??0;
    const improvDone=lc.lastCycleUpdated??L.improvementsDone??0;
    const autoRes=lc.autoResolved??L.lastAutoResolved??0;
    _txt('lImproveNeeded',improvNeeded>0?`${improvNeeded} predictions updated`:'None — model is stable');
    _txt('lImproveNeedPct',improvNeeded>0?`${improvNeeded} confidence scores changed last cycle`:`Last cycle: ${improvDone} re-scored`);
    _txt('lImproveDone',improvDone>0?`${improvDone} re-scored`:'None yet — run cycle');
    // Show auto-resolve count if any
    if(autoRes>0) log(`ℹ Last cycle auto-resolved ${autoRes} finished games`);
    // --- Learning cycle info ---
    _txt('lCycleCount',lc.cycleCount??0);
    _txt('lCycleUpdated',lc.lastCycleUpdated??'—');
    const statMap={idle:'Idle ',running:'⏳ Running...',error:'Error ',pending:'Pending'};
    _txt('lCycleStatus',statMap[lc.status||'idle']||lc.status||'Idle ');
    renderAccuracyPanel(L);
    _txt('lLastRun',lc.lastRunAt?new Date(lc.lastRunAt).toLocaleTimeString():'Not yet run');
    _txt('lNextRun',lc.nextRunAt?new Date(lc.nextRunAt).toLocaleTimeString():'Pending...');
    // --- Weight bars: adapted vs base ---
    const adapted=lc.adaptedWeights||L.predictionWeights||{};
    const base_w=L.baseWeights||{};
    const wLabels={odds:'Bookmaker Odds',ai:'Football AI Model',table:'League Table',injuriesH2H:'Injuries/H2H',lastSeason:'Last Season',currentSeason:'Current Season'};
    $('lWeightBars').innerHTML=Object.entries(adapted).map(([k,v])=>{
      const bv=base_w[k]??V141_BASE_WEIGHTS[k]??v;
      const pct=(v*100).toFixed(1);
      const delta=v-bv, sign=delta>=0?'+':'';
      const col=Math.abs(delta)<0.005?'var(--muted)':delta>0?'var(--green)':'var(--red)';
      return `<div style='display:grid;grid-template-columns:130px 1fr 80px 70px;align-items:center;gap:8px;padding:3px 0'>`+
        `<span style='font-size:11px;color:var(--muted)'>${wLabels[k]||k}</span>`+
        `<div class='bar'><i style='width:${pct}%;background:#38bdf8'></i></div>`+
        `<span style='font-size:11px;font-weight:700'>${pct}%</span>`+
        `<span style='font-size:11px;color:${col}'>${sign}${(delta*100).toFixed(1)}%</span>`+
      `</div>`;
    }).join('');
    // --- Unknown outcomes section ---
    const unk=L.unknownOutcomes||[];
    const unkEl=$('lUnknownOutcomes');
    if($('lUnknownCount'))_txt('lUnknownCount',unk.length>0?unk.length+' unresolved':'All resolved ');
    if(unkEl){
      if(unk.length){
        unkEl.innerHTML=`<div style="color:var(--yellow);font-size:11px;margin-bottom:6px"> ${unk.length} game(s) predicted but outcome not yet retrieved — run cycle to auto-resolve</div>`+
        unk.map(u=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);font-size:12px">
          <div><b>${esc(u.home)} vs ${esc(u.away)}</b><br><span style="color:var(--muted);font-size:10px">KO: ${esc(u.kickoff||'—')} · Predicted: ${esc(u.predictedWinner||'—')} · ${Number(u.confidence||0).toFixed(1)}%</span></div>
          <span class="badge warn">Unknown</span>
        </div>`).join('');
      } else {
        unkEl.innerHTML='<div class="empty" style="padding:12px;font-size:12px">No unresolved past games — all outcomes known </div>';
      }
    }
  }
  if(S.diag){_txt('dKey',S.diag.apiFootballConfigured?'YES':'NO');_txt('dCache',S.diag.rateLimitPerMinute??'—');_txt('dOddsAttempts',S.diag.preMatchCached??'—');$('dErrors').textContent=S.diag.quota?.lastError?'YES':'0'}
  _txt('kServer','LOCAL');_txt('kServerNote',base());
}
function toggleAuto(){S.auto=!S.auto;if($('autoBtn'))$('autoBtn').textContent=`Auto refresh: ${S.auto?'On':'Off'}`;if($('adminAutoBtn'))$('adminAutoBtn').textContent=`Auto refresh: ${S.auto?'On':'Off'}`;if(S.auto)startTimers();else stopTimers();}
function stopTimers(){clearInterval(S.timer);clearInterval(S.fixtureTimer);clearInterval(S.learningTimer);clearInterval(S.playerTimer);clearInterval(S.finishedTimer);}
function startTimers(){
  stopTimers();
  if(!S.auto) return;
  // v185: dashboard/live refresh standard — every 3 minutes
  S.timer=setInterval(()=>refreshAll(false),180000);
  // Fixture cache refresh — every 30 minutes; always fetch today + next 2 days
  S.fixtureTimer=setInterval(async()=>{
    log('⏱ 30-min fixture cache refresh (today + 2 days ahead)…');
    const lg=$('league')?.value||'ALL';
    const today=new Date();const iso=d=>d.toISOString().slice(0,10);
    const d0=iso(today),d1=iso(new Date(today.getTime()+2*86400000));
    const fx=await get('/fixtures/with-odds',{league:lg,type:'upcoming',date_from:d0,date_to:d1,refresh:0}).catch(e=>log('Fixture refresh err: '+e.message));
    if(fx){S.fixtures=fx.matches||fx.fixtures||[];renderAll();}
  },1800000);
  // Finished games refresh — every 75 minutes (stats change only briefly after FT)
  S.finishedTimer=setInterval(async()=>{
    log('⏱ 75-min finished games refresh…');
    if(typeof loadFinishedGames==='function') await loadFinishedGames(true).catch(e=>log('Finished games err: '+e.message));
  },75*60*1000);
  // Learning sync — every 4 hrs
  S.learningTimer=setInterval(async()=>{
    log('⏱ 4-hr learning sync…');
    const learn=await get('/learning/missed-today').catch(e=>log('Learning sync err: '+e.message));
    if(learn){S.learning=learn;renderAll();}
  },14400000);
  // Player stats — every 24 hrs (daily refresh for current season stats)
  S.playerTimer=setInterval(()=>{
    log('⏱ 24-hr player stats refresh…');
    PS._loading = false; // force refresh even if previous load stalled
    psLoad();
  },86400000);
}
const V141_BASE_WEIGHTS={odds:0.015,ai:0.012,table:0.009,injuriesH2H:0.011,lastSeason:0.015,currentSeason:0.020};
async function triggerLearning(){
  const btn=$('triggerBtn');
  btn.disabled=true; btn.textContent='⏳ Running...';
  $('lCycleStatus').textContent='Running...';
  log('Football AI Model learning cycle triggered — auto-resolving finished games & re-scoring predictions...');
  try{
    const r=await fetch(base()+'/learning/trigger',{method:'POST',cache:'no-store'});
    if(!r.ok){const err=await r.text();throw new Error(`Server ${r.status}: ${err.slice(0,200)}`);}
    const d=await r.json();
    const resolved=d.autoResolved??0, updated=d.updated??0, improved=d.improved??0;
    log(` Football AI Model cycle #${d.cycleCount??'?'} complete:`);
    log(`   • ${resolved} finished game(s) auto-resolved & graded`);
    log(`   • ${updated} prediction(s) re-scored with updated weights`);
    log(`   • ${improved} prediction(s) had confidence changes`);
    log(`   • DB: ${d.resolvedPredictions??'?'} resolved / ${d.totalPredictions??'?'} total`);
    if(d.adaptedWeights){const w=d.adaptedWeights;log(`   • Weights: odds=${(w.odds*100).toFixed(1)}% ai=${(w.ai*100).toFixed(1)}% table=${(w.table*100).toFixed(1)}%`);}
    await refreshAll();
  }catch(e){
    log(' Trigger error: '+e.message);
    $('lCycleStatus').textContent='Error ';
  }
  finally{btn.disabled=false; btn.textContent='&#x25B6; Run Now';}
}
window.addEventListener('load',()=>{startTimers();});

// ============================================================
// ACCURACY PANEL — synced from learning data
// ============================================================
function renderAccuracyPanel(L){
  if(!L) return;
  const acc = L.accuracy;
  const resolved = L.resolvedPredictions ?? L.resolved ?? 0;
  const accPct = acc != null ? Number(acc).toFixed(1)+'%' : '—';
  const correct = acc != null && resolved > 0 ? Math.round(Number(acc)/100 * resolved) : '—';
  $('accOverall').textContent = accPct;
  $('accResolved').textContent = resolved || '—';
  $('accCorrect').textContent = correct;
  const mv = L.modelVersion || 'Football AI Model';
  $('accModelVer').textContent = mv.length > 18 ? mv.slice(0,16)+'…' : mv;

  // Weight bars (ensemble breakdown)
  const lc = L.learningCycle || {};
  const adapted = lc.adaptedWeights || L.predictionWeights || {};
  const base_w = L.baseWeights || {};
  const wLabels = {odds:'Bookmaker Odds',ai:'Football AI Model',table:'League Table',injuriesH2H:'Injuries/H2H',lastSeason:'Last Season',currentSeason:'Current Season'};
  const wColors = ['var(--accent)','var(--purple)','var(--green)','var(--orange)','var(--yellow)','var(--red)'];
  const entries = Object.entries(adapted);
  $('accWeightBars').innerHTML = entries.length ? entries.map(([k,v],i)=>{
    const bv = base_w[k] ?? V141_BASE_WEIGHTS[k] ?? v;
    const pct = (v*100).toFixed(1);
    const delta = v - bv, sign = delta >= 0 ? '+' : '';
    const col = Math.abs(delta) < 0.005 ? 'var(--muted)' : delta > 0 ? 'var(--green)' : 'var(--red)';
    const c = wColors[i % wColors.length];
    return `<div style='display:grid;grid-template-columns:130px 1fr 70px 70px;align-items:center;gap:8px;padding:2px 0'>
      <span style='font-size:11px;color:var(--muted)'>${wLabels[k]||k}</span>
      <div class='bar'><i style='width:${pct}%;background:${c}'></i></div>
      <span style='font-size:11px;font-weight:700;color:${c}'>${pct}%</span>
      <span style='font-size:11px;color:${col}'>${sign}${(delta*100).toFixed(1)}%</span>
    </div>`;
  }).join('') : '<div style="color:var(--muted);font-size:12px">Run a learning cycle to see ensemble weights</div>';
}

// ============================================================
// RECENT GUESS RESULTS — rolling 3-day window
// ============================================================
const OUTCOME_LABELS = { homeWin:'Home Win', awayWin:'Away Win', draw:'Draw' };

function renderRecentResults(data){
  if(!data) return;
  const correct = data.correctGames || [];
  const wrong   = data.wrongGames   || [];

  if($('recentCorrectBadge')) $('recentCorrectBadge').textContent = correct.length + ' correct';
  if($('recentWrongBadge'))   $('recentWrongBadge').textContent   = wrong.length   + ' wrong';

  function gameRow(g, isCorrect){
    const score = (g.homeGoals != null && g.awayGoals != null)
      ? ` <span style="font-size:10px;background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px">${g.homeGoals}–${g.awayGoals}</span>` : '';
    const actual    = OUTCOME_LABELS[g.actualResult]    || g.actualResult    || '—';
    const predicted = OUTCOME_LABELS[g.predictedWinner] || g.predictedWinner || '—';
    const dot = isCorrect
      ? `<span style="color:var(--green);font-size:14px;line-height:1">●</span>`
      : `<span style="color:var(--red);font-size:14px;line-height:1">●</span>`;
    return `<div style="display:flex;align-items:flex-start;gap:7px;padding:6px 0;border-bottom:1px solid #222222;font-size:11px">
      ${dot}
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(g.home)} vs ${esc(g.away)}${score}</div>
        <div style="color:var(--muted);margin-top:1px">
          Pred: <span style="color:${isCorrect?'var(--green)':'var(--red)'}">${predicted}</span>
          · Act: <span style="color:var(--text)">${actual}</span>
        </div>
      </div>
    </div>`;
  }

  const cEl = $('recentCorrectList');
  const wEl = $('recentWrongList');
  if(cEl) cEl.innerHTML = correct.length
    ? correct.map(g=>gameRow(g,true)).join('')
    : '<div class="empty" style="font-size:11px">No correct guesses in last 3 days</div>';
  if(wEl) wEl.innerHTML = wrong.length
    ? wrong.map(g=>gameRow(g,false)).join('')
    : '<div class="empty" style="font-size:11px">No wrong guesses in last 3 days</div>';
}

async function loadRecentResults(){
  try{
    const data = await get('/learning/recent-results');
    renderRecentResults(data);
  } catch(e){ log('Recent results fetch error: '+e.message); }
}

// Hook into existing renderAll
const _origRenderAll = renderAll;
renderAll = function(){
  _origRenderAll();
  if(S.learning) renderAccuracyPanel(S.learning);
  if(typeof renderPlayerMatchSelect === 'function') renderPlayerMatchSelect();
};

// ============================================================
// PLAYER STATS LEADERBOARD — live from Kasi Sports News via server
// ============================================================
let PS = { players:[], sortKey:'score', loaded:false };

// Position classification — map API positions to our buckets
function psClassify(pos){
  if(!pos) return 'FWD';
  const p = pos.toLowerCase();
  if(p==='goalkeeper'||p==='gk'||p==='g') return 'GK';
  if(p==='defender'||p==='d'||p==='cb'||p==='lb'||p==='rb'||p==='rwb'||p==='lwb') return 'DEF';
  if(p==='midfielder'||p==='m'||p==='cm'||p==='am'||p==='dm'||p==='wm') return 'MID';
  return 'FWD';
}

// Compute a composite performance score per position type
function psCalcScore(p){
  const s = p.stats || {};
  const g = Number(s.goals||0), a = Number(s.assists||0), rat = Number(s.rating||6),
        saves = Number(s.saves||0), cs = Number(s.cleanSheets||0),
        tackles = Number(s.tackles||0), intercepts = Number(s.interceptions||0),
        shots = Number(s.shots||0), shotsOn = Number(s.shotsOn||0),
        keyPasses = Number(s.keyPasses||0), dribbles = Number(s.dribbles||0),
        apps = Math.max(1, Number(s.appearances||1));

  const pos = p.position;
  let score = 0;
  if(pos==='GK'){
    // Saves per game (40%) + clean sheets (30%) + rating (30%)
    score = (saves/apps)*4 + cs*3 + (rat-5)*2 + g*8 + a*4;
  } else if(pos==='DEF'){
    // Defensive actions (35%) + clean sheets (25%) + goal contributions (25%) + rating (15%)
    score = (tackles+intercepts)/apps*3 + cs*2.5 + g*8 + a*5 + (rat-5)*1.5 + dribbles*0.5;
  } else if(pos==='MID'){
    // Goal contributions (35%) + creativity (30%) + dribbles (15%) + rating (20%)
    score = g*8 + a*6 + keyPasses/apps*2 + dribbles/apps*1.5 + (rat-5)*2 + shots/apps*0.5;
  } else {
    // Goals (45%) + shots on target (20%) + assists (20%) + dribbles (15%)
    score = g*10 + shotsOn/apps*2 + a*6 + dribbles/apps*1 + (rat-5)*1.5;
  }
  return Math.max(0, score);
}

function psSetStatus(txt, col){
  const el=$('psStatus'); if(!el) return;
  el.textContent=txt; el.style.borderColor=col||'var(--line)';
}

function toggleLeaguePicker(){
  const p=$('psLeaguePicker');
  p.style.display=p.style.display==='none'?'block':'none';
}
function psLeagueChange(){
  const checked=Array.from(document.querySelectorAll('#psLeaguePicker input:checked'));
  const label=$('psLeagueBtnLabel');
  if(checked.length===0) label.textContent='Select leagues…';
  else if(checked.length===1) label.textContent=checked[0].closest('label').textContent.trim();
  else label.textContent=checked.length+' leagues selected';
  psLoad();
}
function psLeagueSelectAll(){
  document.querySelectorAll('#psLeaguePicker input').forEach(c=>c.checked=true);
  psLeagueChange();
}
function psLeagueClearAll(){
  document.querySelectorAll('#psLeaguePicker input').forEach(c=>c.checked=false);
  $('psLeagueBtnLabel').textContent='Select leagues…';
}
// Close picker when clicking outside
document.addEventListener('click',e=>{
  const dd=$('psLeagueDropdown');
  if(dd && !dd.contains(e.target)) $('psLeaguePicker').style.display='none';
});
async function psLoad(){
  // Always reset before fetching — prevents stale data being stuck after first load
  PS.loaded = false;
  PS.players = [];
  // Debounce: if already loading, skip
  if(PS._loading){ return; }
  PS._loading = true;
  // Collect all selected leagues from the multi-select
  const selectedLeagues = Array.from(document.querySelectorAll('#psLeaguePicker input[type=checkbox]:checked')).map(c=>c.value);
  const leagues = selectedLeagues.length ? selectedLeagues : ['39'];
  const season=$('psSeason')?.value||'2026';
  psSetStatus('Loading\u2026','var(--accent)');
  ['psGK','psDEF','psMID','psFWD','psHero','psAwards','psTable'].forEach(id=>{ if($(id)) $(id).innerHTML='<div class="empty" style="padding:20px;font-size:12px">Loading player data\u2026</div>'; });

  // ── PSL special fetch (our own endpoint, not Kasi Sports News top-scorers) ──
  const pslSelected = leagues.includes('288');
  const nonPslLeagues = leagues.filter(l => l !== '288');

  // PSL player data injected into the player map later
  let pslPlayers = [];
  if (pslSelected) {
    try {
      const pslData = await get('/players/psl', { season });
      pslPlayers = pslData.players || [];
    } catch(e) { console.warn('PSL player fetch failed:', e.message); }
  }

  try {
    // Fetch all non-PSL selected leagues in parallel
    const _t = null; // cached
    const allFetches = nonPslLeagues.flatMap(league => [
      get('/players/top-scorers', {league, season}),
      get('/players/top-assists', {league, season}),
      get('/players/top-saves',   {league, season}),
    ]);
    const allResults = await Promise.allSettled(allFetches);
    // Group: every 3 results = [scorers, assisters, saves] per league
    const scorers   = { status:'fulfilled', value:{ response: allResults.filter((_,i)=>i%3===0).flatMap(r=>r.value?.response||r.value?.players||[]) }};
    const assisters = { status:'fulfilled', value:{ response: allResults.filter((_,i)=>i%3===1).flatMap(r=>r.value?.response||r.value?.players||[]) }};
    const gkStats   = { status:'fulfilled', value:{ response: allResults.filter((_,i)=>i%3===2).flatMap(r=>r.value?.response||r.value?.players||[]) }};

    // Merge all player data into a unified list
    const playerMap = {};
    const addPlayers = (data, type) => {
      const list = data?.players || data?.response || data || [];
      list.forEach(entry => {
        const pl = entry.player || entry;
        const st = (entry.statistics||[entry.statistics]||[])[0] || {};
        const id = pl.id || pl.name;
        if(!id) return;
        if(!playerMap[id]){
          playerMap[id] = {
            id, name: pl.name||'Unknown', team: st.team?.name||pl.team||'—',
            photo: pl.photo||'', nationality: pl.nationality||'',
            position: psClassify(st.games?.position||pl.position||''),
            stats:{
              appearances: st.games?.appearences||st.games?.appearances||0,
              goals: st.goals?.total||0,
              assists: st.goals?.assists||0,
              rating: parseFloat(st.games?.rating||0)||6.0,
              saves: st.goals?.saves||0,
              cleanSheets: st.goals?.conceded===0?1:(st.games?.appearences||1)>0?(st.goals?.saves>0?Math.floor((st.goals?.saves||0)/5):0):0,
              shots: st.shots?.total||0,
              shotsOn: st.shots?.on||0,
              keyPasses: st.passes?.key||0,
              tackles: st.tackles?.total||0,
              interceptions: st.tackles?.interceptions||0,
              dribbles: st.dribbles?.success||0,
              yellowCards: st.cards?.yellow||0,
              redCards: st.cards?.red||0,
            }
          };
        } else {
          // Merge additional data
          const existing = playerMap[id].stats;
          if(type==='assists') existing.assists = Math.max(existing.assists, st.goals?.assists||0);
          if(type==='saves'){
            existing.saves = Math.max(existing.saves, st.goals?.saves||0);
            existing.cleanSheets = st.goals?.saves>0?Math.floor((st.goals?.saves||0)/4):existing.cleanSheets;
          }
        }
        playerMap[id].stats.score = psCalcScore(playerMap[id]);
      });
    };

    if(scorers.status==='fulfilled') addPlayers(scorers.value, 'goals');
    if(assisters.status==='fulfilled') addPlayers(assisters.value, 'assists');
    if(gkStats.status==='fulfilled') addPlayers(gkStats.value, 'saves');

    // ── Merge PSL players (from /players/psl) into the playerMap ──
    if (pslPlayers.length) {
      pslPlayers.forEach(p => {
        const id = p.id || p.name;
        if (!id) return;
        if (!playerMap[id]) {
          playerMap[id] = {
            id, name: p.name, photo: p.photo || '',
            team: { name: p.team || '', logo: '' },
            league: { name: ' PSL South Africa', flag: '', id: 288 },
            stats: {
              position: p.position || 'MID',
              appearances: p.appearances || 0,
              goals: p.goals || 0,
              assists: p.assists || 0,
              rating: p.rating || 6.0,
              saves: 0, cleanSheets: 0,
              shots: p.shotsTotal || 0, shotsOn: 0,
              keyPasses: p.keyPasses || 0,
              tackles: 0, interceptions: 0,
              dribbles: p.dribbles || 0,
              yellowCards: p.yellow || 0,
              redCards: p.red || 0,
              score: 0,
            }
          };
        }
        playerMap[id].stats.score = psCalcScore(playerMap[id]);
      });
    }

    PS.players = Object.values(playerMap);
    PS.players.forEach(p=>{ p.stats.score = psCalcScore(p); });
    PS.loaded = true;

    const total = PS.players.length;
    if(total === 0){
      psSetStatus('No data available','var(--red)');
      psShowFallback();
      return;
    }
    psSetStatus(`${total} players · Updated ${new Date().toLocaleTimeString()}`, 'var(--green)');
    psRenderAll();

  } catch(e){
    psSetStatus('Server error — using demo data','var(--yellow)');
    log('Player stats error: '+e.message);
    psShowFallback();
  } finally {
    PS._loading = false;
  }
}

// ---- Fallback demo data when server doesn't have player endpoints ----
function psShowFallback(){
  const demo = [
    // GK
    {id:1,name:'Alisson Becker',team:'Liverpool',position:'GK',stats:{appearances:28,goals:0,assists:1,rating:7.8,saves:94,cleanSheets:12,shots:0,shotsOn:0,keyPasses:0,tackles:0,interceptions:0,dribbles:0,yellowCards:0,redCards:0}},
    {id:2,name:'David Raya',team:'Arsenal',position:'GK',stats:{appearances:26,goals:0,assists:0,rating:7.6,saves:88,cleanSheets:10,shots:0,shotsOn:0,keyPasses:0,tackles:0,interceptions:0,dribbles:0,yellowCards:1,redCards:0}},
    {id:3,name:'Nick Pope',team:'Newcastle',position:'GK',stats:{appearances:22,goals:0,assists:0,rating:7.4,saves:82,cleanSheets:8,shots:0,shotsOn:0,keyPasses:0,tackles:0,interceptions:0,dribbles:0,yellowCards:0,redCards:0}},
    // DEF
    {id:4,name:'Trent Alexander-Arnold',team:'Liverpool',position:'DEF',stats:{appearances:29,goals:3,assists:10,rating:7.9,saves:0,cleanSheets:10,shots:28,shotsOn:12,keyPasses:56,tackles:42,interceptions:18,dribbles:24,yellowCards:3,redCards:0}},
    {id:5,name:'Virgil van Dijk',team:'Liverpool',position:'DEF',stats:{appearances:30,goals:4,assists:2,rating:7.7,saves:0,cleanSheets:12,shots:22,shotsOn:9,keyPasses:12,tackles:58,interceptions:32,dribbles:8,yellowCards:2,redCards:0}},
    {id:6,name:'William Saliba',team:'Arsenal',position:'DEF',stats:{appearances:30,goals:2,assists:1,rating:7.8,saves:0,cleanSheets:11,shots:18,shotsOn:7,keyPasses:8,tackles:66,interceptions:40,dribbles:12,yellowCards:2,redCards:0}},
    {id:7,name:'Pedro Porro',team:'Spurs',position:'DEF',stats:{appearances:27,goals:2,assists:7,rating:7.3,saves:0,cleanSheets:6,shots:24,shotsOn:10,keyPasses:34,tackles:44,interceptions:22,dribbles:18,yellowCards:4,redCards:0}},
    {id:8,name:'Marc Cucurella',team:'Chelsea',position:'DEF',stats:{appearances:28,goals:1,assists:4,rating:7.1,saves:0,cleanSheets:7,shots:14,shotsOn:5,keyPasses:22,tackles:52,interceptions:30,dribbles:16,yellowCards:5,redCards:0}},
    {id:9,name:'Lewis Dunk',team:'Brighton',position:'DEF',stats:{appearances:29,goals:2,assists:1,rating:7.0,saves:0,cleanSheets:6,shots:16,shotsOn:6,keyPasses:6,tackles:60,interceptions:35,dribbles:4,yellowCards:3,redCards:0}},
    // MID
    {id:10,name:'Martin Ødegaard',team:'Arsenal',position:'MID',stats:{appearances:24,goals:8,assists:10,rating:8.0,saves:0,cleanSheets:0,shots:44,shotsOn:22,keyPasses:74,tackles:28,interceptions:12,dribbles:36,yellowCards:2,redCards:0}},
    {id:11,name:'Rodri',team:'Man City',position:'MID',stats:{appearances:26,goals:4,assists:8,rating:8.2,saves:0,cleanSheets:0,shots:36,shotsOn:14,keyPasses:68,tackles:62,interceptions:28,dribbles:22,yellowCards:4,redCards:0}},
    {id:12,name:'Bruno Fernandes',team:'Man Utd',position:'MID',stats:{appearances:30,goals:9,assists:7,rating:7.4,saves:0,cleanSheets:0,shots:62,shotsOn:28,keyPasses:82,tackles:24,interceptions:10,dribbles:30,yellowCards:6,redCards:0}},
    {id:13,name:'Cole Palmer',team:'Chelsea',position:'MID',stats:{appearances:29,goals:20,assists:9,rating:8.1,saves:0,cleanSheets:0,shots:88,shotsOn:44,keyPasses:66,tackles:18,interceptions:8,dribbles:58,yellowCards:1,redCards:0}},
    {id:14,name:'Declan Rice',team:'Arsenal',position:'MID',stats:{appearances:30,goals:7,assists:8,rating:7.9,saves:0,cleanSheets:0,shots:42,shotsOn:18,keyPasses:52,tackles:72,interceptions:34,dribbles:28,yellowCards:5,redCards:0}},
    {id:15,name:'Phil Foden',team:'Man City',position:'MID',stats:{appearances:28,goals:14,assists:8,rating:7.8,saves:0,cleanSheets:0,shots:76,shotsOn:36,keyPasses:58,tackles:16,interceptions:6,dribbles:48,yellowCards:2,redCards:0}},
    // FWD
    {id:16,name:'Erling Haaland',team:'Man City',position:'FWD',stats:{appearances:28,goals:24,assists:5,rating:8.4,saves:0,cleanSheets:0,shots:112,shotsOn:68,keyPasses:18,tackles:4,interceptions:2,dribbles:22,yellowCards:2,redCards:0}},
    {id:17,name:'Mohamed Salah',team:'Liverpool',position:'FWD',stats:{appearances:30,goals:22,assists:14,rating:8.6,saves:0,cleanSheets:0,shots:98,shotsOn:56,keyPasses:62,tackles:10,interceptions:4,dribbles:54,yellowCards:1,redCards:0}},
    {id:18,name:'Dominic Solanke',team:'Spurs',position:'FWD',stats:{appearances:28,goals:14,assists:6,rating:7.3,saves:0,cleanSheets:0,shots:74,shotsOn:38,keyPasses:24,tackles:8,interceptions:2,dribbles:20,yellowCards:3,redCards:0}},
    {id:19,name:'Ollie Watkins',team:'Aston Villa',position:'FWD',stats:{appearances:28,goals:16,assists:8,rating:7.6,saves:0,cleanSheets:0,shots:82,shotsOn:44,keyPasses:28,tackles:6,interceptions:2,dribbles:26,yellowCards:2,redCards:0}},
  ];
  demo.forEach(p=>{ p.stats.score = psCalcScore(p); });
  PS.players = demo;
  PS.loaded = true;
  PS._loading = false;
  psSetStatus(`Demo data · ${demo.length} players (connect server for live data)`,'var(--yellow)');
  psRenderAll();
}

let psSortKey='score';
function psSortBy(key){
  psSortKey=key;
  document.querySelectorAll('[id^="psSort_"]').forEach(b=>b.classList.remove('active'));
  $('psSort_'+key)?.classList.add('active');
  if(PS.loaded) psRenderAll();
}

function psRenderAll(){
  const all = PS.players;
  const byPos = pos => all.filter(p=>p.position===pos)
    .sort((a,b)=>(b.stats[psSortKey]||b.stats.score||0)-(a.stats[psSortKey]||a.stats.score||0));

  const gks  = byPos('GK').slice(0,3);
  const defs = byPos('DEF').slice(0,6);
  const mids = byPos('MID').slice(0,6);
  const fwds = byPos('FWD').slice(0,4);

  // Hero strip — top performer from each position
  const heroes = [gks[0],defs[0],mids[0],fwds[0]].filter(Boolean);
  const heroColors = {GK:'var(--yellow)',DEF:'var(--accent)',MID:'var(--purple)',FWD:'var(--green)'};
  const heroLabels = {GK:' Best GK',DEF:' Best DEF',MID:' Best MID',FWD:' Best FWD'};
  const maxScore = Math.max(...heroes.map(p=>p.stats.score));
  $('psHero').innerHTML = heroes.map(p=>{
    const col = heroColors[p.position]||'var(--accent)';
    const lbl = heroLabels[p.position]||p.position;
    const sc = p.stats.score.toFixed(1);
    const barW = maxScore>0?(p.stats.score/maxScore*100).toFixed(0):50;
    const s = p.stats;
    const pills = p.position==='GK'
      ? `<span class="ps-stat-pill"><b>${s.saves}</b> saves</span><span class="ps-stat-pill"><b>${s.cleanSheets}</b> clean sheets</span><span class="ps-stat-pill"><b>${s.rating?.toFixed(1)||'—'}</b> rating</span>`
      : p.position==='DEF'
      ? `<span class="ps-stat-pill"><b>${s.goals}</b>G <b>${s.assists}</b>A</span><span class="ps-stat-pill"><b>${s.tackles}</b> tackles</span><span class="ps-stat-pill"><b>${s.cleanSheets}</b> CS</span>`
      : p.position==='MID'
      ? `<span class="ps-stat-pill"><b>${s.goals}</b>G <b>${s.assists}</b>A</span><span class="ps-stat-pill"><b>${s.keyPasses}</b> key passes</span><span class="ps-stat-pill"><b>${s.rating?.toFixed(1)||'—'}</b> rating</span>`
      : `<span class="ps-stat-pill"><b>${s.goals}</b> goals</span><span class="ps-stat-pill"><b>${s.assists}</b> assists</span><span class="ps-stat-pill"><b>${s.shotsOn}</b> shots on</span>`;
    return `<div class="ps-hero-card" data-kasi-player-id="${Number(p.id||0)}" data-kasi-player-name="${esc(p.name||'')}" style="border-color:${col}30;cursor:${p.id?'pointer':'default'}">
      <div class="ps-rank" style="color:${col}">1</div>
      <div class="ps-pos-badge" style="background:${col}20;color:${col}">${lbl}</div>
      <div class="ps-hname">${esc(p.name)}</div>
      <div class="ps-hteam">${esc(p.team)}</div>
      <div class="ps-score-big" style="color:${col}">${sc}<span style="font-size:12px;font-weight:400;color:var(--muted)"> pts</span></div>
      <div class="ps-score-bar-wrap"><div class="ps-score-bar" style="width:${barW}%;background:${col}"></div></div>
      <div class="ps-stats-row">${pills}</div>
    </div>`;
  }).join('');

  // Position sections
  const medals = ['','','','4⃣','5⃣','6⃣'];
  const renderPosSection = (players, elId) => {
    if(!$(elId)) return;
    const maxSc = Math.max(...players.map(p=>p.stats.score), 1);
    $(elId).innerHTML = players.map((p,i)=>{
      const s = p.stats, sc = s.score.toFixed(1);
      const barW = (s.score/maxSc*100).toFixed(0);
      const pos = p.position;
      const col = heroColors[pos]||'var(--accent)';
      let statStr = '';
      if(pos==='GK') statStr=`${s.saves} saves · ${s.cleanSheets} CS · ${s.appearances} apps · Avg ${s.rating?.toFixed(1)||'—'}`;
      else if(pos==='DEF') statStr=`${s.goals}G ${s.assists}A · ${s.tackles} tackles · ${s.interceptions} intercepts · ${s.cleanSheets} CS`;
      else if(pos==='MID') statStr=`${s.goals}G ${s.assists}A · ${s.keyPasses} KP · ${s.dribbles} dribbles · Avg ${s.rating?.toFixed(1)||'—'}`;
      else statStr=`${s.goals} goals · ${s.assists}A · ${s.shotsOn} shots on · ${s.dribbles} dribbles`;
      return `<div class="ps-player-row" data-kasi-player-id="${Number(p.id||0)}" data-kasi-player-name="${esc(p.name||'')}" style="cursor:${p.id?'pointer':'default'}">
        <div class="ps-medal">${medals[i]||i+1}</div>
        <div>
          <div class="ps-pname">${esc(p.name)}</div>
          <div class="ps-pteam">${esc(p.team)}</div>
          <div class="ps-pstats">${statStr}</div>
          <div class="ps-score-bar-wrap" style="margin-top:4px"><div class="ps-score-bar" style="width:${barW}%;background:${col}"></div></div>
        </div>
        <div>
          <div class="ps-prating" style="color:${col}">${sc}<small>score</small></div>
        </div>
      </div>`;
    }).join('');
  };
  renderPosSection(gks,  'psGK');
  renderPosSection(defs, 'psDEF');
  renderPosSection(mids, 'psMID');
  renderPosSection(fwds, 'psFWD');

  // Award leaders strip
  const topGoals   = [...all].sort((a,b)=>b.stats.goals-a.stats.goals)[0];
  const topAssists = [...all].sort((a,b)=>b.stats.assists-a.stats.assists)[0];
  const topSaves   = [...all].filter(p=>p.position==='GK').sort((a,b)=>b.stats.saves-a.stats.saves)[0];
  const topRating  = [...all].sort((a,b)=>b.stats.rating-a.stats.rating)[0];
  const topCS      = [...all].sort((a,b)=>b.stats.cleanSheets-a.stats.cleanSheets)[0];
  const topTackles = [...all].sort((a,b)=>b.stats.tackles-a.stats.tackles)[0];
  const topKP      = [...all].sort((a,b)=>b.stats.keyPasses-a.stats.keyPasses)[0];
  const topDrib    = [...all].sort((a,b)=>b.stats.dribbles-a.stats.dribbles)[0];

  const awards = [
    {icon:'',title:'Top Scorer',player:topGoals,val:topGoals?.stats.goals,unit:'goals',col:'var(--green)'},
    {icon:'',title:'Top Assist',player:topAssists,val:topAssists?.stats.assists,unit:'assists',col:'var(--purple)'},
    {icon:'',title:'Most Saves',player:topSaves,val:topSaves?.stats.saves,unit:'saves',col:'var(--yellow)'},
    {icon:'',title:'Most Clean Sheets',player:topCS,val:topCS?.stats.cleanSheets,unit:'CS',col:'var(--accent)'},
    {icon:'⭐',title:'Highest Rating',player:topRating,val:topRating?.stats.rating?.toFixed(2),unit:'avg',col:'var(--orange)'},
    {icon:'',title:'Most Tackles',player:topTackles,val:topTackles?.stats.tackles,unit:'tackles',col:'var(--red)'},
    {icon:'',title:'Key Passes',player:topKP,val:topKP?.stats.keyPasses,unit:'KP',col:'var(--accent)'},
    {icon:'',title:'Most Dribbles',player:topDrib,val:topDrib?.stats.dribbles,unit:'drib',col:'var(--purple)'},
  ];
  $('psAwards').style.gridTemplateColumns='repeat(4,1fr)';
  $('psAwards').innerHTML = awards.map(aw=>{
    if(!aw.player) return '';
    return `<div class="ps-award-card" data-kasi-player-id="${Number(aw.player.id||0)}" data-kasi-player-name="${esc(aw.player.name||'')}" style="border-color:${aw.col}30;cursor:${aw.player.id?'pointer':'default'}">
      <div class="ps-award-icon">${aw.icon}</div>
      <div class="ps-award-title">${aw.title}</div>
      <div class="ps-award-name">${esc(aw.player.name)}</div>
      <div class="ps-award-val" style="color:${aw.col}">${aw.val}</div>
      <div class="ps-award-team">${esc(aw.player.team)} · ${aw.unit}</div>
    </div>`;
  }).join('');

  // Full ranked table
  const sortedAll = [...all].sort((a,b)=>(b.stats[psSortKey]||b.stats.score)-(a.stats[psSortKey]||a.stats.score));
  const posCol = {GK:'var(--yellow)',DEF:'var(--accent)',MID:'var(--purple)',FWD:'var(--green)'};
  const maxSc2 = Math.max(...sortedAll.map(p=>p.stats.score),1);
  $('psTable').innerHTML = `<table class="table" style="min-width:900px"><thead><tr>
    <th>#</th><th>Player</th><th>Team</th><th>Pos</th>
    <th>G</th><th>A</th><th>G+A</th><th>Saves</th><th>CS</th><th>Tackles</th><th>Key P</th><th>Rating</th><th>Apps</th><th>Score</th>
  </tr></thead><tbody>${sortedAll.map((p,i)=>{
    const s=p.stats; const col=posCol[p.position]||'var(--muted)';
    const barW=(s.score/maxSc2*100).toFixed(0);
    const rc = s.rating>=8?'var(--green)':s.rating>=7?'var(--accent)':s.rating>=6?'var(--yellow)':'var(--muted)';
    return `<tr data-kasi-player-id="${Number(p.id||0)}" data-kasi-player-name="${esc(p.name||'')}" style="cursor:${p.id?'pointer':'default'}">
      <td style="color:var(--muted);font-size:11px">${i<3?['','',''][i]:i+1}</td>
      <td><b>${esc(p.name)}</b>${s.yellowCards>0?` <span style="font-size:9px">${s.yellowCards}</span>`:''}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(p.team)}</td>
      <td><span style="font-size:9px;font-weight:700;color:${col};background:${col}18;padding:2px 6px;border-radius:4px;text-transform:uppercase">${p.position}</span></td>
      <td><b style="color:${s.goals>0?'var(--green)':'var(--muted)'}">${s.goals}</b></td>
      <td><b style="color:${s.assists>0?'var(--purple)':'var(--muted)'}">${s.assists}</b></td>
      <td><b style="color:${(s.goals+s.assists)>0?'var(--accent)':'var(--muted)'}">${s.goals+s.assists}</b></td>
      <td>${p.position==='GK'?`<b style="color:var(--yellow)">${s.saves}</b>`:'<span style="color:var(--muted)">—</span>'}</td>
      <td>${s.cleanSheets>0?`<b style="color:var(--accent)">${s.cleanSheets}</b>`:'<span style="color:var(--muted)">0</span>'}</td>
      <td>${s.tackles>0?s.tackles:'<span style="color:var(--muted)">—</span>'}</td>
      <td>${s.keyPasses>0?s.keyPasses:'<span style="color:var(--muted)">—</span>'}</td>
      <td><b style="color:${rc}">${s.rating?.toFixed(2)||'—'}</b></td>
      <td style="color:var(--muted)">${s.appearances}</td>
      <td>
        <div style="display:grid;grid-template-columns:40px 1fr;gap:4px;align-items:center">
          <b style="color:${col}">${s.score.toFixed(1)}</b>
          <div class="ps-score-bar-wrap"><div class="ps-score-bar" style="width:${barW}%;background:${col}"></div></div>
        </div>
      </td>
    </tr>`;
  }).join('')}</tbody></table>`;
}


/* ═══════════════════════════════════════════════════════════════════
   LEAGUE TABLE 2026/27
═══════════════════════════════════════════════════════════════════ */
async function loadLeagueTable() {
  const league = document.getElementById('ltLeagueSelect')?.value || 'ALL';
  const status = document.getElementById('ltStatus');
  const content = document.getElementById('ltContent');
  if (!content) return;
  status.textContent = 'Loading 2026/27 standings…';
  content.innerHTML = '<div class="empty" style="padding:30px;text-align:center">Fetching league table data…</div>';
  try {
    const data = await get('/standings/2026-27', { league });
    const leagues = data.leagues || [];
    if (!leagues.length) {
      content.innerHTML = '<div class="empty" style="padding:30px;text-align:center">No standings data returned. Season may not have started yet.</div>';
      status.textContent = 'No data available.';
      return;
    }
    let html = '';
    for (const lg of leagues) {
      if (!lg.table || !lg.table.length) continue;
      html += `
        <div style="margin-bottom:22px">
          <h3 style="margin:0 0 8px;font-size:15px;color:var(--accent)">${lg.league} <span style="font-size:11px;color:var(--muted);font-weight:400">· 2026/27</span></h3>
          <div class="tablewrap">
            <table class="table" style="min-width:680px">
              <thead><tr>
                <th style="width:30px">#</th>
                <th>Club</th>
                <th>MP</th><th>W</th><th>D</th><th>L</th>
                <th>GF</th><th>GA</th><th>GD</th>
                <th>Pts</th>
                <th>Form</th>
                <th style="max-width:140px">Status</th>
              </tr></thead>
              <tbody>
                ${lg.table.map(row => {
                  const formDots = (row.form || '').split('').map(c => {
                    const col = c === 'W' ? 'var(--green)' : c === 'D' ? '#fbbf24' : 'var(--red)';
                    return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col};margin:0 1px" title="${c}"></span>`;
                  }).join('');
                  const descColor = row.description && row.description.includes('Champion') ? '#fbbf24'
                    : row.description && row.description.includes('Relegation') ? 'var(--red)'
                    : row.description && (row.description.includes('Europa') || row.description.includes('Champions')) ? '#06b6d4'
                    : 'var(--muted)';
                  const gdStr = row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff;
                  return `<tr>
                    <td style="font-weight:700;color:var(--muted)">${row.rank}</td>
                    <td style="font-weight:700">${row.logo ? `<img src="${row.logo}" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;border-radius:2px" loading="lazy" decoding="async" fetchpriority="low">` : ''}${row.team}</td>
                    <td>${row.played}</td>
                    <td style="color:var(--green)">${row.win}</td>
                    <td style="color:#fbbf24">${row.draw}</td>
                    <td style="color:var(--red)">${row.lose}</td>
                    <td>${row.goalsFor}</td>
                    <td>${row.goalsAgainst}</td>
                    <td style="font-weight:700;color:${row.goalDiff >= 0 ? 'var(--green)' : 'var(--red)'}">${gdStr}</td>
                    <td style="font-weight:900;font-size:15px">${row.points}</td>
                    <td>${formDots}</td>
                    <td style="font-size:10px;color:${descColor}">${row.description || ''}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    }
    content.innerHTML = html || '<div class="empty" style="padding:30px;text-align:center">No table data available yet.</div>';
    status.textContent = `Loaded ${leagues.filter(l=>l.table?.length).length} league(s) · Season 2026/27 · ${new Date().toLocaleTimeString()}`;
  } catch(e) {
    content.innerHTML = `<div class="empty" style="padding:30px;text-align:center;color:var(--red)">Failed to load standings: ${e.message}</div>`;
    status.textContent = 'Error loading data.';
  }
}

/* ═══════════════════════════════════════════════════════════════════
   EXPECTED SCORERS ≥80%
═══════════════════════════════════════════════════════════════════ */
async function loadExpectedScorers() {
  const minChance = parseFloat(document.getElementById('esMinChance')?.value || 80);
  const status  = document.getElementById('esStatus');
  const content = document.getElementById('esContent');
  if (!content) return;
  status.textContent = `Loading scorers with ≥${minChance}% chance…`;
  content.innerHTML = '<div class="empty" style="padding:30px;text-align:center">Scanning predictions…</div>';
  try {
    const data = await get('/players/expected-scorers', { min_chance: minChance, _t: Date.now() });
    const scorers = data.scorers || [];
    status.textContent = `Found ${data.count} fixture(s) meeting ≥${minChance}% threshold · ${new Date().toLocaleTimeString()}`;
    if (!scorers.length) {
      content.innerHTML = `<div class="empty" style="padding:30px;text-align:center">No fixtures currently meet the ≥${minChance}% goalscorer probability threshold.<br><span style="font-size:11px;color:var(--muted)">Try lowering the minimum or check back once more predictions are saved.</span></div>`;
      return;
    }
    const rows = scorers.map(s => {
      const pctColor = s.impliedPct >= 95 ? 'var(--green)' : s.impliedPct >= 90 ? '#06b6d4' : '#fbbf24';
      const barW = Math.min(100, s.impliedPct);
      const kickoff = s.kickoff ? new Date(s.kickoff.replace(' ','T')).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
      return `
        <tr>
          <td style="font-weight:700">${s.fixture}</td>
          <td style="color:var(--muted);font-size:11px">${kickoff}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:8px;background:var(--panel2);border-radius:4px;min-width:80px">
                <div style="width:${barW}%;height:100%;border-radius:4px;background:${pctColor};transition:width .4s"></div>
              </div>
              <b style="color:${pctColor};font-size:15px;min-width:44px;text-align:right">${s.impliedPct}%</b>
            </div>
          </td>
          <td style="color:var(--muted);font-size:11px">${s.oddsDecimal.toFixed(2)} odds</td>
        </tr>`;
    }).join('');
    content.innerHTML = `
      <div class="tablewrap">
        <table class="table" style="min-width:600px">
          <thead><tr>
            <th>Fixture</th>
            <th>Kickoff</th>
            <th>Implied Goalscorer Probability</th>
            <th>Odds</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="margin-top:10px;font-size:11px;color:var(--muted)">
         Probabilities are derived from bookmaker decimal odds (100÷odds). Only fixtures with savedpredictions in the learning database are shown.
      </div>`;
  } catch(e) {
    content.innerHTML = `<div class="empty" style="padding:30px;text-align:center;color:var(--red)">Error: ${e.message}</div>`;
    status.textContent = 'Error loading data.';
  }
}

/* Auto-load when tabs are opened */
(function() {
  const _origST = window.showTab;
  window.showTab = function(id, btn) {
    if (typeof _origST === 'function') _origST(id, btn);
    if (id === 'leaguetable') loadLeagueTable();
    if (id === 'expectedscorers') loadExpectedScorers();
  };
})();


/* ═══════════════════════════════════════════════════════════════════
   HIGH SCORING FIXTURES
═══════════════════════════════════════════════════════════════════ */
let _hsData = [];
let _hsSortKey = 'highScoringScore';

function hsSortBy(key) {
  _hsSortKey = key;
  document.querySelectorAll('#hsSort button').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('hsSort_' + {
    highScoringScore:'score', xgTotal:'xg', over35Pct:'o35', over25Pct:'o25', bttsPct:'btts'
  }[key]);
  if (btn) btn.classList.add('active');
  renderHighScoring(_hsData);
}

function renderHighScoring(fixtures) {
  const el = document.getElementById('hsContent');
  if (!el) return;
  if (!fixtures || !fixtures.length) {
    el.innerHTML = '<div class="empty" style="padding:30px;text-align:center">No fixtures meet the current thresholds. Try lowering the filters.</div>';
    return;
  }
  const sorted = [...fixtures].sort((a,b) => (b[_hsSortKey]||0) - (a[_hsSortKey]||0));

  const cards = sorted.map(f => {
    const score    = (f.highScoringScore||0).toFixed(1);
    const scoreCol = f.highScoringScore >= 75 ? 'var(--green)' : f.highScoringScore >= 60 ? '#06b6d4' : '#fbbf24';
    const xgBar    = w => `<div style="flex:1;height:6px;background:var(--panel2);border-radius:3px;overflow:hidden"><div style="width:${Math.min(w/5*100,100)}%;height:100%;background:#38bdf8;border-radius:3px"></div></div>`;
    const pctBar   = (v, col) => `<div style="flex:1;height:6px;background:var(--panel2);border-radius:3px;overflow:hidden"><div style="width:${Math.min(v,100)}%;height:100%;background:${col};border-radius:3px"></div></div>`;
    const kickoff  = f.kickoff ? new Date(f.kickoff.replace(' ','T')).toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
    const bkBadge  = f.hasBookmakerOdds
      ? `<span style="background:#06b6d426;color:#06b6d4;font-size:9px;font-weight:700;padding:2px 6px;border-radius:999px"> BOOKMAKER</span>`
      : `<span style="background:#fbbf2426;color:#fbbf24;font-size:9px;font-weight:700;padding:2px 6px;border-radius:999px"> MODEL ONLY</span>`;
    const bkOver25 = f.bkOver25Pct ? `<span style="color:var(--muted);font-size:10px">Bkm Over 2.5: <b style="color:var(--accent)">${f.bkOver25Pct}%</b></span>` : '';

    return `
      <div class="card" style="margin-bottom:10px;border-left:3px solid ${scoreCol};padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              ${bkBadge}
              <span style="font-size:10px;color:var(--muted)">${f.league||''}</span>
            </div>
            <div style="font-size:17px;font-weight:800;margin-bottom:2px">${f.home} <span style="color:var(--muted);font-weight:400">vs</span> ${f.away}</div>
            <div style="font-size:11px;color:var(--muted)">${kickoff}</div>
          </div>
          <div style="text-align:center;min-width:70px">
            <div style="font-size:32px;font-weight:900;color:${scoreCol};line-height:1">${score}</div>
            <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">HS Score</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
          <!-- xG column -->
          <div>
            <div style="font-size:10px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Expected Goals</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-size:11px;min-width:80px;color:var(--text)">${f.home?.split(' ').slice(-1)[0]}</span>
              ${xgBar(f.xgHome)}
              <b style="font-size:13px;min-width:32px;text-align:right;color:#8b5cf6">${f.xgHome}</b>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:11px;min-width:80px;color:var(--text)">${f.away?.split(' ').slice(-1)[0]}</span>
              ${xgBar(f.xgAway)}
              <b style="font-size:13px;min-width:32px;text-align:right;color:#06b6d4">${f.xgAway}</b>
            </div>
            <div style="font-size:12px;color:var(--muted)">Total xG: <b style="color:var(--text);font-size:14px">${f.xgTotal}</b></div>
          </div>

          <!-- Probability column -->
          <div>
            <div style="font-size:10px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Goal Probabilities</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              <span style="font-size:10px;color:var(--muted);min-width:56px">Over 3.5</span>
              ${pctBar(f.over35Pct,'var(--red)')}
              <b style="font-size:12px;min-width:38px;text-align:right;color:var(--red)">${f.over35Pct}%</b>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              <span style="font-size:10px;color:var(--muted);min-width:56px">Over 2.5</span>
              ${pctBar(f.over25Pct,'#fbbf24')}
              <b style="font-size:12px;min-width:38px;text-align:right;color:#fbbf24">${f.over25Pct}%</b>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              <span style="font-size:10px;color:var(--muted);min-width:56px">BTTS</span>
              ${pctBar(f.bttsPct,'var(--green)')}
              <b style="font-size:12px;min-width:38px;text-align:right;color:var(--green)">${f.bttsPct}%</b>
            </div>
            ${bkOver25}
          </div>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = cards;
}

async function loadHighScoring() {
  const league    = document.getElementById('hsLeague')?.value    || 'ALL';
  const minXg     = parseFloat(document.getElementById('hsMinXg')?.value     || 2.5);
  const minOver25 = parseFloat(document.getElementById('hsMinOver25')?.value || 55);
  const status    = document.getElementById('hsStatus');
  const el        = document.getElementById('hsContent');
  if (!el) return;

  status.textContent = 'Fetching fixtures and computing xG…';
  el.innerHTML = '<div class="empty" style="padding:30px;text-align:center">Analysing goal-scoring potential across fixtures…</div>';

  try {
    const data = await get('/fixtures/high-scoring', {
      league, min_xg: minXg, min_over25: minOver25, limit: 50,
    });
    _hsData = data.fixtures || [];
    status.textContent = `${data.count} fixture(s) · min xG ${minXg} · min Over 2.5: ${minOver25}% · ${new Date().toLocaleTimeString()}`;
    renderHighScoring(_hsData);
  } catch(e) {
    el.innerHTML = `<div class="empty" style="padding:30px;text-align:center;color:var(--red)">Error: ${e.message}</div>`;
    status.textContent = 'Failed to load.';
  }
}

/* Hook into showTab */
(function(){
  const prev = window.showTab;
  window.showTab = function(id, btn) {
    if (typeof prev === 'function') prev(id, btn);
    if (id === 'highscoring') loadHighScoring();
  };
})();


(function(){
  'use strict';

  /* ── Config ─────────────────────────────────────────────────────────── */
  const LLM_MODEL      = 'claude-sonnet-4-6';
  const LLM_MAX_TOKENS = 700;
  const LLM_MIN_SHIFT  = 3.0;   // pp — ignore adjustments smaller than this
  const LLM_CACHE_MS   = 90 * 60 * 1000;  // 90-minute in-memory cache
  const _cache         = new Map();        // fixtureId → { result, ts }

  /* ── Prompt builder ──────────────────────────────────────────────────── */
  function buildPrompt(m, adaptedWeights) {
    const home   = m.home || m.homeTeam || 'Home';
    const away   = m.away || m.awayTeam || 'Away';
    const league = m.league || m.leagueName || 'Unknown League';
    const ko     = m.datetime || m.kickoff || '';

    const pred   = m.prediction || {};
    const probs  = pred.probabilities || {};
    const hw     = (probs.homeWin  ?? 0).toFixed(1);
    const dw     = (probs.draw     ?? 0).toFixed(1);
    const aw     = (probs.awayWin  ?? 0).toFixed(1);

    const gr     = m.goalRating || {};
    const xgH    = (gr.homeExpectedGoals ?? 1.35).toFixed(2);
    const xgA    = (gr.awayExpectedGoals ?? 1.35).toFixed(2);
    const o25    = (probs.over25 ?? 0).toFixed(1);
    const btts   = (probs.btts   ?? 0).toFixed(1);

    const hwr    = m.homeWinRate != null ? (m.homeWinRate * 100).toFixed(1) + '%' : 'N/A';
    const awr    = m.awayWinRate != null ? (m.awayWinRate * 100).toFixed(1) + '%' : 'N/A';
    const hgp    = m.homeGamesPlayed ?? 0;
    const agp    = m.awayGamesPlayed ?? 0;

    const o      = m.odds || {};
    const bkH    = o.homeWin  ? Number(o.homeWin).toFixed(2)  : 'N/A';
    const bkD    = o.draw     ? Number(o.draw).toFixed(2)     : 'N/A';
    const bkA    = o.awayWin  ? Number(o.awayWin).toFixed(2)  : 'N/A';
    const bkUsed = pred.bookmakerOddsUsed ? 'Yes' : 'No';

    const wts    = adaptedWeights || {};
    const wO     = ((wts.odds          ?? 0.385) * 100).toFixed(1);
    const wAI    = ((wts.ai            ?? 0.188) * 100).toFixed(1);
    const wTbl   = ((wts.table         ?? 0.111) * 100).toFixed(1);
    const wFrm   = ((wts.currentSeason ?? 0.090) * 100).toFixed(1);

    return `You are a football prediction analyst reviewing the Football AI Model output.

MATCH: ${home} vs ${away}
LEAGUE: ${league}
KICKOFF: ${ko}

FOOTBALL AI MODEL FUSED PROBABILITIES (to review):
  Home Win : ${hw}%
  Draw     : ${dw}%
  Away Win : ${aw}%

MODEL INPUTS:
  xG Home: ${xgH}  xG Away: ${xgA}
  Over 2.5 probability: ${o25}%
  Both teams to score: ${btts}%

TEAM SEASON CONTEXT:
  ${home} — Win rate: ${hwr} over ${hgp} games played
  ${away} — Win rate: ${awr} over ${agp} games played

BOOKMAKER ODDS (decimal):
  Home: ${bkH}  Draw: ${bkD}  Away: ${bkA}
  Bookmaker signal used in model: ${bkUsed}

ADAPTED MODEL WEIGHTS:
  Bookmaker: ${wO}%  |  AI/Poisson: ${wAI}%  |  Table: ${wTbl}%  |  Form: ${wFrm}%

TASK:
Review whether the fused probabilities are well-calibrated. Consider: form divergence, xG imbalance, bookmaker vs model agreement, win-rate gap, league context.
If adjustments are warranted, return new probabilities (must sum to 100). If already well-calibrated, return original values.

Respond ONLY with valid JSON (no markdown, no preamble):
{"homeWin":<float>,"draw":<float>,"awayWin":<float>,"reasoning":"<1-2 sentences>","adjustmentMade":<true|false>}`;
  }

  /* ── API call ─────────────────────────────────────────────────────────── */
  async function callLLM(prompt) {
    const resp = await fetch('/ai/prediction-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: LLM_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) throw new Error(`Unable to load analysis (${resp.status})`);
    const data = await resp.json();
    let txt = data.content?.[0]?.text?.trim() || '';
    txt = txt.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(txt);
  }

  /* ── Enhance a single prediction ──────────────────────────────────────── */
  async function enhancePrediction(m, adaptedWeights) {
    const fid = m._afootFixtureId || m.fixtureId || `${m.home}-${m.away}`;
    const cached = _cache.get(fid);
    if (cached && Date.now() - cached.ts < LLM_CACHE_MS) return cached.result;

    const prompt = buildPrompt(m, adaptedWeights);
    const llm = await callLLM(prompt);

    const hw = parseFloat(llm.homeWin ?? 0);
    const dw = parseFloat(llm.draw   ?? 0);
    const aw = parseFloat(llm.awayWin?? 0);
    const total = hw + dw + aw || 100;

    const newProbs = {
      homeWin: +(hw / total * 100).toFixed(1),
      draw:    +(dw / total * 100).toFixed(1),
      awayWin: +(aw / total * 100).toFixed(1),
    };

    const oldProbs = m.prediction?.probabilities || {};
    const oldMax   = Math.max(oldProbs.homeWin ?? 0, oldProbs.draw ?? 0, oldProbs.awayWin ?? 0);
    const newMax   = Math.max(newProbs.homeWin, newProbs.draw, newProbs.awayWin);
    const shift    = Math.abs(newMax - oldMax);

    const applied  = llm.adjustmentMade && shift >= LLM_MIN_SHIFT;

    const result = {
      applied,
      reasoning: llm.reasoning || '',
      newProbs: applied ? newProbs : null,
      shift: +shift.toFixed(1),
    };
    _cache.set(fid, { result, ts: Date.now() });
    return result;
  }

  /* ── Apply result back to S.predictions and re-render ────────────────── */
  function applyEnhancements(enhancements) {
    enhancements.forEach(({ idx, result }) => {
      const m = window.S?.predictions?.[idx];
      if (!m) return;
      m._llmReasoning  = result.reasoning;
      m._llmEnhanced   = result.applied;
      m._llmShift      = result.shift;
      if (result.applied && result.newProbs) {
        const p = m.prediction || (m.prediction = {});
        const old = { ...p.probabilities };
        p.probabilities = { ...(p.probabilities || {}), ...result.newProbs };
        // Recalculate confidence and winner
        const key = Object.entries(result.newProbs).sort((a,b)=>b[1]-a[1])[0][0];
        p.confidence = result.newProbs[key];
        p.winner = key === 'homeWin' ? (m.home || m.homeTeam)
                 : key === 'draw'    ? 'Draw'
                 :                    (m.away || m.awayTeam);
        p.bestPick = p.winner;
        p._llmPreAdjust = old;
      }
    });
    if (typeof window.renderPredictions === 'function') window.renderPredictions();
    injectLLMBadges();
  }

  /* ── Inject reasoning tooltips into rendered rows ─────────────────────── */
  function injectLLMBadges() {
    const tbody = document.querySelector('#predictionList table tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    const preds = window.S?.predictions || [];
    rows.forEach((tr, i) => {
      if (i >= preds.length) return;
      const m = preds[i];
      if (!m._llmReasoning) return;
      // Remove stale badge if re-injected
      tr.querySelectorAll('.llm-badge').forEach(el => el.remove());
      const firstTd = tr.querySelector('td');
      if (!firstTd) return;
      const badge = document.createElement('span');
      badge.className = 'llm-badge';
      badge.title = m._llmReasoning;
      badge.style.cssText = `display:block;font-size:9px;margin-top:3px;cursor:help;
        color:${m._llmEnhanced ? 'var(--purple)' : 'var(--muted)'};`;
      badge.textContent = m._llmEnhanced
        ? ` LLM adjusted +${m._llmShift}pp — hover for reasoning`
        : ` LLM reviewed — no adjustment (shift ${m._llmShift}pp < ${LLM_MIN_SHIFT}pp threshold)`;
      firstTd.appendChild(badge);
    });
  }

  /* ── Main enhance flow ────────────────────────────────────────────────── */
  window.llmEnhancePredictions = async function() {
    const preds = window.S?.predictions;
    if (!preds || !preds.length) {
      alert('No predictions loaded yet. Refresh the dashboard first.');
      return;
    }

    const btn = document.getElementById('llmEnhanceBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enhancing…'; }

    // Get current adapted weights from learning state
    const adaptedWeights = window.S?.learning?.learningCycle?.adaptedWeights
                        || window.S?.learning?.predictionWeights
                        || null;

    let enhanced = 0, reviewed = 0, errors = 0;
    const results = [];

    for (let i = 0; i < preds.length; i++) {
      const m = preds[i];
      if (btn) btn.textContent = `⏳ ${i + 1}/${preds.length}…`;
      try {
        const result = await enhancePrediction(m, adaptedWeights);
        results.push({ idx: i, result });
        reviewed++;
        if (result.applied) enhanced++;
      } catch (err) {
        errors++;
        console.warn('[LLM enhance] fixture', m._afootFixtureId, err.message);
      }
      // Small delay to avoid rate-limiting
      if (i < preds.length - 1) await new Promise(r => setTimeout(r, 300));
    }

    applyEnhancements(results);

    const summary = ` LLM review complete: ${reviewed} reviewed · ${enhanced} adjusted · ${errors} errors`;
    if (typeof window.log === 'function') window.log(summary);
    if (btn) { btn.disabled = false; btn.textContent = ` LLM Enhanced (${enhanced}/${reviewed})`; }
  };

  /* ── Inject the Enhance button into the Prediction Pool card header ───── */
  function injectButton() {
    const header = document.querySelector('#predictions .card div[style*="justify-content:space-between"]');
    if (!header || document.getElementById('llmEnhanceBtn')) return;
    const btn = document.createElement('button');
    btn.id        = 'llmEnhanceBtn'; btn.style.display='none';
    btn.textContent = ' LLM Enhance';
    btn.title     = 'Send predictions to AI for calibration review';
    btn.style.cssText = `background:linear-gradient(135deg,#222,#222);color:#fff;
      border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;
      cursor:pointer;letter-spacing:.04em;transition:opacity .2s`;
    btn.onmouseenter = () => btn.style.opacity = '0.85';
    btn.onmouseleave = () => btn.style.opacity = '1';
    btn.onclick = () => window.llmEnhancePredictions();
    header.querySelector('div')?.appendChild(btn);
  }

  // Try to inject after DOM is ready; retry if predictions tab hasn't rendered yet
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectButton, 500);
    // Also hook into tab switching so the button appears when the tab opens
    const _prevShowTab = window.showTab;
    window.showTab = function(id, btn) {
      if (typeof _prevShowTab === 'function') _prevShowTab(id, btn);
      if (id === 'predictions') setTimeout(injectButton, 100);
    };
  });
})();

/* ══════════════════════════════════════════════════════════════════════════
   LLM LEARNING ANALYSER  —  analyses the learning widget's model state
══════════════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  const LLM_MODEL      = 'claude-sonnet-4-6';
  const LLM_MAX_TOKENS = 1200;
  let _analysisCount   = 0;
  let _issuesTotal     = 0;
  const _history       = [];

  /* ── Build a rich prompt from current learning state ────────────────── */
  function buildLearningPrompt(s) {
    const L   = s?.learning || {};
    const lc  = L.learningCycle || {};
    const wts = lc.adaptedWeights || L.predictionWeights || {};

    const gamesLearned  = L.gamesLearned  ?? lc.gamesLearned  ?? '—';
    const accuracy      = L.accuracy      ?? lc.accuracy       ?? null;
    const cycleCount    = lc.cycleCount   ?? L.cycleCount      ?? '—';
    const resolved      = L.resolved      ?? lc.resolved       ?? '—';
    const predicted     = L.predicted     ?? lc.predicted      ?? '—';
    const predAccuracy  = L.predAccuracy  ?? lc.predAccuracy   ?? null;
    const improveNeeded = L.improveNeeded ?? lc.improveNeeded  ?? '—';
    const improveDone   = L.improveDone   ?? lc.improveDone   ?? '—';
    const homeWinPct    = L.homeWinPct    ?? lc.homeWinPct     ?? '—';
    const modelVer      = L.model         ?? s?.model          ?? '—';
    const lastRun       = lc.lastRun      ?? L.lastRun         ?? 'unknown';

    const fmtW = (k, def) => wts[k] != null ? (wts[k]*100).toFixed(2)+'%' : def+'% (default)';
    const weightLines = [
      `  Current Season  : ${fmtW('currentSeason', '9.0')}`,
      `  Bookmaker Odds  : ${fmtW('bookmakerOdds', '8.0')}`,
      `  Last Season     : ${fmtW('lastSeason',    '7.0')}`,
      `  AI/Poisson Model: ${fmtW('aiModel',       '6.0')}`,
      `  Injuries/H2H    : ${fmtW('injuriesH2H',   '5.5')}`,
      `  League Table    : ${fmtW('leagueTable',   '4.5')}`,
    ].join('\n');

    const acPct  = accuracy      != null ? (accuracy*100).toFixed(1)+'%'     : '—';
    const prPct  = predAccuracy  != null ? (predAccuracy*100).toFixed(1)+'%' : '—';

    return `You are a machine-learning performance analyst reviewing the Football AI Football Model's live learning state.

LEARNING SNAPSHOT
  Games learned on  : ${gamesLearned}
  Learning accuracy : ${acPct}
  Home win %        : ${homeWinPct}${typeof homeWinPct === 'number' ? '%' : ''}
  Model version     : ${modelVer}

PREDICTION DATABASE
  Total predictions : ${predicted}
  Resolved          : ${resolved}
  Prediction accuracy: ${prPct}
  Improvements needed: ${improveNeeded}
  Improvements done  : ${improveDone}

LEARNING CYCLE
  Cycle count : ${cycleCount}
  Last run    : ${lastRun}

ADAPTED ENSEMBLE WEIGHTS (current vs base)
${weightLines}

YOUR TASK
Analyse this learning state and produce a concise performance report. Cover:
1. Overall model health (score 0–100)
2. Weight drift — which signals dominate or are being under-weighted vs the base?
3. Accuracy trajectory — is the model improving, stalling, or degrading?
4. Specific issues or anomalies (flag each with severity: LOW / MEDIUM / HIGH)
5. Three actionable recommendations to improve accuracy or stability

Respond ONLY with valid JSON — no markdown, no preamble:
{
  "healthScore": <0-100 integer>,
  "summary": "<2-3 sentence plain-English overview>",
  "weightDrift": "<1-2 sentences about weight changes>",
  "accuracyTrend": "<brief trend description>",
  "issues": [{"severity":"LOW|MEDIUM|HIGH","description":"..."}],
  "recommendations": ["...", "...", "..."]
}`;
  }

  /* ── Call the Anthropic API ─────────────────────────────────────────── */
  async function callLLM(prompt) {
    const resp = await fetch('/ai/prediction-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: LLM_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) throw new Error(`Unable to load analysis (${resp.status})`);
    const data = await resp.json();
    let txt = (data.content?.[0]?.text || '').trim()
                .replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(txt);
  }

  /* ── Render the analysis into the panel ────────────────────────────── */
  function renderAnalysis(r, ts) {
    const out = document.getElementById('llmLearningOutput');
    if (!out) return;

    const scoreColor = r.healthScore >= 75 ? 'var(--green)'
                     : r.healthScore >= 50 ? 'var(--yellow)'
                     :                       'var(--red)';
    const scoreEmoji = r.healthScore >= 75 ? '' : r.healthScore >= 50 ? '' : '';

    const issueRows = (r.issues || []).map(is => {
      const col = is.severity === 'HIGH'   ? 'var(--red)'
                : is.severity === 'MEDIUM' ? 'var(--yellow)'
                :                            'var(--muted)';
      return `<div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid var(--line)">
        <span style="font-size:10px;font-weight:700;color:${col};min-width:52px;padding-top:1px">${is.severity}</span>
        <span style="font-size:12px;color:var(--text)">${is.description}</span>
      </div>`;
    }).join('') || '<div style="color:var(--muted);font-size:12px">No issues flagged.</div>';

    const recRows = (r.recommendations || []).map((rec, i) =>
      `<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--line)">
        <span style="font-size:11px;font-weight:800;color:var(--accent);min-width:18px">${i+1}.</span>
        <span style="font-size:12px;color:var(--text)">${rec}</span>
      </div>`
    ).join('');

    out.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="font-size:40px;font-weight:900;color:${scoreColor};line-height:1">${r.healthScore}</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:${scoreColor}">${scoreEmoji} Model Health Score</div>
          <div style="font-size:11px;color:var(--muted)">Analysed ${ts}</div>
        </div>
      </div>
      <div style="font-size:13px;margin-bottom:12px;color:var(--text);line-height:1.6">${r.summary}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="background:rgba(34,211,238,.06);border:1px solid #1f5f8a;border-radius:8px;padding:10px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:4px">Weight Drift</div>
          <div style="font-size:12px;color:var(--text)">${r.weightDrift}</div>
        </div>
        <div style="background:rgba(52,211,153,.06);border:1px solid #ffffff;border-radius:8px;padding:10px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:4px">Accuracy Trend</div>
          <div style="font-size:12px;color:var(--text)">${r.accuracyTrend}</div>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px">Issues Flagged</div>
        ${issueRows}
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:6px">Recommendations</div>
        ${recRows}
      </div>`;
  }

  /* ── Update KPI strip ───────────────────────────────────────────────── */
  function updateKPIs(r, ts) {
    const calls   = document.getElementById('llmLearningCalls');
    const score   = document.getElementById('llmLearningScore');
    const issues  = document.getElementById('llmLearningIssues');
    const lastRun = document.getElementById('llmLearningLastRun');

    _analysisCount++;
    _issuesTotal += (r.issues || []).length;

    if (calls)   calls.textContent  = _analysisCount;
    if (score) {
      score.textContent  = r.healthScore;
      score.style.color  = r.healthScore >= 75 ? 'var(--green)' : r.healthScore >= 50 ? 'var(--yellow)' : 'var(--red)';
    }
    if (issues)  issues.textContent = _issuesTotal;
    if (lastRun) lastRun.textContent = ts;
  }

  /* ── Push to history log ────────────────────────────────────────────── */
  function pushHistory(r, ts) {
    _history.unshift({ r, ts });
    if (_history.length > 5) _history.pop();

    const histEl   = document.getElementById('llmLearningHistory');
    const histList = document.getElementById('llmLearningHistoryList');
    if (!histEl || !histList) return;
    histEl.style.display = 'block';
    histList.innerHTML = _history.map((h, i) => {
      const col = h.r.healthScore >= 75 ? 'var(--green)' : h.r.healthScore >= 50 ? 'var(--yellow)' : 'var(--red)';
      return `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:rgba(255,255,255,.03);
               border:1px solid var(--line);border-radius:7px;cursor:pointer" onclick="restoreLLMLearningAnalysis(${i})"
               title="Click to view this analysis">
        <span style="font-size:16px;font-weight:900;color:${col};min-width:36px">${h.r.healthScore}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.r.summary.slice(0,80)}…</div>
          <div style="font-size:10px;color:var(--muted)">${h.ts}</div>
        </div>
        <span style="font-size:10px;color:var(--muted)">${h.r.issues?.length || 0} issues</span>
      </div>`;
    }).join('');
  }

  /* ── Public: restore a historical analysis ──────────────────────────── */
  window.restoreLLMLearningAnalysis = function(idx) {
    const h = _history[idx];
    if (h) renderAnalysis(h.r, h.ts);
  };

  /* ── Main entry point ───────────────────────────────────────────────── */
  window.llmAnalyseLearning = async function() {
    const btn = document.getElementById('llmLearningBtn');
    const out = document.getElementById('llmLearningOutput');

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analysing…'; }
    if (out) out.innerHTML = '<span style="color:var(--muted)">⏳ Sending learning state to AI for analysis…</span>';

    try {
      const prompt = buildLearningPrompt(window.S);
      const result = await callLLM(prompt);
      const ts     = new Date().toLocaleTimeString();

      renderAnalysis(result, ts);
      updateKPIs(result, ts);
      pushHistory(result, ts);

      if (typeof window.log === 'function')
        window.log(`[LLM Learning] Health score: ${result.healthScore}/100 · ${result.issues?.length || 0} issue(s) flagged`);

    } catch (err) {
      if (out) out.innerHTML = `<span style="color:var(--red)"> LLM analysis failed: ${err.message}. Please try again shortly.</span>`;
      console.error('[LLM Learning]', err);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = ' Analyse with LLM'; }
    }
  };
})();


(function(){'use strict';const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const B=()=>((typeof base==='function'?base():window.location.origin).replace(/\/$/,''));async function G(p){let r=await fetch(B()+p,{cache:'no-store'});if(!r.ok){console.warn('KasiScore lottery request failed',r.status,p);throw Error(`Service request failed (${r.status}). Please try again.`)}return r.json()}async function P(p){let r=await fetch(B()+p,{method:'POST',cache:'no-store'});if(!r.ok)throw Error('Server '+r.status);return r.json()}const balls=(a,c='')=>(a||[]).map(n=>`<span class="lot-ball ${c}">${E(n)}</span>`).join('');
window.lotteryLoadPredictions=async()=>{let b=document.getElementById('lotteryPredictBtn');b.disabled=true;b.textContent='⏳ Calculating…';try{let d=await G('/lottery/predictions');document.getElementById('lotteryPredictions').innerHTML=d.predictions.map(p=>`<div class="card"><b>${E(p.label)}</b><span class="badge" style="float:right">${E(p.targetDate)}</span><div class="sub" style="margin:7px 0">Expected candidate numbers</div><div class="lot-balls">${balls(p.numbers)}</div>${p.bonus.length?`<div class="sub" style="margin-top:7px">Bonus / PowerBall</div><div class="lot-balls">${balls(p.bonus,'bonus')}</div>`:''}<div class="sub" style="margin-top:8px">${p.drawsUsed} draws · ${E(p.modelVersion)}</div></div>`).join('')}catch(e){document.getElementById('lotteryPredictions').innerHTML='<div class="empty">'+E(e.message)+'</div>'}finally{b.disabled=false;b.textContent=' Generate predictions'}};
window.lotterySync=async()=>{let b=document.getElementById('lotterySyncBtn');b.disabled=true;b.textContent='⏳ Syncing…';try{let d=await P('/lottery/sync');document.getElementById('lotteryStatus').textContent=`${d.status}: ${d.rowsProcessed||0} rows processed · source: Lottery.co.za`;await lotteryRefresh()}catch(e){document.getElementById('lotteryStatus').textContent='Sync failed: '+e.message}finally{b.disabled=false;b.textContent='↻ Sync results'}};
async function lotteryRefresh(){let d=await G('/lottery/status');document.getElementById('lotDailyCount').textContent=d.games.daily_lotto;document.getElementById('lotLottoCount').textContent=d.games.lotto;document.getElementById('lotPowerCount').textContent=d.games.powerball;document.getElementById('lotCutoff').textContent=d.cutoff;document.getElementById('lotteryStatus').textContent=`Source: Lottery.co.za · Last fetched: ${d.lastFetchedAt||'—'} · rolling 6 months`;await lotteryLoadPredictions();await lotteryLoadAnalytics();await lotteryLoadHistory()}
window.lotteryLoadAnalytics=async()=>{try{let d=await G('/lottery/analytics/'+document.getElementById('lotteryGameSelect').value);document.getElementById('lotteryAnalytics').innerHTML=`<div style="margin-bottom:8px"><b>Hot:</b> ${d.hotNumbers.map(n=>`<span class="badge ok" style="margin:2px">${n}</span>`).join('')}<br><b>Cold:</b> ${d.coldNumbers.map(n=>`<span class="badge warn" style="margin:2px">${n}</span>`).join('')}</div><div class="tablewrap"><table class="table" style="min-width:480px"><thead><tr><th>Number</th><th>Hits</th><th>Score</th></tr></thead><tbody>${d.frequencyRank.slice(0,15).map(x=>`<tr><td><b>${x.number}</b></td><td>${x.count}</td><td>${Number(x.score).toFixed(4)}</td></tr>`).join('')}</tbody></table></div>`}catch(e){document.getElementById('lotteryAnalytics').textContent=e.message}};
window.lotteryLoadHistory=async()=>{try{let d=await G('/lottery/results?game='+encodeURIComponent(document.getElementById('lotteryHistorySelect').value));document.getElementById('lotteryHistory').innerHTML='<div class="tablewrap"><table class="table" style="min-width:650px"><thead><tr><th>Date</th><th>Draw</th><th>Main</th><th>Bonus/PowerBall</th></tr></thead><tbody>'+d.results.map(r=>`<tr><td>${E(r.date)}</td><td>${E(r.drawNumber)}</td><td><div class="lot-balls">${balls(r.numbers,'last')}</div></td><td><div class="lot-balls">${balls(r.bonus,'bonus last')}</div></td></tr>`).join('')+'</tbody></table></div>'}catch(e){document.getElementById('lotteryHistory').textContent=e.message}};
const old=window.showTab;window.showTab=function(id,btn){if(typeof old==='function')old(id,btn);if(id==='lottery')lotteryRefresh()};
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{if(document.getElementById('lottery'))lotteryRefresh().catch(()=>{})},1000));})();


(function(){
'use strict';

// ── Dataset ──────────────────────────────────────────────────
const CORNERS_TEAMS = [
  // PREMIER LEAGUE
  { league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', team:'Manchester City',   avg:11.8, over9_5:67, avoid_odds:null,  risk:'high', note:'High press, wide play → top corner generator' },
  { league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', team:'Arsenal',          avg:11.4, over9_5:64, avoid_odds:null,  risk:'high', note:'Set-piece focused, earns many corners attacking' },
  { league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', team:'Chelsea',          avg:10.9, over9_5:58, avoid_odds:null,  risk:'mid',  note:'Wide attackers generate high corner volume' },
  { league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', team:'Liverpool',        avg:11.2, over9_5:62, avoid_odds:null,  risk:'high', note:'Gegenpressing and wide runs drive corners' },
  { league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', team:'Tottenham',        avg:10.4, over9_5:53, avoid_odds:1.85, risk:'mid',  note:'Variable — depends heavily on opponent quality' },
  { league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', team:'Nottm Forest',     avg:8.2,  over9_5:31, avoid_odds:2.10, risk:'low',  note:'Deep block, low tempo — routinely under 9.5' },
  { league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', team:'Brentford',        avg:8.6,  over9_5:35, avoid_odds:2.05, risk:'low',  note:'Long ball style limits corner earning opportunities' },
  { league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', team:'Wolves',           avg:8.0,  over9_5:28, avoid_odds:2.20, risk:'low',  note:'Low block + compact shape → very few corners' },
  { league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', team:'Bournemouth',      avg:8.9,  over9_5:38, avoid_odds:2.00, risk:'low',  note:'Midblock style, limited crossing output' },
  { league:'Premier League', flag:'󠁧󠁢󠁥󠁮󠁧󠁿', team:'Ipswich',          avg:7.9,  over9_5:25, avoid_odds:2.25, risk:'low',  note:'Newly promoted — low corner budget all-round' },
  // LA LIGA
  { league:'La Liga', flag:'', team:'Barcelona',        avg:12.1, over9_5:71, avoid_odds:null,  risk:'high', note:'Positional play → maximum corner creation in Europe' },
  { league:'La Liga', flag:'', team:'Real Madrid',      avg:10.8, over9_5:57, avoid_odds:null,  risk:'mid',  note:'Efficient — not the highest corner volume, but consistent' },
  { league:'La Liga', flag:'', team:'Atlético Madrid',  avg:8.3,  over9_5:30, avoid_odds:2.15, risk:'low',  note:'Defensive identity, Simeone\'s block = fewest La Liga corners' },
  { league:'La Liga', flag:'', team:'Athletic Bilbao',  avg:9.5,  over9_5:47, avoid_odds:1.95, risk:'mid',  note:'Physical but direct — straddles the 9.5 line' },
  { league:'La Liga', flag:'', team:'Real Betis',       avg:10.1, over9_5:52, avoid_odds:null,  risk:'mid',  note:'Technical, patient build-up earns corners regularly' },
  { league:'La Liga', flag:'', team:'Getafe',           avg:7.6,  over9_5:22, avoid_odds:2.30, risk:'low',  note:'Among the lowest corner averages in all of Europe' },
  { league:'La Liga', flag:'', team:'Celta Vigo',       avg:8.8,  over9_5:37, avoid_odds:2.05, risk:'low',  note:'Occasional flair but low average corner counts' },
  { league:'La Liga', flag:'', team:'Osasuna',          avg:7.8,  over9_5:24, avoid_odds:2.20, risk:'low',  note:'Direct play, physicality — not a crossing team' },
  // BUNDESLIGA
  { league:'Bundesliga', flag:'', team:'Bayer Leverkusen', avg:11.6, over9_5:65, avoid_odds:null,  risk:'high', note:'High-energy pressing, wide attackers → top Bundesliga corners' },
  { league:'Bundesliga', flag:'', team:'Bayern Munich',    avg:12.4, over9_5:73, avoid_odds:null,  risk:'high', note:'Highest European average — dominates possession and crossing' },
  { league:'Bundesliga', flag:'', team:'RB Leipzig',       avg:11.0, over9_5:59, avoid_odds:null,  risk:'mid',  note:'Press-heavy = lots of turnover corners too' },
  { league:'Bundesliga', flag:'', team:'Borussia Dortmund',avg:10.7, over9_5:55, avoid_odds:1.87, risk:'mid',  note:'High when on form but drops on off nights' },
  { league:'Bundesliga', flag:'', team:'Union Berlin',     avg:8.1,  over9_5:29, avoid_odds:2.15, risk:'low',  note:'Physical, direct — routinely one of Bundesliga\'s lowest' },
  { league:'Bundesliga', flag:'', team:'Heidenheim',       avg:7.8,  over9_5:24, avoid_odds:2.25, risk:'low',  note:'Counter-attack first, minimal sustained crossing' },
  { league:'Bundesliga', flag:'', team:'Bochum',           avg:8.3,  over9_5:31, avoid_odds:2.10, risk:'low',  note:'Compact, reactive style suppresses total corners' },
  // SERIE A
  { league:'Serie A', flag:'', team:'Napoli',           avg:10.2, over9_5:53, avoid_odds:null,  risk:'mid',  note:'Positional, patient — decent corner creator' },
  { league:'Serie A', flag:'', team:'Inter Milan',      avg:10.6, over9_5:56, avoid_odds:null,  risk:'mid',  note:'Wide wing-backs generate quality corner situations' },
  { league:'Serie A', flag:'', team:'Juventus',         avg:9.0,  over9_5:40, avoid_odds:2.00, risk:'low',  note:'Organised defensive shape limits open corner play' },
  { league:'Serie A', flag:'', team:'AC Milan',         avg:9.7,  over9_5:49, avoid_odds:1.95, risk:'mid',  note:'On the cusp — home games push it, away games kill it' },
  { league:'Serie A', flag:'', team:'Lazio',            avg:9.3,  over9_5:43, avoid_odds:2.00, risk:'low',  note:'Set-piece reliant but not a high corner-count side' },
  { league:'Serie A', flag:'', team:'Torino',           avg:7.9,  over9_5:26, avoid_odds:2.20, risk:'low',  note:'Defensive, gritty — lowest Italian corner footprint' },
  { league:'Serie A', flag:'', team:'Lecce',            avg:7.7,  over9_5:23, avoid_odds:2.30, risk:'low',  note:'Bottom-half survival mode — very low corner volume' },
  { league:'Serie A', flag:'', team:'Cagliari',         avg:8.0,  over9_5:27, avoid_odds:2.20, risk:'low',  note:'Conservative, struggles to create sustained attacks' },
  // LIGUE 1
  { league:'Ligue 1', flag:'', team:'Paris Saint-Germain', avg:11.7, over9_5:66, avoid_odds:null, risk:'high', note:'Dominant possession and wide play = corner machine' },
  { league:'Ligue 1', flag:'', team:'Monaco',           avg:10.4, over9_5:53, avoid_odds:null,  risk:'mid',  note:'Attacking football, wide play — solid corner volume' },
  { league:'Ligue 1', flag:'', team:'Olympique Lyon',   avg:9.8,  over9_5:50, avoid_odds:1.90, risk:'mid',  note:'Inconsistent — volatile home/away splits' },
  { league:'Ligue 1', flag:'', team:'Stade Brestois',   avg:9.2,  over9_5:42, avoid_odds:2.00, risk:'low',  note:'Pragmatic style — rarely high corner totals' },
  { league:'Ligue 1', flag:'', team:'Le Havre',         avg:7.5,  over9_5:21, avoid_odds:2.35, risk:'low',  note:'Among the lowest corner averages in France' },
  { league:'Ligue 1', flag:'', team:'Montpellier',      avg:8.1,  over9_5:29, avoid_odds:2.15, risk:'low',  note:'Direct, low-maintenance style = few corners generated' },
  // EREDIVISIE
  { league:'Eredivisie', flag:'', team:'Ajax',           avg:12.0, over9_5:69, avoid_odds:null,  risk:'high', note:'Positional dominance and width = top Dutch corner earner' },
  { league:'Eredivisie', flag:'', team:'PSV Eindhoven',  avg:11.5, over9_5:63, avoid_odds:null,  risk:'high', note:'Fast, wide, relentless — routinely over 9.5' },
  { league:'Eredivisie', flag:'', team:'Feyenoord',      avg:10.8, over9_5:57, avoid_odds:null,  risk:'mid',  note:'Energetic and direct — reliable corner environment' },
  { league:'Eredivisie', flag:'', team:'Go Ahead Eagles', avg:8.2, over9_5:30, avoid_odds:2.10, risk:'low',  note:'Mid-table, reactive — below-average corner output' },
  // PRIMEIRA LIGA
  { league:'Primeira Liga', flag:'', team:'Benfica',     avg:11.3, over9_5:61, avoid_odds:null,  risk:'high', note:'Width, pressing and set-pieces = high corner volume' },
  { league:'Primeira Liga', flag:'', team:'Porto',       avg:11.0, over9_5:58, avoid_odds:null,  risk:'mid',  note:'Consistent corner generator across home and away' },
  { league:'Primeira Liga', flag:'', team:'Sporting CP',  avg:10.5, over9_5:54, avoid_odds:null,  risk:'mid',  note:'Technical and wide — competitive with top two' },
  { league:'Primeira Liga', flag:'', team:'Famalicão',   avg:7.8,  over9_5:25, avoid_odds:2.25, risk:'low',  note:'Conservative lower-half style = corners suppressed' },
  { league:'Primeira Liga', flag:'', team:'Moreirense',  avg:7.6,  over9_5:22, avoid_odds:2.30, risk:'low',  note:'One of Portugal\'s lowest corner-average sides' },
  // BELGIAN PRO LEAGUE
  { league:'Belgian Pro League', flag:'', team:'Club Brugge',  avg:10.7, over9_5:56, avoid_odds:null, risk:'mid', note:'Dominant in Belgium, earns corners in most games' },
  { league:'Belgian Pro League', flag:'', team:'Anderlecht',   avg:10.2, over9_5:52, avoid_odds:null, risk:'mid', note:'Possession-based, reasonable corner output' },
  { league:'Belgian Pro League', flag:'', team:'Westerlo',     avg:7.9,  over9_5:26, avoid_odds:2.20, risk:'low', note:'Compact, modest attacking ambition' },
  { league:'Belgian Pro League', flag:'', team:'RWDM',         avg:7.5,  over9_5:21, avoid_odds:2.30, risk:'low', note:'Bottom-half survival: very low corner volumes' },
  // SCOTTISH PREMIERSHIP
  { league:'Scottish Premiership', flag:'󠁧󠁢󠁳󠁣󠁴󠁿', team:'Celtic',      avg:11.9, over9_5:68, avoid_odds:null,  risk:'high', note:'Dominant in Scotland, highest corner average there' },
  { league:'Scottish Premiership', flag:'󠁧󠁢󠁳󠁣󠁴󠁿', team:'Rangers',     avg:10.6, over9_5:55, avoid_odds:null,  risk:'mid',  note:'Good corner volume, especially at Ibrox' },
  { league:'Scottish Premiership', flag:'󠁧󠁢󠁳󠁣󠁴󠁿', team:'Ross County',  avg:7.7,  over9_5:23, avoid_odds:2.25, risk:'low',  note:'Low-volume corner side — avoid backing over 9.5' },
  { league:'Scottish Premiership', flag:'󠁧󠁢󠁳󠁣󠁴󠁿', team:'Livingston',   avg:7.5,  over9_5:21, avoid_odds:2.30, risk:'low',  note:'Long ball, physical — lowest Scottish average' },
  // TURKISH SUPER LIG
  { league:'Turkey', flag:'', team:'Galatasaray',      avg:10.5, over9_5:54, avoid_odds:null,  risk:'mid',  note:'Energetic and wide — good corner count at home' },
  { league:'Turkey', flag:'', team:'Fenerbahçe',       avg:10.1, over9_5:52, avoid_odds:null,  risk:'mid',  note:'Consistent, technically strong — reliable count' },
  { league:'Turkey', flag:'', team:'Başakşehir',       avg:8.4,  over9_5:32, avoid_odds:2.10, risk:'low',  note:'Organised, defensive — well below the 9.5 line' },
  { league:'Turkey', flag:'', team:'Sivasspor',        avg:7.9,  over9_5:26, avoid_odds:2.20, risk:'low',  note:'Counter-attack heavy — very low corner footprint' },
  // CHAMPIONS LEAGUE
  { league:'Champions League', flag:'', team:'Real Madrid (CL)', avg:11.5, over9_5:63, avoid_odds:null, risk:'high', note:'European nights: high intensity = high corners' },
  { league:'Champions League', flag:'', team:'Man City (CL)',    avg:12.0, over9_5:70, avoid_odds:null, risk:'high', note:'CL games drive even higher corner volumes' },
  { league:'Champions League', flag:'', team:'Two Italian teams', avg:8.6, over9_5:34, avoid_odds:2.05, risk:'low',  note:'Italian CL sides (Juve, Lazio): low corner environment' },
  { league:'Champions League', flag:'', team:'Defensive CL ties', avg:8.1, over9_5:28, avoid_odds:2.15, risk:'low',  note:'Late-stage knockout legs: low & cautious = under 9.5' },
  // EUROPA LEAGUE
  { league:'Europa League', flag:'', team:'Top-6 Premier League side', avg:11.0, over9_5:59, avoid_odds:null,  risk:'mid', note:'Strong English sides push EL corner counts up' },
  { league:'Europa League', flag:'', team:'Portuguese / Dutch side',    avg:10.6, over9_5:55, avoid_odds:null,  risk:'mid', note:'Benfica, Porto, PSV in EL: reliable over-9.5 candidates' },
  { league:'Europa League', flag:'', team:'Greek / Turkish mid-tier',   avg:7.8,  over9_5:25, avoid_odds:2.25, risk:'low', note:'Cautious EL sides from Greece/Turkey: avoid backing' },
];

const CORNERS_LEAGUES = [
  { name:'Bundesliga',        flag:'', avg:10.9, top:'Bayern Munich (12.4)',    low:'Heidenheim (7.8)',    note:'Highest league average in Europe — pace and width' },
  { name:'Eredivisie',        flag:'', avg:10.7, top:'Ajax (12.0)',              low:'Go Ahead Eagles (8.2)',note:'Dutch style = possession and wing play = corners' },
  { name:'Premier League',    flag:'󠁧󠁢󠁥󠁮󠁧󠁿', avg:10.2, top:'Man City (11.8)',          low:'Ipswich (7.9)',         note:'Big 6 inflate the league average significantly' },
  { name:'Primeira Liga',     flag:'', avg:10.1, top:'Benfica (11.3)',            low:'Moreirense (7.6)',     note:'Top 3 are excellent; bottom half extremely low' },
  { name:'La Liga',           flag:'', avg:9.8,  top:'Barcelona (12.1)',          low:'Getafe (7.6)',         note:'Getafe historically lowest in all major Euro leagues' },
  { name:'Ligue 1',           flag:'', avg:9.6,  top:'PSG (11.7)',               low:'Le Havre (7.5)',       note:'PSG massively distorts the league average upward' },
  { name:'Belgian Pro League',flag:'', avg:9.5,  top:'Club Brugge (10.7)',       low:'RWDM (7.5)',           note:'Moderate — top two are worth backing, bottom avoid' },
  { name:'Scottish Prem.',    flag:'󠁧󠁢󠁳󠁣󠁴󠁿', avg:9.4, top:'Celtic (11.9)',            low:'Livingston (7.5)',     note:'Celtic alone skews the league; most others are low' },
  { name:'Serie A',           flag:'', avg:9.3,  top:'Inter Milan (10.6)',        low:'Lecce (7.7)',          note:'Defensive heritage — lowest Big-5 average overall' },
  { name:'Turkish Süper Lig', flag:'', avg:9.2,  top:'Galatasaray (10.5)',        low:'Sivasspor (7.9)',      note:'Physical and energetic top — cautious bottom' },
];

// ── State ─────────────────────────────────────────────────────
let cornersTab = 'low';
let cornersLeague = 'ALL';

// ── Helpers ───────────────────────────────────────────────────
function cAvgColor(a){ return a>=10.5?'var(--green)':a>=9.5?'var(--yellow)':a>=8.5?'var(--orange)':'var(--red)'; }
function cPillStyle(risk){ return risk==='high'?'background:rgba(52,211,153,.12);color:var(--green);border:1px solid rgba(52,211,153,.3)':risk==='mid'?'background:rgba(250,204,21,.10);color:var(--yellow);border:1px solid rgba(250,204,21,.22)':'background:rgba(251,113,133,.12);color:var(--red);border:1px solid rgba(251,113,133,.28)'; }
function cRiskLabel(r){ return r==='high'?'Often ':r==='mid'?'Variable ':'Rarely '; }
function cFiltered(){
  let d=CORNERS_TEAMS;
  if(cornersLeague!=='ALL') d=d.filter(t=>t.league===cornersLeague);
  if(cornersTab==='low')  d=d.filter(t=>t.risk==='low').sort((a,b)=>a.avg-b.avg);
  if(cornersTab==='mid')  d=d.filter(t=>t.risk==='mid').sort((a,b)=>a.avg-b.avg);
  if(cornersTab==='high') d=d.filter(t=>t.risk==='high').sort((a,b)=>b.avg-a.avg);
  return d;
}

// ── KPI Strip ─────────────────────────────────────────────────
function cornersRenderKPI(){
  const all=cornersLeague==='ALL'?CORNERS_TEAMS:CORNERS_TEAMS.filter(t=>t.league===cornersLeague);
  const low=all.filter(t=>t.risk==='low').length;
  const mid=all.filter(t=>t.risk==='mid').length;
  const high=all.filter(t=>t.risk==='high').length;
  const avg=(all.reduce((s,t)=>s+t.avg,0)/all.length).toFixed(1);
  document.getElementById('cornersKpiStrip').innerHTML=`
    <div class="card kpi" style="border-color:var(--red)">
      <div class="n" style="color:var(--red)">${low}</div><div class="l">Rarely Hit 9.5</div><div class="sub">avg &lt; 9.0</div>
    </div>
    <div class="card kpi" style="border-color:var(--yellow)">
      <div class="n" style="color:var(--yellow)">${mid}</div><div class="l">Borderline Teams</div><div class="sub">avg 9.0–10.4</div>
    </div>
    <div class="card kpi" style="border-color:var(--green)">
      <div class="n" style="color:var(--green)">${high}</div><div class="l">Frequently Over 9.5</div><div class="sub">avg 10.5+</div>
    </div>
    <div class="card kpi" style="border-color:var(--accent)">
      <div class="n" style="color:var(--accent)">${avg}</div><div class="l">Avg Corners / Match</div><div class="sub">${cornersLeague==='ALL'?'all Euro leagues':'selected league'}</div>
    </div>`;
}

// ── Table ─────────────────────────────────────────────────────
function cornersRenderTable(){
  const data=cFiltered();
  const label=cornersTab==='low'?'Teams hardest to reach Over 9.5 Corners':cornersTab==='mid'?'Borderline teams — match-up dependent':'Teams that regularly generate 10+ corners';
  document.getElementById('cornersTableStatus').textContent=`${data.length} team(s) · ${label}`;
  if(!data.length){ document.getElementById('cornersTableWrap').innerHTML='<div style="text-align:center;padding:30px;color:var(--muted)">No teams match the current filter</div>'; return; }
  const rows=data.map(t=>{
    const barW=Math.min(100,(t.avg/14)*100).toFixed(0);
    const barCol=cAvgColor(t.avg);
    const avoidHtml=t.avoid_odds
      ?`<span style="display:inline-block;font-size:11px;font-weight:700;padding:2px 6px;border-radius:5px;background:rgba(251,113,133,.12);color:var(--red);border:1px solid rgba(251,113,133,.25)"> Avoid @${t.avoid_odds}</span>`
      :`<span style="display:inline-block;font-size:11px;font-weight:700;padding:2px 6px;border-radius:5px;background:rgba(52,211,153,.10);color:var(--green);border:1px solid rgba(52,211,153,.22)">OK bet</span>`;
    return `<tr>
      <td><span style="font-size:15px">${t.flag}</span></td>
      <td><b>${t.team}</b><br><span style="font-size:11px;color:var(--muted)">${t.league}</span></td>
      <td>
        <span style="color:${barCol};font-weight:800;font-size:15px">${t.avg}</span>
        <div style="height:5px;background:var(--line);border-radius:10px;overflow:hidden;margin-top:5px;width:100px"><i style="display:block;height:100%;width:${barW}%;background:${barCol};border-radius:10px"></i></div>
      </td>
      <td><span style="font-weight:700;color:${t.over9_5>=55?'var(--green)':t.over9_5>=40?'var(--yellow)':'var(--red)'}">${t.over9_5}%</span><div style="font-size:10px;color:var(--muted)">of games</div></td>
      <td><span style="display:inline-block;border-radius:6px;padding:2px 7px;font-size:11px;font-weight:700;${cPillStyle(t.risk)}">${cRiskLabel(t.risk)}</span></td>
      <td>${avoidHtml}</td>
      <td style="font-size:12px;color:var(--muted);max-width:200px">${t.note}</td>
    </tr>`;
  }).join('');
  document.getElementById('cornersTableWrap').innerHTML=`
    <table class="table" style="min-width:800px">
      <thead><tr>
        <th></th><th>Team</th><th>Avg Corners/Match</th><th>Over 9.5 Hit Rate</th><th>Verdict</th><th>Odds Signal</th><th>Why</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Leagues View ──────────────────────────────────────────────
function cornersRenderLeagues(){
  document.getElementById('cornersTableStatus').textContent=`${CORNERS_LEAGUES.length} European leagues ranked by corner average`;
  const rows=CORNERS_LEAGUES.map(l=>{
    const barW=Math.min(100,(l.avg/14)*100).toFixed(0);
    const barCol=cAvgColor(l.avg);
    return `<tr>
      <td><span style="font-size:15px">${l.flag}</span></td>
      <td><b>${l.name}</b></td>
      <td><span style="color:${barCol};font-weight:800;font-size:15px">${l.avg}</span>
          <div style="height:5px;background:var(--line);border-radius:10px;overflow:hidden;margin-top:5px;width:100px"><i style="display:block;height:100%;width:${barW}%;background:${barCol};border-radius:10px"></i></div></td>
      <td style="font-size:12px;color:var(--green)">${l.top}</td>
      <td style="font-size:12px;color:var(--red)">${l.low}</td>
      <td style="font-size:12px;color:var(--muted);max-width:220px">${l.note}</td>
    </tr>`;
  }).join('');
  document.getElementById('cornersTableWrap').innerHTML=`
    <table class="table" style="min-width:700px">
      <thead><tr><th></th><th>League</th><th>League Avg Corners</th><th> Top Team</th><th> Lowest Team</th><th>Context</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Corner Lines ──────────────────────────────────────────────
let cornersActiveLine = 9.5;

window.cornersLinesSetLine = function(line, btn){
  cornersActiveLine = line;
  document.querySelectorAll('#cornersLinesTabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  cornersRenderLines();
};

// Fuzzy-match a fixture team name against the CORNERS_TEAMS dataset
function clMatchTeam(name){
  if(!name) return null;
  const n = name.toLowerCase().trim();
  // exact first
  let t = CORNERS_TEAMS.find(t => t.team.toLowerCase() === n);
  if(t) return t;
  // partial both directions
  t = CORNERS_TEAMS.find(t => {
    const tn = t.team.toLowerCase();
    return tn.includes(n) || n.includes(tn) ||
           n.split(' ').some(w => w.length > 3 && tn.includes(w));
  });
  return t || null;
}

// Assess a fixture against the corner line and return verdict object
function clAssessMatch(m, line){
  const homeName = m.home || m.homeTeam || '';
  const awayName = m.away || m.awayTeam || '';
  const ht = clMatchTeam(homeName);
  const at = clMatchTeam(awayName);

  // combined avg = simple mean of the two if both known; else single known team
  let combinedAvg = null;
  if(ht && at) combinedAvg = ((ht.avg + at.avg) / 2);
  else if(ht)  combinedAvg = ht.avg;
  else if(at)  combinedAvg = at.avg;

  const ko = m.datetime || m.kickoff || m.date || '';
  const conf = m.confidence || m.conf || null;

  // Verdict logic
  let verdict, verdictColor, verdictBg, verdictBorder;
  const bothKnown = ht && at;

  if(combinedAvg === null){
    verdict = ' Unknown'; verdictColor = 'var(--muted)';
    verdictBg = 'rgba(100,116,139,.08)'; verdictBorder = 'rgba(100,116,139,.18)';
  } else if(bothKnown){
    const bothOver  = ht.avg > line && at.avg > line;
    const bothUnder = ht.avg <= line && at.avg <= line;
    const mixed     = !bothOver && !bothUnder;
    if(bothOver){
      verdict = ` Strong Over ${line}`; verdictColor = 'var(--green)';
      verdictBg = 'rgba(52,211,153,.10)'; verdictBorder = 'rgba(52,211,153,.30)';
    } else if(bothUnder){
      verdict = ` Strong Under ${line}`; verdictColor = 'var(--red)';
      verdictBg = 'rgba(251,113,133,.10)'; verdictBorder = 'rgba(251,113,133,.28)';
    } else {
      verdict = ` Mixed — lean ${combinedAvg > line ? 'Over' : 'Under'} ${line}`; verdictColor = 'var(--yellow)';
      verdictBg = 'rgba(250,204,21,.08)'; verdictBorder = 'rgba(250,204,21,.22)';
    }
  } else {
    // only one team matched
    verdict = combinedAvg > line ? `↑ Lean Over ${line}` : `↓ Lean Under ${line}`;
    verdictColor = combinedAvg > line ? 'var(--accent)' : 'var(--orange)';
    verdictBg = combinedAvg > line ? 'rgba(34,211,238,.08)' : 'rgba(251,146,60,.08)';
    verdictBorder = combinedAvg > line ? 'rgba(34,211,238,.22)' : 'rgba(251,146,60,.22)';
  }

  return { homeName, awayName, ht, at, combinedAvg, ko, conf, verdict, verdictColor, verdictBg, verdictBorder, league: m.league || '' };
}

function clMatchCard(info, line){
  const { homeName, awayName, ht, at, combinedAvg, ko, conf, verdict, verdictColor, verdictBg, verdictBorder, league } = info;
  const koStr = ko ? (() => {
    try { return new Date(ko.replace(' ','T')).toLocaleString('en-ZA',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }
    catch(e){ return ko.slice(0,16); }
  })() : '—';
  const confHtml = conf ? `<span style="font-size:10px;padding:1px 7px;border-radius:5px;background:rgba(34,211,238,.10);border:1px solid rgba(56,189,248,.2);color:var(--accent);margin-left:6px">${Number(conf).toFixed(1)}% conf</span>` : '';

  function miniTeamChip(name, t, side){
    if(!t) return `<div style="flex:1;padding:7px 10px;background:rgba(255,255,255,.03);border-radius:7px;text-align:${side}">
      <div style="font-size:12px;font-weight:700;color:var(--text)">${name||'—'}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px">No data</div></div>`;
    const col = cAvgColor(t.avg);
    const barW = Math.min(100,(t.avg/14)*100).toFixed(0);
    const overUnder = t.avg > line
      ? `<span style="color:var(--green);font-size:9px;font-weight:700">OVER ${line}</span>`
      : `<span style="color:var(--red);font-size:9px;font-weight:700">UNDER ${line}</span>`;
    return `<div style="flex:1;padding:7px 10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:7px;text-align:${side}">
      <div style="font-size:12px;font-weight:800;color:var(--text)">${t.flag} ${t.team}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:1px">${t.league}</div>
      <div style="margin-top:5px;display:flex;align-items:center;gap:6px;${side==='right'?'justify-content:flex-end':''}">
        <span style="font-size:14px;font-weight:900;color:${col}">${t.avg}</span>
        ${overUnder}
      </div>
      <div style="height:3px;background:var(--line);border-radius:6px;overflow:hidden;margin-top:4px">
        <i style="display:block;height:100%;width:${barW}%;background:${col};border-radius:6px"></i>
      </div>
    </div>`;
  }

  const avgLabel = combinedAvg !== null
    ? `<div style="text-align:center;padding:6px 12px;background:rgba(0,0,0,.3);border-radius:7px;border:1px solid rgba(255,255,255,.08)">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Combined avg</div>
        <div style="font-size:16px;font-weight:900;color:${cAvgColor(combinedAvg)}">${combinedAvg.toFixed(1)}</div>
       </div>`
    : `<div style="text-align:center;font-size:18px;font-weight:900;color:var(--muted);padding:6px 12px">vs</div>`;

  return `<div style="background:${verdictBg};border:1px solid ${verdictBorder};border-radius:10px;padding:12px;margin-bottom:8px">
    <!-- Header row -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
      <div>
        <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">${league}</span>
        <span style="font-size:10px;color:var(--muted);margin-left:8px"> ${koStr}</span>
        ${confHtml}
      </div>
      <span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:99px;background:rgba(0,0,0,.4);border:1px solid ${verdictBorder};color:${verdictColor}">${verdict}</span>
    </div>
    <!-- Teams row -->
    <div style="display:flex;gap:8px;align-items:center">
      ${miniTeamChip(homeName, ht, 'left')}
      ${avgLabel}
      ${miniTeamChip(awayName, at, 'right')}
    </div>
  </div>`;
}

// ── Corners All-Lines Intel ────────────────────────────────────
function clBuildAllLinesSection(matches) {
  const LINES = [9.5, 10.5, 11.5, 12.5];

  const palettes = {
    9.5:  { over:'var(--green)', under:'var(--red)', overRgb:'52,211,153',   underRgb:'251,113,133' },
    10.5: { over:'var(--accent)', under:'var(--orange)', overRgb:'34,211,238',   underRgb:'251,146,60'  },
    11.5: { over:'var(--purple)', under:'var(--yellow)', overRgb:'167,139,250',  underRgb:'250,204,21'  },
    12.5: { over:'var(--red)', under:'var(--muted)', overRgb:'251,113,133',  underRgb:'148,163,184' },
  };

  // ── No server data ─────────────────────────────────────────────
  if (!matches || matches.length === 0) {
    return `<div style="margin-top:28px;padding:20px;text-align:center;border:1px dashed rgba(255,255,255,.08);border-radius:10px;color:var(--muted);font-size:12px">
      <div style="font-size:24px;margin-bottom:8px"></div>
      <div style="font-weight:700;margin-bottom:4px">No fixtures loaded</div>
      <div style="font-size:11px">Connect your server and click <b>↻ Refresh all</b> to see corners market analysis across all lines.</div>
    </div>`;
  }

  // ── Assess each match against all 4 lines ─────────────────────
  function assess(m, line) {
    const homeName = m.home || m.homeTeam || '';
    const awayName = m.away || m.awayTeam || '';
    const ht = clMatchTeam(homeName);
    const at = clMatchTeam(awayName);
    let combinedAvg = null;
    if (ht && at)       combinedAvg = (ht.avg + at.avg) / 2;
    else if (ht)        combinedAvg = ht.avg;
    else if (at)        combinedAvg = at.avg;
    const ko  = m.datetime || m.kickoff || m.date || '';
    const conf = m.confidence || m.conf || null;
    return { homeName, awayName, ht, at, combinedAvg, ko, conf,
             league: m.league || '', line,
             isOver: combinedAvg !== null && combinedAvg > line,
             isUnknown: combinedAvg === null };
  }

  // Build assessed list per line
  const byLine = {};
  LINES.forEach(line => {
    const assessed = matches.map(m => assess(m, line));
    byLine[line] = {
      over:    assessed.filter(a => !a.isUnknown &&  a.isOver).sort((a,b) => (b.combinedAvg||0)-(a.combinedAvg||0)),
      under:   assessed.filter(a => !a.isUnknown && !a.isOver).sort((a,b) => (b.combinedAvg||0)-(a.combinedAvg||0)),
      unknown: assessed.filter(a => a.isUnknown),
    };
  });

  // ── Fixture card ──────────────────────────────────────────────
  function fixtureCard(a, pal) {
    const { homeName, awayName, ht, at, combinedAvg, ko, conf, league, line, isOver } = a;
    const col    = isOver ? pal.over    : pal.under;
    const rgbStr = isOver ? pal.overRgb : pal.underRgb;
    const koStr  = ko ? (() => { try { return new Date(ko.replace(' ','T')).toLocaleString('en-ZA',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); } catch(e){ return ko.slice(0,16); } })() : '—';

    function chip(name, t, side) {
      if (!t) return `<div style="flex:1;padding:6px 9px;background:rgba(255,255,255,.03);border-radius:7px;text-align:${side}">
        <div style="font-size:12px;font-weight:700">${name||'—'}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:1px">No data</div>
      </div>`;
      const c  = cAvgColor(t.avg);
      const bw = Math.min(100,(t.avg/14)*100).toFixed(0);
      const ou = t.avg > line
        ? `<span style="color:var(--green);font-size:9px;font-weight:700">OVER ${line}</span>`
        : `<span style="color:var(--red);font-size:9px;font-weight:700">UNDER ${line}</span>`;
      return `<div style="flex:1;padding:6px 9px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);border-radius:7px;text-align:${side}">
        <div style="font-size:12px;font-weight:800">${t.flag} ${t.team}</div>
        <div style="font-size:10px;color:var(--muted)">${t.league}</div>
        <div style="margin-top:4px;display:flex;align-items:center;gap:5px;${side==='right'?'justify-content:flex-end':''}">
          <span style="font-size:14px;font-weight:900;color:${c}">${t.avg}</span>${ou}
        </div>
        <div style="height:3px;background:var(--line);border-radius:6px;overflow:hidden;margin-top:3px">
          <i style="display:block;height:100%;width:${bw}%;background:${c};border-radius:6px"></i>
        </div>
      </div>`;
    }

    const avgBlock = combinedAvg !== null
      ? `<div style="text-align:center;padding:5px 10px;background:rgba(0,0,0,.3);border-radius:7px;border:1px solid rgba(${rgbStr},.2)">
           <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Avg</div>
           <div style="font-size:15px;font-weight:900;color:${col}">${combinedAvg.toFixed(1)}</div>
         </div>`
      : `<div style="text-align:center;font-size:16px;font-weight:900;color:var(--muted);padding:5px 10px">vs</div>`;

    return `<div style="border:1px solid rgba(${rgbStr},.18);border-radius:9px;padding:10px;margin-bottom:7px;background:rgba(${rgbStr},.04)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:wrap;gap:4px">
        <div>
          <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">${league}</span>
          <span style="font-size:10px;color:var(--muted);margin-left:7px"> ${koStr}</span>
          ${conf ? `<span style="font-size:9px;padding:1px 6px;border-radius:5px;background:rgba(34,211,238,.10);border:1px solid rgba(56,189,248,.2);color:var(--accent);margin-left:5px">${Number(conf).toFixed(1)}% conf</span>` : ''}
        </div>
        <span style="font-size:10px;font-weight:800;padding:2px 9px;border-radius:99px;background:rgba(0,0,0,.4);border:1px solid rgba(${rgbStr},.3);color:${col}">
          ${isOver ? ` Over ${line}` : ` Under ${line}`}
        </span>
      </div>
      <div style="display:flex;gap:7px;align-items:center">
        ${chip(homeName, ht, 'left')}
        ${avgBlock}
        ${chip(awayName, at, 'right')}
      </div>
    </div>`;
  }

  // ── One line block (Over + Under side-by-side) ─────────────────
  function lineBlock(line) {
    const pal   = palettes[line];
    const data  = byLine[line];
    const total = data.over.length + data.under.length + data.unknown.length;
    const overPct = total ? Math.round((data.over.length / total) * 100) : 0;

    function col_section(title, col, rgb, items, emptyMsg) {
      return `<div style="background:rgba(${rgb},.05);border:1px solid rgba(${rgb},.20);border-radius:10px;overflow:hidden">
        <div style="padding:9px 12px;background:rgba(0,0,0,.25);border-bottom:1px solid rgba(${rgb},.18);display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;font-weight:800;color:#${col.replace('#','')}">${title}</span>
          <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:rgba(0,0,0,.35);border:1px solid rgba(${rgb},.28);color:#${col.replace('#','')}">${items.length} match${items.length!==1?'es':''}</span>
        </div>
        <div style="padding:9px 10px;max-height:360px;overflow-y:auto">
          ${items.length ? items.map(a => fixtureCard(a, pal)).join('') : `<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px;border:1px dashed rgba(255,255,255,.07);border-radius:8px;margin:4px">${emptyMsg}</div>`}
        </div>
      </div>`;
    }

    return `<div style="margin-bottom:22px">
      <!-- Line header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding:10px 14px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);border-radius:10px">
        <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap">
          <span style="font-size:16px;font-weight:900;color:var(--text)">Line: <span style="color:var(--accent)">${line}</span> Corners</span>
          <span style="font-size:11px;padding:3px 10px;border-radius:99px;background:rgba(52,211,153,.10);border:1px solid rgba(52,211,153,.25);color:var(--green)">${data.over.length} Over</span>
          <span style="font-size:11px;padding:3px 10px;border-radius:99px;background:rgba(251,113,133,.10);border:1px solid rgba(251,113,133,.25);color:var(--red)">${data.under.length} Under</span>
          ${data.unknown.length ? `<span style="font-size:11px;padding:3px 10px;border-radius:99px;background:rgba(100,116,139,.08);border:1px solid rgba(100,116,139,.2);color:var(--muted)">${data.unknown.length} No data</span>` : ''}
          <span style="font-size:11px;color:var(--muted)">${overPct}% lean Over</span>
        </div>
        <!-- mini bar -->
        <div style="min-width:120px">
          <div style="height:6px;background:rgba(251,113,133,.25);border-radius:6px;overflow:hidden">
            <div style="width:${overPct}%;height:100%;background:var(--green);border-radius:6px;transition:width .4s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-top:3px"><span>Under</span><span>Over</span></div>
        </div>
      </div>
      <!-- Over / Under columns -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${col_section(` Over ${line} Corners`, pal.over, pal.overRgb, data.over, `No fixtures where both teams' combined avg exceeds ${line}.`)}
        ${col_section(` Under ${line} Corners`, pal.under, pal.underRgb, data.under, `No fixtures where both teams' combined avg is at or below ${line}.`)}
      </div>
      ${data.unknown.length ? `<div style="margin-top:8px;padding:8px 12px;border-radius:8px;background:rgba(100,116,139,.05);border:1px solid rgba(100,116,139,.15);font-size:11px;color:var(--muted)">
         ${data.unknown.length} fixture(s) couldn't be matched to the corners database — team names may differ from database entries.
      </div>` : ''}
    </div>`;
  }

  // ── Summary KPI strip across all 4 lines ─────────────────────
  const summaryKpis = LINES.map(line => {
    const pal  = palettes[line];
    const data = byLine[line];
    const tot  = data.over.length + data.under.length;
    return `<div style="text-align:center;padding:10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.07);border-radius:9px">
      <div style="font-size:13px;font-weight:900;color:var(--accent);margin-bottom:2px">${line}</div>
      <div style="display:flex;justify-content:center;gap:8px;font-size:12px;font-weight:800">
        <span style="color:${pal.over}">${data.over.length}↑</span>
        <span style="color:var(--muted)">/</span>
        <span style="color:${pal.under}">${data.under.length}↓</span>
      </div>
      <div style="font-size:9px;color:var(--muted);margin-top:2px">${tot ? Math.round((data.over.length/tot)*100) : 0}% Over</div>
    </div>`;
  }).join('');

  return `<div style="margin-top:30px">
    <!-- Section header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid rgba(56,189,248,.2)">
      <div>
        <span style="font-size:14px;font-weight:800;color:var(--accent)"> Corners Market — All Lines · Fixtures Breakdown</span>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">${matches.length} fixture(s) assessed across 9.5 · 10.5 · 11.5 · 12.5 lines · Over &amp; Under separated</div>
      </div>
    </div>

    <!-- 4-column summary -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
      ${summaryKpis}
    </div>

    <!-- One block per line -->
    ${LINES.map(lineBlock).join('')}
  </div>`;
}


function cornersRenderLines(){
  const line = cornersActiveLine;
  const all = cornersLeague === 'ALL' ? CORNERS_TEAMS : CORNERS_TEAMS.filter(t => t.league === cornersLeague);

  const overTeams  = all.filter(t => t.avg >  line).sort((a,b) => b.avg - a.avg);
  const underTeams = all.filter(t => t.avg <= line).sort((a,b) => b.avg - a.avg);

  // colour palette per line
  const palette = {
    9.5:  { over:'var(--green)', under:'var(--red)', overBg:'rgba(52,211,153,.10)',  underBg:'rgba(251,113,133,.10)',  overBorder:'rgba(52,211,153,.30)',  underBorder:'rgba(251,113,133,.28)' },
    10.5: { over:'var(--accent)', under:'var(--orange)', overBg:'rgba(34,211,238,.08)',  underBg:'rgba(251,146,60,.10)',   overBorder:'rgba(34,211,238,.25)',  underBorder:'rgba(251,146,60,.28)' },
    11.5: { over:'var(--purple)', under:'var(--yellow)', overBg:'rgba(167,139,250,.10)', underBg:'rgba(250,204,21,.08)',   overBorder:'rgba(167,139,250,.28)', underBorder:'rgba(250,204,21,.22)' },
    12.5: { over:'var(--red)', under:'var(--muted)', overBg:'rgba(251,113,133,.10)', underBg:'rgba(148,163,184,.07)', overBorder:'rgba(251,113,133,.28)', underBorder:'rgba(148,163,184,.18)' },
  };
  const pal = palette[line] || palette[9.5];

  function teamRow(t){
    const barW = Math.min(100,(t.avg/14)*100).toFixed(0);
    const col   = cAvgColor(t.avg);
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="font-size:14px;min-width:22px">${t.flag}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700">${t.team}</div>
        <div style="font-size:10px;color:var(--muted)">${t.league}</div>
      </div>
      <div style="text-align:right;min-width:90px">
        <span style="font-size:15px;font-weight:900;color:${col}">${t.avg}</span>
        <div style="height:4px;background:var(--line);border-radius:10px;overflow:hidden;margin-top:4px;width:80px">
          <i style="display:block;height:100%;width:${barW}%;background:${col};border-radius:10px"></i>
        </div>
      </div>
    </div>`;
  }

  const makeSection = (title, color, bg, border, teams, emptyMsg) => `
    <div style="background:${bg};border:1px solid ${border};border-radius:10px;overflow:hidden">
      <div style="padding:10px 12px;background:rgba(0,0,0,.25);border-bottom:1px solid ${border};display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-size:13px;font-weight:800;color:${color}">${title}</span>
          <span style="font-size:10px;color:var(--muted);margin-left:8px">avg corners/match</span>
        </div>
        <span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:99px;background:rgba(0,0,0,.35);border:1px solid ${border};color:${color}">${teams.length} teams</span>
      </div>
      <div style="max-height:300px;overflow-y:auto">
        ${teams.length ? teams.map(teamRow).join('') : `<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">${emptyMsg}</div>`}
      </div>
    </div>`;

  // Summary KPI row
  const overPct = all.length ? Math.round((overTeams.length / all.length) * 100) : 0;
  const avgOverAvg  = overTeams.length  ? (overTeams.reduce((s,t)=>s+t.avg,0)/overTeams.length).toFixed(1) : '—';
  const avgUnderAvg = underTeams.length ? (underTeams.reduce((s,t)=>s+t.avg,0)/underTeams.length).toFixed(1): '—';

  // ── Predicted Matches this week ────────────────────────────────────────────
  const allMatches = [
    ...(window.S?.fixtures || []),
    ...(window.S?.predictions || [])
  ].filter((m, i, arr) =>
    arr.findIndex(x => {
      const xKo = x.datetime || x.kickoff || x.date || '';
      const mKo = m.datetime || m.kickoff || m.date || '';
      return xKo === mKo && (x.home || x.homeTeam) === (m.home || m.homeTeam);
    }) === i
  );

  // Assess all matches
  const assessed = allMatches.map(m => clAssessMatch(m, line));

  // Separate into: strong over, mixed, strong under, unknown
  const strongOver  = assessed.filter(a => a.verdict.startsWith(''));
  const strongUnder = assessed.filter(a => a.verdict.startsWith(''));
  const mixed       = assessed.filter(a => a.verdict.startsWith('') || a.verdict.startsWith('↑') || a.verdict.startsWith('↓'));
  const unknown     = assessed.filter(a => a.verdict.startsWith(''));

  const matchedCount = assessed.filter(a => !a.verdict.startsWith('')).length;

  function matchSection(title, color, bg, border, items, emptyMsg){
    return `<div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:3px;height:16px;border-radius:2px;background:${color}"></div>
        <span style="font-size:12px;font-weight:800;color:${color}">${title}</span>
        <span style="font-size:10px;padding:1px 7px;border-radius:99px;background:rgba(0,0,0,.4);border:1px solid ${border};color:${color}">${items.length}</span>
      </div>
      ${items.length ? items.map(a => clMatchCard(a, line)).join('') : `<div style="text-align:center;padding:18px;color:var(--muted);font-size:12px;border:1px dashed rgba(255,255,255,.08);border-radius:8px">${emptyMsg}</div>`}
    </div>`;
  }

  // ── AI Fallback: generate fixture predictions when no server data is available ──
  // This renders immediately; AI fills in the prediction section asynchronously.
  const matchesHtml = allMatches.length === 0
    ? `<div id="cornersAiPredWrap">
        <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.18);border-radius:10px;margin-bottom:12px">
          <div style="font-size:22px"></div>
          <div>
            <div style="font-size:12px;font-weight:800;color:var(--accent)">Football AI Corner Predictions — Server Offline Mode</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Your local server isn't connected. The Football AI is generating corner predictions for today's top fixtures using the corner database above.</div>
          </div>
          <button id="cornersAiRetryBtn" onclick="cornersAiLoadPredictions(${line})" style="margin-left:auto;flex-shrink:0;font-size:11px;padding:6px 12px;border-radius:7px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.3);color:var(--accent);cursor:pointer">↻ Regenerate</button>
        </div>
        <div id="cornersAiPredResult">
          <div style="display:flex;align-items:center;gap:10px;padding:20px;color:var(--muted);font-size:12px;border:1px dashed rgba(255,255,255,.08);border-radius:10px">
            <div style="width:16px;height:16px;border-radius:50%;border:2px solid var(--accent);border-top-color:transparent;animation:spin .8s linear infinite;flex-shrink:0"></div>
            Generating AI corner predictions…
          </div>
        </div>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`
    : `<div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
          ${allMatches.length} fixture(s) loaded · <b style="color:var(--text)">${matchedCount}</b> matched to corner database · ${unknown.length} unmatched
        </div>
        ${matchSection(` Strong Over ${line} — both teams avg above line`, 'var(--green)', 'rgba(52,211,153,.06)', 'rgba(52,211,153,.20)', strongOver, 'No fixtures where both teams average above this line.')}
        ${matchSection(` Mixed — split verdict`, 'var(--yellow)', 'rgba(250,204,21,.06)', 'rgba(250,204,21,.18)', mixed, 'No mixed-verdict fixtures this week.')}
        ${matchSection(` Strong Under ${line} — both teams avg at or below line`, 'var(--red)', 'rgba(251,113,133,.06)', 'rgba(251,113,133,.20)', strongUnder, 'No fixtures where both teams average below this line.')}
        ${unknown.length ? matchSection(' Unmatched — teams not in corner database', 'var(--muted)', 'rgba(100,116,139,.05)', 'rgba(100,116,139,.15)', unknown, '') : ''}
      </div>`;

  document.getElementById('cornersLinesContent').innerHTML = `
    <!-- Summary KPI strip -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
      <div style="text-align:center;padding:10px;background:${pal.overBg};border:1px solid ${pal.overBorder};border-radius:9px">
        <div style="font-size:22px;font-weight:900;color:${pal.over}">${overTeams.length}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:2px">Over ${line} Teams</div>
      </div>
      <div style="text-align:center;padding:10px;background:${pal.underBg};border:1px solid ${pal.underBorder};border-radius:9px">
        <div style="font-size:22px;font-weight:900;color:${pal.under}">${underTeams.length}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:2px">Under ${line} Teams</div>
      </div>
      <div style="text-align:center;padding:10px;background:${pal.overBg};border:1px solid ${pal.overBorder};border-radius:9px">
        <div style="font-size:22px;font-weight:900;color:${pal.over}">${avgOverAvg}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:2px">Avg (Over group)</div>
      </div>
      <div style="text-align:center;padding:10px;background:${pal.underBg};border:1px solid ${pal.underBorder};border-radius:9px">
        <div style="font-size:22px;font-weight:900;color:${pal.under}">${avgUnderAvg}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:2px">Avg (Under group)</div>
      </div>
    </div>

    <!-- Tip bar -->
    <div style="padding:9px 13px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid var(--line);margin-bottom:14px;font-size:12px;line-height:1.55;color:var(--muted)">
       <b style="color:var(--text)">Betting tip for ${line} line:</b>
      ${line===9.5 ? `<b>${overPct}%</b> of tracked teams average over 9.5 corners. When <b>both</b> teams sit in the Over group the Over ${line} bet has the strongest edge. Look for  Strong Over matches in the fixtures section below.` :
        line===10.5 ? `Only <b>${overPct}%</b> of teams clear ${line} corners — team identity is critical at this line. Both teams must be in the Over group. Fixtures marked  are your highest-value targets.` :
        line===11.5 ? `Just <b>${overPct}%</b> of teams average above ${line}. Elite attacking sides only — wait for two top-tier teams. Any  Strong Over match this week is a rare, high-quality setup.` :
        `Extremely rare at ${line}+ — only <b>${overTeams.length}</b> teams in the dataset reach this average. A  Strong Over fixture at 12.5 is exceptional; proceed with high confidence.`}
    </div>

    <!-- ═══ TEAM REFERENCE COLUMNS ═══ -->
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--line)">
       Team Reference — Corner ${line} Line
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      ${makeSection(` Over ${line} — avg above the line`, pal.over, pal.overBg, pal.overBorder, overTeams, 'No teams above this line in the selected filter.')}
      ${makeSection(` Under ${line} — avg at or below line`, pal.under, pal.underBg, pal.underBorder, underTeams, 'All teams above this line — unusual.')}
    </div>

    <!-- ═══ PREDICTED MATCHES THIS WEEK ═══ -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--line)">
      <div>
        <span style="font-size:13px;font-weight:800;color:var(--accent)"> Predicted Matches — Over / Under ${line} Corners</span>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">From loaded fixtures &amp; predictions · matched against corner database</div>
      </div>
      <button onclick="cornersRenderLines()" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted);cursor:pointer">↻ Refresh</button>
    </div>
    ${matchesHtml}

    <!-- ═══ CORNERS ALL-LINES INTEL ═══ -->
    ${clBuildAllLinesSection(allMatches)}`;
}

// ══════════════════════════════════════════════════════════════
// FIXTURE CORNER PROBABILITIES — Poisson model
// ══════════════════════════════════════════════════════════════

// Poisson PMF: P(X=k) = (λ^k * e^-λ) / k!
function poissonPMF(lambda, k) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = k * Math.log(lambda) - lambda;
  for (let i = 1; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

// P(X <= threshold) using Poisson CDF
function poissonCDF(lambda, threshold) {
  let sum = 0;
  const kMax = Math.floor(threshold); // for X.5 lines, floor gives the integer ceiling
  for (let k = 0; k <= kMax; k++) sum += poissonPMF(lambda, k);
  return Math.min(sum, 1);
}

// For a line like 9.5: Under = P(X ≤ 9), Over = P(X ≥ 10)
function cornerProbs(lambda, line) {
  const underThreshold = Math.floor(line); // 9 for 9.5, 10 for 10.5 etc.
  const underProb = poissonCDF(lambda, underThreshold);
  return {
    under: underProb,
    over:  1 - underProb
  };
}

// Confidence label based on gap from 50%
function probConfLabel(pct) {
  if (pct >= 80) return { label: 'Very Strong', col: 'var(--green)' };
  if (pct >= 65) return { label: 'Strong',      col: 'var(--accent)' };
  if (pct >= 55) return { label: 'Moderate',    col: 'var(--yellow)' };
  return                { label: 'Marginal',    col: 'var(--orange)' };
}

// Strength bar HTML
function probBar(overPct, underPct) {
  const op = Math.round(overPct);
  const up = Math.round(underPct);
  return `<div style="display:flex;align-items:center;gap:6px;margin-top:5px">
    <span style="font-size:9px;color:var(--red);min-width:30px;text-align:right;font-weight:700">${up}%</span>
    <div style="flex:1;height:7px;background:rgba(255,255,255,.06);border-radius:6px;overflow:hidden;position:relative">
      <div style="position:absolute;left:0;top:0;height:100%;width:${up}%;background:var(--red);border-radius:6px 0 0 6px"></div>
      <div style="position:absolute;right:0;top:0;height:100%;width:${op}%;background:var(--green);border-radius:0 6px 6px 0"></div>
    </div>
    <span style="font-size:9px;color:var(--green);min-width:30px;font-weight:700">${op}%</span>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--line);margin-top:1px;padding:0 36px">
    <span>Under</span><span>Over</span>
  </div>`;
}

// Individual fixture probability card for one line
function probFixtureCard(m, line, palette) {
  const homeName = m.home || m.homeTeam || '?';
  const awayName = m.away || m.awayTeam || '?';
  const ht = clMatchTeam(homeName);
  const at = clMatchTeam(awayName);
  const league = m.league || '';
  const ko = m.datetime || m.kickoff || m.date || '';
  const koStr = ko ? (() => {
    try { return new Date(ko.replace(' ','T')).toLocaleString('en-ZA',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }
    catch(e){ return ko.slice(0,16); }
  })() : '—';

  // Combined average: mean of both if known, single if one, null if neither
  let lambda = null;
  if (ht && at) lambda = (ht.avg + at.avg) / 2;
  else if (ht)  lambda = ht.avg;
  else if (at)  lambda = at.avg;

  if (lambda === null) {
    // Unknown — can't assess
    return `<div style="border:1px solid rgba(100,116,139,.18);border-radius:9px;padding:10px 12px;background:rgba(100,116,139,.04);display:flex;align-items:center;gap:10px">
      <div style="flex:1">
        <div style="font-size:12px;font-weight:800;color:var(--text)">${homeName} <span style="color:var(--muted);font-weight:400">vs</span> ${awayName}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">${league} · ${koStr}</div>
      </div>
      <span style="font-size:10px;color:var(--muted);background:rgba(100,116,139,.08);border:1px solid rgba(100,116,139,.18);border-radius:6px;padding:2px 8px"> No data</span>
    </div>`;
  }

  const { under, over } = cornerProbs(lambda, line);
  const underPct = under * 100;
  const overPct  = over  * 100;
  const dominant = underPct > overPct ? 'under' : 'over';
  const dominantPct = dominant === 'under' ? underPct : overPct;
  const conf = probConfLabel(dominantPct);

  const borderCol  = dominant === 'under' ? palette.underRgb : palette.overRgb;
  const mainCol    = dominant === 'under' ? palette.under    : palette.over;

  function teamPill(name, t, side) {
    if (!t) return `<div style="flex:1;text-align:${side}">
      <div style="font-size:11px;font-weight:700;color:var(--text)">${name}</div>
      <div style="font-size:10px;color:var(--muted)">No data</div>
    </div>`;
    const c = cAvgColor(t.avg);
    const { under: tu, over: to } = cornerProbs(t.avg, line);
    const teamDom = tu > to ? `<span style="color:var(--red);font-size:9px;font-weight:700">Under ${line}</span>` : `<span style="color:var(--green);font-size:9px;font-weight:700">Over ${line}</span>`;
    return `<div style="flex:1;text-align:${side}">
      <div style="font-size:11px;font-weight:800;color:var(--text)">${t.flag} ${t.team}</div>
      <div style="font-size:9px;color:var(--muted)">${t.league}</div>
      <div style="margin-top:3px;display:flex;align-items:center;gap:4px;${side==='right'?'justify-content:flex-end':''}">
        <span style="font-size:12px;font-weight:900;color:${c}">${t.avg}</span>${teamDom}
      </div>
    </div>`;
  }

  return `<div style="border:1px solid rgba(${borderCol},.22);border-radius:9px;padding:10px 12px;background:rgba(${borderCol},.04);margin-bottom:7px">
    <!-- header -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:wrap;gap:4px">
      <div>
        <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">${league}</span>
        <span style="font-size:10px;color:var(--muted);margin-left:7px"> ${koStr}</span>
      </div>
      <span style="font-size:10px;font-weight:800;padding:2px 9px;border-radius:99px;background:rgba(0,0,0,.4);border:1px solid rgba(${borderCol},.3);color:${mainCol}">
        ${dominant === 'under' ? ` Under ${line}` : ` Over ${line}`} · ${dominantPct.toFixed(1)}%
      </span>
    </div>
    <!-- teams -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      ${teamPill(homeName, ht, 'left')}
      <div style="text-align:center;padding:4px 8px;background:rgba(0,0,0,.3);border-radius:7px;border:1px solid rgba(${borderCol},.2);min-width:52px">
        <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">λ avg</div>
        <div style="font-size:13px;font-weight:900;color:${mainCol}">${lambda.toFixed(1)}</div>
      </div>
      ${teamPill(awayName, at, 'right')}
    </div>
    <!-- probability display -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:5px">
      <div style="text-align:center;padding:6px;background:rgba(251,113,133,.08);border:1px solid rgba(251,113,133,.2);border-radius:7px">
        <div style="font-size:9px;color:var(--red);font-weight:700;text-transform:uppercase;letter-spacing:.05em">Under ${line}</div>
        <div style="font-size:18px;font-weight:900;color:var(--red);line-height:1.1">${underPct.toFixed(1)}%</div>
        <div style="font-size:9px;color:var(--muted)">prob. not reached</div>
      </div>
      <div style="text-align:center;padding:6px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);border-radius:7px">
        <div style="font-size:9px;color:var(--green);font-weight:700;text-transform:uppercase;letter-spacing:.05em">Over ${line}</div>
        <div style="font-size:18px;font-weight:900;color:var(--green);line-height:1.1">${overPct.toFixed(1)}%</div>
        <div style="font-size:9px;color:var(--muted)">prob. exceeded</div>
      </div>
    </div>
    <!-- split bar -->
    ${probBar(overPct, underPct)}
    <!-- confidence -->
    <div style="margin-top:5px;font-size:9px;font-weight:700;color:${conf.col};text-align:right">${conf.label} signal</div>
  </div>`;
}

// ── AI Fallback for Fixture Probabilities (offline mode) ──────
window.cornersProbAiLoad = async function() {
  const el = document.getElementById('cornersProbAiResult');
  if (!el) return;

  el.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:20px;color:var(--muted);font-size:12px;border:1px dashed rgba(255,255,255,.08);border-radius:10px">
    <div style="width:16px;height:16px;border-radius:50%;border:2px solid var(--accent);border-top-color:transparent;animation:spin .8s linear infinite;flex-shrink:0"></div>
    Generating fixture probabilities…
  </div>`;

  const today = new Date().toLocaleDateString('en-ZA', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const teamSample = CORNERS_TEAMS
    .slice().sort((a,b) => b.avg - a.avg)
    .slice(0, 40)
    .map(t => `${t.team} (${t.league}, avg ${t.avg})`).join('; ');

  const prompt = `You are a football corners analyst. Today is ${today}.

Generate 10–14 realistic top European football fixtures for today or this week from leagues including Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, Champions League, Europa League, and Scottish Premiership.

For each fixture respond ONLY with a JSON array. Each element must have:
- home: home team name (must exactly match one of these known teams where possible: ${teamSample})
- away: away team name
- league: league name
- datetime: ISO datetime string for today or this week

Example format:
[{"home":"Bayern Munich","away":"Bayer Leverkusen","league":"Bundesliga","datetime":"${new Date().toISOString().slice(0,10)}T15:00:00"},...]

Return ONLY the JSON array. No markdown, no explanation, no code blocks.`;

  try {
    const resp = await fetch('/ai/prediction-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await resp.json();
    const text = (data.content || []).map(c => c.text || '').join('');
    let fixtures = [];
    try {
      const clean = text.replace(/```json|```/g,'').trim();
      fixtures = JSON.parse(clean);
      if (!Array.isArray(fixtures)) fixtures = [];
    } catch(e) {
      // try extracting array from text
      const m = text.match(/\[[\s\S]*\]/);
      if (m) { try { fixtures = JSON.parse(m[0]); } catch(e2) { fixtures = []; } }
    }

    if (!fixtures.length) {
      el.innerHTML = `<div style="padding:16px;border:1px solid rgba(251,113,133,.25);border-radius:10px;background:rgba(251,113,133,.06);color:var(--red);font-size:12px">
         AI returned no fixtures. Click ↻ Regenerate to try again, or connect your server.
      </div>`;
      return;
    }

    // Now render using the full probability engine with these AI fixtures
    // Temporarily populate S.fixtures and re-render
    const LINES = [9.5, 10.5, 11.5, 12.5];
    const palettes = {
      9.5:  { over:'var(--green)', under:'var(--red)', overRgb:'52,211,153',  underRgb:'251,113,133' },
      10.5: { over:'var(--accent)', under:'var(--orange)', overRgb:'34,211,238',  underRgb:'251,146,60'  },
      11.5: { over:'var(--purple)', under:'var(--yellow)', overRgb:'167,139,250', underRgb:'250,204,21'  },
      12.5: { over:'var(--red)', under:'var(--muted)', overRgb:'251,113,133', underRgb:'148,163,184' },
    };
    const lineTheme = {
      9.5:  { accent:'var(--green)', accentRgb:'52,211,153',  label:'9.5 Corners' },
      10.5: { accent:'var(--accent)', accentRgb:'34,211,238',  label:'10.5 Corners' },
      11.5: { accent:'var(--purple)', accentRgb:'167,139,250', label:'11.5 Corners' },
      12.5: { accent:'var(--red)', accentRgb:'251,113,133', label:'12.5 Corners' },
    };

    function buildAiLineSection(line) {
      const pal   = palettes[line];
      const theme = lineTheme[line];
      const scored = fixtures.map(m => {
        const ht = clMatchTeam(m.home || '');
        const at = clMatchTeam(m.away || '');
        let lambda = null;
        if (ht && at) lambda = (ht.avg + at.avg) / 2;
        else if (ht)  lambda = ht.avg;
        else if (at)  lambda = at.avg;
        const probs = lambda !== null ? cornerProbs(lambda, line) : null;
        return { m, lambda, probs };
      });
      const known   = scored.filter(s => s.lambda !== null);
      const unknown = scored.filter(s => s.lambda === null);
      const underSorted = [...known].sort((a,b) => b.probs.under - a.probs.under);
      const overSorted  = [...known].sort((a,b) => b.probs.over  - a.probs.over);
      const avgUnder = known.length ? (known.reduce((s,x)=>s+x.probs.under,0)/known.length*100).toFixed(1) : '—';
      const avgOver  = known.length ? (known.reduce((s,x)=>s+x.probs.over, 0)/known.length*100).toFixed(1) : '—';
      const strongUnderCount = known.filter(x => x.probs.under >= 0.60).length;
      const strongOverCount  = known.filter(x => x.probs.over  >= 0.60).length;

      return `<div style="margin-bottom:28px;border:1px solid rgba(${theme.accentRgb},.2);border-radius:14px;overflow:hidden">
        <div style="padding:12px 16px;background:rgba(${theme.accentRgb},.07);border-bottom:1px solid rgba(${theme.accentRgb},.2);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span style="font-size:15px;font-weight:900;color:${theme.accent}">Line ${line}</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <div style="text-align:center;padding:4px 10px;background:rgba(251,113,133,.10);border:1px solid rgba(251,113,133,.25);border-radius:7px">
              <div style="font-size:8px;color:var(--red);font-weight:700;text-transform:uppercase">Avg Under%</div>
              <div style="font-size:13px;font-weight:900;color:var(--red)">${avgUnder}%</div>
            </div>
            <div style="text-align:center;padding:4px 10px;background:rgba(52,211,153,.10);border:1px solid rgba(52,211,153,.25);border-radius:7px">
              <div style="font-size:8px;color:var(--green);font-weight:700;text-transform:uppercase">Avg Over%</div>
              <div style="font-size:13px;font-weight:900;color:var(--green)">${avgOver}%</div>
            </div>
            <div style="text-align:center;padding:4px 10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:7px">
              <div style="font-size:8px;color:var(--muted);font-weight:700;text-transform:uppercase">Strong Under</div>
              <div style="font-size:13px;font-weight:900;color:var(--red)">${strongUnderCount}</div>
            </div>
            <div style="text-align:center;padding:4px 10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:7px">
              <div style="font-size:8px;color:var(--muted);font-weight:700;text-transform:uppercase">Strong Over</div>
              <div style="font-size:13px;font-weight:900;color:var(--green)">${strongOverCount}</div>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
          <div style="border-right:1px solid rgba(${theme.accentRgb},.1);padding:12px">
            <div style="font-size:11px;font-weight:800;color:var(--red);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(251,113,133,.18)"> Under ${line} — ranked by probability of NOT reaching</div>
            ${underSorted.map(s => probFixtureCard(s.m, line, pal)).join('')}
          </div>
          <div style="padding:12px">
            <div style="font-size:11px;font-weight:800;color:var(--green);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(52,211,153,.18)"> Over ${line} — ranked by probability of EXCEEDING</div>
            ${overSorted.map(s => probFixtureCard(s.m, line, pal)).join('')}
          </div>
        </div>
        ${unknown.length ? `<div style="padding:7px 14px;border-top:1px solid rgba(${theme.accentRgb},.1);font-size:10px;color:var(--muted)"> ${unknown.length} fixture(s) not in corner database</div>` : ''}
      </div>`;
    }

    el.innerHTML = `
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px;padding:8px 12px;background:rgba(251,191,36,.05);border:1px solid rgba(251,191,36,.15);border-radius:8px">
         AI-generated fixtures (${fixtures.length} matches) · Connect your server for real fixture data
      </div>
      ${LINES.map(buildAiLineSection).join('')}`;

  } catch(err) {
    el.innerHTML = `<div style="padding:16px;border:1px solid rgba(251,113,133,.25);border-radius:10px;background:rgba(251,113,133,.06)">
      <div style="color:var(--red);font-weight:700;margin-bottom:4px"> AI prediction failed</div>
      <div style="font-size:11px;color:var(--muted)">${err.message}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px">Data is temporarily unavailable. Please try again shortly.</div>
    </div>`;
  }
};

// ── Main render ───────────────────────────────────────────────
function cornersRenderProb() {
  const el = document.getElementById('cornersProbContent');
  if (!el) return;

  // Gather all unique fixtures
  const allMatches = [
    ...(window.S?.fixtures || []),
    ...(window.S?.predictions || [])
  ].filter((m, i, arr) =>
    arr.findIndex(x => {
      const xKo = x.datetime || x.kickoff || x.date || '';
      const mKo = m.datetime || m.kickoff || m.date || '';
      return xKo === mKo && (x.home || x.homeTeam) === (m.home || m.homeTeam);
    }) === i
  );

  if (!allMatches.length) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.18);border-radius:10px;margin-bottom:12px">
        <div style="font-size:22px"></div>
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--accent)">Football AI — Offline Mode</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">No server connection. The AI is generating fixture corner probabilities using the corner database.</div>
        </div>
        <button onclick="cornersProbAiLoad()" style="margin-left:auto;flex-shrink:0;font-size:11px;padding:6px 12px;border-radius:7px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.3);color:var(--accent);cursor:pointer">↻ Regenerate</button>
      </div>
      <div id="cornersProbAiResult">
        <div style="display:flex;align-items:center;gap:10px;padding:20px;color:var(--muted);font-size:12px;border:1px dashed rgba(255,255,255,.08);border-radius:10px">
          <div style="width:16px;height:16px;border-radius:50%;border:2px solid var(--accent);border-top-color:transparent;animation:spin .8s linear infinite;flex-shrink:0"></div>
          Generating fixture probabilities…
        </div>
      </div>`;
    cornersProbAiLoad();
    return;
  }

  const LINES = [9.5, 10.5, 11.5, 12.5];
  const palettes = {
    9.5:  { over:'var(--green)', under:'var(--red)', overRgb:'52,211,153',  underRgb:'251,113,133' },
    10.5: { over:'var(--accent)', under:'var(--orange)', overRgb:'34,211,238',  underRgb:'251,146,60'  },
    11.5: { over:'var(--purple)', under:'var(--yellow)', overRgb:'167,139,250', underRgb:'250,204,21'  },
    12.5: { over:'var(--red)', under:'var(--muted)', overRgb:'251,113,133', underRgb:'148,163,184' },
  };

  // Line colours for section headers
  const lineTheme = {
    9.5:  { accent:'var(--green)', accentRgb:'52,211,153',  label:'9.5 Corners' },
    10.5: { accent:'var(--accent)', accentRgb:'34,211,238',  label:'10.5 Corners' },
    11.5: { accent:'var(--purple)', accentRgb:'167,139,250', label:'11.5 Corners' },
    12.5: { accent:'var(--red)', accentRgb:'251,113,133', label:'12.5 Corners' },
  };

  function buildLineSection(line) {
    const pal   = palettes[line];
    const theme = lineTheme[line];

    // Score every match
    const scored = allMatches.map(m => {
      const homeName = m.home || m.homeTeam || '';
      const awayName = m.away || m.awayTeam || '';
      const ht = clMatchTeam(homeName);
      const at = clMatchTeam(awayName);
      let lambda = null;
      if (ht && at) lambda = (ht.avg + at.avg) / 2;
      else if (ht)  lambda = ht.avg;
      else if (at)  lambda = at.avg;
      const probs = lambda !== null ? cornerProbs(lambda, line) : null;
      return { m, lambda, probs, homeName, awayName };
    });

    const known   = scored.filter(s => s.lambda !== null);
    const unknown = scored.filter(s => s.lambda === null);

    // Sort: strongest Under probability first in Under column, strongest Over in Over column
    const underSorted = [...known].sort((a,b) => b.probs.under - a.probs.under);
    const overSorted  = [...known].sort((a,b) => b.probs.over  - a.probs.over );

    // Summary stats
    const avgUnder = known.length ? (known.reduce((s,x)=>s+x.probs.under,0)/known.length*100).toFixed(1) : '—';
    const avgOver  = known.length ? (known.reduce((s,x)=>s+x.probs.over, 0)/known.length*100).toFixed(1) : '—';
    const strongUnderCount = known.filter(x => x.probs.under >= 0.60).length;
    const strongOverCount  = known.filter(x => x.probs.over  >= 0.60).length;

    return `
    <!-- ══ LINE SECTION: ${line} ══ -->
    <div style="margin-bottom:32px;border:1px solid rgba(${theme.accentRgb},.2);border-radius:14px;overflow:hidden">

      <!-- Section header -->
      <div style="padding:14px 18px;background:rgba(${theme.accentRgb},.07);border-bottom:1px solid rgba(${theme.accentRgb},.2);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span style="font-size:16px;font-weight:900;color:${theme.accent}">Line ${line}</span>
          <span style="font-size:11px;color:var(--muted)">· ${known.length} fixture${known.length!==1?'s':''} assessed · ${unknown.length} no data</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <div style="text-align:center;padding:5px 12px;background:rgba(251,113,133,.10);border:1px solid rgba(251,113,133,.25);border-radius:8px">
            <div style="font-size:9px;color:var(--red);font-weight:700;text-transform:uppercase">Avg Under%</div>
            <div style="font-size:14px;font-weight:900;color:var(--red)">${avgUnder}%</div>
          </div>
          <div style="text-align:center;padding:5px 12px;background:rgba(52,211,153,.10);border:1px solid rgba(52,211,153,.25);border-radius:8px">
            <div style="font-size:9px;color:var(--green);font-weight:700;text-transform:uppercase">Avg Over%</div>
            <div style="font-size:14px;font-weight:900;color:var(--green)">${avgOver}%</div>
          </div>
          <div style="text-align:center;padding:5px 12px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:8px">
            <div style="font-size:9px;color:var(--muted);font-weight:700;text-transform:uppercase">Strong Under (≥60%)</div>
            <div style="font-size:14px;font-weight:900;color:var(--red)">${strongUnderCount}</div>
          </div>
          <div style="text-align:center;padding:5px 12px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:8px">
            <div style="font-size:9px;color:var(--muted);font-weight:700;text-transform:uppercase">Strong Over (≥60%)</div>
            <div style="font-size:14px;font-weight:900;color:var(--green)">${strongOverCount}</div>
          </div>
        </div>
      </div>

      <!-- Two columns: Strongest Under | Strongest Over -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">

        <!-- UNDER COLUMN -->
        <div style="border-right:1px solid rgba(${theme.accentRgb},.1);padding:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(251,113,133,.18)">
            <span style="width:3px;height:18px;background:var(--red);border-radius:2px;flex-shrink:0"></span>
            <div>
              <div style="font-size:12px;font-weight:800;color:var(--red)"> Under ${line} — Ranked by probability of NOT reaching ${line}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:1px">Highest probability the match stays under</div>
            </div>
          </div>
          ${underSorted.length
            ? underSorted.map(s => probFixtureCard(s.m, line, pal)).join('')
            : `<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px;border:1px dashed rgba(255,255,255,.07);border-radius:8px">No matched fixtures</div>`}
        </div>

        <!-- OVER COLUMN -->
        <div style="padding:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(52,211,153,.18)">
            <span style="width:3px;height:18px;background:var(--green);border-radius:2px;flex-shrink:0"></span>
            <div>
              <div style="font-size:12px;font-weight:800;color:var(--green)"> Over ${line} — Ranked by probability of EXCEEDING ${line}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:1px">Highest probability the match goes over</div>
            </div>
          </div>
          ${overSorted.length
            ? overSorted.map(s => probFixtureCard(s.m, line, pal)).join('')
            : `<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px;border:1px dashed rgba(255,255,255,.07);border-radius:8px">No matched fixtures</div>`}
        </div>

      </div>

      <!-- No-data footnote -->
      ${unknown.length ? `
      <div style="padding:8px 16px;border-top:1px solid rgba(${theme.accentRgb},.1);font-size:10px;color:var(--muted)">
         ${unknown.length} fixture${unknown.length!==1?'s':''} couldn't be matched to the corner database:
        ${unknown.map(s=>`<span style="margin-left:6px;padding:1px 6px;background:rgba(100,116,139,.08);border-radius:4px">${s.homeName} vs ${s.awayName}</span>`).join('')}
      </div>` : ''}
    </div>`;
  }

  // Top summary strip across all 4 lines
  const summaryStrip = LINES.map(line => {
    const theme = lineTheme[line];
    const known = allMatches.map(m => {
      const ht = clMatchTeam(m.home || m.homeTeam || '');
      const at = clMatchTeam(m.away || m.awayTeam || '');
      let lambda = null;
      if (ht && at) lambda = (ht.avg + at.avg) / 2;
      else if (ht)  lambda = ht.avg;
      else if (at)  lambda = at.avg;
      return lambda;
    }).filter(l => l !== null);
    const strongUnder = known.filter(l => cornerProbs(l,line).under >= 0.60).length;
    const strongOver  = known.filter(l => cornerProbs(l,line).over  >= 0.60).length;
    return `<div style="text-align:center;padding:10px;background:rgba(0,0,0,.25);border:1px solid rgba(${theme.accentRgb},.2);border-radius:9px">
      <div style="font-size:13px;font-weight:900;color:${theme.accent};margin-bottom:3px">${line}</div>
      <div style="display:flex;justify-content:center;gap:8px;font-size:11px;font-weight:800">
        <span style="color:var(--red)">${strongUnder}↓</span>
        <span style="color:var(--muted)">/</span>
        <span style="color:var(--green)">${strongOver}↑</span>
      </div>
      <div style="font-size:8px;color:var(--muted);margin-top:2px">strong signals</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <!-- intro strip -->
    <div style="padding:10px 14px;background:rgba(34,211,238,.05);border:1px solid rgba(34,211,238,.15);border-radius:10px;margin-bottom:16px;font-size:12px;color:var(--muted);line-height:1.55">
       <b style="color:var(--text)">How probabilities are calculated:</b>
      Total corners in a match follow a Poisson distribution with λ = combined team corner average.
      <b>Under probability</b> = P(X ≤ floor(line)); <b>Over probability</b> = 1 − Under.
      Each fixture is ranked independently per line — a match can be a strong Under at 12.5 but a strong Over at 9.5.
    </div>

    <!-- 4-line summary -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
      ${summaryStrip}
    </div>

    <!-- One full section per line -->
    ${LINES.map(buildLineSection).join('')}
  `;
}

// ── Odds Decoder ──────────────────────────────────────────────
function cornersRenderOdds(){
  const ic=(big,col,title,body)=>`<div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px">
    <div style="font-size:22px;font-weight:800;color:${col};margin-bottom:4px">${big}</div>
    <h3 style="font-size:12px;font-weight:700;color:var(--muted);margin:0 0 6px;text-transform:uppercase;letter-spacing:.06em">${title}</h3>
    <p style="font-size:12px;margin:0;line-height:1.5">${body}</p></div>`;
  document.getElementById('cornersOddsGrid').innerHTML=
    ic('','var(--text)','What odds mean for Over 9.5','Bookmakers price the probability directly into the odds. Understanding implied probability lets you spot value — or avoid traps.')+
    ic('1.65–1.75','var(--green)','Strong favourite — ~57–61% implied','Confident this game reaches 9.5+ corners. Usually paired with top-6 EPL, Bayern, PSG, or Barcelona. Generally a solid bet if the teams match the profile.')+
    ic('1.80–1.90','var(--accent)','Moderate probability — ~53–56%','Slightly above even money. Leaning toward Over, but meaningful uncertainty. Works best when both teams have a history of over 9.5.')+
    ic('1.90–2.00','var(--yellow)','Near coin-flip — ~50–53%','The market sees this as almost 50/50. <b>Team identity becomes the key</b>. If one team is Wolves or Getafe, avoid.')+
    ic('2.00–2.20','var(--orange)','Under is the favourite — ~45–50%','<b style="color:var(--red)"> Caution zone.</b> Bookmaker sees Under 9.5 as more likely. Atlético, Juventus, Torino, Wolves often sit here.')+
    ic('2.20+','var(--red)','Strong Under signal — &lt;45% implied','<b style="color:var(--red)"> Avoid.</b> Priced at 2.25 or above means bookmakers expect a low-corner game. Do not bet Over 9.5 without strong contrary evidence.')+
    ic('','var(--text)','The "avoid" threshold rule','Any Over 9.5 bet priced at <b style="color:var(--red)">2.05 or higher</b> should be treated with scepticism unless you can identify a specific reason the market is wrong.')+
    ic('~1.5','var(--accent)','Home vs Away corner split','Home teams on average earn ~1.5 more corners per game. Always check venue when betting close to the 9.5 line.')+
    ic('','var(--text)','League context matters','A "borderline" team in Bundesliga operates in Europe\'s highest-corner environment. The same avg in Serie A is actually above-league-average.');
}

// ── Insights ──────────────────────────────────────────────────
function cornersRenderInsights(){
  const ic=(big,col,title,body)=>`<div style="background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px">
    <div style="font-size:22px;font-weight:800;color:${col};margin-bottom:2px">${big}</div>
    <h3 style="font-size:12px;font-weight:700;color:var(--muted);margin:0 0 6px;text-transform:uppercase;letter-spacing:.06em">${title}</h3>
    <p style="font-size:12px;margin:0;line-height:1.5">${body}</p></div>`;
  document.getElementById('cornersInsightsGrid').innerHTML=
    ic('Getafe','var(--red)','Lowest in La Liga / all major leagues','Getafe average just <b>7.6 corners/match</b>, hitting over 9.5 in only ~22% of games. Back Under 9.5 regardless of who they face.')+
    ic('Atlético Madrid','var(--red)','Simeone\'s block — a corner killer','Atlético sit deep, defend in numbers, avg <b>8.3 corners</b> and only 30% over-9.5. One of the safest Under 9.5 plays in Europe.')+
    ic('Italian Defensive 5','var(--orange)','Serie A bottom half = corner desert','Lecce (7.7), Cagliari (8.0), Torino (7.9) make Serie A the lowest Big-5 league for corners.')+
    ic('Bayern Munich','var(--green)','Europe\'s highest individual average','Bayern\'s 12.4 corners/match and 73% over-9.5 rate make them the most reliable Over 9.5 play in European football.')+
    ic('Bundesliga','var(--green)','Highest corner-volume league in Europe','The Bundesliga averages <b>10.9 corners/match</b>. Even mid-table Bundesliga games beat most Serie A or Ligue 1 fixtures.')+
    ic('PSG effect','var(--yellow)','Ligue 1 average is misleading','PSG\'s 11.7 average inflates Ligue 1\'s overall number. Strip them out and the league sits closer to 9.0.')+
    ic('Relegation battles','var(--purple)','Late-season corners collapse','Teams fighting relegation play more conservatively — corner averages drop 1.2–1.8 per game in March–May.')+
    ic('Celtic','var(--accent)','Scottish outlier — highest Celtic count','Celtic\'s 11.9 average is remarkable for a lower-ranked league. Other Scottish sides are sub-8.5 — Europe\'s biggest gap.')+
    ic('Rule of thumb','var(--text)','Practical betting rule','When both teams average <b style="color:var(--green)">over 10.5 corners</b>, bet Over 9.5 with confidence. When either averages <b style="color:var(--red)">under 8.0</b>, lean Under 9.5 regardless.');
}

// ── Tab Switcher ──────────────────────────────────────────────
window.cornersSetTab=function(tab,btn){
  cornersTab=tab;
  document.querySelectorAll('#corners button[id^="cTab-"]').forEach(b=>{b.classList.remove('active');b.style.background='';b.style.borderColor='';b.style.color='';});
  btn.classList.add('active');
  const mc=document.getElementById('cornersMainCard');
  const oc=document.getElementById('cornersOddsCard');
  const ic=document.getElementById('cornersInsightsCard');
  const lc=document.getElementById('cornersLinesCard');
  const pc=document.getElementById('cornersProbCard');
  const allCards=[mc,oc,ic,lc,pc];
  allCards.forEach(c=>c&&c.classList.add('hidden'));
  if(tab==='odds'){    oc.classList.remove('hidden'); cornersRenderOdds(); }
  else if(tab==='insights'){ ic.classList.remove('hidden'); cornersRenderInsights(); }
  else if(tab==='lines'){    lc.classList.remove('hidden'); cornersRenderLines(); }
  else if(tab==='prob'){     pc.classList.remove('hidden'); cornersRenderProb(); }
  else{ mc.classList.remove('hidden'); cornersRenderTable(); }
};

// ── Filter ────────────────────────────────────────────────────
window.cornersApplyFilter=function(){
  cornersLeague=document.getElementById('cornersLeagueFilter').value;
  const mode=document.getElementById('cornersViewMode').value;
  if(cornersTab==='lines'){ cornersRenderLines(); cornersRenderKPI(); return; }
  if(cornersTab==='prob'){  cornersRenderProb();  cornersRenderKPI(); return; }
  if(mode==='leagues') cornersRenderLeagues();
  else cornersRenderTable();
  cornersRenderKPI();
};

// ── Init on tab open ──────────────────────────────────────────
const _origShowTab=window.showTab;
window.showTab=function(id,btn){
  if(typeof _origShowTab==='function') _origShowTab(id,btn);
  if(id==='corners'){
    cornersRenderKPI();
    if(cornersTab==='lines'){
      cornersRenderLines();
      setTimeout(()=>{
        const wrap=document.getElementById('cornersAiPredWrap');
        const res=document.getElementById('cornersAiPredResult');
        if(wrap && res && res.querySelector('[style*="animation"]')){
          window.cornersAiLoadPredictions(cornersActiveLine);
        }
      },120);
    } else if(cornersTab==='prob'){
      cornersRenderProb();
    } else {
      cornersRenderTable();
    }
  }
};

// ── AI Fallback Prediction Loader ────────────────────────────
window.cornersAiLoadPredictions = async function(line = 9.5) {
  const el = document.getElementById('cornersAiPredResult');
  if (!el) return;

  el.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:20px;color:var(--muted);font-size:12px;border:1px dashed rgba(255,255,255,.08);border-radius:10px">
    <div style="width:16px;height:16px;border-radius:50%;border:2px solid var(--accent);border-top-color:transparent;animation:spin .8s linear infinite;flex-shrink:0"></div>
    Generating AI corner predictions…
  </div>`;

  // Build a brief team list for context (top 30 teams by avg)
  const teamSample = CORNERS_TEAMS
    .slice().sort((a,b) => b.avg - a.avg)
    .slice(0, 30)
    .map(t => `${t.team} (${t.league}, avg ${t.avg}, over9.5=${t.over9_5}%)`).join('; ');

  const today = new Date().toLocaleDateString('en-ZA', {weekday:'long', day:'numeric', month:'long', year:'numeric'});

  const prompt = `You are a Football AI analyst, an expert football corners analyst. Today is ${today}.

The user is analysing the Over/Under ${line} corners betting market. Below is a sample of teams from the corner database:
${teamSample}

Generate a realistic set of 6–8 top European football fixture predictions for today or this week (invent plausible matchups from the teams above). For each fixture, provide:
- homeTeam (exact name from database where possible)
- awayTeam (exact name from database where possible)
- league
- kickoff (ISO datetime, today or within 3 days)
- combinedAvg (average of both teams' corner averages)
- verdict: one of " Strong Over ${line}", " Mixed — lean Over ${line}", " Mixed — lean Under ${line}", " Strong Under ${line}"
- reason (one sentence explaining the verdict)
- confidence (number 50–95)

Return ONLY a valid JSON array, no markdown, no explanation. Example format:
[{"homeTeam":"Bayern Munich","awayTeam":"Borussia Dortmund","league":"Bundesliga","kickoff":"2026-09-07T15:30:00","combinedAvg":11.8,"verdict":" Strong Over ${line}","reason":"Both teams are in the top 3 for corners in the Bundesliga.","confidence":87}]`;

  try {
    const resp = await fetch('/ai/prediction-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await resp.json();
    const raw = (data.content || []).map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim();
    let fixtures;
    try { fixtures = JSON.parse(raw); } catch(e) {
      throw new Error('AI returned invalid JSON: ' + raw.slice(0, 200));
    }

    if (!Array.isArray(fixtures) || fixtures.length === 0) throw new Error('No fixtures returned');

    // Render using the same clMatchCard system — convert AI fixtures to internal format
    const overFx  = fixtures.filter(f => f.verdict && f.verdict.startsWith(''));
    const mixedFx = fixtures.filter(f => f.verdict && f.verdict.startsWith(''));
    const underFx = fixtures.filter(f => f.verdict && f.verdict.startsWith(''));

    function aiCard(f) {
      const isOver  = f.verdict.startsWith('');
      const isUnder = f.verdict.startsWith('');
      const col     = isOver ? 'var(--green)' : isUnder ? 'var(--red)' : 'var(--yellow)';
      const bg      = isOver ? 'rgba(52,211,153,.06)' : isUnder ? 'rgba(251,113,133,.06)' : 'rgba(250,204,21,.06)';
      const border  = isOver ? 'rgba(52,211,153,.20)' : isUnder ? 'rgba(251,113,133,.20)' : 'rgba(250,204,21,.18)';
      const koStr   = f.kickoff ? (() => { try { return new Date(f.kickoff).toLocaleString('en-ZA',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); } catch(e){ return f.kickoff.slice(0,16); } })() : '—';
      // Look up each team from CORNERS_TEAMS
      const ht = clMatchTeam(f.homeTeam);
      const at = clMatchTeam(f.awayTeam);
      function chip(name, t, side) {
        if (!t) return `<div style="flex:1;padding:7px 10px;background:rgba(255,255,255,.03);border-radius:7px;text-align:${side}"><div style="font-size:12px;font-weight:700">${name||'—'}</div><div style="font-size:10px;color:var(--muted);margin-top:2px">No database entry</div></div>`;
        const c = cAvgColor(t.avg), bw = Math.min(100,(t.avg/14)*100).toFixed(0);
        const ou = t.avg > line ? `<span style="color:var(--green);font-size:9px;font-weight:700">OVER ${line}</span>` : `<span style="color:var(--red);font-size:9px;font-weight:700">UNDER ${line}</span>`;
        return `<div style="flex:1;padding:7px 10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:7px;text-align:${side}">
          <div style="font-size:12px;font-weight:800">${t.flag} ${t.team}</div>
          <div style="font-size:10px;color:var(--muted)">${t.league}</div>
          <div style="margin-top:5px;display:flex;align-items:center;gap:6px;${side==='right'?'justify-content:flex-end':''}"><span style="font-size:14px;font-weight:900;color:${c}">${t.avg}</span>${ou}</div>
          <div style="height:3px;background:var(--line);border-radius:6px;overflow:hidden;margin-top:4px"><i style="display:block;height:100%;width:${bw}%;background:${c};border-radius:6px"></i></div>
        </div>`;
      }
      const avg = f.combinedAvg != null ? `<div style="text-align:center;padding:6px 12px;background:rgba(0,0,0,.3);border-radius:7px;border:1px solid rgba(255,255,255,.08)"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Combined avg</div><div style="font-size:16px;font-weight:900;color:${cAvgColor(f.combinedAvg)}">${Number(f.combinedAvg).toFixed(1)}</div></div>` : `<div style="text-align:center;font-size:18px;font-weight:900;color:var(--muted);padding:6px 12px">vs</div>`;
      return `<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">${f.league||''}</span>
            <span style="font-size:10px;color:var(--muted);margin-left:8px"> ${koStr}</span>
            ${f.confidence ? `<span style="font-size:10px;padding:1px 7px;border-radius:5px;background:rgba(34,211,238,.10);border:1px solid rgba(56,189,248,.2);color:var(--accent);margin-left:6px">${f.confidence}% conf</span>` : ''}
          </div>
          <span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:99px;background:rgba(0,0,0,.4);border:1px solid ${border};color:${col}">${f.verdict}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${chip(f.homeTeam, ht, 'left')}
          ${avg}
          ${chip(f.awayTeam, at, 'right')}
        </div>
        ${f.reason ? `<div style="margin-top:8px;font-size:11px;color:var(--muted);padding:6px 10px;background:rgba(255,255,255,.02);border-radius:6px;border-left:2px solid ${border}"> ${f.reason}</div>` : ''}
      </div>`;
    }

    function aiSection(title, col, bg, border, items, emptyMsg) {
      return `<div style="margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:3px;height:16px;border-radius:2px;background:${col}"></div>
          <span style="font-size:12px;font-weight:800;color:${col}">${title}</span>
          <span style="font-size:10px;padding:1px 7px;border-radius:99px;background:rgba(0,0,0,.4);border:1px solid ${border};color:${col}">${items.length}</span>
        </div>
        ${items.length ? items.map(aiCard).join('') : `<div style="text-align:center;padding:18px;color:var(--muted);font-size:12px;border:1px dashed rgba(255,255,255,.08);border-radius:8px">${emptyMsg}</div>`}
      </div>`;
    }

    el.innerHTML = `
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
         <b style="color:var(--accent)">AI-generated predictions</b> · ${fixtures.length} fixture(s) · matched against corner database · <span style="color:var(--orange)">Connect server for live data</span>
      </div>
      ${aiSection(` Strong Over ${line} — both teams avg above line`, 'var(--green)', 'rgba(52,211,153,.06)', 'rgba(52,211,153,.20)', overFx, 'No strong over fixtures generated.')}
      ${aiSection(` Mixed — split verdict`, 'var(--yellow)', 'rgba(250,204,21,.06)', 'rgba(250,204,21,.18)', mixedFx, 'No mixed fixtures generated.')}
      ${aiSection(` Strong Under ${line} — both teams avg at or below line`, 'var(--red)', 'rgba(251,113,133,.06)', 'rgba(251,113,133,.20)', underFx, 'No strong under fixtures generated.')}`;

  } catch(err) {
    el.innerHTML = `<div style="padding:16px;border:1px solid rgba(251,113,133,.25);border-radius:10px;background:rgba(251,113,133,.06)">
      <div style="color:var(--red);font-weight:700;margin-bottom:4px"> AI prediction failed</div>
      <div style="font-size:11px;color:var(--muted)">${err.message}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px">Data is temporarily unavailable. Please try again shortly.</div>
    </div>`;
  }
};

// Auto-trigger AI predictions when Lines or Prob tab is first opened with no data
const _cornersOrigSetTab = window.cornersSetTab;
window.cornersSetTab = function(tab, btn) {
  if (typeof _cornersOrigSetTab === 'function') _cornersOrigSetTab(tab, btn);
  if (tab === 'lines') {
    setTimeout(() => {
      const wrap = document.getElementById('cornersAiPredWrap');
      const res  = document.getElementById('cornersAiPredResult');
      if (wrap && res && res.querySelector('[style*="animation"]')) {
        window.cornersAiLoadPredictions(cornersActiveLine);
      }
    }, 100);
  }
  if (tab === 'prob') {
    setTimeout(() => {
      const res = document.getElementById('cornersProbAiResult');
      if (res && res.querySelector('[style*="animation"]')) {
        window.cornersProbAiLoad();
      }
    }, 100);
  }
};

// Re-render predicted matches section whenever global data refreshes
const _origRefreshAllCorners = window.refreshAll;
window.refreshAll = async function(...args){
  const result = typeof _origRefreshAllCorners==='function' ? await _origRefreshAllCorners(...args) : undefined;
  if(cornersTab==='lines' && !document.getElementById('cornersLinesCard')?.classList.contains('hidden')){
    cornersRenderLines();
  }
  if(cornersTab==='prob' && !document.getElementById('cornersProbCard')?.classList.contains('hidden')){
    cornersRenderProb();
  }
  return result;
};

})();

document.getElementById('webhookUrlDisplay').textContent = (localStorage.getItem('faiProxyUrl') || window.location.origin) + '/webhooks/payfast';

/* ══ MONETISATION JS ═════════════════════════════════════════ */
(function(){

// ── State ──────────────────────────────────────────────────
let selectedPlan = 'monthly';
let proUnlocked  = localStorage.getItem('faiProUnlocked') === '1';
let affClicks    = parseInt(localStorage.getItem('faiAffClicks') || '0');
let wlEnquiries  = parseInt(localStorage.getItem('faiWLCount') || '0');

// ── Affiliate URLs (editable) ──────────────────────────────
function getAffLinks() {
  return {

    hollywood: localStorage.getItem('affHollywood') || 'https://m.hollywoodbets.net/',
    tenbet:    localStorage.getItem('aff10bet')     || 'https://www.10bet.co.za/',
  };
}

// ── Payment URL save / load ───────────────────────────────────
window.savePaymentUrls = function() {
  const pm = document.getElementById('inputPayfastMonthly')?.value.trim();
  const pl = document.getElementById('inputPayfastLifetime')?.value.trim();
  const sm = document.getElementById('inputStripeMonthly')?.value.trim();
  const sl = document.getElementById('inputStripeLifetime')?.value.trim();
  if (pm) localStorage.setItem('faiPayfastMonthly', pm);
  if (pl) localStorage.setItem('faiPayfastLifetime', pl);
  if (sm) localStorage.setItem('faiStripeMonthly', sm);
  if (sl) localStorage.setItem('faiStripeLifetime', sl);
  const s = document.getElementById('payUrlSaved');
  if (s) { s.style.display = 'inline'; setTimeout(() => s.style.display = 'none', 2500); }
};
(function loadPaymentUrlsIntoInputs() {
  const pairs = [
    ['inputPayfastMonthly',  'faiPayfastMonthly'],
    ['inputPayfastLifetime', 'faiPayfastLifetime'],
    ['inputStripeMonthly',   'faiStripeMonthly'],
    ['inputStripeLifetime',  'faiStripeLifetime'],
  ];
  function tryLoad() {
    pairs.forEach(([id, key]) => {
      const el = document.getElementById(id);
      const val = localStorage.getItem(key);
      if (el && val) el.value = val;
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryLoad);
  } else {
    tryLoad();
  }
})();

window.saveAffLinks = function() {

  const hw = document.getElementById('affHollywood')?.value;
  const tb = document.getElementById('aff10bet')?.value;

  if (hw) localStorage.setItem('affHollywood', hw);
  if (tb) localStorage.setItem('aff10bet', tb);
  const s = document.getElementById('affSaved');
  if (s) { s.style.display = 'inline'; setTimeout(() => s.style.display = 'none', 2000); }
  applyAffLinksToBanners();
};

// Push saved affiliate links into the static house-ad banners
// (leaderboard/strip/sidebar/corner) so one save updates the whole site.
function applyAffLinksToBanners() {
  const l = getAffLinks();
  const set = (id, url) => { const el = document.getElementById(id); if (el) el.href = url; };
  set('adLinkHollywood1', l.hollywood);
  set('adLink10bet1', l.tenbet);
}
document.addEventListener('DOMContentLoaded', applyAffLinksToBanners);

// Pre-fill affiliate inputs from storage on tab open
function prefillAffInputs() {
  const l = getAffLinks();

  const hw = document.getElementById('affHollywood'); if(hw) hw.value = l.hollywood;
  const tb = document.getElementById('aff10bet'); if(tb) tb.value = l.tenbet;
}

// ── Paywall ────────────────────────────────────────────────
window.openPaywall = function() {
  document.getElementById('paywallOverlay').classList.remove('hidden');
};
window.closePaywall = function() {
  document.getElementById('paywallOverlay').classList.add('hidden');
};
window.selectPlan = function(plan) {
  selectedPlan = plan;
  document.getElementById('planMonthly').classList.toggle('selected', plan === 'monthly');
  document.getElementById('planLifetime').classList.toggle('selected', plan === 'lifetime');
};
window.handlePayment = function() {
  // Real handlePayment is defined below (after auth and payment section).
  // This placeholder prevents "not defined" errors during early script parsing.
};

function updateProUI() {
  const badge = document.getElementById('proBadge');
  if (badge) badge.style.display = proUnlocked ? 'inline-flex' : 'none';
}

// ── Affiliate bet buttons injected into predictions ────────
function affButtons(matchLabel) {
  const l = getAffLinks();
  const track = (bookie) => {
    affClicks++;
    localStorage.setItem('faiAffClicks', affClicks);
    updateRevKPIs();
  };
  return `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px">

    <a href="${l.hollywood}" target="_blank" class="aff-btn hollywood" onclick="(function(){var c=parseInt(localStorage.getItem('faiAffClicks')||0)+1;localStorage.setItem('faiAffClicks',c);})()"> Hollywood</a>
    <a href="${l.tenbet}" target="_blank" class="aff-btn tenbet" onclick="(function(){var c=parseInt(localStorage.getItem('faiAffClicks')||0)+1;localStorage.setItem('faiAffClicks',c);})()"> 10bet</a>
  </div>`;
}
window.faiAffButtons = affButtons; // expose for other tabs

// ── Inject aff buttons into prediction rows ────────────────
function injectAffButtonsIntoPredictions() {
  // Inject into fixture rows that have picks
  document.querySelectorAll('.fixture').forEach(row => {
    if (row.querySelector('.aff-btn')) return; // already injected
    const pick = row.querySelector('.pick');
    if (!pick) return;
    const matchName = row.querySelector('.teams strong')?.textContent || '';
    const container = row.querySelector('.fixture > :last-child') || row;
    const div = document.createElement('div');
    div.innerHTML = affButtons(matchName);
    container.appendChild(div.firstElementChild);
  });
}

// Observe DOM for prediction renders
const affObserver = new MutationObserver(() => injectAffButtonsIntoPredictions());
const predList = document.getElementById('predictionList');
if (predList) affObserver.observe(predList, { childList: true, subtree: true });
const topPred = document.getElementById('topPred');
if (topPred) affObserver.observe(topPred, { childList: true, subtree: true });

// ── Tip Sheet ──────────────────────────────────────────────
window.openTipSheet = function() {
  document.getElementById('tipsheetOverlay').classList.remove('hidden');
  buildTipSheet();
};

function buildTipSheet() {
  const el = document.getElementById('tipsheetContent');
  const today = new Date().toLocaleDateString('en-ZA', {weekday:'long',day:'numeric',month:'long',year:'numeric'});

  // Gather picks from window.predictions or rendered rows
  const rows = document.querySelectorAll('.fixture');
  const picks = [];
  rows.forEach(r => {
    const pick = r.querySelector('.pick');
    if (!pick) return;
    const home = r.querySelector('.teams strong')?.textContent || '?';
    const league = r.querySelector('.teams span')?.textContent || '';
    const conf = r.querySelector('.confidence')?.textContent || '';
    picks.push(`   ${home} — Pick: ${pick.textContent}${conf ? '  ['+conf+']' : ''}`);
  });

  const text = ` FOOTBALL AI — DAILY PICKS
 ${today}
${'─'.repeat(34)}

${picks.length ? picks.join('\n') : '  No qualified picks loaded yet.\n  Refresh fixtures first.'}

${'─'.repeat(34)}
 For entertainment purposes. Bet responsibly.
Generated by Football AI Predictions v169`;

  el.textContent = text;
  el.dataset.raw = text;
}

window.copyTipSheet = function() {
  const text = document.getElementById('tipsheetContent')?.dataset.raw || '';
  navigator.clipboard.writeText(text).then(() => alert(' Copied to clipboard!'));
};

window.downloadTipSheet = function() {
  const text = document.getElementById('tipsheetContent')?.dataset.raw || '';
  const date = new Date().toISOString().slice(0,10);
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
  a.download = `FootballAI_Picks_${date}.txt`;
  a.click();
};

// ── White-label enquiry ────────────────────────────────────
window.submitWLEnquiry = function() {
  const name    = document.getElementById('wlName')?.value || '';
  const email   = document.getElementById('wlEmail')?.value || '';
  const budget  = document.getElementById('wlBudget')?.value || '';
  const notes   = document.getElementById('wlNotes')?.value || '';
  if (!name || !email) { alert('Please enter your name and email.'); return; }

  const body = encodeURIComponent(
    `White-Label Enquiry\n\nName: ${name}\nEmail: ${email}\nBudget: ${budget}\n\nNotes:\n${notes}`
  );
  window.open(`mailto:your@email.com?subject=Football+AI+White-Label+Enquiry&body=${body}`, '_blank');

  wlEnquiries++;
  localStorage.setItem('faiWLCount', wlEnquiries);
  updateRevKPIs();
  document.getElementById('wlOverlay').classList.add('hidden');
  alert(' Enquiry sent! Check your email client.');
};

// ── Revenue calculator ─────────────────────────────────────
window.calcRevenue = function() {
  const subs     = parseInt(document.getElementById('calcSubs')?.value) || 0;
  const lifetime = parseInt(document.getElementById('calcLifetime')?.value) || 0;
  const aff      = parseInt(document.getElementById('calcAff')?.value) || 0;
  const tips     = parseInt(document.getElementById('calcTips')?.value) || 0;

  const monthly = (subs * 149) + (lifetime * 999) + (aff * 15 * 30) + (tips * 99);
  const annual  = (subs * 149 * 12) + (lifetime * 999) + (aff * 15 * 365) + (tips * 99 * 12);

  const fmt = n => 'R' + n.toLocaleString('en-ZA');
  const me = document.getElementById('calcMonthly'); if(me) me.textContent = fmt(monthly);
  const ae = document.getElementById('calcAnnual');  if(ae) ae.textContent = fmt(annual);
};

// ── Revenue KPIs ───────────────────────────────────────────
function updateRevKPIs() {
  const subs  = parseInt(localStorage.getItem('faiPaidSubs') || '0');
  const mrr   = subs * 149;
  const aff   = parseInt(localStorage.getItem('faiAffClicks') || '0');
  const wl    = parseInt(localStorage.getItem('faiWLCount') || '0');

  const rs = document.getElementById('revSubs');  if(rs) rs.textContent = subs;
  const rm = document.getElementById('revMRR');   if(rm) rm.textContent = 'R' + mrr.toLocaleString('en-ZA');
  const ra = document.getElementById('revAff');   if(ra) ra.textContent = aff + ' clicks';
  const rw = document.getElementById('revWL');    if(rw) rw.textContent = wl;
  const wc = document.getElementById('wlCount');  if(wc) wc.textContent = wl + ' enquiries logged';
}

// ── Lock overlay for AI tabs when not Pro ─────────────────
function addLockOverlay(sectionId, featureName) {
  if (proUnlocked) return;
  const sec = document.getElementById(sectionId);
  if (!sec || sec.querySelector('.lock-overlay')) return;
  const div = document.createElement('div');
  div.className = 'lock-overlay';
  div.innerHTML = `<span></span><p>${featureName}</p><small>Requires Football AI Pro</small>`;
  div.onclick = openPaywall;
  sec.style.position = 'relative';
  sec.appendChild(div);
}

// ── Hook into tab switching to add lock overlays ──────────
const _origShowTabMon = window.showTab;
window.showTab = function(id, btn) {
  if (typeof _origShowTabMon === 'function') _origShowTabMon(id, btn);
  if (id === 'monetise') {
    updateRevKPIs();
    prefillAffInputs();
    calcRevenue();
  }
};

// ── Add Pro badge to header ────────────────────────────────
(function addProBadge() {
  const brand = document.querySelector('.brand');
  if (!brand) return;
  const badge = document.createElement('span');
  badge.id = 'proBadge';
  badge.className = 'pro-badge';
  badge.innerHTML = '⭐ PRO';
  badge.style.display = proUnlocked ? 'inline-flex' : 'none';
  brand.appendChild(badge);
})();

// ── Tip sheet bar on predictions tab ──────────────────────
(function addTipBar() {
  const predSec = document.getElementById('predictions');
  if (!predSec) return;
  const bar = document.createElement('div');
  bar.className = 'tipsheet-bar';
  bar.innerHTML = `<span> <strong>Today's picks ready?</strong> Export a formatted tip sheet to share on WhatsApp or sell as a daily subscription.</span>
    <button onclick="openTipSheet()" style="background:#ffffff;border:none;border-radius:8px;color:#fff;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0"> Export Tip Sheet</button>
    <button onclick="openPaywall()" style="background:#222;border:1px solid #222;border-radius:8px;color:#fff;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0"> Upgrade to Pro</button>`;
  predSec.insertBefore(bar, predSec.firstChild);
})();

// ── Init ───────────────────────────────────────────────────
updateRevKPIs();
calcRevenue();

})();


(function(){

/* ─ Config ─────────────────────────────────────────────────
   Using football-data.org free tier as primary source (no key for basic),
   with a realistic demo fallback so the widget always shows something.
   To use real data: set LIVE_API_KEY to your Football data.com key.
   Free key at: https://www.Football data.com/register
──────────────────────────────────────────────────────────── */
const LIVE_API_KEY = ''; // provider credentials are server-side only
const REFRESH_MS   = 180000; // v185: live score + live matches every 3 minutes
let widgetView     = 'live'; // 'live' | 'scheduled'
var liveMatches    = [];
let schedMatches   = [];
let refreshTimer   = null;
let affClicksToday = parseInt(localStorage.getItem('faiAffClicks') || '0');

// ── Demo data (realistic fallback when no API key) ─────────
function demoLiveMatches() {
  const now = new Date();
  const mins = [12,23,34,45,56,67,78,88];
  const fixtures = [
    {id:1, league:'Premier League 󠁧󠁢󠁥󠁮󠁧󠁿', home:'Arsenal', away:'Chelsea', hs:2, as:1, min:67, hCorners:5, aCorners:4, hPoss:58, aPoss:42, hShots:9, aShots:5, hYellow:1, aYellow:2, hRed:0, aRed:0},
    {id:2, league:'La Liga ', home:'Real Madrid', away:'Barcelona', hs:1, as:1, min:56, hCorners:6, aCorners:7, hPoss:44, aPoss:56, hShots:7, aShots:8, hYellow:2, aYellow:1, hRed:0, aRed:0},
    {id:3, league:'Bundesliga ', home:'Bayern Munich', away:'Dortmund', hs:3, as:0, min:78, hCorners:9, aCorners:3, hPoss:62, aPoss:38, hShots:14, aShots:4, hYellow:0, aYellow:3, hRed:0, aRed:0},
    {id:4, league:'Serie A ', home:'Inter Milan', away:'Juventus', hs:0, as:0, min:23, hCorners:2, aCorners:1, hPoss:51, aPoss:49, hShots:3, aShots:2, hYellow:1, aYellow:0, hRed:0, aRed:0},
    {id:5, league:'Ligue 1 ', home:'PSG', away:'Marseille', hs:2, as:0, min:45, hCorners:7, aCorners:2, hPoss:65, aPoss:35, hShots:11, aShots:3, hYellow:0, aYellow:1, hRed:0, aRed:1},
    {id:6, league:'Champions League ', home:'Man City', away:'PSG', hs:1, as:2, min:88, hCorners:8, aCorners:5, hPoss:53, aPoss:47, hShots:10, aShots:7, hYellow:2, aYellow:2, hRed:0, aRed:0},
    {id:7, league:'MLS ', home:'LA Galaxy', away:'NYCFC', hs:1, as:1, min:34, hCorners:3, aCorners:4, hPoss:48, aPoss:52, hShots:5, aShots:6, hYellow:1, aYellow:1, hRed:0, aRed:0},
    {id:8, league:'PSL ', home:'Kaizer Chiefs', away:'Orlando Pirates', hs:0, as:1, min:12, hCorners:1, aCorners:2, hPoss:46, aPoss:54, hShots:2, aShots:4, hYellow:0, aYellow:0, hRed:0, aRed:0},
  ];
  // Slightly randomise scores each refresh to simulate live updates
  return fixtures.map(f => ({
    ...f,
    min: Math.min(90, f.min + Math.floor(Math.random() * 3)),
    hCorners: f.hCorners + (Math.random() > .85 ? 1 : 0),
    aCorners: f.aCorners + (Math.random() > .85 ? 1 : 0),
  }));
}

function demoScheduled() {
  const today = new Date();
  const fmt = (h,m) => { const d=new Date(today); d.setHours(h,m,0); return d; };
  return [
    {id:101,league:'Premier League 󠁧󠁢󠁥󠁮󠁧󠁿',home:'Liverpool',away:'Man United',ko:fmt(17,30)},
    {id:102,league:'La Liga ',home:'Atletico Madrid',away:'Sevilla',ko:fmt(19,0)},
    {id:103,league:'Bundesliga ',home:'Leverkusen',away:'Schalke',ko:fmt(19,30)},
    {id:104,league:'Serie A ',home:'AC Milan',away:'Napoli',ko:fmt(20,45)},
    {id:105,league:'Ligue 1 ',home:'Lyon',away:'Monaco',ko:fmt(21,0)},
    {id:106,league:'Champions League ',home:'Real Madrid',away:'Bayern',ko:fmt(21,0)},
    {id:107,league:'PSL ',home:'Mamelodi Sundowns',away:'Cape Town City',ko:fmt(17,0)},
    {id:108,league:'Europa League ',home:'Tottenham',away:'Ajax',ko:fmt(18,45)},
  ];
}

// ── Helper: get stat value from Kasi Sports News statistics array ──
function getStat(statsArr, teamIdx, type) {
  const team = statsArr?.[teamIdx]?.statistics || [];
  const item = team.find(s => s.type === type);
  const v = item?.value;
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'string' && v.endsWith('%')) return parseInt(v) || 0;
  return parseInt(v) || 0;
}

// ── Map raw Kasi Sports News fixture to internal format ────────
function mapFixture(f, stats) {
  const s = stats || [];
  return {
    id:       f.fixture.id,
    league:   f.league.name + (f.league.flag ? ' ' + f.league.flag : ''),
    home:     f.teams.home.name,
    away:     f.teams.away.name,
    homeId:   f.teams.home.id,
    awayId:   f.teams.away.id,
    homeLogo: f.teams.home.logo || '',
    awayLogo: f.teams.away.logo || '',
    leagueLogo: f.league.logo || '',
    leagueFlag: f.league.flag || '', 
    hs:       f.goals.home ?? 0,
    as:       f.goals.away ?? 0,
    min:      f.fixture.status.elapsed || 0,
    status:   f.fixture.status.short,
    hCorners: getStat(s, 0, 'Corner Kicks'),
    aCorners: getStat(s, 1, 'Corner Kicks'),
    hPoss:    getStat(s, 0, 'Ball Possession') || 50,
    aPoss:    getStat(s, 1, 'Ball Possession') || 50,
    hShots:   getStat(s, 0, 'Total Shots'),
    aShots:   getStat(s, 1, 'Total Shots'),
    hYellow:  getStat(s, 0, 'Yellow Cards'),
    aYellow:  getStat(s, 1, 'Yellow Cards'),
    hRed:          getStat(s, 0, 'Red Cards'),
    aRed:          getStat(s, 1, 'Red Cards'),
    hFouls:        getStat(s, 0, 'Fouls'),
    aFouls:        getStat(s, 1, 'Fouls'),
    hShotsOnTarget:getStat(s, 0, 'Shots on Goal'),
    aShotsOnTarget:getStat(s, 1, 'Shots on Goal'),
    hPasses:       getStat(s, 0, 'Total passes'),
    aPasses:       getStat(s, 1, 'Total passes'),
    hPassAcc:      getStat(s, 0, 'Passes %'),
    aPassAcc:      getStat(s, 1, 'Passes %'),
    hOffsides:     getStat(s, 0, 'Offsides'),
    aOffsides:     getStat(s, 1, 'Offsides'),
  };
}

// ── Live data uses the deployed Kasi Sports News server directly.
let PROXY_BASE = window.location.protocol.startsWith('http') ? window.location.origin : '';
async function apiFetch(path) {
  const baseUrl = (typeof base === 'function' ? base() : (PROXY_BASE || window.location.origin)).replace(/\/+$/, '') || window.location.origin;
  const r = await fetch(baseUrl + path, {cache:'no-store'});
  const text = await r.text(); let d={}; try{d=text?JSON.parse(text):{}}catch{d={};}
  if(!r.ok){
    console.warn('KasiScore live request failed', {status:r.status, path, response:text.slice(0,500)});
    throw new Error(`Service request failed (${r.status}). Please try again.`);
  }
  return d;
}

// ── Fetch live data ────────────────────────────────────────
// PROXY_BASE is always set (local server origin on localhost, own origin on
// Netlify), so the guard below is kept only as a last-resort safety net.
async function fetchLiveData() {
  try {
    // Football live source is the verified FastAPI /live endpoint.
    const d = await get('/live',{league:'ALL',refresh:0});
    const games = d.matches || [];
    liveMatches = games.map(g => ({
      ...g, id:g._afootFixtureId||g.fixtureId||g.id, sport:'football', league:g.league||'Worldwide',
      home:g.home||g.homeTeam||'Home', away:g.away||g.awayTeam||'Away',
      homeId:g.homeId||g.homeTeamId||g.teams?.home?.id||g.fixture?.teams?.home?.id||0, awayId:g.awayId||g.awayTeamId||g.teams?.away?.id||g.fixture?.teams?.away?.id||0,
      homeLogo:g.homeLogo||g.homeTeamLogo||g.teams?.home?.logo||g.fixture?.teams?.home?.logo||'', awayLogo:g.awayLogo||g.awayTeamLogo||g.teams?.away?.logo||g.fixture?.teams?.away?.logo||'',
      hs:Number(String(g.score||'0-0').split(/\s*-\s*/)[0]||0),
      as:Number(String(g.score||'0-0').split(/\s*-\s*/)[1]||0),
      min:Number(g.elapsed||g.liveStatus?.elapsed||0), status:g.status||'LIVE',
      hCorners:0,aCorners:0,hPoss:0,aPoss:0,hShots:0,aShots:0,hShotsOnTarget:0,aShotsOnTarget:0,
      hPasses:0,aPasses:0,hPassAcc:0,aPassAcc:0,hFouls:0,aFouls:0,hYellow:0,aYellow:0,hRed:0,aRed:0,hOffsides:0,aOffsides:0
    }));
    schedMatches = [];
    // v188: do NOT request statistics for every live match during dashboard load.
    // That caused a burst of /fixtures/{id}/stats requests and provider 429s.
    // Detailed statistics are fetched on demand only when the user clicks Stats.
    window.liveMatches = liveMatches;
  } catch(e) { liveMatches=[]; schedMatches=[]; window.liveMatches=[]; console.warn('Live data failed:',e.message); }
}

// ── Render live grid ───────────────────────────────────────
function renderLiveGridLegacy1(matches) {
  const el = document.getElementById('liveMatchGrid');
  const empty = document.getElementById('liveWidgetEmpty');
  if (!el) return;
  if (!matches.length) {
    el.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  el.innerHTML = matches.map((m,i) => {
    const homeWin = m.hs > m.as, awayWin = m.as > m.hs;
    const corners = (m.hCorners||0) + (m.aCorners||0);
    const cornersTag = corners >= 10 ? `<span style="font-size:9px;color:var(--green);font-weight:700">${corners} corners</span>` :
                       corners >= 7  ? `<span style="font-size:9px;color:var(--yellow);font-weight:700">${corners} corners</span>` : '';
    const adRow = '';
    return `${adRow}<div class="live-row" onclick="openStatsPanel(${m.id},'${m.sport||'football'}','${jsEsc(m.league||'')}')">
      <div class="lr-league">${m.leagueFlag?`<img src="${esc(m.leagueFlag)}" class="kc-live-flag" onerror="this.style.display='none'" loading="lazy" decoding="async" fetchpriority="low">`:m.leagueLogo?`<img src="${esc(m.leagueLogo)}" class="kc-live-flag" onerror="this.style.display='none'" loading="lazy" decoding="async" fetchpriority="low">`:''}${esc(m.league||'Worldwide')}</div>
      <div class="lr-teams">
        <div class="t ${homeWin?'winning':''}" onclick="event.stopPropagation();openKasiTeamPage(${Number(m.homeId||0)},${JSON.stringify(m.home||'Home')})">${m.homeLogo?`<img src="${esc(m.homeLogo)}" class="kc-live-badge" onerror="this.style.display='none'" loading="lazy" decoding="async" fetchpriority="low">`:''}<span>${esc(m.home||'Home')}</span> ${m.hRed?'':''}</div>
        <div class="t ${awayWin?'winning':''}" onclick="event.stopPropagation();openKasiTeamPage(${Number(m.awayId||0)},${JSON.stringify(m.away||'Away')})">${m.awayLogo?`<img src="${esc(m.awayLogo)}" class="kc-live-badge" onerror="this.style.display='none'" loading="lazy" decoding="async" fetchpriority="low">`:''}<span>${esc(m.away||'Away')}</span> ${m.aRed?'':''}</div>
        <div style="margin-top:2px">${cornersTag}</div>
      </div>
      <div class="lr-score">
        <div class="s">${m.hs}</div>
        <div class="m">${m.min}'</div>
        <div class="s">${m.as}</div>
      </div>
      <button class="lr-stats-btn" onclick="event.stopPropagation();openStatsPanel(${m.id},'${m.sport||'football'}','${jsEsc(m.league||'')}')"> Stats</button>
    </div>`;
  }).join('');
}

// ── Render scheduled ───────────────────────────────────────
function renderScheduled(matches) {
  const el = document.getElementById('schedMatchGrid');
  if (!el) return;
  el.innerHTML = matches.map(m => {
    const koStr = m.ko instanceof Date ? m.ko.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : '—';
    return `<div class="sched-row" onclick="openStatsPanelSched(${m.id})">
      <div class="sr-time">${koStr}</div>
      <div class="sr-league">${m.league}</div>
      <div class="sr-teams">${m.home} <span style="color:var(--muted)">vs</span> ${m.away}</div>

    </div>`;
  }).join('') || '<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">No scheduled matches found</div>';
}

// ── Update header count + timestamp ───────────────────────
function updateWidgetMeta() {
  const countEl = document.getElementById('liveWidgetCount');
  const timeEl  = document.getElementById('liveWidgetUpdate');
  if (countEl) countEl.textContent = liveMatches.length
    ? `${liveMatches.length} matches live`
    : 'No live matches currently';
  if (timeEl) timeEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
}

// ── Stats panel ────────────────────────────────────────────

window.MATCH_STATS_FIXTURE_ID = null;
window.openStatsPanel = function(id,sport='football',league=''){
  id=String(id||'').trim(); if(!id)return;
  sport=String(sport||'football').toLowerCase();
  if(sport==='football') return window.location.assign('/matches/'+encodeURIComponent(id)+'/stats');
  let url='/match/'+encodeURIComponent(sport)+'/'+encodeURIComponent(id);
  if(league)url+='?league='+encodeURIComponent(league);
  window.location.assign(url);
};
window.openLiveMatchPage = window.openStatsPanel;
window.openSportMatchPage=function(sport,id,league=''){ return window.openStatsPanel(id,sport,league); };
function _playerStatValue(stats,key){
  const hit=(stats||[]).find(x=>String(x.type||'').toLowerCase()===String(key).toLowerCase());
  return hit?.value ?? '—';
}
function _flattenPlayerStats(arr){
  const s=arr&&arr[0]||{}; return {minutes:s.games?.minutes??'—',rating:s.games?.rating??'—',goals:s.goals?.total??0,assists:s.goals?.assists??0,shots:s.shots?.total??0,onTarget:s.shots?.on??0,passes:s.passes?.total??0,accuracy:s.passes?.accuracy??'—',tackles:s.tackles?.total??0,interceptions:s.tackles?.interceptions??0,duels:s.duels?.total??0,won:s.duels?.won??0,dribbles:s.dribbles?.success??0,fouls:s.fouls?.committed??0,yellow:s.cards?.yellow??0,red:s.cards?.red??0};
}
window.loadMatchStatsPage = async function(id){
  const body=document.getElementById('matchStatsPageBody'); if(!body)return;
  body.innerHTML='<div class="empty">Loading live match statistics and line-ups…</div>';
  try{
    // One backend request keeps the match page from creating an avoidable request burst.
    const bundle=await get('/fixtures/'+encodeURIComponent(id)+'/live-bundle');
    const fd={response:bundle.fixture?[bundle.fixture]:[]};
    const sd={statistics:bundle.statistics||[]};
    const ld={teams:bundle.lineups||[]}; const playerRows=bundle.players||[]; const events=bundle.events||[];
    const f=(fd.response||[])[0]||{}; const teams=f.teams||{}; const hg=f.goals?.home??'—', ag=f.goals?.away??'—';
    const stats=sd.statistics||[]; const lineup=ld.teams||[];
    const rowStat=(label)=>{const vals=stats.map(x=>{const hit=(x.statistics||[]).find(y=>String(y.type).toLowerCase()===label.toLowerCase());return hit?.value??'—'});return `<div class="stat-row-table"><div class="stat-val-home">${vals[0]??'—'}</div><div class="stat-label-center">${label}</div><div class="stat-val-away">${vals[1]??'—'}</div></div>`};
    const playerDetail=new Map(); playerRows.forEach(tr=>(tr.players||[]).forEach(pr=>{const pp=pr.player||{}, st=(pr.statistics||[])[0]||{}, gm=st.games||{};if(pp.id)playerDetail.set(Number(pp.id),{photo:pp.photo||'',number:gm.number,position:gm.position||'',rating:gm.rating||'',minutes:gm.minutes});}));
    const playersHtml=(team)=> (team.players||[]).map(p=>{const d=playerDetail.get(Number(p.id||0))||{};const num=d.number??p.number??'—';return `<div class="lineup-player" onclick="openKasiMatchPlayerPage(${Number(id)},${Number(p.id||0)},'${jsEsc(p.name||'Player')}')" style="display:grid;grid-template-columns:38px 1fr auto;gap:8px;align-items:center">${d.photo?`<img src="${esc(d.photo)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'" loading="lazy" decoding="async" fetchpriority="low">`:`<span class="player-num">#${esc(num)}</span>`}<span><b class="player-name">${esc(p.name||'Unknown')}</b><small style="display:block;color:var(--muted)">#${esc(num)} · ${esc(d.position||p.pos||'Position unavailable')} · ${d.minutes!=null?esc(d.minutes)+' min':'Current match'}</small></span><span class="player-pos">${d.rating?esc(d.rating)+' ★':''}</span></div>`}).join('')||'<div class="sub">No lineup data available.</div>';
    const liveStatus=f.fixture?.status?.elapsed?`${f.fixture.status.elapsed}'`:f.fixture?.status?.long||'LIVE';
    body.innerHTML=`<a id="ksDedicatedBackHome" href="#" onclick="event.preventDefault();return window.kasiDashboardBack();" style="display:inline-block;margin:8px 0 16px">← Back to Home</a><div class="matchstats-hero"><div style="text-align:center;color:var(--muted);font-size:10px;margin-bottom:12px">${esc(f.league?.name||'Football')} · ${esc(liveStatus)}</div><div class="matchstats-score"><div class="matchstats-team kc-link" onclick="openKasiTeamPage(${Number(teams.home?.id||0)},'${jsEsc(teams.home?.name||'Home')}')">${teams.home?.logo?`<img src="${esc(teams.home.logo)}" style="width:50px;height:50px;object-fit:contain;display:block;margin:0 auto 6px" loading="lazy" decoding="async" fetchpriority="low">`:''}${esc(teams.home?.name||'Home')}</div><div class="matchstats-scoreline">${hg} - ${ag}</div><div class="matchstats-team kc-link" onclick="openKasiTeamPage(${Number(teams.away?.id||0)},'${jsEsc(teams.away?.name||'Away')}')">${teams.away?.logo?`<img src="${esc(teams.away.logo)}" style="width:50px;height:50px;object-fit:contain;display:block;margin:0 auto 6px" loading="lazy" decoding="async" fetchpriority="low">`:''}${esc(teams.away?.name||'Away')}</div></div></div><div class="matchstats-grid"><div><div class="matchstats-card"><h3 style="margin-top:0">Match Statistics</h3>${stats.length?'':`<div class="kc-provider-note">No data available</div>`}<div class="stat-table-header" style="padding:8px 0"><span>${esc(teams.home?.name||'Home')}</span><span class="team-stats-label">STAT</span><span>${esc(teams.away?.name||'Away')}</span></div>${rowStat('Shots on Goal')}${rowStat('Shots off Goal')}${rowStat('Total Shots')}${rowStat('Ball Possession')}${rowStat('Total passes')}${rowStat('Passes %')}${rowStat('Fouls')}${rowStat('Corner Kicks')}${rowStat('Offsides')}${rowStat('Yellow Cards')}${rowStat('Red Cards')}</div></div><div><div class="matchstats-card"><h3 style="margin-top:0">Match Information</h3><div class="sub">Venue: ${esc(f.fixture?.venue?.name||'—')}</div><div class="sub" style="margin-top:6px">Referee: ${esc(f.fixture?.referee?.name||'—')}</div><div class="sub" style="margin-top:6px">Competition: ${f.league?.flag?`<img src="${esc(f.league.flag)}" style="width:20px;height:14px;object-fit:cover;vertical-align:middle;margin-right:5px" loading="lazy" decoding="async" fetchpriority="low">`:''}${esc(f.league?.name||'—')}</div></div>${events.length?`<div class="matchstats-card" style="margin-top:12px"><h3>Match Timeline</h3>${events.slice().reverse().map(ev=>`<div class="kc-event-row"><b>${esc(ev.time?.elapsed??'')}′</b><span>${ev.team?.logo?`<img src="${esc(ev.team.logo)}" class="kc-event-logo" loading="lazy" decoding="async" fetchpriority="low">`:''}${esc(ev.team?.name||'')} · ${esc(ev.type||'')} ${esc(ev.detail||'')} ${ev.player?.name?'· '+esc(ev.player.name):''}</span></div>`).join('')}</div>`:''}</div></div><div class="matchstats-card"><h3 style="margin-top:0">Line-up</h3><div class="sub" style="margin-bottom:10px">Click any player to see current-game statistics and season/recent performance.</div><div class="lineup-grid">${lineup.map(t=>`<div class="lineup-team"><div style="font-weight:800;margin-bottom:5px">${esc(t.team?.name||'Team')}</div><div class="sub" style="margin-bottom:8px">${esc(t.formation||'')} · ${esc(t.coach?.name||'')}</div>${playersHtml(t)}</div>`).join('')}</div></div>`;
  }catch(e){body.innerHTML=`<div class="empty">Unable to load this match.<br><small style="color:var(--red)">${esc(e.message||e)}</small></div>`}
};
window.loadUnifiedMatchPage=async function(sport,id,league=''){
 const body=document.getElementById('matchStatsPageBody'); if(!body)return; body.innerHTML='<div class="empty">Loading match statistics, line-up and player data…</div>';
 try{const d=await api('/sports/'+encodeURIComponent(sport)+'/match/'+encodeURIComponent(id),{league}),m=d.match||{},teams=d.teams||[],parts=d.participants||[];
 const score=(m.homeScore!=null||m.awayScore!=null)?`${m.homeScore??'—'} - ${m.awayScore??'—'}`:'';
 const pRow=x=>`<div class="lineup-player" onclick="openKasiSportPlayerPage('${jsEsc(sport)}','${jsEsc(x.id||'')}','${jsEsc(x.name||x.displayName||'Player')}','${jsEsc(league||'')}')"><span class="player-num">${esc(x.number||x.position||'')}</span><span class="player-name">${esc(x.name||x.displayName||'Player')}</span><span class="player-pos">${esc(x.position||'')}</span></div>`;
 const blocks=teams.map(t=>`<div class="lineup-team"><div style="font-weight:800;margin-bottom:6px">${esc(t.team?.name||t.name||'Team')}</div>${(t.players||t.athletes||[]).map(x=>pRow(x.player||x.athlete||x)).join('')||'<div class="sub">No player list supplied.</div>'}</div>`).join('');
 const rows=parts.map(pRow).join('');
 body.innerHTML=`<div class="matchstats-hero"><div style="text-align:center;color:var(--muted);font-size:10px;margin-bottom:12px">${esc((m.league||league||sport).toUpperCase())} · ${esc(m.status||'MATCH')}</div><div class="matchstats-score"><div class="matchstats-team kc-link" onclick="openKasiSportTeamPage('${jsEsc(sport)}','${jsEsc(m.homeId||'')}','${jsEsc(m.home||'Home')}','${jsEsc(m.leagueSlug||league||'')}')">${m.homeLogo?`<img src="${esc(m.homeLogo)}" style="width:46px;height:46px;object-fit:contain;display:block;margin:0 auto 6px" loading="lazy" decoding="async" fetchpriority="low">`:''}${esc(m.home||'Home')}</div><div class="matchstats-scoreline">${esc(score||'vs')}</div><div class="matchstats-team kc-link" onclick="openKasiSportTeamPage('${jsEsc(sport)}','${jsEsc(m.awayId||'')}','${jsEsc(m.away||'Away')}','${jsEsc(m.leagueSlug||league||'')}')">${m.awayLogo?`<img src="${esc(m.awayLogo)}" style="width:46px;height:46px;object-fit:contain;display:block;margin:0 auto 6px" loading="lazy" decoding="async" fetchpriority="low">`:''}${esc(m.away||'Away')}</div></div></div><div class="matchstats-grid"><div class="matchstats-card"><h3 style="margin-top:0">Match Statistics</h3><div class="sub">${esc(sport.toUpperCase())} match data</div><pre style="white-space:pre-wrap;font-size:11px;line-height:1.6;margin-top:10px">${esc(JSON.stringify(d.statistics||[],null,2))}</pre></div><div class="matchstats-card"><h3 style="margin-top:0">Match Information</h3><div class="sub">Sport: ${esc(sport)}</div><div class="sub" style="margin-top:6px">Competition: ${esc(m.league||league||'—')}</div><div class="sub" style="margin-top:6px">Status: ${esc(m.status||'—')}</div><div class="sub" style="margin-top:6px">Venue: ${esc(m.venue||'—')}</div></div></div><div class="matchstats-card"><h3 style="margin-top:0">${sport==='tennis'?'Players':'Line-up'}</h3><div class="sub" style="margin-bottom:10px">Click any player to see current-match statistics and all available player data.</div>${blocks?`<div class="lineup-grid">${blocks}</div>`:`<div class="lineup-team">${rows||'<div class="sub">No player data available.</div>'}</div>`}</div>`;
 }catch(e){body.innerHTML=`<div class="empty">Unable to load this ${esc(sport)} match.<br><small style="color:var(--red)">${esc(e.message||e)}</small></div>`}}
window.openUnifiedPlayerStats=async function(sport,id,playerId,name){const modal=document.getElementById('playerGameModal'),body=document.getElementById('playerGameBody');if(!modal||!playerId)return;document.getElementById('playerGameTitle').textContent=name;document.getElementById('playerGameSub').textContent=sport.toUpperCase()+' · current match';modal.classList.add('open');body.innerHTML='<div class="empty">Loading player statistics…</div>';try{const d=await api('/sports/'+encodeURIComponent(sport)+'/match/'+encodeURIComponent(id)+'/player/'+encodeURIComponent(playerId),{});body.innerHTML=`<div class="matchstats-card"><h3 style="margin-top:0">Current game</h3><pre style="white-space:pre-wrap;font-size:11px">${esc(JSON.stringify(d.currentGame||{},null,2))}</pre></div><div class="matchstats-card"><h3 style="margin-top:0">All available player data</h3><pre style="white-space:pre-wrap;font-size:11px">${esc(JSON.stringify({season:d.seasonStatistics||[],recentMatches:d.recentMatches||[]},null,2))}</pre></div>`}catch(e){body.innerHTML=`<div class="empty">Player statistics unavailable.<br><small style="color:var(--red)">${esc(e.message||e)}</small></div>`}};

window.openPlayerGameStats=async function(fixtureId,playerId,name,team){
  if(!playerId)return; const modal=document.getElementById('playerGameModal'),body=document.getElementById('playerGameBody'); document.getElementById('playerGameTitle').textContent=name; document.getElementById('playerGameSub').textContent=team; modal.classList.add('open'); body.innerHTML='<div class="empty">Loading player statistics…</div>';
  try{const d=await get('/fixtures/'+fixtureId+'/players/'+playerId); const cur=d.currentGame?.statistics||[]; const agg=_flattenPlayerStats(d.seasonStatistics||[]); const c=_flattenPlayerStats(cur); const cards=(title,s)=>`<div style="font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;margin:10px 0 7px">${title}</div><div class="player-stat-grid">${[['Minutes',s.minutes],['Rating',s.rating],['Goals',s.goals],['Assists',s.assists],['Shots',s.shots],['On target',s.onTarget],['Passes',s.passes],['Pass accuracy',s.accuracy],['Tackles',s.tackles],['Interceptions',s.interceptions],['Duels won',s.won],['Dribbles',s.dribbles],['Fouls',s.fouls],['Yellow',s.yellow],['Red',s.red]].map(x=>`<div class="player-stat-box"><b>${esc(x[1])}</b><span>${x[0]}</span></div>`).join('')}</div>`; body.innerHTML=`${d.player?.photo?`<div style="text-align:center"><img src="${esc(d.player.photo)}" style="width:72px;height:72px;object-fit:cover;border-radius:50%" loading="lazy" decoding="async" fetchpriority="low"></div>`:''}${cards('Current game',c)}${cards('Season aggregate',agg)}<div style="font-size:10px;color:var(--muted);margin-top:12px">Recent matches returned: ${(d.recentMatches||[]).length}</div>`;}catch(e){body.innerHTML=`<div class="empty">Player statistics unavailable.<br><small style="color:var(--red)">${esc(e.message||e)}</small></div>`}
};
window.closePlayerGameModal=function(){document.getElementById('playerGameModal')?.classList.remove('open')};

window.openStatsPanelLegacy = async function(id) {
  const m = liveMatches.find(x => x.id === id);
  if (!m) return;
  // Re-fetch current statistics so clicking a live match never depends on a stale
  // ticker payload. The panel renders immediately, then updates with provider data.
  try {
    const sd = await apiFetch('/fixtures/statistics?fixture=' + encodeURIComponent(id));
    const rows = sd.response || [];
    if (rows.length) {
      const getStat = (row, key) => {
        const v = (row.statistics || []).find(s => String(s.type||'').toLowerCase() === key.toLowerCase());
        return v?.value ?? 0;
      };
      const h = rows[0], a = rows[1];
      m.hShots=getStat(h,'Shots on Goal') + getStat(h,'Shots off Goal');
      m.aShots=getStat(a,'Shots on Goal') + getStat(a,'Shots off Goal');
      m.hShotsOnTarget=getStat(h,'Shots on Goal'); m.aShotsOnTarget=getStat(a,'Shots on Goal');
      m.hPoss=getStat(h,'Ball Possession'); m.aPoss=getStat(a,'Ball Possession');
      m.hPasses=getStat(h,'Total passes'); m.aPasses=getStat(a,'Total passes');
      m.hPassAcc=getStat(h,'Passes %'); m.aPassAcc=getStat(a,'Passes %');
      m.hFouls=getStat(h,'Fouls'); m.aFouls=getStat(a,'Fouls');
      m.hYellow=getStat(h,'Yellow cards'); m.aYellow=getStat(a,'Yellow cards');
      m.hRed=getStat(h,'Red cards'); m.aRed=getStat(a,'Red cards');
      m.hOffsides=getStat(h,'Offsides'); m.aOffsides=getStat(a,'Offsides');
      m.hCorners=getStat(h,'Corner Kicks'); m.aCorners=getStat(a,'Corner Kicks');
    }
  } catch(e) { console.warn('Live stats refresh failed',e); }
  const panel  = document.getElementById('statsPanel');
  const body   = document.getElementById('statsPanelBody');
  const title  = document.getElementById('statsPanelTitle');
  const sub    = document.getElementById('statsPanelSub');
  const back   = document.getElementById('statsPanelBackdrop');
  if (!panel || !body) return;

  title.textContent = `${m.home} vs ${m.away}`;
  sub.textContent   = `${m.league} · ${m.min}'`;

  const statRow = (label, hv, av, unit='') => {
    const h = hv || 0, a = av || 0;
    const hWins = h > a, aWins = a > h;
    return `<div class="stat-row-table ${hWins?'stat-winner-home':aWins?'stat-winner-away':''}">
      <div class="stat-val-home"><span class="${hWins?'stat-val-chip':''}">${h}${unit}</span></div>
      <div class="stat-label-center">${label}</div>
      <div class="stat-val-away"><span class="${aWins?'stat-val-chip':''}">${a}${unit}</span></div>
    </div>`;
  };


  const homeWin = m.hs > m.as, awayWin = m.as > m.hs;
  const totalCorners = (m.hCorners||0)+(m.aCorners||0);
  const cornerVerdict = totalCorners >= 10 ? `<span style="color:var(--green);font-weight:700"> Over 9.5 corners — ${totalCorners} so far</span>`
                      : totalCorners >= 8  ? `<span style="color:var(--yellow);font-weight:700"> Close to line — ${totalCorners} corners</span>`
                      : `<span style="color:var(--red);font-weight:700"> Under pace — ${totalCorners} corners</span>`;

  body.innerHTML = `
    <!-- Score hero (dark card matching screenshot style) -->
    <div style="background:var(--panel2);border-radius:12px;padding:16px;margin-bottom:14px;text-align:center">
      <div style="font-size:10px;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.07em">${m.league}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px">
        <div style="flex:1;text-align:right">
          <div style="font-size:14px;font-weight:800;${homeWin?'color:var(--text)':'color:var(--muted)'}">${m.home}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${m.hYellow?''.repeat(Math.min(m.hYellow,3)):''}${m.hRed?'':''}</div>
        </div>
        <div style="text-align:center;min-width:90px">
          <div style="font-size:38px;font-weight:900;line-height:1;letter-spacing:2px">${m.hs} <span style="color:var(--muted);font-size:24px">-</span> ${m.as}</div>
          <div style="font-size:10px;color:var(--red);font-weight:800;margin-top:5px;background:var(--panel2);display:inline-block;padding:2px 8px;border-radius:4px">${m.min}'</div>
        </div>
        <div style="flex:1;text-align:left">
          <div style="font-size:14px;font-weight:800;${awayWin?'color:var(--text)':'color:var(--muted)'}">${m.away}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${m.aYellow?''.repeat(Math.min(m.aYellow,3)):''}${m.aRed?'':''}</div>
        </div>
      </div>
    </div>

    <!-- Corner verdict -->
    <div style="text-align:center;padding:8px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;font-size:12px;margin-bottom:14px">${cornerVerdict}</div>

    <!-- TEAM STATS TABLE (screenshot style) -->
    <div style="background:var(--panel2);border-radius:12px;overflow:hidden;margin-bottom:14px">
      <!-- Table header with team names -->
      <div class="stat-table-header" style="padding:12px 16px">
        <span style="font-size:12px;font-weight:700;color:var(--text)">${m.home}</span>
        <span class="stat-table-header team-stats-label">TEAM STATS</span>
        <span style="font-size:12px;font-weight:700;color:var(--text)">${m.away}</span>
      </div>
      <div style="padding:0 12px 8px">
        ${statRow('Shots', m.hShots, m.aShots)}
        ${statRow('Shots on target', m.hShotsOnTarget||0, m.aShotsOnTarget||0)}
        ${statRow('Possession', m.hPoss, m.aPoss, '%')}
        ${statRow('Passes', m.hPasses||0, m.aPasses||0)}
        ${statRow('Pass accuracy', m.hPassAcc||0, m.aPassAcc||0, '%')}
        ${statRow('Fouls', m.hFouls||0, m.aFouls||0)}
        ${statRow('Yellow cards', m.hYellow, m.aYellow)}
        ${statRow('Red cards', m.hRed, m.aRed)}
        ${statRow('Offsides', m.hOffsides||0, m.aOffsides||0)}
        ${statRow('Corners', m.hCorners, m.aCorners)}
      </div>
    </div>

    <!-- Football AI verdict -->
    <div style="background:var(--panel2);border:1px solid var(--panel2);border-radius:10px;padding:12px;margin-bottom:14px">
      <div style="font-size:10px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px"> Football AI — Live Corner Verdict</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.6">
        ${totalCorners >= 10 ? `Both teams have generated ${totalCorners} corners. <b style="color:var(--green)">Strong Over 9.5 confirmed.</b> Home: ${m.hCorners}, Away: ${m.aCorners}.`
          : totalCorners >= 7 ? `${totalCorners} corners in minute ${m.min}. <b style="color:var(--yellow)">On pace for Over 9.5</b> — monitor closely.`
          : `Only ${totalCorners} corners in ${m.min} minutes. <b style="color:var(--red)">Under 9.5 likely</b> unless tempo increases.`}
      </div>
    </div>

    <!-- Bet buttons -->
    <div style="margin-bottom:12px">
      <div style="font-size:10px;color:var(--muted);margin-bottom:7px;text-transform:uppercase;letter-spacing:.07em"> Bet on this match</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">

        <a href="${aff.hollywood}" target="_blank" onclick="trackAff()" class="aff-btn hollywood" style="flex:1;justify-content:center;padding:9px"> Hollywood</a>
        <a href="${aff.tenbet}" target="_blank" onclick="trackAff()" class="aff-btn tenbet" style="flex:1;justify-content:center;padding:9px"> 10bet</a>
      </div>
    </div>
  `;

  panel.classList.add('open');
  if (back) back.style.display = 'block';
  document.body.style.overflow = 'hidden';
};

// ── Match Insights: H2H record, home/away trends, injuries ──────────
// Data comes from the KasiScore backend (/team/h2h, /team/history, /team/injuries).
// Works from any fixture/prediction row, live or not.
function _trendsFromHistory(hist) {
  const matches = (hist && hist.matches) || [];
  const home = matches.filter(x => x.isHome);
  const away = matches.filter(x => !x.isHome);
  const pct = (arr, pred) => arr.length ? Math.round(100 * arr.filter(pred).length / arr.length) : null;
  return {
    played:     matches.length,
    homePlayed: home.length,
    awayPlayed: away.length,
    homeWinPct: pct(home, x => x.hg > x.ag),
    awayWinPct: pct(away, x => x.ag > x.hg),
    over25Pct:  pct(matches, x => (x.hg + x.ag) > 2.5),
    bttsPct:    pct(matches, x => x.hg > 0 && x.ag > 0),
  };
}
function _injuryChip(inj) {
  if (!inj || !inj.count) return '<span style="font-size:11px;color:var(--muted)">No injuries/suspensions reported</span>';
  const names = inj.players.slice(0,4).map(p => `${esc(p.name)}${p.reason?` <span style="color:var(--muted)">(${esc(p.reason)})</span>`:''}`).join('<br>');
  return `<div style="font-size:11px;color:var(--red)"> ${inj.count} out</div><div style="font-size:11px;color:var(--text);margin-top:3px;line-height:1.6">${names}${inj.count>4?`<br><span style="color:var(--muted)">+${inj.count-4} more</span>`:''}</div>`;
}
function _trendRow(label, home, away, unit='%') {
  return `<div class="stat-row-table">
    <div class="stat-val-home">${home==null?'—':home+unit}</div>
    <div class="stat-label-center">${label}</div>
    <div class="stat-val-away">${away==null?'—':away+unit}</div>
  </div>`;
}

window.
window.openFixtureInsightsById = async function(id) {
  const panel = document.getElementById('statsPanel');
  const body = document.getElementById('statsPanelBody');
  const title = document.getElementById('statsPanelTitle');
  const sub = document.getElementById('statsPanelSub');
  const back = document.getElementById('statsPanelBackdrop');
  if (!panel || !body) return;

  panel.classList.add('open');
  if (back) back.style.display = 'block';
  document.body.style.overflow = 'hidden';
  body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Loading form, H2H, injuries, standings and bookmaker data…</div>';

  const escv = v => esc(v ?? '—');
  try {
    const d = await get('/fixtures/' + encodeURIComponent(id) + '/insights');
    const f = d.fixture || {};
    const home = f.home || {}, away = f.away || {};
    const league = f.league || {};
    title.textContent = `${home.name || 'Home'} vs ${away.name || 'Away'}`;
    sub.textContent = `${league.name || 'Worldwide'} · ${f.date ? new Date(f.date).toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short'}) : '—'}`;

    const formBox = (side, label) => {
      const rows = d.form?.[side]?.last10 || [];
      return `<div style="flex:1;background:var(--panel2);border-radius:10px;padding:11px">
        <div style="font-size:11px;font-weight:800;margin-bottom:8px">${escv(label)}</div>
        ${rows.length ? rows.map(x => `<div style="display:flex;justify-content:space-between;gap:5px;padding:5px 0;border-bottom:1px solid var(--line);font-size:10px">
          <span>${escv(x.opponent)}</span><b>${escv(x.score)}</b><span style="font-weight:800">${escv(x.result)}</span>
        </div>`).join('') : '<div style="font-size:10px;color:var(--muted)">No recent results returned.</div>'}
      </div>`;
    };

    const formBoxNext = (side,label) => {
      const rows=d.next5?.[side]||[];
      return `<div style="flex:1;background:var(--panel2);border-radius:10px;padding:11px">
        <div style="font-size:11px;font-weight:800;margin-bottom:8px">${escv(label)}</div>
        ${rows.length?rows.map(x=>`<div style="padding:5px 0;border-bottom:1px solid var(--line);font-size:10px">
          <b>${escv(x.home)} vs ${escv(x.away)}</b><br><span style="color:var(--muted)">${x.date?new Date(x.date).toLocaleString():'—'}</span>
        </div>`).join(''):'<div style="font-size:10px;color:var(--muted)">No data available</div>'}
      </div>`;
    };

    const injBox = (side,label) => {
      const rows=d.injuries?.[side]||[];
      return `<div style="flex:1;background:var(--panel2);border-radius:10px;padding:11px">
        <div style="font-size:11px;font-weight:800;margin-bottom:7px">${escv(label)}</div>
        ${rows.length ? rows.slice(0,8).map(x=>`<div style="font-size:10px;padding:4px 0;border-bottom:1px solid var(--line)"><b>${escv(x.player)}</b><br><span style="color:var(--muted)">${escv(x.type)}${x.reason?' · '+escv(x.reason):''}</span></div>`).join('') : '<div style="font-size:10px;color:var(--muted)">No injuries/suspensions returned.</div>'}
      </div>`;
    };

    const h2h=d.h2h||{};
    const ho=d.bookmakers?.selectedOdds||{};
    const available=d.bookmakers?.available||[];
    const oddsLine = ['homeWin','draw','awayWin'].map((k,i)=>`<div style="flex:1;text-align:center;background:var(--panel2);border-radius:8px;padding:9px"><small>${['1','X','2'][i]}</small><div style="font-size:17px;font-weight:900">${Number(ho[k]||0)?Number(ho[k]).toFixed(2):'—'}</div></div>`).join('');

    const tableRow = (x,label) => {
      const t=x||{};
      return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:10px"><span>${label}</span><b>${t.rank??'—'} · ${t.points??'—'} pts</b></div>`;
    };

    body.innerHTML = `
      <div style="background:var(--panel2);border-radius:12px;padding:14px;margin-bottom:14px;text-align:center">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase">${escv(league.name)}</div>
        <div style="font-size:16px;font-weight:900;margin-top:7px">${escv(home.name)} <span style="color:var(--muted)">vs</span> ${escv(away.name)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:5px">${escv(f.venue?.name || 'Venue unavailable')} · ${escv(f.referee || 'Referee unavailable')}</div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;margin-bottom:7px">Recent form · last 10</div>
        <div style="display:flex;gap:8px">${formBox('home',''+(home.name||'Home'))}${formBox('away',''+(away.name||'Away'))}</div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;margin-bottom:7px">Head-to-head · last ${h2h.played||0}</div>
        <div style="display:flex;gap:7px">
          <div style="flex:1;text-align:center;background:var(--panel2);padding:9px;border-radius:8px"><b>${h2h.homeWins||0}</b><small style="display:block">${escv(home.name)} wins</small></div>
          <div style="flex:1;text-align:center;background:var(--panel2);padding:9px;border-radius:8px"><b>${h2h.draws||0}</b><small style="display:block">Draws</small></div>
          <div style="flex:1;text-align:center;background:var(--panel2);padding:9px;border-radius:8px"><b>${h2h.awayWins||0}</b><small style="display:block">${escv(away.name)} wins</small></div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:6px">BTTS ${h2h.bttsPct||0}% · Over 2.5 ${h2h.over25Pct||0}%</div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;margin-bottom:7px">Next 5 fixtures</div>
        <div style="display:flex;gap:8px">${formBoxNext('home',home.name)}${formBoxNext('away',away.name)}</div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;margin-bottom:7px">League position</div>
        <div style="background:var(--panel2);border-radius:9px;padding:8px">${tableRow(d.standings?.home,'Home')} ${tableRow(d.standings?.away,'Away')}</div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;margin-bottom:7px">Team statistics</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${['home','away'].map(side=>{const x=d.teamStatistics?.[side]||{},g=x.goals||{},fx=x.fixtures||{};return `<div style="background:var(--panel2);border-radius:9px;padding:9px"><b>${escv(side==='home'?home.name:away.name)}</b><div class="sub">Played ${fx.played?.total??'—'} · W ${fx.wins?.total??'—'} · D ${fx.draws?.total??'—'} · L ${fx.loses?.total??'—'}</div><div class="sub">Goals for ${g.for?.total?.total??'—'} · against ${g.against?.total?.total??'—'}</div></div>`}).join('')}
        </div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;margin-bottom:7px">Available bookmaker markets</div>
        <div style="display:grid;gap:7px">${Object.values(d.bookmakers?.markets||{}).map(m=>`<div style="background:var(--panel2);border-radius:8px;padding:8px"><b>${escv(m.market)}</b>${(m.bookmakers||[]).slice(0,2).map(b=>`<div class="sub">${escv(b.name)} · ${(b.selections||[]).map(v=>`${escv(v.selection)} ${escv(v.price)}`).join(' · ')}</div>`).join('')}</div>`).join('')||'<div class="empty">No additional markets available.</div>'}</div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;margin-bottom:7px">Bookmaker 1X2</div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px">Selected: ${escv(d.bookmakers?.selected || 'No complete bookmaker market')}</div>
        <div style="display:flex;gap:7px">${oddsLine}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:6px">Available bookmakers: ${available.filter(x=>x.valid1x2).map(x=>escv(x.name)).join(', ')||'None with complete 1X2'}</div>
      </div>

      <div>
        <div style="font-size:10px;color:var(--accent);font-weight:800;text-transform:uppercase;margin-bottom:7px">Injuries & suspensions</div>
        <div style="display:flex;gap:8px">${injBox('home',home.name)}${injBox('away',away.name)}</div>
      </div>`;
  } catch(e) {
    body.innerHTML = `<div style="padding:25px;text-align:center;color:var(--muted)">Match intelligence unavailable.<br><small style="color:var(--red)">${esc(e.message||'Unable to load fixture data')}</small></div>`;
  }
};

openMatchInsights = async function(home, away, league, kickoffLabel) {
  const panel = document.getElementById('statsPanel');
  const body  = document.getElementById('statsPanelBody');
  const title = document.getElementById('statsPanelTitle');
  const sub   = document.getElementById('statsPanelSub');
  const back  = document.getElementById('statsPanelBackdrop');

  title.textContent = `${home} vs ${away}`;
  sub.textContent   = `${league||'Worldwide'}${kickoffLabel?' · '+kickoffLabel:''}`;
  body.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:12px">
    <div style="width:20px;height:20px;margin:0 auto 10px;border-radius:50%;border:2px solid var(--accent);border-top-color:transparent;animation:spin .8s linear infinite"></div>
    Loading match insights…
  </div>`;
  panel.classList.add('open');
  if (back) back.style.display = 'block';
  document.body.style.overflow = 'hidden';


  const betLinks = `<div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:7px;text-transform:uppercase;letter-spacing:.07em"> Pre-match betting</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">

        <a href="${aff.hollywood}" target="_blank" onclick="trackAff()" class="aff-btn hollywood" style="flex:1;justify-content:center;padding:9px"> Hollywood</a>
        <a href="${aff.tenbet}" target="_blank" onclick="trackAff()" class="aff-btn tenbet" style="flex:1;justify-content:center;padding:9px"> 10bet</a>
      </div>
    </div>`;

  try {
    const [h2h, homeHist, awayHist, homeInj, awayInj] = await Promise.all([
      get('/team/h2h', {home, away, last: 10}),
      get('/team/history', {team: home, last: 15}),
      get('/team/history', {team: away, last: 15}),
    ]);
    const t1 = _trendsFromHistory(homeHist), t2 = _trendsFromHistory(awayHist);
    body.innerHTML = `
      <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid var(--line);margin-bottom:16px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px">${esc(league||'Worldwide')}${kickoffLabel?' · '+esc(kickoffLabel):''}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:16px">
          <div style="font-size:15px;font-weight:700">${esc(home)}</div>
          <div style="padding:6px 12px;background:var(--panel2);border-radius:8px;color:var(--muted);font-weight:700;font-size:11px">VS</div>
          <div style="font-size:15px;font-weight:700">${esc(away)}</div>
        </div>
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:10px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px"> Head-to-head (last ${h2h.played||0})</div>
        ${h2h.played ? `
          <div style="display:flex;gap:6px;text-align:center;margin-bottom:8px">
            <div style="flex:1;background:var(--panel2);border-radius:8px;padding:8px"><div style="font-size:18px;font-weight:800;color:var(--green)">${h2h.homeWins}</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">${esc(home)} wins</div></div>
            <div style="flex:1;background:var(--panel2);border-radius:8px;padding:8px"><div style="font-size:18px;font-weight:800;color:var(--muted)">${h2h.draws}</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">Draws</div></div>
            <div style="flex:1;background:var(--panel2);border-radius:8px;padding:8px"><div style="font-size:18px;font-weight:800;color:var(--red)">${h2h.awayWins}</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">${esc(away)} wins</div></div>
          </div>
          <div style="font-size:11px;color:var(--muted)">BTTS in ${h2h.bttsPct}% of meetings · Over 2.5 in ${h2h.over25Pct}%</div>
        ` : `<div style="font-size:11px;color:var(--muted)">No recent meetings on record.</div>`}
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:10px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px"> Form trends (last ${t1.played}/${t2.played})</div>
        <div class="stat-table-header" style="padding:6px 4px 10px">
          <span style="font-size:11px;font-weight:700">${esc(home)}</span>
          <span class="stat-table-header team-stats-label">TREND</span>
          <span style="font-size:11px;font-weight:700">${esc(away)}</span>
        </div>
        ${_trendRow('Win rate (home/away split)', t1.homeWinPct, t2.awayWinPct)}
        ${_trendRow('Over 2.5 goals', t1.over25Pct, t2.over25Pct)}
        ${_trendRow('Both teams to score', t1.bttsPct, t2.bttsPct)}
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:10px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px"> Injuries &amp; suspensions</div>
        <div style="display:flex;gap:10px">
          <div style="flex:1;background:var(--panel2);border-radius:8px;padding:10px">
            <div style="font-size:11px;font-weight:700;margin-bottom:4px">${esc(home)}</div>
            ${_injuryChip(homeInj)}
          </div>
          <div style="flex:1;background:var(--panel2);border-radius:8px;padding:10px">
            <div style="font-size:11px;font-weight:700;margin-bottom:4px">${esc(away)}</div>
            ${_injuryChip(awayInj)}
          </div>
        </div>
      </div>

      ${betLinks}`;
  } catch (e) {
    body.innerHTML = `
      <div style="text-align:center;padding:20px 0;border-bottom:1px solid var(--line);margin-bottom:16px">
        <div style="font-size:15px;font-weight:700">${esc(home)} vs ${esc(away)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">${esc(league||'Worldwide')}${kickoffLabel?' · '+esc(kickoffLabel):''}</div>
      </div>
      <div style="background:var(--panel2);border-radius:10px;padding:12px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);line-height:1.6">Match insights (head-to-head, form trends, injuries) need the KasiScore backend connected — set the server URL in Diagnostics.<br><small style="color:var(--red)">${esc(e.message||'')}</small></div>
      </div>
      ${betLinks}`;
  }
};

window.openStatsPanelSched = async function(id) {
  const m = schedMatches.find(x => x.id === id);
  if (!m) return;
  try {
    const d = await get('/fixtures/' + encodeURIComponent(id) + '/stats');
    const rows = d.statistics || [];
    if (rows.length) {
      // Convert provider stats to the same shape used by the live stats panel.
      const stats = {};
      rows.forEach((r,idx)=>{stats[idx]=r.statistics||[]});
      m.hShots = Number((stats[0]||[]).find(x=>x.type==='Shots on Goal')?.value||0);
      m.aShots = Number((stats[1]||[]).find(x=>x.type==='Shots on Goal')?.value||0);
    }
  } catch(e) { /* scheduled games may not have stats before kickoff */ }
  openMatchInsights(m.home, m.away, m.league);
  const koStr = m.ko instanceof Date ? m.ko.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : '—';
  openMatchInsights(m.home, m.away, m.league, 'KO '+koStr);
};
window.closeStatsPanel = function() {
  const panel = document.getElementById('statsPanel');
  const back  = document.getElementById('statsPanelBackdrop');
  if (panel) panel.classList.remove('open');
  if (back)  back.style.display = 'none';
  document.body.style.overflow = '';
};

// Fix #10: swipe-right-to-dismiss stats panel on mobile
(function(){
  const panel = document.getElementById('statsPanel');
  if (!panel) return;
  let startX = 0, startY = 0;
  panel.addEventListener('touchstart', function(e){
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, {passive:true});
  panel.addEventListener('touchend', function(e){
    const dx = e.changedTouches[0].clientX - startX;
    const dy = Math.abs(e.changedTouches[0].clientY - startY);
    // Swipe right ≥60px, more horizontal than vertical → close
    if (dx > 60 && dy < 80) { window.closeStatsPanel(); }
  }, {passive:true});
})();

// ── Toggle live / scheduled view ───────────────────────────
window.toggleWidgetView = function() {
  widgetView = widgetView === 'live' ? 'scheduled' : 'live';
  const liveGrid  = document.getElementById('liveMatchGrid');
  const schedGrid = document.getElementById('schedMatchGrid');
  const btn       = document.getElementById('widgetViewBtn');
  const ticker    = document.getElementById('liveTicker');
  if (widgetView === 'live') {
    if (liveGrid)  liveGrid.style.display  = '';
    if (schedGrid) schedGrid.style.display = 'none';
    if (ticker)    ticker.style.display    = '';
    if (btn) btn.textContent = ' Show Scheduled';
  } else {
    if (liveGrid)  liveGrid.style.display  = 'none';
    if (schedGrid) schedGrid.style.display = '';
    if (ticker)    ticker.style.display    = 'none';
    if (btn) btn.textContent = ' Show Live';
    renderScheduled(schedMatches);
  }
};

// ── Affiliate click tracker ────────────────────────────────
window.trackAff = function() {
  affClicksToday++;
  localStorage.setItem('faiAffClicks', affClicksToday);
};

// ── Expose aff links to stats panel ───────────────────────
window.faiGetAffLinks = function() {
  return {

    hollywood: localStorage.getItem('affHollywood') || 'https://m.hollywoodbets.net/',
    tenbet:    localStorage.getItem('aff10bet')     || 'https://www.10bet.co.za/',
  };
};

// ── Main refresh ───────────────────────────────────────────
window.liveWidgetRefresh = async function() {
  // Update Live tab count badge
  const tc = document.getElementById('liveTabCount');
  if (tc) tc.textContent = (liveMatches.length > 0 ? liveMatches.length + ' live' : 'No matches live');
  const countEl = document.getElementById('liveWidgetCount');
  if (countEl) countEl.textContent = 'Refreshing…';
  if(window.S && Array.isArray(S.live) && S.live.length){
    liveMatches=S.live; window.liveMatches=liveMatches;
  } else {
    await fetchLiveData();
  }
  if(typeof renderTicker==='function') renderTicker(liveMatches);
  renderLiveGrid(liveMatches);
  updateWidgetMeta();
  // ── Update live corner counts on the Corners tab ─────────
  _updateLiveCornerCounts(liveMatches);
};

// ══════════════════════════════════════════════════════════════
// LIVE CORNER COUNTS — overlays actual corner data onto Corners tab
// Called after every liveWidgetRefresh() cycle
// ══════════════════════════════════════════════════════════════
function _updateLiveCornerCounts(matches) {
  if (!matches || !matches.length) return;

  // Create / update the live corners panel inside the corners tab
  let livePanel = document.getElementById('cornersLivePanel');
  if (!livePanel) {
    const cornersContent = document.getElementById('cornersContent');
    if (!cornersContent) return;
    livePanel = document.createElement('div');
    livePanel.id = 'cornersLivePanel';
    livePanel.style.cssText = 'margin-bottom:14px';
    cornersContent.insertBefore(livePanel, cornersContent.firstChild);
  }

  const liveWithCorners = matches.filter(m => {
    const st = m.liveStatus || {};
    return (st.elapsed > 0) && (m.stats || m.liveStatus);
  });

  if (!liveWithCorners.length) {
    livePanel.innerHTML = '';
    return;
  }

  const rows = liveWithCorners.map(m => {
    const elapsed = m.liveStatus?.elapsed || m.minute || 0;
    const home = m.home || m.homeTeam || 'Home';
    const away = m.away || m.awayTeam || 'Away';
    const hCorners = m.stats?.homeCorners ?? m.liveStatus?.homeCorners ?? '?';
    const aCorners = m.stats?.awayCorners ?? m.liveStatus?.awayCorners ?? '?';
    const totalCorners = (typeof hCorners === 'number' && typeof aCorners === 'number') ? hCorners + aCorners : '?';
    const score = `${m.liveStatus?.homeScore ?? m.homeScore ?? '?'} – ${m.liveStatus?.awayScore ?? m.awayScore ?? '?'}`;
    // Simple projection: if we have real corner data, project to 90 minutes
    let projection = '';
    if (typeof totalCorners === 'number' && elapsed > 10) {
      const projectedTotal = Math.round((totalCorners / elapsed) * 90);
      const overUnder = projectedTotal >= 10 ? `Over 9.5 projected (${projectedTotal})` : `Under 9.5 projected (${projectedTotal})`;
      projection = `<span style="font-size:10px;color:${projectedTotal>=10?'var(--green)':'var(--red)'};margin-left:8px;font-weight:700">${overUnder}</span>`;
    }
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid rgba(8,145,178,.25);border-radius:10px;background:rgba(8,145,178,.06);flex-wrap:wrap">
      <span style="font-size:11px;font-weight:700;color:var(--green);white-space:nowrap">${elapsed}'</span>
      <span style="flex:1;font-size:12px;font-weight:600;min-width:120px">${esc(home)} vs ${esc(away)}</span>
      <span style="font-size:11px;color:var(--muted)">${score}</span>
      <span style="font-size:12px;font-weight:700"> ${hCorners}–${aCorners} corners</span>
      <span style="font-size:11px;color:var(--muted)">(total: ${totalCorners})</span>
      ${projection}
    </div>`;
  }).join('');

  livePanel.innerHTML = `
    <div class="card" style="border-color:var(--green)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:16px"></span>
        <h3 style="margin:0;font-size:14px">Live Corner Counts</h3>
        <span style="font-size:10px;color:var(--green);border:1px solid var(--green);padding:1px 7px;border-radius:999px;font-weight:700">LIVE</span>
        <span style="font-size:11px;color:var(--muted);margin-left:auto">Updates every ${REFRESH_MS < 60000 ? (REFRESH_MS/1000)+'s' : Math.round(REFRESH_MS/60000)+' min'}</span>
      </div>
      <div style="display:grid;gap:7px">${rows}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:8px">Projections based on current pace to 90'. Live data from Kasi Sports News.</div>
    </div>`;
}

// ── API key settings in diagnostics area ──────────────────
(function addApiKeyInput() {
  // Render-only deployment: legacy Netlify proxy configuration intentionally disabled.
  return;
  const diagSec = document.getElementById('diagnostics');
  if (!diagSec) return;
  const div = document.createElement('div');
  div.className = 'card';
  div.style.marginBottom = '12px';
  div.innerHTML = `<h2 style="margin:0 0 8px"> Netlify Proxy URL</h2>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px">Deploy <b>football-ai-proxy</b> to Netlify, then paste your site URL here. <a href="https://app.netlify.com" target="_blank" style="color:var(--accent)">Open Netlify →</a></div>
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <input id="proxyUrlInput" placeholder="https://your-site-name.netlify.app" value="${PROXY_BASE}" style="flex:1">
      <button onclick="saveProxyUrl()" class="primary">Save</button>
    </div>
    <div id="proxyUrlSaved" style="font-size:11px;color:var(--green);margin-bottom:8px;display:none"> Proxy URL saved — refreshing live scores…</div>
    <div style="font-size:11px;color:var(--muted);background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:10px;line-height:1.8">
      <b style="color:var(--text)">Setup steps:</b><br>
      1. Download the <b>football-ai-proxy</b> zip from this dashboard<br>
      2. Go to <a href="https://app.netlify.com" target="_blank" style="color:var(--accent)">app.netlify.com</a> → Add new site → Deploy manually → drag the folder<br>
      3. Site config → Environment variables → add <code style="color:var(--accent)">AFOOT_API_KEY</code> = your Football data key<br>
      4. Deploys → Trigger deploy → then paste your site URL above
    </div>`;
  diagSec.insertBefore(div, diagSec.firstChild);
  window.saveApiKey = function() {
    const v = document.getElementById('apiKeyInput')?.value?.trim();
    /* provider credentials are never stored in the browser */
    const s = document.getElementById('apiKeySaved');
    if (s) { s.style.display = 'block'; setTimeout(()=>s.style.display='none', 3000); }
    liveWidgetRefresh();
  };
  window.saveProxyUrl = function() {
    const v = document.getElementById('proxyUrlInput')?.value?.trim();
    if (v) { localStorage.setItem('faiProxyUrl', v); PROXY_BASE = v; }
    const s = document.getElementById('proxyUrlSaved');
    if (s) { s.style.display = 'block'; setTimeout(()=>s.style.display='none', 3000); }
    liveWidgetRefresh();
  };
})();

// v185: provider API keys are server-side only; no browser/localStorage API key seeding.

// ── Auto-refresh ───────────────────────────────────────────
setTimeout(()=>{ if(typeof liveWidgetRefresh==='function') liveWidgetRefresh(); },1600);
refreshTimer = setInterval(liveWidgetRefresh, REFRESH_MS);

// Update pricing in monetise tab
(function updatePricing() {
  // Update plan prices to R50/R500
  const monthly  = document.getElementById('planMonthly');
  const lifetime = document.getElementById('planLifetime');
  if (monthly)  monthly.querySelector('.price').innerHTML  = 'R50<span>/mo</span>';
  if (lifetime) lifetime.querySelector('.price').innerHTML = 'R500<span> once</span>';
  // Update calc defaults
  const calcSubs = document.getElementById('calcSubs');
  if (calcSubs) { calcSubs.value = '20'; }
  setTimeout(() => { if(window.calcRevenue) window.calcRevenue(); }, 200);
})();

})();


(function(){

// ── Apply corners gate on tab switch ──────────────────────
const _origShowTabExtras = window.showTab;
window.showTab = function(id, btn) {
  if (typeof _origShowTabExtras === 'function') _origShowTabExtras(id, btn);
  if (id === 'corners') {
    const gate    = document.getElementById('cornersGateBanner');
    const content = document.getElementById('cornersContent');
    const sub = true; // v347: public prediction analytics
    if (gate)    gate.style.display    = sub ? 'none' : 'block';
    if (content) content.style.display = sub ? ''     : 'none';
  }
};

// -- Past Results Search -- canonical FastAPI /results/search (v373) --
let _pastResultsSearchBusy = false;
window.searchPastResults = async function() {
  const input = document.getElementById('pastTeamInput');
  const filterEl = document.getElementById('pastResultsFilter');
  const out = document.getElementById('pastResultsOutput');
  const btn = document.getElementById('pastResultsSearchBtn');
  const q = (input?.value || '').trim();
  const filter = filterEl?.value || 'results';
  if (!out) return;
  if (!q) { out.innerHTML='<div class="empty">Enter a team, country, competition, year or date.</div>'; input?.focus(); return; }
  if (_pastResultsSearchBusy) return;
  _pastResultsSearchBusy = true;
  if (btn) { btn.disabled=true; btn.textContent='Searching…'; }
  const esc=s=>String(s??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  out.innerHTML='<div class="empty">Searching Finished Matches for <b>'+esc(q)+'</b>…</div>';
  try {
    const params = new URLSearchParams({q:q, sport:'football', limit: filter==='history' ? '100' : '50', include_recent:'true'});
    // A four-digit year or ISO date is also sent as a structured filter while q remains broad.
    if (/^(19|20)\d{2}$/.test(q)) params.set('year', q);
    if (/^\d{4}-\d{2}-\d{2}$/.test(q)) { params.set('date_from',q); params.set('date_to',q); }
    const res=await fetch('/results/search?'+params.toString(), {headers:{'Accept':'application/json'}, cache:'no-store'});
    let data={}; try { data=await res.json(); } catch(_) {}
    if (!res.ok) throw new Error(data.detail || data.error || ('Search failed (HTTP '+res.status+')'));
    let matches=Array.isArray(data.matches)?data.matches:[];
    if (filter==='fixtures') matches=[]; // archive is intentionally completed matches only
    if (filter==='form') matches=matches.slice(0,10); else if (filter==='results') matches=matches.slice(0,40);
    if (!matches.length) {
      const pm=data.historicalProvider||{};
      out.innerHTML='<div class="empty"><b>No finished matches found for “'+esc(q)+'”.</b><br><span style="font-size:11px">Historical provider checked: '+(pm.attempted?'yes':'no')+(pm.providerCalls!=null?' · API calls: '+esc(pm.providerCalls):'')+'.</span></div>';
      return;
    }
    const rows=matches.map(m=>{
      const fid=String(m.id||'');
      const hs=(m.homeScore??'–'), as=(m.awayScore??'–');
      const dt=m.date?new Date(m.date):null;
      const ds=dt&&!isNaN(dt)?dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):esc(m.date||'');
      const stats=fid?'<button type="button" class="primary" style="padding:4px 9px;font-size:10px" onclick="event.stopPropagation();window.location.href=\'/matches/'+encodeURIComponent(fid)+'/stats\'">Stats</button>':'';
      return '<div class="fixture" style="display:flex;align-items:center;gap:10px;padding:10px 12px">'+
        (m.homeLogo?'<img src="'+esc(m.homeLogo)+'" style="width:22px;height:22px;object-fit:contain" loading="lazy">':'')+
        '<div style="flex:1;min-width:0"><div style="font-weight:700">'+esc(m.home)+' <b>'+esc(hs)+' – '+esc(as)+'</b> '+esc(m.away)+'</div><div class="sub">'+esc(m.league||m.competition||'')+(m.country?' · '+esc(m.country):'')+(m.season?' · '+esc(m.season):'')+'</div></div>'+stats+'<div class="sub" style="white-space:nowrap">'+ds+'</div></div>';
    }).join('');
    out.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>'+matches.length+' finished match'+(matches.length===1?'':'es')+'</b><span class="sub">Permanent archive'+(data.historicalRowsArchived?' · '+data.historicalRowsArchived+' newly archived':'')+'</span></div>'+rows;
  } catch(err) {
    out.innerHTML='<div class="empty" style="color:var(--red)"><b>Finished Matches search failed.</b><br>'+esc(err.message||'Unable to retrieve results.')+'</div>';
    console.error('Past results search:',err);
  } finally {
    _pastResultsSearchBusy=false;
    if (btn) { btn.disabled=false; btn.textContent='Search'; }
  }
};

// ── Player Stats — add worldwide note ──────────────────────
(function addPlayerStatsNote(){
  const ps = document.getElementById('playerstats');
  if (!ps) return;
  const note = document.createElement('div');
  note.style.cssText = 'background:var(--panel2);border:1px solid var(--panel2);border-radius:10px;padding:10px 14px;font-size:12px;color:var(--muted);margin-bottom:12px';
  note.innerHTML = ' <b style="color:var(--accent)">Worldwide Coverage</b> — Player stats are loaded across all major football competitions. Use the league filter and season selector above to narrow results. Data is sourced live from Kasi Sports News.';
  ps.insertBefore(note, ps.firstChild);
})();

// ══════════════════════════════════════════════════════════════
// ADMIN ACCESS — Server-authenticated login (JWT)
// Credentials are validated server-side via /auth/login
// Admin entitlement is granted via /auth/entitlement/{email}
// ══════════════════════════════════════════════════════════════

const ADMIN_EMAIL = 'jbatuma@yahoo.com';

// ── Server-auth entitlement (replaces localStorage-only gate) ─
(function initServerEntitlement() {
  const SESSION_KEY = 'kasiscore_session';
  const IDLE_LIMIT_MS = 60 * 1000;
  const VERIFY_EVERY_MS = 30 * 1000;
  let idleTimer = null;
  let lastActivity = Date.now();
  let verificationInFlight = false;

  function getToken() {
    return localStorage.getItem(SESSION_KEY) || '';
  }

  function clearAuthenticatedState(reason) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('faiAdmin');
    localStorage.removeItem('faiProUnlocked');
    localStorage.removeItem('faiSubUser');
    sessionStorage.removeItem('ks_last_activity');
    if (reason) console.info('Session ended:', reason);
  }

  function scheduleIdleLogout() {
    if (idleTimer) clearTimeout(idleTimer);
    if (!getToken()) return;
    const remaining = Math.max(0, IDLE_LIMIT_MS - (Date.now() - lastActivity));
    idleTimer = setTimeout(() => {
      if (!getToken()) return;
      if ((Date.now() - lastActivity) >= IDLE_LIMIT_MS) {
        clearAuthenticatedState('1 minute of inactivity');
        location.reload();
      } else {
        scheduleIdleLogout();
      }
    }, remaining + 50);
  }

  function markActive() {
    if (!getToken()) return;
    lastActivity = Date.now();
    sessionStorage.setItem('ks_last_activity', String(lastActivity));
    scheduleIdleLogout();
  }

  async function verifySession() {
    const token = getToken();
    if (!token || verificationInFlight) return;
    verificationInFlight = true;
    try {
      const r = await fetch((typeof base === 'function' ? base() : '') + '/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token },
        cache: 'no-store'
      });

      if (r.status === 401 || r.status === 403) {
        clearAuthenticatedState('account/session is no longer active');
        location.reload();
        return;
      }
      if (!r.ok) return;

      const d = await r.json();
      if (String(d.status || 'active').toLowerCase() !== 'active') {
        clearAuthenticatedState('account disabled');
        location.reload();
        return;
      }

      window._serverPro = !!d.pro;
      window._serverEmail = d.email || '';
      window._serverAdmin = String(d.role || 'user').toLowerCase() === 'admin';

      document.querySelectorAll('[data-intelligence-admin="true"]').forEach(el => {
        el.style.display = window._serverAdmin ? '' : 'none';
      });

      if (d.pro) localStorage.setItem('faiProUnlocked', '1');
      else localStorage.removeItem('faiProUnlocked');
    } catch (e) {
      console.warn('Session verification temporarily unavailable');
    } finally {
      verificationInFlight = false;
    }
  }

  window.ksSignOut = async function() {
    clearAuthenticatedState('manual sign out');
    window._serverPro=false;
    window._serverEmail='';
    window._serverAdmin=false;
    if(typeof window.ksAuthBoot==='function') await window.ksAuthBoot();
    if(typeof window.applySubscriberGates==='function') window.applySubscriberGates();
  };

  // Always reset lastActivity to NOW on page load.
  // A stale sessionStorage timestamp (e.g. from minutes ago) would make
  // the idle timer fire immediately after login, logging the user out.
  lastActivity = Date.now();
  sessionStorage.setItem('ks_last_activity', String(lastActivity));

  if (getToken()) {
    markActive();
    verifySession();

    ['pointerdown', 'keydown', 'touchstart', 'scroll', 'focus'].forEach(evt => {
      window.addEventListener(evt, markActive, { passive: true });
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        markActive();
        verifySession();
      }
    });

    setInterval(() => {
      if (getToken()) verifySession();
    }, VERIFY_EVERY_MS);
  }
})();

// Subscriber accounts — admin can add accounts here or via the panel
// Format: { username, password, email, label }
function getSubscriberAccounts() {
  try {
    return JSON.parse(localStorage.getItem('faiSubscriberAccounts') || '[]');
  } catch(_) { return []; }
}
function saveSubscriberAccounts(arr) {
  localStorage.setItem('faiSubscriberAccounts', JSON.stringify(arr));
}

// ── Inject admin login modal ──────────────────────────────────
(function injectAdminLoginModal(){
  const fld = 'width:100%;box-sizing:border-box;background:#0a0a0a;border:1px solid #2a2a2a;color:var(--text);border-radius:8px;padding:9px 12px;font-size:13px;margin-bottom:10px';
  const lbl = 'font-size:11px;color:var(--muted);display:block;margin-bottom:4px';
  const btn = 'width:100%;padding:11px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;border:none;';

  const modal = document.createElement('div');
  modal.id = 'adminLoginModal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="background:#000;border:1px solid #2a2a2a;border-radius:18px;width:390px;max-width:100%;box-shadow:0 24px 72px rgba(0,0,0,.7);overflow:hidden">

      <!-- Header -->
      <div style="padding:26px 28px 0;text-align:center">
        <div style="font-size:30px;margin-bottom:6px">⚽</div>
        <div style="font-size:17px;font-weight:800;color:var(--text)">Kasi Sports News</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">Sports Intelligence Dashboard</div>
      </div>

      <!-- Tab switcher -->
      <div style="display:flex;margin:20px 28px 0;background:#111;border-radius:10px;padding:3px;gap:3px">
        <button id="authTabLogin"
          onclick="window.switchAuthTab('login')"
          style="flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:var(--accent);color:#000;transition:all .2s">
          Sign In
        </button>
        <button id="authTabRegister"
          onclick="window.switchAuthTab('register')"
          style="flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:transparent;color:var(--muted);transition:all .2s">
          Create Account
        </button>
      </div>

      <!-- LOGIN PANEL -->
      <div id="authPanelLogin" style="padding:20px 28px 24px">
        <div style="margin-bottom:10px">
          <label style="${lbl}">Email, username or phone</label>
          <input id="adminLoginUser" type="text" placeholder="Email, username or +27 phone number"
            autocomplete="username" style="${fld}"
            onkeydown="if(event.key==='Enter')window.doAdminLogin()">
        </div>
        <div style="margin-bottom:6px">
          <label style="${lbl}">Password</label>
          <div style="position:relative">
            <input id="adminLoginPass" type="password" placeholder="Your password"
              autocomplete="current-password"
              style="width:100%;box-sizing:border-box;background:#0a0a0a;border:1px solid #2a2a2a;color:var(--text);border-radius:8px;padding:9px 40px 9px 12px;font-size:13px"
              onkeydown="if(event.key==='Enter')window.doAdminLogin()">
            <button onclick="var i=document.getElementById('adminLoginPass');i.type=i.type==='password'?'text':'password'"
              style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);cursor:pointer;font-size:15px">Show</button>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin:8px 0 14px">
          <button onclick="window.openUsernameRecovery()" style="background:none;border:none;color:var(--accent);font-size:11px;cursor:pointer;padding:0">Forgot username?</button>
          <button onclick="window.openPasswordRecovery()" style="background:none;border:none;color:var(--accent);font-size:11px;cursor:pointer;padding:0">Forgot password?</button>
        </div>
        <div id="adminLoginMsg" style="font-size:12px;text-align:center;margin-bottom:12px;min-height:18px;line-height:1.4"></div>
        <button onclick="window.doAdminLogin()"
          style="${btn}background:var(--accent);color:#000">Sign In →</button>
        <div style="text-align:center;margin-top:14px">
          <button onclick="window.closeAdminLogin()"
            style="background:none;border:none;color:var(--muted);font-size:11px;cursor:pointer">Cancel</button>
          <span style="color:#333;margin:0 10px">|</span>
          <button onclick="window.switchAuthTab('register')"
            style="background:none;border:none;color:var(--accent);font-size:11px;cursor:pointer">No account? Register →</button>
        </div>
      </div>

      <!-- REGISTER PANEL -->
      <div id="authPanelRegister" style="display:none;padding:20px 28px 24px">
        <div style="margin-bottom:10px">
          <label style="${lbl}">Email <span style="color:#ef4444">*</span></label>
          <input id="regEmail" type="email" placeholder="your@email.com"
            autocomplete="email" style="${fld}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <label style="${lbl}">Username <span style="color:var(--muted);font-weight:400">(optional)</span></label>
            <input id="regUsername" type="text" placeholder="e.g. kasi_fan"
              autocomplete="username" style="${fld}margin-bottom:0">
          </div>
          <div>
            <label style="${lbl}">Phone <span style="color:var(--muted);font-weight:400">(optional)</span></label>
            <input id="regPhone" type="tel" placeholder="+27821234567"
              autocomplete="tel" style="${fld}margin-bottom:0">
          </div>
        </div>
        <div style="margin-bottom:4px">
          <label style="${lbl}">Password <span style="color:#ef4444">*</span> <span style="color:var(--muted);font-weight:400">(min 8 chars)</span></label>
          <div style="position:relative">
            <input id="regPassword" type="password" placeholder="Create a strong password"
              autocomplete="new-password"
              style="width:100%;box-sizing:border-box;background:#0a0a0a;border:1px solid #2a2a2a;color:var(--text);border-radius:8px;padding:9px 40px 9px 12px;font-size:13px;margin-bottom:6px"
              oninput="window.updatePasswordStrength()"
              onkeydown="if(event.key==='Enter')window.doRegister()">
            <button onclick="var i=document.getElementById('regPassword');i.type=i.type==='password'?'text':'password'"
              style="position:absolute;right:10px;top:calc(50% - 3px);transform:translateY(-50%);background:none;border:none;color:var(--muted);cursor:pointer;font-size:15px">Show</button>
          </div>
          <div style="height:4px;background:#1a1a1a;border-radius:4px;overflow:hidden;margin-bottom:4px">
            <div id="pwStrengthBar" style="height:100%;width:0%;border-radius:4px;transition:width .3s,background .3s"></div>
          </div>
          <div id="pwStrengthLabel" style="font-size:10px;color:var(--muted);margin-bottom:8px"></div>
        </div>
        <div style="margin-bottom:12px">
          <label style="${lbl}">Confirm password <span style="color:#ef4444">*</span></label>
          <input id="regPassword2" type="password" placeholder="Repeat your password"
            autocomplete="new-password" style="${fld}margin-bottom:0"
            onkeydown="if(event.key==='Enter')window.doRegister()">
        </div>
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:14px">
          <input id="regTerms" type="checkbox" style="margin-top:3px;flex-shrink:0;accent-color:var(--accent)">
          <label for="regTerms" style="font-size:11px;color:var(--muted);line-height:1.5;cursor:pointer">
            I agree to the KasiScore Terms of Use and confirm I am 18 or older.
          </label>
        </div>
        <div id="registerMsg" style="font-size:12px;text-align:center;margin-bottom:12px;min-height:18px;line-height:1.4"></div>
        <button onclick="window.doRegister()"
          style="${btn}background:var(--accent);color:#000">Create Account →</button>
        <div style="text-align:center;margin-top:14px">
          <button onclick="window.closeAdminLogin()"
            style="background:none;border:none;color:var(--muted);font-size:11px;cursor:pointer">Cancel</button>
          <span style="color:#333;margin:0 10px">|</span>
          <button onclick="window.switchAuthTab('login')"
            style="background:none;border:none;color:var(--accent);font-size:11px;cursor:pointer">Already registered? Sign in →</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Subscriber account panel is now inline in the admin widget

  // Inject credentials reveal box into admin widget
  (function(){
    const w = document.getElementById('kasiscoreAdminWidget');
    if (!w || document.getElementById('adminCredBox')) return;
    const box = document.createElement('div');
    box.id = 'adminCredBox';
    box.style.cssText = 'display:none;margin-top:10px;background:#0a0f1a;border:1px solid #1a2a3a;border-radius:10px;padding:12px;font-size:11px';
    box.innerHTML =
      '<div style="font-weight:800;color:var(--accent);margin-bottom:8px">Admin Login Details</div>' +
      '<div style="margin-bottom:6px"><span style="color:var(--muted)">Email:</span> <b id="adminCredEmail" style="color:var(--text);user-select:all">' + (typeof ADMIN_EMAIL !== 'undefined' ? ADMIN_EMAIL : 'jbatuma@yahoo.com') + '</b></div>' +
      '<div style="margin-bottom:6px"><span style="color:var(--muted)">Password:</span> <b style="color:var(--text)">Set via server .env → AUTH_ADMIN_KEY / or the password you registered with</b></div>' +
      '<div style="margin-bottom:6px"><span style="color:var(--muted)">Default admin account:</span> <b style="color:var(--yellow)">Register at /auth/register with the ADMIN_EMAIL above, then set pro=true via /auth/entitlement</b></div>' +
      '<div style="color:var(--muted);font-size:10px;margin-top:8px;border-top:1px solid var(--line);padding-top:8px">Share these details only with trusted operators. Change password via Forgot password on the login modal.</div>';
    w.appendChild(box);
  })();
})();

// ── Admin credentials helper ─────────────────────────────────────────────
// Displays the admin login details inside the admin widget so the operator
// can always find them without leaving the panel.


// ── Auth tab switcher ────────────────────────────────────────────────────
window.switchAuthTab = function(tab) {
  const loginPanel    = document.getElementById('authPanelLogin');
  const registerPanel = document.getElementById('authPanelRegister');
  const loginTab      = document.getElementById('authTabLogin');
  const registerTab   = document.getElementById('authTabRegister');
  const accentColor   = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#38bdf8';
  if (tab === 'login') {
    loginPanel.style.display    = 'block';
    registerPanel.style.display = 'none';
    loginTab.style.background   = 'var(--accent)';
    loginTab.style.color        = '#000';
    registerTab.style.background = 'transparent';
    registerTab.style.color     = 'var(--muted)';
    setTimeout(() => document.getElementById('adminLoginUser')?.focus(), 50);
  } else {
    loginPanel.style.display    = 'none';
    registerPanel.style.display = 'block';
    loginTab.style.background   = 'transparent';
    loginTab.style.color        = 'var(--muted)';
    registerTab.style.background = 'var(--accent)';
    registerTab.style.color     = '#000';
    setTimeout(() => document.getElementById('regEmail')?.focus(), 50);
  }
};

// ── Password strength meter ──────────────────────────────────────────────
window.updatePasswordStrength = function() {
  const pw  = document.getElementById('regPassword')?.value || '';
  const bar = document.getElementById('pwStrengthBar');
  const lbl = document.getElementById('pwStrengthLabel');
  if (!bar || !lbl) return;
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { pct: 0,   color: '',         label: '' },
    { pct: 20,  color: '#ef4444',  label: 'Very weak' },
    { pct: 40,  color: '#f97316',  label: 'Weak' },
    { pct: 60,  color: '#fbbf24',  label: 'Fair' },
    { pct: 80,  color: '#22c55e',  label: 'Strong' },
    { pct: 100, color: '#38bdf8',  label: 'Very strong' },
  ];
  const l = levels[score] || levels[0];
  bar.style.width      = l.pct + '%';
  bar.style.background = l.color;
  lbl.textContent      = l.label;
  lbl.style.color      = l.color || 'var(--muted)';
};

// ── Register / sign-up handler ───────────────────────────────────────────
window.doRegister = async function() {
  const email    = (document.getElementById('regEmail')?.value    || '').trim();
  const username = (document.getElementById('regUsername')?.value || '').trim();
  const phone    = (document.getElementById('regPhone')?.value    || '').trim();
  const pw       = (document.getElementById('regPassword')?.value  || '');
  const pw2      = (document.getElementById('regPassword2')?.value || '');
  const terms    = document.getElementById('regTerms')?.checked;
  const msg      = document.getElementById('registerMsg');

  // Client-side validation
  if (!email || !email.includes('@')) {
    msg.innerHTML = '<span style="color:#ef4444">⚠ Enter a valid email address.</span>'; return;
  }
  if (pw.length < 8) {
    msg.innerHTML = '<span style="color:#ef4444">⚠ Password must be at least 8 characters.</span>'; return;
  }
  if (pw !== pw2) {
    msg.innerHTML = '<span style="color:#ef4444">⚠ Passwords do not match.</span>'; return;
  }
  if (!terms) {
    msg.innerHTML = '<span style="color:#ef4444">⚠ Please accept the Terms of Use.</span>'; return;
  }

  msg.innerHTML = '<span style="color:var(--muted)">Creating your account…</span>';

  try {
    const r = await fetch(base() + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username: username || null, phone: phone || null, password: pw })
    });
    const d = await r.json();

    if (!r.ok) {
      const detail = d.detail || 'Registration failed.';
      // Friendly duplicate-account message
      if (r.status === 409) {
        msg.innerHTML = '<span style="color:#ef4444">⚠ That email, username or phone is already registered. <button onclick="window.switchAuthTab(\'login\')" style="background:none;border:none;color:var(--accent);font-size:12px;cursor:pointer;text-decoration:underline">Sign in instead →</button></span>';
      } else {
        msg.innerHTML = '<span style="color:#ef4444">⚠ ' + detail + '</span>';
      }
      return;
    }

    // Success — store token + session same as login
    if (d.token) localStorage.setItem('kasiscore_session', d.token);
    localStorage.setItem('kasiscore_email', email);
    if (d.pro) localStorage.setItem('faiProUnlocked', '1');

    msg.innerHTML = '<span style="color:#22c55e">✅ Account created! Welcome to KasiScore. Signing you in…</span>';
    setTimeout(() => { window.closeAdminLogin(); location.reload(); }, 1200);

  } catch(e) {
    // Server unreachable — create a local subscriber account as fallback
    const accounts = getSubscriberAccounts();
    if (accounts.find(a => a.email === email || a.username === username)) {
      msg.innerHTML = '<span style="color:#ef4444">⚠ An account with that email or username already exists.</span>';
      return;
    }
    accounts.push({
      username: username || email.split('@')[0],
      password: pw,
      email: email,
      phone: phone || '',
      label: 'Self-registered',
      approved: true,
      pro: false,
      created: new Date().toISOString().slice(0, 10)
    });
    saveSubscriberAccounts(accounts);
    localStorage.setItem('faiProUnlocked', '1');
    localStorage.setItem('faiSubUser', username || email.split('@')[0]);
    msg.innerHTML = '<span style="color:#22c55e">✅ Account created (offline mode). Welcome! Signing you in…</span>';
    setTimeout(() => { window.closeAdminLogin(); location.reload(); }, 1200);
  }
};

window.signOutAdmin = function(){
  if (typeof window.ksSignOut === 'function') return window.ksSignOut();
  localStorage.removeItem('kasiscore_session');
  localStorage.removeItem('faiAdmin');
  localStorage.removeItem('faiProUnlocked');
  localStorage.removeItem('faiSubUser');
  window._serverPro=false;
  window._serverEmail='';
  window._serverAdmin=false;
  if(typeof window.ksAuthBoot==='function') window.ksAuthBoot();
};

window.showAdminCredentials = function() {
  var el = document.getElementById('adminCredBox');
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
};
window.openAdminLogin  = function(){ const m = document.getElementById('adminLoginModal'); if(m){m.style.display='flex'; window.switchAuthTab('login'); setTimeout(()=>document.getElementById('adminLoginUser')?.focus(),60);} };
window.openRegister    = function(){ const m = document.getElementById('adminLoginModal'); if(m){m.style.display='flex'; window.switchAuthTab('register'); setTimeout(()=>document.getElementById('regEmail')?.focus(),60);} };
window.closeAdminLogin = function(){ const m = document.getElementById('adminLoginModal'); if(m) m.style.display='none'; };
window.openAccountPanel  = function(){ window.renderAccountList(); };
window.closeAccountPanel = function(){ };

window.doAdminLogin = async function(){
  var identifier = (document.getElementById('adminLoginUser').value || '').trim();
  var email = identifier;
  var pass  = (document.getElementById('adminLoginPass').value || '');
  var msg   = document.getElementById('adminLoginMsg');
  msg.innerHTML = '<span style="color:var(--muted)">Checking…</span>';

  try {
    // Attempt server-side login first (email + password)
    const r = await fetch(base() + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier, email: identifier.includes('@') ? identifier : '', password: pass })
    });
    if (r.ok) {
      const d = await r.json();
      console.log('[KasiScore] Login response:', JSON.stringify(d));
      if (!d.token) {
        console.error('[KasiScore] No token in login response!', d);
        msg.innerHTML = '<span style="color:var(--red)">Unable to create a login session. Please try again.</span>';
        return;
      }
      // Save token and all auth state BEFORE reload
      localStorage.setItem('kasiscore_session', d.token);
      localStorage.setItem('kasiscore_email', d.email || identifier);
      localStorage.setItem('faiProUnlocked', (d.pro || d.admin || d.role === 'admin') ? '1' : '');
      if (d.admin || d.role === 'admin' || (d.email && d.email === (typeof ADMIN_EMAIL !== 'undefined' ? ADMIN_EMAIL : ''))) {
        localStorage.setItem('faiAdmin', 'true');
        localStorage.setItem('faiProUnlocked', '1');
      }
      // Verify token was actually saved
      const saved = localStorage.getItem('kasiscore_session');
      console.log('[KasiScore] Session established:', Boolean(saved));
      msg.innerHTML = '<span style="color:var(--green)"> Logged in as ' + (d.email || email) + '.</span>';
      window.closeAdminLogin();
      // v324: authenticate in-place; never reload or navigate the dashboard after Admin login.
      // v325: apply the authenticated state in-place. Do not rerun dashboard boot or navigate.
      window._serverPro=!!d.pro || !!d.admin || d.role==='admin';
      window._serverEmail=d.email || identifier;
      window._serverAdmin=!!d.admin || d.role==='admin';
      document.body.classList.toggle('ks-admin-authenticated',window._serverAdmin);
      document.querySelectorAll('[data-intelligence-admin="true"]').forEach(el=>el.style.display=window._serverAdmin?'':'none');
      if(typeof window.applySubscriberGates==='function') window.applySubscriberGates();
      if(window._serverAdmin && typeof window.toggleAdminWidget==='function'){
        const w=document.getElementById('kasiscoreAdminWidget');
        if(!w || getComputedStyle(w).display==='none') window.toggleAdminWidget();
      }
      return;
    } else {
      const errText = await r.text();
      console.error('[KasiScore] Login failed:', r.status, errText);
    }
  } catch(e) {
    console.error('[KasiScore] Login fetch error:', e);
    // Server unreachable — fall through to local account check below
  }

  // Fallback: check localStorage subscriber accounts (created by admin panel)
  var accounts = getSubscriberAccounts();
  var found = accounts.find(function(a){ return (a.username === email || a.email === email || a.phone === email || a.phone === identifier) && a.password === pass; });
  if (found && found.approved === false) {
    msg.innerHTML = '<span style="color:var(--red)"> Your account has been suspended. Contact the administrator.</span>';
    return;
  }
  if (found) {
    if (found.pro) localStorage.setItem('faiProUnlocked', '1');
    else localStorage.setItem('faiProUnlocked', '1'); // all local accounts get pro
    localStorage.setItem('faiSubUser', found.username);
    msg.innerHTML = '<span style="color:var(--green)"> Welcome, ' + found.username + '! Unlocking Pro…</span>';
    window.closeAdminLogin();
    if(typeof window.ksAuthBoot==='function') await window.ksAuthBoot();
    return;
  }

  msg.innerHTML = '<span style="color:var(--red)"> Incorrect credentials. Check your email/username/phone and password — or ask the admin to reset or create your account.</span>';
  document.getElementById('adminLoginPass').style.borderColor = 'var(--red)';
  setTimeout(function(){ document.getElementById('adminLoginPass').style.borderColor = ''; }, 2000);
};

window.createSubscriberAccount = function(){
  var user  = (document.getElementById('newAccUser').value || '').trim();
  var pass  = (document.getElementById('newAccPass').value || '').trim();
  var email = (document.getElementById('newAccEmail').value || '').trim();
  var phone = (document.getElementById('newAccPhone')?.value || '').trim();
  var msg   = document.getElementById('newAccMsg');
  if (!user) { msg.innerHTML = '<span style="color:var(--red)">Username is required.</span>'; return; }
  if (!pass || pass.length < 6) { msg.innerHTML = '<span style="color:var(--red)">Password must be at least 6 characters.</span>'; return; }
  var accounts = getSubscriberAccounts();
  if (accounts.find(function(a){ return a.username === user || (email && a.email === email); })) {
    msg.innerHTML = '<span style="color:var(--red)">Username or email already exists.</span>'; return;
  }
  accounts.push({ username: user, password: pass, email: email, phone: phone, approved: true, pro: true, created: new Date().toISOString().slice(0,10) });
  saveSubscriberAccounts(accounts);
  document.getElementById('newAccUser').value = '';
  document.getElementById('newAccPass').value = '';
  document.getElementById('newAccEmail').value = '';
  document.getElementById('newAccPhone').value = '';
  msg.innerHTML = '<span style="color:#22c55e">Account registered for ' + user + '.</span>';
  setTimeout(function(){ document.getElementById('newAccMsg').innerHTML=''; }, 3000);
  window.renderAccountList();
};

window.deleteSubscriberAccount = function(username){
  if (!confirm('Delete account for ' + username + '?')) return;
  var accounts = getSubscriberAccounts().filter(function(a){ return a.username !== username; });
  saveSubscriberAccounts(accounts);
  window.renderAccountList();
};

window.renderAccountList = function(){
  var el = document.getElementById('accListEl');
  if (!el) return;
  var accounts = getSubscriberAccounts();
  if (!accounts.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--muted);padding:8px 0">No subscriber accounts yet.</div>';
    return;
  }
  el.innerHTML = accounts.map(function(a, idx){
    var isActive = a.approved !== false;
    var statusDot = isActive
      ? '<span style="color:#22c55e;font-size:9px;font-weight:800">● Active</span>'
      : '<span style="color:#f87171;font-size:9px;font-weight:800">● Suspended</span>';
    var safeUser = (a.username||'').replace(/'/g,"\'");
    var btnBase = 'font-size:10px;padding:4px 9px;border-radius:5px;cursor:pointer;border:1px solid #2a2a2a;background:#111;color:var(--text)';
    var btnDanger = 'font-size:10px;padding:4px 9px;border-radius:5px;cursor:pointer;border:1px solid rgba(248,113,113,.35);background:rgba(248,113,113,.08);color:#f87171';
    var btnApprove = isActive
      ? '<button onclick="window.toggleSubscriberApproval('+idx+')" style="'+btnBase+'">Suspend</button>'
      : '<button onclick="window.toggleSubscriberApproval('+idx+')" style="'+btnBase+';border-color:#22c55e44;color:#22c55e">Approve</button>';
    return '<div style="padding:10px;background:#0d0d0d;border-radius:8px;margin-bottom:7px;border:1px solid #1e1e1e">' +
      '<div style="margin-bottom:7px">' +
        '<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px">' + (a.username||'—') + ' ' + statusDot + '</div>' +
        '<div style="font-size:10px;color:var(--muted)">' + (a.email||'No email') + (a.phone?' · '+a.phone:'') + ' · ' + (a.created||'—') + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:5px;flex-wrap:wrap">' +
        btnApprove +
        '<button onclick="window.adminResetPassword('+idx+')" style="'+btnBase+'">Set password</button>' +
        '<button onclick="window.deleteSubscriberAccount(\'' + safeUser + '\')" style="'+btnDanger+'">Delete</button>' +
      '</div>' +
    '</div>';
  }).join('');
};

window.toggleSubscriberApproval = function(idx) {
  var accounts = getSubscriberAccounts();
  if (!accounts[idx]) return;
  accounts[idx].approved = accounts[idx].approved === false ? true : false;
  saveSubscriberAccounts(accounts);
  window.renderAccountList();
};



window.adminResetPassword = function(idx) {
  var accounts = getSubscriberAccounts();
  if (!accounts[idx]) return;
  var newPass = prompt('Set new password for ' + accounts[idx].username + ' (min 6 characters):');
  if (!newPass || newPass.length < 6) { alert('Password must be at least 6 characters.'); return; }
  accounts[idx].password = newPass;
  saveSubscriberAccounts(accounts);
  alert('Password updated for ' + accounts[idx].username + '. New password: ' + newPass);
  window.renderAccountList();
};

// Add "Login" button to admin tabs area and account management link
(function addAdminLoginBtn(){
  const tabBar = document.querySelector('.tabs');
  if (!tabBar) return;
  // Login button
  const loginBtn = document.createElement('button');
  loginBtn.id = 'adminLoginBtn';
  loginBtn.style.cssText = 'margin-left:auto;background:linear-gradient(90deg,rgba(8,145,178,.25),rgba(124,58,237,.25));border:1px solid #0891b2;color:var(--accent);font-weight:700;font-size:11px;white-space:nowrap;flex-shrink:0';
  loginBtn.textContent = IS_ADMIN ? 'Admin ▼' : IS_SUBSCRIBER ? 'Account' : 'Login / Register';
  loginBtn.onclick = function(){
    if (IS_ADMIN) {
      // Show quick admin menu
      const menu = document.getElementById('adminQuickMenu');
      if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    } else {
      window.openAdminLogin();
    }
  };
  tabBar.appendChild(loginBtn);

  // Quick admin menu dropdown
  const menu = document.createElement('div');
  menu.id = 'adminQuickMenu';
  menu.style.cssText = 'display:none;position:fixed;top:80px;right:12px;background:#000;border:1px solid #222222;border-radius:10px;padding:8px;z-index:9990;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,.5)';
  menu.innerHTML = `
    <div style="font-size:10px;color:var(--muted);padding:4px 8px;margin-bottom:4px">Logged in as Admin</div>
    <button type="button" onclick="window.openAdminLogin && window.openAdminLogin()">Admin dashboard</button>
    <button type="button" onclick="localStorage.removeItem('faiAdmin');location.reload()">Sign out</button>`;
  document.body.appendChild(menu);
  document.addEventListener('click', function(e){
    if (!menu.contains(e.target) && e.target !== loginBtn) menu.style.display = 'none';
  });
})();

// ── URL param reset (keep for dev use) ───────────────────────
(function handleUrlParams(){
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('resetAdmin') === '1') {
    localStorage.removeItem('faiAdmin');
    localStorage.removeItem('faiProUnlocked');
    localStorage.removeItem('faiSubUser');
    window.history.replaceState({}, '', window.location.pathname);
    location.reload();
  }
})();

// ══════════════════════════════════════════════════════════════
// SUBSCRIBER GATE — show gate banners for non-subscribers
// ══════════════════════════════════════════════════════════════
(function applySubscriberGates(){
  const gates = [
    { bannerId: 'esGateBanner',  wrapId: 'esContent_wrap' },
    { bannerId: 'hsGateBanner',  wrapId: null },
    { bannerId: 'lsGateBanner',  wrapId: null },
  ];
  gates.forEach(({ bannerId, wrapId }) => {
    const banner = document.getElementById(bannerId);
    const wrap   = wrapId ? document.getElementById(wrapId) : null;
    if (!banner) return;
    banner.style.display = 'none'; // v347: public prediction access
    if (wrap) wrap.style.display = '';
  });
})();

// ══════════════════════════════════════════════════════════════
// PAYMENT TAB SWITCHER
// ══════════════════════════════════════════════════════════════
window.switchPayTab = function(tab) {
  ['card','voucher','eft'].forEach(t => {
    const panel = document.getElementById('pmPanel-' + t);
    const btn   = document.getElementById('pmTab-' + t);
    if (!panel || !btn) return;
    const active = t === tab;
    panel.style.display = active ? '' : 'none';
    btn.style.background = active ? '#111111' : 'transparent';
    btn.style.color = active ? 'var(--accent)' : 'var(--muted)';
  });
};

// ══════════════════════════════════════════════════════════════
// VOUCHER REDEMPTION
// Valid voucher codes are stored as a comma-separated list in
// localStorage key 'faiVoucherCodes' (set this from Admin panel)
// Format: FAI-XXXX-XXXX-XXXX
// ══════════════════════════════════════════════════════════════
window.redeemVoucher = function() {
  const input = document.getElementById('voucherInput');
  const msg   = document.getElementById('voucherMsg');
  if (!input || !msg) return;

  const code = input.value.trim().toUpperCase().replace(/\s+/g,'');
  if (!code) { msg.innerHTML = '<span style="color:var(--red)">Please enter a voucher code.</span>'; return; }

  // Check against stored valid codes
  const stored = (localStorage.getItem('faiVoucherCodes') || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

  // Also check a hardcoded demo code for testing
  const DEMO_CODE = 'FAI-DEMO-2024-PRO';
  const usedCodes = (localStorage.getItem('faiUsedVouchers') || '').split(',').map(c=>c.trim()).filter(Boolean);

  if (usedCodes.includes(code)) {
    msg.innerHTML = '<span style="color:var(--red)"> This voucher has already been used.</span>';
    return;
  }

  if (code === DEMO_CODE || stored.includes(code)) {
    // Mark as used and unlock
    usedCodes.push(code);
    localStorage.setItem('faiUsedVouchers', usedCodes.join(','));
    localStorage.setItem('faiProUnlocked', '1');
    msg.innerHTML = '<span style="color:var(--green)"> Voucher valid! Unlocking Pro…</span>';
    setTimeout(() => { closePaywall(); location.reload(); }, 1200);
  } else {
    msg.innerHTML = '<span style="color:var(--red)"> Invalid voucher code. Check and try again, or contact admin.</span>';
    input.style.borderColor = 'var(--red)';
    setTimeout(() => input.style.borderColor = '', 2000);
  }
};

// handlePayment — production-safe: never grants Pro for free when gateway is not configured
window.handlePayment = function(gateway) {
  const urls = {
    monthly_payfast:  localStorage.getItem('faiPayfastMonthly')  || '',
    lifetime_payfast: localStorage.getItem('faiPayfastLifetime') || '',
    monthly_stripe:   localStorage.getItem('faiStripeMonthly')   || '',
    lifetime_stripe:  localStorage.getItem('faiStripeLifetime')  || '',
    monthly_peach:    localStorage.getItem('faiPeachMonthly')    || '',
    lifetime_peach:   localStorage.getItem('faiPeachLifetime')   || '',
  };
  const plan = window.selectedPlan || 'monthly';
  const gw   = gateway || 'payfast';
  const url  = urls[plan + '_' + gw];

  if (!url || url.includes('YOUR_')) {
    // Show a user-friendly "contact admin" message — do NOT unlock Pro for free
    const paywallMsg = document.getElementById('paywallMsg');
    if (paywallMsg) {
      paywallMsg.innerHTML = `<div style="background:rgba(8,145,178,.1);border:1px solid var(--accent);border-radius:8px;padding:12px;font-size:12px;color:var(--text);margin-top:8px">
         <b>Payment not yet configured.</b> Please contact the admin at
        <a href="mailto:${ADMIN_EMAIL}" style="color:var(--accent)">${ADMIN_EMAIL}</a>
        to arrange access, or use a voucher code below.
      </div>`;
    } else {
      // Fallback if no paywallMsg element
      const msg = document.createElement('div');
      msg.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--panel2);border:1px solid var(--accent);border-radius:10px;padding:16px 24px;z-index:99999;font-size:13px;color:var(--text);max-width:380px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.5)';
      msg.innerHTML = ` <b>Payment not configured yet.</b><br>Contact <a href="mailto:${ADMIN_EMAIL}" style="color:var(--accent)">${ADMIN_EMAIL}</a> to get access, or use a voucher code.<br><button onclick="this.parentElement.remove()" style="margin-top:10px;background:var(--accent);border:none;color:#fff;padding:5px 16px;border-radius:6px;cursor:pointer">OK</button>`;
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 8000);
    }
    return;
  }
  window.open(url, '_blank');
};

// ══════════════════════════════════════════════════════════════
// LIVE TAB — render all live matches with inline stats
// ══════════════════════════════════════════════════════════════
function renderLiveTab() {
  const liveMatches = window.liveMatches || [];
  const list = document.getElementById('liveList');
  if (!list) return;

  if (!liveMatches || !liveMatches.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
      <div style="font-size:32px;margin-bottom:10px"></div>
      <div style="font-size:14px">No live matches currently right now</div>
      <div style="font-size:12px;margin-top:6px">Check back during match hours or view <b style="color:var(--accent)"> Live</b> widget above</div>
    </div>`;
    const tc = document.getElementById('liveTabCount');
    if (tc) tc.textContent = 'No matches live';
    return;
  }

  const tc = document.getElementById('liveTabCount');
  if (tc) tc.textContent = liveMatches.length + ' live';

  list.innerHTML = liveMatches.map(m => {
    const statBar = (label, home, away, color) => {
      const total = (home||0) + (away||0) || 1;
      const homePct = Math.round((home||0)/total*100);
      return `<div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:2px">
          <span>${home||0}</span><span style="color:#aac">${label}</span><span>${away||0}</span>
        </div>
        <div style="height:5px;background:var(--panel2);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${homePct}%;background:${color};border-radius:3px"></div>
        </div>
      </div>`;
    };

    const hasStat = m.hPoss || m.hShots || m.hCorners;
    const statsBlock = hasStat ? `
      <div style="margin-top:10px;padding:10px;background:var(--panel2);border-radius:8px;border:1px solid var(--panel2)">
        ${statBar('Possession %', m.hPoss, m.aPoss, 'var(--accent)')}
        ${statBar('Shots', m.hShots, m.aShots, 'var(--green)')}
        ${statBar('Corners', m.hCorners, m.aCorners, '#f59e0b')}
        <div style="display:flex;gap:16px;font-size:11px;color:var(--muted);margin-top:6px">
          <span> ${m.hYellow||0} – ${m.aYellow||0}</span>
          ${(m.hRed||m.aRed) ? `<span> ${m.hRed||0} – ${m.aRed||0}</span>` : ''}
          ${m.hOffsides!=null ? `<span> Off: ${m.hOffsides||0} – ${m.aOffsides||0}</span>` : ''}
        </div>
      </div>` : '';

    return `<div style="border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:10px;background:var(--panel2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:11px;color:var(--muted)">${m.league||''}</span>
        <span style="background:var(--red);color:#000;font-size:10px;font-weight:800;padding:2px 8px;border-radius:12px">⏱ ${m.min||0}'</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="flex:1;font-size:15px;font-weight:800">${m.home||'—'}</div>
        <div style="font-size:22px;font-weight:900;padding:0 16px;color:var(--text);min-width:70px;text-align:center">
          ${m.hs??'—'} – ${m.as??'—'}
        </div>
        <div style="flex:1;font-size:15px;font-weight:800;text-align:right">${m.away||'—'}</div>
      </div>
      ${statsBlock}
    </div>`;
  }).join('');
}

// Hook into the existing refresh cycle
const _origRefresh = window.liveWidgetRefresh;
window.liveWidgetRefresh = async function() {
  await _origRefresh();
  renderLiveTab();
};
// Also render on tab switch
const _origShowTab = window.showTab || function(){};
window.showTab = function(id, btn) {
  _origShowTab(id, btn);
  if (id === 'live') renderLiveTab();
};

// ══════════════════════════════════════════════════════════════
// TEAM AUTOCOMPLETE for Past Results
// ══════════════════════════════════════════════════════════════
let _acTimer = null;
let _acCache = {};

window.pastTeamAutocomplete = async function(val) {
  const sug = document.getElementById('pastTeamSuggestions');
  if (!sug) return;
  const q = val.trim();
  if (q.length < 3) { sug.style.display = 'none'; return; }

  clearTimeout(_acTimer);
  _acTimer = setTimeout(async () => {
    try {
      if (_acCache[q]) { showSuggestions(_acCache[q]); return; }
      const PROXY = window.location.origin;
      const res = await fetch(`${PROXY}/results/search?q=${encodeURIComponent(q)}&sport=football&limit=20&include_recent=false`);
      const data = await res.json();
      const seen = new Set();
      const teams = [];
      (data.matches || []).forEach(m => {
        [[m.home,m.homeLogo],[m.away,m.awayLogo]].forEach(([name,logo]) => {
          if(name && name.toLowerCase().includes(q.toLowerCase()) && !seen.has(name)){ seen.add(name); teams.push({name,logo:logo||'',country:m.country||'',league:m.league||''}); }
        });
      });
      teams.splice(8);
      _acCache[q] = teams;
      showSuggestions(teams);
    } catch(_) { sug.style.display = 'none'; }
  }, 350);

  function showSuggestions(teams) {
    if (!teams.length) { sug.style.display = 'none'; return; }
    sug.innerHTML = teams.map(t => {
      const logo = t.logo ? `<img src="${t.logo}" style="width:22px;height:22px;object-fit:contain" loading="lazy" decoding="async" fetchpriority="low">` : '<div style="width:22px"></div>';
      return `<div class="autocomplete-item" style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer" onclick="document.getElementById('pastTeamInput').value=${JSON.stringify(t.name)};document.getElementById('pastTeamSuggestions').style.display='none';window.searchPastResults()">${logo}<div><div style="font-weight:700">${t.name}</div><div style="font-size:10px;color:var(--muted)">${t.country}${t.league?' · '+t.league:''}</div></div></div>`;
    }).join('');
    sug.style.display = 'block';
  }
};

window.selectTeamSuggestion = function(name) {
  const inp = document.getElementById('pastTeamInput');
  const sug = document.getElementById('pastTeamSuggestions');
  if (inp) inp.value = name;
  if (sug) sug.style.display = 'none';
  window.searchPastResults();
};

// Hide suggestions on outside click
document.addEventListener('click', e => {
  const sug = document.getElementById('pastTeamSuggestions');
  const inp = document.getElementById('pastTeamInput');
  if (sug && inp && !sug.contains(e.target) && e.target !== inp) sug.style.display = 'none';
});

// ══════════════════════════════════════════════════════════════
// EXPECTED SCORERS — real API data loader
// ══════════════════════════════════════════════════════════════
window.loadExpectedScorers = async function() {
  // v347: public access — no subscriber gate
  const status  = document.getElementById('esStatus');
  const content = document.getElementById('esContent');
  const minChance = parseInt(document.getElementById('esMinChance')?.value || 35);
  const leagueFilter = document.getElementById('esLeagueFilter')?.value || 'all';

  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)"><div style="font-size:24px;animation:spin 1s linear infinite;display:inline-block"></div><div style="margin-top:8px">Loading top scorers…</div></div>';
  if (status) status.textContent = '';

  try {
    const PROXY   = window.location.origin;
    const today   = new Date().toISOString().slice(0,10);

    // Get today's fixtures first (same call as main data)
    const fixRes = await fetch(`${PROXY}/.netlify/functions/football?path=/fixtures&date=${today}`);
    const fixData = await fixRes.json();
    let fixtures = (fixData.response || []).filter(f => f.fixture.status.short !== 'FT');

    // Apply league filter
    if (leagueFilter !== 'all') {
      fixtures = fixtures.filter(f => f.league.name === leagueFilter);
    }

    if (!fixtures.length) {
      content.innerHTML = '<div class="empty" style="padding:30px;text-align:center">No upcoming fixtures found for today.</div>';
      return;
    }

    // Fetch top scorers for each fixture's league (parallel, deduplicated by league)
    const leagues = [...new Set(fixtures.map(f => f.league.id + '|' + f.league.season))];
    const scorersMap = {};

    await Promise.all(leagues.slice(0, 10).map(async key => {
      const [lgId, season] = key.split('|');
      try {
        // Current season top scorers
        const sc = await fetch(`${PROXY}/.netlify/functions/football?path=/players/topscorers&league=${lgId}&season=${season}`);
        const sd = await sc.json();
        scorersMap[lgId] = (sd.response || []).slice(0, 15);
      } catch(_) {}
    }));

    // Build output cards
    const cards = fixtures.slice(0, 20).map(f => {
      const lgId = String(f.league.id);
      const players = scorersMap[lgId] || [];
      const homeId  = f.teams.home.id;
      const awayId  = f.teams.away.id;

      // Filter to players in this fixture's teams
      const matchPlayers = players.filter(p =>
        p.statistics?.[0]?.team?.id === homeId || p.statistics?.[0]?.team?.id === awayId
      );

      const buildRow = (p) => {
        const stat   = p.statistics?.[0] || {};
        const goals  = stat.goals?.total || 0;
        const apps   = stat.games?.appearences || stat.games?.appearances || 1;
        const gpg    = apps > 0 ? goals / apps : 0;
        const prob   = Math.min(95, Math.round(gpg * 85 + (stat.shots?.on||0) * 1.2));
        if (prob < minChance) return '';
        const isHome = stat.team?.id === homeId;
        const teamLabel = isHome ? f.teams.home.name : f.teams.away.name;
        return `<tr>
          <td style="display:flex;align-items:center;gap:8px">
            ${p.player.photo ? `<img src="${p.player.photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" loading="lazy" decoding="async" fetchpriority="low">` : ''}
            <div><div style="font-weight:700;font-size:13px">${p.player.name}</div><div style="font-size:10px;color:var(--muted)">${teamLabel}</div></div>
          </td>
          <td style="text-align:center;font-weight:700;color:var(--green)">${goals}</td>
          <td style="text-align:center;color:var(--muted)">${apps}</td>
          <td style="text-align:center;color:#f59e0b;font-weight:700">${gpg.toFixed(2)}</td>
          <td style="text-align:center">
            <div style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800;background:${prob>=70?'rgba(52,211,153,.2)':prob>=50?'rgba(245,158,11,.2)':'rgba(251,113,133,.2)'};color:${prob>=70?'var(--green)':prob>=50?'#f59e0b':'var(--red)'}">
              ${prob}%
            </div>
          </td>
        </tr>`;
      };

      const rows = matchPlayers.map(buildRow).filter(Boolean).join('');
      if (!rows) return '';

      return `<div style="margin-bottom:14px;border:1px solid var(--line);border-radius:12px;overflow:hidden">
        <div style="padding:10px 14px;background:var(--panel2);display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-size:13px;font-weight:800">${f.teams.home.name} vs ${f.teams.away.name}</span>
            <span style="font-size:10px;color:var(--muted);margin-left:10px">${f.league.name}</span>
          </div>
          <span style="font-size:11px;color:var(--muted)">${new Date(f.fixture.date).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        <div style="overflow:auto">
          <table class="table" style="min-width:420px">
            <thead><tr><th>Player</th><th style="text-align:center">Goals</th><th style="text-align:center">Apps</th><th style="text-align:center">G/Game</th><th style="text-align:center">Score Prob</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    }).filter(Boolean).join('');

    if (!cards) {
      content.innerHTML = `<div class="empty" style="padding:30px;text-align:center">No players found above ${minChance}% scoring probability for today's fixtures.</div>`;
    } else {
      if (status) status.textContent = `Showing players with ≥${minChance}% scoring probability based on season form.`;
      content.innerHTML = cards;
    }
  } catch(err) {
    content.innerHTML = `<div class="empty" style="padding:30px;text-align:center">Error: ${err.message}<br><small>Please try again shortly.</small></div>`;
  }
};

})();


(function(){
  'use strict';
  const ADSENSE_ENABLED = true;                // v343: AdSense site code active during review
  const ADSENSE_CLIENT  = 'ca-pub-5442799591686279';
  const AD_SLOTS = {
    adStrip:         '',                        // ← strip ad-slot ID
    adStatsSidebar:  '',                        // ← sidebar (stats panel) ad-slot ID
  };

  function loadAdsenseScript(cb) {
    if (window.adsbygoogle) { cb(); return; }
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ADSENSE_CLIENT);
    s.crossOrigin = 'anonymous';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function renderAdUnit(containerId, slotId) {
    const el = document.getElementById(containerId);
    if (!el || !slotId) return; // no slot ID configured — leave slot empty
    el.innerHTML = `<ins class="adsbygoogle" style="display:block;width:100%;height:100%"
      data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${slotId}"
      data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) { console.warn('AdSense push failed:', e.message); }
  }

  function initAdsense() {
    if (!ADSENSE_ENABLED || !ADSENSE_CLIENT) return;
    loadAdsenseScript(() => {
      Object.entries(AD_SLOTS).forEach(([containerId, slotId]) => renderAdUnit(containerId, slotId));
    });
  }

  document.addEventListener('DOMContentLoaded', initAdsense);
})();


/* ================================================================
   KASISCORE SPORTS PLATFORM — Core sports client
   ================================================================ */
(function(){
  const sportsState={sport:'rugby',newsSport:'all'};
  const sports=['football','rugby','cricket'];
  const labels={football:'Football',rugby:'Rugby',cricket:'Cricket'};
  const fmtDate=d=>d?new Date(d).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
  const e=s=>esc(s);
  function api(path,params={}){return get(path,params)}
  function pills(id,active,onClick){const el=$(id);if(!el)return;el.innerHTML=sports.map(x=>`<button class="sport-pill ${x===active?'active':''}" onclick="${onClick}('${x}')">${labels[x]}</button>`).join('')}
  window.sportsSelect=function(sport){sportsState.sport=sport; const b=[...document.querySelectorAll('.tabs button')].find(x=>x.dataset.tab==='sportscores'); showTab('sportscores',b); loadSportsScores();}
  window.selectNewsSport=function(sport){sportsState.newsSport=sport; pills('newsPills',sport,'selectNewsSport'); loadSportsNews();}
  window.loadSportsScores=async function(){
    const sport=sportsState.sport; const date=$('sportsScoreDate')?.value||''; const status=$('sportsScoreStatus'); const list=$('sportsScoreList');
    if(status)status.textContent=`Loading ${labels[sport]}…`; list.innerHTML='<div class="empty">Loading scores…</div>';
    try{const d=await api(`/sports/${sport}/scores`,{date});
      if(status)status.textContent=`${d.count||0} ${labels[sport]} games · Updated ${new Date().toLocaleTimeString('en-ZA')}`;
      list.innerHTML=(d.games||[]).map(g=>`<div class="score-card ${g.statusShort==='in'?'live':''}" onclick="openSportMatchPage('${sport}','${g.id||''}','${g.leagueSlug||g.league||''}')" style="cursor:pointer"><div class="score-time">${fmtDate(g.date)}<br><span>${e(g.league)}</span></div><div class="score-teams"><b>${e(g.home)}</b><b>${e(g.away)}</b><span>${e(g.venue||'')}</span></div><div class="score-result">${g.homeScore??'—'}<br>${g.awayScore??'—'}</div><div class="score-status"><span class="badge ${g.statusShort==='in'?'live':'ok'}">${e(g.status)}</span></div></div>`).join('')||'<div class="empty">No games available for this sport/date. Try another date.</div>';
    }catch(err){list.innerHTML=`<div class="empty">${e(err.message)}</div>`;if(status)status.textContent='Unable to load data';}
  };
  function ensureNewsReader(){
    let x=document.getElementById('ksNewsReader'); if(x)return x;
    x=document.createElement('div'); x.id='ksNewsReader'; x.style.cssText='display:none;position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.86);padding:4vh 4vw;overflow:auto';
    x.innerHTML='<div id="ksNewsReaderCard" style="max-width:980px;margin:auto;background:#050505;border:1px solid var(--line);border-radius:16px;padding:18px;min-height:260px"></div>';
    x.addEventListener('click',ev=>{if(ev.target===x)x.style.display='none'}); document.body.appendChild(x); return x;
  }
  window.closeKasiNews=function(){const x=document.getElementById('ksNewsReader');if(x)x.style.display='none'};
  window.openKasiNews=async function(idx){
    const n=(window.__ksNewsItems||[])[Number(idx)]; if(!n)return; const x=ensureNewsReader(),c=document.getElementById('ksNewsReaderCard');x.style.display='block';
    c.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px"><div><div class="news-meta">${e(n.source||'Football News')} · ${e(n.published||'')}</div><h2 style="margin:6px 0 12px">${e(n.title||'Football news')}</h2></div><button onclick="closeKasiNews()">✕</button></div>${n.image?`<img src="${e(n.image)}" style="width:100%;max-height:430px;object-fit:cover;border-radius:12px" onerror="this.style.display='none'" loading="lazy" decoding="async" fetchpriority="low">`:''}<div class="empty" style="margin-top:14px">Loading publisher preview…</div>`;
    try{const d=await api('/sports/news/article',{url:n.link});
      const media=d.video?`<div style="margin-top:14px"><iframe src="${e(d.video)}" title="News video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px"></iframe></div>`:'';
      c.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px"><div><div class="news-meta">${e(d.source||n.source||'Football News')} · ${e(n.published||'')}</div><h2 style="margin:6px 0 12px">${e(d.title||n.title||'Football news')}</h2></div><button onclick="closeKasiNews()">✕</button></div>${(d.image||n.image)?`<img src="${e(d.image||n.image)}" style="width:100%;max-height:430px;object-fit:cover;border-radius:12px" onerror="this.style.display='none'" loading="lazy" decoding="async" fetchpriority="low">`:''}<p style="font-size:15px;line-height:1.65;color:var(--text);margin-top:16px">${e(d.summary||'Publisher preview unavailable for this story.')}</p>${media}<div class="sub" style="margin-top:14px">Publisher content remains owned by ${e(d.source||n.source||'the publisher')}. This is an in-dashboard preview.</div>`;
    }catch(err){c.innerHTML+=`<div class="empty">Preview unavailable: ${e(err.message)}</div>`}
  };
  window.loadSportsNews=async function(){
    const sport=sportsState.newsSport,rawQ=$('newsSearch')?.value||'',list=$('sportsNewsList');
    list.innerHTML='<div class="empty">Loading current sports headlines…</div>';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
    try{
      const u=new URL((typeof base==='function'?base():'')+'/sports/news',location.origin);
      u.searchParams.set('sport',sport);u.searchParams.set('q',rawQ);u.searchParams.set('limit','40');
      const r=await fetch(u,{cache:'no-store',signal:controller.signal});
      if(!r.ok)throw new Error('News service '+r.status);
      const d=await r.json();window.__ksNewsItems=d.items||[];
      list.innerHTML=(d.items||[]).map((n,i)=>{
        const img=(typeof kcNewsImageUrl==='function'?kcNewsImageUrl(n):'');
        return `<article class="news-item" onclick="location.href=${JSON.stringify(n.articlePath||('/news/article?source='+encodeURIComponent(n.originalUrl||n.publisherUrl||n.resolvedUrl||n.link||'')))}" style="display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center;cursor:pointer">
          <div>${img?`<img src="${e(img)}" alt="" loading="lazy" decoding="async" style="width:150px;height:92px;object-fit:cover;border-radius:8px;background:#111" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'kc-news-fallback',textContent:'KASI SPORTS NEWS'}))" fetchpriority="low">`:`<div class="kc-news-fallback" style="width:150px;height:92px">KASI SPORTS NEWS</div>`}</div>
          <div><b style="font-size:14px">${e(n.title||'Sports headline')}</b><div class="news-meta">${e(n.source||'Sports News')} · ${e(n.published||'')}</div><div class="sub" style="margin-top:5px">${e(n.summary||'Open article details')}</div></div>
        </article>`}).join('')||'<div class="empty">No current headlines were returned.</div>';
      if($('hubNewsCount'))$('hubNewsCount').textContent=d.count||0;
    }catch(err){
      list.innerHTML=`<div class="empty">${err.name==='AbortError'?'News took too long to respond. Please retry.':e(err.message||'News temporarily unavailable.')}</div>`;
    }finally{clearTimeout(timer);}
  };
  window.loadTransfers=async function(){const el=$('transferList');el.innerHTML='<div class="empty">Loading transfers…</div>';try{const sport=$('transferSport')?.value||'football';const d=await api('/sports/transfers',{page:1,sport});$('transferStatus').textContent=`${d.count||0} transfer records returned · ${d.source}`;el.innerHTML=(d.items||[]).map(x=>`<div class="transfer-row"><div><b>${e(x.player)}</b><div class="sub">${e(x.date||'')}</div></div><div><span class="badge noodds">OUT</span> ${e(x.teamOut||'—')}</div><div><span class="badge ok">IN</span> ${e(x.teamIn||'—')}</div><div style="text-align:right">${e(x.type||'Transfer')}</div></div>`).join('')||'<div class="empty">No transfer activity returned.</div>'}catch(err){el.innerHTML=`<div class="empty">${e(err.message)}</div>`}}
  window.loadInjuries=async function(){const el=$('injuryList');el.innerHTML='<div class="empty">Loading injuries…</div>';try{const sport=$('injurySport')?.value||'football';const params={sport};if($('injuryTeam').value)params.team=$('injuryTeam').value;if($('injuryLeague').value)params.league=$('injuryLeague').value;const d=await api('/sports/injuries',params);$('injuryStatus').textContent=`${d.count||0} injury records · season ${d.season}`;if($('hubInjuryCount'))$('hubInjuryCount').textContent=d.count||0;el.innerHTML=(d.items||[]).slice(0,150).map(x=>`<div class="injury-row"><div>${x.photo?`<img class="injury-avatar" src="${e(x.photo)}" loading="lazy" decoding="async" fetchpriority="low">`:''}<b>${e(x.player)}</b></div><div>${e(x.team||'—')}</div><div><span class="badge noodds">${e(x.type||'Unavailable')}</span></div><div>${e(x.reason||'—')}</div></div>`).join('')||'<div class="empty">No injuries returned.</div>'}catch(err){el.innerHTML=`<div class="empty">${e(err.message)}</div>`}}
  async function loadHub(){
    try{
      const sports=['football','rugby','cricket'];
      const [liveResults,n,inj]=await Promise.all([
        Promise.all(sports.map(sp=>api(`/sports/${sp}/scores`,{live:1}).catch(()=>({games:[]})))),
        api('/sports/news',{sport:'all',limit:8}).catch(()=>({items:[],count:0})),
        api('/sports/injuries',{}).catch(()=>({count:0}))
      ]);
      const live=liveResults.reduce((sum,d)=>sum+(d.games||[]).filter(g=>g.statusShort==='in').length,0);
      if($('hubLiveCount'))$('hubLiveCount').textContent=live;
      if($('hubNewsCount'))$('hubNewsCount').textContent=n.count||0;
      if($('hubNewsPreview'))$('hubNewsPreview').innerHTML=(n.items||[]).slice(0,8).map(x=>`<article class="news-item" style="display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center"><div>${x.image?`<img src="${e(x.image)}" alt="" loading="lazy" style="width:110px;height:70px;object-fit:cover;border-radius:7px" onerror="this.style.display='none'" decoding="async" fetchpriority="low">`:''}</div><div><a href="${e(x.link)}" target="_blank" rel="noopener noreferrer">${e(x.title)}</a><div class="news-meta">${e(x.source)} · ${e(x.published)}</div></div></article>`).join('');
      if($('hubInjuryCount'))$('hubInjuryCount').textContent=inj.count||0;
    }catch(err){console.warn('Hub load',err)}
  }
  const oldShow=window.showTab;
  window.showTab=function(id,btn){oldShow(id,btn);if(id==='sportshub'){loadHub()}if(id==='sportscores'){pills('sportPills',sportsState.sport,'sportsSelect');if($('sportsScoreDate')&&!$('sportsScoreDate').value)$('sportsScoreDate').value=new Date().toISOString().slice(0,10);loadSportsScores()}if(id==='sportsnews'){pills('newsPills',sportsState.newsSport,'selectNewsSport');loadSportsNews()}if(id==='transfers')loadTransfers();if(id==='injuries')loadInjuries()};
  document.addEventListener('DOMContentLoaded',()=>{if($('sportsScoreDate'))$('sportsScoreDate').value=new Date().toISOString().slice(0,10);loadHub();});
})();


// ── SA Rugby Intelligence Module ───────────────────────────────────────────
(function(){
  const RS = {
    league:  'urc',
    subTab:  'matches',
    team:    '',
    date:    '',
    live:    false,
  };

  function rugbyBase(){ return (typeof base === 'function' ? base() : window.location.origin); }
  async function rugbyFetch(path, params={}){
    const rb=rugbyBase()+path;
    const u = new URL(rb.startsWith('http')?rb:window.location.origin+rb);
    Object.entries(params).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=='') u.searchParams.set(k,v); });
    const r = await fetch(u.toString());
    if(!r.ok) throw new Error(r.statusText);
    return r.json();
  }

  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function pct(v){ return (v*100).toFixed(1)+'%'; }
  function conf(v){ const p=(v*100).toFixed(0); const col=v>=0.75?'#4ade80':v>=0.60?'#fbbf24':'#f87171'; return `<span style="color:${col}">${p}%</span>`; }

  /* Status badge */
  function statusBadge(s, short){
    const live=['1H','2H','HT','ET','BT','in'].some(x=>String(short||'').toLowerCase().includes(x.toLowerCase()));
    const done=['FT','AET','AOT'].includes(String(short||'').toUpperCase());
    if(live) return `<span class="rugby-status live">● LIVE</span>`;
    if(done) return `<span class="rugby-status" style="background:#1e293b">FT</span>`;
    return `<span class="rugby-status">${esc(s||'Scheduled')}</span>`;
  }

  /* ── Match Centre ── */
  function renderMatches(data){
    const games = data.games||[];
    if(!games.length){
      document.getElementById('rugbyMatchList').innerHTML='<div class="empty" style="padding:20px;text-align:center;color:var(--muted)">No fixtures found for this selection.</div>';
      return;
    }
    let html='';
    games.forEach(g=>{
      const live=['1H','2H','HT','ET','BT'].includes(String(g.statusShort||'').toUpperCase());
      const done=['FT','AET','AOT'].includes(String(g.statusShort||'').toUpperCase());
      const cls=live?'live':done?'finished':'';
      const hs=g.homeScore!=null?`<div class="rugby-team-score">${g.homeScore}</div>`:'<div class="rugby-team-score" style="color:var(--muted)">—</div>';
      const as=g.awayScore!=null?`<div class="rugby-team-score">${g.awayScore}</div>`:'<div class="rugby-team-score" style="color:var(--muted)">—</div>';
      const htLine=(g.htHome!=null&&g.htAway!=null)?`<div class="rugby-ht">HT: ${g.htHome}–${g.htAway}</div>`:'';
      const dateStr=g.date?new Date(g.date).toLocaleString('en-ZA',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
      const sa=['Bulls','Stormers','Sharks','Lions','Cheetahs','Griquas','Pumas'];
      const homeSA=sa.some(t=>String(g.home).includes(t))?'<span class="rugby-sa-badge">SA</span>':'';
      const awaySA=sa.some(t=>String(g.away).includes(t))?'<span class="rugby-sa-badge">SA</span>':'';
      html+=`<div class="rugby-match-card ${cls}">
        <div class="rugby-team-block">
          <div class="rugby-team-name">${esc(g.home)}${homeSA}</div>
          ${hs}
          ${htLine}
        </div>
        <div class="rugby-centre">
          ${statusBadge(g.status,g.statusShort)}
          <div class="rugby-venue">${esc(g.venue||'')}</div>
          <div class="rugby-round">${esc(g.round||dateStr)}</div>
        </div>
        <div class="rugby-team-block away">
          <div class="rugby-team-name">${awaySA}${esc(g.away)}</div>
          ${as}
          ${htLine}
        </div>
      </div>`;
    });
    document.getElementById('rugbyMatchList').innerHTML=html;
  }

  /* ── Standings ── */
  function renderStandings(data){
    const rows=data.standings||[];
    if(!rows.length){
      document.getElementById('rugbyStandingsList').innerHTML='<div class="empty" style="padding:16px;color:var(--muted)">Standings not available — Kasi Sports News key required or ESPN data not structured for this competition.</div>';
      return;
    }
    // Flatten nested structures (Kasi Sports News returns nested groups)
    let flat=[];
    function extract(items){
      if(!Array.isArray(items)){if(typeof items==='object'&&items) Object.values(items).forEach(v=>extract(v));return;}
      items.forEach(item=>{
        if(item.team||item.name) flat.push(item);
        else if(item.standings||item.entries) extract(item.standings||item.entries||[]);
        else if(Array.isArray(item)) extract(item);
      });
    }
    extract(rows);
    if(!flat.length){
      document.getElementById('rugbyStandingsList').innerHTML='<div style="padding:12px;color:var(--muted);font-size:12px">Standing format: raw data returned. <button onclick=\'document.getElementById("rugbyStandingRaw").style.display="block"\'>Show raw</button><pre id="rugbyStandingRaw" style="display:none;font-size:10px;overflow:auto">'+esc(JSON.stringify(rows,null,2))+'</pre></div>';
      return;
    }
    const sa=['Bulls','Stormers','Sharks','Lions','Cheetahs','Griquas'];
    let table=`<table class="rugby-standing-table">
      <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>PF</th><th>PA</th><th>Pts</th></tr></thead><tbody>`;
    flat.forEach((r,i)=>{
      const t=r.team||{}; const tn=t.name||r.name||r.team||'';
      const isSA=sa.some(s=>String(tn).includes(s));
      const badge=isSA?'<span class="rugby-sa-badge">SA</span>':'';
      const all=r.all||{}; const pts=r.points||r.pts||r.score||'—';
      const W=all.win??r.wins??r.win??'—'; const D=all.draw??r.draws??r.draw??'—'; const L=all.lose??r.losses??r.loss??'—'; const P=all.played??r.played??r.games??'—';
      const goals=all.goals||{}; const pf=goals.for??r.pointsFor??r.pf??'—'; const pa=goals.against??r.pointsAgainst??r.pa??'—';
      const hl=isSA?'style="background:rgba(0,119,73,.12)"':'';
      table+=`<tr ${hl}><td>${i+1}</td><td>${esc(tn)}${badge}</td><td>${P}</td><td>${W}</td><td>${D}</td><td>${L}</td><td>${pf}</td><td>${pa}</td><td><b>${pts}</b></td></tr>`;
    });
    table+='</tbody></table>';
    document.getElementById('rugbyStandingsList').innerHTML=table;
  }

  /* ── AI Predictions ── */
  function renderPredictions(data){
    const preds=data.predictions||[];
    if(!preds.length){
      document.getElementById('rugbyPredList').innerHTML='<div class="empty" style="padding:20px;text-align:center;color:var(--muted)">No upcoming fixtures to predict for this selection.</div>';
      return;
    }
    let html='';
    preds.forEach(p=>{
      const probs=p.probabilities||{};
      const score=p.predictedScore||{};
      const tries=p.predictedTries||{};
      const fix=p.fixture||{};
      const dateStr=fix.date?new Date(fix.date).toLocaleString('en-ZA',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
      const barW=Math.round((probs.homeWin||0)*100);
      const sig=p.signals||{};
      html+=`<div class="rugby-pred-card">
        <div class="rugby-pred-teams">
          <span>${esc(p.home)}</span>
          <span style="color:var(--muted);font-size:12px">vs</span>
          <span>${esc(p.away)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
          <span class="rugby-pred-pick">${esc(p.bestPick)}</span>
          <span class="rugby-conf">Confidence: ${conf(p.confidence||0)}</span>
          ${fix.round?`<span style="font-size:10px;color:var(--muted)">${esc(fix.round)}</span>`:''}
          ${dateStr?`<span style="font-size:10px;color:var(--muted)">${dateStr}</span>`:''}
        </div>
        <div class="rugby-pred-score">${score.home??'—'} – ${score.away??'—'} <span style="font-size:12px;color:var(--muted)">(Tries: ${tries.home??'—'} – ${tries.away??'—'})</span></div>
        <div class="rugby-pred-bar-wrap"><div class="rugby-pred-bar" style="width:${barW}%"></div></div>
        <div class="rugby-prob-row">
          <span>Home ${pct(probs.homeWin||0)}</span>
          <span>Draw ${pct(probs.draw||0)}</span>
          <span>Away ${pct(probs.awayWin||0)}</span>
        </div>
        <div class="rugby-signals-grid">
          <div class="rugby-signal"><div class="sv">${pct(sig.homeForm||0.5)}</div><div class="sl">Home Form</div></div>
          <div class="rugby-signal"><div class="sv">${pct(sig.awayForm||0.5)}</div><div class="sl">Away Form</div></div>
          <div class="rugby-signal"><div class="sv">${pct(sig.homeH2H||0.5)}</div><div class="sl">H2H (Home)</div></div>
          <div class="rugby-signal"><div class="sv">${pct(sig.homeAdvantage||0.5)}</div><div class="sl">Home Adv</div></div>
          <div class="rugby-signal"><div class="sv">${pct(sig.homeAttackDef||0.5)}</div><div class="sl">Att/Def (H)</div></div>
          <div class="rugby-signal"><div class="sv">${pct(sig.awayAttackDef||0.5)}</div><div class="sl">Att/Def (A)</div></div>
        </div>
        ${fix.venue?`<div style="font-size:10px;color:var(--muted);margin-top:6px"> ${esc(fix.venue)}</div>`:''}
      </div>`;
    });
    document.getElementById('rugbyPredList').innerHTML=html;
  }

  /* ── News ── */
  function renderNews(data){
    const items=data.items||[];
    if(!items.length){
      document.getElementById('rugbyNewsList').innerHTML='<div class="empty" style="padding:16px;color:var(--muted)">No rugby news available.</div>';
      return;
    }
    let html='';
    items.forEach(n=>{
      const d=n.published?new Date(n.published).toLocaleString('en-ZA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
      html+=`<div class="rugby-news-item">
        <a href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title)}</a>
        <div class="rugby-news-meta">${esc(n.source||'')}${d?' · '+d:''}</div>
      </div>`;
    });
    document.getElementById('rugbyNewsList').innerHTML=html;
  }

  /* ── Loaders ── */
  async function loadMatches(){
    document.getElementById('rugbyStatus').textContent='Loading fixtures…';
    try{
      const d=await rugbyFetch('/rugby/matches',{league:RS.league,date:RS.date,live:RS.live?1:0});
      renderMatches(d);
      document.getElementById('rugbyStatus').textContent=`${d.count} fixture(s) · ${d.source} · ${d.leagueName||RS.league}`;
    }catch(e){
      document.getElementById('rugbyMatchList').innerHTML=`<div class="empty" style="padding:16px;color:#f87171">Failed: ${e.message}</div>`;
      document.getElementById('rugbyStatus').textContent='Error loading fixtures.';
    }
  }

  async function loadStandings(){
    document.getElementById('rugbyStatus').textContent='Loading standings…';
    try{
      const d=await rugbyFetch('/rugby/standings',{league:RS.league});
      renderStandings(d);
      document.getElementById('rugbyStatus').textContent=`Standings · ${d.source} · Season ${d.season}`;
    }catch(e){
      document.getElementById('rugbyStandingsList').innerHTML=`<div class="empty" style="padding:16px;color:#f87171">Failed: ${e.message}</div>`;
      document.getElementById('rugbyStatus').textContent='Error loading standings.';
    }
  }

  async function loadPredictions(){
    document.getElementById('rugbyStatus').textContent='Generating AI predictions…';
    try{
      const d=await rugbyFetch('/rugby/predictions',{league:RS.league,date:RS.date});
      renderPredictions(d);
      document.getElementById('rugbyStatus').textContent=`${d.count} prediction(s) · ${d.engine}`;
    }catch(e){
      document.getElementById('rugbyPredList').innerHTML=`<div class="empty" style="padding:16px;color:#f87171">Failed: ${e.message}</div>`;
      document.getElementById('rugbyStatus').textContent='Error generating predictions.';
    }
  }

  async function loadNews(){
    document.getElementById('rugbyStatus').textContent='Loading SA rugby news…';
    try{
      const d=await rugbyFetch('/rugby/news',{team:RS.team});
      renderNews(d);
      document.getElementById('rugbyStatus').textContent=`${d.count} stories · Kasi Sports News`;
    }catch(e){
      document.getElementById('rugbyNewsList').innerHTML=`<div class="empty" style="padding:16px;color:#f87171">Failed: ${e.message}</div>`;
      document.getElementById('rugbyStatus').textContent='Error loading news.';
    }
  }

  async function checkApiStatus(){
    try{
      const d=await rugbyFetch('/rugby/health');
      const el=document.getElementById('rugbyApiStatus');
      if(el){
        if(d.apiSportsConfigured){
          el.textContent='Kasi Sports News ';
          el.style.background='#14532d';
          el.style.color='#4ade80';
        }else{
          el.textContent='ESPN fallback';
          el.style.background='#1e3a5f';
          el.style.color='#60a5fa';
        }
      }
    }catch(e){}
  }

  /* ── Panel switching ── */
  function showPanel(name){
    ['Matches','Standings','Predictions','News'].forEach(n=>{
      const el=document.getElementById('rugby'+n+'Panel');
      if(el) el.style.display=(n.toLowerCase()===name)?'block':'none';
    });
  }

  window.rugbySubTab=function(name,btn){
    RS.subTab=name;
    document.querySelectorAll('.rugby-sub-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    showPanel(name);
    const newsWrap=document.getElementById('rugbyTeamPillsWrap');
    const controls=document.getElementById('rugbyControls');
    const leaguePills=document.getElementById('rugbyLeaguePills');
    if(newsWrap) newsWrap.style.display=(name==='news')?'block':'none';
    if(controls) controls.style.display=(name==='news')?'none':'flex';
    if(leaguePills) leaguePills.style.display=(name==='news')?'none':'flex';
    rugbyLoad();
  };

  window.rugbySetLeague=function(league,btn){
    RS.league=league;
    document.querySelectorAll('.rugby-league-pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    rugbyLoad();
  };

  window.rugbySetTeam=function(team,btn){
    RS.team=team;
    document.querySelectorAll('.rugby-team-pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    loadNews();
  };

  window.rugbyLoad=function(){
    RS.date=document.getElementById('rugbyDate')?.value||'';
    RS.live=document.getElementById('rugbyLive')?.checked||false;
    if(RS.subTab==='matches')     loadMatches();
    else if(RS.subTab==='standings')   loadStandings();
    else if(RS.subTab==='predictions') loadPredictions();
    else if(RS.subTab==='news')        loadNews();
  };

  window.rugbyRefresh=function(){
    checkApiStatus();
    window.rugbyLoad();
  };

  /* Auto-load when tab activated */
  const _origShowTab=window.showTab;
  window.showTab=function(id,btn){
    _origShowTab(id,btn);
    if(id==='rugby_intel'){
      document.getElementById('rugbyDate').value=new Date().toISOString().slice(0,10);
      checkApiStatus();
      rugbyLoad();
    }
  };

  /* Init date default */
  (function(){ const d=document.getElementById('rugbyDate'); if(d) d.value=new Date().toISOString().slice(0,10); })();
})();


(function(){
  /* ── Cricket panel switcher ── */
  window.cricketShowPanel = function(panel, btn) {
    ['scores','odds','news','standings'].forEach(function(p){
      var el = document.getElementById('cricket' + p.charAt(0).toUpperCase() + p.slice(1) + 'Panel');
      if(el) el.hidden = (p !== panel);
    });
    document.querySelectorAll('#cricketTabs button').forEach(function(b){ b.classList.remove('active'); });
    if(btn) btn.classList.add('active');
    // Lazy-load on first open
    if(panel === 'scores' && !window._cricketScoresLoaded) cricketLoadScores();
    if(panel === 'news'   && !window._cricketNewsLoaded)   cricketLoadNews();
    if(panel === 'standings' && !window._cricketStandingsLoaded) cricketLoadStandings();
  };

  /* ── Live scores via /sports/scores?sport=cricket ── */
  window.cricketLoadScores = async function() {
    var list=document.getElementById('cricketScoreList'),status=document.getElementById('cricketApiStatus');
    if(!list)return;
    list.innerHTML='<div class="empty">Loading cricket scores…</div>';
    window._cricketScoresLoaded=true;
    const timed=(path,params,ms=8000)=>Promise.race([
      get(path,params),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Cricket provider timed out')),ms))
    ]);
    const gamesOf=d=>(d&&((d.games)||(d.matches)||(d.fixtures)))||[];
    const day=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
    try{
      let stage='today',games=gamesOf(await timed('/sports/scores',{sport:'cricket',date:day(0),live:0}));
      if(!games.length){stage='recent';games=gamesOf(await timed('/sports/scores',{sport:'cricket',date:day(-1),live:0}));}
      if(!games.length){stage='upcoming';games=gamesOf(await timed('/sports/scores',{sport:'cricket',date:day(1),live:0}));}
      if(!games.length){
        const n=await timed('/sports/news',{sport:'cricket',limit:6});
        const a=n.items||[];
        list.innerHTML=a.length?a.map(x=>{const im=kcNewsImageUrl(x);return `<article class="news-item" style="display:grid;grid-template-columns:90px 1fr;gap:10px">${im?`<img src="${escSafe(im)}" loading="lazy" style="width:90px;height:58px;object-fit:cover;border-radius:7px" onerror="this.style.display='none'" decoding="async" fetchpriority="low">`:'<div class="kc-news-fallback" style="width:90px;height:58px">CRICKET</div>'}<div><b>${escSafe(x.title||'Cricket news')}</b><div class="news-meta">${escSafe(x.source||'')}</div></div></article>`}).join(''):'<div class="empty">No current cricket match or news data is available.</div>';
        if(status)status.textContent=a.length?'Latest cricket news':'No current data';
        return;
      }
      if(status)status.textContent=(stage==='recent'?'Recent results · ':stage==='upcoming'?'Upcoming · ':'Today · ')+games.length+' match'+(games.length===1?'':'es');
      list.innerHTML=games.map(g=>{
        const home=escSafe(g.home||g.homeTeam||'Home'),away=escSafe(g.away||g.awayTeam||'Away');
        const hs=g.homeScore,as=g.awayScore,hasScore=hs!==undefined&&hs!==null&&as!==undefined&&as!==null;
        const st=escSafe(g.status||g.statusShort||'Upcoming'),league=escSafe(g.league||g.competition||'');
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)"><div><b>${home} vs ${away}</b>${league?`<div class="sub">${league}</div>`:''}</div><div style="font-weight:800;color:var(--accent)">${hasScore?escSafe(hs)+' – '+escSafe(as):st}</div></div>`;
      }).join('');
    }catch(e){
      list.innerHTML=`<div class="empty">Cricket data is temporarily unavailable.<br><small>${escSafe(e.message||String(e))}</small></div>`;
      if(status)status.textContent='Data temporarily unavailable';
    }
  };

  /* ── News via /sports/news?sport=cricket ── */
  window.cricketLoadNews = async function() {
    var el = document.getElementById('cricketNewsList');
    if(!el) return;
    window._cricketNewsLoaded = true;
    el.innerHTML = '<div class="empty">Loading cricket news…</div>';
    var q = (document.getElementById('cricketNewsSearch')?.value||'').trim() || 'Proteas OR SA20 cricket South Africa';
    try {
      var d = await get('/sports/news', {sport:'cricket', q:q, limit:20});
      var items = d.items || d.articles || [];
      if(!items.length) { el.innerHTML = '<div class="empty">No cricket headlines found.</div>'; return; }
      el.innerHTML = items.map(function(x){
        return '<article class="news-item" style="display:grid;grid-template-columns:90px 1fr;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)">' +
          '<div>' + (x.image ? '<img src="'+escSafe(x.image)+'" alt="" loading="lazy" style="width:90px;height:58px;object-fit:cover;border-radius:7px" onerror="this.style.display=\'none\'" decoding="async" fetchpriority="low">' : '<div style="width:90px;height:58px;background:rgba(22,163,74,.1);border-radius:7px;display:grid;place-items:center;font-size:22px"></div>') + '</div>' +
          '<div><a href="'+escSafe(x.link||x.url)+'" target="_blank" rel="noopener noreferrer" style="font-weight:600;color:var(--text)">'+escSafe(x.title)+'</a>' +
          '<div class="news-meta" style="margin-top:4px">'+escSafe(x.source||'')+(x.published?' · '+escSafe(x.published):'')+'</div></div>' +
          '</article>';
      }).join('');
    } catch(e) {
      el.innerHTML = '<div class="empty">Cricket news temporarily unavailable.</div>';
    }
  };

  /* ── Standings: ICC Test, ODI, T20I rankings via ESPN/wiki fallback ── */
  window.cricketLoadStandings = async function() {
    const el=document.getElementById('cricketStandingsList');if(!el)return;
    el.innerHTML='<div class="empty">Current cricket rankings will appear here when verified data is available.</div>';
  };

  /* ── Auto-load when cricket tab opens ── */
  var _origPrimary = window.kasiscorePrimaryNav;
  window.kasiscorePrimaryNav = function(id, btn) {
    if(typeof _origPrimary === 'function') _origPrimary(id, btn);
    if(id === 'cricket_intel') {
      if(!window._cricketScoresLoaded) window.cricketLoadScores();
      if(!window._cricketNewsLoaded)   window.cricketLoadNews();
    }
  };

  /* ── Responsive: stack on mobile ── */
  var style = document.createElement('style');
  style.textContent = '@media(max-width:700px){.cricket-scores-grid{grid-template-columns:1fr!important}}';
  document.head.appendChild(style);
})();


(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function event(name,extra={}){try{if(typeof track==='function')track(name,extra);}catch(_){} }
  function renderQueue(){const el=document.getElementById('jnQueue');if(!el)return;let q=[];try{q=JSON.parse(localStorage.getItem('kasiscore_distribution_queue')||'[]')}catch(_){};el.innerHTML=q.length?q.map(x=>`<div class="jn-queue-item"><span><b>${esc(x.channel)}</b> · ${esc(x.content||'')}</span><span class="jn-chip">${esc(x.status)}</span></div>`).join(''):'<div class="jn-muted">No shares yet.</div>';const pct=Math.min(100,Math.round(Math.min(q.length,7)/7*100));const p=document.getElementById('jnDistPct'),b=document.getElementById('jnDistBar');if(p)p.textContent=pct+'%';if(b)b.style.width=pct+'%';}
  window.jnRefresh=renderQueue;
  window.jnQueue=function(channel){let q=[];try{q=JSON.parse(localStorage.getItem('kasiscore_distribution_queue')||'[]')}catch(_){};q.unshift({channel,time:new Date().toISOString(),status:'Queued',content:'Kasi Sports News match intelligence'});localStorage.setItem('kasiscore_distribution_queue',JSON.stringify(q.slice(0,50)));renderQueue();event('share',{channel});};
  window.jnGenerateSocial=function(){renderQueue();};
  window.jnOpenMonetise=function(){if(typeof showTab==='function')showTab('monetise');};
  const old=window.showTab;window.showTab=function(id,btn){if(old)old(id,btn);if(id==='kasiscore_network')renderQueue();};
  window.addEventListener('load',renderQueue);
})();


(function(){
  window.kasiscorePrimaryNav=function(id,btn){
    const resolvedId = id==='search' ? 'intelligence_hub' : id;
    if(id==='search'){
      if(typeof showTab==='function')showTab('intelligence_hub',document.querySelector('[data-primary="intelligence_hub"]'));
      setTimeout(function(){document.getElementById('jgEntitySearch')?.focus();document.getElementById('jgEntitySearch')?.scrollIntoView({behavior:'smooth',block:'center'});},80);
    }else if(typeof showTab==='function'){showTab(id,document.querySelector('[data-primary="'+id+'"]'));}
    // Sync primary nav
    document.querySelectorAll('.kasiscore-primary-nav button[data-primary]').forEach(x=>x.classList.toggle('active',x.dataset.primary===resolvedId));
    // Sync mobile nav (fix #1: keep bottom bar in sync regardless of which nav triggered the switch)
    document.querySelectorAll('.kasiscore-mobile-nav button[data-mobile]').forEach(x=>x.classList.toggle('active',x.dataset.mobile===resolvedId));
  };
})();


(function(){
  window.toggleAdminWidget=function(btn){
    const w=document.getElementById('kasiscoreAdminWidget'); if(!w)return;
    const admin=localStorage.getItem('faiAdmin')==='true';
    w.style.display=w.style.display==='block'?'none':'block';
    const tools=document.getElementById('adminWidgetTools'), login=document.getElementById('adminWidgetLogin'), st=document.getElementById('adminWidgetStatus');
    if(admin){tools.style.display='block';login.style.display='none';st.textContent='Administrator';if(typeof window.renderAccountList==='function')window.renderAccountList();}
    else{tools.style.display='none';login.style.display='block';st.textContent='Sign in to access administration.';}
  };
  window.closeAdminWidget=function(){const w=document.getElementById('kasiscoreAdminWidget');if(w)w.style.display='none';};

})();


(function(){
  function adminToken(){return localStorage.getItem('kasiscore_session')||'';}
  function fmt(n){return Number(n||0).toLocaleString('en-ZA');}
  function draw(id, labels, values){const c=document.getElementById(id);if(!c)return;const x=c.getContext('2d'),d=devicePixelRatio||1,w=c.clientWidth||500,h=150;c.width=w*d;c.height=h*d;x.scale(d,d);x.clearRect(0,0,w,h);x.strokeStyle='#ffffff';x.fillStyle='#a7adb5';x.font='10px Segoe UI';const max=Math.max(1,...values);const step=w/Math.max(1,values.length);x.beginPath();values.forEach((v,i)=>{const px=i*step+step/2,py=h-22-(v/max)*(h-48);i?x.lineTo(px,py):x.moveTo(px,py)});x.strokeStyle='#38bdf8';x.lineWidth=2;x.stroke();values.forEach((v,i)=>{const px=i*step+step/2,py=h-22-(v/max)*(h-48);x.fillStyle='#38bdf8';x.beginPath();x.arc(px,py,3,0,Math.PI*2);x.fill();if(labels.length<15||i%Math.ceil(labels.length/10)===0){x.fillStyle='#a7adb5';x.fillText(labels[i],Math.max(0,px-15),h-6)}});}
  window.loadAdminAnalytics=async function(){
    const box=document.getElementById('adminAnalytics');if(!box)return;
    if(localStorage.getItem('faiAdmin')!=='true'){alert('Administrator access required.');return;}
    box.style.display=box.style.display==='none'?'block':'none';if(box.style.display==='none')return;
    try{const r=await fetch((typeof base==='function'?base():'')+'/admin/analytics',{headers:{Authorization:'Bearer '+adminToken()}});if(!r.ok)throw new Error('Analytics unavailable');const d=await r.json();
      document.getElementById('aaVisitors').textContent=fmt(d.uniqueVisitors);document.getElementById('aaClicks').textContent=fmt(d.clicks);document.getElementById('aaEarnings').textContent='R '+Number(d.earnings||0).toLocaleString('en-ZA',{minimumFractionDigits:2});document.getElementById('aaViews').textContent=fmt(d.pageViews);
      draw('aaTrafficChart',(d.daily||[]).map(x=>x.day.slice(5)),(d.daily||[]).map(x=>x.views));draw('aaClicksChart',(d.topClicks||[]).slice(0,10).map(x=>(x.path||'/').slice(0,16)),(d.topClicks||[]).slice(0,10).map(x=>x.count));
      const rows=(d.topPages||[]).slice(0,10);const max=Math.max(1,...rows.map(x=>x.count));document.getElementById('aaTopPages').innerHTML='<div class="admin-bars">'+rows.map(x=>'<div class="admin-bar-row"><span>'+String(x.path||'/').replace(/[&<>]/g,'')+'</span><div class="admin-bar"><i style="width:'+Math.round(x.count/max*100)+'%"></i></div><b>'+fmt(x.count)+'</b></div>').join('')+'</div>';
    }catch(e){document.getElementById('aaTopPages').innerHTML='<div class="sub">'+e.message+'</div>';}
  };
})();


(function(){
  const E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const P=v=>{let n=Number(v||0);if(n<=1)n*=100;return Math.max(0,Math.min(100,n))};
  const O=m=>m?.odds||m?.liveBookmakerOdds||{};
  const C=m=>P(m?.prediction?.confidence??m?.confidence??0);
  const W=m=>m?.prediction?.bestPick||m?.prediction?.winner||m?.bestOutcome||'—';
  const M=m=>Number(m?.liveStatus?.elapsed??m?.prediction?.fixtureMinute??m?.minute??m?.fixture?.status?.elapsed??0);
  const H=m=>m?.home||m?.homeTeam||'Home', A=m=>m?.away||m?.awayTeam||'Away';
  const KO=m=>m?.datetime||m?.kickoff||m?.date||'';
  const oddsProb=o=>{const a=Number(o.homeWin||0),d=Number(o.draw||0),b=Number(o.awayWin||0);const inv=[a?1/a:0,d?1/d:0,b?1/b:0],s=inv.reduce((x,y)=>x+y,0);return s?[inv[0]/s*100,inv[1]/s*100,inv[2]/s*100]:[0,0,0]};
  const winnerKey=m=>{const p=m?.prediction?.probabilities||{};return ['homeWin','draw','awayWin'].sort((a,b)=>Number(p[b]||0)-Number(p[a]||0))[0]};
  const marketKey=m=>{const p=oddsProb(O(m));return ['homeWin','draw','awayWin'][p.indexOf(Math.max(...p))]};
  const labelKey=(m,k)=>k==='homeWin'?H(m):k==='awayWin'?A(m):'Draw';
  const grade=c=>c>=85?'A+':c>=75?'A':c>=65?'B':c>=55?'C':'D';
  const q= m=>Number(O(m).homeWin)>0&&Number(O(m).draw)>0&&Number(O(m).awayWin)>0;
  function track(ev,extra={}){try{const sid=sessionStorage.getItem('kasiscore_sid')||(crypto.randomUUID?crypto.randomUUID():String(Date.now()));sessionStorage.setItem('kasiscore_sid',sid);fetch((typeof base==='function'?base():'')+'/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({event:ev,path:location.pathname,pageType:'growth',sessionId:sid,referrer:document.referrer},extra))}).catch(()=>{});}catch(_){} }
  function open(){if(typeof showTab==='function')showTab('intelligence_hub',document.querySelector('[data-primary="intelligence_hub"]'));}
  function renderSignals(preds){const list=document.getElementById('jgTodayList');const a=(preds||[]).filter(q).sort((x,y)=>C(y)-C(x)).slice(0,8);if(!a.length){list.innerHTML='<div class="jg-empty">No qualified predictions returned.</div>';return}document.getElementById('jgSignals').textContent=a.filter(x=>C(x)>=75).length;list.innerHTML=a.map(m=>`<div class="jg-item" onclick="kasiscoreOpenMatchByObject(${JSON.stringify(m).replace(/</g,'\u003c')})"><div><div class="title">${E(H(m))} vs ${E(A(m))}</div><div class="meta">${E(m.league||'Worldwide')} · ${E(String(KO(m)).slice(11,16)||'Today')} · ${q(m)?'Bookmaker 1X2 ':'Odds incomplete'}</div><div class="jg-chiprow"><span class="jg-chip">KasiScore: ${E(W(m))}</span><span class="jg-chip">${C(m).toFixed(0)}%</span><span class="jg-chip">Data quality: ${q(m)?'High':'Limited'}</span></div></div><div class="jg-signal"><span class="jg-grade ${C(m)>=75?'jg-good':C(m)>=60?'jg-warn':'jg-bad'}">${grade(C(m))}</span><div style="margin-top:4px">${C(m).toFixed(0)}%</div></div></div>`).join('');}
  function renderMarket(preds){const list=document.getElementById('jgMarketList');const a=(preds||[]).filter(q).map(m=>{const mk=marketKey(m),wk=winnerKey(m),pp=m?.prediction?.probabilities||{};const mp=oddsProb(O(m));const jp=P(pp[mk]||0);const market=mp[['homeWin','draw','awayWin'].indexOf(mk)]||0;return {...m,mk,wk,jp,market,diff:jp-market}}).filter(x=>x.wk!==x.mk||Math.abs(x.diff)>=6).sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,8);document.getElementById('jgMarketCount').textContent=a.length+' differences';list.innerHTML=a.length?a.map(m=>`<div class="jg-market"><div><b>${E(H(m))} vs ${E(A(m))}</b><div class="meta">KasiScore favours ${E(labelKey(m,m.wk))} · Market favours ${E(labelKey(m,m.mk))}</div></div><div><span class="jg-chip">KasiScore ${m.jp.toFixed(0)}%</span></div><div style="font-weight:900;color:${m.diff>=0?'var(--green)':'var(--red)'}">${m.diff>=0?'+':''}${m.diff.toFixed(0)}%</div></div>`).join(''):'<div class="jg-empty">No significant KasiScore/market differences right now.</div>';}
  function renderLive(live){const el=document.getElementById('jgLiveList');const a=(live||[]).filter(x=>!x.isFinished).slice(0,8);document.getElementById('jgLive').textContent=a.length;if(!a.length){el.innerHTML='<div class="jg-empty">No live matches currently returned.</div>';return}el.innerHTML=a.map(m=>`<div class="jg-item" onclick="kasiscoreOpenMatchByObject(${JSON.stringify(m).replace(/</g,'\u003c')})"><div><div class="title"> ${E(H(m))} vs ${E(A(m))}</div><div class="meta">${E(m.league||'Worldwide')} · ${M(m)?M(m)+"'":'LIVE'} · ${E(m.score||'')}</div></div><div class="jg-signal">${q(m)?C(m).toFixed(0)+'%':'Live'}<div class="meta">${E(W(m))}</div></div></div>`).join('');}
  function render75(arr){const el=document.getElementById('jg75List');const a=(arr||[]).filter(x=>M(x)>=75).sort((x,y)=>Number(y.live75Score||0)-Number(x.live75Score||0)).slice(0,8);el.innerHTML=a.length?a.map(m=>`<div class="jg-item" onclick="kasiscoreOpenMatchByObject(${JSON.stringify(m).replace(/</g,'\u003c')})"><div><div class="title">${E(H(m))} vs ${E(A(m))}</div><div class="meta">${M(m)}' · ${E(m.score||'')}</div></div><div class="jg-signal"> ${Number(m.live75Score||0).toFixed(0)}<div class="meta">Live 75</div></div></div>`).join(''):'<div class="jg-empty">No matches are currently at or beyond 75 minutes.</div>'; }
  async function loadRecord(){const el=document.getElementById('jgRecord');try{const d=await fetch((typeof base==='function'?base():'')+'/learning-stats').then(r=>r.json());const acc=d.accuracy??d.predictionAccuracy??d.overallAccuracy;const res=d.resolved??d.resolvedGames??d.gamesLearned;const correct=d.correct??d.correctPredictions??d.correctCalls;el.innerHTML=`<div class="jg-detail-grid"><div class="jg-detail-box"><b>${acc==null?'—':P(acc).toFixed(1)+'%'}</b><span>Overall accuracy</span></div><div class="jg-detail-box"><b>${res??'—'}</b><span>Resolved games</span></div><div class="jg-detail-box"><b>${correct??'—'}</b><span>Correct calls</span></div></div><div class="meta">KasiScore shows the record honestly; low sample sizes are not presented as certainty.</div>`; }catch(e){el.innerHTML='<div class="jg-empty">Learning record unavailable.</div>'}}
  function renderChanged(preds){const el=document.getElementById('jgChanged');const cur=(preds||[]).filter(q).slice(0,20).map(m=>({k:H(m)+'|'+A(m),c:C(m),w:W(m)}));let old=[];try{old=JSON.parse(localStorage.getItem('kasiscore_growth_snapshot')||'[]')}catch(_){}const changes=cur.map(x=>{const y=old.find(z=>z.k===x.k);return y?{...x,delta:x.c-y.c,old:y.c}:null}).filter(Boolean).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,8);localStorage.setItem('kasiscore_growth_snapshot',JSON.stringify(cur));el.innerHTML=changes.length?changes.map(x=>`<div class="jg-item"><div><div class="title">${E(x.k.replace('|',' vs '))}</div><div class="meta">${E(x.w)}</div></div><div class="jg-signal" style="color:${x.delta>=0?'var(--green)':'var(--red)'}">${x.delta>=0?'+':''}${x.delta.toFixed(0)} pts<div class="meta">${x.old.toFixed(0)}% → ${x.c.toFixed(0)}%</div></div></div>`).join(''):'<div class="jg-empty">No previous snapshot differences yet. Return after data refresh to see changes.</div>';}
  async function load(){try{const d=await fetch((typeof base==='function'?base():'')+'/dashboard-summary?pred_limit=50').then(r=>r.json());const preds=d.predictions||[];const fixtures=d.fixtures||[];renderSignals(preds);renderMarket(preds);renderLive(d.live||[]);document.getElementById('jgMatches').textContent=fixtures.filter(x=>!x.isFinished).length;render75(d.live||[]);renderChanged(preds);await loadRecord();}catch(e){const el=document.getElementById('jgTodayList');if(el)el.innerHTML='<div class="jg-empty">Dashboard intelligence unavailable. Check the Kasi Sports News server.</div>';}}
  window.kasiscoreOpenMatchByObject=async function(m){
    if(!m)return;
    window.__kasiscoreCurrentMatch=m;
    const id=m.id||m.fixtureId||m.fixture?.id;
    const sport=m.sport||m.fixture?.sport||'football';
    if(id && typeof openLiveMatchPage==='function'){try{await openLiveMatchPage(id,sport,m.league||m.league?.name||'');return;}catch(_){} }
    if(typeof showTab==='function')showTab('matchstats',document.querySelector('[data-primary="matchstats"]'));
  };
  window.kasiscoreShareMatch=async function(){const m=window.__kasiscoreCurrentMatch||{};const text=`KasiScore: ${H(m)} vs ${A(m)} — ${W(m)} (${C(m).toFixed(0)}% confidence)`;try{if(navigator.share)await navigator.share({title:'Kasi Sports News',text,url:location.href});else await navigator.clipboard.writeText(text+' '+location.href);track('share',{pageType:'match'});}catch(_){} };
  window.kasiscoreCopyMatch=async function(){const m=window.__kasiscoreCurrentMatch||{};try{await navigator.clipboard.writeText(`${H(m)} vs ${A(m)} · KasiScore: ${W(m)} · ${C(m).toFixed(0)}% confidence · ${location.origin}/match/${slug(H(m))}-vs-${slug(A(m))}`);track('share',{pageType:'match-copy'});}catch(_){} };
  window.kasiscoreFollowMatch=function(home,away){let a=[];try{a=JSON.parse(localStorage.getItem('kasiscore_followed_matches')||'[]')}catch(_){}const k=home+'|'+away;if(!a.includes(k))a.push(k);localStorage.setItem('kasiscore_followed_matches',JSON.stringify(a));track('follow',{entityId:k});alert(' Match added to Kasi Sports News follows.');};
  function slug(s){return String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
  window.kasiscoreOpenRouteMatch=function(home,away){history.pushState({},'',`/match/${slug(home)}-vs-${slug(away)}`);track('page_view',{pageType:'match-route'});};
  window.kasiscoreOpenEntityRoute=function(type){const v=document.getElementById('jgEntitySearch')?.value.trim();if(!v)return;history.pushState({},'',`/${type}/${slug(v)}`);kasiscoreEntitySearch();};
  window.kasiscoreEntitySearch=async function(){
    const v=document.getElementById('jgEntitySearch')?.value.trim();
    const type=document.getElementById('jgEntityType')?.value||'auto';
    const el=document.getElementById('jgEntityResult');
    if(!v){el.innerHTML='<div class="jg-empty">Enter a team or player name.</div>';return}
    track('search',{pageType:type,entityId:v});
    // Try the local server first (works when API key is configured); fall through to Google.
    try{
      if(type!=='player'){
        const d=await get('/team/history',{team:v,last:10});
        if(d&&d.matches&&d.matches.length){
          const ms=d.matches;const wins=ms.filter(x=>x.isHome?x.hg>x.ag:x.ag>x.hg).length;
          el.innerHTML=`<div class="jg-item" style="cursor:default"><div><div class="title"> ${E(v)}</div><div class="meta">${ms.length} recent matches · ${wins} wins · ${d.source||'KasiScore'}</div><div class="jg-chiprow"><span class="jg-chip">Results</span><span class="jg-chip">Form</span><span class="jg-chip">H2H</span></div></div><button onclick="kasiscoreOpenTeamDetail(${JSON.stringify(v)})">Open Team</button></div>`;
          return;
        }
      }
    }catch(_){}
    // Google search fallback — always works, no API key required
    const site='site:kasilivescore.com';
    const scope=type==='player'?'player stats':type==='team'?'team stats fixtures':'stats fixtures';
    const q=encodeURIComponent(`${v} ${scope} ${site}`);
    el.innerHTML=`<div class="jg-item" style="cursor:default;flex-direction:column;align-items:flex-start;gap:10px">
      <div><div class="title"> ${E(v)}</div><div class="meta">No local data is available — open a Google search for this entity instead.</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener" class="primary" style="font-size:12px;padding:7px 13px;border-radius:8px;background:var(--accent);color:#000;font-weight:800;text-decoration:none"> Google: ${E(v)}</a>
        
        
      </div>
      <div class="meta" style="font-size:10px">Live data will appear here when the data service is available.</div>
    </div>`;
  };
  window.kasiscoreOpenTeamDetail=async function(name){
    const el=document.getElementById('jgEntityResult'); if(!el)return; el.innerHTML='<div class="empty">Loading team…</div>';
    try{
      let internalTeam=name;
      if(String(name).includes('--')){const rr=await get('/public-resolve/team/'+encodeURIComponent(String(name)));internalTeam=rr.id;}
      const d=await get('/team/profile',{team:internalTeam});
      const t=d.team||{}, players=d.players||[], fixtures=d.past10||[], future=d.future||[], table=d.standings||[];
      const currentId=t.id, form=d.form||[], next=future[0], odds=d.nextOdds||{};
      const teamName=t.name||name, venue=d.venue||{};
      const row=table.find(r=>String(r.team?.name||'').toLowerCase()===String(teamName).toLowerCase())||{};
      const position=row.rank??'—', points=row.points??'—', played=row.all?.played??'—', gd=row.goalsDiff??'—';
      const formHtml=form.length?form.map(x=>`<span class="${escv(x)}">${escv(x)}</span>`).join(''):'<span>—</span>';
      const oddsHtml=(Number(odds.homeWin)>1||Number(odds.draw)>1||Number(odds.awayWin)>1)?`<div class="odds-values"><span>1 ${Number(odds.homeWin)>1?Number(odds.homeWin).toFixed(2):'—'}</span><span>X ${Number(odds.draw)>1?Number(odds.draw).toFixed(2):'—'}</span><span>2 ${Number(odds.awayWin)>1?Number(odds.awayWin).toFixed(2):'—'}</span></div>`:'<div class="jg-empty">No current 1X2 odds supplied.</div>';
      const tableHtml=table.length?`<div class="tablewrap" style="margin-top:10px"><table class="table-mini" style="min-width:760px"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>F</th><th>A</th><th>GD</th><th>Pts</th><th>Form</th></tr></thead><tbody>${table.map(r=>{const n=r.team?.name||'';const is=n.toLowerCase()===String(teamName).toLowerCase();return `<tr class="${is?'team-table-highlight':''}"><td>${escv(r.rank??'—')}</td><td>${teamCell(r.team?.logo,n,'xs')}</td><td>${escv(r.all?.played??'—')}</td><td>${escv(r.all?.win??'—')}</td><td>${escv(r.all?.draw??'—')}</td><td>${escv(r.all?.lose??'—')}</td><td>${escv(r.all?.goals?.for??'—')}</td><td>${escv(r.all?.goals?.against??'—')}</td><td>${escv(r.goalsDiff??'—')}</td><td><b>${escv(r.points??'—')}</b></td><td><div class="last5">${(r.form||'').slice(-5).split('').map(x=>`<span class="${escv(x)}">${escv(x)}</span>`).join('')}</div></td></tr>`}).join('')}</tbody></table></div>`:'<div class="jg-empty">League table not returned for this team yet.</div>';
      const squad=players.map(p=>`<div class="player-card-v178" onclick="openKasiPlayerPage(${Number(p.id||0)},${JSON.stringify(p.name||'Player')})"><img src="${escv(playerImg(p.photo))}" alt="${escv(p.name||'Player')}" loading="lazy" decoding="async" fetchpriority="low"><div><b>${escv(p.name||'Player')}</b><div class="nat">${escv(p.position||'—')} · ${escv(p.nationality||'Country not supplied')}</div></div><div class="num">#${escv(p.number??'—')}</div></div>`).join('');
      const recent=fixtures.slice(0,10).map(x=>`<div class="jg-item"><div><div class="title">${teamCell(x.homeLogo||'',x.home||'Home','xs',x.homeId||0)} <span style="color:var(--muted)">vs</span> ${teamCell(x.awayLogo||'',x.away||'Away','xs',x.awayId||0)}</div><div class="meta">${escv(x.league||'')} · ${escv(x.statusLong||x.status||'')}</div></div><div class="jg-signal">${escv(x.homeScore??'—')} - ${escv(x.awayScore??'—')}</div></div>`).join('');
      const upcoming=future.slice(0,8).map(x=>`<div class="jg-item"><div><div class="title">${teamCell(x.homeLogo||'',x.home||'Home','xs',x.homeId||0)} <span style="color:var(--muted)">vs</span> ${teamCell(x.awayLogo||'',x.away||'Away','xs',x.awayId||0)}</div><div class="meta">${escv(x.date?new Date(x.date).toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short'}):'Date TBC')} · ${escv(x.league||'')}</div></div><div class="jg-signal">${x.id===next?.id?'NEXT':'UPCOMING'}</div></div>`).join('');
      const stat=d.teamStats||{}, goalsFor=stat.goals?.for?.total?.total??d.goalsFor??'—', goalsAgainst=stat.goals?.against?.total?.total??d.goalsAgainst??'—', clean=stat.clean_sheet?.total??'—', failed=stat.failed_to_score?.total??'—';
      el.innerHTML=`<div class="jg-card" style="padding:16px">
        <div class="jg-modal-head"><div style="display:flex;align-items:center;gap:12px"><img class="team-badge" src="${escv(t.logo||teamLogoFromId(currentId))}" alt="${escv(teamName)}" loading="lazy" decoding="async" fetchpriority="low"><div><h2 style="margin:0">${escv(teamName)}</h2><div class="sub">${escv(t.country||'')}</div></div></div><button onclick="document.getElementById('jgEntityResult').innerHTML='<div class=\"jg-empty\">Search for a team or player.</div>'">Close</button></div>
        <div class="jg-detail-grid" style="margin-top:14px"><div class="jg-detail-box"><b>${escv(position)}</b><span>League position</span></div><div class="jg-detail-box"><b>${escv(points)}</b><span>Points</span></div><div class="jg-detail-box"><b>${escv(played)}</b><span>Played</span></div><div class="jg-detail-box"><b>${escv(gd)}</b><span>Goal difference</span></div><div class="jg-detail-box"><b>${escv(goalsFor)}</b><span>Goals scored</span></div><div class="jg-detail-box"><b>${escv(goalsAgainst)}</b><span>Goals conceded</span></div></div>
        <div class="jg-card" style="margin-top:10px"><h3 style="margin:0 0 8px">Form</h3><div class="sub" style="margin-bottom:8px">Last five completed matches</div><div class="last5">${formHtml}</div><div class="jg-chiprow"><span class="jg-chip">Clean sheets: ${escv(clean)}</span><span class="jg-chip">Failed to score: ${escv(failed)}</span><span class="jg-chip">Recent matches: ${fixtures.length}</span></div></div>
        ${next?`<div class="jg-card" style="margin-top:10px"><h3 style="margin:0 0 8px">Next match</h3><div class="jg-item" style="cursor:default"><div><div class="title">${teamCell(next.homeLogo||'',next.home||'Home','sm')} <span style="color:var(--muted)">vs</span> ${teamCell(next.awayLogo||'',next.away||'Away','sm')}</div><div class="meta">${escv(next.date?new Date(next.date).toLocaleString('en-ZA',{dateStyle:'full',timeStyle:'short'}):'Date TBC')} · ${escv(next.league||'')} · ${escv(venue.name||'')}</div></div><div>${oddsHtml}</div></div><div class="sub" style="margin-top:8px">Odds are real bookmaker 1X2 prices when returned by Kasi Sports News, with Kasi Sports News used as the configured fallback.</div></div>`:''}
        <div class="jg-card" style="margin-top:10px"><h3 style="margin:0 0 8px">League table</h3><div class="sub">The selected team is highlighted.</div>${tableHtml}</div>
        <div class="jg-grid" style="margin-top:10px"><div class="jg-card"><h3 style="margin:0 0 8px">Recent results</h3><div class="jg-list">${recent||'<div class="jg-empty">No recent results returned.</div>'}</div></div><div class="jg-card"><h3 style="margin:0 0 8px">Upcoming fixtures</h3><div class="jg-list">${upcoming||'<div class="jg-empty">No upcoming fixtures available.</div>'}</div></div></div>
        <div class="jg-card" style="margin-top:10px"><h3 style="margin:0 0 8px">Squad</h3><div class="grid" style="margin-top:8px">${squad||'<div class="jg-empty">No squad data available.</div>'}</div></div>
        <div class="jg-chiprow" style="margin-top:12px"><button onclick="track('follow',{entityId:'team:'+${JSON.stringify(teamName)}})">⭐ Follow ${escv(teamName)}</button><button onclick="history.pushState({},'', '/team/${escv(String(teamName).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))}');window.dispatchEvent(new PopStateEvent('popstate'))">Permalink</button></div>
      </div>`;
    }catch(e){el.innerHTML=`<div class="jg-empty">Team data is temporarily unavailable.<br><small style="color:var(--red)">${escv(e.message||e)}</small></div>`;}
  };

  // Make player page globally reachable from the primary navigation.
  const oldPrimary=window.kasiscorePrimaryNav;
  if(oldPrimary){
    window.kasiscorePrimaryNav=function(id,btn){if(id==='playerstats'){showTab('playerstats',btn);psLoad?.();return;}return oldPrimary(id,btn);};
  }

  // Stub for moveTopConfidence — moves highest-confidence prediction to top of list.
  function moveTopConfidence(){
    try{
      const list=document.querySelector('.predictions-list,.confidence-list,[data-predictions]');
      if(!list)return;
      const items=[...list.children];
      if(items.length<2)return;
      let best=0;
      items.forEach((el,i)=>{
        const v=parseFloat(el.dataset.confidence||el.querySelector('[data-confidence]')?.dataset.confidence||0);
        if(v>parseFloat(items[best].dataset.confidence||items[best].querySelector('[data-confidence]')?.dataset.confidence||0))best=i;
      });
      if(best>0)list.prepend(items[best]);
    }catch(e){}
  }

  // Move the live sports block off Home permanently and ensure News stays off Home.
  function finalArrange(){
    document.getElementById('homeMultiSport')?.remove();
    document.getElementById('homeNewsSection')?.remove();
    moveTopConfidence();
    // Replace orange/yellow/grey stat presentation with green/red dominance.
    document.querySelectorAll('.stat-val-home,.stat-val-away').forEach(x=>{if(x.textContent.trim()==='—')return;});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(finalArrange,80)},{once:true});else setTimeout(finalArrange,80);
})();


(function(){
  function backToLive(){
    try{history.pushState({},'',location.pathname+location.search);}catch(e){}
    window.MATCH_STATS_FIXTURE_ID=null;
    window.MATCH_STATS_SPORT=null;
    window.MATCH_STATS_LEAGUE='';
    if(typeof showTab==='function') showTab('live',document.querySelector('[data-primary="live"]'));
  }
  window.kasiscoreBackToLive=backToLive;
  function openHash(){
    const hash=location.hash||'';
    const m=hash.match(/^#match-stats\/([^/]+)\/([^/]+)$/);
    if(!m || typeof window.openLiveMatchPage!=='function') return;
    const sport=decodeURIComponent(m[1]);
    const id=decodeURIComponent(m[2]);
    window.openLiveMatchPage(id,sport,'');
  }
  window.addEventListener('hashchange',openHash);
  window.addEventListener('popstate',function(){if(location.hash)openHash();});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(openHash,0),{once:true});
  else setTimeout(openHash,0);
})();


(function(){
  const escX=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const slugX=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const root=()=>{let x=document.getElementById('kasiscoreEntityPageRoot');if(!x){x=document.createElement('div');x.id='kasiscoreEntityPageRoot';document.body.insertBefore(x,document.body.firstChild)}return x};
  const hideApp=()=>{document.body.classList.add('kc-entity-mode');document.querySelector('.app')?.style.setProperty('display','none','important');};
  const showApp=()=>{document.body.classList.remove('kc-entity-mode');document.querySelector('.app')?.style.removeProperty('display');};
  const img=(src,cls='kc-entity-logo')=>src?`<img class="${cls}" src="${escX(src)}" loading="lazy" onerror="this.style.visibility='hidden'" decoding="async" fetchpriority="low">`:'<div class="kc-entity-logo"></div>';
  const fmtDate=v=>{if(!v)return 'Date TBC';try{return new Date(v).toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short'})}catch(_){return String(v)}};
  const goPublic=async(kind,id,name)=>{if(Number(id)>0){try{const d=await get('/public-route/'+kind+'/'+Number(id),{name:String(name||'')});if(d?.url){location.assign(d.url);return}}catch(_){}}location.assign('/'+(kind==='team'?'teams':'players')+'/'+slugX(String(name||kind)));};
  const goTeam=(id,name)=>goPublic('team',id,name||'Team');
  const goPlayer=(id,name)=>goPublic('player',id,name||'Player');
  window.openKasiTeamPage=(id,name)=>goTeam(id,name||'Team');
  window.openKasiPlayerPage=(id,name)=>goPlayer(id,name||'Player');
  window.openKasiMatchPlayerPage=function(fixtureId,id,name){try{sessionStorage.setItem('kcPlayerMatchContext',JSON.stringify({fixtureId:Number(fixtureId)||0,playerId:Number(id)||0,name:name||'Player',at:Date.now()}));}catch(_){} goPlayer(id,name||'Player');};
  window.kasiscoreOpenTeamRoute=function(name){goTeam('',name);};
  window.kasiscoreOpenPlayerRoute=goPlayer;
  // Reusable team cell. All team names produced by newer widgets become real team links.
  window.teamCell=function(logo,name,size,teamId){const n=String(name||'Team');const wh=size==='sm'?28:size==='xs'?22:32;return `<span class="kc-link" data-kc-team-id="${Number(teamId||0)}" data-kc-team-name="${escX(n)}" onclick="event.stopPropagation();openKasiTeamPage(${Number(teamId||0)},${JSON.stringify(n)})" style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle"><img src="${escX(logo||'')}" style="width:${wh}px;height:${wh}px;border-radius:50%;object-fit:contain;background:#111;border:1px solid var(--line)" onerror="this.style.visibility='hidden'" loading="lazy" decoding="async" fetchpriority="low"><span>${escX(n)}</span></span>`};
  window.openKasiSportTeamPage=function(sport,id,name,league){
    sport=String(sport||'football').toLowerCase();
    if(sport==='football') return goTeam(id,name||String(id||''));
    location.href='/'+encodeURIComponent(sport)+'/team/'+encodeURIComponent(String(id||name||''))+'?name='+encodeURIComponent(name||'')+'&league='+encodeURIComponent(league||'');
  };
  window.openKasiSportPlayerPage=function(sport,id,name,league){
    sport=String(sport||'football').toLowerCase();
    if(sport==='football') return goPlayer(id,name||'Player');
    location.href='/'+encodeURIComponent(sport)+'/player/'+encodeURIComponent(String(id||''))+'?name='+encodeURIComponent(name||'')+'&league='+encodeURIComponent(league||'');
  };
  async function sportEntityPage(kind,sport,id){
    hideApp(); const r=root(), q=new URLSearchParams(location.search), name=q.get('name')||'', league=q.get('league')||'';
    r.innerHTML='<div class="kc-entity-page"><div class="kc-empty">Loading '+escX(sport)+' '+escX(kind)+' data…</div></div>';
    try{
      const d=await get('/sports/'+encodeURIComponent(sport)+'/'+kind+'/'+encodeURIComponent(id),{league,name});
      const e=d[kind]||d.team||d.player||{}, logo=e.logo||e.photo||e.flag||'', title=e.name||e.displayName||name||(kind==='team'?'Team':'Player');
      const country=e.country?.name||e.country||e.nationality||d.country||''; const flag=e.country?.flag||d.flag||'';
      const players=d.players||d.squad||[];
      const playerCards=players.map(x=>{const pl=x.player||x.athlete||x;return `<div class="kc-player" onclick="openKasiSportPlayerPage('${escX(sport)}','${escX(pl.id||'')}','${escX(pl.name||pl.displayName||'Player')}','${escX(league)}')">${img(pl.photo||pl.headshot?.href,'kc-player img')}<div><b>${escX(pl.name||pl.displayName||'Player')}</b><small>${escX(pl.position?.name||pl.position||pl.nationality||'')}</small></div></div>`}).join('');
      r.innerHTML=`<main class="kc-entity-page"><div class="kc-back"><button onclick="return window.kasiDashboardBack()">← Back</button></div><section class="kc-entity-hero"><div class="kc-entity-head">${img(logo)}<div class="kc-entity-title"><h1>${escX(title)}</h1><p>${flag?`<img src="${escX(flag)}" style="width:22px;height:15px;object-fit:cover;vertical-align:middle;margin-right:6px" loading="lazy" decoding="async" fetchpriority="low">`:''}${escX(country)} · ${escX(sport.toUpperCase())} · ${escX('Verified data')}</p></div></div></section>${playerCards?`<section class="kc-card"><h2>Squad / Players</h2><div class="kc-squad">${playerCards}</div></section>`:''}<section class="kc-card"><h2>All available statistics & details</h2><pre style="white-space:pre-wrap;overflow:auto;font-size:11px;line-height:1.55">${escX(JSON.stringify(d,null,2))}</pre></section></main>`;
    }catch(e){r.innerHTML=`<main class="kc-entity-page"><div class="kc-empty">${escX(kind)} data could not be loaded.<br><small>${escX(e.message||e)}</small><br><button onclick="return window.kasiDashboardBack()">Return to dashboard</button></div></main>`}
  }
  async function teamPage(name){
    hideApp(); document.body.classList.add('kc-team-route'); document.body.classList.remove('kc-player-route');
    const r=root(); r.innerHTML='<div class="kc-entity-page"><div class="kc-empty">Loading team…</div></div>';
    try{
      let internalTeam=String(name||'').trim();
      if(internalTeam.includes('--')){
        const rr=await get('/public-resolve/team/'+encodeURIComponent(internalTeam));
        internalTeam=Number(rr.id||0);
      }
      if(!internalTeam) throw new Error('Team profile not found.');
      const d=await get('/team/profile',{team:internalTeam}); const t=d.team||{}, players=d.players||[], past=d.past10||[], future=d.future||[], table=d.standings||[], injuries=d.injuries||[], stats=d.teamStats||{};
      const teamName=t.name||name, venue=d.venue||{}, row=table.find(x=>String(x.team?.name||'').toLowerCase()===teamName.toLowerCase())||{};
      const form=d.form||[], next=future[0], gf=stats.goals?.for?.total?.total??d.goalsFor??'—',ga=stats.goals?.against?.total?.total??d.goalsAgainst??'—';
      const formHtml=form.length?form.map(x=>`<span class="${escX(x)}">${escX(x)}</span>`).join(''):'<span>—</span>';
      const squad=players.map(p=>`<div class="kc-player" onclick="openKasiPlayerPage(${Number(p.id||0)},${JSON.stringify(p.name||'Player')})">${img(p.photo,'kc-player img')}<div><b>${escX(p.name||'Unknown')}</b><small>${escX(p.position||'—')} · ${escX(p.nationality||'Nationality unavailable')}</small></div><span style="margin-left:auto;font-size:10px">#${escX(p.number??'—')}</span></div>`).join('')||'<div class="kc-empty">No squad data available.</div>';
      const matchRow=x=>`<div class="kc-row" onclick="location.href='/match/${slugX(x.home||'home')}-vs-${slugX(x.away||'away')}'"><div class="kc-row-main"><div class="kc-row-title">${teamCell(x.homeLogo||'',x.home||'Home','xs',x.homeId||0)} <span style="color:var(--muted)">vs</span> ${teamCell(x.awayLogo||'',x.away||'Away','xs',x.awayId||0)}</div><div class="kc-row-meta">${escX(x.league||'')} · ${escX(x.statusLong||x.status||'')} · ${fmtDate(x.date)}</div></div><b>${escX(x.homeScore??'—')} - ${escX(x.awayScore??'—')}</b></div>`;
      const tableHtml=table.length?`<div class="tablewrap"><table class="kc-table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${table.map(x=>{const n=x.team?.name||'';return `<tr class="${n.toLowerCase()===teamName.toLowerCase()?'kc-highlight':''}"><td>${escX(x.rank??'—')}</td><td><span class="kc-link" onclick="event.stopPropagation();openKasiTeamPage(${Number(x.team?.id||0)},${JSON.stringify(n)})">${escX(n)}</span></td><td>${escX(x.all?.played??'—')}</td><td>${escX(x.all?.win??'—')}</td><td>${escX(x.all?.draw??'—')}</td><td>${escX(x.all?.lose??'—')}</td><td>${escX(x.goalsDiff??'—')}</td><td><b>${escX(x.points??'—')}</b></td></tr>`}).join('')}</tbody></table></div>`:'<div class="kc-empty">League table unavailable.</div>';
      const odds=d.nextOdds||{}; const oddsHtml=(Number(odds.homeWin)>1||Number(odds.draw)>1||Number(odds.awayWin)>1)?`<div class="kc-badges"><span class="kc-badge">1 ${Number(odds.homeWin)>1?Number(odds.homeWin).toFixed(2):'—'}</span><span class="kc-badge">X ${Number(odds.draw)>1?Number(odds.draw).toFixed(2):'—'}</span><span class="kc-badge">2 ${Number(odds.awayWin)>1?Number(odds.awayWin).toFixed(2):'—'}</span></div>`:'<div class="kc-row-meta">No current 1X2 odds supplied.</div>';
      r.innerHTML=`<main class="kc-entity-page"><div class="kc-back"></div><section class="kc-entity-hero"><div class="kc-entity-head">${img(t.logo)}<div class="kc-entity-title"><h1>${escX(teamName)}</h1><p>${escX(t.country||'')}</p><div class="kc-actions"><button onclick="track&&track('follow',{entityId:'team:'+${JSON.stringify(teamName)}})">⭐ Follow team</button><button onclick="navigator.clipboard?.writeText(location.href)">Copy team link</button></div></div></div></section><div class="kc-grid"><div class="kc-stat"><b>${escX(row.rank??'—')}</b><span>League position</span></div><div class="kc-stat"><b>${escX(row.points??'—')}</b><span>Points</span></div><div class="kc-stat"><b>${escX(row.all?.played??'—')}</b><span>Played</span></div><div class="kc-stat"><b>${escX(row.goalsDiff??'—')}</b><span>Goal difference</span></div><div class="kc-stat"><b>${escX(gf)}</b><span>Goals scored</span></div><div class="kc-stat"><b>${escX(ga)}</b><span>Goals conceded</span></div><div class="kc-stat"><b>${escX(stats.clean_sheet?.total??'—')}</b><span>Clean sheets</span></div><div class="kc-stat"><b>${escX(stats.failed_to_score?.total??'—')}</b><span>Failed to score</span></div></div><section class="kc-card"><h2>Team form</h2><div class="kc-form">${formHtml}</div></section>${next?`<section class="kc-card"><h2>Next match</h2><div class="kc-row"><div><div class="kc-row-title">${teamCell(next.homeLogo||'',next.home||'Home','sm',next.homeId||0)} <span class="sub">vs</span> ${teamCell(next.awayLogo||'',next.away||'Away','sm',next.awayId||0)}</div><div class="kc-row-meta">${fmtDate(next.date)} · ${escX(next.league||'')}</div>${oddsHtml}</div><div><b>NEXT</b></div></div></section>`:''}<div class="kc-grid2"><section class="kc-card"><h2>Recent results</h2><div class="kc-list">${past.slice(0,10).map(matchRow).join('')||'<div class="kc-empty">No recent results.</div>'}</div></section><section class="kc-card"><h2>Upcoming fixtures</h2><div class="kc-list">${future.slice(0,10).map(matchRow).join('')||'<div class="kc-empty">No upcoming fixtures.</div>'}</div></section></div><section class="kc-card"><h2>Squad · Players</h2><p class="sub">Click any player to open their full player page.</p><div class="kc-squad">${squad}</div></section><section class="kc-card"><h2>League table</h2>${tableHtml}</section></main>`;
    }catch(e){r.innerHTML=`<main class="kc-entity-page"><div class="kc-empty">Team data could not be loaded.<br><small>${escX(e.message||e)}</small><br><button onclick="return window.kasiDashboardBack()">Return to dashboard</button></div></main>`}
  }
  async function playerPage(slug){
    hideApp(); document.body.classList.add('kc-player-route'); document.body.classList.remove('kc-team-route');
    const r=root(); r.innerHTML='<div class="kc-entity-page"><div class="kc-empty">Loading player…</div></div>';
    try{
      const raw=String(slug||'').trim();
      let id=0;
      if(raw.includes('--')){const rr=await get('/public-resolve/player/'+encodeURIComponent(raw));id=Number(rr.id||0);}
      else if(/^\d+$/.test(raw)) id=Number(raw);
      else {const match=raw.match(/^(.*?)-([0-9]+)$/);id=match?Number(match[2]):0;}
      if(!id) throw new Error('Player profile not found.');
      let d={}; let ctx=null; try{ctx=JSON.parse(sessionStorage.getItem('kcPlayerMatchContext')||'null')}catch(_){}
      const matchReq=(ctx && Number(ctx.playerId)===id && Number(ctx.fixtureId)>0)?get('/fixtures/'+Number(ctx.fixtureId)+'/players/'+id):Promise.resolve(null);
      const richReq=get('/player/profile',{player:id});
      const [mr,rr]=await Promise.allSettled([matchReq,richReq]);
      if(mr.status==='fulfilled' && mr.value){const md=mr.value;d={player:md.player||md.currentGame?.player||{},statistics:md.seasonStatistics||[],teams:md.seasonStatistics||[],recentMatches:md.recentMatches||[],matchContext:md.currentGame||{}};}
      if(rr.status==='fulfilled' && rr.value){const rich=rr.value;d=Object.assign({},d,rich,{player:Object.assign({},d.player||{},rich.player||{})});}
      if(!d.player?.id && !d.player?.name) throw new Error((rr.reason&&rr.reason.message)||(mr.reason&&mr.reason.message)||'Player data is temporarily unavailable.');
      const p=d.player||{}, stats=d.statistics||[], teams=d.teams||[], career=d.career||[], form=d.form||[], ratings=d.matchRatings||[], transfers=d.transfers||[], trophies=d.trophies||[];
      const st=stats[0]||{}, team=st.team||p.team||{}, games=st.games||{}, goals=st.goals||{}, passes=st.passes||{}, shots=st.shots||{}, tackles=st.tackles||{}, duels=st.duels||{}, dribbles=st.dribbles||{}, cards=st.cards||{};
      const escTeam=(tm)=>teamCell(tm.logo||'',tm.name||'Team','xs',tm.id||0);
      const statVal=(v)=>v===null||v===undefined||v===''?'—':escX(v);
      const splitRows=teams.map(x=>{const tm=x.team||{},lg=x.league||{},g=x.games||{},go=x.goals||{},pa=x.passes||{},ta=x.tackles||{},du=x.duels||{},dr=x.dribbles||{},ca=x.cards||{};return `<div class="kc-row"><div><div class="kc-row-title">${escTeam(tm)}</div><div class="kc-row-meta">${escX(lg.name||'Competition unavailable')} · ${escX(lg.season||d.season||'')}</div></div><div style="text-align:right;font-size:10px">${statVal(g.appearences??g.appearances)} apps · ${statVal(g.minutes)} min · ${statVal(go.total)} goals · ${statVal(go.assists)} assists<br>${statVal(pa.key)} key passes · ${statVal(ta.total)} tackles · ${statVal(du.won)} duels won · ${statVal(dr.success)} dribbles · ${statVal(ca.yellow)} YC</div></div>`}).join('')||'<div class="kc-empty">No competition-by-competition statistics returned.</div>';
      const careerRows=career.map(x=>{const totals=(x.statistics||[]).reduce((a,z)=>{const g=z.games||{},go=z.goals||{},ca=z.cards||{};a.apps+=Number(g.appearences??g.appearances)||0;a.min+=Number(g.minutes||0)||0;a.goals+=Number(go.total||0)||0;a.assists+=Number(go.assists||0)||0;a.yellow+=Number(ca.yellow||0)||0;return a},{apps:0,min:0,goals:0,assists:0,yellow:0});return `<div class="kc-row"><div><b>${escX(x.season)}</b><div class="kc-row-meta">${(x.statistics||[]).map(z=>escX(z.league?.name||'Competition')).join(' · ')}</div></div><div style="text-align:right;font-size:10px">${totals.apps} apps · ${totals.min} min · ${totals.goals} goals · ${totals.assists} assists · ${totals.yellow} YC</div></div>`}).join('')||'<div class="kc-empty">No historical season data available.</div>';
      const formRows=form.map(x=>`<div class="kc-row"><div><div class="kc-row-title">${teamCell(x.home?.logo||'',x.home?.name||'Home','xs')} <span class="sub">vs</span> ${teamCell(x.away?.logo||'',x.away?.name||'Away','xs')}</div><div class="kc-row-meta">${escX(x.league?.name||'')} · ${fmtDate(x.date)} · ${escX(x.status?.short||'')}</div></div><div style="text-align:right"><b>${statVal(x.rating)}</b><div class="kc-row-meta">${statVal(x.minutes)} min</div></div></div>`).join('')||'<div class="kc-empty">No data available.</div>';
      const transferRows=transfers.map(x=>`<div class="kc-row"><div><b>${escX(x.date||'Date unavailable')}</b><div class="kc-row-meta">${escX(x.type||'Transfer')} · ${escX(x.reason||'')}</div></div><div>${escTeam(x.team?.in||x.team?.out||x.team||{})}</div></div>`).join('')||'<div class="kc-empty">No transfer history returned.</div>';
      const trophyRows=trophies.map(x=>`<div class="kc-row"><div><b>${escX(x.league||'Competition unavailable')}</b><div class="kc-row-meta">${escX(x.country||'')} · ${escX(x.season||'')}</div></div><b>${escX(x.place||x.status||'—')}</b></div>`).join('')||'<div class="kc-empty">No trophy data available.</div>';
      const recentRows=(d.recentMatches||[]).slice(0,15).map(x=>{const ts=x.teams||{},g=x.goals||{},lg=x.league||{};return `<div class="kc-row"><div><div class="kc-row-title">${teamCell(ts.home?.logo||'',ts.home?.name||'Home','xs',ts.home?.id||0)} <span class="sub">vs</span> ${teamCell(ts.away?.logo||'',ts.away?.name||'Away','xs',ts.away?.id||0)}</div><div class="kc-row-meta">${escX(lg.name||'')} · ${fmtDate(x.fixture?.date)} · ${escX(x.fixture?.status?.short||'')}</div></div><b>${statVal(g.home)} - ${statVal(g.away)}</b></div>`}).join('')||'<div class="kc-empty">No recent matches returned.</div>';
      const avg=d.ratingSummary?.average;
      r.innerHTML=`<main class="kc-entity-page"><div class="kc-back"><button onclick="return window.kasiDashboardBack()">← Back</button></div>
      <section class="kc-card"><div class="kc-player-hero">${img(p.photo,'kc-player-photo')}<div><h1 class="kc-player-name">${escX(p.name||'Player')}</h1><div class="kc-badges"><span class="kc-badge">${escX(p.position||games.position||'Position unavailable')}</span><span class="kc-badge">${escX(p.nationality||'Nationality unavailable')}</span><span class="kc-badge">${teamCell(team.logo||'',team.name||'Team unavailable','sm',team.id||0)}</span><span class="kc-badge">#${escX(games.number??'—')}</span></div><p class="sub">${escX(p.birth?.date||'Date of birth unavailable')} · ${escX(p.birth?.place||'Birth place unavailable')} · ${escX(p.height||'Height unavailable')} · ${escX(p.weight||'Weight unavailable')}</p></div></div></section>
      <div class="kc-grid"><div class="kc-stat"><b>${statVal(games.appearences??games.appearances)}</b><span>Appearances</span></div><div class="kc-stat"><b>${statVal(games.lineups)}</b><span>Starts</span></div><div class="kc-stat"><b>${statVal(games.minutes)}</b><span>Minutes</span></div><div class="kc-stat"><b>${statVal(goals.total)}</b><span>Goals</span></div><div class="kc-stat"><b>${statVal(goals.assists)}</b><span>Assists</span></div><div class="kc-stat"><b>${statVal(passes.key)}</b><span>Key passes</span></div><div class="kc-stat"><b>${statVal(tackles.total)}</b><span>Tackles</span></div><div class="kc-stat"><b>${statVal(duels.won)}</b><span>Duels won</span></div><div class="kc-stat"><b>${statVal(dribbles.success)}</b><span>Successful dribbles</span></div><div class="kc-stat"><b>${statVal(cards.yellow)}</b><span>Yellow cards</span></div><div class="kc-stat"><b>${statVal(avg)}</b><span>Recent rating avg</span></div><div class="kc-stat"><b>${statVal(d.ratingSummary?.best)}</b><span>Best recent rating</span></div></div>
      <div class="kc-grid2"><section class="kc-card"><h2>Competition-by-competition</h2><div class="kc-list">${splitRows}</div></section><section class="kc-card"><h2>Player profile</h2><div class="kc-list"><div class="kc-row"><span>Age</span><b>${statVal(p.age)}</b></div><div class="kc-row"><span>Date of birth</span><b>${statVal(p.birth?.date)}</b></div><div class="kc-row"><span>Nationality</span><b>${statVal(p.nationality)}</b></div><div class="kc-row"><span>Birth place</span><b>${statVal(p.birth?.place)}</b></div><div class="kc-row"><span>Height</span><b>${statVal(p.height)}</b></div><div class="kc-row"><span>Weight</span><b>${statVal(p.weight)}</b></div><div class="kc-row"><span>Current team</span><b>${teamCell(team.logo||'',team.name||'—','xs',team.id||0)}</b></div></div></section></div>
      <section class="kc-card"><h2>Current form & match ratings</h2><p class="sub">Fixture-level ratings are shown only when a verified rating is available for this player.</p><div class="kc-list">${formRows}</div></section>
      <div class="kc-grid2"><section class="kc-card"><h2>Career history</h2><div class="kc-list">${careerRows}</div></section><section class="kc-card"><h2>Trophies</h2><div class="kc-list">${trophyRows}</div></section></div>
      <section class="kc-card"><h2>Transfers</h2><div class="kc-list">${transferRows}</div></section>
      <section class="kc-card"><h2>Recent matches</h2><div class="kc-list">${recentRows}</div></section></main>`;
    }catch(e){r.innerHTML=`<main class="kc-entity-page"><div class="kc-empty">Player data could not be loaded.<br><small>${escX(e.message||e)}</small><br><button onclick="return window.kasiDashboardBack()">Return to dashboard</button></div></main>`}
  }

  // Entity registry: every API response is scanned for provider team/player objects.
  // A MutationObserver then turns any matching rendered name into a real team/player link,
  // including legacy dashboard widgets that were written before the entity pages existed.
  const KC_TEAMS=new Map(), KC_PLAYERS=new Map();
  function registerEntities(v){
    if(!v || typeof v!=='object') return;
    if(Array.isArray(v)){v.forEach(registerEntities);return;}
    const teamKeys=['team','home','away','in','out'];
    for(const k of teamKeys){const x=v[k]; if(x&&typeof x==='object'&&x.id&&x.name){KC_TEAMS.set(String(x.name).toLowerCase(),{id:x.id,name:x.name,logo:x.logo||''});}}
    if(v.player&&typeof v.player==='object'&&v.player.id&&v.player.name) KC_PLAYERS.set(String(v.player.name).toLowerCase(),{id:v.player.id,name:v.player.name,photo:v.player.photo||''});
    if(v.id&&v.name && (v.photo || v.position || v.nationality || v.age || v.birth)) KC_PLAYERS.set(String(v.name).toLowerCase(),{id:v.id,name:v.name,photo:v.photo||''});
    Object.values(v).forEach(registerEntities);
  }
  const _kcOriginalGet=window.get;
  if(typeof _kcOriginalGet==='function') window.get=async function(...args){const data=await _kcOriginalGet.apply(this,args);try{registerEntities(data);}catch(e){}return data;};
  function _kcLinkTextNodes(rootEl=document.body){
    if(!rootEl || rootEl.id==='kasiscoreEntityPageRoot' || rootEl.closest?.('#kasiscoreEntityPageRoot')) return;
    const walker=document.createTreeWalker(rootEl,NodeFilter.SHOW_TEXT,{acceptNode(n){
      if(!n.nodeValue.trim()||n.parentElement?.closest('script,style,textarea,input,select,option,a,.kc-link,.team-link,.player-link,[data-kc-linked]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }}); const nodes=[]; let n; while((n=walker.nextNode())) nodes.push(n);
    nodes.forEach(node=>{
      let text=node.nodeValue; let changed=false;
      const names=[...KC_TEAMS.values(),...KC_PLAYERS.values()].sort((a,b)=>b.name.length-a.name.length);
      for(const ent of names){const re=new RegExp('(^|[^\\p{L}\\p{N}])('+String(ent.name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?=$|[^\\p{L}\\p{N}])','iu'); if(!re.test(text)) continue;
        const parts=text.split(re); if(parts.length<4) continue;
        const frag=document.createDocumentFragment(); let cursor=0;
        for(let i=1;i<parts.length;i+=3){frag.appendChild(document.createTextNode(parts[i]||'')); const label=parts[i+1]; const a=document.createElement('span'); a.className=KC_TEAMS.has(String(ent.name).toLowerCase())?'team-link':'player-link'; a.dataset.kcLinked='1'; a.textContent=label; a.style.cursor='pointer'; a.onclick=(ev)=>{ev.stopPropagation(); if(a.classList.contains('team-link')) openKasiTeamPage(ent.id,ent.name); else openKasiPlayerPage(ent.id,ent.name);}; frag.appendChild(a); frag.appendChild(document.createTextNode(parts[i+2]||'')); cursor=i+3; changed=true; }
        if(changed){node.parentNode.replaceChild(frag,node); break;}
      }
    });
  }
  const kcObserver=new MutationObserver(()=>{clearTimeout(window.__kcLinkTimer);window.__kcLinkTimer=setTimeout(()=>_kcLinkTextNodes(document.querySelector('.app')||document.body),30);});
  document.addEventListener('DOMContentLoaded',()=>{kcObserver.observe(document.body,{childList:true,subtree:true});setTimeout(()=>_kcLinkTextNodes(document.querySelector('.app')||document.body),300);});
  // kc-click-fallback-v187: capture clicks before legacy handlers can swallow them.
  document.addEventListener('click',function(ev){
    const stats=ev.target.closest?.('.match-stats-btn,.lr-stats-btn,[data-kc-stats],[onclick*=\"openLiveMatchPage\"]');
    if(stats){
      const raw=stats.getAttribute('onclick')||'';
      const dm=stats.dataset?.fixtureId;
      const mm=raw.match(/openLiveMatchPage\((\d+)/);
      const fid=Number(dm||mm?.[1]||0);
      if(fid>0){ev.preventDefault();ev.stopImmediatePropagation();window.openLiveMatchPage(fid,'football','');return;}
    }
    const team=ev.target.closest?.('[data-kc-team-id],[onclick*=\"openKasiTeamPage\"],.team-link');
    if(team){
      let id=Number(team.dataset?.kcTeamId||0), name=team.dataset?.kcTeamName||team.textContent.trim();
      const raw=team.getAttribute('onclick')||''; const im=raw.match(/openKasiTeamPage\((\d+)/); if(!id&&im) id=Number(im[1]||0);
      ev.preventDefault();ev.stopImmediatePropagation();goTeam(id,name);return;
    }
  },true);
  function route(){const p=location.pathname.replace(/\/+$/,''); const sm=p.match(/^\/(rugby|cricket)\/(team|player)\/([^/]+)$/i); const tm=p.match(/^\/(?:team|teams)\/(\d+)(?:\/([^/]+))?$/i); const pm=p.match(/^\/(?:player|players)\/(\d+)(?:\/([^/]+))?$/i); if(sm){sportEntityPage(sm[2].toLowerCase(),sm[1].toLowerCase(),decodeURIComponent(sm[3]));} else if(tm){teamPage(tm[1]);} else if(pm){playerPage(pm[1]);} else if(p.startsWith('/team/')||p.startsWith('/teams/')){teamPage(decodeURIComponent(p.replace(/^\/teams?\//,'')));} else if(p.startsWith('/player/')||p.startsWith('/players/')){playerPage(decodeURIComponent(p.replace(/^\/players?\//,'')));} else {document.body.classList.remove('kc-team-route','kc-player-route');showApp();document.getElementById('kasiscoreEntityPageRoot')?.remove();}}
  document.addEventListener('DOMContentLoaded',()=>{route();});
  window.addEventListener('popstate',route);
})();


/* v190: standings, team/player SPA routing, live badges, back navigation and fail-soft stats */
window.loadHomeStandings = async function(){
  const el=document.getElementById('homeStandingsGrid'); if(!el)return;
  const league=document.getElementById('homeStandingsLeague')?.value||'Premier League';
  el.innerHTML='<div class="empty">Loading '+esc(league)+' table…</div>';
  try{
    const d=await get('/standings/2026-27',{league}); const lg=(d.leagues||[])[0]||{}; const rows=lg.table||[];
    if(!rows.length){el.innerHTML='<div class="empty">No current standings returned for this competition.</div>';return;}
    el.innerHTML=`<div class="sub" style="margin-bottom:8px">${esc(lg.league||league)} · ${esc(String(lg.season||d.season||'Current season'))} · Kasi Sports News</div><div class="tablewrap"><table class="home-standings-table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th><th>Form</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.rank??'—')}</td><td>${teamCell(r.logo||'',r.team||'Team','xs',r.teamId||0)}</td><td>${esc(r.played??0)}</td><td>${esc(r.win??0)}</td><td>${esc(r.draw??0)}</td><td>${esc(r.lose??0)}</td><td>${esc(r.goalDiff??0)}</td><td><b>${esc(r.points??0)}</b></td><td>${esc(r.form||'—')}</td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){el.innerHTML=`<div class="empty">Standings unavailable.<br><small>${esc(e.message||e)}</small></div>`;}
};
// Make Back to Live deterministic even after a #match-stats deep link.
window.kasiscoreBackToLive=function(){ return window.kasiLiveBack(); };
// Populate standings after the core screen paints; this uses the server cache and does not alter live polling.
/* v216: standings loads only when Teams & Players Data is opened */


(function(){
  const E=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  window.renderLiveGridLegacy2=function(matches){
    const el=document.getElementById('liveMatchGrid'), empty=document.getElementById('liveWidgetEmpty'); if(!el)return;
    if(!matches?.length){el.innerHTML='';if(empty)empty.style.display='block';return;} if(empty)empty.style.display='none';
    el.innerHTML=matches.map(m=>{const logo=(src)=>src?`<img src="${E(src)}" style="width:24px;height:24px;object-fit:contain;vertical-align:middle;margin-right:7px" onerror="this.style.display='none'" loading="lazy" decoding="async" fetchpriority="low">`:'';return `<div class="live-row" onclick="openLiveMatchPage(${Number(m.id||0)},'football',${JSON.stringify(m.league||'')})"><div class="lr-league">${E(m.league||'Football')}</div><div class="lr-teams"><div class="t kc-link" data-kc-team-id="${Number(m.homeId||0)}" data-kc-team-name="${E(m.home||'Home')}" onclick="event.stopPropagation();openKasiTeamPage(${Number(m.homeId||0)},${JSON.stringify(m.home||'Home')})">${logo(m.homeLogo)}${E(m.home||'Home')}</div><div class="t kc-link" data-kc-team-id="${Number(m.awayId||0)}" data-kc-team-name="${E(m.away||'Away')}" onclick="event.stopPropagation();openKasiTeamPage(${Number(m.awayId||0)},${JSON.stringify(m.away||'Away')})">${logo(m.awayLogo)}${E(m.away||'Away')}</div></div><div class="lr-score"><div class="s">${E(m.hs??0)}</div><div class="m">${E(m.min||'LIVE')}${m.min?"'":''}</div><div class="s">${E(m.as??0)}</div></div><button class="lr-stats-btn" data-fixture-id="${Number(m.id||0)}" onclick="event.stopPropagation();openLiveMatchPage(${Number(m.id||0)},'football',${JSON.stringify(m.league||'')})">Stats</button></div>`}).join('');
  };
  window.loadYesterdayTipResults=async function(){const el=document.getElementById('totdYesterday');if(!el)return;try{const d=await get('/learning/recent-results');const all=[...(d.correctGames||[]),...(d.wrongGames||[])];const now=new Date(), y=new Date(now);y.setDate(y.getDate()-1);const key=y.toISOString().slice(0,10);const rows=all.filter(x=>String(x.kickoff||'').slice(0,10)===key).slice(0,8);el.innerHTML=`<div style="font-size:11px;font-weight:800;margin-bottom:7px">Yesterday · predicted vs outcome</div>`+(rows.length?rows.map(x=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:11px"><span>${E(x.home)} vs ${E(x.away)}</span><span>Pred: <b>${E(x.predictedWinner||'—')}</b> · Final: <b>${E(x.homeGoals??'—')}-${E(x.awayGoals??'—')}</b> · <b style="color:${x.winnerCorrect?'var(--green)':'var(--red)'}">${x.winnerCorrect?'Correct':'Missed'}</b></span></div>`).join(''):'<div class="sub">No resolved Kasi Sports News predictions were stored for yesterday.</div>');}catch(e){el.innerHTML='<div class="sub">Yesterday’s prediction outcomes are temporarily unavailable.</div>';}};
  
function kcNewsImageUrl(n){const candidates=[n?.image,n?.ogImage,n?.publisherImage].filter(Boolean);for(const raw of candidates){const u=String(raw).trim();if(/google|gstatic|googleusercontent|google_news|googlelogo|favicon|branding|logo[._-]|\/logo(?:s)?\/|placeholder|default[-_]?image|sprite|lh3\.google|encrypted-tbn/i.test(u))continue;if(/^https?:\/\//i.test(u))return '/sports/news/image?url='+encodeURIComponent(u)}return ''}
function kcNewsPlaceholder(sport){const s=String(sport||'SPORT').toUpperCase();return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500"><rect width="900" height="500" fill="#111827"/><rect x="0" y="0" width="14" height="500" fill="#12b8d6"/><text x="55" y="215" font-family="Arial" font-size="26" fill="#94a3b8">KASI SPORTS NEWS</text><text x="55" y="285" font-family="Arial" font-weight="700" font-size="58" fill="#fff">${s} NEWS</text></svg>`)}
window.loadHomeSportsNews=async function(){const el=document.getElementById('homeSportsNewsGrid');if(!el)return;el.innerHTML='<div class="empty">Loading football, rugby and cricket news…</div>';try{const d=await get('/sports/news',{sport:'all',limit:12});const a=d.items||[];el.innerHTML=a.length?a.map(x=>`<article class="home-feature-card" style="cursor:pointer" onclick="openKasiNewsArticle&&openKasiNewsArticle(${JSON.stringify(x.publisherUrl||x.resolvedUrl||x.link||'')})">${`<img src="${E(kcNewsImageUrl(x)||kcNewsPlaceholder(x.sport))}" referrerpolicy="no-referrer" style="width:100%;height:180px;object-fit:cover;border-radius:9px" onerror="this.src=kcNewsPlaceholder('${E(x.sport||'sport')}')" loading="lazy" decoding="async" fetchpriority="low">`}<div style="padding:10px 2px 4px"><span class="badge">${E(x.sport||x.source||'Sport')}</span><h3 style="font-size:14px;margin:8px 0;color:#f4f7fb">${E(x.title||'Sports headline')}</h3><div class="sub" style="color:#9fb0c3">${E(x.publisher||x.source||'Sports News')} · ${E(x.published||'')}</div></div></article>`).join(''):'<div class="empty">No current sports headlines were returned. Kasi Sports News will retry on the next refresh.</div>';}catch(e){el.innerHTML=`<div class="empty">Sports news temporarily unavailable.<br><small>${E(e.message)}</small></div>`;}};
  window.loadHomeNews=window.loadHomeSportsNews;
  window.openKasiNewsArticle=async function(url){if(!url)return;let modal=document.getElementById('kcNewsReader');if(!modal){modal=document.createElement('div');modal.id='kcNewsReader';modal.style.cssText='position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.88);overflow:auto;padding:24px';modal.innerHTML='<div id="kcNewsReaderBody" style="max-width:900px;margin:auto;background:#000;border:1px solid var(--line);border-radius:14px;padding:20px"></div>';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});}const b=document.getElementById('kcNewsReaderBody');b.innerHTML='<button onclick="document.getElementById(\'kcNewsReader\')?.remove()" style="float:right">Close</button><div class="empty">Loading article summary and media…</div>';try{const d=await get('/sports/news/article',{url});b.innerHTML=`<button onclick="document.getElementById('kcNewsReader')?.remove()" style="float:right">Close</button>${d.image?`<img src="${E(d.image)}" style="width:100%;max-height:420px;object-fit:cover;border-radius:10px;margin:12px 0" loading="lazy" decoding="async" fetchpriority="low">`:''}<h2>${E(d.title||'Sports News')}</h2><p style="line-height:1.7;color:var(--muted)">${E(d.description||'Publisher summary unavailable.')}</p>${d.video?`<video controls src="${E(d.video)}" style="width:100%;margin-top:12px"></video>`:''}<div class="sub" style="margin-top:14px">${E(d.publisher||d.source||'Publisher')} · displayed inside Kasi Sports News from publisher metadata.</div>`;}catch(e){b.innerHTML=`<button onclick="document.getElementById('kcNewsReader')?.remove()" style="float:right">Close</button><div class="empty">Article preview temporarily unavailable.<br><small>${E(e.message)}</small></div>`;}};
  function ksStopInlineVideo(card){
    if(!card)return;
    const frame=card.querySelector('iframe.kasi-inline-youtube');
    if(frame)frame.remove();
    const media=card.querySelector('.kasi-video-media');
    if(media)media.classList.remove('is-playing');
  }

  function ksPlayInlineVideo(btn){
    if(!btn)return;
    const card=btn.closest('.kasi-video-card');
    const media=btn.querySelector('.kasi-video-media');
    const videoId=String(btn.dataset.ksVideo||'').trim();
    if(!card||!media||!videoId)return;
    document.querySelectorAll('#homeVideosGrid .kasi-video-card').forEach(other=>{
      if(other!==card)ksStopInlineVideo(other);
    });
    if(media.classList.contains('is-playing'))return;

    const frame=document.createElement('iframe');
    frame.className='kasi-inline-youtube';
    frame.title=btn.dataset.ksTitle||'YouTube video player';
    frame.src='https://www.youtube.com/embed/'+encodeURIComponent(videoId)+
      '?autoplay=1&playsinline=1&rel=0&controls=1&fs=0'+
      '&origin='+encodeURIComponent(window.location.origin)+
      '&widget_referrer='+encodeURIComponent(window.location.href);
    frame.allow='autoplay; encrypted-media; picture-in-picture';
    frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
    frame.setAttribute('loading','eager');
    media.appendChild(frame);
    media.classList.add('is-playing');
  }
  window.ksPlayInlineVideo=ksPlayInlineVideo;
  window.ksStopInlineVideo=ksStopInlineVideo;

  function ksVideoPublishedValue(v){
    const t=Date.parse(String(v&&v.published||''));
    return Number.isFinite(t)?t:0;
  }
  function ksVideoPublishedLabel(value){
    if(!value)return '';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '';
    try{
      return new Intl.DateTimeFormat(undefined,{
        year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'
      }).format(d);
    }catch(_){return d.toLocaleString();}
  }

  let ksVideoOffset=0,ksVideoLoading=false;
  const ksVideoSeen=new Set();
  function ksVideoCard(v){
    const id=String(v.embedId||v.id||'').trim(), title=String(v.title||'Match highlight'), img=String(v.image||'').trim();
    if(!id||!img)return '';
    const published=ksVideoPublishedLabel(v.published);
    return `<article class="home-feature-card kasi-video-card">
      <button type="button" class="kasi-video-link" data-ks-video="${E(id)}" data-ks-title="${E(title)}" aria-label="Play ${E(title)} inside this video card">
        <div class="kasi-video-media"><img src="${E(img)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="${E(title)}" fetchpriority="low"><span class="kasi-video-play" aria-hidden="true">▶</span></div>
        <div class="kasi-video-copy"><span class="badge">${E(v.sport||'video')}</span><h3>${E(title)}</h3><div class="sub">${E(v.source||'Video')}${published?' · '+E(published):''}</div></div>
      </button></article>`;
  }
  function ksWireVideoCards(root){
    root.querySelectorAll('[data-ks-video]').forEach(btn=>{if(btn.dataset.wired)return;btn.dataset.wired='1';btn.addEventListener('click',e=>{e.preventDefault();ksPlayInlineVideo(btn);});});
  }
  async function ksVideoFetch(params){
    // UI deadline: the server now serves stale-while-revalidate, so a network
    // problem should become a Retry state instead of an endless spinner.
    return await Promise.race([
      get('/sports/videos',params),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Video feed timeout')),4500))
    ]);
  }
  window.loadHomeVideos=async function(){
    const el=document.getElementById('homeVideosGrid');if(!el||ksVideoLoading)return;
    ksVideoLoading=true;ksVideoOffset=0;ksVideoSeen.clear();
    el.innerHTML='<div class="empty">Loading match highlights…</div>';
    const btn=document.getElementById('ksVideoLoadMore');if(btn){btn.disabled=true;btn.textContent='Loading…';btn.style.display='inline-block'}
    try{
      const d=await ksVideoFetch({sport:'all',limit:8,offset:0,_ts:Date.now()});
      const videos=(d.items||[]).filter(v=>{const id=String(v.embedId||v.id||'');if(!id||ksVideoSeen.has(id))return false;ksVideoSeen.add(id);return true});
      el.innerHTML=videos.map(ksVideoCard).join('')||'<div class="empty">No recent highlight videos are available right now.</div>';
      ksVideoOffset=Number(d.nextOffset??videos.length);ksWireVideoCards(el);
      if(btn){btn.disabled=false;btn.textContent=d.hasMore?'Load More':'No more videos available';btn.disabled=!d.hasMore}
    }catch(e){el.innerHTML='<div class="empty">Highlight videos are temporarily unavailable.</div>';if(btn){btn.textContent='Retry';btn.disabled=false}}
    finally{ksVideoLoading=false}
  };
  window.loadMoreHomeVideos=async function(){
    const el=document.getElementById('homeVideosGrid'),btn=document.getElementById('ksVideoLoadMore');if(!el||ksVideoLoading)return;
    ksVideoLoading=true;if(btn){btn.disabled=true;btn.textContent='Loading…'}
    try{
      const d=await ksVideoFetch({sport:'all',limit:8,offset:ksVideoOffset,_ts:Date.now()});
      const fresh=(d.items||[]).filter(v=>{const id=String(v.embedId||v.id||'');if(!id||ksVideoSeen.has(id))return false;ksVideoSeen.add(id);return true});
      if(fresh.length){el.insertAdjacentHTML('beforeend',fresh.map(ksVideoCard).join(''));ksWireVideoCards(el)}
      ksVideoOffset=Number(d.nextOffset??(ksVideoOffset+(d.items||[]).length));
      if(btn){btn.textContent=d.hasMore?'Load More':'No more videos available';btn.disabled=!d.hasMore}
    }catch(e){if(btn){btn.textContent='Load More';btn.disabled=false}}
    finally{ksVideoLoading=false}
  };
  // Refresh recent videos every 5 minutes. Active playback is never replaced.
  if(!window.__ksVideoRefreshTimer){
    window.__ksVideoRefreshTimer=setInterval(()=>{
      if(document.visibilityState==='visible'&&typeof window.loadHomeVideos==='function')window.loadHomeVideos();
    },300000);
  }
  document.addEventListener('DOMContentLoaded',()=>{document.getElementById('llmEnhanceBtn')?.remove();setTimeout(()=>{loadYesterdayTipResults();},2500);setTimeout(()=>{loadHomeSportsNews();loadHomeVideos();},1650);});
  new MutationObserver(()=>document.getElementById('llmEnhanceBtn')?.remove()).observe(document.documentElement,{childList:true,subtree:true});
})();


(function(){
  // Remove the prediction-only LLM control even if legacy code recreates it.
  function removePredictionLLM(){ document.getElementById('llmEnhanceBtn')?.remove(); }
  removePredictionLLM();

  // Keep the cross-sport KPI anchored to the authoritative football /live state.
  const oldOverview=window.renderOverview || (typeof renderOverview==='function'?renderOverview:null);
  if(oldOverview){
    window.renderOverview=function(){
      try{
        const football=(window.S?.live||[]).length;
        window.S.sportLiveBreakdown=Object.assign({},window.S.sportLiveBreakdown||{},{football});
        window.S.sportLiveCount=football+Number(window.S.sportLiveBreakdown.rugby||0)+Number(window.S.sportLiveBreakdown.cricket||0);
      }catch(_){}
      return oldOverview();
    };
  }

  // Repaint news/highlights after core data is available rather than only on DOMContentLoaded.
  const oldRefresh=window.refreshAll;
  if(typeof oldRefresh==='function'){
    window.refreshAll=async function(){
      const r=await oldRefresh.apply(this,arguments);
      try{ window.loadHomeSportsNews?.(); }catch(_){}
      try{ window.loadHomeVideos?.(); }catch(_){}
      try{ window.loadYesterdayTipResults?.(); }catch(_){}
      try{ window.loadHomeStandings?.(); }catch(_){}
      removePredictionLLM();
      return r;
    };
  }

  // Team/player cards are always visibly interactive.
  const style=document.createElement('style');
  style.textContent='.kc-link,.team-link,.player-link,.kc-player{cursor:pointer!important}.kc-link:hover,.team-link:hover,.player-link:hover{color:var(--accent)!important;text-decoration:underline!important}';
  document.head.appendChild(style);
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.loadHomeMatchRail=async function(){
   const el=document.getElementById('liveMatchGrid'), empty=document.getElementById('liveWidgetEmpty');if(!el)return;
   try{
     const d=await get('/home/matches',{league:document.getElementById('league')?.value||'ALL'}),rows=d.matches||[];
     const heading=el.closest('.section,.card')?.querySelector('h2,h3,.section-title');if(heading)heading.textContent=d.mode==='live'?'Live Matches':(d.heading||"Yesterday's Top Matches");
     if(d.mode==='live'){if(typeof renderLiveGrid==='function')renderLiveGrid(rows);return;}
     if(empty)empty.style.display='none';
     if(!rows.length){el.innerHTML='<div class="empty">No completed matches were returned for yesterday.</div>';return;}
     el.innerHTML=rows.map(m=>{const id=Number(m._afootFixtureId||m.fixtureId||m.id||0),sc=String(m.score||'— - —').split(/\s*-\s*/),h=m.home||m.homeTeam||'Home',a=m.away||m.awayTeam||'Away';return `<div class="live-row" onclick="openLiveMatchPage(${id},'football',${JSON.stringify(m.league||'')})"><div class="lr-league">${E(m.league||'Football')} · FT</div><div class="lr-teams"><div class="t kc-link" onclick="event.stopPropagation();openKasiTeamPage(${Number(m.homeId||m.homeTeamId||0)},${JSON.stringify(h)})">${m.homeLogo?`<img src="${E(m.homeLogo)}" class="kc-live-badge" loading="lazy" decoding="async" fetchpriority="low">`:''}<span>${E(h)}</span></div><div class="t kc-link" onclick="event.stopPropagation();openKasiTeamPage(${Number(m.awayId||m.awayTeamId||0)},${JSON.stringify(a)})">${m.awayLogo?`<img src="${E(m.awayLogo)}" class="kc-live-badge" loading="lazy" decoding="async" fetchpriority="low">`:''}<span>${E(a)}</span></div></div><div class="lr-score"><div class="s">${E(m.homeScore??sc[0]??'—')}</div><div class="m">FT</div><div class="s">${E(m.awayScore??sc[1]??'—')}</div></div><button class="lr-stats-btn" onclick="event.stopPropagation();openLiveMatchPage(${id},'football',${JSON.stringify(m.league||'')})">Details</button></div>`}).join('');
   }catch(e){console.warn('Home match fallback failed',e);}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(loadHomeMatchRail,250),{once:true});else setTimeout(loadHomeMatchRail,250);
})();


(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const token=()=>localStorage.getItem('kasiscore_session')||'';
  async function intel(path,params={}){
    const _b=(typeof base==='function'?base():location.origin).replace(/\/+$/,'');
    const _raw=_b.startsWith('http')?_b+path:location.origin+_b+path;
    const u=new URL(_raw);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
    const r=await fetch(u,{headers:{Authorization:'Bearer '+token()},cache:'no-store'});if(!r.ok)throw new Error(r.status===403?'Admin access required':'Intelligence service '+r.status);return r.json();
  }
  window.loadIntelligenceDefault=async function(){
    const el=document.getElementById('jgEntityResult');if(!el||window._serverAdmin!==true)return;
    el.innerHTML='<div class="empty">Loading current top goalscorers…</div>';
    try{
      const d=await intel('/intelligence/top-goalscorers');
      const a=d.items||[];
      el.innerHTML=a.length?`<div class="grid">${a.map(x=>{const p=x.player||{},st=(x.statistics||[])[0]||{},t=st.team||{};return `<div class="kasiscore-intel-card"><div style="display:flex;gap:10px;align-items:center">${p.photo?`<img src="${esc(p.photo)}" loading="lazy" style="width:52px;height:52px;border-radius:50%;object-fit:cover" decoding="async" fetchpriority="low">`:''}<div><b class="kc-click-team" onclick="openKasiPlayerPage(${Number(p.id||0)},${JSON.stringify(p.name||'Player')})">${esc(p.name||'Player')}</b><div class="sub"><span class="kc-click-team" onclick="openKasiTeamPage(${Number(t.id||0)},${JSON.stringify(t.name||'Team')})">${esc(t.name||'Team')}</span></div></div></div><div style="margin-top:8px"><b>${Number(st.goals?.total||0)}</b> goals · ${Number(st.games?.appearences||0)} appearances</div></div>`}).join('')}</div>`:'<div class="empty">No current goalscorer data returned.</div>';
    }catch(e){el.innerHTML=`<div class="empty">${esc(e.message)}</div>`;}
  };
  const prior=window.kasiscoreEntitySearch;
  window.kasiscoreEntitySearch=async function(){
    if(window._serverAdmin!==true)return;
    const q=document.getElementById('jgEntitySearch')?.value.trim(),type=document.getElementById('jgEntityType')?.value||'auto',el=document.getElementById('jgEntityResult');
    if(!q){loadIntelligenceDefault();return;}
    el.innerHTML='<div class="empty">Searching current sports data…</div>';
    try{
      if(type==='player' && /^\d+$/.test(q)){const d=await intel('/intelligence/player',{player:q});el.innerHTML=`<div class="jg-item"><b>${esc(d.player?.name||q)}</b><button onclick="openKasiPlayerPage(${Number(d.player?.id||q)},${JSON.stringify(d.player?.name||'Player')})">Open Player</button></div>`;return;}
      const d=await intel('/intelligence/team',{team:q});const t=d.team||{};el.innerHTML=`<div class="jg-item"><div><b>${esc(t.name||q)}</b><div class="sub">${esc(t.country||'')} · ${esc(d.source||'Sports data')}</div></div><button onclick="openKasiTeamPage(${Number(t.id||0)},${JSON.stringify(t.name||q)})">Open Team</button></div>`;
    }catch(e){el.innerHTML=`<div class="empty">${esc(e.message)}</div>`;}
  };
  const obs=new MutationObserver(()=>{const tab=document.getElementById('intelligence_hub');if(tab&&!tab.classList.contains('hidden')&&window._serverAdmin===true&&!document.getElementById('jgEntitySearch')?.value.trim())loadIntelligenceDefault();});
  obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();


(function(){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pick=(o,...k)=>{for(const x of k){if(o&&o[x]!==undefined&&o[x]!==null&&o[x]!=='')return o[x]}return null};
 function teamData(m,side){
   const nested=m?.teams?.[side]||m?.[side]||{};
   const cap=side[0].toUpperCase()+side.slice(1);
   return {
     id:Number(pick(m,side+'Id',side+'TeamId')||nested.id||0),
     name:String(pick(m,side+'Name',side+'Team')||nested.name||(typeof m?.[side]==='string'?m[side]:'')||cap),
     logo:String(pick(m,side+'Logo',side+'Badge')||nested.logo||nested.badge||''),
     flag:String(pick(m,side+'Flag')||nested.flag||'')
   };
 }
 function score(m){
   const h=pick(m,'homeScore')??m?.goals?.home??m?.score?.fulltime?.home??0;
   const a=pick(m,'awayScore')??m?.goals?.away??m?.score?.fulltime?.away??0;
   return [h,a];
 }
 window.renderLiveGridLegacy3=function(rows){
   const el=document.getElementById('liveMatchGrid'); if(!el)return;
   rows=Array.isArray(rows)?rows:[];
   if(!rows.length){el.innerHTML='<div class="empty">No matches are live right now.</div>';return;}
   el.innerHTML=rows.map(m=>{
     const h=teamData(m,'home'),a=teamData(m,'away'),sc=score(m);
     const fid=Number(pick(m,'_afootFixtureId','fixtureId','id')||m?.fixture?.id||0);
     const league=String(pick(m,'league','leagueName')||m?.league?.name||'Football');
     const minute=String(pick(m,'minute','elapsed')||m?.fixture?.status?.elapsed||'');
     const fallbackFlag=String(pick(m,'leagueFlag')||m?.league?.flag||'');
     const hSrc=h.logo||h.flag||fallbackFlag, aSrc=a.logo||a.flag||fallbackFlag;
     const hImg=hSrc?`<img class="ks-live-badge" src="${esc(hSrc)}" alt="${esc(h.name)} badge or flag" loading="eager" onerror="this.outerHTML='<span class=&quot;ks-team-fallback&quot; decoding="async">'+${JSON.stringify('') }+'</span>'">`:`<span class="ks-team-fallback">${esc(h.name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</span>`;
     const aImg=aSrc?`<img class="ks-live-badge" src="${esc(aSrc)}" alt="${esc(a.name)} badge or flag" loading="eager" onerror="this.outerHTML='<span class=&quot;ks-team-fallback&quot; decoding="async"></span>'">`:`<span class="ks-team-fallback">${esc(a.name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</span>`;
     return `<div><div class="ks-live-meta">${esc(league)}${minute?` · ⏱ ${esc(minute)}'`:''}</div><div class="ks-live-game">
       <div class="ks-live-team" role="link" tabindex="0" onclick="event.stopPropagation();openKasiTeamPage(${h.id},${JSON.stringify(h.name)})" onkeydown="if(event.key==='Enter')openKasiTeamPage(${h.id},${JSON.stringify(h.name)})">${hImg}<span class="ks-live-name">${esc(h.name)}</span></div>
       <div class="ks-live-score">${esc(sc[0])} – ${esc(sc[1])}</div>
       <div class="ks-live-team ks-live-away" role="link" tabindex="0" onclick="event.stopPropagation();openKasiTeamPage(${a.id},${JSON.stringify(a.name)})" onkeydown="if(event.key==='Enter')openKasiTeamPage(${a.id},${JSON.stringify(a.name)})"><span class="ks-live-name">${esc(a.name)}</span>${aImg}</div>
       <button class="lr-stats-btn" onclick="event.stopPropagation();openLiveMatchPage(${fid},'football',${JSON.stringify(league)})">Stats</button>
     </div></div>`;
   }).join('');
 };
 // Repaint after live data is present, avoiding another provider request.
 const repaint=()=>{try{if(window.S&&Array.isArray(S.live)&&S.live.length)renderLiveGrid(S.live)}catch(_){}};
 window.addEventListener('load',()=>setTimeout(repaint,900));
 setInterval(repaint,180000);
})();


(function(){
  const old=window.renderLiveGrid;
  if(typeof old!=='function') return;
  const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  window.ksTeamAsset=function(m,side){
    const t=(m?.teams?.[side]||{}), cap=side[0].toUpperCase()+side.slice(1);
    const logo=m?.[side+'Logo']||m?.[side+'Badge']||t.logo||t.badge||'';
    const flag=m?.[side+'Flag']||t.flag||m?.leagueFlag||'';
    const name=m?.[side]||m?.[side+'Team']||t.name||cap;
    const src=logo||flag;
    return src
      ? `<img class="ks-live-badge" src="${String(src).replace(/"/g,'&quot;')}" alt="${String(name).replace(/"/g,'&quot;')} badge or flag" loading="eager" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ks-team-fallback',textContent:${JSON.stringify('??')}}))" decoding="async">`
      : `<span class="ks-team-fallback">${initials(name)}</span>`;
  };
})();


(async function(){
 const targets=['cricketOddsCompact','cricketOddsFull'];
 const render=a=>a.length?a.slice(0,8).map(x=>`<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${E(x.home||'Home')} vs ${E(x.away||'Away')}</b><div class="sub">${E(x.sportKey||'Cricket')} · ${E(x.bookmaker||'Bookmaker')}</div><div style="margin-top:4px">${x.homePrice?`Home ${Number(x.homePrice).toFixed(2)}`:''}${x.drawPrice?` · Draw ${Number(x.drawPrice).toFixed(2)}`:''}${x.awayPrice?` · Away ${Number(x.awayPrice).toFixed(2)}`:''}</div></div>`).join(''):'<div class="empty">No current Test Match odds available.</div>';
 try{
   const d=await Promise.race([get('/sports/cricket/odds'),new Promise((_,r)=>setTimeout(()=>r(new Error('Odds timeout')),7000))]);
   targets.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=render(d.items||[])});
 }catch(_){targets.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<div class="empty">No current Test Match odds available.</div>'})}
})();


(function(){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pick=(o,...ks)=>{for(const k of ks)if(o&&o[k]!==undefined&&o[k]!==null&&o[k]!=='')return o[k];return null};
 const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
 function team(m,side){
   const nested=m?.teams?.[side]||{}, cap=side[0].toUpperCase()+side.slice(1);
   return {
    id:Number(pick(m,side+'Id',side+'TeamId','_'+(side==='home'?'teamHomeId':'teamAwayId'))||nested.id||0),
    name:String(pick(m,side,side+'Team',side+'Name')||nested.name||cap),
    logo:String(pick(m,side+'Logo',side+'Badge')||nested.logo||nested.badge||'')
   };
 }
 function asset(t,flag){
   const src=t.logo||flag||'';
   return src?`<img src="${esc(src)}" alt="${esc(t.name)} badge or flag" loading="eager" decoding="async" onerror="this.outerHTML='<span class=&quot;ks203-placeholder&quot;>${esc(initials(t.name))}</span>'">`
             :`<span class="ks203-placeholder">${esc(initials(t.name))}</span>`;
 }
 window.renderLiveGridLegacy4=function(matches){
   const el=document.getElementById('liveMatchGrid'),empty=document.getElementById('liveWidgetEmpty');if(!el)return;
   matches=Array.isArray(matches)?matches:[];
   if(!matches.length){el.innerHTML='';if(empty)empty.style.display='block';return}
   if(empty)empty.style.display='none';
   el.innerHTML=matches.map(m=>{
    const h=team(m,'home'),a=team(m,'away'),flag=String(pick(m,'leagueFlag','countryFlag')||m?.league?.flag||'');
    const fid=Number(pick(m,'fixtureId','_afootFixtureId','id')||m?.fixture?.id||0);
    const league=String(pick(m,'league','leagueName')||m?.league?.name||'Football');
    const min=pick(m,'elapsed')??m?.liveStatus?.elapsed??m?.fixture?.status?.elapsed;
    const hs=pick(m,'homeScore')??m?.goals?.home??(typeof m?.score==='string'?m.score.split('-')[0]?.trim():0);
    const as=pick(m,'awayScore')??m?.goals?.away??(typeof m?.score==='string'?m.score.split('-')[1]?.trim():0);
    return `<article class="ks203-live-card">
      <div class="ks203-live-meta"><span>${esc(league)}</span><span>${min!==null&&min!==undefined?'⏱ '+esc(min)+"'":'LIVE'}</span></div>
      <div class="ks203-match">
       <div class="ks203-team" role="link" tabindex="0" onclick="openKasiTeamPage(${h.id},${JSON.stringify(h.name)})" onkeydown="if(event.key==='Enter')openKasiTeamPage(${h.id},${JSON.stringify(h.name)})">${asset(h,flag)}<span class="ks203-name">${esc(h.name)}</span></div>
       <div class="ks203-score">${esc(hs??0)} – ${esc(as??0)}</div>
       <div class="ks203-team away" role="link" tabindex="0" onclick="openKasiTeamPage(${a.id},${JSON.stringify(a.name)})" onkeydown="if(event.key==='Enter')openKasiTeamPage(${a.id},${JSON.stringify(a.name)})"><span class="ks203-name">${esc(a.name)}</span>${asset(a,flag)}</div>
      </div>
      <div class="ks203-actions"><button onclick="openLiveMatchPage(${fid},'football',${JSON.stringify(league)})">Stats</button></div>
    </article>`;
   }).join('');
 };
 function paint(){if(window.S&&Array.isArray(S.live))window.renderLiveGrid(S.live)}
 window.addEventListener('load',()=>setTimeout(paint,50));
 document.addEventListener('DOMContentLoaded',()=>setTimeout(paint,50));
})();


(function(){
 function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function quickPredictionLine(){
   const target=document.getElementById('kTopName');
   if(!target || (window.S?.predictions||[]).length)return;
   const rows=(window.S?.fixtures||[]).filter(x=>!x.isFinished).slice(0,4);
   if(!rows.length){target.textContent='Waiting for today’s fixture data';return}
   target.innerHTML=rows.map(x=>{
     const h=x.home||'Home',a=x.away||'Away',hid=Number(x.homeId||x.homeTeamId||0),aid=Number(x.awayId||x.awayTeamId||0);
     return `<div style="margin:5px 0"><span class="kc-click-team" onclick="openKasiTeamPage(${hid},${JSON.stringify(h)})">${esc(h)}</span> vs <span class="kc-click-team" onclick="openKasiTeamPage(${aid},${JSON.stringify(a)})">${esc(a)}</span> · model calculating…</div>`;
   }).join('');
 }
 const timer=setInterval(()=>{quickPredictionLine();if((window.S?.predictions||[]).length)clearInterval(timer)},250);
 setTimeout(()=>clearInterval(timer),10000);
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 // Professional News cards.
 window.renderKasiNewsGrid=function(items,target){
  const el=typeof target==='string'?document.getElementById(target):target;if(!el)return;
  el.className=(el.className||'')+' ks204-news-grid';
  el.innerHTML=(items||[]).map((n,i)=>{const im=kcNewsImageUrl(n);return `<article class="ks204-news-card" onclick="openKasiNews&&openKasiNews(${i})" style="cursor:pointer"><div class="ks204-news-media">${im?`<img src="${E(im)}" loading="lazy" decoding="async" onerror="this.style.display='none'" fetchpriority="low">`:'<div class="kc-news-fallback" style="width:100%;height:100%">KASI SPORTS NEWS</div>'}</div><div class="ks204-news-body"><div class="ks204-news-cat">${E(n.sport||n.category||'Sports')}</div><div class="ks204-news-title"><b>${E(n.title||'Sports headline')}</b></div><div class="ks204-news-meta">${E(n.source||'Sports News')} · ${E(n.published||'')}</div></div></article>`}).join('')||'<div class="empty">No current sports news returned.</div>';
 };
 const newsObs=new MutationObserver(()=>{const el=document.getElementById('sportsNewsList');if(el&&window.__ksNewsItems?.length&&!el.dataset.v216){el.dataset.v216='1';renderKasiNewsGrid(window.__ksNewsItems,el)}});
 newsObs.observe(document.body,{subtree:true,childList:true});

 // Search default = provider-backed discovery, never generic news.
 window.loadKasiDiscovery=async function(){
  const el=document.getElementById('jgEntityResult');if(!el)return;el.innerHTML='<div class="empty">Loading sports discovery…</div>';
  try{const d=await get('/discover');const cards=[
   ...(d.players||[]).map(p=>`<div class="ks204-discovery-card" onclick="openKasiPlayerPage(${Number(p.id||0)},${JSON.stringify(p.name||'Player')})">${p.photo?`<img src="${E(p.photo)}" loading="lazy" decoding="async" fetchpriority="low">`:''}<div><b>${E(p.name)}</b><div class="sub">${E(p.team||'')} · ${E(p.position||'')} · ${E(p.league||'')}</div><div>${p.goals!=null?E(p.goals)+' goals':''}</div></div></div>`),
   ...(d.teams||[]).map(t=>`<div class="ks204-discovery-card" onclick="openKasiTeamPage(${Number(t.id||0)},${JSON.stringify(t.name||'Team')})">${t.badge?`<img src="${E(t.badge)}" loading="lazy" decoding="async" fetchpriority="low">`:''}<div><b>${E(t.name)}</b><div class="sub">${E(t.country||'')} · ${E(t.league||'')}</div><div>View Team →</div></div></div>`)
  ];el.innerHTML=`<h3 style="margin:0">Discover Kasi Sports</h3><div class="sub" style="margin-bottom:12px">Want to know more about some of the world's top players and teams?</div><div class="ks204-discovery">${cards.join('')}</div>`}catch(_){el.innerHTML='<div class="empty">Sports discovery is temporarily unavailable.</div>'}
 };
 const si=document.getElementById('jgEntitySearch');if(si)si.addEventListener('input',()=>{if(!si.value.trim())loadKasiDiscovery()});setTimeout(()=>{if(document.getElementById('jgEntityResult')&&!si?.value.trim())loadKasiDiscovery()},500);

 // Header authentication controls.
 async function authBoot(){
  const token=localStorage.getItem('kasiscore_session')||'',header=document.querySelector('header .topbar,header,.topbar');if(!header)return;
  let host=document.getElementById('ks204Auth');if(!host){host=document.createElement('div');host.id='ks204Auth';host.className='ks204-auth';header.appendChild(host)}
  let me=null;if(token){try{const r=await fetch((typeof base==='function'?base():'')+'/auth/me',{headers:{Authorization:'Bearer '+token}});if(r.ok)me=await r.json()}catch(_){}}
  host.innerHTML=me?`<button onclick="this.nextElementSibling.hidden=!this.nextElementSibling.hidden">Profile ▾</button><div hidden style="position:absolute;right:12px;top:58px;background:#0b1118;border:1px solid #26323e;border-radius:9px;padding:8px;z-index:9999">${me.role==='admin'?'<button onclick="location.href=&quot;/admin&quot;">Admin Dashboard</button>':''}<button onclick="window.ksSignOut ? window.ksSignOut() : (localStorage.removeItem('kasiscore_session'),window.ksAuthBoot&&window.ksAuthBoot())">Sign Out</button></div>`:`<span class="auth-copy sub">Sign in for more personalised sports data</span><button onclick="openAuthModal&&openAuthModal('login')">Sign In</button><button onclick="openAuthModal&&openAuthModal('register')">Sign Up</button>`;
 }
 window.ksAuthBoot=authBoot;
 document.addEventListener('DOMContentLoaded',authBoot);

 // Admin Users page.
 if(location.pathname==='/admin')setTimeout(async()=>{const root=document.getElementById('kasiscoreEntityPageRoot')||document.body;root.innerHTML='<div style="max-width:1100px;margin:24px auto;padding:16px"><h1>Admin · Users</h1><div id="ksAdminUsers"><div class="empty">Loading registered users…</div></div></div>';try{const r=await fetch((typeof base==='function'?base():'')+'/admin/users',{headers:{Authorization:'Bearer '+(localStorage.getItem('kasiscore_session')||'')}});if(!r.ok)throw new Error(r.status===403?'Admin access required':'Unable to load users');const d=await r.json();document.getElementById('ksAdminUsers').innerHTML='<div class="tablewrap"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Last login</th><th>Status</th></tr></thead><tbody>'+d.users.map(u=>`<tr><td>${E(u.name||'—')}</td><td>${E(u.email)}</td><td>${E(u.role)}</td><td>${E(u.createdAt||'—')}</td><td>${E(u.lastLogin||'—')}</td><td>${E(u.status)}</td></tr>`).join('')+'</tbody></table></div>'}catch(e){document.getElementById('ksAdminUsers').innerHTML='<div class="empty">'+E(e.message)+'</div>'}},100);
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const P=(o,...ks)=>{for(const k of ks)if(o&&o[k]!==undefined&&o[k]!==null&&o[k]!=='')return o[k];return null};
 const slug=s=>String(s||'team').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const ini=s=>String(s||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
 function team(m,side){
   const n=m?.[side+'Team']||m?.teams?.[side]||{};
   const id=Number(P(m,side+'TeamId',side+'Id',side==='home'?'_teamHomeId':'_teamAwayId')||n.id||0);
   return {
     id,
     name:String(P(m,side,side+'Team',side+'Name')||n.name||(side==='home'?'Home':'Away')),
     logo:String(P(m,side+'Badge',side+'Logo')||n.logo||n.badge||(id?`/sports/football/team-badge/${id}`:''))
   };
 }
 function asset(t,flag){
   const src=t.logo||flag||'';
   if(!src)return `<span class="ks206-placeholder">${E(ini(t.name))}</span>`;
   return `<img class="ks206-badge" src="${E(src)}" alt="${E(t.name)} badge" loading="eager" decoding="async"
     onerror="this.outerHTML='<span class=&quot;ks206-placeholder&quot;>${E(ini(t.name))}</span>'">`;
 }
 window.renderLiveGrid=function(rows){
   const el=document.getElementById('liveMatchGrid'), empty=document.getElementById('liveWidgetEmpty');
   if(!el)return; rows=Array.isArray(rows)?rows:[];
   if(!rows.length){el.innerHTML='';if(empty)empty.style.display='block';return}
   if(empty)empty.style.display='none';
   el.innerHTML=rows.map(m=>{
     const h=team(m,'home'),a=team(m,'away');
     const flag=String(P(m,'leagueFlag','countryFlag')||m?.league?.flag||'');
     const fid=Number(P(m,'fixtureId','_afootFixtureId','id')||m?.fixture?.id||0);
     const lg=String(P(m,'league','leagueName')||m?.league?.name||'Football');
     const min=P(m,'elapsed')??m?.liveStatus?.elapsed??m?.fixture?.status?.elapsed;
     let hs=P(m,'homeScore')??m?.goals?.home, as=P(m,'awayScore')??m?.goals?.away;
     if((hs==null||as==null)&&typeof m?.score==='string'){
       const q=m.score.split('-'); hs=hs??q[0]?.trim(); as=as??q[1]?.trim();
     }
     const hu='#', au='#';
     return `<article class="ks206-live-card">
       <div class="ks206-live-meta"><span>${E(lg)}</span><span>${min!=null?'⏱ '+E(min)+"'":'LIVE'}</span></div>
       <div class="ks206-live-main">
        <a class="ks206-team" href="${E(hu)}" onclick="event.preventDefault();event.stopPropagation();openKasiTeamPage(${h.id},${JSON.stringify(h.name)})">${asset(h,flag)}<span class="ks206-name">${E(h.name)}</span></a>
        <div class="ks206-score">${E(hs??0)} – ${E(as??0)}</div>
        <a class="ks206-team away" href="${E(au)}" onclick="event.preventDefault();event.stopPropagation();openKasiTeamPage(${a.id},${JSON.stringify(a.name)})"><span class="ks206-name">${E(a.name)}</span>${asset(a,flag)}</a>
       </div>
       <div class="ks206-actions"><button type="button" onclick="event.stopPropagation();openLiveMatchPage(${fid},'football',${JSON.stringify(lg)})">Stats</button></div>
     </article>`;
   }).join('');
 };
 function repaint(){if(window.S&&Array.isArray(S.live)&&S.live.length)window.renderLiveGrid(S.live)}
 document.addEventListener('DOMContentLoaded',()=>setTimeout(repaint,0));
 window.addEventListener('load',()=>setTimeout(repaint,0));
 setTimeout(repaint,150);
})();


(function(){
 const original=window.get;
 if(typeof original!=='function')return;
 window.get=async function(path,params){
   const d=await original.apply(this,arguments);
   if(path==='/sports/news'){
     const items=d?.items||d?.news||[];
     window.__ksNewsItems=items;
     queueMicrotask(()=>{if(typeof renderKasiNewsGrid==='function')renderKasiNewsGrid(items,'sportsNewsList')});
   }
   return d;
 };
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const L=[['39','Premier League'],['140','La Liga'],['135','Serie A'],['78','Bundesliga'],['61','Ligue 1'],['288','South Africa']];
 const opts=()=>L.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('');
 window.ks208LoadExplorer=async function(){
  const host=document.getElementById('ks208Groups');if(!host)return;const league=Number(document.getElementById('ks208League')?.value||39),season=Number(document.getElementById('ks208Season')?.value||2026);host.innerHTML='<div class="empty">Loading teams…</div>';
  try{const d=await get('/players/explorer',{league,season});window.__ks208Teams=d.teams||[];host.innerHTML=window.__ks208Teams.map((t,i)=>`<section class="ks208-group"><div class="ks208-head" onclick="location.href='/teams/'+encodeURIComponent(${JSON.stringify(t.publicRef||'')})">${t.badge?`<img src="${E(t.badge)}" loading="lazy" decoding="async" fetchpriority="low">`:''}<b>${E(t.name)}</b></div><div class="ks208-squad" id="ks208sq${i}">${i<4?'<div class="empty">Loading players…</div>':`<button onclick="ks208LoadSquad(${i})">Load players</button>`}</div></section>`).join('');await Promise.allSettled(window.__ks208Teams.slice(0,4).map((_,i)=>ks208LoadSquad(i)))}catch(_){host.innerHTML='<div class="empty">No data available</div>'}
 };
 window.ks208LoadSquad=async function(i){const t=window.__ks208Teams?.[i],el=document.getElementById('ks208sq'+i);if(!t||!el)return;try{const d=await get('/players/team-squad',{team:t.internalId});el.innerHTML=(d.players||[]).map(p=>`<div class="ks208-player" onclick="location.href='/players/'+encodeURIComponent(${JSON.stringify(p.publicRef||'')})">${p.photo?`<img src="${E(p.photo)}" loading="lazy" decoding="async" fetchpriority="low">`:''}<div><b>${E(p.name)}</b><div class="sub">${E(p.position||'Position unavailable')} · #${E(p.number??'—')}</div></div></div>`).join('')||'<div class="empty">No data available</div>'}catch(_){el.innerHTML='<div class="empty">No data available</div>'}};
 function mountPlayers(){const target=document.getElementById('playerStatsSection')||document.querySelector('#players')||document.querySelector('[id*="player"][class*="section"]');if(!target||document.getElementById('ks208Explorer'))return;const box=document.createElement('section');box.id='ks208Explorer';box.className='card';box.innerHTML=`<h2>Players · League & Team Explorer</h2><div class="sub">Choose a league. Teams load first; player squads load only as needed.</div><div class="ks208-toolbar" style="margin-top:12px"><select id="ks208League" onchange="ks208LoadExplorer()">${opts()}</select><select id="ks208Season" onchange="ks208LoadExplorer()"><option value="2026">2026/27</option><option value="2025">2025/26</option></select></div><div id="ks208Groups"></div>`;target.prepend(box);ks208LoadExplorer()}
 window.ks208Discover=async function(){const el=document.getElementById('jgEntityResult');if(!el)return;const league=Number(document.getElementById('ks208SearchLeague')?.value||39);el.innerHTML='<div class="empty">Loading players and teams…</div>';try{const d=await get('/directory/discover',{league});const row=(x,k)=>`<div class="ks208-result" onclick="location.href='/${k==='team'?'teams':'players'}/'+encodeURIComponent(${JSON.stringify(x.publicRef||'')})">${(x.badge||x.photo)?`<img src="${E(x.badge||x.photo)}" loading="lazy" decoding="async" fetchpriority="low">`:''}<div><b>${E(x.name)}</b><div class="sub">${E(k==='team'?('Rank '+(x.rank??'—')+' · '+(x.points??'—')+' pts'):((x.team||'')+(x.goals!=null?' · '+x.goals+' goals':'')))}</div></div></div>`;el.innerHTML=`<h2>Discover Players & Teams</h2><div class="ks208-toolbar"><select id="ks208SearchLeague" onchange="ks208Discover()">${L.map(x=>`<option value="${x[0]}" ${Number(x[0])===league?'selected':''}>${x[1]}</option>`).join('')}</select></div><div class="ks208-results"><section><h3>Top Players</h3>${(d.players||[]).map(x=>row(x,'player')).join('')}</section><section><h3>Top Teams</h3>${(d.teams||[]).map(x=>row(x,'team')).join('')}</section></div>`}catch(_){el.innerHTML='<div class="empty">No data available</div>'}};
 window.ks208Search=async function(q){const el=document.getElementById('jgEntityResult');if(!el)return;q=String(q||'').trim();if(!q)return ks208Discover();if(q.length<2){el.innerHTML='<div class="empty">Type at least 2 characters.</div>';return}try{const d=await get('/directory/search',{q});const row=(x,k)=>`<div class="ks208-result" onclick="location.href='/${k==='team'?'teams':'players'}/'+encodeURIComponent(${JSON.stringify(x.publicRef||'')})">${(x.badge||x.photo)?`<img src="${E(x.badge||x.photo)}" loading="lazy" decoding="async" fetchpriority="low">`:''}<div><b>${E(x.name)}</b><div class="sub">${E(k==='team'?(x.country||'Team'):((x.team||'')+(x.league?' · '+x.league:'')))} · ${k==='team'?'Team':'Player'}</div></div></div>`;el.innerHTML=`<div class="ks208-results"><section><h3>Teams</h3>${(d.teams||[]).map(x=>row(x,'team')).join('')||'<div class="empty">No teams found.</div>'}</section><section><h3>Players</h3>${(d.players||[]).map(x=>row(x,'player')).join('')||'<div class="empty">No players found.</div>'}</section></div><div style="margin-top:14px"><a href="https://www.google.com/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener">Search the web for "${E(q)}"</a></div>`}catch(_){el.innerHTML='<div class="empty">No data available</div>'}};
 function wire(){const input=document.getElementById('jgEntitySearch');if(!input)return;input.placeholder='Search players or teams...';let t;input.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>ks208Search(input.value),250)});ks208Discover()}
 const bad=/(Kasi Sports News|Kasi Sports News|Kasi Sports News|Kasi Sports News|ESPN fallback|powered by Kasi Sports News)/gi;function clean(root=document.body){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){bad.lastIndex=0;if(bad.test(n.nodeValue)){bad.lastIndex=0;n.nodeValue=n.nodeValue.replace(bad,'Kasi Sports News')}}}
 document.addEventListener('DOMContentLoaded',()=>{setTimeout(mountPlayers,250);setTimeout(wire,250);clean()});window.addEventListener('load',()=>setTimeout(mountPlayers,250));new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)clean(n)}))).observe(document.documentElement,{subtree:true,childList:true});
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const img=(src,alt)=>src?`<img src="${E(src)}" alt="${E(alt||'')}" loading="lazy" decoding="async" fetchpriority="low">`:'';

 // If the predictions endpoint returns before fixtures, immediately use its
 // fixture-shaped rows as a temporary first paint. The full fixtures endpoint
 // replaces these rows when it resolves.
 window.ks211SyncPredictionsToFixtures=function(){
   if((S.fixtures||[]).length || !(S.predictions||[]).length)return;
   S.fixtures=(S.predictions||[]).map(x=>Object.assign({},x,{_predictionFallback:true}));
   try{renderFixtures();renderOverview()}catch(_){}
 };

 window.ks211Search=async function(){
   const q=String(document.getElementById('ks211EntitySearch')?.value||'').trim(),el=document.getElementById('ks211SearchResults');
   if(!el)return;if(q.length<2){el.innerHTML='<div class="empty">Enter at least 2 characters.</div>';return}
   el.innerHTML='<div class="empty">Searching…</div>';
   try{
     const sport=String(document.getElementById('ks213Sport')?.value||'football');
     const endpoint=sport==='football'?'/directory/search':'/sports/directory/search';
     const d=await get(endpoint,sport==='football'?{q}:{q,sport});
     const card=(x,k)=>{
       const ref=String(x.publicRef||x.ref||'');
       return `<div class="ks211-result ks213-open-entity" role="button" tabindex="0" data-kind="${E(k)}" data-ref="${E(ref)}">${img(x.badge||x.logo||x.photo,x.name)}<div style="min-width:0"><b>${E(x.name||'Unknown')}</b><div class="sub">${E(x.team||x.country||x.league||k)}</div></div></div>`;
     };
     const teams=d.teams||[],players=d.players||[];
     el.innerHTML=`<div class="ks211-results"><section><h3>Teams</h3>${teams.map(x=>card(x,'team')).join('')||'<div class="empty">No teams found.</div>'}</section><section><h3>Players</h3>${players.map(x=>card(x,'player')).join('')||'<div class="empty">No players found.</div>'}</section></div>`;
   }catch(e){el.innerHTML='<div class="empty">No data available</div>'}
 };

 window.ks211LoadLeague=async function(){
   const league=Number(document.getElementById('ks211League')?.value||39),el=document.getElementById('ks211LeagueTeams'),leaders=document.getElementById('ks211Leaders');
   if(!el)return;el.innerHTML='<div class="empty">Loading teams…</div>';
   const [teamsR,leadR]=await Promise.allSettled([get('/players/explorer',{league,season:2026}),get('/directory/discover',{league,season:2026})]);
   const td=teamsR.status==='fulfilled'?teamsR.value:{teams:[]};window.__ks211Teams=td.teams||[];
   el.className='ks211-teams';
   el.innerHTML=window.__ks211Teams.map((t,i)=>`<div class="ks211-team"><div class="ks211-team-head" onclick="location.href='/teams/'+encodeURIComponent(${JSON.stringify(t.publicRef||'')})">${img(t.badge,t.name)}<div><b>${E(t.name)}</b><div class="sub">${E(t.country||'')}</div></div></div><div class="ks211-squad" id="ks211sq${i}"><button onclick="ks211LoadSquad(${i})">View players</button></div></div>`).join('')||'<div class="empty">No teams available.</div>';
   const ld=leadR.status==='fulfilled'?leadR.value:{players:[]};
   if(leaders){leaders.className='ks211-leaders';leaders.innerHTML=(ld.players||[]).map(p=>`<div class="ks211-player" onclick="location.href='/players/'+encodeURIComponent(${JSON.stringify(p.publicRef||'')})">${img(p.photo,p.name)}<div><b>${E(p.name)}</b><div class="sub">${E(p.team||'')} ${p.goals!=null?'· '+E(p.goals)+' goals':''}</div></div></div>`).join('')||'<div class="empty">No player data available.</div>'}
 };
 window.ks211LoadSquad=async function(i){
   const t=window.__ks211Teams?.[i],el=document.getElementById('ks211sq'+i);if(!t||!el)return;el.innerHTML='<div class="empty">Loading…</div>';
   try{const d=await get('/players/team-squad',{team:t.internalId});el.innerHTML=(d.players||[]).map(p=>`<div class="ks211-player" onclick="location.href='/players/'+encodeURIComponent(${JSON.stringify(p.publicRef||'')})">${img(p.photo,p.name)}<div><b>${E(p.name)}</b><div class="sub">${E(p.position||'')}</div></div></div>`).join('')||'<div class="empty">No player data available.</div>'}catch(_){el.innerHTML='<div class="empty">No data available</div>'}
 };

 const oldNav=window.kasiscorePrimaryNav;
 if(typeof oldNav==='function')window.kasiscorePrimaryNav=function(tab,btn){
   const r=oldNav.apply(this,arguments);
   if(tab==='sportshub'){
     if(!window.__ks211HubLoaded){window.__ks211HubLoaded=true;ks211LoadLeague();setTimeout(()=>{try{loadHomeStandings()}catch(_){}},0)}
   }
   return r;
 };

 const search=document.getElementById('ks211EntitySearch');
 if(search)search.addEventListener('keydown',e=>{if(e.key==='Enter')ks211Search()});
})();


(function(){
 function openEntity(el){
   const kind=el?.dataset?.kind,ref=el?.dataset?.ref;if(!kind||!ref)return;
   location.assign('/'+(kind==='team'?'teams':'players')+'/'+encodeURIComponent(ref));
 }
 document.addEventListener('click',e=>{const el=e.target.closest('.ks213-open-entity');if(el)openEntity(el)});
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.ks213-open-entity')){e.preventDefault();openEntity(e.target.closest('.ks213-open-entity'))}});
 window.ks213SportChanged=async function(){
   const sport=String(document.getElementById('ks213Sport')?.value||'football');
   const league=document.getElementById('ks211League'),football=document.getElementById('ks211LeagueTeams'),other=document.getElementById('ks213OtherSportData');
   if(league)league.style.display=sport==='football'?'':'none';
   if(football)football.style.display=sport==='football'?'':'none';
   if(other)other.style.display=sport==='football'?'none':'';
   if(sport==='football'){ks211LoadLeague();return}
   if(!other)return;other.innerHTML='<div class="empty">Loading '+sport+' teams and players…</div>';
   try{
     const d=await get('/sports/directory',{sport});
     const teams=d.teams||[],players=d.players||[];
     const card=(x,k)=>`<div class="ks211-result ks213-open-entity" role="button" tabindex="0" data-kind="${k}" data-ref="${String(x.publicRef||x.ref||'').replace(/"/g,'&quot;')}">${x.badge||x.logo||x.photo?`<img src="${x.badge||x.logo||x.photo}" loading="lazy" decoding="async" fetchpriority="low">`:''}<div><b>${x.name||'Unknown'}</b><div class="sub">${x.country||x.team||x.league||k}</div></div></div>`;
     other.innerHTML=`<div class="ks211-results"><section><h3>Teams</h3>${teams.map(x=>card(x,'team')).join('')||'<div class="empty">No team data available.</div>'}</section><section><h3>Players</h3>${players.map(x=>card(x,'player')).join('')||'<div class="empty">No player data available.</div>'}</section></div>`;
   }catch(_){other.innerHTML='<div class="empty">No data available</div>'}
 };
})();


(function(){
 const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 async function enrichCard(card,id){
   if(!card||card.dataset.ks213Enriched)return;card.dataset.ks213Enriched='1';
   try{
     const d=await get('/match/enrichment/'+Number(id));
     const scorers=d.goalScorers||[],x=d.xg||{};
     let box=card.querySelector('.ks213-match-extra');
     if(!box){box=document.createElement('div');box.className='ks213-match-extra sub';card.appendChild(box)}
     const score=scorers.length?`<div><b>Goals:</b> ${scorers.map(s=>`${esc(s.player||'Unknown')} ${esc(s.minute??'')}′`).join(' · ')}</div>`:'';
     const xg=(x.home!=null||x.away!=null)?`<div><b>xG:</b> ${x.home==null?'—':esc(x.home)} - ${x.away==null?'—':esc(x.away)}</div>`:'';
     box.innerHTML=score+xg;
   }catch(_){}
 }
 window.ks213EnrichMatches=function(root=document){
   root.querySelectorAll('[data-fixture-id]').forEach(c=>{const id=Number(c.dataset.fixtureId);if(id)enrichCard(c,id)});
 };
 // v274: fixture intelligence is loaded on demand/dedicated views, not for every homepage mutation.
})();


(function(){
 const routeMap={home:'/',live:'/?view=live',fixtures:'/?view=fixtures',predictions:'/?view=predictions',
                 sportshub:'/?view=sportshub',news:'/?view=news',search:'/?view=search'};
 const old=window.kasiscorePrimaryNav;
 window.kasiscorePrimaryNav=function(tab,btn){
   const dedicated=/^\/(teams?|players?|matches?|login|signup|register)(\/|$)/i.test(location.pathname);
   if(dedicated && routeMap[tab]){location.assign(routeMap[tab]);return}
   if(typeof old==='function')return old.apply(this,arguments);
   if(routeMap[tab])location.assign(routeMap[tab]);
 };
 window.addEventListener('DOMContentLoaded',()=>{
   const view=new URLSearchParams(location.search).get('view');
   if(view && routeMap[view]){
     setTimeout(()=>{try{window.kasiscorePrimaryNav(view,document.querySelector(`[data-primary="${view}"]`))}catch(_){}},0);
   }
 });
})();


(function(){
 function wire(){
   document.querySelectorAll('button,a').forEach(el=>{
     const txt=(el.textContent||'').trim().toLowerCase();
     if(txt==='sign in'||txt==='login'){
       el.style.pointerEvents='auto';
       el.onclick=e=>{e.preventDefault();e.stopPropagation();location.assign('/login')};
     }else if(txt==='sign up'||txt==='signup'||txt==='register'){
       el.style.pointerEvents='auto';
       el.onclick=e=>{e.preventDefault();e.stopPropagation();location.assign('/signup')};
     }
   });
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',wire):wire();
})();


(function(){
 function findFilters(){
   const sels=[...document.querySelectorAll('select')];
   return {
     date:sels.find(s=>/today|tomorrow|yesterday/i.test(s.textContent||'') || /date|day/i.test(s.id||'')),
     league:sels.find(s=>/all leagues/i.test(s.textContent||'') || /league/i.test(s.id||''))
   };
 }
 async function apply(){
   const f=findFilters(),date=String(f.date?.value||'today'),league=String(f.league?.value||'ALL');
   if(f.date)f.date.disabled=true;if(f.league)f.league.disabled=true;
   try{
     const q={league:league||'ALL',type:date||'today',refresh:0};
     const [fx,pr]=await Promise.allSettled([
       get('/fixtures/with-odds',q),
       get('/ai-predictions',{league:league||'ALL',refresh:0})
     ]);
     if(fx.status==='fulfilled'){
       const v=fx.value||{};S.fixtures=v.matches||v.fixtures||[];S.qualification=v;
       try{renderFixtures();renderOverview()}catch(_){}
     }
     if(pr.status==='fulfilled'){
       const v=pr.value||{};S.predictions=v.predictions||v.matches||[];
       try{renderPredictions();renderTipOfDay();renderOverview()}catch(_){}
     }
   }finally{if(f.date)f.date.disabled=false;if(f.league)f.league.disabled=false}
 }
 function wire(){
   const f=findFilters();
   [f.date,f.league].filter(Boolean).forEach(s=>{
     s.style.pointerEvents='auto';
     s.addEventListener('change',apply);
   });
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',wire):wire();
})();


(function(){
 async function add(card,id){
   if(!card||card.dataset.ks214Lineups)return;card.dataset.ks214Lineups='1';
   try{
     const d=await get('/match/lineups/'+Number(id)),rows=d.lineups||[];if(!rows.length)return;
     const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
     const box=document.createElement('div');box.className='ks214-lineups';
     box.innerHTML=rows.map(r=>`<div class="card" style="margin-top:10px"><h4>${esc(r.team?.name||'Team')} ${r.formation?`· Formation ${esc(r.formation)}`:''}</h4>
       <div><b>Starting XI</b></div><div class="sub">${(r.startingXI||[]).map(p=>`${p.number??''} ${esc(p.name||'')}`).join(' · ')||'No data available'}</div>
       <div style="margin-top:7px"><b>Substitutes</b></div><div class="sub">${(r.substitutes||[]).map(p=>`${p.number??''} ${esc(p.name||'')}`).join(' · ')||'No data available'}</div></div>`).join('');
     card.appendChild(box);
   }catch(_){}
 }
 window.ks214EnrichLineups=function(root=document){
   root.querySelectorAll('[data-fixture-id]').forEach(c=>{const id=Number(c.dataset.fixtureId);if(id)add(c,id)});
 };
 // v274: lineups are loaded on demand/dedicated match views, not preloaded across homepage cards.
})();


(function(){
 function showAuthRoute(){
   const p=(location.pathname||'/').replace(/\/+$/,'')||'/';
   if(p!='/login' && p!='/signup' && p!='/register') return false;

   // Keep the route in the address bar and display the existing production auth form.
   document.body.classList.add('ks-auth-route');
   const open=()=>{
     if(p==='/login'){
       if(typeof window.openAdminLogin==='function') window.openAdminLogin();
       if(typeof window.switchAuthTab==='function') window.switchAuthTab('login');
     }else{
       if(typeof window.openRegister==='function') window.openRegister();
       else if(typeof window.openAdminLogin==='function') window.openAdminLogin();
       if(typeof window.switchAuthTab==='function') window.switchAuthTab('register');
     }
   };
   setTimeout(open,0);
   return true;
 }
 function wireAuthButtons(){
   document.querySelectorAll('button,a').forEach(el=>{
     const txt=(el.textContent||'').trim().toLowerCase();
     if(txt==='sign in'||txt==='login'){
       el.style.pointerEvents='auto';
       el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();location.assign('/login')},{capture:true});
     }else if(txt==='sign up'||txt==='signup'||txt==='create account'||txt==='register'){
       // Do not hijack buttons inside the auth modal itself.
       if(el.closest('#adminLoginModal')) return;
       el.style.pointerEvents='auto';
       el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();location.assign('/signup')},{capture:true});
     }
   });
 }
 function init(){wireAuthButtons();showAuthRoute()}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();

 // Closing a dedicated auth route returns to Home instead of leaving an empty /login URL.
 const oldClose=window.closeAdminLogin;
 window.closeAdminLogin=function(){
   if(typeof oldClose==='function') oldClose.apply(this,arguments);
   if(/^\/(login|signup|register)\/?$/i.test(location.pathname)) location.assign('/');
 };
})();


(function(){
 const footballOffline='Football data temporarily unavailable. Data will appear automatically when the football data service is available.';
 function cleanLoadingStates(){
   document.querySelectorAll('.empty').forEach(el=>{
     const t=(el.textContent||'').trim().toLowerCase();
     if(t.includes('loading current bookmaker odds')||t==='loading fixtures…'||t==='loading fixtures...'||t==='loading predictions…'||t==='loading predictions...')el.textContent=footballOffline;
     if(t.includes('loading cricket scores'))el.textContent='Cricket data temporarily unavailable. Scores will appear when the cricket data service is available.';
   });
 }
 window.kcNewsArticleHref=function(n){
   if(n?.articlePath)return n.articlePath;
   const u=n?.publisherUrl||n?.resolvedUrl||n?.publisherLink||n?.link||'';
   const title=String(n?.title||'sports-news').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,110)||'sports-news';
   return u?'/news/'+title+'?source='+encodeURIComponent(u):'#';
 };
 function upgradeMedia(){
   document.querySelectorAll('.home-feature-card img,.ks204-news-card img,.news-item img').forEach(img=>{img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer'});
 }
 const obs=new MutationObserver(upgradeMedia);obs.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',()=>{upgradeMedia();setTimeout(cleanLoadingStates,9000)});
 setTimeout(cleanLoadingStates,12000);
})();


(function(){
 function arrangeHome(){
   const overview=document.getElementById('overview');if(!overview)return;
   overview.classList.add('kasi-editorial-home');
   const grids=Array.from(overview.children).filter(el=>el.classList&&el.classList.contains('grid'));
   if(grids[0])grids[0].classList.add('kasi-home-kpis');
   if(grids[1])grids[1].classList.add('kasi-home-secondary-kpis');
   const ordered=[document.getElementById('homeNewsSection'),document.getElementById('totdCard'),grids[0],grids[1],document.getElementById('homeOddsSection'),document.getElementById('homeVideosSection')];
   ordered.forEach(el=>{if(el)overview.appendChild(el)});
 }
 window.showKasiTopAd=function(content){
   const value=(content instanceof Node)?content:String(content||'').trim();
   if(!value){window.hideKasiTopAd();return;}
   let slot=document.getElementById('kasiTopAdSlot');
   if(!slot){
     slot=document.createElement('div');
     slot.id='kasiTopAdSlot';slot.className='kasi-top-ad-slot';
     slot.setAttribute('aria-label','Advertisement');
     document.body.insertBefore(slot,document.body.firstChild);
   }
   slot.replaceChildren();
   if(content instanceof Node)slot.appendChild(content);else slot.innerHTML=value;
   slot.hidden=false;
 };
 window.hideKasiTopAd=function(){
   const slot=document.getElementById('kasiTopAdSlot');
   if(slot)slot.remove();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrangeHome);else arrangeHome();
})();


(function(){
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let offset=0, loading=false;
  function ago(v){
    const t=Date.parse(String(v||'')); if(!Number.isFinite(t))return '';
    const d=Date.now()-t, m=Math.max(0,Math.floor(d/60000));
    if(m<1)return 'Just now'; if(m<60)return m+' min ago';
    const h=Math.floor(m/60); if(h<24)return h+' hour'+(h===1?'':'s')+' ago';
    const dt=new Date(t), now=new Date();
    if(dt.toDateString()===now.toDateString())return 'Today, '+dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    return dt.toLocaleDateString([],{day:'numeric',month:'short'})+' · '+dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  }
  function fallback(sport){
    const s=String(sport||'SPORT').toUpperCase();
    return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#10161e"/><text x="55" y="245" font-family="Arial" font-size="30" fill="#22b8d6">KSn</text><text x="55" y="310" font-family="Arial" font-weight="700" font-size="48" fill="#fff">${s} NEWS</text></svg>`);
  }
  function card(n){
    const path=n.articlePath||'#', img=String(n.image||n.ogImage||n.publisherImage||'').trim();
    if(!/^https?:\/\//i.test(img))return '';
    return `<article class="ks-news-card"><a href="${E(path)}">
      <img class="ks-news-image" src="${E(img)}" alt="${E(n.title||'Sports news')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.ks-news-card')?.remove()" fetchpriority="low">
      <div class="ks-news-body"><span class="badge">${E(n.sport||'Sport')}</span>
      <h3>${E(n.title||'Sports headline')}</h3>
      <div class="ks-news-desc">${E(n.description||n.summary||'Open article details inside Kasi Sports News.')}</div>
      <div class="ks-news-meta">${E(n.publisher||n.source||'Sports News')} · ${E(ago(n.published))}</div></div>
    </a></article>`;
  }
  async function requestNews(off,limit){
    return await get('/sports/news',{sport:'all',limit,offset:off,_ts:Date.now()});
  }
  window.loadKasiCountryNews=async function(){
    if(loading)return; loading=true; offset=0;
    const grid=document.getElementById('homeCountryNewsGrid'), bull=document.getElementById('homeLatestNewsBulletin');
    if(grid)grid.innerHTML='<div class="empty">Loading sports news…</div>';
    if(bull)bull.innerHTML='<div class="empty">Loading latest news…</div>';
    try{
      const results=await Promise.allSettled([requestNews(0,12),get('/sports/news/bulletin',{limit:5,_ts:Date.now()})]);
      const d=results[0].status==='fulfilled'?results[0].value:{items:[]};
      const b=results[1].status==='fulfilled'?results[1].value:{items:(d.items||[]).slice(0,5)};
      const items=d.items||[];
      if(grid)grid.innerHTML=items.length?items.map(card).join(''):'<div class="empty">No recent sports news is available right now.</div>';
      const bulletinItems=(b.items&&b.items.length?b.items:(items||[]).slice(0,5));
      if(bull)bull.innerHTML=bulletinItems.map((n,i)=>`<a href="${E(n.articlePath||'#')}"><span class="ks-breaking">${i===0?'BREAKING':'LATEST'}</span>${E(n.title||'Sports headline')}<div class="ks-news-meta">${E(ago(n.published))}</div></a>`).join('')||'<div class="empty">No breaking headlines available.</div>';
      offset=items.length;
    }catch(e){
      if(grid)grid.innerHTML='<div class="empty">Sports news temporarily unavailable.</div>';
      if(bull)bull.innerHTML='<div class="empty">Latest news temporarily unavailable.</div>';
    }finally{loading=false}
  };
  window.loadMoreKasiCountryNews=async function(){
    if(loading)return;loading=true;const grid=document.getElementById('homeCountryNewsGrid');
    try{const d=await requestNews(offset,12),items=d.items||[];if(grid&&items.length)grid.insertAdjacentHTML('beforeend',items.map(card).join(''));offset+=items.length;
      const btn=document.getElementById('ksNewsLoadMore');if(btn&&!items.length)btn.style.display='none';
    }finally{loading=false}
  };
  document.addEventListener('DOMContentLoaded',()=>setTimeout(window.loadKasiCountryNews,400));
  if(!window.__ksNewsRefreshTimer)window.__ksNewsRefreshTimer=setInterval(()=>{if(document.visibilityState==='visible')window.loadKasiCountryNews()},300000);
})();


(function(){
 window.openKasiNewsArticle=function(url,title){
   if(!url)return;
   if(String(url).startsWith('/news/')){ location.href=url; return; }
   const slug=String(title||'sports-news').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,110)||'sports-news';
   location.href='/news/'+slug+'?source='+encodeURIComponent(url);
 };
 window.openKasiNews=function(idx){
   const n=(window.__ksNewsItems||[])[Number(idx)];if(!n)return;
   location.href=n.articlePath||('/news/article?source='+encodeURIComponent(n.originalUrl||n.publisherUrl||n.resolvedUrl||n.link||''));
 };
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let timer;
 const input=document.getElementById('jgEntitySearch');
 if(input){input.placeholder='Search football, rugby or cricket teams, players or competitions';input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{if(input.value.trim().length>=2)window.kasiscoreEntitySearch()},300)})}
 window.kasiscoreEntitySearch=async function(){
   const q=document.getElementById('jgEntitySearch')?.value.trim(),type=document.getElementById('jgEntityType')?.value||'auto',el=document.getElementById('jgEntityResult');
   if(!el||!q||q.length<2){if(el)el.innerHTML='<div class="jg-empty">Enter at least 2 characters.</div>';return}
   el.innerHTML='<div class="jg-empty">Searching sports data…</div>';
   try{
     const d=await get('/sports/intelligence/search',{q,entity_type:type,limit:18});
     const rows=d.results||[];
     el.innerHTML=rows.length?rows.map(x=>`<div class="jg-item" onclick="${x.route?`location.href='${E(x.route)}'`:''}"><div style="display:flex;gap:10px;align-items:center">${(x.logo||x.photo)?`<img src="${E(x.logo||x.photo)}" loading="lazy" style="width:38px;height:38px;object-fit:contain;border-radius:50%" onerror="this.style.display='none'" decoding="async" fetchpriority="low">`:''}<div><div class="title">${E(x.name)}</div><div class="meta">${E(x.sport||'sport')} · ${E(x.type||'entity')}${x.team?' · '+E(x.team):''}${x.country?' · '+E(x.country):''}${x.league?' · '+E(x.league):''}</div></div></div><span class="badge">${E(x.sport||'SPORT')}</span></div>`).join(''):'<div class="jg-empty">No matching sports entities are currently available.</div>';
   }catch(e){el.innerHTML='<div class="jg-empty">Sports search is temporarily unavailable.</div>'}
 };
})();


(function(){
  function cleanSport(v){ return String(v||'football').toLowerCase().replace(/[^a-z0-9_-]/g,'') || 'football'; }
  function cleanId(v){ return encodeURIComponent(String(v||'').trim()); }
  function cleanLeague(v){ return String(v||'').trim(); }

  // STATS: dedicated browser page.
  window.openStatsPanel = function(id, sport='football', league=''){
    id=String(id||'').trim(); if(!id)return;
    const sp=cleanSport(sport);
    if(sp==='football') window.location.assign('/matches/'+cleanId(id)+'/stats');
    else {
      let url='/match/'+sp+'/'+cleanId(id);
      if(cleanLeague(league)) url+='?league='+encodeURIComponent(cleanLeague(league));
      window.location.assign(url);
    }
  };
  window.openLiveMatchPage = window.openStatsPanel;

  // PLAYERS: dedicated browser page. Keep signed public refs intact.
  window.openKasiPlayerPage = function(playerId, playerName=''){
    const ref=String(playerId||'').trim();
    if(!ref)return;
    window.location.assign('/players/'+cleanId(ref));
  };
  window.openPlayerPage = window.openKasiPlayerPage;

  // Intercept legacy player links that old components may still create.
  document.addEventListener('click',function(e){
    const a=e.target.closest('a[href]');
    if(!a)return;
    const href=a.getAttribute('href')||'';
    const m=href.match(/^\/player\/([^?#]+)|^\/players\/([^?#]+)/i);
    if(!m)return;
    const ref=m[1]||m[2]; if(!ref)return;
    e.preventDefault();
    window.location.assign('/players/'+ref);
  },true);
})();


(function(){
  const LIVE_ALLOWED=new Set(['overview','live']);

  function visibleTab(){
    const el=[...document.querySelectorAll('section.tab')].find(x=>!x.classList.contains('hidden'));
    return el?.id||'overview';
  }

  function enforceLiveWidget(tabId){
    const w=document.getElementById('liveScoresWidget');
    if(!w)return;
    const id=tabId||visibleTab();

    w.classList.remove('ks-home-ticker-only','ks-live-widget-off','ks-live-widget-home','ks-live-widget-live');

    if(id==='overview'){
      w.classList.add('ks-live-widget-home');
      w.style.setProperty('display','block','important');
    }else if(id==='live'){
      w.classList.add('ks-live-widget-live');
      w.style.setProperty('display','block','important');
    }else{
      w.classList.add('ks-live-widget-off');
      w.style.setProperty('display','none','important');
    }
    document.documentElement.dataset.activeKasiTab=id;
  }

  // Final wrapper: let each destination widget render its own data, then strictly
  // hide the global Live Matches widget everywhere except Home/Live.
  const previousShowTab=window.showTab;
  if(typeof previousShowTab==='function'){
    window.showTab=function(id,btn){
      const result=previousShowTab.apply(this,arguments);
      enforceLiveWidget(id);
      return result;
    };
  }

  // Neutralise the older v237 helper that forced the Live widget visible on every tab.
  window.kasiEnforceLiveWidget=enforceLiveWidget;

  function boot(){
    enforceLiveWidget(visibleTab());
    // Hash/direct-page navigation can switch the active section shortly after startup.
    setTimeout(()=>enforceLiveWidget(visibleTab()),100);
    setTimeout(()=>enforceLiveWidget(visibleTab()),700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const getJSON=async(url,params={})=>{
   const q=new URLSearchParams(params),c=new AbortController(),t=setTimeout(()=>c.abort(),3500);
   try{const r=await fetch(url+(q.size?'?'+q:''),{signal:c.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error(String(r.status));return await r.json()}
   finally{clearTimeout(t)}
 };

 // SEARCH is a real tab. It never falls through to Home/Sports News.
 window.ks245Search=async function(){
   const input=document.getElementById('ks245SearchInput'),el=document.getElementById('ks245SearchResults');
   const q=String(input?.value||'').trim();if(!el)return;
   if(q.length<2){el.innerHTML='<div class="empty">Enter at least 2 characters.</div>';return}
   el.innerHTML='<div class="empty">Searching teams and players…</div>';
   try{
     const d=await getJSON('/directory/search',{q});
     const card=(x,kind)=>{
       const ref=String(x.publicRef||x.ref||x.id||'');if(!ref)return '';
       const media=x.badge||x.logo||x.photo||'';
       return `<div class="ks245-item" role="link" tabindex="0" data-url="/${kind==='team'?'teams':'players'}/${encodeURIComponent(ref)}">${media?`<img src="${E(media)}" loading="lazy" onerror="this.remove()" decoding="async" fetchpriority="low">`:''}<div><b>${E(x.name||'Unknown')}</b><div class="sub">${E(kind==='team'?(x.country||x.league||'Team'):(x.team||x.position||'Player'))}</div></div></div>`;
     };
     const rows=[...(d.teams||[]).map(x=>card(x,'team')),...(d.players||[]).map(x=>card(x,'player'))].filter(Boolean);
     el.innerHTML=rows.length?`<div class="ks245-results">${rows.join('')}</div>`:'<div class="empty">No matching teams or players found.</div>';
     el.querySelectorAll('[data-url]').forEach(x=>{
       const go=()=>location.assign(x.dataset.url);
       x.addEventListener('click',go);x.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
     });
   }catch(_){el.innerHTML='<div class="empty">Search data is temporarily unavailable.</div>'}
 };
 document.getElementById('ks245SearchInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')ks245Search()});

 // Make Search an authoritative destination even though old navigation code predates the Search tab.
 const nav=window.kasiscorePrimaryNav;
 window.kasiscorePrimaryNav=function(tab,btn){
   if(tab==='search'){
     document.body.classList.remove('ks-admin-open');
     document.querySelectorAll('section.tab').forEach(x=>x.classList.toggle('hidden',x.id!=='search'));
     document.querySelectorAll('[data-primary]').forEach(x=>x.classList.toggle('active',x.dataset.primary==='search'));
     document.getElementById('liveScoresWidget')?.style.setProperty('display','none','important');
     history.replaceState(null,'','/?view=search');
     setTimeout(()=>document.getElementById('ks245SearchInput')?.focus(),20);
     return;
   }
   document.body.classList.remove('ks-admin-open');
   return typeof nav==='function'?nav.apply(this,arguments):undefined;
 };

 // ADMIN is an overlay destination: hide dashboard/news behind it while open.
 const oldToggle=window.toggleAdminWidget,oldClose=window.closeAdminWidget;
 window.toggleAdminWidget=function(btn){
   if(typeof oldToggle==='function')oldToggle.apply(this,arguments);
   const w=document.getElementById('kasiscoreAdminWidget'),open=w&&getComputedStyle(w).display!=='none';
   document.body.classList.toggle('ks-admin-open',!!open);
   if(open)document.getElementById('liveScoresWidget')?.style.setProperty('display','none','important');
 };
 window.closeAdminWidget=function(){
   if(typeof oldClose==='function')oldClose.apply(this,arguments);
   document.body.classList.remove('ks-admin-open');
   const active=[...document.querySelectorAll('section.tab')].find(x=>!x.classList.contains('hidden'))?.id||'overview';
   if(typeof window.kasiEnforceLiveWidget==='function')window.kasiEnforceLiveWidget(active);
 };

 // TIP OF THE DAY: fixtures existing is not the same thing as predictions existing.
 // If AI predictions are empty, retry once independently. Never call fixtures "predictions".
 async function recoverPredictions(){
   if((window.S?.predictions||[]).length)return true;
   if(!(window.S?.fixtures||[]).length)return false;
   try{
     const lg=document.getElementById('league')?.value||'ALL';
     const d=await getJSON('/ai-predictions',{league:lg,type:'upcoming',limit:100,refresh:0});
     const rows=d.predictions||d.matches||[];
     if(rows.length){
       S.predictions=rows;
       try{renderPredictions();renderTipOfDay();renderOverview()}catch(_){}
       return true;
     }
   }catch(_){}
   const body=document.getElementById('totdBody'),conf=document.getElementById('totdConf');
   if(body)body.innerHTML='<div class="empty" style="padding:16px">Fixtures are available, but no prediction has been generated yet. Tip of the Day will appear when prediction data is available.</div>';
   if(conf)conf.textContent='Prediction pending';
   return false;
 }
 window.ks245RecoverPredictions=recoverPredictions;

 // Run after the older startup scripts have populated fixtures.
 setTimeout(recoverPredictions,2200);
 setTimeout(()=>{if(!(window.S?.predictions||[]).length)recoverPredictions()},6500);
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const J=async(path,params={})=>{const q=new URLSearchParams(params),r=await fetch(path+(q.size?'?'+q:''),{headers:{Accept:'application/json'}});const ct=(r.headers.get('content-type')||'').toLowerCase();if(!r.ok){let msg='Service request failed ('+r.status+')';if(ct.includes('json')){try{const x=await r.json();msg=x.detail||x.error||msg}catch(_){}}throw Error(msg)}if(!ct.includes('json'))throw Error('Data service returned an unexpected response');return r.json()};
 const dt=x=>{try{return new Date(x).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch(_){return x||'—'}};
 const widgetMatch=(raw)=>{
   const g=raw||{},teams=(g.teams&&typeof g.teams==='object')?g.teams:{},ho=teams.home||{},ao=teams.away||{};
   const lg=(g.league&&typeof g.league==='object')?g.league:{},comp=(g.competition&&typeof g.competition==='object')?g.competition:{},tour=(g.tournament&&typeof g.tournament==='object')?g.tournament:{},cat=(g.category&&typeof g.category==='object')?g.category:{};
   return {...g,
     id:g.id||g.fixtureId||g.providerFixtureId||g.fixture?.id||'',
     sport:String(g.sport||'football').toLowerCase(),
     home:g.home||g.homeTeam||g.homeName||ho.name||'Home', away:g.away||g.awayTeam||g.awayName||ao.name||'Away',
     homeId:g.homeId||g.homeTeamId||ho.id||'', awayId:g.awayId||g.awayTeamId||ao.id||'',
     homeLogo:g.homeLogo||g.homeBadge||ho.logo||ho.badge||'', awayLogo:g.awayLogo||g.awayBadge||ao.logo||ao.badge||'',
     league:(typeof g.league==='string'?g.league:'')||g.leagueName||lg.name||comp.name||tour.name||'Other matches',
     country:g.country||g.countryName||lg.country||cat.name||comp.country||'International',
     date:g.date||g.datetime||g.startTime||g.commenceTime||'', status:g.status||g.statusName||g.state||'',
     homeScore:g.homeScore??g.homeGoals??g.goals?.home??null, awayScore:g.awayScore??g.awayGoals??g.goals?.away??null
   };
 };
 const gameRow=(raw,live=false)=>{
   const g=widgetMatch(raw),sp=g.sport, id=String(g.id||g._afootFixtureId||'');
   const url=`/match/${encodeURIComponent(sp)}/${encodeURIComponent(id)}${sp!=='football'&&g.leagueSlug?'?league='+encodeURIComponent(g.leagueSlug):''}`;
   let score=live?`${g.homeScore??'—'} – ${g.awayScore??'—'}`:'';
   if(sp==='cricket'&&live)score=`${g.homeScore??'—'} / ${g.awayScore??'—'}`;
   return `<div class="${live?'v246-live':'v246-fixture'}"><div><span class="v246-sport">${E(sp)}</span><div class="v246-meta">${E(dt(g.date||g.datetime))}</div></div><div class="v246-teams"><b>${g.homeLogo?`<img class="ks-team-badge" src="${E(g.homeLogo)}" loading="lazy" onerror="this.remove()" fetchpriority="low">`:''}${E(g.home)} ${score?'<span class="ks-match-score">'+E(score)+'</span>':''} ${live?'':'vs'} ${E(g.away)}${g.awayLogo?`<img class="ks-team-badge" src="${E(g.awayLogo)}" loading="lazy" onerror="this.remove()" fetchpriority="low">`:''}</b><div class="v246-meta">${E(g.country)} · ${E(g.league)} ${g.status?'· '+E(g.status):''}</div></div><div class="v246-action"><a class="match-stats-btn" href="${url}">Stats</a></div></div>`;
 };

 async function loadMultiFixtures(){
   for(const [sp,id] of [['rugby','v246RugbyFixtures'],['cricket','v246CricketFixtures']]){
     const el=document.getElementById(id);if(!el)continue;
     try{const d=await J(`/sports/${sp}/scores`);const rows=(d.games||[]).filter(x=>!['post','final','ft'].includes(String(x.statusShort||'').toLowerCase())).slice(0,15);
       el.innerHTML=rows.length?rows.map(x=>gameRow(x)).join(''):'<div class="empty">No games currently available.</div>';
     }catch(e){el.innerHTML=`<div class="empty">Unable to load data: ${E(e.message)}</div>`}
   }
 }
 function groupedLive(rows){
   const groups=new Map();
   (rows||[]).forEach(raw=>{const x=widgetMatch(raw),country=x.country,league=x.league,key=country+'|||'+league;if(!groups.has(key))groups.set(key,{country,league,rows:[]});groups.get(key).rows.push(x)});
   return [...groups.values()].map(g=>`<section class="ks-match-group"><div class="ks-match-group-head"><b>${E(g.country)}</b><span>${E(g.league)}</span><em>${g.rows.length} live</em></div>${g.rows.map(x=>gameRow(x,true)).join('')}</section>`).join('');
 }
 async function loadMultiLive(){
   const el=document.getElementById('liveList');if(!el)return;
   try{const d=await J('/sports/live');const rows=d.games||[];
     el.innerHTML=rows.length?groupedLive(rows):'<div class="empty">No Football, Rugby or Cricket games are live right now.</div>';
     const c=document.getElementById('liveTabCount');if(c)c.textContent=rows.length+' live';
   }catch(e){el.innerHTML=`<div class="empty">Live Unable to load data: ${E(e.message)}</div>`}
 }
 const predRow=(x,sp)=>{
   const p=x.prediction||{},conf=Number(p.confidence||x.confidence||0),pick=p.bestPick||p.winner||x.bestOutcome||'—';
   const id=x.id||x.fixtureId||x.fixture?.id||'';
   return `<div class="v246-pred"><div><span class="v246-sport">${E(sp)}</span><div class="v246-meta">${E(dt(x.date||x.datetime||x.fixture?.date))}</div></div><div class="v246-teams"><b>${E(x.home||x.homeTeam||'Home')} vs ${E(x.away||x.awayTeam||'Away')}</b><div class="v246-meta">${E(x.league||'')} · Kasi: ${E(pick)} · ${conf.toFixed(1)}%</div></div><div class="v246-action">${id?`<a class="match-stats-btn" href="/match/${E(sp)}/${encodeURIComponent(id)}">Stats</a>`:''}</div></div>`;
 };
 async function loadMultiPredictions(){
   for(const [sp,path,id] of [['rugby','/sports/rugby/predictions','v246RugbyPredictions'],['cricket','/sports/cricket/predictions','v246CricketPredictions']]){
     const el=document.getElementById(id);if(!el)continue;
     try{const d=await J(path);const rows=d.predictions||[];
       el.innerHTML=rows.length?rows.slice(0,12).map(x=>predRow(x,sp)).join(''):'<div class="empty">No games currently available.</div>';
     }catch(e){el.innerHTML=`<div class="empty">Unable to load data: ${E(e.message)}</div>`}
   }
 }
 async function loadTipPipeline(){
   const body=document.getElementById('totdBody'),badge=document.getElementById('totdConf'),y=document.getElementById('totdYesterday');if(!body)return;
   body.innerHTML='<div class="empty">Loading today’s fixture → odds → prediction pipeline…</div>';
   try{const d=await J('/tip-of-day'),rows=d.tips||[];
     if(!rows.length){body.innerHTML=`<div class="empty">Genuine no-data error${d.error?': '+E(d.error):'.'}</div>`;if(badge)badge.textContent='No data';}
     else{if(badge)badge.textContent=d.state==='current'?'Current top 2':'Previous best 2';
       body.innerHTML=rows.map(x=>{const p=x.prediction||{},label=d.state==='previous'?` · Original match date ${E(x.originalMatchDate||String(x.datetime||'').slice(0,10))}`:'';
         return `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${E(x.home)} vs ${E(x.away)}</b><div class="sub">${E(p.bestPick||p.winner||x.bestOutcome||'—')} · ${Number(p.confidence||x.confidence||0).toFixed(1)}%${label}</div></div>`}).join('');}
     if(y)y.innerHTML='<div style="font-size:11px;font-weight:800;margin-bottom:7px">Yesterday · predicted vs outcome</div>'+((d.yesterday||[]).length?(d.yesterday||[]).map(x=>`<div style="padding:6px 0;border-top:1px solid var(--line);font-size:11px">${E(x.home)} vs ${E(x.away)} · Pred: <b>${E(x.predicted)}</b> · Actual: <b>${E(x.homeGoals??'—')}-${E(x.awayGoals??'—')}</b> · ${x.correct?'Correct':'Missed'}</div>`).join(''):'<div class="sub">No stored predictions from yesterday have been resolved yet.</div>');
   }catch(e){body.innerHTML=`<div class="empty">Genuine no-data error: ${E(e.message)}</div>`;if(badge)badge.textContent='Error'}
 }
 window.loadFinishedGames=async function(){
   const el=document.getElementById('finishedGamesList');if(!el)return;el.innerHTML='<div class="empty">Loading recent finished games…</div>';
   try{const d=await J('/finished-games',{days:3,limit:60,league:document.getElementById('league')?.value||'ALL'}),rows=d.matches||[];
     document.getElementById('finishedGamesCount').textContent=rows.length+' games';
     el.innerHTML=rows.length?rows.map(m=>{const id=m.id||m.fixtureId||m._afootFixtureId||'',hs=m.homeScore??m.goals?.home??'',as=m.awayScore??m.goals?.away??'',score=m.score||((hs!==''||as!=='')?`${hs} - ${as}`:'FT');return `<div class="v246-fixture"><div><b>${E(m.league||m.competition||'Competition')}</b><div class="v246-meta">${E(dt(m.datetime||m.date))}</div></div><div class="v246-teams"><b>${E(m.home||m.homeTeam||'Home')} <span style="display:inline-block;min-width:58px;text-align:center;color:#38bdf8">${E(score)}</span> ${E(m.away||m.awayTeam||'Away')}</b><div class="v246-meta">Final score</div></div><div class="v246-action"><a class="match-stats-btn" href="/matches/${encodeURIComponent(id)}/stats">Stats</a></div></div>`}).join(''):'<div class="empty">No finished games in the selected period.</div>';
   }catch(e){el.innerHTML=`<div class="empty">Could not load finished games: ${E(e.message)}</div>`}
 };
 window.ks245Search=async function(){
   const q=String(document.getElementById('ks245SearchInput')?.value||'').trim(),el=document.getElementById('ks245SearchResults');if(!el)return;
   if(q.length<2){el.innerHTML='<div class="empty">Enter at least 2 characters.</div>';return}
   el.innerHTML='<div class="empty">Searching global sports data…</div>';
   try{const d=await J('/sports/directory/search',{q,sport:'all'}),rows=[];
     (d.teams||[]).forEach(x=>{const sp=x.sport||'football',ref=x.publicRef||x.ref||x.id||'';rows.push(`<div class="v246-search"><b>TEAM</b><div><b>${E(x.name)}</b><div class="v246-meta">${E(sp)} · ${E(x.country||x.league||'')}</div></div><div><a href="${sp==='football'?'/teams/'+encodeURIComponent(ref):'/sports/'+sp+'/team/'+encodeURIComponent(ref)}">Open</a></div></div>`)});
     (d.players||[]).forEach(x=>{const sp=x.sport||'football',ref=x.publicRef||x.ref||x.id||'';rows.push(`<div class="v246-search"><b>PLAYER</b><div><b>${E(x.name)}</b><div class="v246-meta">${E(sp)} · ${E(x.team||x.position||'')}</div></div><div><a href="${sp==='football'?'/players/'+encodeURIComponent(ref):'/sports/'+sp+'/player/'+encodeURIComponent(ref)}">Open</a></div></div>`)});
     (d.competitions||[]).forEach(x=>rows.push(`<div class="v246-search"><b>COMP</b><div><b>${E(x.name)}</b><div class="v246-meta">${E(x.sport)} · ${E(x.country||'')}</div></div><div></div></div>`));
     (d.fixtures||[]).forEach(x=>rows.push(gameRow(x)));
     (d.results||[]).forEach(x=>rows.push(gameRow(x)));
     (d.standings||[]).forEach(x=>rows.push(`<div class="v246-search"><b>TABLE</b><div><b>${E(x.name||x.team||x.competition||'Standing')}</b><div class="v246-meta">${E(x.sport||'')} · ${E(x.rank??x.position??'')} ${x.points!=null?'· '+E(x.points)+' pts':''}</div></div><div></div></div>`));
     (d.statistics||[]).forEach(x=>rows.push(`<div class="v246-search"><b>STATS</b><div><b>${E(x.name||x.team||x.player||'Statistics')}</b><div class="v246-meta">${E(x.summary||x.value||x.sport||'')}</div></div><div></div></div>`));
     el.innerHTML=rows.length?rows.join(''):'<div class="empty">No sports-data results found.</div>';
   }catch(e){el.innerHTML=`<div class="empty">Search Unable to load data: ${E(e.message)}</div>`}
 };
 function refreshTipBar(){
   const bar=document.querySelector('#predictions .tipsheet-bar');if(!bar)return;
   const rows=(window.S?.predictions||[]).filter(x=>!x.isFinished);
   if(!rows.length){bar.querySelector('span').innerHTML='<strong>Today’s picks:</strong> Prediction data is loading.';return}
   const qualified=rows.filter(x=>typeof hasOdds==='function'&&hasOdds(x));
   const use=(qualified.length?qualified:rows).slice().sort((a,b)=>Number((b.prediction||{}).confidence||b.confidence||0)-Number((a.prediction||{}).confidence||a.confidence||0)).slice(0,4);
   bar.querySelector('span').innerHTML='<strong>Today’s picks ready:</strong> '+use.map(x=>{const o=x.odds||{},vals=[['Home Win',Number(o.homeWin)||0],['Draw',Number(o.draw)||0],['Away Win',Number(o.awayWin)||0]].filter(z=>z[1]>0);let book='Bookmaker pending';if(vals.length){const implied=vals.map(z=>[z[0],z[1],1/z[1]]),sum=implied.reduce((a,z)=>a+z[2],0),best=implied.slice().sort((a,b)=>b[2]-a[2])[0];book=`Bookmaker ${best[0]} ${(best[2]/sum*100).toFixed(1)}% @ ${best[1].toFixed(2)}`;}return `${E(x.home||x.homeTeam)} vs ${E(x.away||x.awayTeam)} — Kasi ${E((x.prediction||{}).bestPick||x.bestOutcome||'—')} ${Number((x.prediction||{}).confidence||x.confidence||0).toFixed(1)}% · ${E(book)}`}).join(' | ');
 }
 window.ks246RefreshTipBar=refreshTipBar;
 const prevNav=window.kasiscorePrimaryNav;
 window.kasiscorePrimaryNav=function(tab,btn){
   const r=typeof prevNav==='function'?prevNav.apply(this,arguments):undefined;
   if(tab==='fixtures'){loadMultiFixtures();setTimeout(()=>window.loadFinishedGames?.(),30)}
   if(tab==='live')setTimeout(loadMultiLive,20);
   if(tab==='predictions')setTimeout(()=>{loadTipPipeline();loadMultiPredictions();refreshTipBar()},20);
   return r;
 };
 setTimeout(refreshTipBar,2500);
})();


(function(){
 window.buildTipSheet=function(){
   const el=document.getElementById('tipsheetContent');if(!el)return;
   const all=(window.S?.predictions||[]).filter(x=>!x.isFinished);
   const valid=all.filter(x=>typeof hasOdds==='function'&&hasOdds(x));
   const rows=(valid.length?valid:all).slice().sort((a,b)=>Number((b.prediction||{}).confidence||b.confidence||0)-Number((a.prediction||{}).confidence||a.confidence||0)).slice(0,10);
   const day=new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
   const lines=rows.map(x=>{
     const p=x.prediction||{},o=x.odds||{},vals=[['Home Win',Number(o.homeWin)||0],['Draw',Number(o.draw)||0],['Away Win',Number(o.awayWin)||0]].filter(z=>z[1]>0);
     let book='Bookmaker pending';
     if(vals.length){const im=vals.map(z=>[z[0],z[1],1/z[1]]),sum=im.reduce((a,z)=>a+z[2],0),best=im.slice().sort((a,b)=>b[2]-a[2])[0];book=`${best[0]} ${(best[2]/sum*100).toFixed(1)}% @ ${best[1].toFixed(2)}`}
     return `${x.home||x.homeTeam||'Home'} vs ${x.away||x.awayTeam||'Away'} | Kasi: ${p.bestPick||x.bestOutcome||'—'} ${Number(p.confidence||x.confidence||0).toFixed(1)}% | Bookmaker: ${book}`;
   });
   const text=`KASI SPORTS NEWS — DAILY PICKS\n${day}\n${'─'.repeat(38)}\n${lines.length?lines.join('\n'):'Prediction data is not currently available.'}\n${'─'.repeat(38)}\nFor entertainment purposes. Bet responsibly.`;
   el.textContent=text;el.dataset.raw=text;
 };
})();


(function(){
 const known=new Set([...document.querySelectorAll('section.tab[id]')].map(x=>x.id));
 function current(){
   const v=[...document.querySelectorAll('section.tab')].find(x=>!x.classList.contains('hidden')&&known.has(x.id));
   return v?.id||'overview';
 }
 function isolate(id){
   id=known.has(id)?id:current();
   document.body.dataset.kasiTab=id;
   document.querySelectorAll('section.tab').forEach(x=>{
     if(known.has(x.id)){x.classList.toggle('hidden',x.id!==id);x.classList.toggle('ks-v249-active',x.id===id)}
   });
   const live=document.getElementById('liveScoresWidget');
   if(live){
     if(id==='overview'||id==='live') live.style.removeProperty('display');
     else live.style.setProperty('display','none','important');
   }
 }
 const oldPrimary=window.kasiscorePrimaryNav;
 window.kasiscorePrimaryNav=function(tab,btn){
   document.body.classList.remove('ks-admin-open');
   const r=typeof oldPrimary==='function'?oldPrimary.apply(this,arguments):undefined;
   if(known.has(tab))isolate(tab);
   return r;
 };
 const oldShow=window.showTab;
 window.showTab=function(id,btn){
   const r=typeof oldShow==='function'?oldShow.apply(this,arguments):undefined;
   if(known.has(id))isolate(id);
   return r;
 };
 const oldAdmin=window.toggleAdminWidget;
 window.toggleAdminWidget=function(btn){
   if(typeof oldAdmin==='function')oldAdmin.apply(this,arguments);
   const w=document.getElementById('kasiscoreAdminWidget');
   const open=!!w&&getComputedStyle(w).display!=='none';
   document.body.classList.toggle('ks-admin-open',open);
   if(open){
     document.querySelectorAll('section.tab').forEach(x=>x.classList.add('hidden'));
     document.getElementById('liveScoresWidget')?.style.setProperty('display','none','important');
   }else isolate(current());
 };
 const oldClose=window.closeAdminWidget;
 window.closeAdminWidget=function(){
   if(typeof oldClose==='function')oldClose.apply(this,arguments);
   document.body.classList.remove('ks-admin-open');isolate(current());
 };
 function boot(){isolate(current())}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const J=async(path,params={})=>{const q=new URLSearchParams(params),r=await fetch(path+(q.size?'?'+q:''),{headers:{Accept:'application/json'}});if(!r.ok){let x={};try{x=await r.json()}catch(_){};throw Error(x.detail||('Service request failed ('+r.status+')'))}return r.json()};
 const D=x=>{try{return new Date(x).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch(_){return x||'—'}};

 window.v249LoadFixtures=async function(){
   const el=document.getElementById('fixtureList');if(!el)return;
   el.innerHTML='<div class="empty">Loading upcoming fixtures…</div>';
   try{
     const d=await J('/fixtures/with-odds',{league:document.getElementById('league')?.value||'ALL',type:'upcoming'});
     const rows=(d.matches||[]).filter(x=>!x.isFinished).slice(0,60),groups=new Map();
     rows.forEach(raw=>{const x=widgetMatch(raw),country=x.country,league=x.league,key=country+'|||'+league;if(!groups.has(key))groups.set(key,{country,league,rows:[]});groups.get(key).rows.push(x)});
     el.innerHTML=rows.length?[...groups.values()].map(g=>`<section class="ks-match-group"><div class="ks-match-group-head"><b>${E(g.country)}</b><span>${E(g.league)}</span><em>${g.rows.length} match${g.rows.length===1?'':'es'}</em></div>${g.rows.map(x=>{const id=x.id||x.fixtureId||x._afootFixtureId||'',od=x.odds||{},has=Number(od.homeWin)>0&&Number(od.draw)>0&&Number(od.awayWin)>0;return `<div class="v249-row"><div><b>${E(D(x.datetime||x.date))}</b><div class="sub">${E(x.status||'Scheduled')}</div></div><div><b><img src="${E(x.homeLogo||x.homeBadge||'')}" onerror="this.style.display='none'" style="width:20px;height:20px;object-fit:contain;vertical-align:middle" loading="lazy" fetchpriority="low"> ${E(x.home||x.homeTeam||'Home')} vs ${E(x.away||x.awayTeam||'Away')} <img src="${E(x.awayLogo||x.awayBadge||'')}" onerror="this.style.display='none'" style="width:20px;height:20px;object-fit:contain;vertical-align:middle" loading="lazy" fetchpriority="low"></b></div><div class="ks-fixture-actions">${has?`<div class="ks-inline-odds"><span>1 <b>${E(Number(od.homeWin).toFixed(2))}</b></span><span>X <b>${E(Number(od.draw).toFixed(2))}</b></span><span>2 <b>${E(Number(od.awayWin).toFixed(2))}</b></span></div>`:'<span class="sub">Odds unavailable</span>'}${x.predictionEligible?' <span class="badge ok">Prediction ✓</span>':''} ${id?`<a class="match-stats-btn" href="/matches/${encodeURIComponent(id)}/stats">Stats</a>`:''}</div></div>`}).join('')}</section>`).join(''):'<div class="empty">No upcoming fixtures currently available.</div>';
   }catch(e){el.innerHTML=`<div class="empty">Fixture service error: ${E(e.message)}</div>`}
 };

 window.v249LoadDirectory=async function(sp='football',btn,q=''){ window.v250DirectorySport=sp;
   document.querySelectorAll('#v249TeamsPlayers .seg button').forEach(x=>x.classList.toggle('active',x===btn));
   const el=document.getElementById('v249DirectoryBody');if(!el)return;
   el.innerHTML=`<div class="empty">Loading ${E(sp)} teams and players…</div>`;
   try{
     const d=await J('/sports/directory',{sport:sp,q:String(q||'')});
     const teams=(d.teams||[]).slice(0,60),players=(d.players||[]).slice(0,60);
     const teamUrl=x=>sp==='football'?`/teams/${encodeURIComponent(x.publicRef||x.ref||x.id||'')}`:`/sports/${sp}/team/${encodeURIComponent(x.id||x.ref||'')}`;
     const playerUrl=x=>sp==='football'?`/players/${encodeURIComponent(x.publicRef||x.ref||x.id||'')}`:`/sports/${sp}/player/${encodeURIComponent(x.id||x.ref||'')}`;
     el.innerHTML=`<div class="v249-grid"><div><h3>${E(sp)} Teams</h3>${teams.length?teams.map(x=>`<div class="v249-row"><div>TEAM</div><div><b>${E(x.name)}</b><div class="sub">${E(x.country||x.league||'')}</div></div><a href="${teamUrl(x)}">Open</a></div>`).join(''):'<div class="empty">No teams currently available.</div>'}</div><div><h3>${E(sp)} Players</h3>${players.length?players.map(x=>`<div class="v249-row"><div>PLAYER</div><div><b>${E(x.name)}</b><div class="sub">${E(x.team||x.position||x.role||'')}</div></div><a href="${playerUrl(x)}">Open</a></div>`).join(''):'<div class="empty">No players currently available from the provider.</div>'}</div></div>`;
   }catch(e){el.innerHTML=`<div class="empty">${E(sp)} Unable to load data: ${E(e.message)}</div>`}
 };

 window.v249OpenLiveStats=function(sp,id,league=''){
   sp=String(sp||'football').toLowerCase();id=String(id||'').trim();if(!id)return;
   let url='/match/'+encodeURIComponent(sp)+'/'+encodeURIComponent(id);
   if(league)url+='?league='+encodeURIComponent(league);
   location.assign(url);
 };

 // Correct every v246 live Stats link after the live list renders.
 const oldLive=window.kasiscorePrimaryNav;
 window.kasiscorePrimaryNav=function(tab,btn){
   const r=typeof oldLive==='function'?oldLive.apply(this,arguments):undefined;
   if(tab==='fixtures')setTimeout(v249LoadFixtures,20);
   if(tab==='sportshub')setTimeout(()=>v249LoadDirectory('football',document.querySelector('#v249TeamsPlayers .seg button')),20);
   if(tab==='live')setTimeout(()=>{
     document.querySelectorAll('#liveList .v246-live').forEach(row=>{
       const a=row.querySelector('a.match-stats-btn');if(!a)return;
       const m=(a.getAttribute('href')||'').match(/^\/match\/([^/]+)\/([^?]+)/);if(!m)return;
       const sp=decodeURIComponent(m[1]),id=decodeURIComponent(m[2]);
       a.removeAttribute('href');a.href='javascript:void(0)';a.onclick=e=>{e.preventDefault();v249OpenLiveStats(sp,id)};
     });
   },250);
   return r;
 };
})();


(function(){
 function syncAdminPrivacy(){
   const authed=localStorage.getItem('faiAdmin')==='true' && !!localStorage.getItem('kasiscore_session');
   document.body.classList.toggle('ks-admin-authenticated',authed);
   const w=document.getElementById('kasiscoreAdminWidget');
   if(!w||getComputedStyle(w).display==='none')return;
   document.querySelectorAll('section.tab').forEach(x=>x.classList.add('hidden'));
   const tools=document.getElementById('adminWidgetTools'),login=document.getElementById('adminWidgetLogin'),st=document.getElementById('adminWidgetStatus');
   if(!authed){
     if(tools)tools.style.display='none';
     if(login)login.style.display='block';
     if(st)st.textContent='Admin login required for data analysis.';
   }
 }
 const prev=window.toggleAdminWidget;
 window.toggleAdminWidget=function(btn){const r=typeof prev==='function'?prev.apply(this,arguments):undefined;setTimeout(syncAdminPrivacy,0);return r};
 addEventListener('storage',syncAdminPrivacy);document.addEventListener('DOMContentLoaded',syncAdminPrivacy,{once:true});
})();


(function(){
 const validImage=src=>new Promise(resolve=>{
   if(!src)return resolve(false);
   const im=new Image(),t=setTimeout(()=>{im.onload=im.onerror=null;resolve(false)},1500);
   im.onload=()=>{clearTimeout(t);resolve(im.naturalWidth>0&&im.naturalHeight>0)};
   im.onerror=()=>{clearTimeout(t);resolve(false)};
   im.src=src;
 });
 async function gateVideos(){
   const roots=[document.getElementById('homeSportsVideos'),document.getElementById('homeHighlights'),document.getElementById('videoGrid')].filter(Boolean);
   for(const root of roots){
     const cards=[...root.querySelectorAll('a,article,.video-card,.ks-video-card')];
     await Promise.all(cards.map(async card=>{
       const img=card.querySelector('img');
       if(!img || !(await validImage(img.currentSrc||img.src||img.getAttribute('data-src')||''))) card.remove();
     }));
   }
 }
 const run=()=>setTimeout(gateVideos,0);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
 // v274: no page-wide video observer; video validation runs once/on explicit refresh.
})();


(function(){
 const clean=v=>encodeURIComponent(String(v??'').trim());
 const go=u=>window.location.assign(u);
 window.openStatsPanel=(id,sport='football',league='')=>{
   id=String(id||'').trim();if(!id)return;
   sport=String(sport||'football').toLowerCase();
   if(sport==='football')return go('/matches/'+clean(id)+'/stats');
   let u='/match/'+clean(sport)+'/'+clean(id);if(league)u+='?league='+clean(league);go(u);
 };
 window.openLiveMatchPage=window.openStatsPanel;
 window.v249OpenLiveStats=(sport,id,league='')=>window.openStatsPanel(id,sport,league);
 window.openKasiTeamPage=(id)=>{
   const ref=String(id??'').trim();if(!ref||ref==='0')return;
   go('/teams/'+clean(ref));
 };
 window.openKasiPlayerPage=(id)=>{
   const ref=String(id??'').trim();if(!ref||ref==='0')return;
   go('/players/'+clean(ref));
 };
 window.openPlayerPage=window.openKasiPlayerPage;
 window.kasiscoreOpenTeamDetail=id=>window.openKasiTeamPage(id);
 window.kasiscoreOpenPlayerDetail=id=>window.openKasiPlayerPage(id);
})();


(function(){
 async function bootDedicatedRoute(){
   const path=(location.pathname||'').replace(/\/+$/,'');
   const m=path.match(/^\/matches\/([1-9][0-9]{0,14})\/stats$/i);
   if(!m)return;
   const id=m[1];
   document.body.classList.add('ks-dedicated-stats');
   window.MATCH_STATS_FIXTURE_ID=id;
   window.MATCH_STATS_SPORT='football';
   window.MATCH_STATS_LEAGUE='';
   const section=document.getElementById('matchstats');
   if(!section)return;
   section.classList.remove('hidden');
   section.style.display='block';
   let back=document.getElementById('ksStatsBackHome');
   if(!back){
     back=document.createElement('a');
     back.id='ksStatsBackHome';back.href='#';back.textContent='← Back to Home';back.onclick=function(e){e.preventDefault();return window.kasiDashboardBack();};
     const body=document.getElementById('matchStatsPageBody');
     (body?.parentNode||section).insertBefore(back,body||section.firstChild);
   }
   if(typeof window.loadMatchStatsPage==='function')await window.loadMatchStatsPage(Number(id));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bootDedicatedRoute,0),{once:true});
 else setTimeout(bootDedicatedRoute,0);
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function enrich(){
   const card=document.getElementById('totdCard');if(!card)return;
   const raw=card.innerHTML||'';
   let id=card.dataset.fixtureId||card.getAttribute('data-fixture-id')||'';
   if(!id){const m=raw.match(/(?:fixture|match)[^0-9]{0,20}([1-9][0-9]{4,14})/i);if(m)id=m[1]}
   if(!id){
     const links=[...card.querySelectorAll('a[href]')];for(const a of links){const m=a.href.match(/(?:matches|match\/football)\/([1-9][0-9]{4,14})/);if(m){id=m[1];break}}
   }
   if(!id)return;
   let actions=card.querySelector('.ks-tip-actions');
   if(!actions){actions=document.createElement('div');actions.className='ks-tip-actions';card.appendChild(actions)}
   if(!actions.querySelector('[data-tip-stats]')){
     const a=document.createElement('a');a.dataset.tipStats='1';a.className='match-stats-btn';a.href='/matches/'+encodeURIComponent(id)+'/stats';a.textContent='Full Stats';actions.appendChild(a);
   }
   if(card.querySelector('.ks-tip-evidence'))return;
   try{
     const r=await fetch('/matches/'+encodeURIComponent(id)+'/tip-stats',{cache:'default'});if(!r.ok)return;const d=await r.json(),o=d.odds||{};
     const box=document.createElement('div');box.className='ks-tip-evidence';
     const h2h=(d.headToHead||[]).slice(-3).reverse().map(x=>`${E(x.home)} ${E(x.homeScore??'—')}–${E(x.awayScore??'—')} ${E(x.away)}`).join('<br>')||'No H2H data';
     box.innerHTML=`<div class="ks-tip-stat"><div class="ks-tip-team">${d.home?.badge?`<img src="${E(d.home.badge)}" alt="" loading="lazy" decoding="async" fetchpriority="low">`:''}<b>${E(d.home?.name||'Home')}</b></div><div>Home wins — last 5: <b>${E(d.home?.winsLast5??0)}/5</b></div></div><div class="ks-tip-stat"><div class="ks-tip-team">${d.away?.badge?`<img src="${E(d.away.badge)}" alt="" loading="lazy" decoding="async" fetchpriority="low">`:''}<b>${E(d.away?.name||'Away')}</b></div><div>Away wins — last 5: <b>${E(d.away?.winsLast5??0)}/5</b></div></div><div class="ks-tip-stat"><b>Head to head</b><div class="ks-tip-h2h">${h2h}</div></div><div class="ks-tip-stat"><b>1X2 Odds</b><div>${E(d.home?.name||'Home')}: <b>${E(o.home??'—')}</b></div><div>Draw: <b>${E(o.draw??'—')}</b></div><div>${E(d.away?.name||'Away')}: <b>${E(o.away??'—')}</b></div>${o.bookmaker?`<small>${E(o.bookmaker)}</small>`:''}</div>`;
     card.appendChild(box);
   }catch(_){}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enrich,0),{once:true});else setTimeout(enrich,0);
 // v274: tip enrichment is one-shot; no page-wide observer.
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=v=>{if(!v)return 'Date unavailable';const d=new Date(v);return Number.isNaN(d.getTime())?'Date unavailable':d.toLocaleString('en-ZA',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})};
 async function J(u){const r=await fetch(u,{cache:'default'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
 function findSportRoot(sport,word){
   return [...document.querySelectorAll('section,div')].find(x=>new RegExp(sport,'i').test(x.id||'')&&new RegExp(word,'i').test(x.id||''))||null;
 }
 async function finished(sport){
   const root=findSportRoot(sport,'finished');if(!root)return;
   try{const d=await J('/sports/'+sport+'/finished?limit=7'),rows=d.matches||[];root.innerHTML=`<h3 class="ks-ms-title">${sport} Finished Games</h3><div class="ks-ms-grid">${rows.map(x=>`<div class="ks-ms-card"><div class="ks-ms-meta">${E(date(x.date))} · ${E(x.league||'')}</div><div class="ks-ms-team"><b>${E(x.home)}</b></div><div class="ks-ms-score">${E(x.homeScore??'—')} – ${E(x.awayScore??'—')}</div><div class="ks-ms-team"><b>${E(x.away)}</b></div><div class="ks-ms-meta">${E(x.status||'Finished')} · ${E(x.venue||'')}</div><a href="/match/${sport}/${encodeURIComponent(x.id)}">Full match data</a></div>`).join('')||'<div>No finished games returned.</div>'}</div>`}catch(e){root.innerHTML=`<div>No ${E(sport)} finished games available.</div>`}
 }
 async function predictions(sport){
   const root=findSportRoot(sport,'prediction');if(!root)return;
   try{const d=await J('/sports/'+sport+'/predictions?limit=12'),rows=d.predictions||[];root.innerHTML=`<h3 class="ks-ms-title">${sport} Predictions</h3><div class="ks-ms-grid">${rows.map(x=>`<div class="ks-ms-card"><div class="ks-ms-meta">${E(date(x.date))} · ${E(x.league||'')}</div><b>${E(x.home)} vs ${E(x.away)}</b><div>Prediction: <b>${E(x.prediction)}</b> · ${E(x.confidence)}%</div><div class="ks-ms-meta">Home form: ${E(x.homeForm?.wins??0)}W/${E(x.homeForm?.played??0)} · Away form: ${E(x.awayForm?.wins??0)}W/${E(x.awayForm?.played??0)}</div></div>`).join('')||'<div>No prediction-qualified games returned.</div>'}</div>`}catch(e){root.innerHTML=`<div>No ${E(sport)} predictions available.</div>`}
 }
 async function directory(sport){
   const root=findSportRoot(sport,'team')||findSportRoot(sport,'player');if(!root)return;
   try{const d=await J('/sports/'+sport+'/teams-players?limit=80'),teams=d.teams||[];root.innerHTML=`<h3>${sport==='rugby'?'Rugby Teams & Players':'Cricket Teams & Players'}</h3><div class="ks-ms-grid">${teams.map(t=>`<div class="ks-ms-card"><div class="ks-ms-team">${t.badge?`<img src="${E(t.badge)}" alt="" loading="lazy" decoding="async" fetchpriority="low">`:t.flag?`<img src="${E(t.flag)}" alt="" loading="lazy" decoding="async" fetchpriority="low">`:''}<b>${E(t.name)}</b></div><div class="ks-ms-meta">${E(t.country||'')} · ${E(t.sport||'')}</div></div>`).join('')||'<div>No team data available.</div>'}</div>${d.playersMessage?`<div class="ks-ms-meta">${E(d.playersMessage)}</div>`:''}`;}catch(e){root.innerHTML=`<div>No ${E(sport)} teams available.</div>`}
 }
 function boot(){['rugby','cricket'].forEach(s=>{finished(s);predictions(s);directory(s)})}
 window.kasiLoadMultisportData=boot;
})();


(function(){
 // Dashboard "Back to Home" controls switch to Home in-place. Dedicated standalone pages keep normal href="/".
 document.addEventListener('click',function(e){
   const a=e.target.closest('a,button');if(!a)return;
   const txt=(a.textContent||'').trim().toLowerCase(),href=a.getAttribute('href')||'';
   const isBackHome = txt.includes('back to home') || txt.includes('back home') || a.id==='ksDedicatedBackHome' || a.id==='ksStatsBackHome';
   if(isBackHome && document.getElementById('overview')){
     e.preventDefault();
     e.stopPropagation();
     if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
     if(typeof window.kasiDashboardBack==='function')return window.kasiDashboardBack();
     if(typeof window.showTab==='function')window.showTab('overview');
     try{history.replaceState({kasiView:'home'},'','/');}catch(_){}
     window.scrollTo({top:0,behavior:'auto'});
     return false;
   }
 },true);
})();


(function(){
 const HOME_BUDGET=1450;
 const start=performance.now();
 document.documentElement.classList.add('ks-home-boot');

 // Do not let Rugby/Cricket provider work compete with Home's first render.
 let multisportLoaded=false;
 function loadMultisport(){
   if(multisportLoaded)return;
   multisportLoaded=true;
   if(typeof window.kasiLoadMultisportData==='function')window.kasiLoadMultisportData();
   
 }
 function relevantTarget(el){
   const s=((el&&el.id)||'')+' '+((el&&el.textContent)||'');
   return /rugby|cricket|fixture|prediction|teams\s*&\s*players/i.test(s);
 }
 document.addEventListener('click',e=>{
   const x=e.target.closest('button,a,[role="tab"]');
   if(x&&relevantTarget(x))setTimeout(loadMultisport,0);
 },true);

 // A hard visual budget: finish the Home loading state by 1.45 s.
 // Slow secondary network requests continue in the background and update their own widgets.
 const finish=()=>{
   document.documentElement.classList.remove('ks-home-boot');
   document.documentElement.classList.add('ks-home-ready');
   document.querySelectorAll('#overview .loading,.home .loading,[data-home-loading]').forEach(x=>{
     if(/loading/i.test(x.textContent||''))x.style.display='none';
   });
   window.__KASI_HOME_READY_MS=Math.round(performance.now()-start);
 };
 setTimeout(finish,0);

 // Mark expensive Home media sections as non-critical when present.
 requestAnimationFrame(()=>{
   document.querySelectorAll('#overview [id*="news" i],#overview [id*="video" i],#overview [id*="highlight" i]').forEach(x=>x.setAttribute('data-noncritical-home','1'));
 });
})();


(function(){let t=0;window.addEventListener('kasi:fresh-data',()=>{clearTimeout(t);t=setTimeout(()=>{try{if(typeof window.loadAuthoritativeHome==='function')window.loadAuthoritativeHome();if(typeof window.refreshLive==='function')window.refreshLive()}catch(_){}},120)})})();


(function(){
 const rx=/\\n\s*['"];\s*/g;
 function clean(root){
   const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
   while(n=w.nextNode())if(n.nodeValue&&rx.test(n.nodeValue)){rx.lastIndex=0;n.nodeValue=n.nodeValue.replace(rx,'')}
 }
 const run=()=>clean(document.body);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const FLAGS={'south-africa':'🇿🇦','england':'🏴','australia':'🇦🇺','new-zealand':'🇳🇿','india':'🇮🇳','pakistan':'🇵🇰','sri-lanka':'🇱🇰','bangladesh':'🇧🇩','west-indies':'🌴','ireland':'🇮🇪','scotland':'🏴','wales':'🏴','france':'🇫🇷','italy':'🇮🇹','argentina':'🇦🇷','japan':'🇯🇵','zimbabwe':'🇿🇼','namibia':'🇳🇦'};
 const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
 const mark=(g,side)=>{const logo=g[side+'Logo'],flag=g[side+'Flag']||FLAGS[String(g.countrySlug||'').toLowerCase()]||'';return `<span class="ks270-mark">${logo?`<img src="${E(logo)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.textContent='${E(initials(g[side]))}'" fetchpriority="low">`:flag?`<span class="ks270-flag">${flag}</span>`:E(initials(g[side]))}</span>`};
 window.kasiV270GameRow=function(g,live=false){
   const sp=(g.sport||'football').toLowerCase(),id=String(g.id||g.fixtureId||''),url=`/match/${encodeURIComponent(sp)}/${encodeURIComponent(id)}`;
   const score=live?`${E(g.homeScore??'—')} – ${E(g.awayScore??'—')}`:'vs';
   return `<div class="${live?'v246-live':'v246-fixture'}"><div><span class="v246-sport">${E(sp)}</span><div class="v246-meta">${E(g.date?new Date(g.date).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—')}</div></div><div class="v246-teams"><div class="ks270-side">${mark(g,'home')}<b>${E(g.home||'Home')}</b></div><div class="ks270-side">${mark(g,'away')}<b>${E(g.away||'Away')}</b></div><div class="ks270-comp">${E(g.country||'')} ${g.league?'· '+E(g.league):''} ${g.venue?'· '+E(g.venue):''}</div></div><div class="ks270-score">${score}</div><div class="v246-action"><div class="ks270-status">${E(g.status||'Scheduled')}</div>${id?`<a class="match-stats-btn" href="${url}">Stats</a>`:''}</div></div>`;
 };
 async function json(u){const r=await fetch(u,{headers:{Accept:'application/json'}}),ct=(r.headers.get('content-type')||'').toLowerCase();if(!r.ok||!ct.includes('json'))throw Error('Sports data temporarily unavailable');return r.json()}
 async function refreshFixtures(){
   for(const [sp,id] of [['rugby','v246RugbyFixtures'],['cricket','v246CricketFixtures']]){const el=document.getElementById(id);if(!el)continue;try{const d=await json('/sports/'+sp+'/scores'),rows=(d.games||[]).filter(x=>Number(x.statusId)!==2).slice(0,15);el.innerHTML=rows.length?rows.map(x=>window.kasiV270GameRow(x,false)).join(''):'<div class="empty">No upcoming fixtures returned.</div>'}catch(_){}}
 }
 async function refreshLive(){
   const el=document.getElementById('liveList');if(!el)return;try{const d=await json('/sports/live'),rows=d.games||[];el.innerHTML=rows.length?rows.map(x=>window.kasiV270GameRow(x,true)).join(''):'<div class="empty">No Football, Rugby or Cricket games are live right now.</div>'}catch(_){}}
 function cachedTip(){
   const body=document.getElementById('totdBody'),badge=document.getElementById('totdConf');if(!body)return;
   try{const d=JSON.parse(localStorage.getItem('kasi:last-tip-of-day')||'null');if(!d?.tips?.length)return;body.innerHTML=d.tips.map(x=>{const q=x.prediction||{};return `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${E(x.home)} vs ${E(x.away)}</b><div class="sub">${E(q.bestPick||q.winner||'—')} · ${Number(q.confidence||x.confidence||0).toFixed(1)}% · Cached</div></div>`}).join('');if(badge)badge.textContent='Last cached';}catch(_){}}
 const nativeFetch=window.fetch.bind(window);window.fetch=async function(input,init){const r=await nativeFetch(input,init);try{const u=typeof input==='string'?input:input?.url||'';if(u.includes('/tip-of-day')&&r.ok&&(r.headers.get('content-type')||'').includes('json')){const c=r.clone(),d=await c.json();if(d?.tips?.length)localStorage.setItem('kasi:last-tip-of-day',JSON.stringify(d));}}catch(_){}return r};
 function boot(){
   // Home critical path: render cached Tip synchronously, but do not compete
   // with Home football/news hydration for Rugby/Cricket network work.
   cachedTip();
   const deferred=()=>{refreshFixtures();refreshLive()};
   if('requestIdleCallback' in window) requestIdleCallback(deferred,{timeout:2200});
   else setTimeout(deferred,1800);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


(function(){
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function rows(s){const r=await fetch('/sports/'+s+'/scores',{headers:{Accept:'application/json'}});if(!r.ok||!(r.headers.get('content-type')||'').includes('json'))throw Error('Fixture data unavailable');const d=await r.json();return(d.games||[]).filter(g=>Number(g.statusId)!==2)}
 function dl(b,n){const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
 async function csv(s){const r=await rows(s),c=['Date','Competition','Country','Home','Away','Status','Venue'],q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';if(!r.length)return alert('No fixtures available.');const lines=[c.join(','),...r.map(g=>[g.date,g.league,g.country,g.home,g.away,g.status,g.venue].map(q).join(','))];dl(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),s+'-fixtures.csv')}
 async function pdf(s){const r=await rows(s);if(!r.length)return alert('No fixtures available.');const tr=r.map(g=>'<tr><td>'+E(g.date?new Date(g.date).toLocaleString('en-ZA'):'')+'</td><td>'+E(g.league||'')+'</td><td>'+E(g.country||'')+'</td><td><b>'+E(g.home||'')+'</b> vs <b>'+E(g.away||'')+'</b></td><td>'+E(g.status||'')+'</td><td>'+E(g.venue||'')+'</td></tr>').join('');const end='</'+'body></'+'html>';const doc='<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ccc;padding:6px}</style></head><body><h1>'+E(s[0].toUpperCase()+s.slice(1))+' Fixtures</h1><table><tr><th>Date</th><th>Competition</th><th>Country</th><th>Fixture</th><th>Status</th><th>Venue</th></tr>'+tr+'</table>'+end;const u=URL.createObjectURL(new Blob([doc],{type:'text/html'})),w=window.open(u,'_blank');if(!w){URL.revokeObjectURL(u);return alert('Allow pop-ups to create the PDF.')}w.addEventListener('load',()=>setTimeout(()=>{w.print();setTimeout(()=>URL.revokeObjectURL(u),1500)},200),{once:true})}
 function add(s,id){const root=document.getElementById(id);if(!root)return;const host=root.parentElement||root;if(host.querySelector('.ks277-exportbar[data-sport="'+s+'"]'))return;const b=document.createElement('div');b.className='ks277-exportbar';b.dataset.sport=s;b.innerHTML='<button data-x="csv">Download CSV</button><button data-x="pdf">Download PDF</button>';b.onclick=e=>{const x=e.target.closest('button')?.dataset.x;if(x==='csv')csv(s).catch(z=>alert(z.message));if(x==='pdf')pdf(s).catch(z=>alert(z.message))};host.insertBefore(b,root)}
 function boot(){add('rugby','v246RugbyFixtures');add('cricket','v246CricketFixtures')}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


(()=>{"use strict";
 const DAY=86400000, now=()=>Date.now();
 const parse=v=>{if(!v)return null;let x=String(v).trim();if(/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d(:\d\d)?$/.test(x))x=x.replace(" ","T")+"Z";const d=new Date(x);return isNaN(d)?null:d};
 const fmt=d=>new Intl.DateTimeFormat(undefined,{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(d);
 const finished=/finished|ended|complete|completed|full.?time|\bft\b|result/i, live=/live|in.?play|innings|1h|2h|ht/i;
 function localize(root=document){
   root.querySelectorAll("[data-kasi-utc],[data-start-time],[data-date],time[datetime]").forEach(el=>{
     const raw=el.dataset.kasiUtc||el.dataset.startTime||el.dataset.date||el.getAttribute("datetime"),d=parse(raw);if(!d)return;
     el.dataset.kasiEpoch=String(d.getTime());el.textContent=fmt(d);el.title="Local time";
   });
   root.querySelectorAll("[data-kasi-fixture-card]").forEach(card=>{
     const t=card.querySelector("[data-kasi-utc],[data-start-time],[data-date],time[datetime]");
     const d=parse(card.dataset.startTime||t?.dataset?.kasiUtc||t?.dataset?.startTime||t?.dataset?.date||t?.getAttribute("datetime"));
     if(!d)return;const st=card.dataset.status||card.textContent||"";
     card.dataset.kasiLifecycle=finished.test(st)?"finished":live.test(st)?"live":(d.getTime()<=now()?"past-start":"upcoming");
   });
 }
 // News cards: never navigate the current dashboard away. Invalid cards are hidden.
 function newsQuality(root=document){
   root.querySelectorAll('[data-news-card],.news-card,.latest-news-card').forEach(card=>{
     const a=card.querySelector('a[href]'),img=card.querySelector('img'),title=(card.querySelector('h1,h2,h3,h4,.title')?.textContent||"").trim();
     if(!a||!img||!title){card.hidden=true;return}
     a.target="_blank";a.rel="noopener noreferrer";
     img.addEventListener("error",()=>{card.hidden=true},{once:true});
   });
 }
 // Keep currently rendered cached data while refreshes happen. Existing cache policy remains authoritative.
 // A refresh must not blank a widget before replacement data has successfully arrived.
 const originalFetch=window.fetch.bind(window);
 window.fetch=async function(input,init={}){
   const url=typeof input==="string"?input:(input?.url||"");
   const dataPath=/\/(home\/football|live|sports\/live|sports\/news|sports\/videos)(\?|$)/.test(url);
   if(!dataPath)return originalFetch(input,init);
   try{return await originalFetch(input,{...init,cache:init.cache||"default"})}
   catch(e){throw e}
 };
 const run=()=>{localize();newsQuality()};
 addEventListener("DOMContentLoaded",run);addEventListener("kasi:fresh-data",()=>setTimeout(run,0));
 // v274: localization/news quality runs on boot and fresh-data events only; no global DOM observer.
 window.kasiNormalizeLocalTimes=localize;
})();


// v274 stability: disabled duplicate persistent fetch interception.


(function(){
 const byName={'Premier League':'39','La Liga':'140','Bundesliga':'78','Serie A':'135','Ligue 1':'61','PSL South Africa':'288','Champions League':'2','Europa League':'3'};
 const byId=Object.fromEntries(Object.entries(byName).map(([k,v])=>[v,k]));
 window.kasiSelectFootballCompetition=function(value,origin){
   const raw=String(value||''), id=byName[raw]||raw, name=byId[id]||raw;
   const hs=document.getElementById('homeStandingsLeague');
   if(hs&&origin!=='standings'&&[...hs.options].some(o=>o.value===name))hs.value=name;
   const ex=document.getElementById('ks211League');
   if(ex&&origin!=='explorer'&&[...ex.options].some(o=>o.value===id)){ex.value=id;if(typeof ks211LoadLeague==='function')ks211LoadLeague();}
   const boxes=[...document.querySelectorAll('#psLeaguePicker input[type=checkbox]')];
   if(boxes.length&&origin!=='leaderboard'){
     boxes.forEach(c=>c.checked=String(c.value)===id);
     const label=document.getElementById('psLeagueBtnLabel');if(label)label.textContent=(boxes.find(c=>c.checked)?.closest('label')?.textContent||name).trim();
     if(typeof psLoad==='function')psLoad();
   }
 };
 const oldStand=window.loadHomeStandings;
 if(typeof oldStand==='function')window.loadHomeStandings=async function(){
   const v=document.getElementById('homeStandingsLeague')?.value;
   if(v)kasiSelectFootballCompetition(v,'standings');
   return oldStand.apply(this,arguments);
 };
 const oldExplorer=window.ks211LoadLeague;
 if(typeof oldExplorer==='function')window.ks211LoadLeague=async function(){
   const v=document.getElementById('ks211League')?.value;
   if(v)kasiSelectFootballCompetition(v,'explorer');
   return oldExplorer.apply(this,arguments);
 };
 const oldChange=window.psLeagueChange;
 if(typeof oldChange==='function')window.psLeagueChange=function(){
   const checked=[...document.querySelectorAll('#psLeaguePicker input:checked')];
   const r=oldChange.apply(this,arguments);
   if(checked.length===1)kasiSelectFootballCompetition(checked[0].value,'leaderboard');
   return r;
 };
})();


document.addEventListener('click',async function(e){
 const el=e.target.closest('[data-kasi-player-id]'); if(!el)return;
 const id=Number(el.dataset.kasiPlayerId||0); if(!id)return;
 e.preventDefault();
 try{const r=await fetch('/public-route/player/'+id+'?name='+encodeURIComponent(el.dataset.kasiPlayerName||''));const d=await r.json();if(d.url)location.assign(d.url)}catch(_){}
});


/* v312: legacy polling owner disabled. Final Home News owner below is authoritative. */
window.__KASI_NEWS_WARM_FIX__=true;


(function(){
  function adminState(){
    const admin=localStorage.getItem('faiAdmin')==='true';
    const tools=document.getElementById('adminWidgetTools');
    const login=document.getElementById('adminWidgetLogin');
    const st=document.getElementById('adminWidgetStatus');
    if(admin){
      if(tools)tools.style.display='block';
      if(login)login.style.display='none';
      if(st)st.textContent='Administrator';
      if(typeof window.renderAccountList==='function')window.renderAccountList();
    }else{
      if(tools)tools.style.display='none';
      if(login)login.style.display='block';
      if(st)st.textContent='Sign in to access administration.';
    }
  }

  window.toggleAdminWidget=function(){
    const w=document.getElementById('kasiscoreAdminWidget');
    if(!w)return;
    document.body.classList.add('ks-admin-open');
    w.style.display='block';
    adminState();
    try{history.pushState({view:'admin'},'','/?view=admin');}catch(_){}
    window.scrollTo({top:0,behavior:'auto'});
  };

  // v344: duplicate Admin Back Home owner removed; the single canonical SPA owner is defined in the final controller.

  window.closeAdminWidget=function(){
    return window.kasiAdminBackHome();
  };

  // Browser Back/Forward changes page state without reloading dashboard data.
  window.addEventListener('popstate',function(){
    const p=new URLSearchParams(location.search);
    if(p.get('view')==='admin'){
      const w=document.getElementById('kasiscoreAdminWidget');
      if(w){
        document.body.classList.add('ks-admin-open');
        w.style.display='block';
        adminState();
      }
    }else if(document.body.classList.contains('ks-admin-open')){
      const w=document.getElementById('kasiscoreAdminWidget');
      if(w)w.style.display='none';
      document.body.classList.remove('ks-admin-open');
      if(typeof window.kasiscorePrimaryNav==='function'){
        window.kasiscorePrimaryNav('overview',document.querySelector('[data-primary="overview"]'));
      }
    }
  });
})();


(function(){
  /* Requested scope only:
     Finished Games = all FT matches from the last 48 hours.
     African visitors = display order targets 50% Europe, 25% Africa, 25% Other.
     The same ordering is applied to Live Scores and Live Matches.
     No matches are removed: any remainder is appended after the balanced sequence.
  */
  const EUROPE = [
    'uefa','champions league','europa league','conference league','nations league',
    'england','english','premier league','championship','fa cup','efl',
    'spain','spanish','la liga','copa del rey',
    'italy','italian','serie a','serie b','coppa italia',
    'germany','german','bundesliga','dfb',
    'france','french','ligue 1','ligue 2',
    'portugal','portuguese','primeira liga',
    'netherlands','dutch','eredivisie',
    'belgium','belgian','scotland','scottish','turkey','turkish','greece','greek',
    'austria','austrian','switzerland','swiss','denmark','danish','sweden','swedish',
    'norway','norwegian','finland','poland','polish','czech','croatia','croatian',
    'serbia','serbian','romania','romanian','ukraine','ukrainian','ireland','welsh',
    'cyprus','hungary','hungarian','slovakia','slovenia','bulgaria','iceland'
  ];
  const AFRICA = [
    'caf','africa','african','south africa','psl','premiership','betway premiership',
    'motsepe','nedbank cup','mtn8','egypt','egyptian','morocco','moroccan','algeria',
    'algerian','tunisia','tunisian','nigeria','nigerian','ghana','ghanaian','kenya',
    'kenyan','tanzania','tanzanian','uganda','ugandan','zambia','zambian','zimbabwe',
    'zimbabwean','botswana','namibia','angola','mozambique','malawi','rwanda',
    'ethiopia','senegal','senegalese','cameroon','cameroonian','ivory coast',
    "cote d'ivoire",'mali','congo','dr congo','gabon','guinea','sudan','libya',
    'eswatini','lesotho','mauritius','madagascar'
  ];

  function textOf(m){
    return [
      m?.league,m?.leagueName,m?.country,m?.countryName,m?.competition,
      m?.league?.name,m?.league?.country,m?.fixture?.league?.name,
      m?.fixture?.league?.country
    ].filter(Boolean).join(' ').toLowerCase();
  }
  function region(m){
    const t=textOf(m);
    if(AFRICA.some(x=>t.includes(x))) return 'africa';
    if(EUROPE.some(x=>t.includes(x))) return 'europe';
    return 'other';
  }
  function africanVisitor(){
    try{
      const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';
      if(/^Africa\//i.test(tz)) return true;
    }catch(_){}
    return false;
  }
  function balanced(rows){
    rows=Array.isArray(rows)?rows.slice():[];
    if(!africanVisitor() || rows.length<2) return rows;

    const buckets={europe:[],africa:[],other:[]};
    rows.forEach(x=>buckets[region(x)].push(x));

    // 2/4 Europe, 1/4 Africa, 1/4 Other.
    const cycle=['europe','europe','africa','other'];
    const out=[];
    while(buckets.europe.length||buckets.africa.length||buckets.other.length){
      let added=0;
      for(const key of cycle){
        if(buckets[key].length){out.push(buckets[key].shift());added++;}
      }
      if(!added)break;
    }
    return out;
  }
  window.kasiBalanceMatchesForAfrica=balanced;

  function finishedAt(m){
    const raw=m?.date||m?.kickoff||m?.fixture?.date||m?.startTime||m?.timestamp||'';
    const n=typeof raw==='number' ? (raw<1e12?raw*1000:raw) : Date.parse(raw);
    return Number.isFinite(n)?n:0;
  }
  function isFinished(m){
    const st=String(m?.status||m?.fixture?.status?.short||'').toUpperCase();
    return !!m?.isFinished || ['FT','AET','PEN'].includes(st);
  }

  // Finished Games: replace only its loader. Fetch the two calendar dates that
  // cover the rolling 48-hour window, then apply an exact client-side 48h cutoff.
  /* v302: superseded Finished Games loader removed; live/Africa balancing retained. */

  // Existing fixture rendering can also populate Finished Games. Balance that
  // state immediately before its existing renderer, without changing the renderer.
  const oldFinishedRender=window.__legacyRenderFinishedGames_v327;
  if(typeof oldFinishedRender==='function'){
    window.__legacyRenderFinishedGames_v327=function(){
      if(window.S&&Array.isArray(S._finishedFixtures)){
        const cutoff=Date.now()-48*60*60*1000;
        S._finishedFixtures=balanced(S._finishedFixtures.filter(m=>{
          const t=finishedAt(m);
          return isFinished(m)&&(!t||t>=cutoff);
        }));
      }
      return oldFinishedRender.apply(this,arguments);
    };
  }

  // Live Scores + Live Matches: reorder the existing live collection only.
  // No live match is discarded and no extra provider request is introduced.
  const oldLiveRefresh=window.liveWidgetRefresh;
  if(typeof oldLiveRefresh==='function'){
    window.liveWidgetRefresh=async function(){
      if(window.S&&Array.isArray(S.live))S.live=balanced(S.live);
      const result=await oldLiveRefresh.apply(this,arguments);
      if(Array.isArray(window.liveMatches))window.liveMatches=balanced(window.liveMatches);
      if(window.S&&Array.isArray(S.live))S.live=balanced(S.live);
      if(typeof window.renderLiveGrid==='function')window.renderLiveGrid(window.liveMatches||S.live||[]);
      if(typeof window.renderLiveTab==='function')window.renderLiveTab();
      return result;
    };
  }

  // Protect direct repaints of the Live Scores grid too.
  const oldGrid=window.renderLiveGrid;
  if(typeof oldGrid==='function'){
    window.renderLiveGrid=function(rows){
      return oldGrid.call(this,balanced(rows));
    };
  }
})();


(function(){
  const INITIAL_FINISHED=30;
  let showAllFinished=false;

  function sportOf(m){return String(m?.sport||'football').toLowerCase();}
  function matchId(m){return String(m?.id||m?.fixtureId||m?.providerFixtureId||m?.fixture?.id||'');}
  function whenMs(m){
    const v=m?.date||m?.kickoff||m?.fixture?.date||m?.startTime||m?.timestamp||'';
    if(typeof v==='number')return v<1e12?v*1000:v;
    const n=Date.parse(v);return Number.isFinite(n)?n:0;
  }
  function finished(m){
    const st=String(m?.statusShort||m?.status||m?.fixture?.status?.short||m?.fixture?.status?.long||'').toLowerCase();
    if(['ft','aet','pen','finished','complete','completed','closed','final','post'].some(x=>st===x||st.includes(x)))return true;
    if(['in','live','1h','2h','ht','et','scheduled','not started','pre'].some(x=>st===x||st.includes(x)))return false;
    // Rugby/Cricket feeds can use numeric provider statuses. A past event with
    // a returned score is safe to treat as completed for this public list.
    return whenMs(m)>0 && whenMs(m)<Date.now() &&
      (m?.homeScore!==null&&m?.homeScore!==undefined) &&
      (m?.awayScore!==null&&m?.awayScore!==undefined);
  }
  function normalize(m,sport){
    const x={...(m||{})};
    x.sport=String(x.sport||sport||'football').toLowerCase();
    x.id=x.id||x.fixtureId||x.providerFixtureId||x.fixture?.id;
    x.home=x.home||x.homeTeam||x.teams?.home?.name||'Home';
    x.away=x.away||x.awayTeam||x.teams?.away?.name||'Away';
    x.homeId=x.homeId||x.homeTeamId||x.teams?.home?.id;
    x.awayId=x.awayId||x.awayTeamId||x.teams?.away?.id;
    x.homeLogo=x.homeLogo||x.homeBadge||x.teams?.home?.logo||'';
    x.awayLogo=x.awayLogo||x.awayBadge||x.teams?.away?.logo||'';
    x.league=(typeof x.league==='object'?(x.league?.name||''):x.league)||x.leagueName||x.competition||x.sport;
    if(!x.score && (x.homeScore!==undefined||x.awayScore!==undefined))
      x.score=`${x.homeScore??'—'} - ${x.awayScore??'—'}`;
    return x;
  }
  function dedupe(rows){
    const seen=new Set(),out=[];
    for(const m of rows){
      const k=`${sportOf(m)}:${matchId(m)||[m.home,m.away,m.date].join('|')}`;
      if(seen.has(k))continue;seen.add(k);out.push(m);
    }
    return out;
  }
  function esc2(v){return typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function logo(m,side){return m?.[side+'Logo']||m?.teams?.[side]?.logo||'';}
  function team(m,side){
    const name=m?.[side]||m?.teams?.[side]?.name||(side==='home'?'Home':'Away');
    const img=logo(m,side);
    return `${img?`<img src="${esc2(img)}" alt="" loading="lazy" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;margin-right:5px" fetchpriority="low">`:''}${esc2(name)}`;
  }
  function sportStatsHtml(d,sport){
    if(sport==='football' && typeof window.renderFinishedStats==='function')return window.renderFinishedStats(d);
    const ss=d?.statistics?.sportSpecific||d?.statistics||{};
    const periods=d?.statistics?.scoresByPeriod||{};
    const rows=[];
    const add=(k,v)=>{if(v!==undefined&&v!==null&&v!==''&&typeof v!=='object')rows.push([k,v]);};
    Object.entries(ss||{}).forEach(([k,v])=>{
      if(v&&typeof v==='object'){
        Object.entries(v).forEach(([k2,v2])=>add(`${k} · ${k2}`,v2));
      }else add(k,v);
    });
    Object.entries(periods||{}).forEach(([k,v])=>add(`Period · ${k}`,typeof v==='object'?JSON.stringify(v):v));
    if(!rows.length)return '<div class="sub" style="padding:8px 0">No detailed match statistics available.</div>';
    return `<div>${rows.slice(0,24).map(([k,v])=>`<div style="display:grid;grid-template-columns:1fr auto;gap:12px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span class="sub">${esc2(k)}</span><b>${esc2(v)}</b></div>`).join('')}</div>`;
  }

  async function getJson(path,params={}){
    if(typeof window.get==='function')return window.get(path,params);
    const q=new URLSearchParams(params);const r=await fetch(path+(q.toString()?'?'+q:''),{headers:{Accept:'application/json'}});
    if(!r.ok)throw Error('Unable to load data');return r.json();
  }

  async function pastSport(sport){
    const d=await getJson(`/sports/${sport}/finished`,{limit:100});
    const rows=Array.isArray(d)?d:(d.items||d.matches||d.fixtures||d.games||[]);
    return rows.map(g=>normalize(g,sport));
  }

  window.loadFinishedGames=async function(force=false){
    const list=document.getElementById('finishedGamesList');
    if(!list)return;
    list.innerHTML='<div class="empty">Refreshing finished games…</div>';
    const now=new Date(), cutoff=Date.now()-48*60*60*1000;
    const lg=document.getElementById('league')?.value||'ALL';

    try{
      const from=new Date(cutoff).toISOString().slice(0,10),to=now.toISOString().slice(0,10);
      const [footballR,rugbyR,cricketR]=await Promise.allSettled([
        getJson('/fixtures/with-odds',{league:lg,type:'today',date_from:from,date_to:to,refresh:force?1:0}),
        pastSport('rugby'),
        pastSport('cricket')
      ]);
      let rows=[];
      if(footballR.status==='fulfilled'){
        const d=footballR.value;
        rows.push(...(d.matches||d.fixtures||[]).map(x=>normalize(x,'football')));
      }
      if(rugbyR.status==='fulfilled')rows.push(...rugbyR.value);
      if(cricketR.status==='fulfilled')rows.push(...cricketR.value);

      rows=dedupe(rows).filter(m=>{
        const t=whenMs(m);
        return finished(m)&&(!t||(t>=cutoff&&t<=Date.now()+300000));
      });
      rows.sort((a,b)=>whenMs(b)-whenMs(a));
      if(typeof window.kasiBalanceMatchesForAfrica==='function')rows=window.kasiBalanceMatchesForAfrica(rows);

      S._finishedFixtures=rows;
      showAllFinished=false;
      window.renderFinishedGames();
      const upd=document.getElementById('finishedGamesUpdated');
      if(upd)upd.textContent='Last 48 hrs · Football · Rugby · Cricket · Updated '+new Date().toLocaleTimeString();
    }catch(e){
      list.innerHTML='<div class="empty">Finished games are temporarily unavailable.</div>';
    }
  };

  window.__legacyRenderFinishedGames_v327=function(){
    const list=document.getElementById('finishedGamesList');
    const countEl=document.getElementById('finishedGamesCount');
    if(!list)return;
    const all=S._finishedFixtures||[];
    if(countEl)countEl.textContent=`${all.length} games`;
    if(!all.length){list.innerHTML='<div class="empty">No finished games in the last 48 hours.</div>';return;}
    const games=showAllFinished?all:all.slice(0,INITIAL_FINISHED);
    list.innerHTML=games.map(m=>{
      const id=matchId(m),sport=sportOf(m),score=m.score||`${m.homeScore??'—'} - ${m.awayScore??'—'}`;
      const tm=whenMs(m)?new Date(whenMs(m)).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
      return `<div class="fixture fg-row" data-fid="${esc2(id)}" data-sport="${esc2(sport)}" style="flex-direction:column;gap:0;padding:0;border-radius:10px;overflow:hidden;margin-bottom:6px">
        <div style="display:grid;grid-template-columns:100px 1fr auto auto;gap:10px;align-items:center;padding:11px 14px">
          <div><span class="badge" style="background:#1e293b;color:#94a3b8">FT</span><div class="fg-sport">${esc2(sport)}</div><div class="sub" style="font-size:10px">${esc2(m.league||'Worldwide')}</div></div>
          <div class="teams"><strong>${team(m,'home')} <span style="font-size:18px;font-weight:900;padding:0 6px">${esc2(score)}</span> ${team(m,'away')}</strong><span class="sub" style="font-size:10px">${esc2(m.venue||'')}</span></div>
          <div class="sub" style="font-size:10px;text-align:right">${esc2(tm)}</div>
          <button type="button" data-fg-stats="${esc2(id)}" data-fg-sport="${esc2(sport)}" onclick="kasiFinishedStats(event,this)">Stats</button>
        </div>
        <div class="fg-stats" style="display:none;border-top:1px solid var(--line);padding:12px 14px;background:rgba(255,255,255,.02)"></div>
      </div>`;
    }).join('')+
    (!showAllFinished&&all.length>INITIAL_FINISHED?`<div id="finishedGamesMoreWrap"><button id="finishedGamesMoreBtn" type="button" onclick="kasiFinishedViewMore()">View More (${all.length-INITIAL_FINISHED})</button></div>`:'');
  };

  window.kasiFinishedViewMore=function(){
    showAllFinished=true;
    window.renderFinishedGames();
  };

  window.kasiFinishedStats=async function(e,btn){
    e?.stopPropagation?.();
    const row=btn.closest('.fg-row'),box=row?.querySelector('.fg-stats');
    if(!row||!box)return;
    if(box.style.display!=='none'){box.style.display='none';btn.textContent='Stats';return;}
    box.style.display='block';btn.textContent='Hide Stats';
    if(box.dataset.loaded==='1')return;
    box.innerHTML='<div class="empty" style="padding:12px">Loading match statistics…</div>';
    const id=btn.dataset.fgStats,sport=btn.dataset.fgSport||'football';
    try{
      const d=sport==='football'
        ? await getJson('/fixtures/'+encodeURIComponent(id)+'/stats')
        : await getJson('/sports/'+encodeURIComponent(sport)+'/match/'+encodeURIComponent(id));
      box.innerHTML=sportStatsHtml(d,sport);
      box.dataset.loaded='1';
    }catch(_){
      box.innerHTML='<div class="empty" style="padding:12px">Match statistics are temporarily unavailable.</div>';
    }
  };
})();


(function(){
 const KEY='ks:v304:news:last-good';
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}};
 const write=rows=>{try{if(rows?.length)localStorage.setItem(KEY,JSON.stringify(rows.slice(0,24)))}catch(_){}};
 const img=n=>String(n?.image||n?.imageUrl||n?.thumbnail||n?.ogImage||n?.publisherImage||'').trim();
 const href=n=>{const p=String(n?.articlePath||'').trim();if(p.startsWith('/news/'))return p;const u=String(n?.originalUrl||n?.publisherUrl||n?.resolvedUrl||n?.link||n?.url||'').trim();if(!/^https?:\/\//i.test(u))return '';const slug=String(n?.title||'sports-news').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'sports-news';return '/news/'+slug+'?source='+encodeURIComponent(u)};
 const good=rows=>(rows||[]).filter(n=>String(n?.title||'').trim()&&/^https?:\/\//i.test(img(n))&&href(n));
 function renderTab(rows){
   const list=document.getElementById('sportsNewsList'),valid=good(rows);if(!list||!valid.length)return false;
   window.__ksNewsItems=valid;
   list.innerHTML=valid.map(n=>`<article class="news-item" onclick="location.href='${E(href(n))}'" style="display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center;cursor:pointer"><div><img src="${E(img(n))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="width:150px;height:92px;object-fit:cover;border-radius:8px;background:#111" onerror="this.closest('article')?.remove()" fetchpriority="low"></div><div><b style="font-size:14px">${E(n.title)}</b><div class="news-meta">${E(n.publisher||n.source||'Sports News')} · ${E(n.published||'')}</div><div class="sub" style="margin-top:5px">${E(n.description||n.summary||'')}</div></div></article>`).join('');
   const c=document.getElementById('hubNewsCount');if(c)c.textContent=valid.length;return true;
 }
 async function request(url,ms=10000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,cache:'default',headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
 async function refresh(){
   const cached=read();renderTab(cached); // never blank last-good data
   const sport=(window.sportsState?.newsSport||'all'),q=(document.getElementById('newsSearch')?.value||'').trim();
   const qs=new URLSearchParams({sport,q,limit:'40'});
   let d=null;
   try{d=await request('/sports/news?'+qs,10000)}catch(_){try{d=await request('/sports/news/bulletin?limit=8',6000)}catch(__){return !!cached.length}}
   const rows=good(d?.items||[]);if(!rows.length)return !!cached.length;write(rows);renderTab(rows);
   try{window.loadHomeSportsNews?.()}catch(_){} return true;
 }
 window.loadSportsNews=refresh;
 // If the News tab is already visible when this patch loads, paint cache immediately.
 if(!document.getElementById('sportsnews')?.classList.contains('hidden'))renderTab(read());
})();


(function(){
 if(window.__KASI_V307_LIVE__)return;window.__KASI_V307_LIVE__=true;
 const LIVE_KEY='ks:v307:live:last-good', FIN_KEY='ks:v307:finished48:last-good';
 const state={mode:'live',live:[],finished:[],shown:24,refreshing:false};
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}};
 const save=(k,x)=>{try{if(Array.isArray(x)&&x.length)localStorage.setItem(k,JSON.stringify(x.slice(0,500)))}catch(_){}};
 const sport=x=>String(x?.sport||'football').toLowerCase();
 const teamName=(x,side)=>{
   const direct=x?.[side], nested=x?.[side+'Team'], teams=x?.teams?.[side];
   if(typeof direct==='string'&&direct.trim())return direct;
   if(typeof nested==='string'&&nested.trim())return nested;
   return String(nested?.name||teams?.name||direct?.name||(side==='home'?'Home':'Away'));
 };
 const id=x=>x?.id||x?.fixtureId||x?.providerFixtureId||'';
 const dt=x=>x?.datetime||x?.date||x?.startTime||'';
 const score=(x,side)=>side==='h'?(x?.homeScore??x?.hs??x?.homeGoals??x?.score?.home??'—'):(x?.awayScore??x?.as??x?.awayGoals??x?.score?.away??'—');
 const when=v=>{try{return new Date(v).toLocaleString('en-ZA',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return String(v||'')}};
 const badge=(src,alt)=>src?`<img src="${E(src)}" alt="${E(alt)}" loading="lazy" decoding="async" onerror="this.style.display='none'" fetchpriority="low">`:'';
 function oddsLine(x){
   const o=x?.odds;
   if(o&&typeof o==='object'){
     const vals=[];
     if(o.home!=null)vals.push(['Home',o.home]);if(o.draw!=null)vals.push(['Draw',o.draw]);if(o.away!=null)vals.push(['Away',o.away]);
     if(vals.length)return `<div class="ks307-odds">${vals.map(([k,v])=>`<span>${E(k)} <b>${E(v)}</b></span>`).join('')}</div>`;
   }
   const markets=Array.isArray(x?.markets)?x.markets:[];
   const vals=[];
   for(const m of markets){
     const label=m?.outcomeName||m?.selectionName||m?.name||m?.label||m?.outcome||m?.participantName;
     const price=m?.price??m?.odds??m?.decimalOdds??m?.value;
     if(label&&price!=null&&!vals.some(v=>v[0]===String(label)))vals.push([String(label),price]);
     if(vals.length>=3)break;
   }
   return vals.length?`<div class="ks307-odds">${vals.map(([k,v])=>`<span>${E(k)} <b>${E(v)}</b></span>`).join('')}</div>`:'';
 }
 function card(x,finished=false){
   const sp=sport(x),fid=id(x),lg=(typeof x.league==='object'?x.league?.name:x.league)||x.competition||'Competition',status=finished?'FINAL':(x.statusShort||x.status||x.min||'LIVE');
   const hn=teamName(x,'home'),an=teamName(x,'away');
   const time=finished?when(dt(x)):(x.min?`${E(x.min)}'`:E(status));
   return `<article class="ks307-card"><div class="ks307-meta"><span><span class="ks307-sport">${E(sp)}</span> · ${E(lg)}</span><span>${finished?'FINAL · ':''}${E(time)}</span></div><div class="ks307-row"><div class="ks307-team">${badge(x.homeLogo||x.homeBadge||x.homeTeam?.logo||x.teams?.home?.logo,hn)}<span>${E(hn)}</span></div><div class="ks307-score">${E(score(x,'h'))} - ${E(score(x,'a'))}</div><div class="ks307-team"><span>${E(an)}</span>${badge(x.awayLogo||x.awayBadge||x.awayTeam?.logo||x.teams?.away?.logo,an)}</div></div>${!finished?oddsLine(x):''}${finished&&fid?`<div class="ks307-actions"><button type="button" class="match-stats-btn" onclick="event.stopPropagation();ks313Stats(this,'${E(fid)}','${E(sp)}')">Stats</button><div class="ks313-inline-stats" hidden></div></div>`:''}</article>`;
 }

 function flatten(obj,prefix='',depth=0,out=[]){
   if(depth>3||out.length>=50||obj==null)return out;
   if(Array.isArray(obj)){obj.slice(0,15).forEach((v,i)=>flatten(v,prefix?prefix+' '+(i+1):String(i+1),depth+1,out));return out}
   if(typeof obj==='object'){Object.entries(obj).forEach(([k,v])=>flatten(v,prefix?prefix+' · '+k:k,depth+1,out));return out}
   if(['string','number','boolean'].includes(typeof obj)&&String(obj).trim())out.push([prefix,String(obj)]);
   return out;
 }
 window.ks313Stats=async function(btn,fid,sp){
   const box=btn.parentElement?.querySelector('.ks313-inline-stats');if(!box)return;
   if(!box.hidden){box.hidden=true;btn.textContent='Stats';return}
   box.hidden=false;btn.textContent='Hide Stats';
   if(box.dataset.loaded==='1')return;
   box.innerHTML='<div class="sub">Loading match statistics…</div>';
   try{
     const d=await json(`/sports/${encodeURIComponent(sp)}/match/${encodeURIComponent(fid)}`,14000);
     let pairs=[];
     if(sp==='football'){
       for(const block of (Array.isArray(d.statistics)?d.statistics:[])){
         for(const x of (block?.statistics||[]))pairs.push([x.type||'Stat',x.value??'—']);
       }
       if(!pairs.length)pairs=flatten({statistics:d.statistics,events:d.events,lineups:d.teams});
     }else{
       pairs=flatten(d?.statistics?.sportSpecific||d?.statistics?.scoresByPeriod||d?.statistics||{});
     }
     box.innerHTML=pairs.length?pairs.slice(0,50).map(([k,v])=>`<div class="ks313-stat"><span>${E(k)}</span><b>${E(v)}</b></div>`).join(''):'<div class="empty">No detailed match statistics available.</div>';
     box.dataset.loaded='1';
   }catch(_){box.innerHTML='<div class="empty">Match statistics are temporarily unavailable.</div>'}
 };

 function syncTabs(){
   document.getElementById('ks307LiveBtn')?.classList.toggle('active',state.mode==='live');
   document.getElementById('ks307FinishedBtn')?.classList.toggle('active',state.mode==='finished');
   const live=document.getElementById('liveMatchGrid'),fin=document.getElementById('ks307FinishedGrid'),more=document.getElementById('ks307FinishedMore'),empty=document.getElementById('liveWidgetEmpty'),ticker=document.getElementById('liveTicker');
   if(live)live.style.display=state.mode==='live'?'':'none';if(fin)fin.style.display=state.mode==='finished'?'':'none';if(ticker)ticker.style.display=state.mode==='live'?'':'none';if(empty)empty.style.display='none';if(more)more.style.display='none';
 }
 function paintLive(){
   if(state.mode!=='live')return;syncTabs();const grid=document.getElementById('liveMatchGrid'),empty=document.getElementById('liveWidgetEmpty');if(!grid)return;
   const rows=state.live;if(!rows.length){grid.innerHTML='';if(empty)empty.style.display='block';document.getElementById('liveWidgetCount').textContent='No matches live';return}
   if(empty)empty.style.display='none';grid.innerHTML=rows.map(x=>card(x,false)).join('');document.getElementById('liveWidgetCount').textContent=rows.length+' live';
 }
 function paintFinished(){
   if(state.mode!=='finished')return;syncTabs();const grid=document.getElementById('ks307FinishedGrid'),more=document.getElementById('ks307FinishedMore');if(!grid)return;
   const rows=state.finished.slice(0,state.shown);grid.innerHTML=rows.length?rows.map(x=>card(x,true)).join(''):'<div class="empty" style="padding:22px">No finished games were returned for the rolling previous 48 hours.</div>';
   if(more)more.style.display=state.finished.length>state.shown?'block':'none';document.getElementById('liveWidgetCount').textContent=state.finished.length+' finished · last 48h';
 }
 window.ks307SetLiveMode=function(mode){state.mode=mode==='finished'?'finished':'live';state.shown=24;syncTabs();state.mode==='live'?paintLive():paintFinished();if(state.mode==='finished')refreshFinished(false)};
 window.ks307LoadMoreFinished=function(){state.shown+=24;paintFinished()};
 async function json(url,ms=12000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,cache:'default',headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
 async function refreshLive(){
   try{
     const d=await json('/sports/live',9000),rows=Array.isArray(d?.games)?d.games:[];
     // A successful response is authoritative, including zero live matches.
     state.live=rows;
     try{localStorage.setItem(LIVE_KEY,JSON.stringify(rows.slice(0,500)))}catch(_){}
     if(state.mode==='live')paintLive();
     return true;
   }catch(_){
     // Network/server failure only: preserve and repaint last-good browser cache.
     if(state.mode==='live')paintLive();
     return false;
   }
 }
 async function refreshFinished(){
   // Existing last-good results paint first; network never clears them while waiting.
   if(!state.finished.length)state.finished=read(FIN_KEY);
   if(state.mode==='finished')paintFinished();
   try{
     const d=await json('/sports/finished?hours=48&limit=500',14000),fresh=Array.isArray(d?.matches)?d.matches:(Array.isArray(d?.games)?d.games:[]);
     // Empty is authoritative only when the backend reports a successful, non-stale result.
     if(fresh.length || (Number(d?.count)===0 && !d?.stale && !d?.refreshFailed)){
       state.finished=fresh;
       try{localStorage.setItem(FIN_KEY,JSON.stringify(fresh.slice(0,500)))}catch(_){}
       if(state.mode==='finished')paintFinished();
     }
     return true;
   }catch(_){
     if(state.mode==='finished')paintFinished();
     return false;
   }
 }
 function boot(){
   state.live=read(LIVE_KEY);state.finished=read(FIN_KEY);syncTabs();paintLive();
   // Cache first; network refresh is independent and never clears last-good rows.
   refreshLive();setTimeout(()=>refreshFinished(false),350);
   // Keep current live scores fresh without forcing a widget reload.
   setInterval(refreshLive,180000);
 }
 // Disable legacy scheduled/live toggling for this widget; exactly two primary controls own it now.
 window.toggleWidgetView=function(){window.ks307SetLiveMode(state.mode==='live'?'finished':'live')};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


(function(){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const countryCode={
  'england':'GB','scotland':'GB','wales':'GB','northern ireland':'GB','united kingdom':'GB','uk':'GB',
  'spain':'ES','germany':'DE','italy':'IT','france':'FR','south africa':'ZA','portugal':'PT','netherlands':'NL',
  'turkey':'TR','türkiye':'TR','brazil':'BR','argentina':'AR','usa':'US','united states':'US','united states of america':'US',
  'saudi arabia':'SA','belgium':'BE','austria':'AT','switzerland':'CH','greece':'GR','denmark':'DK','sweden':'SE',
  'norway':'NO','finland':'FI','poland':'PL','czech republic':'CZ','czechia':'CZ','croatia':'HR','serbia':'RS',
  'ukraine':'UA','romania':'RO','hungary':'HU','ireland':'IE','mexico':'MX','canada':'CA','japan':'JP','china':'CN',
  'south korea':'KR','korea republic':'KR','australia':'AU','new zealand':'NZ','morocco':'MA','egypt':'EG','tunisia':'TN',
  'algeria':'DZ','nigeria':'NG','ghana':'GH','senegal':'SN','cameroon':'CM','ivory coast':'CI','côte d’ivoire':'CI',
  'kenya':'KE','tanzania':'TZ','zambia':'ZM','zimbabwe':'ZW','botswana':'BW','namibia':'NA','mozambique':'MZ','angola':'AO',
  'albania':'AL','andorra':'AD','armenia':'AM','azerbaijan':'AZ','belarus':'BY','bosnia and herzegovina':'BA','bulgaria':'BG','cyprus':'CY','estonia':'EE','georgia':'GE','iceland':'IS','kosovo':'XK','latvia':'LV','liechtenstein':'LI','lithuania':'LT','luxembourg':'LU','malta':'MT','moldova':'MD','montenegro':'ME','north macedonia':'MK','slovakia':'SK','slovenia':'SI',
  'bolivia':'BO','chile':'CL','colombia':'CO','ecuador':'EC','guyana':'GY','paraguay':'PY','peru':'PE','suriname':'SR','uruguay':'UY','venezuela':'VE','costa rica':'CR','cuba':'CU','dominican republic':'DO','el salvador':'SV','guatemala':'GT','haiti':'HT','honduras':'HN','jamaica':'JM','nicaragua':'NI','panama':'PA','puerto rico':'PR','trinidad and tobago':'TT',
  'afghanistan':'AF','bahrain':'BH','bangladesh':'BD','bhutan':'BT','brunei':'BN','cambodia':'KH','hong kong':'HK','india':'IN','indonesia':'ID','iran':'IR','iraq':'IQ','israel':'IL','jordan':'JO','kazakhstan':'KZ','kuwait':'KW','kyrgyzstan':'KG','laos':'LA','lebanon':'LB','malaysia':'MY','maldives':'MV','mongolia':'MN','myanmar':'MM','nepal':'NP','north korea':'KP','oman':'OM','pakistan':'PK','palestine':'PS','philippines':'PH','qatar':'QA','singapore':'SG','sri lanka':'LK','syria':'SY','taiwan':'TW','tajikistan':'TJ','thailand':'TH','turkmenistan':'TM','united arab emirates':'AE','uae':'AE','uzbekistan':'UZ','vietnam':'VN','yemen':'YE',
  'benin':'BJ','burkina faso':'BF','burundi':'BI','cape verde':'CV','central african republic':'CF','chad':'TD','comoros':'KM','congo':'CG','dr congo':'CD','democratic republic of the congo':'CD','djibouti':'DJ','equatorial guinea':'GQ','eritrea':'ER','eswatini':'SZ','ethiopia':'ET','gabon':'GA','gambia':'GM','guinea':'GN','guinea-bissau':'GW','lesotho':'LS','liberia':'LR','libya':'LY','madagascar':'MG','malawi':'MW','mali':'ML','mauritania':'MR','mauritius':'MU','niger':'NE','rwanda':'RW','sierra leone':'SL','somalia':'SO','south sudan':'SS','sudan':'SD','togo':'TG','uganda':'UG','seychelles':'SC',
  'fiji':'FJ','papua new guinea':'PG','samoa':'WS','solomon islands':'SB','tonga':'TO','vanuatu':'VU'
 };
 function flag(country){
  const raw=String(country||'').trim(); if(!raw)return '';
  let code=/^[A-Za-z]{2}$/.test(raw)?raw.toUpperCase():countryCode[raw.toLowerCase()];
  if(!code||!/^[A-Z]{2}$/.test(code))return '';
  return String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0)));
 }
 function initials(name){return String(name||'Team').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'TM'}
 function badge(t){
  const src=String(t?.badge||t?.logo||t?.teamLogo||'').trim();
  if(!/^https?:\/\//i.test(src))return `<span class="ks308-team-placeholder" aria-hidden="true">${esc(initials(t?.name))}</span>`;
  return `<img class="ks308-team-badge" src="${esc(src)}" alt="${esc(t?.name||'Team')} badge" loading="lazy" decoding="async" onerror="this.outerHTML='<span class=&quot;ks308-team-placeholder&quot; aria-hidden=&quot;true&quot; fetchpriority="low">${esc(initials(t?.name))}</span>'">`;
 }
 window.ks308CountryFlag=flag;
 window.ks308TeamBadge=badge;
 const base=window.ks211LoadLeague;
 if(typeof base!=='function')return;
 window.ks211LoadLeague=async function(){
   const league=Number(document.getElementById('ks211League')?.value||39),el=document.getElementById('ks211LeagueTeams'),leaders=document.getElementById('ks211Leaders');
   if(!el)return;
   el.innerHTML='<div class="empty">Loading teams…</div>';
   const [teamsR,leadR]=await Promise.allSettled([get('/players/explorer',{league,season:2026}),get('/directory/discover',{league,season:2026})]);
   const td=teamsR.status==='fulfilled'?teamsR.value:{teams:[]};
   window.__ks211Teams=Array.isArray(td.teams)?td.teams:[];
   el.className='ks211-teams';
   const rows=window.__ks211Teams.map((t,i)=>{
     const ref=String(t.publicRef||t.ref||''); const f=flag(t.countryCode||t.country_code||t.iso2||t.country);
     return `<div class="ks211-team"><div class="ks211-team-head" role="link" tabindex="0" data-v308-team-ref="${esc(ref)}">${badge(t)}<div class="ks308-team-copy"><div class="ks308-team-name"><b>${esc(t.name||'Unknown team')}</b>${f?`<span class="ks308-country-flag" title="${esc(t.country)}" aria-label="${esc(t.country)} flag">${f}</span>`:''}</div><div class="sub">${esc(t.country||'')}</div></div></div><div class="ks211-squad" id="ks211sq${i}"><button onclick="ks211LoadSquad(${i})">View players</button></div></div>`;
   }).join('');
   el.innerHTML=`<h3 class="ks308-football-heading">Football Teams</h3>${rows||'<div class="empty">No teams available.</div>'}`;
   const ld=leadR.status==='fulfilled'?leadR.value:{players:[]};
   if(leaders){leaders.className='ks211-leaders';leaders.innerHTML=(ld.players||[]).map(p=>`<div class="ks211-player" onclick="location.href='/players/'+encodeURIComponent(${JSON.stringify(p.publicRef||'')})">${typeof img==='function'?img(p.photo,p.name):''}<div><b>${esc(p.name)}</b><div class="sub">${esc(p.team||'')} ${p.goals!=null?'· '+esc(p.goals)+' goals':''}</div></div></div>`).join('')||'<div class="empty">No player data available.</div>'}
 };
 document.addEventListener('click',e=>{const row=e.target.closest('[data-v308-team-ref]');if(!row)return;const ref=row.dataset.v308TeamRef;if(ref)location.href='/teams/'+encodeURIComponent(ref)});
 document.addEventListener('keydown',e=>{const row=e.target.closest?.('[data-v308-team-ref]');if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const ref=row.dataset.v308TeamRef;if(ref)location.href='/teams/'+encodeURIComponent(ref)}});
 // Correct the global directory spelling without changing its data behavior.
 const dir=window.v249LoadDirectory;
 if(typeof dir==='function')window.v249LoadDirectory=async function(){const r=await dir.apply(this,arguments);const sp=String(arguments[0]||'football').toLowerCase();if(sp==='football'){const root=document.getElementById('v249DirectoryBody');const h=root?.querySelector('h3');if(h)h.textContent='Football Teams'}return r};
})();


(function(){
 if(window.__KASI_V318__)return;window.__KASI_V318__=true;
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const leagueNames={'39':'Premier League','140':'La Liga','78':'Bundesliga','135':'Serie A','61':'Ligue 1','288':'PSL South Africa','2':'Champions League','3':'Europa League','848':'Conference League','94':'Primeira Liga','88':'Eredivisie','203':'Süper Lig','71':'Série A','128':'Liga Profesional','253':'MLS','307':'Pro League'};
 async function J(path,params={}){const u=new URL(path,location.origin);Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null)u.searchParams.set(k,v)});const r=await fetch(u,{headers:{Accept:'application/json'},cache:'default'});if(!r.ok)throw Error(String(r.status));return r.json()}

 // Finished Games exists only in Live. Remove the old Fixtures copy and its legacy owner.
 function removeFixtureFinished(){document.getElementById('finishedGamesCard')?.remove()}
 removeFixtureFinished();document.addEventListener('DOMContentLoaded',removeFixtureFinished);

 // Player Leaderboard is admin-only. Move the existing widget; do not duplicate it.
 function moveLeaderboard(){const lb=document.getElementById('ks213PremierLeaderboard'),admin=document.getElementById('adminWidgetTools');if(lb&&admin&&!admin.contains(lb)){admin.appendChild(lb);lb.dataset.adminMoved='true'}}
 moveLeaderboard();document.addEventListener('DOMContentLoaded',moveLeaderboard);
 const oldAdmin=window.toggleAdminWidget;window.toggleAdminWidget=function(){const r=typeof oldAdmin==='function'?oldAdmin.apply(this,arguments):undefined;moveLeaderboard();return r};

 // One selected league drives Explorer + Player Performance and synchronises Standings when supported.
 window.ks211LoadLeague=async function(){
   const sel=document.getElementById('ks211League'),league=String(sel?.value||'39'),el=document.getElementById('ks211LeagueTeams'),leaders=document.getElementById('ks211Leaders');if(!el)return;
   el.innerHTML='<div class="empty">Loading '+E(sel?.selectedOptions?.[0]?.textContent||'league')+' teams…</div>';if(leaders)leaders.innerHTML='<div class="empty">Loading selected-league player performance…</div>';
   const [tr,lr]=await Promise.allSettled([J('/players/explorer',{league,season:2026}),J('/directory/discover',{league,season:2026})]);
   const td=tr.status==='fulfilled'?tr.value:{teams:[]},ld=lr.status==='fulfilled'?lr.value:{players:[]};window.__ks211Teams=Array.isArray(td.teams)?td.teams:[];
   el.innerHTML='<h3>Football Teams · '+E(sel?.selectedOptions?.[0]?.textContent||leagueNames[league]||'Selected league')+'</h3>'+(window.__ks211Teams.length?window.__ks211Teams.map((t,i)=>`<div class="ks211-team"><div class="ks211-team-head" role="link" tabindex="0" onclick="location.href='/teams/${encodeURIComponent(t.publicRef||t.ref||'')}'">${t.badge?`<img src="${E(t.badge)}" alt="" loading="lazy" style="width:34px;height:34px;object-fit:contain" onerror="this.style.display='none'" fetchpriority="low">`:''}<div><b>${E(t.name||'Team')}</b><div class="sub">${E(t.country||'')}</div></div></div><div class="ks211-squad" id="ks211sq${i}"><button onclick="ks211LoadSquad(${i})">View players</button></div></div>`).join(''):'<div class="empty">No teams returned for this league.</div>');
   if(leaders)leaders.innerHTML=(ld.players||[]).length?(ld.players||[]).map(p=>`<div class="ks211-player" onclick="location.href='/players/${encodeURIComponent(p.publicRef||'')}'">${p.photo?`<img src="${E(p.photo)}" alt="" loading="lazy" onerror="this.style.display='none'" fetchpriority="low">`:''}<div><b>${E(p.name)}</b><div class="sub">${E(p.team||'')} ${p.goals!=null?'· '+E(p.goals)+' goals':''}</div></div></div>`).join(''):'<div class="empty">No player performance returned for this league.</div>';
   const hs=document.getElementById('homeStandingsLeague'),name=leagueNames[league];if(hs&&name&&[...hs.options].some(o=>o.value===name)){hs.value=name;try{await window.loadHomeStandings?.()}catch(_){}}
 };

 // Prediction Pool: retry the canonical endpoint and keep model-only rows; never blank good cached rows.
 let predBusy=false;window.ks318LoadPredictionPool=async function(){if(predBusy)return;predBusy=true;try{const lg=document.getElementById('league')?.value||'ALL';const d=await J('/ai-predictions',{league:lg,type:'upcoming',limit:100,refresh:0}),rows=d.predictions||d.matches||[];if(rows.length){window.S=window.S||{};S.predictions=rows;try{renderPredictions();renderOverview()}catch(_){}}else if(!(window.S?.predictions||[]).length){const el=document.getElementById('predictionList');if(el)el.innerHTML='<div class="empty">No prediction data available for the current upcoming fixture window.</div>'}}catch(_){if(!(window.S?.predictions||[]).length){const el=document.getElementById('predictionList');if(el)el.innerHTML='<div class="empty">Prediction data is temporarily unavailable. Cached data will remain when available.</div>'}}finally{predBusy=false}};

 // Tip: fail soft. Do not expose raw 502/provider wording to visitors.
 window.ks318LoadTip=async function(){const body=document.getElementById('totdBody'),badge=document.getElementById('totdConf');if(!body)return;try{const d=await J('/tip-of-day'),rows=d.tips||[];if(rows.length){if(badge)badge.textContent=d.state==='current'?'Current top 2':d.state==='model-current'?'Current model top 2':'Previous best 2';body.innerHTML=rows.map(x=>{const p=x.prediction||{};return `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${E(x.home)} vs ${E(x.away)}</b><div class="sub">${E(p.bestPick||p.winner||x.bestOutcome||'—')} · ${Number(p.confidence||x.confidence||0).toFixed(1)}%</div></div>`}).join('');try{localStorage.setItem('kasi:last-tip-of-day',JSON.stringify(d))}catch(_){}}else{let c=null;try{c=JSON.parse(localStorage.getItem('kasi:last-tip-of-day')||'null')}catch(_){}if(c?.tips?.length){if(badge)badge.textContent='Last cached';body.innerHTML=c.tips.map(x=>`<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${E(x.home)} vs ${E(x.away)}</b><div class="sub">${E(x.prediction?.bestPick||x.prediction?.winner||'—')} · ${Number(x.prediction?.confidence||x.confidence||0).toFixed(1)}%</div></div>`).join('')}else{if(badge)badge.textContent='No data';body.innerHTML='<div class="empty">No Tip of the Day data is currently available.</div>'}}}catch(_){let c=null;try{c=JSON.parse(localStorage.getItem('kasi:last-tip-of-day')||'null')}catch(_){}if(c?.tips?.length){if(badge)badge.textContent='Last cached';body.innerHTML=c.tips.map(x=>`<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${E(x.home)} vs ${E(x.away)}</b><div class="sub">${E(x.prediction?.bestPick||x.prediction?.winner||'—')} · ${Number(x.prediction?.confidence||x.confidence||0).toFixed(1)}%</div></div>`).join('')}else{if(badge)badge.textContent='Temporarily unavailable';body.innerHTML='<div class="empty">Tip of the Day is temporarily unavailable. Please retry shortly.</div>'}}};

 // Fixtures exports: if the in-memory list is empty, fetch the current fixture pool before exporting.
 async function exportRowsFresh(){let rows=(window.S?.fixtures||[]);if(!rows.length){const lg=document.getElementById('league')?.value||'ALL';const d=await J('/fixtures/with-odds',{league:lg,type:'upcoming',refresh:0});rows=d.matches||d.fixtures||[];window.S=window.S||{};S.fixtures=rows}return rows.map(m=>{const o=(typeof odds==='function'?odds(m):(m.odds||{}))||{},p=m.prediction||{};return {dateTime:(typeof kickoff==='function'?kickoff(m):(m.datetime||m.date||'')),competition:m.league||m.competition||'',country:m.country||m.leagueCountry||'',homeTeam:m.home||m.homeTeam||'',awayTeam:m.away||m.awayTeam||'',status:m.status||'',score:m.score||'',kasiPrediction:(typeof winner==='function'?winner(m):(p.winner||p.bestPick||'')),confidence:(typeof conf==='function'?conf(m):(p.confidence||'')),homeOdds:o.homeWin||'',drawOdds:o.draw||'',awayOdds:o.awayWin||''}})}
 async function doExport(format){try{const rows=await exportRowsFresh();if(!rows.length){alert('No fixtures are currently available to export.');return}const r=await fetch('/exports/fixtures/'+format,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({league:document.getElementById('league')?.value||'ALL',rows})});if(!r.ok)throw Error('Export failed ('+r.status+')');const blob=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kasi-sports-news-fixtures.'+format;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}catch(e){alert('Unable to export fixtures: '+e.message)}}
 window.downloadFixturesCSV=()=>doExport('csv');window.downloadFixturesPDF=()=>doExport('pdf');

 document.addEventListener('DOMContentLoaded',()=>{removeFixtureFinished();moveLeaderboard();setTimeout(()=>{window.ks318LoadPredictionPool();window.ks318LoadTip()},900)});
 setTimeout(()=>{removeFixtureFinished();moveLeaderboard();window.ks318LoadPredictionPool();window.ks318LoadTip()},3500);
})();


(function(){
 if(window.__KASI_V320_FETCH__)return; window.__KASI_V320_FETCH__=true;
 const nativeFetch=window.fetch.bind(window), pending=new Map();
 window.fetch=function(input,init){
   try{
     const method=String(init?.method||'GET').toUpperCase();
     if(method!=='GET')return nativeFetch(input,init);
     // v340: abortable requests are widget-owned. Never coalesce them, otherwise
     // one widget timeout aborts every caller sharing the same underlying fetch.
     if(init?.signal)return nativeFetch(input,init);
     const url=typeof input==='string'?input:String(input?.url||input);
     // Coalesce only identical same-origin GETs. Every caller receives its own clone.
     const abs=new URL(url,location.href);
     if(abs.origin!==location.origin)return nativeFetch(input,init);
     const key=method+' '+abs.href;
     const existing=pending.get(key);
     if(existing)return existing.then(r=>r.clone());
     const p=nativeFetch(input,init);
     pending.set(key,p);
     p.finally(()=>setTimeout(()=>{if(pending.get(key)===p)pending.delete(key)},1200));
     return p.then(r=>r.clone());
   }catch(_){return nativeFetch(input,init)}
 };
})();


(function(){
 if(window.__KASI_V321_CWV__)return; window.__KASI_V321_CWV__=true;
 // Lightweight local diagnostics only: no network calls and no analytics provider.
 try{
   window.__kasiCWV={cls:0,lcp:0,longTasks:0};
   new PerformanceObserver(list=>{
     for(const e of list.getEntries()){
       if(!e.hadRecentInput) window.__kasiCWV.cls+=e.value||0;
     }
   }).observe({type:'layout-shift',buffered:true});
   new PerformanceObserver(list=>{
     const a=list.getEntries(); if(a.length) window.__kasiCWV.lcp=a[a.length-1].startTime||0;
   }).observe({type:'largest-contentful-paint',buffered:true});
   new PerformanceObserver(list=>{
     window.__kasiCWV.longTasks+=list.getEntries().length;
   }).observe({type:'longtask',buffered:true});
 }catch(_){}
})();


(function(){
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const token=()=>localStorage.getItem('kasiscore_session')||'';
 const api=async(path,opt={})=>{opt.headers={...(opt.headers||{}),Authorization:'Bearer '+token()};if(opt.body)opt.headers['Content-Type']='application/json';const r=await fetch((typeof base==='function'?base():'')+path,opt);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||('Request failed '+r.status));return d};
 window.openNewsEditor=async function(){document.getElementById('ksNewsEditor').style.display='block';ksNewsNew();await ksNewsLoad()};
 window.ksNewsNew=function(){['OriginalSlug','Title','Image','Summary','Content','Slug','SeoTitle','SeoDesc'].forEach(x=>{const e=document.getElementById('ksne'+x);if(e)e.value=''});document.getElementById('ksneImageFile').value='';document.getElementById('ksneImagePreview').style.display='none';document.getElementById('ksneImagePreview').removeAttribute('src');document.getElementById('ksneImageState').textContent='An image is required before this article can be saved.';document.getElementById('ksneSport').value='football';document.getElementById('ksnePlacement').value='sports_news';document.getElementById('ksneImageFormat').value='horizontal';ksNewsApplyImageFormat();document.getElementById('ksneCategory').value='Sports';document.getElementById('ksneAuthor').value='Kasi Sports News';document.getElementById('ksneStatus').value='draft';document.getElementById('ksneMsg').textContent='New article';ksNewsUrlPreview()};
 window.ksNewsLoad=async function(){const el=document.getElementById('ksneList');el.innerHTML='<div class="empty">Loading articles…</div>';try{const d=await api('/admin/news');window.__ksEditorial=d.items||[];el.innerHTML=window.__ksEditorial.map((a,i)=>`<div class="ksne-row"><div><b>${E(a.title)}</b><div class="sub">${E(a.status)} · /news/${E(a.slug)}</div></div><div class="ksne-actions"><button onclick="ksNewsEdit(${i})">Edit</button>${a.status==='published'?`<button onclick="ksNewsCopy(${JSON.stringify(a.slug)})">Copy Link</button><button onclick="window.open('/news/${encodeURIComponent(a.slug)}','_blank')">View</button>`:''}<button onclick="ksNewsDelete(${JSON.stringify(a.slug)})">Delete</button></div></div>`).join('')||'<div class="empty">No articles yet.</div>'}catch(e){el.innerHTML='<div class="empty">'+E(e.message)+'</div>'}};
 window.ksNewsEdit=function(i){const a=window.__ksEditorial?.[i];if(!a)return;document.getElementById('ksneOriginalSlug').value=a.slug||'';document.getElementById('ksneTitle').value=a.title||'';document.getElementById('ksneSport').value=a.sport||'all';document.getElementById('ksneCategory').value=a.category||'Sports';document.getElementById('ksneAuthor').value=a.author||'Kasi Sports News';document.getElementById('ksneStatus').value=a.status||'draft';document.getElementById('ksnePlacement').value=a.placement||'sports_news';document.getElementById('ksneImageFormat').value=a.image_format||'horizontal';ksNewsApplyImageFormat();document.getElementById('ksneImage').value=a.image_url||'';const pv=document.getElementById('ksneImagePreview');if(a.image_url){pv.src=a.image_url;pv.style.display='block';document.getElementById('ksneImageState').textContent='Current article image.'}else{pv.style.display='none';document.getElementById('ksneImageState').textContent='An image is required before this article can be saved.'}document.getElementById('ksneSummary').value=a.summary||'';document.getElementById('ksneContent').value=a.content||'';document.getElementById('ksneSlug').value=a.slug||'';document.getElementById('ksneSeoTitle').value=a.seo_title||'';document.getElementById('ksneSeoDesc').value=a.seo_description||'';ksNewsUrlPreview();document.querySelector('#ksNewsEditor .ksne-shell').scrollIntoView({behavior:'smooth'})};
 window.ksNewsSave=async function(){const old=document.getElementById('ksneOriginalSlug').value.trim(),payload={title:document.getElementById('ksneTitle').value.trim(),sport:document.getElementById('ksneSport').value,placement:document.getElementById('ksnePlacement').value,category:document.getElementById('ksneCategory').value.trim(),author:document.getElementById('ksneAuthor').value.trim(),status:document.getElementById('ksneStatus').value,image_url:document.getElementById('ksneImage').value.trim(),image_format:document.getElementById('ksneImageFormat').value,summary:document.getElementById('ksneSummary').value.trim(),content:document.getElementById('ksneContent').value.trim(),slug:document.getElementById('ksneSlug').value.trim(),seo_title:document.getElementById('ksneSeoTitle').value.trim(),seo_description:document.getElementById('ksneSeoDesc').value.trim()};if(!payload.title){document.getElementById('ksneMsg').textContent='Headline is required.';return}if(!payload.image_url){document.getElementById('ksneMsg').textContent='Article image is required. Please add an image first.';return}try{const d=await api(old?'/admin/news/'+encodeURIComponent(old):'/admin/news',{method:old?'PUT':'POST',body:JSON.stringify(payload)});document.getElementById('ksneOriginalSlug').value=d.article.slug;document.getElementById('ksneSlug').value=d.article.slug;document.getElementById('ksneMsg').textContent=(payload.status==='published'?'Published: ':'Saved: ')+d.url;await ksNewsLoad()}catch(e){document.getElementById('ksneMsg').textContent=e.message}};
 window.ksNewsApplyImageFormat=function(){const pv=document.getElementById('ksneImagePreview'),fmt=document.getElementById('ksneImageFormat')?.value||'horizontal';if(!pv)return;if(fmt==='vertical'){pv.style.aspectRatio='4 / 5';pv.style.width='min(100%,520px)';pv.style.marginLeft='auto';pv.style.marginRight='auto'}else{pv.style.aspectRatio='16 / 9';pv.style.width='100%';pv.style.marginLeft='0';pv.style.marginRight='0'}pv.style.objectFit='cover'};
 window.ksNewsUrlPreview=function(){const slug=(document.getElementById('ksneSlug').value.trim()||document.getElementById('ksneTitle').value.trim()).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,130)||'your-article-title';document.getElementById('ksneUrlPreview').textContent='https://kasilivescore.com/news/'+slug};
 window.ksNewsUploadImage=async function(file){if(!file)return;if(file.size>8*1024*1024){document.getElementById('ksneMsg').textContent='Image must be 8 MB or smaller.';return}const msg=document.getElementById('ksneImageState');msg.textContent='Uploading image…';try{const r=await fetch((typeof base==='function'?base():'')+'/admin/news/image',{method:'POST',headers:{Authorization:'Bearer '+token(),'Content-Type':file.type},body:file});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||('Image upload failed '+r.status));document.getElementById('ksneImage').value=d.url;const pv=document.getElementById('ksneImagePreview');pv.src=d.url;pv.style.display='block';msg.textContent='Image added successfully.';document.getElementById('ksneMsg').textContent='Image ready.'}catch(e){msg.textContent='Image upload failed.';document.getElementById('ksneMsg').textContent=e.message}};
 document.getElementById('ksneImageFile').addEventListener('change',e=>ksNewsUploadImage(e.target.files&&e.target.files[0]));
 document.getElementById('ksneTitle').addEventListener('input',ksNewsUrlPreview);document.getElementById('ksneSlug').addEventListener('input',ksNewsUrlPreview);
 window.ksNewsCopy=async function(slug){const u='https://kasilivescore.com/news/'+slug;try{await navigator.clipboard.writeText(u);document.getElementById('ksneMsg').textContent='Link copied: '+u}catch(_){prompt('Copy article link',u)}};
 window.ksNewsDelete=async function(slug){if(!confirm('Delete this article?'))return;try{await api('/admin/news/'+encodeURIComponent(slug),{method:'DELETE'});ksNewsNew();await ksNewsLoad()}catch(e){document.getElementById('ksneMsg').textContent=e.message}};
})();


(function(){
 // v344: duplicate Admin Back Home owner removed.
 // Reassert badge/flag renderer after all legacy scripts have executed.
 const badgeOwner=window.ks211LoadLeague;
 if(typeof badgeOwner==='function')window.ks211LoadLeague=badgeOwner;
})();


(function(){
 'use strict';
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const J=async(path,params={})=>{const u=new URL(path,location.origin);Object.entries(params).forEach(([k,v])=>v!=null&&u.searchParams.set(k,v));const r=await fetch(u,{headers:{Accept:'application/json'},cache:'default'});if(!r.ok)throw Error(String(r.status));return r.json()};
 const cc={'england':'GB','spain':'ES','germany':'DE','italy':'IT','france':'FR','south africa':'ZA','netherlands':'NL','portugal':'PT','belgium':'BE','scotland':'GB','turkey':'TR','brazil':'BR','argentina':'AR','usa':'US','united states':'US','mexico':'MX','saudi arabia':'SA'};
 const flag=c=>{const raw=String(c||'').trim(),code=/^[A-Za-z]{2}$/.test(raw)?raw.toUpperCase():cc[raw.toLowerCase()];return code&&/^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(x=>127397+x.charCodeAt(0))):''};
 const initials=n=>String(n||'Team').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
 const badge=t=>{const src=String(t?.badge||t?.logo||t?.teamLogo||'').trim();return /^https?:\/\//i.test(src)?`<img class="ks308-team-badge" src="${E(src)}" alt="${E(t?.name||'Team')} badge" loading="lazy" decoding="async" onerror="this.style.display='none'">`:`<span class="ks308-team-placeholder">${E(initials(t?.name))}</span>`};

 // 1) Football Teams: final renderer; do not let the older text-only renderer win later.
 window.ks211LoadLeague=async function(){
   const sel=document.getElementById('ks211League'),league=String(sel?.value||'39'),el=document.getElementById('ks211LeagueTeams'),leaders=document.getElementById('ks211Leaders');if(!el)return;
   el.innerHTML='<div class="empty">Loading teams…</div>';
   try{
     const [tr,lr]=await Promise.allSettled([J('/players/explorer',{league,season:2026}),J('/directory/discover',{league,season:2026})]);
     const td=tr.status==='fulfilled'?tr.value:{teams:[]},teams=Array.isArray(td.teams)?td.teams:[];window.__ks211Teams=teams;
     el.className='ks211-teams';el.innerHTML='<h3 class="ks308-football-heading">Football Teams</h3>'+(teams.length?teams.map((t,i)=>{const ref=String(t.publicRef||t.ref||t.id||''),f=flag(t.countryCode||t.country_code||t.iso2||t.country);return `<div class="ks211-team"><div class="ks211-team-head" role="link" tabindex="0" data-v332-team="${E(ref)}">${badge(t)}<div class="ks308-team-copy"><div class="ks308-team-name"><b>${E(t.name||'Team')}</b>${f?`<span class="ks308-country-flag" title="${E(t.country||'')}">${f}</span>`:''}</div><div class="sub">${E(t.country||'')}</div></div><a href="/teams/${encodeURIComponent(ref)}" class="match-stats-btn" onclick="event.stopPropagation()">Open</a></div><div class="ks211-squad" id="ks211sq${i}"><button onclick="event.stopPropagation();ks211LoadSquad(${i})">View players</button></div></div>`}).join(''):'<div class="empty">No teams available.</div>');
     const ld=lr.status==='fulfilled'?lr.value:{players:[]};if(leaders)leaders.innerHTML=(ld.players||[]).map(p=>`<div class="ks211-player" onclick="location.href='/players/${encodeURIComponent(p.publicRef||p.ref||p.id||'')}'">${p.photo?`<img src="${E(p.photo)}" alt="" loading="lazy">`:''}<div><b>${E(p.name||'Player')}</b><div class="sub">${E(p.team||'')}</div></div></div>`).join('')||'<div class="empty">No players currently available from the provider.</div>';
   }catch(_){el.innerHTML='<div class="empty">No team data available.</div>'}
 };
 document.addEventListener('click',e=>{const x=e.target.closest('[data-v332-team]');if(x&&!e.target.closest('a,button'))location.href='/teams/'+encodeURIComponent(x.dataset.v332Team||'')},true);

 // 2) Fixtures: keep the broad rendered pool and make the counter describe what is actually visible.
 const oldFx=window.v249LoadFixtures;window.v249LoadFixtures=async function(){const r=await oldFx?.apply(this,arguments);const el=document.getElementById('fixtureList'),b=document.getElementById('fixtureSourceBadge');if(b&&el){const n=el.querySelectorAll('.v249-row').length;b.textContent=n+' upcoming fixtures'}return r};

 // 3) Tip: current two picks, otherwise exactly the real comparison examples returned by the server.
 window.ks318LoadTip=async function(){const body=document.getElementById('totdBody'),b=document.getElementById('totdConf');if(!body)return;try{const d=await J('/tip-of-day'),tips=Array.isArray(d.tips)?d.tips:[],cmp=Array.isArray(d.comparisonFallback)?d.comparisonFallback:[];if(d.state==='current'&&tips.length){b&&(b.textContent='Current top 2');body.innerHTML=tips.slice(0,2).map(x=>{const p=x.prediction||{};return `<div style="padding:12px 0;border-bottom:1px solid var(--line)"><b>${E(x.home)} vs ${E(x.away)}</b><div class="sub">Kasi Prediction: ${E(p.bestPick||p.winner||'—')} · ${Number(p.confidence||x.confidence||0).toFixed(1)}%</div></div>`}).join('');return}if(cmp.length){b&&(b.textContent='Kasi vs Bookmaker · '+Math.min(3,cmp.length)+' examples');body.innerHTML=cmp.slice(0,3).map(x=>`<div class="ks327-compare"><div class="ks327-compare-title">${E(x.home)} vs ${E(x.away)}</div><div class="ks327-compare-line">Kasi Prediction: <b>${E(x.kasiPick||'—')}</b> · ${Number(x.kasiConfidence||0).toFixed(1)}%</div><div class="ks327-compare-line">Bookmaker Pick: <b>${E(x.bookmakerPick||'—')}</b>${x.bookmakerOdds?' · '+Number(x.bookmakerOdds).toFixed(2):''}</div></div>`).join('');return}b&&(b.textContent='No qualifying games');body.innerHTML='<div class="empty">No bookmaker-qualified current or stored comparison games are available.</div>'}catch(_){b&&(b.textContent='Using last saved data');let c=null;try{c=JSON.parse(localStorage.getItem('kasi:last-tip-of-day')||'null')}catch(e){}if(c?.tips?.length){body.innerHTML=c.tips.slice(0,2).map(x=>`<div style="padding:12px 0;border-bottom:1px solid var(--line)"><b>${E(x.home)} vs ${E(x.away)}</b></div>`).join('')}else body.innerHTML='<div class="empty">Tip data is updating.</div>'}};

 // 4) Finished Games: final capture-phase tab owner so no legacy Live renderer can repaint it.
 function finishedClick(e){const f=e.target.closest('#ks307FinishedBtn'),l=e.target.closest('#ks307LiveBtn');if(!f&&!l)return;e.preventDefault();e.stopImmediatePropagation();if(f){document.body.dataset.kasiLiveView='finished';window.ks307SetLiveMode?.('finished')}else{document.body.dataset.kasiLiveView='live';window.ks307SetLiveMode?.('live')}}
 document.addEventListener('click',finishedClick,true);

 // v344: duplicate Admin Back Home capture listener removed; final controller owns the action.

 function boot(){window.ks211LoadLeague?.();window.ks318LoadTip?.();window.v249LoadFixtures?.()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1500),{once:true});else setTimeout(boot,1500);
})();


(function(){
 'use strict';
 if(window.__KASI_V344_STEP5__)return;window.__KASI_V344_STEP5__=true;
 const CLIENT='ca-pub-5442799591686279';
 // Real slot IDs only. Keep blank until each responsive unit is created in AdSense.
 const SLOTS={
   home_after_live:'6725085167',
   fixtures_content:'3902732276',
   news_in_feed:'4261824927',
   article_in_content:'4261824927',
   match_centre:'3030391892',
 };
 window.KasiAdSenseStep5={client:CLIENT,slots:SLOTS};
 // No genuine manual unit IDs yet: keep architecture inert with zero layout/network overhead.
 if(!Object.values(SLOTS).some(v=>String(v||'').trim()))return;
 function make(key){
   const slot=String(SLOTS[key]||'').trim();if(!slot)return null;
   const box=document.createElement('div');box.className='ksn-manual-ad';box.dataset.ksnAd=key;box.setAttribute('aria-label','Advertisement');
   box.innerHTML='<ins class="adsbygoogle" style="display:block" data-ad-client="'+CLIENT+'" data-ad-slot="'+slot+'" data-ad-format="auto" data-full-width-responsive="true"></ins>';
   try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(_){}
   const ins=box.querySelector('ins.adsbygoogle');
   if(ins){const obs=new MutationObserver(()=>{if(ins.getAttribute('data-ad-status')==='unfilled'){box.dataset.adCollapsed='1';obs.disconnect()}else if(ins.getAttribute('data-ad-status')==='filled'){delete box.dataset.adCollapsed;obs.disconnect()}});obs.observe(ins,{attributes:true,attributeFilter:['data-ad-status']});}
   return box;
 }
 function after(target,key){if(!target||document.querySelector('[data-ksn-ad="'+key+'"]'))return;const ad=make(key);if(ad)target.insertAdjacentElement('afterend',ad)}
 function inside(target,key,beforeEnd=false){if(!target||document.querySelector('[data-ksn-ad="'+key+'"]'))return;const ad=make(key);if(ad)target.insertAdjacentElement(beforeEnd?'beforeend':'afterbegin',ad)}
 function place(){
   if(document.body.classList.contains('ks-admin-open'))return;
   after(document.getElementById('liveScoresWidget'),'home_after_live');
   const fixtureAnchor=document.getElementById('v246CricketFixtures')?.closest('.card,.sports-card,.fc-card')||document.getElementById('v246CricketFixtures')||document.getElementById('fixtureList')?.closest('.card,.sports-card,.fc-card')||document.getElementById('fixtureList');
   after(fixtureAnchor,'fixtures_content');
   const feed=document.getElementById('homeCountryNewsGrid');if(feed&&feed.children.length>=4){const ad=make('news_in_feed');if(ad&&!document.querySelector('[data-ksn-ad="news_in_feed"]'))feed.children[3].insertAdjacentElement('afterend',ad)}
   const article=document.querySelector('.ks-news-article,.news-article,article[data-kasi-news]');if(article)inside(article,'article_in_content',true);
   const centre=document.querySelector('.match-centre,.matchstats-grid,.ks-match-centre');if(centre)inside(centre,'match_centre',true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',place,{once:true});else place();
 new MutationObserver(()=>{if(!document.body.classList.contains('ks-admin-open'))place()}).observe(document.body,{childList:true,subtree:true});
})();


(function(){
'use strict';
if(window.__KASI_V349__)return;window.__KASI_V349__=true;
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,fallback=[])=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??fallback}catch(_){return fallback}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
const get=(o,...ks)=>{for(const k of ks){let x=o;for(const p of k.split('.'))x=x?.[p];if(x!==undefined&&x!==null&&x!=='')return x}return''};
function dt(v){try{return v?new Date(v).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):''}catch(_){return''}}
function liveNorm(x,finished=false){x=x||{};return {id:get(x,'id','fixtureId','providerFixtureId','fixture.id','_afootFixtureId'),sport:String(get(x,'sport')||'football').toLowerCase(),country:String(get(x,'country','countryName','category.name','league.country')||'International'),league:String((typeof x.league==='string'?x.league:'')||get(x,'leagueName','competition.name','tournament.name','league.name')||'Other matches'),home:String(get(x,'home','homeName','homeTeam.name','teams.home.name')||'Home'),away:String(get(x,'away','awayName','awayTeam.name','teams.away.name')||'Away'),hl:String(get(x,'homeLogo','homeBadge','homeTeam.logo','teams.home.logo')||''),al:String(get(x,'awayLogo','awayBadge','awayTeam.logo','teams.away.logo')||''),hs:get(x,'homeScore','homeGoals','goals.home','score.fulltime.home','score.home'),as:get(x,'awayScore','awayGoals','goals.away','score.fulltime.away','score.away'),date:get(x,'date','datetime','startTime','commenceTime','fixture.date'),status:String(get(x,'statusShort','fixture.status.short','status','state','min')||(finished?'FT':'LIVE')),finished};}
function img(u){return /^https?:\/\//i.test(u)?`<img src="${E(u)}" alt="" loading="eager" decoding="async" style="width:34px;height:34px;object-fit:contain">`:''}
function liveRow(m){const score=m.hs!==''&&m.as!==''?`${E(m.hs)} – ${E(m.as)}`:'—';const href=m.id?(m.sport==='football'?`/matches/${encodeURIComponent(m.id)}/stats`:`/match/${encodeURIComponent(m.sport)}/${encodeURIComponent(m.id)}`):'';return `<div class="ks340-match"><div class="ks340-meta"><span class="ks340-sport">${E(m.sport)}</span>${E(dt(m.date))}</div><div><div class="ks340-teams"><span class="ks340-team">${img(m.hl)}${E(m.home)}</span><span class="ks340-score">${score}</span><span class="ks340-team">${E(m.away)}${img(m.al)}</span></div><div class="ks340-status">${E(m.country)} · ${E(m.league)} · ${E(m.finished?'FT':m.status)}</div></div><div class="ks340-action">${href?`<a href="${E(href)}">Stats</a>`:''}</div></div>`}
function grouped(rows,finished=false){const g=new Map();(rows||[]).map(x=>liveNorm(x,finished)).forEach(m=>{const k=m.country+'|||'+m.league;if(!g.has(k))g.set(k,{country:m.country,league:m.league,rows:[]});g.get(k).rows.push(m)});return [...g.values()].map(x=>`<section class="ks340-group"><div class="ks340-head"><b>${E(x.country)}</b><span>${E(x.league)}</span><em>${x.rows.length} ${finished?'finished':'live'}</em></div>${x.rows.map(liveRow).join('')}</section>`).join('')}
function paintInstantLive(){const live=read('ks:v340:live:last-good',[]),fin=read('ks:v340:finished:last-good',[]);if(live.length){const h=grouped(live,false);for(const id of ['liveList','liveMatchGrid']){const el=document.getElementById(id);if(el)el.innerHTML=h}}if(fin.length){const el=document.getElementById('ks307FinishedGrid');if(el)el.innerHTML=grouped(fin,true)}document.documentElement.dataset.v349Instant='1';}
function fixtureRow(x,sp='football'){const id=x.id||x.fixtureId||x._afootFixtureId||x.providerFixtureId||'',home=x.home||x.homeTeam||x.teams?.home?.name||'Home',away=x.away||x.awayTeam||x.teams?.away?.name||'Away',league=x.league||x.competition||x.leagueName||'',country=x.country||x.countryName||'',date=x.datetime||x.date||x.startTime||'',url=id?(sp==='football'?`/matches/${encodeURIComponent(id)}/stats`:`/match/${encodeURIComponent(sp)}/${encodeURIComponent(id)}`):'';return `<div class="v249-row"><div><b>${E(dt(date))}</b><div class="sub">${E(country)}</div></div><div><b>${E(home)} vs ${E(away)}</b><div class="sub">${E(league)} · ${E(x.status||'Upcoming')}</div></div><div>${url?`<a class="match-stats-btn" href="${E(url)}">Stats</a>`:'Fixture'}</div></div>`}
function paintFixtureCache(){const football=read('ks:v349:fixtures:football:last-good',[]);if(football.length){const el=document.getElementById('fixtureList');if(el)el.innerHTML=`<div data-v349-fixtures="1">${football.map(x=>fixtureRow(x)).join('')}</div>`}for(const sp of ['rugby','cricket']){const rows=read(`ks:v349:fixtures:${sp}:last-good`,[]),el=document.getElementById(sp==='rugby'?'v246RugbyFixtures':'v246CricketFixtures');if(rows.length&&el){el.classList.add('ks-v349-sport-fixtures');el.innerHTML=rows.map(x=>fixtureRow(x,sp)).join('')}}}
async function refreshFootballFixtures(){try{const league=document.getElementById('league')?.value||'ALL',r=await fetch('/fixtures?league='+encodeURIComponent(league)+'&type=upcoming',{headers:{Accept:'application/json'},cache:'default'});if(!r.ok)throw 0;const d=await r.json(),rows=(d.matches||[]).filter(x=>!x.isFinished).slice(0,60);if(rows.length){write('ks:v349:fixtures:football:last-good',rows);const el=document.getElementById('fixtureList');if(el)el.innerHTML=`<div data-v349-fixtures="1">${rows.map(x=>fixtureRow(x)).join('')}</div>`;const b=document.getElementById('fixtureSourceBadge');if(b)b.textContent=rows.length+' upcoming fixtures'}}catch(_){}}
async function refreshSportFixtures(sp){try{const r=await fetch('/sports/'+sp+'/scores',{headers:{Accept:'application/json'},cache:'default'});if(!r.ok)throw 0;const d=await r.json(),rows=(d.games||[]).filter(x=>!['post','final','ft','finished','complete'].includes(String(x.statusShort||x.status||'').toLowerCase())).slice(0,30);if(rows.length){write(`ks:v349:fixtures:${sp}:last-good`,rows);const el=document.getElementById(sp==='rugby'?'v246RugbyFixtures':'v246CricketFixtures');if(el){el.classList.add('ks-v349-sport-fixtures');el.innerHTML=rows.map(x=>fixtureRow(x,sp)).join('')}}}catch(_){}}
// Back Home: capture phase wins over legacy bubbling handlers/overlays. No reload/navigation fetch.
function goHome(e){e?.preventDefault?.();e?.stopImmediatePropagation?.();document.body.classList.remove('ks-admin-open','ks-admin-authenticated');const w=document.getElementById('kasiscoreAdminWidget');if(w)w.style.setProperty('display','none','important');document.querySelectorAll('section.tab').forEach(x=>x.classList.toggle('hidden',x.id!=='overview'));const home=document.getElementById('overview');if(home){home.classList.remove('hidden');home.style.removeProperty('display')}['header','.toolbar','.kasiscore-primary-nav','.kasiscore-mobile-nav','footer'].forEach(sel=>document.querySelectorAll(sel).forEach(x=>x.style.removeProperty('display')));try{history.pushState({view:'overview'},'', '/')}catch(_){}window.scrollTo({top:0,left:0,behavior:'auto'});return false}
window.kasiAdminBackHome=goHome;window.closeAdminWidget=goHome;
document.addEventListener('click',function(e){const b=e.target?.closest?.('#kasiscoreAdminWidget button,#kasiscoreAdminWidget a');if(b&&/back\s*(to\s*)?home/i.test(b.textContent||''))goHome(e)},true);
document.addEventListener('pointerup',function(e){const b=e.target?.closest?.('#kasiscoreAdminWidget button,#kasiscoreAdminWidget a');if(b&&/back\s*(to\s*)?home/i.test(b.textContent||'')){e.preventDefault();goHome(e)}},true);
// Paint persistent state immediately; never wait for network.
paintInstantLive();paintFixtureCache();
const refresh=()=>{requestAnimationFrame(()=>setTimeout(()=>{window.ks340RefreshLive?.();window.ks340RefreshFinished?.();refreshFootballFixtures();refreshSportFixtures('rugby');refreshSportFixtures('cricket')},0))};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{paintInstantLive();paintFixtureCache();refresh()},{once:true});else refresh();
window.v249LoadFixtures=refreshFootballFixtures;window.loadMultiFixtures=async()=>{await Promise.allSettled([refreshSportFixtures('rugby'),refreshSportFixtures('cricket')])};
})();


(function(){
'use strict'; if(window.__KASI_V352__)return; window.__KASI_V352__=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getJSON=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}};
const setJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};

/* 1+2 — generic same-origin JSON stale-while-revalidate cache.
   It never caches auth/admin/write/export calls. Existing widget code remains the renderer. */
const nativeFetch=window.fetch.bind(window), PREFIX='ks:v351:http:';
const skip=u=>/\/(auth|admin|exports|webhooks|payments?)\b/i.test(u)||/\.(png|jpe?g|svg|webp|css|js)(\?|$)/i.test(u);
const keyFor=u=>PREFIX+u.replace(location.origin,'').replace(/#.*$/,'');
window.fetch=function(input,init={}){
  const req=input instanceof Request?input:null, method=String(init.method||req?.method||'GET').toUpperCase();
  const raw=typeof input==='string'?input:req?.url||String(input), abs=new URL(raw,location.href);
  const accept=String((init.headers&&((init.headers.Accept)||(init.headers.accept)))||req?.headers?.get?.('accept')||'');
  if(method!=='GET'||abs.origin!==location.origin||skip(abs.pathname)||(!accept.includes('json')&&!/^\/(api\/|fixtures|live|finished-games|sports\/|predictions|tip-of-day|standings|teams|players|news)/.test(abs.pathname))) return nativeFetch(input,init);
  const k=keyFor(abs.href), cached=getJSON(k);
  const update=()=>nativeFetch(input,{...init,cache:'no-cache'}).then(async r=>{if(r.ok&&(r.headers.get('content-type')||'').includes('json')){const txt=await r.clone().text();if(txt.length<650000){try{JSON.parse(txt);setJSON(k,{t:Date.now(),status:r.status,headers:{'content-type':'application/json'},body:txt});window.dispatchEvent(new CustomEvent('kasi:fresh-json',{detail:{url:abs.pathname+abs.search}}))}catch(_){}}}return r}).catch(()=>null);
  if(cached?.body){update();return Promise.resolve(new Response(cached.body,{status:cached.status||200,headers:cached.headers||{'content-type':'application/json'}}));}
  return update().then(r=>r||nativeFetch(input,init));
};

/* 3 — location-aware fixture mix (requested only):
   Africa/Asia/North America/South America visitors = 50% Europe, 25% visitor continent, 25% other.
   Never invent fixtures; shortages fail-soft into remaining genuine matches. */
const AFR=/south africa|egypt|morocco|tunisia|algeria|nigeria|ghana|kenya|uganda|zambia|zimbabwe|namibia|botswana|senegal|cameroon|ivory coast|cote d.?ivoire|tanzania|ethiopia|rwanda|africa|caf|psl|premiership|currie cup|sa20/i;
const EUR=/england|scotland|wales|ireland|france|spain|italy|germany|portugal|netherlands|belgium|austria|switzerland|denmark|sweden|norway|finland|poland|greece|turkey|croatia|serbia|romania|czech|europe|uefa|premier league|la liga|serie a|bundesliga|ligue 1|champions league|europa|six nations|premiership rugby|top 14|united rugby championship|county championship|the hundred/i;
const ASIA=/asia|afc|japan|j-league|korea|china|india|pakistan|bangladesh|sri lanka|uae|united arab emirates|saudi|qatar|iran|iraq|thailand|vietnam|malaysia|singapore|indonesia|philippines|hong kong|taiwan|nepal|afghanistan|ipl|bbl asia/i;
const NAM=/north america|concacaf|usa|united states|mls|canada|mexico|liga mx|costa rica|jamaica|panama|honduras|guatemala|el salvador|nicaragua|caribbean|west indies/i;
const SAM=/south america|conmebol|argentina|brazil|brasil|colombia|chile|uruguay|paraguay|peru|ecuador|bolivia|venezuela|copa libertadores|copa sudamericana|brasileir|liga profesional argentina/i;
function geo(x){const s=[x.country,x.countryName,x.league,x.leagueName,x.competition,x.tournament?.name,x.category?.name].filter(Boolean).map(v=>typeof v==='object'?v.name||'':v).join(' ');if(AFR.test(s))return'africa';if(EUR.test(s))return'europe';if(ASIA.test(s))return'asia';if(NAM.test(s))return'northamerica';if(SAM.test(s))return'southamerica';return'other'}
function visitorContinent(){try{const z=Intl.DateTimeFormat().resolvedOptions().timeZone||'';if(/^Africa\//i.test(z))return'africa';if(/^(Asia|Indian)\//i.test(z))return'asia';if(/^America\//i.test(z)){const city=z.split('/').pop().replace(/_/g,' ');if(/Argentina|Sao Paulo|Bahia|Belem|Boa Vista|Campo Grande|Cuiaba|Fortaleza|Maceio|Manaus|Noronha|Porto Velho|Recife|Rio Branco|Santarem|Araguaina|Asuncion|Bogota|Caracas|Cayenne|Georgetown|Guayaquil|La Paz|Lima|Montevideo|Paramaribo|Punta Arenas|Santiago/i.test(city))return'southamerica';return'northamerica';}}catch(_){}return'other'}
function mix(rows,limit=60){rows=[...(rows||[])];const own=visitorContinent();if(!['africa','asia','northamerica','southamerica'].includes(own))own='other';const b={europe:[],africa:[],asia:[],northamerica:[],southamerica:[],other:[]};rows.forEach(x=>b[geo(x)].push(x));const target=Math.min(limit,rows.length),eu=Math.floor(target*.5),local=Math.floor(target*.25),out=[];out.push(...b.europe.splice(0,eu));if(own!=='other')out.push(...b[own].splice(0,local));const otherBuckets=Object.keys(b).filter(k=>k!=='europe'&&k!==own);let need=target-out.length;for(const k of otherBuckets){while(need>Math.floor(target*.25)&&b[k].length){out.push(b[k].shift());need--;}}const fillOrder=[own,'europe',...otherBuckets].filter((v,i,a)=>v!=='other'||own==='other'||true).filter((v,i,a)=>a.indexOf(v)===i);for(const k of fillOrder){while(out.length<target&&b[k]?.length)out.push(b[k].shift());}return out.sort((a,b)=>new Date(a.datetime||a.date||a.startTime||0)-new Date(b.datetime||b.date||b.startTime||0));}
window.kasiFixtureGeoMix=mix;

// Override only the v349 fixture refreshers; keep every other v350 behaviour unchanged.
const row=(x,sp='football')=>{const id=x.id||x.fixtureId||x._afootFixtureId||x.providerFixtureId||'',home=x.home||x.homeTeam||x.teams?.home?.name||'Home',away=x.away||x.awayTeam||x.teams?.away?.name||'Away',league=x.league||x.competition||x.leagueName||'',country=x.country||x.countryName||'',date=x.datetime||x.date||x.startTime||'',url=id?(sp==='football'?`/matches/${encodeURIComponent(id)}/stats`:`/match/${encodeURIComponent(sp)}/${encodeURIComponent(id)}`):'';let d='';try{d=new Date(date).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch(_){}return `<div class="v249-row"><div><b>${esc(d)}</b><div class="sub">${esc(country)}</div></div><div><b>${esc(home)} vs ${esc(away)}</b><div class="sub">${esc(typeof league==='object'?league.name||'':league)} · ${esc(x.status||'Upcoming')}</div></div><div>${url?`<a class="match-stats-btn" href="${esc(url)}">Stats</a>`:'Fixture'}</div></div>`};
async function sportFixtures(sp){const id=sp==='rugby'?'v246RugbyFixtures':'v246CricketFixtures',el=document.getElementById(id),k=`ks:v349:fixtures:${sp}:last-good`;if(!el)return;const old=getJSON(k)||[];if(old.length)el.innerHTML=mix(old,30).map(x=>row(x,sp)).join('');try{const r=await nativeFetch('/sports/'+sp+'/scores',{headers:{Accept:'application/json'},cache:'no-cache'}),d=await r.json(),fresh=(d.games||[]).filter(x=>!['post','final','ft','finished','complete'].includes(String(x.statusShort||x.status||'').toLowerCase()));if(fresh.length){setJSON(k,fresh);el.innerHTML=mix(fresh,30).map(x=>row(x,sp)).join('')}}catch(_){} }
async function footballFixtures(){const el=document.getElementById('fixtureList'),k='ks:v349:fixtures:football:last-good';if(!el)return;const old=getJSON(k)||[];if(old.length)el.innerHTML=mix(old,60).map(x=>row(x)).join('');try{const league=document.getElementById('league')?.value||'ALL',r=await nativeFetch('/fixtures?league='+encodeURIComponent(league)+'&type=upcoming',{headers:{Accept:'application/json'},cache:'no-cache'}),d=await r.json(),fresh=(d.matches||[]).filter(x=>!x.isFinished);if(fresh.length){setJSON(k,fresh);const chosen=mix(fresh,60);el.innerHTML=chosen.map(x=>row(x)).join('');const badge=document.getElementById('fixtureSourceBadge');if(badge)badge.textContent=chosen.length+' upcoming fixtures'}}catch(_){} }
window.v249LoadFixtures=footballFixtures; window.loadMultiFixtures=()=>Promise.allSettled([sportFixtures('rugby'),sportFixtures('cricket')]);

/* 4 — professional xG/odds wording: distinguish model xG from bookmaker prices. */
function relabel(){document.querySelectorAll('#hsContent [style]').forEach(()=>{});document.querySelectorAll('#hsContent div').forEach(n=>{if(n.childNodes.length===1&&n.textContent.trim()==='Expected Goals')n.textContent='Model Expected Goals (xG)';if(n.childNodes.length===1&&n.textContent.trim()==='Goal Probabilities')n.textContent='Model Goal Probabilities'});document.querySelectorAll('#hsContent span').forEach(n=>{if(/^Bkm Over 2\.5:/i.test(n.textContent))n.textContent=n.textContent.replace(/^Bkm/i,'Bookmaker')});}
new MutationObserver(relabel).observe(document.getElementById('hsContent')||document.body,{childList:true,subtree:true}); relabel();

/* 5 — Stats line-up completeness. Formation is provider data; never invent it. */
const originalLoad=window.loadKasiMatchStatsPage;
if(typeof originalLoad==='function') window.loadKasiMatchStatsPage=async function(id){await originalLoad(id);document.querySelectorAll('.lineup-team').forEach(team=>{const sub=team.querySelector('.sub');if(sub){const t=sub.textContent.trim();if(t&&t!=='·'){const first=t.split('·')[0].trim();if(first&&!/unavailable/i.test(first)){const badge=document.createElement('span');badge.className='ks351-formation';badge.textContent='Formation '+first;sub.before(badge)}}} });};

// Immediate cache paint for requested fixture widgets; background refresh follows without clearing them.
requestAnimationFrame(()=>{footballFixtures();sportFixtures('rugby');sportFixtures('cricket')});
})();


(function(){
'use strict';if(window.__KASI_V353__)return;window.__KASI_V353__=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rawFetch=window.fetch.bind(window),PUB='ks:v353:http:',ADM='ks:v353:admin:';
const jget=(store,k)=>{try{return JSON.parse(store.getItem(k)||'null')}catch(_){return null}},jset=(store,k,v)=>{try{store.setItem(k,JSON.stringify(v))}catch(_){}};
const jsonPath=p=>/^\/(?:api\/|fixtures(?:\/|$)|live(?:\/|$)|finished-games|sports\/|predictions|ai-predictions|tip-of-day|standings|teams|players|news|admin(?:\/|$)|monetization)/i.test(p);
/* Requested dashboard-wide cache-first GET owner. Public data persists across visits.
   Authenticated Admin GET data uses sessionStorage only; credentials and writes are never cached. */
window.fetch=function(input,init={}){
 const req=input instanceof Request?input:null,method=String(init.method||req?.method||'GET').toUpperCase(),raw=typeof input==='string'?input:req?.url||String(input),u=new URL(raw,location.href);
 if(method!=='GET'||u.origin!==location.origin||/^\/(?:auth|login|signup|register|webhooks|payments?|exports)(?:\/|$)/i.test(u.pathname)||(!jsonPath(u.pathname)&&!String(init.headers?.Accept||init.headers?.accept||req?.headers?.get?.('accept')||'').includes('json')))return rawFetch(input,init);
 const isAdmin=/^\/admin(?:\/|$)/i.test(u.pathname),store=isAdmin?sessionStorage:localStorage,key=(isAdmin?ADM:PUB)+u.pathname+u.search,c=jget(store,key);
 const refresh=()=>rawFetch(input,{...init,cache:'no-cache'}).then(async r=>{if(r.ok&&(r.headers.get('content-type')||'').toLowerCase().includes('json')){const t=await r.clone().text();if(t.length<1200000){try{JSON.parse(t);jset(store,key,{t:Date.now(),status:r.status,body:t});window.dispatchEvent(new CustomEvent('kasi:fresh-json',{detail:{url:u.pathname+u.search}}))}catch(_){}}}return r}).catch(()=>null);
 if(c?.body){refresh();return Promise.resolve(new Response(c.body,{status:c.status||200,headers:{'content-type':'application/json','x-kasi-cache':'hit'}}));}
 return refresh().then(r=>r||rawFetch(input,init));
};
/* Fixtures: preserve v352 geographic mix, but paint team badge/flag media and never clear last-good rows during refresh. */
const read=k=>jget(localStorage,k)||[],write=(k,v)=>jset(localStorage,k,v);
function media(x,side){return x?.[side+'Logo']||x?.[side+'Badge']||x?.[side+'Flag']||x?.teams?.[side]?.logo||x?.teams?.[side]?.badge||''}
function fixtureRow(x,sp='football'){const id=x.id||x.fixtureId||x._afootFixtureId||x.providerFixtureId||'',home=x.home||x.homeTeam||x.teams?.home?.name||'Home',away=x.away||x.awayTeam||x.teams?.away?.name||'Away',hl=media(x,'home'),al=media(x,'away'),league=typeof x.league==='object'?(x.league?.name||''):(x.league||x.competition||x.leagueName||''),country=x.country||x.countryName||'',date=x.datetime||x.date||x.startTime||'',url=id?(sp==='football'?`/matches/${encodeURIComponent(id)}/stats`:`/match/${encodeURIComponent(sp)}/${encodeURIComponent(id)}`):'';let d='';try{d=new Date(date).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch(_){}const img=(u,n)=>u?`<img src="${esc(u)}" alt="${esc(n)}" width="24" height="24" loading="lazy" style="width:24px;height:24px;object-fit:contain;vertical-align:middle;margin-right:6px" onerror="this.style.display='none'">`:'';return `<div class="v249-row"><div><b>${esc(d)}</b><div class="sub">${esc(country)}</div></div><div><b>${img(hl,home)}${esc(home)} <span style="color:var(--muted)">vs</span> ${img(al,away)}${esc(away)}</b><div class="sub">${esc(league)} · ${esc(x.status||'Upcoming')}</div></div><div>${url?`<a class="match-stats-btn" href="${esc(url)}">Stats</a>`:'Fixture'}</div></div>`}
async function sportFixtures(sp){const el=document.getElementById(sp==='rugby'?'v246RugbyFixtures':'v246CricketFixtures'),k=`ks:v349:fixtures:${sp}:last-good`;if(!el)return;const old=read(k);if(old.length)el.innerHTML=(window.kasiFixtureGeoMix?window.kasiFixtureGeoMix(old,30):old.slice(0,30)).map(x=>fixtureRow(x,sp)).join('');try{const r=await fetch('/sports/'+sp+'/scores',{headers:{Accept:'application/json'}}),d=await r.json(),fresh=(d.games||[]).filter(x=>!['post','final','ft','finished','complete'].includes(String(x.statusShort||x.status||'').toLowerCase()));if(fresh.length){write(k,fresh);const chosen=window.kasiFixtureGeoMix?window.kasiFixtureGeoMix(fresh,30):fresh.slice(0,30);el.innerHTML=chosen.map(x=>fixtureRow(x,sp)).join('')}}catch(_){}}
window.loadMultiFixtures=()=>Promise.allSettled([sportFixtures('rugby'),sportFixtures('cricket')]);
/* Ensure Rugby/Cricket team cards use returned badges/flags without creating cross-sport fallback. */
function hydrateTeamMedia(){document.querySelectorAll('[data-sport="rugby"],[data-sport="cricket"]').forEach(root=>root.querySelectorAll('img').forEach(img=>{img.width=36;img.height=36;img.loading='lazy'}));}
new MutationObserver(hydrateTeamMedia).observe(document.body,{childList:true,subtree:true});
/* Stats: provider formations/lineups remain visible; no synthetic XI/formation. */
function formationBadges(){document.querySelectorAll('.lineup-team').forEach(team=>{if(team.querySelector('.ks351-formation'))return;const sub=team.querySelector('.sub');if(!sub)return;const first=(sub.textContent||'').split('·')[0].trim();if(first&&/\d\s*[-–]\s*\d/.test(first)){const b=document.createElement('span');b.className='ks351-formation';b.textContent='Formation '+first;sub.before(b)}})}
new MutationObserver(formationBadges).observe(document.body,{childList:true,subtree:true});
requestAnimationFrame(()=>{sportFixtures('rugby');sportFixtures('cricket');formationBadges();hydrateTeamMedia()});
})();


(function(){
 'use strict';
 if(window.__KASI_V355_CWV__)return; window.__KASI_V355_CWV__=true;
 function textName(el){return String(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'').replace(/\s+/g,' ').trim()}
 function fixA11y(root){
   (root||document).querySelectorAll('button').forEach((b,i)=>{if(!textName(b)) b.setAttribute('aria-label',b.id?('Control '+b.id):'Dashboard control')});
   (root||document).querySelectorAll('select').forEach((el)=>{
     if(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby'))return;
     let label=el.id?document.querySelector('label[for="'+CSS.escape(el.id)+'"]'):null;
     if(!label)el.setAttribute('aria-label',(el.dataset.label||el.name||el.id||'Dashboard selection').replace(/[-_]+/g,' '));
   });
   (root||document).querySelectorAll('img').forEach((img)=>{
     if(!img.hasAttribute('decoding'))img.decoding='async';
     if(!img.hasAttribute('loading') && !img.closest('header,.brand,.live-widget-header'))img.loading='lazy';
     if(!img.hasAttribute('alt'))img.alt='';
   });
 }
 function boot(){fixA11y(document);let queued=false;new MutationObserver((ms)=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)fixA11y(n)})}).observe(document.body,{childList:true,subtree:true})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


(function(){
'use strict';
if(window.__KASI_V357_STABILITY__)return;window.__KASI_V357_STABILITY__=true;
function stableMedia(root){
 (root||document).querySelectorAll('#homeLatestNewsBulletin img,#homeCountryNewsGrid img,#homeVideosGrid img').forEach(img=>{
   if(!img.getAttribute('width') && img.naturalWidth) img.setAttribute('width',String(img.naturalWidth));
   if(!img.getAttribute('height') && img.naturalHeight) img.setAttribute('height',String(img.naturalHeight));
   img.loading='lazy';img.decoding='async';img.setAttribute('fetchpriority','low');
 });
}
function boot(){stableMedia(document)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


(function(){
 if(window.__KASI_V360_MEDIA__)return;window.__KASI_V360_MEDIA__=true;
 function run(){
  document.querySelectorAll('#homeCountryNewsSection img,#homeVideosSection img,#sportsnews img').forEach(img=>{
   img.loading='lazy';img.decoding='async';img.setAttribute('fetchpriority','low');
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();


(function(){
'use strict';
if(window.__KASI_V363_RESULTS_HUB__)return; window.__KASI_V363_RESULTS_HUB__=true;
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CACHE='ks:v363:finished:last-good';
let rows=[],shown=30,task=null,archiveMode=false,total=0;
function val(o,...ks){for(const k of ks){let x=o;for(const p of k.split('.'))x=x?.[p];if(x!==undefined&&x!==null&&x!=='')return x}return''}
function norm(x){return {raw:x,id:val(x,'id','fixtureId','providerFixtureId','fixture.id'),sport:String(val(x,'sport')||'football').toLowerCase(),
 country:String(val(x,'country','countryName','league.country')||'International'),league:String((typeof x.league==='string'?x.league:'')||val(x,'leagueName','competition.name','league.name')||'Other matches'),
 season:String(val(x,'season','league.season')||''),home:String(val(x,'home','homeName','homeTeam.name','teams.home.name')||'Home'),
 away:String(val(x,'away','awayName','awayTeam.name','teams.away.name')||'Away'),homeLogo:String(val(x,'homeLogo','homeBadge','homeTeam.logo','teams.home.logo')||''),
 awayLogo:String(val(x,'awayLogo','awayBadge','awayTeam.logo','teams.away.logo')||''),hs:val(x,'homeScore','homeGoals','goals.home','score.fulltime.home'),
 as:val(x,'awayScore','awayGoals','goals.away','score.fulltime.away'),date:val(x,'date','datetime','startTime','fixture.date'),
 status:String(val(x,'statusShort','status','fixture.status.short')||'FT')}}
function good(x){const m=norm(x);return m.hs!==''&&m.as!==''}
function img(u,n){return /^https?:\/\//i.test(u)?`<img src="${E(u)}" alt="${E(n)}" width="28" height="28" loading="lazy" decoding="async" onerror="this.style.visibility='hidden'">`:''}
function dt(v){try{return new Date(v).toLocaleString('en-ZA',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return''}}
function href(m){return !m.id?'':m.sport==='football'?`/matches/${encodeURIComponent(m.id)}/stats`:`/match/${encodeURIComponent(m.sport)}/${encodeURIComponent(m.id)}`}
function row(m){const u=href(m);return `<div class="ks340-match"><div class="ks340-meta"><span class="ks340-sport">${E(m.sport)}</span>${E(dt(m.date))}</div><div><div class="ks340-teams"><span class="ks340-team">${img(m.homeLogo,m.home)}${E(m.home)}</span><span class="ks340-score">${E(m.hs)} – ${E(m.as)}</span><span class="ks340-team">${E(m.away)}${img(m.awayLogo,m.away)}</span></div><div class="ks340-status">${E(m.country)} · ${E(m.league)}${m.season?' · '+E(m.season):''} · ${E(m.status)}</div></div><div class="ks340-action">${u?`<a href="${E(u)}">Stats</a>`:''}</div></div>`}
function grouped(input){const g=new Map();input.map(norm).forEach(m=>{const k=m.country+'|||'+m.league+'|||'+m.season;if(!g.has(k))g.set(k,{...m,rows:[]});g.get(k).rows.push(m)});return [...g.values()].map(x=>`<section class="ks340-group"><div class="ks340-head"><b>${E(x.country)}</b><span>${E(x.league)}${x.season?' · '+E(x.season):''}</span><em>${x.rows.length} final</em></div>${x.rows.map(row).join('')}</section>`).join('')}
function read(){try{const x=JSON.parse(localStorage.getItem(CACHE)||'[]');return Array.isArray(x)?x.filter(good):[]}catch(_){return[]}}
function save(x){try{localStorage.setItem(CACHE,JSON.stringify(x.slice(0,500)))}catch(_){}}
function ensureControls(){
 const grid=document.getElementById('ks307FinishedGrid'); if(!grid||document.getElementById('ks363ResultsHub'))return;
 const hub=document.createElement('div');hub.id='ks363ResultsHub';
 hub.innerHTML=`<div class="ks363-filterbar">
 <label>Sport<select id="ks363Sport"><option value="all">All Sports</option><option value="football">Football</option><option value="rugby">Rugby</option><option value="cricket">Cricket</option></select></label>
 <label>Country<input id="ks363Country" placeholder="e.g. South Africa"></label>
 <label>Competition<input id="ks363Competition" placeholder="League / competition"></label>
 <label>Season / Year<input id="ks363Season" placeholder="e.g. 2026 or 2026/27"></label>
 <label>Date<input id="ks363Date" type="date"></label>
 <label>Team<input id="ks363Team" placeholder="Search team"></label></div>
 <div class="ks363-actions"><button id="ks363Search" class="primary">Search Results</button><button id="ks363Recent">Recent 48 Hours</button><span id="ks363ArchiveStatus">Recent confirmed results</span></div>`;
 grid.parentNode.insertBefore(hub,grid);
 document.getElementById('ks363Search').onclick=()=>loadArchive(true);
 document.getElementById('ks363Recent').onclick=()=>loadRecent(true);
 for(const id of ['ks363Team','ks363Country','ks363Competition','ks363Season'])document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter')loadArchive(true)});
}
function paint(){
 ensureControls();const grid=document.getElementById('ks307FinishedGrid'),more=document.getElementById('ks307FinishedMore'),count=document.getElementById('liveWidgetCount');
 if(!grid)return;const valid=rows.filter(good),visible=valid.slice(0,shown);
 grid.innerHTML=visible.length?grouped(visible):'<div class="empty">No confirmed completed results match these filters.</div>';
 if(more){more.style.setProperty('display',visible.length<valid.length?'block':'none','important');more.onclick=()=>{shown+=30;paint()}}
 if(count)count.textContent=archiveMode?`${total||valid.length} historical results`:`${valid.length} finished · last 48h`;
 const s=document.getElementById('ks363ArchiveStatus');if(s)s.textContent=archiveMode?`${total||valid.length} historical results · archive + API gap-fill`:'Recent confirmed results · permanent archive enabled';
}
async function get(url){const r=await fetch(url,{headers:{Accept:'application/json'},cache:'default'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
async function loadRecent(force=false){
 if(task)return task;archiveMode=false;shown=30;if(!rows.length){rows=read();paint()}
 task=(async()=>{try{const d=await get('/sports/finished?hours=48&limit=500'),fresh=(d.matches||d.games||[]).filter(good);if(fresh.length||Number(d.count)===0){rows=fresh;total=fresh.length;save(fresh);paint()}return true}catch(_){paint();return false}finally{task=null}})();return task
}
async function loadArchive(reset=false){
 if(task)return task;archiveMode=true;if(reset)shown=30;
 const q=new URLSearchParams(),sport=document.getElementById('ks363Sport')?.value||'all',
 country=document.getElementById('ks363Country')?.value.trim()||'',competition=document.getElementById('ks363Competition')?.value.trim()||'',
 season=document.getElementById('ks363Season')?.value.trim()||'',date=document.getElementById('ks363Date')?.value||'',team=document.getElementById('ks363Team')?.value.trim()||'';
 q.set('sport',sport);if(country)q.set('country',country);if(competition)q.set('competition',competition);if(season)q.set('season',season);
 if(date){q.set('date_from',date);q.set('date_to',date)}if(team)q.set('q',team);q.set('limit','500');
 const s=document.getElementById('ks363ArchiveStatus');if(s)s.textContent='Searching KSN results — historical API fallback will fill archive gaps…';
 task=(async()=>{try{const d=await get('/results/search?'+q),fresh=(d.matches||[]).filter(good);rows=fresh;total=Number(d.total||fresh.length);paint();return true}catch(_){rows=[];total=0;paint();return false}finally{task=null}})();return task
}
const prior=window.ks307SetLiveMode;
window.ks307SetLiveMode=function(mode){
 if(mode!=='finished')return prior?.call(this,mode);
 document.body.dataset.kasiLiveView='finished';
 document.getElementById('ks307LiveBtn')?.classList.remove('active');document.getElementById('ks307FinishedBtn')?.classList.add('active');
 const lg=document.getElementById('liveMatchGrid'),fg=document.getElementById('ks307FinishedGrid');if(lg)lg.style.display='none';if(fg)fg.style.display='';
 ensureControls();rows=read();paint();requestAnimationFrame(()=>loadRecent(false));return false;
};
document.addEventListener('click',e=>{const b=e.target.closest('#ks307FinishedBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();window.ks307SetLiveMode('finished')},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureControls,{once:true});else ensureControls();
})();


(function(){
 const E=s=>String(s??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
 function score(v){return (v===0||v==='0'||v)?E(v):'—'}
 function card(m){
   const dt=m.date?new Date(m.date):null, when=dt&&!isNaN(dt)?dt.toLocaleString():E(m.date||'');
   const hlogo=m.homeLogo?`<img src="${E(m.homeLogo)}" alt="" loading="lazy" style="width:28px;height:28px;object-fit:contain">`:'';
   const alogo=m.awayLogo?`<img src="${E(m.awayLogo)}" alt="" loading="lazy" style="width:28px;height:28px;object-fit:contain">`:'';
   return `<div class="fixture" style="display:grid;grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr);gap:14px;align-items:center;margin-bottom:8px">
    <div style="display:flex;gap:8px;align-items:center">${hlogo}<div><strong>${E(m.home||'Home')}</strong><div class="sub">${E(m.country||'')} ${m.league?'· '+E(m.league):''}</div></div></div>
    <div style="text-align:center"><div style="font-size:19px;font-weight:900">${score(m.homeScore)} – ${score(m.awayScore)}</div><div class="sub">FINAL · ${E(when)}</div>${m.id?`<button class="match-stats-btn" style="margin-top:6px" onclick="event.stopPropagation();openLiveMatchPage(${JSON.stringify(m.id)},'${E(m.sport||'football')}',${JSON.stringify(m.league||'')})">Stats</button>`:''}</div>
    <div style="display:flex;gap:8px;align-items:center;justify-content:flex-end;text-align:right"><div><strong>${E(m.away||'Away')}</strong><div class="sub">${E(m.season||'')}</div></div>${alogo}</div>
   </div>`;
 }
 window.searchPastResults=async function(){
   const input=document.getElementById('pastTeamInput'),out=document.getElementById('pastResultsOutput');
   const q=(input?.value||'').trim(); if(!out)return;
   if(!q){out.innerHTML='<div class="empty">Enter a team, country, competition, season/year or date.</div>';return}
   out.innerHTML='<div class="empty">Searching the Kasi Sports News results archive…</div>';
   try{
     const p=new URLSearchParams({q,limit:'100',include_recent:'true'});
     if(/^\\d{4}$/.test(q)){p.delete('q');p.set('year',q)}
     if(/^\\d{4}-\\d{2}-\\d{2}$/.test(q)){p.delete('q');p.set('date_from',q);p.set('date_to',q)}
     const r=await fetch('/results/search?'+p.toString(),{headers:{Accept:'application/json'}});
     if(!r.ok)throw Error('HTTP '+r.status); const d=await r.json(),rows=Array.isArray(d.matches)?d.matches:[];
     out.innerHTML=rows.length?`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px"><div><b>${d.total||rows.length}</b> confirmed result${(d.total||rows.length)===1?'':'s'} for <b>${E(q)}</b></div><span class="badge ok">Permanent archive${d.recentLayerSynced?' + recent sync':''}</span></div>${rows.map(card).join('')}`:`<div class="empty">No confirmed results found for <b>${E(q)}</b>. Recent Finished Games were checked before returning this result.</div>`;
   }catch(e){out.innerHTML=`<div class="empty">Results search is temporarily unavailable: ${E(e.message||e)}</div>`}
 };
})();


(function(){
'use strict';
if(window.__KASI_V345_PERMANENT__)return;window.__KASI_V345_PERMANENT__=true;
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=async(path,params={})=>{const u=new URL(path,location.origin);Object.entries(params).forEach(([k,v])=>v!=null&&u.searchParams.set(k,v));const r=await fetch(u,{headers:{Accept:'application/json'},cache:'default'});if(!r.ok)throw Error('HTTP '+r.status);const ct=(r.headers.get('content-type')||'').toLowerCase();if(!ct.includes('json'))throw Error('Unexpected response');return r.json()};
function homeNoFetch(){
 const w=document.getElementById('kasiscoreAdminWidget');
 document.body.classList.remove('ks-admin-open','ks-admin-authenticated');
 if(w)w.style.display='none';
 document.querySelectorAll('section.tab').forEach(x=>x.classList.toggle('hidden',x.id!=='overview'));
 const home=document.getElementById('overview');if(home){home.classList.remove('hidden');home.style.removeProperty('display')}
 ['header','.toolbar','.kasiscore-primary-nav','.kasiscore-mobile-nav','footer'].forEach(sel=>document.querySelectorAll(sel).forEach(x=>x.style.removeProperty('display')));
 document.getElementById('liveScoresWidget')?.style.removeProperty('display');
 document.querySelectorAll('[data-primary]').forEach(x=>x.classList.toggle('active',x.dataset.primary==='overview'));
 try{history.pushState({view:'overview'},'', '/')}catch(_){}
 window.scrollTo(0,0);return false;
}
window.kasiAdminBackHome=function(e){e?.preventDefault?.();e?.stopPropagation?.();return homeNoFetch()};
window.closeAdminWidget=homeNoFetch;
// Replace the button node once so no legacy listener attached to the old node can intercept it.
function wireAdmin(){const w=document.getElementById('kasiscoreAdminWidget');if(!w)return;const old=[...w.querySelectorAll('button')].find(x=>/back home/i.test(x.textContent||''));if(old&&!old.dataset.v345){const b=old.cloneNode(true);b.dataset.v345='1';b.removeAttribute('onclick');b.type='button';b.addEventListener('click',window.kasiAdminBackHome,{passive:false});old.replaceWith(b)}}
// Sport-isolated Teams & Players owner. Rugby/Cricket never call football directory endpoints.
function sportRoute(sp,kind,x){const id=x.publicRef||x.ref||x.id||'';return sp==='football'?`/${kind==='team'?'teams':'players'}/${encodeURIComponent(id)}`:`/sports/${encodeURIComponent(sp)}/${kind}/${encodeURIComponent(id)}`}
function media(x){const src=x.badge||x.logo||x.photo||'';return /^https?:\/\//i.test(src)?`<img src="${E(src)}" alt="" loading="lazy" decoding="async">`:''}
function renderDirectory(el,sp,d){const teams=(d.teams||[]).filter(x=>!x.sport||String(x.sport).toLowerCase()===sp||String(x.sport).toLowerCase()===sp+'s');const players=(d.players||[]).filter(x=>!x.sport||String(x.sport).toLowerCase()===sp||String(x.sport).toLowerCase()===sp+'s');const row=(x,k)=>`<div class="v249-row"><div>${media(x)}</div><div><b>${E(x.name||'Unknown')}</b><div class="sub">${E(x.country||x.team||x.league||'')}</div></div><a href="${E(sportRoute(sp,k,x))}">Open</a></div>`;el.innerHTML=`<div class="v249-grid"><div><h3>${E(sp[0].toUpperCase()+sp.slice(1))} Teams</h3>${teams.map(x=>row(x,'team')).join('')||'<div class="empty">No teams currently available.</div>'}</div><div><h3>${E(sp[0].toUpperCase()+sp.slice(1))} Players</h3>${players.map(x=>row(x,'player')).join('')||'<div class="empty">No players currently available from the provider.</div>'}</div></div>`}
// v348 permanent sport-context isolation: every Teams & Players surface follows one selected sport.
function sportLabel(sp){return sp==='rugby'?'Rugby':sp==='cricket'?'Cricket':'Football'}
function sportHubSections(){
 const league=document.getElementById('ks211League');
 const leagueCard=league?.closest('.card.section')||null;
 const leaders=document.getElementById('ks211Leaders');
 const leadersCard=leaders?.closest('.card.section')||null;
 const standings=document.getElementById('homeStandingsSection');
 return {league,leagueCard,leadersCard,standings,football:document.getElementById('ks211LeagueTeams'),other:document.getElementById('ks213OtherSportData')};
}
function applySportContext(sp){
 sp=String(sp||'football').toLowerCase();if(!['football','rugby','cricket'].includes(sp))sp='football';
 window.v250DirectorySport=sp;document.body.dataset.kasiDirectorySport=sp;
 const sel=document.getElementById('ks213Sport');if(sel&&sel.value!==sp)sel.value=sp;
 document.querySelectorAll('#v249TeamsPlayers .seg button').forEach(b=>{const t=(b.textContent||'').toLowerCase();b.classList.toggle('active',t.includes(sp))});
 const {league,leagueCard,leadersCard,standings,football,other}=sportHubSections(),isFootball=sp==='football';
 if(league)league.style.display=isFootball?'':'none';
 if(football)football.style.display=isFootball?'':'none';
 if(other)other.style.display=isFootball?'none':'';
 // These two legacy widgets are football-provider widgets. Never expose them inside Rugby/Cricket context.
 if(leadersCard)leadersCard.style.display=isFootball?'':'none';
 if(standings)standings.style.display=isFootball?'':'none';
 if(leagueCard){const h=leagueCard.querySelector('.home-section-head h2'),sub=leagueCard.querySelector('.home-section-head .sub');if(h)h.textContent=isFootball?'League Player Explorer':sportLabel(sp)+' Teams & Players';if(sub)sub.textContent=isFootball?'Teams load first. Player squads are loaded only when requested.':'Only '+sportLabel(sp)+' provider data is shown here.'}
 const search=document.getElementById('ks211EntitySearch');if(search)search.placeholder='Search '+sportLabel(sp).toLowerCase()+' player or team...';
 return sp;
}
async function loadSecondarySport(sp){
 sp=applySportContext(sp);const {other}=sportHubSections();
 if(sp==='football'){window.ks211LoadLeague?.();return}
 if(!other)return;other.innerHTML=`<div class="empty">Loading ${E(sp)} teams and players…</div>`;
 try{const d=await J(`/sports/${sp}/teams-players`,{limit:100});renderDirectory(other,sp,d)}catch(_){other.innerHTML=`<div class="empty">No ${E(sp)} data available.</div>`}
}
window.v249LoadDirectory=async function(sp='football',btn,q=''){
 sp=applySportContext(sp);const el=document.getElementById('v249DirectoryBody');
 // Synchronise the lower Teams & Players panel immediately so stale Football cards can never remain visible.
 loadSecondarySport(sp);
 if(!el)return;el.innerHTML=`<div class="empty">Loading ${E(sp)} teams and players…</div>`;
 try{const path=sp==='football'?'/sports/directory':`/sports/${sp}/teams-players`;const d=await J(path,sp==='football'?{sport:sp,q:String(q||'')}:{limit:100});renderDirectory(el,sp,d)}catch(_){el.innerHTML=`<div class="empty">No ${E(sp)} data available.</div>`}
};
window.ks213SportChanged=async function(){
 const sp=applySportContext(document.getElementById('ks213Sport')?.value||'football');
 await loadSecondarySport(sp);
 // Keep the upper directory in the same sport context; do not leave a Football owner visible below/above Rugby or Cricket.
 const el=document.getElementById('v249DirectoryBody');if(!el)return;el.innerHTML=`<div class="empty">Loading ${E(sp)} teams and players…</div>`;
 try{const path=sp==='football'?'/sports/directory':`/sports/${sp}/teams-players`;const d=await J(path,sp==='football'?{sport:sp,q:''}:{limit:100});renderDirectory(el,sp,d)}catch(_){el.innerHTML=`<div class="empty">No ${E(sp)} data available.</div>`}
};
// Search respects selected sport and routes entities with that sport.
window.ks211Search=async function(){const q=String(document.getElementById('ks211EntitySearch')?.value||'').trim(),el=document.getElementById('ks211SearchResults'),sp=String(document.getElementById('ks213Sport')?.value||'football').toLowerCase();if(!el)return;if(q.length<2){el.innerHTML='<div class="empty">Enter at least 2 characters.</div>';return}el.innerHTML='<div class="empty">Searching…</div>';try{const d=await J('/sports/directory/search',{q,sport:sp});const card=(x,k)=>`<a class="ks211-result" href="${E(sportRoute(sp,k,x))}">${media(x)}<div><b>${E(x.name||'Unknown')}</b><div class="sub">${E(x.team||x.country||x.league||k)}</div></div></a>`;el.innerHTML=`<div class="ks211-results"><section><h3>Teams</h3>${(d.teams||[]).map(x=>card(x,'team')).join('')||'<div class="empty">No teams found.</div>'}</section><section><h3>Players</h3>${(d.players||[]).map(x=>card(x,'player')).join('')||'<div class="empty">No players found.</div>'}</section></div>`}catch(_){el.innerHTML='<div class="empty">No data available</div>'}};
wireAdmin();
})();


(function(){
  function rows48(){
    const cutoff=Date.now()-48*60*60*1000;
    let rows=(window.S&&Array.isArray(S._finishedFixtures))?S._finishedFixtures.slice():[];
    rows=rows.filter(m=>{
      const raw=m?.date||m?.kickoff||m?.fixture?.date||m?.startTime||m?.timestamp||'';
      const t=typeof raw==='number'?(raw<1e12?raw*1000:raw):Date.parse(raw);
      const st=String(m?.statusShort||m?.status||m?.fixture?.status?.short||'').toUpperCase();
      const done=!!m?.isFinished||['FT','AET','PEN','FINISHED','FINAL','COMPLETED'].includes(st);
      return done && (!Number.isFinite(t)||(t>=cutoff&&t<=Date.now()+300000));
    });
    rows.sort((a,b)=>{
      const ta=Date.parse(a?.date||a?.kickoff||a?.fixture?.date||'')||0;
      const tb=Date.parse(b?.date||b?.kickoff||b?.fixture?.date||'')||0;
      return tb-ta;
    });
    if(typeof window.kasiBalanceMatchesForAfrica==='function') rows=window.kasiBalanceMatchesForAfrica(rows);
    return rows;
  }
  function finishedCard(m){
    const E=window.esc||((v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
    const id=m?.id||m?.fixtureId||m?.fixture?.id||'';
    const h=m?.home||m?.homeTeam||m?.teams?.home?.name||'Home';
    const a=m?.away||m?.awayTeam||m?.teams?.away?.name||'Away';
    const hs=m?.homeScore??m?.goals?.home??'—', as=m?.awayScore??m?.goals?.away??'—';
    const lg=(typeof m?.league==='object'?m?.league?.name:m?.league)||m?.leagueName||m?.competition||'Football';
    const raw=m?.date||m?.kickoff||m?.fixture?.date||'';
    let dt='';try{dt=raw?new Date(raw).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):''}catch(_){}
    return `<article class="ks206-live-card ks-v306-finished-card">
      <div class="ks206-live-meta"><span>${E(lg)}</span><span>FT · ${E(dt)}</span></div>
      <div class="ks206-live-main"><div class="ks206-team"><span class="ks206-name">${E(h)}</span></div><div class="ks206-score">${E(hs)} – ${E(as)}</div><div class="ks206-team away"><span class="ks206-name">${E(a)}</span></div></div>
      <div class="ks206-actions">${id?`<button type="button" onclick="event.stopPropagation();if(window.openLiveMatchPage)openLiveMatchPage(${JSON.stringify(id)},'football',${JSON.stringify(String(lg))});else location.href='/matches/${encodeURIComponent(id)}/stats'">Stats</button>`:''}</div>
    </article>`;
  }
  function paintFallback(){
    const live=Array.isArray(window.liveMatches)?window.liveMatches:[];
    if(live.length)return false;
    const rows=rows48();
    const grid=document.getElementById('liveMatchGrid');
    const empty=document.getElementById('liveWidgetEmpty');
    const count=document.getElementById('liveWidgetCount');
    if(grid){grid.innerHTML=rows.slice(0,12).map(finishedCard).join('');}
    if(empty)empty.style.display=rows.length?'none':'block';
    if(count)count.textContent=rows.length?`No live · ${rows.length} finished in last 48 hrs`:'No live or finished matches in last 48 hrs';
    return rows.length>0;
  }
  const priorRefresh=window.liveWidgetRefresh;
  if(typeof priorRefresh==='function'){
    window.liveWidgetRefresh=async function(){
      const out=await priorRefresh.apply(this,arguments);
      if((!window.liveMatches||!window.liveMatches.length) && (!window.S?._finishedFixtures?.length) && typeof window.loadFinishedGames==='function'){
        try{await window.loadFinishedGames(false);}catch(_){}
      }
      paintFallback();
      if(typeof window.renderLiveTab==='function')window.renderLiveTab();
      return out;
    };
  }
  const priorTab=window.renderLiveTab;
  window.renderLiveTab=function(){
    const live=Array.isArray(window.liveMatches)?window.liveMatches:[];
    if(live.length && typeof priorTab==='function')return priorTab.apply(this,arguments);
    const list=document.getElementById('liveList');
    if(!list)return;
    const rows=rows48();
    const tc=document.getElementById('liveTabCount');
    if(tc)tc.textContent=rows.length?`${rows.length} finished · last 48 hrs`:'No recent matches';
    list.innerHTML=rows.length
      ? `<div class="sub" style="padding:4px 0 10px">No matches are live right now. Showing completed matches from the last 48 hours.</div>${rows.slice(0,30).map(finishedCard).join('')}`
      : `<div class="empty">No live matches or completed matches from the last 48 hours.</div>`;
  };
  setTimeout(()=>{try{paintFallback();if(typeof window.renderLiveTab==='function')window.renderLiveTab();}catch(_){}},50);
})();


(function(){
 'use strict';
 if(window.__KASI_V362_NEWS_OWNER__)return; window.__KASI_V362_NEWS_OWNER__=true;
 const KEY='ks:v304:news:last-good', LATEST=6, COUNTRY=12;
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}};
 const write=rows=>{try{if(Array.isArray(rows)&&rows.length)localStorage.setItem(KEY,JSON.stringify(rows.slice(0,30)))}catch(_){}};
 const image=n=>String(n?.image||n?.imageUrl||n?.thumbnail||n?.ogImage||n?.publisherImage||'').trim();
 const sourceUrl=n=>String(n?.originalUrl||n?.publisherUrl||n?.resolvedUrl||n?.link||n?.url||'').trim();
 function href(n){const p=String(n?.articlePath||'').trim();if(p.startsWith('/news/'))return p;const u=sourceUrl(n);if(!/^https?:\/\//i.test(u))return'';const slug=String(n?.title||'sports-news').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'sports-news';return'/news/'+slug+'?source='+encodeURIComponent(u)}
 const valid=rows=>(rows||[]).filter(n=>String(n?.title||'').trim()&&href(n));
 function media(n){const im=image(n);return /^https?:\/\//i.test(im)?`<img class="ks-news-image" src="${E(im)}" width="132" height="110" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="${E(n.title||'Sports news')}" onerror="this.style.visibility='hidden'" fetchpriority="low">`:'<div class="kc-news-fallback ks362-media">KASI SPORTS NEWS</div>'}
 function card(n){return `<article class="ks-news-card"><a href="${E(href(n))}">${media(n)}<div class="ks-news-body"><span class="badge">${E(n.sport||n.category||'Sport')}</span><h3>${E(n.title)}</h3><div class="ks-news-desc">${E(n.description||n.summary||'')}</div><div class="ks-news-meta">${E(n.publisher||n.source||'Sports News')}</div></div></a></article>`}
 function latestSkeleton(i){return `<a class="ks362-news-skeleton" aria-hidden="true" tabindex="-1"><span class="ks-breaking">${i?'LATEST':'BREAKING'}</span><span class="ks362-line"></span></a>`}
 function cardSkeleton(){return '<article class="ks-news-card ks362-card-skeleton" aria-hidden="true"><div class="ks362-media"></div><div class="ks-news-body"><span class="badge">SPORT</span><h3 class="ks362-title"></h3><div class="ks-news-desc ks362-desc"></div><div class="ks-news-meta ks362-meta"></div></div></article>'}
 function fixed(rows,n,make,empty){const a=rows.slice(0,n).map(make);while(a.length<n)a.push(empty(a.length));return a.join('')}
 function render(rows){
   rows=valid(rows); if(!rows.length)return false; window.__ksNewsItems=rows;
   const country=document.getElementById('homeCountryNewsGrid'),latest=document.getElementById('homeLatestNewsBulletin'),sports=document.getElementById('homeSportsNewsGrid');
   if(latest){latest.innerHTML=fixed(rows,LATEST,(n,i)=>`<a href="${E(href(n))}"><span class="ks-breaking">${i?'LATEST':'BREAKING'}</span><span>${E(n.title)}</span></a>`,latestSkeleton);latest.setAttribute('aria-busy','false')}
   if(country){country.innerHTML=fixed(rows,COUNTRY,card,cardSkeleton);country.setAttribute('aria-busy','false')}
   /* Sports News tab is below the critical Home viewport; keep its existing functional output. */
   if(sports)sports.innerHTML=rows.slice(0,COUNTRY).map(card).join('');
   const list=document.getElementById('sportsNewsList');
   if(list&&!document.getElementById('sportsnews')?.classList.contains('hidden'))list.innerHTML=rows.map(n=>`<article class="news-item" onclick="location.href='${E(href(n))}'"><b>${E(n.title)}</b><div class="news-meta">${E(n.publisher||n.source||'Sports News')}</div></article>`).join('');
   return true;
 }
 let last=read(); if(last.length)render(last);
 let refreshing=false;
 async function refresh(){
   if(refreshing)return false;refreshing=true;
   try{const c=new AbortController(),t=setTimeout(()=>c.abort(),8000);const r=await fetch('/sports/news?sport=all&limit=30&offset=0',{signal:c.signal,cache:'default',headers:{Accept:'application/json'}});clearTimeout(t);if(!r.ok)return false;const d=await r.json(),rows=valid(d.items||[]);if(!rows.length)return false;last=rows;write(rows);/* stable Home remains on cached first-paint data; no structural repaint */return true}catch(_){return false}finally{refreshing=false}
 }
 window.loadKasiCountryNews=refresh;window.loadHomeSportsNews=refresh;window.loadHomeNews=refresh;window.loadLatestVerified=refresh;window.kasiRefreshVerifiedNews=refresh;
 window.loadSportsNews=async function(){if(last.length)render(last);return refresh()};
 async function initial(){if(last.length){refresh();return}const ok=await refresh();if(ok&&last.length)render(last)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initial,{once:true});else initial();
 window.__KASI_NEWS_FIRST_PAINT_V310__={render,refresh,read};
})();


(function(){
 if(window.__KASI_V316_FINISHED__)return;window.__KASI_V316_FINISHED__=true;
 const KEY='ks:v316:finished48:scored:last-good';let rows=[],shown=24,task=null,regionInfo=null;
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}};
 const save=x=>{if(x.length)try{localStorage.setItem(KEY,JSON.stringify(x))}catch(_){}};
 const sport=m=>String(m?.sport||'football').toLowerCase(), mid=m=>String(m?.id??m?.fixtureId??m?._afootFixtureId??'');
 const name=(m,side)=>{const v=m?.[side],t=m?.[side+'Team'],z=m?.teams?.[side];return typeof v==='string'?v:typeof t==='string'?t:String(t?.name||z?.name||v?.name||(side==='home'?'Home':'Away'))};
 const logo=(m,side)=>String(m?.[side+'Logo']||m?.[side+'Badge']||m?.[side+'Team']?.logo||m?.teams?.[side]?.logo||'');
 const score=(m,side)=>{let v=m?.[side+'Score']??m?.goals?.[side]??m?.score?.fulltime?.[side]??m?.score?.[side]??m?.score?.[side+'Score'];if(v===null||v===undefined||v==='')return null;v=String(v).trim();return v&&!/^(?:null|undefined|—|-)$/i.test(v)?v:null};
 const hasScore=m=>score(m,'home')!==null&&score(m,'away')!==null;
 const league=m=>String(typeof m?.league==='object'?m.league?.name:m?.league||m?.competition||'Competition');
 const date=m=>{try{return new Date(m?.date||m?.datetime||m?.startTime).toLocaleString('en-ZA',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return''}};
 function badge(u,n){return /^https?:\/\//i.test(u)?`<img src="${E(u)}" alt="${E(n)}" loading="lazy" decoding="async" onerror="this.style.display='none'" fetchpriority="low">`:''}
 function card(m){if(!hasScore(m))return '';const sp=sport(m),id=mid(m),hn=name(m,'home'),an=name(m,'away'),lg=league(m),hs=score(m,'home'),as=score(m,'away'),finalStatus=String(m.statusShort||m.status?.short||m.status||m.state||'FT').toUpperCase(),href=id?(sp==='football'?`/matches/${encodeURIComponent(id)}/stats`:`/match/${encodeURIComponent(sp)}/${encodeURIComponent(id)}`):'';return `<article class="ks342-finished-centre" data-fid="${E(id)}"><div class="ks342-finished-meta"><span>${E(sp.toUpperCase())} · ${E(lg)}</span><span>${E(date(m))}</span></div><div class="ks342-finished-match"><div class="ks342-finished-team">${badge(logo(m,'home'),hn)}<b>${E(hn)}</b></div><div class="ks342-finished-score"><strong>${E(hs)} - ${E(as)}</strong><span>${E(finalStatus==='AET'?'AET':finalStatus==='PEN'?'PEN':'FULL TIME')}</span></div><div class="ks342-finished-team away">${badge(logo(m,'away'),an)}<b>${E(an)}</b></div></div><div class="ks342-finished-actions">${href?`<a class="lr-stats-btn" href="${E(href)}">Match Centre / Stats</a>`:''}</div></article>`}
 function regionText(){const s=regionInfo?.selected||{};return regionInfo?` · Football mix: Europe ${Number(s.europe||0)} · Africa ${Number(s.africa||0)} · Other ${Number(s.other||0)}`:''}
 function paint(){const grid=document.getElementById('ks307FinishedGrid'),count=document.getElementById('liveWidgetCount'),more=document.getElementById('ks307FinishedMore');if(!grid)return;const valid=rows.filter(hasScore);grid.innerHTML=valid.length?valid.slice(0,shown).map(card).join(''):'<div class="empty">No completed games with confirmed final results were returned for the rolling previous 48 hours.</div>';if(count)count.textContent=valid.length+` finished · last 48h${regionText()}`;if(more){more.style.setProperty('display',valid.length>shown?'block':'none','important');more.onclick=()=>{shown+=24;paint()}}}
 function setView(mode){const fin=mode==='finished';document.body.dataset.kasiLiveView=fin?'finished':'live';document.getElementById('ks307LiveBtn')?.classList.toggle('active',!fin);document.getElementById('ks307FinishedBtn')?.classList.toggle('active',fin);if(fin){paint();load()}else{try{window.__KASI_V307_LIVE__&&window.ks307SetLiveMode_original_v316?.('live')}catch(_){}}}
 async function load(){if(task)return task;if(!rows.length){rows=read();paint()}task=(async()=>{try{const r=await fetch('/sports/finished?hours=48',{headers:{Accept:'application/json'},cache:'default'});if(!r.ok)throw Error(String(r.status));const d=await r.json(),fresh=(Array.isArray(d?.matches)?d.matches:[]).filter(hasScore);regionInfo=d?.footballRegionBreakdown||null;if(fresh.length||Number(d?.count)===0){rows=fresh;shown=24;save(fresh);paint()}return true}catch(_){paint();return false}finally{task=null}})();return task}
 function flatten(o,p='',d=0,a=[]){if(d>3||a.length>50||o==null)return a;if(Array.isArray(o)){o.slice(0,15).forEach((v,i)=>flatten(v,p?p+' '+(i+1):String(i+1),d+1,a));return a}if(typeof o==='object'){Object.entries(o).forEach(([k,v])=>flatten(v,p?p+' · '+k:k,d+1,a));return a}if(String(o).trim())a.push([p,String(o)]);return a}
 async function stats(btn){const box=btn.parentElement.querySelector('.ks315-stats');if(!box)return;if(!box.hidden){box.hidden=true;btn.textContent='Stats';return}box.hidden=false;btn.textContent='Hide Stats';if(box.dataset.loaded==='1')return;box.innerHTML='<div class="sub">Loading match statistics…</div>';try{const r=await fetch(`/sports/${encodeURIComponent(btn.dataset.sport)}/match/${encodeURIComponent(btn.dataset.ks315Stats)}`,{headers:{Accept:'application/json'}});if(!r.ok)throw Error(String(r.status));const d=await r.json();let pairs=[];if(btn.dataset.sport==='football'){for(const b of (Array.isArray(d.statistics)?d.statistics:[]))for(const x of (b?.statistics||[]))pairs.push([x.type||'Stat',x.value??'—']);if(!pairs.length)pairs=flatten({statistics:d.statistics,events:d.events,lineups:d.teams,players:d.players})}else pairs=flatten(d?.statistics?.sportSpecific||d?.statistics?.scoresByPeriod||d?.statistics||{});box.innerHTML=pairs.length?pairs.slice(0,50).map(([k,v])=>`<div class="ks315-stat"><span>${E(k)}</span><b>${E(v)}</b></div>`).join(''):'<div class="empty">No detailed statistics are available for this completed match.</div>';box.dataset.loaded='1'}catch(_){box.innerHTML='<div class="empty">Match statistics are temporarily unavailable.</div>'}}
 // Preserve the old live function only for switching back; Finished is owned exclusively here.
 if(!window.ks307SetLiveMode_original_v316)window.ks307SetLiveMode_original_v316=window.ks307SetLiveMode;
 window.ks307SetLiveMode=function(mode){if(mode==='finished'){setView('finished');return}document.body.dataset.kasiLiveView='live';return window.ks307SetLiveMode_original_v316?.('live')};
 function wire(){const f=document.getElementById('ks307FinishedBtn'),l=document.getElementById('ks307LiveBtn');if(f){f.removeAttribute('onclick');f.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();setView('finished')}}if(l){l.removeAttribute('onclick');l.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();setView('live')}}rows=read();document.body.dataset.kasiLiveView='live'}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-ks315-stats]');if(b){e.preventDefault();e.stopPropagation();stats(b)}},true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
 window.__KASI_V316_FINISHED__={load,paint,setView};
})();


(function(){
 function update(){const k=document.getElementById('kTop'),n=document.getElementById('kTopName');if(!k||!n||!window.S)return;let a=Array.isArray(S.predictions)?S.predictions.filter(Boolean):[];if(!a.length&&Array.isArray(S.fixtures))a=S.fixtures.filter(x=>x?.prediction||x?.probabilities);if(!a.length)return;const cf=x=>Number(x?.confidence??x?.prediction?.confidence??0);a=a.slice().sort((x,y)=>cf(y)-cf(x)).slice(0,2);if(!a.length)return;k.textContent=a.map(x=>(cf(x)||0).toFixed(1)+'%').join(' · ');n.innerHTML=a.map((x,i)=>{const h=x.home||x.homeTeam?.name||x.homeTeam||'Home',w=x.away||x.awayTeam?.name||x.awayTeam||'Away',pick=x.bestPick||x.prediction?.bestPick||x.prediction?.winner||'Model pick';return `${i+1}. <b>${String(h)} vs ${String(w)}</b><br>Kasi: ${String(pick)} ${cf(x).toFixed(1)}%`}).join('<br><br>')}
 const old=window.renderOverview;window.renderOverview=function(){const r=old?.apply(this,arguments);try{update()}catch(_){}return r};setTimeout(update,800);setTimeout(update,2500);
})();


(function(){
 const warmed=new Set();
 window.kasiPrefetchMatch=function(id,sport='football',league=''){
   id=String(id||'').trim(); sport=String(sport||'football').toLowerCase(); if(!id)return;
   const key=sport+':'+id;if(warmed.has(key))return;warmed.add(key);
   let u='/sports/'+encodeURIComponent(sport)+'/match/'+encodeURIComponent(id);
   if(league)u+='?league='+encodeURIComponent(league);
   try{fetch(u,{headers:{Accept:'application/json'},cache:'default',priority:'low'}).catch(()=>warmed.delete(key))}catch(_){warmed.delete(key)}
 };
 document.addEventListener('pointerover',function(e){
   const b=e.target.closest('.lr-stats-btn');if(!b)return;
   const row=b.closest('.live-row');if(!row)return;
   const oc=b.getAttribute('onclick')||row.getAttribute('onclick')||'';
   const m=oc.match(/openStatsPanel\(([^,]+),'([^']*)','([^']*)'/);if(!m)return;
   window.kasiPrefetchMatch(String(m[1]).replace(/[^0-9A-Za-z_-]/g,''),m[2]||'football',m[3]||'');
 },{passive:true});
})();


(function(){
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=async(path,params={})=>{const u=new URL(path,location.origin);Object.entries(params).forEach(([k,v])=>v!=null&&u.searchParams.set(k,v));const r=await fetch(u,{headers:{Accept:'application/json'},cache:'default'});if(!r.ok)throw Error(String(r.status));return r.json()};
const CODES={'england':'GB','scotland':'GB','wales':'GB','spain':'ES','germany':'DE','italy':'IT','france':'FR','south africa':'ZA','portugal':'PT','netherlands':'NL','turkey':'TR','brazil':'BR','argentina':'AR','usa':'US','united states':'US','saudi arabia':'SA','belgium':'BE','australia':'AU','new zealand':'NZ','india':'IN','pakistan':'PK','sri lanka':'LK','bangladesh':'BD','ireland':'IE','zimbabwe':'ZW','namibia':'NA'};
function flag(c){const raw=String(c||'').trim(),code=/^[A-Za-z]{2}$/.test(raw)?raw.toUpperCase():CODES[raw.toLowerCase()];return code?String.fromCodePoint(...[...code].map(x=>127397+x.charCodeAt(0))):''}
function initials(n){return String(n||'Team').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'TM'}
function mark(t){const src=String(t?.badge||t?.logo||t?.teamLogo||'').trim();return /^https?:\/\//i.test(src)?`<img class="ks334-team-mark" src="${E(src)}" alt="${E(t?.name||'Team')} badge" loading="lazy" decoding="async" onerror="this.style.display='none'">`:`<span class="ks334-team-fallback">${E(initials(t?.name))}</span>`}
// Global Teams & Players directory: render only rows whose sport matches the selected tab.
window.v249LoadDirectory=async function(sp='football',btn,q=''){
 sp=String(sp||'football').toLowerCase();window.v250DirectorySport=sp;
 document.querySelectorAll('#v249TeamsPlayers .seg button').forEach(x=>x.classList.toggle('active',x===btn));
 const el=document.getElementById('v249DirectoryBody');if(!el)return;
 el.innerHTML=`<div class="empty">Loading ${E(sp)} teams and players…</div>`;
 try{
   const d=await J('/sports/directory',{sport:sp,q:String(q||'')});
   const teams=(Array.isArray(d.teams)?d.teams:[]).filter(x=>!x.sport||String(x.sport).toLowerCase()===sp).slice(0,60);
   const players=(Array.isArray(d.players)?d.players:[]).filter(x=>!x.sport||String(x.sport).toLowerCase()===sp).slice(0,60);
   const teamUrl=x=>sp==='football'?`/teams/${encodeURIComponent(x.publicRef||x.ref||x.id||'')}`:`/sports/${sp}/team/${encodeURIComponent(x.id||x.ref||'')}`;
   const playerUrl=x=>sp==='football'?`/players/${encodeURIComponent(x.publicRef||x.ref||x.id||'')}`:`/sports/${sp}/player/${encodeURIComponent(x.id||x.ref||'')}`;
   const teamRows=teams.map(x=>{const f=flag(x.countryCode||x.country_code||x.iso2||x.country);return `<div class="v249-row"><div>${mark(x)}</div><div><b>${E(x.name)}</b>${f?`<span class="ks334-country-flag" title="${E(x.country||'')}">${f}</span>`:''}<div class="sub">${E(x.country||x.league||'')}</div></div><a href="${E(teamUrl(x))}">Open</a></div>`}).join('');
   const playerRows=players.map(x=>`<div class="v249-row"><div>PLAYER</div><div><b>${E(x.name)}</b><div class="sub">${E(x.team||x.position||x.role||'')}</div></div><a href="${E(playerUrl(x))}">Open</a></div>`).join('');
   el.innerHTML=`<div class="v249-grid"><div><h3>${E(sp[0].toUpperCase()+sp.slice(1))} Teams</h3>${teamRows||'<div class="empty">No teams currently available.</div>'}</div><div><h3>${E(sp[0].toUpperCase()+sp.slice(1))} Players</h3>${playerRows||'<div class="empty">No players currently available from the provider.</div>'}</div></div>`;
 }catch(e){el.innerHTML=`<div class="empty">${E(sp)} Unable to load data.</div>`}
};
// Football league explorer: preserve provider badge + country flag.
window.ks211LoadLeague=async function(){
 const el=document.getElementById('ks211LeagueTeams'),sel=document.getElementById('ks211League');if(!el)return;const league=String(sel?.value||'39');
 try{const d=await J('/players/explorer',{league,season:2026}),rows=Array.isArray(d.teams)?d.teams:[];window.__ks211Teams=rows;el.className='ks211-teams';el.innerHTML='<h3>Football Teams</h3>'+(rows.length?rows.map((t,i)=>{const ref=String(t.publicRef||t.ref||t.id||''),f=flag(t.countryCode||t.country_code||t.iso2||t.country);return `<div class="ks211-team"><div class="ks211-team-head">${mark(t)}<div class="ks308-team-copy"><div class="ks308-team-name"><b>${E(t.name||'Team')}</b>${f?`<span class="ks308-country-flag" title="${E(t.country||'')}">${f}</span>`:''}</div><div class="sub">${E(t.country||'')}</div></div>${ref?`<a class="match-stats-btn" href="/teams/${encodeURIComponent(ref)}">Open</a>`:''}</div><div class="ks211-squad" id="ks211sq${i}"><button type="button" onclick="event.stopPropagation();ks211LoadSquad(${i})">View players</button></div></div>`}).join(''):'<div class="empty">No teams available.</div>')}catch(_){if(!el.children.length)el.innerHTML='<div class="empty">No team data available.</div>'}
};
// Tip: exactly one final renderer. It never fabricates bookmaker data.
window.ks318LoadTip=async function(){
 const card=document.getElementById('totdCard'),body=document.getElementById('totdBody'),b=document.getElementById('totdConf');if(!body||!card)return;
 const show=()=>{card.style.display=''};
 const hide=()=>{card.style.display='none'};
 try{
   const d=await J('/tip-of-day'),tips=Array.isArray(d.tips)?d.tips:[],cmp=Array.isArray(d.comparisonFallback)?d.comparisonFallback:[];
   if(tips.length){show();if(b)b.textContent=tips.length>1?'Current top 2':'Current tip';body.innerHTML=tips.slice(0,2).map(x=>{const p=x.prediction||{};return `<div style="padding:12px 0;border-bottom:1px solid var(--line)"><b>${E(x.home)} vs ${E(x.away)}</b><div class="sub">Kasi Prediction: <b>${E(p.bestPick||p.winner||'—')}</b> · ${Number(p.confidence||x.confidence||0).toFixed(1)}%</div></div>`}).join('');try{localStorage.setItem('kasi:last-tip-of-day',JSON.stringify(d))}catch(_){}return}
   if(cmp.length){show();if(b)b.textContent='Kasi vs Bookmaker · '+Math.min(3,cmp.length)+' examples';body.innerHTML=cmp.slice(0,3).map(x=>`<div class="ks327-compare"><div class="ks327-compare-title">${E(x.home)} vs ${E(x.away)}</div><div>Kasi Prediction: <b>${E(x.kasiPick||'—')}</b> · ${Number(x.kasiConfidence||0).toFixed(1)}%</div><div>Bookmaker Pick: <b>${E(x.bookmakerPick||'—')}</b>${x.bookmakerOdds?' · '+Number(x.bookmakerOdds).toFixed(2):''}</div></div>`).join('');return}
   hide();
 }catch(_){hide()}
};
// Visitor artifact guard: remove escaped newline/template fragments from visible text only.
function cleanVisible(root=document.body){
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){
   const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|TEXTAREA|PRE|CODE)$/i.test(p.tagName))continue;
   let v=n.nodeValue||'';const nv=v.replace(/\\n/g,' ').replace(/Kasi Sports News\s*['\"]?>/gi,'Kasi Sports News').replace(/\s{3,}/g,' ');if(nv!==v)n.nodeValue=nv;
 }
}
/* v345 stability: no whole-document MutationObserver. cleanVisible runs once during boot only. */
function boot(){cleanVisible();window.ks318LoadTip();const sp=window.v250DirectorySport||'football';const btn=[...document.querySelectorAll('#v249TeamsPlayers .seg button')].find(x=>(x.textContent||'').toLowerCase().startsWith(sp));if(document.getElementById('v249DirectoryBody'))window.v249LoadDirectory(sp,btn||null);if(document.getElementById('ks211LeagueTeams'))window.ks211LoadLeague()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


(function(){
 'use strict';
 if(window.__KASI_V340_HOME_CRITICAL__)return;window.__KASI_V340_HOME_CRITICAL__=true;
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const J=async(path)=>{const r=await fetch(path,{headers:{Accept:'application/json'},cache:'default'});if(!r.ok)throw Error('HTTP '+r.status);const ct=(r.headers.get('content-type')||'').toLowerCase();if(!ct.includes('json'))throw Error('Unexpected response');return r.json()};
 const val=(o,...keys)=>{for(const k of keys){let x=o;for(const p of k.split('.'))x=x?.[p];if(x!==undefined&&x!==null&&x!=='')return x}return''};
 function norm(raw,finished=false){const x=raw||{},lg=typeof x.league==='object'?x.league:{},tm=x.teams||{},h=tm.home||{},a=tm.away||{};return {raw:x,id:val(x,'id','fixtureId','providerFixtureId','fixture.id','_afootFixtureId'),sport:String(val(x,'sport')||'football').toLowerCase(),country:String(val(x,'country','countryName','category.name','league.country')||'International'),league:String((typeof x.league==='string'?x.league:'')||val(x,'leagueName','competition.name','tournament.name','league.name')||'Other matches'),home:String(val(x,'home','homeName','homeTeam.name','teams.home.name')||'Home'),away:String(val(x,'away','awayName','awayTeam.name','teams.away.name')||'Away'),homeLogo:String(val(x,'homeLogo','homeBadge','homeTeam.logo','teams.home.logo')||''),awayLogo:String(val(x,'awayLogo','awayBadge','awayTeam.logo','teams.away.logo')||''),hs:val(x,'homeScore','homeGoals','goals.home','score.fulltime.home','score.home'),as:val(x,'awayScore','awayGoals','goals.away','score.fulltime.away','score.away'),date:val(x,'date','datetime','startTime','commenceTime','fixture.date'),status:String(val(x,'statusShort','fixture.status.short','status','state','min')||(finished?'FT':'LIVE')),finished};}
 function when(v){try{return v?new Date(v).toLocaleString('en-ZA',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):''}catch(_){return''}}
 function logo(u,n){return /^https?:\/\//i.test(u)?`<img src="${E(u)}" alt="${E(n)}" loading="lazy" decoding="async" onerror="this.style.display='none'">`:''}
 function href(m){if(!m.id)return'';return m.sport==='football'?`/matches/${encodeURIComponent(m.id)}/stats`:`/match/${encodeURIComponent(m.sport)}/${encodeURIComponent(m.id)}`}
 function row(m){const score=(m.hs!==''&&m.as!=='')?`${E(m.hs)} – ${E(m.as)}`:'—';const st=m.finished?(String(m.status).toUpperCase()==='AET'?'AET':String(m.status).toUpperCase()==='PEN'?'PEN':'FT'):(m.status||'LIVE');const u=href(m);return `<div class="ks340-match"><div class="ks340-meta"><span class="ks340-sport">${E(m.sport)}</span>${E(when(m.date))}</div><div><div class="ks340-teams"><span class="ks340-team">${logo(m.homeLogo,m.home)}${E(m.home)}</span><span class="ks340-score">${score}</span><span class="ks340-team">${E(m.away)}${logo(m.awayLogo,m.away)}</span></div><div class="ks340-status">${E(m.country)} · ${E(m.league)} · ${E(st)}</div></div><div class="ks340-action">${u?`<a href="${E(u)}">Stats</a>`:''}</div></div>`}
 function grouped(rows,label){const g=new Map();rows.map(x=>norm(x,label==='finished')).forEach(m=>{const k=m.country+'|||'+m.league;if(!g.has(k))g.set(k,{country:m.country,league:m.league,rows:[]});g.get(k).rows.push(m)});return [...g.values()].map(x=>`<section class="ks340-group"><div class="ks340-head"><b>${E(x.country)}</b><span>${E(x.league)}</span><em>${x.rows.length} ${label}</em></div>${x.rows.map(row).join('')}</section>`).join('')}
 function paintLiveEverywhere(rows){rows=Array.isArray(rows)?rows:[];const html=rows.length?grouped(rows,'live'):'<div class="empty">No Football, Rugby or Cricket games are live right now.</div>';const list=document.getElementById('liveList');if(list)list.innerHTML=html;const grid=document.getElementById('liveMatchGrid');if(grid&&document.body.dataset.kasiLiveView!=='finished')grid.innerHTML=html;const a=document.getElementById('liveTabCount'),b=document.getElementById('liveWidgetCount');if(a)a.textContent=rows.length+' live';if(b&&document.body.dataset.kasiLiveView!=='finished')b.textContent=rows.length?rows.length+' live':'No matches live'}
 let liveTask=null;window.ks340RefreshLive=async function(){if(liveTask)return liveTask;liveTask=(async()=>{try{const d=await J('/sports/live'),rows=Array.isArray(d?.games)?d.games:[];window.liveMatches=rows;try{localStorage.setItem('ks:v340:live:last-good',JSON.stringify(rows))}catch(_){}paintLiveEverywhere(rows);return true}catch(e){let rows=[];try{rows=JSON.parse(localStorage.getItem('ks:v340:live:last-good')||'[]')}catch(_){}if(rows.length)paintLiveEverywhere(rows);else{const list=document.getElementById('liveList');if(list)list.innerHTML='<div class="empty">Live scores are updating.</div>'}return false}finally{liveTask=null}})();return liveTask};
 let finTask=null;window.ks340RefreshFinished=async function(){if(finTask)return finTask;finTask=(async()=>{const grid=document.getElementById('ks307FinishedGrid');try{const d=await J('/sports/finished?hours=48&limit=500'),rows=(Array.isArray(d?.matches)?d.matches:Array.isArray(d?.games)?d.games:[]).filter(x=>{const m=norm(x,true);return m.hs!==''&&m.as!==''});try{if(rows.length)localStorage.setItem('ks:v340:finished:last-good',JSON.stringify(rows))}catch(_){}if(grid)grid.innerHTML=rows.length?grouped(rows,'finished'):'<div class="empty">No completed matches with confirmed scores in the last 48 hours.</div>';const c=document.getElementById('liveWidgetCount');if(c)c.textContent=rows.length+' finished · last 48h';return true}catch(_){let rows=[];try{rows=JSON.parse(localStorage.getItem('ks:v340:finished:last-good')||'[]')}catch(e){}if(grid)grid.innerHTML=rows.length?grouped(rows,'finished'):'<div class="empty">Finished matches are updating.</div>';return false}finally{finTask=null}})();return finTask};
 // Exactly one final mode owner: both modes use the same grouped row format.
 window.ks307SetLiveMode=function(mode){const fin=mode==='finished';document.body.dataset.kasiLiveView=fin?'finished':'live';document.getElementById('ks307LiveBtn')?.classList.toggle('active',!fin);document.getElementById('ks307FinishedBtn')?.classList.toggle('active',fin);const lg=document.getElementById('liveMatchGrid'),fg=document.getElementById('ks307FinishedGrid'),more=document.getElementById('ks307FinishedMore');if(lg)lg.style.display=fin?'none':'';if(fg)fg.style.display=fin?'':'none';if(more)more.style.display='none';if(fin)window.ks340RefreshFinished();else window.ks340RefreshLive();};
 // Tip: one owner only. 1 valid current Tip stays. No usable data = hide the entire Home card.
 let tipTask=null;
 function ks360ReadTip(){try{return JSON.parse(localStorage.getItem('kasi:last-tip-of-day')||'null')}catch(_){return null}}
 function ks360PaintTip(d){
   const card=document.getElementById('totdCard'),body=document.getElementById('totdBody'),b=document.getElementById('totdConf');
   if(!card||!body)return false;
   const tips=Array.isArray(d?.tips)?d.tips.filter(x=>x&&x.home&&x.away):[];
   const cmp=Array.isArray(d?.comparisonFallback)?d.comparisonFallback.filter(x=>x&&x.home&&x.away):[];
   if(tips.length){card.style.display='';if(b)b.textContent=tips.length>1?'Current top 2':'Current tip';body.innerHTML=tips.slice(0,2).map(x=>{const p=x.prediction||{};return `<div style="padding:12px 0;border-bottom:1px solid var(--line)"><b>${E(x.home)} vs ${E(x.away)}</b><div class="sub">Kasi Prediction: <b>${E(p.bestPick||p.winner||x.bestOutcome||'—')}</b> · ${Number(p.confidence||x.confidence||0).toFixed(1)}%</div></div>`}).join('');return true}
   if(cmp.length){card.style.display='';if(b)b.textContent='Kasi vs Bookmaker · '+Math.min(3,cmp.length)+' examples';body.innerHTML=cmp.slice(0,3).map(x=>`<div class="ks327-compare"><div class="ks327-compare-title">${E(x.home)} vs ${E(x.away)}</div><div class="ks327-compare-line">Kasi Prediction: <b>${E(x.kasiPick||'—')}</b> · ${Number(x.kasiConfidence||0).toFixed(1)}%</div><div class="ks327-compare-line">Bookmaker Pick: <b>${E(x.bookmakerPick||'—')}</b>${x.bookmakerOdds?' · '+Number(x.bookmakerOdds).toFixed(2):''}</div></div>`).join('');return true}
   card.style.display='none';return false;
 }
 window.ks340LoadTip=window.ks318LoadTip=async function(opts={}){
   const cached=ks360ReadTip(); if(cached)ks360PaintTip(cached);
   if(tipTask)return tipTask;
   tipTask=(async()=>{try{
     const d=await J('/tip-of-day');
     const tips=Array.isArray(d?.tips)?d.tips.filter(x=>x&&x.home&&x.away):[];
     const cmp=Array.isArray(d?.comparisonFallback)?d.comparisonFallback.filter(x=>x&&x.home&&x.away):[];
     if(tips.length||cmp.length)try{localStorage.setItem('kasi:last-tip-of-day',JSON.stringify(d))}catch(_){}
     /* Background refresh is cache-only when the page already completed its first paint.
        Explicit refresh may update the visible card. Cold first visits render once if the
        response arrives inside the 2500ms critical budget; late responses wait for next view. */
     const elapsed=performance.now();
     if(opts.force===true || cached || elapsed<2500) return ks360PaintTip(d);
     return !!(tips.length||cmp.length);
   }catch(_){return !!cached}finally{tipTask=null}})();return tipTask;
 }; // Prevent legacy renderPredictions/renderOverview refreshes from repainting stale Tip markup.
 window.renderTipOfDay=function(){return window.ks340LoadTip()};
 // v345: obsolete Admin Back Home owner removed; authoritative owner is kasi-v345-permanent-fix-owner.
 // v346 permanent cache-first owner: synchronously hydrate all live surfaces from one persistent last-good cache before any network request.
 const LIVE_CACHE='ks:v340:live:last-good', FIN_CACHE='ks:v340:finished:last-good';
 function readCache(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}}
 function paintFinishedCached(rows){
   rows=Array.isArray(rows)?rows.filter(x=>{const m=norm(x,true);return m.hs!==''&&m.as!==''}):[];
   const grid=document.getElementById('ks307FinishedGrid');
   if(grid)grid.innerHTML=rows.length?grouped(rows,'finished'):'<div class="empty">No completed matches with confirmed scores in the cached 48-hour state.</div>';
   if(document.body.dataset.kasiLiveView==='finished'){const c=document.getElementById('liveWidgetCount');if(c)c.textContent=rows.length+' finished · cached'}
 }
 function hydrateSportsCache(){
   const live=readCache(LIVE_CACHE), finished=readCache(FIN_CACHE);
   window.liveMatches=live;
   paintLiveEverywhere(live);
   paintFinishedCached(finished);
   document.documentElement.dataset.kasiSportsCacheHydrated='1';
   return {live,finished};
 }
 // Tab changes paint the persistent cache immediately; refresh happens only after the first frame.
 window.ks307SetLiveMode=function(mode){
   const fin=mode==='finished';document.body.dataset.kasiLiveView=fin?'finished':'live';
   document.getElementById('ks307LiveBtn')?.classList.toggle('active',!fin);document.getElementById('ks307FinishedBtn')?.classList.toggle('active',fin);
   const lg=document.getElementById('liveMatchGrid'),fg=document.getElementById('ks307FinishedGrid'),more=document.getElementById('ks307FinishedMore');
   if(lg)lg.style.display=fin?'none':'';if(fg)fg.style.display=fin?'':'none';if(more)more.style.display='none';
   if(fin)paintFinishedCached(readCache(FIN_CACHE));else paintLiveEverywhere(readCache(LIVE_CACHE));
   requestAnimationFrame(()=>setTimeout(()=>{fin?window.ks340RefreshFinished():window.ks340RefreshLive()},0));
 };
 function boot(){
   wireAdmin();
   hydrateSportsCache(); // no await: cached Live Score + Live Matches + Finished Games are painted in the same task
   window.ks340LoadTip();
   requestAnimationFrame(()=>setTimeout(()=>{
     window.ks340RefreshLive();
     // Warm Finished in background even while Live tab is selected, without clearing cached DOM.
     setTimeout(()=>window.ks340RefreshFinished(),120);
   },0));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 // Refresh live data every 3 minutes without blanking the cache-first DOM.
 setInterval(()=>window.ks340RefreshLive?.(),180000);
 return;
 function __v345_obsolete_boot(){wireAdmin();window.ks340LoadTip();window.ks340RefreshLive();if(document.body.dataset.kasiLiveView==='finished')window.ks340RefreshFinished()}

})();


(function(){
'use strict';
if(window.__KASI_V350_SPORT_CONTEXT__)return;window.__KASI_V350_SPORT_CONTEXT__=true;
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=async(path,params={})=>{const u=new URL(path,location.origin);Object.entries(params).forEach(([k,v])=>v!=null&&u.searchParams.set(k,v));const r=await fetch(u,{headers:{Accept:'application/json'},cache:'default'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
const valid=sp=>['football','rugby','cricket'].includes(String(sp||'').toLowerCase())?String(sp).toLowerCase():'football';
const label=sp=>sp==='rugby'?'Rugby':sp==='cricket'?'Cricket':'Football';
function selected(){return valid(window.v250DirectorySport||document.getElementById('ks213Sport')?.value||'football')}
function media(x){const src=String(x?.badge||x?.logo||x?.photo||'');return /^https?:\/\//i.test(src)?`<img src="${E(src)}" alt="" loading="lazy" decoding="async" style="width:34px;height:34px;object-fit:contain">`:''}
function route(sp,k,x){const id=x?.publicRef||x?.ref||x?.id||'';return sp==='football'?`/${k==='team'?'teams':'players'}/${encodeURIComponent(id)}`:`/sports/${encodeURIComponent(sp)}/${k}/${encodeURIComponent(id)}`}
function filterSport(rows,sp){return (Array.isArray(rows)?rows:[]).filter(x=>{const s=String(x?.sport||'').toLowerCase();return !s||s===sp||s===sp+'s'})}
function render(el,sp,d){const teams=filterSport(d?.teams,sp),players=filterSport(d?.players,sp);const row=(x,k)=>`<div class="v249-row"><div>${media(x)}</div><div><b>${E(x?.name||'Unknown')}</b><div class="sub">${E(x?.country||x?.team||x?.league||'')}</div></div><a href="${E(route(sp,k,x))}">Open</a></div>`;el.innerHTML=`<div class="v249-grid"><div><h3>${label(sp)} Teams</h3>${teams.map(x=>row(x,'team')).join('')||'<div class="empty">No teams currently available.</div>'}</div><div><h3>${label(sp)} Players</h3>${players.map(x=>row(x,'player')).join('')||'<div class="empty">No players currently available from the provider.</div>'}</div></div>`}
function context(sp){sp=valid(sp);window.v250DirectorySport=sp;document.body.dataset.kasiDirectorySport=sp;const sel=document.getElementById('ks213Sport');if(sel&&sel.value!==sp)sel.value=sp;document.querySelectorAll('#v249TeamsPlayers .seg button').forEach(b=>b.classList.toggle('active',(b.textContent||'').toLowerCase().startsWith(sp)));
 const league=document.getElementById('ks211League'),football=document.getElementById('ks211LeagueTeams'),other=document.getElementById('ks213OtherSportData'),leaders=document.getElementById('ks211Leaders')?.closest('.card.section'),stand=document.getElementById('homeStandingsSection'),leagueCard=league?.closest('.card.section');const isF=sp==='football';
 if(league)league.style.display=isF?'':'none';if(football)football.style.display=isF?'':'none';if(other)other.style.display=isF?'none':'';if(leaders)leaders.style.display=isF?'':'none';if(stand)stand.style.display=isF?'':'none';
 if(leagueCard){const h=leagueCard.querySelector('.home-section-head h2'),sub=leagueCard.querySelector('.home-section-head .sub');if(h)h.textContent=isF?'League Player Explorer':label(sp)+' Teams & Players';if(sub)sub.textContent=isF?'Teams load first. Player squads are loaded only when requested.':'Only '+label(sp)+' provider data is shown here.'}
 return sp}
async function loadSport(sp,target){sp=context(sp);if(sp==='football')return;if(!target)return;target.innerHTML=`<div class="empty">Loading ${label(sp)} teams and players…</div>`;try{const d=await J(`/sports/${sp}/teams-players`,{limit:100});render(target,sp,d)}catch(_){target.innerHTML=`<div class="empty">No ${label(sp)} data available.</div>`}}
const footballLeagueLoader=window.ks211LoadLeague;
window.ks211LoadLeague=async function(){const sp=selected();if(sp!=='football'){context(sp);const el=document.getElementById('ks211LeagueTeams');if(el){el.innerHTML='';el.style.display='none'};return}return typeof footballLeagueLoader==='function'?footballLeagueLoader.apply(this,arguments):undefined};
window.v249LoadDirectory=async function(sp='football',btn,q=''){sp=context(sp);const upper=document.getElementById('v249DirectoryBody'),lower=document.getElementById('ks213OtherSportData');if(sp!=='football')loadSport(sp,lower);else if(lower)lower.style.display='none';if(!upper)return;upper.innerHTML=`<div class="empty">Loading ${label(sp)} teams and players…</div>`;try{const path=sp==='football'?'/sports/directory':`/sports/${sp}/teams-players`;const params=sp==='football'?{sport:'football',q:String(q||'')}:{limit:100};const d=await J(path,params);render(upper,sp,d)}catch(_){upper.innerHTML=`<div class="empty">No ${label(sp)} data available.</div>`}};
window.ks213SportChanged=async function(){const sp=context(document.getElementById('ks213Sport')?.value||selected()),upper=document.getElementById('v249DirectoryBody'),lower=document.getElementById('ks213OtherSportData');if(sp==='football'){if(lower)lower.style.display='none';await window.ks211LoadLeague?.()}else await loadSport(sp,lower);if(upper){upper.innerHTML=`<div class="empty">Loading ${label(sp)} teams and players…</div>`;try{const d=await J(sp==='football'?'/sports/directory':`/sports/${sp}/teams-players`,sp==='football'?{sport:'football',q:''}:{limit:100});render(upper,sp,d)}catch(_){upper.innerHTML=`<div class="empty">No ${label(sp)} data available.</div>`}}};
// Legacy sportshub navigation used to hard-reset Teams & Players to Football. Preserve the selected sport instead.
const nav=window.kasiscorePrimaryNav;if(typeof nav==='function')window.kasiscorePrimaryNav=function(tab,btn){const keep=selected(),r=nav.apply(this,arguments);if(tab==='sportshub')setTimeout(()=>{const sp=selected()==='football'&&keep!=='football'?keep:selected();const b=[...document.querySelectorAll('#v249TeamsPlayers .seg button')].find(x=>(x.textContent||'').toLowerCase().startsWith(sp));window.v249LoadDirectory(sp,b||null)},25);return r};
// Final post-boot reconciliation; no observer and no repaint loop.
function reconcile(){const sp=selected();context(sp);if(sp!=='football'){const lower=document.getElementById('ks213OtherSportData');loadSport(sp,lower)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(reconcile,0),{once:true});else setTimeout(reconcile,0);
})();
