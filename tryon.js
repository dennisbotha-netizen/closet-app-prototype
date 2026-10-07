'use strict';
/* ===== Avatar maker (on-device MediaPipe) + free AI try-on (Hugging Face Spaces) ===== */
const MP='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const GRADIO='https://cdn.jsdelivr.net/npm/@gradio/client@1.15.1/+esm';
const TO_MS=120000;
const T={};
T.blobToURL=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
T.urlToBlob=async u=>(await fetch(u)).blob();
T.loadImg=src=>new Promise((res,rej)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=()=>rej(new Error('image load failed'));i.src=src});
T.hash=async s=>{const b=await crypto.subtle.digest('SHA-1',new TextEncoder().encode(s));return [...new Uint8Array(b)].slice(0,8).map(x=>x.toString(16).padStart(2,'0')).join('')};

/* ---- try-on cache store (own IndexedDB so the main DB is untouched) ---- */
T.cdb=null;
T.cOpen=()=>T.cdb?Promise.resolve(T.cdb):new Promise((res,rej)=>{const r=indexedDB.open('closet-tryon',1);r.onupgradeneeded=()=>r.result.createObjectStore('c',{keyPath:'id'});r.onsuccess=()=>{T.cdb=r.result;res(T.cdb)};r.onerror=()=>rej(r.error)});
T.cGet=async id=>{const d=await T.cOpen();return new Promise(r=>{const q=d.transaction('c').objectStore('c').get(id);q.onsuccess=()=>r(q.result);q.onerror=()=>r()})};
T.cPut=async v=>{const d=await T.cOpen();return new Promise(r=>{const q=d.transaction('c','readwrite').objectStore('c').put(v);q.onsuccess=()=>r();q.onerror=()=>r()})};
T.cClear=async()=>{const d=await T.cOpen();return new Promise(r=>{const q=d.transaction('c','readwrite').objectStore('c').clear();q.onsuccess=()=>r();q.onerror=()=>r()})};

/* ---- settings + daily counter (localStorage only) ---- */
T.cfg=()=>({space:localStorage.getItem('hf_space')||'',token:localStorage.getItem('hf_token')||''});
T.count=()=>+(localStorage.getItem('tryon_'+today())||0);
T.bump=()=>localStorage.setItem('tryon_'+today(),T.count()+1);
T.counterText=()=>`AI try-ons today: <b>${T.count()}</b> · free quota is a few per day (repeats are free, they come from this phone)`;

/* ================= AVATAR MAKER ================= */
T.mp=null;
T.loadMP=async()=>{if(T.mp)return T.mp;if(!T._ce){T._ce=1;const ce=console.error.bind(console);console.error=(...a)=>{if(typeof a[0]==='string'&&/^(INFO|W\d{4}|I\d{4})/.test(a[0]))return;ce(...a)}}// MediaPipe wasm prints info lines to stderr
 const v=await import(MP+'/vision_bundle.mjs');const fs=await v.FilesetResolver.forVisionTasks(MP+'/wasm');
 const pose=await v.PoseLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:'CPU'},runningMode:'IMAGE',numPoses:1});
 const seg=await v.ImageSegmenter.createFromOptions(fs,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',delegate:'CPU'},runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false});
 T.mp={pose,seg};return T.mp};
