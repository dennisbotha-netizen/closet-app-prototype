'use strict';
/* ===== Avatar maker (on-device MediaPipe) + realistic AI try-on queue (free Hugging Face Spaces) ===== */
const MP='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const GRADIO='https://cdn.jsdelivr.net/npm/@gradio/client@1.15.1/+esm';
const MPM='https://storage.googleapis.com/mediapipe-models/';
const TO_MS=150000;
const T={};
T.blobToURL=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
T.urlToBlob=async u=>(await fetch(u)).blob();
T.loadImg=src=>new Promise((res,rej)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=()=>rej(new Error('image load failed'));i.src=src});
T.hash=async s=>{const b=await crypto.subtle.digest('SHA-1',typeof s==='string'?new TextEncoder().encode(s):s);return [...new Uint8Array(b)].slice(0,10).map(x=>x.toString(16).padStart(2,'0')).join('')};
T._ih=new Map();T.imgHash=async it=>{const k=it.id+'|'+(it.img||'').length+'|'+(it.edited||0);if(!T._ih.has(k))T._ih.set(k,await T.hash(it.img||''));return T._ih.get(k)};
T.canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};

/* ---- try-on cache: blobs, LRU-capped, 30-day expiry ---- */
T.CAP=40;T.MAXAGE=30*864e5;T.cdb=null;
T.cOpen=()=>T.cdb?Promise.resolve(T.cdb):new Promise((res,rej)=>{const r=indexedDB.open('closet-tryon',2);r.onupgradeneeded=()=>{const d=r.result;if(d.objectStoreNames.contains('c'))d.deleteObjectStore('c');d.createObjectStore('c',{keyPath:'id'})};r.onsuccess=()=>{T.cdb=r.result;res(T.cdb)};r.onerror=()=>rej(r.error)});
T.cReq=async(mode,fn)=>{const d=await T.cOpen();return new Promise(r=>{const q=fn(d.transaction('c',mode).objectStore('c'));q.onsuccess=()=>r(q.result);q.onerror=()=>r()})};
T.cGet=async id=>{const v=await T.cReq('readonly',s=>s.get(id));if(v){if(Date.now()-v.t>T.MAXAGE){T.cReq('readwrite',s=>s.delete(id));return}v.used=Date.now();T.cReq('readwrite',s=>s.put(v))}return v};
T.cPut=async v=>{v.used=Date.now();await T.cReq('readwrite',s=>s.put(v));const all=await T.cReq('readonly',s=>s.getAll())||[];if(all.length>T.CAP){all.sort((a,b)=>a.used-b.used);for(const x of all.slice(0,all.length-T.CAP))await T.cReq('readwrite',s=>s.delete(x.id))}};
T.cClear=()=>T.cReq('readwrite',s=>s.clear());
T.cCount=async()=>(await T.cReq('readonly',s=>s.count()))||0;

/* ---- settings + daily counter (local SA date) ---- */
T.cfg=()=>({space:localStorage.getItem('hf_space')||'',token:localStorage.getItem('hf_token')||''});
T.count=()=>+(localStorage.getItem('tryon_'+today())||0);
T.bump=()=>localStorage.setItem('tryon_'+today(),T.count()+1);
// ZeroGPU: anonymous ≈2 min/day, free account ≈5 min/day; one try-on step uses ≈25–35 s
T.cap=()=>T.cfg().token?9:3;
T.left=()=>Math.max(0,T.cap()-T.count());
T.counterText=()=>`AI try-ons today: <b>${T.count()}</b> · about <b>${T.left()}</b> left today (repeats are free, they're saved on this phone)`;
T.aiAllowed=()=>localStorage.getItem('ai_ok')==='1';

/* ================= ON-DEVICE MODELS ================= */
T.mp=null;
T.loadMP=async()=>{if(T.mp)return T.mp;if(T._mpP)return T._mpP;T._mpP=(async()=>{
 if(!T._ce){T._ce=1;const ce=console.error.bind(console);console.error=(...a)=>{if(typeof a[0]==='string'&&/^(INFO|W\d{4}|I\d{4})/.test(a[0]))return;ce(...a)}}
 const v=await import(MP+'/vision_bundle.mjs');const fs=await v.FilesetResolver.forVisionTasks(MP+'/wasm');
 const mk=(cls,path,o)=>cls.createFromOptions(fs,{baseOptions:{modelAssetPath:MPM+path,delegate:'CPU'},runningMode:'IMAGE',...o});
 let pose;try{pose=await mk(v.PoseLandmarker,'pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',{numPoses:1})}catch(e){pose=await mk(v.PoseLandmarker,'pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',{numPoses:1})}
 // better person mask: multiclass (hair/body/face/clothes vs background); fallback to the basic selfie model
 let seg,multi=true;try{seg=await mk(v.ImageSegmenter,'image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',{outputConfidenceMasks:true,outputCategoryMask:false})}
 catch(e){multi=false;seg=await mk(v.ImageSegmenter,'image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',{outputConfidenceMasks:true,outputCategoryMask:false})}
 T.mp={pose,seg,multi};return T.mp})();try{return await T._mpP}catch(e){T._mpP=null;throw e}};
