'use strict';
/* ---------- storage (IndexedDB, all on-device) ---------- */
const DB={db:null,
 open(){return new Promise((res,rej)=>{const r=indexedDB.open('closet',1);r.onupgradeneeded=()=>{const d=r.result;['items','outfits','feedback','kv'].forEach(s=>d.createObjectStore(s,{keyPath:'id'}))};r.onsuccess=()=>{this.db=r.result;res()};r.onerror=()=>rej(r.error)})},
 tx(s,m){return this.db.transaction(s,m).objectStore(s)},
 all(s){return new Promise(r=>{const q=this.tx(s,'readonly').getAll();q.onsuccess=()=>r(q.result)})},
 put(s,v){return new Promise(r=>{const q=this.tx(s,'readwrite').put(v);q.onsuccess=()=>r()})},
 del(s,id){return new Promise(r=>{const q=this.tx(s,'readwrite').delete(id);q.onsuccess=()=>r()})},
 clear(s){return new Promise(r=>{const q=this.tx(s,'readwrite').clear();q.onsuccess=()=>r()})},
 async get(id){const a=await this.all('kv');const x=a.find(k=>k.id===id);return x?x.v:undefined},
 set(id,v){return this.put('kv',{id,v})}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const daysAgo=d=>d?Math.floor((Date.now()-new Date(d).getTime())/864e5):Infinity;
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2200)}

const CATS=[['top','Tops','👚'],['bottom','Bottoms','👖'],['outer','Jackets','🧥'],['shoes','Shoes','👟'],['hat','Hats','🧢'],['acc','Accessories','👜']];
const OCC=['school','casual','party','sport','church','date'];
const COLOURS={pink:'#f7a8c8',lavender:'#b9a2e8',white:'#f7f7f7',black:'#2a2a2a',grey:'#a9a9b3',blue:'#6f9ad6',denim:'#5b7fae',navy:'#2c3e6b',beige:'#e3cfb0',brown:'#8a5a3c',red:'#d9434f',orange:'#f39a4b',yellow:'#f4d35e',green:'#7fb88a',purple:'#8a5bc4'};
const NEUTRAL=['white','black','grey','beige','denim','navy','brown'];
const PAIRS={pink:['lavender','white','grey','denim','beige'],lavender:['pink','white','denim','grey','beige'],red:['denim','black','white','navy'],blue:['white','beige','pink','yellow'],green:['beige','white','denim','brown'],yellow:['denim','white','lavender','navy'],orange:['denim','white','navy'],purple:['grey','white','black','pink'],navy:['pink','white','beige','yellow']};
function goesWith(a,b){if(a===b)return NEUTRAL.includes(a)?1:0.6;if(NEUTRAL.includes(a)&&NEUTRAL.includes(b))return 0.8;if(NEUTRAL.includes(a)||NEUTRAL.includes(b))return 0.9;return (PAIRS[a]||[]).includes(b)||(PAIRS[b]||[]).includes(a)?1:0.2}
function nearestColour(r,g,b){let best='pink',bd=1e9;for(const[k,h]of Object.entries(COLOURS)){const n=parseInt(h.slice(1),16),d=(r-(n>>16))**2+(g-(n>>8&255))**2+(b-(n&255))**2;if(d<bd){bd=d;best=k}}return best}

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
 bucket:c=>svg(`<path d="M60 40h80l10 50H50z" fill="${c}" stroke="#0002" stroke-width="3"/><path d="M20 90h160l-20 20H40z" fill="${c}" stroke="#0002" stroke-width="3"/>`,200,120),
 bag:c=>svg(`<path d="M70 70q0-40 30-40t30 40" fill="none" stroke="${c}" stroke-width="8"/><rect x="45" y="65" width="110" height="100" rx="18" fill="${c}" stroke="#0002" stroke-width="3"/>`),
};
const DEMO=[['Lilac knit','sweater','top','lavender',['school','casual']],['Pink tee','tee','top','pink',['casual','sport']],['White cami','cami','top','white',['party','date','casual']],['Blue jeans','jeans','bottom','denim',['school','casual']],['Pleated skirt','skirt','bottom','lavender',['party','church','date']],['Beige shorts','shorts','bottom','beige',['casual','sport']],['Denim jacket','jacket','outer','denim',['casual','school']],['White sneakers','sneakers','shoes','white',['school','casual','sport']],['Pink sneakers','sneakers','shoes','pink',['casual','party']],['Beige flats','flats','shoes','beige',['church','date','party']],['Pink cap','cap','hat','pink',['sport','casual']],['Lilac bag','bag','acc','lavender',['party','date','casual']]];
const AVATAR_PH=svg(`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3c7b4"/><stop offset="1" stop-color="#e9b39e"/></linearGradient></defs><circle cx="100" cy="45" r="27" fill="url(#g)"/><path d="M72 40q0-38 28-38t28 38q-8-20-28-20t-28 20z" fill="#5b3a2e"/><path d="M90 70h20v12H90z" fill="url(#g)"/><path d="M62 85q38-14 76 0l10 95-14 2-6-70-2 80 6 170h-20l-10-150-2 0-10 150H70l6-170-2-80-6 70-14-2z" fill="url(#g)"/>`,200,420);