// Pose quality checks -> [{ok,text}]
T.checkPose=(L)=>{const out=[];if(!L)return [{ok:false,text:'I can\'t see a person. Stand in the middle of the photo, full body, good light.'}];
 const vis=i=>(L[i].visibility??1)>.5&&L[i].x>-.02&&L[i].x<1.02&&L[i].y>-.02&&L[i].y<1.02;
 const full=[0,11,12,23,24,27,28].every(vis);out.push({ok:full,text:full?'Full body in the photo 👍':'Step back so your head AND feet are in the photo.'});
 const sw=Math.abs(L[11].x-L[12].x),th=Math.abs((L[23].y+L[24].y)/2-(L[11].y+L[12].y)/2)||1;const nose=L[0].x,mn=Math.min(L[11].x,L[12].x),mx=Math.max(L[11].x,L[12].x);
 const front=sw/th>.38&&nose>mn&&nose<mx;out.push({ok:front,text:front?'Facing the camera 👍':'Turn so you face the camera straight on (shoulders square).'});
 const ang=(s,e,h)=>{const a=Math.atan2(L[e].x-L[s].x,L[e].y-L[s].y),b=Math.atan2(L[h].x-L[s].x,L[h].y-L[s].y);return Math.abs((a-b)*180/Math.PI)%360};
 const aL=ang(11,15,23),aR=ang(12,16,24);const a1=Math.min(aL,360-aL),a2=Math.min(aR,360-aR);
 const arms=a1>=8&&a1<=50&&a2>=8&&a2<=50;out.push({ok:arms,text:arms?'Arms slightly out 👍':(Math.max(a1,a2)>50?'Lower your arms a bit, just slightly away from your body.':'Move your arms a little away from your sides (like a small "A").')});
 const tall=Math.abs(((L[27].y+L[28].y)/2)-L[0].y)>.55;out.push({ok:tall,text:tall?'Good size in the frame 👍':'Come a little closer so you fill most of the photo (still head to toe).'});
 return out};
// Measurements from mask + landmarks + height
T.measure=(mask,W,H,L,heightCm)=>{let top=H,bot=0;const rowW=y=>{y=Math.max(0,Math.min(H-1,Math.round(y)));let a=-1,b=-1;for(let x=0;x<W;x++)if(mask[y*W+x]>.5){if(a<0)a=x;b=x}return a<0?0:b-a+1};
 for(let y=0;y<H;y++){for(let x=0;x<W;x+=2)if(mask[y*W+x]>.5){if(y<top)top=y;bot=y;break}}
 const px=Math.max(1,bot-top),k=(+heightCm||160)/px;const P=i=>({x:L[i].x*W,y:L[i].y*H});
 const sh=(P(11).y+P(12).y)/2,hp=(P(23).y+P(24).y)/2,r=v=>Math.round(v);
 // arms are slightly out, so trim torso rows to the span between the arm edges: use the narrowest run around the centre
 const torsoW=y=>{y=Math.max(0,Math.min(H-1,Math.round(y)));const cx=Math.round((P(11).x+P(12).x+P(23).x+P(24).x)/4);if(mask[y*W+cx]<=.5)return rowW(y);let a=cx,b=cx;while(a>0&&mask[y*W+a-1]>.5)a--;while(b<W-1&&mask[y*W+b+1]>.5)b++;return b-a+1};
 const bust=torsoW(sh+(hp-sh)*.25)*k,waist=torsoW(sh+(hp-sh)*.68)*k,hip=torsoW(hp+(hp-sh)*.12)*k,shoulder=Math.hypot(P(11).x-P(12).x,P(11).y-P(12).y)*k*1.18;
 const leg=((P(23).y+P(24).y)/2-(P(27).y+P(28).y)/2);const inseam=Math.abs(leg)*k;
 const circ=w=>w*Math.PI*.82; // rough front-width -> circumference (ellipse, depth ≈ 0.64×width)
 let shape='Straight';const wb=waist/bust,wh=waist/hip;if(wb<.78&&wh<.78&&Math.abs(bust-hip)/hip<.08)shape='Hourglass';else if(hip>bust*1.07)shape='Pear';else if(bust>hip*1.07)shape='Inverted triangle';else if(wb>.92&&wh>.92)shape=waist>bust?'Apple':'Straight';
 return {heightCm:+heightCm||160,shoulderCm:r(shoulder),bustWidthCm:r(bust),waistWidthCm:r(waist),hipWidthCm:r(hip),bustCircCm:r(circ(bust)),waistCircCm:r(circ(waist)),hipCircCm:r(circ(hip)),inseamCm:r(inseam),shape,note:'Estimated from one photo, ±5 cm'}};
