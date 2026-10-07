'use strict';
/* Outline icons (Lucide-style, 1.8px, from the design spec) */
const ICONS={'plus':'<path d="M12 5v14M5 12h14"/>','hanger':'<path d="M12 7a2 2 0 1 1 2-2c0 1-2 1.6-2 3v1l8.5 6.2c.9.7.4 1.8-.7 1.8H4.2c-1.1 0-1.6-1.1-.7-1.8L12 9"/>','dress':'<path d="M9 3h6l-1 5 4 13H6l4-13z"/><path d="M9 3 7 6m8-3 2 3"/>','spark':'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>','user':'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>','chat':'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>','undo':'<path d="M4 9h11a5 5 0 0 1 0 10H8"/><path d="M8 5 4 9l4 4"/>','heart':'<path d="M12 20s-7-4.4-9-9a4.9 4.9 0 0 1 9-3.5A4.9 4.9 0 0 1 21 11c-2 4.6-9 9-9 9z"/>','shuffle':'<path d="M3 7h3c5 0 7 10 12 10h3M3 17h3c2 0 3.2-1.6 4.4-3.4M14 9.4C15.4 8 16.6 7 18 7h3"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>','wand':'<path d="m4 20 11-11M15 4v3M19.5 8.5h-3M18 5l-1.5 1.5"/><path d="m13 7 4 4"/>','lock':'<rect x="5" y="11" width="14" height="10" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>','phone':'<rect x="7" y="2.5" width="10" height="19" rx="3"/><path d="M11 18h2"/>','trash':'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>','family':'<circle cx="8" cy="7" r="3"/><circle cx="17" cy="10" r="2.3"/><path d="M3 20c.6-4 2.6-6 5-6s4.4 2 5 6M13.5 20c.4-2.8 1.7-4.3 3.5-4.3S20.1 17.2 20.5 20"/>','camera':'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>','image':'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>','sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>','cloud':'<path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 0 9z"/>','rain':'<path d="M7 14a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 5a4.5 4.5 0 0 1 0 9z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>','check':'<path d="m5 12 5 5 9-10"/>','chev':'<path d="m9 6 6 6-6 6"/>','x':'<path d="M6 6l12 12M18 6 6 18"/>','cal':'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>','share':'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6h14v-6"/>','bolt':'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>','eye':'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>','pen':'<path d="M4 20h4L19 9l-4-4L4 16z"/>'};
Object.assign(ICONS,{grid:'<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',bag:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',down:'<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',up:'<path d="M12 20V8M7 13l5-5 5 5M5 4h14"/>',timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',left:'<path d="m15 6-6 6 6 6"/>',pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',stand:'<circle cx="12" cy="4.5" r="2"/><path d="M12 7v8M8 10l4-2 4 2M10 21l2-6 2 6"/>'});
const ic=(n,s=22)=>`<svg class="i" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">${ICONS[n]||''}</svg>`;
const vib=n=>{try{navigator.vibrate&&navigator.vibrate(n)}catch(e){}};
const AVATAR_EMPTY=`<svg viewBox="0 0 200 420" class="sil" aria-hidden="true"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d2c8"/><stop offset="1" stop-color="#ebe6de"/></linearGradient></defs><circle cx="100" cy="45" r="28" fill="url(#sg)"/><path d="M62 92q38-20 76 0l14 96-14 4-8-58-4 100 10 172h-26l-10-140-10 140H64l10-172-4-100-8 58-14-4z" fill="url(#sg)"/></svg>`;

/* ================= Parent PIN (local, hashed) ================= */
const PIN={
 h:async p=>{const s=localStorage.getItem('pin_salt')||(()=>{const v=Math.random().toString(36).slice(2);localStorage.setItem('pin_salt',v);return v})();const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s+'|'+p));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')},
 unlocked:()=>!localStorage.getItem('pin')||(+sessionStorage.getItem('pin_ok')||0)>Date.now()-10*60e3,
 lock:()=>sessionStorage.removeItem('pin_ok'),
 ok:()=>sessionStorage.setItem('pin_ok',Date.now()),
 field:id=>`<input id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="4–6 digits" class="pin">`,
 setup(cb,change){const go=()=>openSheet(`${head(change?'New parent PIN':'Parent PIN')}<p>A parent sets a PIN. It's needed to make an avatar, turn on AI try-on (which sends a photo online) and change those settings.</p>
  <label>PIN</label>${PIN.field('p1')}<label>Same PIN again</label>${PIN.field('p2')}
  <label class="chk"><input type="checkbox" id="pAi" ${localStorage.getItem('ai_ok')!=='0'?'checked':''}> Allow AI try-on (sends the cut-out avatar + clothing photo to free Hugging Face servers to make pictures)</label>
  <button class="btn full" id="pSave" style="margin-top:12px">Save PIN</button>`,r=>{r.querySelector('#pSave').onclick=async()=>{const a=r.querySelector('#p1').value,b=r.querySelector('#p2').value;
   if(!/^\d{4,6}$/.test(a))return toast('Use 4 to 6 digits');if(a!==b)return toast('The two PINs don\'t match');localStorage.setItem('pin',await PIN.h(a));localStorage.setItem('ai_ok',r.querySelector('#pAi').checked?'1':'0');PIN.ok();closeSheet();toast('Parent PIN saved');cb&&setTimeout(cb,250)}});
  if(change)PIN.ask('Enter the current PIN',go);else go()},
 ask(reason,cb){if(!localStorage.getItem('pin'))return PIN.setup(cb);if(PIN.unlocked())return cb();
  openSheet(`${head('Parent check')}<p>${esc(reason)}</p><label>Parent PIN</label>${PIN.field('pa')}<button class="btn full" id="paGo" style="margin-top:12px">Unlock</button><p class="muted">Forgot it? "Delete all my data" in Me resets the app.</p>`,r=>{const f=r.querySelector('#pa');setTimeout(()=>f.focus(),200);
   const go=async()=>{if(await PIN.h(f.value)===localStorage.getItem('pin')){PIN.ok();closeSheet();setTimeout(cb,250)}else{f.value='';toast('Wrong PIN');vib([30,40,30])}};r.querySelector('#paGo').onclick=go;f.onkeydown=e=>{if(e.key==='Enter')go()}})}};

/* ================= Styled confirm sheet ================= */
function confirmSheet(title,text,ok='Delete',danger=true){return new Promise(res=>{let done=false;openSheet(`${head(title)}<p>${text}</p><div class="row" style="margin-top:16px"><button class="btn ghost" id="cNo">Cancel</button><button class="btn ${danger?'red':''}" id="cYes">${ok}</button></div>`,r=>{
 r.querySelector('#cNo').onclick=()=>{done=true;closeSheet();res(false)};r.querySelector('#cYes').onclick=()=>{done=true;closeSheet();res(true)}});const iv=setInterval(()=>{if(!sheetOpen){clearInterval(iv);if(!done)res(false)}},300)})}

/* ================= Live camera: pose guide + self-timer ================= */
const CAM={
 open(cb){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('Live camera not available here, use Photo instead');return}
  const d=document.createElement('div');d.className='cam';d.innerHTML=`<video playsinline muted autoplay></video>
  <svg class="guide" viewBox="0 0 200 420" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="7 6"><circle cx="100" cy="45" r="28"/><path d="M62 92q38-20 76 0l14 96-14 4-8-58-4 100 10 172h-26l-10-140-10 140H64l10-172-4-100-8 58-14-4z"/></svg>
  <div class="cam-top"><button class="ib" id="cX" aria-label="Close">${ic('x')}</button><span>Head to shoes inside the outline</span></div>
  <div class="cam-checks" id="cChk"><span>Good light</span><span>Arms a little out</span><span>Plain wall</span></div><div class="cam-count" id="cCnt"></div>
  <div class="cam-bar"><div class="chips" id="cT">${[0,3,5,10].map(s=>`<button class="chip ${s===5?'on':''}" data-s="${s}">${s?s+' s':'No timer'}</button>`).join('')}</div><button class="shutter" id="cGo" aria-label="Take photo"></button><button class="ib" id="cFlip" aria-label="Switch camera">↺</button></div>`;
  document.body.appendChild(d);const v=d.querySelector('video');let stream,facing='user',timer=5,live=true,poseT;
  const start=async()=>{stream&&stream.getTracks().forEach(t=>t.stop());try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280},height:{ideal:1920}},audio:false});v.srcObject=stream}catch(e){toast('Camera blocked. Allow it in settings or use Photo.');close()}};
  const close=()=>{live=false;clearTimeout(poseT);stream&&stream.getTracks().forEach(t=>t.stop());d.remove()};
  const frame=()=>{const c=TRY.canvas(v.videoWidth,v.videoHeight);const x=c.getContext('2d');if(facing==='user'){x.translate(c.width,0);x.scale(-1,1)}x.drawImage(v,0,0);return c};
  const loop=async()=>{if(!live)return;try{if(v.videoWidth){const {pose}=await TRY.loadMP();const r=pose.detect(frame());const L=r.landmarks&&r.landmarks[0];const ch=TRY.checkPose(L);
   d.querySelector('#cChk').innerHTML=ch.map(c=>`<span class="${c.ok?'ok':''}">${c.ok?'✓ ':''}${esc(c.text.replace(/ 👍/,''))}</span>`).join('');d.classList.toggle('good',ch.every(c=>c.ok))}}catch(e){}poseT=setTimeout(loop,900)};
  const beep=(f=880)=>{try{const a=CAM.ac||(CAM.ac=new (window.AudioContext||window.webkitAudioContext)());const o=a.createOscillator(),g=a.createGain();o.frequency.value=f;g.gain.value=.08;o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.12)}catch(e){}};
  d.querySelector('#cX').onclick=close;d.querySelector('#cFlip').onclick=()=>{facing=facing==='user'?'environment':'user';start()};
  d.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{timer=+b.dataset.s;d.querySelectorAll('[data-s]').forEach(x=>x.classList.toggle('on',x===b))});
  d.querySelector('#cGo').onclick=async()=>{const cnt=d.querySelector('#cCnt');for(let s=timer;s>0;s--){cnt.textContent=s;beep(660);await new Promise(r=>setTimeout(r,1000))}cnt.textContent='';beep(1200);const c=frame();close();cb(c)};
  start();setTimeout(loop,800)}};