/* ---------- state ---------- */
const S={tab:'closet',items:[],outfits:[],feedback:[],me:{},filter:'all',pick:{},weather:'warm',occ:'school'};
async function load(){[S.items,S.outfits,S.feedback]=await Promise.all(['items','outfits','feedback'].map(s=>DB.all(s)));S.items.sort((a,b)=>b.added-a.added);S.me=(await DB.get('me'))||{}}
async function seedDemo(){const t=Date.now();for(let i=0;i<DEMO.length;i++){const[n,shape,cat,col,occ]=DEMO[i];const it={id:'demo_'+i,name:n,cat,colour:col,occ,img:D[shape](COLOURS[col]),demo:true,added:t-i,lastWorn:i%3===0?null:new Date(t-(i*4)*864e5).toISOString().slice(0,10),wears:i%4};await DB.put('items',it)}await DB.set('seeded',true)}

/* ---------- image helpers ---------- */
function fileToImg(f){return new Promise((res,rej)=>{const u=URL.createObjectURL(f),i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=u})}
function scaled(img,max=700){const k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c}
// Simple, free, offline clothing cut-out: flood-fill from the edges over pixels similar to the background colour.
function removeBg(c,tol=42){const x=c.getContext('2d'),W=c.width,H=c.height,d=x.getImageData(0,0,W,H),p=d.data;
 const sample=[];for(let i=0;i<W;i+=Math.max(1,W/20|0)){sample.push(i*4,((H-1)*W+i)*4)}for(let j=0;j<H;j+=Math.max(1,H/20|0)){sample.push(j*W*4,(j*W+W-1)*4)}
 let r=0,g=0,b=0;sample.forEach(o=>{r+=p[o];g+=p[o+1];b+=p[o+2]});r/=sample.length;g/=sample.length;b/=sample.length;
 const seen=new Uint8Array(W*H),st=[];for(let i=0;i<W;i++){st.push(i,(H-1)*W+i)}for(let j=0;j<H;j++){st.push(j*W,j*W+W-1)}
 let removed=0;const t2=tol*tol*3;
 while(st.length){const k=st.pop();if(seen[k])continue;seen[k]=1;const o=k*4,dd=(p[o]-r)**2+(p[o+1]-g)**2+(p[o+2]-b)**2;if(dd>t2)continue;p[o+3]=0;removed++;const xx=k%W;if(xx>0)st.push(k-1);if(xx<W-1)st.push(k+1);if(k>=W)st.push(k-W);if(k<W*(H-1))st.push(k+W)}
 if(removed<W*H*0.05||removed>W*H*0.97)return false;x.putImageData(d,0,0);return true}
function dominant(c){const x=c.getContext('2d'),p=x.getImageData(0,0,c.width,c.height).data,cnt={};for(let i=0;i<p.length;i+=16){if(p[i+3]<128)continue;const n=nearestColour(p[i],p[i+1],p[i+2]);cnt[n]=(cnt[n]||0)+1}return Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]?.[0]||'pink'}
function trim(c){const x=c.getContext('2d'),W=c.width,H=c.height,p=x.getImageData(0,0,W,H).data;let a=W,b=H,e=0,f=0;for(let j=0;j<H;j++)for(let i=0;i<W;i++)if(p[(j*W+i)*4+3]>20){if(i<a)a=i;if(i>e)e=i;if(j<b)b=j;if(j>f)f=j}if(e<=a||f<=b)return c;const o=document.createElement('canvas');o.width=e-a+1;o.height=f-b+1;o.getContext('2d').drawImage(c,-a,-b);return o}

