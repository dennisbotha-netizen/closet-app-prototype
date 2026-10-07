'use strict';
/* ---------- storage (IndexedDB, all on-device) ---------- */
const DB={db:null,
 open(){return new Promise((res,rej)=>{const r=indexedDB.open('closet',1);r.onupgradeneeded=()=>{const d=r.result;['items','outfits','feedback','kv'].forEach(s=>d.createObjectStore(s,{keyPath:'id'}))};r.onsuccess=()=>{this.db=r.result;res()};r.onerror=()=>rej(r.error)})},
 tx(s,m){return this.db.transaction(s,m).objectStore(s)},
 req(q){return new Promise(r=>{q.onsuccess=()=>r(q.result);q.onerror=()=>r()})},
 all(s){return this.req(this.tx(s,'readonly').getAll())},
 put(s,v){return this.req(this.tx(s,'readwrite').put(v))},
 del(s,id){return this.req(this.tx(s,'readwrite').delete(id))},
 clear(s){return this.req(this.tx(s,'readwrite').clear())},
 async get(id){const x=await this.req(this.tx('kv','readonly').get(id));return x?x.v:undefined},
 set(id,v){return this.put('kv',{id,v})}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>ymd(new Date());// local (SAST) date, not UTC
const addDays=(ds,n)=>{const d=new Date(ds+'T12:00');d.setDate(d.getDate()+n);return ymd(d)};
const fmtDate=d=>d.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'});
const fmtDs=ds=>ds?fmtDate(new Date(ds+'T12:00')):'never';
const daysAgo=d=>d?Math.floor((new Date(today()+'T12:00')-new Date(d+'T12:00'))/864e5):Infinity;
function toast(t,act){const e=$('#toast');e.innerHTML=esc(t)+(act?` <button id="tAct">${esc(act.label)}</button>`:'');e.classList.add('show');e.classList.toggle('act',!!act);e.classList.toggle('high',sheetOpen);
 if(act)e.querySelector('#tAct').onclick=()=>{e.classList.remove('show');act.fn()};clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),act?5000:2400)}

const CATS=[['top','Tops','👚'],['bottom','Bottoms','👖'],['outer','Jackets','🧥'],['shoes','Shoes','👟'],['hat','Hats','🧢'],['acc','Accessories','👜']];
const OCC=['school','casual','party','sport','church','date'];
const COLOURS={pink:'#f7a8c8',lavender:'#b9a2e8',white:'#f7f7f7',black:'#2a2a2a',grey:'#a9a9b3',blue:'#6f9ad6',denim:'#5b7fae',navy:'#2c3e6b',beige:'#e3cfb0',brown:'#8a5a3c',red:'#d9434f',orange:'#f39a4b',yellow:'#f4d35e',green:'#7fb88a',purple:'#8a5bc4'};
const TINT={pink:'blush',red:'blush',lavender:'lilac',purple:'lilac',yellow:'butter',beige:'butter',orange:'butter',brown:'butter',green:'mint',blue:'sky',denim:'sky',navy:'sky',white:'stone',grey:'stone',black:'stone'};
const NEUTRAL=['white','black','grey','beige','denim','navy','brown'];
const PAIRS={pink:['lavender','white','grey','denim','beige'],lavender:['pink','white','denim','grey','beige'],red:['denim','black','white','navy'],blue:['white','beige','pink','yellow'],green:['beige','white','denim','brown'],yellow:['denim','white','lavender','navy'],orange:['denim','white','navy'],purple:['grey','white','black','pink'],navy:['pink','white','beige','yellow']};
function goesWith(a,b){if(a===b)return NEUTRAL.includes(a)?1:0.6;if(NEUTRAL.includes(a)&&NEUTRAL.includes(b))return 0.8;if(NEUTRAL.includes(a)||NEUTRAL.includes(b))return 0.9;return (PAIRS[a]||[]).includes(b)||(PAIRS[b]||[]).includes(a)?1:0.2}
function nearestColour(r,g,b){let best='pink',bd=1e9;for(const[k,h]of Object.entries(COLOURS)){const n=parseInt(h.slice(1),16),d=(r-(n>>16))**2+(g-(n>>8&255))**2+(b-(n&255))**2;if(d<bd){bd=d;best=k}}return best}
const catName=c=>(CATS.find(x=>x[0]===c)||CATS[0])[1].toLowerCase().replace(/s$/,'').replace(/accessorie$/,'accessory');