/* ================= Weather (Open-Meteo, free, no key, city level, no GPS) ================= */
const CITIES={Johannesburg:[-26.2,28.04],Pretoria:[-25.75,28.19],'Cape Town':[-33.92,18.42],Durban:[-29.86,31.02],Gqeberha:[-33.96,25.6],Bloemfontein:[-29.12,26.21],'East London':[-33.02,27.91],Polokwane:[-23.9,29.45],Mbombela:[-25.47,30.97],Kimberley:[-28.74,24.77]};
const WX={city:()=>localStorage.getItem('wx_city')||'Johannesburg',
 async get(city=WX.city()){const k='wx_'+city,c=JSON.parse(localStorage.getItem(k)||'null');if(c&&Date.now()-c.t<3600e3)return c.d;const [la,lo]=CITIES[city];
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=Africa%2FJohannesburg&forecast_days=16`;
  try{const r=await fetch(u);if(!r.ok)throw 0;const d=await r.json();localStorage.setItem(k,JSON.stringify({t:Date.now(),d}));return d}catch(e){return c?c.d:null}},
 day(d,ds){if(!d)return null;const i=d.daily.time.indexOf(ds);if(i<0)return null;const hrs=d.hourly.time.map((t,j)=>({t,p:d.hourly.precipitation_probability[j],T:d.hourly.temperature_2m[j]})).filter(h=>h.t.startsWith(ds)&&+h.t.slice(11,13)>=7&&+h.t.slice(11,13)<=20);
  const wet=hrs.filter(h=>h.p>=50)[0];const max=Math.round(d.daily.temperature_2m_max[i]),min=Math.round(d.daily.temperature_2m_min[i]),rain=d.daily.precipitation_probability_max[i]||0;
  return {max,min,rain,wetAt:wet?wet.t.slice(11,16):null,kind:rain>=50?'rainy':max<20?'cool':'warm'}}};

/* ================= On-device auto-tagging ================= */
const TAG={labels:{'t-shirt':'top','blouse':'top','sweater':'top','hoodie':'top','tank top':'top','shirt':'top','dress':'top','jeans':'bottom','trousers':'bottom','skirt':'bottom','shorts':'bottom','leggings':'bottom','jacket':'outer','coat':'outer','sneakers':'shoes','shoes':'shoes','sandals':'shoes','boots':'shoes','cap':'hat','hat':'hat','beanie':'hat','handbag':'acc','backpack':'acc','scarf':'acc','sunglasses':'acc'},
 pats:['plain','striped','floral','checked','printed','spotted'],
 // quick guess from the cut-out's shape (always on, instant)
 guess(c){const w=c.width,h=c.height,r=h/w;let cat='top';if(r<.72)cat=r<.5?'shoes':'hat';else if(r>1.35)cat='bottom';return {cat,why:'shape'}},
 enabled:()=>localStorage.getItem('smart_tag')==='1',
 async load(){if(TAG.p)return TAG.p;TAG.p=(async()=>{const t=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');t.env.allowLocalModels=false;return t.pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{dtype:'q8'})})();try{return await TAG.p}catch(e){TAG.p=null;throw e}},
 async clip(c){const clf=await TAG.load();const w=document.createElement('canvas');w.width=c.width+40;w.height=c.height+40;const wx=w.getContext('2d');wx.fillStyle='#fff';wx.fillRect(0,0,w.width,w.height);wx.drawImage(c,20,20);const url=w.toDataURL('image/jpeg',.9);const L=Object.keys(TAG.labels);const r=await clf(url,L.map(l=>'a photo of a '+l));const top=r[0].label.replace('a photo of a ','');
  const p=await clf(url,TAG.pats.map(l=>'a '+l+' piece of clothing'));if(r[0].score<.3){const g=TAG.guess(c);return {...g,pattern:p[0].label.split(' ')[1]}}return {cat:TAG.labels[top],kind:top,pattern:p[0].label.split(' ')[1],score:r[0].score,why:'ai'}}};

/* ================= Encrypted backup (file she keeps, no cloud) ================= */
const BK={
 key:async(pass,salt)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])},
 async exportFile(pass){const data=JSON.stringify({v:2,at:Date.now(),items:S.items,outfits:S.outfits,feedback:S.feedback,me:S.me});const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},await BK.key(pass,salt),new TextEncoder().encode(data));const blob=new Blob([new TextEncoder().encode('CLOSET1'),salt,iv,new Uint8Array(ct)]);
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`my-closet-${today()}.closet`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)},
 async importFile(f,pass){const b=new Uint8Array(await f.arrayBuffer());if(new TextDecoder().decode(b.slice(0,7))!=='CLOSET1')throw new Error('not a backup');const salt=b.slice(7,23),iv=b.slice(23,35);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv},await BK.key(pass,salt),b.slice(35));const d=JSON.parse(new TextDecoder().decode(pt));
  for(const it of d.items||[])await DB.put('items',it);for(const o of d.outfits||[])await DB.put('outfits',o);for(const x of d.feedback||[])await DB.put('feedback',x);if(d.me)await DB.set('me',d.me);return d}};

/* ================= .ics export for planned outfits ================= */
function exportICS(){const plan=S.outfits.filter(o=>o.date>=today());if(!plan.length)return toast('No planned outfits yet');
 const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//My Closet//EN'];plan.forEach(o=>{const d=o.date.replace(/-/g,'');L.push('BEGIN:VEVENT','UID:'+o.id+'@mycloset','DTSTAMP:'+d+'T060000Z','DTSTART;VALUE=DATE:'+d,'SUMMARY:Outfit: '+o.name.replace(/[,;]/g,' '),'DESCRIPTION:'+Object.values(o.items).map(id=>(item(id)||{}).name||'').filter(Boolean).join(' + ').replace(/[,;]/g,' '),'END:VEVENT')});L.push('END:VCALENDAR');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([L.join('\r\n')],{type:'text/calendar'}));a.download='my-outfits.ics';a.click()}
