// v3b slice 8: Closet 3D card carousel (CSS 3D ring) + Ideas tilted card stacks.
// Flat fallback (plain horizontal scroll / flat cards) for reduced motion, no 3D support, Save-Data, low-end phones, or a slow first second.
(function(){
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOW=()=>{const n=navigator,c=n.connection||{};return !!(c.saveData||(n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2))};
const can3d=()=>window.CSS&&CSS.supports('transform-style','preserve-3d')&&!RM()&&!LOW()&&localStorage.getItem('flat_fx')!=='1';
function flatMode(){document.documentElement.classList.toggle('fx-flat',!can3d())}
flatMode();try{matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',flatMode)}catch(e){}
function ring(el,items,onPick){
 if(!el)return;const its=items.slice(0,8);if(its.length<3){el.innerHTML='';return}
 const cards=its.map((it,i)=>`<button class="c3-card" data-id="${it.id}" aria-label="${it.name.replace(/"/g,'&quot;')}"><span class="c3-ph"><img src="${it.img}" alt="" loading="lazy" draggable="false"></span></button>`).join('');
 el.innerHTML=`<div class="c3d" role="group" aria-label="Featured pieces, swipe"><div class="c3-ring">${cards}</div></div><p class="c3-cap">Featured · swipe to turn</p>`;
 const root=el.querySelector('.c3d'),R=el.querySelector('.c3-ring'),B=[...R.children];
 B.forEach(b=>b.onclick=e=>{if(root._moved)return e.preventDefault();onPick(b.dataset.id)});
 if(!can3d()){root.classList.add('flat');return}
 const n=B.length,step=360/n,rad=Math.round(Math.min(250,(el.clientWidth||340)*.62));
 R.style.transform=`translateZ(${-rad}px)`;let a=0,v=0,drag=null,last=performance.now(),idle=0,slow=0,frames=0;
 const draw=()=>{B.forEach((b,i)=>{const ang=((i*step+a)%360+540)%360-180,cos=Math.cos(ang*Math.PI/180);b.style.transform=`rotateY(${ang}deg) translateZ(${rad}px)`;b.style.opacity=(.35+.65*Math.max(0,cos)).toFixed(2);b.style.zIndex=Math.round(cos*10)+10;b.tabIndex=cos>.7?0:-1})};
 root.addEventListener('pointerdown',e=>{drag={x:e.clientX,a};root._moved=false;v=0});
 root.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>6)root._moved=true;const na=drag.a+dx*.35;v=(na-a)*60;a=na;idle=performance.now();draw()});
 const up=()=>{drag=null;setTimeout(()=>root._moved=false,0)};root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);root.addEventListener('pointerleave',()=>{drag=null});
 const loop=t=>{if(!root.isConnected)return;const dt=Math.min(.05,(t-last)/1000);frames++;if(frames>5&&frames<70&&t-last>45)slow++;last=t;
  if(slow>20){root.classList.add('flat');B.forEach(b=>{b.style.transform='';b.style.opacity='';b.style.zIndex=''});return}
  if(!drag&&!document.hidden){if(Math.abs(v)>1){a+=v*dt;v*=Math.pow(.04,dt)}else if(t-idle>2500)a-=9*dt;draw()}requestAnimationFrame(loop)};
 draw();requestAnimationFrame(loop)}
window.CAR={ring,can3d,flatMode};
})();