/* ---------- demo items (drawn SVGs, no real photos) ---------- */
const svg=(b,w=200,h=200)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${b}</svg>`);
const D={
 tee:c=>svg(`<path d="M60 30l25-12h30l25 12 40 30-20 28-22-14v110H62V74L40 88 20 60z" fill="${c}" stroke="#0002" stroke-width="3"/><path d="M85 18q15 18 30 0" fill="none" stroke="#0003" stroke-width="3"/>`),
 sweater:c=>svg(`<path d="M55 30l30-10h30l30 10 30 40 10 100h-24l-12-90v110H61V80l-12 90H25l10-100z" fill="${c}" stroke="#0002" stroke-width="3"/><path d="M61 175h78M40 160h20M140 160h20" stroke="#0002" stroke-width="5"/>`),
 cami:c=>svg(`<path d="M72 20v30l-12 25v115h80V75l-12-25V20h-6v30q-22 14-44 0V20z" fill="${c}" stroke="#0002" stroke-width="3"/>`),
 jeans:c=>svg(`<path d="M55 12h90l8 180h-38l-15-120-15 120H47z" fill="${c}" stroke="#0002" stroke-width="3"/><path d="M55 28h90M100 28v40" stroke="#0003" stroke-width="3"/>`),
 skirt:c=>svg(`<path d="M65 30h70l40 120H25z" fill="${c}" stroke="#0002" stroke-width="3"/><path d="M65 30h70v12H65zM80 42l-22 108M100 42v108M120 42l22 108" stroke="#0002" stroke-width="3" fill="none"/>`,200,170),
 shorts:c=>svg(`<path d="M50 30h100l12 100h-52l-10-55-10 55H38z" fill="${c}" stroke="#0002" stroke-width="3"/>`,200,150),
 jacket:c=>svg(`<path d="M55 25l30-8 15 25 15-25 30 8 32 45 8 110h-24l-12-90v105H61V90l-12 90H25l8-110z" fill="${c}" stroke="#0002" stroke-width="3"/><path d="M100 42v153" stroke="#0004" stroke-width="3"/><circle cx="92" cy="80" r="3" fill="#0005"/><circle cx="92" cy="120" r="3" fill="#0005"/>`),
 sneakers:c=>svg(`<path d="M20 80q0-30 25-30l35 5 25 20 60 12q15 5 15 20v10H20z" fill="${c}" stroke="#0002" stroke-width="3"/><path d="M20 108h160v10H20z" fill="#fff" stroke="#0002" stroke-width="2"/><path d="M60 62l10 14M75 60l10 14" stroke="#0003" stroke-width="3"/>`,200,130),
 flats:c=>svg(`<path d="M25 75q10-25 45-20l100 15q15 5 10 20H30z" fill="${c}" stroke="#0002" stroke-width="3"/>`,200,110),
 cap:c=>svg(`<path d="M40 90q0-60 60-60t60 60z" fill="${c}" stroke="#0002" stroke-width="3"/><path d="M100 90h85q-10 15-85 12z" fill="${c}" stroke="#0002" stroke-width="3"/>`,200,120),
 bag:c=>svg(`<path d="M70 70q0-40 30-40t30 40" fill="none" stroke="${c}" stroke-width="8"/><rect x="45" y="65" width="110" height="100" rx="18" fill="${c}" stroke="#0002" stroke-width="3"/>`),
};
const DEMO=[['Lilac knit','sweater','top','lavender',['school','casual']],['Pink tee','tee','top','pink',['casual','sport']],['White cami','cami','top','white',['party','date','casual']],['Blue jeans','jeans','bottom','denim',['school','casual']],['Pleated skirt','skirt','bottom','lavender',['party','church','date']],['Beige shorts','shorts','bottom','beige',['casual','sport']],['Denim jacket','jacket','outer','denim',['casual','school']],['White sneakers','sneakers','shoes','white',['school','casual','sport']],['Pink sneakers','sneakers','shoes','pink',['casual','party']],['Beige flats','flats','shoes','beige',['church','date','party']],['Pink cap','cap','hat','pink',['sport','casual']],['Lilac bag','bag','acc','lavender',['party','date','casual']]];

/* ---------- state ---------- */
const S={tab:'closet',items:[],outfits:[],feedback:[],me:{},filter:'all',pick:{},weather:null,occ:'school',calM:0,prefs:{}};
async function load(){[S.items,S.outfits,S.feedback]=await Promise.all(['items','outfits','feedback'].map(s=>DB.all(s)));S.items.sort((a,b)=>b.added-a.added);S.me=(await DB.get('me'))||{};S.prefs=(await DB.get('prefs'))||{nope:[],like:[]}}
async function seedDemo(){const t=Date.now();for(let i=0;i<DEMO.length;i++){const[n,shape,cat,col,occ]=DEMO[i];const it={id:'demo_'+i,name:n,cat,colour:col,occ,img:D[shape](COLOURS[col]),demo:true,added:t-i,lastWorn:i%3===0?null:addDays(today(),-i*4),wears:i%4};await DB.put('items',it)}await DB.set('seeded',true)}

/* ---------- image helpers ---------- */
function fileToImg(f){return new Promise((res,rej)=>{const u=URL.createObjectURL(f),i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=u})}
function scaled(img,max=700){const w0=img.naturalWidth||img.width,h0=img.naturalHeight||img.height;const k=Math.min(1,max/Math.max(w0,h0));const c=document.createElement('canvas');c.width=Math.round(w0*k);c.height=Math.round(h0*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c}
// Free, offline clothing cut-out: flood-fill from the edges over pixels near the (median) background colour, then feather the edge.
function removeBg(c,tol=40){const x=c.getContext('2d'),W=c.width,H=c.height,d=x.getImageData(0,0,W,H),p=d.data;
 const S2=[];const st0=Math.max(1,(W+H)/80|0);for(let i=0;i<W;i+=st0){S2.push(i*4,((H-1)*W+i)*4)}for(let j=0;j<H;j+=st0){S2.push(j*W*4,(j*W+W-1)*4)}
 const med=k=>{const v=S2.map(o=>p[o+k]).sort((a,b)=>a-b);return v[v.length>>1]};const r=med(0),g=med(1),b=med(2);
 const dist=o=>Math.sqrt(((p[o]-r)**2+(p[o+1]-g)**2+(p[o+2]-b)**2)/3);
 const bg=new Uint8Array(W*H),st=[];for(let i=0;i<W;i++){st.push(i,(H-1)*W+i)}for(let j=0;j<H;j++){st.push(j*W,j*W+W-1)}let removed=0;
 while(st.length){const k=st.pop();if(bg[k])continue;if(dist(k*4)>tol)continue;bg[k]=1;removed++;const xx=k%W;if(xx>0)st.push(k-1);if(xx<W-1)st.push(k+1);if(k>=W)st.push(k-W);if(k<W*(H-1))st.push(k+W)}
 if(removed<W*H*0.05||removed>W*H*0.97)return false;
 for(let k=0;k<W*H;k++){if(bg[k]){p[k*4+3]=0;continue}const xx=k%W;const nb=(xx>0&&bg[k-1])||(xx<W-1&&bg[k+1])||(k>=W&&bg[k-W])||(k<W*(H-1)&&bg[k+W]);if(nb){const t=Math.min(1,Math.max(0,(dist(k*4)-tol*.8)/(tol*.9)));p[k*4+3]=Math.round(255*(.35+.65*t))}}
 x.putImageData(d,0,0);return true}
async function aiCut(c){const mod=await Promise.race([import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm'),new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),30000))]);
 const blob=await new Promise(r=>c.toBlob(r,'image/png'));const out=await mod.removeBackground(blob,{output:{format:'image/png'}});const img=await TRY.loadImg(URL.createObjectURL(out));return trim(scaled(img,700))}
function dominant(c){const x=c.getContext('2d'),p=x.getImageData(0,0,c.width,c.height).data,cnt={};for(let i=0;i<p.length;i+=16){if(p[i+3]<128)continue;const n=nearestColour(p[i],p[i+1],p[i+2]);cnt[n]=(cnt[n]||0)+1}return Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]?.[0]||'pink'}
function trim(c){const x=c.getContext('2d'),W=c.width,H=c.height,p=x.getImageData(0,0,W,H).data;let a=W,b=H,e=0,f=0;for(let j=0;j<H;j++)for(let i=0;i<W;i++)if(p[(j*W+i)*4+3]>20){if(i<a)a=i;if(i>e)e=i;if(j<b)b=j;if(j>f)f=j}if(e<=a||f<=b)return c;const o=document.createElement('canvas');o.width=e-a+1;o.height=f-b+1;o.getContext('2d').drawImage(c,-a,-b);return o}

/* ---------- sheets + back button ---------- */
let sheetOpen=false;
function openSheet(html,onMount){$('#sheetBody').innerHTML=html;$('#sheet').classList.remove('hidden');requestAnimationFrame(()=>$('#sheet').classList.add('open'));if(!sheetOpen){history.pushState({sheet:1},'');sheetOpen=true}$('#sheetBody').scrollTop=0;$('#sheetBody').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeSheet);onMount&&onMount($('#sheetBody'))}
function closeSheet(){if(sheetOpen)history.back();else hideSheet()}
function hideSheet(){sheetOpen=false;$('#sheet').classList.remove('open');$('#sheet').classList.add('hidden');$('#sheetBody').innerHTML=''}
window.addEventListener('popstate',()=>{if(sheetOpen){hideSheet()}});
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet()});
const head=t=>`<div class="top"><button class="ib" data-close aria-label="Back">${ic('left')}</button><h2 class="st">${t}</h2><button class="ib" data-close aria-label="Close">${ic('x')}</button></div>`;

/* ---------- render ---------- */
function setTab(t){S.tab=t;document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));$('#fb').classList.toggle('hidden',t==='dress'||t==='me');render();scrollTo(0,0)}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function render(){const a=$('#app');a.classList.remove('in');({closet:rCloset,dress:rDress,ideas:rIdeas,me:rMe}[S.tab])(a);void a.offsetWidth;a.classList.add('in')}
const tint=it=>it&&!it.cut&&it.orig?'stone':TINT[it&&it.colour]||'stone';
const tile=(it,cls='',extra='',name=false)=>it?`<div class="tile ${cls}" data-id="${it.id}" ${extra}><div class="ph t-${tint(it)}${it.photo?' photo':''}"><img src="${it.img}" alt="${esc(it.name)}" loading="lazy"></div>${name?`<span class="nm">${esc(it.name)}</span>`:''}</div>`:`<div class="tile missing"><div class="ph t-stone"><span class="muted">gone</span></div></div>`;
const byCat=c=>S.items.filter(i=>i.cat===c);
const item=id=>S.items.find(i=>i.id===id);
const emptyState=(title,text,btn,id)=>`<div class="empty">${AVATAR_EMPTY.replace('class="sil"','class="sil sm"')}<h2>${title}</h2><p class="muted">${text}</p>${btn?`<button class="btn" id="${id}">${btn}</button>`:''}${S.items.some(i=>i.demo)?'':'<button class="btn ghost sm" data-demo style="margin-top:8px">Bring demo items back</button>'}</div>`;
function bindDemo(a){a.querySelectorAll('[data-demo]').forEach(b=>b.onclick=async()=>{await seedDemo();await load();toast('Demo items are back');render()})}

function rCloset(a){const list=S.filter==='all'?S.items:byCat(S.filter);const demo=S.items.filter(i=>i.demo).length;
 a.innerHTML=`<p class="eyebrow">${S.items.length} pieces${demo?` · ${demo} demo`:''}</p><div class="top"><h1>My Closet</h1><button class="ib p" id="addTop" aria-label="Add item">${ic('plus')}</button></div>
 <div class="chips">${[['all','All']].concat(CATS).map(([k,l])=>`<button class="chip ${S.filter===k?'on':''}" data-f="${k}">${l}</button>`).join('')}</div>
 ${S.items.length?`<div class="grid"><button class="tile add" id="addTile" aria-label="Add item"><div class="ph">${ic('plus')}<span>Add pieces</span></div></button>${list.map(i=>tile(i,'pop','role="button"',true)).join('')}</div>${list.length?'':'<p class="muted">Nothing in this group yet.</p>'}`
 :emptyState('Your closet is empty','Snap your first piece: lay it flat on a plain floor or bed.','Snap your first piece','addTile')}`;
 a.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{S.filter=b.dataset.f;render()});
 $('#addTop').onclick=$('#addTile').onclick=()=>addItem();bindDemo(a);
 a.querySelectorAll('.grid .tile[data-id]').forEach(t=>t.onclick=()=>itemSheet(item(t.dataset.id)));}

function itemForm(it){return `<div class="preview t-${tint(it)}">${it.img?`<img id="pv" src="${it.img}">`:'<span class="muted">No photo yet</span>'}</div>
 <label>Name</label><input id="fName" value="${esc(it.name||'')}" placeholder="${esc(it.suggest||'e.g. Pink hoodie')}" maxlength="40">
 <label>Category ${it.tagWhy?`<span class="badge">${it.tagWhy==='ai'?'AI guess':'guess'}</span>`:''}</label><div class="chips wrapc">${CATS.map(([k,l])=>`<button class="chip ${it.cat===k?'on':''}" data-cat="${k}">${l}</button>`).join('')}</div>
 <label>Colour: <b id="colName">${esc(it.colour||'')}</b> ${it.autoColour?'<span class="badge">auto-suggested</span>':''}</label>
 <div class="row sws">${Object.entries(COLOURS).map(([k,h])=>`<button class="sw ${it.colour===k?'on':''}" data-col="${k}" title="${k}" aria-label="${k}" style="background:${h}"></button>`).join('')}</div>
 ${it.pattern?`<label>Pattern <span class="badge">AI guess</span></label><div class="chips wrapc">${TAG.pats.map(p=>`<button class="chip ${it.pattern===p?'on':''}" data-pat="${p}">${p}</button>`).join('')}</div>`:''}
 <label>Good for</label><div class="chips wrapc">${OCC.map(o=>`<button class="chip ${(it.occ||[]).includes(o)?'on':''}" data-occ="${o}">${o}</button>`).join('')}</div>
 <label>Price (optional, for cost-per-wear)</label><input id="fPrice" type="number" inputmode="decimal" min="0" value="${esc(it.price||'')}" placeholder="R">`}
function bindForm(root,it){const sug=()=>{const n=root.querySelector('#fName');it.suggest=`${it.colour} ${catName(it.cat)}`;if(n&&!n.value)n.placeholder=it.suggest};
 root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{it.cat=b.dataset.cat;root.querySelectorAll('[data-cat]').forEach(x=>x.classList.toggle('on',x===b));sug()});
 root.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>{it.colour=b.dataset.col;root.querySelectorAll('[data-col]').forEach(x=>x.classList.toggle('on',x===b));root.querySelector('#colName').textContent=it.colour;sug()});
 root.querySelectorAll('[data-pat]').forEach(b=>b.onclick=()=>{it.pattern=b.dataset.pat;root.querySelectorAll('[data-pat]').forEach(x=>x.classList.toggle('on',x===b))});
 root.querySelectorAll('[data-occ]').forEach(b=>b.onclick=()=>{it.occ=it.occ||[];const o=b.dataset.occ;it.occ=it.occ.includes(o)?it.occ.filter(x=>x!==o):[...it.occ,o];b.classList.toggle('on')});sug()}
const readForm=(root,it)=>{it.name=root.querySelector('#fName').value.trim()||it.suggest||`${it.colour} ${catName(it.cat)}`;const p=root.querySelector('#fPrice').value;it.price=p?+p:undefined};

// one photo -> draft item (cut-out + auto-tags), all on the phone
async function prepPhoto(f){const img=await fileToImg(f);let c=scaled(img);const orig=c.toDataURL('image/jpeg',.85);const ok=removeBg(c);if(ok)c=trim(c);const col=dominant(c);
 let g=TAG.guess(c);if(TAG.enabled()){try{g=await TAG.clip(c)}catch(e){console.warn('smart tag unavailable',e&&e.message)}}
 const it={id:uid(),name:'',cat:g.cat,tagWhy:g.why,pattern:g.pattern,colour:col,autoColour:col,occ:['casual'],img:ok?c.toDataURL('image/png'):orig,orig,cut:ok,photo:!ok,added:Date.now(),lastWorn:null,wears:0};
 it.suggest=`${col} ${g.kind||catName(it.cat)}`;return it}
function addItem(){openSheet(`${head('Add pieces')}<div class="pill">${ic('image')}<span>Lay each piece flat on a plain floor, bed or wall. No faces needed. Photos stay on this phone, the cut-out and tags are done here too.</span></div>
 <div class="row"><label class="btn"><input type="file" accept="image/*" capture="environment" id="cam" hidden>${ic('camera')} Camera</label>
 <label class="btn ton"><input type="file" accept="image/*" id="gal" multiple hidden>${ic('image')} Gallery (many)</label></div>
 <label class="chk"><input type="checkbox" id="smart" ${TAG.enabled()?'checked':''}> Smart tagging on this phone (downloads a ~90 MB AI model once, Wi-Fi recommended)</label><div id="after"></div>`,root=>{
 root.querySelector('#smart').onchange=e=>{localStorage.setItem('smart_tag',e.target.checked?'1':'0');if(e.target.checked){toast('Downloading the tagging model…');TAG.load().then(()=>toast('Smart tagging ready ✨')).catch(()=>toast('Smart tagging couldn\'t load, using quick guesses'))}};
 const go=async files=>{files=[...files];if(!files.length)return;const after=root.querySelector('#after');const q=[];
  for(let i=0;i<files.length;i++){after.innerHTML=`<div class="spin"></div><p class="muted" style="text-align:center">Cutting out and tagging ${i+1} of ${files.length}…</p>`;try{q.push(await prepPhoto(files[i]))}catch(e){console.warn('photo',e&&e.message)}}
  if(!q.length){after.innerHTML='<p class="muted">Sorry, couldn\'t read those photos.</p>';return}review(root,q,0,0)};
 root.querySelector('#cam').onchange=e=>go(e.target.files);root.querySelector('#gal').onchange=e=>go(e.target.files);})}
// swipe-through "check & fix" cards
function review(root,q,i,saved){const after=root.querySelector('#after');if(i>=q.length){closeSheet();S.filter='all';render();if(saved){toast(`Added ${saved} piece${saved>1?'s':''} to your closet 💖`);vib(15)}return}
 const it=q[i];after.innerHTML=`<h2>Check & fix ${q.length>1?`<span class="badge">${i+1} of ${q.length}</span>`:''}</h2>${itemForm(it)}<p class="muted">${it.cut?'Background removed ✨':'Couldn\'t find a plain background, kept the full photo.'}</p>
 <div class="row">${it.cut?'<button class="btn ghost sm" id="useOrig">Use original photo</button>':''}<button class="btn ghost sm" id="better">${ic('wand',18)} Better cut-out</button></div>
 <div class="row" style="margin-top:10px">${q.length>1?'<button class="btn ghost" id="skip">Skip</button>':''}<button class="btn" id="save">${q.length>1&&i<q.length-1?'Save & next':'Save to closet'}</button></div>`;
 bindForm(after,it);const uo=after.querySelector('#useOrig');if(uo)uo.onclick=()=>{it.img=it.orig;it.cut=false;it.photo=true;after.querySelector('#pv').src=it.orig;uo.remove()};
 after.querySelector('#better').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Working on this phone…';try{const img=await TRY.loadImg(it.orig);const c=await aiCut(scaled(img));it.img=c.toDataURL('image/png');it.cut=true;it.photo=false;after.querySelector('#pv').src=it.img;b.textContent='Better cut-out ✓'}catch(err){console.warn('ai cut',err&&err.message);b.textContent='Not available right now'}};
 const sk=after.querySelector('#skip');if(sk)sk.onclick=()=>review(root,q,i+1,saved);
 after.querySelector('#save').onclick=async()=>{readForm(after,it);['orig','suggest','tagWhy'].forEach(k=>delete it[k]);await DB.put('items',it);S.items.unshift(it);review(root,q,i+1,saved+1)};root.scrollTop=0}

function itemSheet(it){const copy={...it,occ:[...(it.occ||[])]};openSheet(`${head(esc(it.name))}${itemForm(copy)}
 <p class="muted">Worn ${it.wears||0}× · last worn: ${fmtDs(it.lastWorn)}${it.price&&it.wears?` · R${(it.price/it.wears).toFixed(0)} per wear`:''}</p>
 <label class="btn ghost full" style="margin-bottom:8px"><input type="file" accept="image/*" id="rePh" hidden>${ic('camera',18)} Retake photo</label>
 ${['top','bottom','outer'].includes(it.cat)?`<button class="btn lav full" id="tryI" style="margin-bottom:8px">${ic('wand',18)} Try it on (AI preview)</button>`:''}<div class="row"><button class="btn danger" id="del">${ic('trash',18)} Delete</button><button class="btn" id="save">Save</button></div>`,root=>{bindForm(root,copy);
 const ti=root.querySelector('#tryI');if(ti)ti.onclick=()=>{closeSheet();S.pick={[it.cat]:it.id};setTimeout(()=>{setTab('dress');DRESS.tryNow()},150)};
 root.querySelector('#rePh').onchange=async e=>{const f=e.target.files[0];if(!f)return;const n=await prepPhoto(f);copy.img=n.img;copy.cut=n.cut;copy.photo=n.photo;copy.edited=Date.now();root.querySelector('#pv').src=n.img;toast('New photo ready, tap Save')};
 root.querySelector('#save').onclick=async()=>{readForm(root,copy);Object.assign(it,copy);delete it.suggest;await DB.put('items',it);closeSheet();render();toast('Saved')};
 root.querySelector('#del').onclick=async()=>{await DB.del('items',it.id);S.items=S.items.filter(i=>i!==it);const was={...S.pick};Object.keys(S.pick).forEach(k=>S.pick[k]===it.id&&delete S.pick[k]);closeSheet();render();
  toast(`Deleted ${it.name}`,{label:'Undo',fn:async()=>{await DB.put('items',it);S.items.push(it);S.items.sort((a,b)=>b.added-a.added);S.pick=was;render()}})}})}

/* ---------- Dress Me: AI try-on is the main view ---------- */
const DRESS={
 order:['outer','top','bottom','shoes','hat','acc'],
 items:()=>Object.values(S.pick).map(item).filter(Boolean),
 consentOK:()=>localStorage.getItem('auto_try')!=null,
 // the one-time (per choice) consent before anything leaves the phone
 consent(cb){openSheet(`${head('Try it on with AI?')}<div class="pill">${ic('eye')}<span>This sends your <b>cut-out avatar photo</b> and the clothing photos to an online AI (free Hugging Face servers) to make the picture. OK?</span></div>
  <label class="chk"><input type="checkbox" id="autoT" checked> Do it automatically when I pick clothes (you can switch this off in Dress Me)</label>
  <p class="muted">${TRY.counterText()}</p><div class="row"><button class="btn ghost" data-close>Not now</button><button class="btn lav" id="okT">${ic('wand',18)} OK, try it on</button></div>`,r=>r.querySelector('#okT').onclick=()=>{localStorage.setItem('auto_try',r.querySelector('#autoT').checked?'1':'0');closeSheet();setTimeout(cb,200)})},
 tryNow(){const its=DRESS.items();if(!S.me.base)return DRESS.needAvatar();if(!TRY.aiAllowed())return PIN.ask('A parent needs to turn on AI try-on (it sends a photo online).',()=>{localStorage.setItem('ai_ok','1');DRESS.tryNow()});
  if(!TRY.steps(its).length)return toast('Pick a top or bottom to try on');
  if(!DRESS.consentOK())return DRESS.consent(()=>DRESS.tryNow());TRY.enqueue(its).then(()=>DRESS.fill())},
 needAvatar(){openSheet(`${head('Make your mini-me first')}<p>One full-body photo, done once. Then Dress Me shows your clothes on you, made by AI.</p><button class="btn full" id="mk">${ic('camera',18)} Make my mini-me</button>`,r=>r.querySelector('#mk').onclick=()=>{closeSheet();setTimeout(TRY.avatarSheet,200)})},
 board(its,msg){const by=k=>its.find(i=>i.cat===k);const cell=k=>by(k)?`<div class="t-${tint(by(k))}"><img src="${by(k).img}" alt="${esc(by(k).name)}"></div>`:'';const row=(ks,c)=>{const h=ks.map(cell).join('');return h?`<div class="b-row ${c}">${h}</div>`:''};
  return `<div class="board">${its.length?row(['top','outer'],'b1')+row(['bottom'],'b2')+row(['shoes','hat','acc'],'b3'):'<p class="muted" style="margin:auto;text-align:center">Pick pieces from the rails</p>'}</div>
  ${msg?`<p class="stage-msg">${esc(msg)}</p>`:''}${its.length?`<button class="btn lav sm stage-cta" id="tapTry">${ic('wand',18)} Tap to try on with AI</button>`:''}`},
 async fill(){const st=$('#stage');if(!st||S.tab!=='dress')return;const its=DRESS.items();const ui=$('#stageUI'),person=$('#person');const me=S.me;const seq=(DRESS._seq=(DRESS._seq||0)+1);
  const show=(src,cls='')=>{st.className='stage '+cls;person.style.display=src?'':'none';if(src&&person.getAttribute('src')!==src){person.classList.remove('drop');person.src=src;void person.offsetWidth;person.classList.add('drop')}};
  const extras=its.filter(i=>['shoes','hat','acc'].includes(i.cat)||(i.cat==='outer'&&its.some(x=>x.cat==='top')));
  const extraHTML=extras.length?`<div class="also">${extras.map(i=>`<div class="t-${tint(i)}" title="${esc(i.name)}"><img src="${i.img}" alt="${esc(i.name)}"></div>`).join('')}</div>`:'';
  if(!me.base){show('','board-mode');ui.innerHTML=DRESS.board(its,its.length?'':null);DRESS.bindUI();return}
  const r=await TRY.lookup(its);if(seq!==DRESS._seq)return;const base=me.cutout||me.avatar;
  if(r.state==='none'){show(base);ui.innerHTML=`<span class="stage-badge">${its.length?'Pick a top or bottom for AI':'Your mini-me'}</span>${extraHTML}`;return}
  if(r.state==='done'){const src=r.hit.cut||(DRESS._u&&DRESS._uk===r.key?DRESS._u:(DRESS._u&&URL.revokeObjectURL(DRESS._u),DRESS._uk=r.key,DRESS._u=URL.createObjectURL(r.hit.blob)));show(src,r.hit.cut?'':'blend');
   ui.innerHTML=`<span class="stage-badge ai">${ic('spark',14)} AI try-on</span>${extraHTML}`;return}
  const busy=r.state==='queued'||r.state==='running';
  if(busy){const L=TRY.Q.live;let t='Waiting for the AI…';if(L&&r.job&&L.job===r.job.id)t=L.phase==='queue'?`In the AI queue (#${L.pos})…`:L.phase==='waking'?'Waking the AI up (~30 s)…':`Dressing you: ${esc(L.name)} (${L.step}/${L.of})…`;
   show(r.partial?(r.partial.cut||URL.createObjectURL(r.partial.blob)):base,'dressing');const el=r.job&&r.job.started?Math.round((Date.now()-r.job.started)/1000):0;const pct=Math.min(95,Math.round(el/(30*r.steps.length)*100));
   ui.innerHTML=`<span class="stage-badge">${t}</span><div class="prog"><i style="width:${pct}%"></i></div><p class="stage-msg">Usually ~30 s per piece. Keep dressing, I'll ping you.</p>${extraHTML}`;clearTimeout(DRESS._tk);DRESS._tk=setTimeout(()=>DRESS.fill(),2000);return}
  // not tried yet / failed: never paste garments on her body, show an outfit board instead
  if(r.state==='new'&&TRY.aiAllowed()&&localStorage.getItem('auto_try')==='1'&&TRY.left()>0){clearTimeout(DRESS._q);DRESS._q=setTimeout(()=>TRY.enqueue(DRESS.items()),1100);show(base,'dressing');ui.innerHTML=`<span class="stage-badge">Getting the AI ready…</span>${extraHTML}`;return}
  const msg=r.state==='failed'||r.state==='partial'?(r.job.err||'The AI try-on didn\'t work.'):TRY.left()<=0&&TRY.aiAllowed()?'Free AI try-ons used up for today. Saved looks still show instantly.':null;
  show('','board-mode');ui.innerHTML=DRESS.board(its,msg);DRESS.bindUI()},
 bindUI(){const b=$('#tapTry');if(b)b.onclick=()=>DRESS.tryNow()},
 tilt(st){const tl=st.querySelector('.tilt');if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const set=(x,y)=>{tl.style.setProperty('--ry',(x*9).toFixed(2)+'deg');tl.style.setProperty('--rx',(-y*5).toFixed(2)+'deg');tl.style.setProperty('--sx',(-x*10).toFixed(1)+'px')};
  st.onpointermove=e=>{const r=st.getBoundingClientRect();set((e.clientX-r.left)/r.width*2-1,(e.clientY-r.top)/r.height*2-1)};st.onpointerleave=()=>set(0,0);
  st.addEventListener('pointerdown',()=>{if(DRESS._om)return;DRESS._om=1;const on=()=>window.addEventListener('deviceorientation',e=>{if(S.tab!=='dress'||e.gamma==null)return;set(Math.max(-1,Math.min(1,e.gamma/25)),Math.max(-1,Math.min(1,(e.beta-45)/30)))});
   if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')DeviceOrientationEvent.requestPermission().then(p=>p==='granted'&&on()).catch(()=>{});else on()},{once:true})},
 inbox(){const J=TRY.Q.jobs.slice().reverse().slice(0,8);if(!J.length)return '';const lab={queued:'waiting',running:'dressing…',done:'ready',failed:'failed',partial:'part done'};
  return `<details class="card inbox"><summary>${ic('spark',16)} Try-ons <span class="badge">${J.filter(j=>j.state==='queued'||j.state==='running').length} in progress</span></summary>${J.map(j=>`<div class="job"><span>${esc(j.label)}</span><span class="badge s-${j.state}">${lab[j.state]}</span>${j.state==='done'?`<button class="btn ghost sm" data-show="${j.id}">Show</button>`:j.state==='failed'||j.state==='partial'?`<button class="btn ghost sm" data-retry="${j.id}">Retry</button>`:''}</div>`).join('')}<p class="muted">${TRY.counterText()}</p></details>`}};
document.addEventListener('tryon',()=>{if(S.tab!=='dress')return;DRESS.fill();const ib=$('#inbox');if(ib){const open=ib.querySelector('details')&&ib.querySelector('details').open;ib.innerHTML=DRESS.inbox();const d=ib.querySelector('details');if(d&&open)d.open=true;bindInbox(ib)}});
document.addEventListener('tryon-status',()=>{if(S.tab==='dress')DRESS.fill()});
function bindInbox(r){r.querySelectorAll('[data-retry]').forEach(b=>b.onclick=()=>TRY.retry(b.dataset.retry));r.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>{const j=TRY.Q.jobs.find(x=>x.id===b.dataset.show);S.pick={};j.ids.forEach(id=>{const it=item(id);if(it)S.pick[it.cat]=it.id});render()})}
function rDress(a){const tops=byCat('top'),bots=byCat('bottom');const p=S.pick;TRY.prewarm();
 const addT=`<button class="tile add" data-add aria-label="Add item"><div class="ph">${ic('plus')}</div></button>`;
 a.innerHTML=`<div class="top"><h1>Dress Me</h1><button class="ib" id="clr" aria-label="Clear outfit">${ic('undo')}</button></div>
 <div class="dress"><div><div class="rail-h">Tops</div><div class="rail">${tops.map(i=>tile(i,p.top===i.id?'sel':'',`data-c="top"`)).join('')||addT}</div></div>
 <div class="stage" id="stage"><div class="studio"></div><div class="tilt"><div class="floor"></div><img class="person" id="person" alt="Me wearing the outfit" style="display:none"></div><div class="stage-ui" id="stageUI"></div></div>
 <div><div class="rail-h">Bottoms</div><div class="rail">${bots.map(i=>tile(i,p.bottom===i.id?'sel':'',`data-c="bottom"`)).join('')||addT}</div></div></div>
 <h3>Shoes, jackets, hats & bags</h3><div class="shoerow">${byCat('shoes').concat(byCat('outer'),byCat('hat'),byCat('acc')).map(i=>tile(i,p[i.cat]===i.id?'sel':'',`data-c="${i.cat}"`)).join('')||addT}</div>
 <p class="muted" style="text-align:center">${S.me.base?(TRY.aiAllowed()&&localStorage.getItem('auto_try')==='1'?`AI dresses you as you pick · <button class="link" id="autoOff">turn off</button>`:'The AI shows the clothes on you'):'<b>Make your mini-me in Me</b> to see clothes on you'} · <span class="badge">AI = lilac</span></p>
 <p class="consent">${ic('eye',16)} Try it on sends your cut-out avatar photo to an online AI to make the picture.</p>
 <button class="btn lav full" id="tryO" style="margin-bottom:10px">${ic('wand',18)} Try it on (AI preview)</button>
 <div class="row"><button class="btn" id="saveO">${ic('heart',18)} Save outfit</button><button class="btn ton" id="shuf">${ic('shuffle',18)} Shuffle</button></div><div id="inbox">${DRESS.inbox()}</div>`;
 $('#tryO').onclick=()=>DRESS.tryNow();bindInbox(a);
 const ao=$('#autoOff');if(ao)ao.onclick=()=>{localStorage.setItem('auto_try','0');render();toast('Auto try-on off')};
 a.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addItem());
 a.querySelectorAll('[data-c]').forEach(t=>t.onclick=()=>{const c=t.dataset.c;S.pick[c]=S.pick[c]===t.dataset.id?undefined:t.dataset.id;if(!S.pick[c])delete S.pick[c];vib(8);
  a.querySelectorAll(`[data-c="${c}"]`).forEach(x=>x.classList.toggle('sel',x.dataset.id===S.pick[c]));DRESS.fill()});
 $('#clr').onclick=()=>{S.pick={};render()};$('#shuf').onclick=()=>{S.prefs.skips=(S.prefs.skips||0)+1;S.pick=shuffle();render();$('#stage').classList.add('shuf')};$('#saveO').onclick=saveOutfit;
 DRESS.tilt($('#stage'));DRESS.fill()}
