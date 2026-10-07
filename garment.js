'use strict';
/* ===== v3c: garment upright + key points + instant fitting preview (all on the phone) =====
   EXIF orientation -> deskew by the cut-out mask's main axis (PCA) -> pick the upright 90° turn per category
   -> auto-crop -> key points (collar/shoulders/hem/sleeves, waist/crotch/hem, toe/heel, brim, handle)
   -> map them onto her avatar's pose for a quick (non-AI) fitting preview. */
const G={};
G.cv=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
// ---- EXIF orientation (JPEG APP1). Modern browsers already apply it when decoding (image-orientation:from-image).
G.exif=async f=>{try{const b=new DataView(await f.slice(0,131072).arrayBuffer());if(b.getUint16(0)!==0xFFD8)return 1;let o=2;
 while(o+4<b.byteLength){const m=b.getUint16(o),len=b.getUint16(o+2);if(m===0xFFE1&&b.getUint32(o+4)===0x45786966){const t=o+10,le=b.getUint16(t)===0x4949,u16=x=>b.getUint16(x,le),u32=x=>b.getUint32(x,le);
  const ifd=t+u32(t+4),n=u16(ifd);for(let i=0;i<n;i++){const e=ifd+2+i*12;if(u16(e)===0x0112)return u16(e+8)}return 1}if((m&0xFF00)!==0xFF00)break;o+=2+len}}catch(e){}return 1};
G.autoExif=()=>{if(G._ae!=null)return G._ae;const d=document.createElement('div');d.style.imageOrientation='from-image';G._ae=d.style.imageOrientation==='from-image';return G._ae};
G.orient=(img,o)=>{const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;const sw=o>=5;const c=G.cv(sw?h:w,sw?w:h),x=c.getContext('2d');
 const T={2:[-1,0,0,1,w,0],3:[-1,0,0,-1,w,h],4:[1,0,0,-1,0,h],5:[0,1,1,0,0,0],6:[0,1,-1,0,h,0],7:[0,-1,-1,0,h,w],8:[0,-1,1,0,0,w]}[o];if(T)x.setTransform(...T);x.drawImage(img,0,0);return c};
// load a File as an upright image/canvas; returns {src, exif, fixed}
G.load=async f=>{const o=await G.exif(f);const img=await fileToImg(f);if(o>1&&!G.autoExif())return {src:G.orient(img,o),exif:o,fixed:'manual'};return {src:img,exif:o,fixed:o>1?'browser':'none'}};
// ---- mask helpers (small, fast)
G.mask=(c,max=180)=>{const k=Math.min(1,max/Math.max(c.width,c.height)),w=Math.max(1,Math.round(c.width*k)),h=Math.max(1,Math.round(c.height*k));const t=G.cv(w,h),x=t.getContext('2d');x.drawImage(c,0,0,w,h);
 const d=x.getImageData(0,0,w,h).data,m=new Uint8Array(w*h);for(let i=0;i<w*h;i++)m[i]=d[i*4+3]>110?1:0;return {m,w,h}};
G.pca=({m,w,h})=>{let n=0,sx=0,sy=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(m[y*w+x]){n++;sx+=x;sy+=y}if(n<30)return null;const cx=sx/n,cy=sy/n;let a=0,b=0,c=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(m[y*w+x]){const dx=x-cx,dy=y-cy;a+=dx*dx;b+=dx*dy;c+=dy*dy}const th=.5*Math.atan2(2*b,a-c);const l1=(a+c)/2+Math.sqrt(((a-c)/2)**2+b*b),l2=(a+c)/2-Math.sqrt(((a-c)/2)**2+b*b);return {deg:th*180/Math.PI,elong:l2>0?l1/l2:9}};
// rotate (deg, any) + optional mirror, on a transparent canvas, then auto-crop
G.xform=(c,deg,flip)=>{const r=deg*Math.PI/180,cs=Math.abs(Math.cos(r)),sn=Math.abs(Math.sin(r));const W=c.width*cs+c.height*sn,H=c.width*sn+c.height*cs;const o=G.cv(W,H),x=o.getContext('2d');x.imageSmoothingQuality='high';
 x.translate(o.width/2,o.height/2);x.rotate(r);if(flip)x.scale(-1,1);x.drawImage(c,-c.width/2,-c.height/2);return G.crop(o)};