/* ---------- sheets + back button ---------- */
let sheetOpen=false;
function openSheet(html,onMount){$('#sheetBody').innerHTML=html;$('#sheet').classList.remove('hidden');if(!sheetOpen){history.pushState({sheet:1},'');sheetOpen=true}$('#sheetBody').scrollTop=0;$('#sheetBody').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeSheet);onMount&&onMount($('#sheetBody'))}
function closeSheet(){if(sheetOpen)history.back();else hideSheet()}
function hideSheet(){sheetOpen=false;$('#sheet').classList.add('hidden');$('#sheetBody').innerHTML=''}
window.addEventListener('popstate',()=>{if(sheetOpen){hideSheet()}});
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet()});
const head=t=>`<div class="top"><button class="icon-btn" data-close aria-label="Back">←</button><h2>${t}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div>`;

/* ---------- render ---------- */
function setTab(t){S.tab=t;document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));render();scrollTo(0,0)}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function render(){const a=$('#app');({closet:rCloset,dress:rDress,ideas:rIdeas,me:rMe}[S.tab])(a)}
const tile=(it,cls='',extra='')=>`<div class="tile ${cls}" data-id="${it.id}" ${extra}><img src="${it.img}" alt="${esc(it.name)}" loading="lazy"></div>`;
const byCat=c=>S.items.filter(i=>i.cat===c);
const item=id=>S.items.find(i=>i.id===id);

function rCloset(a){const list=S.filter==='all'?S.items:byCat(S.filter);
 a.innerHTML=`<div class="top"><h1>My Closet</h1><button class="icon-btn" id="addTop" aria-label="Add item">＋</button></div>
 <div class="chips">${[['all','All','']].concat(CATS).map(([k,l,e])=>`<button class="chip ${S.filter===k?'on':''}" data-f="${k}">${e} ${l}</button>`).join('')}</div>
 <div class="grid"><button class="tile add" id="addTile" aria-label="Add item">＋</button>${list.map(i=>tile(i,'',`role="button"`).replace('</div>',`<span class="tag">${esc(i.name)}</span></div>`)).join('')}</div>
 ${list.length?'':'<p class="muted">Nothing here yet. Tap ＋ to snap your first piece.</p>'}
 <p class="muted" style="margin-top:14px">${S.items.length} items · ${S.items.filter(i=>i.demo).length} demo items</p>`;
 a.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{S.filter=b.dataset.f;render()});
 $('#addTop').onclick=$('#addTile').onclick=()=>addItem();
 a.querySelectorAll('.grid .tile[data-id]').forEach(t=>t.onclick=()=>itemSheet(item(t.dataset.id)));}

function itemForm(it){return `<div class="preview">${it.img?`<img id="pv" src="${it.img}">`:'<span class="muted">No photo yet</span>'}</div>
 <label>Name</label><input id="fName" value="${esc(it.name||'')}" placeholder="e.g. Pink hoodie" maxlength="40">
 <label>Category</label><div class="chips">${CATS.map(([k,l,e])=>`<button class="chip ${it.cat===k?'on':''}" data-cat="${k}">${e} ${l}</button>`).join('')}</div>
 <label>Colour ${it.autoColour?'<span class="badge">auto-suggested: '+it.autoColour+'</span>':''}</label>
 <div class="row" style="gap:8px">${Object.entries(COLOURS).map(([k,h])=>`<button class="sw ${it.colour===k?'on':''}" data-col="${k}" title="${k}" aria-label="${k}" style="background:${h}"></button>`).join('')}</div>
 <label>Good for</label><div class="chips" style="flex-wrap:wrap">${OCC.map(o=>`<button class="chip ${(it.occ||[]).includes(o)?'on':''}" data-occ="${o}">${o}</button>`).join('')}</div>`}
function bindForm(root,it){root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{it.cat=b.dataset.cat;root.querySelectorAll('[data-cat]').forEach(x=>x.classList.toggle('on',x===b))});
 root.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>{it.colour=b.dataset.col;root.querySelectorAll('[data-col]').forEach(x=>x.classList.toggle('on',x===b))});
 root.querySelectorAll('[data-occ]').forEach(b=>b.onclick=()=>{it.occ=it.occ||[];const o=b.dataset.occ;it.occ=it.occ.includes(o)?it.occ.filter(x=>x!==o):[...it.occ,o];b.classList.toggle('on')});}

