// v3b photo tilt (from Muse mock-v3b/photo3d.js): real cut-out photos on layered planes,
// depth-parallax tilt + moving contact shadow + light sheen masked to each garment. No 3D models.
// Reduced motion: no auto-tilt, drag still works. Returns null (flat view stays) if 3D transforms are unsupported.
(function(){
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const OK=()=>window.CSS&&CSS.supports&&CSS.supports('transform-style','preserve-3d');
function mount(el,o={}){
 if(!OK()||!el)return null;const items=o.items||[];const fit=o.mode==='fitting';
 el.classList.add('p3d');
 const board=document.createElement('div');board.className='p3d-board';el.appendChild(board);
 const L=items.map(it=>{
  const g=document.createElement('div');g.className='p3d-l';g.style.cssText=`left:${it.x}%;top:${it.y}%;width:${it.w}%;transform:translate(-50%,-50%) rotate(${it.r||0}deg)`;
  const sh=new Image();sh.src=it.src;sh.alt='';sh.className='p3d-sh';
  const im=new Image();im.src=it.src;im.alt=it.alt||'';im.className='p3d-im';im.style.transform=`translateZ(${it.z}px)`;im.draggable=false;
  const sn=document.createElement('div');sn.className='p3d-sn';sn.style.transform=`translateZ(${it.z+.5}px)`;const m=`url("${it.src}") center/100% 100% no-repeat`;sn.style.webkitMask=m;sn.style.mask=m;
  g.append(sh,im,sn);board.appendChild(g);return {it,sh,im,sn}});
 let ax=0,ay=0,t0=performance.now(),drag=null,hold=0,raf=0,dead=false;
 const apply=()=>{board.style.transform=`rotateX(${ay}deg) rotateY(${ax}deg)`;
  for(const {it,sh,sn} of L){const d=it.z/40;sh.style.transform=`translate(${(-ax*.55*d+4).toFixed(1)}px,${(ay*.55*d+10*d).toFixed(1)}px) scale(${1+.02*d})`;
   sn.style.background=`linear-gradient(${110+ax*3}deg,rgba(255,255,255,0) ${30+ax*1.5}%,rgba(255,255,255,.55) ${48+ax*1.5}%,rgba(255,255,255,0) ${66+ax*1.5}%)`}};
 const set=a=>{ax=Math.sin(a*Math.PI*2)*(fit?9:16);ay=Math.cos(a*Math.PI*2)*(fit?-5:-4)+(fit?14:2);apply()};
 el.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,ax,ay};try{el.setPointerCapture(e.pointerId)}catch(_){}});
 el.addEventListener('pointermove',e=>{if(!drag)return;ax=Math.max(-22,Math.min(22,drag.ax+(e.clientX-drag.x)*.12));ay=Math.max(-10,Math.min(22,drag.ay-(e.clientY-drag.y)*.08));hold=performance.now();apply()});
 const up=()=>{drag=null};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
 const loop=n=>{if(dead||!el.isConnected){dead=true;return}if(o.auto!==false&&!RM()&&!drag&&!document.hidden&&n-hold>2500)set(((n-t0)/9000)%1);raf=requestAnimationFrame(loop)};
 raf=requestAnimationFrame(loop);set(0);
 return {swap:(i,src)=>{const l=L[i];if(!l)return;l.sh.src=l.im.src=src;const m=`url("${src}") center/100% 100% no-repeat`;l.sn.style.webkitMask=m;l.sn.style.mask=m},
  stop:()=>{dead=true;cancelAnimationFrame(raf)}};
}
window.P3D={mount,ok:OK};
})();