// person confidence (0..1) at model resolution
T.personConf=(seg,multi,c)=>{const r=seg.segment(c);const m=r.confidenceMasks[0];const a=m.getAsFloat32Array();const out=new Float32Array(a.length);for(let i=0;i<a.length;i++)out[i]=multi?1-a[i]:a[i];const res={mask:out,mw:m.width,mh:m.height};r.close&&r.close();return res};
// edge refinement: bilinear upsample, 2× box blur (feather), smoothstep on confidence
T.refine=(mask,mw,mh,W,H,lo=.32,hi=.68)=>{const A=new Float32Array(W*H);
 for(let y=0;y<H;y++){const fy=Math.min(mh-1.001,Math.max(0,(y+.5)*mh/H-.5)),y0=fy|0,dy=fy-y0;for(let x=0;x<W;x++){const fx=Math.min(mw-1.001,Math.max(0,(x+.5)*mw/W-.5)),x0=fx|0,dx=fx-x0,i=y0*mw+x0;
  A[y*W+x]=(mask[i]*(1-dx)+mask[i+1]*dx)*(1-dy)+(mask[i+mw]*(1-dx)+mask[i+mw+1]*dx)*dy}}
 const r=Math.max(1,Math.round(W/450)),tmp=new Float32Array(W*H);
 for(let pass=0;pass<2;pass++){for(let y=0;y<H;y++){let s=0;for(let x=-r;x<=r;x++)s+=A[y*W+Math.min(W-1,Math.max(0,x))];for(let x=0;x<W;x++){tmp[y*W+x]=s/(2*r+1);s+=A[y*W+Math.min(W-1,x+r+1)]-A[y*W+Math.max(0,x-r)]}}
  for(let x=0;x<W;x++){let s=0;for(let y=-r;y<=r;y++)s+=tmp[Math.min(H-1,Math.max(0,y))*W+x];for(let y=0;y<H;y++){A[y*W+x]=s/(2*r+1);s+=tmp[Math.min(H-1,y+r+1)*W+x]-tmp[Math.max(0,y-r)*W+x]}}}
 for(let i=0;i<A.length;i++){let t=(A[i]-lo)/(hi-lo);t=t<0?0:t>1?1:t;A[i]=t*t*(3-2*t)}return A};
T.bbox=(A,W,H,th=.5)=>{let x0=W,x1=-1,y0=H,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(A[y*W+x]>th){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}return x1<0?{x:0,y:0,w:W,h:H}:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1}};
// transparent, head-to-feet cut-out (PNG) from a canvas + alpha
T.cutPNG=(c,A,box,maxH=1100)=>{const W=c.width,H=c.height,x=c.getContext('2d'),d=x.getImageData(0,0,W,H);for(let i=0;i<W*H;i++)d.data[i*4+3]=Math.round(255*A[i]);
 const t=T.canvas(W,H);t.getContext('2d').putImageData(d,0,0);const pad=Math.round(box.h*.01),bx=Math.max(0,box.x-pad),by=Math.max(0,box.y-pad),bw=Math.min(W-bx,box.w+2*pad),bh=Math.min(H-by,box.h+2*pad);
 const k=Math.min(1,maxH/bh),o=T.canvas(Math.round(bw*k),Math.round(bh*k));const ox=o.getContext('2d');ox.imageSmoothingQuality='high';ox.drawImage(t,bx,by,bw,bh,0,0,o.width,o.height);return o.toDataURL('image/png')};