function scoreBoost(t,b){const k=t.id+'>'+b.id;let s=0;if((S.prefs.nope||[]).includes(k))s-=5;if((S.prefs.like||[]).some(x=>x.split('>').some(id=>id===t.id||id===b.id)))s+=.7;
 const fav=S.me.favColours||[];if(fav.includes(t.colour))s+=.5;if(fav.includes(b.colour))s+=.3;return s}
function shuffle(occ){const r=a=>a[Math.floor(Math.random()*a.length)];const f=c=>byCat(c).filter(i=>!occ||(i.occ||[]).includes(occ));
 for(let n=0;n<30;n++){const t=r(f('top').length?f('top'):byCat('top')),b=r(f('bottom').length?f('bottom'):byCat('bottom'));if(!t||!b)break;if((goesWith(t.colour,b.colour)+scoreBoost(t,b)*.2<.6||(S.prefs.nope||[]).includes(t.id+'>'+b.id))&&n<29)continue;
  const sh=byCat('shoes').sort((x,y)=>goesWith(y.colour,b.colour)-goesWith(x.colour,b.colour)+Math.random()*.6-.3)[0];const o={top:t.id,bottom:b.id};if(sh)o.shoes=sh.id;if(Math.random()<.4&&byCat('outer').length)o.outer=r(byCat('outer')).id;if(Math.random()<.3&&byCat('hat').length)o.hat=r(byCat('hat')).id;return o}return{}}