function addItem(){openSheet(`${head('Add a piece')}<p class="muted">Lay it flat on a plain floor, bed or wall for the best cut-out. Photos stay on this phone.</p>
 <div class="row"><label class="btn" style="text-align:center;margin:0">📷 Camera<input type="file" accept="image/*" capture="environment" id="cam" hidden></label>
 <label class="btn alt" style="text-align:center;margin:0">🖼️ Gallery<input type="file" accept="image/*" id="gal" hidden></label></div><div id="after"></div>`,root=>{
 const go=async f=>{if(!f)return;root.querySelector('#after').innerHTML='<p class="muted">✂️ Cutting out background…</p>';
  try{const img=await fileToImg(f);let c=scaled(img);const orig=c.toDataURL('image/jpeg',.85);const ok=removeBg(c);if(ok)c=trim(c);const col=dominant(c);
  const it={id:uid(),name:'',cat:'top',colour:col,autoColour:col,occ:['casual'],img:ok?c.toDataURL('image/png'):orig,orig,cut:ok,added:Date.now(),lastWorn:null,wears:0};
  root.querySelector('#after').innerHTML=`<h2>Details</h2>${itemForm(it)}<p class="muted">${ok?'Background removed ✨':'Couldn\'t find a plain background, kept the full photo.'}</p>
  <div class="row">${ok?'<button class="btn alt sm" id="useOrig">Use original photo</button>':''}<button class="btn" id="save">Save to closet</button></div>`;
  bindForm(root,it);const uo=root.querySelector('#useOrig');if(uo)uo.onclick=()=>{it.img=orig;root.querySelector('#pv').src=orig;uo.remove()};
  root.querySelector('#save').onclick=async()=>{it.name=root.querySelector('#fName').value.trim()||(it.colour+' '+CATS.find(c=>c[0]===it.cat)[1].toLowerCase().replace(/s$/,''));delete it.orig;await DB.put('items',it);S.items.unshift(it);closeSheet();S.filter='all';render();toast('Added to your closet 💖')}}
  catch(e){root.querySelector('#after').innerHTML='<p class="muted">Sorry, couldn\'t read that photo.</p>'}};
 root.querySelector('#cam').onchange=e=>go(e.target.files[0]);root.querySelector('#gal').onchange=e=>go(e.target.files[0]);})}

function itemSheet(it){const copy={...it,occ:[...(it.occ||[])]};openSheet(`${head(esc(it.name))}${itemForm(copy)}
 <p class="muted">Worn ${it.wears||0}× · last worn: ${it.lastWorn||'never'}</p>
 <div class="row"><button class="btn danger" id="del">Delete</button><button class="btn" id="save">Save</button></div>`,root=>{bindForm(root,copy);
 root.querySelector('#save').onclick=async()=>{copy.name=root.querySelector('#fName').value.trim()||copy.name;Object.assign(it,copy);await DB.put('items',it);closeSheet();render();toast('Saved')};
 root.querySelector('#del').onclick=async()=>{if(!confirm('Delete this item?'))return;await DB.del('items',it.id);S.items=S.items.filter(i=>i!==it);Object.keys(S.pick).forEach(k=>S.pick[k]===it.id&&delete S.pick[k]);closeSheet();render()}})}

function avatarSrc(){return S.me.avatar||AVATAR_PH}
function rDress(a){const tops=byCat('top'),bots=byCat('bottom'),shoes=byCat('shoes');const p=S.pick;
 const L=['outer','top','bottom','shoes','hat','acc'];// draw order
 const order=['bottom','top','outer','shoes','hat','acc'];
 a.innerHTML=`<div class="top"><h1>Dress Me ✨</h1><button class="icon-btn" id="clr" aria-label="Clear outfit">↺</button></div>
 <div class="dress"><div><div class="rail-h">👚 Tops</div><div class="rail">${tops.map(i=>tile(i,p.top===i.id?'sel':'',`data-c="top"`)).join('')||'<span class="muted">none</span>'}</div></div>
 <div class="stage"><img class="av" src="${avatarSrc()}" alt="avatar">${order.filter(k=>p[k]&&item(p[k])).map(k=>`<img class="lay l-${k}" src="${item(p[k]).img}" alt="">`).join('')}</div>
 <div><div class="rail-h">👖 Bottoms</div><div class="rail">${bots.map(i=>tile(i,p.bottom===i.id?'sel':'',`data-c="bottom"`)).join('')||'<span class="muted">none</span>'}</div></div></div>
 <div class="shoerow">${shoes.concat(byCat('outer'),byCat('hat'),byCat('acc')).map(i=>tile(i,p[i.cat]===i.id?'sel':'',`data-c="${i.cat}"`)).join('')}</div>
 <p class="muted" style="text-align:center">Shoes, jackets, hats & bags above · ${S.me.avatar?'':'<b>add your photo in Me</b> · '}<span class="badge">realistic AI try-on coming in v1</span></p>
 <div class="row"><button class="btn" id="saveO">♥ Save outfit</button><button class="btn alt" id="shuf">✦ Shuffle</button></div>`;
 a.querySelectorAll('[data-c]').forEach(t=>t.onclick=()=>{const c=t.dataset.c;S.pick[c]=S.pick[c]===t.dataset.id?undefined:t.dataset.id;render()});
 $('#clr').onclick=()=>{S.pick={};render()};$('#shuf').onclick=()=>{S.pick=shuffle();render()};$('#saveO').onclick=saveOutfit;}