/* ---- pose checks ---- */
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
T.measure=(mask,W,H,L,heightCm)=>{let top=H,bot=0;const rowW=y=>{y=Math.max(0,Math.min(H-1,Math.round(y)));let a=-1,b=-1;for(let x=0;x<W;x++)if(mask[y*W+x]>.5){if(a<0)a=x;b=x}return a<0?0:b-a+1};
 for(let y=0;y<H;y++){for(let x=0;x<W;x+=2)if(mask[y*W+x]>.5){if(y<top)top=y;bot=y;break}}
 const px=Math.max(1,bot-top),k=(+heightCm||160)/px;const P=i=>({x:L[i].x*W,y:L[i].y*H});
 const sh=(P(11).y+P(12).y)/2,hp=(P(23).y+P(24).y)/2,r=v=>Math.round(v);
 const torsoW=y=>{y=Math.max(0,Math.min(H-1,Math.round(y)));const cx=Math.round((P(11).x+P(12).x+P(23).x+P(24).x)/4);if(mask[y*W+cx]<=.5)return rowW(y);let a=cx,b=cx;while(a>0&&mask[y*W+a-1]>.5)a--;while(b<W-1&&mask[y*W+b+1]>.5)b++;return b-a+1};
 const bust=torsoW(sh+(hp-sh)*.25)*k,waist=torsoW(sh+(hp-sh)*.68)*k,hip=torsoW(hp+(hp-sh)*.12)*k,shoulder=Math.hypot(P(11).x-P(12).x,P(11).y-P(12).y)*k*1.18;
 const inseam=Math.abs((P(23).y+P(24).y)/2-(P(27).y+P(28).y)/2)*k;const circ=w=>w*Math.PI*.82;
 let shape='Straight';const wb=waist/bust,wh=waist/hip;if(wb<.78&&wh<.78&&Math.abs(bust-hip)/hip<.08)shape='Hourglass';else if(hip>bust*1.07)shape='Pear';else if(bust>hip*1.07)shape='Inverted triangle';else if(wb>.92&&wh>.92)shape=waist>bust?'Apple':'Straight';
 return {heightCm:+heightCm||160,shoulderCm:r(shoulder),bustWidthCm:r(bust),waistWidthCm:r(waist),hipWidthCm:r(hip),bustCircCm:r(circ(bust)),waistCircCm:r(circ(waist)),hipCircCm:r(circ(hip)),inseamCm:r(inseam),shape,note:'Estimated from one photo, ±5 cm'}};
// image -> {checks, avatarURL (white 768×1024 for the AI), cutURL (transparent head-to-feet), frameBox, faceBox, body}
T.analyse=async(img,heightCm)=>{const {pose,seg,multi}=await T.loadMP();const c=scaled(img,1024);const W=c.width,H=c.height;
 const pr=pose.detect(c);const L=pr.landmarks&&pr.landmarks[0];const checks=T.checkPose(L);
 const {mask,mw,mh}=T.personConf(seg,multi,c);const A=T.refine(mask,mw,mh,W,H);const box=T.bbox(A,W,H);
 if(L){const ys=[0,27,28,29,30,31,32].map(i=>L[i].y*H);const top=Math.max(0,Math.min(box.y,ys[0]-box.h*.08)),bot=Math.min(H,Math.max(box.y+box.h,...ys.slice(1)));box.y=Math.round(top);box.h=Math.round(bot-top)}
 const cutURL=T.cutPNG(c,A,box);
 const src=c.getContext('2d').getImageData(0,0,W,H),wd=new ImageData(W,H);for(let i=0;i<W*H;i++){const a=A[i];for(let k=0;k<3;k++)wd.data[i*4+k]=src.data[i*4+k]*a+255*(1-a);wd.data[i*4+3]=255}
 const wc=T.canvas(W,H);wc.getContext('2d').putImageData(wd,0,0);
 const OW=768,OH=1024,sc=Math.min(OW*.9/box.w,OH*.94/box.h);const out=T.canvas(OW,OH);const ox=out.getContext('2d');ox.fillStyle='#fff';ox.fillRect(0,0,OW,OH);
 const dx=(OW-box.w*sc)/2,dy=(OH-box.h*sc)/2;ox.drawImage(wc,box.x,box.y,box.w,box.h,dx,dy,box.w*sc,box.h*sc);
 const frameBox={x:dx/OW,y:dy/OH,w:box.w*sc/OW,h:box.h*sc/OH};
 let faceBox=null;if(L){const f=[0,1,2,3,4,5,6,7,8,9,10].map(i=>({x:(L[i].x*W-box.x)*sc+dx,y:(L[i].y*H-box.y)*sc+dy}));const xs=f.map(p=>p.x),ys=f.map(p=>p.y);const fw=Math.max(...xs)-Math.min(...xs);const cx=(Math.max(...xs)+Math.min(...xs))/2,cy=(Math.max(...ys)+Math.min(...ys))/2;faceBox={x:cx-fw*.9,y:cy-fw*1.1,w:fw*1.8,h:fw*2}}
 const ov=T.canvas(W,H);const vx=ov.getContext('2d');vx.drawImage(c,0,0);if(L){vx.fillStyle='#ff4f9a';[0,11,12,13,14,15,16,23,24,25,26,27,28].forEach(i=>{vx.beginPath();vx.arc(L[i].x*W,L[i].y*H,Math.max(3,W/120),0,7);vx.fill()})}
 const body=L?T.measure(mask,mw,mh,L,heightCm):null;
 return {checks,ok:checks.every(c=>c.ok),avatarURL:out.toDataURL('image/jpeg',.9),cutURL,frameBox,faceBox,overlayURL:ov.toDataURL('image/jpeg',.8),body,model:multi?'multiclass':'selfie'}};