async function saveOutfit(){const p=Object.fromEntries(Object.entries(S.pick).filter(([k,v])=>v&&item(v)));if(!Object.keys(p).length)return toast('Pick some pieces first 👀');
 const tryKey=TRY.steps(Object.values(p).map(item)).length&&S.me.base?await TRY.keyFor(TRY.steps(Object.values(p).map(item))):null;const hasAI=tryKey&&await TRY.cGet(tryKey);
 openSheet(`${head('Save outfit')}<div class="idea">${Object.values(p).map(id=>tile(item(id))).join('')}</div>
 <label>Name</label><input id="oName" placeholder="e.g. Friday vibes" maxlength="40"><label>Date (today = wore it, later = planned)</label><input type="date" id="oDate" lang="en-ZA" value="${today()}">
 <label>Occasion</label><select id="oOcc">${OCC.map(o=>`<option>${o}</option>`).join('')}</select>
 <label>How much do you love it?</label><div class="chips" id="rate">${[1,2,3].map(n=>`<button class="chip ${n===3?'on':''}" data-r="${n}">${'💖'.repeat(n)}</button>`).join('')}</div>
 ${hasAI?'<label class="chk"><input type="checkbox" id="oPic" checked> Use the AI picture as this outfit\'s photo</label>':''}
 <button class="btn full" id="ok" style="margin-top:12px">Save to my calendar</button>`,root=>{let rate=3;root.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{rate=+b.dataset.r;root.querySelectorAll('[data-r]').forEach(x=>x.classList.toggle('on',x===b))});
 root.querySelector('#ok').onclick=async e=>{e.currentTarget.disabled=true;const date=root.querySelector('#oDate').value||today();const sig=JSON.stringify(Object.values(p).sort());
  if(S.outfits.some(o=>o.date===date&&JSON.stringify(Object.values(o.items).sort())===sig)){closeSheet();return toast('Already saved for that day 👍')}
  const o={id:uid(),name:root.querySelector('#oName').value.trim()||'Outfit '+(S.outfits.length+1),items:p,date,occ:root.querySelector('#oOcc').value,rate,created:Date.now(),tryKey:root.querySelector('#oPic')&&root.querySelector('#oPic').checked?tryKey:null};
  await DB.put('outfits',o);S.outfits.push(o);if(date===today())for(const id of Object.values(p)){const it=item(id);it.wears=(it.wears||0)+1;it.lastWorn=date;await DB.put('items',it)}
  if(rate>=3){S.prefs.like=[...(S.prefs.like||[]),(p.top||'')+'>'+(p.bottom||'')].slice(-40);DB.set('prefs',S.prefs)}
  closeSheet();vib([10,40,10]);toast(date>today()?'Planned 📅':'Outfit saved 💖');if(S.outfits.length===1)confetti()}})}