function shuffle(occ){const r=a=>a[Math.floor(Math.random()*a.length)];const f=c=>byCat(c).filter(i=>!occ||(i.occ||[]).includes(occ));
 for(let n=0;n<30;n++){const t=r(f('top').length?f('top'):byCat('top')),b=r(f('bottom').length?f('bottom'):byCat('bottom'));if(!t||!b)break;if(goesWith(t.colour,b.colour)<.6&&n<29)continue;
  const sh=byCat('shoes').sort((x,y)=>goesWith(y.colour,b.colour)-goesWith(x.colour,b.colour)+Math.random()*.6-.3)[0];const o={top:t.id,bottom:b.id};if(sh)o.shoes=sh.id;if(Math.random()<.4&&byCat('outer').length)o.outer=r(byCat('outer')).id;if(Math.random()<.3&&byCat('hat').length)o.hat=r(byCat('hat')).id;return o}return{}}
function saveOutfit(){const p=Object.fromEntries(Object.entries(S.pick).filter(([k,v])=>v&&item(v)));if(!Object.keys(p).length)return toast('Pick some pieces first 👀');
 openSheet(`${head('Save outfit')}<div class="idea">${Object.values(p).map(id=>tile(item(id))).join('')}</div>
 <label>Name</label><input id="oName" placeholder="e.g. Friday vibes" maxlength="40"><label>Wearing it on</label><input type="date" id="oDate" value="${today()}">
 <label>Occasion</label><select id="oOcc">${OCC.map(o=>`<option>${o}</option>`).join('')}</select>
 <label>How much do you love it?</label><div class="chips" id="rate">${[1,2,3].map(n=>`<button class="chip ${n===3?'on':''}" data-r="${n}">${'💖'.repeat(n)}</button>`).join('')}</div>
 <button class="btn full" id="ok" style="margin-top:12px">Save to my calendar</button>`,root=>{let rate=3;root.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{rate=+b.dataset.r;root.querySelectorAll('[data-r]').forEach(x=>x.classList.toggle('on',x===b))});
 root.querySelector('#ok').onclick=async()=>{const date=root.querySelector('#oDate').value||today();const o={id:uid(),name:root.querySelector('#oName').value.trim()||'Outfit '+(S.outfits.length+1),items:p,date,occ:root.querySelector('#oOcc').value,rate,created:Date.now()};
  await DB.put('outfits',o);S.outfits.push(o);if(date<=today())for(const id of Object.values(p)){const it=item(id);it.wears=(it.wears||0)+1;if(!it.lastWorn||date>it.lastWorn)it.lastWorn=date;await DB.put('items',it)}closeSheet();toast('Outfit saved 💖')}})}

/* ---------- Ideas: simple rules ---------- */
function ideas(){const out=[];const W={warm:{no:['outer'],pref:['shorts','skirt']},cool:{want:'outer'},rainy:{want:'outer'}}[S.weather];
 const tops=byCat('top'),bots=byCat('bottom');const shoes=byCat('shoes'),outer=byCat('outer');
 for(const t of tops)for(const b of bots){let s=goesWith(t.colour,b.colour)*3;const why=[];if(goesWith(t.colour,b.colour)>=.9)why.push(`${t.colour} + ${b.colour} go well together`);
  const occ=(t.occ||[]).includes(S.occ)&&(b.occ||[]).includes(S.occ);if(occ){s+=2;why.push(`both good for ${S.occ}`)}
  const stale=Math.min(daysAgo(t.lastWorn),daysAgo(b.lastWorn));if(stale>14){s+=1.5;why.push(t.lastWorn&&b.lastWorn?`not worn in ${stale}+ days`:'you haven\'t worn this yet')}
  if(S.weather==='warm'&&b.cat==='bottom'&&/short|skirt/i.test(b.name))s+=.5;
  const liked=S.outfits.filter(o=>o.rate>=3&&(o.items.top===t.id||o.items.bottom===b.id)).length;if(liked){s+=liked*.5;why.push('similar to outfits you loved')}
  const o={top:t.id,bottom:b.id};const sh=shoes.slice().sort((x,y)=>(goesWith(y.colour,b.colour)+((y.occ||[]).includes(S.occ)?.5:0))-(goesWith(x.colour,b.colour)+((x.occ||[]).includes(S.occ)?.5:0)))[0];if(sh)o.shoes=sh.id;
  if(W.want&&outer.length){o.outer=outer[0].id;why.push(`layer up, it's ${S.weather}`)}
  out.push({o,s,why})}
 return out.sort((a,b)=>b.s-a.s).slice(0,6)}