// cut the person out of an AI result so it sits on the studio stage like the base avatar
T.cutResult=async blob=>{const url=URL.createObjectURL(blob);try{const img=await T.loadImg(url);const {seg,multi}=await T.loadMP();const c=scaled(img,1024);const W=c.width,H=c.height;
 const {mask,mw,mh}=T.personConf(seg,multi,c);const A=T.refine(mask,mw,mh,W,H);const box=T.bbox(A,W,H);if(box.h<H*.4)throw new Error('mask too small');return T.cutPNG(c,A,box)}
 catch(e){console.warn('result cut-out skipped',e&&e.message);return null}finally{URL.revokeObjectURL(url)}};

/* ================= AVATAR SHEET ================= */
T.avatarSheet=()=>{if(!T.aiAllowed()&&!localStorage.getItem('pin'))return PIN.setup(()=>T.avatarSheet());
 if(!PIN.unlocked())return PIN.ask('A parent needs to OK making an avatar',()=>T.avatarSheet());
 const me=S.me;
 openSheet(`${head('Make my avatar ✨')}
 <div class="howto"><svg viewBox="0 0 200 420" fill="none" stroke="#6a4cc0" stroke-width="5" stroke-dasharray="10 8"><circle cx="100" cy="45" r="28"/><path d="M62 92q38-20 76 0l14 96-14 4-8-58-4 100 10 172h-26l-10-140-10 140H64l10-172-4-100-8 58-14-4z"/></svg><div><b>How to stand</b><ul><li>Head to shoes in the photo</li><li>Face the camera, arms a little out</li><li>Plain wall, good light, fitted clothes</li><li>Prop the phone at waist height and use the timer</li></ul></div></div>
 <div class="pill">${ic('phone')}<span> Pose check and cut-out happen <b>on this phone</b>. Only the cut-out avatar (never the original photo) is sent to Hugging Face, and only for AI try-on.</span></div>
 <label>My height (cm)</label><input id="avH" type="number" inputmode="numeric" min="100" max="220" value="${esc(me.height||'')}" placeholder="e.g. 158">
 <button class="btn full" id="avLive" style="margin-top:10px">${ic('camera')} Live camera with pose guide + timer</button>
 <div class="row" style="margin-top:8px"><label class="btn ghost" style="margin:0;text-align:center">${ic('camera')} Photo<input type="file" accept="image/*" capture="user" id="avCam2" hidden></label><label class="btn ghost" style="margin:0;text-align:center">${ic('image')} Upload<input type="file" accept="image/*" id="avGal2" hidden></label></div>
 <div id="avOut"></div>`,root=>{
  const out=root.querySelector('#avOut');const hOK=()=>{const h=+root.querySelector('#avH').value;if(!(h>=100&&h<=220)){toast('Enter your height in cm first');return 0}return h};
  const process=async img=>{const h=hOK();if(!h)return;out.innerHTML='<div class="spin"></div><p class="muted" style="text-align:center">Checking your pose and cutting you out on this phone… (first time downloads a small model)</p>';
   try{const t0=performance.now();const r=await T.analyse(img,h);const ms=Math.round(performance.now()-t0);T._last=r;
    out.innerHTML=`<div class="row" style="align-items:flex-start;gap:8px;flex-wrap:nowrap"><img src="${r.overlayURL}" style="width:48%;border-radius:12px"><div class="mini-stage"><img src="${r.cutURL}" alt=""></div></div>
    ${r.checks.map(c=>`<div class="pill">${c.ok?'✅':'💡'} ${esc(c.text)}</div>`).join('')}
    <p class="muted">Checked and cut out in ${(ms/1000).toFixed(1)} s (${r.model} model).</p>
    <div class="row"><button class="btn ghost" id="avRetake">↺ Retake</button><button class="btn" id="avUse" ${r.cutURL?'':'disabled'}>${r.ok?'Use as my avatar 💖':'Use anyway'}</button></div>`;
    root.querySelector('#avRetake').onclick=()=>{out.innerHTML='';root.querySelectorAll('input[type=file]').forEach(i=>i.value='')};
    root.querySelector('#avUse').onclick=async()=>{Object.assign(S.me,{avatar:r.avatarURL,cutout:r.cutURL,frameBox:r.frameBox,faceBox:r.faceBox,cut:true,base:true,avatarId:uid(),body:S.me.fitGuide?r.body:null,height:String(h),avatarAt:Date.now()});await DB.set('me',S.me);T.Q.jobs=[];T.save();closeSheet();render();toast('Avatar saved on this phone ✨');setTimeout(T.offerPrecompute,500)}}
   catch(e){console.warn('avatar',e&&e.message);out.innerHTML='<p class="muted">Sorry, the pose checker couldn\'t load (needs internet the first time). Try again in a bit.</p>'}};
  const go=async f=>{if(!f)return;if(!hOK())return;process(await fileToImg(f))};
  root.querySelector('#avLive').onclick=()=>{if(!hOK())return;CAM.open(c=>process(c))};
  root.querySelector('#avCam2').onchange=e=>go(e.target.files[0]);root.querySelector('#avGal2').onchange=e=>go(e.target.files[0]);})};