// Full pipeline: image -> {checks, avatarURL, body, overlayURL}
T.analyse=async(img,heightCm)=>{const {pose,seg}=await T.loadMP();const c=scaled(img,1024);const W=c.width,H=c.height;
 const pr=pose.detect(c);const L=pr.landmarks&&pr.landmarks[0];const checks=T.checkPose(L);
 const sr=seg.segment(c);const m=sr.confidenceMasks[0];const mask=m.getAsFloat32Array().slice();const mw=m.width,mh=m.height;sr.close&&sr.close();
 // cut-out on white, framed 3:4 (768×1024) which suits the try-on models
 const cut=document.createElement('canvas');cut.width=W;cut.height=H;const cx=cut.getContext('2d');cx.drawImage(c,0,0);const d=cx.getImageData(0,0,W,H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=mask[Math.floor(y*mh/H)*mw+Math.floor(x*mw/W)];const a=Math.max(0,Math.min(1,(v-.35)/.3));const o=(y*W+x)*4;d.data[o]=d.data[o]*a+255*(1-a);d.data[o+1]=d.data[o+1]*a+255*(1-a);d.data[o+2]=d.data[o+2]*a+255*(1-a)}
 cx.putImageData(d,0,0);
 let x0=W,x1=0,y0=H,y1=0;for(let y=0;y<mh;y++)for(let x=0;x<mw;x++)if(mask[y*mw+x]>.5){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
 const sx=W/mw,sy=H/mh;let bx=x0*sx,by=y0*sy,bw=(x1-x0+1)*sx,bh=(y1-y0+1)*sy;if(x1<=x0){bx=0;by=0;bw=W;bh=H}
 const OW=768,OH=1024,sc=Math.min(OW*.9/bw,OH*.94/bh);const out=document.createElement('canvas');out.width=OW;out.height=OH;const ox=out.getContext('2d');ox.fillStyle='#fff';ox.fillRect(0,0,OW,OH);
 ox.drawImage(cut,bx,by,bw,bh,(OW-bw*sc)/2,(OH-bh*sc)/2,bw*sc,bh*sc);
 // preview with pose dots
 const ov=document.createElement('canvas');ov.width=W;ov.height=H;const vx=ov.getContext('2d');vx.drawImage(c,0,0);if(L){vx.fillStyle='#ff4f9a';[0,11,12,13,14,15,16,23,24,25,26,27,28].forEach(i=>{vx.beginPath();vx.arc(L[i].x*W,L[i].y*H,Math.max(3,W/120),0,7);vx.fill()})}
 const body=L?T.measure(mask,mw,mh,L,heightCm):null;
 return {checks,ok:checks.every(c=>c.ok),avatarURL:out.toDataURL('image/jpeg',.9),overlayURL:ov.toDataURL('image/jpeg',.8),body}};

T.avatarSheet=()=>{const me=S.me;const consent=localStorage.getItem('av_consent')==='1';
 openSheet(`${head('Make my avatar ✨')}
 <div class="pill">📸 One clear <b>full-body</b> photo: fitted clothes, plain wall behind you, face the camera, arms <b>slightly</b> out, head to toe in the picture.</div>
 <div class="pill">📱 Checking your pose and cutting out the background happen <b>on this phone</b>. Only when you tap <b>Try it on</b> is the avatar sent to Hugging Face to make the picture.</div>
 <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="avOk" ${consent?'checked':''} style="width:22px;height:22px;flex:none"> A parent said it's OK to use my photo for my avatar and AI try-on</label>
 <label>My height (cm)</label><input id="avH" type="number" inputmode="numeric" min="100" max="220" value="${esc(me.height||'')}" placeholder="e.g. 158">
 <div class="row" style="margin-top:10px"><label class="btn" style="margin:0;text-align:center">📷 Take photo<input type="file" accept="image/*" capture="environment" id="avCam2" hidden></label><label class="btn alt" style="margin:0;text-align:center">🖼️ Upload<input type="file" accept="image/*" id="avGal2" hidden></label></div>
 <div id="avOut"></div>`,root=>{
  const out=root.querySelector('#avOut');
  const go=async f=>{if(!f)return;if(!root.querySelector('#avOk').checked){toast('A parent needs to tick the box first 🙂');return}
   const h=+root.querySelector('#avH').value;if(!(h>=100&&h<=220)){toast('Enter your height in cm first');return}
   localStorage.setItem('av_consent','1');out.innerHTML='<div class="spin"></div><p class="muted" style="text-align:center">Checking your pose on this phone… (first time downloads a small model)</p>';
   try{const img=await fileToImg(f);const t0=performance.now();const r=await T.analyse(img,h);const ms=Math.round(performance.now()-t0);T._last=r;
    out.innerHTML=`<div class="row" style="align-items:flex-start;gap:8px"><img src="${r.overlayURL}" style="width:48%;border-radius:12px"><img src="${r.avatarURL}" style="width:48%;border-radius:12px;background:#fff"></div>
    ${r.checks.map(c=>`<div class="pill">${c.ok?'✅':'💡'} ${esc(c.text)}</div>`).join('')}
    ${r.body?`<div class="pill"><b>Estimated shape:</b> ${r.body.shape} · shoulders ~${r.body.shoulderCm} cm · bust ~${r.body.bustCircCm} · waist ~${r.body.waistCircCm} · hips ~${r.body.hipCircCm} cm <span class="muted">(rough, ±5 cm)</span></div>`:''}
    <p class="muted">Checked in ${(ms/1000).toFixed(1)} s.</p>
    <div class="row"><button class="btn alt" id="avRetake">↺ Retake</button><button class="btn" id="avUse" ${r.body?'':'disabled'}>${r.ok?'Use as my avatar 💖':'Use anyway'}</button></div>`;
    root.querySelector('#avRetake').onclick=()=>{out.innerHTML='';root.querySelectorAll('input[type=file]').forEach(i=>i.value='')};
    root.querySelector('#avUse').onclick=async()=>{S.me.avatar=r.avatarURL;S.me.cut=true;S.me.base=true;S.me.avatarId=uid();S.me.body=r.body;S.me.height=String(h);if(!S.me.shape&&r.body)S.me.shape=r.body.shape;S.me.avatarAt=Date.now();await DB.set('me',S.me);closeSheet();render();toast('Avatar saved on this phone ✨')}}
   catch(e){console.warn('avatar',e&&e.message);out.innerHTML='<p class="muted">Sorry, the pose checker couldn\'t load (needs internet the first time). Try again in a bit.</p>'}};
  root.querySelector('#avCam2').onchange=e=>go(e.target.files[0]);root.querySelector('#avGal2').onchange=e=>go(e.target.files[0]);})};
T.deleteAvatar=async()=>{['avatar','cut','base','avatarId','body','avatarAt'].forEach(k=>delete S.me[k]);await DB.set('me',S.me);await T.cClear();localStorage.removeItem('av_consent');toast('Avatar deleted');render()};

/* ================= TRY-ON ================= */
// Garment photo -> 768×1024 JPEG on white (drawn demo SVGs are rasterised here)
T.garmentBlob=async it=>{const img=await T.loadImg(it.img);const c=document.createElement('canvas');c.width=768;c.height=1024;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,768,1024);
 const w=img.naturalWidth||200,h=img.naturalHeight||200,k=Math.min(680/w,900/h);x.drawImage(img,(768-w*k)/2,(1024-h*k)/2,w*k,h*k);return new Promise(r=>c.toBlob(r,'image/jpeg',.92))};