function rIdeas(a){const stale=S.items.filter(i=>daysAgo(i.lastWorn)>21).slice(0,6);const list=ideas();
 a.innerHTML=`<h1>Ideas 💡</h1>
 <label>Weather today <span class="badge">auto-weather in v1</span></label><div class="chips">${[['warm','☀️ Warm'],['cool','🍂 Cool'],['rainy','🌧️ Rainy']].map(([k,l])=>`<button class="chip ${S.weather===k?'on':''}" data-w="${k}">${l}</button>`).join('')}</div>
 <label>Where are you going?</label><div class="chips">${OCC.map(o=>`<button class="chip ${S.occ===o?'on':''}" data-o="${o}">${o}</button>`).join('')}</div>
 <h2>Outfits for you</h2>${list.map((x,i)=>`<div class="card" style="padding:10px"><div class="idea">${Object.values(x.o).map(id=>tile(item(id))).join('')}</div><p class="muted" style="margin:4px 4px 8px">${esc(x.why.join(' · ')||'a fresh combo')}</p><button class="btn sm" data-try="${i}">Try it on</button></div>`).join('')||'<p class="muted">Add at least one top and one bottom to get ideas.</p>'}
 ${stale.length?`<h2>Miss me? 🥺</h2><p class="muted">Not worn in 3+ weeks:</p><div class="grid">${stale.map(i=>tile(i)).join('')}</div>`:''}
 <p class="muted">Ideas use simple rules (colour matching, occasion, not-worn-lately, outfits you loved). A smarter stylist that learns from you comes later.</p>`;
 a.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{S.weather=b.dataset.w;render()});a.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{S.occ=b.dataset.o;render()});
 a.querySelectorAll('[data-try]').forEach(b=>b.onclick=()=>{S.pick={...list[+b.dataset.try].o};setTab('dress')});}

/* ---------- Me ---------- */
function calendar(){const d=new Date(),y=d.getFullYear(),m=d.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,n=new Date(y,m+1,0).getDate();const has=new Set(S.outfits.map(o=>o.date));
 let h=['M','T','W','T','F','S','S'].map(x=>`<div class="hd">${x}</div>`).join('')+'<div class="hd"></div>'.repeat(first);
 for(let i=1;i<=n;i++){const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;h+=`<div class="${has.has(ds)?'has':''}" ${has.has(ds)?`data-day="${ds}" role="button"`:''}>${i}</div>`}
 return `<div style="font-weight:700;margin-bottom:6px">${d.toLocaleString('en-ZA',{month:'long',year:'numeric'})}</div><div class="cal">${h}</div>`}