T.deleteAvatar=async()=>{['avatar','cutout','frameBox','faceBox','cut','base','avatarId','body','avatarAt'].forEach(k=>delete S.me[k]);await DB.set('me',S.me);await T.cClear();T.Q.jobs=[];T.save();toast('Avatar deleted');render()};

/* ================= TRY-ON ================= */
T.garmentBlob=async it=>{const img=await T.loadImg(it.img);const c=T.canvas(768,1024),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,768,1024);
 const w=img.naturalWidth||200,h=img.naturalHeight||200,k=Math.min(680/w,900/h);x.drawImage(img,(768-w*k)/2,(1024-h*k)/2,w*k,h*k);return new Promise(r=>c.toBlob(r,'image/jpeg',.9))};
// base avatar (cut-out on white, 768×1024, no EXIF), optional face blur
T.personBlob=async()=>{const img=await T.loadImg(S.me.avatar);const c=T.canvas(768,1024),x=c.getContext('2d');x.drawImage(img,0,0,768,1024);
 if(S.me.blurFace&&S.me.faceBox){const f=S.me.faceBox;x.save();x.beginPath();x.ellipse(f.x+f.w/2,f.y+f.h/2,f.w/2,f.h/2,0,0,7);x.clip();x.filter='blur(14px)';x.drawImage(c,0,0);x.filter='none';
  if(x.filter!=='none'||true){const s=12,t=T.canvas(Math.ceil(f.w/s),Math.ceil(f.h/s));t.getContext('2d').drawImage(c,f.x,f.y,f.w,f.h,0,0,t.width,t.height);x.imageSmoothingEnabled=true;x.drawImage(t,f.x,f.y,f.w,f.h)}x.restore()}
 return new Promise(r=>c.toBlob(r,'image/jpeg',.9))};
T.desc=it=>`${it.colour||''} ${it.name||''}`.trim();
T.providers=kind=>{const {space}=T.cfg();const L=[];const up=kind!=='lower_body';
 if(space){L.push(/leffa/i.test(space)?{id:space,type:'leffa'}:/catvton/i.test(space)?{id:space,type:'cat'}:{id:space,type:'idm'})}
 if(up)L.push({id:'yisol/IDM-VTON',type:'idm'});L.push({id:'franciszzj/Leffa',type:'leffa'},{id:'zhengchong/CatVTON',type:'cat'});
 return L.filter(p=>up||p.type!=='idm')};