T.desc=it=>`${it.colour||''} ${it.name||''}`.trim();
// provider list per garment type
T.providers=kind=>{const {space}=T.cfg();const L=[];const up=kind!=='lower_body';
 if(space){L.push(/leffa/i.test(space)?{id:space,type:'leffa'}:/catvton/i.test(space)?{id:space,type:'cat'}:{id:space,type:'idm'})}
 if(up)L.push({id:'yisol/IDM-VTON',type:'idm'});L.push({id:'franciszzj/Leffa',type:'leffa'},{id:'zhengchong/CatVTON',type:'cat'});
 return L.filter(p=>up||p.type!=='idm')};
T.gradio=null;
// HF Spaces' CORS preflight rejects credentialed requests from other sites; cookies aren't needed (token goes in a header), so omit them.
T.patchFetch=()=>{if(T._pf)return;T._pf=1;const f0=window.fetch.bind(window);window.fetch=(u,o)=>{try{const url=typeof u==='string'?u:u.url;if(/\.hf\.space\//.test(url))o={...(o||{}),credentials:'omit'}}catch(e){}return f0(u,o)}};
T.alive=async id=>{try{const r=await fetch('https://huggingface.co/api/spaces/'+id+'/runtime',{credentials:'omit'});if(!r.ok)return true;const j=await r.json();return !j.stage||j.stage==='RUNNING'||j.stage==='RUNNING_BUILDING'||j.stage==='SLEEPING'||j.stage==='APP_STARTING'}catch(e){return true}};
T.call=async(p,person,garm,it,kind,onStatus,signal)=>{T.patchFetch();T.gradio=T.gradio||await import(GRADIO);const {Client,handle_file}=T.gradio;const {token}=T.cfg();
 const opts={events:['data','status']};if(token){opts.token=token;opts.hf_token=token}const client=await Client.connect(p.id,opts);let job;
 if(p.type==='idm')job=client.submit('/tryon',[{background:handle_file(person),layers:[],composite:null},handle_file(garm),T.desc(it),true,true,30,42]);
 else if(p.type==='leffa')job=client.submit('/leffa_predict_vt',[handle_file(person),handle_file(garm),false,30,2.5,42,'viton_hd',kind,false]);
 else job=client.submit('/submit_function',[{background:handle_file(person),layers:[],composite:null},handle_file(garm),kind==='lower_body'?'lower':'upper',50,2.5,42,'result only']);
 signal.onabort=()=>{try{job.cancel()}catch(e){}};
 for await(const m of job){if(signal.aborted)break;if(m.type==='status'){if(m.stage==='error')throw new Error(m.message||'Space error');onStatus(m)}
  if(m.type==='data'){const f=m.data[0];const url=f&&(f.url||f.path);if(!url)throw new Error('no image returned');return T.urlToBlob(url)}}
 throw new Error('cancelled')};
T.kindOf=it=>it.cat==='bottom'?'lower_body':'upper_body';
T.friendly=e=>{const s=String(e&&e.message||e);if(/quota|ZeroGPU|exceeded|limit/i.test(s))return 'Free AI quota used up for now (resets during the day). Dad can add his free Hugging Face token in Settings for more.';
 if(/timeout/i.test(s))return 'The free AI server is busy and took too long.';if(/RUNTIME_ERROR|error|sleep|not found|404|503|fetch/i.test(s))return 'The free AI server is down or asleep right now.';return 'The AI try-on didn\'t work this time.'};
// steps: [item,...] applied in order (top then bottom); previous result fed back in.
T.run=async(steps,status)=>{const t0=performance.now();let person=await T.urlToBlob(S.me.avatar);let used=[],url=null,keyIds=[];
 for(let i=0;i<steps.length;i++){const it=steps[i];keyIds.push(it.id);const key=await T.hash(S.me.avatarId+'|'+keyIds.join('>')+'|'+(it.img||'').length);
  const hit=await T.cGet(key);if(hit){url=hit.url;person=await T.urlToBlob(url);used.push(hit.via+' (saved)');continue}
  const kind=T.kindOf(it),garm=await T.garmentBlob(it);let ok=false,lastErr;
  for(const p of T.providers(kind)){const ac=new AbortController();const st=performance.now();
   status(`Step ${i+1}/${steps.length}: putting on ${esc(it.name)} with ${p.id.split('/')[1]}…`);
   const tick=setInterval(()=>status(`Step ${i+1}/${steps.length}: ${esc(it.name)} via ${p.id.split('/')[1]} · ${Math.round((performance.now()-st)/1000)} s`),1000);
   if(!(await T.alive(p.id))){lastErr=lastErr||new Error('Space down');console.warn('try-on',p.id,'not running, skipped');continue}
   try{const remaining=TO_MS-(performance.now()-t0);if(remaining<5000)throw new Error('timeout');
    const blob=await Promise.race([T.call(p,person,garm,it,kind,m=>{if(m.position!=null)status(`Step ${i+1}/${steps.length}: in the queue (#${m.position+1})…`)},ac.signal),new Promise((_,r)=>setTimeout(()=>{ac.abort();r(new Error('timeout'))},remaining))]);
    clearInterval(tick);T.bump();url=await T.blobToURL(blob);person=blob;await T.cPut({id:key,url,via:p.id,t:Date.now()});used.push(`${p.id} ${((performance.now()-st)/1000).toFixed(1)} s`);ok=true;break}
   catch(e){clearInterval(tick);if(!(lastErr&&/quota|ZeroGPU|exceeded/i.test(lastErr.message)))lastErr=e;console.warn('try-on',p.id,e&&e.message);if(/timeout/.test(e&&e.message))break}}
  if(!ok){const e=lastErr||new Error('failed');if(url){return {url,used,secs:((performance.now()-t0)/1000).toFixed(1),partial:{done:steps.slice(0,i),failed:steps.slice(i),err:e}}}throw e}}
 return {url,used,secs:((performance.now()-t0)/1000).toFixed(1)}};
T.flatHTML=items=>`<div class="stage" style="height:360px"><img class="av" src="${avatarSrc()}" style="height:320px" alt="">${['bottom','top','outer','shoes','hat','acc'].map(k=>items.find(i=>i.cat===k)).filter(Boolean).map(i=>`<img class="lay l-${i.cat}" src="${i.img}" alt="">`).join('')}</div>`;
T.tryOn=async items=>{items=items.filter(Boolean);
 if(!S.me.base||!S.me.avatar){openSheet(`${head('Try it on')}<p>First make your avatar: one full-body photo, done once.</p><button class="btn full" id="mk">Make my avatar ✨</button>`,r=>r.querySelector('#mk').onclick=()=>{closeSheet();setTimeout(T.avatarSheet,150)});return}
 const steps=['top','outer','bottom'].map(k=>items.find(i=>i.cat===k)).filter(Boolean).filter(i=>i.cat!=='outer'||!items.find(x=>x.cat==='top'));
 if(!steps.length)return toast('Pick a top or bottom to try on 👚');
 openSheet(`${head('Try it on ✨')}<div id="toBody"><div class="spin"></div><p class="muted" id="toMsg" style="text-align:center">Getting ready…</p><p class="muted" style="text-align:center;font-size:12px">Free AI can take 20–60 s per piece. Your avatar is sent to Hugging Face just to make this picture.</p></div>`,async root=>{
  const msg=t=>{const e=root.querySelector('#toMsg');if(e)e.innerHTML=t};
  try{const r=await T.run(steps,msg);if(!root.isConnected||!root.querySelector('#toBody'))return;
   root.querySelector('#toBody').innerHTML=`<div class="ai-wrap"><img src="${r.url}" alt="AI try-on preview" id="toImg"><span class="ai-badge">AI preview</span></div>
   ${r.partial?`<div class="pill">💡 Added ${esc(r.partial.done.map(x=>x.name).join(' + '))}, but not ${esc(r.partial.failed.map(x=>x.name).join(' + '))}: ${esc(T.friendly(r.partial.err))}</div>`:''}<p class="muted">${(r.partial?r.partial.done:steps).map(s=>esc(s.name)).join(' + ')} · ${r.secs} s · ${esc(r.used.join(', '))}</p><p class="muted">${T.counterText()}</p>
   <p class="muted" style="font-size:12px">AI pictures can get details wrong (logos, length, fit). Shoes, hats & bags aren't drawn by the AI yet.</p>`}
  catch(e){if(!root.querySelector('#toBody'))return;root.querySelector('#toBody').innerHTML=`<div class="pill">😕 ${esc(T.friendly(e))} Here's your outfit in the normal view instead.</div>${T.flatHTML(items)}<p class="muted">${T.counterText()}</p>`}})};

/* ================= Me-tab cards ================= */
T.meCard=()=>{const me=S.me,b=me.body;return `<div class="card" style="text-align:center"><div class="avatar-frame ${me.cut?'cut':''}"><img src="${avatarSrc()}" alt="my avatar"></div>
 ${me.base?`<p class="muted">Base avatar saved ${new Date(me.avatarAt||Date.now()).toLocaleDateString('en-ZA')}${b?` · ${esc(b.shape)} · ${b.heightCm} cm`:''}</p>`:'<p class="muted">Make your avatar once, then tap <b>Try it on</b> in Dress Me to see your clothes on you (AI preview).</p>'}
 <div class="row"><button class="btn" id="avMake">${me.base?'↺ Retake avatar':'✨ Make my avatar'}</button>${me.avatar?'<button class="btn danger sm" id="avKill">Delete my avatar</button>':''}</div>
 ${b?`<details style="text-align:left;margin-top:8px"><summary>My measurements (estimated)</summary><p class="muted">Shoulders ~${b.shoulderCm} cm · bust ~${b.bustCircCm} cm · waist ~${b.waistCircCm} cm · hips ~${b.hipCircCm} cm · inside leg ~${b.inseamCm} cm. ${esc(b.note)}.</p></details>`:''}</div>`};
T.settingsCard=()=>{const c=T.cfg();return `<div class="card"><h2 style="margin-top:0">AI try-on settings</h2><p class="muted">${T.counterText()}</p>
 <p class="muted">Optional, for Dad: your own free Hugging Face Space and token give more try-ons. Saved only in this browser.</p>
 <label>Space ID (e.g. dennis/IDM-VTON)</label><input id="hfSpace" value="${esc(c.space)}" placeholder="yisol/IDM-VTON" autocomplete="off">
 <label>Hugging Face read token</label><input id="hfTok" type="password" value="${esc(c.token)}" placeholder="hf_…" autocomplete="off">
 <div class="row" style="margin-top:8px"><button class="btn sm" id="hfSave">Save</button><button class="btn alt sm" id="hfClr">Clear</button><button class="btn alt sm" id="toClr">Clear saved try-ons</button></div></div>`};
T.bindMe=a=>{const q=s=>a.querySelector(s);q('#avMake').onclick=T.avatarSheet;if(q('#avKill'))q('#avKill').onclick=()=>{if(confirm('Delete your avatar photo, measurements and saved try-on pictures from this phone?'))T.deleteAvatar()};
 q('#hfSave').onclick=()=>{localStorage.setItem('hf_space',q('#hfSpace').value.trim());localStorage.setItem('hf_token',q('#hfTok').value.trim());toast('Saved in this browser')};
 q('#hfClr').onclick=()=>{localStorage.removeItem('hf_space');localStorage.removeItem('hf_token');render();toast('Cleared')};q('#toClr').onclick=async()=>{await T.cClear();toast('Saved try-ons cleared')}};
window.TRY=T;