G.crop=c=>{const x=c.getContext('2d'),W=c.width,H=c.height,p=x.getImageData(0,0,W,H).data;let a=W,b=H,e=-1,f=-1;for(let j=0;j<H;j++)for(let i=0;i<W;i++)if(p[(j*W+i)*4+3]>20){if(i<a)a=i;if(i>e)e=i;if(j<b)b=j;if(j>f)f=j}
 if(e<a)return c;const pad=2;a=Math.max(0,a-pad);b=Math.max(0,b-pad);e=Math.min(W-1,e+pad);f=Math.min(H-1,f+pad);const o=G.cv(e-a+1,f-b+1);o.getContext('2d').drawImage(c,-a,-b);return o};
// row stats on a mask
G.rows=({m,w,h})=>{const R=[];for(let y=0;y<h;y++){let n=0,runs=0,a=-1,b=-1,prev=0;for(let x=0;x<w;x++){const v=m[y*w+x];if(v){n++;if(a<0)a=x;b=x;if(!prev)runs++}prev=v}R.push({n,runs,a,b})}return R};
G.band=(R,f0,f1)=>{const h=R.length,s=R.slice(Math.floor(h*f0),Math.max(Math.floor(h*f0)+1,Math.floor(h*f1)));return {w:s.reduce((t,r)=>t+(r.b>=r.a?r.b-r.a+1:0),0)/s.length,fill:s.reduce((t,r)=>t+r.n,0)/s.length,gap:s.filter(r=>r.runs>=2).length/s.length}};
// how "upright" a mask looks for a category (higher = better)
G.score=(M,cat)=>{const R=G.rows(M),mw=Math.max(1,...R.map(r=>r.b-r.a+1)),T=G.band(R,0,.22),B=G.band(R,.78,1),asp=M.h/M.w;
 if(cat==='bottom'){const gT=G.band(R,0,.35).gap,gB=G.band(R,.6,1).gap;return (gB-gT)*2+(asp>1?.3:0)+(B.w-T.w)/mw*.3*(gB<.1?1:0)}
 if(cat==='shoes')return (asp<1?1:0)+(B.fill-T.fill)/mw;
 if(cat==='hat'){const T2=G.band(R,0,.12),B2=G.band(R,.88,1);return (B.w-T.w)/mw*.5+(B2.fill-T2.fill)/mw+(asp<1.2?.2:0)}
 if(cat==='acc')return (B.fill-T.fill)/mw+(G.band(R,0,.3).gap-G.band(R,.7,1).gap)*.8;
 // top / outer: shoulders + sleeves at the top are wider than the hem; collar dip at the top centre
 const cx=M.w>>1;let ct=0;while(ct<M.h&&!M.m[ct*M.w+cx])ct++;const R0=R.findIndex(r=>r.n>0);const dip=(ct-R0)/M.h;
 return (T.w-B.w)/mw+Math.min(.25,dip)*2+(asp>.7&&asp<1.6?.15:0)};
// full auto: deskew + best 90° turn (+ shoes heel-left / toe-right). Returns {canvas, info}
G.auto=(c,cat)=>{const M=G.mask(c),P=G.pca(M);let dev=0;if(P&&P.elong>1.25){dev=((P.deg%90)+135)%90-45;const mn=['shoes','hat','acc'].includes(cat)?10:3;if(Math.abs(dev)<mn||Math.abs(dev)>38)dev=0}
 let best=null;for(const q of [0,90,180,270]){const t=G.xform(c,-dev+q,false),s=G.score(G.mask(t,120),cat);if(!best||s>best.s+.02||(q===0&&s>=best.s-.02&&best.q!==0&&false))best={q,s,t}}
 let flip=false;if(cat==='shoes'){const M2=G.mask(best.t,120);let L=0,Rr=0;const cols=x=>{let n=0;for(let y=0;y<M2.h;y++)n+=M2.m[y*M2.w+x];return n};const q=Math.max(1,M2.w>>2);for(let x=0;x<q;x++){L+=cols(x);Rr+=cols(M2.w-1-x)}
  if(Rr>L*1.08){flip=true;best.t=G.xform(c,-dev+best.q,true)}}// heel (taller) on the left, toe forward to the right
 return {canvas:best.t,info:{deskew:+(-dev).toFixed(1),turn:best.q,flip,score:+best.s.toFixed(2)}}};