T.gradio=null;
T.patchFetch=()=>{if(T._pf)return;T._pf=1;const f0=window.fetch.bind(window);window.fetch=(u,o)=>{try{const url=typeof u==='string'?u:u.url;if(/\.hf\.space\//.test(url))o={...(o||{}),credentials:'omit'}}catch(e){}return f0(u,o)}};
T.stage=async id=>{try{const r=await fetch('https://huggingface.co/api/spaces/'+id+'/runtime',{credentials:'omit'});if(!r.ok)return 'RUNNING';const j=await r.json();return j.stage||'RUNNING'}catch(e){return 'RUNNING'}};
T.alive=async id=>/RUNNING|SLEEPING|APP_STARTING|BUILDING/.test(await T.stage(id));
T.prewarm=()=>{if(T._warm||!T.aiAllowed())return;T._warm=1;T.stage('yisol/IDM-VTON');T.stage('franciszzj/Leffa');import(GRADIO).then(m=>T.gradio=T.gradio||m).catch(()=>{})};
T.call=async(p,person,garm,it,kind,onStatus,signal)=>{T.patchFetch();T.gradio=T.gradio||await import(GRADIO);const {Client,handle_file}=T.gradio;const {token}=T.cfg();
 const opts={events:['data','status']};if(token){opts.token=token;opts.hf_token=token}const client=await Client.connect(p.id,opts);let job;
 if(p.type==='idm')job=client.submit('/tryon',[{background:handle_file(person),layers:[],composite:null},handle_file(garm),T.desc(it),true,true,30,42]);
 else if(p.type==='leffa')job=client.submit('/leffa_predict_vt',[handle_file(person),handle_file(garm),false,30,2.5,42,kind==='lower_body'?'dress_code':'viton_hd',kind,false]);
 else job=client.submit('/submit_function',[{background:handle_file(person),layers:[],composite:null},handle_file(garm),kind==='lower_body'?'lower':'upper',50,2.5,42,'result only']);
 signal.onabort=()=>{try{job.cancel()}catch(e){}};
 for await(const m of job){if(signal.aborted)break;if(m.type==='status'){if(m.stage==='error')throw new Error(m.message||'Space error');onStatus(m)}
  if(m.type==='data'){const f=m.data[0];const url=f&&(f.url||f.path);if(!url)throw new Error('no image returned');return T.urlToBlob(url)}}
 throw new Error('cancelled')};
T.kindOf=it=>it.cat==='bottom'?'lower_body':'upper_body';
T.isQuota=e=>/quota|ZeroGPU|exceeded|limit/i.test(String(e&&e.message||e));
T.friendly=e=>{const s=String(e&&e.message||e);if(T.isQuota(s))return 'Free AI quota used up for today (it resets about 24 h after the first try-on).';
 if(/timeout/i.test(s))return 'The free AI server is busy and took too long.';if(/RUNTIME_ERROR|error|sleep|not found|404|503|fetch|down/i.test(s))return 'The free AI server is down or asleep right now.';return 'The AI try-on didn\'t work this time.'};
// which garments the AI draws, in order (top/jacket, then bottom)
T.steps=items=>{items=items.filter(Boolean);const top=items.find(i=>i.cat==='top')||items.find(i=>i.cat==='outer');const bot=items.find(i=>i.cat==='bottom');return [top,bot].filter(Boolean)};
T.keyFor=async steps=>{const parts=[];for(const s of steps)parts.push(s.id+':'+(await T.imgHash(s)));return T.hash(S.me.avatarId+'|'+(S.me.blurFace?'b':'')+'|'+parts.join('>'))};
T.run=async(steps,status)=>{const t0=performance.now();let person=null,used=[],res=null;
 for(let i=0;i<steps.length;i++){const it=steps[i];const key=await T.keyFor(steps.slice(0,i+1));
  const hit=await T.cGet(key);if(hit){res=hit;person=hit.blob;used.push(hit.via+' (saved)');continue}
  if(T.left()<=0)throw Object.assign(new Error('quota (local daily cap)'),{quota:1});
  person=person||await T.personBlob();const kind=T.kindOf(it),garm=await T.garmentBlob(it);let ok=false,lastErr;
  for(const p of T.providers(kind)){const st=await T.stage(p.id);if(!/RUNNING|SLEEPING|APP_STARTING|BUILDING/.test(st)){lastErr=lastErr||new Error('Space down');console.warn('try-on',p.id,st,'skipped');continue}
   status({step:i+1,of:steps.length,name:it.name,via:p.id.split('/')[1],phase:st==='SLEEPING'?'waking':'dressing',t0:performance.now()});
   const ac=new AbortController();const s0=performance.now();
   try{const remaining=TO_MS-(performance.now()-t0);if(remaining<5000)throw new Error('timeout');
    const blob=await Promise.race([T.call(p,person,garm,it,kind,m=>{if(m.position!=null)status({step:i+1,of:steps.length,name:it.name,via:p.id.split('/')[1],phase:'queue',pos:m.position+1})},ac.signal),new Promise((_,r)=>setTimeout(()=>{ac.abort();r(new Error('timeout'))},remaining))]);
    T.bump();const cut=await T.cutResult(blob);res={id:key,blob,cut,via:p.id,t:Date.now(),secs:+((performance.now()-s0)/1000).toFixed(1)};await T.cPut(res);person=blob;used.push(`${p.id} ${res.secs} s`);ok=true;break}
   catch(e){if(!(lastErr&&T.isQuota(lastErr)))lastErr=e;console.warn('try-on',p.id,e&&e.message);if(/timeout/.test(e&&e.message))break}}
  if(!ok){const e=lastErr||new Error('failed');if(res)return {res,used,secs:((performance.now()-t0)/1000).toFixed(1),partial:{done:steps.slice(0,i),failed:steps.slice(i),err:e}};throw e}}
 return {res,used,secs:((performance.now()-t0)/1000).toFixed(1)}};

/* ---- background job queue (persists across reloads; one job at a time) ---- */
T.Q={jobs:JSON.parse(localStorage.getItem('tryon_jobs')||'[]'),busy:false,live:null};
T.Q.jobs.forEach(j=>{if(j.state==='running')j.state='queued'});
T.save=()=>{localStorage.setItem('tryon_jobs',JSON.stringify(T.Q.jobs.slice(-30)))};
T.emit=()=>{T.save();document.dispatchEvent(new CustomEvent('tryon'))};
T.jobFor=key=>T.Q.jobs.find(j=>j.key===key);
T.enqueue=async(items,opt={})=>{const steps=T.steps(items);if(!steps.length||!S.me.base)return null;const key=await T.keyFor(steps);
 if(await T.cGet(key))return null;let j=T.jobFor(key);
 if(j){if(j.state==='failed'||j.state==='partial'){j.state='queued';j.tries=0;j.err=null}}
 else{j={id:uid(),key,ids:steps.map(s=>s.id),label:steps.map(s=>s.name).join(' + '),state:'queued',tries:0,bg:!!opt.bg,at:Date.now()};T.Q.jobs.push(j)}
 if(!opt.bg){T.Q.jobs=T.Q.jobs.filter(x=>x===j||x.state!=='queued'||x.bg);}// newer pick replaces an older un-started pick
 T.emit();T.pump();return j};
T.pump=async()=>{if(T.Q.busy)return;const j=T.Q.jobs.find(x=>x.state==='queued'&&(!x.wait||x.wait<Date.now()))||null;
 if(!j){const w=T.Q.jobs.find(x=>x.state==='queued'&&x.wait);if(w)setTimeout(T.pump,Math.max(500,w.wait-Date.now()));return}
 const steps=j.ids.map(item).filter(Boolean);if(steps.length!==j.ids.length){j.state='failed';j.err='A piece was deleted';T.emit();return T.pump()}
 T.Q.busy=true;j.state='running';j.started=Date.now();T.emit();
 try{const r=await T.run(steps,s=>{T.Q.live={job:j.id,...s};document.dispatchEvent(new CustomEvent('tryon-status'))});
  j.state=r.partial?'partial':'done';j.secs=r.secs;j.used=r.used;if(r.partial)j.err=T.friendly(r.partial.err);
  if(!j.bg||S.tab!=='dress')toast(r.partial?'Part of your outfit is ready ✨':'Your AI try-on is ready ✨');vib(15)}
 catch(e){const retry=!T.isQuota(e)&&!e.quota&&j.tries<1&&/sleep|queue|timeout|503|down|fetch|error/i.test(String(e.message));
  if(retry){j.tries++;j.state='queued';j.wait=Date.now()+8000}else{j.state='failed';j.err=T.friendly(e);j.quota=T.isQuota(e)||!!e.quota;
   if(j.quota)T.Q.jobs.forEach(x=>{if(x.state==='queued'&&x.bg){x.state='failed';x.err=j.err;x.quota=true}})}}
 T.Q.busy=false;T.Q.live=null;T.emit();T.pump()};
T.retry=id=>{const j=T.Q.jobs.find(x=>x.id===id);if(j){j.state='queued';j.tries=0;j.err=null;j.wait=0;T.emit();T.pump()}};
// what the stage should show for a pick
T.lookup=async items=>{const steps=T.steps(items);if(!steps.length||!S.me.base)return {state:'none',steps};const key=await T.keyFor(steps);
 const hit=await T.cGet(key);if(hit)return {state:'done',hit,steps,key};
 // best partial (e.g. top done, bottom pending)
 let partial=null;if(steps.length>1){partial=await T.cGet(await T.keyFor(steps.slice(0,1)))}
 const j=T.jobFor(key);return {state:j?j.state:'new',job:j,partial,steps,key}};
T.offerPrecompute=()=>{if(!T.aiAllowed()||!S.me.base)return;let favs=T.favourites(),b0=T.left();favs=favs.filter(f=>(b0-=f.length)>=0);const n=favs.length;if(!n)return;
 openSheet(`${head('Get your favourites ready? ✨')}<p>I can dress your avatar in your favourite outfits in the background, so Dress Me shows them instantly.</p>
 ${favs.slice(0,n).map(f=>`<div class="idea">${f.map(i=>tile(i)).join('')}</div>`).join('')}
 <p class="muted">Uses about ${favs.slice(0,n).reduce((s,f)=>s+f.length,0)} of today's ~${T.left()} free AI try-ons. Your cut-out avatar is sent to Hugging Face to make the pictures. Saved on this phone.</p>
 <div class="row"><button class="btn ghost" data-close>Not now</button><button class="btn" id="preGo">Yes, prepare them</button></div>`,r=>r.querySelector('#preGo').onclick=async()=>{closeSheet();let budget=T.left();for(const f of favs.slice(0,n)){if(budget<=0)break;budget-=f.length;await T.enqueue(f,{bg:true})}toast('Preparing in the background, keep using the app 💖')})};
// favourite combos: loved saved outfits first, then top ideas
T.favourites=()=>{const seen=new Set(),out=[];const add=o=>{const its=[o.top,o.bottom].map(item).filter(Boolean);if(!its.length)return;const k=its.map(i=>i.id).join();if(seen.has(k))return;seen.add(k);out.push(its)};
 S.outfits.slice().sort((a,b)=>(b.rate||0)-(a.rate||0)).forEach(o=>add(o.items));ideas().forEach(x=>add(x.o));return out.slice(0,4)};

/* ================= Me-tab cards ================= */
T.meCard=()=>{const me=S.me,b=me.body;return `<div class="card" style="text-align:center"><div class="mini-stage big">${me.base?`<img src="${me.cutout||me.avatar}" alt="my avatar">`:AVATAR_EMPTY}</div>
 ${me.base?`<p class="muted">Base avatar saved ${fmtDate(new Date(me.avatarAt||Date.now()))}</p>`:'<p class="muted">Make your mini-me once, then Dress Me shows your clothes on you (AI).</p>'}
 <div class="row"><button class="btn" id="avMake">${me.base?'↺ Retake avatar':'✨ Make my mini-me'}</button>${me.avatar?'<button class="btn danger sm" id="avKill">Delete my avatar</button>':''}</div>
 ${me.base?`<label class="chk"><input type="checkbox" id="blurF" ${me.blurFace?'checked':''} style="width:22px;height:22px;flex:none"> Blur my face before sending to the AI (the result will have a blurry face too)</label>`:''}
 ${me.base?`<label class="chk"><input type="checkbox" id="fitG" ${me.fitGuide?'checked':''}> Show my fit guide (estimated from the photo, optional)</label>`:''}
 ${b&&me.fitGuide?`<details style="text-align:left;margin-top:8px"><summary>My fit guide (estimated)</summary><p class="muted">Shoulders ~${b.shoulderCm} cm · bust ~${b.bustCircCm} cm · waist ~${b.waistCircCm} cm · hips ~${b.hipCircCm} cm · inside leg ~${b.inseamCm} cm. ${esc(b.note)}. Only for picking sizes when shopping.</p></details>`:me.fitGuide&&me.base&&!b?'<p class="muted">Retake your avatar to make the fit guide.</p>':''}</div>`};
T.settingsCard=()=>{const c=T.cfg();const on=T.aiAllowed();return `<div class="card sunk"><h2 style="margin-top:0">${ic('lock')} AI try-on settings <span class="badge">for Dad</span></h2>
 ${PIN.unlocked()?`<p class="muted">${T.counterText()}</p>
 <label class="chk"><input type="checkbox" id="aiOn" ${on?'checked':''}> Allow AI try-on (sends the cut-out avatar + clothing photo to free Hugging Face Spaces)</label>
 <p class="muted">Optional: your own free Hugging Face Space and a <b>read</b> token give ~9 try-ons a day instead of ~3. Saved only in this browser (a free relay that hides the token needs a Cloudflare/Supabase account, not set up yet).</p>
 <label>Space ID (e.g. dennis/IDM-VTON)</label><input id="hfSpace" value="${esc(c.space)}" placeholder="yisol/IDM-VTON" autocomplete="off">
 <label>Hugging Face read token</label><input id="hfTok" type="password" value="${c.token?'••••••••':''}" placeholder="hf_…" autocomplete="off">
 <div class="row" style="margin-top:8px"><button class="btn sm" id="hfSave">Save</button><button class="btn ghost sm" id="hfClr">Clear token</button><button class="btn ghost sm" id="toClr">Clear saved try-ons</button></div>
 <div class="row" style="margin-top:8px"><button class="btn ghost sm" id="pinLock">Lock</button><button class="btn ghost sm" id="pinChange">Change PIN</button></div>`
 :`<p class="muted">AI try-on is <b>${on?'on':'off'}</b>. ${localStorage.getItem('pin')?'Enter the parent PIN to change AI and token settings.':'Set a parent PIN to manage AI try-on.'}</p><button class="btn ghost sm" id="pinOpen">${localStorage.getItem('pin')?'Unlock with PIN':'Set parent PIN'}</button>`}</div>`};
T.bindMe=a=>{const q=s=>a.querySelector(s);q('#avMake').onclick=T.avatarSheet;if(q('#avKill'))q('#avKill').onclick=()=>{if(confirm('Delete your avatar photo, measurements and saved try-on pictures from this phone?'))T.deleteAvatar()};
 if(q('#blurF'))q('#blurF').onchange=async e=>{S.me.blurFace=e.target.checked;await DB.set('me',S.me);toast(e.target.checked?'Face will be blurred before sending':'Face blur off')};
 if(q('#fitG'))q('#fitG').onchange=async e=>{S.me.fitGuide=e.target.checked;if(!e.target.checked)delete S.me.body;await DB.set('me',S.me);render()};
 if(q('#pinOpen'))q('#pinOpen').onclick=()=>localStorage.getItem('pin')?PIN.ask('Parent PIN',()=>render()):PIN.setup(()=>render());
 if(!PIN.unlocked())return;
 q('#aiOn').onchange=e=>{localStorage.setItem('ai_ok',e.target.checked?'1':'0');toast(e.target.checked?'AI try-on allowed':'AI try-on off')};
 q('#hfSave').onclick=()=>{localStorage.setItem('hf_space',q('#hfSpace').value.trim());const t=q('#hfTok').value.trim();if(t&&!/^•+$/.test(t))localStorage.setItem('hf_token',t);toast('Saved in this browser');render()};
 q('#hfClr').onclick=()=>{localStorage.removeItem('hf_space');localStorage.removeItem('hf_token');render();toast('Cleared')};q('#toClr').onclick=async()=>{await T.cClear();toast('Saved try-ons cleared')};
 q('#pinLock').onclick=()=>{PIN.lock();render()};q('#pinChange').onclick=()=>PIN.setup(()=>render(),true)};
window.TRY=T;