function confetti(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const d=document.createElement('div');d.className='confetti';d.innerHTML=Array.from({length:24},(_,i)=>`<i style="left:${Math.random()*100}%;background:${['#c42a6c','#6a4cc0','#f4d35e','#7fb88a'][i%4]};animation-delay:${Math.random()*.3}s"></i>`).join('');document.body.appendChild(d);setTimeout(()=>d.remove(),1800)}

/* ---------- Ideas: simple local rules + weather ---------- */
function ideas(){const out=[];const wk=S.weather||'warm';const W={warm:{},cool:{want:'outer'},rainy:{want:'outer'}}[wk];
 const tops=byCat('top'),bots=byCat('bottom');const shoes=byCat('shoes'),outer=byCat('outer');
 for(const t of tops)for(const b of bots){let s=goesWith(t.colour,b.colour)*3;const why=[];if(goesWith(t.colour,b.colour)>=.9)why.push(`${t.colour} + ${b.colour} go well together`);
  const occ=(t.occ||[]).includes(S.occ)&&(b.occ||[]).includes(S.occ);if(occ){s+=2;why.push(`both good for ${S.occ}`)}
  const stale=Math.min(daysAgo(t.lastWorn),daysAgo(b.lastWorn));if(stale>14){s+=1.5;why.push(t.lastWorn&&b.lastWorn?`not worn in ${stale}+ days`:'you haven\'t worn this yet')}
  if(wk==='warm'&&/short|skirt/i.test(b.name))s+=.5;if(wk!=='warm'&&/short/i.test(b.name))s-=1.5;
  const liked=S.outfits.filter(o=>o.rate>=3&&(o.items.top===t.id||o.items.bottom===b.id)).length;if(liked){s+=liked*.5;why.push('similar to outfits you loved')}
  const bo=scoreBoost(t,b);s+=bo;if(bo<-1)continue;
  const o={top:t.id,bottom:b.id};const sh=shoes.slice().sort((x,y)=>(goesWith(y.colour,b.colour)+((y.occ||[]).includes(S.occ)?.5:0))-(goesWith(x.colour,b.colour)+((x.occ||[]).includes(S.occ)?.5:0)))[0];if(sh)o.shoes=sh.id;
  if(W.want&&outer.length){o.outer=outer[0].id;why.push(`layer up, it's ${wk}`)}
  out.push({o,s,why})}
 return out.sort((a,b)=>b.s-a.s).slice(0,6)}