function rMe(a){const me=S.me;const hist=S.outfits.slice().sort((x,y)=>y.date.localeCompare(x.date));
 a.innerHTML=`<h1>Me 🩷</h1><div class="card" style="text-align:center">
 <div class="avatar-frame ${me.cut?'cut':''}"><img src="${avatarSrc()}" alt="my avatar"></div>
 <p><span class="badge">✨ realistic AI avatar coming in v1</span></p><p class="muted">For now your avatar is your own photo${me.cut?' with the background removed':' in a cut-out frame'}. Stand straight, full body, plain wall behind you.</p>
 <div class="row"><label class="btn" style="margin:0">📷 Selfie / full body<input type="file" accept="image/*" capture="user" id="avCam" hidden></label><label class="btn alt" style="margin:0">🖼️ Gallery<input type="file" accept="image/*" id="avGal" hidden></label></div>
 ${me.avatar?'<div class="row" style="margin-top:8px"><button class="btn alt sm" id="avBg">✂️ Remove background (beta)</button><button class="btn danger sm" id="avDel">Remove photo</button></div>':''}<p class="muted" id="avMsg"></p></div>
 <div class="card"><h2 style="margin-top:0">My details</h2><p class="muted">Used later so the AI avatar gets your proportions right. Stays on this phone.</p>
 <label>Name / nickname</label><input id="mName" value="${esc(me.name||'')}" maxlength="30">
 <label>Height (cm)</label><input id="mH" type="number" inputmode="numeric" min="100" max="220" value="${esc(me.height||'')}">
 <label>Body shape</label><select id="mShape">${['','Petite','Slim / straight','Pear','Hourglass','Apple','Athletic','Curvy','Tall'].map(s=>`<option ${me.shape===s?'selected':''}>${s}</option>`).join('')}</select>
 <label>Favourite style</label><select id="mStyle">${['','Soft girl','Sporty','Y2K','Clean girl','Streetwear','Boho','Preppy','Mix of everything'].map(s=>`<option ${me.style===s?'selected':''}>${s}</option>`).join('')}</select>
 <button class="btn full" id="mSave" style="margin-top:12px">Save details</button></div>
 <div class="card"><h2 style="margin-top:0">Outfit calendar</h2>${calendar()}<h2>History</h2>${hist.map(o=>`<div class="idea" style="align-items:center"><div style="flex:2;min-width:0;font-size:13px"><b>${esc(o.name)}</b><br>${o.date} · ${o.occ} · ${'💖'.repeat(o.rate||1)}</div>${Object.values(o.items).slice(0,3).map(id=>item(id)?tile(item(id)):'').join('')}<button class="icon-btn" data-wear="${o.id}" aria-label="Wear again" style="width:34px;height:34px">↻</button></div>`).join('')||'<p class="muted">No saved outfits yet. Dress up in Dress Me and tap Save.</p>'}</div>
 <div class="card"><h2 style="margin-top:0">Feedback for Dad 💬</h2><p class="muted">${S.feedback.length} note(s) saved.</p><div class="row"><button class="btn sm" id="fbNew">Write a note</button><button class="btn alt sm" id="fbExp">Share / copy notes</button></div></div>
 <div class="card"><h2 style="margin-top:0">Privacy & data</h2><p class="muted">Everything (photos, clothes, outfits) is stored only on this phone. Nothing is uploaded. No accounts, no ads, nothing public.</p>
 <div class="row"><button class="btn alt sm" id="clrDemo">Clear demo items</button><button class="btn alt sm" id="addDemo">Bring demo items back</button></div><div class="row" style="margin-top:8px"><button class="btn danger sm" id="wipe">Delete all my data</button></div></div>`;
 const pick=async f=>{if(!f)return;const img=await fileToImg(f);const c=scaled(img,900);S.me.avatar=c.toDataURL('image/jpeg',.88);S.me.cut=false;await DB.set('me',S.me);render();tryAiCut(true)};
 $('#avCam').onchange=e=>pick(e.target.files[0]);$('#avGal').onchange=e=>pick(e.target.files[0]);
 if($('#avBg'))$('#avBg').onclick=()=>tryAiCut(false);if($('#avDel'))$('#avDel').onclick=async()=>{delete S.me.avatar;S.me.cut=false;await DB.set('me',S.me);render()};
 $('#mSave').onclick=async()=>{Object.assign(S.me,{name:$('#mName').value.trim(),height:$('#mH').value,shape:$('#mShape').value,style:$('#mStyle').value});await DB.set('me',S.me);toast('Saved 💖')};
 a.querySelectorAll('[data-wear]').forEach(b=>b.onclick=()=>{const o=S.outfits.find(x=>x.id===b.dataset.wear);S.pick={...o.items};setTab('dress')});
 a.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{const os=S.outfits.filter(o=>o.date===b.dataset.day);openSheet(`${head(b.dataset.day)}${os.map(o=>`<div class="card"><b>${esc(o.name)}</b> · ${o.occ}<div class="idea">${Object.values(o.items).map(id=>item(id)?tile(item(id)):'').join('')}</div></div>`).join('')}`)});
 $('#fbNew').onclick=feedbackSheet;$('#fbExp').onclick=exportFeedback;
 $('#clrDemo').onclick=async()=>{for(const i of S.items.filter(i=>i.demo))await DB.del('items',i.id);S.items=S.items.filter(i=>!i.demo);S.pick={};toast('Demo items cleared');render()};
 $('#addDemo').onclick=async()=>{await seedDemo();await load();toast('Demo items are back');render()};
 $('#wipe').onclick=async()=>{if(!confirm('Delete ALL photos, clothes, outfits and notes from this phone? This cannot be undone.'))return;for(const s of ['items','outfits','feedback','kv'])await DB.clear(s);localStorage.clear();location.reload()};}