// ---- key points, normalised 0..1 in the upright garment image
G.kp=(c,cat)=>{const M=G.mask(c,200),R=G.rows(M),h=M.h,w=M.w,y0=Math.max(0,R.findIndex(r=>r.n>0)),y1=h-1-[...R].reverse().findIndex(r=>r.n>0),H=Math.max(1,y1-y0);
 const at=f=>R[Math.min(h-1,Math.max(0,Math.round(y0+H*f)))],P=(x,y)=>[+(x/w).toFixed(3),+(y/h).toFixed(3)],cx=w/2;
 const runAt=(f,x=cx)=>{const y=Math.min(h-1,Math.max(0,Math.round(y0+H*f)));let a=Math.round(x),b=a;if(!M.m[y*w+a]){const r=R[y];return [r.a,r.b,y]}while(a>0&&M.m[y*w+a-1])a--;while(b<w-1&&M.m[y*w+b+1])b++;return [a,b,y]};
 if(cat==='top'||cat==='outer'){let ct=0;while(ct<h&&!M.m[ct*w+Math.round(cx)])ct++;const s=runAt(.1),hm=runAt(.96);let L=[w,0],Rt=[-1,0];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(M.m[y*w+x]){if(x<L[0])L=[x,y];if(x>Rt[0])Rt=[x,y]}
  return {collar:P(cx,Math.min(ct,y0+H*.12)),shoulderL:P(s[0],s[2]),shoulderR:P(s[1],s[2]),sleeveL:P(...L),sleeveR:P(...Rt),hemL:P(hm[0],hm[2]),hemR:P(hm[1],hm[2]),anchor:'shoulders'}}
 if(cat==='bottom'){const wb=at(.02),y=Math.round(y0+H*.02),hy=y1;const hb=R[hy];let cr=null;for(let yy=y0;yy<=y1;yy++){if(!M.m[yy*w+Math.round(cx)]&&R[yy].runs>=2){cr=yy;break}}
  return {waistL:P(wb.a,y),waistR:P(wb.b,y),crotch:cr!=null?P(cx,cr):null,hemL:P(hb.a,hy),hemR:P(hb.b,hy),anchor:'hips'}}
 if(cat==='shoes'){const s=at(.92),y=Math.round(y0+H*.92);return {heel:P(s.a,y),toe:P(s.b,y),top:P(cx,y0),anchor:'feet'}}
 if(cat==='hat'){const b=at(.9),y=Math.round(y0+H*.9);return {brimL:P(b.a,y),brimR:P(b.b,y),crown:P(cx,y0),anchor:'head'}}
 const t=at(0);return {handle:P((t.a+t.b)/2,y0),bottom:P(cx,y1),anchor:'hand'}};
G.prep=async(c,cat)=>{const r=G.auto(c,cat);return {canvas:r.canvas,info:r.info,kp:G.kp(r.canvas,cat)}};
// ---- manual fix: ↺ ↻ ⇋ on an item's PNG
G.manual=async(src,deg,flip)=>{const img=await TRY.loadImg(src);const c=G.cv(img.naturalWidth,img.naturalHeight);c.getContext('2d').drawImage(img,0,0);return G.xform(c,deg,flip)};
G.dots=(kp,tw=1,th=1)=>kp?Object.entries(kp).filter(([k,v])=>Array.isArray(v)).map(([k,v])=>`<circle cx="${(v[0]*100).toFixed(1)}%" cy="${(v[1]*100).toFixed(1)}%" r="4.5" fill="#5a1a1f" stroke="#fff" stroke-width="1.5"><title>${k}</title></circle>`).join(''):'';
G.fixUI=(it)=>`<div class="fixbox"><p class="eyebrow" style="margin:0 0 6px">Looks right? <span class="badge" id="fxInfo">${G.infoText(it)}</span></p>
 <div class="fxpv"><span class="fxw"><img id="fxImg" src="${it.img}" alt=""><svg id="fxDots" class="fxdots">${G.dots(it.kp)}</svg></span></div>
 <div class="row fxbtns"><button class="btn ghost sm" data-fx="-90" aria-label="Rotate left">↺</button><button class="btn ghost sm" data-fx="90" aria-label="Rotate right">↻</button><button class="btn ghost sm" data-fx="flip" aria-label="Flip">⇋</button><button class="btn ghost sm" data-fx="auto" aria-label="Auto straighten">Auto</button></div></div>`;