async function weatherCard(){const el=$('#wxCard');if(!el)return;const d=await WX.get();const w=WX.day(d,today());if(!$('#wxCard'))return;
 if(!w){el.innerHTML=`<p class="muted">${ic('cloud',18)} Weather unavailable offline, pick it below.</p>`;return}
 const auto=!S.weatherSet;if(auto&&S.weather!==w.kind){S.weather=w.kind;return rIdeas($('#app'))}
 const top=ideas()[0];const jacket=top&&top.o.outer&&item(top.o.outer);
 el.innerHTML=`<div class="wx"><div class="wx-ic">${ic(w.kind==='rainy'?'rain':w.kind==='cool'?'cloud':'sun',30)}</div><div><b>Today in ${esc(WX.city())}: ${w.max}° / ${w.min}°</b><br><span class="muted">${w.wetAt?`${w.rain}% rain around ${w.wetAt}`:w.rain>=30?`${w.rain}% chance of rain`:'Dry day'}${jacket?`: take the ${esc(jacket.name)}`:w.kind!=='warm'?': bring a layer':''}</span></div></div>
 ${top?`<div class="idea">${Object.values(top.o).map(id=>tile(item(id))).join('')}</div><button class="btn lav sm" id="wxTry">${ic('wand',16)} Wear this today</button>`:''}`;
 const b=el.querySelector('#wxTry');if(b)b.onclick=()=>{S.pick={...top.o};setTab('dress')}}
function rIdeas(a){const stale=S.items.filter(i=>daysAgo(i.lastWorn)>21).slice(0,6);if(!S.weather)S.weather='warm';const list=ideas();
 a.innerHTML=`<h1>Ideas</h1><div class="card" id="wxCard"><div class="spin sm"></div></div>
 <label>Weather today <select id="wxCity" class="inline">${Object.keys(CITIES).map(c=>`<option ${c===WX.city()?'selected':''}>${c}</option>`).join('')}</select></label><div class="chips">${[['warm','sun','Warm'],['cool','cloud','Cool'],['rainy','rain','Rainy']].map(([k,i,l])=>`<button class="chip ${S.weather===k?'on':''}" data-w="${k}">${ic(i,18)} ${l}</button>`).join('')}</div>
 <label>Where are you going?</label><div class="chips">${OCC.map(o=>`<button class="chip ${S.occ===o?'on':''}" data-o="${o}">${o[0].toUpperCase()+o.slice(1)}</button>`).join('')}</div>
 <h2>Outfits for you</h2>${list.map((x,i)=>`<div class="card"><div class="idea">${Object.values(x.o).map(id=>tile(item(id))).join('')}</div><p class="muted" style="margin:6px 2px 10px">${esc(x.why.join(' · ')||'a fresh combo')}</p><div class="row"><button class="btn lav sm" data-try="${i}">${ic('wand',16)} Try it on</button><button class="btn ghost sm" data-like="${i}">More like this</button><button class="btn ghost sm" data-nope="${i}">Not again</button></div></div>`).join('')||emptyState('No ideas yet','Add at least one top and one bottom to get ideas.','Add pieces','idAdd')}
 ${stale.length?`<h2>Miss me? 🥺</h2><p class="muted">Not worn in 3+ weeks:</p><div class="grid">${stale.map(i=>tile(i,'','',true)).join('')}</div>`:''}
 <h2>${ic('bag',20)} Packing list</h2><div class="card" id="pack">${PACK.form()}</div>
 <p class="muted">Ideas use simple rules on this phone (colour matching, occasion, weather, not-worn-lately, outfits you loved, your 'More like this' / 'Not again' taps).</p>`;
 a.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{S.weather=b.dataset.w;S.weatherSet=true;render()});a.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{S.occ=b.dataset.o;render()});
 $('#wxCity').onchange=e=>{localStorage.setItem('wx_city',e.target.value);S.weatherSet=false;render()};const ia=$('#idAdd');if(ia)ia.onclick=()=>addItem();bindDemo(a);
 a.querySelectorAll('[data-try]').forEach(b=>b.onclick=()=>{S.pick={...list[+b.dataset.try].o};setTab('dress')});
 a.querySelectorAll('[data-like]').forEach(b=>b.onclick=()=>{const o=list[+b.dataset.like].o;S.prefs.like=[...(S.prefs.like||[]),o.top+'>'+o.bottom].slice(-40);DB.set('prefs',S.prefs);toast('Got it, more like this 💖');render()});
 a.querySelectorAll('[data-nope]').forEach(b=>b.onclick=()=>{const o=list[+b.dataset.nope].o;S.prefs.nope=[...(S.prefs.nope||[]),o.top+'>'+o.bottom].slice(-80);DB.set('prefs',S.prefs);toast('Won\'t suggest that again');render()});
 PACK.bind(a);weatherCard()}
const PACK={form(){const p=S.packing;return `<label>Going to</label><select id="pkCity">${Object.keys(CITIES).map(c=>`<option ${c===(p&&p.city||WX.city())?'selected':''}>${c}</option>`).join('')}</select>
 <div class="row"><div><label>From</label><input type="date" id="pkFrom" lang="en-ZA" value="${p?p.from:addDays(today(),1)}"></div><div><label>To</label><input type="date" id="pkTo" lang="en-ZA" value="${p?p.to:addDays(today(),3)}"></div></div>
 <button class="btn ton full" id="pkGo" style="margin-top:12px">Make my packing list</button><div id="pkOut">${p?PACK.out(p):''}</div>`},
 out(p){return `<p class="muted">${esc(p.summary)}</p>${p.list.map((x,i)=>{const it=item(x.id);return it?`<label class="chk pk"><input type="checkbox" data-pk="${i}" ${x.done?'checked':''}><span class="pk-t t-${tint(it)}"><img src="${it.img}" alt=""></span>${esc(it.name)}</label>`:''}).join('')}`},
 async make(city,from,to){const n=Math.max(1,Math.round((new Date(to+'T12:00')-new Date(from+'T12:00'))/864e5)+1);const d=await WX.get(city);const days=[];for(let i=0;i<n;i++){const w=WX.day(d,addDays(from,i));if(w)days.push(w)}
  const cold=days.some(w=>w.kind!=='warm'),wet=days.some(w=>w.kind==='rainy');const pickN=(c,k,fn)=>byCat(c).slice().sort((a,b)=>(fn?fn(b)-fn(a):0)+(b.wears||0)-(a.wears||0)).slice(0,k);
  const tops=pickN('top',Math.min(5,Math.ceil(n/2)+1)),bots=pickN('bottom',Math.min(3,Math.ceil(n/3)+1),b=>tops.reduce((s,t)=>s+goesWith(t.colour,b.colour),0)-(cold&&/short/i.test(b.name)?3:0));
  const shoes=pickN('shoes',n>3?2:1),outer=cold||wet?pickN('outer',1):[],acc=pickN('acc',1);const list=[...tops,...bots,...shoes,...outer,...acc].map(i=>({id:i.id,done:false}));
  const wx=days.length?`${Math.min(...days.map(w=>w.min))}°–${Math.max(...days.map(w=>w.max))}°${wet?', some rain':''}`:'forecast not available that far ahead';
  return {city,from,to,list,summary:`${n} day${n>1?'s':''} in ${city} (${wx}): ${tops.length} tops + ${bots.length} bottoms = ${tops.length*bots.length} outfits.`}},
 bind(a){const g=a.querySelector('#pkGo');if(!g)return;g.onclick=async()=>{g.disabled=true;g.textContent='Checking the forecast…';S.packing=await PACK.make(a.querySelector('#pkCity').value,a.querySelector('#pkFrom').value,a.querySelector('#pkTo').value);await DB.set('packing',S.packing);a.querySelector('#pack').innerHTML=PACK.form();PACK.bind(a)};
  a.querySelectorAll('[data-pk]').forEach(c=>c.onchange=()=>{S.packing.list[+c.dataset.pk].done=c.checked;DB.set('packing',S.packing)})}};