// Optional in-browser person cut-out (open-source model, runs on the phone; the model files download once, the photo never leaves the phone).
async function tryAiCut(auto){const msg=$('#avMsg');if(msg)msg.textContent='✂️ Removing background on your phone… (first time can take a minute)';
 try{const mod=await Promise.race([import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm'),new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),20000))]);
  const blob=await (await fetch(S.me.avatar)).blob();const out=await mod.removeBackground(blob,{output:{format:'image/png'}});
  const url=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(out)});const img=new Image();img.src=url;await img.decode();const c=trim(scaled(img,900));
  S.me.avatar=c.toDataURL('image/png');S.me.cut=true;await DB.set('me',S.me);if(S.tab==='me')render();toast('Background removed ✨')}
 catch(e){console.warn('bg removal unavailable',e&&e.message);if(msg)msg.textContent=auto?'Using a cut-out frame for now (background removal didn\'t work on this phone).':'Background removal isn\'t available right now, the cut-out frame is used instead.'}}

/* ---------- feedback ---------- */
function feedbackSheet(){openSheet(`${head('Tell Dad what to change')}<p class="muted">What did you love? What's annoying? What's missing? Saved on this phone until you share it.</p>
 <label>Which part?</label><select id="fArea">${['General','Closet','Dress Me','Ideas','Me / avatar','Looks & colours'].map(s=>`<option>${s}</option>`).join('')}</select>
 <label>Your note</label><textarea id="fText" placeholder="e.g. I want to drag clothes onto me…"></textarea>
 <div class="row" style="margin-top:12px"><button class="btn alt" id="fShare">Share all</button><button class="btn" id="fSave">Save note</button></div>
 ${S.feedback.length?`<h2>Saved notes</h2>${S.feedback.slice().reverse().map(f=>`<div class="pill"><b>${esc(f.area)}</b> · <span class="muted">${new Date(f.t).toLocaleString('en-ZA')}</span><br>${esc(f.text)}</div>`).join('')}`:''}`,root=>{
 root.querySelector('#fSave').onclick=async()=>{const text=root.querySelector('#fText').value.trim();if(!text)return toast('Write something first ✍️');const f={id:uid(),t:Date.now(),area:root.querySelector('#fArea').value,text,screen:S.tab};await DB.put('feedback',f);S.feedback.push(f);closeSheet();toast('Note saved, thank you! 💖');if(S.tab==='me')render()};
 root.querySelector('#fShare').onclick=exportFeedback})}
async function exportFeedback(){if(!S.feedback.length)return toast('No notes yet');const txt='My Closet app feedback\n\n'+S.feedback.map((f,i)=>`${i+1}. [${f.area}] ${new Date(f.t).toLocaleString('en-ZA')}\n${f.text}`).join('\n\n');
 try{if(navigator.share){await navigator.share({title:'My Closet feedback',text:txt});return}}catch(e){if(e.name==='AbortError')return}
 try{await navigator.clipboard.writeText(txt);toast('Copied! Paste it in WhatsApp to Dad')}catch(e){openSheet(`${head('Copy your notes')}<textarea style="min-height:300px">${esc(txt)}</textarea>`)}}
$('#fb').onclick=feedbackSheet;

/* ---------- onboarding ---------- */
function onboarding(){const a=$('#app');$('#nav').classList.add('hidden');$('#fb').classList.add('hidden');
 a.innerHTML=`<div class="hero"><div class="big">👗✨</div><h1>My Closet</h1><p class="muted">Snap your clothes, dress your mini-me, save outfits, get ideas.</p>
 <div class="card" style="text-align:left"><h2 style="margin-top:0">🔒 Your privacy</h2><div class="pill">📱 Everything stays on <b>this phone</b>. Nothing is uploaded, no account, no one else can see it.</div><div class="pill">🗑️ You can delete everything any time in <b>Me → Privacy</b>.</div><div class="pill">👨‍👧 This is a test version made by your dad. Under 18? A parent says OK first (that's the law, POPIA).</div></div>
 <label style="display:flex;gap:10px;align-items:center;text-align:left"><input type="checkbox" id="ok" style="width:22px;height:22px;flex:none"> I've read this and a parent said it's OK</label>
 <button class="btn full" id="go" style="margin-top:12px">Let's go 💖</button></div>`;
 $('#go').onclick=async()=>{if(!$('#ok').checked)return toast('Tick the box first 🙂');await DB.set('onboarded',today());start()}}
function start(){$('#nav').classList.remove('hidden');$('#fb').classList.remove('hidden');setTab('closet')}

(async()=>{await DB.open();if(!(await DB.get('seeded')))await seedDemo();await load();if(await DB.get('onboarded'))start();else onboarding();
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{})})();