G.infoText=it=>{const u=it.upright;if(!u)return 'as photographed';const a=[];if(u.exif>1)a.push('phone rotation fixed');if(u.deskew)a.push(`straightened ${Math.abs(u.deskew)}°`);if(u.turn)a.push(`turned ${u.turn}°`);if(u.flip)a.push('flipped');return a.join(' · ')||'already upright'};
// binds the fix box; calls onImg(newSrc) after each change
G.bindFix=(root,it,onImg)=>{const sync=()=>{root.querySelector('#fxImg').src=it.img;root.querySelector('#fxDots').innerHTML=G.dots(it.kp);root.querySelector('#fxInfo').textContent=G.infoText(it);onImg&&onImg(it.img)};
 root.querySelectorAll('[data-fx]').forEach(b=>b.onclick=async()=>{const v=b.dataset.fx;b.disabled=true;try{let c;
  if(v==='auto'){const src=it.raw||it.img;const img=await TRY.loadImg(src);const c0=G.cv(img.naturalWidth,img.naturalHeight);c0.getContext('2d').drawImage(img,0,0);const r=G.auto(c0,it.cat);c=r.canvas;it.upright={...(it.upright||{}),...r.info}}
  else{c=await G.manual(it.img,v==='flip'?0:+v,v==='flip');const u=it.upright=it.upright||{};if(v==='flip')u.flip=!u.flip;else u.turn=((u.turn||0)+(+v)+360)%360}
  it.img=c.toDataURL('image/png');it.kp=G.kp(c,it.cat);it.edited=Date.now();delete it._kpc;sync()}finally{b.disabled=false}})};
// ---- avatar pose (in cut-out image coords, normalised); computed lazily for avatars made before v3c
G.POSE=[0,7,8,11,12,13,14,15,16,23,24,25,26,27,28,29,30,31,32];
G.ensurePose=async()=>{const me=S.me;if(!me.base)return null;if(me.pose&&me.poseFor===me.avatarId)return me.pose;if(G._pp)return G._pp;G._pp=(async()=>{try{const {pose}=await TRY.loadMP();const img=await TRY.loadImg(me.cutout||me.avatar);
 const c=G.cv(img.naturalWidth,img.naturalHeight),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0);const r=pose.detect(c);const L=r.landmarks&&r.landmarks[0];if(!L)return null;
 const P={};G.POSE.forEach(i=>P[i]=[+L[i].x.toFixed(4),+L[i].y.toFixed(4)]);me.pose=P;me.poseFor=me.avatarId;await DB.set('me',me);return P}catch(e){console.warn('pose',e&&e.message);return null}finally{G._pp=null}})();return G._pp};
// pose on any picture of her (e.g. an AI result), cached in memory
G._pm=new Map();G.poseOf=async(src,key)=>{if(G._pm.has(key))return G._pm.get(key);const {pose}=await TRY.loadMP();const img=await TRY.loadImg(src);const c=G.cv(img.naturalWidth,img.naturalHeight),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0);
 const r=pose.detect(c);const L=r.landmarks&&r.landmarks[0];let P=null;if(L){P={};G.POSE.forEach(i=>P[i]=[L[i].x,L[i].y])}G._pm.set(key,P);return P};
// key points for any item (demo items etc.), cached in memory
G._kc=new Map();G.kpFor=async it=>{if(it.kp&&!it.photo)return it.kp;const k=it.id+'|'+(it.edited||0)+'|'+it.cat;if(G._kc.has(k))return G._kc.get(k);const img=await TRY.loadImg(it.img);const c=G.cv(img.naturalWidth,img.naturalHeight);c.getContext('2d').drawImage(img,0,0);const kp=G.kp(c,it.cat);G._kc.set(k,kp);return kp};
// similarity (2 pairs) or affine (3 pairs) -> canvas transform
G.sim=(p1,p2,q1,q2)=>{const sx=p2[0]-p1[0],sy=p2[1]-p1[1],dx=q2[0]-q1[0],dy=q2[1]-q1[1],d=sx*sx+sy*sy||1;const a=(sx*dx+sy*dy)/d,b=(sx*dy-sy*dx)/d;return [a,b,-b,a,q1[0]-a*p1[0]+b*p1[1],q1[1]-b*p1[0]-a*p1[1]]};
G.aff=(p,q)=>{const [[x1,y1],[x2,y2],[x3,y3]]=p,D=x1*(y2-y3)+x2*(y3-y1)+x3*(y1-y2);if(Math.abs(D)<1e-6)return null;const s=(u1,u2,u3)=>[(u1*(y2-y3)+u2*(y3-y1)+u3*(y1-y2))/D,(u1*(x3-x2)+u2*(x1-x3)+u3*(x2-x1))/D,(u1*(x2*y3-x3*y2)+u2*(x3*y1-x1*y3)+u3*(x1*y2-x2*y1))/D];
 const X=s(q[0][0],q[1][0],q[2][0]),Y=s(q[0][1],q[1][1],q[2][1]);return [X[0],Y[0],X[1],Y[1],X[2],Y[2]]};