/* ---------- Me ---------- */
function calendar(){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+S.calM);const y=d.getFullYear(),m=d.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,n=new Date(y,m+1,0).getDate();const has=new Set(S.outfits.map(o=>o.date)),td=today();
 let h=['M','T','W','T','F','S','S'].map(x=>`<div class="hd">${x}</div>`).join('')+'<div class="hd"></div>'.repeat(first);
 for(let i=1;i<=n;i++){const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;const c=[has.has(ds)?(ds>td?'plan':'has'):'',ds===td?'today':''].join(' ');h+=`<div class="${c}" ${has.has(ds)?`data-day="${ds}" role="button"`:''}>${i}</div>`}
 return `<div class="top" style="margin:0 0 6px"><button class="ib" id="calP" aria-label="Previous month">${ic('left')}</button><b>${d.toLocaleString('en-ZA',{month:'long',year:'numeric'})}</b><button class="ib" id="calN" aria-label="Next month">${ic('chev')}</button></div><div class="cal">${h}</div><p class="muted"><span class="dot has"></span> worn · <span class="dot plan"></span> planned</p>`}
function stats(){const its=S.items;if(!its.length)return '<p class="muted">Add clothes to see your stats.</p>';const by=its.slice().sort((a,b)=>(b.wears||0)-(a.wears||0));const never=its.filter(i=>!i.wears);
 const col={};its.forEach(i=>col[i.colour]=(col[i.colour]||0)+1);const cols=Object.entries(col).sort((a,b)=>b[1]-a[1]);const gaps=[];
 if(!byCat('shoes').some(i=>NEUTRAL.includes(i.colour)))gaps.push('no neutral shoes');if(!byCat('outer').length)gaps.push('no jacket');if(byCat('bottom').length<3)gaps.push('only '+byCat('bottom').length+' bottoms');
 const cpw=its.filter(i=>i.price&&i.wears).map(i=>({i,v:i.price/i.wears})).sort((a,b)=>a.v-b.v);
 return `<div class="stats"><div><b>${its.length}</b><span>pieces</span></div><div><b>${its.reduce((s,i)=>s+(i.wears||0),0)}</b><span>wears</span></div><div><b>${S.outfits.length}</b><span>outfits</span></div></div>
 <h3>Most worn</h3><div class="idea">${by.slice(0,3).map(i=>tile(i)).join('')}</div>
 ${never.length?`<h3>Not worn yet (${never.length})</h3><div class="idea">${never.slice(0,4).map(i=>tile(i)).join('')}</div>`:''}
 <h3>Colours</h3>${cols.map(([c,n])=>`<div class="bar"><span>${c}</span><i style="width:${Math.round(n/its.length*100)}%;background:${COLOURS[c]}"></i><b>${n}</b></div>`).join('')}
 ${cpw.length?`<h3>Best cost-per-wear</h3><p class="muted">${cpw.slice(0,3).map(x=>`${esc(x.i.name)} R${x.v.toFixed(0)}`).join(' · ')}</p>`:''}
 ${gaps.length?`<h3>Closet gaps</h3><p class="muted">${gaps.join(' · ')}</p>`:''}`}
async function privacyLine(){const n=await TRY.cCount();const el=$('#privLine');if(el)el.innerHTML=`Stored on this phone: ${S.items.filter(i=>!i.demo).length} clothing photos, ${S.me.base?'1 avatar (made '+fmtDate(new Date(S.me.avatarAt))+')':'no avatar'}, ${n} saved AI pictures (auto-deleted after 30 days).`}
function rMe(a){const me=S.me;const hist=S.outfits.slice().sort((x,y)=>y.date.localeCompare(x.date));
 a.innerHTML=`<h1>Me</h1>${TRY.meCard()}
 <div class="card"><h2 style="margin-top:0">My details</h2><p class="muted">Stays on this phone.</p>
 <label>Name / nickname</label><input id="mName" value="${esc(me.name||'')}" maxlength="30">
 <label>Height (cm)</label><input id="mH" type="number" inputmode="numeric" min="100" max="220" value="${esc(me.height||'')}">
 <label>Fit I like (optional)</label><select id="mFit">${['','Relaxed','Regular','Fitted','Oversized'].map(s=>`<option ${me.fit===s?'selected':''}>${s}</option>`).join('')}</select>
 <label>Favourite style</label><select id="mStyle">${['','Soft girl','Sporty','Y2K','Clean girl','Streetwear','Boho','Preppy','Mix of everything'].map(s=>`<option ${me.style===s?'selected':''}>${s}</option>`).join('')}</select>
 <button class="btn full" id="mSave" style="margin-top:12px">Save details</button><button class="btn ghost full" id="quiz" style="margin-top:8px">${ic('spark',18)} Retake the style quiz</button></div>
 <div class="card"><h2 style="margin-top:0">${ic('chart',20)} My wear stats</h2>${stats()}</div>
 <div class="card"><h2 style="margin-top:0">Outfit calendar</h2>${calendar()}<button class="btn ghost sm" id="ics" style="margin-top:8px">${ic('cal',18)} Add planned outfits to my calendar (.ics)</button><h2>History</h2>${hist.map(o=>{const miss=Object.values(o.items).some(id=>!item(id));return `<div class="idea hist"><div class="h-t"><b>${esc(o.name)}</b><br>${fmtDs(o.date)} · ${o.occ} · ${'💖'.repeat(o.rate||1)}${miss?'<br><span class="badge">has a missing piece</span>':''}</div>${o.tryKey?`<div class="tile"><div class="ph t-lilac"><img data-ai="${o.tryKey}" alt="AI picture"></div></div>`:''}${Object.values(o.items).slice(0,o.tryKey?2:3).map(id=>item(id)?tile(item(id)):'').join('')}<button class="ib" data-wear="${o.id}" aria-label="Wear again">${ic('undo')}</button></div>`}).join('')||'<p class="muted">No saved outfits yet. Dress up in Dress Me and tap Save.</p>'}</div>
 <div class="card sunk"><h2 style="margin-top:0">Feedback for Dad ${ic('chat',20)}</h2><p class="muted">${S.feedback.length} note(s) saved.</p><div class="row"><button class="btn sm" id="fbNew">Write a note</button><button class="btn ghost sm" id="fbExp">${ic('share',16)} Share / copy notes</button></div></div>
 ${TRY.settingsCard()}<div class="card"><h2 style="margin-top:0">${ic('lock',20)} Privacy & data</h2><p class="muted">Everything (photos, clothes, outfits, your avatar) is stored only on this phone. No accounts, no ads, nothing public.</p><p class="muted" id="privLine"></p><p class="muted"><b>AI try-on:</b> only when it's on, your cut-out avatar (never the original photo) and the clothing photo go to a free Hugging Face Space just to make the picture. The result is saved on this phone.</p>
 <h3>Backup (a file you keep)</h3><div class="row"><button class="btn ghost sm" id="bkOut">${ic('down',16)} Save backup</button><label class="btn ghost sm"><input type="file" id="bkIn" accept=".closet" hidden>${ic('up',16)} Restore</label></div>
 <div class="row" style="margin-top:8px"><button class="btn ghost sm" id="clrDemo">Clear demo items</button><button class="btn ghost sm" id="addDemo">Bring demo items back</button></div><button class="btn danger full" id="wipe" style="margin-top:10px">${ic('trash',18)} Delete all my data</button></div>`;
 TRY.bindMe(a);privacyLine();
 a.querySelectorAll('[data-ai]').forEach(async im=>{const h=await TRY.cGet(im.dataset.ai);if(h)im.src=h.cut||URL.createObjectURL(h.blob);else im.closest('.tile').remove()});
 $('#mSave').onclick=async()=>{Object.assign(S.me,{name:$('#mName').value.trim(),height:$('#mH').value,fit:$('#mFit').value,style:$('#mStyle').value});await DB.set('me',S.me);toast('Saved 💖')};
 $('#quiz').onclick=()=>styleQuiz(()=>render());$('#ics').onclick=exportICS;
 $('#calP').onclick=()=>{S.calM--;render()};$('#calN').onclick=()=>{S.calM++;render()};
 a.querySelectorAll('[data-wear]').forEach(b=>b.onclick=()=>{const o=S.outfits.find(x=>x.id===b.dataset.wear);S.pick=Object.fromEntries(Object.entries(o.items).filter(([k,v])=>item(v)));setTab('dress')});
 a.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{const os=S.outfits.filter(o=>o.date===b.dataset.day);openSheet(`${head(fmtDs(b.dataset.day))}${os.map(o=>`<div class="card"><b>${esc(o.name)}</b> · ${o.occ}<div class="idea">${Object.values(o.items).map(id=>tile(item(id))).join('')}</div></div>`).join('')}`)});
 $('#fbNew').onclick=feedbackSheet;$('#fbExp').onclick=exportFeedback;
 $('#bkOut').onclick=()=>passSheet('Save backup','Pick a passphrase. You\'ll need it to restore. The file is encrypted.',async p=>{await BK.exportFile(p);toast('Backup saved to Downloads')});
 $('#bkIn').onchange=e=>{const f=e.target.files[0];if(f)passSheet('Restore backup','Enter the passphrase for this backup.',async p=>{try{await BK.importFile(f,p);await load();render();toast('Backup restored 💖')}catch(err){toast('Wrong passphrase or not a backup file')}})};
 $('#clrDemo').onclick=async()=>{for(const i of S.items.filter(i=>i.demo))await DB.del('items',i.id);S.items=S.items.filter(i=>!i.demo);S.pick={};toast('Demo items cleared');render()};
 $('#addDemo').onclick=async()=>{await seedDemo();await load();toast('Demo items are back');render()};
 $('#wipe').onclick=async()=>{if(!(await confirmSheet('Delete everything?','All photos, clothes, outfits, your avatar and notes on this phone. This can\'t be undone.','Delete everything')))return;for(const s of ['items','outfits','feedback','kv'])await DB.clear(s);await TRY.cClear();localStorage.clear();sessionStorage.clear();location.reload()};}
function passSheet(t,txt,cb){openSheet(`${head(t)}<p>${txt}</p><label>Passphrase</label><input id="pp" type="password" autocomplete="off"><button class="btn full" id="ppGo" style="margin-top:12px">Continue</button>`,r=>r.querySelector('#ppGo').onclick=()=>{const p=r.querySelector('#pp').value;if(p.length<4)return toast('At least 4 characters');closeSheet();setTimeout(()=>cb(p),200)})}

/* ---------- feedback ---------- */
function feedbackSheet(){openSheet(`${head('Tell Dad what to change')}<p class="muted">What did you love? What's annoying? What's missing? Saved on this phone until you share it.</p>
 <label>Which part?</label><select id="fArea">${['General','Closet','Dress Me','Ideas','Me / avatar','Looks & colours'].map(s=>`<option ${({closet:'Closet',dress:'Dress Me',ideas:'Ideas',me:'Me / avatar'}[S.tab]===s)?'selected':''}>${s}</option>`).join('')}</select>
 <label>Your note</label><textarea id="fText" placeholder="e.g. I want to drag clothes onto me…"></textarea>
 <div class="row" style="margin-top:12px"><button class="btn ghost" id="fShare">Share all</button><button class="btn" id="fSave">Save note</button></div>
 ${S.feedback.length?`<h2>Saved notes</h2>${S.feedback.slice().reverse().map(f=>`<div class="note"><b>${esc(f.area)}</b> · <span class="muted">${new Date(f.t).toLocaleString('en-ZA')}</span><br>${esc(f.text)}</div>`).join('')}`:''}`,root=>{
 root.querySelector('#fSave').onclick=async()=>{const text=root.querySelector('#fText').value.trim();if(!text)return toast('Write something first ✍️');const f={id:uid(),t:Date.now(),area:root.querySelector('#fArea').value,text,screen:S.tab};await DB.put('feedback',f);S.feedback.push(f);closeSheet();toast('Note saved, thank you! 💖');if(S.tab==='me')render()};
 root.querySelector('#fShare').onclick=exportFeedback})}
async function exportFeedback(){if(!S.feedback.length)return toast('No notes yet');const txt='To Dad: My Closet app feedback\n\n'+S.feedback.map((f,i)=>`${i+1}. [${f.area}] ${new Date(f.t).toLocaleString('en-ZA')}\n${f.text}`).join('\n\n');
 try{if(navigator.share){await navigator.share({title:'My Closet feedback for Dad',text:txt});return}}catch(e){if(e.name==='AbortError')return}
 try{await navigator.clipboard.writeText(txt);toast('Copied! Paste it in WhatsApp to Dad')}catch(e){openSheet(`${head('Copy your notes')}<textarea style="min-height:300px">${esc(txt)}</textarea>`)}}
$('#fb').onclick=feedbackSheet;

/* ---------- onboarding (welcome → privacy → parent PIN → style quiz) ---------- */
const VIBES=[['Soft girl','#fbe9ef','pink'],['Y2K','#efeafb','lavender'],['Clean girl','#f1ece8','beige'],['Sporty','#e6f3ec','white'],['Streetwear','#e7effa','black']];
function styleQuiz(done){let vibe=S.me.style||'',fav=[...(S.me.favColours||[])];
 openSheet(`${head('Your style')}<p>Pick your vibe:</p><div class="vibes">${VIBES.map(([v,bg])=>`<button class="vibe ${vibe===v?'on':''}" data-v="${v}" style="background:${bg}">${v}</button>`).join('')}</div>
 <p style="margin-top:14px">Favourite colours (pick up to 3):</p><div class="row sws">${Object.entries(COLOURS).map(([k,h])=>`<button class="sw ${fav.includes(k)?'on':''}" data-fc="${k}" aria-label="${k}" title="${k}" style="background:${h}"></button>`).join('')}</div>
 <button class="btn full" id="qDone" style="margin-top:16px">Done 💖</button>`,r=>{r.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{vibe=b.dataset.v;r.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x===b))});
 r.querySelectorAll('[data-fc]').forEach(b=>b.onclick=()=>{const k=b.dataset.fc;fav=fav.includes(k)?fav.filter(x=>x!==k):[...fav,k].slice(-3);r.querySelectorAll('[data-fc]').forEach(x=>x.classList.toggle('on',fav.includes(x.dataset.fc)))});
 r.querySelector('#qDone').onclick=async()=>{S.me.style=vibe;S.me.favColours=fav;await DB.set('me',S.me);closeSheet();setTimeout(done,200)}})}
function onboarding(step=1){const a=$('#app');$('#nav').classList.add('hidden');$('#fb').classList.add('hidden');const dots=`<div class="dots">${[1,2].map(i=>`<i class="${i===step?'on':''}"></i>`).join('')}</div>`;
 if(step===1){a.innerHTML=`<div class="hero"><img src="icon.svg" alt="" class="logo"><h1>My Closet</h1><p class="muted">Snap your clothes, dress your mini-me, save outfits, get ideas.</p>${dots}<button class="btn full" id="nx">Next</button></div>`;$('#nx').onclick=()=>onboarding(2);return}
 a.innerHTML=`<div class="hero"><h1>Your privacy</h1><div class="card" style="text-align:left">
 <div class="pill"><span class="ic">${ic('phone')}</span><span>Everything stays on <b>this phone</b>, no account, no one else can see it. Only if AI try-on is on is your cut-out avatar sent to Hugging Face to make the AI picture.</span></div>
 <div class="pill"><span class="ic">${ic('trash')}</span><span>You can delete everything any time in <b>Me → Privacy</b>.</span></div>
 <div class="pill"><span class="ic">${ic('family')}</span><span>This is a test version made by your dad. Under 18? A parent says OK first (that's the law, POPIA), and sets a parent PIN for the AI.</span></div></div>
 <label class="chk"><input type="checkbox" id="ok"> I've read this and a parent said it's OK</label>${dots}
 <button class="btn full soft" id="go" style="margin-top:8px">Let's go 💖</button></div>`;
 $('#ok').onchange=e=>$('#go').classList.toggle('soft',!e.target.checked);
 $('#go').onclick=async()=>{if(!$('#ok').checked)return toast('Tick the box first 🙂');await DB.set('onboarded',today());start();
  setTimeout(()=>{if(!localStorage.getItem('pin'))PIN.setup(()=>styleQuiz(()=>{}));else styleQuiz(()=>{})},300)}}
function start(){$('#nav').classList.remove('hidden');setTab('closet')}

(async()=>{await DB.open();if(!(await DB.get('seeded')))await seedDemo();await load();S.packing=await DB.get('packing');
 try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
 if(await DB.get('onboarded'))start();else onboarding();TRY.pump();
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{})})();