const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2],lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],wid=(a,b,k)=>{const m=mid(a,b);return [lerp(m,a,k),lerp(m,b,k)]};
// where each garment lands on her body: returns canvas transform for garment pixel coords
G.place=(it,kp,gw,gh,P,W,H)=>{const B=i=>[P[i][0]*W,P[i][1]*H],G2=v=>[v[0]*gw,v[1]*gh];const byX=(i,j)=>B(i)[0]<B(j)[0]?[B(i),B(j)]:[B(j),B(i)];
 const [sl,sr]=byX(11,12),[hl,hr]=byX(23,24),[al,ar]=byX(27,28),sw=Math.hypot(sr[0]-sl[0],sr[1]-sl[1]),tor=Math.hypot(...[0,1].map(k=>mid(hl,hr)[k]-mid(sl,sr)[k]));
 if(it.cat==='top'||it.cat==='outer'){const [a,b]=wid(sl,sr,it.cat==='outer'?1.32:1.2);a[1]-=tor*.04;b[1]-=tor*.04;return G.sim(G2(kp.shoulderL),G2(kp.shoulderR),a,b)}
 if(it.cat==='bottom'){const [a,b]=wid(hl,hr,1.38);a[1]-=tor*.16;b[1]-=tor*.16;const gl=(kp.hemL[1]-kp.waistL[1])*gh,gwid=(kp.waistR[0]-kp.waistL[0])*gw||1;
  const long=gl/gwid>1.9;if(long){const hem=mid(al,ar);hem[1]+=tor*.06;const T=G.aff([G2(kp.waistL),G2(kp.waistR),G2(mid(kp.hemL,kp.hemR))],[a,b,hem]);if(T)return T}return G.sim(G2(kp.waistL),G2(kp.waistR),a,b)}
 if(it.cat==='shoes'){const f=mid(al,ar),half=Math.max(sw*.42,Math.abs(ar[0]-al[0])*.78);const y=Math.max(B(31)[1],B(32)[1]);return G.sim(G2(kp.heel),G2(kp.toe),[f[0]-half,y],[f[0]+half,y])}
 if(it.cat==='hat'){const [el,er]=byX(7,8),[a,b]=wid(el,er,2.1);const up=Math.hypot(er[0]-el[0],er[1]-el[1])*.12;a[1]-=up;b[1]-=up;return G.sim(G2(kp.brimL),G2(kp.brimR),a,b)}
 const [wl,wr]=byX(15,16),hand=wr,len=sw*.62*(gh/gw);return G.sim(G2(kp.handle),G2(kp.bottom),hand,[hand[0],hand[1]+len])};
G.ORDER=['bottom','shoes','top','outer','acc','hat'];
// instant (non-AI) fitting preview: avatar cut-out + garments warped to her pose. Returns dataURL or null.
G._cc=new Map();
G.compose=async(items,baseSrc,baseKey)=>{const me=S.me;const its=G.ORDER.map(k=>items.find(i=>i.cat===k)).filter(i=>i&&i.img&&!i.photo);if(!its.length||!me.base)return null;
 const key=(baseKey||me.avatarId)+'|'+its.map(i=>i.id+':'+(i.edited||0)).join(',');if(G._cc.has(key))return G._cc.get(key);const P=baseSrc?await G.poseOf(baseSrc,baseKey):await G.ensurePose();if(!P)return null;
 const base=await TRY.loadImg(baseSrc||me.cutout||me.avatar);const W=base.naturalWidth,H=base.naturalHeight,top=its.some(i=>i.cat==='hat')?Math.round(H*.08):0;const c=G.cv(W,H+top),x=c.getContext('2d');x.drawImage(base,0,top);
 for(const it of its){try{const kp=await G.kpFor(it);const g=await TRY.loadImg(it.img);let T=G.place(it,kp,g.naturalWidth,g.naturalHeight,P,W,H);if(!T)continue;T=[T[0],T[1],T[2],T[3],T[4],T[5]+top];x.save();x.setTransform(...T);x.shadowColor='rgba(15,14,13,.18)';x.shadowBlur=6;x.shadowOffsetY=2;x.drawImage(g,0,0);x.restore()}catch(e){console.warn('fit preview',it.name,e&&e.message)}}
 const url=c.toDataURL('image/png');if(G._cc.size>12)G._cc.clear();G._cc.set(key,url);return url};
window.GAR=G;
